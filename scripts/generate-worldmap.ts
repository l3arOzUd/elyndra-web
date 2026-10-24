// Writes WORLD_MAP.html (workspace root): an atlas of every region, town,
// field and dungeon, laid out from the real warps (an exit on a map's east
// edge puts the next map to its east), with the transit line between towns,
// and each map's monsters, NPCs, quests and exits. Built from public/data, so
// it always shows the world the game runs.
//
//   npm run worldmap

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MapDef, MonsterDef, NpcDef, QuestDef, RegionDef, SpawnZoneDef, WarpDef } from "../src/data/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const OUT = join(ROOT, "..", "WORLD_MAP.html");
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), "utf8"));

const regions = read<RegionDef[]>("regions.json");
const maps = read<MapDef[]>("maps.json");
const monsters = read<MonsterDef[]>("monsters.json");
const npcs = read<NpcDef[]>("npcs.json");
const quests = read<QuestDef[]>("quests.json");
const zones = read<SpawnZoneDef[]>("spawn_zones.json");
const warps = read<WarpDef[]>("warps.json");
const sprites = JSON.parse(readFileSync(join(ROOT, "public", "sprites", "index.json"), "utf8")) as { monsters: Record<string, { placeholder?: boolean }> };

const mapById = new Map(maps.map((m) => [m.id, m]));
const mob = new Map(monsters.map((m) => [m.id, m]));
type Dir = "E" | "W" | "N" | "S";
const STEP: Record<Dir, [number, number]> = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };

/** Which edge of `from` a warp sits on: the dominant direction from the map centre to the trigger. */
function edgeOf(w: WarpDef): Dir {
  const m = mapById.get(w.from_map)!;
  const [x, y, ww, hh] = w.trigger_rect;
  const dx = (x + ww / 2) / m.width_cells - 0.5;
  const dy = (y + hh / 2) / m.height_cells - 0.5;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N";
}

// --- layout: grid positions from Avelorn, following the warps ---------------------------

const pos = new Map<string, [number, number]>();
{
  // World v3: one walk from Avelorn over every warp; dungeons sit above the field they open from.
  const hub = regions[0].town_map_id;
  pos.set(hub, [0, 0]);
  const taken = new Set(["0,0"]);
  const queue = [hub];
  while (queue.length) {
    const a = queue.shift()!;
    const [ax, ay] = pos.get(a)!;
    for (const w of warps.filter((x) => x.from_map === a)) {
      if (pos.has(w.to_map)) continue;
      const [sx, sy] = STEP[mapById.get(w.to_map)!.type === "dungeon" ? "N" : edgeOf(w)];
      const tries: [number, number][] = [[ax + sx, ay + sy], [ax + 2 * sx, ay + 2 * sy], [ax + sx + sy, ay + sy + sx], [ax + sx - sy, ay + sy - sx]];
      const spot = tries.find(([x, y]) => !taken.has(`${x},${y}`)) ?? [ax + 3 * sx, ay + 3 * sy];
      pos.set(w.to_map, spot);
      taken.add(`${spot[0]},${spot[1]}`);
      queue.push(w.to_map);
    }
  }
  let y = 2;
  for (const m of maps) if (!pos.has(m.id)) { pos.set(m.id, [0, y++]); }
  // Shift so the top-left map is at 0,0.
  const minX = Math.min(...[...pos.values()].map((p) => p[0])), minY = Math.min(...[...pos.values()].map((p) => p[1]));
  for (const [id, [x, yy]] of pos) pos.set(id, [x - minX, yy - minY]);
}

// --- per-map facts ----------------------------------------------------------------------

const ROLE_TH: Record<string, string> = { guild_registrar: "กิลด์", merchant: "ร้านค้า", healer: "หมอ", teleporter: "ส่งตัว", craftsman: "คราฟต์", guard: "ยาม", scout: "หน่วยสำรวจ" };
const DIR_TH: Record<Dir, string> = { E: "ตะวันออก", W: "ตะวันตก", N: "เหนือ", S: "ใต้" };
const world = {
  generated: new Date().toISOString().slice(0, 10),
  regions: regions.map((r) => ({ id: r.id, name: r.name, capital: r.capital, lv: r.level_range, color: r.palette.accent, theme: r.theme })),
  maps: maps.map((m) => {
    const [x, y] = pos.get(m.id)!;
    const z = zones.find((q) => q.map_id === m.id);
    const count = new Map<string, number>();
    for (const p of z?.pockets ?? []) {
      const tw = p.species.reduce((a, s) => a + s.weight, 0);
      for (const s of p.species) count.set(s.monster_id, (count.get(s.monster_id) ?? 0) + (p.target_alive * s.weight) / tw);
    }
    const ns = npcs.filter((n) => n.map_id === m.id);
    return {
      id: m.id, region: m.region_id, name: m.name, type: m.type, role: m.role, lv: m.type === "town" ? null : [m.recommended_level_min, m.recommended_level_max],
      x, y,
      monsters: [...count.entries()].sort((a, b) => mob.get(a[0])!.level - mob.get(b[0])!.level).map(([id, n]) => {
        const mm = mob.get(id)!;
        return { name: mm.name, lv: mm.level, kind: mm.archetype, ai: mm.behavior, n: Math.round(n), art: !!sprites.monsters[id] && !sprites.monsters[id].placeholder };
      }),
      npcs: [...new Set(ns.map((n) => ROLE_TH[n.role] ?? n.role))],
      quests: quests.filter((q) => ns.some((n) => n.id === q.giver_npc_id)).map((q) => q.title),
      exits: warps.filter((w) => w.from_map === m.id).map((w) => ({ to: w.to_map, name: mapById.get(w.to_map)!.name, edge: DIR_TH[edgeOf(w)], needs: w.requirements.length > 0 })),
    };
  }),
  walks: warps.filter((w) => w.from_map < w.to_map).map((w) => [w.from_map, w.to_map]),
  transit: [] as [string, string, number][],
};
for (const n of npcs.filter((x) => x.role === "teleporter" && mapById.get(x.map_id)?.type === "town")) {
  for (const [to, cost] of n.destinations ?? []) {
    if (mapById.get(to)?.type === "town" && mapById.get(to)!.region_id !== mapById.get(n.map_id)!.region_id && n.map_id < to) world.transit.push([n.map_id, to, cost]);
  }
}

const html = readFileSync(join(ROOT, "scripts", "worldmap.template.html"), "utf8").replace("/*__WORLD__*/null", JSON.stringify(world));
writeFileSync(OUT, html);
writeFileSync(join(ROOT, 'public', 'world-map.html'), html);
console.log(`world map: ${OUT} · ${world.maps.length} maps, ${world.walks.length} walking links, ${world.transit.length} transit links`);
