import * as THREE from 'three';
import type { MapLayout } from '../data/schema';

/** The same anchors and pier footprints used by content/world.ts. */
export function buildDawnLandmarks(layout: MapLayout, group: THREE.Group,
  track: <T extends { dispose(): void }>(resource: T) => T, animated: THREE.Object3D[]) {
  const stone = track(new THREE.MeshLambertMaterial({ color: 0xc3b797 }));
  const trim = track(new THREE.MeshLambertMaterial({ color: 0xe2d5b3 }));
  const brass = track(new THREE.MeshLambertMaterial({ color: 0x99733c }));
  const teal = track(new THREE.MeshPhongMaterial({ color: 0x61d7c4, emissive: 0x146d65, shininess: 70 }));
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material,
    x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(track(geo), mat); mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  for (const p of layout.props) {
    if (p.kind !== 'aether_pylon' && p.kind !== 'aqueduct') continue;
    const root = new THREE.Group(); root.name = `dawn-${p.kind}`;
    root.position.set(p.x + 0.5, 0, p.y + 0.5); root.rotation.y = p.rot ?? 0; root.scale.setScalar(p.scale ?? 1);
    group.add(root);
    if (p.kind === 'aether_pylon') {
      add(root, new THREE.CylinderGeometry(0.64, 0.72, 0.16, 8), stone, 0, 0.08, 0);
      add(root, new THREE.CylinderGeometry(0.46, 0.55, 0.24, 8), trim, 0, 0.28, 0);
      add(root, new THREE.CylinderGeometry(0.2, 0.33, 1.35, 8), stone, 0, 1.06, 0);
      for (const y of [0.5, 1.5, 1.77]) add(root, new THREE.CylinderGeometry(0.34, 0.34, 0.09, 12), brass, 0, y, 0);
      const crystal = add(root, new THREE.OctahedronGeometry(0.48).scale(0.8, 1.65, 0.8), teal, 0, 2.45, 0);
      crystal.userData.spin = { axis: 'y', speed: 0.22 }; animated.push(crystal);
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3;
        const prong = add(root, new THREE.CylinderGeometry(0.035, 0.065, 0.7, 6), brass, Math.cos(a) * 0.35, 1.95, Math.sin(a) * 0.35);
        prong.rotation.z = Math.cos(a) * -0.3; prong.rotation.x = Math.sin(a) * 0.3;
      }
    } else {
      // Three narrow piers, two open arches: never a solid invisible wall.
      for (const x of [-3, 0, 3]) {
        for (let row = 0; row < 5; row++) add(root, new THREE.BoxGeometry(0.84, 0.37, 0.84), row % 2 ? trim : stone, x, 0.185 + row * 0.39, 0);
        add(root, new THREE.BoxGeometry(0.96, 0.16, 0.96), trim, x, 2.02, 0);
      }
      for (const cx of [-1.5, 1.5]) {
        for (let i = 0; i < 9; i++) {
          const a = i * Math.PI / 9, b = (i + 1) * Math.PI / 9 - 0.015;
          const shape = new THREE.Shape();
          shape.absarc(0, 0, 1.52, a, b, false);
          shape.absarc(0, 0, 1.13, b, a, true); shape.closePath();
          add(root, new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false }), i % 3 ? stone : trim, cx, 1.92, -0.35);
        }
      }
      add(root, new THREE.BoxGeometry(7, 0.25, 0.95), trim, 0, 3.53, 0);
      const pipe = add(root, new THREE.CylinderGeometry(0.15, 0.15, 6.7, 10), brass, 0, 3.78, 0);
      pipe.rotation.z = Math.PI / 2;
      for (const x of [-2.5, -0.8, 0.8, 2.5]) {
        const band = add(root, new THREE.TorusGeometry(0.17, 0.035, 6, 12), brass, x, 3.78, 0);
        band.rotation.y = Math.PI / 2;
      }
    }
  }
}
