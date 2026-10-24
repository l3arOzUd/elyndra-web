import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { REGIONS, REGIONS_V2 } from '../content/regions';
import { buildWorld } from '../content/world';
import { addConsumables } from '../content/consumables';
import { compactRoster, WORLD_ROSTER } from '../content/compactRoster';

const old = addConsumables(buildWorld(REGIONS_V2));
const oldMaps = old.flatMap(r => r.maps);
const maps = REGIONS.flatMap(r => r.maps);
const monsters = REGIONS.flatMap(r => r.monsters);
const active = new Set(monsters.map(m => m.id));
describe('compact production roster', () => {
  it('caps the entire world at 40, with 3 field residents and 2 dungeon residents including bosses', () => {
    expect(monsters).toHaveLength(40);
    const homes = new Map();
    for (const map of maps) {
      const ids = new Set(map.pockets.flatMap(p => p.species.map(s => s.monster_id)));
      expect(ids.size).toBe(map.type === 'town' ? 0 : map.type === 'field' ? 3 : 2);
      for (const id of ids) { expect(active.has(id)).toBe(true); homes.set(id, new Set([...(homes.get(id) ?? []), map.id])); }
    }
    expect([...homes.values()].every(h => h.size === 1)).toBe(true);
    expect(new Set(Object.values(WORLD_ROSTER).flat()).size).toBe(40);
  });
  it('preserves layout, population targets, boss IDs and boss loot', () => {
    for (const map of maps) {
      const before = oldMaps.find(m => m.id === map.id);
      expect(map.roads).toEqual(before.roads);
      expect(map.blockers).toEqual(before.blockers);
      expect(map.pockets.map(p => [p.rects, p.target_alive])).toEqual(before.pockets.map(p => [p.rects, p.target_alive]));
    }
    for (const boss of old.flatMap(r => r.monsters).filter(m => m.archetype === 'boss')) {
      expect(monsters.find(m => m.id === boss.id)?.drops).toEqual(boss.drops);
    }
  });
  it('keeps every quest kill target and every previously dropped ingredient obtainable', () => {
    const loot = new Set(monsters.flatMap(m => m.drop_table?.map(d => d.item_id) ?? [m.drops.common, m.drops.uncommon, m.drops.rare, ...(m.drops.extra ?? []).map(e => e.item_id)]));
    for (const r of old) for (const m of r.monsters) for (const id of [m.drops.common, m.drops.uncommon, m.drops.rare, ...(m.drops.extra ?? []).map(e => e.item_id)]) if (id) expect(loot.has(id), id).toBe(true);
    for (const r of REGIONS) for (const q of r.quests) for (const o of q.objectives) if (o.type === 'kill') expect(active.has(o.monster_id), q.id).toBe(true);
    expect(REGIONS.flatMap(r => r.recipes)).toEqual(old.flatMap(r => r.recipes));
    for (const q of REGIONS.flatMap(r => r.quests)) {
      const before = old.flatMap(r => r.quests).find(x => x.id === q.id);
      expect(q.objectives.map(o => [o.type, o.count])).toEqual(before.objectives.map(o => [o.type, o.count]));
      expect(q.prerequisite).toBe(before.prerequisite);
    }
  });
  it('retains all 13 already-bound paintings and verifies every new sprite bundle exists', () => {
    const painted = old.flatMap(r => r.monsters).filter(m => m.sprite);
    expect(painted).toHaveLength(13);
    for (const m of painted) expect(monsters.find(x => x.id === m.id)?.sprite).toBe(m.sprite);
    for (const m of monsters.filter(m => m.sprite)) {
      const base = `public/sprites/${m.sprite}`;
      expect(existsSync(`${base}/${m.sprite}.sprite.json`), m.name).toBe(true);
      for (const pose of ['idle', 'walk', 'attack', 'hit', 'death']) expect(existsSync(`${base}/${pose}.png`), `${m.name}/${pose}`).toBe(true);
    }
  });
  it('is deterministic and does not mutate the authored source', () => {
    const before = JSON.stringify(old);
    expect(compactRoster(old)).toEqual(REGIONS);
    expect(JSON.stringify(old)).toBe(before);
  });
});
