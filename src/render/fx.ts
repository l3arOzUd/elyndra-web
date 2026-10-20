import * as THREE from "three";
import type { SkillDef } from "../data/schema";

// Skill visuals: a ground telegraph while the cast winds up, then a burst
// when the server's hit lands. Pooled so a 50-target AoE costs a handful
// of meshes, never one per target (HORDE_SPEC §3 "particle budget").

const COLORS: Record<string, number> = {
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
export const RARITY_COLORS: Record<string, number> = { normal: 0xd9b46a, magic: 0x6d9ed0, rare: 0xe0c35a, relic: 0xe07a3c, unique: 0xc9853a };

interface Live { obj: THREE.Mesh; age: number; life: number; grow: number; kind: "tele" | "burst" | "aura" | "shrink" | "field" | "flash" }

// Shared across maps. Each effect owns its material, not this reusable texture.
let cleavingTexture: THREE.Texture | undefined;
let loadingCleavingTexture = false;

export class Fx {
  private live: Live[] = [];
  readonly enabled = { flash: true };

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

  private shapeGeometry(s: SkillDef, scale = 1): THREE.BufferGeometry {
    const r = (s.radius ?? 1) * scale;
    switch (s.shape) {
      case "cone": {
        const a = ((s.angle_deg ?? 90) * Math.PI) / 180;
        // RingGeometry sector, centred on +x; rotated to face the aim later.
        return new THREE.RingGeometry(0.3, r, 24, 1, -a / 2, a).rotateX(-Math.PI / 2);
      }
      case "line":
        return new THREE.PlaneGeometry(s.length ?? 8, s.width ?? 2).translate((s.length ?? 8) / 2, 0, 0).rotateX(-Math.PI / 2);
      default:
        return new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2);
    }
  }

  /** Shows where a cast will land, for castMs. */
  telegraph(s: SkillDef, x: number, z: number, aimX: number, aimZ: number, castMs: number) {
    const color = COLORS[s.id] ?? 0xffffff;
    const mesh = new THREE.Mesh(this.shapeGeometry(s), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide }));
    const targeted = s.shape === "ground" || s.shape === "pull";
    const cx = targeted ? aimX : x, cz = targeted ? aimZ : z;
    mesh.position.set(cx, 0.07, cz);
    mesh.rotation.y = -Math.atan2(aimZ - z, aimX - x);
    this.scene.add(mesh);
    this.live.push({ obj: mesh, age: 0, life: Math.max(150, castMs), grow: 0, kind: "tele" });
  }

  private add(mesh: THREE.Mesh, kind: Live["kind"], life: number, grow = 0) {
    this.scene.add(mesh);
    this.live.push({ obj: mesh, age: 0, life, grow, kind });
  }

  /** Per-shape hit visuals (HORDE_SPEC §8 shapes). Returns false when the
   * plain ring should play instead. */
  shaped(s: SkillDef, x: number, z: number, aimX: number, aimZ: number): boolean {
    const color = COLORS[s.id] ?? 0xffffff;
    const mat = (opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    switch (s.shape) {
      case "ground":
        this.burst(s, aimX, aimZ);
        return true;
      case "cone": {
        const radius = s.radius ?? 6;
        const spread = (s.angle_deg ?? 90) * Math.PI / 180;
        const heading = Math.atan2(aimZ - z, aimX - x);
        if (s.id === "cleaving_arc" && cleavingTexture) {
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
          this.add(arc, "flash", 360);
          return true;
        }
        if (s.id === "splitshot_array") {
          // A fan of five arrow streaks, bounded by the server's cone.
          for (let i = 0; i < 5; i++) {
            const angle = heading + spread * 0.8 * (i / 4 - 0.5);
            const arrow = new THREE.Shape();
            arrow.moveTo(0.8, -0.045);
            arrow.lineTo(radius - 0.5, -0.045);
            arrow.lineTo(radius - 0.5, -0.18);
            arrow.lineTo(radius, 0);
            arrow.lineTo(radius - 0.5, 0.18);
            arrow.lineTo(radius - 0.5, 0.045);
            arrow.lineTo(0.8, 0.045);
            arrow.closePath();
            const streak = new THREE.Mesh(new THREE.ShapeGeometry(arrow).rotateX(-Math.PI / 2), mat(0.95));
            streak.position.set(x, 0.16, z);
            streak.rotation.y = -angle;
            this.add(streak, "flash", 280 + i * 15);
          }
        } else {
          // Three tapered bands read as a blade sweep instead of a full AoE ring.
          for (let i = 0; i < 3; i++) {
            const outer = radius * (1 - i * 0.16);
            const arc = new THREE.Mesh(new THREE.RingGeometry(outer - 0.12 - i * 0.04, outer, 32, 1, -spread / 2, spread).rotateX(-Math.PI / 2), mat(0.9));
            arc.position.set(x, 0.12 + i * 0.025, z);
            arc.rotation.y = -heading;
            this.add(arc, "flash", 220 + i * 65);
          }
        }
        return true;
      }
      case "pull": {
        // Three rings closing on the point the horde is dragged to.
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), mat(0.8));
          ring.position.set(aimX, 0.1 + i * 0.01, aimZ);
          ring.scale.setScalar((s.radius ?? 5) * (1 + i * 0.25));
          this.add(ring, "shrink", 500 + i * 120, (s.radius ?? 5) * (1 + i * 0.25));
        }
        return true;
      }
      case "line": {
        const len = s.length ?? 8, w = s.width ?? 2;
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(len, w * 0.6).translate(len / 2, 0, 0).rotateX(-Math.PI / 2), mat(0.95));
        beam.position.set(x, 0.12, z);
        beam.rotation.y = -Math.atan2(aimZ - z, aimX - x);
        this.add(beam, "flash", 350);
        return true;
      }
      case "ally":
        this.aura(x, z, color, 1100, s.radius ? s.radius * 0.35 : 2.4);
        return true;
      case "mobility":
        return true; // the trail plays at cast time
    }
    return false;
  }

  /** A ground skill that keeps hitting: the field lingers for its ticks. */
  field(s: SkillDef, x: number, z: number, ms: number) {
    const color = COLORS[s.id] ?? 0xffffff;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(s.radius ?? 3, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    disc.position.set(x, 0.06, z);
    this.add(disc, "field", ms);
  }

  /** A dash: a streak from where the player was to where it is going. */
  trail(x: number, z: number, toX: number, toZ: number, color = 0x5adcb4) {
    const len = Math.hypot(toX - x, toZ - z) || 0.5;
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.8).translate(len / 2, 0, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    streak.position.set(x, 0.1, z);
    streak.rotation.y = -Math.atan2(toZ - z, toX - x);
    this.add(streak, "flash", 450);
  }

  /** The hit: an expanding ring in the skill's colour. */
  burst(s: SkillDef | undefined, x: number, z: number) {
    const color = s ? COLORS[s.id] ?? 0xffffff : 0xffffff;
    const r = s?.radius ?? 1.2;
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    mesh.position.set(x, 0.09, z);
    mesh.scale.setScalar(0.3);
    this.scene.add(mesh);
    this.live.push({ obj: mesh, age: 0, life: 450, grow: r, kind: "burst" });
  }

  /** A rising column and a ground ring round an actor: Totems, echoes, level-ups. */
  aura(x: number, z: number, color: number, lifeMs = 900, radius = 1.4) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, 2.6, 28, 1, true).translate(0, 1.3, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    col.position.set(x, 0.05, z);
    this.scene.add(col);
    this.live.push({ obj: col, age: 0, life: lifeMs, grow: 0, kind: "aura" });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.position.set(x, 0.1, z);
    ring.scale.setScalar(0.3);
    this.scene.add(ring);
    this.live.push({ obj: ring, age: 0, life: lifeMs * 0.7, grow: radius * 1.6, kind: "burst" });
  }

  update(dtMs: number) {
    this.live = this.live.filter((l) => {
      l.age += dtMs;
      const t = l.age / l.life;
      const mat = l.obj.material as THREE.MeshBasicMaterial;
      if (l.kind === "tele") mat.opacity = 0.12 + 0.3 * t;
      else if (l.kind === "shrink") {
        l.obj.scale.setScalar(Math.max(0.2, l.grow * (1 - t)));
        mat.opacity = 0.8 * (1 - t * 0.6);
      } else if (l.kind === "field") {
        mat.opacity = 0.18 + 0.1 * Math.sin(l.age / 120) - (t > 0.85 ? (t - 0.85) * 1.2 : 0);
      } else if (l.kind === "flash") {
        mat.opacity = 0.95 * (1 - t);
      } else if (l.kind === "aura") {
        l.obj.scale.set(1 + t * 0.3, 0.4 + t * 0.9, 1 + t * 0.3);
        mat.opacity = 0.45 * (1 - t);
      } else {
        l.obj.scale.setScalar(0.3 + l.grow * Math.min(1, t * 1.3));
        mat.opacity = 0.9 * (1 - t);
      }
      if (t >= 1) {
        l.obj.removeFromParent();
        l.obj.geometry.dispose();
        mat.dispose();
        return false;
      }
      return true;
    });
  }

  clear() {
    for (const l of this.live) { l.obj.removeFromParent(); l.obj.geometry.dispose(); (l.obj.material as THREE.Material).dispose(); }
    this.live = [];
  }
}
