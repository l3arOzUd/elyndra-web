import * as THREE from "three";
import type { SkillDef } from "../data/schema";
import { fxMaterial, type FxShader } from "./fxShaders";

// Skill visuals. While a cast winds up: a magic circle turns under the
// caster, motes drift up into it, and the area it will hit fills from the
// caster out, flaring as it lands. When the server's hit lands, each skill
// plays its own release (shockwaves, glows, blade sweeps, beams, sparks).
// One release per cast, however many targets, and target impacts are
// capped, so a 50-target AoE stays within the particle budget (HORDE_SPEC §3).

export const COLORS: Record<string, number> = {
  cleaving_arc: 0xffd27a, iron_cyclone: 0x9fd8ff, anchor_shout: 0xff9a6a, sundering_pulse: 0x7ff0ff,
  prism_field: 0x9fd0ff, aether_nova: 0xc98aff, gravity_coil: 0x8c5ad8, meridian_lance: 0xffe69a, splitshot_array: 0xe6be5a,
  dash_circuit: 0x5adcb4, coil_mine: 0xdc5a3c, gearstorm: 0xdcaa50, pulse_beacon: 0x6ee68c,
};

/** Totem effects and loot rarities (CHARACTER_SYSTEMS.md). */
export const TOTEM_COLORS: Record<string, number> = {
  fury: 0xe63c1e, haste: 0x50c8e6, focus: 0x5a78ff, precision: 0xffc83c, wildfire: 0xff781e, bloodrush: 0xc81428,
  surge: 0x50a0ff, bulwark: 0xb4b4c8, aegis: 0x6edcff, mending: 0x5adc6e, gale: 0xa0f0d2, hunt: 0xd2963c,
  echo_slaughter: 0xaa283c, echo_fury: 0xffd246, echo_spite: 0x6ec85a,
};
/** Ranged monster shots, by the monster's element. */
export const ELEMENT_COLORS: Record<string, number> = {
  fire: 0xff7a2e, water: 0x5fd0ff, ice: 0xbfefff, nature: 0x9be05a, earth: 0xd0a35a, wind: 0xd8fff0, shadow: 0xb070ff,
};
export const RARITY_COLORS: Record<string, number> = { normal: 0xd9b46a, magic: 0x6d9ed0, rare: 0xe0c35a, relic: 0xe07a3c, unique: 0xc9853a };

type Uniforms = Record<string, THREE.IUniform>;

interface Live {
  obj: THREE.Mesh; age: number; life: number; grow: number;
  kind: "burst" | "aura" | "shrink" | "flash" | "beam" | "spark" | "bolt" | "fn";
  /** ms before it shows (staggered rings). */
  delay?: number;
  /** spark velocity, cells per second. */
  v?: [number, number, number];
  /** spark: how fast it falls, cells per second². */
  g?: number;
  /** bolt: flies from `from` to `to`, rising `arc` cells at mid-flight. */
  from?: THREE.Vector3; to?: THREE.Vector3; arc?: number;
  /** fn: drives the effect each frame (t is 0..1 over its life). */
  step?: (t: number, ageMs: number) => void;
}

/** At most this many target impacts per IMPACT_WINDOW ms. */
const MAX_IMPACTS = 16, IMPACT_WINDOW = 100;

const tmp = new THREE.Vector3();
const disc = () => new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const glowMat = (color: number, opacity: number) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });

interface SparkOpts {
  /** Start up to this far from the centre (cells). */
  r?: number; y?: number;
  /** Outward speed (negative flies inward), and speed round the centre. */
  speed?: number; swirl?: number; up?: number; g?: number;
  /** A direction (radians) and spread to throw them in; all round if unset. */
  dir?: number; spread?: number;
  life?: number; delay?: number; size?: number;
  /** Spread their start over this many ms. */
  stagger?: number;
}

// Shared across maps. Each effect owns its material, not this reusable texture.
let cleavingTexture: THREE.Texture | undefined;
let loadingCleavingTexture = false;

export class Fx {
  private live: Live[] = [];
  private impacts = 0;
  private impactClock = 0;

  constructor(private readonly scene: THREE.Scene) {
    if (typeof document !== "undefined" && !cleavingTexture && !loadingCleavingTexture) {
      loadingCleavingTexture = true;
      new THREE.TextureLoader().load("/vfx/cleaving-arc.png", texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        cleavingTexture = texture;
        loadingCleavingTexture = false;
      }, undefined, () => { loadingCleavingTexture = false; });
    }
  }

  private push(mesh: THREE.Mesh, kind: Live["kind"], life: number, o: Partial<Live> = {}) {
    mesh.visible = !(o.delay && o.delay > 0);
    this.scene.add(mesh);
    this.live.push({ obj: mesh, age: 0, life, grow: 0, kind, ...o });
    return mesh;
  }

  /** A flat shader effect on the ground at (x, z), driven by `step` each frame. */
  private ground(shader: FxShader, color: number, x: number, z: number, y: number, life: number,
    step: (t: number, u: Uniforms, mesh: THREE.Mesh, ageMs: number) => void,
    o: { geo?: THREE.BufferGeometry; extra?: Record<string, number>; delay?: number; heading?: number } = {}) {
    const mesh = new THREE.Mesh(o.geo ?? disc(), fxMaterial(shader, color, o.extra));
    mesh.position.set(x, y, z);
    if (o.heading !== undefined) mesh.rotation.y = -o.heading;
    const u = (mesh.material as THREE.ShaderMaterial).uniforms;
    return this.push(mesh, "fn", life, { delay: o.delay, step: (t, age) => { u.uTime.value = age / 1000; step(t, u, mesh, age); } });
  }

  // --- building blocks ------------------------------------------------------------

  /** A soft shockwave rolling out to `radius`. */
  private wave(x: number, z: number, color: number, radius: number, o: { life?: number; delay?: number; width?: number } = {}) {
    this.ground("wave", color, x, z, 0.11, o.life ?? 520, (t, u, m) => {
      m.scale.setScalar(radius * (0.12 + 0.88 * easeOut(t)));
      u.uT.value = t;
      u.uOpacity.value = 1 - t * t;
    }, { delay: o.delay, extra: { uT: 0, uWidth: o.width ?? 0.07 } });
  }

  /** A flash of light on the ground, white-hot in the middle. */
  private glow(x: number, z: number, color: number, radius: number, o: { life?: number; delay?: number; y?: number } = {}) {
    this.ground("glow", color, x, z, o.y ?? 0.13, o.life ?? 320, (t, u, m) => {
      m.scale.setScalar(radius * (0.55 + 0.45 * easeOut(Math.min(1, t * 2.5))));
      u.uOpacity.value = (1 - t) ** 1.5;
    }, { delay: o.delay });
  }

  /** Little glowing diamonds thrown out (or in) from (x, z). */
  private sparks(x: number, z: number, color: number, n: number, o: SparkOpts = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.dir === undefined ? Math.random() * Math.PI * 2 : o.dir + (Math.random() - 0.5) * (o.spread ?? 1);
      const c = Math.cos(a), s = Math.sin(a);
      const r0 = (o.r ?? 0.3) * rand(0.6, 1), sp = (o.speed ?? 3) * rand(0.5, 1), tw = o.swirl ?? 0;
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry((o.size ?? 0.08) * rand(0.7, 1.4)), glowMat(Math.random() < 0.3 ? 0xffffff : color, 1));
      spark.position.set(x + c * r0, (o.y ?? 0.3) + Math.random() * 0.3, z + s * r0);
      this.push(spark, "spark", (o.life ?? 650) * rand(0.7, 1.2), {
        delay: (o.delay ?? 0) + (o.stagger ? (i / n) * o.stagger : Math.random() * 60),
        v: [c * sp - s * tw, (o.up ?? 2) * rand(0.5, 1.2), s * sp + c * tw], g: o.g ?? 0,
      });
    }
  }

  /** A column of light: a bright core inside a wide soft one (level-ups; on a skill it reads as a solid post). */
  private pillar(x: number, z: number, color: number, r: number, h: number, life: number) {
    for (const [k, o] of [[0.32, 0.9], [1, 0.35]] as const) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * k, r * k * 1.3, h, 24, 1, true).translate(0, h / 2, 0), glowMat(k < 1 ? 0xffffff : color, o));
      beam.position.set(x, 0.02, z);
      this.push(beam, "beam", life);
    }
  }

  /** A blade sweeping across a sector facing `heading`. */
  private sweep(x: number, z: number, color: number, heading: number, inner: number, radius: number, spread: number,
    o: { life?: number; delay?: number; reverse?: boolean } = {}) {
    const geo = new THREE.RingGeometry(inner, radius, 48, 1, -spread / 2, spread).rotateX(-Math.PI / 2);
    this.ground("sweep", color, x, z, 0.15, o.life ?? 300, (t, u) => {
      const head = easeOut(Math.min(1, t * 1.6)) * 1.2;
      u.uHead.value = o.reverse ? 1 - head : head;
      u.uOpacity.value = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    }, { geo, heading, delay: o.delay, extra: { uHalf: spread / 2, uInner: inner, uR: radius, uHead: 0, uTrail: 0.35, uDir: o.reverse ? -1 : 1 } });
  }

  /** A beam shooting out along `heading`; `tail` fades it towards its start. */
  private beam(x: number, z: number, color: number, heading: number, len: number, wid: number,
    o: { life?: number; delay?: number; grow?: number; tail?: boolean } = {}) {
    const geo = new THREE.PlaneGeometry(len, wid).translate(len / 2, 0, 0).rotateX(-Math.PI / 2);
    const grow = o.grow ?? 90;
    this.ground("beam", color, x, z, 0.14, o.life ?? 420, (t, u, _m, age) => {
      u.uGrow.value = Math.min(1, age / grow);
      u.uOpacity.value = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
    }, { geo, heading, delay: o.delay, extra: { uLen: len, uWid: wid, uGrow: 0, uTail: o.tail ? 1 : 0 } });
  }

  /** An arrow streak flying out to `len`. */
  private arrow(x: number, z: number, color: number, angle: number, len: number, delay: number) {
    const shape = new THREE.Shape();
    shape.moveTo(0.8, -0.045);
    shape.lineTo(len - 0.5, -0.045);
    shape.lineTo(len - 0.5, -0.18);
    shape.lineTo(len, 0);
    shape.lineTo(len - 0.5, 0.18);
    shape.lineTo(len - 0.5, 0.045);
    shape.lineTo(0.8, 0.045);
    shape.closePath();
    const mat = glowMat(color, 0.95);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), mat);
    m.position.set(x, 0.16, z);
    m.rotation.y = -angle;
    this.push(m, "fn", 320, { delay, step: (t) => { m.scale.set(0.15 + 0.85 * easeOut(Math.min(1, t * 3)), 1, 1); mat.opacity = 0.95 * (1 - t * t); } });
  }

  // --- casting ----------------------------------------------------------------------

  /**
   * Shows where a cast will land for castMs: the area fills from the caster
   * out (from the rim in for a pull) and flares as it lands, while the
   * caster channels inside a magic circle.
   */
  telegraph(s: SkillDef, x: number, z: number, aimX: number, aimZ: number, castMs: number) {
    if (s.shape === "mobility") return;
    const color = COLORS[s.id] ?? 0xffffff;
    const targeted = s.shape === "ground" || s.shape === "pull";
    const r = s.radius ?? 1;
    const extra = { uMode: 0, uR: r, uHalf: Math.PI, uLen: 1, uWid: 1, uInvert: s.shape === "pull" ? 1 : 0, uProgress: 0, uFlash: 0 };
    let geo: THREE.BufferGeometry;
    if (s.shape === "cone") {
      const a = ((s.angle_deg ?? 90) * Math.PI) / 180;
      geo = new THREE.RingGeometry(0.3, r, 48, 1, -a / 2, a).rotateX(-Math.PI / 2);
      Object.assign(extra, { uMode: 1, uHalf: a / 2 });
    } else if (s.shape === "line") {
      const len = s.length ?? 8, w = s.width ?? 2;
      geo = new THREE.PlaneGeometry(len, w).translate(len / 2, 0, 0).rotateX(-Math.PI / 2);
      Object.assign(extra, { uMode: 2, uLen: len, uWid: w });
    } else geo = new THREE.CircleGeometry(r, 64).rotateX(-Math.PI / 2);
    const tail = 160;
    this.ground("telegraph", color, targeted ? aimX : x, targeted ? aimZ : z, 0.07, castMs + tail, (_t, u, _m, age) => {
      const p = age / castMs;
      u.uProgress.value = Math.min(1, p);
      u.uFlash.value = p < 1 ? 0 : 1 - (age - castMs) / tail;
      u.uOpacity.value = p < 1 ? Math.min(1, age / 120) : u.uFlash.value ** 2;
    }, { geo, heading: Math.atan2(aimZ - z, aimX - x), extra });
    if (s.cast_ms > 0) this.channel(x, z, color, castMs);
  }

  /** The caster channelling: a magic circle turning under them, motes drifting up into it. */
  private channel(x: number, z: number, color: number, castMs: number) {
    const fade = 260;
    const fadeOut = (age: number) => (age < castMs ? Math.min(1, age / 160) : Math.max(0, 1 - (age - castMs) / fade));
    this.ground("sigil", color, x, z, 0.08, castMs + fade, (_t, u, m, age) => {
      m.scale.setScalar(1.3 * (0.55 + 0.45 * easeOut(Math.min(1, age / 160))) * (age < castMs ? 1 : 1 + 0.25 * (age - castMs) / fade));
      u.uTime.value = (age / 1000) * 1.8;
      u.uOpacity.value = 0.95 * fadeOut(age);
    });
    this.ground("glow", color, x, z, 0.075, castMs + fade, (_t, u, m, age) => {
      m.scale.setScalar(1.6);
      u.uOpacity.value = 0.3 * fadeOut(age);
    });
    this.sparks(x, z, color, Math.round(THREE.MathUtils.clamp(castMs / 60, 4, 16)), { r: 1.25, y: 0.05, speed: -0.9, up: 1.6, life: 650, size: 0.06, stagger: castMs * 0.8 });
  }

  // --- the hit ----------------------------------------------------------------------

  /** Each skill's release when its hit lands. Returns false when the plain burst should play instead. */
  shaped(s: SkillDef, x: number, z: number, aimX: number, aimZ: number): boolean {
    const color = COLORS[s.id] ?? 0xffffff;
    const heading = Math.atan2(aimZ - z, aimX - x);
    const r = s.radius ?? 3;
    // Multi-hit skills land a part every hit_ms; their release pulses with them.
    const step = s.hits && s.hits > 1 ? s.hit_ms ?? 180 : 0;
    const each = (f: (k: number, delay: number) => void) => { for (let k = 0; k < (step ? s.hits! : 1); k++) f(k, k * step); };
    const spread = ((s.angle_deg ?? 90) * Math.PI) / 180;
    switch (s.id) {
      case "cleaving_arc":
        if (cleavingTexture) this.paintedArc(x, z, heading, r, spread);
        each((k, d) => this.sweep(x, z, color, heading, r * 0.3, r, spread, { delay: d, reverse: k % 2 === 1, life: 260 }));
        this.sparks(x, z, color, 14, { dir: heading, spread, r: r * 0.85, speed: 4, up: 2.5, g: 9, life: 520 });
        this.glow(x, z, color, 1.4, { life: 220 });
        return true;
      case "splitshot_array":
        each((k, d) => {
          for (let i = 0; i < 5; i++) this.arrow(x, z, color, heading + spread * 0.8 * (i / 4 - 0.5) + (k ? rand(-0.05, 0.05) : 0), r, d + i * 12);
          this.glow(x, z, color, 1, { delay: d, life: 200 });
        });
        for (let i = 0; i < 5; i++) {
          const a = heading + spread * 0.8 * (i / 4 - 0.5);
          this.sparks(x + Math.cos(a) * r, z + Math.sin(a) * r, color, 3, { r: 0.1, speed: 1.5, up: 1.5, g: 6, delay: 110, life: 400 });
        }
        return true;
      case "meridian_lance": {
        const len = s.length ?? 10, w = s.width ?? 2;
        this.beam(x, z, color, heading, len, w * 0.9, { life: 280 + step * ((s.hits ?? 1) - 1) });
        each((k, d) => { if (k) this.beam(x, z, color, heading, len, w * 0.45, { delay: d, life: 200, grow: 60 }); });
        this.glow(x, z, color, 1.2, { life: 260 });
        this.glow(x + Math.cos(heading) * len, z + Math.sin(heading) * len, color, 1.4, { delay: 80, life: 360 });
        for (let i = 0; i < 10; i++) {
          const f = Math.random();
          this.sparks(x + Math.cos(heading) * len * f, z + Math.sin(heading) * len * f, color, 1,
            { r: 0, dir: heading + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2, spread: 0.6, speed: 2, up: 1.5, g: 6, delay: f * 90, life: 450 });
        }
        return true;
      }
      case "iron_cyclone": {
        // Three crescents whirl round the caster for as long as the parts land.
        const life = step * ((s.hits ?? 1) - 1) + 420;
        for (let i = 0; i < 3; i++) {
          const base = heading + (i * Math.PI * 2) / 3;
          const geo = new THREE.RingGeometry(r * 0.35, r, 40, 1, -1.3, 2.6).rotateX(-Math.PI / 2);
          this.ground("sweep", color, x, z, 0.14 + i * 0.01, life, (t, u, m, age) => {
            m.rotation.y = -(base - (age / 1000) * Math.PI * 4.4);
            u.uOpacity.value = Math.min(1, age / 80) * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
          }, { geo, extra: { uHalf: 1.3, uInner: r * 0.35, uR: r, uHead: 0.98, uTrail: 0.45, uDir: 1 } });
        }
        each((_k, d) => this.wave(x, z, color, r, { delay: d, life: 380, width: 0.05 }));
        this.sparks(x, z, color, 18, { r: r * 0.8, speed: 2, swirl: -5, up: 1.5, g: 7, life: 520, stagger: life * 0.7 });
        return true;
      }
      case "anchor_shout":
        for (let i = 0; i < 3; i++) this.wave(x, z, color, r, { delay: i * 130, life: 620, width: 0.06 });
        this.glow(x, z, color, 2, { life: 300 });
        this.sparks(x, z, color, 14, { r: 1, speed: 5, up: 1, g: 4, life: 500 });
        return true;
      case "sundering_pulse":
        each((k, d) => {
          this.wave(x, z, color, r, { delay: d, life: 560, width: 0.09 });
          this.glow(x, z, color, 2.4 + k * 0.3, { delay: d, life: 260 });
          this.sparks(x, z, color, 10, { r: r * 0.5, speed: 3, up: 4, g: 12, life: 700, delay: d, size: 0.1 });
        });
        return true;
      case "aether_nova":
        this.glow(x, z, color, r * 0.6, { life: 420 });
        each((_k, d) => this.wave(x, z, color, r, { delay: d, life: 480, width: 0.07 }));
        this.sparks(x, z, color, 22, { r: r * 0.5, speed: 1.5, up: 4, life: 900, stagger: 300 });
        return true;
      case "gravity_coil":
        this.ground("swirl", color, aimX, aimZ, 0.12, 700, (t, u, m, age) => {
          m.scale.setScalar(r * (1 - 0.75 * easeOut(t)));
          u.uTime.value = (age / 1000) * 1.5;
          u.uOpacity.value = Math.min(1, age / 100) * (1 - t * t);
        });
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
          ring.position.set(aimX, 0.1 + i * 0.01, aimZ);
          ring.scale.setScalar(r * (1 + i * 0.25));
          this.push(ring, "shrink", 500 + i * 120, { grow: r * (1 + i * 0.25) });
        }
        this.sparks(aimX, aimZ, color, 16, { r, speed: -r * 1.1, swirl: 3, up: 0.4, life: 500 });
        this.glow(aimX, aimZ, color, 1.8, { delay: 500, life: 300 });
        this.wave(aimX, aimZ, color, 2.5, { delay: 520, life: 360 });
        return true;
      case "prism_field":
        // One tick of the field (field() draws the field itself).
        this.wave(aimX, aimZ, color, r, { life: 420, width: 0.05 });
        this.glow(aimX, aimZ, color, r * 0.5, { life: 260 });
        this.sparks(aimX, aimZ, color, 6, { r: r * 0.8, speed: 0.3, up: 3, life: 700, size: 0.1 });
        return true;
      case "coil_mine":
        this.glow(aimX, aimZ, 0xffc070, r * 0.9, { life: 380 });
        each((k, d) => {
          this.wave(aimX, aimZ, color, r * 1.1, { delay: d, life: 460, width: 0.08 });
          if (k) this.glow(aimX, aimZ, color, r * 0.7, { delay: d, life: 300 });
        });
        this.sparks(aimX, aimZ, color, 18, { r: 0.4, speed: 4, up: 5, g: 14, life: 750, size: 0.1 });
        return true;
      case "gearstorm": {
        const life = step * ((s.hits ?? 1) - 1) + 420;
        for (const [size, spin] of [[r * 0.5, 3], [r * 0.95, -1.8]]) {
          this.ground("gear", color, x, z, 0.12, life, (t, u, m, age) => {
            m.scale.setScalar(size * (0.7 + 0.3 * easeOut(Math.min(1, age / 200))));
            m.rotation.y = (age / 1000) * spin;
            u.uOpacity.value = Math.min(1, age / 120) * (t < 0.75 ? 0.85 : 0.85 * (1 - (t - 0.75) / 0.25));
          });
        }
        each((_k, d) => {
          this.wave(x, z, color, r, { delay: d, life: 360, width: 0.04 });
          this.sparks(x, z, color, 5, { r: r * 0.5, speed: 4, swirl: 3, up: 1.2, g: 6, delay: d, life: 500 });
        });
        return true;
      }
      case "pulse_beacon":
        this.glow(x, z, color, 2.4, { life: 500 });
        for (let i = 0; i < 2; i++) this.wave(x, z, color, r, { delay: i * 220, life: 700, width: 0.05 });
        this.sparks(x, z, color, 16, { r: r * 0.6, speed: 0.2, up: 2.5, life: 1000, stagger: 400, size: 0.09 });
        return true;
    }
    // Skills without their own release yet: one by shape.
    switch (s.shape) {
      case "cone":
        each((k, d) => this.sweep(x, z, color, heading, 0.3, r, spread, { delay: d, reverse: k % 2 === 1 }));
        return true;
      case "line":
        this.beam(x, z, color, heading, s.length ?? 8, s.width ?? 2);
        return true;
      case "circle": case "taunt":
        each((_k, d) => this.wave(x, z, color, r, { delay: d }));
        this.glow(x, z, color, 1.6);
        return true;
      case "ground":
        this.burst(s, aimX, aimZ);
        return true;
      case "ally":
        this.aura(x, z, color, 1100, r * 0.35);
        return true;
      case "mobility":
        return true; // the trail plays at cast time
    }
    return false;
  }

  /** Cleaving Arc's painted crescent, clipped to the server's attack sector. */
  private paintedArc(x: number, z: number, heading: number, radius: number, spread: number) {
    // Planar UVs preserve the painted crescent; geometry clips the
    // wider source artwork to the authoritative attack sector.
    const geometry = new THREE.RingGeometry(radius * 0.28, radius, 48, 1, -spread / 2, spread);
    const vertices = geometry.getAttribute("position");
    const colors = new Float32Array(vertices.count * 4);
    for (let i = 0; i < vertices.count; i++) {
      const angle = Math.abs(Math.atan2(vertices.getY(i), vertices.getX(i)));
      const edge = Math.max(0, Math.min(1, (spread / 2 - angle) / (spread * 0.18)));
      colors.set([1, 1, 1, edge * edge * (3 - 2 * edge)], i * 4);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
    const arc = new THREE.Mesh(
      geometry.rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: cleavingTexture, color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    arc.position.set(x, 0.18, z);
    arc.rotation.y = -heading;
    this.push(arc, "flash", 360);
  }

  /** A skill part landing on a target: a spark spray and a flash at its feet. Capped per moment. */
  impact(at: THREE.Vector3, color: number) {
    if (this.impacts >= MAX_IMPACTS) return;
    this.impacts++;
    this.sparks(at.x, at.z, color, 3, { y: at.y, r: 0.1, speed: 2.2, up: 1.5, g: 8, life: 380, size: 0.06 });
    this.glow(at.x, at.z, color, 0.7, { life: 200, y: 0.12 });
  }

  /** A ground skill that keeps hitting: its circle lingers, turning, for its ticks. */
  field(s: SkillDef, x: number, z: number, ms: number) {
    const color = COLORS[s.id] ?? 0xffffff;
    const r = s.radius ?? 3, fade = 400;
    const shown = (age: number) => Math.min(1, age / 300) * Math.max(0, Math.min(1, (ms - age) / fade));
    this.ground("sigil", color, x, z, 0.065, ms, (_t, u, m, age) => {
      m.scale.setScalar(r * (0.85 + 0.15 * easeOut(Math.min(1, age / 300))));
      u.uTime.value = (age / 1000) * 0.5;
      u.uOpacity.value = shown(age) * (0.55 + 0.1 * Math.sin(age / 140));
    });
    this.ground("glow", color, x, z, 0.06, ms, (_t, u, m, age) => {
      m.scale.setScalar(r);
      u.uOpacity.value = shown(age) * 0.25;
    });
  }

  /** A dash: a fading streak from where the player was to where it is going. */
  trail(x: number, z: number, toX: number, toZ: number, color = 0x5adcb4) {
    const dx = toX - x, dz = toZ - z;
    this.beam(x, z, color, Math.atan2(dz, dx), Math.hypot(dx, dz) || 0.5, 1.1, { life: 480, grow: 120, tail: true });
    this.glow(x, z, color, 1.2, { life: 300 });
    this.glow(toX, toZ, color, 1.4, { delay: 120, life: 360 });
    for (let i = 0; i < 10; i++) this.sparks(x + (dx * i) / 9, z + (dz * i) / 9, color, 1, { r: 0, speed: 0.8, up: 1.2, delay: (i / 9) * 120, life: 500 });
  }

  /**
   * A ranged monster's shot: a glowing dart from `from` to `to` over `ms`
   * (a shallow arc), then a small splash ring where it lands.
   */
  projectile(from: THREE.Vector3, to: THREE.Vector3, color: number, ms: number) {
    const dart = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07, 0.36, 2, 6).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    core.position.z = 0.16;
    dart.add(core);
    dart.position.copy(from);
    this.push(dart, "bolt", ms, { from: from.clone(), to: to.clone(), arc: Math.min(1.2, from.distanceTo(to) * 0.12) });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.position.set(to.x, 0.09, to.z);
    ring.scale.setScalar(0.3);
    this.push(ring, "burst", 300, { grow: 0.7, delay: ms });
  }

  /** The plain hit: a shockwave and a flash in the skill's colour. */
  burst(s: SkillDef | undefined, x: number, z: number) {
    const color = s ? COLORS[s.id] ?? 0xffffff : 0xffffff;
    const r = s?.radius ?? 1.2;
    this.wave(x, z, color, r, { life: 450 });
    this.glow(x, z, color, Math.min(2, r * 0.6), { life: 260 });
  }

  /** A rising column and a ground ring round an actor: Totems, echoes, level-ups. */
  aura(x: number, z: number, color: number, lifeMs = 900, radius = 1.4) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, 2.6, 28, 1, true).translate(0, 1.3, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    col.position.set(x, 0.05, z);
    this.push(col, "aura", lifeMs);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.position.set(x, 0.1, z);
    ring.scale.setScalar(0.3);
    this.push(ring, "burst", lifeMs * 0.7, { grow: radius * 1.6 });
  }

  /**
   * Level up / skill up (RO style): a pillar of light, rings rolling out one
   * after another, and sparks rising round the actor. `power` 1 is a level
   * up; skill ranks use about 0.6. About 30 meshes, once, so cheap enough.
   */
  celebrate(x: number, z: number, color: number, power = 1) {
    this.pillar(x, z, color, 1.1 * power, 9 * power, 1600 * Math.max(0.7, power));
    // Rings rolling out.
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), glowMat(i === 1 ? 0xffffff : color, 0.95));
      ring.position.set(x, 0.12, z);
      ring.scale.setScalar(0.3);
      this.push(ring, "burst", 700, { grow: (2.2 + i * 1.1) * power, delay: i * 180 });
    }
    // Rising sparks, little diamonds that spin up and fade.
    const n = Math.round(22 * power);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, r = (0.4 + Math.random() * 0.9) * power;
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 + Math.random() * 0.08), glowMat(Math.random() < 0.35 ? 0xffffff : color, 1));
      spark.position.set(x + Math.cos(a) * r, 0.2 + Math.random() * 0.6, z + Math.sin(a) * r);
      this.push(spark, "spark", 1100 + Math.random() * 700, { delay: Math.random() * 400, v: [Math.cos(a) * 0.5, (2.6 + Math.random() * 2.2) * power, Math.sin(a) * 0.5] });
    }
  }

  update(dtMs: number) {
    this.impactClock += dtMs;
    if (this.impactClock >= IMPACT_WINDOW) { this.impactClock = 0; this.impacts = 0; }
    this.live = this.live.filter((l) => {
      if (l.delay && l.delay > 0) {
        l.delay -= dtMs;
        if (l.delay > 0) return true;
        l.obj.visible = true;
      }
      l.age += dtMs;
      const t = Math.min(1, l.age / l.life);
      const mat = l.obj.material as THREE.MeshBasicMaterial;
      if (l.kind === "fn") l.step!(t, l.age);
      else if (l.kind === "shrink") {
        l.obj.scale.setScalar(Math.max(0.2, l.grow * (1 - t)));
        mat.opacity = 0.6 * (1 - t * 0.6);
      } else if (l.kind === "flash") {
        mat.opacity = 0.95 * (1 - t);
      } else if (l.kind === "beam") {
        // Shoots up fast, holds, then thins and fades from the bottom up.
        l.obj.scale.set(1 - t * 0.6, Math.min(1, t * 6), 1 - t * 0.6);
        mat.opacity = (mat.userData.o ??= mat.opacity) * (t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45);
      } else if (l.kind === "spark") {
        const s = dtMs / 1000;
        l.obj.position.x += l.v![0] * s; l.obj.position.y += l.v![1] * s; l.obj.position.z += l.v![2] * s;
        l.v![1] = l.v![1] * 0.985 - (l.g ?? 0) * s;
        if (l.obj.position.y < 0.05) { l.obj.position.y = 0.05; l.v![0] *= 0.8; l.v![2] *= 0.8; }
        l.obj.rotation.y += s * 6; l.obj.rotation.x += s * 3;
        mat.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      } else if (l.kind === "bolt") {
        tmp.lerpVectors(l.from!, l.to!, t);
        tmp.y += Math.sin(t * Math.PI) * l.arc!;
        l.obj.lookAt(tmp);
        l.obj.position.copy(tmp);
      } else if (l.kind === "aura") {
        l.obj.scale.set(1 + t * 0.3, 0.4 + t * 0.9, 1 + t * 0.3);
        mat.opacity = 0.45 * (1 - t);
      } else {
        l.obj.scale.setScalar(0.3 + l.grow * Math.min(1, t * 1.3));
        mat.opacity = 0.9 * (1 - t);
      }
      if (t >= 1) {
        dispose(l.obj);
        return false;
      }
      return true;
    });
  }

  clear() {
    for (const l of this.live) dispose(l.obj);
    this.live = [];
  }
}

function dispose(obj: THREE.Object3D) {
  obj.removeFromParent();
  obj.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
}
