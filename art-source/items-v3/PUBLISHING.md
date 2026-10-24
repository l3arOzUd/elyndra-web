# Item illustration coverage

The existing eight generated sheets are now published unchanged via
`node scripts/publish-item-art.mjs`, followed by `npm run build:content`.
Their original generation briefs remain in `sheet-NN.prompt.txt` and `manifest.json`.
No images attached as external costume references were imported.

590 of 627 item definitions use these painted sheets. The remaining 37 retain
the existing v2 illustrations (starter equipment, starter materials, consumables,
and seven survey documents sharing a document icon). `coverage.json` lists them.
Tier variants intentionally share artwork; frame grade distinguishes progression.
This is not 627 newly generated unique paintings.

Review `/db.html#/items` using the production paintedItem renderer. Helmets,
gloves, armor and boots have six distinct base silhouettes each; weapons have
four and the base accessory has one, plus separate unique equipment paintings.

Character paper-doll layers are separate assets. Publishing inventory icons
does not replace the helmet, gloves or outfit visible on the world character.
