// Directions, shared by the simulation and the renderer.
//
// Headings are radians measured clockwise from north as seen from above:
// 0 = north (-z / cell y decreasing), PI/2 = east (+x), PI = south (+z).
// Sprite sheets name their rows with the same eight compass points.

export const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type Dir = (typeof DIRS)[number];

const OCTANT = Math.PI / 4;

/** The heading of a step of (dx, dy) in cells, or in world x/z. */
export function headingOf(dx: number, dy: number): number {
  return Math.atan2(dx, -dy);
}

export function dirIndex(heading: number): number {
  return ((Math.round(heading / OCTANT) % 8) + 8) % 8;
}

/**
 * The direction the viewer sees an entity face: its world heading turned by
 * the camera's yaw, rounded once. (Rounding the camera and the entity to
 * octants separately, as the RO clients do, can be off by one octant when
 * both sit near a boundary.)
 */
export function viewDir(heading: number, cameraYaw: number): Dir {
  return DIRS[dirIndex(heading + cameraYaw)];
}
