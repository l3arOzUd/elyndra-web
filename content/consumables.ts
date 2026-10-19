// World v3 consumables (WORLD_GDD_v3.md §5): the tools of a horde run, and
// what monster junk is for.
//
// Six items, each with a recipe in every field's level band. A band's recipes
// take the common and uncommon materials of the monsters that live in that
// field (or its dungeon), so every material has at least one use beyond the
// sell price; the validator checks that none is left out. The craftsman of the
// field's home region (all of them now stand in Avelorn) makes them.

import type { ItemDef, RecipeDef } from "../src/data/schema";
import type { RegionDesign } from "./types";
import { FIELDS } from "./world";

type Use = NonNullable<ItemDef["use"]>;
interface Consumable { id: string; slug: string; name: string; sell: number; qty: number; use: Use; description: string; shop?: number }

export const CONSUMABLES: Consumable[] = [
  { id: "itm_0900", slug: "lure_bell", name: "Lure Bell", sell: 2, qty: 3, use: { lure_radius: 14, cooldown_ms: 8000 },
    description: "Rings out over the field: every monster within 14 cells turns and comes for you, even the shy ones. The heart of a drag." },
  { id: "itm_0901", slug: "return_feather", name: "Return Feather", sell: 3, qty: 2, use: { teleport: "town", cooldown_ms: 3000 }, shop: 60,
    description: "A Guild courier's feather. Crush it to be carried back to Avelorn." },
  { id: "itm_0902", slug: "camp_feather", name: "Camp Feather", sell: 2, qty: 2, use: { teleport: "camp", cooldown_ms: 3000 }, shop: 30,
    description: "Carries you to the camp of the map you stand on. For a narrow escape or a fresh pull." },
  { id: "itm_0903", slug: "haste_draught", name: "Haste Draught", sell: 3, qty: 1, use: { buff: { kind: "move", pct: 30, duration_ms: 60_000 }, cooldown_ms: 1000 },
    description: "Move 30% faster for 60 seconds: drag the herd across a zone before it catches you." },
  { id: "itm_0904", slug: "scholars_tea", name: "Scholar's Tea", sell: 5, qty: 1, use: { buff: { kind: "exp", pct: 30, duration_ms: 600_000 }, cooldown_ms: 1000 },
    description: "Clears the head. +30% EXP from kills for 10 minutes." },
  { id: "itm_0905", slug: "fortune_incense", name: "Fortune Incense", sell: 5, qty: 1, use: { buff: { kind: "drop", pct: 50, duration_ms: 600_000 }, cooldown_ms: 1000 },
    description: "Its smoke clings to what you kill. +50% material drop chance for 10 minutes." },
];

/** Inputs per recipe: common materials in sixes, uncommon in twos. */
const QTY = { common: 6, uncommon: 2 } as const;

export function addConsumables(regions: RegionDesign[]): RegionDesign[] {
  const mats = new Map(regions.flatMap((r) => r.materials.map((m) => [m.id, m] as const)));
  const monsters = new Map(regions.flatMap((r) => r.monsters.map((m) => [m.id, m] as const)));
  const band = (lv: number) => { const i = FIELDS.findIndex((f) => lv <= f.levels[1]); return i < 0 ? FIELDS.length - 1 : i; };

  // Each material joins the band of the first map its monster lives on.
  const bandOf = new Map<string, number>();
  for (const r of regions) for (const m of r.maps) {
    if (m.type === "town") continue;
    const b = FIELDS.findIndex((f) => f.id === m.id);
    for (const p of m.pockets) for (const s of p.species) {
      const mon = monsters.get(s.monster_id);
      if (!mon) continue;
      for (const id of [mon.drops.common, mon.drops.uncommon]) if (!bandOf.has(id)) bandOf.set(id, b >= 0 ? b : band(m.levels[0]));
    }
  }
  // Materials no living monster drops still get a band by their level.
  for (const m of mats.values()) if (m.tier !== "rare" && !bandOf.has(m.id)) bandOf.set(m.id, band(m.level));

  const recipes = new Map<string, RecipeDef[]>(); // by region
  FIELDS.forEach((f, b) => {
    const pool = [...bandOf].filter(([, x]) => x === b).map(([id]) => mats.get(id)!).filter(Boolean)
      .sort((a, c) => (a.tier === c.tier ? a.id.localeCompare(c.id) : a.tier === "common" ? -1 : 1));
    if (pool.length === 0) throw new Error(`band ${f.name}: no materials`);
    const inputs: { item_id: string; qty: number }[][] = CONSUMABLES.map(() => []);
    // Deal the band's materials round the six recipes, then top up to three inputs each.
    pool.forEach((m, i) => inputs[i % CONSUMABLES.length].push({ item_id: m.id, qty: QTY[m.tier as "common" | "uncommon"] }));
    let k = 0;
    for (const list of inputs) while (list.length < 3 && list.length < pool.length) {
      const m = pool[k++ % pool.length];
      if (!list.some((x) => x.item_id === m.id)) list.push({ item_id: m.id, qty: QTY[m.tier as "common" | "uncommon"] });
    }
    const npc = `npc_${f.region}_craftsman`;
    CONSUMABLES.forEach((c, ci) => {
      const list = recipes.get(f.region) ?? [];
      list.push({ id: `rcp_${c.slug}_b${b + 1}`, npc_id: npc, output: { item_id: c.id, qty: c.qty }, inputs: inputs[ci], currency: 10 + 2 * f.levels[0] });
      recipes.set(f.region, list);
    });
  });

  return regions.map((r) => {
    const out = { ...r, recipes: [...r.recipes, ...(recipes.get(r.region.id) ?? [])] };
    if (r.region.id === "lum") {
      out.items = [...r.items, ...CONSUMABLES.map((c): ItemDef => ({ id: c.id, name: c.name, category: "consumable", rarity: "common", sell_price: c.sell, stack_max: 99, description: c.description, use: c.use }))];
    }
    // Every merchant (all in Avelorn now) sells the feathers, dearer than crafting them.
    out.shops = r.shops.map((s) => ({ ...s, items: [...s.items, ...CONSUMABLES.filter((c) => c.shop).map((c) => ({ item_id: c.id, base_price: c.shop! }))] }));
    return out;
  });
}
