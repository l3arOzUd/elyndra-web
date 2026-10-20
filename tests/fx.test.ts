import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Fx } from "../src/render/fx";
import skills from "../public/data/skills.json";
import type { SkillDef } from "../src/data/schema";

const skill = (id: string) => skills.find(s => s.id === id)! as SkillDef;

describe("skill effect placement", () => {
  it("places ground impacts and pull warnings at the aim, not the caster", () => {
    for (const id of ["coil_mine", "prism_field", "gravity_coil"]) {
      const scene = new THREE.Scene(), fx = new Fx(scene), s = skill(id);
      fx.telegraph(s, 1, 2, 8, 9, 400);
      fx.shaped(s, 1, 2, 8, 9);
      for (const obj of scene.children) {
        expect(obj.position.x).toBe(8);
        expect(obj.position.z).toBe(9);
      }
      fx.clear();
      expect(scene.children).toHaveLength(0);
    }
  });
  it("keeps forward blade arcs and arrow fans inside the aimed cone", () => {
    for (const id of ["cleaving_arc", "splitshot_array"]) {
      const scene = new THREE.Scene(), fx = new Fx(scene), s = skill(id);
      expect(fx.shaped(s, 3, 4, 3, 12)).toBe(true);
      scene.updateMatrixWorld(true);
      expect(scene.children).toHaveLength(id === "cleaving_arc" ? 3 : 5);
      for (const obj of scene.children) {
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
});
