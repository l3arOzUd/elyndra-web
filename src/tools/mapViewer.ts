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
<div id="bar" style="position:fixed;left:8px;top:8px;padding:4px 8px;background:rgba(0,0,0,.55);color:#f2e6c8;font:13px sans-serif;border-radius:4px"></div>`;
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
let built: ReturnType<typeof buildMap> | null = null;
let mapId = "";
const focus = new THREE.Vector3();
const keys = new Set<string>();

async function show(id: string, x?: number, y?: number, zoom = 0): Promise<void> {
  const def = content.maps.get(id);
  if (!def) throw new Error(`no map ${id}`);
  const layout = await loadLayout(content, id);
  if (built) { built.group.removeFromParent(); built.dispose(); }
  const region = content.regions.get(def.region_id);
  built = buildMap(layout, region, content.warps.filter((w) => w.from_map === id));
  scene.add(built.group);
  scene.fog = new THREE.Fog(region?.palette.fog ?? "#1d2f27", 120, 260);
  (scene.background as THREE.Color).set(region?.palette.fog ?? "#1d2f27");
  mapId = id;
  focus.set(x ?? layout.width / 2, 0, y ?? layout.height / 2);
  cam.target.copy(focus);
  cam.zoom(zoom);
  bar.textContent = `${def.name} (${id}) · ${layout.width}×${layout.height}`;
  await built.ready;
}

(window as unknown as { view: typeof show }).view = show;
addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (e.key === "[" || e.key === "]") {
    const i = (mapIds.indexOf(mapId) + (e.key === "]" ? 1 : mapIds.length - 1)) % mapIds.length;
    void show(mapIds[i]);
  }
});
addEventListener("keyup", (e) => keys.delete(e.key));
addEventListener("wheel", (e) => cam.zoom(Math.sign(e.deltaY)));

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
