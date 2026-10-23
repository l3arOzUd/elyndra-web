import { expect, it } from "vitest";
import * as THREE from "three";
import { Fx } from "../src/render/fx";

it("moves sonar toward the captured target and expires at hit time", () => {
  const scene = new THREE.Scene(), fx = new Fx(scene);
  const from = new THREE.Vector3(1, 2, 3), to = new THREE.Vector3(3, 1, 5);
  const direction = to.clone().sub(from).normalize();
  fx.monsterProjectile("mob_0023", from, to, 0xffffff, 200);
  from.set(100, 100, 100); to.set(-100, -100, -100);
  expect(scene.children).toHaveLength(3);
  fx.update(100);
  for (const obj of scene.children) {
    expect(obj.position.x).toBeGreaterThan(1);
    expect(obj.position.x).toBeLessThan(3);
    expect(new THREE.Vector3(0, 0, 1).applyQuaternion(obj.quaternion).distanceTo(direction)).toBeLessThan(1e-6);
    expect(((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0);
  }
  fx.update(100);
  expect(scene.children).toHaveLength(0);
});

it("preserves ordinary monster projectile and impact cleanup", () => {
  const scene = new THREE.Scene(), fx = new Fx(scene);
  fx.monsterProjectile("mob_0022", new THREE.Vector3(), new THREE.Vector3(2, 1, 0), 0x55aaff, 200);
  expect(scene.children.some(o => (o as THREE.Mesh).geometry.type === "CapsuleGeometry")).toBe(true);
  fx.clear();
  expect(scene.children).toHaveLength(0);
});
