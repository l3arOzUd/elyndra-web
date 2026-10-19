import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const catalog = JSON.parse(await readFile('public/sprites/painted-catalog.json', 'utf8'));
const requested = process.argv.slice(2);
const characters = catalog.filter(c => Number(c.number) >= 3 && (!requested.length || requested.includes(c.id)));
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH});
const page = await browser.newPage({viewport:{width:1440,height:1100}});
const contact = await browser.newPage({viewport:{width:1440,height:1000}});
let errors = [];
page.on('pageerror', e => errors.push(String(e)));
try {
  for (const c of characters) {
    const out = resolve(`public/sprites/${c.id}_2d`), review = resolve(`../sprite/painted_2d/${c.id}`);
    try { await access(out+'/poses.json'); } catch { continue; }
    await mkdir(review,{recursive:true}); errors=[];
    await page.goto(`http://127.0.0.1:5173/sprite-viewer.html?character=${c.id}`);
    await page.waitForFunction(()=>window.__sprite2d?.ready,null,{timeout:60000});
    const assets=await page.evaluate(()=>window.__sprite2d.export());
    if(assets.json.id!==c.id+'_2d')throw Error('Incorrect character '+c.id);
    for(const [name,png] of Object.entries(assets.images))await writeFile(`${out}/${name}.png`,Buffer.from(png.split(',')[1],'base64'));
    await writeFile(`${out}/${c.id}_2d.sprite.json`,JSON.stringify(assets.json,null,2)+'\n');
    await page.locator('[data-clip="walk"]').click(); await page.locator('#timeline').fill('0');
    await page.screenshot({path:review+'/studio.png',fullPage:true});
    await page.locator('[data-mode="game"]').click();
    await page.locator('[data-facing="right"]').click();
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await page.screenshot({path:review+'/game-renderer.png',fullPage:true});
    // A compact contact sheet uses the exact exported game frames.
    await contact.setContent('<style>body{margin:0;background:#18271e;color:#d1dfbd;font:16px sans-serif}canvas{display:block}</style><canvas id="contact"></canvas>');
    await contact.evaluate(async ({assets,name})=>{
      const canvas=document.querySelector('canvas');canvas.width=1440;canvas.height=1020;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#18271e';ctx.fillRect(0,0,1440,1020);
      ctx.fillStyle='#d1dfbd';ctx.font='22px sans-serif';ctx.fillText(name+' / full-body painted poses',24,32);
      const clips=['walk','attack','hit','death'];
      for(let row=0;row<clips.length;row++){
        const clip=clips[row], img=new Image();img.src=assets.images[clip];await img.decode();
        const count=assets.json.animations[clip].frames;
        for(let col=0;col<6;col++){
          const frame=clip==='walk'?col:Math.min(count-1,Math.floor(col/5*(count-1)));
          ctx.drawImage(img,frame*384,0,384,384,col*240,row*240+45,240,240);
          ctx.fillStyle='#d1dfbd';ctx.font='13px sans-serif';ctx.fillText(clip+' '+frame,col*240+10,row*240+278);
        }
      }
    },{assets,name:c.number+' '+c.name});
    await contact.locator('canvas').screenshot({path:review+'/motion-contact.png'});
    await page.setViewportSize({width:390,height:844});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow)errors.push('Mobile horizontal overflow');
    await page.setViewportSize({width:1440,height:1100});
    await writeFile(review+'/browser-validation.json',JSON.stringify({character:c.id,errors,exported:Object.keys(assets.images)},null,2));
    if(errors.length)throw Error(c.id+': '+errors.join('; '));
    console.log(c.number+' '+c.name+': exported five clips; art/game/mobile checked');
  }
} finally { await browser.close(); }
