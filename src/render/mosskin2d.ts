import type { AnimName, SpriteDefJson } from './spriteDef';

export const FRAME = 384;
export const CLIPS = {
  idle: { frames: 16, fps: 8, loop: true },
  walk: { frames: 6, fps: 8, loop: true, refMsPerCell: 260 },
  attack: { frames: 12, fps: 15, events: { hit: 6 } },
  hit: { frames: 8, fps: 16 },
  death: { frames: 20, fps: 12, hold: true },
} as const;
type PoseName = 'original' | 'walk' | 'attack' | 'death';
type Box = [number, number, number, number];
interface Pose { image: HTMLImageElement; boxes: Box[] }
export type Parts = Record<PoseName, Pose>;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Full-body paintings: no separate feet, stretched limbs, mesh warp or limb pivots. */
export async function loadMosskinParts(): Promise<Parts> {
  const base = '/sprites/mosskin_2d/';
  const response = await fetch(base + 'poses.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('poses.json: HTTP ' + response.status);
  const manifest = await response.json() as Record<PoseName, { file: string; boxes: Box[] }>;
  const entries = await Promise.all(Object.entries(manifest).map(async ([name, spec]) => {
    const image = new Image(); image.src = base + spec.file; await image.decode();
    return [name, { image, boxes: spec.boxes }] as const;
  }));
  return Object.fromEntries(entries) as Parts;
}

export function drawMosskin(ctx: CanvasRenderingContext2D, poses: Parts, anim: AnimName, progress: number, right = false) {
  const p = clamp(progress);
  let name: PoseName = 'original', index = 0, dx = 0, dy = 0;
  if (anim === 'idle') {
    dy = -1.5 * (1 - Math.cos(p * Math.PI * 2));
  } else if (anim === 'walk') {
    name = 'walk'; index = Math.min(5, Math.floor(p * 6));
  } else if (anim === 'attack') {
    name = 'attack'; index = Math.min(3, Math.floor(p * 4));
    dx = index === 1 ? 7 : index === 2 ? -14 : 0;
  } else if (anim === 'hit') {
    name = p > .15 && p < .65 ? 'attack' : 'original'; index = name === 'attack' ? 1 : 0;
    dx = 10 * Math.sin(p * Math.PI);
  } else if (anim === 'death') {
    if (p >= .35) name = 'death';
    else if (p >= .15) { name = 'attack'; index = 1; }
  }
  const pose = poses[name], box = pose.boxes[index];
  // One uniform scale per source preserves anatomy and each pose's crouch.
  const scale = name === 'death' ? 410 / box[2] : 412 / poses[name].boxes[0][3];
  const w = box[2] * scale, h = box[3] * scale;
  ctx.save(); ctx.scale(FRAME / 512, FRAME / 512);
  if (right) { ctx.translate(512, 0); ctx.scale(-1, 1); }
  ctx.drawImage(pose.image, ...box, 256 + dx - w / 2, 460 + dy - h, w, h);
  ctx.restore();
}

export function makeMosskinSheets(parts: Parts) {
  const sheets = {} as Record<AnimName, HTMLCanvasElement>;
  for (const name of Object.keys(CLIPS) as AnimName[]) {
    const def = CLIPS[name];
    const sheet = document.createElement('canvas'); sheet.width = FRAME * def.frames; sheet.height = FRAME;
    const ctx = sheet.getContext('2d')!;
    for (let i = 0; i < def.frames; i++) {
      ctx.save(); ctx.translate(i * FRAME, 0);
      drawMosskin(ctx, parts, name, i / (name === 'idle' || name === 'walk' ? def.frames : def.frames - 1));
      ctx.restore();
    }
    sheets[name] = sheet;
  }
  const json: SpriteDefJson = {
    id: 'mosskin_2d', kind: 'sheet', facingMode: 'left-right',
    frame: { w: FRAME, h: FRAME }, pivot: { x: 192, y: 346 }, pixelsPerCell: 300,
    rows: ['W'], animations: Object.fromEntries(Object.entries(CLIPS).map(([name, def]) => [name, {file: name + '.png?v=full-body-1', ...def}])) as SpriteDefJson['animations'],
  };
  return { sheets, json };
}
