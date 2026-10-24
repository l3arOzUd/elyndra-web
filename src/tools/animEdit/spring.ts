import * as THREE from "three";

// Spring bones for hair, capes and tails, in the manner of VRM spring
// bones: each joint's tail is a point with momentum, pulled back toward
// where the animated pose puts it (stiffness), slowed by drag, pulled by
// gravity and wind, held at the joint's length and pushed out of the body's
// collision spheres. The joint then turns to point at its tail.

export interface SpringSettings {
  stiffness: number;
  /** 0 keeps all momentum, 1 none. */
  damping: number;
  gravity: number;
  wind: number;
}

export const DEFAULT_SPRING: SpringSettings = { stiffness: 2, damping: 0.5, gravity: 0.3, wind: 0 };

export interface Collider { bone: THREE.Object3D; offset: THREE.Vector3; radius: number }

interface Joint {
  bone: THREE.Bone;
  /** The tail in the bone's local space (its child's position, or its own tip). */
  tailLocal: THREE.Vector3;
  length: number;
  tail: THREE.Vector3;
  prev: THREE.Vector3;
}

const STEP = 1 / 60;
const head = new THREE.Vector3(), rest = new THREE.Vector3(), next = new THREE.Vector3();
const centre = new THREE.Vector3(), push = new THREE.Vector3(), inertia = new THREE.Vector3();
const qParent = new THREE.Quaternion(), qAnim = new THREE.Quaternion(), qTurn = new THREE.Quaternion();

export class SpringRig {
  private joints: Joint[];
  private left = 0;
  private clock = 0;

  /** `bones` in parent-before-child order; `animated` gives each bone's posed local rotation. */
  constructor(bones: THREE.Bone[], private colliders: Collider[], private animated: (bone: THREE.Bone) => THREE.Quaternion) {
    this.joints = bones.map(bone => {
      const child = bone.children.find(c => c instanceof THREE.Bone && bones.includes(c));
      const tip = bone.userData.springTip as [number, number, number] | undefined;
      const tailLocal = child ? child.position.clone() : new THREE.Vector3(...(tip ?? [0, -0.08, 0]));
      return { bone, tailLocal, length: tailLocal.length(), tail: new THREE.Vector3(), prev: new THREE.Vector3() };
    });
    this.reset();
  }

  get size() { return this.joints.length; }

  /** Puts every tail back where the pose holds it, at rest. */
  reset() {
    for (const j of this.joints) {
      j.bone.quaternion.copy(this.animated(j.bone));
      j.bone.updateMatrixWorld(true);
      j.tail.copy(j.tailLocal).applyMatrix4(j.bone.matrixWorld);
      j.prev.copy(j.tail);
    }
    this.left = 0;
  }

  /** Advances the simulation by dt seconds in fixed 1/60 s steps. */
  update(dt: number, settings: SpringSettings) {
    this.left += Math.min(dt, 0.25);
    while (this.left >= STEP) { this.step(settings); this.left -= STEP; }
    if (this.joints.length) this.pose();
  }

  private step(s: SpringSettings) {
    this.clock += STEP;
    const gust = s.wind * (0.65 + 0.35 * Math.sin(this.clock * 2.1) * Math.sin(this.clock * 0.7 + 1.3));
    for (const j of this.joints) {
      const { bone } = j;
      bone.parent!.updateWorldMatrix(true, false);
      bone.quaternion.copy(this.animated(bone));
      bone.updateMatrixWorld(true);
      bone.getWorldPosition(head);
      // Where the animation would put the tail.
      bone.parent!.getWorldQuaternion(qParent);
      rest.copy(j.tailLocal).applyQuaternion(qAnim.copy(qParent).multiply(bone.quaternion)).normalize();
      inertia.subVectors(j.tail, j.prev).multiplyScalar(1 - s.damping);
      next.copy(j.tail).add(inertia)
        .addScaledVector(rest, s.stiffness * STEP * j.length * 4)
        .add(push.set(0, -s.gravity * STEP * 0.5, 0))
        .add(push.set(gust * STEP * 0.35, 0, gust * STEP * 0.12));
      next.sub(head).setLength(j.length).add(head);
      for (const c of this.colliders) {
        centre.copy(c.offset).applyMatrix4(c.bone.matrixWorld);
        const d = next.distanceTo(centre);
        if (d < c.radius && d > 1e-6) {
          next.sub(centre).setLength(c.radius).add(centre);
          next.sub(head).setLength(j.length).add(head);
        }
      }
      j.prev.copy(j.tail); j.tail.copy(next);
      this.aim(j, rest);
    }
  }

  /** Turns each joint toward its simulated tail (without stepping). */
  private pose() {
    for (const j of this.joints) {
      const { bone } = j;
      bone.quaternion.copy(this.animated(bone));
      bone.updateMatrixWorld(true);
      bone.parent!.getWorldQuaternion(qParent);
      rest.copy(j.tailLocal).applyQuaternion(qAnim.copy(qParent).multiply(bone.quaternion)).normalize();
      this.aim(j, rest);
    }
  }

  private aim(j: Joint, restDir: THREE.Vector3) {
    j.bone.getWorldPosition(head);
    const to = next.subVectors(j.tail, head).normalize();
    qTurn.setFromUnitVectors(restDir, to);
    // world' = turn · parent · local  →  local' = parent⁻¹ · turn · parent · local
    j.bone.parent!.getWorldQuaternion(qParent);
    const world = qTurn.multiply(qParent).multiply(j.bone.quaternion);
    j.bone.quaternion.copy(qParent.invert().multiply(world));
    j.bone.updateMatrixWorld(true);
  }
}
