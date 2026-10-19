import type {
  ItemDef, MapDef, MapLayout, MonsterDef, NpcDef, QuestDef, RegionDef, SkillDef, WarpDef,
} from "./schema";

/** The parts of the content the client displays (the server owns the rules). */
export interface ClientContent {
  regions: Map<string, RegionDef>;
  maps: Map<string, MapDef>;
  monsters: Map<string, MonsterDef>;
  items: Map<string, ItemDef>;
  npcs: Map<string, NpcDef>;
  quests: Map<string, QuestDef>;
  skills: Map<string, SkillDef>;
  warps: WarpDef[];
  sprites: { player: SpriteBinding; monsters: Record<string, SpriteBinding>; fallback: SpriteBinding };
  layouts: Map<string, MapLayout>;
}

export interface SpriteBinding {
  sprite: string;
  tint?: [number, number, number];
  scale?: number;
  placeholder?: boolean;
}

async function json<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

export async function loadContent(): Promise<ClientContent> {
  const [regions, maps, monsters, items, npcs, quests, skills, warps, sprites] = await Promise.all([
    json<RegionDef[]>("data/regions.json"),
    json<MapDef[]>("data/maps.json"),
    json<MonsterDef[]>("data/monsters.json"),
    json<ItemDef[]>("data/items.json"),
    json<NpcDef[]>("data/npcs.json"),
    json<QuestDef[]>("data/quests.json"),
    json<SkillDef[]>("data/skills.json"),
    json<WarpDef[]>("data/warps.json"),
    json<ClientContent["sprites"]>("sprites/index.json"),
  ]);
  return {
    regions: byId(regions), maps: byId(maps), monsters: byId(monsters), items: byId(items), npcs: byId(npcs),
    quests: byId(quests), skills: byId(skills), warps, sprites, layouts: new Map(),
  };
}

export async function loadLayout(c: ClientContent, mapId: string): Promise<MapLayout> {
  const cached = c.layouts.get(mapId);
  if (cached) return cached;
  const m = c.maps.get(mapId);
  if (!m) throw new Error(`unknown map ${mapId}`);
  const l = await json<MapLayout>(`data/${m.layout}`);
  c.layouts.set(mapId, l);
  return l;
}
