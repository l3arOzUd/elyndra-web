// Turns a MapDesign into a MapLayout: lays down blockers, roads and props,
// scatters decoration deterministically, and bakes the walk grid.

import { encodeWalk, type MapLayout, type Prop, type Rect, type Shape } from "../src/data/schema";
import { hashString, rng } from "../src/shared/rng";
import type { MapDesign } from "./types";

export function shapeContains(s: Shape, x: number, y: number): boolean {
  const px = x + 0.5, py = y + 0.5;
  if ("rect" in s) {
    const [rx, ry, rw, rh] = s.rect;
    return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
  }
  if ("ellipse" in s) {
    const [cx, cy, rx, ry] = s.ellipse;
    return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
  }
  let inside = false;
  const p = s.poly;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function shapeBounds(s: Shape): Rect {
  if ("rect" in s) return s.rect;
  if ("ellipse" in s) {
    const [cx, cy, rx, ry] = s.ellipse;
    return [Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(rx * 2) + 1, Math.ceil(ry * 2) + 1];
  }
  const xs = s.poly.map((p) => p[0]), ys = s.poly.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
  return [x, y, Math.ceil(Math.max(...xs)) - x + 1, Math.ceil(Math.max(...ys)) - y + 1];
}

/** Cells a road covers: every cell within width/2 of its centre line. */
export function roadCells(points: [number, number][], width: number, each: (x: number, y: number) => void) {
  const r = width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1];
    const minX = Math.floor(Math.min(ax, bx) - r - 1), maxX = Math.ceil(Math.max(ax, bx) + r + 1);
    const minY = Math.floor(Math.min(ay, by) - r - 1), maxY = Math.ceil(Math.max(ay, by) + r + 1);
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const qx = ax + t * dx, qy = ay + t * dy;
      if ((px - qx) ** 2 + (py - qy) ** 2 <= r * r) each(x, y);
    }
  }
}

function blockFootprint(p: Prop, each: (x: number, y: number) => void) {
  if (p.block <= 0) return;
  const h = Math.floor(p.block / 2);
  for (let dy = -h; dy < p.block - h; dy++) for (let dx = -h; dx < p.block - h; dx++) each(Math.round(p.x) + dx, Math.round(p.y) + dy);
}

export function bakeLayout(d: MapDesign, keepClear: [number, number, number][] = []): MapLayout {
  const [w, h] = d.size;
  const walk = new Uint8Array(w * h).fill(d.solid ? 0 : 1);
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < w && y < h) walk[y * w + x] = v; };
  const isRoad = new Uint8Array(w * h);

  for (const s of d.carve ?? []) {
    const [bx, by, bw, bh] = shapeBounds(s);
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (shapeContains(s, x, y)) set(x, y, 1);
  }
  if (d.border) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (Math.min(x, y, w - 1 - x, h - 1 - y) < d.border.width) set(x, y, 0);
    }
  }
  for (const b of d.blockers) {
    const [bx, by, bw, bh] = shapeBounds(b.shape);
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (shapeContains(b.shape, x, y)) set(x, y, 0);
  }
  // Roads win over blockers: that is how bridges and gates are made.
  for (const r of d.roads) roadCells(r.points, r.width, (x, y) => { set(x, y, 1); if (x >= 0 && y >= 0 && x < w && y < h) isRoad[y * w + x] = 1; });
  for (const p of d.props) blockFootprint(p, (x, y) => set(x, y, 0));

  // Scatter decoration where it won't get in the way.
  const rand = rng(hashString(d.id + ":scatter"));
  const props: Prop[] = [...d.props];
  const avoid = (x: number, y: number) => {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return true;
    if (walk[y * w + x] !== 1) return true;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && isRoad[ny * w + nx]) return true;
    }
    // In a town the whole map is safe; only keep scatter off small safe areas (camps).
    if (d.safe_areas.some((r) => (d.type !== "town" || r[2] * r[3] < w * h) && x >= r[0] - 1 && y >= r[1] - 1 && x < r[0] + r[2] + 1 && y < r[1] + r[3] + 1)) return true;
    if (keepClear.some(([cx, cy, cr]) => Math.max(Math.abs(cx - x), Math.abs(cy - y)) <= cr)) return true;
    return false;
  };
  const inPocket = (x: number, y: number) => d.pockets.some((p) => p.rects.some((r) => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]));
  for (const s of d.scatter) {
    const area = s.area ?? [0, 0, w, h];
    let placed = 0;
    for (let tries = 0; placed < s.count && tries < s.count * 30; tries++) {
      const x = area[0] + Math.floor(rand() * area[2]);
      const y = area[1] + Math.floor(rand() * area[3]);
      if (avoid(x, y)) continue;
      // Hordes need open ground: blocking scatter is thinned inside pockets.
      if (s.block > 0 && inPocket(x, y) && rand() > 0.12) continue;
      const scale = s.scale ? s.scale[0] + rand() * (s.scale[1] - s.scale[0]) : 1;
      const p: Prop = { kind: s.kind, x, y, block: s.block, scale: Math.round(scale * 100) / 100, rot: Math.round(rand() * 628) / 100 };
      props.push(p);
      blockFootprint(p, (bx, by) => set(bx, by, 0));
      placed++;
    }
  }
  // The border is four blockers like any other, so the client draws it.
  const blockers = [...d.blockers];
  if (d.border) {
    const k = d.border.width;
    const kind = d.border.kind;
    blockers.push(
      { kind, shape: { rect: [0, 0, w, k] } }, { kind, shape: { rect: [0, h - k, w, k] } },
      { kind, shape: { rect: [0, k, k, h - 2 * k] } }, { kind, shape: { rect: [w - k, k, k, h - 2 * k] } },
    );
  }
  // Forest blockers are drawn as trees, so give them trees (not on roads cut through them).
  for (const b of blockers) {
    if (b.kind !== "forest") continue;
    const [bx, by, bw, bh] = shapeBounds(b.shape);
    for (let y = by; y < by + bh; y += 2) for (let x = bx; x < bx + bw; x += 2) {
      if (!shapeContains(b.shape, x, y) || rand() < 0.35) continue;
      if (x >= 0 && y >= 0 && x < w && y < h && walk[y * w + x] === 1) continue;
      props.push({ kind: d.ground === "snow" ? "pine" : "tree", x: x + rand(), y: y + rand(), block: 0, scale: Math.round((0.8 + rand() * 0.6) * 100) / 100, rot: Math.round(rand() * 628) / 100 });
    }
  }
  return {
    id: d.id,
    width: w,
    height: h,
    theme: d.theme,
    ground: d.ground,
    roads: d.roads,
    blockers,
    props,
    landmarks: d.landmarks,
    safe_areas: d.safe_areas,
    walk_rle: encodeWalk(walk),
  };
}
