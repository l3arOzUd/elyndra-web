import type { RegionDesign } from './types';
import { DROP, ELITE_DROP_MULT } from './model';

/** Production art budget: 30 field species (including two bosses), 10 dungeon species. */
export const WORLD_ROSTER: Record<string, string[]> = {
  lum_fld_01: ['Mosskin', 'Sporeling', 'Ambermite'],
  lum_fld_02: ['Brookfin', 'Reedstalker', 'Rotroot'],
  ver_fld_01: ['Dustwing', 'Craglet', 'Thornback'],
  ver_fld_02: ['Lunari', 'Graftling', 'Sapdrone'],
  sol_fld_01: ['Sun Warden', 'Dust Revenant', 'Prism Wisp'],
  tha_fld_01: ['Pearl Skate', 'Thunderhull Turtle', 'Squall Ray'],
  cry_fld_01: ['Frost Mite', 'Cryo Sentry', 'Drowned Signalmind'],
  emb_fld_01: ['Vent Skink', 'Furnace Knight', 'Rivet Scrapling'],
  noc_fld_01: ['Riftling', 'Lattice Drone', 'Kiln Prime'],
  noc_fld_02: ['Array Sentinel', 'Meridian Executor', 'Glyph Swarm'],
  lum_dun_01: ['Barkwarden', 'Hollowroot Warden'],
  ver_dun_01: ['Spore Matron', 'Heartwood Regent'],
  sol_dun_01: ['Vault Mirrorguard', 'Heliostat Sovereign'],
  cry_dun_01: ['Archive Specter', 'Cryocore Curator'],
  noc_dun_01: ['Lattice Weaver', 'Lattice Sovereign'],
};

/** Existing paintings reused without changing stable monster IDs or boss story names. */
export const EXISTING_ART: Record<string, string> = {
  'Hollowroot Warden': 'aether_treant_2d',
  'Spore Matron': 'terrabloom_2d',
  'Dust Revenant': 'aether_wraith_2d',
  'Prism Wisp': 'gust_wisp_2d',
  'Squall Ray': 'sky_manta_2d',
  'Frost Mite': 'crystal_mite_2d',
  'Sun Warden': 'ruin_golem_2d',
  'Rivet Scrapling': 'gearling_2d',
};

/** Compact after the authored world/recipes are built: layout and spawn density stay intact.
 * Retired definitions remain in region source files as an archive, never in runtime data.
 * Replacement is local to the old home, including when an existing painting moves east.
 */
export function compactRoster(source: RegionDesign[]): RegionDesign[] {
  const regions = structuredClone(source);
  const all = regions.flatMap(r => r.monsters);
  const byName = new Map(all.map(m => [m.name, m]));
  const byId = new Map(all.map(m => [m.id, m]));
  const original = new Map(all.map(m => [m.id, structuredClone(m)]));
  const replacement = new Map<string, string>();
  const active = new Set<string>();
  const pools = new Map<string, Map<string, number>>();
  const home = new Map<string, string>();
  const maps = regions.flatMap(r => r.maps);
  const population = new Map<string, number>();
  for (const map of maps) for (const p of map.pockets) {
    const total = p.species.reduce((sum, s) => sum + s.weight, 0);
    for (const s of p.species) population.set(s.monster_id, (population.get(s.monster_id) ?? 0) + p.target_alive * s.weight / total);
  }
  for (const map of maps) {
    if (map.type === 'town') continue;
    const names = WORLD_ROSTER[map.id];
    if (!names) throw new Error(`Missing compact roster: ${map.id}`);
    const selected = names.map(name => {
      const m = byName.get(name);
      if (!m) throw new Error(`Unknown roster monster: ${name}`);
      if (active.has(m.id)) throw new Error(`Duplicate monster home: ${name}`);
      active.add(m.id); home.set(m.id, map.id); pools.set(m.id, new Map());
      return m;
    });
    const normal = selected.filter(m => m.archetype !== 'boss');
    normal.forEach((m, i) => {
      m.level = Math.floor(map.levels[0] + (map.levels[1] - map.levels[0]) * (normal.length === 1 ? 0.5 : i / (normal.length - 1)));
      // Starter packs precede a complete skill kit; reserve Lv8 for the hard pull.
      if (map.id === 'lum_fld_01') m.level = [1, 3, 8][i];
      if (m.name === 'Sporeling') {
        m.mods = { ...m.mods, hp: 0.75, atk: 0.65 };
        m.why = 'Starter training pack: fragile caps and mild spores allow large pulls before the full skill kit unlocks.';
      }
      // Former Gorged species now join full packs: no bounty HP/EXP multiplier.
      delete m.bounty;
      if (m.behavior === 'passive' || m.behavior === 'flee') m.behavior = 'assist';
    });
    const ids = [...new Set(map.pockets.flatMap(p => p.species.map(s => s.monster_id)))];
    const oldNormal = ids.filter(id => byId.get(id)!.archetype !== 'boss')
      .sort((a, b) => original.get(a)!.level - original.get(b)!.level);
    oldNormal.forEach((id, i) => replacement.set(id, normal[Math.min(normal.length - 1, Math.floor(i * normal.length / oldNormal.length))].id));
    for (const id of ids.filter(id => byId.get(id)!.archetype === 'boss')) {
      if (!selected.some(m => m.id === id)) throw new Error(`Boss removed: ${id}`);
      replacement.set(id, id);
    }
    for (const p of map.pockets) {
      const weights = new Map<string, number>();
      for (const s of p.species) {
        const id = replacement.get(s.monster_id)!;
        weights.set(id, (weights.get(id) ?? 0) + s.weight);
      }
      p.species = [...weights].map(([monster_id, weight]) => ({ monster_id, weight }));
      p.name = p.species.map(s => byId.get(s.monster_id)!.name).join(' / ');
      p.design_note = `${p.name} habitat in ${map.name}. Existing pack capacity and patrol ground retained.`;
    }
    map.role = `${map.name}: ${names.join(', ')}. ${selected.length} unique resident species.`;
  }
  // Preserve access at the OLD home/level band, weighted by the old resident
  // populations. Consolidating species must not multiply material income per pack.
  const replacementPopulation = new Map<string, number>();
  for (const [id, target] of replacement) replacementPopulation.set(target, (replacementPopulation.get(target) ?? 0) + population.get(id)!);
  for (const old of original.values()) {
    const target = replacement.get(old.id);
    if (!target) throw new Error(`No replacement for ${old.name}`);
    const pool = pools.get(target)!;
    const fraction = population.get(old.id)! / replacementPopulation.get(target)!;
    const mult = old.archetype === 'elite' ? ELITE_DROP_MULT : 1;
    const add = (id: string | undefined, rate: number) => { if (id) pool.set(id, (pool.get(id) ?? 0) + rate * fraction); };
    add(old.drops.common, Math.min(10000, DROP.common * mult)); add(old.drops.uncommon, Math.min(10000, DROP.uncommon * mult)); add(old.drops.rare, Math.min(10000, DROP.rare * mult));
    for (const e of old.drops.extra ?? []) add(e.item_id, e.rate_bp);
  }
  for (const id of active) {
    const m = byId.get(id)!, pool = pools.get(id)!;
    // Bosses stay at their original homes, with original rates and quantities.
    if (m.archetype === 'boss') {
      m.sprite = EXISTING_ART[m.name] ?? m.sprite;
      continue;
    }
    const entries = [...pool].sort((a, b) => b[1] - a[1]);
    if (entries.length < 2) throw new Error(`Insufficient loot pool: ${m.name}`);
    const preferred = original.get(id)!.drops;
    const common = pool.has(preferred.common) ? preferred.common : entries[0][0];
    const uncommon = pool.has(preferred.uncommon) && preferred.uncommon !== common ? preferred.uncommon : entries.find(([item]) => item !== common)![0];
    m.drops = { common, uncommon, extra: entries.filter(([item]) => item !== common && item !== uncommon).map(([item_id, rate_bp]) => ({ item_id, rate_bp })) };
    m.drop_table = entries.map(([item_id, rate]) => ({ item_id, rate_bp: Math.max(1, Math.round(rate)), min_qty: 1, max_qty: 1 }));
    m.sprite = EXISTING_ART[m.name] ?? m.sprite;
    m.ecology = `Resident of ${maps.find(map => map.id === home.get(id))!.name}. Gathers in packs; responds to nearby fighting.`;
  }
  const replaceNames = (text: string) => {
    const names = [...original.values()].sort((a, b) => b.name.length - a.name.length);
    const escaped = names.map(m => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const lookup = new Map(names.map(m => [m.name, byId.get(replacement.get(m.id)!)!.name]));
    return text.replace(new RegExp(`\\b(${escaped.join('|')})\\b`, 'g'), name => lookup.get(name)!);
  };
  for (const r of regions) {
    r.monsters = all.filter(m => active.has(m.id) && r.maps.some(map => map.id === home.get(m.id)));
    for (const q of r.quests) {
      for (const o of q.objectives) if (o.type === 'kill') o.monster_id = replacement.get(o.monster_id)!;
      q.title = replaceNames(q.title); q.summary = replaceNames(q.summary);
    }
    for (const d of r.dialogues) {
      d.lines = d.lines.map(replaceNames);
      for (const stage of d.stages ?? []) stage.lines = stage.lines.map(replaceNames);
      if (d.npc_id.endsWith('_scout')) {
        const map = maps.find(m => m.npcs.some(n => n.id === d.npc_id))!;
        const guide = `Local monsters: ${WORLD_ROSTER[map.id].map(n => `${n} (Lv ${byName.get(n)!.level})`).join(', ')}.`;
        d.lines[d.lines.length - 1] = guide;
        for (const stage of d.stages ?? []) stage.lines[stage.lines.length - 1] = guide;
      }
    }
  }
  return regions;
}
