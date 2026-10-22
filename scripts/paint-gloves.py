"""Paints the gloves (CHARACTER_SYSTEMS.md §4.1):

1. public/ui/painted/gear-v1.png: a 3x1 atlas of painted gloves icons in the
   style of systems-v1.png, one per primary armour kind (src/ui/art.ts
   GLOVES_ART): Armour steel handguards, Evasion leather gloves, Aether
   Shield cloth wraps.
2. The paper-doll layers: public/sprites/wayfarer/items/gen_gloves_<kind>_e<era>/
   <view>/hand_near.png, hand_far.png and their _open variants. Each is the
   Wayfarer's own hand recoloured as the glove (shading kept), with a cuff
   at the wrist; eras as in paint-gear-variants.py (bronze/leather, steel,
   mythic with a gold rim). content/build.ts maps the gloves bases to them.

    python scripts/paint-gloves.py
"""
import importlib.util
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("system_icons", os.path.join(HERE, "paint-system-icons.py"))
si = importlib.util.module_from_spec(spec)
spec.loader.exec_module(si)
Cell, P, E, gleam = si.Cell, si.P, si.E, si.gleam

ICONS = os.path.join(HERE, "..", "public", "ui", "painted", "gear-v1.png")
WAYFARER = os.path.join(HERE, "..", "public", "sprites", "wayfarer")


# --- icons -----------------------------------------------------------------------------

def glove(c, light, dark, cuff_light, cuff_dark, plates=False, wraps=False, gem=None):
    """A gloved right hand, fingers up, thumb out to the left, cuff below."""
    # cuff
    c.part(lambda d: d.polygon(P([(52, 152), (118, 152), (114, 120), (56, 120)]), fill=255), cuff_light, cuff_dark, angle=0)
    # palm and back of the hand
    c.part(lambda d: d.rounded_rectangle(E(86, 96, 32, 30), radius=14 * si.SS, fill=255), light, dark)
    # four fingers
    for x, top in ((64, 34), (79, 26), (94, 28), (108, 40)):
        c.part(lambda d, x=x, top=top: d.rounded_rectangle([(x - 7) * si.SS, top * si.SS, (x + 7) * si.SS, 92 * si.SS], radius=7 * si.SS, fill=255), light, dark)
    # thumb
    c.part(lambda d: d.polygon(P([(56, 104), (34, 80), (30, 66), (40, 62), (60, 82), (64, 98)]), fill=255), light, dark)
    if plates:  # steel knuckle and finger plates
        c.part(lambda d: d.rounded_rectangle(E(86, 84, 31, 7), radius=3 * si.SS, fill=255), (235, 240, 250), (120, 130, 150))
        for x in (64, 79, 94, 108):
            c.part(lambda d, x=x: d.rectangle(E(x, 60, 6, 2.5), fill=255), (60, 66, 80), (30, 34, 44), rim=False)
    if wraps:  # cloth bands across the hand
        for y in (74, 92, 110):
            c.part(lambda d, y=y: d.polygon(P([(52, y), (120, y - 8), (120, y - 2), (52, y + 6)]), fill=255), (220, 235, 255), (110, 140, 200), rim=False)
    if gem:
        c.part(lambda d: d.ellipse(E(85, 136, 9, 9), fill=255), tuple(min(255, v + 90) for v in gem), gem, glow_color=gem, glow_r=10, radial=True)
    c.img = gleam(c.img, 74, 84, 6)


def icons():
    cells = [
        lambda c: glove(c, (205, 214, 228), (84, 94, 114), (190, 160, 100), (100, 70, 34), plates=True, gem=(80, 220, 210)),
        lambda c: glove(c, (200, 136, 80), (96, 54, 28), (150, 96, 52), (70, 40, 20)),
        lambda c: glove(c, (130, 170, 235), (40, 62, 140), (214, 180, 100), (120, 84, 34), wraps=True, gem=(120, 200, 255)),
    ]
    atlas = Image.new("RGBA", (si.CELL * 3, si.CELL), si.BG)
    for i, fn in enumerate(cells):
        c = Cell()
        fn(c)
        atlas.paste(c.render(), (i * si.CELL, 0))
    atlas.save(ICONS)
    print("wrote", ICONS)


# --- paper-doll layers -----------------------------------------------------------------

# Glove colour ramps (shadow -> light) per kind, and the cuff colour.
KIND = {
    "armour": ((46, 52, 64), (214, 222, 236), (150, 120, 70)),
    "evasion": ((52, 30, 16), (204, 142, 86), (110, 70, 36)),
    "shield": ((24, 36, 92), (150, 190, 250), (200, 168, 96)),
}
# Era: value scale, saturation scale, and a gold rim for mythic.
ERA = {1: (0.92, 0.85, False), 2: (1.05, 1.0, False), 3: (0.8, 1.2, True)}
VIEWS = ("front", "side", "back")
PARTS = ("hand_near", "hand_far", "hand_near_open", "hand_far_open")


def recolour(src, kind, era):
    a = np.asarray(src.convert("RGBA")).astype(np.float32)
    alpha = a[..., 3]
    lum = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11) / 255.0
    lum = np.clip((lum - 0.15) / 0.75, 0, 1)
    lo, hi, cuff = (np.array(x, np.float32) for x in KIND[kind])
    value, sat, gold = ERA[era]
    rgb = lo + (hi - lo) * lum[..., None]
    grey = rgb.mean(axis=2, keepdims=True)
    rgb = np.clip((grey + (rgb - grey) * sat) * value, 0, 255)
    # Cuff: the top rows of the hand (the wrist), a little wider than the hand.
    ys = np.where(alpha.max(axis=1) > 0)[0]
    if len(ys):
        top = ys[0]
        band = np.zeros_like(alpha, dtype=bool)
        band[top:top + 7] = True
        solid = Image.fromarray((alpha > 40).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))
        widened = np.asarray(solid) > 0
        cuff_mask = band & widened
        shade = 0.75 + 0.35 * lum[..., None]
        rgb = np.where(cuff_mask[..., None], np.clip(cuff * shade * value, 0, 255), rgb)
        alpha = np.where(cuff_mask, 255, alpha)
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    # Dark outline, and a gold one outside it for mythic gloves.
    m = img.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    ring = Image.eval(m.filter(ImageFilter.MaxFilter(3)), lambda v: v)
    edge = Image.fromarray(np.clip(np.asarray(ring).astype(int) - np.asarray(m).astype(int), 0, 255).astype(np.uint8))
    base = Image.new("RGBA", img.size, (0, 0, 0, 0))
    if gold:
        outer = m.filter(ImageFilter.MaxFilter(5))
        gold_edge = Image.fromarray(np.clip(np.asarray(outer).astype(int) - np.asarray(ring).astype(int), 0, 255).astype(np.uint8))
        g = Image.new("RGBA", img.size, (232, 190, 92, 255))
        g.putalpha(gold_edge)
        base = Image.alpha_composite(base, g)
    line = Image.new("RGBA", img.size, (24, 16, 10, 255))
    line.putalpha(edge)
    base = Image.alpha_composite(base, line)
    return Image.alpha_composite(base, img)


def layers():
    n = 0
    for kind in KIND:
        for era in ERA:
            for view in VIEWS:
                folder = os.path.join(WAYFARER, "items", f"gen_gloves_{kind}_e{era}", view)
                os.makedirs(folder, exist_ok=True)
                for part in PARTS:
                    src = Image.open(os.path.join(WAYFARER, "base", view, part + ".png"))
                    recolour(src, kind, era).save(os.path.join(folder, part + ".png"))
                    n += 1
    print("wrote", n, "glove layers")


if __name__ == "__main__":
    icons()
    layers()
