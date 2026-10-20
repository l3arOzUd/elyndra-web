# Graftling runtime draft

Five clips exported as 384px cells: idle, walk, attack, hit, death. 150 cells include duplicate holds, not 150 unique drawings. Front, left and rear art; right mirrors left and diagonals alias side rows.

Regenerate with `node scripts/export-craglet-draft.mjs mob_0012` while Vite runs. Set PLAYWRIGHT_MODULE and CHROMIUM_PATH if needed. All cells passed visible alpha and edge checks. SpriteActor W/E/S/N attack emits hit at375ms. Rear idle viewed at600ms.

Open ../game-review.html. Not bound to gameplay. Contact geometry, limb continuity, surface drift and intermediate poses remain unfinished; technical checks do not approve visual quality.
