"""Packs the generated item icon sheets (art-source/items-v3/sheet-NN.png, made
from sheet-NN.prompt.txt) into the runtime atlases public/ui/painted/items-v3-NN.png
and writes art-source/items-v3/icon-map.json (item id -> "sheet:cell:cols:rows"), which
content/build.ts copies into items.json as each item's `icon`.

Each cell is cut on the regular grid the prompt asked for, its painting is
found against the #211d1a background, re-centred with a 12% margin and
scaled to 170 px, so uneven generator margins do not show in the game.
Cells whose painting touches the cell edge (two objects merged, or cropped)
are reported; check them before shipping.

    python scripts/import-item-icons.py
"""
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "art-source", "items-v3")
OUT = os.path.join(ROOT, "public", "ui", "painted")
CELL = 170
BG = np.array([33, 29, 26], np.float32)


def place(cell):
    """The painting of one cell, centred on the background at CELL px."""
    a = np.asarray(cell.convert("RGB")).astype(np.float32)
    diff = np.abs(a - BG).max(axis=2)
    mask = diff > 28
    warn = ""
    ys, xs = np.where(mask)
    if len(xs) < 50:
        return Image.new("RGB", (CELL, CELL), tuple(BG.astype(int))), "empty"
    h, w = mask.shape
    edge = 2
    if xs.min() < edge or ys.min() < edge or xs.max() >= w - edge or ys.max() >= h - edge:
        warn = "touches the cell edge"
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    obj = cell.convert("RGB").crop(box)
    inner = int(CELL * 0.76)
    k = inner / max(obj.width, obj.height)
    obj = obj.resize((max(1, round(obj.width * k)), max(1, round(obj.height * k))), Image.LANCZOS)
    out = Image.new("RGB", (CELL, CELL), tuple(BG.astype(int)))
    out.paste(obj, ((CELL - obj.width) // 2, (CELL - obj.height) // 2))
    return out, warn


def main():
    manifest = json.load(open(os.path.join(SRC, "manifest.json"), encoding="utf-8"))
    icon_map, report = {}, []
    for s in manifest["sheets"]:
        path = os.path.join(SRC, f"sheet-{s['sheet']:02d}.png")
        if not os.path.exists(path):
            report.append(f"sheet {s['sheet']:02d}: not generated yet")
            continue
        img = Image.open(path)
        cols, rows = s["cols"], s["rows"]
        atlas = Image.new("RGB", (cols * CELL, rows * CELL))
        for c in s["cells"]:
            i = c["cell"]
            x0, y0 = img.width * (i % cols) // cols, img.height * (i // cols) // rows
            x1, y1 = img.width * (i % cols + 1) // cols, img.height * (i // cols + 1) // rows
            painted, warn = place(img.crop((x0, y0, x1, y1)))
            atlas.paste(painted, ((i % cols) * CELL, (i // cols) * CELL))
            if warn:
                report.append(f"sheet {s['sheet']:02d} cell {i} ({c['key']}): {warn}")
            for item in c["items"]:
                icon_map[item] = f"{s['sheet']:02d}:{i}:{cols}:{rows}"
        atlas.save(os.path.join(OUT, f"items-v3-{s['sheet']:02d}.png"))
        print("packed sheet", s["sheet"])
    json.dump(icon_map, open(os.path.join(SRC, "icon-map.json"), "w", encoding="utf-8", newline="\n"), indent=1, sort_keys=True)
    print(len(icon_map), "items mapped")
    for line in report:
        print(" -", line)


if __name__ == "__main__":
    main()
