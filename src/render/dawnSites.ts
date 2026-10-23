import * as THREE from 'three';
import {siteWalls} from '../shared/dawnSites';
import {envArt} from './envArt';
export function buildDawnSites(group:THREE.Group,track:<T extends {dispose():void}>(r:T)=>T){
 const image=envArt.textures.get('dawn_limestone'), tex=image?track(new THREE.Texture(image)):null;
 if(tex){tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;}
 const stone=track(new THREE.MeshLambertMaterial({color:0xb8b399,map:tex})),wood=track(new THREE.MeshLambertMaterial({color:0x776044})),slate=track(new THREE.MeshLambertMaterial({color:0x647c7a}));
 const batches=new Map<THREE.Material,THREE.Matrix4[]>(); const d=new THREE.Object3D();
 const box=(x:number,y:number,z:number,w:number,h:number,l:number,m:THREE.Material,rx=0,ry=0,rz=0)=>{d.position.set(x,y,z);d.scale.set(w,h,l);d.rotation.set(rx,ry,rz);d.updateMatrix();if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(d.matrix.clone());};
 for(const p of siteWalls)for(let r=0;r<Math.floor(p.height/.3);r++)box(p.x+.5,r*.3+.15,p.z+.5,.87,.28,.78,stone,0,Math.sin(p.x+r)*.025);
 // Barn: exposed timber trusses over a low foundation; one roof slope fallen.
 for(const x of [85.5,89.5,94.5]){
  box(x,1.6,42.5,.23,3.2,.23,wood);if(x!==89.5)box(x,1.25,48.5,.23,2.5,.23,wood);
  box(x,3.2,45.5,.2,.2,6.2,wood,0,0,.025);
  box(x,3.8,44,.18,.18,3.5,wood,-.4);box(x,3.8,47,.18,.18,3.5,wood,.4);
 }
 box(90,4.4,45.5,9,.22,.22,wood);
 for(let i=0;i<13;i++)box(86+i*.62,1.25,42.08,.53,1.7,.09,wood,0,0,Math.sin(i)*.04);
 for(let i=0;i<7;i++)box(86.5+i*.9,.23,46+i%2,.8,.14,2.5,slate,.08,i*.19);
 for(let i=0;i<5;i++)box(87+i,3.75,43.8,.95,.13,3.2,slate,-.38);
 // Mill: smaller stone room, partial pitched roof and a broken vertical wheel.
 for(let i=0;i<6;i++)box(137+i*.75,2.95,110.1,.8,.12,3.7,slate,-.28);
 box(143.5,1.6,111.5,.7,.25,.25,wood);
 const rim=new THREE.Mesh(track(new THREE.TorusGeometry(1.55,.13,6,24,Math.PI*1.65)),wood);rim.rotation.y=Math.PI/2;rim.position.set(143.5,1.65,111.5);rim.castShadow=true;group.add(rim);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;box(143.5,1.65,111.5,.17,2.85,.14,wood,a);if(i<6)box(143.5,1.65+Math.cos(a)*1.4,111.5+Math.sin(a)*1.4,.6,.14,.55,wood,a);}
 // Old orchard well: circular open stone rim, broken winch and wall fragments.
 const well=new THREE.Mesh(track(new THREE.CylinderGeometry(.86,.96,1.05,12,1,true)),stone);well.position.set(107,.525,131);well.castShadow=well.receiveShadow=true;group.add(well);
 const dark=new THREE.Mesh(track(new THREE.CircleGeometry(.83,16)),track(new THREE.MeshLambertMaterial({color:0x23302e})));dark.rotation.x=-Math.PI/2;dark.position.set(107,.06,131);group.add(dark);
 box(106.2,1.1,131,.16,2.2,.16,wood);box(107.8,.85,131,.16,1.7,.16,wood);box(107,2.1,131,1.9,.16,.16,wood,0,0,-.13);
 for(let i=0;i<9;i++)box(103.8+i%3*.7,.06,128+Math.floor(i/3)*.7,.55,.1,.55,stone,0,i*.17);
 const geo=track(new THREE.BoxGeometry(1,1,1));for(const [mat,items]of batches){const mesh=new THREE.InstancedMesh(geo,mat,items.length);items.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;mesh.name='dawn-authored-sites';group.add(mesh);}
}
