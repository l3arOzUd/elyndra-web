import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  applyLook, buildMannequin, DEFAULT_LOOK, LOOK_OPTIONS, mannequinColliders, showProp, starterClips, starterPoses, type Look,
} from './animEdit/mannequin';
import {
  changedBones, conformKeys, copyKeys, deleteKeys, easeAt, frameCount, frameTime, fullPose, keyCount, keyTimes, keyedAt,
  mirrorName, mirrorPose, moveKeys, newClip, pasteKeys, ROOT, setEase, setKeys, upgradeProject,
  type EditClip, type Ease, type KeyBlock, type Pose, type Project, type Quat,
} from './animEdit/clipMath';
import { chainOf, findChains, setWorldQuaternion, solveTwoBone, type Chain } from './animEdit/ik';
import { DEFAULT_SPRING, SpringRig, type SpringSettings } from './animEdit/spring';
import { environmentStyle } from '../render/environmentStyle';
import './animationEditor.css';

// Animation Editor: pose a rigged character bone by bone (or hand and foot
// by IK) over a sketch, key each bone on its own track, and render the
// result into Elyndra sprite sheets from the game's camera, written straight
// into public/sprites. Hair and cloth on spring bones swing by themselves.
// Projects are saved in the browser per character and can be exported as
// JSON or as a .glb with the clips.

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const select = (id: string) => $<HTMLSelectElement>(id);
const checked = (id: string) => input(id).checked;
const DEG = Math.PI / 180;
const GAME_PITCH = 50 * DEG;

interface Source { id: string; label: string; url?: string; file?: File }
interface Ghost { root: THREE.Object3D; bones: Map<string, THREE.Bone> }
interface Pin { chain: Chain; pos: THREE.Vector3; quat: THREE.Quaternion }

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
const sky = new THREE.HemisphereLight(0xfbfff0, 0x7d8c6c, 2.2);
scene.add(sky);
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
/** What the gizmo drags in IK mode: the hand or foot target. */
const ikProxy = new THREE.Object3D();
scene.add(ikProxy);

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
let isMannequin = false;
let project: Project = { version: 2, character: '', clips: [] };
let clipIndex = 0;
let time = 0;
let playing = false;
let dirty = false;           // the shown pose has edits not yet in a key
let selected: THREE.Bone | null = null;
let mode: 'rotate' | 'ik' | 'translate' = 'rotate';
let chains: Chain[] = [];
let ikChain: Chain | null = null;
let pins: Pin[] | null = null;
const restFootY = new Map<Chain, number>();
let clipboard: Pose | null = null;
let keyClipboard: { block: KeyBlock; from: string } | null = null;
let selectedTimes: number[] = [];
let skeletonHelper: THREE.SkeletonHelper | null = null;
let ghosts: [Ghost, Ghost] | null = null;
let springBones: THREE.Bone[] = [];
let springRig: SpringRig | null = null;
const springNames = new Set<string>();
/** The posed (animated) local rotation of each spring bone, before physics. */
const animTarget = new Map<string, THREE.Quaternion>();
let committed = '';
let undoStack: string[] = [];
let redoStack: string[] = [];
const joints = new THREE.Group(); joints.renderOrder = 20; scene.add(joints);
const jointMarkers = new Map<THREE.Bone, THREE.Mesh>();
const jointGeo = new THREE.SphereGeometry(1, 12, 8);
const jointMat = new THREE.MeshBasicMaterial({ color: 0x3f6b8c, depthTest: false, transparent: true, opacity: 0.85 });
const jointSelMat = new THREE.MeshBasicMaterial({ color: 0xe0623a, depthTest: false });
const jointSpringMat = new THREE.MeshBasicMaterial({ color: 0x9a6fd0, depthTest: false, transparent: true, opacity: 0.7 });

const clip = () => project.clips[clipIndex];
const boneNames = () => bones.map(b => b.name);
const physicsOn = () => checked('phys-on') && !!springRig?.size;
/** Bones that get keys: all of them except physics-driven ones. */
const keyable = () => bones.filter(b => !(physicsOn() && springNames.has(b.name))).map(b => b.name);

// ------------------------------------------------------------- storage
const storeKey = (id: string) => `elyndra.animEditor.v1.${id}`;
function save() {
  try { localStorage.setItem(storeKey(project.character), JSON.stringify(project)); } catch { /* storage full or blocked */ }
}
function loadStored(id: string): Project | null {
  try {
    const text = localStorage.getItem(storeKey(id));
    return text ? upgradeProject(JSON.parse(text)) : null;
  } catch { return null; }
}
function readJson<T>(key: string, fallback: T): T {
  try { const text = localStorage.getItem(key); return text ? JSON.parse(text) as T : fallback; } catch { return fallback; }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------- poses
function snapshotPose(names?: readonly string[]): Pose {
  const rot: Record<string, Quat> = {};
  for (const b of bones) if (!names || names.includes(b.name)) rot[b.name] = [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w];
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
  if (map === boneByName) for (const name of springNames) {
    const q = pose.rot[name] ?? restPose.rot[name];
    if (q) (animTarget.get(name) ?? animTarget.set(name, new THREE.Quaternion()).get(name)!).fromArray(q);
  }
}
/** The clip's pose at t on the model (unkeyed bones at rest). */
function applyAt(c: EditClip, t: number) {
  applyPose(fullPose(c, t, restPose));
}
function showPose() {
  if (dirty || !clip()) return;
  applyAt(clip(), time);
  if (!physicsOn()) for (const b of springBones) b.quaternion.copy(animTarget.get(b.name)!);
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
  dirty = false; selectedTimes = []; lookChanged(); rebuildSprings(); save(); refreshAll();
}

/**
 * Keys what was just edited: the bones whose pose now differs from what
 * the clip gives at this frame. With auto-key off only bones that already
 * have a key here are updated; other edits stay on screen, unsaved.
 */
function commitPose() {
  const c = clip();
  if (!c) return;
  const t = frameTime(time, c.fps);
  const now = snapshotPose();
  const allowed = new Set([...keyable(), ROOT]);
  let changed = changedBones(now, fullPose(c, t, restPose)).filter(n => allowed.has(n));
  if (!changed.length) { dirty = false; refreshKeyPanel(); return; }
  if (!checked('auto-key')) {
    const keyed = keyedAt(c, t);
    const unkeyed = changed.filter(n => !keyed.includes(n));
    changed = changed.filter(n => keyed.includes(n));
    if (!changed.length) { dirty = true; refreshKeyPanel(); return; }
    if (unkeyed.length) dirty = true;
  }
  change(() => setKeys(clip(), t, now, changed));
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
    model = root; sourceClips = clips; isMannequin = src.id === 'wayfarer';
    root.traverse(o => {
      if (o instanceof THREE.Bone) bones.push(o);
      if (o instanceof THREE.Mesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    for (const b of bones) boneByName.set(b.name, b);
    rootBone = bones.find(b => !(b.parent instanceof THREE.Bone)) ?? null;
    holder = new THREE.Group(); holder.add(root); scene.add(holder);
    holder.updateMatrixWorld(true);
    const box = visibleBounds(root);
    const height = box.max.y - box.min.y;
    const scale = height > 0.25 && height < 4 ? 1 : 1 / Math.max(height, 1e-3);
    holder.scale.setScalar(scale); holder.position.y = -box.min.y * scale;
    holder.updateMatrixWorld(true);
    modelHeight = height * scale;
    restPose = snapshotPose();
    chains = findChains(bones);
    restFootY.clear();
    for (const ch of chains) restFootY.set(ch, ch.end.getWorldPosition(new THREE.Vector3()).y);

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
    project = stored ?? { version: 2, character: src.id, clips: [] };
    project.character = src.id;
    rebuildSprings();
    if (!project.clips.length) project.clips = isMannequin ? starterClips(restPose) : [newClip('idle', restPose, true, springNames)];
    clipIndex = 0; time = 0; dirty = false; selectedTimes = [];
    committed = JSON.stringify(project); undoStack = []; redoStack = [];
    lookChanged();
    selectBone(bones.find(b => /arm/i.test(b.name)) ?? rootBone);
    $('character-name').textContent = src.label;
    $('import-section').hidden = !sourceClips.length;
    let hasProps = false;
    root.traverse(o => { if (o.userData.prop) hasProps = true; });
    $('prop-field').hidden = !hasProps;
    $('clip-samples').hidden = !isMannequin;
    $('look-section').hidden = !isMannequin;
    select('import-clip').replaceChildren(...sourceClips.map((c, i) => new Option(`${c.name} (${c.duration.toFixed(2)} วิ)`, String(i))));
    input('sprite-id').value = `${safeId()}_anim`;
    renderBoneList(); renderLibrary(); refreshAll(); setView(currentView);
    const url = new URL(location.href); url.searchParams.set('model', src.id); history.replaceState(null, '', url);
    $('loading').hidden = true;
    if (!bones.length) { $('loading').hidden = false; $('loading').textContent = 'โมเดลนี้ไม่มีกระดูก (rig) จึงจัดท่าไม่ได้'; }
  } catch (error) {
    $('loading').hidden = false;
    $('loading').textContent = `เปิดโมเดลไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`;
  }
}
function unloadModel() {
  gizmo.detach(); selected = null; ikChain = null;
  if (holder) scene.remove(holder);
  if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper.dispose(); skeletonHelper = null; }
  for (const g of ghosts ?? []) scene.remove(g.root);
  ghosts = null; springRig = null; springBones = []; springNames.clear(); animTarget.clear();
  joints.clear(); jointMarkers.clear();
  bones = []; boneByName.clear(); rootBone = null; holder = null; model = null; chains = [];
}

/** Bounds of what is actually drawn: shown meshes, no ink outlines. */
function visibleBounds(root: THREE.Object3D, box = new THREE.Box3()): THREE.Box3 {
  box.makeEmpty();
  const shown = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p && p !== holder?.parent; p = p.parent) if (!p.visible) return false; return true; };
  root.updateWorldMatrix(true, true);
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh) || o.userData.outline || !shown(o)) return;
    if (o instanceof THREE.SkinnedMesh) { o.computeBoundingBox(); box.union(o.boundingBox!.clone().applyMatrix4(o.matrixWorld)); }
    else box.expandByObject(o, true);
  });
  return box;
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
  const times = c ? keyTimes(c) : [];
  const half = c ? 0.5 / c.fps : 0;
  const prev = show ? [...times].reverse().find(t => t < time - half) : undefined;
  const next = show ? times.find(t => t > time + half) : undefined;
  for (const [ghost, t] of [[ghosts[0], prev], [ghosts[1], next]] as const) {
    ghost.root.visible = t !== undefined;
    if (t !== undefined) applyPose(fullPose(c, t, restPose), ghost.bones, rootBone);
  }
}

// ---------------------------------------------------------------- look
function currentLook(): Look {
  return { ...DEFAULT_LOOK, ...(project.look as Partial<Look> | undefined) };
}
function lookChanged() {
  if (!isMannequin || !model) return;
  const look = currentLook();
  applyLook(model, look);   // the model itself: its materials are registered under it
  for (const g of ghosts ?? []) applyLook(g.root, look);
  showProps(clip()?.prop);
  for (const key of ['hair', 'hairColor', 'outfit'] as const) select(`look-${key}`).value = look[key];
  input('look-cape').checked = look.cape;
}
for (const key of ['hair', 'hairColor', 'outfit'] as const) {
  select(`look-${key}`).replaceChildren(...Object.entries(LOOK_OPTIONS[key]).map(([v, label]) => new Option(label, v)));
  select(`look-${key}`).onchange = () => change(() => { project.look = { ...currentLook(), [key]: select(`look-${key}`).value }; lookChanged(); });
}
input('look-cape').onchange = () => change(() => { project.look = { ...currentLook(), cape: checked('look-cape') }; lookChanged(); });

// ------------------------------------------------------------- physics
const physics: SpringSettings = { ...DEFAULT_SPRING, ...readJson<Partial<SpringSettings>>('elyndra.animEditor.physics', {}) };
const PHYS_INPUTS = { stiffness: 'phys-stiffness', damping: 'phys-damping', gravity: 'phys-gravity', wind: 'phys-wind' } as const;
for (const [key, id] of Object.entries(PHYS_INPUTS) as [keyof SpringSettings, string][]) {
  input(id).value = String(physics[key]);
  input(id).oninput = () => { physics[key] = Number(input(id).value); writeJson('elyndra.animEditor.physics', physics); };
}
$('phys-reset').onclick = () => {
  Object.assign(physics, DEFAULT_SPRING);
  for (const [key, id] of Object.entries(PHYS_INPUTS) as [keyof SpringSettings, string][]) input(id).value = String(physics[key]);
  writeJson('elyndra.animEditor.physics', physics);
};
input('phys-on').onchange = () => { springRig?.reset(); dirty = false; showPose(); refreshBonePanel(); renderBoneList(); };
let shakeLeft = 0;
$('phys-shake').onclick = () => { shakeLeft = 0.8; };
$('phys-mark').onclick = () => {
  if (!selected) return;
  const names: string[] = [];
  selected.traverse(o => { if (o instanceof THREE.Bone) names.push(o.name); });
  change(() => {
    const set = new Set((project as Project & { springs?: string[] }).springs ?? []);
    const on = !springNames.has(selected!.name);
    for (const n of names) { if (on) set.add(n); else set.delete(n); }
    (project as Project & { springs?: string[] }).springs = [...set];
    rebuildSprings();
  });
};
/** Spring bones: the model's own (hair, cape) plus any the project marked. */
function rebuildSprings() {
  springNames.clear(); animTarget.clear();
  const marked = new Set((project as Project & { springs?: string[] }).springs ?? []);
  springBones = bones.filter(b => b.userData.spring || marked.has(b.name));
  for (const b of springBones) { springNames.add(b.name); animTarget.set(b.name, b.quaternion.clone().fromArray(restPose.rot[b.name])); }
  springRig = springBones.length && holder
    ? new SpringRig(springBones, isMannequin ? mannequinColliders(model!) : [], b => animTarget.get(b.name)!)
    : null;
  $('phys-note').textContent = springBones.length
    ? `กระดูกฟิสิกส์ ${springBones.length} ชิ้น (สีม่วง) — ไม่ต้องใส่คีย์ ฟิสิกส์ขยับให้เอง`
    : 'โมเดลนี้ยังไม่มีกระดูกฟิสิกส์ เลือกกระดูก (เช่นหาง) แล้วกด "ใส่ฟิสิกส์ที่กระดูกนี้"';
  for (const [b, m] of jointMarkers) m.material = b === selected ? jointSelMat : springNames.has(b.name) ? jointSpringMat : jointMat;
}

/**
 * Plays a clip into the model frame by frame at the given times, running
 * the physics in between so hair and cloth swing as they would in play:
 * a loop is run through once first, a one-shot holds its first pose for a
 * moment, then each time gets `each` called with the model posed.
 */
function simulate(c: EditClip, times: readonly number[], each: (i: number) => void) {
  const phys = physicsOn() ? springRig : null;
  const at = (t: number) => { applyAt(c, c.loop ? ((t % c.duration) + c.duration) % c.duration : Math.min(t, c.duration)); holder!.updateMatrixWorld(true); };
  if (phys) {
    at(0); phys.reset();
    const pre = c.loop ? c.duration : 0.5;
    for (let s = 0; s < pre; s += 1 / 60) { at(c.loop ? s : 0); phys.update(1 / 60, physics); }
  }
  let last = 0;
  times.forEach((t, i) => {
    if (phys) for (let s = last; s < t - 1e-6; s += 1 / 60) { at(s); phys.update(1 / 60, physics); }
    at(t);
    if (phys) phys.update(0, physics);
    else for (const b of springBones) b.quaternion.copy(animTarget.get(b.name)!);
    holder!.updateMatrixWorld(true);
    each(i); last = t;
  });
}

// ------------------------------------------------------------ selection
function selectBone(bone: THREE.Bone | null) {
  selected = bone;
  for (const [b, m] of jointMarkers) m.material = b === bone ? jointSelMat : springNames.has(b.name) ? jointSpringMat : jointMat;
  if (mode === 'translate' && bone !== rootBone) mode = 'rotate';
  if (mode === 'ik' && !chainOf(chains, bone)) mode = 'rotate';
  attachGizmo();
  document.querySelectorAll<HTMLButtonElement>('#bones button').forEach(b => b.classList.toggle('selected', b.dataset.bone === bone?.name));
  document.querySelector('#bones .selected')?.scrollIntoView({ block: 'nearest' });
  refreshBonePanel(); renderTimeline();
}
function attachGizmo() {
  ikChain = null;
  if (!selected) { gizmo.detach(); return; }
  if (mode === 'ik') {
    ikChain = chainOf(chains, selected) ?? null;
    ikChain!.end.getWorldPosition(ikProxy.position);
    gizmo.setMode('translate'); gizmo.setSpace('world'); gizmo.attach(ikProxy);
  } else {
    gizmo.setMode(mode); gizmo.setSpace(mode === 'translate' ? 'world' : 'local'); gizmo.attach(selected);
  }
  $('mode-rotate').classList.toggle('selected', mode === 'rotate');
  $('mode-ik').classList.toggle('selected', mode === 'ik');
  $('mode-move').classList.toggle('selected', mode === 'translate');
}
function setMode(next: typeof mode) {
  if (next === 'translate' && selected !== rootBone) return;
  if (next === 'ik' && !chainOf(chains, selected)) return;
  mode = next; attachGizmo(); refreshBonePanel();
}
function renderBoneList() {
  const depth = (b: THREE.Object3D) => { let d = 0; for (let p = b.parent; p instanceof THREE.Bone; p = p.parent) d++; return d; };
  const keyed = clip() ? new Set(keyedAt(clip(), frameTime(time, clip().fps))) : new Set<string>();
  $('bones').replaceChildren(...bones.map(b => {
    const button = document.createElement('button');
    const spring = springNames.has(b.name) && physicsOn();
    button.textContent = `${keyed.has(b.name) ? '● ' : ''}${b.name}${spring ? ' 〰' : ''}`;
    button.dataset.bone = b.name;
    button.style.paddingLeft = `${8 + depth(b) * 11}px`;
    button.classList.toggle('selected', b === selected);
    button.classList.toggle('spring', spring);
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
  const hit = raycaster.intersectObject(model, true).find(h => !h.object.userData.outline && isShown(h.object));
  if (hit) selectBone(boneForHit(hit));
});
function isShown(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
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

// ------------------------------------------------------------------ IK
/** Knees bend toward where the character faces, elbows away from it. */
function poleFor(chain: Chain) {
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(holder!.getWorldQuaternion(new THREE.Quaternion()));
  return chain.kind === 'leg' ? forward : forward.negate();
}
/** Remembers where the feet are, so moving the body can leave them planted. */
function capturePins() {
  if (!checked('pin-feet') || pins) return;
  const moving = mode === 'ik' ? ikChain : chainOf(chains, selected);
  pins = chains.filter(c => c.kind === 'leg' && c !== moving).map(chain => ({
    chain, pos: chain.end.getWorldPosition(new THREE.Vector3()), quat: chain.end.getWorldQuaternion(new THREE.Quaternion()),
  }));
}
const footNow = new THREE.Vector3();
function applyPins() {
  for (const p of pins ?? []) {
    // Only a foot the edit actually moved: re-solving a still, straight leg would bend it a hair.
    if (p.chain.end.getWorldPosition(footNow).distanceTo(p.pos) < 1e-5 * modelHeight) continue;
    solveTwoBone(p.chain, p.pos, poleFor(p.chain));
    setWorldQuaternion(p.chain.end, p.quat);
  }
}
$('feet-ground').onclick = () => {
  holder?.updateMatrixWorld(true);
  for (const chain of chains.filter(c => c.kind === 'leg')) {
    const pos = chain.end.getWorldPosition(new THREE.Vector3());
    const quat = chain.end.getWorldQuaternion(new THREE.Quaternion());
    pos.y = restFootY.get(chain)!;
    solveTwoBone(chain, pos, poleFor(chain));
    setWorldQuaternion(chain.end, quat);
  }
  dirty = true; commitPose();
};

gizmo.addEventListener('dragging-changed', e => {
  orbit.enabled = !e.value;
  if (e.value) { playing = false; refreshTransport(); pins = null; capturePins(); }
  else { pins = null; commitPose(); }
});
gizmo.addEventListener('objectChange', () => {
  if (mode === 'ik' && ikChain) solveTwoBone(ikChain, ikProxy.position, poleFor(ikChain));
  if (chainOf(chains, selected)?.kind !== 'leg') applyPins();
  dirty = true; refreshBonePanel();
});

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
    capturePins();
    selected.rotation[axis] = value * DEG; selected.updateMatrixWorld(true);
    if (chainOf(chains, selected)?.kind !== 'leg') applyPins();
    dirty = true;
    range.value = number.value = String(Math.round(value));
  };
  range.oninput = () => set(Number(range.value));
  number.oninput = () => set(Number(number.value));
  range.onchange = number.onchange = () => { pins = null; commitPose(); };
  return { range, number, axis };
});
function refreshBonePanel() {
  const spring = selected && springNames.has(selected.name) && physicsOn();
  $('bone-name').textContent = selected
    ? selected.name + (selected === rootBone ? ' · ราก' : '') + (spring ? ' · ฟิสิกส์' : '')
    : 'ยังไม่ได้เลือก';
  for (const { range, number, axis } of sliderRows) {
    const v = selected ? Math.round(selected.rotation[axis] / DEG) : 0;
    range.disabled = number.disabled = !selected || !!spring;
    if (document.activeElement !== number) number.value = String(v);
    range.value = String(v);
  }
  input('mode-move').disabled = !selected || selected !== rootBone;
  input('mode-ik').disabled = !chainOf(chains, selected);
  const other = selected && mirrorName(selected.name);
  input('bone-other').disabled = !other || !boneByName.has(other);
  input('phys-mark').textContent = selected && springNames.has(selected.name) ? 'เอาฟิสิกส์ออกจากกระดูกนี้' : 'ใส่ฟิสิกส์ที่กระดูกนี้';
  input('phys-mark').disabled = !selected || !!selected.userData.spring;
}

// ------------------------------------------------------------ timeline
let zoom = 1;
function setTime(t: number, snap = true) {
  const c = clip();
  if (!c) return;
  time = Math.max(0, Math.min(c.duration, snap ? frameTime(t, c.fps) : t));
  dirty = false; showPose(); refreshTransport(); refreshKeyPanel(); updateGhosts(); refreshBonePanel(); renderBoneList();
}
function refreshTransport() {
  const c = clip();
  if (!c) return;
  const frame = Math.round(time * c.fps), last = Math.round(c.duration * c.fps);
  $('time').textContent = `เฟรม ${frame} / ${last} · ${time.toFixed(2)} วิ`;
  $('playhead').style.left = `${(time / c.duration) * 100}%`;
  $('play').textContent = playing ? '❚❚' : '▶';
  if (playing && zoom > 1) {
    const scroll = $('tl-scroll'), x = (time / c.duration) * $('tl-inner').clientWidth;
    if (x < scroll.scrollLeft || x > scroll.scrollLeft + scroll.clientWidth - 20) scroll.scrollLeft = x - 20;
  }
}
const pct = (t: number) => `${(t / clip().duration) * 100}%`;
function renderTimeline() {
  const c = clip();
  if (!c) return;
  $('tl-inner').style.width = `${zoom * 100}%`;
  const frames = Math.round(c.duration * c.fps);
  const ticks: HTMLElement[] = [];
  const pxPerFrame = $('tl-scroll').clientWidth * zoom / Math.max(1, frames);
  const every = pxPerFrame > 22 ? 1 : pxPerFrame > 11 ? 2 : pxPerFrame > 5 ? 4 : 8;
  for (let f = 0; f <= frames; f++) {
    const tick = document.createElement('span');
    tick.className = f % c.fps === 0 ? 'tick major' : 'tick';
    tick.style.left = pct(f / c.fps);
    if (f % every === 0) tick.dataset.label = String(f);
    ticks.push(tick);
  }
  $('ticks').replaceChildren(...ticks);
  // Whole-body row: every key time; dragging moves all bones' keys there.
  const half = 0.5 / c.fps;
  $('row-all').replaceChildren(...keyTimes(c).map(t => {
    const el = document.createElement('button');
    el.className = `key ease-${easeAt(c, t) ?? 'smooth'}`;
    el.classList.toggle('picked', selectedTimes.some(x => Math.abs(x - t) < half));
    el.style.left = pct(t);
    el.title = `เฟรม ${Math.round(t * c.fps)} · ${keyedAt(c, t).length} กระดูก — ลากย้ายทั้งตัว · Shift+คลิกเลือกหลายคีย์`;
    el.onpointerdown = e => dragKey(e, t);
    return el;
  }));
  // Selected bone's own row: dragging moves just this bone (the overlap tool).
  const name = selected?.name;
  const own = name ? [name, ...(selected === rootBone ? [ROOT] : [])] : [];
  $('tl-bone-label').textContent = name ?? 'กระดูก';
  const boneTimes = name ? keyTimes({ ...c, rot: c.rot[name] ? { [name]: c.rot[name] } : {}, pos: selected === rootBone ? c.pos : [] }) : [];
  $('row-bone').replaceChildren(...boneTimes.map(t => {
    const el = document.createElement('button');
    el.className = `key bone ease-${easeAt(c, t, name) ?? 'smooth'}`;
    el.style.left = pct(t);
    el.title = `${name} · เฟรม ${Math.round(t * c.fps)} — ลากเพื่อเลื่อนเฉพาะกระดูกนี้`;
    el.onpointerdown = e => dragKey(e, t, own);
    return el;
  }));
  $('row-events').replaceChildren(...Object.entries(c.events ?? {}).map(([ev, f]) => {
    const el = document.createElement('button');
    el.className = 'flag'; el.style.left = pct(f / c.fps); el.textContent = ev;
    el.title = `${ev} · เฟรม ${f} — ลากเพื่อย้าย`;
    el.onpointerdown = e => dragEvent(e, ev);
    return el;
  }));
  refreshTransport(); refreshKeyPanel();
}
function timeAt(clientX: number) {
  const rect = $('tl-inner').getBoundingClientRect();
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * clip().duration;
}
$('tl-inner').addEventListener('pointerdown', e => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('key') || target.classList.contains('flag')) return;
  playing = false;
  if (!e.shiftKey) selectedTimes = [];
  const track = $('tl-inner'); track.setPointerCapture(e.pointerId);
  setTime(timeAt(e.clientX)); renderTimeline();
  const move = (ev: PointerEvent) => setTime(timeAt(ev.clientX));
  track.addEventListener('pointermove', move);
  track.addEventListener('pointerup', () => track.removeEventListener('pointermove', move), { once: true });
});
$('tl-scroll').addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setZoom(zoom * (e.deltaY < 0 ? 1.25 : 0.8));
}, { passive: false });
function setZoom(z: number) {
  zoom = Math.max(1, Math.min(8, z));
  input('tl-zoom').value = String(zoom);
  renderTimeline();
}
input('tl-zoom').oninput = () => setZoom(Number(input('tl-zoom').value));

function dragKey(e: PointerEvent, from: number, only?: string[]) {
  e.stopPropagation(); playing = false;
  const el = e.target as HTMLElement; el.setPointerCapture(e.pointerId);
  const c = clip();
  let to = from;
  const move = (ev: PointerEvent) => {
    to = frameTime(timeAt(ev.clientX), c.fps);
    el.style.left = pct(to);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', () => {
    el.removeEventListener('pointermove', move);
    if (Math.abs(to - from) < 1e-6) {
      if (!only) {
        const half = 0.5 / c.fps, at = selectedTimes.findIndex(x => Math.abs(x - from) < half);
        if (e.shiftKey) { if (at >= 0) selectedTimes.splice(at, 1); else selectedTimes.push(from); }
        else selectedTimes = [from];
      }
      setTime(from); renderTimeline(); return;
    }
    change(() => moveKeys(clip(), from, to, only));
    selectedTimes = [];
    setTime(to); renderTimeline();
  }, { once: true });
}
function dragEvent(e: PointerEvent, name: string) {
  e.stopPropagation(); playing = false;
  const el = e.target as HTMLElement; el.setPointerCapture(e.pointerId);
  const c = clip(), from = c.events![name];
  let to = from;
  const move = (ev: PointerEvent) => { to = Math.round(timeAt(ev.clientX) * c.fps); el.style.left = pct(to / c.fps); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', () => {
    el.removeEventListener('pointermove', move);
    if (to === from) { setTime(from / c.fps); return; }
    change(() => { clip().events![name] = Math.min(to, frameCount(clip()) - 1); });
  }, { once: true });
}
function refreshKeyPanel() {
  const c = clip();
  if (!c) return;
  const t = frameTime(time, c.fps);
  const keyed = keyedAt(c, t);
  const ease = easeAt(c, t);
  select('key-ease').disabled = !ease;
  if (ease) select('key-ease').value = ease;
  input('key-del').disabled = !keyed.length && !selectedTimes.length;
  input('key-del-bone').disabled = !selected || !keyed.includes(selected.name);
  input('key-add-bone').disabled = !selected || (springNames.has(selected.name) && physicsOn());
  input('keys-paste').disabled = !keyClipboard;
  $('keys-clip-note').textContent = keyClipboard
    ? `คลิปบอร์ด: ${keyCount({ ...c, rot: keyClipboard.block.rot, pos: keyClipboard.block.pos })} คีย์จากท่า "${keyClipboard.from}" — วางที่หัวเล่นของท่าไหนก็ได้`
    : selectedTimes.length > 1 ? `เลือกไว้ ${selectedTimes.length} คีย์` : '';
  $('stage-status').textContent = dirty ? '● แก้แล้ว ยังไม่ได้ใส่คีย์ (กด K)' : keyed.length ? `◆ คีย์ ${keyed.length} กระดูกที่เฟรมนี้` : '';
  $('stage-status').classList.toggle('warn', dirty);
  renderEvents();
}

// --------------------------------------------------------------- clips
function renderClipList() {
  $('clip-count').textContent = String(project.clips.length);
  $('clips').replaceChildren(...project.clips.map((c, i) => {
    const button = document.createElement('button');
    button.className = i === clipIndex ? 'selected' : '';
    const name = document.createElement('strong'); name.textContent = c.name;
    const meta = document.createElement('small'); meta.textContent = `${keyCount(c)} คีย์ · ${+c.duration.toFixed(2)} วิ${c.loop ? ' · วน' : ''}`;
    button.append(name, meta);
    button.onclick = () => { clipIndex = i; dirty = false; playing = false; selectedTimes = []; springRig?.reset(); refreshAll(); };
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
  select('clip-prop').value = c.prop ?? '';
}
function refreshAll() {
  if (!clip()) return;
  time = Math.min(frameTime(time, clip().fps), clip().duration);   // clips differ in fps
  showProps(clip().prop);
  renderClipList(); refreshClipSettings(); renderTimeline(); showPose(); updateGhosts(); refreshBonePanel(); renderBoneList();
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

select('clip-prop').onchange = () => change(() => { clip().prop = select('clip-prop').value || undefined; });
$('clip-samples').onclick = () => {
  const missing = starterClips(restPose).filter(s => !project.clips.some(c => c.name === s.name));
  if (!missing.length) { alert('มีท่าตัวอย่างครบทุกท่าแล้ว'); return; }
  change(() => { project.clips.push(...missing); clipIndex = project.clips.length - missing.length; time = 0; });
};
$('clip-new').onclick = () => change(() => {
  project.clips.push(newClip(uniqueName('ท่าใหม่'), snapshotPose(keyable()), false, springNames));
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
  change(() => {
    const c = clip(); c.duration = frameTime(d, c.fps) || 1 / c.fps; conformKeys(c);
    for (const [ev, f] of Object.entries(c.events ?? {})) if (f >= frameCount(c)) delete c.events![ev];
  });
};
input('clip-fps').onchange = () => {
  const fps = Math.max(1, Math.min(30, Math.round(Number(input('clip-fps').value) || 12)));
  change(() => {
    const c = clip();
    for (const ev of Object.keys(c.events ?? {})) c.events![ev] = Math.round(c.events![ev] / c.fps * fps);
    c.fps = fps;
    c.duration = Math.max(1 / fps, frameTime(c.duration, fps));
    conformKeys(c);
  });
};
input('clip-loop').onchange = () => change(() => { clip().loop = checked('clip-loop'); });

$('import-go').onclick = () => {
  const src = sourceClips[Number(select('import-clip').value)];
  if (!src || !holder) return;
  const step = Number(select('import-step').value);
  const fps = 12;
  const mixer = new THREE.AnimationMixer(model!);
  const action = mixer.clipAction(src); action.play();
  const duration = Math.max(1 / fps, frameTime(src.duration, fps));
  const loop = /idle|walk|run/i.test(src.name);
  const edit = newClip(uniqueName(src.name.toLowerCase()), restPose, loop, springNames);
  Object.assign(edit, { duration, fps, rot: {}, pos: [] });
  const frames = Math.round(duration * fps);
  const names = [...keyable(), ROOT];
  const grab = (t: number) => { mixer.setTime(t); setKeys(edit, t, snapshotPose(), names, 'linear'); };
  for (let f = 0; f <= frames; f += step) if (!(loop && f === frames)) grab(f / fps);
  if (!loop && frames % step) grab(duration);
  mixer.stopAllAction(); mixer.uncacheRoot(model!);
  change(() => { project.clips.push(edit); clipIndex = project.clips.length - 1; time = 0; });
};

// ---------------------------------------------------------------- keys
const keyHere = (names: string[]) => {
  const c = clip(), t = frameTime(time, c.fps), pose = snapshotPose();
  change(() => setKeys(clip(), t, pose, names));
};
const addKey = () => keyHere([...keyable(), ROOT]);
const addBoneKey = () => { if (selected) keyHere([selected.name, ...(selected === rootBone ? [ROOT] : [])]); };
const deleteKey = () => {
  const c = clip(), half = 0.5 / c.fps;
  const times = selectedTimes.length ? [...selectedTimes] : [frameTime(time, c.fps)];
  if (!times.some(t => keyTimes(c).some(k => Math.abs(k - t) < half))) return;
  change(() => { for (const t of times) deleteKeys(clip(), t); });
  selectedTimes = []; renderTimeline();
};
const deleteBoneKey = () => {
  if (!selected) return;
  const names = [selected.name, ...(selected === rootBone ? [ROOT] : [])];
  change(() => deleteKeys(clip(), frameTime(time, clip().fps), names));
};
$('key-add').onclick = addKey;
$('key-add-bone').onclick = addBoneKey;
$('key-del').onclick = deleteKey;
$('key-del-bone').onclick = deleteBoneKey;
select('key-ease').onchange = () => {
  const t = frameTime(time, clip().fps);
  change(() => setEase(clip(), t, select('key-ease').value as Ease));
};
$('keys-copy').onclick = () => {
  const c = clip();
  const times = selectedTimes.length ? [...selectedTimes] : [frameTime(time, c.fps)];
  const block = copyKeys(c, times);
  if (!block || !keyCount({ ...c, rot: block.rot, pos: block.pos })) return;
  keyClipboard = { block, from: c.name };
  refreshKeyPanel();
};
$('keys-paste').onclick = () => {
  if (!keyClipboard) return;
  const block = keyClipboard.block, at = frameTime(time, clip().fps);
  change(() => pasteKeys(clip(), block, at));
};
function jumpKey(direction: 1 | -1) {
  const c = clip(), half = 0.5 / c.fps, times = keyTimes(c);
  const next = direction > 0 ? times.find(t => t > time + half) : [...times].reverse().find(t => t < time - half);
  if (next !== undefined) { playing = false; setTime(next); }
}

// -------------------------------------------------------------- events
function renderEvents() {
  const c = clip();
  const list = Object.entries(c?.events ?? {}).sort((a, b) => a[1] - b[1]);
  $('event-list').replaceChildren(...list.map(([name, f]) => {
    const row = document.createElement('div'); row.className = 'event-row';
    const go = document.createElement('button'); go.textContent = `⚑ ${name} · เฟรม ${f}`;
    go.onclick = () => { playing = false; setTime(f / c.fps); };
    const del = document.createElement('button'); del.textContent = '✕'; del.className = 'danger'; del.title = 'ลบ event';
    del.onclick = () => change(() => { delete clip().events![name]; });
    row.append(go, del);
    return row;
  }));
  if (!list.length) $('event-list').textContent = 'ยังไม่มี event ในท่านี้';
}
$('event-add').onclick = () => {
  const name = input('event-name').value.trim().replace(/\s+/g, '_');
  if (!name) { input('event-name').focus(); return; }
  const frame = Math.min(Math.round(time * clip().fps), frameCount(clip()) - 1);
  change(() => { (clip().events ??= {})[name] = frame; });
  input('event-name').value = '';
};

// ---------------------------------------------------------- pose tools
function setPose(pose: Pose) {
  capturePins(); applyPose(pose); holder?.updateMatrixWorld(true); pins = null;
  dirty = true; commitPose(); refreshBonePanel();
}
function pastePose() { if (clipboard) setPose(clipboard); }
$('pose-copy').onclick = () => { clipboard = snapshotPose(keyable()); $('pose-paste').classList.add('ready'); };
$('pose-paste').onclick = pastePose;
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
const mirrorNow = () => setPose(mirrorPose(snapshotPose(keyable()), boneNames()));
const restNow = () => setPose({ rot: Object.fromEntries(keyable().map(n => [n, restPose.rot[n]])), root: restPose.root });
$('pose-mirror').onclick = mirrorNow;
$('pose-rest').onclick = restNow;
$('mode-rotate').onclick = () => setMode('rotate');
$('mode-ik').onclick = () => setMode('ik');
$('mode-move').onclick = () => setMode('translate');

// ------------------------------------------------------------- library
interface Stored { name: string; pose: Pose; builtIn?: boolean }
const libKey = () => `elyndra.animEditor.poses.${project.character}`;
function library(): Stored[] {
  const own = readJson<Stored[]>(libKey(), []);
  const builtIn = isMannequin ? starterPoses(restPose).map(p => ({ ...p, builtIn: true })) : [];
  return [...builtIn, ...own];
}
function renderLibrary() {
  const list = library();
  select('lib-list').replaceChildren(...list.map((p, i) => new Option(`${p.builtIn ? '★ ' : ''}${p.name}`, String(i))));
  if (list.length) select('lib-list').value = '0';
}
const pickedPose = () => library()[Number(select('lib-list').value)];
/** The selected bone and every bone below it. */
function branchNames(): string[] {
  const out: string[] = [];
  selected?.traverse(o => { if (o instanceof THREE.Bone) out.push(o.name); });
  return out;
}
$('lib-apply').onclick = () => {
  const p = pickedPose();
  if (!p) return;
  const names = keyable();
  setPose({ rot: Object.fromEntries(names.filter(n => p.pose.rot[n]).map(n => [n, p.pose.rot[n]])), root: p.pose.root });
};
$('lib-apply-part').onclick = () => {
  const p = pickedPose();
  if (!p || !selected) return;
  const names = branchNames().filter(n => p.pose.rot[n] && keyable().includes(n));
  setPose({ rot: Object.fromEntries(names.map(n => [n, p.pose.rot[n]])), root: selected === rootBone ? p.pose.root : undefined });
};
$('lib-save').onclick = () => {
  const name = input('lib-name').value.trim() || `ท่า ${library().length + 1}`;
  const own = readJson<Stored[]>(libKey(), []);
  own.push({ name, pose: snapshotPose(keyable()) });
  writeJson(libKey(), own);
  input('lib-name').value = '';
  renderLibrary(); select('lib-list').value = String(library().length - 1);
};
$('lib-del').onclick = () => {
  const i = Number(select('lib-list').value), p = library()[i];
  if (!p || p.builtIn) { alert('ท่าที่มีดาว (★) เป็นท่าตัวอย่าง ลบไม่ได้'); return; }
  const builtIns = library().filter(x => x.builtIn).length;
  const own = readJson<Stored[]>(libKey(), []);
  own.splice(i - builtIns, 1);
  writeJson(libKey(), own); renderLibrary();
};
select('lib-list').ondblclick = () => $('lib-apply').click();

// --------------------------------------------------------------- views
let currentView = 'persp';
function setView(view: string) {
  currentView = view;
  const yaw: Record<string, number> = { front: 0, left: Math.PI / 2, right: -Math.PI / 2, back: Math.PI, persp: 0.6, game: 0 };
  const pitch = view === 'game' ? GAME_PITCH : view === 'persp' ? 14 * DEG : 4 * DEG;
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
  writeJson('elyndra.animEditor.ref', refState);
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
  if (clipboard && !target.matches('input, textarea')) { e.preventDefault(); pastePose(); }
});
for (const [id, key] of [['ref-opacity', 'opacity'], ['ref-scale', 'scale'], ['ref-x', 'x'], ['ref-y', 'y']] as const) {
  input(id).oninput = () => { refState[key] = Number(input(id).value); applyRef(); };
}
$('ref-flip').onclick = () => { refState.flip = !refState.flip; applyRef(); };
$('ref-clear').onclick = () => setRefImage(null);
Object.assign(refState, readJson('elyndra.animEditor.ref', {}));
try { setRefImage(localStorage.getItem('elyndra.animEditor.refImage')); } catch { /* no saved reference */ }
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
    KeyC: () => { clipboard = snapshotPose(keyable()); },
  } : {
    Space: togglePlay, KeyK: e.shiftKey ? addBoneKey : addKey,
    Delete: e.shiftKey ? deleteBoneKey : deleteKey, Backspace: e.shiftKey ? deleteBoneKey : deleteKey,
    ArrowLeft: () => step(-1), ArrowRight: () => step(1), Home: () => setTime(0),
    Comma: () => jumpKey(-1), Period: () => jumpKey(1),
    KeyR: () => setMode('rotate'), KeyI: () => setMode('ik'), KeyG: () => setMode('translate'),
    KeyM: mirrorNow, Escape: () => selectBone(null),
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
    const loaded = upgradeProject(JSON.parse(await file.text()));
    if (!loaded) throw new Error('ไม่ใช่ไฟล์โปรเจกต์ท่าทาง');
    const known = new Set(boneNames());
    const missing = new Set(loaded.clips.flatMap(c => Object.keys(c.rot)).filter(n => !known.has(n)));
    if (missing.size && !confirm(`ไฟล์นี้มีกระดูก ${missing.size} ชิ้นที่โมเดลนี้ไม่มี (ทำมากับ "${loaded.character}") — เปิดต่อไหม?`)) return;
    change(() => { project.clips = loaded.clips; project.look = loaded.look ?? project.look; clipIndex = 0; time = 0; });
    lookChanged();
  } catch (error) { alert(`เปิดไฟล์ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`); }
};

/** An editor clip baked (with physics) to a three.js clip at 30 fps. */
function bakeClip(c: EditClip): THREE.AnimationClip {
  const fps = 30, n = Math.max(2, Math.round(c.duration * fps) + 1);
  const times = Array.from({ length: n }, (_, i) => Math.min(c.duration, i / fps));
  const rot = new Map(bones.map(b => [b, [] as number[]]));
  const pos: number[] = [];
  simulate(c, times, () => {
    for (const b of bones) rot.get(b)!.push(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    if (rootBone) pos.push(rootBone.position.x, rootBone.position.y, rootBone.position.z);
  });
  const tracks: THREE.KeyframeTrack[] = bones.map(b => new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, rot.get(b)!));
  if (rootBone) tracks.push(new THREE.VectorKeyframeTrack(`${rootBone.name}.position`, times, pos));
  return new THREE.AnimationClip(c.name, c.duration, tracks);
}
$('export-glb').onclick = async () => {
  if (!model) return;
  playing = false; gizmo.detach();
  const animations = project.clips.map(bakeClip);
  applyPose(restPose);
  const hidden: THREE.Object3D[] = [];
  model.traverse(o => { if (o.userData.outline) { o.visible = false; hidden.push(o); } });
  try {
    const glb = await new GLTFExporter().parseAsync(model, { binary: true, animations });
    download(new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' }), `${safeId()}-animated.glb`);
  } finally {
    for (const o of hidden) o.visible = true;
    showPose(); attachGizmo();
  }
};

// ------------------------------------------------------------- sprites
interface SheetOut { name: string; canvas: HTMLCanvasElement; frames: number; fps: number }
interface SpriteDefOut { id: string; generator: string; frame: { w: number; h: number }; animations: Record<string, { file: string }>; [k: string]: unknown }
let spriteRenderer: THREE.WebGLRenderer | null = null;
let lastSprites: { outputs: SheetOut[]; def: SpriteDefOut } | null = null;
const dialog = $<HTMLDialogElement>('sprite-dialog');
$('open-sprites').onclick = () => { playing = false; dialog.showModal(); };
const spriteId = () => (input('sprite-id').value.trim() || `${safeId()}_anim`).replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
const HEADING: Record<string, number> = { N: 0, NW: -Math.PI / 4, W: -Math.PI / 2, SW: -3 * Math.PI / 4, S: Math.PI };
const frameTimes = (c: EditClip) => Array.from({ length: frameCount(c) }, (_, f) => Math.min(c.duration, f / c.fps));

/** Hides the editor's helpers while `fn` draws only the character. */
function characterOnly<T>(fn: () => T): T {
  const helpers = [floor, grid, joints, gizmo.getHelper(), skeletonHelper, ...(ghosts ?? []).map(g => g.root)].filter(Boolean) as THREE.Object3D[];
  const was = helpers.map(h => h.visible);
  helpers.forEach(h => { h.visible = false; });
  const background = scene.background;
  scene.background = null;
  try { return fn(); } finally {
    helpers.forEach((h, i) => { h.visible = was[i]; });
    scene.background = background;
  }
}

async function renderSprites() {
  if (!holder || !model) return;
  const size = Number(select('sprite-size').value);
  const eightWay = select('sprite-dirs').value === '8';
  const cells = Math.max(0.5, Number(input('sprite-cells').value) || 1.5);
  const list = select('sprite-which').value === 'all' ? project.clips : [clip()];
  const rows = eightWay ? ['S', 'SW', 'W', 'NW', 'N'] as const : ['W'] as const;
  const id = spriteId();
  const results = $('sprite-results');
  results.replaceChildren(Object.assign(document.createElement('p'), { className: 'note', textContent: 'กำลังเรนเดอร์…' }));
  await new Promise(r => setTimeout(r, 30));
  playing = false;

  // One frame box for every sheet: the reach of any frame in any facing, seen
  // from the game camera (screen up is y·cos(pitch) − z·sin(pitch)).
  let halfWidth = 0, viewTop = -Infinity, viewBottom = Infinity;
  const box = new THREE.Box3(), corner = new THREE.Vector3();
  const outputs: SheetOut[] = [];
  const animations: Record<string, { file: string } & Record<string, unknown>> = {};
  let side = 1, centre = 0;
  try {
    for (const dir of rows) {
      holder.rotation.y = Math.PI - HEADING[dir];
      for (const c of list) {
        showProps(c.prop);
        simulate(c, frameTimes(c), () => {
          visibleBounds(model!, box);
          for (let i = 0; i < 8; i++) {
            corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
            const up = corner.y * Math.cos(GAME_PITCH) - corner.z * Math.sin(GAME_PITCH);
            halfWidth = Math.max(halfWidth, Math.abs(corner.x));
            viewTop = Math.max(viewTop, up); viewBottom = Math.min(viewBottom, up);
          }
        });
      }
    }
    viewBottom = Math.min(viewBottom, 0);
    side = Math.max(2 * halfWidth, viewTop - viewBottom) * 1.06;
    centre = (viewTop + viewBottom) / 2;
    const cam = new THREE.OrthographicCamera(-side / 2, side / 2, centre + side / 2, centre - side / 2, 0.01, 50);
    cam.position.set(0, Math.sin(GAME_PITCH) * 10, Math.cos(GAME_PITCH) * 10); cam.lookAt(0, 0, 0);

    spriteRenderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    spriteRenderer.outputColorSpace = THREE.SRGBColorSpace;
    spriteRenderer.setPixelRatio(1); spriteRenderer.setSize(size, size); spriteRenderer.setClearColor(0, 0);
    characterOnly(() => {
      for (const c of list) {
        showProps(c.prop);
        const frames = frameCount(c);
        const sheet = document.createElement('canvas');
        sheet.width = frames * size; sheet.height = rows.length * size;
        const ctx = sheet.getContext('2d')!;
        rows.forEach((dir, r) => {
          holder!.rotation.y = Math.PI - HEADING[dir];
          simulate(c, frameTimes(c), f => {
            spriteRenderer!.render(scene, cam);
            ctx.drawImage(spriteRenderer!.domElement, f * size, r * size);
          });
        });
        const name = c.name.replace(/[^a-z0-9_-]+/gi, '_') || 'clip';
        animations[c.name] = { file: `${name}.png`, frames, fps: c.fps, ...(c.loop ? { loop: true } : { hold: /death|die/i.test(c.name) || undefined }),
          ...(c.events && Object.keys(c.events).length ? { events: c.events } : {}) };
        outputs.push({ name, canvas: sheet, frames, fps: c.fps });
      }
    });
  } finally {
    holder.rotation.y = 0; holder.updateMatrixWorld(true);
    showProps(clip()?.prop);
    springRig?.reset();
    showPose();
  }

  const def: SpriteDefOut = {
    id, generator: 'elyndra-animation-editor', frame: { w: size, h: size },
    pivot: { x: size / 2, y: Math.round(((centre + side / 2) / side) * size) },
    pixelsPerCell: Math.round((size / side) * (modelHeight / cells) * 10) / 10,
    ...(eightWay ? { rows, mirror: { SE: 'SW', E: 'W', NE: 'NW' } } : { facingMode: 'left-right', rows }),
    animations,
  };
  lastSprites = { outputs, def };
  showSpriteResults(outputs, def);
}

function showSpriteResults(outputs: SheetOut[], def: SpriteDefOut) {
  const size = def.frame.w;
  const results = $('sprite-results');
  const json = JSON.stringify(def, null, 2);
  const head = document.createElement('div'); head.className = 'row';
  const intoProject = document.createElement('button'); intoProject.className = 'primary';
  intoProject.textContent = 'บันทึกลงโปรเจกต์ (public/sprites/<ชื่อ sprite>/)';
  intoProject.onclick = () => void saveIntoProject();
  const all = document.createElement('button'); all.textContent = 'ดาวน์โหลดทั้งหมด';
  const jsonButton = document.createElement('button'); jsonButton.textContent = `${def.id}.sprite.json`;
  jsonButton.onclick = () => download(new Blob([json], { type: 'application/json' }), `${def.id}.sprite.json`);
  const status = document.createElement('p'); status.className = 'note'; status.id = 'save-status';
  head.append(intoProject, all, jsonButton);
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
    const file = `${o.name}.png`;
    const button = document.createElement('button'); button.textContent = `↓ ${file}`;
    button.onclick = () => o.canvas.toBlob(b => b && download(b, `${def.id}_${file}`), 'image/png');
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
  results.replaceChildren(head, status, ...cards.map(c => c.card), pre);
}
$('sprite-go').onclick = () => void renderSprites();

// ---------------------------------------------- saving into the project
// The browser can write into a folder the user picks once (File System
// Access); the handle is kept in IndexedDB so later saves are one click.
type PermissionHandle = FileSystemDirectoryHandle & {
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
};
function idb<T>(fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('elyndra-animation-editor', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = fn(open.result.transaction('handles', 'readwrite').objectStore('handles'));
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    };
  });
}
async function spritesFolder(): Promise<FileSystemDirectoryHandle | null> {
  let dir = await idb<PermissionHandle | undefined>(s => s.get('sprites')).catch(() => undefined);
  if (dir && (await dir.queryPermission({ mode: 'readwrite' })) !== 'granted'
    && (await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') dir = undefined;
  if (dir) return dir;
  const picker = (window as unknown as { showDirectoryPicker?: (o: object) => Promise<PermissionHandle> }).showDirectoryPicker;
  if (!picker) { alert('เบราว์เซอร์นี้เขียนไฟล์ลงโฟลเดอร์ไม่ได้ ใช้ Chrome หรือ Edge หรือกด "ดาวน์โหลดทั้งหมด" แทน'); return null; }
  alert('เลือกโฟลเดอร์ elyndra-web/public/sprites (ครั้งแรกครั้งเดียว ครั้งต่อไปบันทึกได้เลย)');
  const picked = await picker({ id: 'elyndra-sprites', mode: 'readwrite' });
  let hasIndex = false;
  for await (const name of (picked as unknown as { keys(): AsyncIterable<string> }).keys()) if (name === 'index.json') hasIndex = true;
  if (!hasIndex && !confirm(`โฟลเดอร์ "${picked.name}" ไม่มี index.json จึงอาจไม่ใช่ public/sprites — ใช้โฟลเดอร์นี้ต่อไหม?`)) return null;
  await idb(s => s.put(picked, 'sprites')).catch(() => undefined);
  return picked;
}
/** Writes the last render into `<sprites>/<id>/`; never over a folder another tool made. */
async function writeSprites(root: FileSystemDirectoryHandle): Promise<string> {
  if (!lastSprites) throw new Error('ยังไม่ได้เรนเดอร์');
  const { outputs } = lastSprites;
  const def = { ...lastSprites.def, id: spriteId() };   // the name in the box now, even if changed after rendering
  const dir = await root.getDirectoryHandle(def.id, { create: true });
  const names: string[] = [];
  for await (const name of (dir as unknown as { keys(): AsyncIterable<string> }).keys()) names.push(name);
  if (names.includes('rig.json')) throw new Error(`โฟลเดอร์ ${def.id} เป็นชิ้นส่วนตัวละครแบบตัดแปะ ห้ามเขียนทับ เปลี่ยนชื่อ sprite`);
  if (names.includes(`${def.id}.sprite.json`)) {
    const old = JSON.parse(await (await (await dir.getFileHandle(`${def.id}.sprite.json`)).getFile()).text()) as { generator?: string };
    if (old.generator !== def.generator) throw new Error(`โฟลเดอร์ ${def.id} มี sprite ที่ไม่ได้ทำจากเครื่องมือนี้ ไม่เขียนทับ เปลี่ยนชื่อ sprite`);
  }
  const write = async (name: string, data: Blob) => {
    const file = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await file.write(data); await file.close();
  };
  for (const o of outputs) {
    const blob = await new Promise<Blob>((resolve, reject) => o.canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG')), 'image/png'));
    await write(`${o.name}.png`, blob);
  }
  await write(`${def.id}.sprite.json`, new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' }));
  return `${root.name}/${def.id}/ · ${outputs.length} ไฟล์ PNG + ${def.id}.sprite.json`;
}
async function saveIntoProject() {
  const status = $('save-status');
  try {
    const root = await spritesFolder();
    if (!root) return;
    const where = await writeSprites(root);
    status.textContent = `✔ บันทึกแล้ว: ${where} — commit ลง staging แล้วรัน play.ps1 เพื่อให้เกมเห็นไฟล์ใหม่`;
  } catch (error) {
    status.textContent = `บันทึกไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// ----------------------------------------------------- in-game preview
// The character as the game draws it: the game's 15° camera 72 cells away,
// pitched 50°, with a region's light, on grass, next to a monster sprite
// for scale, shown 1:1 in screen pixels.
const gpCanvas = $<HTMLCanvasElement>('gp-canvas');
const GP_W = 360, GP_H = 230;
let gpRenderer: THREE.WebGLRenderer | null = null;
const gpCamera = new THREE.PerspectiveCamera(15, 16 / 9, 0.05, 400);
const gpGround = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }));
gpGround.rotation.x = -Math.PI / 2; gpGround.receiveShadow = true; gpGround.visible = false; scene.add(gpGround);
new THREE.TextureLoader().load('textures/lum/grass.png', tex => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  gpGround.material.map = tex; gpGround.material.needsUpdate = true;
}, undefined, () => { gpGround.material.color.setHex(0x7d9a5a); });
const gpMonster = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.05 }));
gpMonster.visible = false; scene.add(gpMonster);
let gpMonsterInfo: { widthCells: number; heightCells: number; pivotY: number } | null = null;
const REGIONS: [string, string][] = [['lum_fld_01', 'Lumen ทุ่ง'], ['ver_fld_01', 'Verdant ป่า'], ['sol_fld_01', 'Sol ทะเลทราย'],
  ['tha_fld_01', 'Thalassa ชายฝั่ง'], ['cry_fld_01', 'Crystal หิมะ'], ['emb_fld_01', 'Ember ภูเขาไฟ'], ['noc_fld_01', 'Nocturne กลางคืน'], ['lum_dun_01', 'ดันเจี้ยน']];
select('gp-region').replaceChildren(...REGIONS.map(([id, label]) => new Option(label, id)));
input('show-game').onchange = () => { $('game-preview').hidden = !checked('show-game'); };
$('gp-close').onclick = () => { input('show-game').checked = false; $('game-preview').hidden = true; };

async function loadCompareMonster() {
  const id = select('gp-compare').value;
  gpMonsterInfo = null;
  if (!id) return;
  try {
    const def = await (await fetch(`sprites/${id}/${id}.sprite.json`)).json() as {
      frame: { w: number; h: number }; pivot: { x: number; y: number }; pixelsPerCell: number; animations: { idle: { file: string; frames: number } } };
    const scale = Number(select('gp-compare').selectedOptions[0]?.dataset.scale ?? 1);
    const tex = await new THREE.TextureLoader().loadAsync(`sprites/${id}/${def.animations.idle.file}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sheet = tex.image as { width: number; height: number };
    tex.repeat.set(def.frame.w / sheet.width, def.frame.h / sheet.height);
    tex.offset.set(0, 1 - def.frame.h / sheet.height);
    gpMonster.material.map?.dispose();
    gpMonster.material.map = tex; gpMonster.material.needsUpdate = true;
    gpMonsterInfo = { widthCells: def.frame.w / def.pixelsPerCell * scale, heightCells: def.frame.h / def.pixelsPerCell * scale, pivotY: def.pivot.y / def.frame.h };
  } catch { gpMonsterInfo = null; }
}
select('gp-compare').onchange = () => void loadCompareMonster();
try {
  const index = await (await fetch('sprites/index.json')).json() as { monsters: Record<string, { sprite: string; scale?: number }> };
  const seen = new Map<string, number>();
  for (const m of Object.values(index.monsters)) if (!seen.has(m.sprite)) seen.set(m.sprite, m.scale ?? 1);
  select('gp-compare').replaceChildren(new Option('ไม่เทียบ', ''), ...[...seen].map(([id, scale]) => {
    const o = new Option(`เทียบกับ ${id.replace(/_2d$/, '')}`, id); o.dataset.scale = String(scale); return o;
  }));
  if (seen.has('mosskin_2d')) select('gp-compare').value = 'mosskin_2d';
  void loadCompareMonster();
} catch { /* no monster list: compare stays off */ }

function renderGamePreview() {
  if (!holder || $('game-preview').hidden) return;
  if (!gpRenderer) {
    gpRenderer = new THREE.WebGLRenderer({ canvas: gpCanvas, antialias: true });
    gpRenderer.outputColorSpace = THREE.SRGBColorSpace;
    gpRenderer.shadowMap.enabled = true;
    gpRenderer.setPixelRatio(1); gpRenderer.setSize(GP_W, GP_H);
  }
  const cells = Math.max(0.5, Number(input('sprite-cells').value) || 1.5);
  const unit = modelHeight / cells;                  // model units in one game cell
  const screenH = Number(select('gp-screen').value), screenW = Math.round(screenH * 16 / 9);
  gpCamera.aspect = screenW / screenH;
  const distance = 72 * unit;
  gpCamera.position.set(0, Math.sin(GAME_PITCH) * distance, Math.cos(GAME_PITCH) * distance);
  gpCamera.lookAt(0, 0, 0);
  gpCamera.clearViewOffset(); gpCamera.updateProjectionMatrix(); gpCamera.updateMatrixWorld();
  // Crop the full game screen around the character, 1:1.
  const mid = new THREE.Vector3(0.6 * unit, modelHeight * 0.45, 0).project(gpCamera);
  const cx = (mid.x + 1) / 2 * screenW, cy = (1 - mid.y) / 2 * screenH;
  gpCamera.setViewOffset(screenW, screenH, cx - GP_W / 2, cy - GP_H / 2, GP_W, GP_H);
  gpGround.scale.set(60 * unit, 60 * unit, 1);
  const map = gpGround.material.map;
  if (map) { map.repeat.set(30, 30); }
  const region = select('gp-region').value, style = environmentStyle(region);
  const saved = { sky: sky.color.getHex(), ground: sky.groundColor.getHex(), si: sky.intensity, sun: sun.color.getHex(), sui: sun.intensity };
  sky.color.setHex(style.sky); sky.groundColor.setHex(style.bounce); sky.intensity = style.ambient;
  sun.color.setHex(style.sun); sun.intensity = style.strength;
  gpGround.material.color.setHex(region.startsWith('lum') && !region.includes('_dun_') ? 0xffffff : style.foliage);
  if (gpMonsterInfo) {
    const w = gpMonsterInfo.widthCells * unit, h = gpMonsterInfo.heightCells * unit;
    gpMonster.scale.set(w, h, 1);
    gpMonster.quaternion.copy(gpCamera.quaternion);
    // Feet (the sprite pivot) on the ground, a cell and a half to the right.
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(gpCamera.quaternion);
    gpMonster.position.set(1.4 * unit, 0, 0).addScaledVector(up, h * (gpMonsterInfo.pivotY - 0.5));
  }
  characterOnly(() => {
    gpGround.visible = true; gpMonster.visible = !!gpMonsterInfo;
    scene.background = new THREE.Color(style.foliage);
    gpRenderer!.render(scene, gpCamera);
    gpGround.visible = false; gpMonster.visible = false;
  });
  sky.color.setHex(saved.sky); sky.groundColor.setHex(saved.ground); sky.intensity = saved.si;
  sun.color.setHex(saved.sun); sun.intensity = saved.sui;
  const px = modelHeight * screenH / (2 * distance * Math.tan(7.5 * DEG));
  $('gp-info').textContent = `ตัวสูง ≈ ${Math.round(px)} px บนจอ ${screenH}p · 1 ช่อง ≈ ${Math.round(px / cells)} px · ตั้งความสูงที่ "เรนเดอร์ Sprite → ตัวสูงกี่ช่อง"`;
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const c = clip();
  if (playing && c) {
    time += dt * Number(select('speed').value);
    if (time >= c.duration) {
      if (c.loop) time %= c.duration; else { time = c.duration; playing = false; updateGhosts(); }
    }
    showPose(); refreshTransport();
  }
  if (holder) {
    if (shakeLeft > 0) { shakeLeft = Math.max(0, shakeLeft - dt); holder.position.x = Math.sin(shakeLeft * 40) * 0.06 * modelHeight * shakeLeft; }
    else holder.position.x = 0;
    holder.updateMatrixWorld(true);
    if (physicsOn() && !gizmo.dragging) springRig!.update(dt, physics);
  }
  if (mode === 'ik' && ikChain && !gizmo.dragging) ikChain.end.getWorldPosition(ikProxy.position);
  for (const [bone, marker] of jointMarkers) bone.getWorldPosition(marker.position);
  orbit.update();
  renderer.render(scene, camera);
  renderGamePreview();
});

// --------------------------------------------------------------- start
const sources: Source[] = [{ id: 'wayfarer', label: 'Wayfarer (หุ่นตัวอย่าง)' }];
input('load-glb').onchange = () => {
  const file = input('load-glb').files?.[0];
  input('load-glb').value = '';
  if (!file) return;
  const src: Source = { id: `file_${file.name.replace(/\.[^.]+$/, '')}`, label: file.name, file };
  sources.push(src);
  select('character').append(new Option(`${file.name} (ไฟล์)`, src.id));
  select('character').value = src.id;
  void loadSource(src);
};
select('character').onchange = () => {
  const src = sources.find(s => s.id === select('character').value);
  if (src) void loadSource(src);
};
try {
  const response = await fetch('models/monsters/animated/rig-manifest.json');
  if (response.ok) {
    for (const c of (await response.json()).characters as { id: string; label: string; url: string }[]) sources.push({ id: c.id, label: c.label, url: c.url });
  }
} catch { /* monsters are optional */ }
select('character').replaceChildren(...sources.map(s => new Option(s.label, s.id)));
const wanted = sources.find(s => s.id === new URLSearchParams(location.search).get('model')) ?? sources[0];
select('character').value = wanted.id;
await loadSource(wanted);

// Inspection and test hooks for smoke tests and console troubleshooting.
Object.defineProperty(window, '__animationEditor', { value: {
  snapshot: () => ({ character: project.character, bones: bones.length, clips: project.clips.map(c => ({ name: c.name, keys: keyCount(c) })),
    clip: clip()?.name, time, playing, dirty, selected: selected?.name ?? null, mode, springs: springBones.length,
    events: clip()?.events ?? {}, keyedHere: clip() ? keyedAt(clip(), frameTime(time, clip().fps)) : [] }),
  /** Selects a bone by name (tests drive the UI this way). */
  select: (name: string) => selectBone(boneByName.get(name) ?? null),
  /** Drags the IK target (tests): world offset from the hand/foot. */
  ikDrag: (dx: number, dy: number, dz: number) => {
    if (!ikChain) return false;
    gizmo.dispatchEvent({ type: 'dragging-changed', value: true });
    ikProxy.position.add(new THREE.Vector3(dx, dy, dz));
    gizmo.dispatchEvent({ type: 'objectChange' });
    gizmo.dispatchEvent({ type: 'dragging-changed', value: false });
    return ikChain.end.getWorldPosition(new THREE.Vector3()).distanceTo(ikProxy.position);
  },
  /** Moves the root bone like the move gizmo would (tests); returns how far each foot drifted. */
  moveRoot: (dx: number, dy: number, dz: number) => {
    if (!rootBone) return null;
    selectBone(rootBone); setMode('translate');
    const feet = chains.filter(c => c.kind === 'leg').map(c => c.end.getWorldPosition(new THREE.Vector3()));
    gizmo.dispatchEvent({ type: 'dragging-changed', value: true });
    rootBone.position.add(new THREE.Vector3(dx, dy, dz)); rootBone.updateMatrixWorld(true);
    gizmo.dispatchEvent({ type: 'objectChange' });
    gizmo.dispatchEvent({ type: 'dragging-changed', value: false });
    return chains.filter(c => c.kind === 'leg').map((c, i) => c.end.getWorldPosition(new THREE.Vector3()).distanceTo(feet[i]));
  },
  /** Saves the last sprite render into a folder handle (tests use the origin-private file system). */
  saveSpritesTo: (root: FileSystemDirectoryHandle) => writeSprites(root),
} });
