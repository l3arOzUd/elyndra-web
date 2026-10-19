# Wayfarer character art and animation — v2

Updated 2026-10-19. This is the current guide; the older workspace guide's
51-file brief describes v1, before articulated elbows and wrists.

## Delivered kit

`public/sprites/wayfarer/` contains 79 transparent PNGs:

- 36 body parts: 12 per view, including separate upper arms, forearms and hands.
- 6 open-palm variants and 3 unconscious head variants.
- 33 equipment layers: boots, coat, sword, bow and staff.
- 1 arrow effect.

The heads have bare necks, with no shirt collar baked into them. Front eyes
are level; side is a left-facing profile. The unconscious heads close the
eyes and remove the smile. Clothing belongs to torso/sleeve layers.

There are three original views: front, left side and back. SW/W/NW reuse
the side artwork; E/NE/SE mirror it. These are not eight unique drawings.
New generated equipment currently reuses these five painted looks; it does
not have unique art per item. Charms, Totems and accessories are not drawn.

## Drawing and rig rules

1. Export each part on a transparent 512×512 canvas; do not crop the canvas.
2. Feet are at (256,480). Keep proportions and lighting consistent.
3. Draw every part at the resting position specified in `rig.json`.
4. Extend painted joints under neighboring parts; never leave transparent holes.
5. Side artwork faces left; avoid lettering or asymmetric insignia that break when mirrored.
6. Neck is bare skin; sleeves and collars belong to clothing, not the head.
7. Review both at the native 256×256 frame and at normal game zoom.

Use `rig.json` for exact pivots and drawing order. The chain is
torso → upper arm → forearm → hand; weapons attach to `hand_near`.
Legs remain thigh → shin. Cape attaches to torso. Bone lengths are fixed;
the pose solver bends elbows instead of stretching artwork. The far arm
draws in front during shooting and casting so the gesture remains visible.

Open hands use `hand_near_open.png` / `hand_far_open.png`; unconscious heads
use `head_unconscious.png`. These are registered in `rig.variants`.
The coat replaces the base torso and upper sleeves and overlays elbow cuffs.

## Actions used by the game

- Idle / walk: side-view weapon hand remains in front of the torso.
- Melee: preparation, strike and recovery with shoulder, elbow and wrist motion.
- Shoot: hold bow, pull string with the other hand, release and recover.
- Cast: hold weapon, open the free palm, gather energy, release and recover.
- Hit: brief recoil; it cannot interrupt a higher-priority attack/cast.
- Death: knees buckle, torso folds forward, head settles, eyes close and
  weapon lowers. The final pose is a slumped kneel, not a rigid backward fall.

`equipment.json` can specify `motion: melee | shoot | cast`. Generated items
sharing the bow/staff/sword artwork inherit the corresponding action even
without that field. `combatAnimation.ts` selects skill actions. Release
timing uses the server impact timestamp; visual effects do not apply damage.
This artwork does not enable otherwise unavailable server skills.

## Preview and validation

Run `npm run dev`, then open `/character-viewer.html`. Try the three action
buttons, outfits, slow motion, pause/frame slider and pivot overlay. Reload
images after editing artwork. Preview changes never alter account equipment.
The viewer and in-game sprite sheets use the same renderer.

Run `npm run build`, `npm test`, then `node scripts/check-wayfarer-art.mjs`
with Playwright available (`PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` may point
to your installation). The visual check covers 9 outfits × 7 actions × all
frames in 5 rows, tests action controls, and writes contact sheets plus
`validation.json` to `../output/wayfarer-review/`.

Inspect the contact sheets as well: automated nonempty/edge checks do not
prove artistic quality. `motion-views-*.png` shows front, left, mirrored right
and back at native frame resolution.

## Source, import and handoff

Generated source atlases and prompts are in `art-source/wayfarer-v2/`.
`previous-kit/` preserves v1. Run `scripts/import-wayfarer-v2.mjs` to pack
the source art into the rig; it records crop rectangles and destinations in
`import-manifest.json` and preserves subsequently added item mappings.
Do not use the v1 importer or force-regenerate template art over this kit.

`scripts/package-wayfarer.ps1` creates the v2 handoff ZIP containing runtime
PNGs, rig, equipment mappings, this guide, and the validation report. Source
atlases remain tracked in Git. Animation logic remains in `src/render/`;
the ZIP is the art kit, not a separate runnable game.
