import { readFileSync, writeFileSync } from 'node:fs';
import { REGIONS_V2 } from '../content/regions';
import { WORLD_ROSTER } from '../content/compactRoster';
import type { MapDef, MonsterDef } from '../src/data/schema';

const maps: MapDef[] = JSON.parse(readFileSync('public/data/maps.json', 'utf8'));
const mobs: MonsterDef[] = JSON.parse(readFileSync('public/data/monsters.json', 'utf8'));
const sprites = JSON.parse(readFileSync('public/sprites/index.json', 'utf8')).monsters;
const retired = REGIONS_V2.flatMap(r => r.monsters).filter(m => !mobs.some(x => x.id === m.id));
const artCount = mobs.filter(m => !sprites[m.id].placeholder).length;
const lines = [
  '# Elyndra — current world roster (40 species)', '',
  'Implemented roster; supersedes the 94-species production plan. Source: `content/compactRoster.ts`.', '',
  `- 10 fields × 3 species + 5 dungeons × 2 species = ${mobs.length}, including all 7 bosses. Avelorn has no monsters.`,
  `- ${artCount} bound existing sprite bundles; ${mobs.length - artCount} remain placeholders and need art. No new image generation in this change.`,
  '- All 13 previously bound paintings are retained. One home map per species; levels are fitted to the destination.',
  '- Existing spawn areas, target counts, roads, collision and warp links are retained. Fewer species does not mean fewer enemies.',
  '- Former Gorged residents now join ordinary packs without bounty HP/EXP multipliers. Passive/fleeing retained regulars assist their packs.',
  '- Retired kill objectives are redirected locally. Material access stays in its old map/level band; consolidated drop chances are population-weighted. Boss loot and unique drops are retained.',
  '- Existing quest IDs, objective order/counts, prerequisite chains, recipes and item IDs remain stable. Server quest progress is stored by objective index, so current progress is preserved. Retired Monster Book records stay saved but are not shown in the active roster.',
  '', '| Map | Level | Residents | Art |', '|---|---|---|---|',
];
for (const map of maps) {
  const residents = (WORLD_ROSTER[map.id] ?? []).map(name => mobs.find(m => m.name === name)!);
  lines.push(`| ${map.name} (${map.id}) | ${map.recommended_level_min}–${map.recommended_level_max} | ${residents.map(m => `${m.name} Lv${m.level}`).join(', ') || 'None'} | ${residents.filter(m => !sprites[m.id].placeholder).length}/${residents.length} |`);
}
lines.push('', '## Existing art reused', '', '| Game identity | Sprite |', '|---|---|');
for (const m of mobs.filter(m => !sprites[m.id].placeholder)) lines.push(`| ${m.name} | ${sprites[m.id].sprite} |`);
lines.push('', '## Parked production backlog', '', `${retired.length} retired species remain archived in the region source files. Do not generate their art unless explicitly restored to WORLD_ROSTER.`, '', retired.map(m => m.name).join(', '), '');
const doc = lines.join('\n');
writeFileSync('content/ROSTER_PLAN.md', doc);
writeFileSync('../WORLD_V3_PLAN.md', doc);
writeFileSync('public/monster-roster.json', JSON.stringify({ total: mobs.length, withArt: artCount, remainingArt: mobs.length - artCount, maps: maps.map(map => ({ id: map.id, name: map.name, species: WORLD_ROSTER[map.id] ?? [] })), retired: retired.map(m => ({ id: m.id, name: m.name })) }, null, 2));
console.log(`Roster plan: ${mobs.length} active, ${retired.length} retired, ${artCount} bound art`);
