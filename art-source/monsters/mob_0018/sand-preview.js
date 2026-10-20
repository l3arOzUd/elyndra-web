// Procedural preview, kept separate from character art and gameplay binding.
// Coordinates are approximate world-space seam positions for current draft art.
export class SandPreview {
 constructor(THREE,scene){
  this.THREE=THREE;this.particles=[];this.seed=18;this.accumulator=0;this.deathTime=0;
  this.capacity=160;
  this.positions=new Float32Array(this.capacity*3);
  this.geometry=new THREE.BufferGeometry();
  this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
  this.geometry.setDrawRange(0,0);
  this.material=new THREE.PointsMaterial({color:0xd6ac68,size:2,sizeAttenuation:false,transparent:true,opacity:.7,depthWrite:false,depthTest:false});
  this.points=new THREE.Points(this.geometry,this.material);this.points.frustumCulled=false;this.points.renderOrder=2;
  scene.add(this.points);
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
 reset(){this.particles=[];this.accumulator=0;this.deathTime=0;this.seed=18;this.geometry.setDrawRange(0,0)}
 update(dtMs,clip,dir,enabled=true){
  // Substeps retain bounded gravity and reproducible emission in test scrubs.
  let remaining=Math.max(0,Math.min(dtMs,5000))/1000;
  while(remaining>0){
   const dt=Math.min(remaining,1/60);remaining-=dt;
   if(clip==='death')this.deathTime+=dt;else this.deathTime=0;
   const rate=!enabled?0:clip==='death'?Math.max(0,1-this.deathTime/.45)*22:clip==='walk'?32:clip==='attack'||clip==='hit'?38:16;
   this.accumulator+=dt*rate;
   while(this.accumulator>=1){
    this.accumulator--;
    if(this.particles.length>=this.capacity)continue;
    const side=dir==='W'||dir==='E'||dir==='SW'||dir==='NW'||dir==='SE'||dir==='NE';
    const seams=side?[[-.06,.72],[.09,.50],[.04,.24]]:[[-.24,.70],[.24,.70],[-.12,.25],[.12,.25]];
    const seam=seams[Math.floor(this.random()*seams.length)],mirror=dir==='E'||dir==='SE'||dir==='NE'?-1:1;
    this.particles.push({x:seam[0]*mirror+(this.random()-.5)*.02,y:seam[1],vx:(this.random()-.5)*.045,vy:-.03,age:0,life:.7+this.random()*.3});
   }
   for(const p of this.particles){p.age+=dt;p.vy-=.8*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}
   this.particles=this.particles.filter(p=>p.age<p.life&&p.y>.015);
  }
  this.points.visible=enabled;
  this.particles.forEach((p,i)=>{this.positions[i*3]=p.x;this.positions[i*3+1]=p.y;this.positions[i*3+2]=.015});
  this.geometry.attributes.position.needsUpdate=true;this.geometry.setDrawRange(0,this.particles.length);
 }
 dispose(){this.points.removeFromParent();this.geometry.dispose();this.material.dispose()}
}
