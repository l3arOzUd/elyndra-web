import type { AnimName } from './spriteDef';

/** Visual selection only; the server still decides unlocks, casts and damage. */
export function skillAnimation(skill?: { id: string; job: string }): AnimName {
  if (skill?.job === 'arcanist' || skill?.id === 'sundering_pulse') return 'cast';
  if (skill?.job === 'strider') return 'shoot';
  return 'attack';
}
