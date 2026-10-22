// Browser check of the character-systems UI (CHARACTER_SYSTEMS.md) in the
// offline preview, at three screen sizes: the character window, gear detail,
// equipment with Charm slots, the hotbar with Totem keys, the buff bar and
// the skill picker. Screenshots go to ../output/character-ui/.
//
//   npx vite --port 5199          (in another terminal)
//   PLAYWRIGHT_MODULE=playwright-core CHROMIUM_PATH=<chrome.exe> node scripts/check-character-ui.mjs [http://localhost:5199]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.argv[2] ?? 'http://localhost:5199';
const out = '../output/character-ui';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const problems = [];
const expect = (ok, what) => { if (!ok) problems.push(what); };

for (const [w, h] of [[1440, 900], [1280, 720], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => problems.push(`${w}: page error ${e}`));
  await page.goto(base + '/ui-preview.html');
  await page.waitForFunction(() => !!window.uiPreview, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(() => window.uiPreview.open('hud'));
  expect(await page.locator('#hotbar .slot:not(.item)').count() === 4, `${w}: 4 skill keys`);
  expect(await page.locator('#hotbar .slot.totem').count() === 3, `${w}: 3 Totem keys`);
  expect(await page.locator('#buff-bar .buff').count() >= 1, `${w}: buff bar shows effects`);
  await page.screenshot({ path: `${out}/hud-${w}.png` });

  await page.evaluate(() => window.uiPreview.open('character'));
  expect(await page.locator('#stat-list .stat-alloc').count() === 6, `${w}: six stats`);
  expect(await page.locator('#derived-list .derived-row').count() >= 20, `${w}: derived numbers`);
  const win = await page.locator('#char-win').boundingBox();
  expect(win && win.x >= 0 && win.x + win.width <= w + 1, `${w}: character window fits the screen`);
  expect(await page.locator('#char-win #rank-list').count() === 0, `${w}: the Status window has no skill ranks`);
  await page.screenshot({ path: `${out}/character-${w}.png` });

  await page.evaluate(() => window.uiPreview.open('skills'));
  expect(await page.locator('#skill-win #rank-list .rank-row').count() >= 4, `${w}: Skills window lists skill ranks`);
  await page.click('#skill-win .rank-head >> nth=1');
  expect(await page.locator('#skill-win .rank-table .rank-line').count() >= 10, `${w}: a rank unfolds its table`);
  const sw = await page.locator('#skill-win').boundingBox();
  expect(sw && sw.x >= 0 && sw.x + sw.width <= w + 1, `${w}: Skills window fits the screen`);
  await page.screenshot({ path: `${out}/skills-${w}.png` });

  await page.evaluate(() => window.uiPreview.open('gear'));
  expect(await page.locator('#item-detail .affix-list .affix').count() >= 1, `${w}: gear detail lists affixes`);
  expect(await page.locator('#item-detail .item-reqs').count() === 1, `${w}: gear detail shows requirements`);
  await page.screenshot({ path: `${out}/gear-${w}.png` });

  await page.evaluate(() => window.uiPreview.open('equipment'));
  expect(await page.locator('#equip .eq-row').count() === 8, `${w}: 5 gear + 3 Charm rows`);
  expect((await page.locator('#equip').textContent()).includes('+4 '), `${w}: refined item shows +N`);
  await page.screenshot({ path: `${out}/equipment-${w}.png` });

  if (w >= 1280) {
    await page.evaluate(() => window.uiPreview.open('hud'));
    await page.click('#hotbar .slot:not(.item) >> nth=0', { button: 'right' });
    expect(await page.locator('#skill-picker button').count() >= 4, `${w}: right-click opens the skill picker`);
    await page.screenshot({ path: `${out}/picker-${w}.png` });
    // The newer jobs use the painted skills-v3 atlas.
    await page.evaluate(() => document.getElementById('skill-picker')?.remove());
    await page.evaluate(() => window.uiPreview.hud.setStats({ t: 'stats', lv: 30, job: 'arcanist', hp: 1500, mhp: 1500, sp: 300, msp: 300, sh: 0, msh: 0, atk: 300, def: 100, exp: 0, next: 1200 }));
    expect(await page.locator('#hotbar .painted-icon.skill3-art').count() >= 3, `${w}: Arcanist keys use the skills-v3 art`);
    await page.evaluate(async () => { const img = new Image(); img.src = '/ui/painted/skills-v3.png'; await img.decode(); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/arcanist-${w}.png` });
  }
  await page.close();
}
await browser.close();
if (problems.length) {
  console.error('character UI check FAILED:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`character UI check passed (screenshots in ${out})`);
