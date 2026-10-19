// Browser integration audit. PLAYWRIGHT_MODULE can point to an existing
// playwright-core installation; no additional runtime dependency is needed.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.STUDIO_URL || 'http://127.0.0.1:5173';
const output = resolve('../sprite/rigged_01_05');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH,
  args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const names = ['mosskin','sporeling','ambermite','lunari','rootling'];
const clips = ['Idle','Walk','Attack','Hit','Die','Special'];
const results = [];
const snapshot = () => page.evaluate(() => window.__animationStudio.snapshot());
const ready = async name => page.waitForFunction(id => {
  const studio = window.__animationStudio;
  if (!studio) return false;
  const state = studio.snapshot();
  return state.ready && state.character === id;
}, name);
const seek = async fraction => {
  await page.locator('#timeline').evaluate((el, value) => {
    el.value = String(value*1000); el.dispatchEvent(new Event('input', { bubbles: true }));
  }, fraction);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
};
try {
  await page.goto(`${base}/animation-viewer.html?model=mosskin`);
  await ready('mosskin');
  for (const name of names) {
    await page.locator(`[data-character="${name}"]`).click(); await ready(name);
    const character = { name, poses: [] };
    for (const clip of clips) {
      await page.locator(`[data-clip="${clip}"]`).click(); await seek(.43);
      const state = await snapshot();
      assert.equal(state.clip, clip);
      assert.equal(state.clips.length, 6);
      assert.ok(state.bones >= 14 && state.meshes > 0, `${name} has a skinned mesh`);
      assert.ok(state.movingVertices > 20, `${name}/${clip} deforms vertices`);
      assert.ok(Number.isFinite(state.maxDeformation) && state.maxDeformation < 2, `${name}/${clip} bounded deformation`);
      assert.ok(state.minY > -.002, `${name}/${clip} stays above ground: ${state.minY}`);
      assert.equal(state.paused, true);
      character.poses.push(state);
      if (clip === 'Walk') await page.screenshot({ path: `${output}/${name}-walk.png` });
    }
    results.push(character);
  }
  // Pause/resume, finished one-shot behavior, returning from a held death pose.
  await page.locator('[data-clip="Die"]').click();
  await seek(.98);
  await page.locator('#play').click();
  await page.waitForFunction(() => window.__animationStudio.snapshot().finished);
  const dead = await snapshot(); assert.ok(dead.time >= dead.duration-.01);
  await page.locator('[data-clip="Idle"]').click(); await seek(.25);
  const alive = await snapshot(); assert.ok(alive.maxY > .9 && !alive.finished);
  const pausedTime = alive.time;
  await page.waitForTimeout(250);
  assert.equal((await snapshot()).time, pausedTime);
  await page.locator('#play').click(); await page.waitForTimeout(150);
  assert.ok((await snapshot()).time !== pausedTime);
  // A faded-out one-shot finishing must not mark the active idle clip finished.
  await page.locator('[data-clip="Hit"]').click();
  await page.locator('[data-clip="Idle"]').click();
  await page.waitForTimeout(700);
  assert.equal((await snapshot()).finished, false);
  await page.locator('#bones').check(); assert.equal((await snapshot()).skeletonVisible, true);
  await page.locator('#unlit').uncheck(); await page.locator('#wire').check();
  await page.locator('#wire').uncheck(); await page.locator('#unlit').check();
  await page.locator('[data-view="left"]').click();
  await page.screenshot({ path: `${output}/rootling-skeleton.png` });
  await page.locator('#bones').uncheck();
  // Rapid model changes must not allow an older fetch to replace the final choice.
  await page.evaluate(() => {
    for (const name of ['ambermite','lunari','mosskin']) document.querySelector(`[data-character="${name}"]`).click();
  });
  await ready('mosskin');
  await page.waitForTimeout(300); assert.equal((await snapshot()).character, 'mosskin');
  await page.locator('[data-view="perspective"]').click();
  await page.locator('[data-clip="Walk"]').click(); await seek(.35);
  await page.screenshot({ path: `${output}/animation-studio-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile layout does not overflow');
  await page.screenshot({ path: `${output}/animation-studio-mobile.png`, fullPage: true });
  const response = await page.request.get(`${base}/models/monsters/rootling.glb`);
  assert.equal(response.status(), 200);
  assert.equal(errors.length, 0, errors.join('\n'));
  const audit = { passed: true, characterCount: 5, testedClips: 30, errors,
    checks: ['real GLTFLoader skins and clips', 'deformed vertices for all 30 clips', 'ground clearance',
      'pause and resume', 'death holds last frame', 'return to idle', 'skeleton and material controls',
      'race-safe character switching', 'faded clip finish isolation', 'mobile layout', 'Rootling source served'], characters: results };
  await writeFile(`${output}/browser-validation.json`, JSON.stringify(audit, null, 2));
  console.log(JSON.stringify({ passed: true, characters: 5, clips: 30, errors, output }));
} finally { await browser.close(); }
