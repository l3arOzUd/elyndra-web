import type { ClientContent } from '../data/content';
import type { ItemDef } from '../data/schema';
import type { GearView, SheetMsg } from '../net/protocol';

/** Text for gear copies, Charms and Totems (CHARACTER_SYSTEMS.md §4-5). */

export const RARITY_LABEL: Record<string, string> = { normal: 'Normal', magic: 'Magic', rare: 'Rare', relic: 'Relic', unique: 'Unique' };
export const SLOT_LABEL: Record<string, string> = {
  weapon: 'Weapon', head: 'Head', armor: 'Body armour', boots: 'Boots', accessory: 'Accessory', charm: 'Charm slot',
  charm1: 'Charm 1', charm2: 'Charm 2', charm3: 'Charm 3',
};
export const GEAR_SLOTS = ['weapon', 'head', 'armor', 'boots', 'accessory'] as const;
export const CHARM_SLOTS = ['charm1', 'charm2', 'charm3'] as const;
export const STAT_IDS = ['pow', 'luk', 'agi', 'dex', 'int', 'vit'] as const;
export const STAT_INFO: Record<string, { name: string; text: string }> = {
  pow: { name: 'POW', text: 'Weapon ATK +1% per point, for every weapon and skill.' },
  luk: { name: 'LUK', text: 'Critical chance +0.2% and critical damage +0.4% per point.' },
  agi: { name: 'AGI', text: 'Cooldown Recovery AGI/(AGI+150) and faster basic attacks.' },
  dex: { name: 'DEX', text: 'Cast Speed DEX/(DEX+150) and +2 Evasion per point. Worn by evasion armour.' },
  int: { name: 'INT', text: 'Max SP, SP regeneration, Aether Shield and skill duration. Worn by shield armour.' },
  vit: { name: 'VIT', text: 'Max HP +0.5% per point and Poise against cast pushback. Worn by Armour.' },
};

const fmt = (v: number) => (Math.abs(v) < 10 && v % 1 ? v.toFixed(2).replace(/0$/, '') : String(Math.round(v * 100) / 100));

/** "{v}% increased Damage" with the value filled in. */
export function affixText(c: ClientContent, id: string, v: number): string {
  const s = c.systems;
  const label = s.affixes.find((a) => a.id === id)?.label ?? s.totem_affixes.find((a) => a.id === id)?.label ?? s.labels[id] ?? id + ' {v}';
  if (v < 0 && label.startsWith('{v}% increased')) return label.replace('{v}% increased', fmt(-v) + '% reduced');
  return label.replace('{v}', fmt(v));
}

export const gearItem = (c: ClientContent, g: GearView) => c.items.get(g.base);

/** Name shown for a copy: its base's name. */
export const gearName = (c: ClientContent, g: GearView) => gearItem(c, g)?.name ?? g.base;

export function kindLabel(it?: ItemDef): string {
  if (!it?.equip) return it?.category ?? '';
  if (it.category === 'charm') return 'Charm';
  if (it.category === 'totem') return 'Totem';
  const kind = it.equip.kind ? ' · ' + it.equip.kind.split('_').map((k) => (k === 'shield' ? 'Aether Shield' : k[0].toUpperCase() + k.slice(1))).join(' + ') : '';
  return SLOT_LABEL[it.equip.slot] + kind;
}

/** The base numbers of a copy: ATK, defences (with its local increase), implicits, Charm/Totem effect. */
export function baseLines(c: ClientContent, it: ItemDef, g?: GearView): string[] {
  const e = it.equip!;
  const out: string[] = [];
  const local = 1 + (g?.affixes.filter(([id]) => id === 'inc_local_defense').reduce((s, [, , v]) => s + v, 0) ?? 0) / 100;
  if (e.attack) out.push('Weapon ATK ' + e.attack);
  if (e.armour) out.push('Armour ' + Math.round(e.armour * local));
  if (e.evasion) out.push('Evasion ' + Math.round(e.evasion * local));
  if (e.shield) out.push('Aether Shield ' + Math.round(e.shield * local));
  for (const [id, v] of e.implicit ?? []) out.push(affixText(c, id, v));
  if (e.charm) {
    const t = c.systems.charm_types.find((x) => x.id === e.charm!.type);
    for (const [id, vals] of t?.effects ?? []) out.push(affixText(c, id, vals[e.charm.grade - 1]));
  }
  if (e.totem) {
    const t = c.systems.totem_types.find((x) => x.id === e.totem!.type);
    if (t) {
      const scale = [0.6, 0.8, 1][e.totem.grade - 1] ?? 1;
      const noScale = new Set(['cap_cdr_bonus', 'cap_cast_bonus', 'cap_crit_bonus', 'armour_mult', 'leech_cap_mult', 'free_skills', 'poise']);
      out.push(t.text.replace(/\{(\w+)\}/g, (_, k) => fmt(noScale.has(k) ? t.effects[k] : Math.round(t.effects[k] * scale * 10) / 10)));
      out.push((t.duration_ms ? t.duration_ms / 1000 + 's · ' : 'Instant · ') + t.charges + ' kills to charge');
    }
  }
  return out;
}

/** Requirements as [text, met]. Gear bonuses do not count toward them (only allocated points). */
export function requirements(it: ItemDef, level: number, job: string | undefined, sheet: SheetMsg | null): [string, boolean][] {
  const e = it.equip!;
  const out: [string, boolean][] = [['Level ' + e.min_level, level >= e.min_level]];
  if (e.job) out.push([e.job[0].toUpperCase() + e.job.slice(1), !job || e.job === job]);
  for (const [stat, n] of Object.entries(e.req ?? {})) if (n) out.push([n + ' ' + stat.toUpperCase(), (sheet?.stats[stat] ?? 0) >= n]);
  return out;
}

/** Totals a copy adds, for the comparison with what is worn: ATK and defences. */
export function gearNumbers(it?: ItemDef, g?: GearView): Record<string, number> {
  if (!it?.equip) return {};
  const local = 1 + (g?.affixes.filter(([id]) => id === 'inc_local_defense').reduce((s, [, , v]) => s + v, 0) ?? 0) / 100;
  const out: Record<string, number> = {};
  if (it.equip.attack) out['Weapon ATK'] = it.equip.attack;
  if (it.equip.armour) out.Armour = Math.round(it.equip.armour * local);
  if (it.equip.evasion) out.Evasion = Math.round(it.equip.evasion * local);
  if (it.equip.shield) out['Aether Shield'] = Math.round(it.equip.shield * local);
  for (const [id, , v] of g?.affixes ?? []) if (id.startsWith('stat_')) out[id.slice(5).toUpperCase()] = (out[id.slice(5).toUpperCase()] ?? 0) + v;
  return out;
}
