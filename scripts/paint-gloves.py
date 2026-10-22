"""Paints public/ui/painted/gear-v1.png: a 3x1 atlas of gloves icons in the
style of systems-v1.png, one per primary armour kind (src/ui/art.ts
GLOVES_ART): Armour steel handguards, Evasion leather gloves, Aether Shield
cloth wraps. A stopgap until the painted v3 sheets (ITEM_ART.md) cover
gloves; the paper doll gets real glove art from scripts/import-doll-art.py.

    python scripts/paint-gloves.py
"""
import importlib.util
import os

from PIL import Image

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("system_icons", os.path.join(HERE, "paint-system-icons.py"))
si = importlib.util.module_from_spec(spec)
spec.loader.exec_module(si)
Cell, P, E, gleam = si.Cell, si.P, si.E, si.gleam

ICONS = os.path.join(HERE, "..", "public", "ui", "painted", "gear-v1.png")


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


if __name__ == "__main__":
    icons()
