import * as THREE from 'three';

/** Shared lighting: the inspection viewer must match the playable scene. */
export function sceneLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x4b5b3a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 160 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.00015;
  scene.add(sun, sun.target);
  return (focus: THREE.Vector3) => {
    // Snap the moving shadow frustum to texels to avoid crawling while walking.
    const x = Math.round(focus.x * 16) / 16, z = Math.round(focus.z * 16) / 16;
    sun.position.set(x - 40, 80, z + 30);
    sun.target.position.set(x, 0, z);
  };
}
