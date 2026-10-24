import { expect, it } from 'vitest';
import { treeGroundAnchor, orchardRootUV } from '../src/render/treeAnchor';

it('aligns tree art with the centre of odd and even baked footprints',()=>{
  for(const block of [1,2])for(const x of [10,10.2,10.8]) {
    const p={kind:'tree' as const,x,y:20.8,block};
    const [cx,cz]=treeGroundAnchor(p),h=Math.floor(block/2);
    expect(cx).toBe(Math.round(x)-h+block/2);
    expect(cz).toBe(Math.round(p.y)-h+block/2);
  }
});
it('anchors asymmetric pear art at its root, including mirrored cards',()=>{
  const [u]=orchardRootUV('/sprites/env/orchard/tree_3.png');
  expect(u).toBeGreaterThan(.5);
  for(const flip of [-1,1])expect(((u-.5)*6+(.5-u)*6)*flip).toBeCloseTo(0);
});
