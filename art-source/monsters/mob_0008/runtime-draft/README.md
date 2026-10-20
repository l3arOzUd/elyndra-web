# Brookfin runtime draft

Five clips: idle blink, walk, bite attack, hit and death. Front, left and rear action rows are authored; right mirrors left and diagonals reuse side art. Front/rear idle currently use static neutral poses. The 200 exported cells include duplicates, not 200 unique drawings.

Regenerate with `node scripts/export-craglet-draft.mjs mob_0008` while Vite runs. Set PLAYWRIGHT_MODULE and CHROMIUM_PATH when needed. Schema, visible alpha and edge checks passed for every cell. Browser SpriteActor test emitted attack hit at 375ms for W/E/S/N; rear death holds on ground after 1000ms.

Open ../game-review.html for engine review. Not bound to gameplay. Cross-clip body registration, foot contacts, four-leg continuity, fin coloration and transition poses remain unfinished. Technical checks do not approve art quality.
