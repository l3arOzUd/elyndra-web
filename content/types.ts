// What a region design file declares. content/build.ts turns these into the
// JSON files in public/data; nothing at runtime reads this folder.

import type {
  Archetype, Behavior, BlockerKind, DialogueDef, ItemDef, Landmark, MapLayout, MapType, NpcDef,
  Point, Prop, PropKind, QuestDef, RecipeDef, Rect, RegionDef, Road, Shape, SpawnPocket,
} from "../src/data/schema";
import type { StatMods } from "./model";

export interface MonsterDesign {
  id: string;
  name: string;
  level: number;
  archetype: Archetype;
  family: string;
  element: string;
  behavior: Behavior;
  /** Departures from the archetype, with the reason in `why`. */
  mods?: StatMods;
  why?: string;
  /** Set by the world build: this field's passive bounty species (model.ts BOUNTY). */
  bounty?: boolean;
  /** Item ids: [common, uncommon, rare?]; rates come from the model. */
  drops: { common: string; uncommon: string; rare?: string; extra?: { item_id: string; rate_bp: number; qty?: [number, number] }[] };
  ecology: string;
  art_brief: string;
  sprite?: string;
}

export interface MaterialDesign {
  id: string;
  name: string;
  /** The level it drops at, which prices it. */
  level: number;
  tier: "common" | "uncommon" | "rare";
  description: string;
}

export interface MapDesign {
  id: string;
  name: string;
  type: MapType;
  role: string;
  levels: [number, number];
  size: [number, number];
  /** Teleport/respawn point, inside a safe area. */
  arrival: Point;
  ground: MapLayout["ground"];
  /** Zones with their own ground (world v3); later patches win. */
  ground_patches?: MapLayout["ground_patches"];
  theme: string;
  /** Dungeons start solid and are carved out. */
  solid?: boolean;
  carve?: Shape[];
  /** A band of this blocker round the edge (roads cut through it). */
  border?: { width: number; kind: BlockerKind };
  roads: Road[];
  blockers: { kind: BlockerKind; shape: Shape }[];
  props: Prop[];
  scatter: { kind: PropKind; count: number; area?: Rect; block: number; scale?: [number, number] }[];
  landmarks: Landmark[];
  safe_areas: Rect[];
  /** Field camps: trampled ground, NPCs and the arrival, but no protection (monsters follow you in). */
  camps?: Rect[];
  horde?: { min_alive: number; max_alive: number };
  pockets: SpawnPocket[];
  npcs: Omit<NpcDef, "map_id">[];
}

export interface LinkEnd {
  map: string;
  /** Walk into this to leave. */
  trigger: Rect;
  /** Where you arrive when coming the other way. */
  landing: Point;
}

export interface LinkDesign {
  a: LinkEnd;
  b: LinkEnd;
  requirements?: string[];
  label: string;
}

export interface RegionDesign {
  region: Omit<RegionDef, "town_map_id" | "dungeon_map_id"> & { town_map_id: string; dungeon_map_id: string };
  maps: MapDesign[];
  links: LinkDesign[];
  monsters: MonsterDesign[];
  materials: MaterialDesign[];
  /** Non-material items first defined in this region. */
  items: ItemDef[];
  shops: { id: string; npc_id: string; items: { item_id: string; base_price: number }[] }[];
  recipes: RecipeDef[];
  quests: QuestDef[];
  dialogues: DialogueDef[];
}
