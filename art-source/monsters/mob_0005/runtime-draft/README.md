# Craglet runtime-format draft

Five PNG sheets use 384 x 384 cells, pivot (192,346), and 300 pixels per cell. Authored views: left and front. Rows W/S/SW/NW include duplicated left art for western diagonals; east and north still use side aliases. This does not establish rear or diagonal artwork coverage.

Attack hit is frame 3 (zero-based), and death holds the final frame. Left idle has an authored blink; front idle repeats a neutral pose and needs animation. There are 160 exported cells because duplicated direction rows are included, not 160 distinct authored poses.

Regenerate with node scripts/export-craglet-draft.mjs while Vite runs on localhost:5173. Set PLAYWRIGHT_MODULE and CHROMIUM_PATH for the local browser installation. The exporter validates every row and checks nonempty alpha and clipping, not visual quality.

The real SpriteActor/Animator review at ../game-review.html now offers Front. Front attack emitted hit at 375ms, front death held at 1000ms, and shownDir was S. Browser review found no page errors.

Not bound to a live monster. Registration, foot sliding, plate continuity, side belly gear, missing rear actions, static front idle and abrupt action transitions remain open.
