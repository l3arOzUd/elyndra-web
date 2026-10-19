import * as THREE from "three";
import { DIRS, type Dir } from "../shared/dir";

// The Elyndra sprite format: one PNG sheet an animation, one row a facing,
// one column a frame, every cell the same size. Its JSON says which facing
// each row holds; facings without a row of their own are drawn by mirroring
// another (the RO way: draw S, SW, W, NW, N and mirror the other three,
// which saves 3/8 of the art).

export type AnimName = "idle" | "walk" | "attack" | "hit" | "death";

export interface AnimDef {
  file: string;
  frames: number;
  fps: number;
  loop?: boolean;
  /** Stay on the last frame when done (death). */
  hold?: boolean;
  /** Named frames: { "hit": 4 } fires "hit" as frame 4 is shown. */
  events?: Record<string, number>;
  /** Walk only: the cell speed the fps was drawn for; other speeds scale it. */
  refMsPerCell?: number;
}

/** How a single-image ("puppet") sprite is moved by the engine. */
export type PuppetMotion = "hop" | "walk" | "float" | "heavy";

export interface SpriteDefJson {
  id: string;
  /**
   * "sheet" (default): frame-by-frame sheets. "puppet": one painted image
   * (plus an optional back view) that the engine squashes, bobs, lunges and
   * topples procedurally; no frames to draw.
   */
  kind?: "sheet" | "puppet";
  /** One painted facing, mirrored for eastward movement. No rear-view artwork. */
  facingMode?: "directional" | "left-right";
  puppet?: { front: string; back?: string; motion: PuppetMotion };
  frame: { w: number; h: number };
  /** The feet, in pixels from the frame's top-left. */
  pivot: { x: number; y: number };
  /** Sprite pixels to one walk cell; sets the on-screen size. */
  pixelsPerCell: number;
  /** The art already has a ground shadow drawn in; don't add another. */
  bakedShadow?: boolean;
  /** The facing each row of every sheet holds, top to bottom. */
  rows: Dir[];
  /** Facings drawn by mirroring another row: { "E": "W" }. */
  mirror?: Partial<Record<Dir, Dir>>;
  animations: Partial<Record<AnimName, AnimDef>> & { idle: AnimDef };
}

export interface Sheet {
  def: AnimDef;
  image: CanvasImageSource & { width: number; height: number };
  texture: THREE.Texture;
}

export interface SpriteDef {
  json: SpriteDefJson;
  sheets: Partial<Record<AnimName, Sheet>>;
  puppet?: PuppetImages;
}

export interface Facing {
  row: number;
  flip: boolean;
}

/** Which row draws a facing, and whether mirrored. */
export function resolveFacing(json: Pick<SpriteDefJson, "rows" | "mirror" | "facingMode">, dir: Dir): Facing {
  if (json.facingMode === "left-right") return { row: 0, flip: dir === "E" || dir === "NE" || dir === "SE" };
  const own = json.rows.indexOf(dir);
  if (own >= 0) return { row: own, flip: false };
  const source = json.mirror?.[dir];
  if (source) {
    const row = json.rows.indexOf(source);
    if (row >= 0) return { row, flip: true };
  }
  // No art for this facing: the nearest facing that has some.
  const i = DIRS.indexOf(dir);
  for (let d = 1; d <= 4; d++) {
    for (const j of [i - d, i + d]) {
      const row = json.rows.indexOf(DIRS[(j + 8) % 8]);
      if (row >= 0) return { row, flip: false };
    }
  }
  return { row: 0, flip: false };
}

/** Checks a definition against its sheets; returns the problems found. */
export function validateSprite(json: SpriteDefJson, sizes: Partial<Record<AnimName, { width: number; height: number }>>): string[] {
  const problems: string[] = [];
  for (const [name, anim] of Object.entries(json.animations) as [AnimName, AnimDef][]) {
    const size = sizes[name];
    if (!size) continue;
    if (size.width < anim.frames * json.frame.w) problems.push(`${name}: sheet is ${size.width}px wide, ${anim.frames} frames need ${anim.frames * json.frame.w}px`);
    if (size.height < json.rows.length * json.frame.h) problems.push(`${name}: sheet is ${size.height}px tall, ${json.rows.length} rows need ${json.rows.length * json.frame.h}px`);
    for (const [ev, f] of Object.entries(anim.events ?? {})) if (f >= anim.frames) problems.push(`${name}: event "${ev}" on frame ${f} of ${anim.frames}`);
  }
  for (const d of DIRS) {
    if (json.facingMode === "left-right") continue;
    if (!json.rows.includes(d) && !json.mirror?.[d]) problems.push(`facing ${d} has no row and no mirror (nearest used)`);
  }
  return problems;
}

function makeTexture(image: TexImageSource): THREE.Texture {
  const tex = image instanceof HTMLCanvasElement ? new THREE.CanvasTexture(image) : new THREE.Texture(image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Builds a sprite from images already in hand (e.g. drawn on canvases). */
export function spriteFromImages(json: SpriteDefJson, images: Partial<Record<AnimName, HTMLCanvasElement | HTMLImageElement>>): SpriteDef {
  const sheets: SpriteDef["sheets"] = {};
  for (const [name, def] of Object.entries(json.animations) as [AnimName, AnimDef][]) {
    const image = images[name];
    if (image) sheets[name] = { def, image, texture: makeTexture(image) };
  }
  return { json, sheets };
}

/** Puppet animations: timing only; the motion is procedural. */
const PUPPET_ANIMS: SpriteDefJson["animations"] = {
  idle: { file: "", frames: 1, fps: 0.8, loop: true },
  walk: { file: "", frames: 1, fps: 1.8, loop: true, refMsPerCell: 260 },
  attack: { file: "", frames: 10, fps: 18, events: { hit: 5 } },
  hit: { file: "", frames: 4, fps: 14 },
  death: { file: "", frames: 12, fps: 14, hold: true },
};

export interface PuppetImages {
  front: HTMLImageElement;
  back?: HTMLImageElement;
  frontTex: THREE.Texture;
  backTex?: THREE.Texture;
}

/** Loads sprites/<id>/<id>.sprite.json and its sheets. */
export async function loadSprite(id: string, base = "sprites/"): Promise<SpriteDef> {
  const dir = `${base}${id}/`;
  const res = await fetch(`${dir}${id}.sprite.json`);
  if (!res.ok) throw new Error(`${id}.sprite.json: HTTP ${res.status}`);
  const json = (await res.json()) as SpriteDefJson;
  if (json.kind === "puppet" && json.puppet) {
    json.animations = { ...PUPPET_ANIMS, ...(json.animations ?? {}) } as SpriteDefJson["animations"];
    const front = await loadImage(dir + json.puppet.front);
    const back = json.puppet.back ? await loadImage(dir + json.puppet.back) : undefined;
    json.frame = { w: front.width, h: front.height };
    json.rows = ["S"];
    // One texture shared by every animation (the image never changes).
    const frontTex = makeTexture(front);
    const sheets: SpriteDef["sheets"] = {};
    for (const [name, def] of Object.entries(json.animations) as [AnimName, AnimDef][]) sheets[name] = { def, image: front, texture: frontTex };
    return { json, sheets, puppet: { front, back, frontTex, backTex: back ? makeTexture(back) : undefined } };
  }
  const entries = Object.entries(json.animations) as [AnimName, AnimDef][];
  const images = await Promise.all(entries.map(([, def]) => loadImage(dir + def.file)));
  const sprite = spriteFromImages(json, Object.fromEntries(entries.map(([name], i) => [name, images[i]])));
  const problems = validateSprite(json, Object.fromEntries(entries.map(([name], i) => [name, images[i]])));
  for (const p of problems) console.warn(`[sprite ${id}] ${p}`);
  return sprite;
}
