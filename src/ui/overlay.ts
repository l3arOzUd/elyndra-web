import * as THREE from "three";
import { DEFAULT_DISTANCE } from "../render/camera";

// DOM over the 3D view: names, HP bars and floating numbers. Damage on one
// target is summed over 150 ms into one number (HORDE_SPEC §3). Multi-hit
// skills work the RO way: each part lands big at the target and rises, so a
// combo streams upward, while the target's own counter above it counts the
// sum up hit by hit, then floats off. A target keeps a small sideways offset
// (from its id) so piled monsters' numbers don't sit exactly on each other.
// At most MAX_FLOATS numbers exist at once, from a pool. Numbers, names and
// HP bars scale with the camera like the sprites do: bigger zoomed in,
// smaller zoomed out (CSS sizes are for the default zoom).

const tmp = new THREE.Vector3();
const MAX_FLOATS = 300;
const MERGE_MS = 150;
/** Limits on the zoom scale, so numbers stay readable at both ends. */
const MIN_ZOOM_SCALE = 0.5, MAX_ZOOM_SCALE = 2;

/** The same skill warning repeats at most this often while a key is held. */
const WARN_REPEAT_MS = 500;
type FloatKind = "dmg" | "crit" | "taken" | "heal" | "exp" | "info" | "part" | "part-crit" | "total" | "warn-sp" | "warn";

interface Float {
  el: HTMLElement; pos: THREE.Vector3; age: number; life: number; busy: boolean;
  dx: number; dy: number; rise: number; pop: number;
  /** A combo counter still counting: it holds still until finished. */
  hold: boolean; key: string; sum: number;
}

/** A target's sideways column, stable for its id. */
const columnOf = (id: number) => ((id * 37) % 9 - 4) * 5;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export class Overlay {
  private pool: Float[] = [];
  private pending = new Map<number, { amount: number; crit: boolean; kind: FloatKind; pos: THREE.Vector3; at: number }>();
  private counters = new Map<string, Float>();

  constructor(private readonly root: HTMLElement) {}

  label(name: string, cls: string, showBar: boolean, title?: string): Label {
    const el = document.createElement("div");
    el.className = `tag ${cls}`;
    const nameEl = document.createElement("div");
    nameEl.className = "tag-name";
    nameEl.textContent = name;
    el.append(nameEl);
    if (title) {
      // An NPC's role under its name ("Dawnmeadow Scout").
      const titleEl = document.createElement("div");
      titleEl.className = "tag-title";
      titleEl.textContent = title;
      el.append(titleEl);
    }
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

  /** Queues damage on a target; numbers within 150 ms merge. */
  damage(target: number, amount: number, crit: boolean, kind: FloatKind, pos: THREE.Vector3) {
    const p = this.pending.get(target);
    if (p) { p.amount += amount; p.crit ||= crit; p.pos.copy(pos); return; }
    this.pending.set(target, { amount, crit, kind, pos: pos.clone(), at: performance.now() });
  }

  /** One part of a multi-hit skill (RO style): a big number pops at the
   * target and rises, and the target's own counter `key` above it counts the
   * sum up. Every monster gets its own numbers, never another's. */
  part(key: string, target: number, amount: number, crit: boolean, pos: THREE.Vector3) {
    const col = columnOf(target);
    this.spawn(String(amount), pos, crit ? "part-crit" : "part", { dx: col, dy: 6, rise: 52, life: 850 });
    let c = this.counters.get(key);
    if (!c || c.key !== key) {
      c = this.spawn("0", pos, "total", { dx: col, dy: 66, rise: 40, life: 900, hold: true });
      c.key = key;
      c.sum = 0;
      this.counters.set(key, c);
    }
    c.sum += amount;
    c.el.textContent = String(c.sum);
    c.pop = 0;
  }

  /** The combo is over: its counter lingers a moment, then floats off. */
  endCombo(key: string) {
    const c = this.counters.get(key);
    this.counters.delete(key);
    if (c && c.key === key && c.hold) { c.hold = false; c.age = -350; }
  }

  text(text: string, pos: THREE.Vector3, kind: FloatKind) {
    this.spawn(text, pos, kind);
  }

  /**
   * A warning over the player (not enough SP, not ready, locked): drifts up
   * slowly and fades, so it reads where the player is looking. The same
   * warning again restarts it instead of stacking copies.
   */
  warn(text: string, pos: THREE.Vector3, kind: "warn-sp" | "warn"): boolean {
    // A held key repeats ~30 times a second: the same warning shows again at
    // most every WARN_REPEAT_MS, so holding reads as a steady pulse, not a flicker.
    const now = performance.now();
    if (text === this.lastWarn.text && now - this.lastWarn.at < WARN_REPEAT_MS) return false;
    this.lastWarn = { text, at: now };
    const live = this.pool.find((f) => f.busy && f.key === "warn");
    if (live && live.el.textContent === text) { live.age = 0; live.pop = 0; live.pos.copy(pos); return true; }
    if (live) { live.busy = false; live.el.style.display = "none"; }
    const f = this.spawn(text, pos, kind, { dx: 0, rise: 34, life: 1700 });
    f.key = "warn";
    return true;
  }

  private lastWarn = { text: "", at: -Infinity };

  private spawn(text: string, pos: THREE.Vector3, kind: FloatKind,
    o: { dx?: number; dy?: number; rise?: number; life?: number; hold?: boolean } = {}): Float {
    let f = this.pool.find((x) => !x.busy);
    if (!f) {
      if (this.pool.length >= MAX_FLOATS) {
        f = this.pool.reduce((a, b) => (!a.hold && (b.hold || a.age > b.age) ? a : b)); // recycle the oldest
      } else {
        const el = document.createElement("div");
        this.root.append(el);
        f = { el, pos: new THREE.Vector3(), age: 0, life: 900, busy: false, dx: 0, dy: 0, rise: 0, pop: 0, hold: false, key: "", sum: 0 };
        this.pool.push(f);
      }
    }
    f.busy = true;
    f.age = 0;
    f.pop = 0;
    f.life = o.life ?? 1000;
    f.rise = o.rise ?? 60;
    f.dx = o.dx ?? (kind === "info" ? 0 : (Math.random() - 0.5) * 30);
    f.dy = o.dy ?? 0;
    f.hold = o.hold ?? false;
    f.key = "";
    f.pos.copy(pos);
    f.el.className = `float float-${kind}`;
    f.el.textContent = text;
    f.el.style.display = "";
    return f;
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
      f.pop += dtMs;
      if (!f.hold) f.age += dtMs;
      if (f.age >= f.life) { f.busy = false; f.el.style.display = "none"; continue; }
      const t = Math.max(0, f.age) / f.life;
      const zoom = THREE.MathUtils.clamp(DEFAULT_DISTANCE / camera.position.distanceTo(f.pos), MIN_ZOOM_SCALE, MAX_ZOOM_SCALE);
      const [x, y] = project(tmp.copy(f.pos), camera, w, h);
      // A pop when it appears or counts up: RO parts land big and settle.
      const pop = f.el.className.includes("part") ? 1 + 0.8 * Math.max(0, 1 - f.pop / 140) : 1 + 0.35 * Math.max(0, 1 - f.pop / 160);
      f.el.style.transform = `translate(${x + f.dx * zoom}px, ${y - (f.dy + f.rise * easeOut(t)) * zoom}px) translate(-50%, -100%) scale(${pop * zoom})`;
      f.el.style.opacity = String(t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
    }
  }

  clear() {
    this.pending.clear();
    this.counters.clear();
    for (const f of this.pool) { f.busy = false; f.el.style.display = "none"; }
  }
}

export class Label {
  private castEl: HTMLElement | null = null;
  private castTimer = 0;

  constructor(readonly el: HTMLElement, private readonly fill: HTMLElement | null) {}

  /** A cast bar over the name (RO style): fills over `ms`, flares as the skill goes off, then fades. */
  cast(skill: string, ms: number) {
    this.castEl?.remove();
    clearTimeout(this.castTimer);
    const el = document.createElement("div");
    el.className = "tag-cast";
    el.style.setProperty("--cast-ms", `${ms}ms`);
    const name = document.createElement("div");
    name.className = "tag-cast-name";
    name.textContent = skill;
    const bar = document.createElement("div");
    bar.className = "tag-cast-bar";
    bar.append(document.createElement("div"));
    el.append(name, bar);
    this.el.append(el);
    this.castEl = el;
    this.castTimer = window.setTimeout(() => {
      el.classList.add("tag-cast-done");
      this.castTimer = window.setTimeout(() => { el.remove(); if (this.castEl === el) this.castEl = null; }, 320);
    }, ms);
  }

  setHp(hp: number, max: number) {
    if (this.fill) this.fill.style.width = `${Math.max(0, Math.min(1, hp / max)) * 100}%`;
    this.el.classList.toggle("tag-hurt", hp < max);
  }

  place(pos: THREE.Vector3, camera: THREE.Camera, w: number, h: number) {
    // Names and HP bars scale with the camera like the sprites and the
    // floating numbers, pinned at their bottom centre just over the head.
    const zoom = THREE.MathUtils.clamp(DEFAULT_DISTANCE / camera.position.distanceTo(pos), MIN_ZOOM_SCALE, MAX_ZOOM_SCALE);
    const [x, y, behind] = project(tmp.copy(pos), camera, w, h);
    this.el.style.display = behind ? "none" : "";
    this.el.style.transform = `translate(${x}px, ${y}px) scale(${zoom}) translate(-50%, -100%)`;
  }

  set targeted(on: boolean) { this.el.classList.toggle("tag-target", on); }
  set hover(on: boolean) { this.el.classList.toggle("tag-hover", on); }

  remove() { this.el.remove(); }
}

export function project(v: THREE.Vector3, camera: THREE.Camera, w: number, h: number): [number, number, boolean] {
  v.project(camera);
  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h, v.z > 1];
}
