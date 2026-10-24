// Pack the original painted lower robe into the rig; preserve the upper belt.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'D:/Working/tosm-monthly-reward/node_modules/playwright-core');
const base='public/sprites/wayfarer/items/doll_armor_robe';
const source='art-source/doll-v3/armor_robe-skirt.png';
const data=async p=>'data:image/png;base64,'+(await fs.readFile(p)).toString('base64');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || 'C:/Users/l3arOzUd/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'});
try {
 const page=await browser.newPage(),sheet=await data(source);
 for(const [i,view] of ['front','side','back'].entries()) {
  const result=await page.evaluate(async({sheet,torso,i,view})=>{
   const load=src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.src=src;});
   const [im,body]=await Promise.all([load(sheet),load(torso)]);
   const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
   const g=c.getContext('2d');g.drawImage(im,0,0);const pixels=g.getImageData(0,0,c.width,c.height).data;
   let x0=c.width,y0=c.height,x1=0,y1=0;
   for(let y=0;y<c.height;y++)for(let x=Math.floor(i*c.width/3);x<Math.floor((i+1)*c.width/3);x++)if(pixels[(y*c.width+x)*4+3]>24){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
   const out=document.createElement('canvas');out.width=out.height=512;
   const ctx=out.getContext('2d'),width=view==='side'?142:218;
   ctx.drawImage(im,x0,y0,x1-x0,y1-y0,256-width/2,285,width,170);
   const skirt=out.toDataURL().split(',')[1];
   ctx.clearRect(0,0,512,512);ctx.drawImage(body,0,0);
   // The existing torso includes a short hem. It must not cover the new
   // waist-to-ankle panels; retain the collar, bodice and belt above it.
   ctx.clearRect(0,300,512,212);
   return {skirt,torso:out.toDataURL().split(',')[1]};
  },{sheet,torso:await data(`${base}/${view}/torso.png`),i,view});
  for(const [layer,png] of Object.entries(result))await fs.writeFile(`${base}/${view}/${layer}.png`,Buffer.from(png,'base64'));
 }
 const path='art-source/doll-v3/imported.json',imported=JSON.parse(await fs.readFile(path,'utf8'));
 imported.doll_armor_robe=[...new Set([...imported.doll_armor_robe,'skirt'])].sort();
 await fs.writeFile(path,JSON.stringify(imported,null,1)+'\n');
} finally {await browser.close();}
