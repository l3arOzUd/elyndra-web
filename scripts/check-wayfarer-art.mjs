import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const out=resolve(import.meta.dirname,'../../output/wayfarer-review');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1720,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/character-viewer.html');await page.waitForFunction(()=>window.__wayfarer?.ready);
 await page.locator('#pivots').uncheck();
 await page.screenshot({path:resolve(out,'base.png'),fullPage:true});
 await page.locator('[data-outfit="itm_0080"]').click();
 assert.deepEqual(await page.locator('#slots select').evaluateAll(nodes=>nodes.map(n=>n.value)),['itm_0078','itm_0079','itm_0080']);
 await page.screenshot({path:resolve(out,'equipped.png'),fullPage:true});
 for(const weapon of ['itm_0081','itm_0082']){
  await page.locator(`[data-outfit="${weapon}"]`).click();
  assert.equal(await page.locator('select[aria-label="weapon"]').inputValue(),weapon);
 }
 await page.locator('[data-outfit="base"]').click();
 assert.deepEqual(await page.locator('#slots select').evaluateAll(nodes=>nodes.map(n=>n.value)),['','','']);
 const result=await page.evaluate(async()=>{
  const {bakeWayfarer}=await import('/src/render/paperDoll.ts');
  const {kit}=window.__wayfarer,records=[],pictures=[];
  const hash=(pixels)=>{let h=2166136261;for(const n of pixels)h=Math.imul(h^n,16777619);return (h>>>0).toString(16);};
  const looks=[[],['itm_0078'],['itm_0079'],['itm_0080'],['itm_0081'],['itm_0082'],['itm_0078','itm_0079','itm_0080'],['itm_0078','itm_0079','itm_0081'],['itm_0078','itm_0079','itm_0082']];
  for(const gear of looks){
   const sprite=bakeWayfarer(kit,gear),F=sprite.json.frame.w;
   for(const [anim,sheet]of Object.entries(sprite.sheets)){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=F;const g=canvas.getContext('2d',{willReadFrequently:true});
    let edgeFrames=0,emptyFrames=0;
    for(let row=0;row<5;row++)for(let f=0;f<sheet.def.frames;f++){
     g.clearRect(0,0,F,F);g.drawImage(sheet.image,f*F,row*F,F,F,0,0,F,F);
     const d=g.getImageData(0,0,F,F).data;let n=0,edge=0;
     for(let y=0;y<F;y++)for(let x=0;x<F;x++)if(d[(y*F+x)*4+3]>32){n++;if(x===0||y===0||x===F-1||y===F-1)edge++;}
     if(!n)emptyFrames++;if(edge>2)edgeFrames++;
    }
    records.push({gear,anim,edgeFrames,emptyFrames,hash:hash(g.getImageData(0,0,F,F).data)});
   }
   if(gear.length===0||gear.length===3){
    const c=document.createElement('canvas');c.width=12*192;c.height=7*192;const g=c.getContext('2d');
    g.fillStyle='#262d36';g.fillRect(0,0,c.width,c.height);
    for(const [j,name]of ['idle','walk','attack','shoot','cast','hit','death'].entries()){
     const sh=sprite.sheets[name];for(let f=0;f<sh.def.frames;f++)g.drawImage(sh.image,f*F,2*F,F,F,f*192,j*192,192,192);
     g.fillStyle='#e3c27a';g.font='14px sans-serif';g.fillText(name,8,j*192+18);
    }
    pictures.push({name:gear.length?gear.at(-1):'base',data:c.toDataURL().split(',')[1]});
   }
  }
  return {parts:kit.img.size,records,pictures};
 });
 for(const p of result.pictures)await writeFile(resolve(out,`motion-${p.name}.png`),Buffer.from(p.data,'base64'));
 const report={parts:result.parts,records:result.records,errors};await writeFile(resolve(out,'validation.json'),JSON.stringify(report,null,2)+'\n');
 assert.equal(result.parts,76);assert.equal(errors.length,0);assert.ok(result.records.every(r=>!r.emptyFrames));
 assert.ok(result.records.every(r=>!r.edgeFrames),'No outfit may be cropped at a frame edge');
 assert.equal(new Set(result.records.filter(r=>r.anim==='idle').map(r=>r.hash)).size,9,'Each outfit must visibly differ');
 console.log(JSON.stringify({parts:result.parts,outfits:9,animations:7,errors,clipped:result.records.filter(r=>r.edgeFrames)},null,2));
}finally{await browser.close();}
