import { headingOf } from "./dir";

export type Cell = [number, number];

/** A diagonal step takes this much longer than a straight one. */
export const DIAGONAL_COST = Math.SQRT2;

/** When an entity reaches each cell of its path, in ms from the start. */
export function pathTimes(cells: Cell[], msPerCell: number): number[] {
  const times = [0];
  for (let i = 1; i < cells.length; i++) {
    const diagonal = cells[i][0] !== cells[i - 1][0] && cells[i][1] !== cells[i - 1][1];
    times.push(times[i - 1] + msPerCell * (diagonal ? DIAGONAL_COST : 1));
  }
  return times;
}

export interface PathSample {
  /** Continuous position in cells. */
  x: number;
  y: number;
  heading: number;
  /** The segment walked: from cells[segment] to cells[segment + 1]. */
  segment: number;
  /** How far along that segment, 0..1. */
  frac: number;
  done: boolean;
}

/**
 * Where an entity is `elapsed` ms after it started down `cells`. Both the
 * server and the client sample the same timeline, so they agree on where
 * everything is without streaming positions.
 */
export function samplePath(cells: Cell[], times: number[], elapsed: number): PathSample {
  const last = cells.length - 1;
  const lastHeading = last > 0 ? headingOf(cells[last][0] - cells[last - 1][0], cells[last][1] - cells[last - 1][1]) : 0;
  if (last <= 0 || elapsed >= times[last]) {
    return { x: cells[last][0], y: cells[last][1], heading: lastHeading, segment: Math.max(0, last - 1), frac: 1, done: true };
  }
  let i = 0;
  while (i < last - 1 && elapsed >= times[i + 1]) i++;
  const frac = Math.max(0, (elapsed - times[i]) / (times[i + 1] - times[i]));
  const [ax, ay] = cells[i];
  const [bx, by] = cells[i + 1];
  return {
    x: ax + (bx - ax) * frac,
    y: ay + (by - ay) * frac,
    heading: headingOf(bx - ax, by - ay),
    segment: i,
    frac,
    done: false,
  };
}

export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}
