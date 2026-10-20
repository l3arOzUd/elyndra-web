# Craglet runtime-format draft

Five PNG sheets and `craglet_2d.sprite.json` use the game's sheet schema: 384×384 cells, west-facing row, pivot (192,346), 300 pixels per cell. Attack contact is frame 3 (zero-based); death holds the last frame.

Regenerate from the web repository with `node scripts/export-craglet-draft.mjs` while Vite is running at localhost:5173. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` if Playwright is not installed locally.

The exporter runs the actual `validateSprite` function and checks every exported cell for visible content and edge clipping. `validation.json` records the results.

This is not a completed monster or an active game binding. Idle is currently static. Only left-facing art is authored; mirroring does not prove directional coverage. Walk color drift, body registration, planted-foot trajectories, plate continuity and the Bible's belly gear still require work. Review visuals in `../walk-review.html` before promoting assets. Do not count technical format checks as animation approval.
