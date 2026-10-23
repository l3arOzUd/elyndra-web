import * as THREE from 'three';
import type { MapLayout } from '../data/schema';

/** Sloping wet earth sits inside the authoritative water footprint. */
export function buildDawnShore(layout: MapLayout, group: THREE.Group,
  track: <T extends { dispose(): void }>(resource: T) => T) {
  const material = track(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const stones = track(new THREE.MeshLambertMaterial({ color: 0x95967b }));
  const stoneGeo = track(new THREE.IcosahedronGeometry(1, 1));
  for (const b of layout.blockers) {
    if (!['water', 'cliff'].includes(b.kind) || !('ellipse' in b.shape)) continue;
    const [cx, cz, rx, rz] = b.shape.ellipse, water = b.kind === 'water';
    if (water) {
      const pos: number[] = [], colors: number[] = [], index: number[] = [];
      const n = 80;
      for (let ring = 0; ring < 4; ring++) for (let i = 0; i <= n; i++) {
        const a = i / n * Math.PI * 2, inward = 0.62 + Math.sin(a * 5 + cx) * 0.13 + Math.cos(a * 9) * 0.07;
        const t = ring / 3, inset = inward * (1 - t);
        pos.push(cx + Math.cos(a) * (rx - inset), 0.055 + Math.sin(t * Math.PI) * 0.12, cz + Math.sin(a) * (rz - inset));
        const color = new THREE.Color(0x8d8c66).lerp(new THREE.Color(0x667d3b), t);
        colors.push(color.r, color.g, color.b);
        if (ring && i) { const v = ring * (n + 1) + i; index.push(v, v - 1, v - n - 2, v, v - n - 2, v - n - 1); }
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.setIndex(index); geo.computeVertexNormals();
      const bank = new THREE.Mesh(geo, material); bank.name = 'dawn-pond-bank'; bank.receiveShadow = true; group.add(bank);
    }
    const count = water ? 9 : 19;
    const heap = new THREE.InstancedMesh(stoneGeo, stones, count);
    heap.name = water ? 'dawn-bank-stones' : 'dawn-rise-stones'; heap.castShadow = heap.receiveShadow = true;
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996 + cx, s = 0.26 + (i % 4) * 0.075;
      d.position.set(cx + Math.cos(a) * (rx - 0.55), 0.16, cz + Math.sin(a) * (rz - 0.55));
      d.rotation.set(0.2, a, 0.15); d.scale.set(s * 1.3, s * 0.8, s); d.updateMatrix(); heap.setMatrixAt(i, d.matrix);
    }
    group.add(heap);
  }
}
