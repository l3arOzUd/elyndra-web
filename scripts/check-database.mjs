import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
// Screenshots of db.html on the running game (play.ps1, :7101): every page
// kind on desktop and phone width, and fails on page errors or empty pages.
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.DB_URL||'http://localhost:7101/db.html';
const out='../output/database';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
const errors=[];
const pages=[['monsters','#/monsters'],['monster-boss','#/monster/mob_0036'],['monster-brookfin','#/monster/mob_0008'],['monster-unplaced','#/monster/mob_0090'],['items','#/items'],['item-material','#/item/itm_0001'],['item-gear','#/item/itm_0078'],['options','#/options'],['maps','#/maps'],['map','#/map/lum_fld_02']];
try {
 for(const [w,hgt,tag] of [[1440,900,'desktop'],[390,844,'phone']]){
  const page=await browser.newPage({viewport:{width:w,height:hgt}});
  page.on('pageerror',e=>errors.push(tag+': '+e));
  for(const [name,hash] of pages){
   await page.goto(base+hash);
   await page.waitForSelector('.top');
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(400);
   const text=await page.locator('#app').innerText();
   if(text.length<200)errors.push(`${tag} ${name}: page nearly empty`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   if(overflow>1)errors.push(`${tag} ${name}: page scrolls sideways by ${overflow}px`);
   await page.screenshot({path:`${out}/${tag}-${name}.png`,fullPage:name.startsWith('monster-')||name.startsWith('item-')||name==='map'});
  }
  await page.close();
 }
} finally { await browser.close(); }
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('database pages ok:',out);
