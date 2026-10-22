// ELYNDRA content schema v2: the JSON under public/data that the web
// client, the Go server (elyndra-server/internal/content) and the data
// validator all read. Field names are snake_case to match the files.
//
// Coordinates are walk cells: x grows east, y grows south, (0,0) is the
// north-west corner. A rect is [x, y, w, h].

export type Rect = [number, number, number, number];
export type Point = [number, number];

export const SCHEMA_VERSION = 2;

export interface Constants {
  schema_version: number;
  drop_rate_denominator: number;
  server_tick_ms: number;
  snapshot_ms: number;
  coordinates: "grid_cells";
  player_base_ms_per_cell: number;
  pickup_radius_cells: number;
  npc_interact_radius_cells: number;
  loot_expire_sec: number;
  respawn_town_by_region: Record<string, string>;
}

export interface RegionDef {
  id: string;
  name: string;
  capital: string;
  town_map_id: string;
  dungeon_map_id: string;
  level_range: [number, number];
  theme: string;
  ecology: string;
  palette: { grass: string; dirt: string; accent: string; fog: string };
}

export type MapType = "town" | "field" | "dungeon";

export interface MapDef {
  id: string;
  region_id: string;
  name: string;
  type: MapType;
  /** What the map is for, in one line (designers' intent). */
  role: string;
  recommended_level_min: number;
  recommended_level_max: number;
  width_cells: number;
  height_cells: number;
  /** The whole map is a no-combat zone (towns). */
  safe_zone: boolean;
  /** maps/<id>.json */
  layout: string;
  /** Where teleports and respawns put you; inside a safe area. */
  arrival: Point;
  /** Live monster population rules; null where nothing spawns. */
  horde: { min_alive: number; max_alive: number } | null;
}

export type BlockerKind = "forest" | "cliff" | "rock" | "ruin_wall" | "building" | "fence" | "water" | "lava" | "chasm" | "ice" | "crystal" | "machine";

export type Shape =
  | { rect: Rect }
  | { ellipse: [number, number, number, number] } // cx, cy, rx, ry
  | { poly: Point[] };

export type PropKind =
  | "tree" | "pine" | "giant_tree" | "palm" | "dead_tree" | "coral" | "bush" | "rock" | "boulder" | "crystal" | "ice_spike"
  | "aether_pylon" | "brass_pipe" | "gear_ruin" | "rune_stone" | "lattice_obelisk" | "windmill" | "aqueduct"
  | "lamp_post" | "market_stall" | "fountain" | "house" | "hall" | "workshop" | "transit_gate" | "tent"
  | "furnace" | "anvil" | "dock" | "waterwheel" | "observatory" | "statue" | "crate" | "fence_post" | "cave_mouth";

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  /** Footprint in cells that become unwalkable (0 = decorative). */
  block: number;
  scale?: number;
  rot?: number;
}

export interface Landmark {
  id: string;
  name: string;
  kind: "plaza" | "crossroads" | "farm" | "camp" | "ruin" | "gate" | "shrine" | "lookout" | "boss_arena";
  x: number;
  y: number;
  note: string;
}

export interface Road {
  points: Point[];
  width: number;
  kind: "dirt" | "stone" | "brass" | "bridge" | "boardwalk" | "ice" | "obsidian";
}

/** maps/<id>.json: the authored layout plus the walk grid baked from it. */
export interface MapLayout {
  id: string;
  width: number;
  height: number;
  theme: string;
  ground: "grass" | "sand" | "snow" | "ash" | "stone" | "moss" | "shore" | "cave" | "metal";
  /** Parts of the map with another ground (world v3 zones); later patches win. */
  ground_patches?: { ground: MapLayout["ground"]; shape: Shape }[];
  roads: Road[];
  blockers: { kind: BlockerKind; shape: Shape }[];
  props: Prop[];
  landmarks: Landmark[];
  /** No-combat, no-spawn areas: town plazas, field camps, warp landings. */
  safe_areas: Rect[];
  /** Run-length walk grid, row-major: [value, count, value, count, ...]; 1 = walkable. */
  walk_rle: number[];
}

export type Archetype = "swarm" | "bruiser" | "ranged" | "support" | "construct" | "elite" | "boss";
export type Behavior = "passive" | "aggressive" | "assist" | "flee";

export interface DropDef {
  item_id: string;
  rate_bp: number;
  min_qty: number;
  max_qty: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  region_id: string;
  level: number;
  archetype: Archetype;
  family: string;
  element: string;
  behavior: Behavior;
  hp: number;
  attack: number;
  defense: number;
  attack_range: number;
  attack_ms: number;
  move_speed_ms: number;
  aggro_radius: number;
  leash_radius: number;
  base_exp: number;
  job_exp: number;
  drops: DropDef[];
  /** Habitat and why it lives where it spawns. */
  ecology: string;
  art_brief: string;
  /** Key into public/sprites/index.json monsters. */
  sprite: string;
  /** The field's passive bounty species: more HP and EXP, few on the map. */
  bounty?: boolean;
}

export type ItemCategory = "material" | "rare_material" | "consumable" | "equipment" | "charm" | "totem" | "quest";
export type Rarity = "common" | "uncommon" | "rare" | "epic";

export type StatId = "pow" | "luk" | "agi" | "dex" | "int" | "vit";
export type GearSlot = "weapon" | "head" | "armor" | "gloves" | "boots" | "accessory";
export type DefenseKind = "armour" | "evasion" | "shield" | "armour_evasion" | "armour_shield" | "evasion_shield";

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  sell_price: number;
  stack_max: number;
  description: string;
  /** Generated gear base: drops from any monster of its item level or above (systems.json drops). */
  drop_pool?: boolean;
  /** Painted icon v3, "sheet:cell:cols:rows" in public/ui/painted/items-v3-<sheet>.png (scripts/import-item-icons.py). */
  icon?: string;
  /** Consumables: what using one does. */
  use?: {
    heal_hp_pct?: number; heal_sp_pct?: number; reset_stats?: boolean; cooldown_ms: number;
    /** Every monster within this many cells chases the user (World v3 Lure Bell). */
    lure_radius?: number;
    /** town: Avelorn's arrival; camp: the current map's arrival. */
    teleport?: "town" | "camp";
    /** A timed bonus on the player; using another of the same kind restarts it. */
    buff?: { kind: "move" | "exp" | "drop"; pct: number; duration_ms: number };
  };
  /**
   * Equipment, Charms and Totems. Each copy a player owns is its own item
   * with a rarity and random affixes (CHARACTER_SYSTEMS.md §4-5).
   */
  equip?: {
    slot: GearSlot | "charm";
    job?: string;
    /** Decides which affix tiers can roll. */
    item_level?: number;
    min_level: number;
    attack?: number;
    kind?: DefenseKind;
    armour?: number;
    evasion?: number;
    shield?: number;
    /** Stat points needed to wear it. */
    req?: Partial<Record<StatId, number>>;
    /** Fixed affixes every copy has: [affix id, value]. */
    implicit?: [string, number][];
    /** A unique's special rule (server code). */
    unique?: string;
    charm?: { type: string; grade: number };
    totem?: { type: string; grade: number };
  };
}

export interface AffixDef {
  id: string;
  kind: "prefix" | "suffix";
  /** "{v}" is replaced by the rolled value. */
  label: string;
  slots: (GearSlot | "charm")[];
  /** Top value of each tier; a roll lands between the previous tier's top + step and this. */
  values: number[];
  /** Roll weight multiplier (default 1). */
  weight?: number;
}

export interface CharmTypeDef {
  id: string;
  name: string;
  /** [affix id, values for Lesser / Greater / Grand]. */
  effects: [string, number[]][];
  /** Monster elements whose maps favour this charm. */
  elements: string[];
}

export interface TotemTypeDef {
  id: string;
  name: string;
  /** Effect values at Grand grade. */
  effects: Record<string, number>;
  duration_ms: number;
  charges: number;
  /** "{key}" is replaced by effects[key]. */
  text: string;
  /**
   * Echo Totems: no button. Every `charges` kills / hits landed / hits taken
   * (evades count) they cast the skill linked to them, free of SP and
   * cooldown, at effects.echo_damage % damage.
   */
  trigger?: "kills" | "hits" | "taken";
}

/** public/data/systems.json: CHARACTER_SYSTEMS.md as numbers. */
/** A skill's rank-5 upgrade or Awakened form (CHARACTER_SYSTEMS.md §15). */
export interface SkillUpgrade {
  text: string;
  extra_hits?: number; extra_radius?: number; extra_length?: number; leech_pct?: number; cast_cut?: number; chill?: boolean;
  self_buff?: TimedBuff; ally_buff?: TimedBuff;
  /** Awakened forms. */
  angle?: number; ticks?: number; ticks_add?: number; tick_ms?: number; radius_mult?: number; damage_more?: number;
  /** extra copies aimed this many degrees off the aim */
  fan?: number[]; dash_damage?: number; pull_to_caster?: boolean; vuln?: boolean;
}
export interface TimedBuff { kind: "defense" | "attack_speed" | "move"; pct: number; ms: number }
/** An Awakening trial: big_use = `times` uses touching at least `min` monsters; boss_use = uses touching a boss; heal_total = HP healed. */
export interface SkillFeat { kind: "big_use" | "boss_use" | "heal_total"; min?: number; times: number; text: string }

export interface SystemsDef {
  rules: Record<string, number> & { caps: Record<string, [number, number]> };
  mastery: {
    max_rank: number; per_rank: number; basic_per_rank: number; use_cap: number; level_window: number; elite_weight: number; boss_weight: number;
    /** Per rank (index rank-1), cumulative: [more damage %, increased area %, SP cut %, cooldown cut %]. */
    rank_table: [number, number, number, number][];
    basic_more_per_rank: number; basic_speed_rank: number; basic_speed_inc: number; basic_sp_rank: number; basic_sp_pct: number;
    /** Rank 10 perk text per skill. */
    perks: Record<string, string>;
    rank5: Record<string, SkillUpgrade>;
    awaken_cost: number;
    awaken: Record<string, SkillUpgrade & { name: string; feat: SkillFeat }>;
  };
  drops: Record<string, number | number[] | Record<string, number>> & {
    gear_rarity: Record<string, number>; charm_rarity: Record<string, number>; totem_rarity: Record<string, number>;
    relic_grade: number[]; tier_min_level: number[]; tier_weight: number[]; charm_tiers: number[]; totem_tiers: number[];
  };
  affixes: AffixDef[];
  totem_affixes: AffixDef[];
  labels: Record<string, string>;
  charm_types: CharmTypeDef[];
  relic_caps: { id: string; values: number[]; elements: string[] }[];
  totem_types: TotemTypeDef[];
  charm_slot_levels: number[];
  /**
   * Reforge (reroll affixes) and imbue (raise rarity) cost the base's sell
   * price x these; job change is free up to a level then Aurel a level;
   * stash and bag sizes; monsters' resistance to their own element and
   * weakness to its opposite (%).
   */
  crafting: { reforge_mult: number; imbue_mult: number; job_change_free_level: number; job_change_per_level: number; stash_max: number; bag_max: number;
    monster_resist: number; monster_weakness: number; reset_scroll_level_price: number };
  /** Echo Totems: count multiplier by grade (Lesser, Greater, Grand), x for ultimates, affixes they can roll. */
  echo: { grade_charges: number[]; ultimate_mult: number; affixes: string[] };
  /** Job -> the tier 1 weapon a new character starts with. */
  starter_weapons: Record<string, string>;
}

export interface NpcDef {
  id: string;
  name: string;
  map_id: string;
  position: Point;
  facing: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
  role: "guild_registrar" | "merchant" | "healer" | "teleporter" | "craftsman" | "guard" | "scout";
  dialogue_id: string;
  shop_id: string | null;
  /** Teleporter destinations: [map_id, cost in currency]. */
  destinations?: [string, number][];
}

export interface ShopDef {
  id: string;
  npc_id: string;
  items: { item_id: string; price: number }[];
}

export interface RecipeDef {
  id: string;
  npc_id: string;
  output: { item_id: string; qty: number };
  inputs: { item_id: string; qty: number }[];
  currency: number;
}

export type Objective =
  | { type: "kill"; monster_id: string; count: number }
  | { type: "collect"; item_id: string; count: number }
  | { type: "visit"; map_id: string; count: 1 };

export interface QuestDef {
  id: string;
  title: string;
  region_id: string;
  giver_npc_id: string;
  turn_in_npc_id: string;
  min_level: number;
  prerequisite: string | null;
  objectives: Objective[];
  rewards: { base_exp: number; currency: number; items: { item_id: string; qty: number }[] };
  summary: string;
}

export interface SpawnPocket {
  id: string;
  name: string;
  /** Where monsters may appear; the union of these rects. */
  rects: Rect[];
  species: { monster_id: string; weight: number }[];
  target_alive: number;
  respawn_sec: [number, number];
  /** Why this pocket is here and this dense. */
  design_note: string;
}

export interface SpawnZoneDef {
  map_id: string;
  instance_rules: { min_alive: number; max_alive: number };
  pockets: SpawnPocket[];
}

export interface WarpDef {
  id: string;
  from_map: string;
  to_map: string;
  /** Walking into this rect warps. */
  trigger_rect: Rect;
  /** Where you appear on to_map; must sit outside every trigger there. */
  spawn_point: Point;
  /** The warp that leads back. */
  pair_id: string;
  /** e.g. "item:itm_0083", "level:15". */
  requirements: string[];
  label: string;
}

export interface DialogueDef {
  id: string;
  npc_id: string;
  lines: string[];
}

export type SkillShape = "circle" | "cone" | "line" | "ground" | "pull" | "taunt" | "single" | "mobility" | "ally";

export interface SkillDef {
  id: string;
  name: string;
  job: string;
  shape: SkillShape;
  radius?: number;
  angle_deg?: number;
  length?: number;
  width?: number;
  range: number;
  cast_ms: number;
  cooldown_ms: number;
  resource_cost: number;
  damage_multiplier: number;
  ticks?: number;
  tick_ms?: number;
  /** One cast split into this many hits (same total damage), hit_ms apart, each with its own number. */
  hits?: number;
  hit_ms?: number;
  unlock_level: number;
  target_sort: "distance_then_entity_id";
  vfx: string;
  /** Wired into server + client and played; false = data only. */
  implemented: boolean;
}

/** The player growth curve the monster numbers are balanced against. */
export interface PlayerCurveRow {
  level: number;
  max_hp: number;
  max_sp: number;
  attack: number;
  defense: number;
  exp_to_next: number;
  /** The reference character monsters are balanced against (content/model.ts). */
  ref_attack: number;
  ref_armour: number;
}

export interface ContentBundle {
  constants: Constants;
  regions: RegionDef[];
  maps: MapDef[];
  layouts: Map<string, MapLayout>;
  monsters: MonsterDef[];
  items: ItemDef[];
  npcs: NpcDef[];
  shops: ShopDef[];
  recipes: RecipeDef[];
  quests: QuestDef[];
  spawn_zones: SpawnZoneDef[];
  warps: WarpDef[];
  dialogues: DialogueDef[];
  skills: SkillDef[];
  player_curve: PlayerCurveRow[];
  systems: SystemsDef;
}

export const DATA_FILES = [
  "constants", "regions", "maps", "monsters", "items", "npcs", "shops", "recipes",
  "quests", "spawn_zones", "warps", "dialogues", "skills", "player_curve", "systems",
] as const;

/** Decodes a run-length walk grid. */
export function decodeWalk(rle: number[], size: number): Uint8Array {
  const out = new Uint8Array(size);
  let i = 0;
  for (let k = 0; k < rle.length; k += 2) {
    out.fill(rle[k], i, i + rle[k + 1]);
    i += rle[k + 1];
  }
  return out;
}

export function encodeWalk(cells: Uint8Array): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < cells.length) {
    const v = cells[i];
    let n = 1;
    while (i + n < cells.length && cells[i + n] === v) n++;
    out.push(v, n);
    i += n;
  }
  return out;
}
