import * as THREE from "three";
import type { SkillDef } from "../data/schema";

// Skill visuals: a ground telegraph while the cast winds up, then a burst
// when the server's hit lands. Pooled so a 50-target AoE costs a handful
// of meshes, never one per target (HORDE_SPEC §3 "particle budget").

const COLORS: Record<string, number> = {
  cleaving_arc: 0xffd27a, iron_cyclone: 0x9fd8ff, anchor_shout: 0xff9a6a, sundering_pulse: 0x7ff0ff,
};

interface Live { obj: THREE.Mesh; age: number; life: number; grow: number; kind: "tele" | "burst" }

export class Fx {
  private live: Live[] = [];
  readonly enabled = { flash: true };

  constructor(private readonly scene: THREE.Scene) {}

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
    const cx = s.shape === "ground" ? aimX : x, cz = s.shape === "ground" ? aimZ : z;
    mesh.position.set(cx, 0.07, cz);
    mesh.rotation.y = -Math.atan2(aimZ - z, aimX - x);
    this.scene.add(mesh);
    this.live.push({ obj: mesh, age: 0, life: Math.max(150, castMs), grow: 0, kind: "tele" });
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

  update(dtMs: number) {
    this.live = this.live.filter((l) => {
      l.age += dtMs;
      const t = l.age / l.life;
      const mat = l.obj.material as THREE.MeshBasicMaterial;
      if (l.kind === "tele") mat.opacity = 0.12 + 0.3 * t;
      else {
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
