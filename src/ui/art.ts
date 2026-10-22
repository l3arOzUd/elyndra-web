import type { ItemDef } from '../data/schema';

type Atlas = 'item' | 'skill' | 'skill3' | 'system' | 'gear';
const COLUMNS: Record<Atlas, number> = { item: 6, skill: 2, skill3: 3, system: 6, gear: 3 };

/** Original painted atlases. Cells are rendered directly; source PNGs stay intact. */
export function paintedIcon(index: number, kind: Atlas = 'item'): HTMLElement {
  const e = document.createElement('span'), columns = COLUMNS[kind];
  e.className = 'painted-icon ' + (kind === 'skill' ? 'skill-art' : kind === 'skill3' ? 'skill3-art' : kind === 'system' ? 'system-art' : kind === 'gear' ? 'gear-art' : 'item-art');
  e.setAttribute('aria-hidden', 'true');
  e.style.backgroundPosition = `${index % columns / (columns - 1) * 100}% ${Math.floor(index / columns) / (columns - 1) * 100}%`;
  e.dataset.artCell = String(index);
  return e;
}

/**
 * systems-v1.png (scripts/paint-system-icons.py): stats, gear kinds, Charms,
 * every Totem type in systems.ts order, Echo Totems, and the skills of the
 * jobs without painted skill art yet.
 */
export const SYSTEM_ICONS: Record<string, number> = {
  pow: 0, luk: 1, agi: 2, dex: 3, int: 4, vit: 5, head: 6, accessory: 7, charm: 8, relic: 9, unique_charm: 10, basic: 11,
  fury: 12, haste: 13, focus: 14, precision: 15, wildfire: 16, bloodrush: 17, surge: 18, bulwark: 19, aegis: 20, mending: 21, gale: 22, hunt: 23,
  echo_slaughter: 24, echo_fury: 25, echo_spite: 26,
  prism_field: 27, aether_nova: 28, gravity_coil: 29, meridian_lance: 30, splitshot_array: 31, dash_circuit: 32, coil_mine: 33, gearstorm: 34, pulse_beacon: 35,
};
/** gear-v1.png (scripts/paint-gloves.py): gloves by the primary armour kind, until the v3 sheets cover them. */
const GLOVES_ART: Record<string, number> = { armour: 0, evasion: 1, shield: 2 };
/** skills-v2.png: the four painted Vanguard skills. */
const SKILL_ART: Record<string, number> = { cleaving_arc: 0, iron_cyclone: 1, anchor_shout: 2, sundering_pulse: 3 };
/** skills-v3.png (scripts/paint-skill-icons.py): the Arcanist, Strider and Machinist skills. */
const SKILL_ART3: Record<string, number> = {
  prism_field: 0, aether_nova: 1, gravity_coil: 2, meridian_lance: 3, splitshot_array: 4, dash_circuit: 5, coil_mine: 6, gearstorm: 7, pulse_beacon: 8,
};

export function skillIcon(id: string): HTMLElement {
  if (id in SKILL_ART) return paintedIcon(SKILL_ART[id], 'skill');
  if (id in SKILL_ART3) return paintedIcon(SKILL_ART3[id], 'skill3');
  return paintedIcon(SYSTEM_ICONS[id] ?? SYSTEM_ICONS.basic, 'system');
}

export const systemIcon = (key: string) => paintedIcon(SYSTEM_ICONS[key] ?? SYSTEM_ICONS.charm, 'system');

/** Gear tiers by item level (content/model.ts TIER_LEVELS). */
const TIER_LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];

/**
 * An item's grade on the 1-10 frame scale (ITEM_ART.md): a gear base's tier,
 * or a Charm/Totem grade (Lesser 2, Greater 5, Grand 9). 0: no grade (uniques,
 * materials, consumables). Same type, other grade = same painting, other frame.
 */
export function gradeOf(item?: ItemDef): number {
  const e = item?.equip;
  if (!e || e.unique) return 0;
  const g = e.charm?.grade ?? e.totem?.grade;
  if (g) return [2, 5, 9][g - 1] ?? 0;
  if (!item?.drop_pool) return 0;
  return TIER_LEVELS.lastIndexOf(TIER_LEVELS.filter((l) => l <= (e.item_level ?? 1)).pop() ?? 1) + 1;
}

/** A painted v3 icon: "sheet:cell:cols:rows" in items-v3-<sheet>.png. */
function v3Icon(icon: string): HTMLElement {
  const [sheet, cell, cols, rows] = icon.split(':').map(Number);
  const e = document.createElement('span');
  e.className = 'painted-icon item-art v3-art';
  e.setAttribute('aria-hidden', 'true');
  e.style.backgroundImage = `url('/ui/painted/items-v3-${String(sheet).padStart(2, '0')}.png')`;
  e.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
  e.style.backgroundPosition = `${cols > 1 ? cell % cols / (cols - 1) * 100 : 0}% ${rows > 1 ? Math.floor(cell / cols) / (rows - 1) * 100 : 0}%`;
  e.dataset.artCell = icon;
  return e;
}

/**
 * An item's art. `rarity` (a gear copy's) picks the Relic and Unique Charm
 * art; `refine` (+1..+10) lights the item up (ITEM_ART.md §3). The frame
 * colour is the item's grade. No art is ever recoloured.
 */
export function paintedItem(item?: ItemDef, rarity?: string, refine = 0): HTMLElement {
  const e = item?.icon ? v3Icon(item.icon) : legacyItem(item, rarity);
  e.classList.add('rarity-' + (rarity ?? item?.rarity ?? 'common'));
  const grade = gradeOf(item);
  if (grade) { e.classList.add('graded'); e.dataset.grade = String(grade); }
  if (refine > 0) { e.classList.add('refined'); e.dataset.refine = String(Math.min(10, refine)); }
  return e;
}

/** The v2 atlas and system icons, for items whose v3 sheet is not generated yet. */
function legacyItem(item?: ItemDef, rarity?: string): HTMLElement {
  const name = item?.name.toLowerCase() ?? '';
  let cell = 35;
  let atlas: Atlas = 'item';
  const material = Number(item?.id.replace('itm_', ''));
  const sys = (key: string) => { atlas = 'system'; return SYSTEM_ICONS[key]; };
  if (material >= 1 && material <= 22) cell = material + 11;
  else if (item?.equip?.totem) cell = sys(item.equip.totem.type) ?? sys('fury');
  else if (item?.category === 'charm') cell = sys(item.equip?.unique || rarity === 'unique' ? 'unique_charm' : rarity === 'relic' ? 'relic' : 'charm');
  else if (item?.equip?.slot === 'gloves') { atlas = 'gear'; cell = GLOVES_ART[(item.equip.kind ?? 'armour').split('_')[0]] ?? 0; }
  else if (item?.equip?.slot === 'head') cell = sys('head');
  else if (item?.equip?.slot === 'accessory') cell = sys('accessory');
  else if (item?.equip) cell = item.equip.slot === 'boots' ? 4 : item.equip.slot === 'armor' ? 3 : /bow/.test(name) ? 1 : /rod|staff/.test(name) ? 2 : /gauntlet/.test(name) ? 33 : 0;
  else if (item?.use) cell = item.use.reset_stats ? 34 : /ration/.test(name) ? 9 : item.use.heal_sp_pct ? 7 : 6;
  else if (item?.category === 'quest') cell = 34;
  else {
    const families: [RegExp, number][] = [[/seed|husk|nut/,13],[/dust|powder|spore|mycelium/,14],[/fur|hide|pelt|cloth/,18],[/scale|shell|plate|gill/,20],[/fang|claw|spine|horn/,21],[/wing|feather|membrane/,24],[/sap|oil|gel|dew/,29],[/wood|root|bark/,30],[/gear|joint|cog|coil|spindle/,33],[/amber|crystal|shard|ore|gem|core/,10],[/moss|leaf|fiber/,12]];
    cell = families.find(([pattern]) => pattern.test(name))?.[1] ?? 35;
  }
  return paintedIcon(cell, atlas);
}
