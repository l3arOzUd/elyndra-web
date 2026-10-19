import * as THREE from 'three';
import { CLIPS, FRAME, loadMosskinParts, makeMosskinSheets } from '../render/mosskin2d';
import { createSporelingSheets } from '../render/sporeling2d';
import { createPaintedSheets } from '../render/paintedCreature2d';
import { SpriteActor } from '../render/spriteActor';
import { spriteFromImages, type BasicAnimName as AnimName } from '../render/spriteDef';
import './spriteViewer.css';

interface Creature { id: string; name: string; number: string; label: string; hovering: boolean; gameMonster: string | null }
const catalog = await (await fetch('/sprites/painted-catalog.json')).json() as Creature[];
const creature = catalog.find(c => c.id === new URLSearchParams(location.search).get('character')) ?? catalog[0];
const isSporeling = creature.id === 'sporeling';
document.title = `${creature.name} · 2D Atelier`;

const names: Record<Exclude<AnimName, 'shoot' | 'cast'>, [string, string]> = {
  idle: ['ยืน', 'พักตัวเบา ๆ ในท่ายืนเดิม'], walk: ['เดิน', 'ภาพเต็มตัว 6 จังหวะ · ขาสั้นติดกับลำตัว'],
  attack: ['โจมตี', 'ย่อตัว เตรียมแรง แล้วพุ่งชน'], hit: ['โดนตี', 'ถอยรับแรงและกลับมาทรงตัว'],
  death: ['ตาย', 'ทรุดลง หลับตา และค้างท่าสุดท้าย'],
};
document.querySelector('#app')!.innerHTML = `
  <header><a class="brand" href="/">ELYNDRA <span>/ ART ATELIER</span></a><nav><a href="/sprite-gallery.html">????? 25 ??? ?</a><a href="/animation-viewer.html">ดูแบบ 3D ↗</a><span class="status">● 2D STUDY · 001</span></nav></header>
  <main><section class="intro"><div><p class="eyebrow">LUMERIS · CREATURE ANIMATION</p><h1>A little life,<br><em>in two dimensions.</em></h1><p class="subtitle">Mosskin จากภาพต้นฉบับ สู่ตัวละคร 2D ที่ขยับได้</p></div><div class="edition">01<span>MOSSKIN</span></div></section>
  <section class="workspace"><div class="preview-panel"><div class="stage-top"><span><i></i> MOSSKIN <small>วิญญาณมอส</small></span><div class="segmented"><button data-mode="art" class="active">ภาพ 2D</button><button data-mode="game">ในฉากเกม</button></div></div>
    <div id="stage"><div class="stage-grid"></div><canvas id="art"></canvas><div id="game-stage" hidden></div><span class="stage-label">DAWNMEADOW SPECIMEN / 01</span><span id="loading">กำลังเตรียมภาพ…</span></div>
    <div class="transport"><button id="play" aria-label="หยุดหรือเล่น">หยุด</button><button id="replay" aria-label="เล่นใหม่">↺</button><input id="timeline" type="range" min="0" max="1000" value="0" aria-label="ตำแหน่งแอนิเมชัน"/><span id="time">0.00s</span></div>
    <div class="stage-bottom"><span id="clip-note">${names.idle[1]}</span><span id="frame-count">16 FRAMES</span></div></div>
  <aside><section class="control-card"><p class="eyebrow">01 / MOTION</p><h2>ลองขยับดู</h2><div class="clips">${Object.entries(names).map(([key,[name]], i) => `<button data-clip="${key}" class="${key === 'idle' ? 'active' : ''}"><span>0${i+1}</span>${name}<small>${key.toUpperCase()}</small></button>`).join('')}</div>
  <div class="control-row"><span>หันหน้า</span><div class="segmented"><button data-facing="left" class="active">← ซ้าย</button><button data-facing="right">ขวา →</button></div></div>
  <div class="control-row"><label for="speed">ความเร็ว</label><select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></div>
  <button id="download" class="download">ดาวน์โหลด PNG ท่านี้ ↓</button></section>
  <section class="reference-card"><div><p class="eyebrow">02 / ORIGINAL ART</p><h3>หน้าตาเดิม<br>ชีวิตใหม่</h3><p>ใช้ภาพเดิมเป็นต้นแบบ<br>วาดท่าทางแบบเต็มตัว</p></div><img src="/sprites/mosskin_2d/reference.png" alt="ภาพ Mosskin ต้นฉบับ"/></section></aside></section>
  <footer><span>5 ท่า · ซ้าย–ขวา · พื้นโปร่งใส</span><span>ต้นแบบ 2D จากภาพเต็มตัว · ท่าเดิน 6 ภาพวาด</span></footer></main>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
// Keep a direct, bookmarkable review link for each character.
const selector = document.createElement('div'); selector.className = 'character-picker';
selector.innerHTML = `<label for="character">เลือกตัวที่ต้องการตรวจ</label><select id="character">${catalog.map(c => `<option value="${c.id}">${c.number} · ${c.name}</option>`).join('')}</select><span>${creature.gameMonster ? 'มีตัวตรงกับข้อมูลเกม' : 'ชุดภาพสำหรับตรวจ · ยังไม่มีชื่อเดียวกันในข้อมูลเกม'}</span>`;
document.querySelector('.intro')!.after(selector);
$<HTMLSelectElement>('character').value = creature.id;
$<HTMLSelectElement>('character').onchange = e => {
  const url = new URL(location.href); url.searchParams.set('character', (e.target as HTMLSelectElement).value); location.assign(url);
};
document.querySelector('.status')!.textContent = `● 2D STUDY · ${creature.number}`;
document.querySelector('.subtitle')!.textContent = `${creature.name} จากภาพต้นฉบับ สู่ตัวละคร 2D ที่ขยับได้`;
document.querySelector('.edition')!.innerHTML = `${creature.number}<span>${creature.name.toUpperCase()}</span>`;
document.querySelector('.stage-top > span')!.innerHTML = `<i></i> ${creature.name.toUpperCase()} <small>${creature.label}</small>`;
document.querySelector('.stage-label')!.textContent = `DAWNMEADOW SPECIMEN / ${creature.number}`;
const reference = document.querySelector<HTMLImageElement>('.reference-card img')!;
reference.src = `/sprites/${creature.id}_2d/reference.png`; reference.alt = `ภาพ ${creature.name} ต้นฉบับ`;
if (isSporeling) {
  names.walk[1] = 'ก้าวเท้าสลับ 6 จังหวะ · ภาพเต็มตัว';
  names.attack[1] = 'ย่อตัว ง้าง แล้วเข้าชนด้วยหมวกเห็ด';
  names.death[1] = 'เข่าทรุด เสียหลัก แล้วล้มตะแคง';
}
if (creature.id !== 'mosskin' && !isSporeling) {
  names.walk[1] = creature.hovering ? 'จังหวะบินหรือลอย 6 ภาพเต็มตัว' : 'จังหวะเคลื่อนที่ 6 ภาพเต็มตัว';
  names.attack[1] = 'เตรียมแรง ออกท่า แล้วกลับมาทรงตัว';
  names.death[1] = 'เสียหลัก ทรุด แล้วค้างท่าล้ม';
}
let clip: AnimName = 'idle', elapsed = 0, playing = true, facing = false, speed = 1, mode = 'art';
let data: ReturnType<typeof makeMosskinSheets>;
let actor: SpriteActor, renderer: THREE.WebGLRenderer;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1.25, 1.25, 1.25, -1.25, .01, 100);
camera.position.set(0, 2.5, 4); camera.lookAt(0, .55, 0);
const art = $<HTMLCanvasElement>('art'), ctx = art.getContext('2d')!;
const stage = $('stage');
function duration() { return CLIPS[clip].frames / CLIPS[clip].fps; }
function frame() { return Math.min(CLIPS[clip].frames - 1, Math.floor(elapsed * CLIPS[clip].fps)); }
function setClip(name: AnimName) {
  clip = name; elapsed = 0; playing = true;
  document.querySelectorAll<HTMLButtonElement>('[data-clip]').forEach(el => el.classList.toggle('active', el.dataset.clip === name));
  $('clip-note').textContent = names[name][1]; $('frame-count').textContent = `${CLIPS[name].frames} FRAMES`;
  $('play').textContent = 'หยุด';
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight, dpr = Math.min(devicePixelRatio, 2);
  art.width = w * dpr; art.height = h * dpr;
  art.style.width = `${w}px`; art.style.height = `${h}px`;
  if (renderer) { renderer.setSize(w,h); camera.left = -1.05*w/h; camera.right = 1.05*w/h; camera.top = 1.05; camera.bottom = -1.05; camera.updateProjectionMatrix(); }
}
function draw() {
  if (!data) return;
  const dpr = Math.min(devicePixelRatio, 2), w = art.width / dpr, h = art.height / dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
  const size = Math.min(w * .78, h * .94), ground = h * .91;
  const shadow = ctx.createRadialGradient(w/2,ground,1,w/2,ground,size*.34);
  shadow.addColorStop(0,'#050e0a80'); shadow.addColorStop(1,'#050e0a00');
  ctx.save(); ctx.translate(w/2,ground); ctx.scale(1,.18); ctx.translate(-w/2,-ground);
  ctx.fillStyle=shadow; ctx.fillRect(w/2-size/2,ground-size/2,size,size); ctx.restore();
  ctx.save(); ctx.translate(w/2,ground - 346/FRAME*size);
  ctx.scale(facing?-1:1,1);
  ctx.drawImage(data.sheets[clip],frame()*FRAME,0,FRAME,FRAME,-size/2,0,size,size); ctx.restore();
  if (mode === 'game') {
    actor.revive(); actor.setBase('idle'); actor.heading = facing ? Math.PI / 2 : -Math.PI / 2;
    if (clip === 'idle' || clip === 'walk') actor.setBase(clip); else actor.play(clip);
    actor.update(elapsed*1000,camera,0); renderer.render(scene,camera);
  }
  $<HTMLInputElement>('timeline').value = String(Math.round(elapsed / duration()*1000));
  $('time').textContent = `${elapsed.toFixed(2)}s`;
}
function download(name: string, url: string) { const a=document.createElement('a'); a.download=name; a.href=url; a.click(); }
document.querySelectorAll<HTMLButtonElement>('[data-clip]').forEach(el => el.onclick = () => setClip(el.dataset.clip as AnimName));
document.querySelectorAll<HTMLButtonElement>('[data-facing]').forEach(el => el.onclick = () => {
  facing = el.dataset.facing === 'right';
  document.querySelectorAll('[data-facing]').forEach(b => b.classList.toggle('active',b === el));
});
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(el => el.onclick = () => {
  mode = el.dataset.mode!; art.hidden = mode === 'game'; $('game-stage').hidden = mode !== 'game';
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active',b === el)); resize();
});
$('play').onclick=()=> { playing=!playing; if (elapsed>=duration()) elapsed=0; $('play').textContent=playing?'หยุด':'เล่น'; };
$('replay').onclick=()=>setClip(clip);
$<HTMLInputElement>('timeline').oninput=e=>{playing=false; elapsed=Number((e.target as HTMLInputElement).value)/1000*duration(); $('play').textContent='เล่น';};
$<HTMLSelectElement>('speed').onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
$('download').onclick=()=>{if(data) download(`${creature.id}_2d_${clip}.png`,data.sheets[clip].toDataURL('image/png'));};
new ResizeObserver(resize).observe(stage);

try {
  data = isSporeling ? await createSporelingSheets() : creature.id === 'mosskin'
    ? makeMosskinSheets(await loadMosskinParts()) : await createPaintedSheets(creature.id, creature.hovering);
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
  $('game-stage').append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x597849,2));
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.2,.09,64),new THREE.MeshLambertMaterial({color:0x527455})); floor.position.y=-.07; scene.add(floor);
  const grid=new THREE.GridHelper(2,8,0x87a57a,0x688663); grid.position.y=-.019; scene.add(grid);
  actor=new SpriteActor(spriteFromImages(data.json,data.sheets)); scene.add(actor.root);
  $('loading').hidden=true; resize();
  // Export and inspection use the exact sheets rendered by the game's SpriteActor.
  const review = {
    ready:true,
    snapshot:()=>({character:creature.id,clip,frame:frame(),elapsed,playing,facing: facing?'right':'left',mode}),
    export:()=>({json:data.json,images:Object.fromEntries(Object.entries(data.sheets).map(([k,v])=>[k,v.toDataURL('image/png')]))}),
  };
  Object.assign(window, { __sprite2d: review, ...(creature.id === 'mosskin' ? { __mosskin2d: review } : {}) });
  let previous=performance.now();
  const tick=(now:number)=>{
    const dt=Math.min((now-previous)/1000,.1); previous=now;
    if(playing){ elapsed+=dt*speed; if(elapsed>=duration()) { if(clip==='idle'||clip==='walk') elapsed%=duration(); else {elapsed=duration();playing=false;$('play').textContent='เล่น';} } }
    draw(); requestAnimationFrame(tick);
  }; requestAnimationFrame(tick);
} catch (error) { $('loading').textContent=`เปิดภาพไม่สำเร็จ: ${String(error)}`; console.error(error); }
