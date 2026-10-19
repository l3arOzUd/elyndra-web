"""Paints the Wayfarer's headgear layers: items/<visual>/<front|side|back>/head.png
on the same 512x512 canvas and pose as base/<view>/head.png (CHARACTER_ART_GUIDE.md).
Three looks for the generated head bases (content/build.ts):
  iron_helm      Armour heads   - a steel dome, rim and a teal crest gem
  leather_hood   Evasion heads  - a hood that frames the face
  aether_circlet Shield heads   - a gold band with an Aether gem
The head art spans x 171-341, y 64-233; the face looks left in the side view.

    python scripts/paint-head-gear.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "wayfarer", "items")
SS = 2
S = 512 * SS


def mask(fn):
    m = Image.new("L", (S, S), 0)
    fn(ImageDraw.Draw(m))
    return m


def E(cx, cy, rx, ry):
    return [(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS]


def P(pts):
    return [(x * SS, y * SS) for x, y in pts]


def gradient(c1, c2, y0, y1):
    ys = np.clip((np.arange(S, dtype=np.float32)[:, None] - y0 * SS) / max(1, (y1 - y0) * SS), 0, 1)
    ys = np.repeat(ys, S, axis=1)
    c1, c2 = np.array(c1, np.float32), np.array(c2, np.float32)
    rgb = c1 + (c2 - c1) * ys[..., None]
    return Image.fromarray(np.dstack([rgb, np.full((S, S), 255, np.float32)]).astype(np.uint8), "RGBA")


def shaded(m, c1, c2, y0, y1, outline=(40, 26, 14)):
    body = gradient(c1, c2, y0, y1)
    noise = Image.effect_noise((S // 6, S // 6), 30).resize((S, S), Image.BICUBIC).filter(ImageFilter.GaussianBlur(SS * 2))
    tex = Image.merge("RGBA", (noise, noise, noise, noise.point(lambda v: int(abs(v - 128) * 0.45))))
    body = ImageChops.soft_light(body, tex)
    hi = ImageChops.offset(m, SS * 5, SS * 6).filter(ImageFilter.GaussianBlur(SS * 4))
    light = Image.new("RGBA", (S, S), (255, 248, 225, 255))
    light.putalpha(ImageChops.multiply(ImageChops.invert(hi), m).point(lambda v: int(v * 0.4)))
    sh = ImageChops.offset(m, -SS * 6, -SS * 7).filter(ImageFilter.GaussianBlur(SS * 5))
    dark = Image.new("RGBA", (S, S), (0, 0, 0, 255))
    dark.putalpha(ImageChops.multiply(ImageChops.invert(sh), m).point(lambda v: int(v * 0.5)))
    body = Image.alpha_composite(Image.alpha_composite(body, light), dark)
    body.putalpha(m)
    edge = ImageChops.subtract(m.filter(ImageFilter.MaxFilter(SS * 3 + 1)), m)
    line = Image.new("RGBA", (S, S), outline + (255,))
    line.putalpha(edge)
    return Image.alpha_composite(line, body)


def layer(parts):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for m, c1, c2, y0, y1 in parts:
        img = Image.alpha_composite(img, shaded(m, c1, c2, y0, y1))
    return img.resize((512, 512), Image.LANCZOS)


def gem(cx, cy, r):
    return mask(lambda d: d.polygon(P([(cx, cy - r), (cx + r * 0.8, cy), (cx, cy + r), (cx - r * 0.8, cy)]), fill=255))


STEEL = ((222, 228, 238), (96, 104, 122))
LEATHER = ((150, 104, 62), (72, 46, 26))
GOLD = ((250, 222, 140), (150, 102, 34))
TEAL = ((170, 255, 245), (20, 140, 150))
AETHER = ((200, 235, 255), (60, 110, 220))


def iron_helm(view):
    cx = {"front": 256, "side": 262, "back": 256}[view]
    dome = mask(lambda d: (d.chord(E(cx, 140, 80, 78), 180, 360, fill=255), d.rectangle(E(cx, 141, 80, 6), fill=255)))
    rim = mask(lambda d: d.rounded_rectangle(E(cx, 146, 84, 7), radius=5 * SS, fill=255))
    parts = [(dome, *STEEL, 54, 150), (rim, (200, 206, 216), (80, 86, 100), 140, 158)]
    if view != "back":
        parts.append((gem(cx - (22 if view == "side" else 0), 100, 11), *TEAL, 88, 112))
    ridge = mask(lambda d: d.rounded_rectangle(E(cx + (8 if view == "side" else 0), 104, 6, 36), radius=4 * SS, fill=255))
    if view == "back":
        parts.append((ridge, (236, 240, 248), (120, 126, 140), 52, 132))
    return layer(parts)


def leather_hood(view):
    if view == "front":
        hood = mask(lambda d: (d.ellipse(E(256, 146, 86, 86), fill=255), d.ellipse(E(256, 180, 56, 62), fill=0), d.rectangle([0, 206 * SS, S, S], fill=0)))
    elif view == "side":
        hood = mask(lambda d: (d.ellipse(E(266, 146, 82, 86), fill=255), d.ellipse(E(212, 180, 50, 60), fill=0), d.rectangle([0, 212 * SS, S, S], fill=0)))
    else:
        hood = mask(lambda d: (d.ellipse(E(256, 146, 86, 88), fill=255), d.rectangle([0, 218 * SS, S, S], fill=0)))
    seam = mask(lambda d: d.arc(E(256 if view != "side" else 266, 150, 64, 70), 215, 325, fill=255, width=3 * SS))
    return layer([(hood, *LEATHER, 44, 230), (seam, (110, 74, 40), (60, 38, 20), 60, 120)])


def aether_circlet(view):
    # A band round the forehead: the near half curves down at the middle.
    if view == "side":
        band = mask(lambda d: d.arc(E(262, 114, 78, 22), 10, 170, fill=255, width=7 * SS))
        g = gem(194, 128, 10)
    elif view == "back":
        band = mask(lambda d: d.arc(E(256, 112, 80, 20), 10, 170, fill=255, width=7 * SS))
        g = None
    else:
        band = mask(lambda d: d.arc(E(256, 110, 80, 26), 10, 170, fill=255, width=7 * SS))
        g = gem(256, 136, 12)
    parts = [(band, *GOLD, 112, 160)]
    if g is not None:
        parts.append((g, *AETHER, 102, 136))
    return layer(parts)


def main():
    for name, fn in [("iron_helm", iron_helm), ("leather_hood", leather_hood), ("aether_circlet", aether_circlet)]:
        for view in ("front", "side", "back"):
            d = os.path.join(ROOT, name, view)
            os.makedirs(d, exist_ok=True)
            fn(view).save(os.path.join(d, "head.png"))
        print("painted", name)


if __name__ == "__main__":
    main()
