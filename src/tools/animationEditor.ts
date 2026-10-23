import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { buildMannequin, showProp, starterClips } from './animEdit/mannequin';
import {
  clonePose, frameCount, frameTime, keyAt, mirrorName, mirrorPose, newClip, samplePose, sortKeys,
  type EditClip, type Ease, type Pose, type Project, type Quat,
} from './animEdit/clipMath';
import './animationEditor.css';

// Animation Editor: pose a rigged character bone by bone over a sketch,
// key whole-body poses on a timeline, and render the result into Elyndra
// sprite sheets from the game's camera. Projects are saved in the browser
// per character and can be exported as JSON or as a .glb with the clips.

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const checked = (id: string) => input(id).checked;
const DEG = Math.PI / 180;

interface Source { id: string; label: string; url?: string; file?: File }
interface Ghost { root: THREE.Object3D; bones: Map<string, THREE.Bone> }

// ---------------------------------------------------------------- scene
const viewport = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.append(renderer.domElement);

const scene = new THREE.Scene();
const BACKGROUND = new THREE.Color('#dfe5d6');
scene.background = BACKGROUND;
scene.add(new THREE.HemisphereLight(0xfbfff0, 0x7d8c6c, 2.2));
const sun = new THREE.DirectionalLight(0xfff3dc, 2.4);
sun.position.set(-1.5, 4, 2.5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.1, far: 10 });
sun.shadow.normalBias = 0.01;
scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(2.4, 24, 0x93a283, 0xbfc9b2);
(grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.6;
scene.add(grid);

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; orbit.minDistance = 0.6; orbit.maxDistance = 8;
orbit.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

const gizmo = new TransformControls(camera, renderer.domElement);
gizmo.setMode('rotate'); gizmo.setSpace('local'); gizmo.setSize(0.8);
scene.add(gizmo.getHelper());

const resize = () => {
  const { width, height } = viewport.getBoundingClientRect();
  renderer.setSize(width, height); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(viewport);

// --------------------------------------------------------------- state
let holder: THREE.Group | null = null;          // scales and grounds the model
let model: THREE.Object3D | null = null;        // what gets exported
let bones: THREE.Bone[] = [];
const boneByName = new Map<string, THREE.Bone>();
let rootBone: THREE.Bone | null = null;
let restPose: Pose = { rot: {} };
let sourceClips: THREE.AnimationClip[] = [];
let modelHeight = 1;
let project: Project = { version: 1, character: '', clips: [] };
let clipIndex = 0;
let time = 0;
let playing = false;
let dirty = false;           // the shown pose has edits not yet in a key
let selected: THREE.Bone | null = null;
let clipboard: Pose | null = null;
let skeletonHelper: THREE.SkeletonHelper | null = null;
let ghosts: [Ghost, Ghost] | null = null;
let committed = '';
let undoStack: string[] = [];
let redoStack: string[] = [];
const joints = new THREE.Group(); joints.renderOrder = 20; scene.add(joints);
const jointMarkers = new Map<THREE.Bone, THREE.Mesh>();
const jointGeo = new THREE.SphereGeometry(1, 12, 8);
const jointMat = new THREE.MeshBasicMaterial({ color: 0x3f6b8c, depthTest: false, transparent: true, opacity: 0.85 });
const jointSelMat = new THREE.MeshBasicMaterial({ color: 0xe0623a, depthTest: false });

const clip = () => project.clips[clipIndex];
const boneNames = () => bones.map(b => b.name);

// ------------------------------------------------------------- storage
const storeKey = (id: string) => `elyndra.animEditor.v1.${id}`;
function save() {
  try { localStorage.setItem(storeKey(project.character), JSON.stringify(project)); } catch { /* storage full or blocked */ }
}
function loadStored(id: string): Project | null {
  try {
    const text = localStorage.getItem(storeKey(id));
    const parsed = text ? JSON.parse(text) as Project : null;
    return parsed?.version === 1 && parsed.clips?.length ? parsed : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- poses
function snapshotPose(): Pose {
  const rot: Record<string, Quat> = {};
  for (const b of bones) rot[b.name] = [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w];
  const pose: Pose = { rot };
  if (rootBone) pose.root = [rootBone.position.x, rootBone.position.y, rootBone.position.z];
  return pose;
}
function applyPose(pose: Pose, map: Map<string, THREE.Bone> = boneByName, root: THREE.Bone | null = rootBone) {
  for (const [name, q] of Object.entries(pose.rot)) map.get(name)?.quaternion.fromArray(q);
  if (pose.root && root) {
    const target = map === boneByName ? root : map.get(root.name);
    target?.position.fromArray(pose.root);
  }
}
function showPose() {
  if (dirty || !clip()) return;
  applyPose(samplePose(clip(), time) ?? restPose);
}

// ------------------------------------------------------------- history
function change(fn: () => void) {
  undoStack.push(committed);
  if (undoStack.length > 120) undoStack.shift();
  redoStack = [];
  fn();
  committed = JSON.stringify(project);
  dirty = false;
  save(); refreshAll();
}
function restore(from: string[], to: string[]) {
  const state = from.pop();
  if (!state) return;
  to.push(committed);
  committed = state; project = JSON.parse(state) as Project;
  clipIndex = Math.min(clipIndex, project.clips.length - 1);
  dirty = false; save(); refreshAll();
}

/** Writes the pose on screen into the key at this frame (making one if auto-key is on). */
function commitPose() {
  const c = clip();
  if (!c) return;
  const t = frameTime(time, c.fps);
  const key = keyAt(c, t);
  if (!key && !checked('auto-key')) { dirty = true; refreshKeyPanel(); return; }
  const pose = snapshotPose();
  change(() => {
    const k = keyAt(clip(), t);
    if (k) k.pose = pose;
    else { clip().keys.push({ t, pose, ease: 'smooth' }); sortKeys(clip()); }
  });
}

// --------------------------------------------------------------- model
const loader = new GLTFLoader();
async function loadSource(src: Source) {
  $('loading').hidden = false; $('loading').textContent = `กำลังโหลด ${src.label}…`;
  playing = false;
  try {
    let root: THREE.Object3D;
    let clips: THREE.AnimationClip[] = [];
    if (src.id === 'wayfarer') root = buildMannequin();
    else {
      const gltf = src.file ? await loader.parseAsync(await src.file.arrayBuffer(), '') : await loader.loadAsync(src.url!);
      root = gltf.scene; clips = gltf.animations;
    }
    unloadModel();
    model = root; sourceClips = clips;
    root.traverse(o => {
      if (o instanceof THREE.Bone) bones.push(o);
      if (o instanceof THREE.Mesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    for (const b of bones) boneByName.set(b.name, b);
    rootBone = bones.find(b => !(b.parent instanceof THREE.Bone)) ?? null;
    holder = new THREE.Group(); holder.add(root); scene.add(holder);
    const box = new THREE.Box3().setFromObject(root, true);
    const height = box.max.y - box.min.y;
    const scale = height > 0.25 && height < 4 ? 1 : 1 / Math.max(height, 1e-3);
    holder.scale.setScalar(scale); holder.position.y = -box.min.y * scale;
    holder.updateMatrixWorld(true);
    modelHeight = height * scale;
    restPose = snapshotPose();

    for (const b of bones) {
      const marker = new THREE.Mesh(jointGeo, jointMat);
      marker.scale.setScalar(0.014 * modelHeight); marker.userData.bone = b; marker.renderOrder = 20;
      joints.add(marker); jointMarkers.set(b, marker);
    }
    skeletonHelper = new THREE.SkeletonHelper(root);
    (skeletonHelper.material as THREE.LineBasicMaterial).depthTest = false;
    skeletonHelper.renderOrder = 19; skeletonHelper.visible = checked('show-bones');
    scene.add(skeletonHelper);
    ghosts = [makeGhost(0x4f8fd6), makeGhost(0xe0883a)];

    const stored = loadStored(src.id);
    const fresh: EditClip[] = stored?.clips ?? (src.id === 'wayfarer' ? starterClips(restPose) : [newClip('idle', restPose)]);
    project = { version: 1, character: src.id, clips: fresh };
    clipIndex = 0; time = 0; dirty = false;
    committed = JSON.stringify(project); undoStack = []; redoStack = [];
    selectBone(bones.find(b => /arm/i.test(b.name)) ?? rootBone);
    $('character-name').textContent = src.label;
    $('import-section').hidden = !sourceClips.length;
    let hasProps = false;
    root.traverse(o => { if (o.userData.prop) hasProps = true; });
    $('prop-field').hidden = !hasProps;
    $('clip-samples').hidden = src.id !== 'wayfarer';
    $<HTMLSelectElement>('import-clip').replaceChildren(...sourceClips.map((c, i) => new Option(`${c.name} (${c.duration.toFixed(2)} วิ)`, String(i))));
    renderBoneList(); refreshAll(); setView(currentView);
    const url = new URL(location.href); url.searchParams.set('model', src.id); history.replaceState(null, '', url);
    $('loading').hidden = true;
    if (!bones.length) { $('loading').hidden = false; $('loading').textContent = 'โมเดลนี้ไม่มีกระดูก (rig) จึงจัดท่าไม่ได้'; }
  } catch (error) {
    $('loading').hidden = false;
    $('loading').textContent = `เปิดโมเดลไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`;
  }
}
function unloadModel() {
  gizmo.detach(); selected = null;
  if (holder) scene.remove(holder);
  if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper.dispose(); skeletonHelper = null; }
  for (const g of ghosts ?? []) scene.remove(g.root);
  ghosts = null;
  joints.clear(); jointMarkers.clear();
  bones = []; boneByName.clear(); rootBone = null; holder = null; model = null;
}

function makeGhost(color: number): Ghost {
  const root = SkeletonUtils.clone(holder!) as THREE.Group;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false });
  const map = new Map<string, THREE.Bone>();
  root.traverse(o => {
    if (o instanceof THREE.Bone) map.set(o.name, o);
    if (o instanceof THREE.Mesh) { o.castShadow = false; o.material = mat; if (o.userData.outline) o.visible = false; o.raycast = () => {}; }
  });
  root.visible = false; scene.add(root);
  return { root, bones: map };
}
function updateGhosts() {
  if (!ghosts) return;
  const c = clip();
  const show = checked('show-onion') && !playing && !!c;
  const prev = show ? [...c.keys].reverse().find(k => k.t < time - 0.5 / c.fps) : undefined;
  const next = show ? c.keys.find(k => k.t > time + 0.5 / c.fps) : undefined;
  for (const [ghost, key] of [[ghosts[0], prev], [ghosts[1], next]] as const) {
    ghost.root.visible = !!key;
    if (key) applyPose(key.pose, ghost.bones, rootBone);
  }
}

// ------------------------------------------------------------ selection
function selectBone(bone: THREE.Bone | null) {
  selected = bone;
  for (const [b, m] of jointMarkers) m.material = b === bone ? jointSelMat : jointMat;
  if (bone) {
    if (gizmo.mode === 'translate' && bone !== rootBone) setMode('rotate');
    gizmo.attach(bone);
  } else gizmo.detach();
  document.querySelectorAll<HTMLButtonElement>('#bones button').forEach(b => b.classList.toggle('selected', b.dataset.bone === bone?.name));
  document.querySelector('#bones .selected')?.scrollIntoView({ block: 'nearest' });
  refreshBonePanel();
}
function setMode(mode: 'rotate' | 'translate') {
  if (mode === 'translate' && selected !== rootBone) return;
  gizmo.setMode(mode);
  $('mode-rotate').classList.toggle('selected', mode === 'rotate');
  $('mode-move').classList.toggle('selected', mode === 'translate');
}
function renderBoneList() {
  const depth = (b: THREE.Object3D) => { let d = 0; for (let p = b.parent; p instanceof THREE.Bone; p = p.parent) d++; return d; };
  $('bones').replaceChildren(...bones.map(b => {
    const button = document.createElement('button');
    button.textContent = b.name; button.dataset.bone = b.name;
    button.style.paddingLeft = `${8 + depth(b) * 11}px`;
    button.classList.toggle('selected', b === selected);
    button.onclick = () => selectBone(b);
    return button;
  }));
}

const raycaster = new THREE.Raycaster();
let down: { x: number; y: number } | null = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4 || gizmo.dragging) return;
  down = null;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
  if (joints.visible) {
    const hit = raycaster.intersectObjects(joints.children)[0];
    if (hit) { selectBone(hit.object.userData.bone); return; }
  }
  if (!model) return;
  model.traverse(o => { if (o instanceof THREE.SkinnedMesh) o.computeBoundingSphere(); });
  const hit = raycaster.intersectObject(model, true).find(h => !h.object.userData.outline);
  if (hit) selectBone(boneForHit(hit));
});
/** The bone that moves the part that was clicked. */
function boneForHit(hit: THREE.Intersection): THREE.Bone | null {
  const mesh = hit.object;
  if (mesh instanceof THREE.SkinnedMesh && hit.face) {
    const skinIndex = mesh.geometry.attributes.skinIndex, skinWeight = mesh.geometry.attributes.skinWeight;
    const weights = new Map<number, number>();
    for (const v of [hit.face.a, hit.face.b, hit.face.c]) {
      for (let j = 0; j < 4; j++) {
        const i = skinIndex.getComponent(v, j);
        weights.set(i, (weights.get(i) ?? 0) + skinWeight.getComponent(v, j));
      }
    }
    const best = [...weights].sort((a, b) => b[1] - a[1])[0];
    return best ? mesh.skeleton.bones[best[0]] ?? null : null;
  }
  for (let o: THREE.Object3D | null = mesh; o; o = o.parent) if (o instanceof THREE.Bone) return o;
  return null;
}

gizmo.addEventListener('dragging-changed', e => {
  orbit.enabled = !e.value;
  if (e.value) { playing = false; refreshTransport(); }
  else commitPose();
});
gizmo.addEventListener('objectChange', () => { dirty = true; refreshBonePanel(); });

// ---------------------------------------------------------- bone panel
const AXES = ['x', 'y', 'z'] as const;
const sliderRows = AXES.map(axis => {
  const row = document.createElement('label'); row.className = 'axis';
  const name = document.createElement('span'); name.textContent = axis.toUpperCase(); name.className = `axis-${axis}`;
  const range = document.createElement('input'); range.type = 'range'; range.min = '-180'; range.max = '180'; range.step = '1';
  const number = document.createElement('input'); number.type = 'number'; number.min = '-180'; number.max = '180'; number.step = '1';
  row.append(name, range, number); $('bone-sliders').append(row);
  const set = (value: number) => {
    if (!selected) return;
    selected.rotation[axis] = value * DEG; dirty = true;
    range.value = number.value = String(Math.round(value));
  };
  range.oninput = () => set(Number(range.value));
  number.oninput = () => set(Number(number.value));
  range.onchange = number.onchange = () => commitPose();
  return { range, number, axis };
});
function refreshBonePanel() {
  $('bone-name').textContent = selected ? selected.name + (selected === rootBone ? ' · ราก' : '') : 'ยังไม่ได้เลือก';
  for (const { range, number, axis } of sliderRows) {
    const v = selected ? Math.round(selected.rotation[axis] / DEG) : 0;
    range.disabled = number.disabled = !selected;
    if (document.activeElement !== number) number.value = String(v);
    range.value = String(v);
  }
  input('mode-move').disabled = !selected || selected !== rootBone;
  const other = selected && mirrorName(selected.name);
  input('bone-other').disabled = !other || !boneByName.has(other);
}

// ------------------------------------------------------------ timeline
function setTime(t: number, snap = true) {
  const c = clip();
  if (!c) return;
  time = Math.max(0, Math.min(c.duration, snap ? frameTime(t, c.fps) : t));
  dirty = false; showPose(); refreshTransport(); refreshKeyPanel(); updateGhosts(); refreshBonePanel();
}
function refreshTransport() {
  const c = clip();
  if (!c) return;
  const frame = Math.round(time * c.fps), last = Math.round(c.duration * c.fps);
  $('time').textContent = `เฟรม ${frame} / ${last} · ${time.toFixed(2)} วิ`;
  $('playhead').style.left = `${(time / c.duration) * 100}%`;
  $('play').textContent = playing ? '❚❚' : '▶';
}
function renderTimeline() {
  const c = clip();
  if (!c) return;
  const frames = Math.round(c.duration * c.fps);
  const ticks: HTMLElement[] = [];
  const every = frames > 48 ? 4 : frames > 24 ? 2 : 1;
  for (let f = 0; f <= frames; f++) {
    const tick = document.createElement('span');
    tick.className = f % c.fps === 0 ? 'tick major' : 'tick';
    tick.style.left = `${(f / frames) * 100}%`;
    if (f % every === 0) tick.dataset.label = String(f);
    ticks.push(tick);
  }
  $('ticks').replaceChildren(...ticks);
  $('keys').replaceChildren(...c.keys.map((k, i) => {
    const el = document.createElement('button');
    el.className = `key ease-${k.ease}`; el.style.left = `${(k.t / c.duration) * 100}%`;
    el.title = `คีย์ ${i + 1} · เฟรม ${Math.round(k.t * c.fps)} — ลากเพื่อย้าย`;
    el.onpointerdown = e => dragKey(e, k.t);
    return el;
  }));
  refreshTransport(); refreshKeyPanel();
}
function timeAt(clientX: number) {
  const rect = $('track').getBoundingClientRect();
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * clip().duration;
}
$('track').addEventListener('pointerdown', e => {
  if ((e.target as HTMLElement).classList.contains('key')) return;
  playing = false;
  const track = $('track'); track.setPointerCapture(e.pointerId);
  setTime(timeAt(e.clientX));
  const move = (ev: PointerEvent) => setTime(timeAt(ev.clientX));
  track.addEventListener('pointermove', move);
  track.addEventListener('pointerup', () => track.removeEventListener('pointermove', move), { once: true });
});
function dragKey(e: PointerEvent, from: number) {
  e.stopPropagation(); playing = false;
  const el = e.target as HTMLElement; el.setPointerCapture(e.pointerId);
  const c = clip();
  let to = from;
  const move = (ev: PointerEvent) => {
    to = frameTime(timeAt(ev.clientX), c.fps);
    el.style.left = `${(to / c.duration) * 100}%`;
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', () => {
    el.removeEventListener('pointermove', move);
    if (Math.abs(to - from) < 1e-6) { setTime(from); return; }
    change(() => {
      const keys = clip().keys;
      const key = keyAt(clip(), from)!;
      const half = 0.5 / clip().fps;
      clip().keys = keys.filter(k => k === key || Math.abs(k.t - to) >= half);
      key.t = to; sortKeys(clip());
    });
    setTime(to);
  }, { once: true });
}
function refreshKeyPanel() {
  const c = clip();
  const key = c && keyAt(c, time);
  $<HTMLSelectElement>('key-ease').disabled = !key;
  if (key) $<HTMLSelectElement>('key-ease').value = key.ease;
  input('key-del').disabled = !key;
  $('stage-status').textContent = dirty ? '● แก้แล้ว ยังไม่ได้ใส่คีย์ (กด K)' : key ? '◆ อยู่บนคีย์' : '';
  $('stage-status').classList.toggle('warn', dirty);
}

// --------------------------------------------------------------- clips
function renderClipList() {
  $('clip-count').textContent = String(project.clips.length);
  $('clips').replaceChildren(...project.clips.map((c, i) => {
    const button = document.createElement('button');
    button.className = i === clipIndex ? 'selected' : '';
    const name = document.createElement('strong'); name.textContent = c.name;
    const meta = document.createElement('small'); meta.textContent = `${c.keys.length} คีย์ · ${+c.duration.toFixed(2)} วิ${c.loop ? ' · วน' : ''}`;
    button.append(name, meta);
    button.onclick = () => { clipIndex = i; dirty = false; playing = false; refreshAll(); };
    return button;
  }));
}
function refreshClipSettings() {
  const c = clip();
  if (!c) return;
  if (document.activeElement !== input('clip-name')) input('clip-name').value = c.name;
  input('clip-duration').value = String(+c.duration.toFixed(3));
  input('clip-fps').value = String(c.fps);
  input('clip-loop').checked = c.loop;
  $<HTMLSelectElement>('clip-prop').value = c.prop ?? '';
}
function refreshAll() {
  if (!clip()) return;
  time = Math.min(time, clip().duration);
  showProps(clip().prop);
  renderClipList(); refreshClipSettings(); renderTimeline(); showPose(); updateGhosts(); refreshBonePanel();
  input('undo').disabled = !undoStack.length; input('redo').disabled = !redoStack.length;
}
function showProps(name: string | undefined) {
  if (holder) showProp(holder, name);
  for (const g of ghosts ?? []) showProp(g.root, name);
}
function uniqueName(base: string) {
  let name = base, n = 2;
  while (project.clips.some(c => c.name === name)) name = `${base}_${n++}`;
  return name;
}

input('clip-prop').onchange = () => change(() => { clip().prop = $<HTMLSelectElement>('clip-prop').value || undefined; });
$('clip-samples').onclick = () => {
  const missing = starterClips(restPose).filter(s => !project.clips.some(c => c.name === s.name));
  if (!missing.length) { alert('มีท่าตัวอย่างครบทุกท่าแล้ว'); return; }
  change(() => { project.clips.push(...missing); clipIndex = project.clips.length - missing.length; time = 0; });
};
$('clip-new').onclick = () => change(() => {
  project.clips.push(newClip(uniqueName('ท่าใหม่'), snapshotPose(), false));
  clipIndex = project.clips.length - 1; time = 0;
});
$('clip-dup').onclick = () => change(() => {
  const copy = JSON.parse(JSON.stringify(clip())) as EditClip;
  copy.name = uniqueName(copy.name);
  project.clips.splice(clipIndex + 1, 0, copy); clipIndex++;
});
$('clip-del').onclick = () => {
  if (project.clips.length < 2) return;
  if (!confirm(`ลบท่า "${clip().name}"? (ย้อนกลับได้ด้วย Ctrl+Z)`)) return;
  change(() => { project.clips.splice(clipIndex, 1); clipIndex = Math.max(0, clipIndex - 1); });
};
input('clip-name').onchange = () => {
  const name = input('clip-name').value.trim();
  if (name && name !== clip().name) change(() => { clip().name = uniqueName(name); });
};
input('clip-duration').onchange = () => {
  const d = Math.max(0.1, Math.min(10, Number(input('clip-duration').value) || 1));
  change(() => { const c = clip(); c.duration = frameTime(d, c.fps) || 1 / c.fps; c.keys = c.keys.filter(k => k.t <= c.duration + 1e-6); });
};
input('clip-fps').onchange = () => {
  const fps = Math.max(1, Math.min(30, Math.round(Number(input('clip-fps').value) || 12)));
  change(() => {
    const c = clip(); c.fps = fps;
    c.duration = Math.max(1 / fps, frameTime(c.duration, fps));
    for (const k of c.keys) k.t = Math.min(c.duration, frameTime(k.t, fps));
    c.keys = c.keys.filter((k, i) => i === 0 || Math.abs(k.t - c.keys[i - 1].t) > 1e-6);
  });
};
input('clip-loop').onchange = () => change(() => { clip().loop = checked('clip-loop'); });

$('import-go').onclick = () => {
  const src = sourceClips[Number($<HTMLSelectElement>('import-clip').value)];
  if (!src || !holder) return;
  const step = Number($<HTMLSelectElement>('import-step').value);
  const fps = 12;
  const mixer = new THREE.AnimationMixer(model!);
  const action = mixer.clipAction(src); action.play();
  const duration = Math.max(1 / fps, frameTime(src.duration, fps));
  const loop = /idle|walk|run/i.test(src.name);
  const edit: EditClip = { name: uniqueName(src.name.toLowerCase()), duration, fps, loop, keys: [] };
  const frames = Math.round(duration * fps);
  for (let f = 0; f <= frames; f += step) {
    if (loop && f === frames) break;
    mixer.setTime(f / fps);
    edit.keys.push({ t: f / fps, pose: snapshotPose(), ease: 'linear' });
  }
  if (!loop && frames % step) { mixer.setTime(duration); edit.keys.push({ t: duration, pose: snapshotPose(), ease: 'linear' }); }
  mixer.stopAllAction(); mixer.uncacheRoot(model!);
  change(() => { project.clips.push(edit); clipIndex = project.clips.length - 1; time = 0; });
};

// ---------------------------------------------------------------- keys
const addKey = () => {
  const c = clip();
  const t = frameTime(time, c.fps);
  const pose = snapshotPose();
  change(() => {
    const k = keyAt(clip(), t);
    if (k) k.pose = pose; else { clip().keys.push({ t, pose, ease: 'smooth' }); sortKeys(clip()); }
  });
};
const deleteKey = () => {
  const key = keyAt(clip(), time);
  if (!key) return;
  change(() => { clip().keys = clip().keys.filter(k => k.t !== key.t); });
};
$('key-add').onclick = addKey;
$('key-del').onclick = deleteKey;
$<HTMLSelectElement>('key-ease').onchange = () => {
  const t = keyAt(clip(), time)?.t;
  if (t === undefined) return;
  change(() => { keyAt(clip(), t)!.ease = $<HTMLSelectElement>('key-ease').value as Ease; });
};
function jumpKey(direction: 1 | -1) {
  const c = clip(), half = 0.5 / c.fps;
  const keys = direction > 0 ? c.keys.filter(k => k.t > time + half) : c.keys.filter(k => k.t < time - half).reverse();
  if (keys[0]) { playing = false; setTime(keys[0].t); }
}

// ---------------------------------------------------------- pose tools
function setPose(pose: Pose) {
  applyPose(pose); dirty = true; commitPose(); refreshBonePanel();
}
$('pose-copy').onclick = () => { clipboard = snapshotPose(); $('pose-paste').classList.add('ready'); };
$('pose-paste').onclick = () => { if (clipboard) setPose(clipboard); };
$('pose-mirror').onclick = () => setPose(mirrorPose(snapshotPose(), boneNames()));
$('pose-rest').onclick = () => setPose(clonePose(restPose));
$('bone-reset').onclick = () => {
  if (!selected) return;
  selected.quaternion.fromArray(restPose.rot[selected.name]);
  if (selected === rootBone && restPose.root) selected.position.fromArray(restPose.root);
  dirty = true; commitPose(); refreshBonePanel();
};
$('bone-other').onclick = () => {
  const otherName = selected && mirrorName(selected.name);
  const other = otherName && boneByName.get(otherName);
  if (!selected || !other) return;
  const q = selected.quaternion;
  other.quaternion.set(q.x, -q.y, -q.z, q.w);
  dirty = true; commitPose();
};
$('mode-rotate').onclick = () => setMode('rotate');
$('mode-move').onclick = () => setMode('translate');

// --------------------------------------------------------------- views
let currentView = 'persp';
function setView(view: string) {
  currentView = view;
  const yaw: Record<string, number> = { front: 0, left: Math.PI / 2, right: -Math.PI / 2, back: Math.PI, persp: 0.6, game: 0 };
  const pitch = view === 'game' ? 50 * DEG : view === 'persp' ? 14 * DEG : 4 * DEG;
  const h = modelHeight, distance = h * 3.1;
  const target = new THREE.Vector3(0, h * 0.48, 0);
  camera.position.set(Math.sin(yaw[view]) * Math.cos(pitch) * distance, target.y + Math.sin(pitch) * distance, Math.cos(yaw[view]) * Math.cos(pitch) * distance);
  orbit.target.copy(target); orbit.update();
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.classList.toggle('selected', b.dataset.view === view));
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => { b.onclick = () => setView(b.dataset.view!); });

// ----------------------------------------------------------- reference
const ref = $<HTMLImageElement>('reference');
const refState = { opacity: 0.45, scale: 1, x: 0, y: 0, flip: false };
function applyRef() {
  ref.style.opacity = String(refState.opacity);
  ref.style.transform = `translate(calc(-50% + ${refState.x}%), calc(-50% + ${refState.y}%)) scale(${refState.scale}) scaleX(${refState.flip ? -1 : 1})`;
  try { localStorage.setItem('elyndra.animEditor.ref', JSON.stringify(refState)); } catch { /* ignore */ }
}
function setRefImage(url: string | null) {
  ref.hidden = !url;
  if (url) ref.src = url; else ref.removeAttribute('src');
  try { if (url) localStorage.setItem('elyndra.animEditor.refImage', url); else localStorage.removeItem('elyndra.animEditor.refImage'); } catch { /* too big to keep */ }
}
function readImage(file: Blob) {
  const reader = new FileReader();
  reader.onload = () => setRefImage(String(reader.result));
  reader.readAsDataURL(file);
}
input('ref-file').onchange = () => { const f = input('ref-file').files?.[0]; if (f) readImage(f); input('ref-file').value = ''; };
window.addEventListener('paste', e => {
  const item = [...(e.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
  const file = item?.getAsFile();
  if (file) { e.preventDefault(); readImage(file); return; }
  // Ctrl+V without an image pastes the copied pose.
  const target = e.target as HTMLElement;
  if (clipboard && !target.matches('input, textarea')) { e.preventDefault(); $('pose-paste').click(); }
});
for (const [id, key] of [['ref-opacity', 'opacity'], ['ref-scale', 'scale'], ['ref-x', 'x'], ['ref-y', 'y']] as const) {
  input(id).oninput = () => { refState[key] = Number(input(id).value); applyRef(); };
}
$('ref-flip').onclick = () => { refState.flip = !refState.flip; applyRef(); };
$('ref-clear').onclick = () => setRefImage(null);
try {
  Object.assign(refState, JSON.parse(localStorage.getItem('elyndra.animEditor.ref') ?? '{}'));
  setRefImage(localStorage.getItem('elyndra.animEditor.refImage'));
} catch { /* no saved reference */ }
input('ref-opacity').value = String(refState.opacity); input('ref-scale').value = String(refState.scale);
input('ref-x').value = String(refState.x); input('ref-y').value = String(refState.y);
applyRef();

// ------------------------------------------------------------- display
input('show-bones').onchange = () => { if (skeletonHelper) skeletonHelper.visible = checked('show-bones'); };
input('show-joints').onchange = () => { joints.visible = checked('show-joints'); };
input('show-onion').onchange = updateGhosts;

// ---------------------------------------------------------- transport
const togglePlay = () => {
  if (!clip()) return;
  if (!playing && !clip().loop && time >= clip().duration - 1e-6) time = 0;
  playing = !playing; dirty = false; updateGhosts(); refreshTransport();
};
const step = (frames: number) => {
  const c = clip(); playing = false;
  let t = time + frames / c.fps;
  if (c.loop) t = ((t % c.duration) + c.duration) % c.duration;
  setTime(t);
};
$('play').onclick = togglePlay;
$('to-start').onclick = () => { playing = false; setTime(0); };
$('step-back').onclick = () => step(-1);
$('step-fwd').onclick = () => step(1);
$('prev-key').onclick = () => jumpKey(-1);
$('next-key').onclick = () => jumpKey(1);
$('undo').onclick = () => restore(undoStack, redoStack);
$('redo').onclick = () => restore(redoStack, undoStack);

// Keys by KeyboardEvent.code, so shortcuts work on a Thai layout too.
window.addEventListener('keydown', e => {
  const target = e.target as HTMLElement;
  if (target.matches('input:not([type=range]):not([type=checkbox]), select, textarea') || $<HTMLDialogElement>('sprite-dialog').open) return;
  if (target.matches('input[type=range]') && e.code.startsWith('Arrow')) return;
  const ctrl = e.ctrlKey || e.metaKey;
  const actions: Record<string, () => void> = ctrl ? {
    KeyZ: () => restore(...(e.shiftKey ? [redoStack, undoStack] : [undoStack, redoStack]) as [string[], string[]]),
    KeyY: () => restore(redoStack, undoStack),
    KeyC: () => $('pose-copy').click(),
  } : {
    Space: togglePlay, KeyK: addKey, Delete: deleteKey, Backspace: deleteKey,
    ArrowLeft: () => step(-1), ArrowRight: () => step(1), Home: () => setTime(0),
    Comma: () => jumpKey(-1), Period: () => jumpKey(1),
    KeyR: () => setMode('rotate'), KeyG: () => setMode('translate'), KeyM: () => $('pose-mirror').click(),
    Escape: () => selectBone(null),
  };
  const action = actions[e.code];
  if (!action) return;
  e.preventDefault(); action();
});

// ----------------------------------------------------------- files out
function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const safeId = () => (project.character || 'character').replace(/[^a-z0-9_-]+/gi, '_');

$('save-json').onclick = () => download(new Blob([JSON.stringify(project, null, 1)], { type: 'application/json' }), `${safeId()}.anim.json`);
input('load-json').onchange = async () => {
  const file = input('load-json').files?.[0];
  input('load-json').value = '';
  if (!file) return;
  try {
    const loaded = JSON.parse(await file.text()) as Project;
    if (loaded.version !== 1 || !loaded.clips?.length) throw new Error('ไม่ใช่ไฟล์โปรเจกต์ท่าทาง');
    const known = new Set(boneNames());
    const missing = new Set(loaded.clips.flatMap(c => c.keys.flatMap(k => Object.keys(k.pose.rot))).filter(n => !known.has(n)));
    if (missing.size && !confirm(`ไฟล์นี้มีกระดูก ${missing.size} ชิ้นที่โมเดลนี้ไม่มี (ทำมากับ "${loaded.character}") — เปิดต่อไหม?`)) return;
    change(() => { project.clips = loaded.clips; clipIndex = 0; time = 0; });
  } catch (error) { alert(`เปิดไฟล์ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`); }
};

/** An editor clip baked to a three.js clip at 30 fps. */
function bakeClip(c: EditClip): THREE.AnimationClip {
  const fps = 30, n = Math.max(2, Math.round(c.duration * fps) + 1);
  const times = Array.from({ length: n }, (_, i) => Math.min(c.duration, i / fps));
  const poses = times.map(t => samplePose(c, t) ?? restPose);
  const tracks: THREE.KeyframeTrack[] = bones.map(b =>
    new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, poses.flatMap(p => p.rot[b.name] ?? restPose.rot[b.name])));
  if (rootBone) tracks.push(new THREE.VectorKeyframeTrack(`${rootBone.name}.position`, times, poses.flatMap(p => p.root ?? restPose.root!)));
  return new THREE.AnimationClip(c.name, c.duration, tracks);
}
$('export-glb').onclick = async () => {
  if (!model) return;
  playing = false; gizmo.detach();
  applyPose(restPose);
  const hidden: THREE.Object3D[] = [];
  model.traverse(o => { if (o.userData.outline) { o.visible = false; hidden.push(o); } });
  try {
    const glb = await new GLTFExporter().parseAsync(model, { binary: true, animations: project.clips.map(bakeClip) });
    download(new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' }), `${safeId()}-animated.glb`);
  } finally {
    for (const o of hidden) o.visible = true;
    showPose(); if (selected) gizmo.attach(selected);
  }
};

// ------------------------------------------------------------- sprites
let spriteRenderer: THREE.WebGLRenderer | null = null;
const dialog = $<HTMLDialogElement>('sprite-dialog');
$('open-sprites').onclick = () => { playing = false; dialog.showModal(); };

async function renderSprites() {
  if (!holder || !model) return;
  const size = Number($<HTMLSelectElement>('sprite-size').value);
  const eightWay = $<HTMLSelectElement>('sprite-dirs').value === '8';
  const cells = Math.max(0.5, Number(input('sprite-cells').value) || 1.5);
  const list = $<HTMLSelectElement>('sprite-which').value === 'all' ? project.clips : [clip()];
  const rows = eightWay ? ['S', 'SW', 'W', 'NW', 'N'] as const : ['W'] as const;
  const heading: Record<string, number> = { N: 0, NW: -Math.PI / 4, W: -Math.PI / 2, SW: -3 * Math.PI / 4, S: Math.PI };
  const results = $('sprite-results');
  results.replaceChildren(Object.assign(document.createElement('p'), { className: 'note', textContent: 'กำลังเรนเดอร์…' }));
  await new Promise(r => setTimeout(r, 30));

  // One frame box for every sheet: the reach of any frame in any facing, seen
  // from the game camera (screen up is y·cos(pitch) − z·sin(pitch)).
  const pitch = 50 * DEG;
  let halfWidth = 0, viewTop = -Infinity, viewBottom = Infinity;
  const box = new THREE.Box3(), corner = new THREE.Vector3();
  for (const dir of rows) {
    holder.rotation.y = Math.PI - heading[dir];
    for (const c of list) for (let f = 0; f < frameCount(c); f++) {
      applyPose(samplePose(c, Math.min(c.duration, f / c.fps)) ?? restPose);
      holder.updateMatrixWorld(true);
      box.setFromObject(model, true);
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        const up = corner.y * Math.cos(pitch) - corner.z * Math.sin(pitch);
        halfWidth = Math.max(halfWidth, Math.abs(corner.x));
        viewTop = Math.max(viewTop, up); viewBottom = Math.min(viewBottom, up);
      }
    }
  }
  viewBottom = Math.min(viewBottom, 0);
  const side = Math.max(2 * halfWidth, viewTop - viewBottom) * 1.06;
  const centre = (viewTop + viewBottom) / 2;
  const cam = new THREE.OrthographicCamera(-side / 2, side / 2, centre + side / 2, centre - side / 2, 0.01, 50);
  cam.position.set(0, Math.sin(pitch) * 10, Math.cos(pitch) * 10); cam.lookAt(0, 0, 0);

  spriteRenderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  spriteRenderer.outputColorSpace = THREE.SRGBColorSpace;
  spriteRenderer.setPixelRatio(1); spriteRenderer.setSize(size, size); spriteRenderer.setClearColor(0, 0);
  const helpers = [floor, grid, joints, gizmo.getHelper(), skeletonHelper, ...(ghosts ?? []).map(g => g.root)].filter(Boolean) as THREE.Object3D[];
  const wasVisible = helpers.map(h => h.visible);
  helpers.forEach(h => { h.visible = false; });
  scene.background = null;

  const animations: Record<string, object> = {};
  const outputs: { name: string; canvas: HTMLCanvasElement; frames: number; fps: number }[] = [];
  try {
    for (const c of list) {
      showProp(holder, c.prop);
      const frames = frameCount(c);
      const sheet = document.createElement('canvas');
      sheet.width = frames * size; sheet.height = rows.length * size;
      const ctx = sheet.getContext('2d')!;
      rows.forEach((dir, r) => {
        holder!.rotation.y = Math.PI - heading[dir];
        for (let f = 0; f < frames; f++) {
          applyPose(samplePose(c, Math.min(c.duration, f / c.fps)) ?? restPose);
          holder!.updateMatrixWorld(true);
          spriteRenderer!.render(scene, cam);
          ctx.drawImage(spriteRenderer!.domElement, f * size, r * size);
        }
      });
      const name = c.name.replace(/[^a-z0-9_-]+/gi, '_') || 'clip';
      animations[c.name] = { file: `${safeId()}_${name}.png`, frames, fps: c.fps, ...(c.loop ? { loop: true } : { hold: /death|die/i.test(c.name) || undefined }),
        ...(c.events && Object.keys(c.events).length ? { events: c.events } : {}) };
      outputs.push({ name, canvas: sheet, frames, fps: c.fps });
    }
  } finally {
    holder.rotation.y = 0; holder.updateMatrixWorld(true);
    helpers.forEach((h, i) => { h.visible = wasVisible[i]; });
    scene.background = BACKGROUND;
    showProps(clip()?.prop);
    showPose();
  }

  const def = {
    id: safeId(), frame: { w: size, h: size },
    pivot: { x: size / 2, y: Math.round(((centre + side / 2) / side) * size) },
    pixelsPerCell: Math.round((size / side) * (modelHeight / cells) * 10) / 10,
    ...(eightWay ? { rows, mirror: { SE: 'SW', E: 'W', NE: 'NW' } } : { facingMode: 'left-right', rows }),
    animations,
  };
  showSpriteResults(outputs, def);
}

function showSpriteResults(outputs: { name: string; canvas: HTMLCanvasElement; frames: number; fps: number }[], def: { id: string; frame: { w: number } }) {
  const size = def.frame.w;
  const results = $('sprite-results');
  const json = JSON.stringify(def, null, 2);
  const head = document.createElement('div'); head.className = 'row';
  const all = document.createElement('button'); all.className = 'primary'; all.textContent = 'ดาวน์โหลดทั้งหมด';
  const jsonButton = document.createElement('button'); jsonButton.textContent = `${def.id}.sprite.json`;
  jsonButton.onclick = () => download(new Blob([json], { type: 'application/json' }), `${def.id}.sprite.json`);
  head.append(all, jsonButton);
  const cards = outputs.map(o => {
    const card = document.createElement('div'); card.className = 'sheet-card';
    const preview = document.createElement('canvas'); preview.width = preview.height = size;
    preview.className = 'sheet-preview';
    const pctx = preview.getContext('2d')!;
    let frame = 0, row = 0;
    const rowsCount = o.canvas.height / size;
    const tick = () => {
      if (!preview.isConnected) return;
      pctx.clearRect(0, 0, size, size);
      pctx.drawImage(o.canvas, frame * size, row * size, size, size, 0, 0, size, size);
      frame = (frame + 1) % o.frames;
      setTimeout(tick, 1000 / o.fps);
    };
    preview.title = 'คลิกเพื่อดูทิศถัดไป';
    preview.onclick = () => { row = (row + 1) % rowsCount; };
    setTimeout(tick, 0);
    const sheet = document.createElement('img'); sheet.className = 'sheet-image'; sheet.src = o.canvas.toDataURL('image/png');
    const caption = document.createElement('div'); caption.className = 'sheet-caption';
    const file = `${def.id}_${o.name}.png`;
    const button = document.createElement('button'); button.textContent = `↓ ${file}`;
    button.onclick = () => o.canvas.toBlob(b => b && download(b, file), 'image/png');
    const meta = document.createElement('small'); meta.textContent = `${o.frames} เฟรม × ${rowsCount} ทิศ · ${o.fps} fps`;
    caption.append(button, meta);
    card.append(preview, sheet, caption);
    return { card, button };
  });
  all.onclick = async () => {
    jsonButton.click();
    for (const c of cards) { await new Promise(r => setTimeout(r, 300)); c.button.click(); }
  };
  const pre = document.createElement('pre'); pre.textContent = json;
  results.replaceChildren(head, ...cards.map(c => c.card), pre);
}
$('sprite-go').onclick = () => void renderSprites();

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const c = clip();
  if (playing && c) {
    time += dt * Number($<HTMLSelectElement>('speed').value);
    if (time >= c.duration) {
      if (c.loop) time %= c.duration; else { time = c.duration; playing = false; updateGhosts(); }
    }
    showPose(); refreshTransport();
  }
  for (const [bone, marker] of jointMarkers) bone.getWorldPosition(marker.position);
  orbit.update();
  renderer.render(scene, camera);
});

// --------------------------------------------------------------- start
const sources: Source[] = [{ id: 'wayfarer', label: 'Wayfarer (หุ่นตัวอย่าง)' }];
input('load-glb').onchange = () => {
  const file = input('load-glb').files?.[0];
  input('load-glb').value = '';
  if (!file) return;
  const src: Source = { id: `file_${file.name.replace(/\.[^.]+$/, '')}`, label: file.name, file };
  sources.push(src);
  $<HTMLSelectElement>('character').append(new Option(`${file.name} (ไฟล์)`, src.id));
  $<HTMLSelectElement>('character').value = src.id;
  void loadSource(src);
};
$<HTMLSelectElement>('character').onchange = () => {
  const src = sources.find(s => s.id === $<HTMLSelectElement>('character').value);
  if (src) void loadSource(src);
};
try {
  const response = await fetch('models/monsters/animated/rig-manifest.json');
  if (response.ok) {
    for (const c of (await response.json()).characters as { id: string; label: string; url: string }[]) sources.push({ id: c.id, label: c.label, url: c.url });
  }
} catch { /* monsters are optional */ }
$<HTMLSelectElement>('character').replaceChildren(...sources.map(s => new Option(s.label, s.id)));
const wanted = sources.find(s => s.id === new URLSearchParams(location.search).get('model')) ?? sources[0];
$<HTMLSelectElement>('character').value = wanted.id;
await loadSource(wanted);

// Read-only inspection for smoke tests and console troubleshooting.
Object.defineProperty(window, '__animationEditor', { value: {
  snapshot: () => ({ character: project.character, bones: bones.length, clips: project.clips.map(c => ({ name: c.name, keys: c.keys.length })),
    clip: clip()?.name, time, playing, dirty, selected: selected?.name ?? null }),
} });
