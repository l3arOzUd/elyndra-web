import { CLIPS, FRAME } from './mosskin2d';
import type { BasicAnimName as AnimName, SpriteDefJson } from './spriteDef';

type PoseName = 'original' | 'walk' | 'actions';
interface PoseSpec {
  file: string;
  boxes: [number, number, number, number][];
  scale: number;
  flip?: boolean;
  flipFrames?: number[];
}
interface Pose extends PoseSpec { image: HTMLImageElement }
type Poses = Record<PoseName, Pose>;

/** One intact painted body per frame. No per-limb transforms or mesh deformation. */
function draw(ctx: CanvasRenderingContext2D, poses: Poses, anim: AnimName, p: number, hovering: boolean) {
  let name: PoseName = 'original', index = 0, dx = 0, dy = 0;
  if (anim === 'idle') dy = -(hovering ? 5 : 1.5) * (1 - Math.cos(p * Math.PI * 2));
  if (anim === 'walk') { name = 'walk'; index = Math.min(5, Math.floor(p * 6)); }
  if (anim === 'attack') {
    name = 'actions'; index = [0, 1, 2, 0][Math.min(3, Math.floor(p * 4))];
    dx = index === 1 ? 5 : index === 2 ? -10 : 0;
  }
  if (anim === 'hit' && p > .1 && p < .85) {
    name = 'actions'; index = 3; dx = 5 * Math.sin(p * Math.PI);
  }
  if (anim === 'death' && p >= .15) {
    name = 'actions'; index = p < .35 ? 3 : p < .65 ? 4 : 5;
  }
  if (hovering) dy -= anim === 'death' ? 28 * Math.max(0, 1 - p / .65) : 28;
  const pose = poses[name], box = pose.boxes[index];
  const w = box[2] * pose.scale, h = box[3] * pose.scale;
  ctx.save(); ctx.scale(FRAME / 512, FRAME / 512);
  if (pose.flip || pose.flipFrames?.includes(index)) { ctx.translate(512, 0); ctx.scale(-1, 1); }
  ctx.drawImage(pose.image, ...box, 256 + dx - w / 2, 460 + dy - h, w, h);
  ctx.restore();
}

export async function createPaintedSheets(id: string, hovering = false) {
  const base = `/sprites/${id}_2d/`;
  const response = await fetch(base + 'poses.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`${id} poses: HTTP ${response.status}`);
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
    const cell = document.createElement('canvas'); cell.width = cell.height = FRAME;
    const cellCtx = cell.getContext('2d')!;
    for (let i = 0; i < def.frames; i++) {
      // Render in a fixed coordinate space so held poses are pixel-identical.
      cellCtx.clearRect(0, 0, FRAME, FRAME);
      draw(cellCtx, poses, name, i / (name === 'idle' || name === 'walk' ? def.frames : def.frames - 1), hovering);
      ctx.drawImage(cell, i * FRAME, 0);
    }
    sheets[name] = sheet;
  }
  const json: SpriteDefJson = {
    id: `${id}_2d`, kind: 'sheet', facingMode: 'left-right',
    frame: { w: FRAME, h: FRAME }, pivot: { x: 192, y: 346 }, pixelsPerCell: 300,
    rows: ['W'], animations: Object.fromEntries(Object.entries(CLIPS).map(([name, def]) =>
      [name, { file: name + '.png?v=painted-1', ...def }])) as SpriteDefJson['animations'],
  };
  return { sheets, json };
}
