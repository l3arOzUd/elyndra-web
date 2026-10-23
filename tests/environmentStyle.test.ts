import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {environmentStyle} from '../src/render/environmentStyle';
import {sceneLighting} from '../src/render/sceneLighting';
describe('shared regional lighting',()=>{
 it('updates the same lights across map transitions without adding lights each frame',()=>{
  const scene=new THREE.Scene(),renderer={shadowMap:{}} as THREE.WebGLRenderer;
  const update=sceneLighting(scene,renderer),count=scene.children.length;
  for(const id of ['lum_fld_01','sol_fld_01','cry_dun_01','noc_dun_01','lum_town_01']){
   update(new THREE.Vector3(44,0,55),id);const profile=environmentStyle(id);
   const sun=scene.children.find(c=>c instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
   const sky=scene.children.find(c=>c instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
   expect(sun.color.getHex()).toBe(profile.sun);expect(sky.intensity).toBe(profile.ambient);
   expect(scene.children.length).toBe(count);expect(sun.target.position.toArray()).toEqual([44,0,55]);
  }
 });
});
