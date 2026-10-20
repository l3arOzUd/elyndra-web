# Craglet runtime-format draft

Five PNG sheets use 384 x 384 cells, pivot (192,346), and 300 pixels per cell. Authored draft views: left, front and rear. Rows W/S/SW/NW/N include duplicated left art for western diagonals; eastward directions mirror the side. This does not establish accurate diagonal or right-side artwork coverage.

Attack hit is frame 3 (zero-based), and death holds the final frame. Left and front idle have authored blinks; rear idle uses two breathing poses and needs smoother transitions. There are 200 exported cells because duplicated direction rows are included, not 200 distinct authored poses.

Regenerate with node scripts/export-craglet-draft.mjs while Vite runs on localhost:5173. Set PLAYWRIGHT_MODULE and CHROMIUM_PATH for the local browser installation. The exporter validates every row and checks nonempty alpha and clipping, not visual quality.

The real SpriteActor/Animator review at ../game-review.html now offers Front. Front attack emitted hit at 375ms, front death held at 1000ms, and shownDir was S. Browser review found no page errors.

Not bound to a live monster. Registration, foot sliding, plate continuity, side belly gear, rear action continuity, rear idle transition quality and abrupt action transitions remain open.
