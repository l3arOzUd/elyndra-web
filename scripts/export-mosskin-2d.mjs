// Export the same Canvas2D-authored frames that the preview and game renderer consume.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const character=process.argv[2] || 'mosskin';
if(!['mosskin','sporeling'].includes(character)) throw Error('Unknown character: '+character);
const spriteId=character+'_2d';
const out=resolve('public/sprites/'+spriteId), review=resolve('../sprite/'+spriteId);
await mkdir(out,{recursive:true}); await mkdir(review,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
  await page.goto('http://127.0.0.1:5173/sprite-viewer.html?character='+character);
  await page.waitForFunction(()=>window.__sprite2d?.ready,{},{timeout:60000});
  const assets=await page.evaluate(()=>window.__sprite2d.export());
  if(assets.json.id!==spriteId) throw Error('Wrong character exported');
  for(const [name,png] of Object.entries(assets.images)) await writeFile(`${out}/${name}.png`,Buffer.from(png.split(',')[1],'base64'));
  await writeFile(`${out}/${spriteId}.sprite.json`,JSON.stringify(assets.json,null,2)+'\n');
  await page.locator('#timeline').fill('0');
  await page.screenshot({path:`${review}/studio-desktop.png`,fullPage:true});
  const rows=[];
  for(const name of ['idle','walk','attack','hit','death']){
    await page.locator(`[data-clip="${name}"]`).click();
    const cells=[];
    for(const fraction of [0,.25,.5,.75,1]){
      await page.locator('#timeline').fill(String(fraction*1000));
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const png=await page.locator('#art').screenshot();
      cells.push(`<figure><img src="data:image/png;base64,${png.toString('base64')}"><figcaption>${name} · ${fraction}</figcaption></figure>`);
    }
    rows.push(`<div class="row">${cells.join('')}</div>`);
  }
  const contact=await browser.newPage({viewport:{width:1500,height:1450}});
  await contact.setContent(`<style>body{margin:0;background:#132019;color:#cdddb6;font:12px sans-serif}.row{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}figure{margin:0}img{width:100%;display:block}figcaption{padding:8px}</style>${rows.join('')}`);
  await contact.screenshot({path:`${review}/motion-contact.png`,fullPage:true});
  await page.locator('[data-clip="walk"]').click();
  await page.locator('[data-mode="game"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({path:`${review}/studio-game.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-mode="art"]').click();
  await page.screenshot({path:`${review}/studio-mobile.png`,fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow) errors.push('Mobile horizontal overflow');
  await writeFile(`${review}/browser-validation.json`,JSON.stringify({errors,exported:Object.keys(assets.images),frame:assets.json.frame},null,2));
  if(errors.length) throw Error(errors.join('\n'));
  console.log('Exported five clips and sprite definition; desktop, mobile and game-renderer previews captured.');
}finally{await browser.close();}
