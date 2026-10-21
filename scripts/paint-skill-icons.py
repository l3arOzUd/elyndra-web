"""Paints public/ui/painted/skills-v3.png: a 3x3 atlas of skill art for the
Arcanist, Strider and Machinist, in the style of skills-v2.png (full-bleed
painterly energy, thick glowing brush strokes along a flow, flying shards,
a lit central object). Cell order is SKILL_ART3 in src/ui/art.ts.

    python scripts/paint-skill-icons.py
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

CELL = 384          # final cell size
S = CELL * 2        # painted at 2x
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "ui", "painted", "skills-v3.png")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(c_in, c_out):
    ys, xs = np.mgrid[0:S, 0:S].astype(np.float32)
    t = np.clip(np.hypot(xs - S / 2, ys - S / 2) / (S * 0.72), 0, 1)[..., None]
    rgb = np.array(c_in, np.float32) * (1 - t) + np.array(c_out, np.float32) * t
    img = Image.fromarray(np.dstack([rgb, np.full((S, S), 255, np.float32)]).astype(np.uint8), "RGBA")
    noise = Image.effect_noise((S // 4, S // 4), 60).resize((S, S), Image.BICUBIC).convert("RGBA")
    return Image.blend(img, ImageChops.multiply(img, noise), 0.35)


def screen(base, layer):
    """Additive-looking light: screen the layer's colour (by its alpha) over base."""
    a = np.asarray(layer).astype(np.float32) / 255
    b = np.asarray(base).astype(np.float32) / 255
    lit = a[..., :3] * a[..., 3:4]
    out = 1 - (1 - b[..., :3]) * (1 - lit)
    return Image.fromarray(np.dstack([out * 255, b[..., 3] * 255]).astype(np.uint8), "RGBA")


def add_glow(base, layer, blur, strength=1.0):
    g = layer.filter(ImageFilter.GaussianBlur(blur))
    if strength != 1.0:
        a = g.getchannel("A").point(lambda v: min(255, int(v * strength)))
        g.putalpha(a)
    base = screen(base, g)
    return screen(base, layer)


def flow_strokes(base, flow, palette, n=260, length=26, width=(4, 14), seed=0, alpha=170, glow=10):
    """Brush strokes that follow flow(x, y) -> angle; palette colours by random pick."""
    rnd = random.Random(seed)
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        x, y = rnd.uniform(0, S), rnd.uniform(0, S)
        col = rnd.choice(palette)
        w = rnd.uniform(*width)
        pts = [(x, y)]
        for _ in range(length):
            a = flow(x, y)
            x += math.cos(a) * 8
            y += math.sin(a) * 8
            pts.append((x, y))
        a0 = int(alpha * rnd.uniform(0.5, 1))
        d.line(pts, fill=col + (a0,), width=int(w), joint="curve")
        d.line(pts[len(pts) // 4: -len(pts) // 4 or None], fill=lerp(col, (255, 255, 255), 0.6) + (int(a0 * 0.7),), width=max(1, int(w * 0.3)))
    return add_glow(base, layer.filter(ImageFilter.GaussianBlur(1.2)), glow, 0.9)


def shards(base, palette, n=40, seed=1, rmin=8, rmax=26, center=None, glow=6):
    rnd = random.Random(seed)
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        x, y = rnd.uniform(0, S), rnd.uniform(0, S)
        if center and math.hypot(x - center[0], y - center[1]) < S * 0.18:
            continue
        r = rnd.uniform(rmin, rmax)
        a = rnd.uniform(0, math.pi)
        pts = [(x + math.cos(a + k * math.pi / 2) * r * (1.8 if k % 2 == 0 else 0.6), y + math.sin(a + k * math.pi / 2) * r * (1.8 if k % 2 == 0 else 0.6)) for k in range(4)]
        col = rnd.choice(palette)
        d.polygon(pts, fill=col + (230,), outline=lerp(col, (255, 255, 255), 0.5) + (255,))
    return add_glow(base, layer, glow, 0.7)


def poly_glow(base, pts, fill, edge, glow_col, blur=18, width=6):
    # Lit from the top-left: a gradient from near-white to a deeper fill.
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    x0, y0, x1, y1 = m.getbbox() or (0, 0, S, S)
    ys, xs = np.mgrid[0:S, 0:S].astype(np.float32)
    t = np.clip(((xs - x0) / max(1, x1 - x0) * 0.4 + (ys - y0) / max(1, y1 - y0) * 0.6), 0, 1)[..., None]
    hi, lo = np.array(lerp(fill, (255, 255, 255), 0.55), np.float32), np.array(lerp(fill, (0, 0, 0), 0.35), np.float32)
    rgb = hi * (1 - t) + lo * t
    layer = Image.fromarray(np.dstack([rgb, np.asarray(m, np.float32)]).astype(np.uint8), "RGBA")
    d = ImageDraw.Draw(layer)
    d.line(pts + [pts[0]], fill=edge + (255,), width=width, joint="curve")
    g = Image.new("RGBA", (S, S), glow_col + (0,))
    g.putalpha(layer.getchannel("A").filter(ImageFilter.GaussianBlur(blur)))
    return Image.alpha_composite(screen(screen(base, g), g), layer)


def rings(base, cx, cy, radii, col, width=6, squash=0.45, blur=8):
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for r in radii:
        d.ellipse([cx - r, cy - r * squash, cx + r, cy + r * squash], outline=col + (220,), width=width)
    return add_glow(base, layer, blur)


def core(base, cx, cy, r, col):
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=col + (255,))
    base = add_glow(base, layer.filter(ImageFilter.GaussianBlur(r * 0.6)), r * 1.5, 1.4)
    hot = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hot).ellipse([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45], fill=(255, 255, 255, 255))
    return Image.alpha_composite(base, hot.filter(ImageFilter.GaussianBlur(r * 0.25)))


def finish(img):
    ys, xs = np.mgrid[0:S, 0:S].astype(np.float32)
    v = np.clip(1.15 - np.hypot(xs - S / 2, ys - S / 2) / (S * 0.75), 0.55, 1)[..., None]
    a = np.asarray(img).astype(np.float32)
    a[..., :3] *= v
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").resize((CELL, CELL), Image.LANCZOS)


C = S / 2
swirl = lambda k: (lambda x, y: math.atan2(y - C, x - C) + math.pi / 2 * k + 0.35)
radial = lambda x, y: math.atan2(y - C, x - C)
inward = lambda x, y: math.atan2(C - y, C - x) + 0.9


def prism_field():
    img = background((60, 90, 170), (12, 14, 40))
    img = flow_strokes(img, swirl(1), [(120, 180, 255), (200, 230, 255), (170, 120, 255)], n=200, seed=11)
    img = rings(img, C, S * 0.68, [S * 0.38, S * 0.30, S * 0.22], (190, 225, 255), width=7)
    img = shards(img, [(150, 200, 255), (220, 180, 255), (120, 255, 240)], n=30, seed=12, center=(C, S * 0.5))
    img = poly_glow(img, [(C, S * 0.14), (S * 0.74, S * 0.66), (S * 0.26, S * 0.66)], (175, 215, 255), (250, 252, 255), (150, 210, 255), blur=30, width=10)
    img = poly_glow(img, [(C, S * 0.22), (S * 0.64, S * 0.6), (C, S * 0.6)], (230, 240, 255), (255, 255, 255), (255, 255, 255), blur=8, width=2)
    return finish(core(img, C, S * 0.44, 30, (220, 240, 255)))


def aether_nova():
    img = background((110, 40, 170), (16, 6, 34))
    img = flow_strokes(img, radial, [(210, 120, 255), (255, 200, 255), (140, 90, 255)], n=320, length=22, seed=21)
    img = shards(img, [(200, 140, 255), (120, 220, 255)], n=44, seed=22, center=(C, C))
    star = [(C + math.cos(a) * r, C + math.sin(a) * r) for i in range(16) for a, r in [(i * math.pi / 8 - math.pi / 2, S * (0.33 if i % 2 == 0 else 0.11))]]
    img = poly_glow(img, star, (240, 210, 255), (255, 255, 255), (230, 150, 255), blur=34, width=4)
    return finish(core(img, C, C, 60, (255, 225, 255)))


def gravity_coil():
    img = background((70, 30, 130), (6, 2, 18))
    img = flow_strokes(img, inward, [(150, 80, 230), (200, 140, 255), (90, 60, 200)], n=340, length=34, seed=31, glow=12)
    img = shards(img, [(130, 90, 220), (90, 200, 220), (60, 50, 90)], n=50, seed=32, center=(C, C))
    hole = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hole).ellipse([C - 70, C - 70, C + 70, C + 70], fill=(10, 0, 20, 255))
    img = add_glow(img, hole, 30, 1.0)
    return finish(rings(img, C, C, [S * 0.12, S * 0.16], (230, 170, 255), width=5, squash=1.0, blur=10))


def meridian_lance():
    img = background((170, 120, 40), (30, 18, 8))
    img = flow_strokes(img, lambda x, y: -math.pi / 4, [(255, 220, 140), (255, 250, 210), (255, 170, 60)], n=260, length=30, seed=41)
    img = shards(img, [(255, 210, 120), (200, 140, 60)], n=34, seed=42)
    a = -math.pi / 4
    dx, dy, nx, ny = math.cos(a), math.sin(a), -math.sin(a), math.cos(a)
    x0, y0 = S * 0.14, S * 0.86
    L = S * 0.9
    shaft = [(x0 + nx * 18, y0 + ny * 18), (x0 + dx * L * 0.82 + nx * 18, y0 + dy * L * 0.82 + ny * 18), (x0 + dx * L * 0.82 - nx * 18, y0 + dy * L * 0.82 - ny * 18), (x0 - nx * 18, y0 - ny * 18)]
    img = poly_glow(img, shaft, (255, 236, 180), (255, 255, 240), (255, 220, 120), blur=26, width=4)
    tip = [(x0 + dx * L, y0 + dy * L), (x0 + dx * L * 0.78 + nx * 40, y0 + dy * L * 0.78 + ny * 40), (x0 + dx * L * 0.84, y0 + dy * L * 0.84), (x0 + dx * L * 0.78 - nx * 40, y0 + dy * L * 0.78 - ny * 40)]
    img = poly_glow(img, tip, (255, 250, 220), (255, 255, 255), (255, 240, 170), blur=30, width=5)
    return finish(core(img, x0 + dx * L * 0.82, y0 + dy * L * 0.82, 36, (255, 250, 220)))


def splitshot_array():
    img = background((70, 120, 50), (12, 22, 8))
    img = flow_strokes(img, lambda x, y: -math.pi / 2 + (x - C) / S * 0.9, [(220, 230, 140), (255, 210, 110), (170, 220, 120)], n=260, length=28, seed=51)
    img = shards(img, [(210, 240, 140), (240, 200, 110)], n=30, seed=52)
    for k, ang in enumerate((-0.45, 0.0, 0.45)):
        a = -math.pi / 2 + ang
        dx, dy, nx, ny = math.cos(a), math.sin(a), -math.sin(a), math.cos(a)
        x0, y0 = C, S * 0.92
        L = S * 0.72
        shaft = [(x0 + nx * 6, y0 + ny * 6), (x0 + dx * L + nx * 6, y0 + dy * L + ny * 6), (x0 + dx * L - nx * 6, y0 + dy * L - ny * 6), (x0 - nx * 6, y0 - ny * 6)]
        img = poly_glow(img, shaft, (240, 220, 170), (255, 250, 230), (255, 220, 120), blur=14, width=3)
        hx, hy = x0 + dx * L, y0 + dy * L
        head = [(hx + dx * 46, hy + dy * 46), (hx + nx * 24, hy + ny * 24), (hx - nx * 24, hy - ny * 24)]
        img = poly_glow(img, head, (230, 240, 255), (255, 255, 255), (220, 255, 200), blur=20, width=3)
    return finish(img)


def dash_circuit():
    img = background((20, 120, 110), (4, 18, 20))
    img = flow_strokes(img, lambda x, y: 0.0, [(120, 255, 220), (220, 255, 245), (60, 200, 200)], n=300, length=34, width=(3, 10), seed=61)
    for k, cx in enumerate((S * 0.3, S * 0.5, S * 0.7)):
        chev = [(cx - 50, C - 110), (cx + 60, C), (cx - 50, C + 110), (cx - 10, C)]
        img = poly_glow(img, chev, lerp((90, 220, 190), (230, 255, 250), k / 2), (255, 255, 255), (120, 255, 220), blur=22, width=4)
    return finish(shards(img, [(120, 255, 220), (200, 255, 240)], n=24, seed=62))


def coil_mine():
    img = background((180, 60, 20), (26, 6, 2))
    img = flow_strokes(img, radial, [(255, 150, 60), (255, 220, 140), (220, 70, 30)], n=300, length=22, seed=71)
    img = shards(img, [(90, 60, 50), (140, 90, 60), (255, 180, 90)], n=60, seed=72, rmin=10, rmax=32, center=(C, C))
    teeth = [(C + math.cos(i * math.pi / 8) * (S * (0.2 if i % 2 == 0 else 0.16)), C + math.sin(i * math.pi / 8) * (S * (0.2 if i % 2 == 0 else 0.16))) for i in range(16)]
    img = poly_glow(img, teeth, (110, 110, 120), (210, 210, 220), (255, 120, 50), blur=30, width=6)
    return finish(core(img, C, C, 44, (255, 120, 60)))


def gearstorm():
    img = background((150, 100, 40), (22, 14, 6))
    img = flow_strokes(img, swirl(1), [(255, 190, 90), (255, 230, 170), (200, 120, 40)], n=300, length=30, seed=81)
    rnd = random.Random(83)
    for i in range(7):
        cx, cy = C + math.cos(i * 0.9) * S * (0.12 + 0.05 * i), C + math.sin(i * 0.9) * S * (0.12 + 0.05 * i)
        R = rnd.uniform(40, 80)
        n = rnd.choice((8, 10, 12))
        g = [(cx + math.cos(k * math.pi / n) * (R if k % 2 == 0 else R * 0.78), cy + math.sin(k * math.pi / n) * (R if k % 2 == 0 else R * 0.78)) for k in range(2 * n)]
        img = poly_glow(img, g, (200, 150, 70), (255, 230, 160), (255, 170, 60), blur=14, width=4)
    return finish(shards(img, [(255, 200, 110), (255, 140, 40)], n=40, seed=82, rmin=4, rmax=10))


def pulse_beacon():
    img = background((40, 150, 80), (4, 22, 10))
    img = flow_strokes(img, lambda x, y: -math.pi / 2, [(150, 255, 180), (230, 255, 230), (80, 220, 140)], n=240, length=30, seed=91)
    img = rings(img, C, S * 0.74, [S * 0.42, S * 0.32, S * 0.22], (170, 255, 200), width=7)
    tower = [(C - 40, S * 0.82), (C - 18, S * 0.3), (C + 18, S * 0.3), (C + 40, S * 0.82)]
    img = poly_glow(img, tower, (190, 200, 210), (240, 250, 255), (140, 255, 190), blur=20, width=5)
    beam = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(beam).polygon([(C - 30, S * 0.28), (C - 90, 0), (C + 90, 0), (C + 30, S * 0.28)], fill=(200, 255, 220, 120))
    img = add_glow(img, beam.filter(ImageFilter.GaussianBlur(12)), 20)
    return finish(core(img, C, S * 0.28, 40, (200, 255, 220)))


ORDER = [prism_field, aether_nova, gravity_coil, meridian_lance, splitshot_array, dash_circuit, coil_mine, gearstorm, pulse_beacon]


def main():
    atlas = Image.new("RGBA", (CELL * 3, CELL * 3))
    for i, fn in enumerate(ORDER):
        atlas.paste(fn(), ((i % 3) * CELL, (i // 3) * CELL))
        print("painted", fn.__name__)
    atlas.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
