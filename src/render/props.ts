import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PropKind } from "../data/schema";

// Low-poly stand-in models for every prop kind, built from primitives with
// vertex colours so each kind is one InstancedMesh. Palette: weathered
// cream stone, brass and copper, and Aetherite teal, the Aethrion look.

const C = {
  bark: 0x5a4330, leaf: 0x4f8f53, leafDark: 0x356b44, pine: 0x2f5e44, stone: 0xb9ad94, stoneDark: 0x857a68, rock: 0x8d8a80,
  brass: 0xc2964a, copper: 0xb0643a, iron: 0x4a4d55, aether: 0x5ee0ec, glow: 0xffe08a, cloth: 0x8c2f3c, canvas: 0xd9cba3,
  cream: 0xe5d8b8, roof: 0x9a4b34, wood: 0x8a6440, water: 0x4f9fb8, ice: 0xcfe9f5, coral: 0xe07a6a, violet: 0x6a4fa0, ember: 0xff7a2a,
};

function part(geo: THREE.BufferGeometry, color: number, at: [number, number, number] = [0, 0, 0], rot?: [number, number, number]): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (rot) g.rotateX(rot[0]).rotateY(rot[1]).rotateZ(rot[2]);
  g.translate(at[0], at[1], at[2]);
  const col = new THREE.Color(color);
  const n = g.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute("uv");
  return g;
}

const cyl = (rt: number, rb: number, h: number, seg = 7) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);

function build(kind: PropKind): THREE.BufferGeometry {
  switch (kind) {
    case "tree": return mergeGeometries([part(cyl(0.12, 0.18, 1.2), C.bark), part(new THREE.IcosahedronGeometry(0.85, 0), C.leaf, [0, 1.75, 0])]);
    case "pine": return mergeGeometries([part(cyl(0.1, 0.15, 0.8), C.bark), part(new THREE.ConeGeometry(0.8, 1.4, 7), C.pine, [0, 1.3, 0]), part(new THREE.ConeGeometry(0.55, 1.1, 7), C.pine, [0, 2.0, 0])]);
    case "giant_tree": return mergeGeometries([part(cyl(0.45, 0.8, 4, 8), C.bark), part(new THREE.IcosahedronGeometry(2.6, 1), C.leafDark, [0, 5, 0]), part(new THREE.IcosahedronGeometry(1.6, 0), C.leaf, [1.2, 6, 0.6])]);
    case "palm": return mergeGeometries([part(cyl(0.1, 0.16, 2.6), C.bark, [0, 0, 0], [0, 0, 0.15]), ...[0, 1, 2, 3, 4].map((i) => part(box(0.25, 0.05, 1.4), C.leaf, [Math.sin(i * 1.26) * 0.6 + 0.35, 2.55, Math.cos(i * 1.26) * 0.6], [0.3, i * 1.26, 0]))]);
    case "dead_tree": return mergeGeometries([part(cyl(0.1, 0.16, 1.6), 0x4b4038), part(cyl(0.04, 0.07, 0.8), 0x4b4038, [0.1, 1.1, 0], [0, 0, -0.9]), part(cyl(0.04, 0.06, 0.6), 0x4b4038, [-0.1, 1.3, 0], [0, 0, 0.8])]);
    case "coral": return mergeGeometries([0, 1, 2].map((i) => part(new THREE.ConeGeometry(0.18, 0.9 + i * 0.2, 5), [C.coral, 0xf0a060, 0xd05080][i], [Math.cos(i * 2) * 0.25, 0.45, Math.sin(i * 2) * 0.25])));
    case "bush": return part(new THREE.IcosahedronGeometry(0.42, 0).scale(1, 0.7, 1), C.leaf, [0, 0.25, 0]);
    case "rock": return part(new THREE.DodecahedronGeometry(0.42, 0), C.rock, [0, 0.2, 0]);
    case "boulder": return part(new THREE.DodecahedronGeometry(0.95, 0), C.rock, [0, 0.55, 0]);
    case "crystal": return mergeGeometries([part(new THREE.OctahedronGeometry(0.3, 0).scale(1, 2.4, 1), C.aether, [0, 0.7, 0]), part(new THREE.OctahedronGeometry(0.18, 0).scale(1, 2, 1), 0x9ff4fa, [0.25, 0.4, 0.1], [0, 0, -0.4])]);
    case "ice_spike": return part(new THREE.ConeGeometry(0.3, 1.8, 5), C.ice, [0, 0.9, 0]);
    case "aether_pylon": return mergeGeometries([part(box(0.8, 0.35, 0.8), C.stone), part(cyl(0.16, 0.22, 1.5), C.brass, [0, 0.35, 0]), part(new THREE.TorusGeometry(0.28, 0.05, 5, 10), C.copper, [0, 1.4, 0], [Math.PI / 2, 0, 0]), part(new THREE.OctahedronGeometry(0.3, 0).scale(1, 1.6, 1), C.aether, [0, 2.2, 0])]);
    case "brass_pipe": return mergeGeometries([part(cyl(0.22, 0.22, 3, 8), C.brass, [-1.5, 0.3, 0], [0, 0, Math.PI / 2]), part(new THREE.TorusGeometry(0.26, 0.05, 5, 10), C.copper, [-0.6, 0.3, 0], [0, Math.PI / 2, 0]), part(new THREE.TorusGeometry(0.26, 0.05, 5, 10), C.copper, [0.6, 0.3, 0], [0, Math.PI / 2, 0]), part(box(0.3, 0.3, 0.4), C.stoneDark, [1.2, 0, 0])]);
    case "gear_ruin": return mergeGeometries([part(new THREE.TorusGeometry(0.9, 0.18, 4, 12), 0x8a6a3a, [0, 0.6, 0], [0.4, 0, 0]), part(box(0.9, 0.5, 0.7), C.stoneDark, [0.6, 0, 0.3]), part(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 8), C.brass, [0, 0.6, 0], [Math.PI / 2 + 0.4, 0, 0])]);
    case "rune_stone": return mergeGeometries([part(box(0.5, 1.6, 0.3), C.stone), part(box(0.08, 1.1, 0.32), C.aether, [0, 0.25, 0])]);
    case "lattice_obelisk": return mergeGeometries([part(box(1, 0.4, 1), C.stoneDark), part(new THREE.OctahedronGeometry(0.5, 0).scale(1, 3.2, 1), C.violet, [0, 1.9, 0]), part(new THREE.TorusGeometry(0.7, 0.05, 5, 16), C.aether, [0, 1.6, 0], [Math.PI / 2, 0, 0])]);
    case "aqueduct": return mergeGeometries([...[-2.4, -0.8, 0.8, 2.4].map((x) => part(box(0.45, 1.8, 0.6), C.stone, [x, 0, 0])), part(box(5.6, 0.45, 0.8), C.stone, [0, 1.8, 0]), part(box(5.6, 0.12, 0.4), C.water, [0, 2.25, 0])]);
    case "lamp_post": return mergeGeometries([part(cyl(0.05, 0.08, 2), C.iron), part(new THREE.IcosahedronGeometry(0.16, 0), C.glow, [0, 2.05, 0])]);
    case "market_stall": return mergeGeometries([part(box(1.6, 0.8, 0.9), C.wood), ...[[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]].map(([x, z]) => part(cyl(0.04, 0.04, 1.6, 4), C.wood, [x, 0, z])), part(box(1.8, 0.08, 1.1), C.cloth, [0, 1.6, 0], [0.12, 0, 0])]);
    case "fountain": return mergeGeometries([part(cyl(1.5, 1.6, 0.5, 14), C.stone), part(cyl(1.25, 1.25, 0.05, 14), C.water, [0, 0.47, 0]), part(cyl(0.2, 0.3, 1.4), C.stone, [0, 0.4, 0]), part(new THREE.OctahedronGeometry(0.35, 0).scale(1, 1.6, 1), C.aether, [0, 2.1, 0])]);
    case "house": return mergeGeometries([part(box(3, 2, 3), C.cream), part(new THREE.ConeGeometry(2.4, 1.4, 4), C.roof, [0, 2.7, 0], [0, Math.PI / 4, 0])]);
    case "hall": return mergeGeometries([part(box(1.6, 0.9, 0.1), C.cloth, [0, 3.4, 7.1]), part(new THREE.OctahedronGeometry(0.35, 0).scale(1, 1.5, 1), C.aether, [0, 4.6, 7.1])]);
    case "workshop": return mergeGeometries([part(cyl(0.45, 0.55, 2.6, 8), C.stoneDark, [3, 3, -2]), part(box(1.4, 0.15, 0.6), C.brass, [0, 3.2, 6.1])]);
    case "transit_gate": return mergeGeometries([part(box(0.5, 2.6, 0.5), C.stone, [-1.3, 0, 0]), part(box(0.5, 2.6, 0.5), C.stone, [1.3, 0, 0]), part(new THREE.TorusGeometry(1.2, 0.12, 6, 20), C.brass, [0, 1.5, 0]), part(new THREE.CircleGeometry(1.05, 20), C.aether, [0, 1.5, 0])]);
    case "tent": return mergeGeometries([part(new THREE.ConeGeometry(1.1, 1.5, 4), C.canvas, [0, 0.75, 0], [0, Math.PI / 4, 0]), part(cyl(0.03, 0.03, 1.8, 4), C.wood)]);
    case "furnace": return mergeGeometries([part(box(1.6, 1.4, 1.4), C.stoneDark), part(box(0.7, 0.5, 0.1), C.ember, [0, 0.3, 0.71]), part(cyl(0.25, 0.3, 1.2), C.iron, [0.4, 1.4, -0.3])]);
    case "anvil": return mergeGeometries([part(box(0.35, 0.4, 0.3), C.iron), part(box(0.8, 0.2, 0.35), C.iron, [0, 0.4, 0])]);
    case "dock": return mergeGeometries([part(box(3, 0.15, 1.4), C.wood, [0, 0.3, 0]), ...[-1.3, 1.3].map((x) => part(cyl(0.08, 0.08, 0.6, 5), C.wood, [x, 0, 0.6]))]);
    case "waterwheel": return mergeGeometries([part(box(0.5, 2.2, 0.5), C.stone, [-1, 0, 0]), part(box(0.5, 2.2, 0.5), C.stone, [1, 0, 0])]);
    case "windmill": return mergeGeometries([part(cyl(0.9, 1.3, 5, 10), C.cream), part(new THREE.ConeGeometry(1.15, 1.2, 10), C.roof, [0, 5.6, 0]), part(box(0.6, 0.9, 0.1), C.wood, [0, 0, 1.25])]);
    case "observatory": return mergeGeometries([part(cyl(1.4, 1.5, 2.2, 12), C.stone), part(new THREE.SphereGeometry(1.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), C.brass, [0, 2.2, 0]), part(cyl(0.15, 0.2, 1.4), C.copper, [0.5, 3.1, 0], [0, 0, -0.7])]);
    case "statue": return mergeGeometries([part(box(1.2, 0.6, 1.2), C.stone), part(new THREE.CapsuleGeometry(0.3, 1, 3, 8), C.stone, [0, 1.4, 0]), part(new THREE.IcosahedronGeometry(0.22, 0), C.stone, [0, 2.3, 0])]);
    case "crate": return part(box(0.7, 0.7, 0.7), C.wood);
    case "fence_post": return mergeGeometries([part(box(0.12, 0.8, 0.12), C.wood), part(box(1, 0.08, 0.06), C.wood, [0.5, 0.55, 0])]);
    case "cave_mouth": return mergeGeometries([part(new THREE.TorusGeometry(1.6, 0.6, 5, 10, Math.PI), C.rock, [0, 0, 0], [0, Math.PI / 2, 0]), part(new THREE.CircleGeometry(1.3, 12, 0, Math.PI), 0x0b0d0f, [0, 0, 0], [0, Math.PI / 2, 0])]);
    default: return part(box(0.5, 0.5, 0.5), 0xff00ff);
  }
}

const cache = new Map<PropKind, THREE.BufferGeometry>();
export function propGeometry(kind: PropKind): THREE.BufferGeometry {
  let g = cache.get(kind);
  if (!g) { g = build(kind); cache.set(kind, g); }
  return g;
}

/** Animated props (sails and wheels) are separate meshes so they can turn. */
export function animatedProp(kind: PropKind): THREE.Object3D | null {
  if (kind === "windmill") {
    const sails = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xe9dcc0, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.05).translate(0, 1.9, 0), mat);
      s.rotation.z = (i * Math.PI) / 2;
      sails.add(s);
    }
    sails.position.set(0, 4.6, 1.15);
    sails.userData.spin = { axis: "z", speed: 0.6 };
    return sails;
  }
  if (kind === "waterwheel") {
    const wheel = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: C.wood, flatShading: true });
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 4, 16), mat));
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.4), mat);
      p.rotation.z = (i * Math.PI) / 8;
      wheel.add(p);
    }
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 1.2, 0);
    wheel.userData.spin = { axis: "x", speed: -0.8 };
    return wheel;
  }
  return null;
}
