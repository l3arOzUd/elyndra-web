import type { BasicAnimName as AnimName, SpriteDefJson } from '../render/spriteDef';
import './spriteGallery.css';
interface Creature { id: string; name: string; number: string; gameMonster: string | null }
const catalog: Creature[] = await (await fetch('/sprites/painted-catalog.json')).json();
const labels: Record<AnimName,string> = {idle:'ยืน',walk:'เดิน / เคลื่อนที่',attack:'โจมตี',hit:'โดนตี',death:'ตาย'};
document.querySelector('#app')!.innerHTML = `<header><a href="/">ELYNDRA <span>/ ART ATELIER</span></a><a href="/sprite-viewer.html?character=ambermite">ตรวจทีละตัว ↗</a></header>
<main><p class="eyebrow">LUMERIS · 25 CREATURES</p><h1>A world in <em>motion.</em></h1><p class="intro">เลือกท่าเพื่อดูทั้งชุด หรือเปิดตัวที่ต้องการตรวจแบบทีละเฟรม</p>
<section class="toolbar" aria-label="ควบคุมแอนิเมชัน"><div>${Object.entries(labels).map(([key,label])=>`<button data-clip="${key}" class="${key==='walk'?'active':''}">${label}</button>`).join('')}</div><div><button id="flip">หันขวา →</button><button id="pause">หยุด</button><button id="replay">เริ่มใหม่ ↻</button></div></section>
<div class="gallery">${catalog.map(c=>`<article><a href="/sprite-viewer.html?character=${c.id}"><div class="card-top"><span>${c.number}</span><small>${c.gameMonster?'ใช้ในเกม':'พร้อมตรวจ'}</small></div><canvas width="384" height="384" aria-label="${c.name}"></canvas><h2>${c.name}<span>↗</span></h2></a><p class="load-note">กำลังโหลด…</p></article>`).join('')}</div><footer>5 ท่า · ซ้าย–ขวา · กดเปิดแต่ละตัวเพื่อหยุดและเลื่อนดูเฟรม</footer></main>`;
let clip: AnimName='walk', elapsed=0, playing=true, flipped=false, previous=performance.now(), revision=0;
const cards=[...document.querySelectorAll('article')].map((el,i)=>({el,c:catalog[i],canvas:el.querySelector('canvas')!,image:null as ImageBitmap|null,def:null as SpriteDefJson|null}));
async function loadClip() {
  const token=++revision; elapsed=0;
  await Promise.all(cards.map(async card=>{
    card.image?.close(); card.image=null;
    const note=card.el.querySelector('.load-note')!; note.textContent='กำลังโหลด…';
    try {
      const base=`/sprites/${card.c.id}_2d/`;
      card.def ??= await (await fetch(base+card.c.id+'_2d.sprite.json')).json();
      if(token!==revision)return;
      const spec=card.def!.animations[clip]!;
      const response=await fetch(base+spec.file);
      if(!response.ok)throw Error('HTTP '+response.status);
      // Explicitly release old decoded sheets; keep gallery previews at half resolution.
      const img=await createImageBitmap(await response.blob(),{resizeWidth:spec.frames*192,resizeHeight:192,resizeQuality:'high'});
      if(token!==revision){img.close();return;}
      card.image=img; note.textContent=labels[clip];
    } catch(error) { console.error(card.c.id, clip, error); if(token===revision)note.textContent='โหลดไม่สำเร็จ — เปิดตรวจรายตัว'; }
  }));
  if(token===revision)elapsed=0;
}
document.querySelectorAll<HTMLButtonElement>('[data-clip]').forEach(button=>button.onclick=()=>{
  clip=button.dataset.clip as AnimName;
  document.querySelectorAll('[data-clip]').forEach(b=>b.classList.toggle('active',b===button));
  void loadClip();
});
document.querySelector<HTMLButtonElement>('#pause')!.onclick=e=>{playing=!playing;(e.currentTarget as HTMLElement).textContent=playing?'หยุด':'เล่นต่อ';};
document.querySelector<HTMLButtonElement>('#flip')!.onclick=e=>{flipped=!flipped;(e.currentTarget as HTMLElement).textContent=flipped?'← หันซ้าย':'หันขวา →';};
document.querySelector<HTMLButtonElement>('#replay')!.onclick=()=>{elapsed=0;};
function animate(now:number) {
  if(playing)elapsed+=Math.min((now-previous)/1000,.1);previous=now;
  for(const card of cards) {
    const ctx=card.canvas.getContext('2d')!;ctx.clearRect(0,0,384,384);
    if(!card.image||!card.def)continue;
    const anim=card.def.animations[clip]!;const tick=Math.floor(elapsed*anim.fps);
    const frame=anim.loop?tick%anim.frames:Math.min(tick,anim.frames-1);
    ctx.save();if(flipped){ctx.translate(384,0);ctx.scale(-1,1);}
    ctx.drawImage(card.image,frame*192,0,192,192,0,0,384,384);ctx.restore();
  }
  requestAnimationFrame(animate);
}
void loadClip();requestAnimationFrame(animate);
