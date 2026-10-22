// Refine glow (ITEM_ART.md §3), N-age style: a +N item lights up in the colour
// of its level, on its icon (theme.css .refined, keep in step) and, for the
// weapon, on the character (render/paperDoll.ts).

/** +1..+10: glow colour, whether it sparkles, and prismatic (hue cycling). */
export const REFINE_GLOW: { color: string; spark: boolean; prism?: boolean }[] = [
  { color: "#7dff9a", spark: false }, // +1 a faint green flicker
  { color: "#3fe0b0", spark: false }, // +2 green going teal, stronger
  { color: "#3fa9ff", spark: true }, //  +3 blue with twinkles
  { color: "#b46cff", spark: true }, //  +4 violet
  { color: "#ffc83d", spark: true }, //  +5 gold
  { color: "#ff3b3b", spark: true }, //  +6 red
  { color: "#ff2a2a", spark: true }, //  +7 deep red, fast pulse
  { color: "#ffffff", spark: true }, //  +8 white radiance
  { color: "#ff5af0", spark: true, prism: true }, // +9 prismatic
  { color: "#ffe066", spark: true, prism: true }, // +10 prismatic, brightest
];

export const refineGlow = (n: number) => (n > 0 ? REFINE_GLOW[Math.min(10, n) - 1] : undefined);
