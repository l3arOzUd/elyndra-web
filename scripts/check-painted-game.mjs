import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try {
 await page.goto('http://127.0.0.1:5173/?auto=1&name=ArtReview25');
 await page.waitForFunction(()=>window.elyndra?.game?.ents.size>0&&!window.elyndra.game.loading,null,{timeout:60000});
 const report=await page.evaluate(()=>{
  const {game,content}=window.elyndra;
  const me=game.ents.get(game.selfId);
  const ids=['mob_0003','mob_0004','mob_0009','mob_0010','mob_0011'];
  return ids.map((id,i)=>{
   const monster=content.monsters.get(id), entity=900001+i;
   game.addEnt({id:entity,k:'m',look:id,name:monster.name,lv:1,hp:100,mhp:100,x:me.pos.x+(i-2)*1.6,y:me.pos.z+2,h:270,st:0,ms:260},performance.now());
   const actor=game.ents.get(entity).actor;
   if(actor.sprite.json.id!==content.sprites.monsters[id].sprite)throw Error('Binding failed '+id);
   actor.setBase('walk');actor.update(300,game.cam.camera,game.cam.yaw);
   return {monster:id,sprite:actor.sprite.json.id,kind:actor.sprite.json.kind,walkImage:actor.sprite.sheets.walk.image.src,entity};
  });
 });
 await page.screenshot({path:'../sprite/painted_2d/main-game.png'});
 const deaths=await page.evaluate(report=>{
  const {game}=window.elyndra;
  game.onCombat({src:game.selfId,hits:[],deaths:report.map(r=>r.entity)});
  return report.map(r=>{
   const e=game.ents.get(r.entity);e.actor.update(2200,game.cam.camera,game.cam.yaw);
   const state=e.actor.animator.update(0);
   if(!e.dead||state.anim!=='death'||state.frame!==19)throw Error('Death did not hold '+r.monster);
   return {monster:r.monster,...state};
  });
 },report);
 await page.screenshot({path:'../sprite/painted_2d/main-game-death.png'});
 await page.evaluate(report=>{for(const r of report)window.elyndra.game.removeEnt(r.entity);},report);
 await writeFile('../sprite/painted_2d/main-game-validation.json',JSON.stringify({testEntities:'client-only',bindings:report,deaths,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Five new name-matched monsters loaded in game; death holds frame 19. No page errors.');
} finally {await browser.close();}
