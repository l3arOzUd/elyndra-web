import * as THREE from 'three';
import { farmWalls } from '../shared/dawnFarm';
import { envArt } from './envArt';

/** Small authored ruin: walls follow the shared collision cells exactly. */
export function buildDawnFarmhouse(group: THREE.Group, track: <T extends { dispose(): void }>(r: T) => T) {
  const shape = new THREE.Shape().moveTo(-0.44, -0.44).lineTo(0.44, -0.44).lineTo(0.44, 0.44).lineTo(-0.44, 0.44).closePath();
  const stoneGeo = track(new THREE.ExtrudeGeometry(shape, { depth: 0.88, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1, steps: 1 }).translate(0, 0, -0.44));
  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const image = envArt.textures.get('dawn_limestone');
  const texture = image ? track(new THREE.Texture(image)) : null;
  if (texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.needsUpdate = true; }
  const material = track(new THREE.MeshLambertMaterial({ color: 0xffffff, map: texture }));
  const timberMaterial = track(new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const batches = [[], []] as { matrix: THREE.Matrix4; color: THREE.Color }[][];
  const transform = new THREE.Object3D();
  const piece = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number,
    rx = 0, ry = 0, rz = 0, bevel = true) => {
    transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.rotation.set(rx, ry, rz); transform.updateMatrix();
    batches[bevel ? 0 : 1].push({ matrix: transform.matrix.clone(), color: new THREE.Color(color) });
  };
  const beam = (a: number[], b: number[], width: number, color = 0x67503b) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
    transform.position.copy(start).add(end).multiplyScalar(0.5);
    transform.scale.set(width, direction.length(), width);
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); transform.updateMatrix();
    batches[1].push({ matrix: transform.matrix.clone(), color: new THREE.Color(color) });
  };
  const stones = [0xaaa58d, 0x929680, 0xb8b098, 0x8d907e, 0xc0b59a];
  for (const wall of farmWalls) {
    const alongX = wall.z === 52 || wall.z === 59;
    const rows = Math.max(2, Math.floor(wall.height / 0.32) - ((wall.x * 7 + wall.z * 3) % 3));
    for (let row = 0; row < rows; row++) for (let half = 0; half < 2; half++) {
      // An actual opening above the surviving window sill, not a black decal.
      if (wall.z === 52 && (wall.x === 70 || wall.x === 71) && row >= 3 && row < 6) continue;
      const jitter = Math.sin(wall.x * 3 + wall.z + row * 4 + half) * 0.025;
      const offset = (half - 0.5) * 0.47 + (row % 2 ? 0.055 : -0.025);
      piece(wall.x + 0.5 + (alongX ? offset : jitter), row * 0.32 + 0.16, wall.z + 0.5 + (alongX ? jitter : offset),
        alongX ? 0.44 : 0.73, 0.28 + jitter, alongX ? 0.73 : 0.44, stones[(wall.x + wall.z + row + half) % stones.length], row === rows - 1 ? jitter * 3 : 0, jitter, jitter);
    }
    // Moss rests on the wall foot rather than floating around the building.
    if ((wall.x + wall.z) % 3 === 0) piece(wall.x + 0.5, 0.1, wall.z + 0.5, 0.91, 0.17, 0.88, 0x67764a);
  }
  // Door jambs and surviving lintel frame a two-cell walkable entrance.
  beam([71.65, 0.12, 59.5], [71.65, 2.55, 59.5], 0.2);
  beam([74.35, 0.12, 59.5], [74.35, 2.4, 59.5], 0.2);
  beam([71.45, 2.55, 59.5], [74.55, 2.4, 59.5], 0.25);
  // Stone hearth / chimney is entirely over the west wall's solid cells.
  for (let row = 0; row < 15; row++) piece(68.5, row * 0.3 + 0.15, 53.5, 0.9, 0.28, 0.9, stones[row % 5]);
  piece(68.5, 4.52, 53.5, 0.62, 0.04, 0.6, 0x393d35);
  // Part of the original roof remains at the back. Its exposed rafters and
  // missing slates show the direction of collapse into the open room.
  beam([68.5, 3.8, 54.2], [73.1, 3.8, 54.2], 0.22);
  for (let x = 69; x <= 73; x++) {
    beam([x, 2.65, 52.3], [x, 3.8, 54.2], 0.14);
    beam([x, 3.8, 54.2], [x + 0.12, x === 73 ? 2.85 : 2.65, x === 73 ? 55.65 : 56.1], 0.14);
  }
  const slate = [0x596f72, 0x6e8585, 0x75898b, 0x536969];
  for (const side of [-1, 1]) for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
    if (col > 5 && (row + col) % 3 !== 0 || side === 1 && col > 3 && row > 1) continue;
    const z = 54.2 + side * (row * 0.44 + 0.24);
    piece(68.8 + col * 0.5, 3.84 - (row * 0.44 + 0.24) * 0.6, z, 0.52, 0.08, 0.59,
      slate[(row + col) % 4], side * 0.54, 0, Math.sin(col * 9) * 0.025);
  }
  // Low, walk-over rubble follows the collapsed roof, leaving the door clear.
  for (let i = 0; i < 32; i++) {
    const x = 74.5 + Math.sin(i * 2.4) * 1.35, z = 55 + Math.cos(i * 3.7) * 1.1;
    piece(x, 0.09 + (i % 3) * 0.04, z, 0.34 + (i % 4) * 0.08, 0.12, 0.4, i % 3 ? slate[i % 4] : stones[i % 5], 0.12, i * 1.4, 0.1);
  }
  beam([73.9, 0.14, 53.8], [75.9, 0.2, 56.4], 0.18);
  beam([74.4, 0.13, 55.9], [76.4, 0.12, 54.1], 0.15);
  // Worn flagstones and fallen fence rails define the yard without blocking it.
  for (let i = 0; i < 9; i++) piece(71.6 + (i % 3) * 0.8, 0.035, 60.2 + Math.floor(i / 3) * 0.8,
    0.65, 0.065, 0.64, stones[i % 5], 0, Math.sin(i) * 0.1);
  for (let i = 0; i < 3; i++) beam([66.3 + i * 0.25, 0.1, 62.4], [68.9, 0.11, 63.1 + i * 0.26], 0.12, 0x837154);
  // Remaining lime plaster gives the facade large painted surfaces between
  // chipped masonry, rather than making every wall a uniform brick grid.
  for (const [x, z, angle] of [[69.4, 52.9, 0], [74.7, 52.9, 0], [68.9, 55.8, Math.PI / 2]]) {
    const outline = new THREE.Shape().moveTo(-0.55, 0).lineTo(0.62, 0.08).lineTo(0.7, 0.65).lineTo(0.32, 0.84)
      .lineTo(0.12, 1.13).lineTo(-0.46, 1.05).lineTo(-0.68, 0.6).closePath();
    const patch = new THREE.Mesh(track(new THREE.ShapeGeometry(outline)), track(new THREE.MeshLambertMaterial({ color: 0xc4bda3, map: texture, side: THREE.DoubleSide })));
    patch.position.set(x, 0.38, z); patch.rotation.y = angle; patch.castShadow = patch.receiveShadow = true; group.add(patch);
  }
  const leafImage = envArt.textures.get('dawn_leaf_spray');
  if (leafImage) {
    const leafMap = track(new THREE.Texture(leafImage)); leafMap.colorSpace = THREE.SRGBColorSpace; leafMap.needsUpdate = true;
    const foliage = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(0.95, 0.75)),
      track(new THREE.MeshLambertMaterial({ map: leafMap, color: 0x85905d, alphaTest: 0.4, side: THREE.DoubleSide })), 28);
    for (let i = 0; i < 28; i++) {
      const climbing = i < 12;
      transform.position.set(climbing ? 68.05 : 69 + (i - 12) * 0.52, climbing ? 0.2 + i * 0.16 : 0.15, climbing ? 53.6 + Math.sin(i * 1.7) * 0.26 : 51.97);
      transform.rotation.set(climbing ? 0 : -Math.PI / 3, climbing ? -Math.PI / 2 : i * 1.7, 0);
      transform.scale.setScalar(0.55 + (i % 4) * 0.12); transform.updateMatrix(); foliage.setMatrixAt(i, transform.matrix);
    }
    foliage.castShadow = true; group.add(foliage);
  }
  for (let batch = 0; batch < batches.length; batch++) {
    const mesh = new THREE.InstancedMesh(batch ? boxGeo : stoneGeo, batch ? timberMaterial : material, batches[batch].length);
    mesh.name = batch ? 'dawn-farm-timbers' : 'dawn-farm-masonry'; mesh.castShadow = mesh.receiveShadow = true;
    batches[batch].forEach((p, i) => { mesh.setMatrixAt(i, p.matrix); mesh.setColorAt(i, p.color); }); group.add(mesh);
  }
}
