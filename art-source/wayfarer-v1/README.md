# Wayfarer illustrated kit, first visual review

The live kit is `public/sprites/wayfarer/`: 24 body PNGs and 27 equipment PNGs, each 512×512 RGBA. The game and character viewer use the same kit and existing equipment IDs. `original-kit/` preserves the prior geometric stand-ins and rig before import.

Art was generated with the built-in `image_gen.imagegen` tool. `prompts.json` contains every prompt. `base-{front,side,back}.png` supplies heads, torsos and arms; `base-*-joints.png` supplies corrected fabric-covered legs. The correction changed an unrequested shoulder cap in the front atlas, so only its bottom row is imported. `equipment-*.png` supplies the nine equipment layers for each view. Original generated alpha is retained.

Run `node scripts/import-wayfarer-art.mjs` from the web repo to export the illustrated atlas cells into the existing rig. It needs Playwright; `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` may specify local installations. Import rectangles and destination placements are recorded in `import-manifest.json`. Do not run the old template generator with `--force` on this kit.

Open `/character-viewer.html` for outfit presets, individual slots, all animation states and pivot review. The preview never changes server inventory. Run `node scripts/check-wayfarer-art.mjs` for nine outfit combinations, all five animation states and five game-facing rows; it checks missing/empty frames, distinct outfit rendering, preset controls, browser errors and frame-edge clipping. Review screenshots live in the workspace's `output/wayfarer-review/`.

There are three illustrated views, not eight unique angle drawings. Side views are reused/mirrored according to the existing rig. Animations still use rigid cutout rotations; bow draw and staff casting do not yet have bespoke poses. This is one base character and five existing equipment items, not a full customization or class wardrobe system. Art quality still needs user review; functional validation is not aesthetic approval.
