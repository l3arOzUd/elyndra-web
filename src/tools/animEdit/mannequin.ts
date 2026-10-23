import * as THREE from "three";
import { clonePose, mirrorPose, type EditClip, type Ease, type Key, type Pose } from "./clipMath";

// A chibi wooden-doll stand-in for the Wayfarer: real bones with rigid
// cel-shaded parts on them, so poses can be blocked out before a painted
// or modelled character exists. It faces +z, stands on y = 0 and is about
// one unit tall; its rest pose is standing with the arms down, and every
// bone rests unrotated, so left and right mirror exactly.

// Inverted-hull ink line, pushed out a fixed distance along the normals so
// thin limbs and the big head get the same line weight.
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x2b1f1a, side: THREE.BackSide });
OUTLINE.onBeforeCompile = shader => {
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normal * 0.0065;");
};

function toonRamp(): THREE.DataTexture {
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const ramp = new THREE.DataTexture(data, 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
}

export function buildMannequin(): THREE.Group {
  const ramp = toonRamp();
  const mat = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: ramp });
  const skin = mat(0xf2c9a5), shirt = mat(0xe8dcc0), vest = mat(0x5f7a4e), pants = mat(0x4a5670);
  const boots = mat(0x6b4a33), hair = mat(0x6a3f2a), eye = new THREE.MeshBasicMaterial({ color: 0x2a1c18 });

  const root = new THREE.Group();
  root.name = "Wayfarer";
  const bone = (name: string, parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const b = new THREE.Bone();
    b.name = name; b.position.set(x, y, z); parent.add(b);
    return b;
  };
  const part = (on: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], outline = true) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true;
    if (outline) {
      const line = new THREE.Mesh(geometry, OUTLINE);
      line.userData.outline = true; mesh.add(line);
    }
    on.add(mesh);
    return mesh;
  };
  const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 4, 12);

  const hips = bone("Hips", root, 0, 0.375);
  part(hips, capsule(0.085, 0.03), pants, [0, -0.005, 0], [1.05, 1, 0.8]);
  const spine = bone("Spine", hips, 0, 0.06);
  part(spine, capsule(0.08, 0.04), vest, [0, 0.04, 0], [1, 1, 0.78]);
  const chest = bone("Chest", spine, 0, 0.1);
  part(chest, capsule(0.092, 0.04), shirt, [0, 0.03, 0], [1.08, 1, 0.8]);
  part(chest, new THREE.BoxGeometry(0.11, 0.1, 0.02), vest, [0, 0.0, 0.07], [1, 1, 1], false);
  const neck = bone("Neck", chest, 0, 0.1);
  part(neck, capsule(0.03, 0.02), skin, [0, 0.015, 0]);
  const head = bone("Head", neck, 0, 0.04);
  part(head, new THREE.SphereGeometry(0.19, 28, 20), skin, [0, 0.17, 0], [1, 0.95, 0.95]);
  const cap = part(head, new THREE.SphereGeometry(0.2, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.18, -0.02], [1.03, 1, 1.02]);
  cap.rotation.x = -0.45; // swept back so the forehead and eyes show
  part(head, new THREE.SphereGeometry(0.075, 14, 10), hair, [0, 0.15, -0.16], [1.3, 1.1, 0.8]);
  for (const x of [-0.068, 0.068]) part(head, new THREE.SphereGeometry(0.024, 12, 8), eye, [x, 0.145, 0.168], [0.8, 1.25, 0.5], false);

  for (const [side, s] of [["L", 1], ["R", -1]] as const) {
    const shoulder = bone(`Shoulder_${side}`, chest, 0.07 * s, 0.07);
    const upperArm = bone(`UpperArm_${side}`, shoulder, 0.045 * s, 0);
    part(upperArm, capsule(0.034, 0.07), shirt, [0, -0.055, 0]);
    const lowerArm = bone(`LowerArm_${side}`, upperArm, 0, -0.12);
    part(lowerArm, capsule(0.03, 0.065), skin, [0, -0.05, 0]);
    const hand = bone(`Hand_${side}`, lowerArm, 0, -0.105);
    part(hand, new THREE.SphereGeometry(0.036, 14, 10), skin, [0, -0.025, 0.004], [0.9, 1.1, 0.8]);

    const upperLeg = bone(`UpperLeg_${side}`, hips, 0.055 * s, -0.03);
    part(upperLeg, capsule(0.048, 0.08), pants, [0, -0.075, 0]);
    const lowerLeg = bone(`LowerLeg_${side}`, upperLeg, 0, -0.16);
    part(lowerLeg, capsule(0.044, 0.08), boots, [0, -0.07, 0]);
    const foot = bone(`Foot_${side}`, lowerLeg, 0, -0.15);
    part(foot, new THREE.BoxGeometry(0.075, 0.045, 0.12), boots, [0, -0.012, 0.025]);
  }

  // Props, hidden until a clip asks for one. With the arm hanging, the
  // sword points forward out of the fist, the bow stands upright across the
  // left fist (upright once the arm is raised forward), the staff stands up.
  const steel = mat(0xd3dade), gold = mat(0xc9a24a), wood = mat(0x8a5a32), grip = mat(0x4a3022);
  const prop = (name: string, hand: string) => {
    const group = new THREE.Group();
    group.name = `prop_${name}`; group.userData.prop = name; group.visible = false;
    group.position.set(0, -0.03, 0.004);
    root.getObjectByName(hand)!.add(group);
    return group;
  };
  const sword = prop("sword", "Hand_R");
  part(sword, new THREE.BoxGeometry(0.014, 0.034, 0.34), steel, [0, 0, 0.215]);
  part(sword, new THREE.BoxGeometry(0.11, 0.022, 0.022), gold, [0, 0, 0.04]);
  part(sword, new THREE.CylinderGeometry(0.014, 0.014, 0.07, 8).rotateX(Math.PI / 2), grip, [0, 0, 0]);
  part(sword, new THREE.SphereGeometry(0.02, 10, 8), gold, [0, 0, -0.045]);

  const bow = prop("bow", "Hand_L");
  const limb = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.05, -0.26), new THREE.Vector3(0, -0.13, 0), new THREE.Vector3(0, 0.05, 0.26));
  part(bow, new THREE.TubeGeometry(limb, 24, 0.012, 6), wood, [0, 0, 0]);
  part(bow, new THREE.CylinderGeometry(0.003, 0.003, 0.52, 4).rotateX(Math.PI / 2), mat(0xf1ead8), [0, 0.05, 0], [1, 1, 1], false);

  const staff = prop("staff", "Hand_R");
  part(staff, new THREE.CylinderGeometry(0.014, 0.017, 0.66, 8), wood, [0, 0.13, 0]);
  part(staff, new THREE.TorusGeometry(0.04, 0.009, 6, 16), gold, [0, 0.47, 0]);
  part(staff, new THREE.SphereGeometry(0.032, 14, 10), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), [0, 0.47, 0]);
  return root;
}

/** Shows the named prop (or none) on a character and its copies. */
export function showProp(root: THREE.Object3D, name: string | undefined) {
  root.traverse(o => { if (o.userData.prop) o.visible = o.userData.prop === name; });
}

type Degrees = Record<string, [number, number, number]>;
const DEG = Math.PI / 180;

/** The rest pose with some bones turned (Euler XYZ degrees) and the root moved. */
function posed(rest: Pose, deg: Degrees, move: [number, number, number] = [0, 0, 0]): Pose {
  const pose = clonePose(rest);
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [name, [x, y, z]] of Object.entries(deg)) {
    q.setFromEuler(e.set(x * DEG, y * DEG, z * DEG));
    pose.rot[name] = [q.x, q.y, q.z, q.w];
  }
  if (pose.root) pose.root = [pose.root[0] + move[0], pose.root[1] + move[1], pose.root[2] + move[2]];
  return pose;
}

const F = (frame: number, fps = 12) => frame / fps;
const key = (t: number, pose: Pose, ease: Ease = "smooth"): Key => ({ t, pose, ease });

/**
 * Prototype clips for the mannequin: rough blocking to start from, not
 * finished animation. Axes, as the doll is built: a limb swings forward on
 * negative x; a knee or toe-down is positive x; the chest leans forward on
 * positive x and turns to its left on positive y; an arm lifts sideways on
 * +z (left) or -z (right). The game's sprite names are used, so a clip
 * renders straight into a sheet the engine knows.
 */
export function starterClips(rest: Pose): EditClip[] {
  const bones = Object.keys(rest.rot);
  const mirror = (p: Pose) => mirrorPose(p, bones);
  const p = (deg: Degrees, move?: [number, number, number]) => posed(rest, deg, move);
  const armsDown = { UpperArm_L: [0, 0, 8], UpperArm_R: [0, 0, -8], LowerArm_L: [-8, 0, 0], LowerArm_R: [-8, 0, 0] } satisfies Degrees;

  // idle: breathing.
  const idleA = p(armsDown);
  const idleB = p({ UpperArm_L: [2, 0, 11], UpperArm_R: [2, 0, -11], LowerArm_L: [-12, 0, 0], LowerArm_R: [-12, 0, 0],
    Chest: [-2, 0, 0], Head: [3, 0, 0] }, [0, -0.004, 0]);

  // walk: contact and passing, mirrored for the other foot.
  const contact = p({
    UpperLeg_L: [-28, 0, 0], LowerLeg_L: [6, 0, 0], Foot_L: [18, 0, 0],
    UpperLeg_R: [22, 0, 0], LowerLeg_R: [22, 0, 0], Foot_R: [-12, 0, 0],
    UpperArm_L: [22, 0, 6], UpperArm_R: [-24, 0, -6], LowerArm_L: [-10, 0, 0], LowerArm_R: [-22, 0, 0],
    Spine: [0, 6, 0], Chest: [4, -10, 0], Head: [-3, 4, 0],
  }, [0, -0.012, 0]);
  const passing = p({
    UpperLeg_L: [2, 0, 0], LowerLeg_L: [4, 0, 0], Foot_L: [-4, 0, 0],
    UpperLeg_R: [-14, 0, 0], LowerLeg_R: [52, 0, 0], Foot_R: [-10, 0, 0],
    UpperArm_L: [4, 0, 6], UpperArm_R: [-4, 0, -6], LowerArm_L: [-12, 0, 0], LowerArm_R: [-14, 0, 0],
    Chest: [6, 0, 0],
  }, [0, 0.01, 0]);

  // run: longer strides, bent arms, a forward lean and a moment in the air.
  const runContact = p({
    Spine: [10, 8, 0], Chest: [6, -12, 0], Head: [-12, 4, 0],
    UpperLeg_L: [-48, 0, 0], LowerLeg_L: [22, 0, 0], Foot_L: [12, 0, 0],
    UpperLeg_R: [30, 0, 0], LowerLeg_R: [62, 0, 0], Foot_R: [20, 0, 0],
    UpperArm_L: [42, 0, 10], LowerArm_L: [-75, 0, 0], UpperArm_R: [-50, 0, -10], LowerArm_R: [-85, 0, 0],
  }, [0, -0.02, 0]);
  const runFlight = p({
    Spine: [12, 0, 0], Chest: [6, 0, 0], Head: [-12, 0, 0],
    UpperLeg_L: [-8, 0, 0], LowerLeg_L: [20, 0, 0], Foot_L: [10, 0, 0],
    UpperLeg_R: [-46, 0, 0], LowerLeg_R: [95, 0, 0], Foot_R: [15, 0, 0],
    UpperArm_L: [5, 0, 10], LowerArm_L: [-85, 0, 0], UpperArm_R: [-10, 0, -10], LowerArm_R: [-85, 0, 0],
  }, [0, 0.03, 0]);

  // attack: overhead sword chop. Guard → wind up behind the head → lunge and
  // strike (the "hit" event) → settle back into guard.
  const guard = {
    UpperArm_R: [-30, 0, -10], LowerArm_R: [-40, 0, 0], Hand_R: [0, 0, 0],
    UpperArm_L: [-10, 0, 14], LowerArm_L: [-30, 0, 0],
    Chest: [4, 12, 0], Head: [0, -10, 0],
    UpperLeg_L: [-18, 0, 0], LowerLeg_L: [18, 0, 0], Foot_L: [0, 0, 0],
    UpperLeg_R: [14, 0, 0], LowerLeg_R: [14, 0, 0], Foot_R: [-6, 0, 0],
  } satisfies Degrees;
  const swordGuard = p(guard, [0, -0.012, 0]);
  const windUp = p({ ...guard,
    UpperArm_R: [-165, 0, -14], LowerArm_R: [-55, 0, 0], Hand_R: [-10, 0, 0],
    UpperArm_L: [-45, 0, 18], LowerArm_L: [-35, 0, 0],
    Spine: [-4, 10, 0], Chest: [-10, 22, 0], Head: [6, -18, 0],
  }, [0, -0.004, -0.01]);
  const strike = p({ ...guard,
    UpperArm_R: [-38, 0, -4], LowerArm_R: [-4, 0, 0], Hand_R: [32, 0, 0],
    UpperArm_L: [22, 0, 16], LowerArm_L: [-20, 0, 0],
    Spine: [10, -8, 0], Chest: [16, -16, 0], Head: [-12, 14, 0],
    UpperLeg_L: [-40, 0, 0], LowerLeg_L: [46, 0, 0], Foot_L: [-6, 0, 0],
    UpperLeg_R: [28, 0, 0], LowerLeg_R: [14, 0, 0], Foot_R: [-14, 0, 0],
  }, [0, -0.045, 0.05]);
  const followThrough = p({ ...guard,
    UpperArm_R: [-26, 0, -6], LowerArm_R: [-2, 0, 0], Hand_R: [48, 0, 0],
    UpperArm_L: [26, 0, 16], LowerArm_L: [-22, 0, 0],
    Spine: [11, -9, 0], Chest: [18, -18, 0], Head: [-12, 14, 0],
    UpperLeg_L: [-40, 0, 0], LowerLeg_L: [48, 0, 0], Foot_L: [-6, 0, 0],
    UpperLeg_R: [28, 0, 0], LowerLeg_R: [16, 0, 0], Foot_R: [-14, 0, 0],
  }, [0, -0.048, 0.052]);

  // shoot: raise the bow, draw to the cheek, release ("shoot"), lower.
  const bowReady = p({ ...armsDown, UpperArm_L: [-30, 0, 8], LowerArm_L: [-10, 0, 0], Chest: [0, -8, 0] });
  const aimBase = {
    Spine: [0, -10, 0], Chest: [-2, -16, 0], Head: [0, 24, 0],
    UpperArm_L: [-88, 0, 4], LowerArm_L: [-4, 0, 0],
    UpperArm_R: [-84, 0, 22], LowerArm_R: [-135, 0, 0], Hand_R: [-20, 0, 0],
    UpperLeg_L: [-10, 0, 4], LowerLeg_L: [8, 0, 0], UpperLeg_R: [8, 0, -4], LowerLeg_R: [6, 0, 0],
  } satisfies Degrees;
  const draw = p(aimBase, [0, -0.006, 0]);
  const fullDraw = p({ ...aimBase, UpperArm_R: [-86, 0, 30], LowerArm_R: [-150, 0, 0], Chest: [-4, -20, 0] }, [0, -0.006, 0]);
  const release = p({ ...aimBase, UpperArm_L: [-94, 0, 4], UpperArm_R: [-70, 0, 40], LowerArm_R: [-95, 0, 0], Hand_R: [10, 0, 0],
    Chest: [-6, -22, 0] }, [0, -0.006, -0.008]);

  // cast: staff up and gather, thrust the spell out ("cast"), recover. The
  // right hand keeps turning against the arm so the staff stays upright.
  const castReady = p({ ...armsDown, UpperArm_R: [-25, 0, -8], LowerArm_R: [-35, 0, 0], Hand_R: [60, 0, 0] });
  const gather = p({
    UpperArm_R: [-62, 0, -12], LowerArm_R: [-40, 0, 0], Hand_R: [102, 0, 0],
    UpperArm_L: [-70, 0, 22], LowerArm_L: [-55, 0, 0], Hand_L: [-20, 0, 0],
    Spine: [-3, 0, 0], Chest: [-8, 6, 0], Head: [-10, 0, 0],
    UpperLeg_L: [-14, 0, 0], LowerLeg_L: [26, 0, 0], Foot_L: [-12, 0, 0],
    UpperLeg_R: [-14, 0, 0], LowerLeg_R: [26, 0, 0], Foot_R: [-12, 0, 0],
  }, [0, -0.02, 0]);
  const thrust = p({
    UpperArm_R: [-125, 0, -8], LowerArm_R: [-10, 0, 0], Hand_R: [165, 0, 0],
    UpperArm_L: [-92, 0, 12], LowerArm_L: [-4, 0, 0], Hand_L: [-30, 0, 0],
    Spine: [6, 0, 0], Chest: [10, -6, 0], Head: [-6, 0, 0],
    UpperLeg_L: [-26, 0, 0], LowerLeg_L: [22, 0, 0], Foot_L: [4, 0, 0],
    UpperLeg_R: [16, 0, 0], LowerLeg_R: [8, 0, 0], Foot_R: [-10, 0, 0],
  }, [0, -0.008, 0.03]);

  // hit: snap back from a blow to the chest, then recover.
  const flinch = p({ Spine: [-8, 0, 0], Chest: [-18, -8, 0], Head: [-16, 6, 0],
    UpperArm_L: [24, 0, 28], UpperArm_R: [20, 0, -30], LowerArm_L: [-30, 0, 0], LowerArm_R: [-26, 0, 0],
    UpperLeg_L: [6, 0, 0], LowerLeg_L: [14, 0, 0], UpperLeg_R: [-8, 0, 0], LowerLeg_R: [10, 0, 0] }, [0, -0.008, -0.035]);

  // death: stagger, drop to the knees, slump forward and stay down.
  const stagger = p({ Chest: [-16, 8, 0], Head: [-20, 0, 0], Spine: [-4, 0, 0],
    UpperArm_L: [14, 0, 26], UpperArm_R: [10, 0, -22], LowerArm_L: [-20, 0, 0], LowerArm_R: [-24, 0, 0],
    UpperLeg_L: [-22, 0, 0], LowerLeg_L: [40, 0, 0], Foot_L: [-12, 0, 0],
    UpperLeg_R: [-14, 0, 0], LowerLeg_R: [34, 0, 0], Foot_R: [-14, 0, 0] }, [0, -0.04, -0.02]);
  const kneel = p({ Chest: [24, 0, 0], Head: [22, 0, 0], Spine: [8, 0, 0],
    UpperArm_L: [-18, 0, 10], UpperArm_R: [-14, 0, -10], LowerArm_L: [-12, 0, 0], LowerArm_R: [-14, 0, 0],
    UpperLeg_L: [-10, 0, 0], LowerLeg_L: [102, 0, 0], Foot_L: [62, 0, 0],
    UpperLeg_R: [-8, 0, 0], LowerLeg_R: [100, 0, 0], Foot_R: [60, 0, 0] }, [0, -0.19, 0]);
  const slump = p({ Hips: [38, 0, 0], Spine: [28, 0, 0], Chest: [22, 0, 0], Head: [8, 12, 0],
    UpperArm_L: [-36, 0, 22], UpperArm_R: [-30, 0, -24], LowerArm_L: [-18, 0, 0], LowerArm_R: [-22, 0, 0],
    UpperLeg_L: [-48, 0, 0], LowerLeg_L: [104, 0, 0], Foot_L: [62, 0, 0],
    UpperLeg_R: [-46, 0, 0], LowerLeg_R: [102, 0, 0], Foot_R: [60, 0, 0] }, [0, -0.23, 0.04]);

  return [
    { name: "idle", duration: 2, fps: 8, loop: true, keys: [key(0, idleA), key(1, idleB)] },
    { name: "walk", duration: F(10), fps: 12, loop: true, keys: [
      key(0, contact), key(F(3), passing), key(F(5), mirror(contact)), key(F(8), mirror(passing))] },
    { name: "run", duration: F(8), fps: 12, loop: true, keys: [
      key(0, runContact), key(F(2), runFlight), key(F(4), mirror(runContact)), key(F(6), mirror(runFlight))] },
    { name: "attack", duration: F(10), fps: 12, loop: false, prop: "sword", events: { hit: 5 }, keys: [
      key(0, swordGuard), key(F(3), windUp, "linear"), key(F(5), strike), key(F(6), followThrough), key(F(10), swordGuard)] },
    { name: "shoot", duration: F(12), fps: 12, loop: false, prop: "bow", events: { shoot: 7 }, keys: [
      key(0, bowReady), key(F(3), draw), key(F(6), fullDraw, "step"), key(F(7), release), key(F(9), release), key(F(12), bowReady)] },
    { name: "cast", duration: F(12), fps: 12, loop: false, prop: "staff", events: { cast: 7 }, keys: [
      key(0, castReady), key(F(4), gather), key(F(6), gather, "linear"), key(F(7), thrust), key(F(9), thrust), key(F(12), castReady)] },
    { name: "hit", duration: F(5), fps: 12, loop: false, keys: [key(0, idleA, "linear"), key(F(1), flinch), key(F(5), idleA)] },
    { name: "death", duration: F(12), fps: 12, loop: false, keys: [
      key(0, idleA), key(F(3), stagger), key(F(6), kneel), key(F(9), slump, "linear"), key(F(12), slump)] },
  ];
}
