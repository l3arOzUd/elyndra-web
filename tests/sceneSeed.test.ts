import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { IsoCamera } from '../src/render/camera';
import { sceneSeed } from '../src/shared/sceneSeed';
import type { MapLayout } from '../src/data/schema';

afterEach(()=>vi.unstubAllGlobals());
it('clamps extreme zoom below fog range and ignores invalid values',()=>{
  vi.stubGlobal('location',{search:''});
  const cam=new IsoCamera(1),target=new Vector3();
  cam.zoom(1000);cam.zoom(NaN);cam.update(10,target);
  expect(cam.camera.position.distanceTo(new Vector3(0,.6,0))).toBeCloseTo(90);
  cam.zoom(-1000);cam.update(10,target);
  expect(cam.camera.position.distanceTo(new Vector3(0,.6,0))).toBeCloseTo(36);
});
it('reproduces a seed, restores the original and preserves all collision and authored solid props',()=>{
  const base:MapLayout=JSON.parse(readFileSync('public/data/maps/lum_fld_02.json','utf8'));
  const before=JSON.stringify(base),a=sceneSeed(base,123);
  expect(a).toEqual(sceneSeed(base,123));
  expect(a.props).not.toEqual(sceneSeed(base,456).props);
  expect(a.walk_rle).toBe(base.walk_rle);
  expect(a.roads).toBe(base.roads);
  expect(a.props.filter(p=>p.block)).toEqual(base.props.filter(p=>p.block));
  expect(sceneSeed(base,0)).toBe(base);
  expect(JSON.stringify(base)).toBe(before);
});
