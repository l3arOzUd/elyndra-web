import * as THREE from "three";
import type { MapLayout, Prop, PropKind } from "../data/schema";

type Blocker = MapLayout["blockers"][number];

// Painted props: trees, pines, bushes, rocks and the rest of the natural
// scatter as camera-facing painted cards, like the creatures, instead of
// low-poly models. The art is painted once at startup into an atlas
// (canvas, seeded so it is the same every run): soft shapes lit from the
// top left, a dark painted outline, leaf and moss dabs. Each kind has a few
// variants; each prop picks one by its position and gets a slight tint.
// Rock and cliff blockers are drawn as heaps of painted boulders over a
// shaded footprint (the walk grid still decides where you can go).

/** Kinds drawn as painted cards; the rest stay models (props.ts). */
export const PAINTED_KINDS = new Set<PropKind>(["tree", "pine", "bush", "rock", "boulder", "dead_tree", "palm", "coral", "ice_spike", "crystal", "giant_tree"]);

type Look = "green" | "snow" | "dry" | "dark";
interface Card { kind: string; w: number; h: number; px: number; py: number }
/** Card size in cells (w across, h up) and atlas pixels per cell. */
const SIZE: Record<string, [number, number]> = {
  tree: [3, 3.6], pine: [2.2, 3.8], bush: [1.4, 1.1], rock: [1.1, 0.9], boulder: [2.2, 1.8], dead_tree: [2.6, 3.2],
  palm: [3.2, 4], coral: [1.3, 1.3], ice_spike: [1.2, 2.2], crystal: [1, 1.6], giant_tree: [7, 8],
  // Ground detail (decorProps): never blocks, never in the map data.
  tuft: [0.8, 0.6], flowers: [0.9, 0.62], pebbles: [0.8, 0.45], dry_tuft: [0.8, 0.6], snow_tuft: [0.8, 0.55],
};
const VARIANTS = 3;
const PPC = 72; // atlas pixels per cell
const CAMERA_PITCH = 50; // matches IsoCamera's default: cards lean back to face it

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

/** Overlapping lit blobs with a dark rim: the painted canopy/heap look. */
function blobs(g: CanvasRenderingContext2D, list: [number, number, number][], hue: number, sat: number, light: number, rand: () => number, dabs = true) {
  // Outline: every blob a little larger, dark, behind.
  g.fillStyle = hsl(hue, sat * 0.8, light * 0.32, 0.95);
  for (const [x, y, r] of list) { g.beginPath(); g.arc(x, y, r + 3, 0, Math.PI * 2); g.fill(); }
  for (const [x, y, r] of list) {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
    gr.addColorStop(0, hsl(hue - 4, sat, Math.min(92, light * 1.35)));
    gr.addColorStop(0.55, hsl(hue, sat, light));
    gr.addColorStop(1, hsl(hue + 6, sat, light * 0.62));
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  if (!dabs) return;
  // Leaf / grain dabs on top, light on the lit side, dark on the shaded side.
  g.save();
  g.globalCompositeOperation = "source-atop";
  for (const [x, y, r] of list) {
    for (let i = 0; i < r * 1.6; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      const lit = (-dx - dy) / (r * 1.4);
      g.fillStyle = hsl(hue + (rand() - 0.5) * 14, sat, light * (1 + lit * 0.45 + (rand() - 0.5) * 0.2), 0.55);
      g.beginPath(); g.ellipse(x + dx, y + dy, r * 0.12, r * 0.07, rand() * Math.PI, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
}

function trunk(g: CanvasRenderingContext2D, x: number, base: number, top: number, wBase: number, wTop: number, lean: number, hue = 26) {
  g.fillStyle = hsl(hue, 30, 14);
  g.beginPath();
  g.moveTo(x - wBase / 2 - 2, base); g.quadraticCurveTo(x - wTop / 2 + lean * 0.5 - 2, (base + top) / 2, x - wTop / 2 + lean - 2, top);
  g.lineTo(x + wTop / 2 + lean + 2, top); g.quadraticCurveTo(x + wTop / 2 + lean * 0.5 + 2, (base + top) / 2, x + wBase / 2 + 2, base);
  g.closePath(); g.fill();
  const gr = g.createLinearGradient(x - wBase / 2, 0, x + wBase / 2, 0);
  gr.addColorStop(0, hsl(hue, 32, 42)); gr.addColorStop(0.45, hsl(hue, 34, 32)); gr.addColorStop(1, hsl(hue, 30, 18));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - wBase / 2, base); g.quadraticCurveTo(x - wTop / 2 + lean * 0.5, (base + top) / 2, x - wTop / 2 + lean, top);
  g.lineTo(x + wTop / 2 + lean, top); g.quadraticCurveTo(x + wTop / 2 + lean * 0.5, (base + top) / 2, x + wBase / 2, base);
  g.closePath(); g.fill();
}

/** An irregular faceted stone, lit top-left, with an optional moss cap. */
function stone(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rand: () => number, hue: number, sat: number, light: number, moss: boolean, snow: boolean) {
  const n = 8 + Math.floor(rand() * 3);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / n) * Math.PI * 2;
    const k = 0.78 + rand() * 0.3;
    // Flat bottom: stones sit on the ground.
    pts.push([cx + Math.cos(a) * rx * k, Math.min(cy + ry * 0.55, cy + Math.sin(a) * ry * k)]);
  }
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  g.save();
  g.lineJoin = "round"; g.lineWidth = 6; g.strokeStyle = hsl(hue, sat, light * 0.3, 0.95);
  path(); g.stroke();
  const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.6, cy + ry);
  gr.addColorStop(0, hsl(hue, sat, Math.min(90, light * 1.3))); gr.addColorStop(0.5, hsl(hue, sat, light)); gr.addColorStop(1, hsl(hue, sat, light * 0.55));
  g.fillStyle = gr; path(); g.fill();
  g.clip();
  // Facets: a few lighter planes from the top-left, a shaded underside.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (1.05 + rand() * 0.6);
    g.fillStyle = hsl(hue, sat, light * (1.15 + rand() * 0.2), 0.45);
    g.beginPath();
    g.moveTo(cx + (rand() - 0.6) * rx * 0.5, cy + (rand() - 0.5) * ry * 0.4);
    g.lineTo(cx + Math.cos(a) * rx * 1.2, cy + Math.sin(a) * ry * 1.2);
    g.lineTo(cx + Math.cos(a + 0.5) * rx * 1.2, cy + Math.sin(a + 0.5) * ry * 1.2);
    g.closePath(); g.fill();
  }
  g.fillStyle = hsl(hue, sat, light * 0.42, 0.55);
  g.beginPath(); g.ellipse(cx + rx * 0.15, cy + ry * 0.75, rx * 1.1, ry * 0.45, 0, 0, Math.PI * 2); g.fill();
  if (moss || snow) {
    for (let i = 0; i < rx * 0.9; i++) {
      const a = Math.PI * (1.1 + rand() * 0.8), d = rand() * 0.5 + 0.55;
      g.fillStyle = snow ? hsl(205, 30, 90 + rand() * 8, 0.9) : hsl(95 + rand() * 20, 40, 34 + rand() * 12, 0.85);
      g.beginPath(); g.ellipse(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rx * 0.16, ry * 0.1, 0, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
}

function paintCard(g: CanvasRenderingContext2D, kind: string, W: number, H: number, rand: () => number, look: Look) {
  const cx = W / 2, base = H - 6;
  const snow = look === "snow", dry = look === "dry";
  switch (kind) {
    case "tree": case "giant_tree": {
      const big = kind === "giant_tree";
      const top = base - H * (big ? 0.42 : 0.38);
      trunk(g, cx, base, top, W * (big ? 0.16 : 0.11), W * (big ? 0.09 : 0.06), (rand() - 0.5) * W * 0.05, big ? 22 : 26);
      const hue = big ? 40 + rand() * 8 : dry ? 62 + rand() * 12 : 98 + rand() * 18, sat = big ? 62 : dry ? 42 : 46 + rand() * 10, light = big ? 46 : dry ? 40 : 34 + rand() * 6;
      const R = W * 0.2, ccy = base - H * 0.62;
      const list: [number, number, number][] = [];
      for (let i = 0; i < (big ? 16 : 10); i++) {
        const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
        list.push([cx + Math.cos(a) * d * W * 0.26, ccy + Math.sin(a) * d * H * 0.18 - (1 - d) * H * 0.04, R * (0.62 + rand() * 0.45)]);
      }
      list.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      blobs(g, list, hue, sat, light, rand);
      if (snow) for (const [x, y, r] of list) { g.fillStyle = "rgba(240,246,252,.85)"; g.beginPath(); g.ellipse(x - r * 0.15, y - r * 0.55, r * 0.6, r * 0.28, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case "pine": {
      trunk(g, cx, base, base - H * 0.2, W * 0.1, W * 0.07, 0, 24);
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const k = t / (tiers - 1), y = base - H * (0.16 + k * 0.62), w = W * (0.48 - k * 0.3), h = H * 0.3;
        const tier = () => {
          g.beginPath(); g.moveTo(cx, y - h);
          const jag = 7;
          for (let j = 0; j <= jag; j++) { const u = j / jag; g.lineTo(cx + w * (u - 0.5) * 2 * (0.9 + rand() * 0.15), y + (j % 2 ? -h * 0.08 : h * 0.04)); }
          g.closePath();
        };
        g.save(); g.lineWidth = 6; g.lineJoin = "round"; g.strokeStyle = hsl(150, 40, 9); tier(); g.stroke(); g.restore();
        const gr = g.createLinearGradient(cx - w, y - h, cx + w, y);
        gr.addColorStop(0, hsl(140, 38, 36)); gr.addColorStop(0.5, hsl(148, 42, 24)); gr.addColorStop(1, hsl(155, 45, 13));
        g.fillStyle = gr; tier(); g.fill();
        if (snow) { g.fillStyle = "rgba(238,245,252,.92)"; g.beginPath(); g.moveTo(cx, y - h); g.lineTo(cx - w * 0.55, y - h * 0.35); g.quadraticCurveTo(cx, y - h * 0.5, cx + w * 0.4, y - h * 0.4); g.closePath(); g.fill(); }
      }
      break;
    }
    case "bush": {
      const list: [number, number, number][] = [];
      for (let i = 0; i < 5; i++) list.push([cx + (rand() - 0.5) * W * 0.5, base - H * (0.35 + rand() * 0.2), W * (0.17 + rand() * 0.08)]);
      list.sort((a, b) => a[1] - b[1]);
      blobs(g, list, dry ? 60 : 105 + rand() * 15, dry ? 38 : 45, dry ? 40 : 33, rand);
      if (!dry && !snow && rand() < 0.6) for (let i = 0; i < 7; i++) { g.fillStyle = ["#f4e27a", "#f6f1e4", "#e98aa4"][Math.floor(rand() * 3)]; g.beginPath(); g.arc(cx + (rand() - 0.5) * W * 0.55, base - H * (0.3 + rand() * 0.35), 3, 0, Math.PI * 2); g.fill(); }
      if (snow) for (const [x, y, r] of list) { g.fillStyle = "rgba(240,246,252,.85)"; g.beginPath(); g.ellipse(x, y - r * 0.5, r * 0.6, r * 0.25, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case "rock": case "boulder": {
      const hue = look === "dark" ? 20 : dry ? 34 : 38, sat = look === "dark" ? 8 : dry ? 26 : 14, light = look === "dark" ? 30 : dry ? 58 : 52;
      stone(g, cx, base - H * 0.42, W * 0.42, H * 0.42, rand, hue, sat, light, look === "green", snow);
      if (kind === "boulder" && rand() < 0.7) stone(g, cx + W * (rand() < 0.5 ? -0.28 : 0.28), base - H * 0.2, W * 0.17, H * 0.2, rand, hue, sat, light * 0.95, look === "green", snow);
      break;
    }
    case "dead_tree": {
      const branch = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.strokeStyle = hsl(24, 18, 12); g.lineWidth = w + 4; g.lineCap = "round";
        g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        g.strokeStyle = hsl(26, 16, 30 + depth * 3); g.lineWidth = w;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        if (depth > 0) for (const s of [-1, 1]) branch(x2, y2, a + s * (0.35 + rand() * 0.4), len * (0.62 + rand() * 0.15), w * 0.62, depth - 1);
      };
      branch(cx, base, -Math.PI / 2 + (rand() - 0.5) * 0.2, H * 0.36, W * 0.08, 3);
      break;
    }
    case "palm": {
      const lean = (rand() < 0.5 ? -1 : 1) * W * 0.12, top = base - H * 0.68;
      for (let i = 0; i < 9; i++) {
        const t0 = i / 9, t1 = (i + 1) / 9;
        const x0 = cx + lean * t0 * t0, y0 = base - (base - top) * t0, x1 = cx + lean * t1 * t1, y1 = base - (base - top) * t1;
        g.fillStyle = hsl(28, 32, 14); g.beginPath(); g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, W * 0.055 + 2, (y0 - y1) / 2 + 2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = hsl(30, 36, 36 + (i % 2) * 6); g.beginPath(); g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, W * 0.05, (y0 - y1) / 2, 0, 0, Math.PI * 2); g.fill();
      }
      const tx = cx + lean, ty = top;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.05 + (i / 6) * 0.9) + (rand() - 0.5) * 0.15, len = W * (0.38 + rand() * 0.1);
        const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + len * 0.25;
        const frond = () => { g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + ex) / 2, ty - len * 0.28, ex, ey); g.quadraticCurveTo((tx + ex) / 2, ty - len * 0.05, tx, ty + 6); g.closePath(); };
        g.save(); g.lineWidth = 5; g.strokeStyle = hsl(120, 40, 10); frond(); g.stroke(); g.restore();
        const gr = g.createLinearGradient(tx, ty - len * 0.3, ex, ey);
        gr.addColorStop(0, hsl(95, 50, 42)); gr.addColorStop(1, hsl(115, 48, 22));
        g.fillStyle = gr; frond(); g.fill();
      }
      break;
    }
    case "coral": {
      const hue = [5, 25, 330][Math.floor(rand() * 3)];
      const arm = (x: number, y: number, a: number, len: number, w: number, d: number) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.lineCap = "round";
        g.strokeStyle = hsl(hue, 50, 22); g.lineWidth = w + 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        g.strokeStyle = hsl(hue, 70, 58 + d * 4); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        if (d > 0) for (const s of [-1, 1]) arm(x2, y2, a + s * (0.4 + rand() * 0.3), len * 0.7, w * 0.75, d - 1);
      };
      arm(cx, base, -Math.PI / 2, H * 0.3, W * 0.1, 2);
      break;
    }
    case "tuft": case "flowers": case "dry_tuft": case "snow_tuft": {
      const blades = kind === "snow_tuft" ? 6 : 11;
      const hue = kind === "dry_tuft" ? 44 : kind === "snow_tuft" ? 34 : 92, sat = kind === "dry_tuft" ? 46 : kind === "snow_tuft" ? 22 : 48;
      if (kind === "snow_tuft") {
        g.fillStyle = hsl(205, 35, 82); g.beginPath(); g.ellipse(cx, base - 4, W * 0.36, H * 0.16, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = hsl(210, 40, 96); g.beginPath(); g.ellipse(cx - W * 0.05, base - 7, W * 0.3, H * 0.12, 0, 0, Math.PI * 2); g.fill();
      }
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < blades; i++) {
        const r2 = rng(i * 31 + 7);
        const x0 = cx + (r2() - 0.5) * W * 0.5, len = H * (0.45 + r2() * 0.45), bend = (r2() - 0.5) * W * 0.5;
        g.strokeStyle = pass === 0 ? hsl(hue, sat, 12, 0.9) : hsl(hue + (r2() - 0.5) * 16, sat, (kind === "dry_tuft" ? 52 : kind === "snow_tuft" ? 38 : 34) + r2() * 16);
        g.lineWidth = pass === 0 ? 5 : 2.6; g.lineCap = "round";
        g.beginPath(); g.moveTo(x0, base); g.quadraticCurveTo(x0 + bend * 0.3, base - len * 0.6, x0 + bend, base - len); g.stroke();
      }
      if (kind === "flowers") for (let i = 0; i < 5; i++) {
        const fx = cx + (rand() - 0.5) * W * 0.6, fy = base - H * (0.45 + rand() * 0.4);
        g.fillStyle = hsl(0, 0, 10, 0.8); g.beginPath(); g.arc(fx, fy, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = ["#ffe066", "#fff6e8", "#f29bb8", "#b9a2f0", "#ff9f5a"][Math.floor(rand() * 5)];
        g.beginPath(); g.arc(fx, fy, 4.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(fx - 1.2, fy - 1.2, 1.5, 0, Math.PI * 2); g.fill();
      }
      break;
    }
    case "pebbles": {
      const hue = look === "dark" ? 20 : dry ? 34 : 38, sat = look === "dark" ? 8 : dry ? 24 : 12, light = look === "dark" ? 34 : dry ? 60 : 56;
      for (let i = 0; i < 3; i++) stone(g, cx + (i - 1) * W * 0.26 + (rand() - 0.5) * 8, base - H * (0.24 + rand() * 0.1), W * (0.11 + rand() * 0.06), H * (0.2 + rand() * 0.08), rand, hue, sat, light, false, snow);
      break;
    }
    case "ice_spike": case "crystal": {
      const ice = kind === "ice_spike";
      const n = ice ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const k = i === 0 ? 1 : 0.5 + rand() * 0.35, ox = i === 0 ? 0 : (rand() - 0.5) * W * 0.55;
        const h = H * 0.86 * k, w = W * (ice ? 0.2 : 0.17) * (0.7 + k * 0.4), tilt = (ox / W) * 0.6;
        const x = cx + ox, tipX = x + tilt * h;
        const shard = () => { g.beginPath(); g.moveTo(x - w, base); g.lineTo(x - w * 0.7, base - h * 0.75); g.lineTo(tipX, base - h); g.lineTo(x + w * 0.7, base - h * 0.75); g.lineTo(x + w, base); g.closePath(); };
        g.save(); g.lineWidth = 5; g.lineJoin = "round"; g.strokeStyle = ice ? hsl(205, 40, 30) : hsl(185, 70, 18); shard(); g.stroke(); g.restore();
        const gr = g.createLinearGradient(x - w, 0, x + w, 0);
        if (ice) { gr.addColorStop(0, hsl(200, 60, 94)); gr.addColorStop(0.5, hsl(200, 55, 80)); gr.addColorStop(1, hsl(208, 50, 58)); }
        else { gr.addColorStop(0, hsl(178, 90, 86)); gr.addColorStop(0.5, hsl(182, 80, 58)); gr.addColorStop(1, hsl(190, 75, 34)); }
        g.fillStyle = gr; shard(); g.fill();
        g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(x - w * 0.55, base - h * 0.1); g.lineTo(x - w * 0.35, base - h * 0.72); g.lineTo(tipX - w * 0.1, base - h * 0.92); g.lineTo(x - w * 0.2, base - h * 0.1); g.closePath(); g.fill();
      }
      break;
    }
  }
}

interface Atlas { texture: THREE.CanvasTexture; cards: Map<string, Card[]> }
const atlases = new Map<Look, Atlas>();

/** The painted atlas for a look (each kind × VARIANTS), built once and kept. */
function atlasFor(look: Look): Atlas {
  const have = atlases.get(look);
  if (have) return have;
  const kinds = Object.keys(SIZE);
  const cells: { kind: string; w: number; h: number }[] = [];
  for (const kind of kinds) for (let v = 0; v < VARIANTS; v++) cells.push({ kind, w: Math.ceil(SIZE[kind][0] * PPC), h: Math.ceil(SIZE[kind][1] * PPC) });
  // Shelf packing into a 2048-wide atlas.
  const W = 2048;
  let x = 0, y = 0, row = 0;
  const placed = cells.map((c) => {
    if (x + c.w > W) { x = 0; y += row + 4; row = 0; }
    const at = { ...c, px: x, py: y };
    x += c.w + 4; row = Math.max(row, c.h);
    return at;
  });
  const H = THREE.MathUtils.ceilPowerOfTwo(y + row);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d")!;
  const cards = new Map<string, Card[]>();
  placed.forEach((c, i) => {
    g.save();
    g.beginPath(); g.rect(c.px, c.py, c.w, c.h); g.clip();
    g.translate(c.px, c.py);
    paintCard(g, c.kind, c.w, c.h, rng(1000 + i * 7919), look);
    g.restore();
    cards.set(c.kind, [...(cards.get(c.kind) ?? []), c]);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const atlas = { texture, cards };
  atlases.set(look, atlas);
  return atlas;
}

function lookOf(l: MapLayout): Look {
  if (l.ground === "snow") return "snow";
  if (l.ground === "sand" || l.ground === "shore") return "dry";
  if (l.ground === "ash" || l.ground === "metal" || l.ground === "cave") return "dark";
  return "green";
}

/** Ground detail by look: kinds with weights, and one detail per this many cells. */
const DECOR: Record<Look, { kinds: [string, number][]; every: number }> = {
  green: { kinds: [["tuft", 0.55], ["flowers", 0.27], ["pebbles", 0.18]], every: 4 },
  dry: { kinds: [["dry_tuft", 0.55], ["pebbles", 0.45]], every: 7 },
  snow: { kinds: [["snow_tuft", 0.6], ["pebbles", 0.4]], every: 7 },
  dark: { kinds: [["pebbles", 0.7], ["dry_tuft", 0.3]], every: 6 },
};

/**
 * Small painted ground detail scattered over open ground (not roads, water
 * or anything blocked), the same every time for a map. walkable(x, y) and
 * road(x, y) come from the walk grid and a road raster.
 */
export function decorProps(l: MapLayout, walkable: (x: number, y: number) => boolean, road: (x: number, y: number) => boolean): Prop[] {
  const d = DECOR[lookOf(l)];
  const rand = rng([...l.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
  const out: Prop[] = [];
  const n = Math.round((l.width * l.height) / d.every);
  for (let i = 0; i < n; i++) {
    const x = rand() * l.width, y = rand() * l.height, pick = rand();
    const cx = Math.floor(x), cy = Math.floor(y);
    if (!walkable(cx, cy) || road(cx, cy)) continue;
    // Clumps: detail thins out where a slow wave says so, so meadows have bare and lush patches.
    if (Math.sin(x * 0.21) * Math.cos(y * 0.17) + Math.sin((x + y) * 0.09) < -0.6 && rand() < 0.7) continue;
    let acc = 0, kind = d.kinds[0][0];
    for (const [k, w] of d.kinds) { acc += w; if (pick < acc) { kind = k; break; } }
    out.push({ kind: kind as PropKind, x: x - 0.5, y: y - 0.5, block: 0, scale: 0.8 + rand() * 0.5 });
  }
  return out;
}

/** Boulders heaped over a rock or cliff blocker's footprint, deterministic. */
function heapOf(b: Blocker, contains: (x: number, y: number) => boolean, bounds: [number, number, number, number]): Prop[] {
  const cliff = b.kind === "cliff";
  const step = cliff ? 1.5 : 1.7;
  const out: Prop[] = [];
  const [bx, by, bw, bh] = bounds;
  let i = 0;
  for (let y = by; y < by + bh; y += step) for (let x = bx; x < bx + bw; x += step) {
    i++;
    const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const j = h - Math.floor(h);
    const px = x + (j - 0.5) * step * 0.7, py = y + ((h * 7) % 1 - 0.5) * step * 0.7;
    if (!contains(Math.floor(px), Math.floor(py))) continue;
    out.push({ kind: j < 0.3 && !cliff ? "rock" : "boulder", x: px - 0.5, y: py - 0.5, block: 0, scale: (cliff ? 1.1 : 0.75) + j * (cliff ? 0.9 : 0.6), rot: i });
  }
  return out;
}

/**
 * Adds the painted cards for a map's natural props (and boulder heaps over
 * rock/cliff blockers) to the group. Returns the props it drew, so the
 * caller can skip their models and give them contact shadows.
 */
export function buildPaintedProps(l: MapLayout, group: THREE.Group, track: <T extends { dispose(): void }>(x: T) => T,
  blockerCells: (b: Blocker) => { contains: (x: number, y: number) => boolean; bounds: [number, number, number, number] }, decor: Prop[] = []): Prop[] {
  const atlas = atlasFor(lookOf(l));
  const props = [...l.props.filter((p) => PAINTED_KINDS.has(p.kind)), ...decor];
  for (const b of l.blockers) if (b.kind === "rock" || b.kind === "cliff") { const c = blockerCells(b); props.push(...heapOf(b, c.contains, c.bounds)); }
  // One instanced card mesh per (kind, variant): a unit card, feet at the origin, leaning back to face the camera.
  const groups = new Map<Card, Prop[]>();
  for (const p of props) {
    const list = atlas.cards.get(p.kind);
    if (!list) continue;
    const v = Math.abs(Math.floor(p.x * 7 + p.y * 13)) % list.length;
    groups.set(list[v], [...(groups.get(list[v]) ?? []), p]);
  }
  const material = track(new THREE.MeshBasicMaterial({ map: atlas.texture, alphaTest: 0.45, side: THREE.DoubleSide }));
  const tex = atlas.texture.image as HTMLCanvasElement;
  const dummy = new THREE.Object3D();
  for (const [card, list] of groups) {
    const [cw, ch] = SIZE[card.kind];
    // Lean back so the card faces the camera, as the creature cards do.
    const geo = track(new THREE.PlaneGeometry(cw, ch).translate(0, ch / 2, 0).rotateX(-THREE.MathUtils.degToRad(CAMERA_PITCH)));
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (card.px + uv.getX(i) * card.w) / tex.width, 1 - (card.py + (1 - uv.getY(i)) * card.h) / tex.height);
    }
    uv.needsUpdate = true;
    const inst = new THREE.InstancedMesh(geo, material, list.length);
    inst.name = `painted-${card.kind}`;
    list.forEach((p, i) => {
      dummy.position.set(p.x + 0.5, 0, p.y + 0.5);
      const s = p.scale ?? 1;
      const flip = Math.floor(p.x * 3 + p.y * 5) % 2 === 0 ? 1 : -1;
      dummy.scale.set(s * flip, s, s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      const v = 0.9 + ((Math.abs(p.x * 31 + p.y * 17) % 20) / 100);
      inst.setColorAt(i, new THREE.Color(v, v, v * 0.98));
    });
    group.add(inst);
  }
  return props;
}
