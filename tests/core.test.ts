import { describe, expect, it } from "vitest";
import { DIRS, headingOf, viewDir } from "../src/shared/dir";
import { pathTimes, samplePath, type Cell } from "../src/shared/path";
import { Animator } from "../src/render/animator";
import { resolveFacing, validateSprite, type SpriteDefJson } from "../src/render/spriteDef";
import { WalkGrid } from "../src/world/grid";
import { findPath, lineFree, smoothPath } from "../src/world/pathfinding";

describe("directions", () => {
  it("headings follow the compass, clockwise from north", () => {
    expect(viewDir(headingOf(0, -1), 0)).toBe("N");
    expect(viewDir(headingOf(1, 0), 0)).toBe("E");
    expect(viewDir(headingOf(0, 1), 0)).toBe("S");
    expect(viewDir(headingOf(-1, -1), 0)).toBe("NW");
  });

  it("turning the camera turns what the viewer sees", () => {
    // Camera swung round to the east side (yaw +90deg): an entity walking
    // east now walks straight at the viewer.
    expect(viewDir(headingOf(1, 0), Math.PI / 2)).toBe("S");
    // ...and one walking north is seen from its right, walking screen-left.
    expect(viewDir(headingOf(0, -1), Math.PI / 2)).toBe("E");
    for (let i = 0; i < 8; i++) expect(viewDir((i * Math.PI) / 4, 0)).toBe(DIRS[i]);
  });
});

describe("facing resolution", () => {
  it("two-facing art uses one row and mirrors only eastward movement", () => {
    const art: Pick<SpriteDefJson, "rows" | "facingMode"> = { rows: ["W"], facingMode: "left-right" };
    for (const dir of ["E", "NE", "SE"] as const) expect(resolveFacing(art, dir)).toEqual({ row: 0, flip: true });
    for (const dir of ["W", "NW", "SW", "N", "S"] as const) expect(resolveFacing(art, dir)).toEqual({ row: 0, flip: false });
    const def: SpriteDefJson = { ...art, id: "two-facing", frame: { w: 384, h: 384 }, pivot: { x: 192, y: 346 }, pixelsPerCell: 300, animations: { idle: { file: "idle.png", frames: 16, fps: 8 } } };
    expect(validateSprite(def, { idle: { width: 6144, height: 384 } })).toEqual([]);
    expect(validateSprite(def, { idle: { width: 384, height: 384 } }).join()).toMatch(/frames need/);
  });
  const fiveDir: Pick<SpriteDefJson, "rows" | "mirror"> = { rows: ["S", "SW", "W", "NW", "N"], mirror: { NE: "NW", E: "W", SE: "SW" } };
  it("uses a facing's own row", () => {
    expect(resolveFacing(fiveDir, "W")).toEqual({ row: 2, flip: false });
  });
  it("mirrors the three missing facings", () => {
    expect(resolveFacing(fiveDir, "E")).toEqual({ row: 2, flip: true });
    expect(resolveFacing(fiveDir, "SE")).toEqual({ row: 1, flip: true });
    expect(resolveFacing(fiveDir, "NE")).toEqual({ row: 3, flip: true });
  });
  it("falls back to the nearest drawn facing", () => {
    expect(resolveFacing({ rows: ["S"] }, "SE")).toEqual({ row: 0, flip: false });
  });
  it("validation catches a sheet too small for its frames", () => {
    const json: SpriteDefJson = {
      id: "x", frame: { w: 128, h: 128 }, pivot: { x: 64, y: 110 }, pixelsPerCell: 90, rows: ["S"],
      animations: { idle: { file: "a.png", frames: 8, fps: 8 } },
    };
    expect(validateSprite(json, { idle: { width: 640, height: 128 } }).join()).toMatch(/640px wide/);
  });
});

describe("paths", () => {
  it("diagonals take longer, and sampling walks the timeline", () => {
    const cells: Cell[] = [[0, 0], [1, 0], [2, 1]];
    const times = pathTimes(cells, 100);
    expect(times[1]).toBe(100);
    expect(times[2]).toBeCloseTo(100 + 100 * Math.SQRT2);
    const mid = samplePath(cells, times, 50);
    expect(mid.x).toBeCloseTo(0.5);
    expect(mid.done).toBe(false);
    expect(samplePath(cells, times, 1000)).toMatchObject({ x: 2, y: 1, done: true });
  });

  it("A* goes round walls and does not cut corners", () => {
    const g = new WalkGrid(5, 5);
    for (let y = 0; y < 4; y++) g.set(2, y, 0);
    const p = findPath(g, [0, 0], [4, 0])!;
    expect(p[0]).toEqual([0, 0]);
    expect(p.at(-1)).toEqual([4, 0]);
    expect(p.some(([x, y]) => x === 2 && y === 4)).toBe(true);
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i];
      if (ax !== bx && ay !== by) expect(g.walkable(bx, ay) && g.walkable(ax, by)).toBe(true);
    }
  });

  it("A* with a range stops next to the goal", () => {
    const g = new WalkGrid(10, 10);
    const p = findPath(g, [0, 0], [6, 0], { range: 1 })!;
    expect(p.at(-1)).toEqual([5, 0]);
  });

  it("a smoothed walk in the open is one straight line", () => {
    const g = new WalkGrid(64, 64);
    for (const to of [[42, 33], [40, 36], [26, 44], [20, 22]] as [number, number][]) {
      expect(smoothPath(g, findPath(g, [30, 30], to)!)).toEqual([[30, 30], to]);
    }
  });

  it("a smoothed walk keeps every leg clear of walls", () => {
    const g = new WalkGrid(40, 40);
    for (let y = 5; y <= 30; y++) g.set(20, y, 0);
    const p = smoothPath(g, findPath(g, [10, 20], [30, 18])!);
    expect(p.length).toBeGreaterThan(2);
    expect(p.at(-1)).toEqual([30, 18]);
    for (let i = 1; i < p.length; i++) expect(lineFree(g, p[i - 1], p[i])).toBe(true);
  });

});

describe("animator", () => {
  const anims = {
    idle: { file: "", frames: 4, fps: 10, loop: true },
    walk: { file: "", frames: 8, fps: 10, loop: true },
    attack: { file: "", frames: 6, fps: 10, events: { hit: 3 } },
    hit: { file: "", frames: 3, fps: 10 },
    death: { file: "", frames: 5, fps: 10, hold: true },
  };

  it("fires the hit event on its frame, then returns to the base loop", () => {
    const a = new Animator(anims);
    const events: string[] = [];
    let done = false;
    a.play("attack", { onEvent: (e) => events.push(e), onDone: () => { done = true; } });
    a.update(250);
    expect(events).toEqual([]);
    a.update(100);
    expect(events).toEqual(["hit"]);
    a.update(300);
    expect(done).toBe(true);
    expect(a.current).toBe("idle");
  });

  it("a flinch does not cut off a swing", () => {
    const a = new Animator(anims);
    a.play("attack");
    expect(a.play("hit")).toBe(false);
    expect(a.current).toBe("attack");
  });

  it("death cuts off a swing but its blow still lands", () => {
    const a = new Animator(anims);
    const events: string[] = [];
    a.play("attack", { onEvent: (e) => events.push(e) });
    a.update(100);
    a.play("death");
    expect(events).toEqual(["hit"]);
    a.update(2000);
    expect(a.update(16)).toMatchObject({ anim: "death", frame: 4 });
    a.setBase("walk");
    expect(a.current).toBe("death");
  });

  it("speeds an attack up to fit the attack motion", () => {
    const a = new Animator(anims);
    let done = false;
    a.play("attack", { durationMs: 300, onDone: () => { done = true; } });
    a.update(310);
    expect(done).toBe(true);
  });

  it("an attack with no art still lands", () => {
    const a = new Animator({ idle: anims.idle });
    const events: string[] = [];
    a.play("attack", { onEvent: (e) => events.push(e) });
    expect(events).toEqual(["hit"]);
  });
});
