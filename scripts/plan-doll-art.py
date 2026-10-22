"""Plans the paper-doll art v3 (art-source/doll-v3/, ITEM_ART.md §4).

One drawing per gear type for every tier (Worn ... Sovereign Plate all wear
the same Plate), plus one per unique; never a recoloured copy. Each set is
one transparent component sheet from the image generator, laid out as a grid
of separate pieces (rows = views front / side / back, columns = layers).
scripts/import-doll-art.py fits each piece onto the 512 px rig canvas.

Writes, per set, <set>.prompt.txt, and manifest.json (set, slot, layers,
grid, the items it dresses); and reference-<view>.png: the bare Wayfarer
composed from the live base parts, to attach to every prompt with
public/ui/painted/items-v2.png as the style reference.

    python scripts/plan-doll-art.py
"""
import importlib.util
import json
import os
import re

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
KIT = os.path.join(ROOT, "public", "sprites", "wayfarer")
OUT = os.path.join(ROOT, "art-source", "doll-v3")
TIER = r"^(Worn|Bronze|Iron|Steel|Cobalt|Runic|Mythril|Ember|Star|Sovereign) "
VIEWS = ("front", "side", "back")

# Columns of each slot's sheet, in order (rows are the three views).
LAYERS = {
    "weapon": ["weapon"],
    "head": ["head"],
    "armor": ["torso", "cape", "arm_near", "arm_far", "forearm_near", "forearm_far"],
    "gloves": ["hand_near", "hand_far", "hand_near_open", "hand_far_open"],
    "boots": ["shin_near", "shin_far"],
}
PIECE = {
    "weapon": "the weapon alone, upright, grip at the bottom of the cell, nothing else",
    "head": "the headgear alone as worn, sized for the chibi head, hollow where the head goes, no head, no face, no hair",
    "torso": "the body piece of the armour alone (chest to hips, no arms, no head, no legs), neck opening at the top",
    "cape": "the back cloth / cape / tail of the armour alone, hanging from the shoulders; an empty transparent cell if this armour has none",
    "arm_near": "the NEAR (character's right) UPPER SLEEVE alone, shoulder at the top to the elbow at the bottom, broad rounded shoulder",
    "arm_far": "the FAR (character's left) UPPER SLEEVE alone, matching",
    "forearm_near": "the NEAR LOWER SLEEVE / BRACER alone, elbow at the top, ending at the wrist",
    "forearm_far": "the FAR LOWER SLEEVE / BRACER alone, matching",
    "hand_near": "the NEAR hand in the glove, CLOSED GRIP holding an invisible handle, wrist cuff at the top",
    "hand_far": "the FAR hand in the glove, closed loose fist, wrist cuff at the top",
    "hand_near_open": "the NEAR hand in the glove, OPEN with fingers spread, wrist cuff at the top",
    "hand_far_open": "the FAR hand in the glove, OPEN with fingers spread, wrist cuff at the top",
    "shin_near": "the NEAR boot alone, from below the knee down to the sole, foot pointing like the reference",
    "shin_far": "the FAR boot alone, matching",
}
VIEW_TEXT = {
    "front": "FRONT view (facing the camera; near = the character's right = screen LEFT)",
    "side": "true LEFT SIDE view (facing screen left; near = the side toward the camera)",
    "back": "BACK view (near = the character's right = screen RIGHT)",
}


def briefs():
    """The design of each set, from the icon plan (one look per type)."""
    spec = importlib.util.spec_from_file_location("item_icons", os.path.join(ROOT, "scripts", "plan-item-icons.py"))
    icons = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(icons)
    return icons.GEAR, icons.UNIQUE


def reference():
    """The bare Wayfarer per view: base parts stacked in the rig's order."""
    rig = json.load(open(os.path.join(KIT, "rig.json"), encoding="utf-8"))
    for view in VIEWS:
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        for part in rig["views"][view]["order"]:
            f = os.path.join(KIT, "base", view, part + ".png")
            if os.path.exists(f):
                canvas = Image.alpha_composite(canvas, Image.open(f).convert("RGBA"))
        canvas.save(os.path.join(OUT, f"reference-{view}.png"))


def main():
    gear, unique = briefs()
    items = json.load(open(os.path.join(ROOT, "public", "data", "items.json"), encoding="utf-8"))
    sets = {}
    for it in items:
        e = it.get("equip") or {}
        if e.get("slot") not in LAYERS or (e.get("drop_pool") is None and not e.get("unique") and not it.get("drop_pool")):
            continue
        if e.get("unique"):
            sid, design = "unique_" + re.sub(r"\W+", "_", it["name"].lower()).strip("_"), unique[it["name"]]
        else:
            noun = re.sub(TIER, "", it["name"])
            sid, design = e["slot"] + "_" + noun.lower(), gear[(e["slot"], noun)]
        s = sets.setdefault(sid, {"set": sid, "visual": "doll_" + sid, "slot": e["slot"], "design": design,
                                  "job": e.get("job"), "layers": LAYERS[e["slot"]], "items": []})
        s["items"].append(it["id"])
    os.makedirs(OUT, exist_ok=True)
    reference()
    for s in sets.values():
        cols = len(s["layers"])
        lines = []
        for r, view in enumerate(VIEWS):
            cells = "; ".join(f"{c + 1} {PIECE[l]}" for c, l in enumerate(s["layers"]))
            lines.append(f"ROW{r + 1} {VIEW_TEXT[view]}: {cells}.")
        prompt = (
            "Use case: stylized-concept. Transparent sprite COMPONENT ATLAS of one equipment set for the same chibi young-adult "
            "fantasy adventurer as the attached references reference-front.png, reference-side.png and reference-back.png, in "
            "the hand-painted style of the attached items-v2.png (Ragnarok Online / Tree of Savior tradition, original design). "
            f"The equipment: {s['design']}. Paint it as worn by this character, same proportions and light from the upper left, "
            "soft painterly shading, a darker outline in the piece's own colour (not black). "
            f"EXACT {cols} COLUMN{'S' if cols > 1 else ''} by 3 ROWS of equal cells, one separated piece per cell, generous "
            "transparent margins, nothing crosses a cell edge. Pieces that join another part have softly ROUNDED, fully painted "
            "closed ends that overlap the joint; no holes, no cut-away cavities, no body parts that the equipment does not cover. "
            "No text, no grid lines, no background, no ground shadow.\n" + "\n".join(lines)
        )
        open(os.path.join(OUT, s["set"] + ".prompt.txt"), "w", encoding="utf-8", newline="\n").write(prompt + "\n")
    manifest = {"about": "Paper-doll art v3: scripts/plan-doll-art.py writes this; scripts/import-doll-art.py imports <set>.png.",
                "views": list(VIEWS), "sets": sorted(sets.values(), key=lambda s: s["set"])}
    json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
    print(len(sets), "sets:", ", ".join(sorted(sets)))


if __name__ == "__main__":
    main()
