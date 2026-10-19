import type { Dir } from "../shared/dir";
import { spriteFromImages, type AnimName, type SpriteDef, type SpriteDefJson } from "./spriteDef";

// The Wayfarer as a paper doll: body parts and equipment layers are separate
// PNGs (public/sprites/wayfarer/), all drawn in their resting place on one
// art canvas. rig.json gives each part's pivot and parent; this file turns
// them by pose, stacks them in the view's order with whatever is equipped,
// and bakes ordinary sprite sheets, so SpriteActor draws a player exactly
// like any other sprite. One bake per outfit, cached.
//
// Art rules for the PNGs: CHARACTER_ART_GUIDE.md.

type Vec = [number, number];
interface PartDef { pivot: Vec; parent: string }
interface ViewDef { parts: Record<string, PartDef>; order: string[] }
export interface Rig {
  canvas: number;
  feet: Vec;
  frame: number;
  pixelsPerCell: number;
  facings: Partial<Record<Dir, string>>;
  attach: Record<string, string>;
  views: Record<string, ViewDef>;
}
export interface ItemLook { name: string; slot: string; visual: string; layers: string[]; hides?: string[] }
export interface PaperDollKit { rig: Rig; items: Record<string, ItemLook>; img: Map<string, HTMLImageElement> }

const DIR = "sprites/wayfarer/";

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null); // a part not drawn yet is simply left out
    im.src = url;
  });
}

/**
 * Loads rig.json, equipment.json and every part and layer PNG they name.
 * `bust` (any string) fetches past the browser cache, for picking up new art.
 */
export async function loadPaperDoll(base = DIR, bust = ""): Promise<PaperDollKit> {
  const q = bust ? `?v=${encodeURIComponent(bust)}` : "";
  const rig = (await (await fetch(base + "rig.json" + q)).json()) as Rig;
  const items = ((await (await fetch(base + "equipment.json" + q)).json()) as { items: Record<string, ItemLook> }).items;
  const files: string[] = [];
  for (const [view, v] of Object.entries(rig.views)) {
    for (const part of Object.keys(v.parts)) files.push(`base/${view}/${part}.png`);
    for (const it of Object.values(items)) for (const layer of it.layers) files.push(`items/${it.visual}/${view}/${layer}.png`);
  }
  const img = new Map<string, HTMLImageElement>();
  const loaded = await Promise.all(files.map((f) => loadImage(base + f + q)));
  files.forEach((f, i) => { if (loaded[i]) img.set(f, loaded[i]!); });
  return { rig, items, img };
}

// --- poses --------------------------------------------------------------------------------

/** Frame counts and timing; the attack's "hit" event is the strike frame. */
export const DOLL_ANIMS: SpriteDefJson["animations"] = {
  idle: { file: "(paper doll)", frames: 8, fps: 6, loop: true },
  walk: { file: "(paper doll)", frames: 8, fps: 12, loop: true, refMsPerCell: 150 },
  attack: { file: "(paper doll)", frames: 8, fps: 16, events: { hit: 4 } },
  hit: { file: "(paper doll)", frames: 4, fps: 12 },
  death: { file: "(paper doll)", frames: 8, fps: 10, hold: true },
};

interface Pose {
  /** Whole body: turn (degrees, clockwise) about the feet, then shift (art px). */
  rot: number;
  dx: number;
  dy: number;
  /** Per part: turn about its pivot (degrees, clockwise) and lift (art px, up). */
  angle: Record<string, number>;
  lift: Record<string, number>;
  hurt: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * The pose of every part for one frame. Side view faces screen-left, so a
 * clockwise turn moves a hanging limb forward (left) and tips the body back.
 */
export function poseAt(view: string, anim: AnimName, f: number, n: number): Pose {
  const p: Pose = { rot: 0, dx: 0, dy: 0, angle: {}, lift: {}, hurt: 0 };
  const t = f / n; // looping clips
  const k = n > 1 ? f / (n - 1) : 1; // one-shot clips, 0..1
  const side = view === "side";
  // Raising the weapon arm outwards: clockwise on the front (arm on screen-left), anticlockwise from the back.
  const out = view === "back" ? -1 : 1;
  switch (anim) {
    case "idle": {
      const s = Math.sin(t * Math.PI * 2);
      p.dy = s * 3;
      p.angle.arm_near = s * 3 * out;
      p.angle.arm_far = -s * 3 * out;
      break;
    }
    case "walk": {
      const s = Math.sin(t * Math.PI * 2);
      p.dy = -Math.abs(Math.cos(t * Math.PI * 2)) * 7;
      if (side) {
        p.angle.thigh_near = s * 28;
        p.angle.thigh_far = -s * 28;
        p.angle.shin_near = Math.min(0, s) * 38;
        p.angle.shin_far = Math.min(0, -s) * 38;
        p.angle.arm_near = -s * 22;
        p.angle.arm_far = s * 22;
        p.rot = -3;
      } else {
        p.lift.thigh_near = Math.max(0, s) * 12;
        p.lift.thigh_far = Math.max(0, -s) * 12;
        p.angle.arm_near = s * 9 * out;
        p.angle.arm_far = s * 9 * out;
      }
      break;
    }
    case "attack": {
      // Wind up to 0.4, strike by 0.6 (the hit frame), recover.
      const up = side ? -150 : 150 * out;
      const down = side ? 70 : -40 * out;
      const a = k < 0.4 ? lerp(0, up, ease(k / 0.4)) : k < 0.6 ? lerp(up, down, ease((k - 0.4) / 0.2)) : lerp(down, 0, ease((k - 0.6) / 0.4));
      p.angle.arm_near = a;
      if (side) {
        p.rot = k < 0.4 ? lerp(0, 5, k / 0.4) : k < 0.6 ? lerp(5, -8, (k - 0.4) / 0.2) : lerp(-8, 0, (k - 0.6) / 0.4);
        p.angle.thigh_near = k >= 0.4 ? 14 * (1 - Math.abs(k - 0.6) / 0.4) : 0;
        p.angle.arm_far = -a * 0.15;
      } else {
        p.dy = k >= 0.4 && k < 0.8 ? 4 : 0;
      }
      break;
    }
    case "hit": {
      const h = 1 - t;
      p.hurt = h;
      if (side) p.rot = 10 * h;
      else p.dy = -6 * h;
      p.angle.arm_near = (side ? -12 : 10 * out) * h;
      p.angle.arm_far = (side ? 12 : -10 * out) * h;
      break;
    }
    case "death": {
      const fall = Math.min(1, k * 1.25);
      p.rot = ease(fall) * 84;
      p.dx = -ease(fall) * 200; // the body is ~400 px long: centre it on the feet once it lies down
      p.hurt = 0.5 * (1 - k);
      p.angle.arm_near = (side ? 30 : -20 * out) * fall;
      p.angle.arm_far = (side ? -20 : 20 * out) * fall;
      p.angle.head = 8 * fall;
      break;
    }
  }
  return p;
}

// --- baking -------------------------------------------------------------------------------

const ROWS: Dir[] = ["S", "SW", "W", "NW", "N"];

function drawCell(g: CanvasRenderingContext2D, kit: PaperDollKit, view: string, pose: Pose, gear: ItemLook[]) {
  const { rig } = kit;
  const v = rig.views[view];
  const k = rig.frame / rig.canvas;
  const [fx, fy] = rig.feet;
  // Shift in screen space first, then turn about the feet, so a body lying
  // down (death) can be slid back inside the canvas.
  const root = new DOMMatrix().scale(k, k).translate(pose.dx, pose.dy).translate(fx, fy).rotate(pose.rot).translate(-fx, -fy);
  const memo = new Map<string, DOMMatrix>();
  const matrixOf = (part: string): DOMMatrix => {
    const known = memo.get(part);
    if (known) return known;
    const def = v.parts[part];
    if (!def) return root;
    const parent = def.parent === "root" ? root : matrixOf(def.parent);
    const [px, py] = def.pivot;
    const m = parent.translate(px, py).rotate(pose.angle[part] ?? 0).translate(-px, -py).translate(0, -(pose.lift[part] ?? 0));
    memo.set(part, m);
    return m;
  };
  const hidden = new Set(gear.flatMap((it) => it.hides ?? []));
  const draw = (file: string, m: DOMMatrix) => {
    const im = kit.img.get(file);
    if (!im) return;
    g.setTransform(m);
    g.drawImage(im, 0, 0);
  };
  for (const slot of v.order) {
    const bone = v.parts[slot] ? slot : rig.attach[slot];
    const m = matrixOf(bone);
    if (v.parts[slot] && !hidden.has(slot)) draw(`base/${view}/${slot}.png`, m);
    for (const it of gear) if (it.layers.includes(slot)) draw(`items/${it.visual}/${view}/${slot}.png`, m);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (pose.hurt > 0) {
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = `rgba(255,70,60,${0.45 * pose.hurt})`;
    g.fillRect(0, 0, rig.frame, rig.frame);
    g.globalCompositeOperation = "source-over";
  }
}

/** The sprite definition every baked outfit shares. */
export function dollJson(rig: Rig, id = "wayfarer"): SpriteDefJson {
  const k = rig.frame / rig.canvas;
  return {
    id,
    frame: { w: rig.frame, h: rig.frame },
    pivot: { x: Math.round(rig.feet[0] * k), y: Math.round(rig.feet[1] * k) },
    pixelsPerCell: rig.pixelsPerCell,
    rows: ROWS,
    mirror: { NE: "NW", E: "W", SE: "SW" },
    animations: DOLL_ANIMS,
  };
}

/** Bakes the sheets for one outfit (equipped item ids; unknown ids are ignored). */
export function bakeWayfarer(kit: PaperDollKit, gear: readonly string[] = []): SpriteDef {
  const looks = gear.map((id) => kit.items[id]).filter((x): x is ItemLook => !!x);
  const json = dollJson(kit.rig, gear.length ? `wayfarer+${gear.join("+")}` : "wayfarer");
  const images: Partial<Record<AnimName, HTMLCanvasElement>> = {};
  const F = kit.rig.frame;
  for (const [name, def] of Object.entries(json.animations) as [AnimName, { frames: number }][]) {
    const sheet = document.createElement("canvas");
    sheet.width = F * def.frames;
    sheet.height = F * ROWS.length;
    const g = sheet.getContext("2d")!;
    ROWS.forEach((dir, row) => {
      const view = kit.rig.facings[dir] ?? "front";
      for (let f = 0; f < def.frames; f++) {
        // Each frame on its own canvas so the hurt tint stays inside it.
        const cell = document.createElement("canvas");
        cell.width = cell.height = F;
        drawCell(cell.getContext("2d")!, kit, view, poseAt(view, name, f, def.frames), looks);
        g.drawImage(cell, f * F, row * F);
      }
    });
    images[name] = sheet;
  }
  return spriteFromImages(json, images);
}

// --- shared kit and outfit cache, for the game -------------------------------------------

let kit: PaperDollKit | null = null;
const baked = new Map<string, SpriteDef>();

export function setPaperDollKit(k: PaperDollKit) {
  kit = k;
  baked.clear();
}

/** The Wayfarer wearing these items (baked once per outfit), or null before the kit loads. */
export function wayfarerSprite(gear: readonly string[] = []): SpriteDef | null {
  if (!kit) return null;
  const key = gear.join("+");
  let s = baked.get(key);
  if (!s) {
    s = bakeWayfarer(kit, gear);
    baked.set(key, s);
  }
  return s;
}
