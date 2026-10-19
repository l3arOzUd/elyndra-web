// Verify the exported death clips in the real viewer, including between bake keys.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
try {
  await page.goto((process.env.STUDIO_URL || 'http://127.0.0.1:5173')+'/animation-viewer.html');
  for(const name of ['mosskin','sporeling','ambermite','lunari','rootling']) {
    await page.locator(`[data-character="${name}"]`).click();
    await page.waitForFunction(n=>window.__animationStudio?.snapshot().ready && window.__animationStudio.snapshot().character===n,name);
    await page.locator('[data-clip="Die"]').click();
    const frames=[];
    for(let frame=0;frame<=50;frame++) {
      const state=await page.evaluate(async fraction=>{
        const range=document.querySelector('#timeline');range.value=String(fraction*1000);range.dispatchEvent(new Event('input'));
        await new Promise(r=>requestAnimationFrame(r));
        return window.__animationStudio.snapshot();
      },frame/50);
      assert.ok(state.minY>=-.002,`${name}: floor penetration at ${frame}: ${state.minY}`);
      assert.ok(Number.isFinite(state.maxDeformation),`${name}: finite deformation`);
      if(frames.length) assert.ok(Math.abs(state.maxY-frames.at(-1).maxY)<.12,`${name}: abrupt vertical jump`);
      frames.push(state);
    }
    const restHeight=frames[0].maxY-frames[0].minY;
    const end=frames.at(-1);
    assert.ok(end.maxY-end.minY<restHeight*.94,`${name}: must visibly settle lower`);
    for(const state of frames.slice(44)) {
      assert.ok(Math.abs(state.maxY-end.maxY)<1e-6 && Math.abs(state.maxDeformation-end.maxDeformation)<1e-6,`${name}: final pose must hold still`);
    }
    results.push({name,duration:end.duration,heightBefore:restHeight,heightAfter:end.maxY-end.minY,
      minimumGroundY:Math.min(...frames.map(f=>f.minY)),samples:frames.length,settled:true});
  }
  assert.deepEqual(errors,[]);
  const result={passed:true,clips:5,samples:255,errors,results};
  await writeFile('../sprite/rigged_01_05/death-review/validation.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {await browser.close();}
