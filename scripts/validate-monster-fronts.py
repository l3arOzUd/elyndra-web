"""Inspect master PNGs without modifying art. Requires Pillow."""
import json
import hashlib
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
rows = []
for path in sorted((root / 'art-source/monsters').glob('*/front.png')):
    with Image.open(path) as source:
        image = source.convert('RGBA')
        alpha = image.getchannel('A')
        w, h = image.size
        bounds = alpha.point(lambda v: 255 if v > 32 else 0).getbbox()
        edge = sum(alpha.getpixel((x, y)) > 32 for x, y in
                   [(x, 0) for x in range(w)] + [(x, h-1) for x in range(w)] +
                   [(0, y) for y in range(h)] + [(w-1, y) for y in range(h)])
        rows.append(dict(id=path.parent.name, size=[w, h], alphaRange=alpha.getextrema(),
                         bounds=bounds, edgePixels=edge, sourceMode=source.mode,
                         sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                         passes=bool(bounds) and alpha.getextrema() == (0, 255) and edge == 0))
out = root / 'art-source/production/front-validation.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')
failures = [r['id'] for r in rows if not r['passes']]
print(json.dumps(dict(inspected=len(rows), failures=failures)))
raise SystemExit(1 if failures else 0)
