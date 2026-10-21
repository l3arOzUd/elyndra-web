"""Recolours the hand-drawn Wayfarer gear into variants for the generated
gear bases (content/systems.ts): three eras (tiers 1-3 bronze/leather,
4-6 steel, 7-10 mythic) x the kind (Armour steel, Evasion leather, Aether
Shield blue) or the job (weapons). Output: public/sprites/wayfarer/items/
gen_<slot>_<group>_e<era>/<view>/<layer>.png, same canvas and pose as the
source. content/build.ts maps every generated base to its variant.

Eras also differ in shape, not only colour: steel gear gets an outer steel
edge, mythic gear a dark outline, a gold rim and glowing gem studs.

    python scripts/paint-gear-variants.py
"""
import os

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "wayfarer", "items")
VIEWS = ("front", "side", "back")

# (hue shift in turns, saturation x, value x) per era and per group.
ERA = {1: (0.0, 1.0, 1.0), 2: (0.0, 0.45, 1.12), 3: (0.0, 1.15, 1.06)}
GROUP = {
    "armour": (0.0, 0.35, 1.08),   # steel grey
    "evasion": (0.0, 1.0, 1.0),    # leather as drawn
    "shield": (0.52, 1.05, 1.05),  # Aether blue-teal
    "vanguard": (0.0, 1.0, 1.0), "strider": (0.0, 1.0, 1.0), "arcanist": (0.0, 1.0, 1.0),
    "machinist": (0.08, 0.8, 0.95),
    "helm": (0.0, 1.0, 1.0), "hood": (0.0, 1.0, 1.0), "circlet": (0.0, 1.0, 1.0),
}
# Mythic era also turns hues toward violet-gold.
MYTHIC_HUE = 0.72

SOURCES = {
    "weapon": {"vanguard": "copper_saber", "strider": "surveyor_bow", "arcanist": "aether_rod", "machinist": "copper_saber"},
    "armor": {"armour": "leafweave_coat", "evasion": "leafweave_coat", "shield": "leafweave_coat"},
    "boots": {"armour": "traveler_boots", "evasion": "traveler_boots", "shield": "traveler_boots"},
    "head": {"armour": "iron_helm", "evasion": "leather_hood", "shield": "aether_circlet"},
}


def recolor(img, era, group):
    a = np.asarray(img.convert("RGBA")).astype(np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3:]
    flat = rgb.reshape(-1, 3)
    # HSV, vectorised
    r, g, b = flat[:, 0], flat[:, 1], flat[:, 2]
    mx, mn = flat.max(1), flat.min(1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0)
    gc = np.where(m, (mx - g) / np.where(m, d, 1), 0)
    bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = np.where(m, (h / 6.0) % 1.0, 0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    v = mx
    gh, gs, gv = GROUP[group]
    eh, es, ev = ERA[era]
    h = (h + gh + eh) % 1.0
    if era == 3:
        h = (h * 0.4 + MYTHIC_HUE * 0.6) % 1.0
    s = np.clip(s * gs * es, 0, 1)
    v = np.clip(v * gv * ev, 0, 1)
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.choose(i[:, None], [np.stack([v, t, p], 1), np.stack([q, v, p], 1), np.stack([p, v, t], 1),
                        np.stack([p, q, v], 1), np.stack([t, p, v], 1), np.stack([v, p, q], 1)])
    rgba = np.concatenate([out.reshape(rgb.shape), alpha], axis=2)
    return Image.fromarray((rgba * 255).round().astype(np.uint8), "RGBA")


def grow(alpha, px):
    """The silhouette grown by px pixels (alpha as an 'L' image)."""
    return alpha.filter(ImageFilter.MaxFilter(px * 2 + 1))


def trim(img, era):
    """Era ornaments around the drawn shape; era 1 stays as drawn."""
    if era == 1 or img.getbbox() is None:
        return img
    a = img.getchannel("A").point(lambda v: 255 if v > 96 else 0)
    out = Image.new("RGBA", img.size)
    if era == 2:
        out.paste((150, 160, 172, 255), mask=grow(a, 2))
        out.paste((52, 56, 64, 255), mask=Image.fromarray(np.asarray(grow(a, 2)) & ~np.asarray(grow(a, 1))))
    else:
        out.paste((40, 24, 52, 255), mask=grow(a, 3))
        out.paste((232, 194, 92, 255), mask=grow(a, 2))
    out.alpha_composite(img)
    if era == 3:
        # Gem studs on the upper rim, spaced along the shape's width.
        x0, y0, x1, y1 = img.getbbox()
        arr = np.asarray(a)
        glow = Image.new("RGBA", img.size)
        from PIL import ImageDraw
        d = ImageDraw.Draw(glow)
        n = max(1, (x1 - x0) // 28)
        for i in range(n):
            x = x0 + (x1 - x0) * (i + 1) // (n + 1)
            ys = np.nonzero(arr[:, x])[0]
            if not len(ys):
                continue
            y = int(ys[0]) + 3
            d.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(190, 120, 255, 90))
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(236, 190, 255, 255))
            d.point((x - 1, y - 1), fill=(255, 255, 255, 255))
        out.alpha_composite(glow.filter(ImageFilter.GaussianBlur(0.6)))
    return out


def main():
    made = 0
    for slot, groups in SOURCES.items():
        for group, src in groups.items():
            for era in (1, 2, 3):
                name = f"gen_{slot}_{group}_e{era}"
                for view in VIEWS:
                    sd = os.path.join(ROOT, src, view)
                    if not os.path.isdir(sd):
                        continue
                    od = os.path.join(ROOT, name, view)
                    os.makedirs(od, exist_ok=True)
                    for f in os.listdir(sd):
                        if f.endswith(".png"):
                            trim(recolor(Image.open(os.path.join(sd, f)), era, group), era).save(os.path.join(od, f), optimize=True)
                            made += 1
    print("wrote", made, "layer images")


if __name__ == "__main__":
    main()
