import { expect, it } from 'vitest';
import { bakeLayout } from '../content/layout';
import type { MapDesign } from '../content/types';
import { decodeWalk } from '../src/data/schema';

it('opens interior groves under canopies, blocks each trunk, and preserves water and borders', () => {
  const design: MapDesign = {
    id:'lum_fld_02',name:'Test grove',type:'field',role:'test',levels:[11,20],size:[40,40],arrival:[5,5],
    ground:'grass',theme:'orchard',border:{width:2,kind:'forest'},roads:[],scatter:[],landmarks:[],safe_areas:[],pockets:[],npcs:[],
    blockers:[{kind:'forest',shape:{rect:[10,10,15,15]}},{kind:'water',shape:{rect:[27,10,5,5]}}],
    props:[{kind:'tree',x:16,y:16,scale:2,block:3}],
  };
  const layout=bakeLayout(design),walk=decodeWalk(layout.walk_rle,1600);
  const trees=layout.props.filter(p=>p.kind==='tree');
  for(const p of trees) expect(walk[Math.round(p.y)*40+Math.round(p.x)]).toBe(0);
  expect(layout.props[0].block).toBe(1);
  let opened=0;
  for(let y=10;y<25;y++)for(let x=10;x<25;x++)if(walk[y*40+x])opened++;
  expect(opened).toBeGreaterThan(190);
  expect(walk[12*40+29]).toBe(0);
  expect(walk[0]).toBe(0);
  expect(design.props[0].block).toBe(3);
});
