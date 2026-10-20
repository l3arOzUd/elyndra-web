import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const out=resolve(import.meta.dirname,'../art-source/monsters/mob_0005/runtime-draft');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:5173/art-source/monsters/mob_0005/walk-review.html');
 await page.waitForFunction(()=>window.__cragletWalk?.ready);
 const result=await page.evaluate(async()=>{
  const assets=window.__cragletWalk.exportDraft();
  const {validateSprite}=await import('/src/render/spriteDef.ts');
  const problems=validateSprite(assets.json,assets.sizes),frames=[];
  for(const [name,url]of Object.entries(assets.images)){
   const image=new Image();image.src=url;await image.decode();
   const c=document.createElement('canvas');c.width=c.height=384;
   const g=c.getContext('2d',{willReadFrequently:true});
   for(let f=0;f<assets.json.animations[name].frames;f++){
    g.clearRect(0,0,384,384);g.drawImage(image,f*384,0,384,384,0,0,384,384);
    const d=g.getImageData(0,0,384,384).data;let visible=0,edge=0;
    for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(d[(y*384+x)*4+3]>32){
     visible++;if(x===0||x===383||y===0||y===383)edge++;
    }
    frames.push({clip:name,frame:f,visible,edge});
   }
  }
  return {...assets,problems,frames};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.problems,[]);
 assert.ok(result.frames.every(f=>f.visible>0&&f.edge===0),'Nonempty frames must fit canvas');
 await mkdir(out,{recursive:true});
 for(const [name,data]of Object.entries(result.images))await writeFile(resolve(out,`${name}.png`),Buffer.from(data.split(',')[1],'base64'));
 await writeFile(resolve(out,'craglet_2d.sprite.json'),JSON.stringify(result.json,null,2)+'\n');
 const report={status:'technical-draft-only',runtimeBound:false,errors,formatProblems:result.problems,frames:result.frames,
  limitations:['Idle uses a single authored blink; subtle body/plate drift still needs visual review.','Left-facing only; engine mirroring does not supply back/front artwork.','Walk color, body registration, foot trajectories and Bible belly gear remain unresolved.','Passing format and edge checks does not approve visual quality.']};
 await writeFile(resolve(out,'validation.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output:out,clips:Object.keys(result.images),frames:result.frames.length,errors}));
}finally{await browser.close();}

