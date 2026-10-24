import type { Prop } from '../data/schema';

/** Centre of the exact cells baked by blockFootprint (including even widths). */
export function treeGroundAnchor(p: Prop): [number, number] {
  const offset = p.block % 2 ? 0.5 : 0;
  return [Math.round(p.x) + offset, Math.round(p.y) + offset];
}

/** Painted root contact point, measured in normalized image coordinates. */
export function orchardRootUV(src: string): [number, number] {
  if (src.endsWith('/orchard/tree_3.png')) return [0.585, 0.94];
  if (src.endsWith('/orchard/tree_2.png')) return [0.53, 0.95];
  return [0.53, 0.95];
}
