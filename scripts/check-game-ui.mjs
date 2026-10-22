import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const out='../output/ui-redesign';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try {
 await page.goto('http://127.0.0.1:5173/ui-preview.html');
 await page.waitForFunction(()=>!!window.uiPreview,null,{timeout:60000});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForLoadState('networkidle');
 for(const mode of ['hud','bag','equipment','journal','shop','craft','travel','healer','guild','menu','login','disconnected','inspector','debug']){
  await page.evaluate(mode=>{window.uiPreview.open(mode);document.getElementById('preview-mode').value=mode;},mode);
  await page.screenshot({path:out+'/'+mode+'.png'});
 }
 await page.selectOption('#preview-mode','bag');
 if(await page.locator('#item-detail > .painted-icon').evaluate(e=>getComputedStyle(e).backgroundImage==='none'))throw Error('Selected item illustration missing');
 const beforeDrag=await page.locator('#inv-win').boundingBox();
 await page.mouse.move(beforeDrag.x+110,beforeDrag.y+29); await page.mouse.down();
 await page.mouse.move(beforeDrag.x-180,beforeDrag.y+39,{steps:6}); await page.mouse.up();
 const afterDrag=await page.locator('#inv-win').boundingBox();
 if(Math.abs(afterDrag.x-beforeDrag.x)<100)throw Error('Window drag failed');
 await page.reload(); await page.waitForFunction(()=>!!window.uiPreview);
 await page.evaluate(()=>window.uiPreview.open('bag'));
 const restored=await page.locator('#inv-win').boundingBox();
 if(Math.abs(restored.x-afterDrag.x)>3)throw Error('Window layout was not restored');
 await page.evaluate(()=>window.uiPreview.open('menu')); await page.click('#reset-layout');
 await page.check('#edit-layout');
 const statusBefore=await page.locator('.status-win').boundingBox();
 await page.mouse.move(statusBefore.x+100,statusBefore.y+20);await page.mouse.down();
 await page.mouse.move(statusBefore.x+140,statusBefore.y+40,{steps:5});await page.mouse.up();
 const statusAfter=await page.locator('.status-win').boundingBox();
 if(Math.abs(statusAfter.x-statusBefore.x)<30)throw Error('HUD edit mode did not move the status panel');
 await page.click('#reset-layout');
 await page.evaluate(()=>window.uiPreview.open('bag'));
 await page.fill('#item-search','zzzz');
 if(await page.locator('#inventory li').count()!==0)throw Error('Search mismatch');
 if(!await page.locator('#inv-empty').isVisible())throw Error('Missing empty state');
 await page.fill('#item-search','');
 await page.selectOption('#item-filter','consumable');
 const consumables=await page.locator('#inventory li').count();
 if(!consumables)throw Error('No consumables');
 await page.locator('.detail-action').click();
 if(!await page.locator('.preview-notice').isVisible())throw Error('Use callback missing');
 await page.selectOption('#item-filter','all');
 await page.evaluate(()=>{window.uiPreview.hud.setStats({...window.uiPreview.hud.stats,hp:80,sp:0});window.uiPreview.open('hud');});
 if(!await page.locator('[data-skill="cleaving_arc"]').isDisabled())throw Error('Insufficient SP state failed');
 await page.screenshot({path:out+'/low-hp-no-sp.png'});
 await page.evaluate(()=>{window.uiPreview.hud.setStats({...window.uiPreview.hud.stats,hp:1080,sp:186});window.uiPreview.hud.startCooldown('cleaving_arc');});
 await page.waitForFunction(()=>document.querySelector('[data-skill="cleaving_arc"]').classList.contains('cooling'));
 await page.screenshot({path:out+'/cooldown.png'});
 await page.selectOption('#preview-mode','shop');
 await page.getByRole('button',{name:'Sell',exact:true}).click();
 if(!await page.getByRole('button',{name:'Sell 1',exact:true}).first().isVisible())throw Error('Sell tab failed');
 await page.getByRole('button',{name:'Sell 1',exact:true}).first().click();
 await page.screenshot({path:out+'/shop-sell.png'});
 await page.selectOption('#preview-mode','hud');
 await page.setViewportSize({width:1280,height:720});
 for(const mode of ['hud','bag','craft','journal']) {
  await page.evaluate(mode=>window.uiPreview.open(mode),mode);
  await page.screenshot({path:out+'/compact-'+mode+'.png'});
 }
 await page.setViewportSize({width:390,height:844});
 for(const mode of ['hud','bag','equipment','shop','craft','journal','menu','login']){
  await page.selectOption('#preview-mode',mode);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw Error('Horizontal overflow '+mode);
  await page.screenshot({path:out+'/mobile-'+mode+'.png'});
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:5173/?auto=1&name=UiReview26');
 await page.waitForFunction(()=>window.elyndra?.game?.ents.size>0&&!window.elyndra.game.loading,null,{timeout:60000});
 await page.waitForLoadState('networkidle');
 await page.screenshot({path:out+'/live-game.png'});
 await page.click('#toggle-inv');
 await page.screenshot({path:out+'/live-inventory.png'});
 await page.fill('#item-search','i123');
 if(!await page.locator('#inv-win').isVisible())throw Error('Typing triggered hotkeys');
 await page.keyboard.press('Escape');
 if(await page.locator('#inv-win').isVisible())throw Error('Escape did not close inventory');
 await page.keyboard.press('q');
 if(!await page.locator('#journal-win').isVisible())throw Error('Quest shortcut failed');
 await page.keyboard.press('Escape');
 await page.click('#toggle-menu');
 await page.locator('#menu-win summary').click();
 await page.click('#toggle-inspector');
 if(!await page.locator('#inspector').isVisible())throw Error('Inspector failed');
 await page.keyboard.press('Escape');
 // A test character walks to the real merchant; buy/sell are actual server transactions.
 const startingCurrency=await page.evaluate(()=>window.elyndra.hud.aurel);
 await page.evaluate(()=>window.elyndra.game.walkTo([83,64]));
 await page.waitForFunction(()=>{const g=window.elyndra.game,p=g.ents.get(g.selfId);return p&&Math.hypot(p.pos.x-84,p.pos.z-64)<2;},null,{timeout:30000});
 await page.evaluate(()=>window.elyndra.conn.send({t:'npc',npc:'npc_lum_merchant',op:'talk'}));
 await page.locator('#npc-win').waitFor({state:'visible'});
 await page.getByRole('button',{name:'Buy 1',exact:true}).first().click();
 await page.waitForFunction(()=>window.elyndra.hud.inventory.itm_0075>0);
 const afterBuy=await page.evaluate(()=>window.elyndra.hud.aurel);
 if(afterBuy!==startingCurrency-9)throw Error('Server purchase price mismatch');
 await page.screenshot({path:out+'/live-shop.png'});
 await page.getByRole('button',{name:'Sell',exact:true}).click();
 await page.getByRole('button',{name:'Sell 1',exact:true}).first().click();
 await page.waitForFunction(expected=>window.elyndra.hud.aurel===expected,afterBuy+3);
 await page.keyboard.press('Escape');
 // Crowded visual review uses client-only creatures; the server world is unchanged.
 await page.evaluate(()=>{
  const {game,content}=window.elyndra,p=game.ents.get(game.selfId);
  for(let i=0;i<30;i++){
   const ref=i%2?'mob_0001':'mob_0002',m=content.monsters.get(ref),angle=i*2.399;
   game.addEnt({id:990000+i,k:'m',look:ref,ref,name:m.name,lv:m.level,hp:60,mhp:100,x:p.pos.x+Math.cos(angle)*(2+i%5),y:p.pos.z+Math.sin(angle)*(2+i%5),h:270,st:0,ms:260},performance.now());
  }
  game.targetId=990000;
 });
 await page.waitForFunction(()=>!document.getElementById('target-win').hidden);
 await page.screenshot({path:out+'/live-crowded-hud.png'});
 await page.evaluate(()=>{for(let i=0;i<30;i++)window.elyndra.game.removeEnt(990000+i);});
 const live=await page.evaluate(()=>({map:document.getElementById('map-name').textContent,stats:window.elyndra.hud.stats,items:window.elyndra.hud.inventory}));
 await writeFile(out+'/validation.json',JSON.stringify({errors,consumables,live,desktop:['1440×900','1280×720'],mobile:'390×844',serverTransactions:{testCharacter:'UiReview26',startingCurrency,afterBuy,afterSell:afterBuy+3},crowd:'30 client-only visual fixtures; removed afterward',checked:['14 preview panels','painted selected item visibility','window drag and reload persistence','HUD edit mode / layout reset','search/filter/empty state','use/sell callbacks','low HP / insufficient SP / cooldown','live login','typing ignores hotkeys','Escape / I / Q','animation inspector','real merchant buy / sell','selected target / crowded HUD']},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('UI preview and live-game checks passed. Screenshots in '+out);
}finally{await browser.close();}
