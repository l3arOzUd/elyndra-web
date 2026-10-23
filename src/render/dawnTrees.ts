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
  const image = envArt.textures.get("dawn_fir_v2");
  const texture = image ? track(new THREE.Texture(image)) : null;
  if (texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; texture.needsUpdate = true; }
  const leaves = track(new THREE.MeshLambertMaterial({ color: 0xffffff, map: texture, alphaTest: 0.45, side: THREE.DoubleSide }));
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
      diffuseColor.rgb *= 1.1;
    `);
  };
  leaves.customProgramCacheKey = () => 'dawn-fir-spray-v2';
  const pieces = [new THREE.CylinderGeometry(0.07, 0.23, 4.6, 9).translate(0, 2.3, 0)];
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + 0.3;
    pieces.push(new THREE.CylinderGeometry(0.04, 0.11, 1.5, 7).rotateZ(0.65).translate(-0.42, 2.1, 0).rotateY(angle));
    pieces.push(new THREE.CylinderGeometry(0.07, 0.16, 0.65, 7).rotateZ(0.9).translate(-0.2, 0.22, 0).rotateY(angle));
  }
  const trunkGeo = track(mergeGeometries(pieces));
  pieces.forEach(piece => piece.dispose());
  const crownGeo = track(new THREE.PlaneGeometry(2.6, 1.8).rotateX(-Math.PI / 4));
  const trunks = new THREE.InstancedMesh(trunkGeo, bark, trees.length);
  // Overlapping flattened sprays break the silhouette into leafy scallops.
  // The previous five huge balls read as a bunch of boulders on a pole.
  const lobes: number[][] = [];
  for (let tier = 0; tier < 5; tier++) {
    const count = [9, 8, 7, 6, 4][tier], radius = [0.95, 0.8, 0.6, 0.4, 0.18][tier];
    for (let j = 0; j < count; j++) {
      const a = j / count * Math.PI * 2 + tier * 0.7;
      lobes.push([Math.cos(a) * radius, 1.8 + tier * 0.68 + Math.sin(j * 2.1) * 0.12,
        Math.sin(a) * radius, [1.1, 0.95, 0.78, 0.6, 0.45][tier] + Math.sin(j * 4.3 + tier) * 0.06]);
    }
  }
  lobes.push([0, 4.95, 0, 0.36]);
  const crowns = new THREE.InstancedMesh(crownGeo, leaves, trees.length * lobes.length);
  trunks.castShadow = true;
  crowns.castShadow = true; crowns.receiveShadow = true;
  trunks.name = 'dawn-tree-trunks'; crowns.name = 'dawn-tree-canopies';
  const d = new THREE.Object3D();
  trees.forEach((p, i) => {
    const s = p.scale ?? 1, angle = p.rot ?? 0;
    d.position.set(p.x + 0.5, 0, p.y + 0.5); d.rotation.set(0, angle, 0); d.scale.setScalar(s); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    lobes.forEach(([x, y, z, r], j) => {
      d.position.set(p.x + 0.5 + (x * Math.cos(angle) - z * Math.sin(angle)) * s, y * s,
        p.y + 0.5 + (x * Math.sin(angle) + z * Math.cos(angle)) * s);
      d.rotation.set(Math.sin(j * 1.7) * 0.16, angle + j * 2.4, Math.cos(j * 2.3) * 0.12);
      d.scale.setScalar(r * s); d.updateMatrix(); crowns.setMatrixAt(i * lobes.length + j, d.matrix);
      crowns.setColorAt(i * lobes.length + j, new THREE.Color(0x70917b).lerp(new THREE.Color(0xffffff), Math.min(1, (y - 1.6) / 3.4)));
    });
  });
  group.add(trunks, crowns);
}
