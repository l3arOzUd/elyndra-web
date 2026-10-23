import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildDawnRelief } from '../src/render/dawnRelief';
import { encodeWalk, type MapLayout } from '../src/data/schema';

describe('Dawnmeadow solid-ground relief', () => {
  it.each([false, true])('keeps walking cells flat, including an authored crossing: %s', crossing => {
    const width = 24, walk = new Uint8Array(width * width).fill(1);
    for (let z = 0; z < width; z++) for (let x = 0; x < width; x++) {
      if (Math.hypot((x + 0.5 - 12) / 7, (z + 0.5 - 12) / 6) < 1 && !(crossing && x === 12)) walk[z * width + x] = 0;
    }
    const layout = { width, height: width, walk_rle: encodeWalk(walk),
      blockers: [{ kind: 'cliff', shape: { ellipse: [12, 12, 7, 6] } }] } as MapLayout;
    const group = new THREE.Group(), material = new THREE.MeshLambertMaterial();
    const resources: { dispose(): void }[] = [];
    buildDawnRelief(layout, group, material, value => { resources.push(value); return value; });
    const mesh = group.children[0] as THREE.Mesh<THREE.BufferGeometry>;
    const position = mesh.geometry.attributes.position, index = mesh.geometry.index!;
    let raised = 0;
    // Sample the interiors of the rendered triangles, not just their vertices.
    for (let i = 0; i < index.count; i += 3) {
      const corners = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(position, index.getX(i + k)));
      for (let u = 0; u <= 4; u++) for (let v = 0; v <= 4 - u; v++) {
        const p = corners[0].clone().multiplyScalar(u / 4).addScaledVector(corners[1], v / 4).addScaledVector(corners[2], 1 - (u + v) / 4);
        expect(Number.isFinite(p.y)).toBe(true);
        if (walk[Math.floor(p.z) * width + Math.floor(p.x)]) expect(p.y).toBeLessThan(0.009);
        if (p.y > 0.1) raised++;
      }
    }
    expect(raised).toBeGreaterThan(0);
    resources.forEach(r => r.dispose()); material.dispose();
  });
});
