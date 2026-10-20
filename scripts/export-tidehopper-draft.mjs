import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=resolve(import.meta.dirname,'../art-source/monsters/mob_0020/runtime-draft');
const out=resolve(root,'tidehopper_2d');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:5173/art-source/monsters/mob_0020/combined-review.html');
 await page.waitForFunction(()=>window.__tideCombined?.ready);
 const result=await page.evaluate(async()=>{
  const {exportDraft}=await import('/art-source/monsters/mob_0020/runtime-export.js');
  const {validateSprite,resolveFacing}=await import('/src/render/spriteDef.ts');
  const {Animator}=await import('/src/render/animator.ts');
  const assets=exportDraft(),problems=validateSprite(assets.json,assets.sizes),frames=[];
  for(const [clip,url]of Object.entries(assets.images)){
   const im=new Image();im.src=url;await im.decode();
   const c=document.createElement('canvas');c.width=c.height=384;
   const g=c.getContext('2d',{willReadFrequently:true});
   for(let row=0;row<8;row++)for(let f=0;f<assets.json.animations[clip].frames;f++){
    g.clearRect(0,0,384,384);g.drawImage(im,f*384,row*384,384,384,0,0,384,384);
    const a=g.getImageData(0,0,384,384).data;let visible=0,edge=0;
    for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(a[(y*384+x)*4+3]>32){visible++;if(x===0||y===0||x===383||y===383)edge++}
    frames.push({clip,facing:assets.json.rows[row],frame:f,visible,edge});
   }
  }
  const animator=new Animator(assets.json.animations),events=[];
  animator.play('attack',{onEvent:event=>events.push(event)});animator.update(479);const beforeHit=events.length;
  animator.update(1);const onHit=events.length;animator.update(1000);
  animator.play('death');const dead=animator.update(2000),held=animator.update(1000);
  const facings=Object.fromEntries(assets.json.rows.map(dir=>[dir,resolveFacing(assets.json,dir)]));
  return {...assets,problems,frames,engine:{beforeHit,onHit,events,dead,held,facings}};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.problems,[]);
 assert.equal(result.frames.length,312);
 assert.ok(result.frames.every(f=>f.visible>0&&f.edge===0),'Every exported cell must be visible and inside its bounds');
 assert.equal(result.engine.beforeHit,0);assert.equal(result.engine.onHit,1);assert.deepEqual(result.engine.events,['hit']);
 assert.equal(result.engine.dead.anim,'death');assert.equal(result.engine.dead.frame,5);assert.deepEqual(result.engine.dead,result.engine.held);
 assert.ok(Object.values(result.engine.facings).every(f=>!f.flip),'Use authored right-facing art');
 await mkdir(out,{recursive:true});
 for(const [clip,url]of Object.entries(result.images))await writeFile(resolve(out,`${clip}.png`),Buffer.from(url.split(',')[1],'base64'));
 await writeFile(resolve(out,'tidehopper_2d.sprite.json'),JSON.stringify(result.json,null,2)+'\n');
 const index=JSON.parse(await readFile(resolve(import.meta.dirname,'../public/sprites/index.json'),'utf8'));
 const report={status:'technical-draft-unapproved',runtimeBound:index.monsters.mob_0020?.sprite==='tidehopper_2d',
  formatProblems:result.problems,browserErrors:errors,frames:result.frames,engine:result.engine,
  limitations:['Four authored cardinal views; diagonal rows reuse side art.','Only two idle drawings per view; repeated frames are holds.','Front/back/right hop reuse crouch for missing settled landing.','Shell volume, limb anatomy, right impact and rear forward projection remain unapproved.','Rear exhale adds more exposed foreleg segments and changes highlights.','Technical checks do not establish visual approval or live multiplayer behavior.']};
 await writeFile(resolve(root,'validation.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({out,frames:result.frames.length,engine:result.engine,runtimeBound:report.runtimeBound}));
}finally{await browser.close()}
