// Game cursors, drawn once on a canvas in the HUD's materials (bronze, ivory,
// walnut outline): an arrow to walk, a sword over monsters, a grabbing hand
// over loot, a speech bubble over NPCs. Each is a CSS `cursor` value.

export type CursorKind = "walk" | "attack" | "pickup" | "talk";

const SIZE = 32;
const OUTLINE = "#1c1209";

function canvas(draw: (g: CanvasRenderingContext2D) => void): string {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const g = c.getContext("2d")!;
  g.lineJoin = "round";
  g.lineCap = "round";
  draw(g);
  return c.toDataURL("image/png");
}

/** Fill a path with a top-left lit gradient, outline it, then a thin highlight. */
function paint(g: CanvasRenderingContext2D, path: Path2D, light: string, dark: string, x0 = 0, y0 = 0, x1 = SIZE, y1 = SIZE) {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, light);
  grad.addColorStop(1, dark);
  g.lineWidth = 3;
  g.strokeStyle = OUTLINE;
  g.stroke(path);
  g.fillStyle = grad;
  g.fill(path);
  g.lineWidth = 1;
  g.strokeStyle = "rgba(255,248,220,.55)";
  g.stroke(path);
}

function walk(g: CanvasRenderingContext2D) {
  const p = new Path2D("M3 2 L3 24 L8.5 19 L12.5 28 L16.5 26.2 L12.6 17.4 L20 17.4 Z");
  paint(g, p, "#fbe7a4", "#9a6626", 3, 2, 18, 26);
  g.fillStyle = "#7fe0ff"; // an Aether bead at the joint
  g.beginPath(); g.arc(7, 14, 1.6, 0, Math.PI * 2); g.fill();
}

function attack(g: CanvasRenderingContext2D) {
  // Drawn pointing up, then turned so the tip sits at the hotspot (3, 3).
  g.translate(3, 3);
  g.rotate(-Math.PI / 4);
  const blade = new Path2D("M0 0 L3.2 5 L3.2 22 L-3.2 22 L-3.2 5 Z");
  paint(g, blade, "#ffffff", "#8c9aa8", -3, 0, 3, 22);
  g.strokeStyle = "rgba(60,70,82,.8)"; g.lineWidth = 1; // fuller
  g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 20); g.stroke();
  const guard = new Path2D("M-8 22 L8 22 L8 25.5 L-8 25.5 Z");
  paint(g, guard, "#f3d27a", "#8a5a1e", -8, 22, 8, 26);
  const grip = new Path2D("M-1.8 25.5 L1.8 25.5 L1.8 32 L-1.8 32 Z");
  paint(g, grip, "#7a4a24", "#3a2210", -2, 25, 2, 32);
  const pommel = new Path2D(); pommel.arc(0, 34, 2.6, 0, Math.PI * 2);
  paint(g, pommel, "#f3d27a", "#8a5a1e", -3, 31, 3, 37);
}

function pickup(g: CanvasRenderingContext2D) {
  // An open gauntlet hand reaching down, fingers spread a little.
  const hand = new Path2D(
    "M9 15 L9 6.5 Q9 4.5 11 4.5 Q13 4.5 13 6.5 L13 13" +
    " L13 4 Q13 2 15 2 Q17 2 17 4 L17 13" +
    " L17 5 Q17 3 19 3 Q21 3 21 5 L21 14" +
    " L21 8 Q21 6 23 6 Q25 6 25 8 L25 19" +
    " Q25 27 18 28.5 L14 28.5 Q10 28.5 8 25 L3.8 18.5 Q2.8 16.5 4.6 15.6 Q6.4 14.8 8 16.5 Z",
  );
  paint(g, hand, "#fff2cf", "#b98b4b", 4, 2, 24, 29);
  g.strokeStyle = "rgba(70,42,14,.75)"; g.lineWidth = 1.2; // gaps between the fingers
  g.beginPath();
  for (const [x, top] of [[13, 7], [17, 5], [21, 8]]) { g.moveTo(x, top); g.lineTo(x, 18); }
  g.stroke();
  const cuff = new Path2D("M11 26.5 L24.5 23.5 L25.6 28 L12.6 31 Z");
  paint(g, cuff, "#f3d27a", "#8a5a1e", 11, 23, 25, 31);
}

function talk(g: CanvasRenderingContext2D) {
  const bubble = new Path2D("M6 4 L26 4 Q29 4 29 7 L29 18 Q29 21 26 21 L14 21 L8 27 L9 21 L6 21 Q3 21 3 18 L3 7 Q3 4 6 4 Z");
  paint(g, bubble, "#fff8e6", "#d2b583", 3, 4, 29, 27);
  g.fillStyle = "#5a3a18";
  for (const x of [10, 16, 22]) { g.beginPath(); g.arc(x, 12.5, 1.9, 0, Math.PI * 2); g.fill(); }
}

const HOTSPOT: Record<CursorKind, [number, number]> = { walk: [3, 2], attack: [3, 3], pickup: [15, 3], talk: [4, 5] };
const DRAW: Record<CursorKind, (g: CanvasRenderingContext2D) => void> = { walk, attack, pickup, talk };
const FALLBACK: Record<CursorKind, string> = { walk: "pointer", attack: "crosshair", pickup: "grab", talk: "help" };
const cache = new Map<CursorKind, string>();

/** The CSS cursor value for a kind (drawn on first use). */
export function gameCursor(kind: CursorKind): string {
  let v = cache.get(kind);
  if (!v) {
    const [x, y] = HOTSPOT[kind];
    v = `url(${canvas(DRAW[kind])}) ${x} ${y}, ${FALLBACK[kind]}`;
    cache.set(kind, v);
  }
  return v;
}
