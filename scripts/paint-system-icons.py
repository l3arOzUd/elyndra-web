"""Paints public/ui/painted/systems-v1.png: a 6x6 atlas of illustrated icons
for the character systems (CHARACTER_SYSTEMS.md) in the style of
items-v2.png: one object per cell on #211d1a, gradients, rim light, soft
highlights, glow and a contact shadow. Cell order is the contract with
src/ui/art.ts (SYSTEM_ICONS).

    python scripts/paint-system-icons.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

CELL = 170
SS = 4  # supersampling
S = CELL * SS
BG = (33, 29, 26, 255)
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "ui", "painted", "systems-v1.png")


def mask(draw_fn):
    m = Image.new("L", (S, S), 0)
    draw_fn(ImageDraw.Draw(m))
    return m


def gradient(c1, c2, angle=90, radial=False):
    """A full-cell gradient from c1 to c2 (vertical by default)."""
    ys, xs = np.mgrid[0:S, 0:S].astype(np.float32)
    if radial:
        t = np.minimum(1, np.hypot(xs - S * 0.42, ys - S * 0.38) / (S * 0.55))
    else:
        a = math.radians(angle)
        t = np.clip(((xs - S / 2) * math.cos(a) + (ys - S / 2) * math.sin(a)) / S + 0.5, 0, 1)
    c1, c2 = np.array(c1[:3], np.float32), np.array(c2[:3], np.float32)
    rgb = c1 + (c2 - c1) * t[..., None]
    rgba = np.dstack([rgb, np.full((S, S), 255, np.float32)]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def shaded(m, c1, c2, outline=(20, 12, 8), angle=90, radial=False, rim=True):
    """Fill a mask with a gradient, an inner shadow, a soft highlight and an outline."""
    body = gradient(c1, c2, angle, radial)
    # brush texture: soft value noise so fills read as painted, not flat
    noise = Image.effect_noise((S // 8, S // 8), 40).resize((S, S), Image.BICUBIC).filter(ImageFilter.GaussianBlur(SS * 2))
    tex = Image.merge("RGBA", (noise, noise, noise, noise.point(lambda v: int(abs(v - 128) * 0.5))))
    body = ImageChops.soft_light(body, tex) if hasattr(ImageChops, "soft_light") else body
    body.putalpha(m)
    # inner shadow (bottom-right) and highlight (top-left)
    shadow = ImageChops.offset(m, -SS * 6, -SS * 6).filter(ImageFilter.GaussianBlur(SS * 5))
    dark = Image.new("RGBA", (S, S), (0, 0, 0, 255))
    dark.putalpha(ImageChops.multiply(ImageChops.invert(shadow), m).point(lambda v: int(v * 0.45)))
    body = Image.alpha_composite(body, dark)
    if rim:
        hi = ImageChops.offset(m, SS * 5, SS * 5).filter(ImageFilter.GaussianBlur(SS * 4))
        light = Image.new("RGBA", (S, S), (255, 245, 220, 255))
        light.putalpha(ImageChops.multiply(ImageChops.invert(hi), m).point(lambda v: int(v * 0.35)))
        body = Image.alpha_composite(body, light)
    edge = ImageChops.subtract(m.filter(ImageFilter.MaxFilter(SS * 2 + 1)), m)
    line = Image.new("RGBA", (S, S), outline + (255,))
    line.putalpha(edge)
    return Image.alpha_composite(line, body)


def glow(m, color, radius=14, strength=0.9):
    g = Image.new("RGBA", (S, S), color + (255,))
    g.putalpha(m.filter(ImageFilter.GaussianBlur(SS * radius)).point(lambda v: int(min(255, v * strength))))
    return g


def gleam(img, x, y, r=7):
    m = mask(lambda d: d.ellipse([x * SS - r * SS, y * SS - r * SS, x * SS + r * SS, y * SS + r * SS], fill=255))
    g = Image.new("RGBA", (S, S), (255, 255, 240, 255))
    g.putalpha(m.filter(ImageFilter.GaussianBlur(SS * 3)).point(lambda v: int(v * 0.85)))
    return Image.alpha_composite(img, g)


def P(points):
    return [(x * SS, y * SS) for x, y in points]


def E(cx, cy, rx, ry):
    return [(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS]


class Cell:
    def __init__(self):
        self.img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        self.masks = []

    def add(self, layer):
        self.img = Image.alpha_composite(self.img, layer)

    def part(self, draw_fn, c1, c2, glow_color=None, glow_r=14, **kw):
        m = mask(draw_fn)
        self.masks.append(m)
        if glow_color:
            self.add(glow(m, glow_color, glow_r))
        self.add(shaded(m, c1, c2, **kw))
        return m

    def render(self):
        out = Image.new("RGBA", (S, S), BG)
        union = Image.new("L", (S, S), 0)
        for m in self.masks:
            union = ImageChops.lighter(union, m)
        sh = Image.new("RGBA", (S, S), (0, 0, 0, 255))
        sh.putalpha(ImageChops.offset(union, SS * 4, SS * 7).filter(ImageFilter.GaussianBlur(SS * 6)).point(lambda v: int(v * 0.7)))
        out = Image.alpha_composite(out, sh)
        out = Image.alpha_composite(out, self.img)
        return out.resize((CELL, CELL), Image.LANCZOS)


# --- shared shapes -----------------------------------------------------------------

def star(cx, cy, r1, r2, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r1 if i % 2 == 0 else r2
        a = math.radians(rot + i * 180 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return P(pts)


def totem(c, color, glyph):
    """A carved wooden totem post with a glowing gem and a glyph."""
    c.part(lambda d: d.polygon(P([(62, 150), (108, 150), (104, 52), (66, 52)]), fill=255), (139, 94, 52), (74, 44, 24), angle=0)
    c.part(lambda d: d.rounded_rectangle(E(85, 46, 34, 26), radius=10 * SS, fill=255), (160, 112, 64), (88, 54, 28))
    c.part(lambda d: d.polygon(P([(48, 50), (70, 30), (100, 30), (122, 50), (85, 58)]), fill=255), (196, 152, 84), (120, 80, 36))
    for y in (78, 100, 122):
        c.part(lambda d, y=y: d.rectangle(E(85, y, 21, 2.5), fill=255), (60, 36, 18), (40, 24, 12), rim=False)
    c.part(lambda d: d.ellipse(E(85, 46, 13, 13), fill=255), tuple(min(255, v + 90) for v in color), color, glow_color=color, glow_r=16, radial=True)
    glyph(c)
    c.img = gleam(c.img, 80, 41, 4)


def charm(c, gem, rim=(214, 170, 82), rim2=(120, 80, 30)):
    c.part(lambda d: d.ellipse(E(85, 30, 12, 12), fill=255) or d.ellipse(E(85, 30, 6, 6), fill=0), rim, rim2)
    c.part(lambda d: d.ellipse(E(85, 95, 46, 50), fill=255), rim, rim2)
    c.part(lambda d: d.ellipse(E(85, 95, 34, 38), fill=255), (70, 50, 36), (34, 24, 18), rim=False)
    c.part(lambda d: d.polygon(P([(85, 64), (108, 95), (85, 128), (62, 95)]), fill=255), tuple(min(255, v + 100) for v in gem), gem, glow_color=gem, glow_r=12, radial=True)
    c.img = gleam(c.img, 78, 80, 5)


# --- the 36 icons --------------------------------------------------------------------

def pow_(c):  # a gauntleted fist with flame
    c.part(lambda d: d.polygon(P([(85, 18), (112, 60), (100, 56), (108, 86), (85, 70), (62, 86), (70, 56), (58, 60)]), fill=255), (255, 214, 120), (220, 72, 30), glow_color=(255, 110, 40), glow_r=12)
    c.part(lambda d: d.rounded_rectangle(E(85, 115, 36, 32), radius=12 * SS, fill=255), (196, 112, 70), (110, 50, 30))
    for x in (64, 78, 92, 106):
        c.part(lambda d, x=x: d.rounded_rectangle(E(x, 92, 7, 12), radius=5 * SS, fill=255), (220, 140, 90), (130, 66, 36))


def luk(c):  # four-leaf clover with a coin
    for a in (0, 90, 180, 270):
        r = math.radians(a - 45)
        cx, cy = 85 + 24 * math.cos(r), 78 + 24 * math.sin(r)
        c.part(lambda d, cx=cx, cy=cy: d.ellipse(E(cx, cy, 22, 22), fill=255), (150, 230, 110), (40, 120, 40), glow_color=(90, 200, 90), glow_r=8)
    c.part(lambda d: d.polygon(P([(83, 90), (89, 90), (100, 150), (92, 150)]), fill=255), (90, 160, 60), (40, 90, 30))
    c.part(lambda d: d.ellipse(E(85, 78, 13, 13), fill=255), (255, 236, 150), (196, 140, 40), radial=True)


def agi(c):  # winged boot-feather
    for i, (dx, dy) in enumerate([(0, 0), (16, 14), (32, 28)]):
        c.part(lambda d, dx=dx, dy=dy: d.polygon(P([(40 + dx, 120 - dy), (110 + dx, 30 + dy * 0.3), (128 + dx * 0.4, 46 + dy * 0.6), (60 + dx, 132 - dy * 0.5)]), fill=255), (200, 240, 255), (70, 150, 210), glow_color=(120, 200, 255), glow_r=8)
    c.part(lambda d: d.line(P([(44, 128), (124, 42)]), fill=255, width=4 * SS), (240, 250, 255), (160, 200, 230))


def dex(c):  # an arrow through a target
    c.part(lambda d: d.ellipse(E(85, 88, 54, 54), fill=255), (240, 220, 180), (170, 120, 70))
    c.part(lambda d: d.ellipse(E(85, 88, 38, 38), fill=255), (220, 70, 50), (130, 30, 24))
    c.part(lambda d: d.ellipse(E(85, 88, 22, 22), fill=255), (240, 220, 180), (170, 120, 70))
    c.part(lambda d: d.ellipse(E(85, 88, 9, 9), fill=255), (255, 210, 80), (200, 120, 20), glow_color=(255, 200, 60), glow_r=6)
    c.part(lambda d: d.line(P([(30, 145), (88, 87)]), fill=255, width=5 * SS), (190, 140, 80), (110, 70, 30))
    c.part(lambda d: d.polygon(P([(26, 150), (40, 128), (48, 134)]), fill=255), (230, 230, 230), (140, 140, 150))


def int_(c):  # a crystal orb on a stand
    c.part(lambda d: d.polygon(P([(60, 150), (110, 150), (98, 124), (72, 124)]), fill=255), (200, 160, 90), (110, 76, 36))
    c.part(lambda d: d.ellipse(E(85, 80, 44, 44), fill=255), (190, 160, 255), (60, 40, 170), glow_color=(140, 110, 255), glow_r=18, radial=True)
    c.part(lambda d: d.polygon(star(85, 80, 22, 9, 4, -90), fill=255), (255, 255, 255), (190, 200, 255), rim=False)
    c.img = gleam(c.img, 70, 62, 8)


def vit(c):  # a heart with a leaf band
    c.part(lambda d: d.ellipse(E(64, 70, 28, 28), fill=255) or d.ellipse(E(106, 70, 28, 28), fill=255) or d.polygon(P([(38, 80), (132, 80), (85, 145)]), fill=255), (255, 120, 110), (150, 20, 40), glow_color=(230, 60, 70), glow_r=10, radial=True)
    c.part(lambda d: d.arc(E(85, 96, 50, 26), 200, 340, fill=255, width=6 * SS), (130, 220, 110), (40, 120, 50))
    c.img = gleam(c.img, 58, 58, 8)


def helm(c):
    c.part(lambda d: d.chord(E(85, 92, 52, 56), 180, 360, fill=255) or d.rectangle(E(85, 104, 52, 14), fill=255), (200, 210, 225), (90, 100, 120))
    c.part(lambda d: d.rectangle(E(85, 104, 40, 6), fill=255), (40, 44, 54), (20, 22, 28), rim=False)
    c.part(lambda d: d.polygon(P([(85, 28), (95, 50), (85, 60), (75, 50)]), fill=255), (90, 220, 210), (30, 120, 130), glow_color=(80, 220, 220), glow_r=8)
    c.part(lambda d: d.polygon(P([(30, 70), (14, 40), (44, 60)]), fill=255) or d.polygon(P([(140, 70), (156, 40), (126, 60)]), fill=255), (240, 230, 200), (160, 140, 100))


def talisman(c):
    c.part(lambda d: d.arc(E(85, 60, 40, 44), 200, 340, fill=255, width=4 * SS), (230, 190, 100), (150, 100, 40))
    c.part(lambda d: d.polygon(P([(85, 64), (120, 100), (85, 150), (50, 100)]), fill=255), (220, 180, 90), (120, 80, 30))
    c.part(lambda d: d.polygon(P([(85, 78), (106, 102), (85, 134), (64, 102)]), fill=255), (130, 240, 230), (20, 120, 140), glow_color=(70, 220, 220), glow_r=12, radial=True)
    c.img = gleam(c.img, 78, 92, 5)


def basic(c):  # crossed blades
    for flip in (1, -1):
        c.part(lambda d, f=flip: d.polygon(P([(85 - 52 * f, 140), (85 - 44 * f, 146), (85 + 46 * f, 38), (85 + 52 * f, 26), (85 + 40 * f, 32)]), fill=255), (240, 240, 250), (120, 130, 150))
        c.part(lambda d, f=flip: d.rounded_rectangle(E(85 - 40 * f, 128, 14, 5), radius=2 * SS, fill=255), (200, 150, 70), (110, 70, 30))


def totem_glyph(shape, color):
    def g(c):
        if shape == "flame":
            c.part(lambda d: d.polygon(P([(85, 94), (95, 112), (90, 130), (80, 130), (75, 112)]), fill=255), (255, 230, 120), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "bolt":
            c.part(lambda d: d.polygon(P([(90, 92), (76, 114), (86, 114), (80, 134), (96, 108), (86, 108)]), fill=255), (255, 255, 200), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "ring":
            c.part(lambda d: d.ellipse(E(85, 112, 13, 13), fill=255) or d.ellipse(E(85, 112, 7, 7), fill=0), (255, 255, 230), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "cross":
            c.part(lambda d: d.rectangle(E(85, 112, 4, 14), fill=255) or d.rectangle(E(85, 112, 14, 4), fill=255), (240, 255, 230), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "drop":
            c.part(lambda d: d.polygon(P([(85, 94), (96, 116), (85, 130), (74, 116)]), fill=255), (255, 160, 150), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "skull":
            c.part(lambda d: d.ellipse(E(85, 110, 12, 11), fill=255) or d.rectangle(E(85, 122, 7, 5), fill=255), (240, 235, 220), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "star":
            c.part(lambda d: d.polygon(star(85, 112, 13, 5, 5), fill=255), (255, 250, 210), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "swirl":
            c.part(lambda d: d.arc(E(85, 112, 13, 13), 30, 330, fill=255, width=4 * SS), (230, 255, 255), color, glow_color=color, glow_r=6, rim=False)
        elif shape == "thorn":
            c.part(lambda d: d.polygon(P([(85, 94), (90, 110), (102, 112), (90, 116), (85, 132), (80, 116), (68, 112), (80, 110)]), fill=255), (220, 255, 200), color, glow_color=color, glow_r=6, rim=False)
    return g


def skill_cell(c, shape, color):
    """Other jobs' skills: a disc of light holding a glyph, like the painted skill art."""
    c.part(lambda d: d.ellipse(E(85, 85, 60, 60), fill=255), tuple(min(255, v + 70) for v in color), tuple(v // 3 for v in color), glow_color=color, glow_r=16, radial=True)
    if shape == "prism":
        c.part(lambda d: d.polygon(P([(85, 40), (125, 115), (45, 115)]), fill=255), (255, 255, 255), (150, 200, 255), glow_color=(200, 230, 255), glow_r=8)
    elif shape == "nova":
        c.part(lambda d: d.polygon(star(85, 85, 48, 16, 8), fill=255), (255, 255, 230), color, rim=False)
    elif shape == "coil":
        for r in (40, 28, 16):
            c.part(lambda d, r=r: d.arc(E(85, 85, r, r), 0, 300, fill=255, width=5 * SS), (230, 210, 255), (120, 80, 200), rim=False)
    elif shape == "lance":
        c.part(lambda d: d.polygon(P([(30, 120), (128, 40), (138, 34), (132, 46), (38, 128)]), fill=255), (255, 255, 240), (200, 220, 255), glow_color=(255, 255, 220), glow_r=6)
    elif shape == "split":
        for a in (-30, 0, 30):
            r = math.radians(a - 90)
            c.part(lambda d, r=r: d.line(P([(85, 135), (85 + 60 * math.cos(r), 135 + 80 * math.sin(r))]), fill=255, width=4 * SS), (255, 250, 220), (180, 150, 80), rim=False)
    elif shape == "dash":
        for i in range(3):
            c.part(lambda d, i=i: d.polygon(P([(40 + i * 22, 60), (70 + i * 22, 85), (40 + i * 22, 110), (52 + i * 22, 85)]), fill=255), (220, 255, 240), (60, 180, 150), rim=False)
    elif shape == "mine":
        c.part(lambda d: d.ellipse(E(85, 95, 30, 22), fill=255), (180, 180, 190), (70, 70, 80))
        c.part(lambda d: d.ellipse(E(85, 88, 9, 9), fill=255), (255, 120, 80), (180, 40, 20), glow_color=(255, 80, 40), glow_r=8)
    elif shape == "gears":
        c.part(lambda d: d.polygon(star(70, 95, 32, 22, 8), fill=255), (230, 190, 110), (130, 90, 40))
        c.part(lambda d: d.polygon(star(110, 70, 24, 16, 7), fill=255), (210, 170, 90), (110, 70, 30))
    elif shape == "beacon":
        c.part(lambda d: d.polygon(P([(70, 140), (100, 140), (92, 70), (78, 70)]), fill=255), (200, 200, 210), (90, 90, 100))
        c.part(lambda d: d.ellipse(E(85, 60, 16, 16), fill=255), (220, 255, 220), (60, 200, 120), glow_color=(120, 255, 160), glow_r=14)


TOTEMS = [  # cell 12..23, in systems.ts TOTEM_TYPES order
    ("fury", (230, 60, 30), "flame"), ("haste", (80, 200, 230), "swirl"), ("focus", (90, 120, 255), "ring"),
    ("precision", (255, 200, 60), "star"), ("wildfire", (255, 120, 30), "flame"), ("bloodrush", (200, 20, 40), "drop"),
    ("surge", (80, 160, 255), "bolt"), ("bulwark", (180, 180, 200), "ring"), ("aegis", (110, 220, 255), "ring"),
    ("mending", (90, 220, 110), "cross"), ("gale", (160, 240, 210), "swirl"), ("hunt", (210, 150, 60), "star"),
]
ECHOES = [("echo_slaughter", (170, 40, 60), "skull"), ("echo_fury", (255, 210, 70), "bolt"), ("echo_spite", (110, 200, 90), "thorn")]
SKILLS = [("prism", (150, 200, 255)), ("nova", (200, 120, 255)), ("coil", (140, 90, 220)), ("lance", (255, 230, 150)),
          ("split", (230, 190, 90)), ("dash", (90, 220, 180)), ("mine", (220, 90, 60)), ("gears", (220, 170, 80)), ("beacon", (110, 230, 140))]


def main():
    cells = [pow_, luk, agi, dex, int_, vit, helm, talisman,
             lambda c: charm(c, (60, 170, 120)), lambda c: charm(c, (230, 90, 40), (250, 150, 80), (150, 60, 20)),
             lambda c: charm(c, (210, 120, 40), (200, 120, 230), (90, 40, 130)), basic]
    cells += [lambda c, col=col, sh=sh: totem(c, col, totem_glyph(sh, col)) for _, col, sh in TOTEMS]
    cells += [lambda c, col=col, sh=sh: totem(c, col, totem_glyph(sh, col)) for _, col, sh in ECHOES]
    cells += [lambda c, sh=sh, col=col: skill_cell(c, sh, col) for sh, col in SKILLS]
    assert len(cells) == 36, len(cells)
    atlas = Image.new("RGBA", (CELL * 6, CELL * 6), BG)
    for i, fn in enumerate(cells):
        c = Cell()
        fn(c)
        atlas.paste(c.render(), ((i % 6) * CELL, (i // 6) * CELL))
        print("cell", i)
    atlas.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
