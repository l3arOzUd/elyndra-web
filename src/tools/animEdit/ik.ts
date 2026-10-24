import * as THREE from "three";

// Two-bone IK for arms and legs: move a hand or foot and the upper and
// lower limb turn to reach it. The end bone keeps its world orientation, so
// a planted foot stays flat. A straight limb has no bend plane of its own;
// the pole (forward for knees, back for elbows) decides which way it folds.

export interface Chain {
  /** Shoulder or hip end. */
  root: THREE.Bone;
  /** Elbow or knee. */
  mid: THREE.Bone;
  /** Hand or foot: what gets dragged. */
  end: THREE.Bone;
  kind: "arm" | "leg";
}

/** Limb chains found by name: a hand/foot bone under two more bones. */
export function findChains(bones: readonly THREE.Bone[]): Chain[] {
  const chains: Chain[] = [];
  for (const end of bones) {
    const kind = /foot|ankle/i.test(end.name) ? "leg" : /hand|wrist/i.test(end.name) ? "arm" : null;
    if (!kind || /toe|finger|thumb/i.test(end.name)) continue;
    const mid = end.parent, root = mid?.parent;
    if (mid instanceof THREE.Bone && root instanceof THREE.Bone) chains.push({ root, mid, end, kind });
  }
  return chains;
}

export function chainOf(chains: readonly Chain[], bone: THREE.Bone | null): Chain | undefined {
  return bone ? chains.find(c => c.end === bone || c.mid === bone || c.root === bone) : undefined;
}

const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), axis = new THREE.Vector3();
const qWorld = new THREE.Quaternion(), qParent = new THREE.Quaternion(), qTmp = new THREE.Quaternion();

/** Turns a bone by a world-space rotation. */
export function rotateWorld(bone: THREE.Object3D, rotation: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(qParent);
  // local' = parent⁻¹ · R · parent · local
  qTmp.copy(qParent).invert().multiply(rotation).multiply(qParent);
  bone.quaternion.premultiply(qTmp);
  bone.updateMatrixWorld(true);
}

/** Sets a bone's local rotation so its world rotation is `world`. */
export function setWorldQuaternion(bone: THREE.Object3D, world: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(qParent);
  bone.quaternion.copy(qParent.invert().multiply(world));
  bone.updateMatrixWorld(true);
}

function angleAt(at: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  return v1.subVectors(a, at).angleTo(v2.subVectors(b, at));
}

/**
 * Bends and swings the chain so its end reaches `target` (world space) as
 * closely as the limb's length allows. `pole` is a world direction the
 * knee/elbow should point toward when the limb starts out straight.
 */
export function solveTwoBone(chain: Chain, target: THREE.Vector3, pole: THREE.Vector3) {
  const { root, mid, end } = chain;
  root.updateWorldMatrix(true, true);
  const endWorld = end.getWorldQuaternion(new THREE.Quaternion());
  root.getWorldPosition(pA); mid.getWorldPosition(pB); end.getWorldPosition(pC);
  const lab = pA.distanceTo(pB), lbc = pB.distanceTo(pC);
  if (lab < 1e-6 || lbc < 1e-6) return;
  const reach = THREE.MathUtils.clamp(target.distanceTo(pA), Math.abs(lab - lbc) + 1e-4, lab + lbc - 1e-4);

  // 1. Bend the middle joint to the angle that makes the limb `reach` long.
  const want = Math.acos(THREE.MathUtils.clamp((lab * lab + lbc * lbc - reach * reach) / (2 * lab * lbc), -1, 1));
  const have = angleAt(pB, pA, pC);
  const straight = Math.PI - have < 1e-3;
  axis.crossVectors(v1.subVectors(pC, pA), v2.subVectors(pB, pA));
  if (straight || axis.lengthSq() < 1e-12) axis.crossVectors(v1.subVectors(pC, pA), pole);
  if (axis.lengthSq() < 1e-12) axis.set(1, 0, 0);
  axis.normalize();
  const midStart = mid.quaternion.clone();
  let best: { q: THREE.Quaternion; score: number } | null = null;
  for (const sign of [1, -1]) {
    mid.quaternion.copy(midStart); mid.updateMatrixWorld(true);
    rotateWorld(mid, qWorld.setFromAxisAngle(axis, sign * (have - want)));
    end.getWorldPosition(pC);
    const error = Math.abs(angleAt(pB, pA, pC) - want);
    // Of two equal bends, prefer the joint pointing toward the pole.
    const toMid = v1.subVectors(pB, pA), toEnd = v2.subVectors(pC, pA).normalize();
    const side = toMid.sub(toEnd.multiplyScalar(toMid.dot(toEnd))).dot(pole);
    const score = error * 1000 - (straight ? side : 0);
    if (!best || score < best.score) best = { q: mid.quaternion.clone(), score };
  }
  mid.quaternion.copy(best!.q); mid.updateMatrixWorld(true);

  // 2. Swing the whole limb from the root so the end points at the target.
  end.getWorldPosition(pC);
  qWorld.setFromUnitVectors(v1.subVectors(pC, pA).normalize(), v2.subVectors(target, pA).normalize());
  rotateWorld(root, qWorld);

  // 3. A limb that started straight: turn it about its own line so the bend faces the pole.
  if (straight) {
    root.getWorldPosition(pA); mid.getWorldPosition(pB); end.getWorldPosition(pC);
    const line = v1.subVectors(pC, pA).normalize().clone();
    const kneeDir = v2.subVectors(pB, pA).sub(line.clone().multiplyScalar(v2.dot(line)));
    const poleDir = pole.clone().sub(line.clone().multiplyScalar(pole.dot(line)));
    if (kneeDir.lengthSq() > 1e-12 && poleDir.lengthSq() > 1e-12) {
      kneeDir.normalize(); poleDir.normalize();
      const turn = Math.atan2(line.dot(kneeDir.clone().cross(poleDir)), kneeDir.dot(poleDir));
      rotateWorld(root, qWorld.setFromAxisAngle(line, turn));
    }
  }

  // 4. Keep the hand or foot facing the way it did.
  setWorldQuaternion(end, endWorld);
}
