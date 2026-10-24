// Refine glow (ITEM_ART.md §3), N-age style: a +N item lights up in the colour
// of its level, on its icon (theme.css .refined, keep in step) and, for every
// worn piece, on the character (render/paperDoll.ts).

/** +1..+10: glow colour, whether it sparkles, and prismatic (hue cycling). */
export const REFINE_GLOW: { color: string; spark: boolean; prism?: boolean }[] = [
  { color: "#7dff9a", spark: false }, // +1 a faint green flicker
  { color: "#3fe0b0", spark: false }, // +2 green going teal, stronger
  { color: "#3fa9ff", spark: true }, //  +3 blue with twinkles
  { color: "#b46cff", spark: true }, //  +4 violet
  { color: "#ffc83d", spark: true }, //  +5 gold
  { color: "#ff3b3b", spark: true }, //  +6 red
  { color: "#ff3fc8", spark: true }, //  +7 hot magenta, fast pulse (red is +6)
  { color: "#ffffff", spark: true }, //  +8 white radiance
  { color: "#ff8a1f", spark: true }, //  +9 orange flame, flickering
  { color: "#ffe066", spark: true, prism: true }, // +10 rainbow: every hue at once, turning
];

export const refineGlow = (n: number) => (n > 0 ? REFINE_GLOW[Math.min(10, n) - 1] : undefined);
