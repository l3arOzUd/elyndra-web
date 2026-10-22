import * as THREE from "three";

// Ground markers for walking: the cell under the cursor (a square with corner
// brackets, tinted by the material: white walkable, red blocked) and the
// spot you clicked (four arrows closing on a glowing bead, then fading).
// Textures are drawn once on canvases in white so a material colour tints them.

function texture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function flat(tex: THREE.Texture, w: number, h = w, color = 0xffffff, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false }),
  );
  m.position.y = 0.06;
  return m;
}

const CELL_TEX = () => texture(128, (g, s) => {
  const pad = 10, r = 14, a = pad, b = s - pad;
  g.fillStyle = "rgba(255,255,255,.13)";
  g.beginPath(); g.roundRect(a, a, b - a, b - a, r); g.fill();
  g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 3;
  g.beginPath(); g.roundRect(a, a, b - a, b - a, r); g.stroke();
  // Corner brackets, with a dark edge so they read on pale stone too.
  const L = 30;
  const corners: [number, number, number, number][] = [[a, a, 1, 1], [b, a, -1, 1], [a, b, 1, -1], [b, b, -1, -1]];
  for (const [stroke, w] of [["rgba(20,12,4,.55)", 11], ["#ffffff", 6]] as const) {
    g.strokeStyle = stroke; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round";
    for (const [x, y, dx, dy] of corners) {
      g.beginPath(); g.moveTo(x + dx * L, y); g.lineTo(x, y); g.lineTo(x, y + dy * L); g.stroke();
    }
  }
});

/** The cell the cursor is over. Set `material.color` to tint it. */
export function makeHoverCell(): THREE.Mesh {
  return flat(CELL_TEX(), 0.98, 0.98, 0xffffff, 0.9);
}

const BEAD_TEX = () => texture(128, (g, s) => {
  const c = s / 2;
  const halo = g.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, "rgba(255,255,255,1)");
  halo.addColorStop(0.18, "rgba(255,255,255,.95)");
  halo.addColorStop(0.32, "rgba(255,255,255,.45)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = halo; g.fillRect(0, 0, s, s);
  // A small diamond core.
  g.fillStyle = "#ffffff"; g.strokeStyle = "rgba(20,12,4,.6)"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(c, c - 16); g.lineTo(c + 12, c); g.lineTo(c, c + 16); g.lineTo(c - 12, c); g.closePath(); g.stroke(); g.fill();
});

/** One chevron pointing toward +x (the centre), drawn in white. */
const ARROW_TEX = () => texture(64, (g, s) => {
  for (const [stroke, w] of [["rgba(20,12,4,.6)", 14], ["#ffffff", 8]] as const) {
    g.strokeStyle = stroke; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(s * 0.3, s * 0.2); g.lineTo(s * 0.68, s * 0.5); g.lineTo(s * 0.3, s * 0.8); g.stroke();
  }
});

/** The walk destination: arrows close in on the spot, then everything fades. */
export class ClickMarker {
  readonly group = new THREE.Group();
  private bead: THREE.Mesh;
  private arrows: THREE.Mesh[] = [];

  constructor(color: number) {
    this.bead = flat(BEAD_TEX(), 0.9, 0.9, color);
    this.group.add(this.bead);
    const tex = ARROW_TEX();
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = (i * Math.PI) / 2;
      const a = flat(tex, 0.42, 0.42, color);
      pivot.add(a);
      this.group.add(pivot);
      this.arrows.push(a);
    }
    this.group.visible = false;
  }

  /** age runs 0 -> 1 over the marker's life. */
  update(age: number) {
    this.group.visible = age < 1;
    if (!this.group.visible) return;
    const close = Math.min(1, age / 0.35), ease = 1 - (1 - close) ** 3;
    const fade = age < 0.55 ? 1 : 1 - (age - 0.55) / 0.45;
    // Arrows sit outside the cell and slide in to its edge, pointing inward.
    for (const a of this.arrows) {
      a.position.x = -(0.95 - 0.5 * ease);
      (a.material as THREE.MeshBasicMaterial).opacity = fade;
    }
    const pulse = 1 + 0.25 * Math.sin(Math.min(1, age / 0.35) * Math.PI);
    this.bead.scale.setScalar(pulse * (0.6 + 0.4 * ease));
    (this.bead.material as THREE.MeshBasicMaterial).opacity = fade;
  }
}

const TARGET_TEX = () => texture(256, (g, s) => {
  const c = s / 2, r = s * 0.34;
  // Soft inner glow, then a thin double ring with a dark edge.
  const glow = g.createRadialGradient(c, c, r * 0.55, c, c, r * 1.05);
  glow.addColorStop(0, "rgba(255,255,255,0)");
  glow.addColorStop(0.8, "rgba(255,255,255,.16)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow; g.fillRect(0, 0, s, s);
  for (const [stroke, w, rr] of [["rgba(20,12,4,.6)", 10, r], ["#ffffff", 5, r], ["rgba(255,255,255,.45)", 2, r * 0.84]] as const) {
    g.strokeStyle = stroke; g.lineWidth = w;
    g.beginPath(); g.arc(c, c, rr, 0, Math.PI * 2); g.stroke();
  }
  // Four arrowheads outside the ring, pointing in.
  for (let i = 0; i < 4; i++) {
    g.save(); g.translate(c, c); g.rotate((i * Math.PI) / 2);
    g.beginPath(); g.moveTo(0, -r - 6); g.lineTo(15, -r - 34); g.lineTo(-15, -r - 34); g.closePath();
    g.lineJoin = "round"; g.strokeStyle = "rgba(20,12,4,.65)"; g.lineWidth = 7; g.stroke();
    g.fillStyle = "#ffffff"; g.fill();
    g.restore();
  }
});

/** The selected target: a gold ring with four arrowheads, turning slowly. */
export class TargetMarker {
  readonly mesh: THREE.Mesh;
  constructor(color: number) {
    this.mesh = flat(TARGET_TEX(), 1, 1, color, 0.95);
    this.mesh.visible = false;
  }

  /** Follow a target at (x, z); `now` in ms drives the turn and a soft pulse. */
  place(x: number, z: number, now: number) {
    this.mesh.position.set(x, 0.07, z);
    this.mesh.rotation.y = now / 2400;
    this.mesh.scale.setScalar(1.45 + Math.sin(now / 260) * 0.05);
  }
}
