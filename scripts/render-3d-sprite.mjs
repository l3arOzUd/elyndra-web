// Renders an animated GLB (tools/rig_monsters.py) into game sprite sheets, the
// RO way: five facings (W, S, SW, NW, N; the east ones mirror) for every clip,
// through an orthographic camera pitched like the game's (50 degrees), so the
// card the game draws facing the camera looks like the model would.
//
//   node scripts/render-3d-sprite.mjs <model.glb> <sprite id> [--frame 256] [--ppc 150] [--pivot-y 186] [--outline 2]
//
// Writes public/sprites/<id>/{idle,walk,attack,hit,death}.png and <id>.sprite.json.
// Three.js runs in headless Chromium; files are served by request interception,
// so no server or port is opened. PLAYWRIGHT_MODULE / CHROMIUM_PATH as in
// check-game-ui.mjs.
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf("--" + name); return i >= 0 ? Number(args[i + 1]) : fallback; };
const [modelPath, id] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!modelPath || !id) throw new Error("usage: render-3d-sprite.mjs <model.glb> <sprite id>");
const FRAME = opt("frame", 256), PPC = opt("ppc", 150), PIVOT_Y = opt("pivot-y", 186), OUTLINE = opt("outline", 2), PITCH = 50;
const ROWS = ["W", "S", "SW", "NW", "N"];
// Facing yaw for each row: the model faces +Z (toward the camera, "S").
const YAW = { S: 0, SW: -Math.PI / 4, W: -Math.PI / 2, NW: (-3 * Math.PI) / 4, N: Math.PI };
// Sprite clip <- GLB clip, frames, and how the game plays it.
const CLIPS = [
  { name: "idle", clip: "Idle", frames: 16, loop: true },
  { name: "walk", clip: "Walk", frames: 8, loop: true, refMsPerCell: 200 },
  { name: "attack", clip: "Attack", frames: 12, hitAt: 0.4 },
  { name: "hit", clip: "Hit", frames: 8 },
  { name: "death", clip: "Die", frames: 16, hold: true },
];

const page_html = `<!doctype html><html><head><script type="importmap">
{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head>
<body style="margin:0;background:transparent"><script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
window.render = async (cfg) => {
  const { FRAME, PPC, PIVOT_Y, PITCH, ROWS, YAW, CLIPS } = cfg;
  const S = 2; // supersample, then downscale into the sheet
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(FRAME * S, FRAME * S);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  // Bright, mostly even light on a matte (Lambert) surface: the generated
  // texture already carries painted shading; the sun only adds form from the
  // upper left, like the painted sprites.
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x9a9a84, 2.6));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.0);
  sun.position.set(-3, 6, 4);
  scene.add(sun);
  const gltf = await new GLTFLoader().loadAsync("/model.glb");
  const model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    o.material = new THREE.MeshLambertMaterial({ map: old.map, color: 0xffffff });
    old.dispose();
  });
  scene.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const half = FRAME / 2 / PPC;
  const cam = new THREE.OrthographicCamera(-half, half, PIVOT_Y / PPC, -(FRAME - PIVOT_Y) / PPC, 0.1, 100);
  const p = PITCH * Math.PI / 180;
  cam.position.set(0, Math.sin(p) * 20, Math.cos(p) * 20);
  cam.lookAt(0, 0, 0);
  // A dark outline round the silhouette, like the painted sprites' line work.
  const OUTLINE = cfg.OUTLINE * S, LINE = "rgba(38,30,22,0.9)";
  const tmp = document.createElement("canvas"); tmp.width = tmp.height = FRAME * S;
  const tg = tmp.getContext("2d");
  const lined = document.createElement("canvas"); lined.width = lined.height = FRAME * S;
  const lg = lined.getContext("2d");
  const frameImage = () => {
    tg.globalCompositeOperation = "copy"; tg.drawImage(renderer.domElement, 0, 0);
    tg.globalCompositeOperation = "source-in"; tg.fillStyle = LINE; tg.fillRect(0, 0, tmp.width, tmp.height);
    lg.clearRect(0, 0, lined.width, lined.height);
    for (let a = 0; a < 16; a++) lg.drawImage(tmp, Math.cos(a * Math.PI / 8) * OUTLINE, Math.sin(a * Math.PI / 8) * OUTLINE);
    lg.drawImage(renderer.domElement, 0, 0);
    return lined;
  };
  const out = {};
  for (const c of CLIPS) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, c.clip);
    if (!clip) throw new Error("no clip " + c.clip);
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();
    const sheet = document.createElement("canvas");
    sheet.width = FRAME * c.frames; sheet.height = FRAME * ROWS.length;
    const g = sheet.getContext("2d");
    g.imageSmoothingQuality = "high";
    for (let r = 0; r < ROWS.length; r++) {
      model.rotation.y = YAW[ROWS[r]];
      for (let i = 0; i < c.frames; i++) {
        const t = clip.duration * (c.loop ? i / c.frames : i / (c.frames - 1));
        mixer.setTime(Math.min(t, clip.duration - 1e-4));
        renderer.render(scene, cam);
        g.drawImage(frameImage(), i * FRAME, r * FRAME, FRAME, FRAME);
      }
    }
    out[c.name] = { png: sheet.toDataURL("image/png"), duration: clip.duration };
  }
  return out;
};
window.ready = true;
</script></body></html>`;

const MIME = { ".js": "text/javascript", ".glb": "model/gltf-binary", ".html": "text/html" };
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("page:", e));
  await page.route("http://render.local/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = path === "/" ? null : path === "/model.glb" ? resolve(modelPath) : path.startsWith("/three/") ? join(web, "node_modules", path) : null;
    if (path === "/") return route.fulfill({ body: page_html, contentType: "text/html" });
    if (!file) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: await readFile(file), contentType: MIME[extname(file)] ?? "application/octet-stream" });
  });
  await page.goto("http://render.local/");
  await page.waitForFunction(() => window.ready === true);
  const sheets = await page.evaluate((cfg) => window.render(cfg), { FRAME, PPC, PIVOT_Y, OUTLINE, PITCH, ROWS, YAW, CLIPS });
  const dir = join(web, "public", "sprites", id);
  await mkdir(dir, { recursive: true });
  const animations = {};
  for (const c of CLIPS) {
    const { png, duration } = sheets[c.name];
    await writeFile(join(dir, c.name + ".png"), Buffer.from(png.split(",")[1], "base64"));
    const fps = Math.round(((c.loop ? c.frames : c.frames - 1) / duration) * 10) / 10;
    animations[c.name] = { file: c.name + ".png", frames: c.frames, fps, ...(c.loop ? { loop: true } : {}), ...(c.refMsPerCell ? { refMsPerCell: c.refMsPerCell } : {}),
      ...(c.hitAt ? { events: { hit: Math.round(c.hitAt * (c.frames - 1)) } } : {}), ...(c.hold ? { hold: true } : {}) };
  }
  const json = { id, kind: "sheet", facingMode: "directional", frame: { w: FRAME, h: FRAME }, pivot: { x: FRAME / 2, y: PIVOT_Y }, pixelsPerCell: PPC,
    rows: ROWS, mirror: { E: "W", SE: "SW", NE: "NW" }, animations, source: { model: modelPath.replace(/\\/g, "/"), renderer: "scripts/render-3d-sprite.mjs", pitch: PITCH } };
  await writeFile(join(dir, id + ".sprite.json"), JSON.stringify(json, null, 2) + "\n");
  console.log(`${id}: ${CLIPS.map((c) => c.name + " " + c.frames + "f").join(", ")} x ${ROWS.length} facings at ${FRAME}px -> ${dir}`);
} finally {
  await browser.close();
}
