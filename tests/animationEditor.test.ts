import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  clipFromPoses, conformKeys, copyKeys, deleteKeys, frameCount, keyTimes, keyedAt, mirrorName, mirrorPose,
  moveKeys, pasteKeys, samplePose, setKeys, upgradeProject, ROOT, type EditClip, type Pose,
} from "../src/tools/animEdit/clipMath";
import { applyLook, buildMannequin, mannequinColliders, starterClips, starterPoses } from "../src/tools/animEdit/mannequin";
import { findChains, solveTwoBone } from "../src/tools/animEdit/ik";
import { DEFAULT_SPRING, SpringRig } from "../src/tools/animEdit/spring";

const turn = (deg: number): [number, number, number, number] => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deg * Math.PI / 180);
  return [q.x, q.y, q.z, q.w];
};
const angle = (pose: Pose, bone: string) => 2 * Math.acos(Math.min(1, Math.abs(pose.rot[bone][3]))) * 180 / Math.PI;
const twoKeys = (loop: boolean): EditClip => clipFromPoses({ name: "t", duration: 1, fps: 10, loop }, [
  { t: 0, pose: { rot: { A: turn(0), B: turn(0) }, root: [0, 0, 0] }, ease: "linear" },
  { t: 0.5, pose: { rot: { A: turn(90), B: turn(90) }, root: [0, 1, 0] }, ease: "step" },
]);

describe("animation editor tracks", () => {
  it("interpolates each track and honours step easing", () => {
    const clip = twoKeys(false);
    expect(angle(samplePose(clip, 0.25), "A")).toBeCloseTo(45, 3);
    expect(samplePose(clip, 0.25).root![1]).toBeCloseTo(0.5);
    expect(angle(samplePose(clip, 0.9), "A")).toBeCloseTo(90, 3);
    expect(frameCount(clip)).toBe(11);
  });
  it("a loop blends the last key back into the first across the wrap", () => {
    const clip = twoKeys(true);
    for (const keys of Object.values(clip.rot)) keys[1].ease = "linear";
    expect(angle(samplePose(clip, 0.75), "A")).toBeCloseTo(45, 3);
    expect(frameCount(clip)).toBe(10);
  });
  it("moves one bone's key without the others (overlap)", () => {
    const clip = twoKeys(false);
    moveKeys(clip, 0.5, 0.7, ["B"]);
    expect(keyTimes(clip)).toEqual([0, 0.5, 0.7]);
    expect(keyedAt(clip, 0.5).sort()).toEqual([ROOT, "A"].sort());
    expect(angle(samplePose(clip, 0.35), "A")).toBeCloseTo(63, 0);
    expect(angle(samplePose(clip, 0.35), "B")).toBeCloseTo(45, 0);
  });
  it("sets, deletes, copies and pastes keys", () => {
    const clip = twoKeys(false);
    setKeys(clip, 0.3, { rot: { A: turn(10) } }, ["A"]);
    expect(keyedAt(clip, 0.3)).toEqual(["A"]);
    deleteKeys(clip, 0.3);
    expect(keyTimes(clip)).toEqual([0, 0.5]);
    const block = copyKeys(clip, [0, 0.5])!;
    const other = clipFromPoses({ name: "o", duration: 2, fps: 10, loop: false }, []);
    pasteKeys(other, block, 1.2);
    expect(keyTimes(other)).toEqual([1.2, 1.7]);
    expect(angle(samplePose(other, 1.7), "B")).toBeCloseTo(90, 3);
    pasteKeys(other, block, 1.8);
    expect(keyTimes(other)).toEqual([1.2, 1.7, 1.8]);
  });
  it("conforms keys to a new frame rate and length", () => {
    const clip = twoKeys(false);
    clip.fps = 4; clip.duration = 0.5;
    setKeys(clip, 0.9, { rot: { A: turn(5) } }, ["A"]);
    conformKeys(clip);
    expect(keyTimes(clip)).toEqual([0, 0.5]);
  });
  it("upgrades v1 whole-body projects", () => {
    const v1 = { version: 1, character: "x", clips: [{ name: "idle", duration: 1, fps: 8, loop: true,
      keys: [{ t: 0, pose: { rot: { A: turn(0) }, root: [0, 1, 0] }, ease: "smooth" }] }] };
    const p = upgradeProject(v1)!;
    expect(p.version).toBe(2);
    expect(p.clips[0].rot.A).toHaveLength(1);
    expect(p.clips[0].pos[0].v).toEqual([0, 1, 0]);
    expect(upgradeProject({ version: 9, clips: [] })).toBeNull();
  });
  it("mirrors bone names and poses", () => {
    expect(mirrorName("Hand_L")).toBe("Hand_R");
    expect(mirrorName("mixamorigLeftArm")).toBe("mixamorigRightArm");
    expect(mirrorName("L_foot")).toBe("R_foot");
    expect(mirrorName("Leg_R_Foot")).toBe("Leg_L_Foot");
    expect(mirrorName("Spine")).toBeNull();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.4, 0.5));
    const m = mirrorPose({ rot: { Arm_L: [q.x, q.y, q.z, q.w] }, root: [0.2, 1, 0] }, ["Arm_L", "Arm_R"]);
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().fromArray(m.rot.Arm_R));
    expect([e.x, e.y, e.z].map(v => +v.toFixed(4))).toEqual([0.3, -0.4, -0.5]);
    expect(m.root).toEqual([-0.2, 1, 0]);
  });
});

function restOf(doll: THREE.Object3D): Pose {
  const rot: Pose["rot"] = {};
  doll.traverse(o => { if (o instanceof THREE.Bone) rot[o.name] = [o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w]; });
  return { rot, root: [0, 0.375, 0] };
}

describe("mannequin", () => {
  it("stands on the ground with paired sides and spring chains", () => {
    const doll = buildMannequin();
    doll.updateMatrixWorld(true);
    const names: string[] = [];
    doll.traverse(o => { if (o instanceof THREE.Bone) names.push(o.name); });
    for (const n of names) { const other = mirrorName(n); if (other) expect(names).toContain(other); }
    const springs = names.filter(n => doll.getObjectByName(n)!.userData.spring);
    expect(springs).toEqual(["Ponytail_1", "Ponytail_2", "Ponytail_3", "HairBack_1", "HairBack_2", "HairBack_3", "Cape_1", "Cape_2", "Cape_3"]);
    const box = new THREE.Box3();
    doll.traverse(o => { if (o instanceof THREE.Mesh && !o.userData.outline && o.visible && isShown(o)) box.expandByObject(o); });
    expect(Math.abs(box.min.y)).toBeLessThan(0.01);
  });
  it("looks swap parts without changing bones", () => {
    const doll = buildMannequin();
    const count = () => { let n = 0; doll.traverse(o => { if (o instanceof THREE.Mesh && isShown(o) && !o.userData.outline) n++; }); return n; };
    const plain = count();
    applyLook(doll, { hair: "long", hairColor: "red", outfit: "mage", cape: true });
    expect(count()).toBeGreaterThan(plain + 5);
  });
  it("starter clips: frame-aligned keys, no keys on spring bones, events inside the clip", () => {
    const rest = restOf(buildMannequin());
    const clips = starterClips(rest);
    expect(clips.map(c => c.name)).toEqual(["idle", "walk", "run", "attack", "shoot", "cast", "hit", "death"]);
    for (const c of clips) {
      expect(Object.keys(c.rot).some(n => /Ponytail|HairBack|Cape/.test(n))).toBe(false);
      for (const t of keyTimes(c)) expect(Math.abs(t * c.fps - Math.round(t * c.fps))).toBeLessThan(1e-9);
      for (const f of Object.values(c.events ?? {})) expect(f).toBeLessThan(frameCount(c));
    }
    const attack = clips.find(c => c.name === "attack")!;
    expect(keyedAt(attack, 4 / 12)).toContain("Chest");
    expect(keyedAt(attack, 5 / 12)).toContain("UpperArm_R");
    expect(starterPoses(rest).length).toBeGreaterThan(8);
  });
});

function isShown(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

describe("two-bone IK", () => {
  it("reaches a target and bends a straight leg's knee toward the pole", () => {
    const doll = buildMannequin();
    doll.updateMatrixWorld(true);
    const bones: THREE.Bone[] = [];
    doll.traverse(o => { if (o instanceof THREE.Bone) bones.push(o); });
    const chains = findChains(bones);
    expect(chains.map(c => c.end.name).sort()).toEqual(["Foot_L", "Foot_R", "Hand_L", "Hand_R"]);
    const leg = chains.find(c => c.end.name === "Foot_L")!;
    const foot = leg.end.getWorldPosition(new THREE.Vector3());
    const target = foot.clone().add(new THREE.Vector3(0, 0.12, 0.05));
    solveTwoBone(leg, target, new THREE.Vector3(0, 0, 1));
    expect(leg.end.getWorldPosition(new THREE.Vector3()).distanceTo(target)).toBeLessThan(1e-3);
    expect(leg.mid.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0.02);
    const footWorld = leg.end.getWorldQuaternion(new THREE.Quaternion());
    expect(footWorld.angleTo(new THREE.Quaternion())).toBeLessThan(1e-3);
    // A second solve from the bent pose keeps the knee forward.
    const lower = target.clone().add(new THREE.Vector3(0, -0.05, 0.02));
    solveTwoBone(leg, lower, new THREE.Vector3(0, 0, 1));
    expect(leg.end.getWorldPosition(new THREE.Vector3()).distanceTo(lower)).toBeLessThan(1e-3);
    expect(leg.mid.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0.02);
  });
  it("stretches as far as the limb allows toward an unreachable target", () => {
    const doll = buildMannequin();
    doll.updateMatrixWorld(true);
    const bones: THREE.Bone[] = [];
    doll.traverse(o => { if (o instanceof THREE.Bone) bones.push(o); });
    const arm = findChains(bones).find(c => c.end.name === "Hand_R")!;
    const shoulder = arm.root.getWorldPosition(new THREE.Vector3());
    solveTwoBone(arm, shoulder.clone().add(new THREE.Vector3(0, 0, 5)), new THREE.Vector3(0, 0, -1));
    const hand = arm.end.getWorldPosition(new THREE.Vector3());
    expect(hand.z - shoulder.z).toBeGreaterThan(0.2);
    expect(Math.abs(hand.y - shoulder.y)).toBeLessThan(0.01);
  });
});

describe("spring bones", () => {
  it("hair swings back when the head is jerked forward, then settles", () => {
    const doll = buildMannequin();
    applyLook(doll, { hair: "ponytail", hairColor: "brown", outfit: "traveler", cape: true });
    doll.updateMatrixWorld(true);
    const bones: THREE.Bone[] = [];
    doll.traverse(o => { if (o instanceof THREE.Bone && o.userData.spring) bones.push(o); });
    const rest = new Map(bones.map(b => [b, b.quaternion.clone()]));
    const rig = new SpringRig(bones, mannequinColliders(doll), b => rest.get(b)!);
    const tip = doll.getObjectByName("Ponytail_3")!;
    rig.update(1, DEFAULT_SPRING);
    const settled = tip.getWorldPosition(new THREE.Vector3());
    const hips = doll.getObjectByName("Hips")!;
    hips.position.z += 0.2; doll.updateMatrixWorld(true);
    rig.update(1 / 30, DEFAULT_SPRING);
    const dragged = tip.getWorldPosition(new THREE.Vector3());
    expect(dragged.z - settled.z).toBeLessThan(0.17);
    rig.update(3, DEFAULT_SPRING);
    const after = tip.getWorldPosition(new THREE.Vector3());
    expect(after.z - settled.z).toBeCloseTo(0.2, 1);
    // The cape never ends up inside the body.
    const cape = doll.getObjectByName("Cape_3")!.getWorldPosition(new THREE.Vector3());
    const chest = doll.getObjectByName("Chest")!.getWorldPosition(new THREE.Vector3());
    expect(cape.z).toBeLessThan(chest.z);
  });
});
