// The validator must catch each class of problem the seed data had. Each
// test copies the built content, breaks one thing, and checks the rule
// fires with the right severity and exit code.

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "public", "data");
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

interface Finding { severity: string; rule: string; where: string; message: string }

function run(dir: string): { code: number; findings: Finding[] } {
  try {
    const out = execFileSync(process.execPath, [TSX, join(ROOT, "scripts", "validate-data.ts"), "--json", "--data", dir], { encoding: "utf8", maxBuffer: 64 << 20 });
    return { code: 0, findings: JSON.parse(out).findings };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, findings: JSON.parse(err.stdout).findings };
  }
}

function mutate(edit: (read: (f: string) => any, write: (f: string, v: unknown) => void) => void) {
  const dir = mkdtempSync(join(tmpdir(), "elyndra-val-"));
  cpSync(DATA, dir, { recursive: true });
  const read = (f: string) => JSON.parse(readFileSync(join(dir, `${f}.json`), "utf8"));
  const write = (f: string, v: unknown) => writeFileSync(join(dir, `${f}.json`), JSON.stringify(v));
  edit(read, write);
  return run(dir);
}

const has = (r: { findings: Finding[] }, rule: string, severity?: string) =>
  r.findings.some((f) => f.rule === rule && (!severity || f.severity === severity));

describe("validate:data", { timeout: 60000 }, () => {
  it("passes the shipped content with exit 0", () => {
    const r = run(DATA);
    expect(r.findings.filter((f) => f.severity !== "warning")).toEqual([]);
    expect(r.code).toBe(0);
  });

  it("overlapping warp triggers on one map are critical (exit 2)", () => {
    const r = mutate((read, write) => {
      const w = read("warps");
      const out = w.filter((x: any) => x.from_map === "lum_fld_01");
      out[1].trigger_rect = out[0].trigger_rect;
      write("warps", w);
    });
    expect(has(r, "warp.overlap", "critical")).toBe(true);
    expect(r.code).toBe(2);
  });

  it("the seed's one-rect-for-every-warp pattern is flagged", () => {
    const r = mutate((read, write) => {
      const w = read("warps");
      for (const x of w) { x.trigger_rect = [120, 60, 4, 8]; x.spawn_point = [8, 64]; }
      write("warps", w);
    });
    expect(has(r, "anomaly.warp_copy")).toBe(true);
    expect(has(r, "warp.overlap", "critical")).toBe(true);
  });

  it("a monster far outside the map's level band is an error", () => {
    const r = mutate((read, write) => {
      const z = read("spawn_zones");
      z.find((x: any) => x.map_id === "lum_fld_01").pockets[0].species.push({ monster_id: "mob_0011", weight: 1 });
      write("spawn_zones", z);
    });
    expect(has(r, "spawn.level", "error")).toBe(true);
    expect(r.code).toBe(1);
  });

  it("a monster that never spawns (the seed's Rotroot/Barkwarden) is an error", () => {
    const r = mutate((read, write) => {
      const z = read("spawn_zones");
      for (const zone of z) for (const p of zone.pockets) p.species = p.species.filter((s: any) => s.monster_id !== "mob_0010");
      for (const zone of z) zone.pockets = zone.pockets.filter((p: any) => p.species.length);
      write("spawn_zones", z);
    });
    expect(has(r, "monster.unused")).toBe(true);
  });

  it("rejects a species on a second home map even when its level fits", () => {
    const r = mutate((read, write) => {
      const zones = read("spawn_zones");
      zones.find((z: any) => z.map_id === "lum_fld_02").pockets[0].species.push({ monster_id: "mob_0007", weight: 1 }); // Dustwing Lv9 fits Lv11-20 within the tolerance
      write("spawn_zones", zones);
    });
    expect(has(r, "spawn.one_map", "error")).toBe(true);
    expect(has(r, "spawn.level")).toBe(false);
    expect(r.code).toBe(1);
  });

  it("an item with no drop, shop, quest or recipe is an error", () => {
    const r = mutate((read, write) => {
      const items = read("items");
      items.push({ id: "itm_0999", name: "Orphan Gear", category: "material", rarity: "common", sell_price: 1, stack_max: 999, description: "" });
      write("items", items);
    });
    expect(r.findings.some((f) => f.rule === "item.unobtainable" && f.where === "itm_0999")).toBe(true);
  });

  it("NPCs on a wall, or all in one row like the seed, are errors", () => {
    const wall = mutate((read, write) => {
      const n = read("npcs");
      n.find((x: any) => x.id === "npc_lum_merchant").position = [0, 0];
      write("npcs", n);
    });
    expect(has(wall, "npc.position")).toBe(true);
    const row = mutate((read, write) => {
      const n = read("npcs");
      n.forEach((x: any, i: number) => { x.position = [30 + i, 42]; });
      write("npcs", n);
    });
    expect(has(row, "anomaly.npc_row")).toBe(true);
  });

  it("copied stats and one speed for every monster are flagged", () => {
    const r = mutate((read, write) => {
      const m = read("monsters");
      const a = m.find((x: any) => x.id === "mob_0001"), b = m.find((x: any) => x.id === "mob_0002");
      Object.assign(b, { hp: a.hp, attack: a.attack, defense: a.defense });
      for (const x of m) x.move_speed_ms = 220;
      write("monsters", m);
    });
    expect(has(r, "anomaly.stat_copy")).toBe(true);
    expect(has(r, "anomaly.flat_speed")).toBe(true);
  });

  it("a monster too tough for its level is a balance error", () => {
    const r = mutate((read, write) => {
      const m = read("monsters");
      m.find((x: any) => x.id === "mob_0001").hp *= 6;
      write("monsters", m);
    });
    expect(r.findings.some((f) => f.rule === "balance.ttk" && f.where === "mob_0001")).toBe(true);
  });

  it("buying below the sell price is critical (arbitrage)", () => {
    const r = mutate((read, write) => {
      const s = read("shops");
      s[0].items[0].price = 1;
      const items = read("items");
      items.find((x: any) => x.id === s[0].items[0].item_id).sell_price = 30;
      write("shops", s);
      write("items", items);
    });
    expect(has(r, "economy.arbitrage", "critical")).toBe(true);
  });

  it("dangling references and duplicate ids are critical", () => {
    const r = mutate((read, write) => {
      const m = read("monsters");
      m[0].drops.push({ item_id: "itm_9999", rate_bp: 100, min_qty: 1, max_qty: 1 });
      m.push({ ...m[1] });
      write("monsters", m);
    });
    expect(has(r, "ref.dangling", "critical")).toBe(true);
    expect(has(r, "id.duplicate", "critical")).toBe(true);
    expect(r.code).toBe(2);
  });

  it("a landing inside the return trigger would bounce the player: critical", () => {
    const r = mutate((read, write) => {
      const w = read("warps");
      const a = w.find((x: any) => x.id === "warp_0001");
      const back = w.find((x: any) => x.id === a.pair_id);
      a.spawn_point = [back.trigger_rect[0] + 1, back.trigger_rect[1] + 1];
      write("warps", w);
    });
    expect(has(r, "warp.loop", "critical")).toBe(true);
  });
});
