import * as THREE from "three";
import { IsoCamera } from "../render/camera";
import { Fx, COLORS } from "../render/fx";
import { buildHeroSprite } from "../render/heroSprite";
import { SpriteActor } from "../render/spriteActor";
import { Overlay } from "../ui/overlay";
import type { SkillDef } from "../data/schema";
import { headingOf } from "../shared/dir";
import "../style.css";

// Skill effect viewer: plays any skill's cast (cast bar, warning, magic
// circle) and release on grass, the way the game does when the server's
// cast and hit arrive, with stand-in targets for the impacts. No server.
// ?skill=<id> picks one; window.castNow(id) casts it (for screenshots).

const app = document.getElementById("app")!;
app.innerHTML = `<div id="view" style="position:fixed;inset:0;background:#1d2f27"><div class="overlay" style="position:absolute;inset:0;pointer-events:none"></div></div>
<div id="bar" style="position:fixed;left:8px;top:8px;display:flex;flex-wrap:wrap;gap:4px;max-width:calc(100vw - 16px);font:12px sans-serif"></div>`;
const view = document.getElementById("view")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.prepend(renderer.domElement);
const scene = new THREE.Scene();
const cam = new IsoCamera(1);
const fx = new Fx(scene);
const overlay = new Overlay(view.querySelector<HTMLElement>(".overlay")!);

const grass = new THREE.TextureLoader().load("/textures/lum/grass.png");
grass.colorSpace = THREE.SRGBColorSpace;
grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
grass.repeat.set(20, 20);
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: grass })));

const hero = new SpriteActor(buildHeroSprite());
scene.add(hero.root);
const label = overlay.label("FxViewer", "tag-self", true);
label.setHp(1, 1);
// Stand-in targets scattered round the hero (sample data, not server state).
const targets = Array.from({ length: 24 }, (_, i) => {
  const a = i * 2.39996, r = 1.5 + (i % 6) * 1.1;
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0x3f8a55 }));
  m.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r);
  scene.add(m);
  return m;
});

const skills: SkillDef[] = await (await fetch("/data/skills.json")).json();
const aim = new THREE.Vector3(0, 0, 4);

function inArea(s: SkillDef, p: THREE.Vector3) {
  const heading = Math.atan2(aim.z, aim.x);
  const d = Math.hypot(p.x, p.z);
  switch (s.shape) {
    case "cone": return d <= (s.radius ?? 1) && Math.abs(Math.atan2(Math.sin(Math.atan2(p.z, p.x) - heading), Math.cos(Math.atan2(p.z, p.x) - heading))) <= ((s.angle_deg ?? 90) * Math.PI) / 360;
    case "line": { const along = p.x * Math.cos(heading) + p.z * Math.sin(heading), side = -p.x * Math.sin(heading) + p.z * Math.cos(heading); return along >= 0 && along <= (s.length ?? 8) && Math.abs(side) <= (s.width ?? 2) / 2; }
    case "ground": case "pull": return p.distanceTo(aim) <= (s.radius ?? 1);
    case "circle": return d <= (s.radius ?? 1);
    default: return false;
  }
}

// The viewer's own clock, so a cast can stop at an exact moment for a
// screenshot: castNow(id, freezeMs) freezes it freezeMs after the cast.
let clock = 0, castAt = 0, freezeAt = Infinity;
let queue: { at: number; fn: () => void }[] = [];
const later = (ms: number, fn: () => void) => queue.push({ at: clock + ms, fn });

function castNow(id: string, freezeMs?: number) {
  const s = skills.find((k) => k.id === id);
  if (!s) return;
  fx.clear();
  queue = [];
  castAt = clock;
  freezeAt = freezeMs === undefined ? Infinity : clock + freezeMs;
  Object.assign(window, { frozen: false });
  const castMs = Math.max(150, s.cast_ms);
  hero.heading = headingOf(aim.x, aim.z);
  fx.telegraph(s, 0, 0, aim.x, aim.z, castMs);
  if (s.cast_ms > 0) label.cast(s.name, castMs);
  if (s.shape === "mobility") fx.trail(0, 0, aim.x, aim.z);
  if (s.ticks && s.tick_ms) fx.field(s, aim.x, aim.z, s.ticks * s.tick_ms + castMs);
  const hits = targets.filter((t) => inArea(s, t.position));
  const step = s.hits && s.hits > 1 ? s.hit_ms ?? 180 : 0;
  for (let tick = 0; tick < (s.ticks ?? 1); tick++) {
    later(castMs + tick * (s.tick_ms ?? 0), () => {
      fx.shaped(s, 0, 0, aim.x, aim.z);
      for (let k = 0; k < (step ? s.hits! : 1); k++) {
        later(k * step, () => { for (const t of hits) fx.impact(t.position.clone().setY(0.4), COLORS[s.id] ?? 0xffffff); });
      }
    });
  }
}
Object.assign(window, { castNow });

const bar = document.getElementById("bar")!;
for (const s of skills) {
  const b = document.createElement("button");
  b.textContent = s.name;
  b.onclick = () => castNow(s.id);
  bar.append(b);
}
renderer.domElement.addEventListener("pointerdown", (e) => {
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, cam.camera);
  ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), aim);
});

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dtMs = Math.min(100, now - last);
  last = now;
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h);
  cam.camera.aspect = w / h;
  cam.camera.updateProjectionMatrix();
  cam.update(dtMs / 1000, hero.root.position);
  hero.update(dtMs, cam.camera, cam.yaw);
  const step = Math.max(0, Math.min(dtMs, freezeAt - clock));
  clock += step;
  const due = queue.filter((q) => q.at <= clock);
  queue = queue.filter((q) => q.at > clock);
  for (const q of due) q.fn();
  fx.update(step);
  if (clock >= freezeAt && !(window as { frozen?: boolean }).frozen) {
    // Stop the cast bar where the cast is, too.
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = clock - castAt; }
    Object.assign(window, { frozen: true });
  }
  label.place(new THREE.Vector3(0, hero.height + 0.35, 0), cam.camera, w, h);
  overlay.update(dtMs, cam.camera, w, h);
  renderer.render(scene, cam.camera);
});
const first = new URLSearchParams(location.search).get("skill");
if (first) setTimeout(() => castNow(first), 800);
