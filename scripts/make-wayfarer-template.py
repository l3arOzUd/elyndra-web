"""Stand-in Wayfarer parts and the artists' guide sheets, drawn from rig.json.

    python scripts/make-wayfarer-template.py            # only fills in missing PNGs
    python scripts/make-wayfarer-template.py --force    # redraw every stand-in

Writes, under public/sprites/wayfarer/:
    base/<view>/<part>.png                 plain body parts (the art team replaces these)
    items/<visual>/<view>/<layer>.png      plain equipment layers (likewise)
and art-templates/wayfarer/guide_<view>.png (+ _equipped): every part stacked,
with each pivot marked and named, for drawing real art on top.

Existing PNGs are never overwritten without --force, so real art is safe.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
KIT = ROOT / "public" / "sprites" / "wayfarer"
GUIDES = ROOT / "art-templates" / "wayfarer"
FORCE = "--force" in sys.argv
SS = 2  # supersampling for smooth edges

rig = json.loads((KIT / "rig.json").read_text(encoding="utf-8"))
equipment = json.loads((KIT / "equipment.json").read_text(encoding="utf-8"))
N = rig["canvas"]
FEET_Y = rig["feet"][1]

SKIN, HAIR, SHIRT, PANTS, SANDAL, EYE = "#f1cba2", "#6b4426", "#d9cfb8", "#3a3f5a", "#8a6a4a", "#1d2433"
ARM_LEN = 96
# Where each arm ends relative to its shoulder, per view (x offset).
ARM_DX = {"front": {"arm_near": -6, "arm_far": 6}, "side": {"arm_near": 4, "arm_far": -4}, "back": {"arm_near": 6, "arm_far": -6}}


def canvas():
    im = Image.new("RGBA", (N * SS, N * SS), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def S(*v):
    return [x * SS for x in v]


def capsule(d, p0, p1, w, color):
    d.line(S(*p0, *p1), fill=color, width=w * SS)
    for x, y in (p0, p1):
        d.ellipse(S(x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=color)


def finish(im):
    return im.resize((N, N), Image.LANCZOS)


def piv(view, part):
    return rig["views"][view]["parts"][part]["pivot"]


def hand(view, side="arm_near"):
    x, y = piv(view, side)
    return x + ARM_DX[view][side], y + ARM_LEN


# --- base parts -------------------------------------------------------------------------

def draw_base(view, part):
    im, d = canvas()
    x, y = piv(view, part)
    if part == "head":
        cx = x - (4 if view == "side" else 0)
        cy = y - 70
        d.ellipse(S(cx - 66, cy - 66, cx + 66, cy + 66), fill=SKIN)
        if view == "back":
            d.ellipse(S(cx - 69, cy - 70, cx + 69, cy + 64), fill=HAIR)
        elif view == "side":
            d.pieslice(S(cx - 70, cy - 74, cx + 70, cy + 66), 200, 30, fill=HAIR)
            d.ellipse(S(cx - 2, cy - 60, cx + 70, cy + 40), fill=HAIR)
            d.rectangle(S(cx - 46, cy + 2, cx - 38, cy + 18), fill=EYE)
        else:
            d.pieslice(S(cx - 70, cy - 76, cx + 70, cy + 60), 180, 360, fill=HAIR)
            for ex in (-24, 24):
                d.rectangle(S(cx + ex - 5, cy + 4, cx + ex + 5, cy + 20), fill=EYE)
    elif part == "torso":
        w = 36 if view == "side" else 50
        d.rounded_rectangle(S(x - w, y - 114, x + w, y + 6), radius=18 * SS, fill=SHIRT)
        d.rectangle(S(x - w, y - 14, x + w, y - 4), fill=SANDAL)
    elif part.startswith("arm"):
        hx, hy = hand(view, part)
        capsule(d, (x, y), (hx, hy), 24, SKIN)
        capsule(d, (x, y), (x + (hx - x) * 0.35, y + (hy - y) * 0.35), 28, SHIRT)
        d.ellipse(S(hx - 14, hy - 14, hx + 14, hy + 14), fill=SKIN)
    elif part.startswith("thigh"):
        capsule(d, (x, y), (x, y + 72), 30, PANTS)
    elif part.startswith("shin"):
        capsule(d, (x, y), (x, FEET_Y - 16), 26, PANTS)
        fx = x - 10 if view == "side" else x
        fw = 26 if view == "side" else 20
        d.ellipse(S(fx - fw, FEET_Y - 18, fx + fw, FEET_Y), fill=SANDAL)
    return finish(im)


# --- equipment layers ---------------------------------------------------------------------

def draw_item(visual, view, layer):
    im, d = canvas()
    if visual == "leafweave_coat":
        green, dark = "#4f7a3a", "#33522a"
        if layer == "torso":
            x, y = piv(view, "torso")
            w = 40 if view == "side" else 56
            d.rounded_rectangle(S(x - w, y - 112, x + w, y + 22), radius=16 * SS, fill=green)
            d.line(S(x, y - 108, x, y + 18), fill=dark, width=3 * SS)
            for k in range(3):
                yy = y - 80 + k * 30
                d.line(S(x, yy, x - w + 10, yy - 14), fill=dark, width=2 * SS)
                d.line(S(x, yy, x + w - 10, yy - 14), fill=dark, width=2 * SS)
        elif layer.startswith("arm"):
            x, y = piv(view, layer)
            hx, hy = hand(view, layer)
            capsule(d, (x, y), (x + (hx - x) * 0.72, y + (hy - y) * 0.72), 32, green)
        elif layer == "cape":
            x, y = piv(view, "torso")
            if view == "back":
                d.polygon(S(x - 58, y - 108, x + 58, y - 108, x + 70, y + 70, x - 70, y + 70), fill=dark)
            elif view == "side":
                d.polygon(S(x + 10, y - 108, x + 40, y - 104, x + 86, y + 60, x + 30, y + 70), fill=dark)
            else:
                d.polygon(S(x - 62, y - 104, x - 50, y - 104, x - 64, y + 60, x - 78, y + 56), fill=dark)
                d.polygon(S(x + 50, y - 104, x + 62, y - 104, x + 78, y + 56, x + 64, y + 60), fill=dark)
    elif visual == "traveler_boots":
        x, y = piv(view, layer)
        brown = "#5b3d2a"
        capsule(d, (x, y + 24), (x, FEET_Y - 16), 32, brown)
        fx = x - 12 if view == "side" else x
        fw = 30 if view == "side" else 24
        d.ellipse(S(fx - fw, FEET_Y - 22, fx + fw, FEET_Y), fill=brown)
    elif layer == "weapon":
        hx, hy = hand(view)
        out = {"front": -1, "side": -1, "back": 1}[view]
        if visual == "copper_saber":
            tip = (hx + out * 92, hy + 62)
            d.polygon(S(hx + out * 6, hy - 4, hx + out * 14, hy + 8, tip[0], tip[1], tip[0] - out * 6, tip[1] - 10), fill="#e6ebf2", outline="#8a96a8")
            capsule(d, (hx - 16, hy - 10), (hx + 16, hy + 10), 8, "#c79a3c")
        elif visual == "surveyor_bow":
            bx = hx + out * 6
            d.arc(S(bx - 40, hy - 100, bx + 40, hy + 100), 90 + out * 90 - 90, 90 + out * 90 + 90, fill="#7a4f2a", width=8 * SS)
            d.line(S(bx, hy - 98, bx, hy + 98), fill="#e8e1cf", width=2 * SS)
        elif visual == "aether_rod":
            capsule(d, (hx, hy + 56), (hx, hy - 150), 9, "#7a5a3a")
            d.polygon(S(hx, hy - 196, hx + 16, hy - 168, hx, hy - 142, hx - 16, hy - 168), fill="#5fd0e0", outline="#2a8fa0")
    return finish(im)


# --- write ------------------------------------------------------------------------------

def save(im, path):
    if path.exists() and not FORCE:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    return True


written = 0
for view, v in rig["views"].items():
    for part in v["parts"]:
        written += save(draw_base(view, part), KIT / "base" / view / f"{part}.png")
    for it in equipment["items"].values():
        for layer in it["layers"]:
            written += save(draw_item(it["visual"], view, layer), KIT / "items" / it["visual"] / view / f"{layer}.png")

# Guide sheets: the real files on disk, stacked in drawing order, pivots on top.
GUIDES.mkdir(parents=True, exist_ok=True)
try:
    font = ImageFont.truetype("arial.ttf", 13)
except OSError:
    font = ImageFont.load_default()


def guide(view, items):
    v = rig["views"][view]
    out = Image.new("RGBA", (N, N), (236, 240, 232, 255))
    d = ImageDraw.Draw(out)
    for gy in range(0, N, 32):
        d.line((0, gy, N, gy), fill=(220, 226, 216))
        d.line((gy, 0, gy, N), fill=(220, 226, 216))
    d.line((0, FEET_Y, N, FEET_Y), fill=(200, 60, 60), width=2)
    for name in v["order"]:
        base = KIT / "base" / view / f"{name}.png"
        if base.exists():
            out.alpha_composite(Image.open(base).convert("RGBA"))
        for it in items:
            f = KIT / "items" / it["visual"] / view / f"{name}.png"
            if name in it["layers"] and f.exists():
                out.alpha_composite(Image.open(f).convert("RGBA"))
    d = ImageDraw.Draw(out)
    for name, p in v["parts"].items():
        x, y = p["pivot"]
        d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(220, 30, 30), outline="white")
        d.text((x + 8, y - 8), name, fill=(150, 0, 0), font=font)
    d.text((8, 6), f"{view} · canvas {N}x{N} · feet y={FEET_Y} (red line) · red dots = pivots", fill=(40, 40, 40), font=font)
    return out


for view in rig["views"]:
    guide(view, []).save(GUIDES / f"guide_{view}.png")
    guide(view, list(equipment["items"].values())[:3]).save(GUIDES / f"guide_{view}_equipped.png")
print(f"stand-in PNGs written: {written} (existing files kept{' — forced' if FORCE else ''}); guides in {GUIDES}")
