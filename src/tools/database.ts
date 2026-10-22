import "../fonts.css";
import "../ui/theme.css";
import { loadContent, loadLayout } from "../data/content";
import type { ItemDef, MapDef, MonsterDef, RecipeDef, ShopDef, SpawnZoneDef } from "../data/schema";
import { paintedItem } from "../ui/art";
import { RARITY_LABEL, SLOT_LABEL, affixText, baseLines, kindLabel } from "../ui/gear";

// Database: every monster, item, option and map from the live game data
// (public/data, the same files the server loads), in the manner of RO
// database sites. Pages are hash routes: #/monsters, #/monster/<id>,
// #/items, #/item/<id>, #/options, #/maps, #/map/<id>. The drop, element and
// gear rules mirror elyndra-server internal/game (gear.go rollGearDrops,
// ailments.go elementMult, stats.go resGroup); keep them in step.

interface SpriteSheet { frame: { w: number; h: number }; rows: string[]; animations: Record<string, { file: string; frames: number; fps: number }> }

const app = document.getElementById("app")!;
const json = async <T>(path: string): Promise<T> => (await fetch(path)).json() as Promise<T>;

const [c, shops, recipes, zones] = await Promise.all([
  loadContent(), json<ShopDef[]>("data/shops.json"), json<RecipeDef[]>("data/recipes.json"), json<SpawnZoneDef[]>("data/spawn_zones.json"),
]);

// --- indexes ------------------------------------------------------------------

const monsters = [...c.monsters.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
const items = [...c.items.values()];
const maps = [...c.maps.values()];
/** item id -> the monsters that drop it, with their entry. */
const droppedBy = new Map<string, { m: MonsterDef; rate: number; min: number; max: number }[]>();
for (const m of monsters) for (const d of m.drops) {
  const list = droppedBy.get(d.item_id) ?? [];
  list.push({ m, rate: d.rate_bp, min: d.min_qty, max: d.max_qty });
  droppedBy.set(d.item_id, list);
}
/** monster id -> where it spawns. */
const spawnsOf = new Map<string, { map: MapDef; zone: SpawnZoneDef; pocket: SpawnZoneDef["pockets"][number]; alive: number }[]>();
for (const z of zones) {
  const map = c.maps.get(z.map_id);
  if (!map) continue;
  for (const p of z.pockets) {
    const total = p.species.reduce((s, x) => s + x.weight, 0) || 1;
    for (const s of p.species) {
      const list = spawnsOf.get(s.monster_id) ?? [];
      list.push({ map, zone: z, pocket: p, alive: Math.round(p.target_alive * s.weight / total) });
      spawnsOf.set(s.monster_id, list);
    }
  }
}
const sys = c.systems;
const drops = sys.drops as unknown as {
  gear_bp: number; charm_bp: number; totem_bp: number; elite_mult: number; boss_gear: number; boss_charm_bp: number; boss_totem_bp: number;
  own_job_weapon: number; gear_rarity: Record<string, number>; charm_rarity: Record<string, number>; totem_rarity: Record<string, number>;
  tier_min_level: number[]; tier_weight: number[]; relic_grade: number[]; rare_four_affixes: number; element_charm_share: number;
};
const crafting = sys.crafting as unknown as { monster_resist: number; monster_weakness: number };
const gearPool = items.filter((i) => i.category === "equipment" && i.drop_pool && i.equip);
const uniques = items.filter((i) => i.equip?.unique && i.category === "equipment");
const npcName = (id: string) => c.npcs.get(id)?.name ?? id;
const npcMap = (id: string) => c.maps.get(c.npcs.get(id)?.map_id ?? "")?.name ?? "";

// --- small helpers ----------------------------------------------------------------

type Child = Node | string | null | undefined | false;
function h(tag: string, attrs: Record<string, string> | string = {}, ...kids: Child[]): HTMLElement {
  const e = document.createElement(tag);
  if (typeof attrs === "string") e.className = attrs;
  else for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const k of kids) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}
const link = (href: string, text: string, cls = "") => h("a", { href, class: cls }, text);
const pct = (bp: number) => {
  const v = bp / 100;
  return (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(2).replace(/0$/, "")) + "%";
};
const num = (n: number) => n.toLocaleString("en-US");
const cap = (s: string) => s.split(/[_ ]/).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const regionName = (id: string) => c.regions.get(id)?.name ?? id;
const ELEMENT_COLOUR: Record<string, string> = { fire: "#d0603a", water: "#3f8fc9", ice: "#7cc4dc", earth: "#a07a43", nature: "#5d9a48", wind: "#7fb6a0", shadow: "#7a5aa8" };
const chip = (text: string, cls = "", colour?: string) => {
  const e = h("span", "chip " + cls, text);
  if (colour) e.style.setProperty("--chip", colour);
  return e;
};
const elementChip = (el: string) => chip(cap(el), "element", ELEMENT_COLOUR[el]);
const table = (head: string[], rows: Child[][], cls = "") =>
  h("div", "table-wrap", h("table", "grid " + cls, h("thead", {}, h("tr", {}, ...head.map((t) => h("th", {}, t)))), h("tbody", {}, ...rows.map((r) => h("tr", {}, ...r.map((x) => h("td", {}, x)))))));
/** A full-page list: the table on a parchment card. */
const listCard = (...kids: Child[]) => h("section", "card list", ...kids);
const card = (title: string, ...kids: Child[]) => h("section", "card", h("h2", {}, title), ...kids);
const note = (text: string) => h("p", "note", text);
const itemLink = (it: ItemDef | undefined, id: string) => {
  const icon = paintedItem(it);
  icon.classList.add("mini");
  return h("a", { href: "#/item/" + id, class: "item-link" }, icon, h("span", {}, it?.name ?? id));
};

// --- monster portraits (idle sprite, facing the camera) ----------------------------

const sheets = new Map<string, Promise<SpriteSheet | null>>();
const sheetOf = (sprite: string) => {
  if (!sheets.has(sprite)) sheets.set(sprite, fetch(`sprites/${sprite}/${sprite}.sprite.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return sheets.get(sprite)!;
};
function portrait(m: MonsterDef, size: number, animate: boolean): HTMLElement {
  const bind = c.sprites.monsters[m.sprite] ?? c.sprites.monsters[m.id];
  const real = !!bind && !bind.placeholder;
  const sprite = real ? bind.sprite : c.sprites.fallback.sprite;
  const box = h("span", "portrait" + (real ? "" : " placeholder"));
  box.style.width = box.style.height = size + "px";
  box.title = real ? m.name : m.name + " (placeholder art)";
  void sheetOf(sprite).then((s) => {
    const idle = s?.animations.idle;
    if (!s || !idle) return;
    const row = Math.max(0, s.rows.indexOf("S"));
    const f = h("span", "frame");
    f.style.backgroundImage = `url('sprites/${sprite}/${idle.file}')`;
    f.style.backgroundSize = `${idle.frames * 100}% ${s.rows.length * 100}%`;
    f.style.backgroundPositionY = s.rows.length > 1 ? (row / (s.rows.length - 1)) * 100 + "%" : "0";
    if (animate && idle.frames > 1) {
      f.style.animation = `sheet ${idle.frames / idle.fps}s steps(${idle.frames}, jump-none) infinite`;
    }
    box.append(f);
  });
  return box;
}

// --- rules the server applies ---------------------------------------------------------

/** stats.go resGroup: fire 0, cold 1 (water, ice), nature 2 (earth, nature, wind), shadow 3. */
const resGroup = (el: string) => (el === "fire" ? 0 : el === "water" || el === "ice" ? 1 : el === "shadow" ? 3 : 2);
const GROUPS = ["fire", "cold", "nature", "shadow"];
/** ailments.go elementMult: a monster resists its own group and is weak to the opposite one. */
const elementTaken = (m: MonsterDef) => GROUPS.map((_, g) => {
  const own = resGroup(m.element);
  return g === own ? 100 - crafting.monster_resist : g === (own ^ 1) ? 100 + crafting.monster_weakness : 100;
});
/** gear.go randomGearBase: the highest gear tier at or below the monster's level. */
const gearTier = (level: number) => Math.max(0, ...gearPool.filter((i) => (i.equip!.item_level ?? 1) <= level).map((i) => i.equip!.item_level ?? 1));
const gradeAt = (category: "charm" | "totem", level: number) => {
  let best = 0;
  for (const i of items) if (i.category === category && !i.equip?.unique && (i.equip?.item_level ?? 99) <= level) best = Math.max(best, i.equip?.charm?.grade ?? i.equip?.totem?.grade ?? 0);
  return best;
};
const GRADE = ["", "Lesser", "Greater", "Grand"];
const rarityLine = (w: Record<string, number>) => {
  const total = Object.values(w).reduce((s, x) => s + x, 0);
  return Object.entries(w).map(([k, v]) => `${RARITY_LABEL[k] ?? cap(k)} ${pct((v / total) * 10000)}`).join(" · ");
};
/** Affix tiers an item level can roll (tier_min_level). */
const maxTier = (itemLevel: number) => drops.tier_min_level.filter((l) => l <= itemLevel).length;

// --- pages ------------------------------------------------------------------------------

let monsterFilter = { q: "", region: "", element: "", type: "" };
let itemFilter = { q: "", cat: "", rarity: "" };

function select(label: string, value: string, options: [string, string][], on: (v: string) => void) {
  const s = h("select", { "aria-label": label }) as HTMLSelectElement;
  s.append(h("option", { value: "" }, label), ...options.map(([v, t]) => h("option", { value: v }, t)));
  s.value = value;
  s.onchange = () => on(s.value);
  return s;
}
function search(placeholder: string, value: string, on: (v: string) => void) {
  const i = h("input", { type: "search", placeholder, value }) as HTMLInputElement;
  i.oninput = () => on(i.value);
  return i;
}

function monsterList(): HTMLElement {
  const body = h("div");
  const draw = () => {
    const f = monsterFilter, q = f.q.trim().toLowerCase();
    const rows = monsters.filter((m) => (!q || m.name.toLowerCase().includes(q) || m.id.includes(q)) && (!f.region || m.region_id === f.region)
      && (!f.element || m.element === f.element) && (!f.type || m.archetype === f.type));
    body.replaceChildren(h("p", "count", `${rows.length} of ${monsters.length} monsters`), listCard(table(
      ["", "Monster", "Lv", "Race", "Element", "Type", "HP", "ATK", "Armour", "Base EXP", "Spawns"],
      rows.map((m) => {
        const where = [...new Set((spawnsOf.get(m.id) ?? []).map((s) => s.map.name))];
        return [h("a", { href: "#/monster/" + m.id }, portrait(m, 40, false)), h("div", {}, link("#/monster/" + m.id, m.name, "strong"), m.bounty ? chip("Bounty", "bounty") : null),
          String(m.level), cap(m.family), elementChip(m.element), cap(m.archetype), num(m.hp), num(m.attack), num(m.defense), num(m.base_exp),
          where.length ? where.join(", ") : h("span", "muted", "not placed")];
      }), "monsters")));
  };
  const opts = (vals: string[]) => [...new Set(vals)].sort().map((v) => [v, cap(v)] as [string, string]);
  const bar = h("div", "filters",
    search("Search name or id", monsterFilter.q, (v) => { monsterFilter.q = v; draw(); }),
    select("All regions", monsterFilter.region, [...c.regions.values()].map((r) => [r.id, r.name]), (v) => { monsterFilter.region = v; draw(); }),
    select("All elements", monsterFilter.element, opts(monsters.map((m) => m.element)), (v) => { monsterFilter.element = v; draw(); }),
    select("All types", monsterFilter.type, opts(monsters.map((m) => m.archetype)), (v) => { monsterFilter.type = v; draw(); }));
  draw();
  return h("div", {}, h("h1", {}, "Monsters"), bar, body);
}

function stat(label: string, value: Child, hint = "") {
  return h("div", "stat", h("span", "label", label), h("b", {}, value), hint ? h("small", "muted", hint) : null);
}

function monsterPage(id: string): HTMLElement {
  const m = c.monsters.get(id);
  if (!m) return h("p", {}, "No monster " + id);
  const bind = c.sprites.monsters[m.sprite] ?? c.sprites.monsters[m.id];
  const placeholder = !bind || bind.placeholder;
  const elite = m.archetype === "elite", boss = m.archetype === "boss";
  const playerSpeed = 150; // constants.player_base_ms_per_cell
  const head = h("header", "hero",
    h("div", "hero-art", portrait(m, 220, true), placeholder ? h("small", "muted", "Placeholder art: no painted sprite yet") : null),
    h("div", "hero-copy",
      h("p", "eyebrow", `${m.id} · ${regionName(m.region_id)}`),
      h("h1", {}, m.name),
      h("div", "chips", chip("Lv " + m.level, "level"), chip(cap(m.archetype), "type"), chip(cap(m.family), "race"), elementChip(m.element),
        chip(m.behavior === "aggressive" ? "Aggressive" : "Passive", m.behavior), m.bounty ? chip("Bounty", "bounty") : null),
      h("p", "lore", m.ecology)));

  const stats = card("Stats", h("div", "stats",
    stat("HP", num(m.hp)),
    stat("ATK", num(m.attack)),
    stat("Armour", num(m.defense)),
    stat("Attack range", m.attack_range + (m.attack_range === 1 ? " cell" : " cells"), m.attack_range > 1 ? "ranged" : "melee"),
    stat("Attack speed", (m.attack_ms / 1000).toFixed(2) + " s", "per swing"),
    stat("Move speed", (1000 / m.move_speed_ms).toFixed(1) + " cells/s", `${Math.round((playerSpeed / m.move_speed_ms) * 100)}% of a player`),
    stat("Aggro range", m.aggro_radius ? m.aggro_radius + " cells" : "—", m.behavior === "aggressive" ? "attacks on sight" : "only when hit"),
    stat("Base EXP", num(m.base_exp), "paid per hit, for the HP it takes off"),
    stat("Job EXP", num(m.job_exp), "not used yet"),
    stat("EXP / HP", (m.base_exp / m.hp).toFixed(3))));

  const taken = elementTaken(m);
  const elements = card("Element", h("p", {}, "Damage this monster takes from each element group (player damage and resistances use these four groups)."),
    h("div", "elements", ...GROUPS.map((g, i) => h("div", "el-cell " + (taken[i] > 100 ? "weak" : taken[i] < 100 ? "resist" : ""), h("span", {}, cap(g)), h("b", {}, taken[i] + "%")))),
    note(`It resists its own group by ${crafting.monster_resist}% and takes ${crafting.monster_weakness}% more from the opposite one (fire ↔ cold, nature ↔ shadow). Earth, nature and wind count as nature; water and ice as cold.`));

  const dropRows: Child[][] = m.drops.slice().sort((a, b) => b.rate_bp - a.rate_bp).map((d) => {
    const it = c.items.get(d.item_id);
    return [itemLink(it, d.item_id), it ? h("span", "rarity-" + it.rarity, cap(it.rarity)) : "", it ? cap(it.category) : "", h("b", {}, pct(d.rate_bp)), d.min_qty === d.max_qty ? String(d.min_qty) : `${d.min_qty}–${d.max_qty}`];
  });
  const mult = elite ? drops.elite_mult : 1;
  const tier = gearTier(m.level), cg = gradeAt("charm", m.level), tg = gradeAt("totem", m.level);
  const uniq = uniques.filter((u) => (u.equip!.item_level ?? 1) <= m.level).length;
  const random = h("ul", "rules",
    h("li", {}, h("b", {}, "Equipment: "), boss ? `${drops.boss_gear} pieces every kill` : `${pct(drops.gear_bp * mult)} a kill`,
      ` · item level ${tier || "—"} bases (the best tier at or below Lv ${m.level}) · ${rarityLine(drops.gear_rarity)}`,
      uniq ? ` · a Unique rolls one of ${uniq} uniques its level allows` : " · no Unique is low enough yet: Unique rolls become Rare",
      ` · weapons favour your job ${Math.round(drops.own_job_weapon * 100)}% of the time`),
    h("li", {}, h("b", {}, "Charm: "), pct(boss ? drops.boss_charm_bp : drops.charm_bp * mult), ` a kill · ${cg ? GRADE[cg] : "none yet"} grade · ${rarityLine(drops.charm_rarity)}`,
      ` · ${Math.round(drops.element_charm_share * 100)}% favour ${cap(m.element)} Charms`, !boss && m.element !== "shadow" ? " · Unique Charms only from bosses and shadow monsters" : ""),
    h("li", {}, h("b", {}, "Totem: "), pct(boss ? drops.boss_totem_bp : drops.totem_bp * mult), ` a kill · ${tg ? GRADE[tg] : "none yet"} grade · ${rarityLine(drops.totem_rarity)}`));
  const loot = card("Drops",
    dropRows.length ? table(["Item", "Rarity", "Kind", "Chance", "Qty"], dropRows) : note("No fixed drops."),
    note("Fortune Incense raises material and rare material chances. Loot belongs to the player who landed the kill."),
    h("h3", {}, "Random gear, Charms and Totems"), random,
    elite ? note(`Elite: ${drops.elite_mult}× the normal gear, Charm and Totem chance.`) : null);

  const where = spawnsOf.get(m.id) ?? [];
  const spawn = card("Spawns", where.length ? h("div", "spawns", ...where.map((s) => {
    const box = h("div", "spawn");
    box.append(h("div", {}, link("#/map/" + s.map.id, s.map.name, "strong"), h("p", "muted", `${s.pocket.name} · about ${s.alive} alive · respawn ${s.pocket.respawn_sec[0]}–${s.pocket.respawn_sec[1]} s`),
      h("p", "small", s.pocket.design_note)));
    void miniMap(s.map, s.zone, s.pocket.id).then((cv) => box.prepend(cv));
    return box;
  })) : note("Not placed on any map yet: data only."));

  const quests = [...c.quests.values()].filter((q) => q.objectives.some((o) => (o.type === "kill" && o.monster_id === m.id) || (o.type === "collect" && m.drops.some((d) => d.item_id === o.item_id))));
  const questCard = quests.length ? card("Quests", table(["Quest", "Region", "Lv", "Objective"], quests.map((q) => [h("b", {}, q.title), regionName(q.region_id), String(q.min_level),
    q.objectives.filter((o) => o.type !== "visit").map((o) => o.type === "kill" ? `Kill ${o.count} ${c.monsters.get(o.monster_id)?.name}` : `Collect ${o.count} ${c.items.get(o.item_id)?.name}`).join(", ")]))) : null;

  return h("div", {}, head, h("div", "columns", h("div", {}, stats, elements, questCard), h("div", {}, loot, spawn)));
}

/** The map's walkable cells, with this pocket's spawn area lit. */
async function miniMap(map: MapDef, zone: SpawnZoneDef, pocketId: string): Promise<HTMLCanvasElement> {
  const l = await loadLayout(c, map.id);
  const cv = h("canvas", { class: "minimap", width: String(l.width), height: String(l.height) }) as HTMLCanvasElement;
  const g = cv.getContext("2d")!;
  const img = g.createImageData(l.width, l.height);
  let i = 0;
  for (let k = 0; k < l.walk_rle.length; k += 2) {
    const walk = l.walk_rle[k] === 1;
    for (let n = 0; n < l.walk_rle[k + 1]; n++, i++) {
      img.data.set(walk ? [205, 186, 140, 255] : [58, 46, 34, 255], i * 4);
    }
  }
  g.putImageData(img, 0, 0);
  for (const p of zone.pockets) {
    g.fillStyle = p.id === pocketId ? "rgba(196,48,32,0.75)" : "rgba(80,70,60,0.18)";
    for (const [x, y, w, hh] of p.rects) g.fillRect(x, y, w, hh);
  }
  g.fillStyle = "#2a7f8f";
  for (const [x, y, w, hh] of l.camps ?? []) g.fillRect(x, y, w, hh);
  return cv;
}

function itemList(): HTMLElement {
  const body = h("div");
  const draw = () => {
    const f = itemFilter, q = f.q.trim().toLowerCase();
    const rows = items.filter((i) => (!q || i.name.toLowerCase().includes(q) || i.id.includes(q)) && (!f.cat || i.category === f.cat) && (!f.rarity || i.rarity === f.rarity))
      .sort((a, b) => a.category.localeCompare(b.category) || (a.equip?.item_level ?? 0) - (b.equip?.item_level ?? 0) || a.name.localeCompare(b.name));
    const shown = rows.slice(0, 400);
    body.replaceChildren(h("p", "count", `${rows.length} of ${items.length} items` + (rows.length > shown.length ? ` (first ${shown.length} shown: narrow the search)` : "")), listCard(table(
      ["Item", "Kind", "Rarity", "Lv", "Sell", "Dropped by"],
      shown.map((i) => {
        const from = droppedBy.get(i.id) ?? [];
        return [itemLink(i, i.id), i.equip ? kindLabel(i) : cap(i.category), h("span", "rarity-" + i.rarity, cap(i.rarity)), i.equip ? String(i.equip.min_level) : "",
          num(i.sell_price) + " A", from.length ? `${from.length} monster${from.length > 1 ? "s" : ""}` : i.drop_pool ? "random drop" : ""];
      }))));
  };
  const cats = [...new Set(items.map((i) => i.category))].sort().map((v) => [v, cap(v)] as [string, string]);
  const rar = [...new Set(items.map((i) => i.rarity))].map((v) => [v, cap(v)] as [string, string]);
  draw();
  return h("div", {}, h("h1", {}, "Items"), h("div", "filters",
    search("Search name or id", itemFilter.q, (v) => { itemFilter.q = v; draw(); }),
    select("All kinds", itemFilter.cat, cats, (v) => { itemFilter.cat = v; draw(); }),
    select("All rarities", itemFilter.rarity, rar, (v) => { itemFilter.rarity = v; draw(); })), body);
}

function itemPage(id: string): HTMLElement {
  const it = c.items.get(id);
  if (!it) return h("p", {}, "No item " + id);
  const icon = paintedItem(it);
  icon.classList.add("big");
  const e = it.equip;
  const facts = h("div", "stats",
    stat("Kind", e ? kindLabel(it) : cap(it.category)),
    stat("Rarity", h("span", "rarity-" + it.rarity, cap(it.rarity))),
    stat("Sell price", num(it.sell_price) + " A"),
    stat("Stack", String(it.stack_max)),
    e ? stat("Required level", String(e.min_level)) : null,
    e?.item_level ? stat("Item level", String(e.item_level), `affix tiers T1–T${maxTier(e.item_level)}`) : null,
    e?.job ? stat("Job", cap(e.job)) : null,
    e?.req && Object.keys(e.req).length ? stat("Stats needed", Object.entries(e.req).map(([k, v]) => v + " " + k.toUpperCase()).join(", ")) : null);
  const head = h("header", "hero item", h("div", "hero-art", icon), h("div", "hero-copy", h("p", "eyebrow", it.id), h("h1", {}, it.name), h("p", "lore", it.description)));
  const parts: Child[] = [card("Details", facts)];

  if (e) parts.push(card(e.charm ? "Charm effect" : e.totem ? "Totem effect" : "Base", h("ul", "rules", ...baseLines(c, it).map((t) => h("li", {}, t))),
    e.unique ? note("Unique: its special rule is fixed on every copy.") : null));
  if (it.use) {
    const u = it.use, lines: string[] = [];
    if (u.heal_hp_pct) lines.push(`Restores ${u.heal_hp_pct}% HP`);
    if (u.heal_sp_pct) lines.push(`Restores ${u.heal_sp_pct}% SP`);
    if (u.reset_stats) lines.push("Resets allocated stat points");
    if (u.lure_radius) lines.push(`Every monster within ${u.lure_radius} cells chases you`);
    if (u.teleport) lines.push(u.teleport === "town" ? "Returns you to Avelorn" : "Returns you to this field's camp");
    if (u.buff) lines.push(`+${u.buff.pct}% ${u.buff.kind === "move" ? "movement speed" : u.buff.kind === "exp" ? "EXP" : "material drop chance"} for ${u.buff.duration_ms / 60000} min`);
    lines.push(`Cooldown ${u.cooldown_ms / 1000} s`);
    parts.push(card("Use", h("ul", "rules", ...lines.map((t) => h("li", {}, t)))));
  }
  if (e && !e.unique) {
    const slot = e.slot, lvl = e.item_level ?? 1, top = maxTier(lvl);
    const pool = it.category === "totem" ? sys.totem_affixes : sys.affixes.filter((a) => a.slots.includes(slot));
    if (pool.length) parts.push(card("Random options", h("p", {}, `A Magic copy rolls 1–2 of these, a Rare 3–4 (four ${Math.round(drops.rare_four_affixes * 100)}% of the time). Item level ${lvl} reaches tier T${top}; values are the highest roll of each tier.`),
      table(["Option", "Kind", ...Array.from({ length: top }, (_, i) => "T" + (i + 1))], pool.map((a) => [affixText(c, a.id, a.values[Math.min(top, a.values.length) - 1]).replace(/^[+]?[\d.]+/, "#"), cap(a.kind),
        ...Array.from({ length: top }, (_, i) => a.values[i] !== undefined ? String(a.values[i]) : "—")]), "options")));
  }

  const from = (droppedBy.get(id) ?? []).sort((a, b) => b.rate - a.rate);
  const dropCard: Child[] = [];
  if (from.length) dropCard.push(table(["Monster", "Lv", "Chance", "Qty"], from.map((d) => [h("a", { href: "#/monster/" + d.m.id, class: "mob-link" }, portrait(d.m, 32, false), d.m.name), String(d.m.level), h("b", {}, pct(d.rate)), d.min === d.max ? String(d.min) : `${d.min}–${d.max}`])));
  if (it.drop_pool && e) {
    const lvl = e.item_level ?? 1;
    const next = Math.min(999, ...gearPool.map((g) => g.equip!.item_level ?? 1).concat(items.filter((i) => i.drop_pool && i.category === it.category).map((i) => i.equip!.item_level ?? 1)).filter((l) => l > lvl));
    const range = monsters.filter((m) => m.level >= lvl && m.level < next);
    dropCard.push(note(`Random drop from any monster Lv ${lvl}${next < 999 ? "–" + (next - 1) : "+"} (${range.length} monsters), as the ${it.category === "equipment" ? "gear" : it.category} roll on the monster pages shows.`));
  }
  if (e?.unique) dropCard.push(note(`Unique: rolls from a gear drop's Unique chance on monsters Lv ${e.item_level ?? 1} and above.`));
  if (dropCard.length) parts.push(card("Obtained from", ...dropCard));

  const sold = shops.flatMap((s) => s.items.filter((x) => x.item_id === id).map((x) => [npcName(s.npc_id), npcMap(s.npc_id), num(x.price) + " A"] as Child[]));
  if (sold.length) parts.push(card("Sold by", table(["NPC", "Map", "Price"], sold)));
  const made = recipes.filter((r) => r.output.item_id === id);
  const uses = recipes.filter((r) => r.inputs.some((x) => x.item_id === id));
  const recipeRow = (r: RecipeDef): Child[] => [itemLink(c.items.get(r.output.item_id), r.output.item_id), h("div", "ingredients", ...r.inputs.map((x) => h("span", {}, x.qty + "× ", itemLink(c.items.get(x.item_id), x.item_id)))), num(r.currency) + " A", npcName(r.npc_id)];
  if (made.length) parts.push(card("Crafted from", table(["Makes", "Needs", "Fee", "Crafter"], made.map(recipeRow))));
  if (uses.length) parts.push(card("Used to craft", table(["Makes", "Needs", "Fee", "Crafter"], uses.map(recipeRow))));
  const quests = [...c.quests.values()].filter((q) => q.rewards.items.some((x) => x.item_id === id) || q.objectives.some((o) => o.type === "collect" && o.item_id === id));
  if (quests.length) parts.push(card("Quests", table(["Quest", "Role"], quests.map((q) => [h("b", {}, q.title), q.rewards.items.some((x) => x.item_id === id) ? "Reward" : "Collect"]))));
  return h("div", {}, head, h("div", "columns", h("div", {}, ...parts.slice(0, 3)), h("div", {}, ...parts.slice(3))));
}

function optionsPage(): HTMLElement {
  const tiers = drops.tier_min_level;
  const head = ["Option", "Kind", "Slots", ...tiers.map((l, i) => `T${i + 1} (iLv ${l})`)];
  const rows = (list: typeof sys.affixes) => list.map((a) => [affixText(c, a.id, a.values[a.values.length - 1]).replace(/^[+]?[\d.]+/, "#"), cap(a.kind), a.slots.map((s) => SLOT_LABEL[s] ?? s).join(", "),
    ...tiers.map((_, i) => (a.values[i] !== undefined ? String(a.values[i]) : "—"))]);
  const charmRows = sys.charm_types.map((t) => [h("b", {}, t.name), t.effects.map(([id, v]) => affixText(c, id, v[2])).join(" · "), t.effects.map(([, v]) => v.join(" / ")).join(" · "), t.elements.map(cap).join(", ")]);
  const totemRows = sys.totem_types.map((t) => [h("b", {}, t.name), t.text.replace(/\{(\w+)\}/g, (_, k) => String(t.effects[k])), t.trigger ? "Echo: every " + t.charges + " " + t.trigger : t.charges + " kills", t.duration_ms ? t.duration_ms / 1000 + " s" : "—"]);
  return h("div", {}, h("h1", {}, "Options and drop rules"),
    card("Gear options (affixes)", h("p", {}, `Values are the highest roll of each tier. An item's level decides its highest tier; lower tiers roll more often (weights ${drops.tier_weight.join(" / ")}).`), table(head, rows(sys.affixes), "options")),
    card("Totem options", table(["Option", "Kind", "Slots", "T1", "T2", "T3", "T4"], sys.totem_affixes.map((a) => [affixText(c, a.id, a.values[a.values.length - 1]).replace(/^[+]?[\d.]+/, "#"), cap(a.kind), "Totem", ...[0, 1, 2, 3].map((i) => (a.values[i] !== undefined ? String(a.values[i]) : "—"))]), "options")),
    card("Charm types", note("Effect at Grand grade; values are Lesser / Greater / Grand. Monsters of the listed elements favour that Charm."), table(["Charm", "Effect", "Lesser / Greater / Grand", "Favoured by"], charmRows)),
    card("Totem types", note("Effect at Grand grade (Lesser ×0.6, Greater ×0.8)."), table(["Totem", "Effect", "Charge", "Lasts"], totemRows)),
    card("Drop rules (every monster)", h("ul", "rules",
      h("li", {}, `Equipment ${pct(drops.gear_bp)} a kill · elites ×${drops.elite_mult} · bosses ${drops.boss_gear} pieces`),
      h("li", {}, `Gear rarity: ${rarityLine(drops.gear_rarity)}`),
      h("li", {}, `Charm ${pct(drops.charm_bp)} a kill (bosses ${pct(drops.boss_charm_bp)}) · ${rarityLine(drops.charm_rarity)}`),
      h("li", {}, `Totem ${pct(drops.totem_bp)} a kill (bosses ${pct(drops.boss_totem_bp)}) · ${rarityLine(drops.totem_rarity)}`),
      h("li", {}, `Relic Charm grade: ${drops.relic_grade.join("% / ")}% (Lesser / Greater / Grand)`))));
}

function mapList(): HTMLElement {
  const rows = maps.slice().sort((a, b) => a.recommended_level_min - b.recommended_level_min).map((m) => {
    const z = zones.find((x) => x.map_id === m.id);
    const species = new Set(z?.pockets.flatMap((p) => p.species.map((s) => s.monster_id)) ?? []);
    return [link("#/map/" + m.id, m.name, "strong"), regionName(m.region_id), cap(m.type), m.type === "town" ? "—" : `${m.recommended_level_min}–${m.recommended_level_max}`, `${m.width_cells}×${m.height_cells}`, String(species.size), z ? `${z.instance_rules.min_alive}–${z.instance_rules.max_alive}` : "—"] as Child[];
  });
  return h("div", {}, h("h1", {}, "Maps"), listCard(table(["Map", "Region", "Type", "Lv", "Size", "Species", "Alive"], rows)));
}

function mapPage(id: string): HTMLElement {
  const m = c.maps.get(id);
  if (!m) return h("p", {}, "No map " + id);
  const z = zones.find((x) => x.map_id === id);
  const region = c.regions.get(m.region_id);
  const head = h("header", "hero", h("div", "hero-copy", h("p", "eyebrow", `${m.id} · ${region?.name ?? ""}`), h("h1", {}, m.name),
    h("div", "chips", chip(cap(m.type), "type"), m.type !== "town" ? chip(`Lv ${m.recommended_level_min}–${m.recommended_level_max}`, "level") : null, m.safe_zone ? chip("Safe zone", "passive") : null),
    h("p", "lore", m.role), region ? h("p", "small", region.theme + " " + region.ecology) : null));
  const pockets = z ? card("Zones", table(["Zone", "Monsters", "Alive", "Respawn"], z.pockets.map((p) => [h("div", {}, h("b", {}, p.name), h("p", "small", p.design_note)),
    h("div", "mob-stack", ...p.species.map((s) => { const mm = c.monsters.get(s.monster_id); return mm ? h("a", { href: "#/monster/" + mm.id, class: "mob-link" }, portrait(mm, 32, false), `${mm.name} Lv ${mm.level}`) : s.monster_id; })),
    String(p.target_alive), `${p.respawn_sec[0]}–${p.respawn_sec[1]} s`]))) : null;
  const npcs = [...c.npcs.values()].filter((n) => n.map_id === id);
  const npcCard = npcs.length ? card("NPCs", table(["NPC", "Role"], npcs.map((n) => [n.name, cap(n.role)]))) : null;
  const warps = c.warps.filter((w) => w.from_map === id);
  const warpCard = warps.length ? card("Exits", h("ul", "rules", ...warps.map((w) => h("li", {}, link("#/map/" + w.to_map, c.maps.get(w.to_map)?.name ?? w.to_map))))) : null;
  const mapBox = h("div", "card");
  if (z) void miniMap(m, z, "").then((cv) => { cv.classList.add("large"); mapBox.append(h("h2", {}, "Layout"), cv, note("Sand: walkable · dark: blocked · teal: camps · shaded: spawn zones")); });
  return h("div", {}, head, h("div", "columns", h("div", {}, pockets, npcCard), h("div", {}, mapBox, warpCard)));
}

// --- shell ----------------------------------------------------------------------------

const style = document.createElement("style");
style.textContent = `
html,body{margin:0;min-height:100%;background:#1e1813;color:var(--ui-ink)}
body{font:14px/1.5 var(--ui-font-body);background:radial-gradient(ellipse at 50% -10%,#3b4b3c,#1e1813 60%) fixed}
#app{max-width:1180px;margin:0 auto;padding:0 16px 48px}
a{color:#6b3f17;text-decoration:none}a:hover{text-decoration:underline}
.top{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:12px 0;background:linear-gradient(#1e1813 75%,#1e181300)}
.brand{font:600 22px var(--ui-font-title);letter-spacing:.08em;color:var(--ui-gold)}
.brand small{display:block;font:11px var(--ui-font-body);letter-spacing:.2em;color:#b9a27a}
.tabs{display:flex;gap:4px;flex-wrap:wrap}
.tabs a{padding:6px 14px;border:1px solid #6e5432;border-radius:3px;color:#e9d9b6;background:#2c241c}
.tabs a.on{background:linear-gradient(#b9864a,#8a5f2f);color:#fff7e4;border-color:#d8a964}
h1{font:600 30px var(--ui-font-title);color:#f1e2bf;margin:10px 0 12px}
.hero h1{color:var(--ui-ink);margin:2px 0 8px}
.card,.hero{background:linear-gradient(#efe1c1,#e2cfa7);border:1px solid #b08f5c;border-radius:4px;box-shadow:0 2px 0 #0004,inset 0 0 0 3px #f7ecd255;padding:14px 16px;margin:0 0 14px;color:var(--ui-ink)}
.card h2{font:600 19px var(--ui-font-title);margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #b08f5c88;color:#4a3015}
.card h3{font:600 15px var(--ui-font-title);margin:14px 0 6px}
.hero{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.hero-art{display:flex;flex-direction:column;align-items:center;gap:4px;background:radial-gradient(circle at 50% 60%,#fff8e6,#d8c193 70%);border:1px solid #b08f5c;border-radius:4px;padding:6px}
.hero-copy{flex:1;min-width:260px}
.eyebrow{margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7c6440}
.lore{font-style:italic;margin:8px 0 0;max-width:62ch}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;background:#d9c49a;border:1px solid #b08f5c;color:#3d2a16;white-space:nowrap}
.chip.element{background:var(--chip);border-color:#0003;color:#fff;text-shadow:0 1px 1px #0006}
.chip.aggressive{background:#b9573f;color:#fff;border-color:#8c3a27}.chip.passive{background:#6f9a62;color:#fff;border-color:#4d7443}
.chip.bounty{background:#e2b54e;border-color:#a87d24;margin-left:6px}.chip.level{background:#3e3022;color:#f0deb6;border-color:#3e3022}
.columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
@media (max-width:820px){.columns{grid-template-columns:1fr}}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.stat{background:#f6ecd5;border:1px solid #c9ad7c;border-radius:3px;padding:6px 9px;display:flex;flex-direction:column}
.stat .label{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7c6440}.stat b{font-size:17px}
.elements{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}
.el-cell{text-align:center;padding:8px;border:1px solid #c9ad7c;border-radius:3px;background:#f6ecd5}.el-cell b{display:block;font-size:20px}
.el-cell.weak{background:#f3cdb4;border-color:#c46c45}.el-cell.resist{background:#d4dfe6;border-color:#7d98ab}
.grid{width:100%;border-collapse:collapse;font-size:13px}
.grid th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7c6440;border-bottom:1px solid #b08f5c;padding:4px 6px}
.grid td{padding:4px 6px;border-bottom:1px solid #c9ad7c66;vertical-align:middle}
.grid tr:hover td{background:#fff6}
.table-wrap{overflow-x:auto}.card.list{padding:6px 10px}
.monsters td:nth-child(n+7){text-align:right;font-variant-numeric:tabular-nums}
.options td{font-variant-numeric:tabular-nums}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}
.filters input,.filters select{font:inherit;padding:6px 9px;border:1px solid #b08f5c;border-radius:3px;background:#f6ecd5;color:var(--ui-ink)}
.filters input{flex:1;min-width:200px}
.count{color:#d8c49c;margin:0 0 6px;font-size:12px}
.note{font-size:12px;color:#6e5638;margin:8px 0 0}.small{font-size:12px;margin:2px 0}.muted{color:#7c6440}
.rules{margin:4px 0;padding-left:18px}.rules li{margin:3px 0}
.portrait{display:inline-block;position:relative;overflow:hidden;vertical-align:middle;flex:none}
.portrait .frame{position:absolute;inset:-12% -12% 0;background-repeat:no-repeat}
.portrait.placeholder .frame{filter:grayscale(1) opacity(.55)}
@keyframes sheet{from{background-position-x:0%}to{background-position-x:100%}}
.painted-icon.mini{width:30px;height:30px;margin-right:8px;border-radius:3px}.painted-icon.big{width:96px;height:96px}
.item-link,.mob-link{display:inline-flex;align-items:center;gap:4px;font-weight:600}
.mob-stack{display:flex;flex-direction:column;gap:2px}
.ingredients{display:flex;flex-direction:column;gap:2px}
.rarity-common,.rarity-normal{color:#4b3a28}.rarity-uncommon,.rarity-magic{color:#2f63a3}.rarity-rare{color:#a07a12}.rarity-epic,.rarity-relic{color:#7a3fa5}.rarity-unique{color:#b4521f}
.spawns{display:flex;flex-direction:column;gap:12px}.spawn{display:flex;gap:12px;align-items:flex-start}
.minimap{width:150px;height:150px;image-rendering:pixelated;border:1px solid #8c6d43;border-radius:3px;flex:none}
.minimap.large{width:100%;height:auto;max-width:520px}
`;
document.head.append(style);

const TABS: [string, string][] = [["monsters", "Monsters"], ["items", "Items"], ["options", "Options"], ["maps", "Maps"]];
function route() {
  const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
  const tab = page === "monster" ? "monsters" : page === "item" ? "items" : page === "map" ? "maps" : page || "monsters";
  const nav = h("nav", "top", h("div", "brand", "ELYNDRA", h("small", {}, "DATABASE · LIVE GAME DATA")),
    h("div", "tabs", ...TABS.map(([k, t]) => link("#/" + k, t, k === tab ? "on" : ""))));
  const view = page === "monster" ? monsterPage(id) : page === "item" ? itemPage(id) : page === "options" ? optionsPage()
    : page === "maps" ? mapList() : page === "map" ? mapPage(id) : page === "items" ? itemList() : monsterList();
  app.replaceChildren(nav, view);
  document.title = "Elyndra · " + (page === "monster" ? c.monsters.get(id)?.name : page === "item" ? c.items.get(id)?.name : page === "map" ? c.maps.get(id)?.name : TABS.find(([k]) => k === tab)?.[1]) + " · Database";
  if (page === "monster" || page === "item" || page === "map") scrollTo(0, 0);
}
addEventListener("hashchange", route);
route();
