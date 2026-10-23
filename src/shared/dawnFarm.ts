/** Authored ruin footprint, shared by content baking and the 3D renderer. */
export const DAWN_FARM = { x: 68, z: 52, width: 10, depth: 8 };
export const farmApproach: [number, number][] = [[52, 59], [59, 62], [65, 65], [72.5, 64], [72.5, 58]];
export const farmSite = (x: number, z: number) => x >= 65 && x < 82 && z >= 49 && z < 69;
export const farmWalls: { x: number; z: number; height: number }[] = [];
for (let x = 68; x <= 77; x++) farmWalls.push({ x, z: 52, height: x < 73 ? 2.9 : 1.3 + (77 - x) * 0.25 });
for (let z = 53; z <= 59; z++) farmWalls.push({ x: 68, z, height: z < 56 ? 2.6 : 1.2 });
for (let z = 53; z <= 58; z++) farmWalls.push({ x: 77, z, height: z < 55 ? 1.7 : 0.6 });
// A two-cell doorway faces the farmyard; east wall ends in a second exit.
for (const x of [69, 70, 71, 74, 75, 76]) farmWalls.push({ x, z: 59, height: x === 71 || x === 74 ? 2.2 : 0.9 });
export const farmWallCell = (x: number, z: number) => farmWalls.some(w => w.x === x && w.z === z);
