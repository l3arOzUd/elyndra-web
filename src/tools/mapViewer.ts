import * as THREE from "three";
import { loadContent, loadLayout } from "../data/content";
import { IsoCamera } from "../render/camera";
import { loadEnvArt } from "../render/envArt";
import { animate, buildMap } from "../render/terrain";
import { buildHeroSprite } from "../render/heroSprite";
import { SpriteActor } from "../render/spriteActor";
import { sceneLighting } from "../render/sceneLighting";

// Map viewer: any map's terrain, props and lighting as the game draws them,
// with no server, for checking how maps look. A stand-in hero shows scale.
// ?map=<id>&x=<cell>&y=<cell>&zoom=<steps> picks the view; arrow keys or
// WASD pan, the wheel zooms, [ and ] step through maps. window.view(map, x,
// y, zoom) jumps (for screenshots) and resolves once the painted tiles load.

const params = new URLSearchParams(location.search);
const app = document.getElementById("app")!;
app.innerHTML = `<div id="view" style="position:fixed;inset:0;background:#1d2f27"></div>
<div style="position:fixed;left:8px;top:8px;max-width:calc(100vw - 16px);padding:10px;background:rgba(16,28,21,.94);color:#f2e6c8;font:14px sans-serif;border-radius:4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
<button id="previous" aria-label="แผนที่ก่อนหน้า">◀</button><select id="maps" aria-label="เลือกแผนที่" style="max-width:70vw;padding:6px"></select><button id="next" aria-label="แผนที่ถัดไป">▶</button>
<select id="places" aria-label="เลือกจุดชม" style="padding:6px"></select><a href="/maps.html" style="color:#d8dba4">รายชื่อทั้งหมด</a>
<span id="bar"></span><small style="width:100%">WASD / ลูกศร: เลื่อน · ล้อเมาส์: ซูม · หุ่นเทียบขนาด · ไม่มีมอนสเตอร์หรือผู้เล่นจริงในหน้าตรวจฉาก</small></div>`;
const view = document.getElementById("view")!;
const bar = document.getElementById("bar")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1d2f27);
const moveSun = sceneLighting(scene, renderer);
const cam = new IsoCamera(1);
const hero = new SpriteActor(buildHeroSprite(), {});
scene.add(hero.root);

const content = await loadContent();
await loadEnvArt();
const mapIds = [...content.maps.keys()];
const picker = document.querySelector<HTMLSelectElement>('#maps')!;
const places = document.querySelector<HTMLSelectElement>('#places')!;
for(const def of content.maps.values()) picker.add(new Option(`${def.name} · Lv ${def.recommended_level_min}–${def.recommended_level_max} · ${def.id==='lum_fld_01'?'กำลังปรับฉาก':'ภาพเดิม'}`,def.id));
let built: ReturnType<typeof buildMap> | null = null;
let mapId = "";
const focus = new THREE.Vector3();
const keys = new Set<string>();
let request = 0;

async function show(id: string, x?: number, y?: number, zoom = 0): Promise<void> {
  const def = content.maps.get(id);
  if (!def) throw new Error(`no map ${id}`);
  const token = ++request;
  const layout = await loadLayout(content, id);
  if(token!==request)return;
  if (built) { built.group.removeFromParent(); built.dispose(); }
  const region = content.regions.get(def.region_id);
  built = buildMap(layout, region, content.warps.filter((w) => w.from_map === id));
  scene.add(built.group);
  scene.fog = new THREE.Fog(region?.palette.fog ?? "#1d2f27", 120, 260);
  (scene.background as THREE.Color).set(region?.palette.fog ?? "#1d2f27");
  mapId = id;
  focus.set(x ?? layout.width / 2, 0, y ?? layout.height / 2);
  cam.target.copy(focus);
  cam.reset();
  cam.zoom(zoom);
  bar.textContent = `${def.name} (${id}) · ${layout.width}×${layout.height}`;
  await built.ready;
  if(token!==request)return;
  picker.value=id;
  places.replaceChildren(new Option('กลางแผนที่',''));
  const spots: [string,number,number][] = id==='lum_fld_01'
    ? [['แคมป์',14,96],['บ้านไร่ร้าง',72,57],['โรงนาถล่ม',90,45],['โรงสีน้ำ',139,112],['สวนเก่า / บ่อน้ำ',106,131],['ซากท่อส่งน้ำ',84,87]]
    : [['ทางเข้า',def.arrival[0],def.arrival[1]], ...layout.landmarks.map(l=>[l.name,l.x,l.y] as [string,number,number])];
  for(const [name,x,z]of spots)places.add(new Option(name,`${x},${z}`));
  history.replaceState(null,'',`?map=${id}&x=${focus.x}&y=${focus.z}`);
}
picker.onchange=()=>{void show(picker.value);};
const step=(delta:number)=>{void show(mapIds[(mapIds.indexOf(mapId)+delta+mapIds.length)%mapIds.length]);};
document.querySelector<HTMLButtonElement>('#previous')!.onclick=()=>step(-1);
document.querySelector<HTMLButtonElement>('#next')!.onclick=()=>step(1);
places.onchange=()=>{const [x,z]=places.value?places.value.split(',').map(Number):[content.maps.get(mapId)!.width_cells/2,content.maps.get(mapId)!.height_cells/2];focus.set(x,0,z);cam.target.copy(focus);history.replaceState(null,'',`?map=${mapId}&x=${x}&y=${z}`);};

(window as unknown as { view: typeof show }).view = show;
addEventListener("keydown", (e) => {
  if((e.target as HTMLElement)?.closest('select,button,input'))return;
  keys.add(e.key);
  if (e.key === "[" || e.key === "]") {
    const i = (mapIds.indexOf(mapId) + (e.key === "]" ? 1 : mapIds.length - 1)) % mapIds.length;
    void show(mapIds[i]);
  }
});
addEventListener("keyup", (e) => keys.delete(e.key));
view.addEventListener("wheel", (e) => cam.zoom(Math.sign(e.deltaY)));
addEventListener('blur',()=>keys.clear());

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  cam.camera.aspect = innerWidth / innerHeight;
  cam.camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const pan = 30 * dt;
  if (keys.has("ArrowLeft") || keys.has("a")) focus.x -= pan;
  if (keys.has("ArrowRight") || keys.has("d")) focus.x += pan;
  if (keys.has("ArrowUp") || keys.has("w")) focus.z -= pan;
  if (keys.has("ArrowDown") || keys.has("s")) focus.z += pan;
  hero.root.position.copy(focus);
  cam.update(dt, focus);
  moveSun(focus);
  hero.update(dt * 1000, cam.camera, cam.yaw);
  if (built) animate(built, dt);
  renderer.render(scene, cam.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

await show(params.get("map") ?? "lum_fld_01", params.has("x") ? Number(params.get("x")) : undefined, params.has("y") ? Number(params.get("y")) : undefined, Number(params.get("zoom") ?? 0));
