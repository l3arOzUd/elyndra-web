import * as THREE from "three";

// DOM over the 3D view: names, HP bars and floating numbers. Damage on one
// target is summed over 150 ms into one number (HORDE_SPEC §3), except the
// parts of a multi-hit skill, which each keep their own number, stepped up
// like a ladder (RO style). At most MAX_FLOATS numbers exist at once, from a
// pool (a 40-target, 5-hit Gearstorm is 200), each nudged sideways so a
// stack stays readable.

const tmp = new THREE.Vector3();
const MAX_FLOATS = 300;
const MERGE_MS = 150;

type FloatKind = "dmg" | "crit" | "taken" | "heal" | "exp" | "info" | "total";

interface Float { el: HTMLElement; pos: THREE.Vector3; age: number; life: number; busy: boolean; dx: number; dy: number }

export class Overlay {
  private pool: Float[] = [];
  private pending = new Map<number, { amount: number; crit: boolean; kind: FloatKind; pos: THREE.Vector3; at: number }>();

  constructor(private readonly root: HTMLElement) {}

  label(name: string, cls: string, showBar: boolean): Label {
    const el = document.createElement("div");
    el.className = `tag ${cls}`;
    const nameEl = document.createElement("div");
    nameEl.className = "tag-name";
    nameEl.textContent = name;
    el.append(nameEl);
    let fill: HTMLElement | null = null;
    if (showBar) {
      const bar = document.createElement("div");
      bar.className = "tag-bar";
      fill = document.createElement("div");
      bar.append(fill);
      el.append(bar);
    }
    this.root.append(el);
    return new Label(el, fill);
  }

  /** Queues damage on a target; numbers within 150 ms merge. A multi-hit part
   * (its index in the cast) shows at once, `part` steps above the first. */
  damage(target: number, amount: number, crit: boolean, kind: FloatKind, pos: THREE.Vector3, part?: number) {
    if (part !== undefined) { this.spawn(String(amount), pos, crit ? "crit" : kind, part * 16); return; }
    const p = this.pending.get(target);
    if (p) { p.amount += amount; p.crit ||= crit; p.pos.copy(pos); return; }
    this.pending.set(target, { amount, crit, kind, pos: pos.clone(), at: performance.now() });
  }

  /** A multi-hit skill's sum on one target, big, above its ladder of parts. */
  total(amount: number, pos: THREE.Vector3, parts: number) {
    this.spawn(String(amount), pos, "total", parts * 16 + 12);
  }

  text(text: string, pos: THREE.Vector3, kind: FloatKind) {
    this.spawn(text, pos, kind);
  }

  private spawn(text: string, pos: THREE.Vector3, kind: FloatKind, rise = 0) {
    let f = this.pool.find((x) => !x.busy);
    if (!f) {
      if (this.pool.length >= MAX_FLOATS) {
        f = this.pool.reduce((a, b) => (a.age > b.age ? a : b)); // recycle the oldest
      } else {
        const el = document.createElement("div");
        this.root.append(el);
        f = { el, pos: new THREE.Vector3(), age: 0, life: 900, busy: false, dx: 0, dy: 0 };
        this.pool.push(f);
      }
    }
    f.busy = true;
    f.age = 0;
    f.life = kind === "total" ? 1400 : 900;
    f.dx = kind === "total" ? 0 : kind === "info" ? 0 : (Math.random() - 0.5) * (rise ? 16 : 36);
    f.dy = rise;
    f.pos.copy(pos);
    f.el.className = `float float-${kind}`;
    f.el.textContent = text;
    f.el.style.display = "";
  }

  update(dtMs: number, camera: THREE.Camera, w: number, h: number) {
    const now = performance.now();
    for (const [id, p] of this.pending) {
      if (now - p.at < MERGE_MS) continue;
      this.pending.delete(id);
      this.spawn(String(p.amount), p.pos, p.crit ? "crit" : p.kind);
    }
    for (const f of this.pool) {
      if (!f.busy) continue;
      f.age += dtMs;
      if (f.age >= f.life) { f.busy = false; f.el.style.display = "none"; continue; }
      const t = f.age / f.life;
      const [x, y] = project(tmp.copy(f.pos), camera, w, h);
      f.el.style.transform = `translate(${x + f.dx}px, ${y - f.dy - 34 * t}px) translate(-50%, -100%) scale(${1 + Math.max(0, 0.25 - t)})`;
      f.el.style.opacity = String(t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35);
    }
  }

  clear() {
    this.pending.clear();
    for (const f of this.pool) { f.busy = false; f.el.style.display = "none"; }
  }
}

export class Label {
  constructor(readonly el: HTMLElement, private readonly fill: HTMLElement | null) {}

  setHp(hp: number, max: number) {
    if (this.fill) this.fill.style.width = `${Math.max(0, Math.min(1, hp / max)) * 100}%`;
    this.el.classList.toggle("tag-hurt", hp < max);
  }

  place(pos: THREE.Vector3, camera: THREE.Camera, w: number, h: number) {
    const [x, y, behind] = project(tmp.copy(pos), camera, w, h);
    this.el.style.display = behind ? "none" : "";
    this.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  set targeted(on: boolean) { this.el.classList.toggle("tag-target", on); }
  set hover(on: boolean) { this.el.classList.toggle("tag-hover", on); }

  remove() { this.el.remove(); }
}

export function project(v: THREE.Vector3, camera: THREE.Camera, w: number, h: number): [number, number, boolean] {
  v.project(camera);
  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h, v.z > 1];
}
