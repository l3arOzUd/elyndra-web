import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './animationViewer.css';

interface Character {
  id: string; label: string; number: number; url: string; bones: number;
  clips: { clip: string; duration: number }[];
}
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const checked = (id: string) => $<HTMLInputElement>(id).checked;
const descriptions: Record<string, [string, string]> = {
  mosskin: ['Moss spirit', 'ตัวกลมกระโดด · ใบไม้ไหวตามแรงเคลื่อนไหว'],
  sporeling: ['Forest mushroom', 'ก้าวขาสลับ · หมวกเห็ดโยกตามตัว'],
  ambermite: ['Amber crawler', 'เดินสลับขา 6 ข้าง · ลำตัวและผลึกคงรูป'],
  lunari: ['Moon companion', 'เดินสี่ขา · หูและหางขยับตามจังหวะ'],
  rootling: ['Young treant', 'ก้าวขาและเหวี่ยงแขนรากไม้ · ใบไม้ไหว'],
};
const clips = [
  ['Idle', 'ยืนนิ่ง', 'หายใจและขยับตัวเบา ๆ'],
  ['Walk', 'เดิน', 'วงรอบการเดิน / กระโดดแบบอยู่กับที่'],
  ['Attack', 'โจมตี', 'เตรียมแรง → โจมตี → กลับสู่ท่าพัก'],
  ['Hit', 'โดนโจมตี', 'สะดุ้งและคืนสมดุล'],
  ['Die', 'ล้ม', 'เสียแรง → ทรุดลง → ใบไม้ / หูหยุดไหว'],
  ['Special', 'สกิล', 'รวบรวมพลังและแสดงท่าเฉพาะตัว'],
];
const viewport = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce3d5');
scene.add(new THREE.HemisphereLight(0xf5ffe9, 0x687b5b, 2));
const light = new THREE.DirectionalLight(0xfff1d1, 2.5);
light.position.set(-2, 4, 3); light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
light.shadow.camera.left = -1.5; light.shadow.camera.right = 1.5;
light.shadow.camera.top = 1.5; light.shadow.camera.bottom = -1.5;
light.shadow.camera.near = .1; light.shadow.camera.far = 10;
light.shadow.normalBias = .012; light.shadow.bias = -.0001;
scene.add(light);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xdce3d5, roughness: 1 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.006; floor.receiveShadow = true; scene.add(floor);
const platform = new THREE.Mesh(new THREE.CylinderGeometry(.91, .94, .035, 96), new THREE.MeshStandardMaterial({ color: 0xc5ceba, roughness: .95 }));
platform.position.y = -.023; platform.receiveShadow = true; scene.add(platform);
const ring = new THREE.Mesh(new THREE.RingGeometry(.80, .802, 96), new THREE.MeshBasicMaterial({ color: 0x8e9f7d, transparent: true, opacity: .45, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI/2; ring.position.y = -.004; scene.add(ring);
const camera = new THREE.PerspectiveCamera(32, 1, .01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, .44, 0); controls.enableDamping = true;
controls.minDistance = 1.2; controls.maxDistance = 5;
controls.maxPolarAngle = Math.PI*.51; controls.enablePan = false;
let view = 'perspective';
function setView(value: string) {
  view = value;
  const yaw: Record<string, number> = { perspective: .55, front: 0, left: Math.PI/2, back: Math.PI, right: -Math.PI/2, game: .65 };
  const pitch = value === 'game' ? THREE.MathUtils.degToRad(50) : value === 'perspective' ? .18 : .04;
  const distance = 2.65;
  camera.position.set(Math.sin(yaw[value])*Math.cos(pitch)*distance, .44+Math.sin(pitch)*distance, Math.cos(yaw[value])*Math.cos(pitch)*distance);
  controls.target.set(0, .44, 0); controls.update();
  if (model) model.rotation.y = 0;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.classList.toggle('selected', b.dataset.view === value));
}
const resize = () => {
  const { width, height } = viewport.getBoundingClientRect();
  renderer.setSize(width, height); camera.aspect = width/height; camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(viewport);

const loader = new GLTFLoader();
let model: THREE.Group | null = null;
let skeleton: THREE.SkeletonHelper | null = null;
let mixer: THREE.AnimationMixer | null = null;
let action: THREE.AnimationAction | null = null;
let animations: THREE.AnimationClip[] = [];
let selectedClip = 'Idle';
let selectedId = '';
let paused = false;
let finished = false;
let requestId = 0;
let characters: Character[] = [];
let ready = false;
const materials = new Map<THREE.Mesh, { lit: THREE.Material | THREE.Material[]; unlit: THREE.Material | THREE.Material[] }>();

function disposeTree(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const mats = new Set<THREE.Material>();
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    const pair = materials.get(o);
    for (const value of pair ? [pair.lit, pair.unlit] : [o.material]) {
      for (const mat of Array.isArray(value) ? value : [value]) {
        mats.add(mat);
        for (const prop of Object.values(mat)) if (prop instanceof THREE.Texture) textures.add(prop);
      }
    }
    if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
    materials.delete(o);
  });
  for (const mat of mats) mat.dispose();
  for (const texture of textures) texture.dispose();
}
function setMaterials() {
  for (const [mesh, pair] of materials) {
    mesh.material = checked('unlit') ? pair.unlit : pair.lit;
    for (const mat of [...(Array.isArray(pair.lit) ? pair.lit : [pair.lit]), ...(Array.isArray(pair.unlit) ? pair.unlit : [pair.unlit])]) {
      (mat as THREE.MeshBasicMaterial).wireframe = checked('wire');
    }
  }
}
function playbackLabel() {
  $('play').textContent = paused || finished ? '▶' : 'Ⅱ';
  $('play').setAttribute('aria-label', finished ? 'เล่นอีกครั้ง' : paused ? 'เล่นต่อ' : 'หยุดชั่วคราว');
}
function configureLoop() {
  if (!action) return;
  const loop = selectedClip === 'Idle' || selectedClip === 'Walk' || (checked('repeat') && selectedClip !== 'Die');
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = true;
}
function selectClip(name: string, transition = true) {
  const clip = animations.find(c => c.name === name);
  if (!mixer || !clip) return;
  const previous = action;
  selectedClip = name;
  action = mixer.clipAction(clip);
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
  configureLoop();
  paused = false; finished = false;
  action.play();
  if (previous && previous !== action && transition) {
    previous.fadeOut(.12); action.fadeIn(.12);
  } else {
    mixer.stopAllAction(); action.reset().play();
  }
  $('clip-description').textContent = clips.find(c => c[0] === name)?.[2] ?? '';
  document.querySelectorAll<HTMLButtonElement>('[data-clip]').forEach(b => {
    b.classList.toggle('selected', b.dataset.clip === name);
    b.setAttribute('aria-pressed', String(b.dataset.clip === name));
  });
  playbackLabel();
}
function showError(error: unknown) {
  $('loading').hidden = false;
  $('loading').textContent = `เปิดโมเดลไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`;
}
async function loadCharacter(character: Character) {
  const token = ++requestId;
  ready = false;
  $('loading').hidden = false; $('loading').textContent = `กำลังโหลด ${character.label}…`;
  try {
    const gltf = await loader.loadAsync(character.url);
    if (token !== requestId) { disposeTree(gltf.scene); return; }
    if (model) {
      mixer?.stopAllAction(); mixer?.uncacheRoot(model); scene.remove(model); disposeTree(model);
    }
    if (skeleton) { scene.remove(skeleton); skeleton.dispose(); }
    model = gltf.scene; animations = gltf.animations;
    model.name = character.id;
    let triangles = 0;
    let bones = 0;
    model.traverse(o => {
      if (o instanceof THREE.Bone) bones++;
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true; o.receiveShadow = false;
      // Baked death/attack poses extend beyond the bind-pose bounds.
      o.frustumCulled = false;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count)/3;
      const unlit = (mat: THREE.Material) => {
        const source = mat as THREE.MeshStandardMaterial;
        return new THREE.MeshBasicMaterial({ map: source.map, color: source.color, side: source.side,
          transparent: source.transparent, opacity: source.opacity, alphaTest: source.alphaTest });
      };
      materials.set(o, { lit: o.material, unlit: Array.isArray(o.material) ? o.material.map(unlit) : unlit(o.material) });
    });
    scene.add(model); model.updateMatrixWorld(true);
    skeleton = new THREE.SkeletonHelper(model);
    const skeletonMat = skeleton.material as THREE.LineBasicMaterial;
    skeletonMat.depthTest = false; skeletonMat.transparent = true; skeletonMat.opacity = .9;
    skeleton.renderOrder = 10; skeleton.visible = checked('bones'); scene.add(skeleton);
    mixer = new THREE.AnimationMixer(model);
    mixer.addEventListener('finished', event => {
      if (event.action === action) { finished = true; playbackLabel(); }
    });
    action = null; selectedId = character.id;
    selectClip(selectedClip, false); setMaterials(); setView(view);
    $('character-name').textContent = character.label;
    $('character-description').textContent = descriptions[character.id][1];
    $('bone-count').textContent = String(bones);
    $('clip-count').textContent = String(animations.length);
    $('triangle-count').textContent = Math.round(triangles).toLocaleString();
    const download = $<HTMLAnchorElement>('download');
    download.href = character.url; download.download = `${character.id}-animated.glb`;
    document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b => {
      b.classList.toggle('selected', b.dataset.character === character.id);
      b.setAttribute('aria-pressed', String(b.dataset.character === character.id));
    });
    const url = new URL(location.href); url.searchParams.set('model', character.id); history.replaceState(null, '', url);
    $('loading').hidden = true; ready = true;
  } catch (error) { if (token === requestId) showError(error); }
}

for (const [name, thai] of clips) {
  const button = document.createElement('button');
  button.className = 'action'; button.dataset.clip = name;
  button.append(document.createTextNode(name));
  const subtitle = document.createElement('small'); subtitle.textContent = thai; button.append(subtitle);
  button.onclick = () => selectClip(name); $('actions').append(button);
}
$('play').onclick = () => {
  if (!action) return;
  if (finished) { selectClip(selectedClip, false); return; }
  paused = !paused; action.paused = paused; playbackLabel();
};
$('restart').onclick = () => selectClip(selectedClip, false);
$('timeline').oninput = () => {
  if (!action || !mixer) return;
  const time = Number($<HTMLInputElement>('timeline').value)/1000*action.getClip().duration;
  mixer.stopAllAction(); action.reset().play(); configureLoop();
  action.time = time; action.paused = true;
  paused = true; finished = false; mixer.update(0); playbackLabel();
};
$('speed').oninput = () => { $('speed-value').textContent = `${$<HTMLInputElement>('speed').value}×`; };
$('repeat').onchange = configureLoop;
$('bones').onchange = () => { if (skeleton) skeleton.visible = checked('bones'); };
$('unlit').onchange = setMaterials; $('wire').onchange = setMaterials;
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => { b.onclick = () => setView(b.dataset.view!); });
$('background').onchange = () => {
  const colors: Record<string, [number, number]> = { sage: [0xdce3d5,0xc5ceba], night: [0x283831,0x405344], clay: [0xe0d4c1,0xc6b89d] };
  const [bg, base] = colors[$<HTMLSelectElement>('background').value];
  (scene.background as THREE.Color).setHex(bg); floor.material.color.setHex(bg); platform.material.color.setHex(base);
};
setView('perspective');
let lastTime = performance.now();
renderer.setAnimationLoop(now => {
  const delta = Math.min((now-lastTime)/1000, .05); lastTime = now;
  if (mixer) mixer.update(delta*Number($<HTMLInputElement>('speed').value));
  if (model && checked('spin')) model.rotation.y += delta*.3;
  if (action) {
    const duration = action.getClip().duration;
    $('time').textContent = `${action.time.toFixed(2)} / ${duration.toFixed(2)} s`;
    $<HTMLInputElement>('timeline').value = String(action.time/duration*1000);
  }
  controls.update(); renderer.render(scene, camera);
});

// Read-only inspection for the browser smoke test and console troubleshooting.
Object.defineProperty(window, '__animationStudio', { value: {
  snapshot: () => {
    const bounds = new THREE.Box3();
    let meshes = 0, movingVertices = 0, maxDeformation = 0;
    model?.updateMatrixWorld(true);
    model?.traverse(o => {
      if (!(o instanceof THREE.SkinnedMesh)) return;
      meshes++;
      const position = o.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const rest = new THREE.Vector3().fromBufferAttribute(position, i);
        const vertex = o.getVertexPosition(i, new THREE.Vector3());
        const distance = vertex.distanceTo(rest);
        if (distance > .001) movingVertices++;
        maxDeformation = Math.max(maxDeformation, distance);
        bounds.expandByPoint(vertex.applyMatrix4(o.matrixWorld));
      }
    });
    return { ready, character: selectedId, clip: selectedClip, time: action?.time, duration: action?.getClip().duration,
      paused, finished, clips: animations.map(c => c.name), bones: Number($('bone-count').textContent), meshes,
      movingVertices, maxDeformation, minY: bounds.min.y, maxY: bounds.max.y,
      skeletonVisible: skeleton?.visible, memory: renderer.info.memory };
  },
} });
try {
  const response = await fetch('models/monsters/animated/rig-manifest.json');
  if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
  characters = (await response.json()).characters;
  for (const character of characters) {
    const button = document.createElement('button'); button.className = 'character'; button.dataset.character = character.id;
    const number = document.createElement('span'); number.className = 'character-number'; number.textContent = String(character.number).padStart(2,'0');
    const text = document.createElement('span'); const title = document.createElement('strong'); title.textContent = character.label;
    const caption = document.createElement('small'); caption.textContent = descriptions[character.id][0];
    text.append(title, caption); button.append(number, text); button.onclick = () => void loadCharacter(character);
    $('characters').append(button);
  }
  const id = new URLSearchParams(location.search).get('model');
  await loadCharacter(characters.find(c => c.id === id) ?? characters[0]);
} catch (error) { showError(error); }
