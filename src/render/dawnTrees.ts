import * as THREE from "three";
import type { MapLayout } from "../data/schema";

/** Volumetric trees at authored collision anchors. Canopies do not change walk data. */
export function buildDawnTrees(layout: MapLayout, group: THREE.Group,
  track: <T extends { dispose(): void }>(value: T) => T, time: { value: number }) {
  const trees = layout.props.filter(p => p.kind === "tree");
  if (!trees.length) return;
  const bark = track(new THREE.MeshLambertMaterial({ color: 0x765538 }));
  const leaves = track(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
  leaves.onBeforeCompile = shader => {
    shader.uniforms.dawnTime = time;
    shader.vertexShader = 'uniform float dawnTime; varying vec3 vLeaf;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vLeaf = position;
      float phase = instanceMatrix[3].x * 0.43 + instanceMatrix[3].z * 0.27;
      transformed.x += sin(dawnTime * 1.1 + phase + position.y) * 0.025;
    `);
    shader.fragmentShader = 'varying vec3 vLeaf;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p = vLeaf * 18.0;
      float mottling = sin(p.x + sin(p.z * 1.3)) * sin(p.y * 1.4 + cos(p.x));
      float leaf = smoothstep(0.05, 0.7, mottling);
      diffuseColor.rgb *= 0.78 + leaf * 0.3;
    `);
  };
  leaves.customProgramCacheKey = () => 'dawn-canopy-sway-v2';
  const trunkGeo = track(new THREE.CylinderGeometry(0.12, 0.28, 2.5, 9).translate(0, 1.25, 0));
  const crownGeo = track(new THREE.IcosahedronGeometry(1, 2));
  const vertices = crownGeo.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const r = 1 + 0.08 * Math.sin(x * 12 + z * 7) * Math.cos(y * 9 - z * 4);
    vertices.setXYZ(i, x * r, y * r, z * r);
  }
  crownGeo.computeVertexNormals();
  const colors = new Float32Array(crownGeo.attributes.position.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < crownGeo.attributes.position.count; i++) {
    const y = crownGeo.attributes.position.getY(i);
    color.set(0x547344).lerp(new THREE.Color(0xb4c879), (y + 1) * 0.5);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  crownGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const trunks = new THREE.InstancedMesh(trunkGeo, bark, trees.length);
  const crowns = new THREE.InstancedMesh(crownGeo, leaves, trees.length * 5);
  trunks.name = 'dawn-tree-trunks'; crowns.name = 'dawn-tree-canopies';
  const d = new THREE.Object3D();
  const lobes = [[0, 3.1, 0, 1.1], [-0.75, 2.6, 0.2, 0.85], [0.65, 2.75, 0.35, 0.95], [0.1, 2.55, -0.65, 0.85], [-0.2, 3.5, -0.15, 0.75]];
  trees.forEach((p, i) => {
    const s = p.scale ?? 1, angle = p.rot ?? 0;
    d.position.set(p.x + 0.5, 0, p.y + 0.5); d.rotation.set(0, angle, 0); d.scale.setScalar(s); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    lobes.forEach(([x, y, z, r], j) => {
      d.position.set(p.x + 0.5 + (x * Math.cos(angle) - z * Math.sin(angle)) * s, y * s,
        p.y + 0.5 + (x * Math.sin(angle) + z * Math.cos(angle)) * s);
      d.scale.set(r * s, r * s * 0.8, r * s); d.updateMatrix(); crowns.setMatrixAt(i * 5 + j, d.matrix);
    });
  });
  group.add(trunks, crowns);
}
