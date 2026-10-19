import * as THREE from "three";
import type { BlockerKind, MapLayout, Shape } from "../data/schema";

export const LUMERIS_TILES = ["grass", "grass_dry", "moss", "dirt_path", "cobblestone", "plaza_tile", "cave_floor", "water", "cliff_rock", "ruin_wall"] as const;
type Tile = typeof LUMERIS_TILES[number];
type Track = <T extends { dispose(): void }>(resource: T) => T;
export interface TerrainSurface { kind: BlockerKind; geometry: THREE.BufferGeometry; material: THREE.MeshLambertMaterial | THREE.MeshPhongMaterial }

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

/** Only material weights are baked (4 pixels/cell); the art repeats on the GPU. */
export function terrainBlendMask(layout: MapLayout): { data: Uint8Array; width: number; height: number } {
  const scale = 4;
  const width = layout.width * scale, height = layout.height * scale;
  const channels = Array.from({ length: 4 }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const g = canvas.getContext("2d")!;
    g.scale(scale, scale);
    g.fillStyle = "white"; g.strokeStyle = "white";
    g.lineCap = "round"; g.lineJoin = "round";
    return { canvas, g };
  });
  const dirt = channels[0].g, moss = channels[1].g, stone = channels[2].g, plaza = channels[3].g;
  for (const b of layout.blockers) {
    if (b.kind !== "forest" && b.kind !== "water") continue;
    moss.globalAlpha = b.kind === "forest" ? 0.85 : 0.7;
    traceShape(moss, b.shape);
    moss.fill(); moss.lineWidth = b.kind === "water" ? 2.2 : 1.5; moss.stroke();
  }
  // World v3 zones with their own ground: the nearest of the four painted materials.
  for (const p of layout.ground_patches ?? []) {
    const g = p.ground === "moss" || p.ground === "grass" ? (p.ground === "moss" ? moss : null) : p.ground === "stone" || p.ground === "metal" || p.ground === "snow" ? stone : dirt;
    if (!g) continue;
    g.globalAlpha = 0.75;
    traceShape(g, p.shape);
    g.fill();
  }
  for (const [x, y, w, h] of layout.safe_areas) {
    if (w >= layout.width && h >= layout.height || layout.ground === "stone") continue;
    dirt.globalAlpha = 0.32;
    dirt.beginPath(); dirt.roundRect(x, y, w, h, Math.min(2, w / 2, h / 2)); dirt.fill();
  }
  for (const r of layout.roads) {
    if (r.kind === "bridge" || r.kind === "boardwalk") continue;
    const g = r.kind === "stone" ? stone : dirt;
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
  // Feather material boundaries, not collision. Roads keep the authored centre/width.
  const data = channels.map(({ canvas }, index) => {
    const soft = document.createElement("canvas"); soft.width = width; soft.height = height;
    const g = soft.getContext("2d")!;
    g.filter = `blur(${index === 1 ? 3 : 1.2}px)`;
    g.drawImage(canvas, 0, 0);
    return g.getImageData(0, 0, width, height).data;
  });
  // Never round-trip packed weights through Canvas: alpha=0 would erase RGB.
  const packed = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) for (let c = 0; c < 4; c++) packed[i * 4 + c] = data[c][i * 4 + 3];
  return { data: packed, width, height };
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

export async function applyLumerisTiles(
  layout: MapLayout, ground: THREE.MeshLambertMaterial, surfaces: TerrainSurface[],
  track: Track, disposed: () => boolean, time: { value: number },
): Promise<void> {
  const loaded = await Promise.all(LUMERIS_TILES.map(async name => [name, await loadImage(name)] as const));
  if (disposed()) return;
  const sources = new Map(loaded);
  const textures = new Map<Tile, THREE.Texture>();
  const tile = (name: Tile) => {
    const existing = textures.get(name); if (existing) return existing;
    const image = sources.get(name); if (!image) return undefined;
    const texture = track(new THREE.Texture(image));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.anisotropy = 8; texture.needsUpdate = true;
    textures.set(name, texture); return texture;
  };
  const baseName: Tile = layout.ground === "moss" ? "moss" : layout.ground === "stone" ? "cobblestone" : layout.ground === "cave" ? "cave_floor" : "grass";
  const base = tile(baseName);
  const dry = tile("grass_dry"), moss = tile("moss"), dirt = tile("dirt_path"), stone = tile("cobblestone"), plaza = tile("plaza_tile");
  if (base && dry && moss && dirt && stone && plaza) {
    // DataTexture avoids canvas alpha premultiplication: alpha is the plaza weight.
    const pixels = terrainBlendMask(layout);
    const mask = track(new THREE.DataTexture(pixels.data, pixels.width, pixels.height));
    mask.flipY = true; mask.minFilter = mask.magFilter = THREE.LinearFilter; mask.needsUpdate = true;
    ground.map = base; ground.color.set(0xaaaaaa);
    ground.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        terrainSize: { value: new THREE.Vector2(layout.width, layout.height) }, terrainMask: { value: mask },
        terrainDry: { value: dry }, terrainMoss: { value: moss }, terrainDirt: { value: dirt }, terrainStone: { value: stone }, terrainPlaza: { value: plaza },
        terrainMeadow: { value: layout.ground === "grass" ? 1 : 0 },
      });
      shader.vertexShader = `varying vec2 vTerrainUv;\n${shader.vertexShader}`.replace("#include <uv_vertex>", "#include <uv_vertex>\nvTerrainUv = uv;");
      shader.fragmentShader = `
        varying vec2 vTerrainUv;
        uniform vec2 terrainSize;
        uniform sampler2D terrainMask, terrainDry, terrainMoss, terrainDirt, terrainStone, terrainPlaza;
        uniform float terrainMeadow;
        float terrainNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          vec4 h = fract(sin(vec4(dot(i, vec2(127.1,311.7)), dot(i+vec2(1,0), vec2(127.1,311.7)), dot(i+vec2(0,1), vec2(127.1,311.7)), dot(i+1.0, vec2(127.1,311.7)))) * 43758.5453);
          return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
        }
      ${shader.fragmentShader}`.replace("#include <map_fragment>", `
        vec2 world = vec2(vTerrainUv.x, 1.0-vTerrainUv.y) * terrainSize;
        vec4 weights = texture2D(terrainMask, vTerrainUv);
        vec2 tileUv = world / 8.0;
        vec3 terrain = texture2D(map, tileUv).rgb;
        float meadow = smoothstep(0.35,0.85,terrainNoise(world/18.0)) * 0.24 * terrainMeadow;
        terrain = mix(terrain, texture2D(terrainDry, world/9.0).rgb, meadow);
        terrain = mix(terrain, texture2D(terrainMoss, world/7.0).rgb * 0.84, weights.g);
        terrain = mix(terrain, texture2D(terrainDirt, world/6.0).rgb, weights.r);
        terrain = mix(terrain, texture2D(terrainStone, world/5.0).rgb, weights.b);
        terrain = mix(terrain, texture2D(terrainPlaza, world/8.0).rgb, weights.a);
        terrain *= mix(0.92,1.04,terrainNoise(world/12.0));
        diffuseColor.rgb *= terrain;
      `);
    };
    ground.customProgramCacheKey = () => "lumeris-painted-ground-v1";
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
