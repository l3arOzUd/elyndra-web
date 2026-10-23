import * as THREE from "three";
import { clonePose, mirrorPose, type EditClip, type Pose } from "./clipMath";

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
  return root;
}

type Degrees = Record<string, [number, number, number]>;

function posed(rest: Pose, deg: Degrees, rootY?: number): Pose {
  const pose = clonePose(rest);
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [name, [x, y, z]] of Object.entries(deg)) {
    q.setFromEuler(e.set(x * DEG, y * DEG, z * DEG));
    pose.rot[name] = [q.x, q.y, q.z, q.w];
  }
  if (rootY !== undefined && pose.root) pose.root = [pose.root[0], rootY, pose.root[2]];
  return pose;
}
const DEG = Math.PI / 180;

/**
 * Starting clips for the mannequin, so the editor opens on something that
 * moves. Swinging a limb forward is a negative x rotation; outward is +z
 * on the left side.
 */
export function starterClips(rest: Pose): EditClip[] {
  const bones = Object.keys(rest.rot);
  const y = rest.root?.[1] ?? 0.375;
  const idleA = posed(rest, { UpperArm_L: [0, 0, 8], UpperArm_R: [0, 0, -8], LowerArm_L: [-8, 0, 0], LowerArm_R: [-8, 0, 0] });
  const idleB = posed(rest, { UpperArm_L: [2, 0, 11], UpperArm_R: [2, 0, -11], LowerArm_L: [-12, 0, 0], LowerArm_R: [-12, 0, 0],
    Chest: [-2, 0, 0], Head: [3, 0, 0] }, y - 0.004);
  const contact = posed(rest, {
    UpperLeg_L: [-28, 0, 0], LowerLeg_L: [6, 0, 0], Foot_L: [18, 0, 0],
    UpperLeg_R: [22, 0, 0], LowerLeg_R: [22, 0, 0], Foot_R: [-12, 0, 0],
    UpperArm_L: [22, 0, 6], UpperArm_R: [-24, 0, -6], LowerArm_L: [-10, 0, 0], LowerArm_R: [-22, 0, 0],
    Spine: [0, 6, 0], Chest: [4, -10, 0], Head: [-3, 4, 0],
  }, y - 0.012);
  const passing = posed(rest, {
    UpperLeg_L: [2, 0, 0], LowerLeg_L: [4, 0, 0], Foot_L: [-4, 0, 0],
    UpperLeg_R: [-14, 0, 0], LowerLeg_R: [52, 0, 0], Foot_R: [-10, 0, 0],
    UpperArm_L: [4, 0, 6], UpperArm_R: [-4, 0, -6], LowerArm_L: [-12, 0, 0], LowerArm_R: [-14, 0, 0],
    Chest: [6, 0, 0],
  }, y + 0.01);
  return [
    { name: "idle", duration: 2, fps: 8, loop: true, keys: [
      { t: 0, pose: idleA, ease: "smooth" }, { t: 1, pose: idleB, ease: "smooth" }] },
    { name: "walk", duration: 10 / 12, fps: 12, loop: true, keys: [
      { t: 0, pose: contact, ease: "smooth" }, { t: 3 / 12, pose: passing, ease: "smooth" },
      { t: 5 / 12, pose: mirrorPose(contact, bones), ease: "smooth" }, { t: 8 / 12, pose: mirrorPose(passing, bones), ease: "smooth" }] },
  ];
}
