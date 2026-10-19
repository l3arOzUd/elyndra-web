import type { Cell } from "../shared/path";

export const WALKABLE = 1;
export const WATER = 2;

/** The walk grid: one byte of flags a cell, row-major. */
export class WalkGrid {
  readonly flags: Uint8Array;

  constructor(readonly width: number, readonly height: number) {
    this.flags = new Uint8Array(width * height).fill(WALKABLE);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  walkable(x: number, y: number): boolean {
    return this.inside(x, y) && (this.flags[y * this.width + x] & WALKABLE) !== 0;
  }

  set(x: number, y: number, flags: number) {
    if (this.inside(x, y)) this.flags[y * this.width + x] = flags;
  }

  get(x: number, y: number): number {
    return this.inside(x, y) ? this.flags[y * this.width + x] : 0;
  }

  /** The nearest walkable cell to (x, y), searching outwards ring by ring. */
  nearestWalkable(x: number, y: number, maxRadius = 8): Cell | null {
    if (this.walkable(x, y)) return [x, y];
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.walkable(x + dx, y + dy)) return [x + dx, y + dy];
        }
      }
    }
    return null;
  }
}
