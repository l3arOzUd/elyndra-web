import * as THREE from "three";
import type { BlockerKind, MapLayout, Shape } from "../data/schema";

// Painted ground for every map. The ten painted Lumeris textures are the
// only ground art, so every ground type is a recipe over them (texture,
// tint, desaturation, lift): sand, snow, ash and metal included. A map
// blends its own ground with up to two zone grounds, its roads, camp
// trampling, forest moss and plaza. Boundaries are warped by noise and
// roads get a darker painted rim, so nothing reads as a straight-edged
// stamp; each texture is sampled twice at different angles and scales so
// its repeat doesn't show.

export const PAINTED_TILES = ["grass", "grass_dry", "moss", "dirt_path", "cobblestone", "plaza_tile", "cave_floor", "water", "cliff_rock", "ruin_wall"] as const;
type Tile = typeof PAINTED_TILES[number];
type Track = <T extends { dispose(): void }>(resource: T) => T;
type Ground = MapLayout["ground"];
type RoadKind = MapLayout["roads"][number]["kind"];
export interface TerrainSurface { kind: BlockerKind; geometry: THREE.BufferGeometry; material: THREE.MeshLambertMaterial | THREE.MeshPhongMaterial }

/** How a painted texture becomes a ground: tint × mix(texture, grey, desat) + lift, at scale cells a repeat. */
interface Paint { tex: Tile; tint: [number, number, number]; desat: number; lift: number; scale: number }
const paint = (tex: Tile, tint: [number, number, number] = [1, 1, 1], desat = 0, lift = 0, scale = 8): Paint => ({ tex, tint, desat, lift, scale });

const GROUND_PAINT: Record<Ground, Paint> = {
  grass: paint("grass"),
  moss: paint("moss", [0.96, 1, 0.94], 0, 0, 7),
  sand: paint("dirt_path", [2.2, 1.8, 1.07], 0.5, 0.35, 11),
  snow: paint("dirt_path", [0.95, 1, 1.1], 0.95, 1, 12),
  ash: paint("cave_floor", [1.35, 1.22, 1.15], 0.5, 0.16, 8),
  stone: paint("cobblestone", [1, 1, 1], 0, 0, 5),
  shore: paint("grass_dry", [2, 1.8, 1.3], 0.6, 0.3, 9),
  metal: paint("cave_floor", [1.4, 1.48, 1.7], 0.6, 0.18, 7),
  cave: paint("cave_floor"),
};

const ROAD_PAINT: Partial<Record<RoadKind, Paint>> = {
  dirt: paint("dirt_path", [1, 1, 1], 0, 0, 6),
  stone: paint("cobblestone", [1, 1, 1], 0, 0, 5),
  brass: paint("cobblestone", [1.16, 0.96, 0.64], 0.35, 0.02, 5),
  ice: paint("dirt_path", [0.95, 1.02, 1.12], 0.95, 0.75, 7),
  obsidian: paint("cave_floor", [0.56, 0.5, 0.62], 0.3, 0, 6),
};

/** Grounds that get a little dry-grass meadow variation. */
const MEADOW: Partial<Record<Ground, number>> = { grass: 0.26, moss: 0.12, shore: 0.1 };

// Cache decoded images, not GPU textures: every map owns and disposes its textures.
const images = new Map<Tile, Promise<HTMLImageElement | undefined>>();
function loadImage(name: Tile): Promise<HTMLImageElement | undefined> {
  const cached = images.get(name);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement | undefined>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { console.warn(`Terrain tile unavailable: ${name}; keeping fallback.`); resolve(undefined); };
    image.src = `${import.meta.env.BASE_URL}textures/lum/${name}.png`;
  });
  images.set(name, promise);
  void promise.then(image => { if (!image) images.delete(name); });
  return promise;
}

function traceShape(g: CanvasRenderingContext2D, shape: Shape) {
  g.beginPath();
  if ("rect" in shape) g.rect(...shape.rect);
  else if ("ellipse" in shape) g.ellipse(...shape.ellipse, 0, 0, Math.PI * 2);
  else {
    shape.poly.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.closePath();
  }
}

/** The zone grounds a map blends in (besides its own), at most two. */
export function patchGrounds(layout: MapLayout): Ground[] {
  return [...new Set((layout.ground_patches ?? []).map((p) => p.ground).filter((g) => g !== layout.ground))].slice(0, 2);
}

/** The road material: the map's first road that isn't stone, a bridge or a boardwalk. */
function roadKindOf(layout: MapLayout): RoadKind {
  return layout.roads.find((r) => r.kind !== "stone" && r.kind !== "bridge" && r.kind !== "boardwalk")?.kind ?? "dirt";
}

/**
 * Material weights, 4 pixels a cell; the art repeats on the GPU. Two RGBA
 * masks: (road, moss, stone road, plaza) and (zone ground A, zone ground B,
 * trampled camp ground, unused).
 */
export function terrainBlendMask(layout: MapLayout): { data: Uint8Array; zones: Uint8Array; width: number; height: number } {
  const scale = 4;
  const width = layout.width * scale, height = layout.height * scale;
  const layer = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const g = canvas.getContext("2d")!;
    g.scale(scale, scale);
    g.fillStyle = "white"; g.strokeStyle = "white";
    g.lineCap = "round"; g.lineJoin = "round";
    return { canvas, g };
  };
  const main = Array.from({ length: 4 }, layer), zone = Array.from({ length: 4 }, layer);
  const road = main[0].g, moss = main[1].g, stone = main[2].g, plaza = main[3].g;
  // Moss round woods and pools only where the ground is green; elsewhere it read as mud.
  const green = layout.ground === "grass" || layout.ground === "moss";
  for (const b of layout.blockers) {
    if (b.kind !== "forest" && !(b.kind === "water" && green)) continue;
    moss.globalAlpha = b.kind === "forest" ? 0.85 : 0.7;
    traceShape(moss, b.shape);
    moss.fill(); moss.lineWidth = b.kind === "water" ? 2.2 : 1.5; moss.stroke();
  }
  const zones = patchGrounds(layout);
  for (const p of layout.ground_patches ?? []) {
    const i = zones.indexOf(p.ground);
    if (i < 0) continue;
    traceShape(zone[i].g, p.shape);
    zone[i].g.fill();
  }
  for (const [x, y, w, h] of layout.safe_areas) {
    if (w >= layout.width && h >= layout.height || layout.ground === "stone") continue;
    const g = zone[2].g;
    g.globalAlpha = 0.55;
    g.beginPath(); g.roundRect(x, y, w, h, Math.min(3, w / 2, h / 2)); g.fill();
  }
  for (const r of layout.roads) {
    if (r.kind === "bridge" || r.kind === "boardwalk") continue;
    const g = r.kind === "stone" ? stone : road;
    g.globalAlpha = 1; g.lineWidth = r.width;
    g.beginPath();
    r.points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.stroke();
  }
  if (layout.ground === "stone") {
    for (const p of layout.props) {
      if (p.kind !== "fountain" && p.kind !== "transit_gate") continue;
      plaza.beginPath(); plaza.arc(p.x + 0.5, p.y + 0.5, p.kind === "fountain" ? 10 : 5, 0, Math.PI * 2); plaza.fill();
    }
  }
  // Feather boundaries, not collision. Zones blend widest; roads keep their authored width.
  const pack = (layers: { canvas: HTMLCanvasElement }[], blur: number[]) => {
    const data = layers.map(({ canvas }, index) => {
      const soft = document.createElement("canvas"); soft.width = width; soft.height = height;
      const g = soft.getContext("2d")!;
      g.filter = `blur(${blur[index]}px)`;
      g.drawImage(canvas, 0, 0);
      return g.getImageData(0, 0, width, height).data;
    });
    // Never round-trip packed weights through Canvas: alpha=0 would erase RGB.
    const packed = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) for (let c = 0; c < 4; c++) packed[i * 4 + c] = data[c][i * 4 + 3];
    return packed;
  };
  return { data: pack(main, [1.2, 3, 1.2, 1.2]), zones: pack(zone, [10, 10, 4, 0]), width, height };
}

/** Project UVs at a consistent world scale, including vertical extruded faces. */
export function terrainSurfaceUvs(geometry: THREE.BufferGeometry, period = 6) {
  const p = geometry.getAttribute("position"), n = geometry.getAttribute("normal");
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(n.getY(i)) > 0.5) {
      uv[i * 2] = p.getX(i) / period; uv[i * 2 + 1] = -p.getZ(i) / period;
    } else {
      uv[i * 2] = (Math.abs(n.getX(i)) > Math.abs(n.getZ(i)) ? p.getZ(i) : p.getX(i)) / period;
      uv[i * 2 + 1] = p.getY(i) / period;
    }
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

const PAINT_GLSL = /* glsl */ `
  float terrainNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    vec4 h = fract(sin(vec4(dot(i, vec2(127.1,311.7)), dot(i+vec2(1,0), vec2(127.1,311.7)), dot(i+vec2(0,1), vec2(127.1,311.7)), dot(i+1.0, vec2(127.1,311.7)))) * 43758.5453);
    return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
  }
  // A painted ground: two rotated, rescaled samples blended by noise hide the repeat.
  vec3 terrainPaint(sampler2D t, vec2 w, vec4 recipe, vec3 tint) {
    vec2 a = w / recipe.w;
    vec2 b = mat2(0.8, -0.6, 0.6, 0.8) * w / (recipe.w * 1.37) + 0.37;
    float k = smoothstep(0.3, 0.7, terrainNoise(w / 23.0));
    vec3 c = mix(texture2D(t, a).rgb, texture2D(t, b).rgb, k);
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    return mix(c, vec3(l), recipe.y) * tint + recipe.z;
  }
`;

export async function applyPaintedTerrain(
  layout: MapLayout, ground: THREE.MeshLambertMaterial, surfaces: TerrainSurface[],
  track: Track, disposed: () => boolean, time: { value: number },
): Promise<void> {
  const loaded = await Promise.all(PAINTED_TILES.map(async name => [name, await loadImage(name)] as const));
  if (disposed()) return;
  const sources = new Map(loaded);
  const textures = new Map<Tile, THREE.Texture>();
  const tile = (name: Tile) => {
    const existing = textures.get(name); if (existing) return existing;
    const image = sources.get(name); if (!image) return undefined;
    const texture = track(new THREE.Texture(image));
    texture.colorSpace = THREE.SRGBColorSpace;
    // The art is seamless: plain repeats (mirroring made kaleidoscopes on roads).
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8; texture.needsUpdate = true;
    textures.set(name, texture); return texture;
  };
  const zones = patchGrounds(layout);
  const base = GROUND_PAINT[layout.ground], zoneA = GROUND_PAINT[zones[0] ?? layout.ground], zoneB = GROUND_PAINT[zones[1] ?? layout.ground];
  const road = ROAD_PAINT[roadKindOf(layout)] ?? ROAD_PAINT.dirt!, stoneRoad = ROAD_PAINT.stone!;
  const trampled = layout.ground === "snow" || layout.ground === "sand" ? GROUND_PAINT[layout.ground] : ROAD_PAINT.dirt!;
  const recipes = [base, zoneA, zoneB, road, stoneRoad, trampled];
  const maps = recipes.map((r) => tile(r.tex));
  const dry = tile("grass_dry"), moss = tile("moss"), plaza = tile("plaza_tile");
  if (maps.every(Boolean) && dry && moss && plaza) {
    // DataTextures avoid canvas alpha premultiplication: alpha is a weight too.
    const pixels = terrainBlendMask(layout);
    const maskOf = (data: Uint8Array) => {
      const mask = track(new THREE.DataTexture(data, pixels.width, pixels.height));
      mask.flipY = true; mask.minFilter = mask.magFilter = THREE.LinearFilter; mask.needsUpdate = true;
      return mask;
    };
    const recipe = (p: Paint) => new THREE.Vector4(0, p.desat, p.lift, p.scale);
    const tint = (p: Paint) => new THREE.Vector3(...p.tint);
    ground.map = maps[0]!; ground.color.set(0xaaaaaa);
    ground.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        terrainSize: { value: new THREE.Vector2(layout.width, layout.height) },
        terrainMask: { value: maskOf(pixels.data) }, terrainZones: { value: maskOf(pixels.zones) },
        terrainZoneA: { value: maps[1] }, terrainZoneB: { value: maps[2] }, terrainRoad: { value: maps[3] }, terrainStone: { value: maps[4] }, terrainTrampled: { value: maps[5] },
        terrainDry: { value: dry }, terrainMoss: { value: moss }, terrainPlaza: { value: plaza },
        terrainRecipes: { value: recipes.map(recipe) }, terrainTints: { value: recipes.map(tint) },
        terrainMeadow: { value: MEADOW[layout.ground] ?? 0 },
      });
      shader.vertexShader = `varying vec2 vTerrainUv;\n${shader.vertexShader}`.replace("#include <uv_vertex>", "#include <uv_vertex>\nvTerrainUv = uv;");
      shader.fragmentShader = `
        varying vec2 vTerrainUv;
        uniform vec2 terrainSize;
        uniform sampler2D terrainMask, terrainZones, terrainZoneA, terrainZoneB, terrainRoad, terrainStone, terrainTrampled, terrainDry, terrainMoss, terrainPlaza;
        uniform vec4 terrainRecipes[6];
        uniform vec3 terrainTints[6];
        uniform float terrainMeadow;
        ${PAINT_GLSL}
      ${shader.fragmentShader}`.replace("#include <map_fragment>", `
        vec2 world = vec2(vTerrainUv.x, 1.0 - vTerrainUv.y) * terrainSize;
        // Warp the mask lookups so boundaries wander like a brush, not a ruler.
        vec2 warp = (vec2(terrainNoise(world / 3.3), terrainNoise(world / 3.3 + 17.0)) - 0.5) * 1.3;
        vec2 wide = (vec2(terrainNoise(world / 11.0 + 5.0), terrainNoise(world / 11.0 + 41.0)) - 0.5) * 7.0;
        vec2 toMask = vec2(1.0 / terrainSize.x, -1.0 / terrainSize.y);
        vec4 weights = texture2D(terrainMask, vec2(0.0, 1.0) + (world + warp) * toMask);
        vec4 zones = texture2D(terrainZones, vec2(0.0, 1.0) + (world + wide) * toMask);
        float grain = terrainNoise(world * 1.9) - 0.5;
        vec3 terrain = terrainPaint(map, world, terrainRecipes[0], terrainTints[0]);
        float meadow = smoothstep(0.35, 0.85, terrainNoise(world / 18.0)) * terrainMeadow;
        terrain = mix(terrain, texture2D(terrainDry, world / 9.0).rgb, meadow);
        terrain = mix(terrain, terrainPaint(terrainZoneA, world, terrainRecipes[1], terrainTints[1]), smoothstep(0.3, 0.7, zones.r + grain * 0.2));
        terrain = mix(terrain, terrainPaint(terrainZoneB, world, terrainRecipes[2], terrainTints[2]), smoothstep(0.3, 0.7, zones.g + grain * 0.2));
        terrain = mix(terrain, texture2D(terrainMoss, world / 7.0).rgb * 0.84, weights.g);
        terrain = mix(terrain, terrainPaint(terrainTrampled, world, terrainRecipes[5], terrainTints[5]), smoothstep(0.15, 0.85, zones.b + grain * 0.35) * 0.8);
        // Roads: a ragged edge and a darker painted rim on both sides of it.
        float roadW = smoothstep(0.38, 0.62, weights.r + grain * 0.28);
        float stoneW = smoothstep(0.38, 0.62, weights.b + grain * 0.2);
        float rim = max(smoothstep(0.08, 0.4, weights.r) * (1.0 - roadW), smoothstep(0.08, 0.4, weights.b) * (1.0 - stoneW));
        terrain = mix(terrain, terrainPaint(terrainRoad, world, terrainRecipes[3], terrainTints[3]), roadW);
        terrain = mix(terrain, terrainPaint(terrainStone, world, terrainRecipes[4], terrainTints[4]), stoneW);
        terrain = mix(terrain, texture2D(terrainPlaza, world / 8.0).rgb, weights.a);
        terrain *= 1.0 - rim * 0.22;
        // Broad light and shade, as a painter would wash over a large field.
        terrain *= mix(0.88, 1.06, terrainNoise(world / 41.0)) * mix(0.95, 1.03, terrainNoise(world / 12.0));
        diffuseColor.rgb *= terrain;
      `);
    };
    ground.customProgramCacheKey = () => "painted-ground-v2";
    ground.needsUpdate = true;
  }
  let waterMask: THREE.CanvasTexture | undefined;
  if (surfaces.some(s => s.kind === "water")) {
    const canvas = document.createElement("canvas");
    canvas.width = layout.width * 4; canvas.height = layout.height * 4;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "black"; g.fillRect(0, 0, canvas.width, canvas.height);
    g.scale(4, 4); g.fillStyle = "white"; g.filter = "blur(2px)";
    for (const b of layout.blockers) if (b.kind === "water") { traceShape(g, b.shape); g.fill(); }
    waterMask = track(new THREE.CanvasTexture(canvas));
  }
  for (const s of surfaces) {
    const name: Tile | undefined = s.kind === "water" ? "water" : s.kind === "cliff" || s.kind === "rock" ? "cliff_rock" : s.kind === "ruin_wall" || s.kind === "building" ? "ruin_wall" : undefined;
    if (!name) continue;
    const texture = tile(name); if (!texture) continue;
    terrainSurfaceUvs(s.geometry, s.kind === "water" ? 8 : 5);
    s.material.map = texture; s.material.color.set(s.kind === "water" ? 0xa5c7cc : 0xb6b0a5);
    if (s.kind === "water") {
      s.material.transparent = true; s.material.opacity = 1;
      if (s.material instanceof THREE.MeshPhongMaterial) { s.material.shininess = 55; s.material.specular.set(0x507d83); }
      s.material.onBeforeCompile = shader => {
        shader.uniforms.terrainTime = time;
        shader.uniforms.waterMask = { value: waterMask };
        shader.uniforms.waterMapSize = { value: new THREE.Vector2(layout.width, layout.height) };
        shader.fragmentShader = `uniform float terrainTime; uniform sampler2D waterMask; uniform vec2 waterMapSize;\n${shader.fragmentShader}`.replace("#include <map_fragment>", `
          vec2 drift = vec2(terrainTime * 0.008, terrainTime * 0.004);
          vec2 ripple = vec2(sin(vMapUv.y*13.0+terrainTime*.7), cos(vMapUv.x*11.0+terrainTime*.5)) * .008;
          vec3 a = texture2D(map,vMapUv+drift+ripple).rgb;
          vec3 b = texture2D(map,vMapUv*1.37-drift*.65).rgb;
          float depth = texture2D(waterMask,vec2(vMapUv.x*8.0/waterMapSize.x,1.0+vMapUv.y*8.0/waterMapSize.y)).r;
          float edge = smoothstep(.42,.98,depth);
          diffuseColor.rgb *= mix(a,b,.28) * mix(vec3(1.2,1.13,.88),vec3(1.0),edge);
          diffuseColor.a *= mix(.15,1.0,edge);
        `);
      };
      s.material.customProgramCacheKey = () => "lumeris-water-v2";
    }
    s.material.needsUpdate = true;
  }
}
