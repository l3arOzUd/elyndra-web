import * as THREE from "three";
import { clipFromPoses, clonePose, mirrorPose, moveKeys, type EditClip, type Ease, type Pose, type PoseKey } from "./clipMath";
import type { Collider } from "./spring";

// A chibi wooden-doll stand-in for the Wayfarer: real bones with rigid
// cel-shaded parts on them, so poses can be blocked out before a painted
// or modelled character exists. It faces +z, stands on y = 0 and is about
// one unit tall; its rest pose is standing with the arms down, and every
// bone rests unrotated, so left and right mirror exactly.
//
// Every hairstyle, outfit piece and prop is built once and shown or hidden
// by the look, so the bone list never changes and a project's keys fit any
// look. Hair and cape hang from spring bones (userData.spring) that the
// editor's physics swings.

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

export interface Look {
  hair: "short" | "ponytail" | "long" | "spiky";
  hairColor: "brown" | "black" | "blonde" | "red" | "silver" | "blue";
  outfit: "traveler" | "knight" | "mage" | "ranger";
  cape: boolean;
}
export const DEFAULT_LOOK: Look = { hair: "short", hairColor: "brown", outfit: "traveler", cape: false };

/** The look options, with their Thai labels, for the editor's pickers. */
export const LOOK_OPTIONS = {
  hair: { short: "สั้น", ponytail: "หางม้า", long: "ยาว", spiky: "ชี้ฟู" },
  hairColor: { brown: "น้ำตาล", black: "ดำ", blonde: "ทอง", red: "แดง", silver: "เงิน", blue: "น้ำเงิน" },
  outfit: { traveler: "นักเดินทาง", knight: "อัศวิน", mage: "นักเวท", ranger: "พราน" },
} as const;

const HAIR_COLORS: Record<Look["hairColor"], number> = {
  brown: 0x6a3f2a, black: 0x2c2630, blonde: 0xe0b860, red: 0xa8432e, silver: 0xc9ccd6, blue: 0x3f5fa8,
};
const OUTFITS: Record<Look["outfit"], { shirt: number; vest: number; pants: number; boots: number; cape: number }> = {
  traveler: { shirt: 0xe8dcc0, vest: 0x5f7a4e, pants: 0x4a5670, boots: 0x6b4a33, cape: 0x8a3b2e },
  knight: { shirt: 0xa9b1bb, vest: 0x8e2f2f, pants: 0x4b4f58, boots: 0x7d858f, cape: 0x2f3f7a },
  mage: { shirt: 0x6a58a0, vest: 0x3b2f66, pants: 0x3b2f66, boots: 0x4a3a2c, cape: 0x2a2450 },
  ranger: { shirt: 0x7d8a52, vest: 0x6b4a2e, pants: 0x50493a, boots: 0x4f3826, cape: 0x3f5a35 },
};

/** Materials a look recolours, per built mannequin (kept off userData so clones stay light). */
const lookMaterials = new WeakMap<THREE.Object3D, Record<"hair" | "shirt" | "vest" | "pants" | "boots" | "cape", THREE.MeshToonMaterial>>();

export function buildMannequin(): THREE.Group {
  const ramp = toonRamp();
  const mat = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: ramp });
  const skin = mat(0xf2c9a5), shirt = mat(0xe8dcc0), vest = mat(0x5f7a4e), pants = mat(0x4a5670);
  const boots = mat(0x6b4a33), hair = mat(0x6a3f2a), cape = mat(0x8a3b2e), eye = new THREE.MeshBasicMaterial({ color: 0x2a1c18 });
  const steel = mat(0xd3dade), gold = mat(0xc9a24a), wood = mat(0x8a5a32), grip = mat(0x4a3022), leather = mat(0x5a3b25);

  const root = new THREE.Group();
  root.name = "Wayfarer";
  lookMaterials.set(root, { hair, shirt, vest, pants, boots, cape });
  const bone = (name: string, parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const b = new THREE.Bone();
    b.name = name; b.position.set(x, y, z); parent.add(b);
    return b;
  };
  const part = (on: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], outline = true, show?: string) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true;
    if (show) mesh.userData.show = show;
    if (outline) {
      const line = new THREE.Mesh(geometry, OUTLINE);
      line.userData.outline = true; mesh.add(line);
    }
    on.add(mesh);
    return mesh;
  };
  const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 4, 12);
  /** A chain of spring bones hanging from `parent`, each `step` below the last. */
  const springChain = (name: string, parent: THREE.Object3D, at: [number, number, number], step: [number, number, number], count: number) => {
    const chain: THREE.Bone[] = [];
    let on = parent;
    for (let i = 0; i < count; i++) {
      const b = bone(`${name}_${i + 1}`, on, ...(i ? step : at));
      b.userData.spring = true;
      if (i === count - 1) b.userData.springTip = step;
      chain.push(b); on = b;
    }
    return chain;
  };

  const hips = bone("Hips", root, 0, 0.375);
  part(hips, capsule(0.085, 0.03), pants, [0, -0.005, 0], [1.05, 1, 0.8]);
  part(hips, new THREE.ConeGeometry(0.15, 0.24, 18, 1, true), vest, [0, -0.1, 0], [1, 1, 0.85], true, "outfit=mage");
  part(hips, new THREE.TorusGeometry(0.088, 0.014, 6, 20).rotateX(Math.PI / 2), leather, [0, 0.02, 0], [1.05, 1, 0.82], true, "outfit=knight|ranger");
  const spine = bone("Spine", hips, 0, 0.06);
  part(spine, capsule(0.08, 0.04), vest, [0, 0.04, 0], [1, 1, 0.78]);
  const chest = bone("Chest", spine, 0, 0.1);
  part(chest, capsule(0.092, 0.04), shirt, [0, 0.03, 0], [1.08, 1, 0.8]);
  part(chest, new THREE.BoxGeometry(0.11, 0.1, 0.02), vest, [0, 0.0, 0.07], [1, 1, 1], false, "outfit=traveler|knight|ranger");
  part(chest, new THREE.CylinderGeometry(0.03, 0.03, 0.22, 10), leather, [-0.04, 0.02, -0.09], [1, 1, 1], true, "outfit=ranger")
    .rotation.z = 0.5;
  const neck = bone("Neck", chest, 0, 0.1);
  part(neck, capsule(0.03, 0.02), skin, [0, 0.015, 0]);
  const head = bone("Head", neck, 0, 0.04);
  part(head, new THREE.SphereGeometry(0.19, 28, 20), skin, [0, 0.17, 0], [1, 0.95, 0.95]);
  const cap = part(head, new THREE.SphereGeometry(0.2, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.18, -0.02], [1.03, 1, 1.02]);
  cap.rotation.x = -0.45; // swept back so the forehead and eyes show
  part(head, new THREE.SphereGeometry(0.075, 14, 10), hair, [0, 0.15, -0.16], [1.3, 1.1, 0.8], true, "hair=short");
  for (const x of [-0.068, 0.068]) part(head, new THREE.SphereGeometry(0.024, 12, 8), eye, [x, 0.145, 0.168], [0.8, 1.25, 0.5], false);
  for (const [x, z, tilt, turn] of [[0, 0.02, -0.5, 0], [0.1, -0.02, -0.4, -0.7], [-0.1, -0.02, -0.4, 0.7], [0.05, -0.12, -1.1, -0.4], [-0.05, -0.12, -1.1, 0.4]]) {
    const spike = part(head, new THREE.ConeGeometry(0.06, 0.16, 8), hair, [x, 0.33, z], [1, 1, 1], true, "hair=spiky");
    spike.rotation.set(tilt, 0, turn);
  }
  for (const x of [-0.17, 0.17]) part(head, capsule(0.035, 0.12), hair, [x, 0.1, 0.02], [1, 1, 0.8], true, "hair=long");
  const hat = part(head, new THREE.ConeGeometry(0.2, 0.32, 20), vest, [0, 0.42, -0.04], [1, 1, 1], true, "outfit=mage");
  hat.rotation.x = -0.25;
  part(head, new THREE.TorusGeometry(0.2, 0.025, 6, 24).rotateX(Math.PI / 2), vest, [0, 0.28, -0.02], [1.05, 1, 1.05], true, "outfit=mage");

  // Ponytail and long hair hang from the back of the head; the cape from the shoulders.
  const tail = springChain("Ponytail", head, [0, 0.3, -0.16], [0, -0.07, -0.055], 3);
  part(tail[0], new THREE.SphereGeometry(0.03, 10, 8), leather, [0, 0, 0], [1, 1, 1], true, "hair=ponytail");
  tail.forEach((b, i) => part(b, capsule(0.045 - i * 0.009, 0.05), hair, [0, -0.045, 0], [1, 1, 0.85], true, "hair=ponytail"));
  const long = springChain("HairBack", head, [0, 0.22, -0.16], [0, -0.11, -0.01], 3);
  long.forEach((b, i) => part(b, new THREE.BoxGeometry(0.3 - i * 0.03, 0.12, 0.05), hair, [0, -0.055, 0], [1, 1, 1], true, "hair=long"));
  const capeBones = springChain("Cape", chest, [0, 0.085, -0.075], [0, -0.13, -0.008], 3);
  capeBones.forEach((b, i) => part(b, new THREE.BoxGeometry(0.17 + i * 0.025, 0.135, 0.014), cape, [0, -0.065, 0], [1, 1, 1], true, "cape"));

  for (const [side, s] of [["L", 1], ["R", -1]] as const) {
    const shoulder = bone(`Shoulder_${side}`, chest, 0.07 * s, 0.07);
    const upperArm = bone(`UpperArm_${side}`, shoulder, 0.045 * s, 0);
    part(upperArm, capsule(0.034, 0.07), shirt, [0, -0.055, 0]);
    part(upperArm, new THREE.SphereGeometry(0.05, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), steel, [0, -0.005, 0], [1.1, 1, 1], true, "outfit=knight");
    const lowerArm = bone(`LowerArm_${side}`, upperArm, 0, -0.12);
    part(lowerArm, capsule(0.03, 0.065), skin, [0, -0.05, 0]);
    part(lowerArm, new THREE.CylinderGeometry(0.036, 0.033, 0.06, 10), leather, [0, -0.07, 0], [1, 1, 1], true, "outfit=ranger|knight");
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

  applyLook(root, DEFAULT_LOOK);
  return root;
}

/** Whether a part tagged `show` ("hair=short|long", "outfit=mage", "cape") belongs to a look. */
function wanted(show: string, look: Look): boolean {
  if (show === "cape") return look.cape;
  const [key, values] = show.split("=");
  return values.split("|").includes(String(look[key as keyof Look]));
}

/** Shows the parts of a look on a mannequin (or a copy of one) and recolours it. */
export function applyLook(root: THREE.Object3D, look: Look) {
  root.traverse(o => { if (typeof o.userData.show === "string") o.visible = wanted(o.userData.show, look); });
  const mats = lookMaterials.get(root);
  if (!mats) return;
  const outfit = OUTFITS[look.outfit];
  mats.hair.color.setHex(HAIR_COLORS[look.hairColor]);
  mats.shirt.color.setHex(outfit.shirt); mats.vest.color.setHex(outfit.vest);
  mats.pants.color.setHex(outfit.pants); mats.boots.color.setHex(outfit.boots); mats.cape.color.setHex(outfit.cape);
}

/** Shows the named prop (or none) on a character and its copies. */
export function showProp(root: THREE.Object3D, name: string | undefined) {
  root.traverse(o => { if (o.userData.prop) o.visible = o.userData.prop === name; });
}

/** Body spheres the hair and cape are kept out of. */
export function mannequinColliders(root: THREE.Object3D): Collider[] {
  const at = (name: string, offset: [number, number, number], radius: number): Collider[] => {
    const bone = root.getObjectByName(name);
    return bone ? [{ bone, offset: new THREE.Vector3(...offset), radius }] : [];
  };
  return [
    ...at("Head", [0, 0.17, 0], 0.205), ...at("Chest", [0, 0.02, 0], 0.105), ...at("Spine", [0, 0.03, 0], 0.095),
    ...at("Hips", [0, -0.02, 0], 0.1), ...at("UpperLeg_L", [0, -0.08, 0], 0.06), ...at("UpperLeg_R", [0, -0.08, 0], 0.06),
  ];
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
const key = (t: number, pose: Pose, ease: Ease = "smooth"): PoseKey => ({ t, pose, ease });
type Blocked = Omit<EditClip, "rot" | "pos"> & { keys: PoseKey[] };

/**
 * Rough blocking for the mannequin's prototype clips. Axes, as the doll is
 * built: a limb swings forward on negative x; a knee or toe-down is
 * positive x; the chest leans forward on positive x and turns to its left
 * on positive y; an arm lifts sideways on +z (left) or -z (right).
 */
function blocking(rest: Pose) {
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

  // attack: overhead sword chop. Guard → raise the blade high, pointing back → lunge and
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
    UpperArm_R: [-168, 0, -18], LowerArm_R: [-22, 0, 0], Hand_R: [10, 0, 0],
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

  const clips: Blocked[] = [
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
  const poses: [string, Pose][] = [
    ["ยืนพัก", idleA], ["เดิน · ก้าว", contact], ["วิ่ง · ก้าว", runContact], ["ดาบ · ตั้งการ์ด", swordGuard],
    ["ดาบ · ง้าง", windUp], ["ดาบ · ฟัน", strike], ["ธนู · ง้างสุด", fullDraw], ["ธนู · ปล่อย", release],
    ["เวท · รวมพลัง", gather], ["เวท · ปล่อย", thrust], ["โดนตี", flinch], ["คุกเข่า", kneel],
  ];
  return { clips, poses };
}

/**
 * Prototype clips for the mannequin: rough blocking to start from, not
 * finished animation. The game's sprite names are used, so a clip renders
 * straight into a sheet the engine knows. Spring bones (hair, cape) get no
 * keys; physics moves them. In the attack the body leads the sword arm by a
 * frame, the overlap per-bone keys allow.
 */
export function starterClips(rest: Pose): EditClip[] {
  const skip = new Set(Object.keys(rest.rot).filter(n => /^(Ponytail|HairBack|Cape)_\d$/.test(n)));
  return blocking(rest).clips.map(({ keys, ...base }) => {
    const clip = clipFromPoses(base, keys, skip);
    if (clip.name === "attack") moveKeys(clip, 5 / 12, 4 / 12, ["Spine", "Chest", "Hips", "#root"]);
    return clip;
  });
}

/** Key poses from the prototype clips, for the pose library. */
export function starterPoses(rest: Pose): { name: string; pose: Pose }[] {
  return blocking(rest).poses.map(([name, pose]) => ({ name, pose }));
}

