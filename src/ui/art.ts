import type { ItemDef } from '../data/schema';

type Atlas = 'item' | 'skill' | 'skill3' | 'system';
const COLUMNS: Record<Atlas, number> = { item: 6, skill: 2, skill3: 3, system: 6 };

/** Original painted atlases. Cells are rendered directly; source PNGs stay intact. */
export function paintedIcon(index: number, kind: Atlas = 'item'): HTMLElement {
  const e = document.createElement('span'), columns = COLUMNS[kind];
  e.className = 'painted-icon ' + (kind === 'skill' ? 'skill-art' : kind === 'skill3' ? 'skill3-art' : kind === 'system' ? 'system-art' : 'item-art');
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

/** An item's art; `rarity` (a gear copy's) picks the Relic and Unique Charm art. */
export function paintedItem(item?: ItemDef, rarity?: string): HTMLElement {
  const name = item?.name.toLowerCase() ?? '';
  let cell = 35;
  let atlas: Atlas = 'item';
  const material = Number(item?.id.replace('itm_', ''));
  const sys = (key: string) => { atlas = 'system'; return SYSTEM_ICONS[key]; };
  if (material >= 1 && material <= 22) cell = material + 11;
  else if (item?.equip?.totem) cell = sys(item.equip.totem.type) ?? sys('fury');
  else if (item?.category === 'charm') cell = sys(item.equip?.unique || rarity === 'unique' ? 'unique_charm' : rarity === 'relic' ? 'relic' : 'charm');
  else if (item?.equip?.slot === 'head') cell = sys('head');
  else if (item?.equip?.slot === 'accessory') cell = sys('accessory');
  else if (item?.equip) cell = item.equip.slot === 'boots' ? 4 : item.equip.slot === 'armor' ? 3 : /bow/.test(name) ? 1 : /rod|staff/.test(name) ? 2 : /gauntlet/.test(name) ? 33 : 0;
  else if (item?.use) cell = item.use.reset_stats ? 34 : /ration/.test(name) ? 9 : item.use.heal_sp_pct ? 7 : 6;
  else if (item?.category === 'quest') cell = 34;
  else {
    const families: [RegExp, number][] = [[/seed|husk|nut/,13],[/dust|powder|spore|mycelium/,14],[/fur|hide|pelt|cloth/,18],[/scale|shell|plate|gill/,20],[/fang|claw|spine|horn/,21],[/wing|feather|membrane/,24],[/sap|oil|gel|dew/,29],[/wood|root|bark/,30],[/gear|joint|cog|coil|spindle/,33],[/amber|crystal|shard|ore|gem|core/,10],[/moss|leaf|fiber/,12]];
    cell = families.find(([pattern]) => pattern.test(name))?.[1] ?? 35;
  }
  const e = paintedIcon(cell, atlas); e.classList.add('rarity-' + (rarity ?? item?.rarity ?? 'common'));
  const tint = gearTint(item);
  if (tint) e.style.filter = tint;
  return e;
}

/**
 * Generated gear shares a few drawings; tint them like their paper-doll
 * variants (scripts/paint-gear-variants.py): era by item level, then the
 * armour kind or the job.
 */
export function gearTint(item?: ItemDef): string {
  const eq = item?.equip;
  if (!eq || !item?.drop_pool || eq.slot === 'charm' || eq.slot === 'accessory') return '';
  const lv = eq.item_level ?? 1, parts: string[] = [];
  if (lv > 50) parts.push('hue-rotate(250deg) saturate(1.2)');
  else if (lv > 20) parts.push('saturate(.5) brightness(1.1)');
  const group = eq.slot === 'weapon' ? eq.job : (eq.kind ?? 'armour').split('_')[0];
  if (group === 'armour') parts.push('saturate(.4) brightness(1.08)');
  else if (group === 'shield') parts.push('hue-rotate(185deg)');
  else if (group === 'machinist') parts.push('hue-rotate(30deg) saturate(.8)');
  return parts.join(' ');
}
