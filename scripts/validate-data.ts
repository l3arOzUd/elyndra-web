// ELYNDRA content validator.
//
//   npm run validate:data            report; exit 2 on critical, 1 on error
//   npm run validate:data -- --strict   warnings also fail (exit 1)
//   npm run validate:data -- --json     machine-readable report on stdout
//
// It reads only the built JSON under public/data, never the design sources,
// so a bug in the content builder is caught here rather than trusted.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATA_FILES, SCHEMA_VERSION, decodeWalk,
  type ContentBundle, type MapLayout, type Rect,
} from "../src/data/schema";
import { BOUNTY } from "../content/model";

type Severity = "critical" | "error" | "warning";
interface Finding { severity: Severity; rule: string; where: string; message: string }

const dataArg = process.argv.indexOf("--data");
const ROOT = dataArg > 0 ? process.argv[dataArg + 1] : join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const findings: Finding[] = [];
const report = (severity: Severity, rule: string, where: string, message: string) => findings.push({ severity, rule, where, message });

// --- loading -----------------------------------------------------------------

function load(): ContentBundle | null {
  const raw: Record<string, unknown> = {};
  for (const f of DATA_FILES) {
    const path = join(ROOT, `${f}.json`);
    if (!existsSync(path)) { report("critical", "file.missing", `${f}.json`, "file not found"); continue; }
    try { raw[f] = JSON.parse(readFileSync(path, "utf8")); }
    catch (e) { report("critical", "file.parse", `${f}.json`, (e as Error).message); }
  }
  if (findings.some((f) => f.severity === "critical")) return null;
  const bundle = { ...raw, layouts: new Map<string, MapLayout>() } as unknown as ContentBundle;
  for (const m of bundle.maps) {
    const path = join(ROOT, m.layout);
    if (!existsSync(path)) { report("critical", "layout.missing", m.id, `${m.layout} not found`); continue; }
    try { bundle.layouts.set(m.id, JSON.parse(readFileSync(path, "utf8"))); }
    catch (e) { report("critical", "layout.parse", m.id, (e as Error).message); }
  }
  return bundle;
}

// --- helpers -----------------------------------------------------------------

/** CHARACTER_SYSTEMS.md §2.6: share of a hit of `damage` that `armour` stops. */
const armourCut = (armour: number, damage: number) => Math.min(0.9, armour / (armour + 5 * Math.max(1, damage)));

const rectsOverlap = (a: Rect, b: Rect, pad = 0) =>
  a[0] - pad < b[0] + b[2] && b[0] - pad < a[0] + a[2] && a[1] - pad < b[1] + b[3] && b[1] - pad < a[1] + a[3];
/** Where arrivals, warp landings and NPCs belong: safe areas (towns) and field camps. */
const restAreas = (l: { safe_areas: Rect[]; camps?: Rect[] }) => [...l.safe_areas, ...(l.camps ?? [])];
const inRect = (x: number, y: number, r: Rect, pad = 0) => x >= r[0] - pad && y >= r[1] - pad && x < r[0] + r[2] + pad && y < r[1] + r[3] + pad;

class Grid {
  readonly cells: Uint8Array;
  private comp: Int32Array | null = null;
  constructor(readonly w: number, readonly h: number, rle: number[]) {
    this.cells = decodeWalk(rle, w * h);
  }
  walk(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.cells[y * this.w + x] === 1; }
  /** Connected walkable regions (8-way, no corner cutting), labelled. */
  component(x: number, y: number): number {
    if (!this.comp) {
      const comp = new Int32Array(this.w * this.h).fill(-1);
      let label = 0;
      const stack: number[] = [];
      for (let i = 0; i < comp.length; i++) {
        if (this.cells[i] !== 1 || comp[i] !== -1) continue;
        comp[i] = label;
        stack.push(i);
        while (stack.length) {
          const c = stack.pop()!;
          const cx = c % this.w, cy = (c / this.w) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = cx + dx, ny = cy + dy;
            if (!this.walk(nx, ny)) continue;
            if (dx && dy && (!this.walk(cx + dx, cy) || !this.walk(cx, cy + dy))) continue;
            const n = ny * this.w + nx;
            if (comp[n] === -1) { comp[n] = label; stack.push(n); }
          }
        }
        label++;
      }
      this.comp = comp;
    }
    return this.walk(x, y) ? this.comp[y * this.w + x] : -1;
  }
  walkableIn(r: Rect): number {
    let n = 0;
    for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) if (this.walk(x, y)) n++;
    return n;
  }
  /** The component most of a rect's walkable cells belong to. */
  mainComponentIn(r: Rect): number {
    const count = new Map<number, number>();
    for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) {
      const c = this.component(x, y);
      if (c >= 0) count.set(c, (count.get(c) ?? 0) + 1);
    }
    let best = -1, n = 0;
    for (const [c, k] of count) if (k > n) { best = c; n = k; }
    return best;
  }
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : 0;
}

// --- checks ------------------------------------------------------------------

function checkIds(b: ContentBundle) {
  const collections: [string, { id: string }[], RegExp][] = [
    ["regions", b.regions, /^[a-z]{3}$/],
    ["maps", b.maps, /^[a-z]{3}_(town|fld|dun)_\d{2}$/],
    ["monsters", b.monsters, /^mob_\d{4}$/],
    ["items", b.items, /^itm_\d{4}$/],
    ["npcs", b.npcs, /^npc_[a-z]{3}_[a-z_]+$/],
    ["shops", b.shops, /^shop_[a-z_]+$/],
    ["recipes", b.recipes, /^rcp_[a-z0-9_]+$/],
    ["quests", b.quests, /^q_[a-z]{3}_[a-z0-9_]+$/],
    ["warps", b.warps, /^warp_\d{4}$/],
    ["dialogues", b.dialogues, /^dlg_[a-z_]+$/],
    ["skills", b.skills, /^[a-z_]+$/],
  ];
  const all = new Map<string, string>();
  for (const [name, list, pattern] of collections) {
    const seen = new Set<string>();
    for (const x of list) {
      if (seen.has(x.id)) report("critical", "id.duplicate", `${name}/${x.id}`, "duplicate id");
      seen.add(x.id);
      if (!pattern.test(x.id)) report("error", "id.format", `${name}/${x.id}`, `id does not match ${pattern}`);
      const other = all.get(x.id);
      if (other && other !== name) report("error", "id.collision", x.id, `used by both ${other} and ${name}`);
      all.set(x.id, name);
    }
  }
  const pocketIds = new Set<string>();
  for (const z of b.spawn_zones) for (const p of z.pockets) {
    const key = `${z.map_id}/${p.id}`;
    if (pocketIds.has(key)) report("critical", "id.duplicate", `spawn_zones/${key}`, "duplicate pocket id");
    pocketIds.add(key);
  }
  if (b.constants.schema_version !== SCHEMA_VERSION) report("critical", "schema.version", "constants.json", `schema_version ${b.constants.schema_version}, validator expects ${SCHEMA_VERSION}`);
}

function checkReferences(b: ContentBundle) {
  const has = <T extends { id: string }>(list: T[]) => { const s = new Set(list.map((x) => x.id)); return (id: string | null | undefined) => !!id && s.has(id); };
  const map = has(b.maps), mob = has(b.monsters), item = has(b.items), npc = has(b.npcs), shop = has(b.shops), quest = has(b.quests), warp = has(b.warps), dlg = has(b.dialogues), region = has(b.regions);
  const ref = (ok: boolean, where: string, what: string) => { if (!ok) report("critical", "ref.dangling", where, `unknown ${what}`); };
  for (const r of b.regions) { ref(map(r.town_map_id), `regions/${r.id}`, `town ${r.town_map_id}`); ref(map(r.dungeon_map_id), `regions/${r.id}`, `dungeon ${r.dungeon_map_id}`); }
  for (const [rid, town] of Object.entries(b.constants.respawn_town_by_region)) { ref(region(rid), "constants", `region ${rid}`); ref(map(town), "constants", `town ${town}`); }
  for (const m of b.maps) ref(region(m.region_id), `maps/${m.id}`, `region ${m.region_id}`);
  for (const m of b.monsters) {
    ref(region(m.region_id), `monsters/${m.id}`, `region ${m.region_id}`);
    for (const d of m.drops) ref(item(d.item_id), `monsters/${m.id}`, `drop ${d.item_id}`);
  }
  for (const n of b.npcs) {
    ref(map(n.map_id), `npcs/${n.id}`, `map ${n.map_id}`);
    ref(dlg(n.dialogue_id), `npcs/${n.id}`, `dialogue ${n.dialogue_id}`);
    if (n.shop_id !== null) ref(shop(n.shop_id), `npcs/${n.id}`, `shop ${n.shop_id}`);
    for (const [dest] of n.destinations ?? []) ref(map(dest), `npcs/${n.id}`, `destination ${dest}`);
  }
  for (const s of b.shops) { ref(npc(s.npc_id), `shops/${s.id}`, `npc ${s.npc_id}`); for (const i of s.items) ref(item(i.item_id), `shops/${s.id}`, `item ${i.item_id}`); }
  for (const r of b.recipes) {
    ref(npc(r.npc_id), `recipes/${r.id}`, `npc ${r.npc_id}`);
    ref(item(r.output.item_id), `recipes/${r.id}`, `output ${r.output.item_id}`);
    for (const i of r.inputs) ref(item(i.item_id), `recipes/${r.id}`, `input ${i.item_id}`);
  }
  for (const q of b.quests) {
    ref(region(q.region_id), `quests/${q.id}`, `region ${q.region_id}`);
    ref(npc(q.giver_npc_id), `quests/${q.id}`, `giver ${q.giver_npc_id}`);
    ref(npc(q.turn_in_npc_id), `quests/${q.id}`, `turn-in ${q.turn_in_npc_id}`);
    if (q.prerequisite) ref(quest(q.prerequisite), `quests/${q.id}`, `prerequisite ${q.prerequisite}`);
    for (const o of q.objectives) {
      if (o.type === "kill") ref(mob(o.monster_id), `quests/${q.id}`, `monster ${o.monster_id}`);
      if (o.type === "collect") ref(item(o.item_id), `quests/${q.id}`, `item ${o.item_id}`);
      if (o.type === "visit") ref(map(o.map_id), `quests/${q.id}`, `map ${o.map_id}`);
    }
    for (const i of q.rewards.items) ref(item(i.item_id), `quests/${q.id}`, `reward ${i.item_id}`);
  }
  for (const z of b.spawn_zones) {
    ref(map(z.map_id), `spawn_zones/${z.map_id}`, `map ${z.map_id}`);
    for (const p of z.pockets) for (const s of p.species) ref(mob(s.monster_id), `spawn_zones/${z.map_id}/${p.id}`, `monster ${s.monster_id}`);
  }
  for (const w of b.warps) {
    ref(map(w.from_map), `warps/${w.id}`, `from ${w.from_map}`);
    ref(map(w.to_map), `warps/${w.id}`, `to ${w.to_map}`);
    ref(warp(w.pair_id), `warps/${w.id}`, `pair ${w.pair_id}`);
    for (const r of w.requirements) {
      const [kind, value] = r.split(":");
      if (kind === "item") ref(item(value), `warps/${w.id}`, `required item ${value}`);
      else if (kind === "level") { if (!(Number(value) >= 1)) report("error", "warp.requirement", `warps/${w.id}`, `bad level requirement ${r}`); }
      else if (kind === "quest") ref(quest(value), `warps/${w.id}`, `required quest ${value}`);
      else report("error", "warp.requirement", `warps/${w.id}`, `unknown requirement ${r}`);
    }
  }
  for (const d of b.dialogues) ref(npc(d.npc_id), `dialogues/${d.id}`, `npc ${d.npc_id}`);
}

function grids(b: ContentBundle): Map<string, Grid> {
  const out = new Map<string, Grid>();
  for (const m of b.maps) {
    const l = b.layouts.get(m.id);
    if (!l) continue;
    if (l.width !== m.width_cells || l.height !== m.height_cells) report("critical", "layout.size", m.id, `layout ${l.width}x${l.height} vs map ${m.width_cells}x${m.height_cells}`);
    const total = l.walk_rle.reduce((s, v, i) => (i % 2 ? s + v : s), 0);
    if (total !== l.width * l.height) { report("critical", "layout.walk", m.id, `walk grid has ${total} cells, expected ${l.width * l.height}`); continue; }
    const g = new Grid(l.width, l.height, l.walk_rle);
    out.set(m.id, g);
    const walkable = g.cells.reduce((s, v) => s + v, 0) / g.cells.length;
    if (walkable < 0.2) report("error", "layout.walkable", m.id, `only ${(walkable * 100).toFixed(0)}% walkable`);
    if (walkable > 0.95) report("warning", "layout.walkable", m.id, `${(walkable * 100).toFixed(0)}% walkable: no obstacles to shape movement`);
    if (l.landmarks.length === 0) report("warning", "layout.landmarks", m.id, "no landmarks");
  }
  return out;
}

function checkWarps(b: ContentBundle, g: Map<string, Grid>) {
  const byId = new Map(b.warps.map((w) => [w.id, w]));
  const byMap = new Map<string, typeof b.warps>();
  for (const w of b.warps) byMap.set(w.from_map, [...(byMap.get(w.from_map) ?? []), w]);

  for (const w of b.warps) {
    const where = `warps/${w.id}`;
    const pair = byId.get(w.pair_id);
    if (pair && (pair.pair_id !== w.id || pair.from_map !== w.to_map || pair.to_map !== w.from_map))
      report("critical", "warp.pair", where, `pair ${w.pair_id} does not lead back (${pair.from_map}->${pair.to_map}, pair ${pair.pair_id})`);
    const from = g.get(w.from_map), to = g.get(w.to_map);
    const [x, y, ww, hh] = w.trigger_rect;
    if (from) {
      if (x < 0 || y < 0 || x + ww > from.w || y + hh > from.h) report("critical", "warp.bounds", where, `trigger ${JSON.stringify(w.trigger_rect)} outside ${w.from_map}`);
      if (from.walkableIn(w.trigger_rect) === 0) report("critical", "warp.unreachable", where, "no walkable cell inside the trigger");
    }
    if (to) {
      const [sx, sy] = w.spawn_point;
      if (!to.walk(sx, sy)) report("critical", "warp.landing", where, `spawn point [${sx},${sy}] on ${w.to_map} is not walkable`);
      for (const back of byMap.get(w.to_map) ?? []) {
        if (inRect(sx, sy, back.trigger_rect)) report("critical", "warp.loop", where, `lands inside ${back.id}'s trigger on ${w.to_map}`);
        else if (inRect(sx, sy, back.trigger_rect, 6)) report("error", "warp.landing_close", where, `lands closer than 7 cells to ${back.id}'s trigger`);
      }
      const dest = b.maps.find((m) => m.id === w.to_map);
      const destLayout = b.layouts.get(w.to_map);
      if (dest && destLayout && !dest.safe_zone && !restAreas(destLayout).some((r) => inRect(sx, sy, r)))
        report("error", "warp.landing_unsafe", where, `lands outside any safe area or camp on ${w.to_map}`);
    }
  }
  for (const [mapId, list] of byMap) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], c = list[j];
      if (rectsOverlap(a.trigger_rect, c.trigger_rect)) report("critical", "warp.overlap", mapId, `${a.id} (->${a.to_map}) and ${c.id} (->${c.to_map}) triggers overlap`);
      else if (rectsOverlap(a.trigger_rect, c.trigger_rect, 3)) report("error", "warp.crowded", mapId, `${a.id} and ${c.id} triggers within 3 cells`);
    }
    // Every exit must be reachable from every landing on the same map.
    const grid = g.get(mapId);
    if (!grid) continue;
    const landings = b.warps.filter((w) => w.to_map === mapId).map((w) => w.spawn_point);
    for (const w of list) {
      const comp = grid.mainComponentIn(w.trigger_rect);
      for (const [sx, sy] of landings) {
        if (grid.component(sx, sy) !== comp) report("critical", "warp.disconnected", mapId, `exit ${w.id} cannot be walked to from landing [${sx},${sy}]`);
      }
    }
  }
  // Each region's maps must be reachable from its town.
  for (const r of b.regions) {
    const seen = new Set([r.town_map_id]);
    const queue = [r.town_map_id];
    while (queue.length) {
      const m = queue.shift()!;
      for (const w of byMap.get(m) ?? []) if (!seen.has(w.to_map)) { seen.add(w.to_map); queue.push(w.to_map); }
    }
    for (const m of b.maps.filter((x) => x.region_id === r.id)) if (!seen.has(m.id)) report("critical", "world.unreachable", m.id, `cannot be reached by warps from ${r.town_map_id}`);
  }
  // Regions must connect to each other in level order.
  const sorted = [...b.regions].sort((a, c) => a.level_range[0] - c.level_range[0]);
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Set(b.maps.filter((m) => m.region_id === sorted[i - 1].id).map((m) => m.id));
    const cur = new Set(b.maps.filter((m) => m.region_id === sorted[i].id).map((m) => m.id));
    const linked = b.warps.some((w) => prev.has(w.from_map) && cur.has(w.to_map)) ||
      b.npcs.some((n) => prev.has(n.map_id) && (n.destinations ?? []).some(([d]) => cur.has(d)));
    if (!linked) report("error", "world.region_link", sorted[i].id, `no warp or transit from ${sorted[i - 1].id}`);
  }
  const allSame = new Set(b.warps.map((w) => w.trigger_rect.join())).size;
  if (b.warps.length > 4 && allSame <= Math.ceil(b.warps.length / 10)) report("error", "anomaly.warp_copy", "warps", `${b.warps.length} warps use only ${allSame} distinct trigger rects`);
}

function checkSpawns(b: ContentBundle, g: Map<string, Grid>) {
  const mobs = new Map(b.monsters.map((m) => [m.id, m]));
  const warpsFrom = (id: string) => b.warps.filter((w) => w.from_map === id);
  const zoneFor = new Map(b.spawn_zones.map((z) => [z.map_id, z]));
  const spawned = new Set<string>();
  const homeMaps = new Map<string, Set<string>>(); // monster -> maps it spawns on
  const rectUse = new Map<string, Set<string>>();

  for (const m of b.maps) {
    const z = zoneFor.get(m.id);
    if (m.type === "town") {
      if (z && z.pockets.length) report("error", "spawn.town", m.id, "town has monster pockets");
      if (m.horde) report("error", "spawn.town", m.id, "town has horde rules");
      continue;
    }
    if (!z || z.pockets.length === 0) { report("error", "spawn.missing", m.id, `${m.type} has no spawn pockets`); continue; }
    if (!m.horde) report("error", "spawn.horde_rules", m.id, "spawning map without horde rules");
    const total = z.pockets.reduce((s, p) => s + p.target_alive, 0);
    const rules = z.instance_rules;
    if (m.horde && (rules.min_alive !== m.horde.min_alive || rules.max_alive !== m.horde.max_alive)) report("error", "spawn.horde_rules", m.id, "instance_rules differ from maps.json horde");
    if (total < rules.min_alive || total > rules.max_alive) report("error", "spawn.population", m.id, `pockets total ${total}, rules ${rules.min_alive}-${rules.max_alive}`);
    // World v3: one 256x256 field holds what four old fields did (WORLD_V3_PLAN.md).
    if (m.type === "field" && (rules.min_alive < 400 || rules.max_alive > 900)) report("error", "spawn.horde_band", m.id, `field rules ${rules.min_alive}-${rules.max_alive} outside the v3 band 400-900`);
    if (m.type === "dungeon" && (total < 50 || total > 150)) report("warning", "spawn.horde_band", m.id, `dungeon population ${total}`);

    const grid = g.get(m.id);
    const layout = b.layouts.get(m.id);
    // Pockets on the same rects (a zone's species, each with its own count) share the ground.
    const sharing = new Map<string, number>();
    for (const p of z.pockets) sharing.set(JSON.stringify(p.rects), (sharing.get(JSON.stringify(p.rects)) ?? 0) + p.target_alive);
    for (const p of z.pockets) {
      const where = `${m.id}/${p.id}`;
      if (p.species.length === 0) report("critical", "spawn.empty", where, "pocket has no species");
      if (p.respawn_sec[0] > p.respawn_sec[1] || p.respawn_sec[0] < 1) report("error", "spawn.respawn", where, `respawn ${p.respawn_sec}`);
      let walkable = 0, area = 0;
      for (const r of p.rects) {
        rectUse.set(r.join(), (rectUse.get(r.join()) ?? new Set()).add(m.id));
        area += r[2] * r[3];
        if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > m.width_cells || r[1] + r[3] > m.height_cells) report("error", "spawn.bounds", where, `rect ${r} outside map`);
        if (grid) walkable += grid.walkableIn(r);
        for (const s of layout ? restAreas(layout) : []) if (rectsOverlap(r, s)) report("error", "spawn.safe_overlap", where, `rect ${r} overlaps safe area or camp ${s}`);
        for (const w of warpsFrom(m.id)) if (rectsOverlap(r, w.trigger_rect, 6)) report("error", "spawn.warp_overlap", where, `rect ${r} within 6 cells of ${w.id}`);
      }
      if (area && walkable / area < 0.55) report("error", "spawn.blocked", where, `only ${((walkable / area) * 100).toFixed(0)}% of the pocket is walkable`);
      const perMob = walkable / Math.max(1, sharing.get(JSON.stringify(p.rects)) ?? p.target_alive);
      if (perMob < 5) report("error", "spawn.density", where, `${perMob.toFixed(1)} walkable cells per monster: too crowded to move`);
      const lone = p.species.every((s) => ["boss", "elite"].includes(mobs.get(s.monster_id)?.archetype ?? ""));
      if (perMob > 60 && !lone) report("warning", "spawn.density", where, `${perMob.toFixed(1)} cells per monster: too sparse for a horde`);
      for (const s of p.species) {
        spawned.add(s.monster_id);
        if (!homeMaps.has(s.monster_id)) homeMaps.set(s.monster_id, new Set());
        homeMaps.get(s.monster_id)!.add(m.id);
        const mob = mobs.get(s.monster_id);
        if (!mob) continue;
        if (s.weight <= 0) report("error", "spawn.weight", where, `${s.monster_id} weight ${s.weight}`);
        const lo = m.recommended_level_min, hi = m.recommended_level_max;
        const tolerance = mob.archetype === "boss" || mob.archetype === "elite" ? 4 : 2;
        if (mob.level < lo - tolerance || mob.level > hi + tolerance)
          report("error", "spawn.level", where, `${mob.name} Lv${mob.level} on a Lv${lo}-${hi} map`);
      }
    }
  }
  for (const mob of b.monsters) if (!spawned.has(mob.id)) report("error", "monster.unused", mob.id, `${mob.name} never spawns`);
  // One home map per species: each map has its own monsters, and no monster
  // is repeated across maps.
  for (const [id, maps] of homeMaps)
    if (maps.size > 1) report("error", "spawn.one_map", id, `${mobs.get(id)?.name ?? id} spawns on ${maps.size} maps: ${[...maps].join(", ")}`);
  for (const [rect, maps] of rectUse) if (maps.size > 2) report("error", "anomaly.spawn_copy", "spawn_zones", `rect [${rect}] reused on ${maps.size} maps`);
}

function checkNpcs(b: ContentBundle, g: Map<string, Grid>) {
  const maps = new Map(b.maps.map((m) => [m.id, m]));
  const required = ["guild_registrar", "merchant", "healer", "teleporter", "craftsman"] as const;
  for (const r of b.regions) {
    const roles = new Set(b.npcs.filter((n) => n.map_id === r.town_map_id).map((n) => n.role));
    for (const role of required) if (!roles.has(role)) report("error", "npc.town_roles", r.town_map_id, `town has no ${role}`);
  }
  const offsets = new Map<string, string[]>();
  for (const n of b.npcs) {
    const m = maps.get(n.map_id);
    const grid = g.get(n.map_id);
    const layout = b.layouts.get(n.map_id);
    const [x, y] = n.position;
    if (!m || !grid) continue;
    if (!grid.walk(x, y)) report("error", "npc.position", n.id, `[${x},${y}] is not walkable`);
    if (m.type !== "town" && !["guard", "scout", "teleporter", "healer"].includes(n.role)) report("warning", "npc.placement", n.id, `${n.role} outside a town`);
    if (!(layout ? restAreas(layout) : []).some((s) => inRect(x, y, s)) && !m.safe_zone) report("error", "npc.unsafe", n.id, "not inside a safe area or camp");
    for (const o of b.npcs) if (o !== n && o.map_id === n.map_id && Math.max(Math.abs(o.position[0] - x), Math.abs(o.position[1] - y)) < 2 && o.id > n.id)
      report("error", "npc.crowded", n.id, `stands within 1 cell of ${o.id}`);
    for (const w of b.warps.filter((w) => w.from_map === n.map_id)) if (inRect(x, y, w.trigger_rect, 2)) report("error", "npc.warp", n.id, `stands on/next to ${w.id}`);
    const town = b.regions.find((r) => r.town_map_id === n.map_id);
    if (town) {
      const sameRegion = b.npcs.filter((o) => o.map_id === n.map_id).sort((a, c) => a.role.localeCompare(c.role));
      const base = sameRegion[0].position;
      offsets.set(n.map_id, sameRegion.map((o) => `${o.position[0] - base[0]},${o.position[1] - base[1]}`));
    }
  }
  const patterns = new Map<string, number>();
  for (const v of offsets.values()) patterns.set(v.join("|"), (patterns.get(v.join("|")) ?? 0) + 1);
  for (const [p, n] of patterns) if (n > 2) report("error", "anomaly.npc_copy", "npcs", `${n} towns place NPCs in the identical pattern ${p}`);
  const ys = new Set(b.npcs.map((n) => n.position[1]));
  if (b.npcs.length > 10 && ys.size === 1) report("error", "anomaly.npc_row", "npcs", "every NPC stands on the same row");
  for (const n of b.npcs.filter((n) => n.role === "teleporter")) {
    const region = maps.get(n.map_id)?.region_id;
    for (const [dest, cost] of n.destinations ?? []) {
      if (cost < 0) report("error", "npc.teleport_cost", n.id, `negative cost to ${dest}`);
      const d = maps.get(dest);
    }
    if (!(n.destinations ?? []).length) report("error", "npc.teleport_empty", n.id, "teleporter with no destinations");
  }
  for (const n of b.npcs) {
    const shop = b.shops.find((s) => s.npc_id === n.id);
    if (n.role === "merchant" && !shop) report("error", "npc.shop", n.id, "merchant without a shop");
    if (n.shop_id && shop && shop.id !== n.shop_id) report("error", "npc.shop", n.id, `shop_id ${n.shop_id} but ${shop.id} names this npc`);
  }
}

function checkItems(b: ContentBundle) {
  const sources = new Map<string, string[]>();
  const add = (id: string, src: string) => sources.set(id, [...(sources.get(id) ?? []), src]);
  const spawnedMobs = new Set(b.spawn_zones.flatMap((z) => z.pockets.flatMap((p) => p.species.map((s) => s.monster_id))));
  for (const m of b.monsters) for (const d of m.drops) {
    if (spawnedMobs.has(m.id)) add(d.item_id, `drop:${m.id}`);
    if (d.rate_bp < 1 || d.rate_bp > 10000) report("error", "drop.rate", m.id, `${d.item_id} rate ${d.rate_bp}`);
    if (d.min_qty < 1 || d.min_qty > d.max_qty) report("error", "drop.qty", m.id, `${d.item_id} qty ${d.min_qty}-${d.max_qty}`);
  }
  const prices = new Map<string, number>();
  for (const s of b.shops) for (const i of s.items) { add(i.item_id, `shop:${s.id}`); prices.set(i.item_id, Math.min(prices.get(i.item_id) ?? Infinity, i.price)); }
  for (const q of b.quests) for (const i of q.rewards.items) add(i.item_id, `quest:${q.id}`);
  for (const r of b.recipes) add(r.output.item_id, `recipe:${r.id}`);
  for (const it of b.items) if (it.drop_pool) add(it.id, "gear-pool");

  const items = new Map(b.items.map((i) => [i.id, i]));
  for (const it of b.items) {
    const src = sources.get(it.id) ?? [];
    if (src.length === 0) report("error", "item.unobtainable", it.id, `${it.name} has no drop, shop, quest or recipe`);
    if (it.category === "consumable" && !it.use) report("error", "item.use", it.id, "consumable with no effect");
    const gear = it.category === "equipment" || it.category === "charm" || it.category === "totem";
    if (gear && !it.equip) report("error", "item.equip", it.id, `${it.category} with no equip block`);
    if (gear && it.stack_max !== 1) report("error", "item.stack", it.id, `${it.category} must not stack`);
    if (it.category === "charm" && it.equip && (it.equip.slot !== "charm" || (!it.equip.charm && !it.equip.unique))) report("error", "item.charm", it.id, "charm must use the charm slot and name a charm type or unique");
    if (it.category === "totem" && it.equip && (it.equip.slot !== "charm" || !it.equip.totem)) report("error", "item.totem", it.id, "totem must use the charm slot and name a totem type");
    if (it.equip && it.equip.slot === "weapon" && !(it.equip.attack! > 0)) report("error", "item.weapon", it.id, "weapon with no ATK");
    if (it.sell_price < 0) report("error", "item.price", it.id, "negative sell price");
    const buy = prices.get(it.id);
    if (buy !== undefined && buy < it.sell_price) report("critical", "economy.arbitrage", it.id, `bought for ${buy}, sold for ${it.sell_price}`);
  }
  for (const r of b.recipes) {
    const out = items.get(r.output.item_id);
    const inputValue = r.inputs.reduce((s, i) => s + (items.get(i.item_id)?.sell_price ?? 0) * i.qty, 0) + r.currency;
    if (out && out.sell_price * r.output.qty > inputValue) report("error", "economy.recipe_profit", r.id, `output sells for ${out.sell_price * r.output.qty}, inputs worth ${inputValue}`);
  }
  // World v3: every common/uncommon material is an input to some recipe (WORLD_GDD_v3 §5.2).
  const used = new Set(b.recipes.flatMap((r) => r.inputs.map((i) => i.item_id)));
  for (const it of b.items) if (it.category === "material" && !used.has(it.id)) report("error", "economy.material_unused", it.id, `${it.name} is in no recipe`);
  // Same name, different id.
  const names = new Map<string, string>();
  for (const it of b.items) { if (names.has(it.name)) report("error", "item.name_duplicate", it.id, `same name as ${names.get(it.name)}`); names.set(it.name, it.id); }
  const prices30 = b.items.filter((i) => i.category !== "material").map((i) => i.sell_price);
  if (prices30.length > 5 && new Set(prices30).size === 1) report("error", "anomaly.flat_price", "items", `all ${prices30.length} non-material items sell for ${prices30[0]}`);
}

function checkQuests(b: ContentBundle) {
  const mobs = new Map(b.monsters.map((m) => [m.id, m]));
  const npcs = new Map(b.npcs.map((n) => [n.id, n]));
  const maps = new Map(b.maps.map((m) => [m.id, m]));
  const spawnMaps = new Map<string, Set<string>>();
  for (const z of b.spawn_zones) for (const p of z.pockets) for (const s of p.species) spawnMaps.set(s.monster_id, (spawnMaps.get(s.monster_id) ?? new Set()).add(z.map_id));
  const byId = new Map(b.quests.map((q) => [q.id, q]));
  for (const q of b.quests) {
    const where = `quests/${q.id}`;
    if (q.objectives.length === 0) report("error", "quest.objectives", where, "no objectives");
    for (const o of q.objectives) {
      if (o.count < 1) report("error", "quest.count", where, `objective count ${o.count}`);
      if (o.type === "kill") {
        const mob = mobs.get(o.monster_id);
        const where2 = spawnMaps.get(o.monster_id);
        if (!where2) report("error", "quest.impossible", where, `${o.monster_id} never spawns`);
        if (mob && mob.level > q.min_level + 8) report("warning", "quest.level", where, `${mob.name} Lv${mob.level} for a Lv${q.min_level} quest`);
      }
      // A quest handed out in a field or dungeon asks for drops found there:
      // with one map per species, a drop from another map means a trip away.
      const giverMap = maps.get(npcs.get(q.giver_npc_id)?.map_id ?? "");
      if (o.type === "collect" && giverMap && giverMap.type !== "town") {
        const droppers = b.monsters.filter((m) => m.drops.some((d) => d.item_id === o.item_id));
        if (droppers.length && !droppers.some((m) => spawnMaps.get(m.id)?.has(giverMap.id)))
          report("error", "quest.collect_offmap", where, `${o.item_id} drops only from ${droppers.map((m) => m.name).join(", ")}, none of which spawn on ${giverMap.name}`);
      }
    }
    const giver = npcs.get(q.giver_npc_id);
    // Prerequisite chains must not loop.
    const seen = new Set<string>();
    for (let cur: string | null = q.id; cur; cur = byId.get(cur)?.prerequisite ?? null) {
      if (seen.has(cur)) { report("critical", "quest.cycle", where, "prerequisite chain loops"); break; }
      seen.add(cur);
    }
  }
}

/** Balance: every monster checked against the player curve it was meant for. */
function checkBalance(b: ContentBundle) {
  const curve = new Map(b.player_curve.map((r) => [r.level, r]));
  const band: Record<string, { hits: [number, number]; dmg: [number, number] }> = {
    swarm: { hits: [2, 5], dmg: [0.005, 0.03] },
    ranged: { hits: [1.5, 4.5], dmg: [0.01, 0.04] },
    support: { hits: [2, 6], dmg: [0.004, 0.025] },
    bruiser: { hits: [4, 11], dmg: [0.02, 0.06] },
    construct: { hits: [4, 11], dmg: [0.015, 0.05] },
    elite: { hits: [10, 30], dmg: [0.04, 0.1] },
    boss: { hits: [50, 220], dmg: [0.04, 0.18] }, // solo with potions (elyndra-server balance_jobs_test.go)
  };
  const expPerHp: number[] = [];
  for (const m of b.monsters) {
    const p = curve.get(m.level);
    if (!p) { report("error", "balance.curve", m.id, `no player curve row for Lv${m.level}`); continue; }
    const perHit = p.ref_attack * (1 - armourCut(m.defense, p.ref_attack));
    const hits = m.hp / perHit;
    const dmg = (m.attack * (1 - armourCut(p.ref_armour, m.attack))) / p.max_hp;
    const bnd = band[m.archetype];
    if (!bnd) { report("error", "balance.archetype", m.id, `unknown archetype ${m.archetype}`); continue; }
    const hitBand = m.bounty ? bnd.hits.map((h) => h * BOUNTY.hp) : bnd.hits;
    if (hits < hitBand[0] || hits > hitBand[1]) report("error", "balance.ttk", m.id, `${m.name} (${m.archetype}) takes ${hits.toFixed(1)} basic hits at Lv${m.level}; band ${hitBand.join("-")}`);
    if (dmg < bnd.dmg[0] || dmg > bnd.dmg[1]) report("error", "balance.damage", m.id, `${m.name} hits for ${(dmg * 100).toFixed(1)}% of a Lv${m.level} player's HP; band ${bnd.dmg.map((x) => x * 100).join("-")}%`);
    if (armourCut(m.defense, p.ref_attack) >= 0.85) report("critical", "balance.immune", m.id, `${m.name} Armour ${m.defense} stops 85%+ of a reference hit (${p.ref_attack})`);
    if (m.attack_ms < 600 || m.attack_ms > 4000) report("error", "balance.attack_speed", m.id, `attack every ${m.attack_ms}ms`);
    if (m.move_speed_ms < 120 || m.move_speed_ms > 600) report("error", "balance.move_speed", m.id, `${m.move_speed_ms}ms per cell`);
    if (m.leash_radius < m.aggro_radius) report("error", "balance.leash", m.id, "leash shorter than aggro radius");
    if (m.behavior === "passive" && m.aggro_radius !== 0) report("warning", "balance.aggro", m.id, "passive monster with an aggro radius");
    expPerHp.push(m.base_exp / (m.hp / perHit));
  }
  // Effort to level: basic hits on this monster needed for one level at its
  // level. Swarm should sit near the median; tougher archetypes may pay a
  // little better per hit, never 2.5x better or 2.5x worse.
  const effort = b.monsters.map((m) => {
    const p = curve.get(m.level);
    if (!p || !p.exp_to_next) return NaN;
    const hits = m.hp / (p.ref_attack * (1 - armourCut(m.defense, p.ref_attack)));
    return (p.exp_to_next / m.base_exp) * hits;
  });
  // Compared with monsters within 3 levels: leveling is meant to slow down
  // as you climb, so a Lv1 and a Lv17 monster are not peers.
  b.monsters.forEach((m, i) => {
    if (Number.isNaN(effort[i])) return;
    const peers = b.monsters.map((o, j) => (Math.abs(o.level - m.level) <= 3 && !Number.isNaN(effort[j]) ? effort[j] : NaN)).filter((x) => !Number.isNaN(x));
    if (peers.length < 3) return;
    const r = effort[i] / median(peers);
    if (r > 2.5 || r < 0.4) report("warning", "balance.exp", m.id, `${m.name}: ${Math.round(effort[i])} hits per level, ${r.toFixed(2)}x its level peers`);
  });
  // Time to level: kills of the map's main monster per level.
  for (const row of b.player_curve) {
    if (row.level >= 99) continue;
    const next = curve.get(row.level + 1);
    // Lv99 is the cap: its exp_to_next is 0 by definition.
    if (next && (next.max_hp < row.max_hp || next.attack < row.attack || (next.level < 99 && next.exp_to_next < row.exp_to_next * 0.98)))
      report("error", "balance.curve_monotonic", `player_curve/${row.level}`, "player curve is not monotonic");
  }
  // Stat tuples copied between monsters.
  const tuples = new Map<string, string>();
  for (const m of b.monsters) {
    const key = [m.hp, m.attack, m.defense].join("/");
    if (tuples.has(key)) report("error", "anomaly.stat_copy", m.id, `same HP/ATK/DEF as ${tuples.get(key)}`);
    tuples.set(key, m.id);
  }
  const speeds = new Set(b.monsters.map((m) => m.move_speed_ms));
  if (b.monsters.length > 10 && speeds.size === 1) report("error", "anomaly.flat_speed", "monsters", "every monster moves at the same speed");
  // Monsters within an archetype and region should get tougher with level.
  for (const r of b.regions) {
    const list = b.monsters.filter((m) => m.region_id === r.id && m.archetype === "swarm" && !m.bounty).sort((a, c) => a.level - c.level);
    for (let i = 1; i < list.length; i++) if (list[i].level > list[i - 1].level && list[i].hp < list[i - 1].hp * 0.9)
      report("warning", "balance.progression", list[i].id, `${list[i].name} Lv${list[i].level} has less HP than ${list[i - 1].name} Lv${list[i - 1].level}`);
  }
}

function checkMaps(b: ContentBundle) {
  const regions = new Map(b.regions.map((r) => [r.id, r]));
  const sizes = new Set(b.maps.filter((m) => m.type === "field").map((m) => `${m.width_cells}x${m.height_cells}`));
  if (b.maps.filter((m) => m.type === "field").length > 10 && sizes.size === 1) report("warning", "anomaly.flat_size", "maps", "every field is the same size");
  for (const m of b.maps) {
    const r = regions.get(m.region_id);
    if (m.recommended_level_min > m.recommended_level_max) report("error", "map.levels", m.id, "min level above max");
    if (r && m.type !== "town" && (m.recommended_level_min < r.level_range[0] - 2 || m.recommended_level_max > r.level_range[1] + 2))
      report("error", "map.region_levels", m.id, `Lv${m.recommended_level_min}-${m.recommended_level_max} outside ${r.name} ${r.level_range.join("-")}`);
    if (m.type === "town" && !m.safe_zone) report("error", "map.town_safe", m.id, "town is not a safe zone");
    const lm = b.layouts.get(m.id);
    if (m.type !== "town" && lm && !restAreas(lm).length) report("warning", "map.no_camp", m.id, "no camp to land in");
    const l = b.layouts.get(m.id);
    if (l) {
      const [ax, ay] = m.arrival;
      const grid = new Grid(l.width, l.height, l.walk_rle);
      if (!grid.walk(ax, ay)) report("critical", "map.arrival", m.id, `arrival [${ax},${ay}] is not walkable`);
      if (!m.safe_zone && !restAreas(l).some((r) => inRect(ax, ay, r))) report("error", "map.arrival_safe", m.id, "arrival is not inside a safe area or camp");
    }
    if (!b.npcs.some((n) => n.map_id === m.id)) report("error", "map.no_npc", m.id, `${m.type} has no NPC`);
  }
  // World v3: regions are biomes sharing one town; fields mix monsters of several
  // regions on purpose, so a region's town and dungeon may sit in another region.
  for (const r of b.regions) {
    if (!b.maps.some((m) => m.id === r.town_map_id && m.type === "town")) report("error", "region.town", r.id, "town_map_id is not a town");
    if (!b.maps.some((m) => m.id === r.dungeon_map_id && m.type === "dungeon")) report("error", "region.dungeon", r.id, "dungeon_map_id is not a dungeon");
  }
}

/** CHARACTER_SYSTEMS.md: affix tiers, caps, charms, totems and gear bases. */
function checkSystems(b: ContentBundle) {
  const sys = b.systems;
  const items = new Map(b.items.map((i) => [i.id, i]));
  const tiers = sys.drops.tier_min_level.length;
  const known = new Set([...sys.affixes, ...sys.totem_affixes].map((a) => a.id).concat(Object.keys(sys.labels)));
  for (const a of sys.affixes) {
    if (a.values.length !== tiers) report("error", "systems.affix_tiers", a.id, `${a.values.length} tiers, expected ${tiers}`);
    if (a.values.some((v, i) => i > 0 && v < a.values[i - 1])) report("error", "systems.affix_order", a.id, "tier values must not decrease");
    if (!a.label.includes("{v}")) report("error", "systems.affix_label", a.id, "label has no {v}");
  }
  for (const [k, [normal, max]] of Object.entries(sys.rules.caps)) if (normal > max) report("error", "systems.cap", k, `normal cap ${normal} above its maximum ${max}`);
  for (const r of sys.relic_caps) {
    const cap = sys.rules.caps[r.id.replace("cap_", "").replace(/^res_.*/, "res")];
    if (!cap) report("error", "systems.relic", r.id, "no matching cap");
    else if (r.values.some((v) => v <= cap[0] || v > cap[1])) report("error", "systems.relic", r.id, `grades ${r.values.join("/")} outside ${cap[0]}-${cap[1]}`);
  }
  for (const c of sys.charm_types) for (const [id, v] of c.effects) {
    if (!known.has(id)) report("error", "systems.charm", c.id, `unknown effect ${id}`);
    if (v.length !== 3) report("error", "systems.charm", c.id, `${id} needs 3 grade values`);
  }
  for (const it of b.items) {
    const e = it.equip;
    if (!e) continue;
    for (const [id] of e.implicit ?? []) if (!known.has(id)) report("error", "item.implicit", it.id, `unknown implicit ${id}`);
    if (e.charm && !sys.charm_types.some((c) => c.id === e.charm!.type)) report("error", "item.charm", it.id, `unknown charm type ${e.charm.type}`);
    if (e.totem && !sys.totem_types.some((t) => t.id === e.totem!.type)) report("error", "item.totem", it.id, `unknown totem type ${e.totem.type}`);
    if (e.slot !== "charm" && e.item_level === undefined) report("error", "item.item_level", it.id, "gear without item_level");
  }
  for (const [job, id] of Object.entries(sys.starter_weapons)) if (items.get(id)?.equip?.slot !== "weapon") report("error", "systems.starter", job, `starter weapon ${id} is not a weapon`);
  if (!sys.starter_weapons.vanguard) report("error", "systems.starter", "vanguard", "no starter weapon");
}

function checkSkills(b: ContentBundle) {
  for (const s of b.skills) {
    if (s.cooldown_ms < s.cast_ms) report("error", "skill.cooldown", s.id, "cooldown shorter than cast");
  }
}

// --- main --------------------------------------------------------------------

function main() {
  const args = new Set(process.argv.slice(2));
  const bundle = load();
  if (bundle) {
    checkIds(bundle);
    checkReferences(bundle);
    {
      const g = grids(bundle);
      checkMaps(bundle);
      checkWarps(bundle, g);
      checkSpawns(bundle, g);
      checkNpcs(bundle, g);
      checkItems(bundle);
      checkQuests(bundle);
      checkBalance(bundle);
      checkSkills(bundle);
      checkSystems(bundle);
    }
  }
  const count = (s: Severity) => findings.filter((f) => f.severity === s).length;
  const summary = { critical: count("critical"), error: count("error"), warning: count("warning") };
  if (args.has("--json")) {
    console.log(JSON.stringify({ summary, findings }, null, 2));
  } else {
    const order: Severity[] = ["critical", "error", "warning"];
    for (const sev of order) {
      const list = findings.filter((f) => f.severity === sev);
      if (!list.length) continue;
      console.log(`\n${sev.toUpperCase()} (${list.length})`);
      const byRule = new Map<string, Finding[]>();
      for (const f of list) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
      for (const [rule, fs] of byRule) {
        console.log(`  ${rule} ×${fs.length}`);
        for (const f of fs.slice(0, args.has("--all") ? Infinity : 6)) console.log(`    ${f.where}: ${f.message}`);
        if (fs.length > 6 && !args.has("--all")) console.log(`    … ${fs.length - 6} more (--all to list)`);
      }
    }
    console.log(`\nvalidate:data — critical ${summary.critical} · error ${summary.error} · warning ${summary.warning}`);
  }
  const code = summary.critical ? 2 : summary.error ? 1 : args.has("--strict") && summary.warning ? 1 : 0;
  process.exit(code);
}

main();
