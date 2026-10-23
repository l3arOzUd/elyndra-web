import { describe, expect, it } from 'vitest';
import type { MapDesign } from '../content/types';
import { bakeLayout } from '../content/layout';
import { decodeWalk } from '../src/data/schema';
import { farmApproach, farmWalls } from '../src/shared/dawnFarm';

describe('authored Dawnmeadow farm', () => {
  it('blocks the visible walls while retaining a connected doorway and side exit', () => {
    const design = { id: 'lum_fld_01', size: [192, 192], blockers: [], roads: [{ points: farmApproach, width: 2.4, kind: 'dirt' }],
      props: farmWalls.map(w => ({ kind: 'ruin_block', x: w.x, y: w.z, block: 1 })), scatter: [], safe_areas: [], pockets: [] } as unknown as MapDesign;
    const layout = bakeLayout(design), walk = decodeWalk(layout.walk_rle, layout.width * layout.height);
    for (const { x, z } of farmWalls) expect(walk[z * layout.width + x], `wall ${x},${z}`).toBe(0);
    for (const [x, z] of [[72, 59], [73, 59], [72, 60], [72, 56], [77, 59], [78, 59]])
      expect(walk[z * layout.width + x], `opening ${x},${z}`).toBe(1);
    const queue = [[72, 64]], seen = new Set(['72,64']);
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, key = `${nx},${nz}`;
        if (nx < 65 || nx > 81 || nz < 49 || nz > 68 || seen.has(key) || !walk[nz * layout.width + nx]) continue;
        seen.add(key); queue.push([nx, nz]);
      }
    }
    expect(seen.has('72,56')).toBe(true);
    expect(seen.has('78,59')).toBe(true);
  });
});
