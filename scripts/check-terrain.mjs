// Run with Vite listening on 5173. Uses installed Chrome; no browser package needed.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const out = path.resolve('../output/terrain-review');
await mkdir(out, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9223', `--user-data-dir=${path.join(out, 'browser-profile')}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
try {
  let targets;
  for (let i = 0; i < 100; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9223/json')).json(); break; } catch { await pause(100); }
  }
  if (!targets) throw new Error('Chrome did not start');
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let seq = 0;
  const pending = new Map(), errors = [];
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(msg.error) : p.resolve(msg.result); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) errors.push(msg.params.args.map(x => x.value ?? x.description));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  // A data file gives same-origin access without starting the game's login flow.
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/data/regions.json' });
  await pause(700);
  await evaluate(`(async () => {
    const source = await (await fetch('/src/render/terrain.ts')).text();
    const threeUrl = source.match(/from +["']([^"']*three[^"']*)["']/)[1];
    const THREE = await import(threeUrl);
    const {buildMap, animate} = await import('/src/render/terrain.ts');
    const {IsoCamera} = await import('/src/render/camera.ts');
    const regions = await (await fetch('/data/regions.json')).json();
    const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
    renderer.setSize(1440,1000); renderer.setClearColor(0x1d2f27);
    document.body.innerHTML=''; document.body.style.cssText='margin:0;overflow:hidden'; document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xe6f2ff,0x4b5b3a,1.5));
    const sun = new THREE.DirectionalLight(0xfff0d0,1.8); sun.position.set(-40,80,30); scene.add(sun);
    const camera = new IsoCamera(1440/1000);
    let current;
    window.terrainCheck = async (id, target) => {
      if(current) { scene.remove(current.group); current.dispose(); }
      const layout = await (await fetch('/data/maps/'+id+'.json')).json();
      current = buildMap(layout,regions.find(r=>id.startsWith(r.id+'_')),[]);
      await current.ready; scene.add(current.group);
      const center = target || [layout.width/2,layout.height/2];
      camera.target.set(center[0],0,center[1]); camera.update(1,new THREE.Vector3(center[0],0,center[1]));
      animate(current,0.1); renderer.render(scene,camera.camera);
      const ground = current.group.getObjectByName('terrain-ground');
      return {id, textured:ground.material.customProgramCacheKey(), bridges:current.group.children.filter(o=>o.name==='crossing-deck').length,
        textures:renderer.info.memory.textures, triangles:renderer.info.render.triangles};
    };
    window.terrainDisposedCheck = async () => {
      const layout = await (await fetch('/data/maps/lum_fld_01.json')).json();
      const b = buildMap(layout,regions[0],[]); b.dispose(); await b.ready;
      return b.group.getObjectByName('terrain-ground').material.customProgramCacheKey() !== 'lumeris-painted-ground-v1';
    };
  })()`);
  const maps = (await readdir('public/data/maps')).filter(f => f.startsWith('lum_') && f.endsWith('.json'));
  const report = [];
  const centers = {lum_fld_01:[56,64], lum_fld_05:[59,46], lum_town_01:[60,60]};
  for (const file of maps) {
    const id = file.slice(0,-5);
    const result = await evaluate(`terrainCheck(${JSON.stringify(id)},${JSON.stringify(centers[id]) || 'null'})`);
    report.push(result);
    const shot = await send('Page.captureScreenshot', {format:'png'});
    await writeFile(path.join(out,id+'.png'),Buffer.from(shot.data,'base64'));
    console.log(JSON.stringify(result));
  }
  await evaluate(`terrainCheck('lum_fld_01',[88,106])`);
  const shot = await send('Page.captureScreenshot', {format:'png'});
  await writeFile(path.join(out,'dawnmeadow-pond.png'),Buffer.from(shot.data,'base64'));
  const disposedBeforeLoad = await evaluate('terrainDisposedCheck()');
  const fallback = await evaluate(`terrainCheck('ver_fld_01')`);
  await writeFile(path.join(out,'report.json'),JSON.stringify({report,disposedBeforeLoad,fallback,errors},null,2));
  if (errors.length || !disposedBeforeLoad || report.some(r=>r.textured !== 'lumeris-painted-ground-v1')) throw new Error(JSON.stringify({errors,disposedBeforeLoad,report}));
  console.log('PASS: all Lumeris maps render with tiles; disposed loads and other-region fallback verified.');
} finally {
  ws?.close(); chrome.kill();
}
