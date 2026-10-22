import * as THREE from "three";

// The RO-style camera: a narrow 15-degree lens pitched 50 degrees down,
// which reads as nearly isometric but still has depth. The wheel zooms.
// Turning and tilting are locked, because the creatures are 2D paintings
// drawn for this one view; add ?freecam to the URL to unlock them for
// debugging (right-drag turns, Shift+right-drag tilts, double right-click
// or Home puts it back). Distances are in cells.

const DEFAULT_PITCH = 50;
/** Camera distance at the default zoom (floating numbers are sized for it). */
export const DEFAULT_DISTANCE = 72;
const MIN_DISTANCE = 36;
const MAX_DISTANCE = 160;

export class IsoCamera {
  readonly camera: THREE.PerspectiveCamera;
  readonly target = new THREE.Vector3();
  /** Radians; sprite facings are worked out relative to it. */
  yaw = 0;
  pitchDeg = DEFAULT_PITCH;
  /** Fixed view for the 2D creature art; ?freecam unlocks it. */
  readonly locked = !new URLSearchParams(location.search).has("freecam");
  private distance = DEFAULT_DISTANCE;
  private distanceGoal = DEFAULT_DISTANCE;
  private yawGoal: number | null = null;
  private pitchGoal: number | null = null;
  private shake = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(15, aspect, 1, 2000);
  }

  zoom(steps: number) {
    this.distanceGoal = THREE.MathUtils.clamp(this.distanceGoal * Math.pow(1.12, steps), MIN_DISTANCE, MAX_DISTANCE);
  }

  turn(pixels: number) {
    if (this.locked) return;
    this.yawGoal = null;
    this.yaw -= pixels * 0.007;
  }

  tilt(pixels: number) {
    if (this.locked) return;
    this.pitchGoal = null;
    this.pitchDeg = THREE.MathUtils.clamp(this.pitchDeg + pixels * 0.25, 20, 85);
  }

  /** Eases back to north, the default tilt and zoom. */
  reset() {
    this.yawGoal = Math.round(this.yaw / (Math.PI * 2)) * Math.PI * 2;
    this.pitchGoal = DEFAULT_PITCH;
    this.distanceGoal = DEFAULT_DISTANCE;
  }

  /** A short shake, for heavy hits. */
  kick(amount = 0.25) {
    this.shake = Math.max(this.shake, amount);
  }

  update(dt: number, follow: THREE.Vector3) {
    const k = 1 - Math.exp(-8 * dt);
    this.target.lerp(follow, 1 - Math.exp(-12 * dt));
    this.distance += (this.distanceGoal - this.distance) * k;
    if (this.yawGoal !== null) {
      this.yaw += (this.yawGoal - this.yaw) * k;
      if (Math.abs(this.yawGoal - this.yaw) < 1e-3) { this.yaw = 0; this.yawGoal = null; }
    }
    if (this.pitchGoal !== null) {
      this.pitchDeg += (this.pitchGoal - this.pitchDeg) * k;
      if (Math.abs(this.pitchGoal - this.pitchDeg) < 0.01) this.pitchGoal = null;
    }
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const jitter = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;

    const pitch = THREE.MathUtils.degToRad(this.pitchDeg);
    const pivot = this.target.clone().add(new THREE.Vector3(jitter, 0.6, jitter));
    // At yaw 0 the camera sits south of the target looking north.
    const offset = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch))
      .multiplyScalar(this.distance);
    this.camera.position.copy(pivot).add(offset);
    this.camera.lookAt(pivot);
    this.camera.updateMatrixWorld(true);
  }
}
