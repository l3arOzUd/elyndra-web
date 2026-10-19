// Builds public/data from the region design files.
//
//   npm run build:content            all regions in REGIONS
//
// Output is the runtime content; edit content/, not public/data.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Constants, DropDef, ItemDef, MapDef, MapLayout, MonsterDef, NpcDef, RegionDef, ShopDef, SpawnZoneDef, WarpDef,
} from "../src/data/schema";
import { SCHEMA_VERSION } from "../src/data/schema";
import { bakeLayout } from "./layout";
import {
  AGGRO_RADIUS, BOSS_DROP, DROP, ELITE_DROP_MULT, LEASH_RADIUS, materialPrice, monsterStats, playerAt, rarePrice, regionPriceMult, tierLevelFor, uncommonPrice,
} from "./model";
import { UNIQUE_DROPS, gearItems, systems } from "./systems";
import { REGIONS } from "./regions/index";
import { skills } from "./skills";
import type { RegionDesign } from "./types";

const PUBLIC_DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

function warpsFor(regions: RegionDesign[]): WarpDef[] {
  const out: WarpDef[] = [];
  let n = 1;
  const id = () => `warp_${String(n++).padStart(4, "0")}`;
  for (const r of regions) for (const l of r.links) {
    const ab = id(), ba = id();
    out.push({ id: ab, from_map: l.a.map, to_map: l.b.map, trigger_rect: l.a.trigger, spawn_point: l.b.landing, pair_id: ba, requirements: l.requirements ?? [], label: l.label });
    out.push({ id: ba, from_map: l.b.map, to_map: l.a.map, trigger_rect: l.b.trigger, spawn_point: l.a.landing, pair_id: ab, requirements: [], label: l.label });
  }
  return out;
}

function dropsFor(m: RegionDesign["monsters"][number]): DropDef[] {
  const boss = m.archetype === "boss";
  const elite = m.archetype === "elite";
  const rate = (base: number, bossRate: number) => (boss ? bossRate : elite ? Math.min(10000, base * ELITE_DROP_MULT) : base);
  const qty: [number, number] = boss ? [3, 6] : elite ? [1, 3] : [1, 1];
  const drops: DropDef[] = [
    { item_id: m.drops.common, rate_bp: rate(DROP.common, BOSS_DROP.common), min_qty: qty[0], max_qty: qty[1] },
    { item_id: m.drops.uncommon, rate_bp: rate(DROP.uncommon, BOSS_DROP.uncommon), min_qty: 1, max_qty: boss ? 3 : 1 },
  ];
  if (m.drops.rare) drops.push({ item_id: m.drops.rare, rate_bp: rate(DROP.rare, BOSS_DROP.rare), min_qty: 1, max_qty: 1 });
  for (const e of m.drops.extra ?? []) drops.push({ item_id: e.item_id, rate_bp: e.rate_bp, min_qty: e.qty?.[0] ?? 1, max_qty: e.qty?.[1] ?? 1 });
  return drops;
}

/** Client sprite bindings: real art where it exists, tinted stand-ins elsewhere. */
const ELEMENT_TINT: Record<string, [number, number, number]> = {
  earth: [1.1, 0.95, 0.7], nature: [0.8, 1.1, 0.75], wind: [0.9, 1.05, 1.15], water: [0.7, 0.95, 1.25], fire: [1.3, 0.75, 0.55],
  ice: [0.85, 1.05, 1.35], shadow: [0.75, 0.6, 1.05],
};

/**
 * Generated gear bases borrow the hand-drawn Wayfarer looks until they get
 * their own art: entries marked "generated" are rewritten on every build;
 * hand-made entries are never touched. Heads have no art yet (no layers).
 */
function writePaperDollLooks(gear: ItemDef[], path: string) {
  if (!existsSync(path)) return;
  const file = JSON.parse(readFileSync(path, "utf8")) as { items: Record<string, { generated?: boolean }> };
  for (const [id, look] of Object.entries(file.items)) if (look.generated) delete file.items[id];
  const weapon: Record<string, string> = { vanguard: "copper_saber", strider: "surveyor_bow", arcanist: "aether_rod", machinist: "copper_saber" };
  for (const g of gear) {
    const e = g.equip;
    if (!e || file.items[g.id] || !["weapon", "armor", "boots", "head"].includes(e.slot)) continue;
    const [visual, layers] = e.slot === "weapon" ? [weapon[e.job ?? "vanguard"], ["weapon"]]
      : e.slot === "armor" ? ["leafweave_coat", ["torso", "arm_near", "arm_far", "cape"]]
      : e.slot === "boots" ? ["traveler_boots", ["shin_near", "shin_far"]] : ["none", []];
    file.items[g.id] = { name: g.name, slot: e.slot, visual, layers, generated: true } as { generated: boolean };
  }
  writeFileSync(path, JSON.stringify(file, null, 1));
}

/** Writes the runtime JSON for `regions` into `OUT` (and the sprite index beside it). */
export function buildContent(regions: RegionDesign[], OUT: string, spriteIndexPath = join(OUT, "..", "sprites", "index.json")) {
  mkdirSync(OUT, { recursive: true });
  rmSync(join(OUT, "maps"), { recursive: true, force: true });
  mkdirSync(join(OUT, "maps"), { recursive: true });
  for (const f of readdirSync(OUT)) if (f.endsWith(".json")) rmSync(join(OUT, f));

  const warps = warpsFor(regions);
  const regionDefs: RegionDef[] = [];
  const maps: MapDef[] = [];
  const monsters: MonsterDef[] = [];
  const items: ItemDef[] = [];
  const npcs: NpcDef[] = [];
  const shops: ShopDef[] = [];
  const zones: SpawnZoneDef[] = [];
  const spriteIndex: Record<string, { sprite: string; tint?: [number, number, number]; scale?: number; placeholder?: boolean }> = {};

  for (const r of regions) {
    regionDefs.push(r.region);
    for (const d of r.maps) {
      // Keep scattered props off warp triggers, landings and NPCs.
      const clear: [number, number, number][] = [];
      for (const w of warps) {
        if (w.from_map === d.id) clear.push([w.trigger_rect[0] + (w.trigger_rect[2] >> 1), w.trigger_rect[1] + (w.trigger_rect[3] >> 1), 5]);
        if (w.to_map === d.id) clear.push([w.spawn_point[0], w.spawn_point[1], 3]);
      }
      for (const n of d.npcs) clear.push([n.position[0], n.position[1], 2]);
      clear.push([d.arrival[0], d.arrival[1], 2]);
      const layout: MapLayout = bakeLayout(d, clear);
      writeFileSync(join(OUT, "maps", `${d.id}.json`), JSON.stringify(layout));
      maps.push({
        id: d.id, region_id: r.region.id, name: d.name, type: d.type, role: d.role,
        recommended_level_min: d.levels[0], recommended_level_max: d.levels[1],
        width_cells: d.size[0], height_cells: d.size[1], safe_zone: d.type === "town",
        layout: `maps/${d.id}.json`, arrival: d.arrival, horde: d.horde ?? null,
      });
      for (const n of d.npcs) npcs.push({ ...n, map_id: d.id });
      if (d.type !== "town") zones.push({ map_id: d.id, instance_rules: d.horde ?? { min_alive: 0, max_alive: 0 }, pockets: d.pockets });
    }
    for (const m of r.monsters) {
      const s = monsterStats(m.level, m.archetype, m.mods);
      monsters.push({
        id: m.id, name: m.name, region_id: r.region.id, level: m.level, archetype: m.archetype, family: m.family, element: m.element,
        behavior: m.behavior, ...s, aggro_radius: AGGRO_RADIUS[m.behavior], leash_radius: LEASH_RADIUS,
        drops: dropsFor(m), ecology: m.ecology, art_brief: m.art_brief, sprite: m.sprite ?? m.id,
      });
      spriteIndex[m.id] = m.sprite
        ? { sprite: m.sprite }
        : { sprite: "mosskin", tint: ELEMENT_TINT[m.element] ?? [0.8, 0.8, 0.8], scale: m.archetype === "boss" ? 2.4 : m.archetype === "elite" ? 1.6 : m.archetype === "bruiser" || m.archetype === "construct" ? 1.25 : 1, placeholder: true };
    }
    for (const mat of r.materials) {
      const price = mat.tier === "common" ? materialPrice(mat.level) : mat.tier === "uncommon" ? uncommonPrice(mat.level) : rarePrice(mat.level);
      items.push({ id: mat.id, name: mat.name, category: mat.tier === "rare" ? "rare_material" : "material", rarity: mat.tier, sell_price: price, stack_max: 999, description: mat.description });
    }
    items.push(...r.items);
    const mult = regionPriceMult(r.region.level_range[0]);
    for (const s of r.shops) shops.push({ id: s.id, npc_id: s.npc_id, items: s.items.map((i) => ({ item_id: i.item_id, price: Math.round(i.base_price * mult) })) });
  }
  // CHARACTER_SYSTEMS.md: generated gear bases, uniques from bosses, and
  // every town merchant stocks the Reset Scroll and plain gear of its tier.
  const gear = gearItems();
  items.push(...gear);
  const byName = new Map(gear.map((g) => [g.name, g]));
  for (const u of UNIQUE_DROPS) {
    const boss = monsters.find((m) => m.name === u.boss), it = byName.get(u.item);
    if (!boss || !it) throw new Error(`unique drop ${u.item} from ${u.boss}: unknown boss or item`);
    boss.drops.push({ item_id: it.id, rate_bp: u.rate_bp, min_qty: 1, max_qty: 1 });
  }
  const merchants = new Set(npcs.filter((n) => n.role === "merchant").map((n) => n.id));
  for (const r of regions) {
    const tier = tierLevelFor(r.region.level_range[0]), mult = regionPriceMult(r.region.level_range[0]);
    const stock = gear.filter((g) => g.name === "Reset Scroll" || (g.equip && g.equip.slot !== "charm" && g.equip.item_level === tier && !g.equip.unique && (!g.equip.kind || !g.equip.kind.includes("_"))));
    for (const s of shops) {
      if (!merchants.has(s.npc_id) || !r.shops.some((rs) => rs.id === s.id)) continue;
      for (const g of stock) if (!s.items.some((i) => i.item_id === g.id)) s.items.push({ item_id: g.id, price: Math.round(g.sell_price * 3 * (g.name === "Reset Scroll" ? 1 : mult)) });
    }
  }
  const sys = systems();
  for (const job of ["vanguard", "strider", "arcanist", "machinist"]) {
    const w = gear.find((g) => g.equip?.slot === "weapon" && g.equip.job === job && g.equip.item_level === 1);
    if (w) sys.starter_weapons[job] = w.id;
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  monsters.sort((a, b) => a.id.localeCompare(b.id));

  const constants: Constants = {
    schema_version: SCHEMA_VERSION, drop_rate_denominator: 10000, server_tick_ms: 50, snapshot_ms: 100, coordinates: "grid_cells",
    player_base_ms_per_cell: 150, pickup_radius_cells: 3, npc_interact_radius_cells: 4, loot_expire_sec: 90,
    respawn_town_by_region: Object.fromEntries(regions.map((r) => [r.region.id, r.region.town_map_id])),
  };
  const write = (name: string, value: unknown) => writeFileSync(join(OUT, `${name}.json`), JSON.stringify(value, null, 1));
  write("constants", constants);
  write("regions", regionDefs);
  write("maps", maps);
  write("monsters", monsters);
  write("items", items);
  write("npcs", npcs);
  write("shops", shops);
  write("recipes", regions.flatMap((r) => r.recipes));
  write("quests", regions.flatMap((r) => r.quests));
  write("spawn_zones", zones);
  write("warps", warps);
  write("dialogues", regions.flatMap((r) => r.dialogues));
  write("skills", skills);
  write("player_curve", Array.from({ length: 99 }, (_, i) => playerAt(i + 1)));
  write("systems", sys);
  writePaperDollLooks(gear, join(dirname(spriteIndexPath), "wayfarer", "equipment.json"));
  mkdirSync(dirname(spriteIndexPath), { recursive: true });
  writeFileSync(spriteIndexPath, JSON.stringify({
    player: { sprite: "wayfarer" }, monsters: spriteIndex, fallback: { sprite: "mosskin", tint: [0.75, 0.75, 0.8], placeholder: true },
  }, null, 1));
  return `build:content — ${regions.length} regions, ${maps.length} maps, ${monsters.length} monsters, ${items.length} items, ${warps.length} warps, ${npcs.length} npcs`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(buildContent(REGIONS, PUBLIC_DATA));
