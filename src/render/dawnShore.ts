import * as THREE from 'three';
import type { MapLayout } from '../data/schema';
import { envArt } from './envArt';

/** Sloping wet earth sits inside the authoritative water footprint. */
export function buildDawnShore(layout: MapLayout, group: THREE.Group,
  track: <T extends { dispose(): void }>(resource: T) => T) {
  const image = envArt.textures.get('path');
  const texture = image ? track(new THREE.Texture(image)) : null;
  if (texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.needsUpdate = true; }
  const material = track(new THREE.MeshLambertMaterial({ map: texture, vertexColors: true, transparent: true, depthWrite: false }));
  const stones = track(new THREE.MeshLambertMaterial({ color: 0xa4a18b, flatShading: true }));
  const stoneGeo = track(new THREE.IcosahedronGeometry(1, 1));
  const vertices = stoneGeo.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const r = 1 + Math.sin(x * 9 + z * 7) * Math.cos(y * 6) * 0.18;
    vertices.setXYZ(i, x * r, y * r, z * r);
  }
  stoneGeo.computeVertexNormals();
  for (const b of layout.blockers) {
    if (!['water', 'cliff'].includes(b.kind) || !('ellipse' in b.shape)) continue;
    const [cx, cz, rx, rz] = b.shape.ellipse, water = b.kind === 'water';
    if (water) {
      const pos: number[] = [], colors: number[] = [], uv: number[] = [], index: number[] = [];
      const n = 80;
      for (let ring = 0; ring < 4; ring++) for (let i = 0; i <= n; i++) {
        const a = i / n * Math.PI * 2, inward = 0.62 + Math.sin(a * 5 + cx) * 0.13 + Math.cos(a * 9) * 0.07;
        const t = ring / 3, inset = inward * (1 - t);
        const x = cx + Math.cos(a) * (rx - inset), z = cz + Math.sin(a) * (rz - inset);
        pos.push(x, 0.055 + Math.sin(t * Math.PI) * 0.05, z); uv.push(x * 0.3, z * 0.3);
        const color = new THREE.Color(0xc8c3a2).lerp(new THREE.Color(0xaabd79), t);
        colors.push(color.r, color.g, color.b, Math.sin(t * Math.PI) * 0.85);
        if (ring && i) { const v = ring * (n + 1) + i; index.push(v, v - 1, v - n - 2, v, v - n - 2, v - n - 1); }
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(index); geo.computeVertexNormals();
      const bank = new THREE.Mesh(geo, material); bank.name = 'dawn-pond-bank'; bank.receiveShadow = true; group.add(bank);
    }
    const count = water ? 9 : 12;
    const heap = new THREE.InstancedMesh(stoneGeo, stones, count);
    heap.name = water ? 'dawn-bank-stones' : 'dawn-rise-stones'; heap.castShadow = heap.receiveShadow = true;
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = Math.floor(i / 4) * 2.3 + (i % 4) * 0.13 + cx, s = 0.2 + (i % 4) * 0.065;
      const inset = 0.45 + (i % 3) * 0.14;
      d.position.set(cx + Math.cos(a) * (rx - inset), 0.09, cz + Math.sin(a) * (rz - inset));
      d.rotation.set(0.2, a, 0.15); d.scale.set(s * 1.5, s * 0.7, s); d.updateMatrix(); heap.setMatrixAt(i, d.matrix);
    }
    group.add(heap);
  }
}
