import * as THREE from 'three';
import type { Prop } from '../data/schema';
import { envArt } from './envArt';
import { farmWallCell } from '../shared/dawnFarm';

/** Shares scene lighting across undergrowth and stones, including blocker heaps. */
export function buildDawnDetails(props: Prop[], group: THREE.Group,
  track: <T extends { dispose(): void }>(resource: T) => T) {
  const image = envArt.textures.get('dawn_leaf_spray');
  const map = image ? track(new THREE.Texture(image)) : null;
  if (map) { map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true; }
  for (const kind of ['bush', 'rock', 'boulder', 'ruin_block']) {
    const list = props.filter(p => p.kind === kind && !(kind === 'ruin_block' && farmWallCell(p.x, p.y)));
    if (!list.length) continue;
    const bush = kind === 'bush';
    const ruin = kind === 'ruin_block';
    const geo = track(bush ? new THREE.PlaneGeometry(2.3, 2).rotateX(-Math.PI / 3)
      : ruin ? new THREE.BoxGeometry(1.8, 1.4, 1.6) : new THREE.IcosahedronGeometry(1, 1));
    const positions = geo.attributes.position;
    for (let i = 0; !bush && !ruin && i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const r = 1 + Math.sin(x * 9 + z * 7) * Math.cos(y * 6) * 0.12;
      positions.setXYZ(i, x * r, y * r, z * r);
    }
    geo.computeVertexNormals();
    const mat = track(new THREE.MeshLambertMaterial({ color: bush ? 0x8ea77e : ruin ? 0xc3b797 : 0xa29b80, map: bush ? map : null,
      alphaTest: bush ? 0.45 : 0, side: bush ? THREE.DoubleSide : THREE.FrontSide }));
    if (bush) {
      mat.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          diffuseColor.rgb *= 1.35;
        `);
      };
      mat.customProgramCacheKey = () => 'dawn-undergrowth-v3';
    }
    const copies = bush ? 3 : 1;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length * copies);
    mesh.name = `dawn-${kind}`;
    mesh.castShadow = true;
    const d = new THREE.Object3D();
    list.forEach((p, i) => {
      const scale = (p.scale ?? 1) * (kind === 'boulder' ? 0.95 : ruin ? 0.7 : bush ? 0.5 : 0.38);
      for (let j = 0; j < copies; j++) {
        d.position.set(p.x + 0.5, scale * (bush ? 0.6 : 0.3), p.y + 0.5);
        d.rotation.set(0, (p.rot ?? p.x * 0.7) + j * 2.1, 0);
        d.scale.set(scale, scale * (bush ? 1 : 0.55), scale * 0.85);
        d.updateMatrix(); mesh.setMatrixAt(i * copies + j, d.matrix);
        mesh.setColorAt(i * copies + j, new THREE.Color().setScalar(0.88 + (i % 5) * 0.03));
      }
    });
    group.add(mesh);
  }
}
