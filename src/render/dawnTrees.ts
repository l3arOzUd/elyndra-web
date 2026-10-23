import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { envArt } from "./envArt";
import type { MapLayout } from "../data/schema";

/** Volumetric trees at authored collision anchors. Canopies do not change walk data. */
export function buildDawnTrees(layout: MapLayout, group: THREE.Group,
  track: <T extends { dispose(): void }>(value: T) => T, time: { value: number }) {
  const trees = layout.props.filter(p => p.kind === "tree");
  if (!trees.length) return;
  const bark = track(new THREE.MeshLambertMaterial({ color: 0x765538 }));
  const image = envArt.textures.get("dawn_bough_v4");
  const texture = image ? track(new THREE.Texture(image)) : null;
  if (texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; texture.needsUpdate = true; }
  const leaves = track(new THREE.MeshLambertMaterial({ color: 0xffffff, map: texture, alphaTest: 0.35, side: THREE.DoubleSide }));
  leaves.onBeforeCompile = shader => {
    shader.uniforms.dawnTime = time;
    shader.vertexShader = 'uniform float dawnTime; varying vec3 vLeaf;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vLeaf = position;
      float phase = instanceMatrix[3].x * 0.43 + instanceMatrix[3].z * 0.27;
      transformed.x += sin(dawnTime * 1.1 + phase + position.y) * 0.025;
    `);
    // Lift the diffuse leaf painting under the shared scene lighting.
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      diffuseColor.rgb = mix(diffuseColor.rgb * 1.65, vec3(0.23, 0.31, 0.13), 0.18);
    `);
  };
  leaves.customProgramCacheKey = () => 'dawn-curved-bough-v4';
  const pieces = [new THREE.CylinderGeometry(0.035, 0.23, 3.9, 9).translate(0, 1.95, 0)];
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + 0.3;
    pieces.push(new THREE.CylinderGeometry(0.04, 0.11, 1.5, 7).rotateZ(0.65).translate(-0.42, 2.1, 0).rotateY(angle));
    pieces.push(new THREE.CylinderGeometry(0.07, 0.16, 0.65, 7).rotateZ(0.9).translate(-0.2, 0.22, 0).rotateY(angle));
  }
  const trunkGeo = track(mergeGeometries(pieces));
  pieces.forEach(piece => piece.dispose());
  // Each painted bough follows a bowed surface, attached at the top of the
  // texture and drooping outwards. Flat rotated cards exposed their edges.
  const crownGeo = track(new THREE.PlaneGeometry(1.9, 2.2, 10, 12));
  const positions = crownGeo.attributes.position;
  for (let k = 0; k < positions.count; k++) {
    const x = positions.getX(k), t = (1.1 - positions.getY(k)) / 2.2;
    positions.setXYZ(k, x, 0.24 * Math.sin(t * Math.PI) - 0.78 * t - 0.28 * (x / 0.95) ** 2, t * 2.2);
  }
  crownGeo.computeVertexNormals();
  crownGeo.computeBoundingSphere();
  const trunks = new THREE.InstancedMesh(trunkGeo, bark, trees.length);
  // Staggered overlapping boughs form a continuous crown. Tree-local variation
  // breaks up repeated rings without changing trunk anchors or collision.
  const lobes: number[][] = [];
  for (let tier = 0; tier < 7; tier++) {
    const count = [8, 8, 7, 6, 5, 4, 3][tier], radius = 0.06;
    for (let j = 0; j < count; j++) {
      const a = j / count * Math.PI * 2 + tier * 0.7;
      lobes.push([Math.sin(a) * radius, 1.9 + tier * 0.53 - Math.max(0, tier - 3) * 0.16 + Math.sin(j * 2.1) * 0.07,
        Math.cos(a) * radius, [1.05, 1.02, 0.88, 0.74, 0.58, 0.4, 0.23][tier], a]);
    }
  }
  const crowns = new THREE.InstancedMesh(crownGeo, leaves, trees.length * lobes.length);
  trunks.castShadow = true;
  crowns.castShadow = true;
  trunks.name = 'dawn-tree-trunks'; crowns.name = 'dawn-tree-canopies';
  const d = new THREE.Object3D();
  trees.forEach((p, i) => {
    const s = p.scale ?? 1, angle = p.rot ?? 0;
    const seed = p.x * 13.7 + p.y * 5.3;
    const breadth = 0.94 + Math.sin(seed) * 0.09;
    const height = 1 + Math.cos(seed * 1.7) * 0.07;
    d.position.set(p.x + 0.5, 0, p.y + 0.5); d.rotation.set(0, angle, 0); d.scale.setScalar(s); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    lobes.forEach(([x, y, z, r, a], j) => {
      d.position.set(p.x + 0.5 + (x * Math.cos(angle) - z * Math.sin(angle)) * s, (y * height + Math.sin(seed + j * 2.7) * 0.09) * s,
        p.y + 0.5 + (x * Math.sin(angle) + z * Math.cos(angle)) * s);
      d.rotation.set(Math.sin(seed + j * 1.7) * 0.08, angle + a + Math.sin(seed + j) * 0.1, Math.cos(j * 2.3 + seed) * 0.07);
      const size = r * s * (1 + Math.sin(seed + j * 3.1) * 0.07);
      d.scale.set(size * breadth, size * height, size * breadth); d.updateMatrix(); crowns.setMatrixAt(i * lobes.length + j, d.matrix);
      crowns.setColorAt(i * lobes.length + j, new THREE.Color(0xa5b7a0).lerp(new THREE.Color(0xf1f2d5), Math.min(1, (y - 1.3) / 3.0)));
    });
  });
  group.add(trunks, crowns);
}
