import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('D:/Working/tosm-monthly-reward/node_modules/playwright-core');
const root='art-source/doll-v3',kit='public/sprites/wayfarer';
const manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/l3arOzUd/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'});
const page=await browser.newPage(),imported={};
const data=async p=>'data:image/png;base64,'+(await fs.readFile(p)).toString('base64');
try {for(const s of manifest.sets){
 const sheet=await data(root+'/'+s.set+'.png');let present=new Set();
 for(let r=0;r<manifest.views.length;r++)for(let c=0;c<s.layers.length;c++){
  const view=manifest.views[r],layer=s.layers[c];
  let ref=s.slot==='armor'?`items/leafweave_coat/${view}/${layer}.png`:s.slot==='boots'?`items/traveler_boots/${view}/${layer}.png`:s.slot==='gloves'?`base/${view}/${layer}.png`:s.slot==='head'?`items/iron_helm/${view}/head.png`:`items/${({vanguard:'copper_saber',strider:'surveyor_bow',arcanist:'aether_rod'})[s.job]||'copper_saber'}/${view}/weapon.png`;
  const png=await page.evaluate(async({sheet,ref,r,c,rows,cols,layer,slot})=>{
   const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
   const [img,base]=await Promise.all([load(sheet),load(ref)]);
   const canvas=(w,h)=>{const e=document.createElement('canvas');e.width=w;e.height=h;return e};
   const bounds=e=>{const a=e.getContext('2d').getImageData(0,0,e.width,e.height).data;let x0=e.width,y0=e.height,x1=0,y1=0,n=0;for(let y=0;y<e.height;y++)for(let x=0;x<e.width;x++)if(a[(y*e.width+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);n++;}return n>40?[x0,y0,x1,y1]:null};
   const x=Math.floor(img.width*c/cols),y=Math.floor(img.height*r/rows),w=Math.floor(img.width*(c+1)/cols)-x,h=Math.floor(img.height*(r+1)/rows)-y;
   const cell=canvas(w,h);cell.getContext('2d').drawImage(img,x,y,w,h,0,0,w,h);const box=bounds(cell);if(!box)return null;
   const target=canvas(base.width,base.height);target.getContext('2d').drawImage(base,0,0);const b=bounds(target);if(!b)throw Error('Empty reference');
   const grow=['boots','gloves'].includes(slot)?2:0;const bw=b[2]-b[0]+grow*2,bh=b[3]-b[1]+grow*2,sw=box[2]-box[0],sh=box[3]-box[1],k=Math.min(bw/sw,bh/sh),dw=Math.round(sw*k),dh=Math.round(sh*k);
   const out=canvas(512,512);out.getContext('2d').drawImage(cell,box[0],box[1],sw,sh,Math.round(b[0]-grow+(bw-dw)/2),Math.round(b[1]-grow+(/^(arm_|forearm_|hand_|shin_)/.test(layer)?0:(bh-dh)/2)),dw,dh);return out.toDataURL('image/png').split(',')[1];
  },{sheet,ref:await data(kit+'/'+ref),r,c,rows:manifest.views.length,cols:s.layers.length,layer,slot:s.slot});
  if(!png)continue;
  const dir=`${kit}/items/${s.visual}/${view}`;await fs.mkdir(dir,{recursive:true});await fs.writeFile(dir+'/'+layer+'.png',Buffer.from(png,'base64'));present.add(layer);
 }
 imported[s.visual]=[...present].sort();console.log(s.set,present.size);
}await fs.writeFile(root+'/imported.json',JSON.stringify(imported,null,1)+'\n');}finally{await browser.close()}
