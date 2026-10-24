import * as THREE from "three";

// The animation editor's data. Each bone has its own track of rotation
// keys and the root bone a track of position keys, so one part can move
// a frame or two after another (the overlap that gives motion weight).
// Tracks are stored by bone name, so a project survives reloading the
// model and can be mirrored left to right. Version 1 projects, which keyed
// the whole body at once, are converted on load.

export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];
/** How a key eases into the next one. */
export type Ease = "linear" | "smooth" | "step";

export interface Pose {
  rot: Record<string, Quat>;
  root?: Vec3;
}

export interface RotKey { t: number; q: Quat; ease: Ease }
export interface PosKey { t: number; v: Vec3; ease: Ease }

export interface EditClip {
  name: string;
  duration: number;
  /** Frames a second the sprite sheet is drawn at; keys snap to its frames. */
  fps: number;
  loop: boolean;
  /** Rotation keys per bone name. */
  rot: Record<string, RotKey[]>;
  /** Position keys of the root bone. */
  pos: PosKey[];
  /** The prop in hand while this clip plays ("sword", "bow", "staff"); none if unset. */
  prop?: string;
  /** Sprite events by frame: { "hit": 5 } fires as frame 5 shows. */
  events?: Record<string, number>;
}

export interface Project {
  version: 2;
  character: string;
  clips: EditClip[];
  /** Character look (hair, outfit…) for models that offer one. */
  look?: Record<string, string | boolean>;
}

/** A whole-body key, the way poses are written and the v1 format stored them. */
export interface PoseKey { t: number; pose: Pose; ease: Ease }

/** Keys lifted out of a clip, timed from the first one, to paste anywhere. */
export interface KeyBlock {
  span: number;
  rot: Record<string, RotKey[]>;
  pos: PosKey[];
}

const EPS = 1e-6;

export function frameTime(t: number, fps: number): number {
  return Math.round(t * fps) / fps;
}

const near = (clip: EditClip, a: number, b: number) => Math.abs(a - b) < 0.5 / clip.fps;

export function easeValue(ease: Ease, a: number): number {
  if (ease === "step") return 0;
  if (ease === "smooth") return a * a * (3 - 2 * a);
  return a;
}

/**
 * Where t falls in a sorted track: the key before, the key after and the
 * eased weight between them. Before the first key the first key holds;
 * after the last, a looping clip blends back into the first key across the
 * wrap and a one-shot clip holds the last key.
 */
function locate<K extends { t: number; ease: Ease }>(keys: K[], t: number, clip: EditClip): [K, K, number] | null {
  if (!keys.length) return null;
  if (keys.length === 1) return [keys[0], keys[0], 0];
  const first = keys[0], last = keys[keys.length - 1];
  if (t >= last.t || t < first.t) {
    if (!clip.loop) return t < first.t ? [first, first, 0] : [last, last, 0];
    const span = clip.duration - last.t + first.t;
    if (span <= EPS) return t < first.t ? [first, first, 0] : [last, last, 0];
    const into = t >= last.t ? t - last.t : t + clip.duration - last.t;
    return [last, first, easeValue(last.ease, Math.min(1, into / span))];
  }
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[i + 1];
  const span = b.t - a.t;
  return [a, b, span > 0 ? easeValue(a.ease, (t - a.t) / span) : 0];
}

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

/** The pose at time t: only bones (and the root) that have keys appear. */
export function samplePose(clip: EditClip, t: number): Pose {
  const rot: Record<string, Quat> = {};
  for (const [name, keys] of Object.entries(clip.rot)) {
    const at = locate(keys, t, clip);
    if (!at) continue;
    qa.fromArray(at[0].q); qb.fromArray(at[1].q); qa.slerp(qb, at[2]);
    rot[name] = [qa.x, qa.y, qa.z, qa.w];
  }
  const pose: Pose = { rot };
  const at = locate(clip.pos, t, clip);
  if (at) pose.root = at[0].v.map((v, i) => v + (at[1].v[i] - v) * at[2]) as Vec3;
  return pose;
}

/** The pose at t with unkeyed bones taken from the rest pose. */
export function fullPose(clip: EditClip, t: number, rest: Pose): Pose {
  const sampled = samplePose(clip, t);
  return { rot: { ...rest.rot, ...sampled.rot }, root: sampled.root ?? rest.root };
}

function sortTrack(keys: { t: number }[]) {
  keys.sort((a, b) => a.t - b.t);
}

/** Every time any track has a key, sorted (the timeline's whole-body row). */
export function keyTimes(clip: EditClip): number[] {
  const times: number[] = [];
  const add = (t: number) => { if (!times.some(x => near(clip, x, t))) times.push(t); };
  for (const keys of Object.values(clip.rot)) for (const k of keys) add(k.t);
  for (const k of clip.pos) add(k.t);
  return times.sort((a, b) => a - b);
}

export function keyCount(clip: EditClip): number {
  return keyTimes(clip).length;
}

/** The bone names keyed at t; "#root" stands for the root position track. */
export function keyedAt(clip: EditClip, t: number): string[] {
  const names = Object.entries(clip.rot).filter(([, keys]) => keys.some(k => near(clip, k.t, t))).map(([n]) => n);
  if (clip.pos.some(k => near(clip, k.t, t))) names.push(ROOT);
  return names;
}
export const ROOT = "#root";

/** The ease of the keys at t (the first one found). */
export function easeAt(clip: EditClip, t: number, bone?: string): Ease | undefined {
  const tracks = bone ? [bone === ROOT ? clip.pos : clip.rot[bone] ?? []] : [...Object.values(clip.rot), clip.pos];
  for (const keys of tracks) for (const k of keys as { t: number; ease: Ease }[]) if (near(clip, k.t, t)) return k.ease;
  return undefined;
}

/**
 * Writes keys at t from a pose: every bone in `bones` (all bones in the
 * pose if omitted) gets a rotation key, and the root a position key when
 * `bones` includes ROOT (or is omitted) and the pose has one.
 */
export function setKeys(clip: EditClip, t: number, pose: Pose, bones?: readonly string[], ease?: Ease) {
  const names = bones ?? [...Object.keys(pose.rot), ROOT];
  for (const name of names) {
    if (name === ROOT) {
      if (!pose.root) continue;
      const existing = clip.pos.find(k => near(clip, k.t, t));
      if (existing) existing.v = [...pose.root];
      else { clip.pos.push({ t, v: [...pose.root], ease: ease ?? "smooth" }); sortTrack(clip.pos); }
      continue;
    }
    const q = pose.rot[name];
    if (!q) continue;
    const keys = clip.rot[name] ??= [];
    const existing = keys.find(k => near(clip, k.t, t));
    if (existing) existing.q = [...q];
    else { keys.push({ t, q: [...q], ease: ease ?? "smooth" }); sortTrack(keys); }
  }
}

/** Removes the keys at t, in the given tracks or all of them. */
export function deleteKeys(clip: EditClip, t: number, bones?: readonly string[]) {
  for (const [name, keys] of Object.entries(clip.rot)) {
    if (bones && !bones.includes(name)) continue;
    clip.rot[name] = keys.filter(k => !near(clip, k.t, t));
    if (!clip.rot[name].length) delete clip.rot[name];
  }
  if (!bones || bones.includes(ROOT)) clip.pos = clip.pos.filter(k => !near(clip, k.t, t));
}

/** Moves the keys at `from` to `to`, replacing what those tracks had at `to`. */
export function moveKeys(clip: EditClip, from: number, to: number, bones?: readonly string[]) {
  if (near(clip, from, to)) return;
  const move = <K extends { t: number }>(keys: K[]): K[] => {
    const moving = keys.find(k => near(clip, k.t, from));
    if (!moving) return keys;
    const out = keys.filter(k => k === moving || !near(clip, k.t, to));
    moving.t = to; sortTrack(out);
    return out;
  };
  for (const [name, keys] of Object.entries(clip.rot)) if (!bones || bones.includes(name)) clip.rot[name] = move(keys);
  if (!bones || bones.includes(ROOT)) clip.pos = move(clip.pos);
}

export function setEase(clip: EditClip, t: number, ease: Ease, bones?: readonly string[]) {
  for (const [name, keys] of Object.entries(clip.rot)) {
    if (bones && !bones.includes(name)) continue;
    for (const k of keys) if (near(clip, k.t, t)) k.ease = ease;
  }
  if (!bones || bones.includes(ROOT)) for (const k of clip.pos) if (near(clip, k.t, t)) k.ease = ease;
}

/** Copies the keys sitting at the given times, timed from the earliest. */
export function copyKeys(clip: EditClip, times: readonly number[]): KeyBlock | null {
  if (!times.length) return null;
  const start = Math.min(...times), end = Math.max(...times);
  const hit = (t: number) => times.some(x => near(clip, x, t));
  const rot: KeyBlock["rot"] = {};
  for (const [name, keys] of Object.entries(clip.rot)) {
    const picked = keys.filter(k => hit(k.t)).map(k => ({ ...k, q: [...k.q] as Quat, t: k.t - start }));
    if (picked.length) rot[name] = picked;
  }
  const pos = clip.pos.filter(k => hit(k.t)).map(k => ({ ...k, v: [...k.v] as Vec3, t: k.t - start }));
  return { span: end - start, rot, pos };
}

/** Pastes a key block with its first key at t; keys past the clip's end are dropped. */
export function pasteKeys(clip: EditClip, block: KeyBlock, at: number) {
  const place = (dt: number) => frameTime(at + dt, clip.fps);
  for (const [name, keys] of Object.entries(block.rot)) {
    const track = clip.rot[name] ??= [];
    for (const k of keys) {
      const t = place(k.t);
      if (t > clip.duration + EPS) continue;
      const existing = track.find(x => near(clip, x.t, t));
      if (existing) { existing.q = [...k.q]; existing.ease = k.ease; } else track.push({ t, q: [...k.q], ease: k.ease });
    }
    sortTrack(track);
  }
  for (const k of block.pos) {
    const t = place(k.t);
    if (t > clip.duration + EPS) continue;
    const existing = clip.pos.find(x => near(clip, x.t, t));
    if (existing) { existing.v = [...k.v]; existing.ease = k.ease; } else clip.pos.push({ t, v: [...k.v], ease: k.ease });
  }
  sortTrack(clip.pos);
}

/** Snaps every key to the clip's frames and drops keys past its end (after an fps or length change). */
export function conformKeys(clip: EditClip) {
  const conform = <K extends { t: number }>(keys: K[]): K[] => {
    const out: K[] = [];
    for (const k of keys) {
      k.t = Math.min(clip.duration, frameTime(k.t, clip.fps));
      if (k.t > clip.duration + EPS) continue;
      const clash = out.findIndex(x => Math.abs(x.t - k.t) < EPS);
      if (clash >= 0) out[clash] = k; else out.push(k);
    }
    sortTrack(out);
    return out;
  };
  for (const name of Object.keys(clip.rot)) {
    clip.rot[name] = conform(clip.rot[name]);
    if (!clip.rot[name].length) delete clip.rot[name];
  }
  clip.pos = conform(clip.pos);
}

/** A clip built from whole-body keys; bones in `skip` get no track. */
export function clipFromPoses(base: Omit<EditClip, "rot" | "pos">, keys: PoseKey[], skip: ReadonlySet<string> = new Set()): EditClip {
  const clip: EditClip = { ...base, rot: {}, pos: [] };
  for (const k of keys) {
    const names = [...Object.keys(k.pose.rot).filter(n => !skip.has(n)), ROOT];
    setKeys(clip, k.t, k.pose, names, k.ease);
  }
  return clip;
}

interface V1Clip extends Omit<EditClip, "rot" | "pos"> { keys: PoseKey[] }

/** Reads a saved project, converting the v1 whole-body format. */
export function upgradeProject(data: unknown): Project | null {
  const p = data as { version?: number; character?: string; clips?: unknown[]; look?: Project["look"] };
  if (!p || !Array.isArray(p.clips) || !p.clips.length) return null;
  if (p.version === 2) return p as Project;
  if (p.version !== 1) return null;
  return {
    version: 2, character: p.character ?? "",
    clips: (p.clips as V1Clip[]).map(({ keys, ...base }) => clipFromPoses(base, keys)),
  };
}

const SIDE_PATTERNS: [RegExp, (m: string) => string][] = [
  [/([._\-\s])([LR])$/, m => (m === "L" ? "R" : "L")],
  [/([._\-\s])([lr])$/, m => (m === "l" ? "r" : "l")],
  [/^([LR])([._\-\s])/, m => (m === "L" ? "R" : "L")],
  [/^([lr])([._\-\s])/, m => (m === "l" ? "r" : "l")],
  [/([._\-\s])([LR])([._\-\s])/, m => (m === "L" ? "R" : "L")],
  [/(Left|Right)/, m => (m === "Left" ? "Right" : "Left")],
  [/(left|right)/, m => (m === "left" ? "right" : "left")],
];

/** The bone on the other side ("Hand_L" ↔ "Hand_R"); null for centre bones. */
export function mirrorName(name: string): string | null {
  for (const [re, swap] of SIDE_PATTERNS) {
    const match = name.match(re);
    if (!match) continue;
    const side = match.slice(1).find(g => /^(L|R|l|r|Left|Right|left|right)$/.test(g))!;
    const at = match.index! + match[0].indexOf(side);
    return name.slice(0, at) + swap(side) + name.slice(at + side.length);
  }
  return null;
}

/**
 * The pose reflected across the body's centre plane: sides swap and each
 * rotation is reflected in x. Exact for rigs whose left and right bones are
 * set up as mirror images (the mannequin and most humanoid rigs).
 */
export function mirrorPose(pose: Pose, bones: readonly string[]): Pose {
  const known = new Set(bones);
  const rot: Record<string, Quat> = {};
  for (const [name, [x, y, z, w]] of Object.entries(pose.rot)) {
    const other = mirrorName(name);
    rot[other && known.has(other) ? other : name] = [x, -y, -z, w];
  }
  const out: Pose = { rot };
  if (pose.root) out.root = [-pose.root[0], pose.root[1], pose.root[2]];
  return out;
}

/** Number of sprite frames: a loop leaves out its end (it equals the start). */
export function frameCount(clip: EditClip): number {
  const n = Math.max(1, Math.round(clip.duration * clip.fps));
  return clip.loop ? n : n + 1;
}

export function newClip(name: string, start: Pose, loop = true, skip?: ReadonlySet<string>): EditClip {
  return clipFromPoses({ name, duration: 1, fps: 12, loop }, [{ t: 0, pose: start, ease: "smooth" }], skip);
}

export function clonePose(pose: Pose): Pose {
  return JSON.parse(JSON.stringify(pose)) as Pose;
}

/** Bones whose rotation differs from `from` by more than ~0.05°, plus ROOT if it moved. */
export function changedBones(now: Pose, from: Pose): string[] {
  const out: string[] = [];
  for (const [name, q] of Object.entries(now.rot)) {
    const o = from.rot[name];
    if (!o) { out.push(name); continue; }
    const dot = Math.abs(q[0] * o[0] + q[1] * o[1] + q[2] * o[2] + q[3] * o[3]);
    if (dot < 0.9999999) out.push(name);
  }
  if (now.root && from.root && now.root.some((v, i) => Math.abs(v - from.root![i]) > 1e-5)) out.push(ROOT);
  return out;
}
