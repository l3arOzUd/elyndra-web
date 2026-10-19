// ELYNDRA balance model v2.
//
// Every monster's HP / ATK / DEF / EXP and every material's price comes from
// here, from one reference player and per-archetype targets, adjusted by
// per-monster modifiers that the region files justify one by one. Change a
// target here and the whole world rebalances consistently; the validator
// then re-checks each monster against the same targets independently.

import type { Archetype, Behavior, PlayerCurveRow } from "../src/data/schema";

// --- the reference player -------------------------------------------------
// A Vanguard with no equipment, at level L. Gear (Lumeris crafts) adds about
// 10-15% on top; the curve is the floor the world is balanced on.

export function playerAt(level: number): PlayerCurveRow {
  const l = level - 1;
  return {
    level,
    max_hp: Math.round(120 + 26 * l + 0.9 * l * l),
    max_sp: Math.round(60 + 5 * l),
    attack: Math.round(18 + 4.2 * l + 0.045 * l * l),
    defense: Math.round(5 + 1.6 * l),
    exp_to_next: expToNext(level),
  };
}

// --- pacing ---------------------------------------------------------------
// Horde pacing: a player on a level-appropriate field kills
// killsPerMinute(L) swarm monsters a minute (fewer early, before AoE skills
// are unlocked) and should level in minutesPerLevel(L).

export const minutesPerLevel = (level: number) => 1.2 + 0.36 * level;
export const killsPerMinute = (level: number) => Math.min(70, 25 + 3 * level);
/** EXP of a plain swarm monster of this level: the unit everything else is priced in. */
export const swarmExp = (level: number) => Math.round(4 + 2.2 * Math.pow(level, 1.3));

export function expToNext(level: number): number {
  if (level >= 99) return 0;
  return Math.round(minutesPerLevel(level) * killsPerMinute(level) * swarmExp(level));
}

// --- monster archetypes ---------------------------------------------------
// hits:  basic attacks a same-level reference player needs (the AoE skills,
//        at 1.7x-4x, clear a swarm pack in two casts)
// def:   DEF as a share of that player's ATK
// dmg:   one hit as a share of that player's max HP, after his DEF. Swarm is
//        low because 8 of them can stand around you at once: 8 x 1.2% per
//        1.6s is ~6% HP/s, survivable for the 4-6s a pack lasts.
// exp:   EXP relative to a swarm monster of the same level.

export interface ArchetypeTargets {
  hits: number;
  def: number;
  dmg: number;
  attack_ms: number;
  move_ms: number;
  range: number;
  exp: number;
}

export const ARCHETYPES: Record<Archetype, ArchetypeTargets> = {
  swarm: { hits: 3.2, def: 0.1, dmg: 0.012, attack_ms: 1600, move_ms: 260, range: 1, exp: 1 },
  ranged: { hits: 2.6, def: 0.08, dmg: 0.02, attack_ms: 1800, move_ms: 280, range: 5, exp: 1 },
  support: { hits: 3.6, def: 0.1, dmg: 0.009, attack_ms: 2200, move_ms: 280, range: 4, exp: 1.15 },
  bruiser: { hits: 7, def: 0.15, dmg: 0.035, attack_ms: 2000, move_ms: 300, range: 1, exp: 2.3 },
  construct: { hits: 6.5, def: 0.25, dmg: 0.028, attack_ms: 1900, move_ms: 340, range: 1, exp: 2.2 },
  elite: { hits: 18, def: 0.2, dmg: 0.06, attack_ms: 1500, move_ms: 240, range: 1, exp: 6.5 },
  boss: { hits: 120, def: 0.25, dmg: 0.1, attack_ms: 1400, move_ms: 260, range: 2, exp: 45 },
};

export const AGGRO_RADIUS: Record<Behavior, number> = { passive: 0, flee: 0, assist: 6, aggressive: 7 };
export const LEASH_RADIUS = 35;

/** Per-monster departures from its archetype, each one argued in the region file. */
export interface StatMods {
  hp?: number;
  atk?: number;
  def?: number;
  /** >1 is slower (ms per cell is multiplied). */
  speed?: number;
  attack_speed?: number;
  range?: number;
}

export function monsterStats(level: number, archetype: Archetype, mods: StatMods = {}) {
  const p = playerAt(level);
  const a = ARCHETYPES[archetype];
  const defense = Math.round(p.attack * a.def * (mods.def ?? 1));
  const hp = Math.round(a.hits * (mods.hp ?? 1) * (p.attack - defense));
  const attack = Math.round(a.dmg * (mods.atk ?? 1) * p.max_hp + p.defense);
  const toughness = Math.sqrt((mods.hp ?? 1) * (mods.atk ?? 1));
  const base_exp = Math.max(1, Math.round(swarmExp(level) * a.exp * toughness));
  return {
    hp,
    attack,
    defense,
    attack_range: mods.range ?? a.range,
    attack_ms: Math.round(a.attack_ms * (mods.attack_speed ?? 1)),
    move_speed_ms: Math.round(a.move_ms * (mods.speed ?? 1)),
    base_exp,
    job_exp: Math.max(1, Math.round(base_exp * 0.62)),
  };
}

// --- loot and economy -----------------------------------------------------
// At ~60 kills a minute, RO-style 65% drops would hand out ~40 materials a
// minute. Horde rates are lower per kill so an hour's haul stays meaningful:
//   common   18%   ~11 a minute     sells for materialPrice(L)
//   uncommon 4.5%  ~3 a minute      4.5x
//   rare     0.25% ~9 an hour       40x
// which pays ~1,700 x materialPrice(L) an hour from selling everything.

export const DROP = { common: 1800, uncommon: 450, rare: 25 } as const;
export const materialPrice = (level: number) => Math.round(2 + 0.9 * level);
export const uncommonPrice = (level: number) => Math.round(materialPrice(level) * 4.5);
export const rarePrice = (level: number) => Math.round(materialPrice(level) * 40);

/** Elite and boss kills are worth a pack: higher rates, more per roll. */
export const ELITE_DROP_MULT = 8;
export const BOSS_DROP = { common: 10000, uncommon: 6000, rare: 1500 } as const;

/** What a full sell-off of an hour's materials earns, for the report. */
export function hourlyIncome(level: number): number {
  const k = killsPerMinute(level) * 60;
  return Math.round(k * ((DROP.common / 1e4) * materialPrice(level) + (DROP.uncommon / 1e4) * uncommonPrice(level) + (DROP.rare / 1e4) * rarePrice(level)));
}

/** Shop prices scale with the region's starting level, so Lumeris stays cheap. */
export const regionPriceMult = (regionMinLevel: number) => 1 + regionMinLevel / 12;
