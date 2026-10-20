# Dustwing runtime draft

Five clips exported through the game sprite schema: idle hover, flying locomotion, attack, hit, death. Front, left and rear are authored; right mirrors left and diagonals reuse side artwork. The 150 cells include duplicates, not 150 unique poses.

Run `node scripts/export-craglet-draft.mjs mob_0007` with Vite running and PLAYWRIGHT_MODULE / CHROMIUM_PATH configured. All exported cells have visible alpha and no edge pixels. Browser SpriteActor review confirmed W/E/S/N attack hit events at 375ms and rear death resting on the ground after 1000ms.

Open ../game-review.html to inspect the actual renderer. Not bound to gameplay. Flight-to-action body registration, wingbeat phase matching, wing markings, six-leg anatomy and intermediate landing poses remain unfinished. Format checks do not establish visual approval.
