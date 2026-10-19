import { DIAGONAL_COST, type Cell } from "../shared/path";
import type { WalkGrid } from "./grid";

const STEPS: Cell[] = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

/** A binary min-heap of node indices keyed by f-score. */
class Heap {
  private items: number[] = [];
  constructor(private readonly score: Float64Array) {}
  get size() { return this.items.length; }
  push(n: number) {
    const a = this.items;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.score[a[p]] <= this.score[a[i]]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0];
    const end = a.pop()!;
    if (a.length > 0) {
      a[0] = end;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.score[a[l]] < this.score[a[m]]) m = l;
        if (r < a.length && this.score[a[r]] < this.score[a[m]]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export interface PathOptions {
  /** Stop on any cell within this Chebyshev distance of the goal (0 = on it). */
  range?: number;
  /** Give up after expanding this many cells. */
  maxNodes?: number;
}

/**
 * 8-way A* with an octile heuristic. Diagonals may not cut a blocked corner.
 * Returns the cells from `from` to the goal inclusive, or null.
 */
export function findPath(grid: WalkGrid, from: Cell, to: Cell, opts: PathOptions = {}): Cell[] | null {
  const range = opts.range ?? 0;
  const maxNodes = opts.maxNodes ?? 6000;
  const w = grid.width;
  const reached = (x: number, y: number) => Math.max(Math.abs(x - to[0]), Math.abs(y - to[1])) <= range;
  if (!grid.walkable(from[0], from[1])) return null;
  if (reached(from[0], from[1])) return [from];

  const size = w * grid.height;
  const g = new Float64Array(size).fill(Infinity);
  const f = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const h = (x: number, y: number) => {
    const dx = Math.max(0, Math.abs(x - to[0]) - range);
    const dy = Math.max(0, Math.abs(y - to[1]) - range);
    return Math.max(dx, dy) + (DIAGONAL_COST - 1) * Math.min(dx, dy);
  };

  const start = from[1] * w + from[0];
  g[start] = 0;
  f[start] = h(from[0], from[1]);
  const open = new Heap(f);
  open.push(start);
  let expanded = 0;

  while (open.size > 0) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w, cy = (cur / w) | 0;
    if (reached(cx, cy)) {
      const out: Cell[] = [];
      for (let n = cur; n !== -1; n = parent[n]) out.push([n % w, (n / w) | 0]);
      return out.reverse();
    }
    if (++expanded > maxNodes) return null;
    for (const [dx, dy] of STEPS) {
      const nx = cx + dx, ny = cy + dy;
      if (!grid.walkable(nx, ny)) continue;
      const diagonal = dx !== 0 && dy !== 0;
      if (diagonal && (!grid.walkable(cx + dx, cy) || !grid.walkable(cx, cy + dy))) continue;
      const n = ny * w + nx;
      if (closed[n]) continue;
      const cost = g[cur] + (diagonal ? DIAGONAL_COST : 1);
      if (cost < g[n]) {
        g[n] = cost;
        f[n] = cost + h(nx, ny);
        parent[n] = cur;
        open.push(n);
      }
    }
  }
  return null;
}
