import * as THREE from 'three';
import type { Prop } from '../data/schema';
import { envArt } from './envArt';

/** Shares scene lighting across undergrowth and stones, including blocker heaps. */
export function buildDawnDetails(props: Prop[], group: THREE.Group,
  track: <T extends { dispose(): void }>(resource: T) => T) {
  const image = envArt.textures.get('dawn_canopy');
  const map = image ? track(new THREE.Texture(image)) : null;
  if (map) { map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true; }
  for (const kind of ['bush', 'rock', 'boulder']) {
    const list = props.filter(p => p.kind === kind);
    if (!list.length) continue;
    const bush = kind === 'bush';
    const geo = track(new THREE.IcosahedronGeometry(1, bush ? 2 : 1));
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const r = 1 + Math.sin(x * 9 + z * 7) * Math.cos(y * 6) * 0.12;
      positions.setXYZ(i, x * r, y * r, z * r);
    }
    geo.computeVertexNormals();
    const mat = track(new THREE.MeshLambertMaterial({ color: bush ? 0xc5cf9c : 0xa29b80, map: bush ? map : null }));
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.name = `dawn-${kind}`;
    const d = new THREE.Object3D();
    list.forEach((p, i) => {
      const scale = (p.scale ?? 1) * (kind === 'boulder' ? 0.95 : bush ? 0.5 : 0.38);
      d.position.set(p.x + 0.5, scale * 0.3, p.y + 0.5);
      d.rotation.set(0, p.rot ?? p.x * 0.7, 0);
      d.scale.set(scale, scale * (bush ? 0.65 : 0.55), scale * 0.85);
      d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, new THREE.Color().setScalar(0.88 + (i % 5) * 0.03));
    });
    group.add(mesh);
  }
}
