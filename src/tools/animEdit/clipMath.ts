import * as THREE from "three";

// The animation editor's data: a clip is a list of whole-body key poses on
// a timeline, and everything between keys is interpolated. Poses hold each
// bone's local rotation by bone name, plus the root bone's position, so a
// project survives reloading the model and can be mirrored left to right.

export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];
/** How a key eases into the next one. */
export type Ease = "linear" | "smooth" | "step";

export interface Pose {
  rot: Record<string, Quat>;
  root?: Vec3;
}

export interface Key {
  t: number;
  pose: Pose;
  ease: Ease;
}

export interface EditClip {
  name: string;
  duration: number;
  /** Frames a second the sprite sheet is drawn at; keys snap to its frames. */
  fps: number;
  loop: boolean;
  keys: Key[];
  /** The prop in hand while this clip plays ("sword", "bow", "staff"); none if unset. */
  prop?: string;
  /** Sprite events by frame: { "hit": 5 } fires as frame 5 shows. */
  events?: Record<string, number>;
}

export interface Project {
  version: 1;
  character: string;
  clips: EditClip[];
}

export function sortKeys(clip: EditClip) {
  clip.keys.sort((a, b) => a.t - b.t);
}

export function frameTime(t: number, fps: number): number {
  return Math.round(t * fps) / fps;
}

/** The key sitting on frame time t, if any. */
export function keyAt(clip: EditClip, t: number): Key | undefined {
  const half = 0.5 / clip.fps;
  return clip.keys.find(k => Math.abs(k.t - t) < half);
}

export function easeValue(ease: Ease, a: number): number {
  if (ease === "step") return 0;
  if (ease === "smooth") return a * a * (3 - 2 * a);
  return a;
}

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

export function blendPose(a: Pose, b: Pose, w: number): Pose {
  const rot: Record<string, Quat> = {};
  for (const [name, q] of Object.entries(a.rot)) {
    const other = b.rot[name];
    if (!other) { rot[name] = [...q]; continue; }
    qa.fromArray(q); qb.fromArray(other);
    qa.slerp(qb, w);
    rot[name] = [qa.x, qa.y, qa.z, qa.w];
  }
  for (const [name, q] of Object.entries(b.rot)) if (!rot[name]) rot[name] = [...q];
  const pose: Pose = { rot };
  if (a.root && b.root) pose.root = a.root.map((v, i) => v + (b.root![i] - v) * w) as Vec3;
  else if (a.root ?? b.root) pose.root = [...(a.root ?? b.root)!];
  return pose;
}

/**
 * The pose at time t. Before the first key the first key holds; after the
 * last, a looping clip blends back into the first key across the wrap and a
 * one-shot clip holds the last key.
 */
export function samplePose(clip: EditClip, t: number): Pose | null {
  const keys = clip.keys;
  if (!keys.length) return null;
  if (keys.length === 1) return keys[0].pose;
  const first = keys[0], last = keys[keys.length - 1];
  if (t >= last.t || t < first.t) {
    if (!clip.loop) return t < first.t ? first.pose : last.pose;
    const span = clip.duration - last.t + first.t;
    if (span <= 1e-6) return t < first.t ? first.pose : last.pose;
    const into = t >= last.t ? t - last.t : t + clip.duration - last.t;
    return blendPose(last.pose, first.pose, easeValue(last.ease, Math.min(1, into / span)));
  }
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[i + 1];
  const span = b.t - a.t;
  return blendPose(a.pose, b.pose, span > 0 ? easeValue(a.ease, (t - a.t) / span) : 0);
}

const SIDE_PATTERNS: [RegExp, (m: string) => string][] = [
  [/([._\-\s])([LR])$/, m => (m === "L" ? "R" : "L")],
  [/([._\-\s])([lr])$/, m => (m === "l" ? "r" : "l")],
  [/^([LR])([._\-\s])/, m => (m === "L" ? "R" : "L")],
  [/^([lr])([._\-\s])/, m => (m === "l" ? "r" : "l")],
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

export function newClip(name: string, rest: Pose, loop = true): EditClip {
  return { name, duration: 1, fps: 12, loop, keys: [{ t: 0, pose: clonePose(rest), ease: "smooth" }] };
}

export function clonePose(pose: Pose): Pose {
  return JSON.parse(JSON.stringify(pose)) as Pose;
}
