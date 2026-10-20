# Thornback runtime draft

Five clips: idle blink, walk, tusk attack, hit recoil and death. Forty exported cells are not forty unique painted poses. Only the left-facing view is authored; east mirrors it.

Regenerate with `node scripts/export-craglet-draft.mjs mob_0006` while Vite runs on port 5173. Supply `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` if needed. The shared exporter checks every cell for visible alpha and edge clipping using the real sprite schema.

`../game-review.html` uses SpriteActor and Animator. Browser review confirmed the attack hit event at 375ms and death held at 1000ms without page errors. The final pose rests cheek and chest on the ground.

Not bound to gameplay. Front/rear animations, hoof trajectories, leg angles, surface continuity and transition drawings remain unfinished. The idle blink introduces small image-detail drift. Technical validation is not art approval.
