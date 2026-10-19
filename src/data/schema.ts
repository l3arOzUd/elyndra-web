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
}

export type ItemCategory = "material" | "rare_material" | "consumable" | "equipment" | "quest";
export type Rarity = "common" | "uncommon" | "rare" | "epic";

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  sell_price: number;
  stack_max: number;
  description: string;
  /** Consumables: what using one does. */
  use?: { heal_hp_pct?: number; heal_sp_pct?: number; cooldown_ms: number };
  /** Equipment: slot and bonuses. */
  equip?: { slot: "weapon" | "armor" | "boots"; job?: string; attack?: number; defense?: number; max_hp?: number; min_level: number };
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
  max_targets: number;
  cast_ms: number;
  cooldown_ms: number;
  resource_cost: number;
  damage_multiplier: number;
  ticks?: number;
  tick_ms?: number;
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
}

export const DATA_FILES = [
  "constants", "regions", "maps", "monsters", "items", "npcs", "shops", "recipes",
  "quests", "spawn_zones", "warps", "dialogues", "skills", "player_curve",
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
