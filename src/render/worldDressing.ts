import * as THREE from 'three';
import {decodeWalk,type MapLayout} from '../data/schema';
import {environmentStyle} from './environmentStyle';
/** Non-blocking ornament stays on existing structures and solid wall cells. */
export function buildWorldDressing(l:MapLayout,group:THREE.Group,track:<T extends {dispose():void}>(r:T)=>T){
 const style=environmentStyle(l.id),stone=track(new THREE.MeshLambertMaterial({color:style.stone}));
 const brass=track(new THREE.MeshLambertMaterial({color:0x9e8255}));
 const glowColor=l.id.startsWith('sol')||l.id.startsWith('emb')?0xffbf71:l.id.startsWith('noc')?0xb9a3fa:0x8bcfce;
 const glow=track(new THREE.MeshBasicMaterial({color:glowColor}));
 const add=(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number)=>{const a=new THREE.Mesh(track(g),m);a.position.set(x,y,z);a.castShadow=a.receiveShadow=true;group.add(a);return a;};
 // Fountain coping and water ripples retain the original occupied footprint.
 for(const p of l.props.filter(p=>p.kind==='fountain')){
  const x=p.x+.5,z=p.y+.5,s=p.scale??1;
  const rim=add(new THREE.TorusGeometry(1.4*s,.09*s,6,32),stone,x,.52*s,z);rim.rotation.x=Math.PI/2;
  for(const r of [.45,.85]){const ring=add(new THREE.TorusGeometry(r*s,.018,4,32),glow,x,.53*s,z);ring.rotation.x=Math.PI/2;ring.castShadow=false;}
 }
 if(!l.id.includes('_dun_'))return;
 const walk=decodeWalk(l.walk_rle,l.width*l.height),spots:[number,number][]=[];
 // Widely spaced lamps on the inside edge of existing solid rooms.
 for(let z=5;z<l.height-5&&spots.length<36;z+=5)for(let x=5;x<l.width-5&&spots.length<36;x++){
  if(walk[z*l.width+x]||!walk[(z+1)*l.width+x]||spots.some(([a,b])=>Math.hypot(a-x,b-z)<10))continue;
  spots.push([x,z]);if(spots.length>=36)break;
 }
 for(const [x,z]of spots){
  add(new THREE.CylinderGeometry(.18,.28,1.6,8),stone,x+.5,.8,z+.5);
  add(new THREE.CylinderGeometry(.3,.2,.16,8),brass,x+.5,1.65,z+.5);
  add(new THREE.OctahedronGeometry(.2),glow,x+.5,1.94,z+.5);
 }
 // A few real, non-shadowing local lights add depth without dozens of lights.
 spots.sort((a,b)=>Math.hypot(a[0]-l.width/2,a[1]-l.height/2)-Math.hypot(b[0]-l.width/2,b[1]-l.height/2));
 for(const [x,z]of spots.slice(0,3)){const light=new THREE.PointLight(glowColor,12,9,2);light.position.set(x+.5,2.2,z+1.3);group.add(light);}
}
