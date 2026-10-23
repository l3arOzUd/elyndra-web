import * as THREE from 'three';
import { decodeWalk, type MapLayout } from '../data/schema';

/** Raised islands stay inside existing solid cliffs; every walking cell remains flat. */
export function buildDawnRelief(layout: MapLayout, group: THREE.Group,
  material: THREE.MeshLambertMaterial, track: <T extends { dispose(): void }>(resource: T) => T) {
  const walk = decodeWalk(layout.walk_rle, layout.width * layout.height);
  for (const b of layout.blockers) {
    if (b.kind !== 'cliff' || !('ellipse' in b.shape)) continue;
    const [cx, cz, rx, rz] = b.shape.ellipse;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const rings = 12, segments = 48;
    for (let ring = 0; ring <= rings; ring++) for (let j = 0; j <= segments; j++) {
      const r = ring / rings, a = j / segments * Math.PI * 2;
      const x = cx + Math.cos(a) * rx * r, z = cz + Math.sin(a) * rz * r;
      let height = Math.pow(Math.max(0, 1 - r * r), 1.4) * Math.min(rx, rz) * 0.55;
      // Guard the full neighbour cell square, including diagonals and roads.
      for (let y = Math.floor(z) - 1; y <= Math.floor(z) + 1; y++) for (let xx = Math.floor(x) - 1; xx <= Math.floor(x) + 1; xx++) {
        if (xx >= 0 && y >= 0 && xx < layout.width && y < layout.height && walk[y * layout.width + xx]) height = 0;
      }
      positions.push(x, height + 0.008, z);
      uvs.push(x / layout.width, 1 - z / layout.height);
      if (ring && j) {
        const v = ring * (segments + 1) + j;
        indices.push(v, v - 1, v - segments - 2, v, v - segments - 2, v - segments - 1);
      }
    }
    const geometry = track(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const hill = new THREE.Mesh(geometry, material);
    hill.name = 'dawn-grass-rise'; hill.receiveShadow = hill.castShadow = true;
    group.add(hill);
  }
}
