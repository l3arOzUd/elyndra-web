"""Imports the paper-doll component sheets v3 (art-source/doll-v3/<set>.png,
made from <set>.prompt.txt) onto the 512 px rig canvas:
public/sprites/wayfarer/items/doll_<set>/<view>/<layer>.png.

Each piece is cut from its grid cell by its alpha, then fitted (aspect kept)
into the box the same layer occupies on the live kit: the Leafweave Coat for
armour, the Traveler Boots for boots, the bare hands for gloves, the painted
helm footprint for headgear, the job's hand-drawn weapon for weapons. Limbs
hang from the top of the box (their joint), the rest is centred. Writes
art-source/doll-v3/imported.json (visual -> layers present), which
content/build.ts uses to dress every item of the set.

    python scripts/import-doll-art.py
"""
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
KIT = os.path.join(ROOT, "public", "sprites", "wayfarer")
SRC = os.path.join(ROOT, "art-source", "doll-v3")
WEAPON_REF = {"vanguard": "copper_saber", "strider": "surveyor_bow", "arcanist": "aether_rod"}
HANGING = ("arm_", "forearm_", "hand_", "shin_")


def bbox(path, grow=0):
    a = np.asarray(Image.open(path).convert("RGBA"))[..., 3]
    ys, xs = np.where(a > 24)
    return (xs.min() - grow, ys.min() - grow, xs.max() + 1 + grow, ys.max() + 1 + grow)


def target(s, view, layer):
    """Where this layer sits on the canvas: the matching live layer's box."""
    if s["slot"] == "armor":
        return bbox(os.path.join(KIT, "items", "leafweave_coat", view, layer + ".png"))
    if s["slot"] == "boots":
        return bbox(os.path.join(KIT, "items", "traveler_boots", view, layer + ".png"), 2)
    if s["slot"] == "gloves":
        return bbox(os.path.join(KIT, "base", view, layer + ".png"), 2)
    if s["slot"] == "head":
        return bbox(os.path.join(KIT, "items", "iron_helm", view, "head.png"))
    ref = WEAPON_REF.get(s.get("job") or "vanguard")
    if ref:
        return bbox(os.path.join(KIT, "items", ref, view, "weapon.png"))
    # Machinist gauntlet: round the near hand, larger.
    x0, y0, x1, y1 = bbox(os.path.join(KIT, "base", view, "hand_near.png"))
    w, h = x1 - x0, y1 - y0
    return (x0 - w, y0 - h // 2, x1 + w, y1 + h)


def fit(piece, box, hanging):
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    k = min(bw / piece.width, bh / piece.height)
    p = piece.resize((max(1, round(piece.width * k)), max(1, round(piece.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    x = x0 + (bw - p.width) // 2
    y = y0 if hanging else y0 + (bh - p.height) // 2
    out.alpha_composite(p, (int(x), int(y)))
    return out


def main():
    manifest = json.load(open(os.path.join(SRC, "manifest.json"), encoding="utf-8"))
    path = os.path.join(SRC, "imported.json")
    imported = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    for s in manifest["sets"]:
        sheet = os.path.join(SRC, s["set"] + ".png")
        if not os.path.exists(sheet):
            continue
        img = Image.open(sheet).convert("RGBA")
        cols, rows = len(s["layers"]), len(manifest["views"])
        present = set()
        for r, view in enumerate(manifest["views"]):
            folder = os.path.join(KIT, "items", s["visual"], view)
            os.makedirs(folder, exist_ok=True)
            for c, layer in enumerate(s["layers"]):
                cell = img.crop((img.width * c // cols, img.height * r // rows, img.width * (c + 1) // cols, img.height * (r + 1) // rows))
                a = np.asarray(cell)[..., 3]
                ys, xs = np.where(a > 24)
                if len(xs) < 40:
                    print(f" - {s['set']} {view} {layer}: empty, left out")
                    continue
                piece = cell.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
                fit(piece, target(s, view, layer), layer.startswith(HANGING)).save(os.path.join(folder, layer + ".png"))
                present.add(layer)
        imported[s["visual"]] = sorted(present)
        print("imported", s["set"], sorted(present))
    json.dump(imported, open(path, "w", encoding="utf-8", newline="\n"), indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
