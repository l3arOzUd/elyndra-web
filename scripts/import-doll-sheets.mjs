import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('D:/Working/tosm-monthly-reward/node_modules/playwright-core');
const root='art-source/doll-v3',kit='public/sprites/wayfarer';
const rig=JSON.parse(await fs.readFile(kit+'/rig.json','utf8'));
const manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/l3arOzUd/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'});
const only=new Set(process.argv.slice(2));
const page=await browser.newPage(),imported=only.size?JSON.parse(await fs.readFile(root+'/imported.json','utf8')):{};
const data=async p=>'data:image/png;base64,'+(await fs.readFile(p)).toString('base64');
try {for(const s of manifest.sets.filter(s=>!only.size||only.has(s.set))){
 const sheet=await data(root+'/'+s.set+(s.set==='head_hood'?'-v2':'')+'.png');let present=new Set();
 for(let r=0;r<manifest.views.length;r++)for(let c=0;c<s.layers.length;c++){
  const view=manifest.views[r],layer=s.layers[c];
  let ref=s.slot==='armor'?`items/leafweave_coat/${view}/${layer}.png`:s.slot==='boots'?`items/traveler_boots/${view}/${layer}.png`:s.slot==='gloves'?`base/${view}/${layer}.png`:s.slot==='head'?`items/iron_helm/${view}/head.png`:`items/${({vanguard:'copper_saber',strider:'surveyor_bow',arcanist:'aether_rod'})[s.job]||'copper_saber'}/${view}/weapon.png`;
  const png=await page.evaluate(async({sheet,ref,r,c,rows,cols,layer,slot,set,view,pivot})=>{
   const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
   const [img,base]=await Promise.all([load(sheet),load(ref)]);
   const canvas=(w,h)=>{const e=document.createElement('canvas');e.width=w;e.height=h;return e};
   const bounds=e=>{const a=e.getContext('2d').getImageData(0,0,e.width,e.height).data;let x0=e.width,y0=e.height,x1=0,y1=0,n=0;for(let y=0;y<e.height;y++)for(let x=0;x<e.width;x++)if(a[(y*e.width+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);n++;}return n>40?[x0,y0,x1,y1]:null};
   // Generated sheets do not have equal-width columns. Locate complete
   // opaque islands before assigning them by row and left-to-right order.
   window.componentCache ??= new Map();
   let components=window.componentCache.get(sheet);
   if(!components){
    const all=canvas(img.width,img.height);all.getContext('2d').drawImage(img,0,0);
    const pixels=all.getContext('2d').getImageData(0,0,img.width,img.height).data;
    const seen=new Uint8Array(img.width*img.height);components=[];
    for(let i=0;i<seen.length;i++)if(!seen[i]&&pixels[i*4+3]>24){
     const stack=[i];seen[i]=1;let x0=img.width,y0=img.height,x1=0,y1=0,n=0;
     while(stack.length){const j=stack.pop(),xx=j%img.width,yy=Math.floor(j/img.width);n++;x0=Math.min(x0,xx);x1=Math.max(x1,xx+1);y0=Math.min(y0,yy);y1=Math.max(y1,yy+1);
      for(const k of [xx>0?j-1:-1,xx<img.width-1?j+1:-1,j-img.width,j+img.width])if(k>=0&&k<seen.length&&!seen[k]&&pixels[k*4+3]>24){seen[k]=1;stack.push(k);}
     }
     if(n>100)components.push({x0,y0,x1,y1,n});
    }
    window.componentCache.set(sheet,components);
   }
   const row=components.filter(b=>Math.min(rows-1,Math.floor((b.y0+b.y1)/2/img.height*rows))===r).sort((a,b)=>b.n-a.n).slice(0,cols).sort((a,b)=>a.x0-b.x0);
   if(row.length!==cols)throw Error(set+' row '+r+' expected '+cols+' pieces, got '+row.length);
   const part=row[c],x=part.x0,y=part.y0,w=part.x1-x,h=part.y1-y;
   const cell=canvas(w,h);cell.getContext('2d').drawImage(img,x,y,w,h,0,0,w,h);const box=bounds(cell);if(!box)return null;
   const target=canvas(base.width,base.height);target.getContext('2d').drawImage(base,0,0);const b=bounds(target);if(!b)throw Error('Empty reference');
   if(slot==='weapon' && /gauntlet/.test(set)) {
    const out=canvas(512,512),g=out.getContext('2d'),sw=box[2]-box[0],sh=box[3]-box[1],height=58,width=height*sw/sh;
    g.translate(pivot[0],pivot[1]-18);
    if(/gearheart/.test(set)){g.translate(0,height);g.rotate(Math.PI);}
    g.drawImage(cell,box[0],box[1],sw,sh,-width/2,0,width,height);
    return out.toDataURL('image/png').split(',')[1];
   }
   if(slot==='head'){
    const small=/circlet|warcrown|crown/.test(set),mask=/mask/.test(set);
    const boxTarget=mask?[194,140,320,209]:small?[177,65,337,139]:[169,54,343,224];
    const [tx,ty,ex,ey]=boxTarget;
    const out=canvas(512,512);out.getContext('2d').drawImage(cell,box[0],box[1],box[2]-box[0],box[3]-box[1],tx,ty,ex-tx,ey-ty);return out.toDataURL('image/png').split(',')[1];
   }
   if(slot==='weapon' && /saber|executioner/.test(set)){
    const out=canvas(512,512),g=out.getContext('2d'),sw=box[2]-box[0],sh=box[3]-box[1],height=180,width=height*sw/sh;
    const a=cell.getContext('2d').getImageData(0,0,w,h).data;let total=0,n=0;
    for(let yy=Math.floor(box[1]+sh*.8);yy<box[1]+sh*.92;yy++)for(let xx=box[0];xx<box[2];xx++)if(a[(yy*w+xx)*4+3]>64){total+=xx;n++;}
    const grip=((total/n||box[0]+sw/2)-box[0])/sw;
    g.translate(pivot[0],pivot[1]+12);g.rotate((view==='back'?35:-35)*Math.PI/180);g.drawImage(cell,box[0],box[1],sw,sh,-width*grip,-height*.86,width,height);return out.toDataURL('image/png').split(',')[1];
   }
   const grow=['boots','gloves'].includes(slot)?2:0;const bw=b[2]-b[0]+grow*2,bh=b[3]-b[1]+grow*2,sw=box[2]-box[0],sh=box[3]-box[1],k=/^(arm_|forearm_|hand_|shin_)/.test(layer)?bh/sh:Math.min(bw/sw,bh/sh),dw=Math.round(sw*k),dh=Math.round(sh*k);
   const out=canvas(512,512);out.getContext('2d').drawImage(cell,box[0],box[1],sw,sh,Math.round(b[0]-grow+(bw-dw)/2),Math.round(b[1]-grow+(/^(arm_|forearm_|hand_|shin_)/.test(layer)?0:(bh-dh)/2)),dw,dh);return out.toDataURL('image/png').split(',')[1];
  },{sheet,ref:await data(kit+'/'+ref),r,c,rows:manifest.views.length,cols:s.layers.length,layer,slot:s.slot,set:s.set,view,pivot:rig.views[view].parts.hand_near.pivot});
  if(!png)continue;
  const dir=`${kit}/items/${s.visual}/${view}`;await fs.mkdir(dir,{recursive:true});await fs.writeFile(dir+'/'+layer+'.png',Buffer.from(png,'base64'));present.add(layer);
 }
 imported[s.visual]=[...present].sort();console.log(s.set,present.size);
}await fs.writeFile(root+'/imported.json',JSON.stringify(imported,null,1)+'\n');}finally{await browser.close()}
if(!only.size||only.has('armor_robe'))await import('./import-robe-skirt.mjs');
