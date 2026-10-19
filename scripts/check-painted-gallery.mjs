import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],clips=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')console.log(m.text());});
try {
 await page.goto('http://127.0.0.1:5173/sprite-gallery.html');
 await page.waitForFunction(()=>document.querySelectorAll('article').length===25);
 for(const clip of ['walk','idle','attack','hit','death']) {
  await page.locator(`[data-clip="${clip}"]`).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.load-note')].every(e=>!e.textContent.includes('…')));
  const failed=await page.locator('.load-note').allTextContents();
  if(failed.some(s=>s.includes('ไม่สำเร็จ')))throw Error(clip+' failed to load: '+await page.locator('article').evaluateAll(els=>els.filter(e=>e.textContent.includes('ไม่สำเร็จ')).map(e=>e.querySelector('h2').textContent)));
  clips.push(clip);
 }
 await page.locator('[data-clip="walk"]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.load-note')].every(e=>!e.textContent.includes('…')));
 await page.locator('#pause').click();
 await page.screenshot({path:'../sprite/painted_2d/gallery-desktop.png',fullPage:true});
 await page.locator('#flip').click();
 await page.setViewportSize({width:390,height:844});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 await page.screenshot({path:'../sprite/painted_2d/gallery-mobile.png',fullPage:true});
 const links=await page.locator('article>a').evaluateAll(a=>a.map(e=>e.getAttribute('href')));
 if(new Set(links).size!==25)throw Error('Missing direct review links');
 await writeFile('../sprite/painted_2d/gallery-validation.json',JSON.stringify({characters:25,clips,reviewLinks:links,mobileOverflow:false,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Gallery: 25 characters × 5 clips loaded; desktop/mobile and 25 review links passed.');
}finally{await browser.close();}
