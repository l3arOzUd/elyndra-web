import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Fx } from "../src/render/fx";
import skills from "../public/data/skills.json";
import type { SkillDef } from "../src/data/schema";

const skill = (id: string) => skills.find(s => s.id === id)! as SkillDef;
const uniforms = (obj: THREE.Object3D) => ((obj as THREE.Mesh).material as THREE.ShaderMaterial).uniforms ?? {};

describe("skill effect placement", () => {
  it("places ground impacts and pull warnings at the aim, not the caster", () => {
    for (const id of ["coil_mine", "prism_field", "gravity_coil"]) {
      const scene = new THREE.Scene(), fx = new Fx(scene), s = skill(id);
      fx.telegraph(s, 1, 2, 8, 9, 400);
      // The area warning sits on the aim; only the caster's own channelling circle stays with the caster.
      const area = scene.children.filter(o => "uProgress" in uniforms(o));
      expect(area).toHaveLength(1);
      expect([area[0].position.x, area[0].position.z]).toEqual([8, 9]);
      fx.clear();
      fx.shaped(s, 1, 2, 8, 9);
      expect(scene.children.length).toBeGreaterThan(0);
      for (const obj of scene.children) expect(Math.hypot(obj.position.x - 8, obj.position.z - 9)).toBeLessThanOrEqual(s.radius! + 0.001);
      fx.clear();
      expect(scene.children).toHaveLength(0);
    }
  });
  it("keeps forward blade arcs and arrow fans inside the aimed cone", () => {
    for (const id of ["cleaving_arc", "splitshot_array"]) {
      const scene = new THREE.Scene(), fx = new Fx(scene), s = skill(id);
      expect(fx.shaped(s, 3, 4, 3, 12)).toBe(true);
      scene.updateMatrixWorld(true);
      const blades = scene.children.filter(o => "uHead" in uniforms(o) || (o as THREE.Mesh).geometry.type === "ShapeGeometry");
      expect(blades).toHaveLength(id === "cleaving_arc" ? s.hits! : 5 * s.hits!);
      for (const obj of blades) {
        const vertices = (obj as THREE.Mesh).geometry.getAttribute("position");
        for (let i = 0; i < vertices.count; i++) {
          const p = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(obj.matrixWorld);
          const dx = p.x - 3, dz = p.z - 4;
          expect(dz).toBeGreaterThan(0);
          expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(s.radius! + 0.001);
          // Arrowheads extend slightly either side of their centre ray.
          expect(Math.abs(Math.atan2(dx, dz))).toBeLessThan(s.angle_deg! * Math.PI / 360 + 0.03);
        }
      }
      fx.update(1000);
      expect(scene.children).toHaveLength(0);
    }
  });
  it("gives every skill a cast warning and its own release", () => {
    for (const s of skills as SkillDef[]) {
      const scene = new THREE.Scene(), fx = new Fx(scene);
      fx.telegraph(s, 0, 0, 3, 0, s.cast_ms || 150);
      if (s.shape !== "mobility") expect(scene.children.length, s.id).toBeGreaterThan(0);
      fx.clear();
      expect(fx.shaped(s, 0, 0, 3, 0), s.id).toBe(true);
      for (let i = 0; i < 60; i++) fx.update(50);
      expect(scene.children, s.id).toHaveLength(0);
    }
  });
});
