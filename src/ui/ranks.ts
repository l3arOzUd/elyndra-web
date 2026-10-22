import type { ClientContent } from '../data/content';
import type { SheetMsg } from '../net/protocol';

// What every skill rank gives, from systems.json mastery (CHARACTER_SYSTEMS.md
// §15): the rank table's numbers, the rank-5 upgrade, the rank-10 perk and
// the Awakened form. Shared by the character window, the skill tooltip and
// the Guild Registrar.

export interface RankLine { rank: number; text: string; special?: 'upgrade' | 'mastery' }

const pct = (n: number) => (Math.round(n * 10) / 10).toString();

/** One line per rank, 1 to max_rank. */
export function rankLines(c: ClientContent, skill: string): RankLine[] {
  const m = c.systems.mastery, out: RankLine[] = [];
  if (skill === 'basic') {
    for (let r = 1; r <= m.max_rank; r++) {
      const parts = ['+' + (r - 1) * m.basic_more_per_rank + '% damage'];
      if (r >= m.basic_speed_rank) parts.push('+' + m.basic_speed_inc + '% attack speed');
      parts.push((r >= m.basic_sp_rank ? m.basic_sp_pct : c.systems.rules.basic_sp_pct ?? 2) + '% SP back a hit');
      out.push({ rank: r, text: parts.join(' · '), special: r === m.basic_speed_rank ? 'upgrade' : r === m.basic_sp_rank ? 'mastery' : undefined });
    }
    return out;
  }
  const s = c.skills.get(skill), damage = (s?.damage_multiplier ?? 0) > 0;
  const reach = s?.shape === 'mobility' ? 'dash range' : s?.shape === 'line' ? 'length' : 'area';
  for (let r = 1; r <= m.max_rank; r++) {
    const [dmg, area, sp, cd] = m.rank_table[r - 1] ?? [0, 0, 0, 0];
    const parts: string[] = [];
    if (damage) parts.push('+' + pct(dmg) + '% damage');
    parts.push('+' + pct(area) + '% ' + reach);
    if (sp) parts.push('SP −' + pct(sp) + '%');
    if (cd) parts.push('cooldown −' + pct(cd) + '%');
    let text = parts.join(' · '), special: RankLine['special'];
    if (r === 5 && m.rank5[skill]) { text += ' · ★ ' + m.rank5[skill].text; special = 'upgrade'; }
    if (r === m.max_rank && m.perks[skill]) { text += ' · ★ ' + m.perks[skill]; special = 'mastery'; }
    out.push({ rank: r, text, special });
  }
  return out;
}

export type AwakenState = 'none' | 'locked' | 'ready' | 'trial' | 'complete' | 'awakened';

/** Where a skill stands on its way to Awakening. */
export function awakenStatus(c: ClientContent, sheet: SheetMsg | null | undefined, skill: string): { state: AwakenState; progress: number; need: number } {
  const m = c.systems.mastery, aw = m.awaken[skill];
  if (!aw) return { state: 'none', progress: 0, need: 0 };
  const need = aw.feat.times, rank = sheet?.mastery[skill]?.[0] ?? 1;
  if (sheet?.awakened?.includes(skill)) return { state: 'awakened', progress: need, need };
  const progress = sheet?.trials?.[skill];
  if (progress === undefined) return { state: rank >= m.max_rank ? 'ready' : 'locked', progress: 0, need };
  return { state: progress >= need ? 'complete' : 'trial', progress, need };
}

/** Numbers for the skill tooltip at the current rank (SP, cooldown, cast, more damage). */
export function rankNumbers(c: ClientContent, _skill: string, rank: number) {
  const row = c.systems.mastery.rank_table[rank - 1] ?? [0, 0, 0, 0];
  return { damage: row[0], area: row[1], spCut: row[2], cdCut: row[3] };
}
