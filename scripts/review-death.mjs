// Capture contact sheets and ground/settling measurements from actual GLB playback.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const label = process.argv[2] || 'current';
const view = process.argv[3] || 'perspective';
const out = resolve('../sprite/rigged_01_05/death-review');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const rows = [], states = [];
try {
  await page.goto((process.env.STUDIO_URL || 'http://127.0.0.1:5173') + '/animation-viewer.html');
  for (const name of ['mosskin','sporeling','ambermite','lunari','rootling']) {
    await page.locator(`[data-character="${name}"]`).click();
    await page.waitForFunction(n => window.__animationStudio?.snapshot().ready && window.__animationStudio.snapshot().character === n, name);
    await page.locator(`[data-view="${view}"]`).click();
    await page.locator('[data-clip="Die"]').click();
    let cells = '';
    for (const fraction of [0,.25,.5,.75,1]) {
      await page.locator('#timeline').evaluate((el,t) => {el.value=String(t*1000);el.dispatchEvent(new Event('input'));},fraction);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      states.push({ name, fraction, ...await page.evaluate(() => window.__animationStudio.snapshot()) });
      const png = await page.locator('#viewport').screenshot();
      cells += `<figure><img src="data:image/png;base64,${png.toString('base64')}"><figcaption>${name} · ${Math.round(fraction*100)}%</figcaption></figure>`;
    }
    rows.push(cells);
  }
  const contact = await browser.newPage({ viewport: {width: 1500,height: 1250} });
  await contact.setContent(`<style>body{margin:0;background:#18261e;color:#edf3df;font:13px sans-serif}.row{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin-bottom:8px}figure{margin:0}img{width:100%;display:block}figcaption{padding:8px}h1{padding:12px;font:18px sans-serif}</style><h1>Death review — ${label}</h1>${rows.map(r=>`<div class="row">${r}</div>`).join('')}`);
  await contact.screenshot({path: `${out}/${label}.png`,fullPage:true});
  await writeFile(`${out}/${label}.json`,JSON.stringify(states,null,2));
  console.log(`${out}/${label}.png`);
} finally { await browser.close(); }
