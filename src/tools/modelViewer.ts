// Model Check page (/model-viewer.html): turn a generated monster model
// around, see its wireframe and the in-game camera angle, before it goes
// into the sprite pipeline. Lists public/models/monsters/index.json.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3238);
scene.add(new THREE.HemisphereLight(0xeef6ff, 0x4b5b3a, 1.6));
const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
sun.position.set(2, 4, 3);
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x5e8c56 }));
scene.add(ground);
// Red arrow: the model's in-game "front" (+Z).
scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.02, 0), 1.2, 0xff4040, 0.15, 0.08));

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
camera.position.set(0, 0.8, 3.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.45, 0);
controls.enableDamping = true;

let model: THREE.Object3D | null = null;
let loadRequest = 0;
const loader = new GLTFLoader();

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

const litMats = new Map<THREE.Mesh, THREE.Material>();
const unlitMats = new Map<THREE.Mesh, THREE.MeshBasicMaterial>();
function setUnlit(on: boolean) {
  model?.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (!litMats.has(o)) litMats.set(o, o.material as THREE.Material);
    const lit = litMats.get(o) as THREE.MeshStandardMaterial;
    if (!unlitMats.has(o)) unlitMats.set(o, new THREE.MeshBasicMaterial({ map: lit.map, wireframe: lit.wireframe }));
    unlitMats.get(o)!.wireframe = lit.wireframe;
    o.material = on ? unlitMats.get(o)! : lit;
  });
}

function setWire(on: boolean) {
  model?.traverse((o) => {
    if (o instanceof THREE.Mesh) (o.material as THREE.MeshStandardMaterial).wireframe = on;
  });
}

async function load(name: string) {
  const request = ++loadRequest;
  $("info").textContent = `กำลังโหลด ${name}…`;
  try {
  const gltf = await loader.loadAsync(`models/monsters/${name}.glb`);
  if (request !== loadRequest) { disposeModel(gltf.scene); return; }
  if (model) { scene.remove(model); disposeModel(model); }
  model = gltf.scene;
  scene.add(model);
  let tris = 0, texSize = "";
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      const map = (o.material as THREE.MeshStandardMaterial).map;
      const img = map?.image as { width?: number; height?: number } | undefined;
      if (img?.width) texSize = `${img.width}×${img.height}`;
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  $("info").textContent = `${name} · ${Math.round(tris).toLocaleString()} triangles · texture ${texSize} · ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`;
  litMats.clear();
  unlitMats.clear();
  setWire(($("wire") as HTMLInputElement).checked);
  setUnlit(($("unlit") as HTMLInputElement).checked);
  } catch (error) {
    if (request === loadRequest) $("info").textContent = `เปิดโมเดลไม่สำเร็จ: ${String(error)}`;
  }
}

function disposeModel(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    for (const value of [o.material, litMats.get(o), unlitMats.get(o)]) {
      for (const mat of Array.isArray(value) ? value : value ? [value] : []) {
        materials.add(mat);
        for (const prop of Object.values(mat)) if (prop instanceof THREE.Texture) textures.add(prop);
      }
    }
    litMats.delete(o); unlitMats.delete(o);
  });
  materials.forEach(mat => mat.dispose());
  textures.forEach(texture => texture.dispose());
}

function front() {
  const d = camera.position.distanceTo(controls.target);
  const game = ($("game") as HTMLInputElement).checked;
  const pitch = game ? THREE.MathUtils.degToRad(50) : THREE.MathUtils.degToRad(8);
  camera.position.set(0, controls.target.y + Math.sin(pitch) * d, Math.cos(pitch) * d);
}

$("front").onclick = front;
$("game").onchange = front;
$("wire").onchange = () => { setUnlit(false); setWire(($("wire") as HTMLInputElement).checked); setUnlit(($("unlit") as HTMLInputElement).checked); };
$("unlit").onchange = () => setUnlit(($("unlit") as HTMLInputElement).checked);
$<HTMLSelectElement>("pick").onchange = (e) => void load((e.target as HTMLSelectElement).value);

const list: string[] = await (await fetch("models/monsters/index.json")).json();
for (const n of list) $("pick").append(new Option(n, n));
await load(list[0]);

renderer.setAnimationLoop(() => {
  if (model && ($("spin") as HTMLInputElement).checked) model.rotation.y += 0.006;
  controls.update();
  renderer.render(scene, camera);
});
