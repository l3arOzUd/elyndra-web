// Pack imagegen artwork into the 512px paper-doll coordinates and add elbow/wrist bones.
import {readFile,writeFile,mkdir,cp,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=resolve(import.meta.dirname,'..'),kit=resolve(root,'public/sprites/wayfarer'),source=resolve(root,'art-source/wayfarer-v2');
try{await access(resolve(source,'previous-kit'));}catch{await cp(kit,resolve(source,'previous-kit'),{recursive:true});}
const rig=JSON.parse(await readFile(resolve(source,'previous-kit/rig.json'),'utf8'));
const equip=JSON.parse(await readFile(resolve(source,'previous-kit/equipment.json'),'utf8'));
rig.variants={hand_near:['open'],hand_far:['open']};rig.effects=['effects/arrow.png'];rig.attach.weapon='hand_near';
for(const item of Object.values(equip.items))if(item.visual==='leafweave_coat'){item.layers.push('forearm_near','forearm_far');item.hides=['torso','arm_near','arm_far'];}
equip.items.itm_0080.motion='melee';equip.items.itm_0081.motion='shoot';equip.items.itm_0082.motion='cast';
const jobs=[];
const add=(atlas,file,region,dest,flip=false)=>jobs.push({atlas,file,region,dest,flip});
for(const [vi,view]of ['front','side','back'].entries()){
 const v=rig.views[view];
 for(const side of ['near','far']){
  const [sx,sy]=v.parts['arm_'+side].pivot;
  const dx=view==='front'?(side==='near'?-6:6):view==='back'?(side==='near'?6:-6):(side==='near'?4:-4);
  v.parts['forearm_'+side]={pivot:[sx+dx/2,sy+48],parent:'arm_'+side};
  v.parts['hand_'+side]={pivot:[sx+dx,sy+86],parent:'forearm_'+side};
 }
 v.order=v.order.flatMap(n=>n==='arm_near'||n==='arm_far'?[n,n.replace('arm_','forearm_'),n.replace('arm_','hand_')]:[n]);
 const hx=v.parts.head.pivot[0];
 add('heads.png',`base/${view}/head.png`,[vi/3,0,(vi+1)/3,1],[hx-85,64,170,169]);
 const specs=[['arm_near','base'],['arm_far','base'],['forearm_near','base'],['forearm_far','base'],['hand_near','base'],['hand_far','base'],['arm_near','coat'],['arm_far','coat'],['forearm_near','coat'],['forearm_far','coat'],['hand_near','open'],['hand_far','open']];
 specs.forEach(([part,kind],i)=>{
  const [x,y]=v.parts[part].pivot;let dest;
  if(kind==='open')dest=[x-19,y-8,38,43];
  else if(part.startsWith('hand'))dest=[x-13,y-8,26,32];
  else if(part.startsWith('forearm'))dest=kind==='coat'?[x-18,y-12,36,36]:[x-14,y-10,28,57];
  else dest=kind==='coat'?[x-22,y-19,44,76]:[x-18,y-14,36,72];
  const file=kind==='coat'?`items/leafweave_coat/${view}/${part}.png`:`base/${view}/${part}${kind==='open'?'_open':''}.png`;
  // Source row boundaries follow the inspected atlas gutters, not assumed equal-height cells.
  const ys=[0,.355,.665,1],row=Math.floor(i/4),col=i%4;
  add(`arms-${view}.png`,file,[col/4,ys[row],(col+1)/4,ys[row+1]],dest);
 });
 const [wx,wy]=v.parts.hand_near.pivot;
 // Grip is 10px below wrist. Bow's grip at 28% width; tip axis at 83%.
 add('bow-arrow.png',`items/surveyor_bow/${view}/weapon.png`,[0,0,.44,1],[wx-(view==='back'?37.44:14.56),wy+10-105,52,210],view==='back');
}
add('bow-arrow.png','effects/arrow.png',[.44,0,1,1],[0,0,120,16]);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try{
 const page=await browser.newPage();
 for(const atlas of new Set(jobs.map(j=>j.atlas))){
  const data=(await readFile(resolve(source,atlas))).toString('base64');
  const result=await page.evaluate(async({data,jobs})=>{
   const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
   return jobs.map(j=>{const [a,b,z,d]=j.region;const x0=Math.floor(a*im.width),y0=Math.floor(b*im.height),x1=Math.floor(z*im.width),y1=Math.floor(d*im.height);const pixels=g.getImageData(x0,y0,x1-x0,y1-y0).data;let l=x1,t=y1,r=0,bot=0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[((y-y0)*(x1-x0)+x-x0)*4+3]>24){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);bot=Math.max(bot,y);}
    if(r<l)throw Error('Empty '+j.file);const crop=[l,t,r-l+1,bot-t+1],out=document.createElement('canvas');out.width=out.height=512;const og=out.getContext('2d');og.imageSmoothingQuality='high';const [x,y,w,h]=j.dest;
    if(j.flip){og.translate(x+w,y);og.scale(-1,1);og.drawImage(im,...crop,0,0,w,h);}else og.drawImage(im,...crop,x,y,w,h);
    return {...j,crop,png:out.toDataURL().split(',')[1]};
   });
  },{data,jobs:jobs.filter(j=>j.atlas===atlas)});
  for(const {png,...j}of result){const f=resolve(kit,j.file);await mkdir(dirname(f),{recursive:true});await writeFile(f,Buffer.from(png,'base64'));Object.assign(jobs.find(x=>x.file===j.file),{crop:j.crop});}
 }
 await writeFile(resolve(kit,'rig.json'),JSON.stringify(rig,null,2)+'\n');
 await writeFile(resolve(kit,'equipment.json'),JSON.stringify(equip,null,2)+'\n');
 await writeFile(resolve(source,'import-manifest.json'),JSON.stringify(jobs,null,2)+'\n');
 console.log(`Updated ${jobs.length} image files; added elbow/wrist bones and open-hand variants.`);
}finally{await browser.close();}
