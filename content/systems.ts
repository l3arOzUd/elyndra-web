// Character systems from CHARACTER_SYSTEMS.md: stats, caps, gear bases,
// affixes, Charms, Totems and skill ranks. build.ts writes the rules to
// public/data/systems.json (read by the server and the client) and the gear
// bases into items.json. Numbers marked ⚙️ in the design doc live here.

import type {
  DefenseKind, GearSlot, ItemDef, StatId, SystemsDef, AffixDef, CharmTypeDef, TotemTypeDef,
} from "../src/data/schema";
import { TIER_LEVELS, defenseSet, materialPrice, playerAt, weaponAttack } from "./model";

export const STATS: StatId[] = ["pow", "luk", "agi", "dex", "int", "vit"];

const RES_SLOTS: GearSlot[] = ["head", "armor", "boots", "accessory"];
const T = (...v: number[]) => v;

/** CHARACTER_SYSTEMS.md §4.6-4.7. values[i] is the top of tier i+1. */
export const AFFIXES: AffixDef[] = [
  // prefixes
  { id: "inc_damage", kind: "prefix", label: "{v}% increased Damage", slots: ["weapon", "accessory"], values: T(4, 6, 8, 11, 14, 17, 20) },
  { id: "crit_mult", kind: "prefix", label: "+{v}% Critical Damage", slots: ["weapon", "accessory"], values: T(5, 8, 11, 15, 19, 24, 30) },
  { id: "inc_area", kind: "prefix", label: "{v}% increased Area of Effect", slots: ["weapon", "head"], values: T(4, 6, 8, 11, 14, 18, 22) },
  { id: "inc_duration", kind: "prefix", label: "{v}% increased Skill Duration", slots: ["head", "accessory"], values: T(5, 8, 11, 14, 17, 21, 25) },
  { id: "inc_local_defense", kind: "prefix", label: "{v}% increased Armour, Evasion and Shield of this item", slots: ["head", "armor", "boots"], values: T(15, 22, 30, 38, 46, 55, 65) },
  { id: "flat_hp", kind: "prefix", label: "+{v} Max HP", slots: ["head", "armor", "boots", "accessory"], values: T(15, 40, 80, 140, 220, 320, 450) },
  { id: "inc_hp", kind: "prefix", label: "{v}% increased Max HP", slots: ["armor", "accessory"], values: T(3, 4, 6, 8, 10, 12, 15) },
  { id: "leech", kind: "prefix", label: "{v}% of Damage leeched as HP", slots: ["weapon", "accessory"], values: T(0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6) },
  // suffixes
  ...STATS.map((s): AffixDef => ({ id: `stat_${s}`, kind: "suffix", label: `+{v} ${s.toUpperCase()}`, slots: ["weapon", "head", "armor", "boots", "accessory"], values: T(2, 4, 7, 10, 13, 16, 20) })),
  { id: "inc_crit", kind: "suffix", label: "{v}% increased Critical Chance", slots: ["weapon", "head", "accessory"], values: T(10, 20, 30, 40, 55, 70, 85) },
  { id: "inc_cdr", kind: "suffix", label: "{v}% increased Cooldown Recovery", slots: ["head", "accessory"], values: T(5, 8, 11, 14, 17, 21, 25) },
  { id: "inc_cast", kind: "suffix", label: "{v}% increased Cast Speed", slots: ["weapon", "head"], values: T(5, 8, 11, 14, 17, 21, 25) },
  { id: "inc_attack_speed", kind: "suffix", label: "{v}% increased Attack Speed", slots: ["weapon", "accessory"], values: T(3, 5, 7, 9, 11, 13, 15) },
  ...(["fire", "cold", "nature", "shadow"] as const).map((g): AffixDef => ({ id: `res_${g}`, kind: "suffix", label: `+{v}% ${g[0].toUpperCase() + g.slice(1)} Resistance`, slots: RES_SLOTS, values: T(8, 12, 16, 20, 25, 30, 36) })),
  { id: "res_all", kind: "suffix", label: "+{v}% to all Resistances", slots: ["accessory"], values: T(3, 5, 7, 9, 11, 13, 15), weight: 0.3 },
  { id: "hp_on_kill", kind: "suffix", label: "Kills restore {v}% of Max HP", slots: ["weapon", "armor", "accessory"], values: T(0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4) },
  { id: "sp_on_kill", kind: "suffix", label: "Kills restore {v} SP", slots: ["weapon", "head", "accessory"], values: T(1, 1, 2, 2, 3, 3, 4) },
  { id: "hp_regen", kind: "suffix", label: "Regenerate {v}% of Max HP per second", slots: ["armor", "accessory"], values: T(0.2, 0.3, 0.4, 0.6, 0.8, 1.0, 1.2) },
  { id: "inc_poise", kind: "suffix", label: "{v}% increased Poise", slots: ["armor", "accessory"], values: T(8, 12, 16, 20, 25, 30, 35) },
  { id: "inc_shield_recharge", kind: "suffix", label: "{v}% faster Aether Shield recharge", slots: ["armor", "accessory"], values: T(10, 15, 20, 27, 34, 42, 50) },
  { id: "inc_move_speed", kind: "suffix", label: "{v}% increased Movement Speed", slots: ["boots"], values: T(5, 7, 9, 11, 13, 16, 20) },
  { id: "magnet", kind: "suffix", label: "+{v} cells loot pickup radius", slots: ["boots", "accessory"], values: T(1, 1, 2, 2, 2, 3, 3) },
  { id: "grip", kind: "suffix", label: "{v}% increased monster aggro radius", slots: ["armor", "accessory"], values: T(8, 12, 16, 20, 25, 30, 35) },
];

/** Affix ids that only Charms, Totems and uniques grant (labels for the UI). */
export const EXTRA_LABELS: Record<string, string> = {
  inc_sp_regen: "{v}% increased SP regeneration",
  inc_defense: "{v}% increased Armour, Evasion and Aether Shield",
  more_damage: "{v}% more Damage",
  more_area: "{v}% more Area of Effect",
  flat_shield: "+{v} Aether Shield",
  inc_shield: "{v}% increased Aether Shield",
  cap_cdr: "Cooldown Recovery cap raised to {v}%",
  cap_cast: "Cast Speed cap raised to {v}%",
  cap_crit: "Critical Chance cap raised to {v}%",
  cap_poise: "Poise cap raised to {v}%",
  cap_leech: "Leech rate cap raised to {v}% of Max HP per second",
  cap_evasion: "Evasion cap raised to {v}%",
  cap_res_fire: "Fire Resistance cap raised to {v}%",
  cap_res_cold: "Cold Resistance cap raised to {v}%",
  cap_res_nature: "Nature Resistance cap raised to {v}%",
  cap_res_shadow: "Shadow Resistance cap raised to {v}%",
  totem_duration: "{v}% increased Totem duration",
  totem_charges: "Totem needs {v}% fewer charges",
  totem_effect: "{v}% increased Totem effect",
  totem_boss_charges: "Elites and bosses give double Totem charges",
  totem_res_all: "+{v}% to all Resistances while active",
  totem_leech: "{v}% of Damage leeched as HP while active",
  totem_move: "{v}% increased Movement Speed while active",
  totem_poise: "{v}% increased Poise while active",
  totem_heal: "Restores {v}% of Max HP when used",
  totem_auto: "Used automatically when fully charged",
};

/** Charm main effects (§5.2): values for Lesser / Greater / Grand. */
export const CHARM_TYPES: CharmTypeDef[] = [
  { id: "fang", name: "Fang", effects: [["inc_damage", [5, 9, 14]]], elements: ["fire"] },
  { id: "clover", name: "Clover", effects: [["inc_crit", [15, 30, 45]]], elements: ["fire"] },
  { id: "razor", name: "Razor", effects: [["crit_mult", [6, 12, 20]]], elements: ["fire", "shadow"] },
  { id: "hourglass", name: "Hourglass", effects: [["inc_cdr", [5, 9, 14]]], elements: ["wind"] },
  { id: "quill", name: "Quill", effects: [["inc_cast", [5, 9, 14]]], elements: ["water", "ice"] },
  { id: "tempo", name: "Tempo", effects: [["inc_attack_speed", [4, 7, 10]]], elements: ["wind"] },
  { id: "expanse", name: "Expanse", effects: [["inc_area", [5, 9, 14]]], elements: ["earth", "shadow"] },
  { id: "viper", name: "Viper", effects: [["leech", [0.3, 0.6, 1.0]]], elements: ["nature"] },
  { id: "wellspring", name: "Wellspring", effects: [["sp_on_kill", [1, 2, 3]], ["inc_sp_regen", [5, 10, 15]]], elements: ["water", "ice"] },
  { id: "heart", name: "Heart", effects: [["inc_hp", [3, 6, 9]]], elements: ["earth", "nature"] },
  { id: "bastion", name: "Bastion", effects: [["inc_defense", [10, 20, 30]]], elements: ["earth"] },
  { id: "prism", name: "Prism", effects: [["res_all", [4, 7, 10]]], elements: ["ice"] },
  ...STATS.map((s): CharmTypeDef => ({ id: `sigil_${s}`, name: `Sigil of ${s.toUpperCase()}`, effects: [[`stat_${s}`, [5, 10, 15]]], elements: [] })),
];

/** Relic Charm cap affixes (§5.4): three grades, rolled 70/25/5. */
export const RELIC_CAPS: { id: string; values: number[]; elements: string[] }[] = [
  { id: "cap_cdr", values: [50, 60, 70], elements: ["wind"] },
  { id: "cap_cast", values: [65, 75, 85], elements: ["water", "ice"] },
  { id: "cap_crit", values: [47, 53, 60], elements: ["fire"] },
  { id: "cap_poise", values: [60, 70, 80], elements: ["earth"] },
  { id: "cap_leech", values: [13, 17, 20], elements: ["nature"] },
  { id: "cap_evasion", values: [65, 70, 75], elements: ["wind"] },
  { id: "cap_res_fire", values: [78, 82, 85], elements: ["fire"] },
  { id: "cap_res_cold", values: [78, 82, 85], elements: ["water", "ice"] },
  { id: "cap_res_nature", values: [78, 82, 85], elements: ["earth", "nature", "wind"] },
  { id: "cap_res_shadow", values: [78, 82, 85], elements: ["shadow"] },
];

/** Totems (§5.6). Main values are the Grand grade; Lesser x0.6, Greater x0.8. */
export const TOTEM_TYPES: TotemTypeDef[] = [
  { id: "fury", name: "Fury", effects: { more_damage: 20 }, duration_ms: 6000, charges: 40, text: "{more_damage}% more Damage" },
  { id: "haste", name: "Haste", effects: { inc_cdr: 30, cap_cdr_bonus: 10 }, duration_ms: 6000, charges: 60, text: "{inc_cdr}% increased Cooldown Recovery; its cap +{cap_cdr_bonus}%" },
  { id: "focus", name: "Focus", effects: { inc_cast: 40, cap_cast_bonus: 10 }, duration_ms: 6000, charges: 60, text: "{inc_cast}% increased Cast Speed; its cap +{cap_cast_bonus}%" },
  { id: "precision", name: "Precision", effects: { flat_crit: 15, cap_crit_bonus: 5 }, duration_ms: 6000, charges: 50, text: "+{flat_crit}% Critical Chance; its cap +{cap_crit_bonus}%" },
  { id: "wildfire", name: "Wildfire", effects: { more_area: 30 }, duration_ms: 6000, charges: 50, text: "{more_area}% more Area of Effect" },
  { id: "bloodrush", name: "Bloodrush", effects: { leech: 3, leech_cap_mult: 2 }, duration_ms: 5000, charges: 50, text: "{leech}% of Damage leeched as HP; leech rate cap x{leech_cap_mult}" },
  { id: "surge", name: "Surge", effects: { sp_restore: 50, free_skills: 1 }, duration_ms: 3000, charges: 60, text: "Restores {sp_restore}% SP; skills cost no SP" },
  { id: "bulwark", name: "Bulwark", effects: { armour_mult: 2, poise: 100 }, duration_ms: 5000, charges: 50, text: "Armour x{armour_mult}; casts cannot be pushed back" },
  { id: "aegis", name: "Aegis", effects: { temp_shield: 30 }, duration_ms: 8000, charges: 40, text: "Gain a {temp_shield}% of Max HP Aether Shield" },
  { id: "mending", name: "Mending", effects: { heal: 40 }, duration_ms: 0, charges: 30, text: "Restores {heal}% of Max HP" },
  { id: "gale", name: "Gale", effects: { inc_move_speed: 30, grip: 50 }, duration_ms: 8000, charges: 30, text: "{inc_move_speed}% increased Movement Speed; {grip}% increased aggro radius" },
  { id: "hunt", name: "the Hunt", effects: { exp_bonus: 20, spawn_rate: 50 }, duration_ms: 30000, charges: 80, text: "{exp_bonus}% more EXP; monsters on the map respawn {spawn_rate}% faster" },
];

/**
 * Echo Totems (CHARACTER_SYSTEMS.md §5.7): each casts the skill the player
 * links to it, free, after a count of kills, of hits landed, or of hits taken
 * (evaded hits included). Counts are the Grand grade's.
 */
export const ECHO_TYPES: TotemTypeDef[] = [
  { id: "echo_slaughter", name: "Echo of Slaughter", trigger: "kills", effects: { echo_damage: 80 }, duration_ms: 0, charges: 40, text: "Casts its linked skill for {echo_damage}% damage" },
  { id: "echo_fury", name: "Echo of Fury", trigger: "hits", effects: { echo_damage: 80 }, duration_ms: 0, charges: 100, text: "Casts its linked skill for {echo_damage}% damage" },
  { id: "echo_spite", name: "Echo of Spite", trigger: "taken", effects: { echo_damage: 80 }, duration_ms: 0, charges: 40, text: "Casts its linked skill for {echo_damage}% damage" },
];

/** Totem affixes: values for tiers 1-4 (Lesser to T2, Greater T3, Grand T4). */
export const TOTEM_AFFIXES: AffixDef[] = [
  { id: "totem_duration", kind: "suffix", label: EXTRA_LABELS.totem_duration, slots: ["charm"], values: T(10, 20, 30, 40) },
  { id: "totem_charges", kind: "suffix", label: EXTRA_LABELS.totem_charges, slots: ["charm"], values: T(8, 15, 20, 25) },
  { id: "totem_effect", kind: "suffix", label: EXTRA_LABELS.totem_effect, slots: ["charm"], values: T(10, 15, 20, 30) },
  { id: "totem_boss_charges", kind: "suffix", label: EXTRA_LABELS.totem_boss_charges, slots: ["charm"], values: T(1, 1, 1, 1) },
  { id: "totem_res_all", kind: "suffix", label: EXTRA_LABELS.totem_res_all, slots: ["charm"], values: T(8, 12, 16, 20) },
  { id: "totem_leech", kind: "suffix", label: EXTRA_LABELS.totem_leech, slots: ["charm"], values: T(0.5, 0.8, 1.2, 1.5) },
  { id: "totem_move", kind: "suffix", label: EXTRA_LABELS.totem_move, slots: ["charm"], values: T(8, 12, 16, 20) },
  { id: "totem_poise", kind: "suffix", label: EXTRA_LABELS.totem_poise, slots: ["charm"], values: T(15, 25, 35, 45) },
  { id: "totem_heal", kind: "suffix", label: EXTRA_LABELS.totem_heal, slots: ["charm"], values: T(5, 10, 15, 20) },
  { id: "totem_auto", kind: "suffix", label: EXTRA_LABELS.totem_auto, slots: ["charm"], values: T(1, 1, 1, 1), weight: 0.2 },
];

export const SYSTEMS_RULES: SystemsDef["rules"] = {
  stat_points_per_level: 3,
  free_reset_level: 20,
  pow_weapon_pct: 1,
  luk_crit: 0.2,
  luk_crit_mult: 0.4,
  base_crit: 5,
  base_crit_mult: 150,
  agi_cdr_k: 150,
  agi_attack_speed: 0.4,
  ultimate_cooldown_ms: 30000,
  dex_cast_k: 150,
  dex_evasion: 2,
  int_sp: 2,
  int_sp_regen: 0.5,
  int_shield: 0.2,
  int_duration: 0.5,
  vit_hp: 0.5,
  vit_poise_k: 100,
  basic_attack_ms: 800,
  basic_attack_min_ms: 400,
  basic_targets: 3,
  basic_cone_deg: 90,
  basic_range: 1.5,
  basic_sp_pct: 2,
  cast_pushback_pct: 10,
  cast_pushback_max_pct: 50,
  shield_delay_ms: 2500,
  shield_recharge_pct: 30,
  evasion_level_k: 10,
  evasion_base: 100,
  evasion_swarm_free: 3,
  evasion_swarm_penalty: 8,
  evasion_swarm_floor: 0.5,
  evasion_still_ms: 1000,
  armour_k: 5,
  caps: {
    crit: [40, 60], cdr: [40, 70], cast: [55, 85], poise: [50, 80], evasion: [60, 75], armour: [90, 90],
    res: [75, 85], leech: [10, 20], sp_leech: [10, 10], attack_speed_ms: [400, 400],
  },
};

export const MASTERY: SystemsDef["mastery"] = {
  max_rank: 10,
  /** Kills to reach rank r: per_rank * (r-1)^2. */
  per_rank: 200,
  level_window: 10,
  elite_kills: 5,
  boss_kills: 20,
  more_damage_per_rank: 4,
  sp_cost_rank: 4,
  sp_cost_cut: 10,
  area_rank: 7,
  area_inc: 15,
  basic_more_per_rank: 3,
  basic_extra_target_rank: 5,
  basic_sp_rank: 10,
  basic_sp_pct: 3,
  perks: {
    cleaving_arc: "Cone widens from 100° to 140°",
    iron_cyclone: "A second spin follows at once for 50% damage",
    anchor_shout: "Taunted monsters take 10% more damage for 4s",
    sundering_pulse: "Hitting 30 or more targets refunds 25% SP",
  },
};

export const DROPS: SystemsDef["drops"] = {
  gear_bp: 60,
  charm_bp: 12,
  totem_bp: 8,
  elite_mult: 8,
  boss_gear: 2,
  boss_charm_bp: 3000,
  boss_totem_bp: 2000,
  own_job_weapon: 0.7,
  gear_rarity: { normal: 7000, magic: 2500, rare: 500 },
  charm_rarity: { normal: 6000, magic: 3000, rare: 900, relic: 80, unique: 20 },
  totem_rarity: { normal: 6000, magic: 3000, rare: 1000 },
  relic_grade: [70, 25, 5],
  rare_four_affixes: 0.35,
  tier_min_level: [1, 10, 25, 40, 55, 70, 85],
  tier_weight: [1000, 900, 800, 650, 500, 350, 200],
  charm_tiers: [3, 5, 7],
  totem_tiers: [2, 3, 4],
  charm_affix_scale: 0.6,
  element_charm_share: 0.5,
};

// --- gear bases -------------------------------------------------------------

const TIER_NAMES = ["Worn", "Bronze", "Iron", "Steel", "Cobalt", "Runic", "Mythril", "Ember", "Star", "Sovereign"];
const JOBS: Record<string, string> = { vanguard: "Saber", strider: "Bow", arcanist: "Rod", machinist: "Gauntlet" };
const KINDS: DefenseKind[] = ["armour", "evasion", "shield", "armour_evasion", "armour_shield", "evasion_shield"];
const NOUNS: Record<"head" | "armor" | "boots", Record<DefenseKind, string>> = {
  armor: { armour: "Plate", evasion: "Leathers", shield: "Robe", armour_evasion: "Brigandine", armour_shield: "Runeplate", evasion_shield: "Duskcloak" },
  head: { armour: "Helm", evasion: "Hood", shield: "Circlet", armour_evasion: "Sallet", armour_shield: "Warcrown", evasion_shield: "Mask" },
  boots: { armour: "Sabatons", evasion: "Boots", shield: "Slippers", armour_evasion: "Greaves", armour_shield: "Warboots", evasion_shield: "Treads" },
};
const SLOT_SHARE = { head: 0.3, armor: 0.5, boots: 0.2 } as const;
const GRADES = ["Lesser", "Greater", "Grand"];
export const GRADE_LEVELS = [10, 35, 60];

/** A whole pure Aether Shield set at item level L. */
export const shieldSet = (itemLevel: number) => Math.round(playerAt(itemLevel).max_hp * 0.25);

/** Base defenses of one armour piece. */
export function pieceDefense(slot: "head" | "armor" | "boots", kind: DefenseKind, itemLevel: number) {
  const parts = kind.split("_");
  const f = SLOT_SHARE[slot] * (parts.length === 2 ? 0.6 : 1);
  const out: { armour?: number; evasion?: number; shield?: number } = {};
  if (parts.includes("armour")) out.armour = Math.max(1, Math.round(defenseSet(itemLevel) * f));
  if (parts.includes("evasion")) out.evasion = Math.max(1, Math.round(defenseSet(itemLevel) * f));
  if (parts.includes("shield")) out.shield = Math.max(1, Math.round(shieldSet(itemLevel) * f));
  return out;
}

/** Stat requirement of an armour kind: pure = item level - 1, hybrids half each. */
export function kindRequirement(kind: DefenseKind, itemLevel: number): Partial<Record<StatId, number>> {
  const parts = kind.split("_");
  const need = Math.floor((itemLevel - 1) / parts.length);
  const stat: Record<string, StatId> = { armour: "vit", evasion: "dex", shield: "int" };
  return Object.fromEntries(parts.map((p) => [stat[p], need]).filter(([, n]) => (n as number) > 0));
}

const price = (itemLevel: number, f: number) => Math.round(materialPrice(itemLevel) * f);

/** Every generated base: ids itm_1000 onward, in a fixed order. */
export function gearItems(): ItemDef[] {
  const out: ItemDef[] = [];
  let n = 1000;
  const id = () => `itm_${n++}`;
  out.push({
    id: id(), name: "Reset Scroll", category: "consumable", rarity: "uncommon", sell_price: 50, stack_max: 99,
    description: "Returns every stat point to be spent again.", use: { reset_stats: true, cooldown_ms: 1000 },
  });
  TIER_LEVELS.forEach((il, t) => {
    for (const [job, noun] of Object.entries(JOBS)) out.push({
      id: id(), name: `${TIER_NAMES[t]} ${noun}`, category: "equipment", rarity: "common", sell_price: price(il, 14), stack_max: 1,
      description: `A tier ${t + 1} ${noun.toLowerCase()} for a ${job[0].toUpperCase() + job.slice(1)}.`, drop_pool: true,
      equip: { slot: "weapon", job, item_level: il, min_level: il, attack: weaponAttack(il) },
    });
    for (const slot of ["head", "armor", "boots"] as const) for (const kind of KINDS) out.push({
      id: id(), name: `${TIER_NAMES[t]} ${NOUNS[slot][kind]}`, category: "equipment", rarity: "common",
      sell_price: price(il, slot === "armor" ? 10 : slot === "head" ? 7 : 6), stack_max: 1,
      description: `Tier ${t + 1} ${slot === "armor" ? "body armour" : slot === "head" ? "headgear" : "footwear"} (${kind.split("_").map((k) => k === "shield" ? "Aether Shield" : k[0].toUpperCase() + k.slice(1)).join(" + ")}).`, drop_pool: true,
      equip: { slot, kind, item_level: il, min_level: il, ...pieceDefense(slot, kind, il), req: kindRequirement(kind, il) },
    });
    out.push({
      id: id(), name: `${TIER_NAMES[t]} Talisman`, category: "equipment", rarity: "common", sell_price: price(il, 8), stack_max: 1,
      description: `A tier ${t + 1} talisman. Its own ward resists every element a little.`, drop_pool: true,
      equip: { slot: "accessory", item_level: il, min_level: il, implicit: [["res_all", 2 + t]] },
    });
  });
  CHARM_TYPES.forEach((c) => GRADES.forEach((g, i) => out.push({
    id: id(), name: c.id.startsWith("sigil_") ? `${g} ${c.name}` : `${g} ${c.name} Charm`, category: "charm", rarity: "common",
    sell_price: price(GRADE_LEVELS[i], 10 * (i + 1)), stack_max: 1, description: "A charm worn in a Charm slot.", drop_pool: true,
    equip: { slot: "charm", item_level: GRADE_LEVELS[i], min_level: GRADE_LEVELS[i], charm: { type: c.id, grade: i + 1 } },
  })));
  TOTEM_TYPES.forEach((tt) => GRADES.forEach((g, i) => out.push({
    id: id(), name: `${g} Totem of ${tt.name}`, category: "totem", rarity: "common",
    sell_price: price(GRADE_LEVELS[i], 10 * (i + 1)), stack_max: 1, description: "Fills with charges as you kill; use it from a Charm slot.", drop_pool: true,
    equip: { slot: "charm", item_level: GRADE_LEVELS[i], min_level: GRADE_LEVELS[i], totem: { type: tt.id, grade: i + 1 } },
  })));
  // Uniques (§4.8, §5.5): fixed affixes and one special rule each.
  const uniques: ItemDef[] = [
    { id: "", name: "Hollowroot Crown", category: "equipment", rarity: "epic", sell_price: price(20, 40), stack_max: 1,
      description: "A skill that kills 20 or more at once takes 1s off your other cooldowns.",
      equip: { slot: "head", kind: "armour", item_level: 20, min_level: 18, ...pieceDefense("head", "armour", 20), implicit: [["inc_area", 15], ["stat_vit", 10]], unique: "hollowroot_crown" } },
    { id: "", name: "Emberwake Treads", category: "equipment", rarity: "epic", sell_price: price(60, 40), stack_max: 1,
      description: "While you run you leave fire behind: 20% of your ATK per second to monsters you pass. Standing still, nothing.",
      equip: { slot: "boots", kind: "evasion", item_level: 60, min_level: 58, ...pieceDefense("boots", "evasion", 60), implicit: [["inc_move_speed", 15]], unique: "emberwake_treads" } },
    { id: "", name: "Lattice Heart", category: "equipment", rarity: "epic", sell_price: price(90, 40), stack_max: 1,
      description: "Each kill restores 1% of your Aether Shield.",
      equip: { slot: "accessory", item_level: 90, min_level: 88, implicit: [["stat_int", 25], ["inc_shield", 30]], unique: "lattice_heart" } },
    { id: "", name: "Harvester's Knot", category: "charm", rarity: "epic", sell_price: price(30, 30), stack_max: 1,
      description: "40% more Area of Effect, 15% less Damage.",
      equip: { slot: "charm", item_level: 30, min_level: 30, implicit: [["more_area", 40], ["more_damage", -15]], unique: "harvesters_knot" } },
    { id: "", name: "Brawler's Oath", category: "charm", rarity: "epic", sell_price: price(30, 30), stack_max: 1,
      description: "Basic attacks hit everything within 2 cells for 50% more damage. Skill cooldowns are doubled.",
      equip: { slot: "charm", item_level: 30, min_level: 30, unique: "brawlers_oath" } },
    { id: "", name: "Aether Conduit", category: "charm", rarity: "epic", sell_price: price(30, 30), stack_max: 1,
      description: "30% of your Max HP becomes Aether Shield. -20% Shadow Resistance.",
      equip: { slot: "charm", item_level: 30, min_level: 30, implicit: [["res_shadow", -20]], unique: "aether_conduit" } },
    { id: "", name: "Blood Pact", category: "charm", rarity: "epic", sell_price: price(30, 30), stack_max: 1,
      description: "Your leech rate cap is doubled. You no longer regenerate HP over time.",
      equip: { slot: "charm", item_level: 30, min_level: 30, unique: "blood_pact" } },
    { id: "", name: "Lodestone", category: "charm", rarity: "epic", sell_price: price(30, 30), stack_max: 1,
      description: "Monsters notice you from twice as far. 10% reduced Movement Speed.",
      equip: { slot: "charm", item_level: 30, min_level: 30, implicit: [["grip", 100], ["inc_move_speed", -10]], unique: "lodestone" } },
    { id: "", name: "Glass Ember", category: "charm", rarity: "epic", sell_price: price(30, 30), stack_max: 1,
      description: "+60% Critical Damage. 20% reduced Max HP.",
      equip: { slot: "charm", item_level: 30, min_level: 30, implicit: [["crit_mult", 60], ["inc_hp", -20]], unique: "glass_ember" } },
  ];
  for (const u of uniques) out.push({ ...u, id: id() });
  // Echo Totems come last so the ids above never move.
  ECHO_TYPES.forEach((tt) => GRADES.forEach((g, i) => out.push({
    id: id(), name: `${g} ${tt.name}`, category: "totem", rarity: "common",
    sell_price: price(GRADE_LEVELS[i], 12 * (i + 1)), stack_max: 1, drop_pool: true,
    description: "Wear it in a Charm slot and link a skill to it: the skill casts itself, free, whenever the count fills.",
    equip: { slot: "charm", item_level: GRADE_LEVELS[i], min_level: GRADE_LEVELS[i], totem: { type: tt.id, grade: i + 1 } },
  })));
  return out;
}

/** Which boss drops which unique (rate in basis points). */
export const UNIQUE_DROPS: { boss: string; item: string; rate_bp: number }[] = [
  { boss: "Hollowroot Warden", item: "Hollowroot Crown", rate_bp: 1500 },
  { boss: "Kiln Prime", item: "Emberwake Treads", rate_bp: 1500 },
  { boss: "Lattice Sovereign", item: "Lattice Heart", rate_bp: 1500 },
  { boss: "Heartwood Regent", item: "Harvester's Knot", rate_bp: 800 },
  { boss: "Heliostat Sovereign", item: "Brawler's Oath", rate_bp: 800 },
  { boss: "Drowned Signalmind", item: "Aether Conduit", rate_bp: 800 },
  { boss: "Cryocore Curator", item: "Blood Pact", rate_bp: 800 },
  { boss: "Kiln Prime", item: "Lodestone", rate_bp: 800 },
  { boss: "Lattice Sovereign", item: "Glass Ember", rate_bp: 800 },
];

export function systems(): SystemsDef {
  return {
    rules: SYSTEMS_RULES, mastery: MASTERY, drops: DROPS, affixes: AFFIXES, totem_affixes: TOTEM_AFFIXES,
    labels: EXTRA_LABELS, charm_types: CHARM_TYPES, relic_caps: RELIC_CAPS, totem_types: [...TOTEM_TYPES, ...ECHO_TYPES],
    charm_slot_levels: [10, 30, 60],
    echo: { grade_charges: [1.5, 1.2, 1], ultimate_mult: 2, affixes: ["totem_charges", "totem_effect", "totem_boss_charges", "totem_heal"] },
    starter_weapons: {},
  };
}
