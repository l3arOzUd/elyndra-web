import * as THREE from "three";

// A warp portal in the RO manner: a turning circle of runes on the ground, a
// soft column of light that fades upward and motes spiralling up through it.
// Everything is additive and writes no depth, so it glows over the ground and
// never hides a character. Open warps are aether teal; locked ones are gold.

type Track = <T extends { dispose(): void }>(x: T) => T;

const TEAL = new THREE.Color(0x7fe9f2), GOLD = new THREE.Color(0xf2c66b);
const MOTES = 36;
// The texture's outer ring sits at 236 of its 256-pixel radius; this plane
// size puts that ring exactly at radius r.
const RING_SPAN = 2 * 256 / 236;

/** The rune circle, drawn once per colour on a canvas. */
function circleTexture(colour: THREE.Color): THREE.CanvasTexture {
  const size = 512, c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const css = `rgb(${Math.round(colour.r * 255)},${Math.round(colour.g * 255)},${Math.round(colour.b * 255)})`;
  g.translate(size / 2, size / 2);
  // Soft pool of light under the ring.
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  pool.addColorStop(0, "rgba(255,255,255,0.55)");
  pool.addColorStop(0.55, "rgba(255,255,255,0.18)");
  pool.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = pool;
  g.fillRect(-size / 2, -size / 2, size, size);
  g.strokeStyle = css;
  g.shadowColor = css;
  g.shadowBlur = 14;
  const ring = (r: number, w: number, alpha: number) => { g.globalAlpha = alpha; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(236, 7, 1);
  ring(214, 2.5, 0.8);
  ring(150, 4, 0.9);
  ring(132, 1.5, 0.6);
  // Rune ticks between the outer rings, and a six-pointed star inside.
  g.globalAlpha = 0.9;
  g.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, long = i % 3 === 0;
    g.beginPath();
    g.moveTo(Math.cos(a) * (long ? 158 : 168), Math.sin(a) * (long ? 158 : 168));
    g.lineTo(Math.cos(a) * (long ? 206 : 196), Math.sin(a) * (long ? 206 : 196));
    g.stroke();
    if (long) { g.beginPath(); g.arc(Math.cos(a + 0.13) * 182, Math.sin(a + 0.13) * 182, 5, 0, Math.PI * 2); g.stroke(); }
  }
  g.lineWidth = 2.5;
  for (const turn of [0, Math.PI / 3]) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = turn + (i / 3) * Math.PI * 2 - Math.PI / 2;
      i ? g.lineTo(Math.cos(a) * 132, Math.sin(a) * 132) : g.moveTo(Math.cos(a) * 132, Math.sin(a) * 132);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A round soft dot for the motes. */
function moteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const dot = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  dot.addColorStop(0, "rgba(255,255,255,1)");
  dot.addColorStop(0.35, "rgba(255,255,255,0.6)");
  dot.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = dot;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const shared = new Map<string, THREE.Texture>();

/** One portal whose outer ring has radius `r` (cells), centred on the group's origin. Its
 * userData.tick(dt) animates it; animate() in terrain.ts calls it. */
export function buildPortal(r: number, locked: boolean, track: Track): THREE.Group {
  const colour = locked ? GOLD : TEAL;
  const key = locked ? "gold" : "teal";
  if (!shared.has(key)) shared.set(key, circleTexture(colour));
  if (!shared.has("mote")) shared.set("mote", moteTexture());
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
  const portal = new THREE.Group();

  const circleMat = track(new THREE.MeshBasicMaterial({ map: shared.get(key)!, color: colour, opacity: 0.9, ...additive }));
  const circle = new THREE.Mesh(track(new THREE.PlaneGeometry(r * RING_SPAN, r * RING_SPAN).rotateX(-Math.PI / 2)), circleMat);
  circle.position.y = 0.03;
  circle.renderOrder = 2;
  portal.add(circle);
  // A second, smaller circle turning the other way gives the ring depth.
  const innerMat = track(new THREE.MeshBasicMaterial({ map: shared.get(key)!, color: colour, opacity: 0.45, ...additive }));
  const inner = new THREE.Mesh(track(new THREE.PlaneGeometry(r * 1.2, r * 1.2).rotateX(-Math.PI / 2)), innerMat);
  inner.position.y = 0.05;
  inner.renderOrder = 2;
  portal.add(inner);

  // Column of light: bright at the ground, gone by the top, with slow bands rising.
  const beamMat = track(new THREE.ShaderMaterial({
    ...additive, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, colour: { value: colour } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float time; uniform vec3 colour; varying vec2 vUv;
      void main(){
        float fade = pow(1.0 - vUv.y, 1.6);
        float bands = 0.65 + 0.35 * sin(vUv.y * 18.0 - time * 3.0 + sin(vUv.x * 25.13) * 1.5);
        float edge = 0.55 + 0.45 * sin(vUv.x * 50.27 + time * 1.3);
        gl_FragColor = vec4(colour * fade * bands * edge * 0.75, 1.0);
      }`,
  }));
  const beam = new THREE.Mesh(track(new THREE.CylinderGeometry(r * 0.72, r * 0.92, 3.2, 32, 1, true).translate(0, 1.6, 0)), beamMat);
  beam.renderOrder = 3;
  portal.add(beam);

  // Motes: each rises on its own spiral, fading in at the bottom and out at the top.
  const seeds = Array.from({ length: MOTES }, (_, i) => ({ a: (i / MOTES) * Math.PI * 2 * 3.7, rr: r * (0.25 + ((i * 37) % 11) / 14), speed: 0.55 + ((i * 53) % 7) / 10, t: (i * 0.618) % 1 }));
  // Additive, so a mote's colour scaled down is the same as it fading out.
  const pos = new Float32Array(MOTES * 3), tint = new Float32Array(MOTES * 3);
  const geo = track(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(tint, 3));
  const moteColour = colour.clone().lerp(new THREE.Color(1, 1, 1), 0.35);
  const moteMat = track(new THREE.PointsMaterial({ map: shared.get("mote")!, size: 0.5, sizeAttenuation: true, vertexColors: true, ...additive }));
  const motes = new THREE.Points(geo, moteMat);
  motes.renderOrder = 4;
  motes.frustumCulled = false;
  portal.add(motes);

  let time = 0;
  portal.userData.tick = (dt: number) => {
    time += dt;
    circle.rotation.y += dt * 0.25;
    inner.rotation.y -= dt * 0.45;
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
    circleMat.opacity = 0.75 + 0.2 * pulse;
    innerMat.opacity = 0.3 + 0.25 * (1 - pulse);
    beamMat.uniforms.time.value = time;
    for (let i = 0; i < MOTES; i++) {
      const s = seeds[i];
      s.t = (s.t + dt * s.speed * 0.32) % 1;
      const a = s.a + s.t * 4.5;
      const rr = s.rr * (1 - s.t * 0.45);
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = 0.1 + s.t * 3.1;
      pos[i * 3 + 2] = Math.sin(a) * rr;
      const k = Math.min(1, s.t * 6) * (1 - s.t) * 1.2;
      tint[i * 3] = moteColour.r * k; tint[i * 3 + 1] = moteColour.g * k; tint[i * 3 + 2] = moteColour.b * k;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };
  portal.userData.tick(0);
  return portal;
}
