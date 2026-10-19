// Mirror of elyndra-server/internal/protocol/protocol.go. Keep in step.

export const PROTOCOL_VERSION = 1;

export const enum EntState {
  Idle = 0,
  Walk = 1,
  Attack = 2,
  Dead = 3,
  Cast = 4,
}

export type ClientMsg =
  | { t: "hello"; v: number; name: string }
  | { t: "move"; seq: number; to: [number, number] }
  | { t: "attack"; target: number }
  | { t: "cast"; skill: string; aim: [number, number] }
  | { t: "pickup"; req: string; loot: number[] }
  | { t: "use"; item: string }
  | { t: "equip"; gear: number; slot?: string }
  | { t: "unequip"; slot: string }
  | { t: "discard"; gear: number }
  | { t: "stat"; arg: string; qty: number }
  | { t: "reset_stats" }
  | { t: "totem"; slot: string }
  | { t: "link"; slot: string; skill: string }
  | { t: "npc"; npc: string; op: string; arg?: string; qty?: number }
  | { t: "debug"; on: boolean }
  | { t: "ping"; c: number };

export interface EntityAdd {
  id: number;
  k: "p" | "m" | "n";
  look: string;
  ref?: string;
  name: string;
  lv: number;
  hp: number;
  mhp: number;
  x: number;
  y: number;
  h: number;
  st: number;
  ms: number;
  /** Players: equipped item ids (weapon, armor, boots, head, ...) and job. */
  gear?: string[];
  job?: string;
}

export interface CombatEvent {
  cast?: number;
  src: number;
  skill?: string;
  hits: [number, number, number][];
  deaths?: number[];
}

/** One copy of gear, a Charm or a Totem. affixes: [affix id, tier, value]. */
export interface GearView {
  uid: number;
  base: string;
  rarity: "normal" | "magic" | "rare" | "relic" | "unique";
  ilvl: number;
  affixes: [string, number, number][];
  slot?: string;
  /** Echo Totems: the linked skill. */
  link?: string;
}

export interface TotemView {
  slot: string;
  ch: number;
  need: number;
  /** ms of effect left; 0 = not active. */
  left: number;
  /** Echo Totems: what they count, and the skill they cast. */
  trigger?: "kills" | "hits" | "taken";
  link?: string;
}

/** CHARACTER_SYSTEMS.md character window. mastery: skill -> [rank, kills, kills for next rank]. */
export interface SheetMsg {
  t: "sheet";
  stats: Record<string, number>;
  bonus: Record<string, number>;
  points: number;
  free_reset: boolean;
  d: Record<string, number>;
  mastery: Record<string, [number, number, number]>;
  inactive?: number[];
}

export interface QuestView {
  id: string;
  title: string;
  state: "offer" | "active" | "ready" | "done";
  progress: number[];
  goals: number[];
  summary: string;
  turn_in: string;
}

export interface RecipeView {
  id: string;
  output: { item_id: string; qty: number };
  inputs: { item_id: string; qty: number }[];
  currency: number;
}

export type ServerMsg =
  | { t: "welcome"; v: number; name: string; tick_ms: number; snap_ms: number; time: number }
  | { t: "map"; map: string; you: number; pos: [number, number]; time: number }
  | { t: "snap"; tick: number; time: number; add?: EntityAdd[]; e?: [number, number, number, number, number, number][]; gone?: number[] }
  | { t: "cast"; cast: number; actor: number; skill: string; aim: [number, number]; hit_at: number; time: number; cd?: number; echo?: boolean }
  | { t: "combat"; time: number; ev: CombatEvent[] }
  | { t: "loot"; piles: { id: number; x: number; y: number; items: [string, number, string?][] }[] }
  | { t: "loot_gone"; ids: number[] }
  | { t: "inv"; ver: number; items: Record<string, number>; full?: boolean; zeny: number; equip?: Record<string, string>; gear?: GearView[]; gear_gone?: number[] }
  | { t: "stats"; lv: number; exp: number; next: number; hp: number; mhp: number; sp: number; msp: number; sh?: number; msh?: number; atk: number; def: number; job: string; tot?: TotemView[] }
  | SheetMsg
  | { t: "quests"; quests: QuestView[] }
  | { t: "npc"; npc: string; name: string; role: string; lines: string[]; shop?: [string, number][]; recipes?: RecipeView[]; dest?: [string, number][]; offer?: QuestView[]; ready?: string[] }
  | { t: "notice"; text: string; kind: "info" | "good" | "bad" }
  | { t: "correct"; seq: number; pos: [number, number] }
  | { t: "pong"; c: number; s: number }
  | { t: "debug"; map: string; p50: number; p95: number; max: number; mobs: number; chasing: number; players: number; bps: number; pockets: { id: string; alive: number; pending: number; target: number; fail: number }[] }
  | { t: "err"; code: string; msg: string };

export type MsgOf<T extends ServerMsg["t"]> = Extract<ServerMsg, { t: T }>;
