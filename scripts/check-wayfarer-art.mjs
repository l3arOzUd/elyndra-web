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
 assert.deepEqual(await page.locator('#slots select').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean)),['itm_0078','itm_0079','itm_0080']);
 await page.screenshot({path:resolve(out,'equipped.png'),fullPage:true});
 for(const weapon of ['itm_0081','itm_0082']){
  await page.locator(`[data-outfit="${weapon}"]`).click();
  assert.equal(await page.locator('select[aria-label="weapon"]').inputValue(),weapon);
 }
 await page.locator('[data-outfit="base"]').click();
 assert.ok(await page.locator('#slots select').evaluateAll(nodes=>nodes.every(n=>!n.value)));
 for(const [button,weapon,anim] of [['try-melee','itm_0080','attack'],['try-shoot','itm_0081','shoot'],['try-cast','itm_0082','cast']]){
  await page.locator('#'+button).click();
  assert.equal(await page.locator('#anim').inputValue(),anim);
  assert.equal(await page.locator('select[aria-label="weapon"]').inputValue(),weapon);
  await page.locator('#frame').fill('4');await page.locator('#frame').dispatchEvent('input');
  assert.ok(await page.locator('#paused').isChecked());
 }
 await page.locator('#reload').click();
 await page.waitForFunction(()=>document.querySelector('#missing').className==='ok');
 const result=await page.evaluate(async()=>{
  const {bakeWayfarer}=await import('/src/render/paperDoll.ts');
  const {kit}=window.__wayfarer,records=[],pictures=[];
  const hash=(pixels)=>{let h=2166136261;for(const n of pixels)h=Math.imul(h^n,16777619);return (h>>>0).toString(16);};
  const looks=[[],['itm_0078'],['itm_0079'],['itm_0080'],['itm_0081'],['itm_0082'],['itm_0078','itm_0079','itm_0080'],['itm_0078','itm_0079','itm_0081'],['itm_0078','itm_0079','itm_0082']];
  for(const gear of looks){
   const sprite=bakeWayfarer(kit,gear),F=sprite.json.frame.w;
   for(const [anim,sheet]of Object.entries(sprite.sheets)){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=F;const g=canvas.getContext('2d',{willReadFrequently:true});
    let edgeFrames=0,emptyFrames=0;const edges=[];
    for(let row=0;row<5;row++)for(let f=0;f<sheet.def.frames;f++){
     g.clearRect(0,0,F,F);g.drawImage(sheet.image,f*F,row*F,F,F,0,0,F,F);
     const d=g.getImageData(0,0,F,F).data;let n=0,edge=0;
     for(let y=0;y<F;y++)for(let x=0;x<F;x++)if(d[(y*F+x)*4+3]>32){n++;if(x===0||y===0||x===F-1||y===F-1)edge++;}
     if(!n)emptyFrames++;if(edge>2){edgeFrames++;edges.push({row,f,edge});}
    }
    records.push({gear,anim,edgeFrames,emptyFrames,edges,hash:hash(g.getImageData(0,0,F,F).data)});
   }
   if(gear.length===0||gear.length===3){
    const c=document.createElement('canvas');c.width=12*192;c.height=7*192;const g=c.getContext('2d');
    g.fillStyle='#262d36';g.fillRect(0,0,c.width,c.height);
    for(const [j,name]of ['idle','walk','attack','shoot','cast','hit','death'].entries()){
     const sh=sprite.sheets[name];for(let f=0;f<sh.def.frames;f++)g.drawImage(sh.image,f*F,2*F,F,F,f*192,j*192,192,192);
     g.fillStyle='#e3c27a';g.font='14px sans-serif';g.fillText(name,8,j*192+18);
    }
    pictures.push({name:gear.length?gear.at(-1):'base',data:c.toDataURL().split(',')[1]});
    if(gear.length===3){
     // Front, left, mirrored right and back, at native game-frame resolution.
     const names=['idle','walk','attack','cast','death'], review=document.createElement('canvas');
     review.width=5*256;review.height=4*256;const ctx=review.getContext('2d');
     ctx.fillStyle='#262d36';ctx.fillRect(0,0,review.width,review.height);
     for(const [i,row]of [0,2,2,4].entries())for(const [j,name]of names.entries()){
      const sh=sprite.sheets[name],frame=name==='death'?7:name==='attack'?sh.def.events.hit:name==='cast'?8:2;
      ctx.save();ctx.translate(j*256,i*256);if(i===2){ctx.translate(256,0);ctx.scale(-1,1);}
      ctx.drawImage(sh.image,frame*F,row*F,F,F,0,0,256,256);ctx.restore();
      ctx.fillStyle='#e3c27a';ctx.font='14px sans-serif';ctx.fillText(`${['front','left','right','back'][i]} / ${name}`,j*256+8,i*256+18);
     }
     pictures.push({name:`views-${gear.at(-1)}`,data:review.toDataURL().split(',')[1]});
    }
   }
  }
  const expected=new Set(kit.rig.effects??[]);
  for(const [view,v] of Object.entries(kit.rig.views)) {
   for(const part of Object.keys(v.parts))expected.add(`base/${view}/${part}.png`);
   for(const [part,variants] of Object.entries(kit.rig.variants??{}))for(const variant of variants)expected.add(`base/${view}/${part}_${variant}.png`);
   for(const item of Object.values(kit.items))for(const layer of item.layers)expected.add(`items/${item.visual}/${view}/${layer}.png`);
  }
  return {parts:kit.img.size,missing:[...expected].filter(file=>!kit.img.has(file)),records,pictures};
 });
 for(const p of result.pictures)await writeFile(resolve(out,`motion-${p.name}.png`),Buffer.from(p.data,'base64'));
 const report={parts:result.parts,missing:result.missing,records:result.records,errors};await writeFile(resolve(out,'validation.json'),JSON.stringify(report,null,2)+'\n');
 assert.deepEqual(result.missing,[],'Every declared rig and equipment image must load');assert.equal(errors.length,0);assert.ok(result.records.every(r=>!r.emptyFrames));
 assert.ok(result.records.every(r=>!r.edgeFrames),'No outfit may be cropped at a frame edge');
 assert.equal(new Set(result.records.filter(r=>r.anim==='idle').map(r=>r.hash)).size,9,'Each outfit must visibly differ');
 console.log(JSON.stringify({parts:result.parts,outfits:9,animations:7,errors,clipped:result.records.filter(r=>r.edgeFrames)},null,2));
}finally{await browser.close();}
