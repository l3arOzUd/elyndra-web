import * as THREE from "three";

// Procedural ground materials for skill effects. Nothing to load, and every
// effect of one kind shares a shader program however many are live. All of
// them draw on geometry laid flat (rotated into XZ), read as vP = (x, z).
// They blend as premultiplied light that covers the ground only partly
// (uCover): between plain alpha and additive, so an effect glows yet keeps
// its colour on bright grass, where added light alone washes to white.

const vertexShader = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const common = /* glsl */ `
  #define PI 3.14159265
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uCover;
  varying vec2 vP;
  float band(float x, float c, float w) { return 1.0 - smoothstep(0.0, w, abs(x - c)); }
  // Into the output colour space first, then premultiplied, or faint light would brighten.
  void emit(vec3 col, float a) { a = clamp(a, 0.0, 1.0); gl_FragColor = vec4(linearToOutputTexel(vec4(col, 1.0)).rgb * a, a * uCover); }
`;

/**
 * Where a cast lands, filling from the caster outwards (from the rim inwards
 * for a pull) as the cast winds up, with a bright rim, dashes marching round
 * it and a glowing front. uMode: 0 circle, 1 cone, 2 line.
 */
const telegraphFrag = /* glsl */ `
  ${common}
  uniform float uMode, uR, uHalf, uLen, uWid, uInvert, uProgress, uFlash;
  void main() {
    float ang = atan(-vP.y, vP.x);
    float d = length(vP) / uR;
    float e, axis;
    if (uMode < 0.5) { e = d; axis = d; }
    else if (uMode < 1.5) { e = max(d, abs(ang) / uHalf); axis = d; }
    else {
      float along = vP.x / uLen;
      e = max(abs(vP.y) / (uWid * 0.5), abs(along * 2.0 - 1.0));
      axis = along;
    }
    if (uInvert > 0.5) axis = 1.0 - axis;
    float body = 0.08 + 0.14 * pow(e, 3.0);
    float rim = smoothstep(0.88, 0.98, e);
    float filled = step(axis, uProgress) * (0.12 + 0.08 * axis);
    float front = uProgress < 1.0 ? exp(-pow((axis - uProgress) / 0.03, 2.0)) : 0.0;
    float marks = 0.0;
    if (uMode < 1.5) {
      // Dashes marching round just inside the rim.
      float n = max(8.0, floor(uR * 4.0));
      float t = fract(ang / (2.0 * PI) * n - uTime * 0.8);
      marks = band(d, 0.9, 0.025) * smoothstep(0.15, 0.2, t) * (1.0 - smoothstep(0.55, 0.6, t));
    } else {
      // Chevrons running along the line, towards where it hits.
      float t = fract(vP.x * 0.7 - abs(vP.y) * 0.45 - uTime * 1.6);
      marks = band(t, 0.5, 0.12) * (1.0 - smoothstep(0.55, 0.85, abs(vP.y) / (uWid * 0.5)));
    }
    float a = body + filled + front * 0.75 + rim * 0.8 + marks * 0.4 + uFlash * (0.06 + 0.4 * rim);
    vec3 col = mix(uColor, vec3(1.0), clamp(front * 0.75 + rim * (0.3 + 0.4 * uFlash), 0.0, 1.0));
    emit(col, a * uOpacity);
  }
`;

/** A magic circle under the caster: rings, turning runes and a hexagram. Unit radius. */
const sigilFrag = /* glsl */ `
  ${common}
  void main() {
    float d = length(vP);
    if (d > 1.0) discard;
    float ang = atan(vP.y, vP.x);
    float a = band(d, 0.95, 0.03) + band(d, 0.8, 0.02) * 0.8 + band(d, 0.36, 0.02) * 0.7;
    float t = fract((ang + uTime * 0.9) / (2.0 * PI) * 20.0);
    a += step(0.83, d) * step(d, 0.92) * smoothstep(0.25, 0.3, t) * (1.0 - smoothstep(0.5, 0.55, t)) * 0.75;
    float r = ang - uTime * 0.6, seg = 2.0 * PI / 3.0;
    float t1 = d * cos(mod(r, seg) - seg * 0.5);
    float t2 = d * cos(mod(r + PI / 3.0, seg) - seg * 0.5);
    a += (band(t1, 0.4, 0.025) + band(t2, 0.4, 0.025)) * step(d, 0.8);
    a += pow(1.0 - d, 2.5) * 0.45;
    vec3 col = mix(uColor, vec3(1.0), pow(1.0 - d, 3.0) * 0.6);
    emit(col, a * uOpacity);
  }
`;

/** A soft shockwave ring with a faint wash inside it. Unit radius; uT is 0..1 over its life. */
const waveFrag = /* glsl */ `
  ${common}
  uniform float uT, uWidth;
  void main() {
    float d = length(vP);
    if (d > 1.0) discard;
    float w = uWidth * (1.0 - uT * 0.6);
    float ring = exp(-pow((d - 0.92) / w, 2.0));
    float wash = smoothstep(0.2, 0.92, d) * 0.12 * (1.0 - uT);
    vec3 col = mix(uColor, vec3(1.0), ring * 0.25 * (1.0 - uT));
    emit(col, (ring + wash) * uOpacity);
  }
`;

/** A round glow, white-hot at the centre. Unit radius. */
const glowFrag = /* glsl */ `
  ${common}
  void main() {
    float d = length(vP);
    if (d > 1.0) discard;
    float a = pow(1.0 - d, 1.8);
    emit(mix(uColor, vec3(1.0), pow(1.0 - d, 4.0)), a * uOpacity);
  }
`;

/**
 * A blade's sweep across a ring sector centred on +x: brightest at the
 * head (uHead, 0..1 across the sector), trailing off behind it, and
 * strongest towards the outer edge.
 */
const sweepFrag = /* glsl */ `
  ${common}
  uniform float uHalf, uInner, uR, uHead, uTrail, uDir;
  void main() {
    float ang = atan(-vP.y, vP.x);
    float s = (ang / uHalf + 1.0) * 0.5;
    float q = (length(vP) - uInner) / (uR - uInner);
    float behind = (uHead - s) * uDir;
    float trail = behind < 0.0 ? exp(-pow(behind / 0.025, 2.0)) : exp(-behind / uTrail);
    float prof = exp(-pow((q - 0.72) / 0.24, 2.0));
    float edge = smoothstep(0.0, 0.06, s) * smoothstep(1.0, 0.94, s);
    float a = trail * prof * edge;
    vec3 col = mix(uColor, vec3(1.0), clamp(trail * prof * 1.2 - 0.3, 0.0, 1.0));
    emit(col, a * uOpacity);
  }
`;

/**
 * A beam along +x (uLen long, uWid wide): a white core in a coloured glow,
 * with streaks racing down it. Shown up to uGrow (0..1) of its length; uTail
 * fades it towards the start (a dash trail).
 */
const beamFrag = /* glsl */ `
  ${common}
  uniform float uLen, uWid, uGrow, uTail;
  void main() {
    float along = vP.x / uLen;
    float side = abs(vP.y) / (uWid * 0.5);
    if (along > uGrow) discard;
    float core = exp(-pow(side / 0.22, 2.0));
    float glow = exp(-pow(side / 0.65, 2.0)) * 0.6;
    float streak = smoothstep(0.6, 1.0, sin(vP.x * 2.6 - uTime * 28.0 + side * 3.0)) * glow * 0.6;
    float tip = exp(-pow((along - uGrow) / 0.02, 2.0)) * (1.0 - side);
    float ends = smoothstep(0.0, 0.05, along) * mix(1.0, along, uTail);
    float a = (core + glow + streak + tip) * ends;
    emit(mix(uColor, vec3(1.0), clamp(core * 0.8 + tip, 0.0, 1.0)), a * uOpacity);
  }
`;

/** Spiral arms winding in to the centre (a pull). Unit radius. */
const swirlFrag = /* glsl */ `
  ${common}
  void main() {
    float d = length(vP);
    if (d > 1.0) discard;
    float ang = atan(vP.y, vP.x);
    float arms = smoothstep(0.55, 1.0, sin(ang * 3.0 + d * 11.0 + uTime * 9.0));
    float a = arms * smoothstep(1.0, 0.75, d) * smoothstep(0.0, 0.25, d) + pow(1.0 - d, 4.0) * 0.8;
    emit(mix(uColor, vec3(1.0), pow(1.0 - d, 5.0)), a * uOpacity);
  }
`;

/** A cog: a toothed rim and a spoked hub. Unit radius; turned by rotating the mesh. */
const gearFrag = /* glsl */ `
  ${common}
  void main() {
    float d = length(vP);
    if (d > 1.0) discard;
    float ang = atan(vP.y, vP.x);
    float tooth = step(0.5, fract(ang / (2.0 * PI) * 16.0));
    float a = step(0.74, d) * step(d, 0.86) + step(0.86, d) * step(d, 0.97) * tooth;
    a += band(d, 0.32, 0.05) + step(d, 0.74) * step(0.32, d) * band(fract(ang / (2.0 * PI) * 6.0), 0.5, 0.05);
    emit(mix(uColor, vec3(1.0), 0.25), a * uOpacity);
  }
`;

const shaders = { telegraph: telegraphFrag, sigil: sigilFrag, wave: waveFrag, glow: glowFrag, sweep: sweepFrag, beam: beamFrag, swirl: swirlFrag, gear: gearFrag };
export type FxShader = keyof typeof shaders;

/** A material for one effect, with its own uniforms (uColor, uOpacity, uTime and the extras). */
export function fxMaterial(kind: FxShader, color: number, extra: Record<string, number> = {}) {
  // A warning stays opaque enough to read; the rest is light.
  const uniforms: Record<string, THREE.IUniform> = { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uCover: { value: kind === "telegraph" ? 1 : 0.5 } };
  for (const [k, v] of Object.entries(extra)) uniforms[k] = { value: v };
  return new THREE.ShaderMaterial({
    vertexShader, fragmentShader: shaders[kind], uniforms,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, premultipliedAlpha: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}
