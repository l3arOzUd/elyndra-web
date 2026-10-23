import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { frameCount, keyAt, mirrorName, mirrorPose, samplePose, type EditClip, type Pose } from "../src/tools/animEdit/clipMath";
import { buildMannequin, starterClips } from "../src/tools/animEdit/mannequin";

const turn = (deg: number): [number, number, number, number] => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deg * Math.PI / 180);
  return [q.x, q.y, q.z, q.w];
};
const angle = (pose: Pose, bone: string) => 2 * Math.acos(Math.min(1, Math.abs(pose.rot[bone][3]))) * 180 / Math.PI;
const clipOf = (loop: boolean): EditClip => ({
  name: "t", duration: 1, fps: 10, loop,
  keys: [{ t: 0, pose: { rot: { A: turn(0) }, root: [0, 0, 0] }, ease: "linear" },
         { t: 0.5, pose: { rot: { A: turn(90) }, root: [0, 1, 0] }, ease: "step" }],
});

describe("animation editor clips", () => {
  it("interpolates between keys and honours step easing", () => {
    const clip = clipOf(false);
    expect(angle(samplePose(clip, 0.25)!, "A")).toBeCloseTo(45, 3);
    expect(samplePose(clip, 0.25)!.root![1]).toBeCloseTo(0.5);
    expect(angle(samplePose(clip, 0.9)!, "A")).toBeCloseTo(90, 3);
  });
  it("a loop blends the last key back into the first across the wrap", () => {
    const clip = clipOf(true);
    clip.keys[1].ease = "linear";
    expect(angle(samplePose(clip, 0.75)!, "A")).toBeCloseTo(45, 3);
    expect(frameCount(clip)).toBe(10);
    expect(frameCount(clipOf(false))).toBe(11);
  });
  it("finds keys by frame", () => {
    expect(keyAt(clipOf(false), 0.52)?.t).toBe(0.5);
    expect(keyAt(clipOf(false), 0.3)).toBeUndefined();
  });
  it("mirrors bone names and poses", () => {
    expect(mirrorName("Hand_L")).toBe("Hand_R");
    expect(mirrorName("mixamorigLeftArm")).toBe("mixamorigRightArm");
    expect(mirrorName("L_foot")).toBe("R_foot");
    expect(mirrorName("Spine")).toBeNull();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.4, 0.5));
    const pose: Pose = { rot: { Arm_L: [q.x, q.y, q.z, q.w] }, root: [0.2, 1, 0] };
    const m = mirrorPose(pose, ["Arm_L", "Arm_R"]);
    expect(Object.keys(m.rot)).toEqual(["Arm_R"]);
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().fromArray(m.rot.Arm_R));
    expect([e.x, e.y, e.z].map(v => +v.toFixed(4))).toEqual([0.3, -0.4, -0.5]);
    expect(m.root).toEqual([-0.2, 1, 0]);
  });
  it("the mannequin stands on the ground with paired sides and working starter clips", () => {
    const doll = buildMannequin();
    doll.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(doll);
    expect(box.min.y).toBeGreaterThan(-0.01);
    expect(box.min.y).toBeLessThan(0.01);
    const names: string[] = [];
    doll.traverse(o => { if (o instanceof THREE.Bone) names.push(o.name); });
    for (const n of names) { const other = mirrorName(n); if (other) expect(names).toContain(other); }
    const rest: Pose = { rot: Object.fromEntries(names.map(n => [n, [0, 0, 0, 1]])), root: [0, 0.375, 0] };
    const clips = starterClips(rest);
    expect(clips.map(c => c.name)).toEqual(["idle", "walk", "run", "attack", "shoot", "cast", "hit", "death"]);
    for (const c of clips) for (const f of Object.values(c.events ?? {})) expect(f).toBeLessThan(Math.round(c.duration * c.fps) + 1);
    for (const c of clips) for (const k of c.keys) expect(Math.abs(k.t * c.fps - Math.round(k.t * c.fps))).toBeLessThan(1e-9);
    for (const c of clips) for (const k of c.keys) expect(Object.keys(k.pose.rot).sort()).toEqual([...names].sort());
  });
});
