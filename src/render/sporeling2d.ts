import { CLIPS, FRAME } from './mosskin2d';
import type { BasicAnimName as AnimName, SpriteDefJson } from './spriteDef';

type PoseName = 'original' | 'walk' | 'attack' | 'collapse';
type Box = [number, number, number, number];
interface PoseSpec { file: string; boxes: Box[]; scale: number }
interface Pose extends PoseSpec { image: HTMLImageElement }
type Poses = Record<PoseName, Pose>;

/** Paintings stay intact: every frame draws one whole body at a uniform scale. */
function drawPose(ctx: CanvasRenderingContext2D, poses: Poses, anim: AnimName, p: number) {
  let name: PoseName = 'original', index = 0, dx = 0, dy = 0;
  if (anim === 'idle') dy = -1.5 * (1 - Math.cos(p * Math.PI * 2));
  if (anim === 'walk') { name = 'walk'; index = Math.min(5, Math.floor(p * 6)); }
  if (anim === 'attack') {
    name = 'attack'; index = Math.min(3, Math.floor(p * 4));
    dx = index === 1 ? 5 : index === 2 ? -10 : 0;
  }
  if (anim === 'hit' && p > .1 && p < .85) {
    name = 'collapse'; dx = 5 * Math.sin(p * Math.PI);
  }
  if (anim === 'death' && p >= .15) {
    name = 'collapse'; index = p < .4 ? 1 : p < .7 ? 2 : 3;
  }
  const pose = poses[name], box = pose.boxes[index];
  const w = box[2] * pose.scale, h = box[3] * pose.scale;
  ctx.save(); ctx.scale(FRAME / 512, FRAME / 512);
  ctx.drawImage(pose.image, ...box, 256 + dx - w / 2, 460 + dy - h, w, h);
  ctx.restore();
}

export async function createSporelingSheets() {
  const base = '/sprites/sporeling_2d/';
  const response = await fetch(base + 'poses.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Sporeling poses: HTTP ' + response.status);
  const specs = await response.json() as Record<PoseName, PoseSpec>;
  const entries = await Promise.all(Object.entries(specs).map(async ([name, spec]) => {
    const image = new Image(); image.src = base + spec.file; await image.decode();
    return [name, { ...spec, image }] as const;
  }));
  const poses = Object.fromEntries(entries) as Poses;
  const sheets = {} as Record<AnimName, HTMLCanvasElement>;
  for (const name of Object.keys(CLIPS) as AnimName[]) {
    const def = CLIPS[name];
    const sheet = document.createElement('canvas'); sheet.width = FRAME * def.frames; sheet.height = FRAME;
    const ctx = sheet.getContext('2d')!;
    for (let i = 0; i < def.frames; i++) {
      ctx.save(); ctx.translate(i * FRAME, 0);
      drawPose(ctx, poses, name, i / (name === 'idle' || name === 'walk' ? def.frames : def.frames - 1));
      ctx.restore();
    }
    sheets[name] = sheet;
  }
  const json: SpriteDefJson = {
    id: 'sporeling_2d', kind: 'sheet', facingMode: 'left-right',
    frame: { w: FRAME, h: FRAME }, pivot: { x: 192, y: 346 }, pixelsPerCell: 300,
    rows: ['W'], animations: Object.fromEntries(Object.entries(CLIPS).map(([name, def]) =>
      [name, { file: name + '.png?v=painted-1', ...def }])) as SpriteDefJson['animations'],
  };
  return { sheets, json };
}
