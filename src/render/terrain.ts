import * as THREE from "three";
import type { BlockerKind, MapLayout, RegionDef, Shape, WarpDef } from "../data/schema";
import { decodeWalk } from "../data/schema";
import { animatedProp, propGeometry } from "./props";
import { applyLumerisTiles, type TerrainSurface } from "./terrainTiles";

// Builds a map from its layout JSON: painted ground and roads, flat
// water/lava, extruded cliffs, walls and buildings, instanced props, cave
// walls for dungeons, and warp portals. One cell = one world unit; cell
// (x, y) spans x..x+1, z = y..y+1.

const TEX_PER_CELL = 8;
/** Big world-v3 fields (384 cells) paint at 6 px a cell to keep the canvas near 2300 px. */
const texPerCell = (l: MapLayout) => (l.width > 256 ? 6 : TEX_PER_CELL);

/** Is cell (x, y) inside a shape (cell centres, as content/layout.ts bakes them)? */
function inShape(s: Shape, x: number, y: number): boolean {
  const px = x + 0.5, py = y + 0.5;
  if ("rect" in s) { const [rx, ry, rw, rh] = s.rect; return x >= rx && y >= ry && x < rx + rw && y < ry + rh; }
  if ("ellipse" in s) { const [cx, cy, rx, ry] = s.ellipse; return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1; }
  let inside = false;
  for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) {
    const [xi, yi] = s.poly[i], [xj, yj] = s.poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The ground of every cell: the map's own, unless a patch covers it. */
export function groundAt(l: MapLayout): (x: number, y: number) => MapLayout["ground"] {
  const patches = l.ground_patches ?? [];
  if (!patches.length) return () => l.ground;
  return (x, y) => {
    let g = l.ground;
    for (const p of patches) if (inShape(p.shape, x, y)) g = p.ground;
    return g;
  };
}

const GROUND: Record<MapLayout["ground"], string[]> = {
  grass: ["#5e8c56", "#668f58", "#6f9a5e", "#5a8552", "#73a062"],
  moss: ["#4f7a52", "#577f55", "#5e8a5c", "#4a7450"],
  sand: ["#d8c08a", "#ceb47e", "#e0c994", "#c9ad76"],
  snow: ["#e8eef2", "#dfe7ee", "#f0f4f7", "#d6e0e8"],
  ash: ["#5b524c", "#635850", "#544b46", "#6b5f55"],
  stone: ["#bdb39b", "#c4baa2", "#b5ab93", "#c9bfa8"],
  shore: ["#cdbf94", "#c2b588", "#d5c79c", "#9fb6a0"],
  cave: ["#3a342f", "#403a33", "#36302c", "#433c35"],
  metal: ["#4d4f58", "#555762", "#474952", "#5b5d67"],
};

const ROAD: Record<string, string> = {
  dirt: "#b4a37c", stone: "#cfc4a8", brass: "#b8955a", bridge: "#8a6a48", boardwalk: "#8f7150", ice: "#d8eaf3", obsidian: "#2b2530",
};

const FLAT: Partial<Record<BlockerKind, { color: number; emissive?: number; opacity: number }>> = {
  water: { color: 0x4f9fb8, opacity: 0.88 }, lava: { color: 0xff6a1a, emissive: 0xc23a00, opacity: 1 },
  chasm: { color: 0x07080a, opacity: 1 }, ice: { color: 0xcfe8f4, opacity: 0.95 },
};

const SOLID: Partial<Record<BlockerKind, { color: number; height: number }>> = {
  cliff: { color: 0x7d776c, height: 2.8 }, rock: { color: 0x8d8a80, height: 1.4 }, ruin_wall: { color: 0xb9ad94, height: 1.7 },
  building: { color: 0xe5d8b8, height: 3.2 }, fence: { color: 0x8a6440, height: 0.8 }, machine: { color: 0x8a6a3a, height: 2.2 },
  crystal: { color: 0x5ee0ec, height: 2.4 },
};

function toShape(s: Shape): THREE.Shape {
  // Shapes are drawn in (x, -y) and rotated flat, so y in cells becomes +z.
  if ("rect" in s) {
    const [x, y, w, h] = s.rect;
    const sh = new THREE.Shape();
    sh.moveTo(x, -y); sh.lineTo(x + w, -y); sh.lineTo(x + w, -(y + h)); sh.lineTo(x, -(y + h)); sh.closePath();
    return sh;
  }
  if ("ellipse" in s) {
    const [cx, cy, rx, ry] = s.ellipse;
    const sh = new THREE.Shape();
    sh.absellipse(cx, -cy, rx, ry, 0, Math.PI * 2, false, 0);
    return sh;
  }
  const sh = new THREE.Shape();
  s.poly.forEach(([x, y], i) => (i ? sh.lineTo(x, -y) : sh.moveTo(x, -y)));
  sh.closePath();
  return sh;
}

function paintGround(l: MapLayout, region: RegionDef | undefined): HTMLCanvasElement {
  const T = texPerCell(l);
  const c = document.createElement("canvas");
  c.width = l.width * T;
  c.height = l.height * T;
  const g = c.getContext("2d")!;
  let seed = 1234567;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ground = groundAt(l);
  for (let y = 0; y < l.height; y++) for (let x = 0; x < l.width; x++) {
    const pal = GROUND[ground(x, y)];
    g.fillStyle = pal[Math.floor(rand() * pal.length)];
    g.fillRect(x * T, y * T, T, T);
  }
  for (let i = 0; i < (l.width * l.height) / 6; i++) {
    g.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,230,0.05)";
    g.beginPath();
    g.arc(rand() * c.width, rand() * c.height, 6 + rand() * 26, 0, Math.PI * 2);
    g.fill();
  }
  // Flower specks on grass and moss only (patches included).
  for (let i = 0; i < l.width * l.height * 0.3; i++) {
    const x = rand() * c.width, y = rand() * c.height, gr = ground(Math.floor(x / T), Math.floor(y / T));
    const colour = ["#e8d98a", "#f2f0e2", "#c9a8dc", "#3f6b3f"][Math.floor(rand() * 4)];
    if (gr !== "grass" && gr !== "moss") continue;
    g.fillStyle = colour;
    g.fillRect(x, y, 1.6, 1.6);
  }
  // Safe areas (camps, plazas): trampled ground.
  for (const [x, y, w, h] of l.safe_areas) {
    if (w >= l.width && h >= l.height) continue;
    g.fillStyle = "rgba(210,190,140,0.25)";
    g.fillRect(x * T, y * T, w * T, h * T);
  }
  // Roads: an edge then a fill so they read at any zoom.
  for (const r of l.roads) {
    for (const [width, color] of [[r.width + 0.6, "rgba(60,45,30,0.35)"], [r.width, ROAD[r.kind] ?? "#b4a37c"]] as const) {
      g.strokeStyle = color;
      g.lineWidth = width * T;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      r.points.forEach(([x, y], i) => (i ? g.lineTo(x * T, y * T) : g.moveTo(x * T, y * T)));
      g.stroke();
    }
  }
  void region;
  return c;
}

export interface BuiltMap {
  group: THREE.Group;
  animated: THREE.Object3D[];
  portals: { warp: WarpDef; mesh: THREE.Object3D }[];
  /** Resolves when optional painted tiles are applied (fallback stays usable). */
  ready: Promise<void>;
  tileTime: { value: number };
  dispose(): void;
}

export function buildMap(l: MapLayout, region: RegionDef | undefined, warps: WarpDef[]): BuiltMap {
  const group = new THREE.Group();
  const animated: THREE.Object3D[] = [];
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  let disposed = false;
  const tileTime = { value: 0 };
  const surfaces: TerrainSurface[] = [];

  const tex = track(new THREE.CanvasTexture(paintGround(l, region)));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(l.width, l.height).rotateX(-Math.PI / 2)), track(new THREE.MeshLambertMaterial({ map: tex })));
  ground.name = "terrain-ground";
  ground.position.set(l.width / 2, 0, l.height / 2);
  group.add(ground);
  const beyond = new THREE.Mesh(track(new THREE.PlaneGeometry(l.width * 4, l.height * 4).rotateX(-Math.PI / 2)),
    track(new THREE.MeshLambertMaterial({ color: l.ground === "cave" ? 0x0c0b0a : 0x2c4430 })));
  beyond.position.set(l.width / 2, -0.06, l.height / 2);
  group.add(beyond);

  // Blockers.
  for (const b of l.blockers) {
    const flat = FLAT[b.kind];
    const solid = SOLID[b.kind];
    if (flat) {
      const m = new THREE.Mesh(track(new THREE.ShapeGeometry(toShape(b.shape), 24).rotateX(-Math.PI / 2)),
        track(new THREE.MeshPhongMaterial({ color: flat.color, emissive: flat.emissive ?? 0, transparent: flat.opacity < 1, opacity: flat.opacity, shininess: 80 })));
      m.position.y = 0.04;
      surfaces.push({ kind: b.kind, geometry: m.geometry, material: m.material });
      group.add(m);
    } else if (solid) {
      const geo = track(new THREE.ExtrudeGeometry(toShape(b.shape), { depth: solid.height, bevelEnabled: false, curveSegments: 16 }).rotateX(-Math.PI / 2));
      const m = new THREE.Mesh(geo, track(new THREE.MeshLambertMaterial({ color: solid.color, flatShading: true, transparent: b.kind === "crystal", opacity: b.kind === "crystal" ? 0.8 : 1 })));
      surfaces.push({ kind: b.kind, geometry: geo, material: m.material });
      group.add(m);
      if (b.kind === "building") {
        const roof = new THREE.Mesh(track(new THREE.ExtrudeGeometry(toShape(b.shape), { depth: 0.35, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.2, bevelSegments: 1 }).rotateX(-Math.PI / 2)),
          track(new THREE.MeshLambertMaterial({ color: 0x9a4b34, flatShading: true })));
        roof.position.y = solid.height;
        group.add(roof);
      }
    }
  }

  // Cave maps: wall blocks on every solid cell that borders open ground.
  if (l.ground === "cave") {
    const walk = decodeWalk(l.walk_rle, l.width * l.height);
    const cells: [number, number][] = [];
    for (let y = 0; y < l.height; y++) for (let x = 0; x < l.width; x++) {
      if (walk[y * l.width + x]) continue;
      let edge = false;
      for (let dy = -2; dy <= 2 && !edge; dy++) for (let dx = -2; dx <= 2 && !edge; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < l.width && ny < l.height && walk[ny * l.width + nx]) edge = true;
      }
      if (edge) cells.push([x, y]);
    }
    const wall = new THREE.InstancedMesh(track(new THREE.BoxGeometry(1, 3.2, 1).translate(0.5, 1.6, 0.5)), track(new THREE.MeshLambertMaterial({ color: 0x4a4038, flatShading: true })), cells.length);
    const m = new THREE.Matrix4();
    cells.forEach(([x, y], i) => { m.makeScale(1, 0.8 + ((x * 7 + y * 13) % 5) / 10, 1).setPosition(x, 0, y); wall.setMatrixAt(i, m); });
    group.add(wall);
    surfaces.push({ kind: "cliff", geometry: wall.geometry, material: wall.material });
  }

  // A painted road at y=0 was hidden under water. Decks now follow the exact
  // authored crossing segments above the surface; walk data stays authoritative.
  for (const road of l.roads) {
    if (road.kind !== "bridge" && road.kind !== "boardwalk") continue;
    const boards: { x: number; z: number; angle: number; length: number }[] = [];
    for (let i = 1; i < road.points.length; i++) {
      const [ax, az] = road.points[i - 1], [bx, bz] = road.points[i];
      const length = Math.hypot(bx - ax, bz - az), count = Math.ceil(length / 0.55);
      for (let n = 0; n < count; n++) {
        const t = (n + 0.5) / count;
        boards.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, angle: Math.atan2(bx - ax, bz - az), length: length / count });
      }
    }
    const deck = new THREE.InstancedMesh(track(new THREE.BoxGeometry(road.width, 0.16, 1)), track(new THREE.MeshLambertMaterial({ color: 0xb39268 })), boards.length);
    deck.name = "crossing-deck";
    const transform = new THREE.Object3D();
    boards.forEach((b, i) => {
      transform.position.set(b.x, 0.13, b.z); transform.rotation.y = b.angle;
      transform.scale.set(1, 1, b.length * 0.97); transform.updateMatrix();
      deck.setMatrixAt(i, transform.matrix);
      deck.setColorAt(i, new THREE.Color().setScalar(0.72 + (i % 5) * 0.035));
    });
    group.add(deck);
  }

  // Props, one InstancedMesh per kind.
  // Soft contact shadows tie the stand-in props to the painted floor in one draw.
  if (region?.id === "lum") {
    const radius: Partial<Record<typeof l.props[number]["kind"], number>> = {
      tree: 1.15, pine: 1, bush: 0.5, rock: 0.5, boulder: 1.1,
      aether_pylon: 0.65, rune_stone: 0.5, tent: 1.4, crate: 0.55,
      fountain: 1.7, windmill: 1.8, market_stall: 1.3, lamp_post: 0.35,
    };
    const casters = l.props.filter(p => radius[p.kind]);
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const fade = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
    fade.addColorStop(0, "rgba(15,24,12,.38)"); fade.addColorStop(0.45, "rgba(15,24,12,.2)"); fade.addColorStop(1, "rgba(15,24,12,0)");
    ctx.fillStyle = fade; ctx.fillRect(0, 0, 64, 64);
    const map = track(new THREE.CanvasTexture(canvas)); map.colorSpace = THREE.SRGBColorSpace;
    const shadows = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)),
      track(new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false })), casters.length);
    const transform = new THREE.Object3D();
    casters.forEach((p, i) => {
      const size = radius[p.kind]! * (p.scale ?? 1);
      transform.position.set(p.x + 0.5, 0.015, p.y + 0.5);
      transform.scale.set(size, 1, size * 0.85); transform.updateMatrix();
      shadows.setMatrixAt(i, transform.matrix);
    });
    group.add(shadows);
  }
  const byKind = new Map<string, typeof l.props>();
  for (const p of l.props) byKind.set(p.kind, [...(byKind.get(p.kind) ?? []), p]);
  const mat = track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const glow = track(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const dummy = new THREE.Object3D();
  for (const [kind, list] of byKind) {
    const geo = propGeometry(kind as never);
    const inst = new THREE.InstancedMesh(geo, kind === "crystal" ? glow : mat, list.length);
    list.forEach((p, i) => {
      dummy.position.set(p.x + 0.5, 0, p.y + 0.5);
      dummy.rotation.set(0, p.rot ?? 0, 0);
      dummy.scale.setScalar(p.scale ?? 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      const v = 0.85 + (((p.x * 31 + p.y * 17) % 30) / 100);
      inst.setColorAt(i, new THREE.Color(v, v, v));
      const anim = animatedProp(kind as never);
      if (anim) {
        const holder = new THREE.Group();
        holder.position.copy(dummy.position);
        holder.rotation.copy(dummy.rotation);
        holder.scale.copy(dummy.scale);
        holder.add(anim);
        group.add(holder);
        animated.push(anim);
      }
    });
    group.add(inst);
  }

  // Warp portals: a glowing ring and pillar of light over each trigger.
  const portals: BuiltMap["portals"] = [];
  const ringMat = track(new THREE.MeshBasicMaterial({ color: 0x7ff0ff, transparent: true, opacity: 0.75, depthWrite: false }));
  const beamMat = track(new THREE.MeshBasicMaterial({ color: 0x7ff0ff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  for (const w of warps) {
    const [x, y, ww, hh] = w.trigger_rect;
    const r = Math.max(ww, hh) / 2 + 0.3;
    const portal = new THREE.Group();
    portal.position.set(x + ww / 2, 0.05, y + hh / 2);
    portal.add(new THREE.Mesh(track(new THREE.RingGeometry(r - 0.25, r, 32).rotateX(-Math.PI / 2)), ringMat));
    portal.add(new THREE.Mesh(track(new THREE.CylinderGeometry(r * 0.8, r, 3, 24, 1, true).translate(0, 1.5, 0)), beamMat));
    portal.userData.spin = { axis: "y", speed: 0.4 };
    group.add(portal);
    animated.push(portal);
    portals.push({ warp: w, mesh: portal });
  }
  const ready = region?.id === "lum"
    ? applyLumerisTiles(l, ground.material, surfaces, track, () => disposed, tileTime)
      .catch(error => { console.warn("Painted terrain unavailable; keeping fallback", error); })
    : Promise.resolve();
  return { group, animated, portals, ready, tileTime, dispose: () => {
    if (disposed) return;
    disposed = true;
    disposables.forEach((d) => d.dispose());
  } };
}

export function animate(built: BuiltMap, dt: number) {
  built.tileTime.value += Math.min(dt, 0.1);
  for (const o of built.animated) {
    const s = o.userData.spin as { axis: "x" | "y" | "z"; speed: number } | undefined;
    if (s) o.rotation[s.axis] += s.speed * dt;
  }
}

export function makeCellMarker(color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.45, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
  m.position.y = 0.06;
  return m;
}
