"""Read-only alpha/framing diagnostics for available turnaround masters."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
rows = []
for folder in sorted((root / 'art-source/monsters').iterdir()):
    if not any((folder / f'{v}.png').exists() for v in ['back', 'left', 'right']):
        continue
    views = {}
    for view in ['front', 'back', 'left', 'right']:
        path = folder / f'{view}.png'
        if not path.exists():
            views[view] = None
            continue
        with Image.open(path) as im:
            a = im.convert('RGBA').getchannel('A')
            w, h = im.size
            bbox = a.point(lambda p: 255 if p > 32 else 0).getbbox()
            edge = sum(a.getpixel(p) > 32 for p in [(x, 0) for x in range(w)] + [(x, h-1) for x in range(w)] + [(0, y) for y in range(h)] + [(w-1, y) for y in range(h)])
            views[view] = dict(size=[w,h], bounds=bbox, alphaRange=a.getextrema(), edgePixels=edge,
                               passes=im.mode == 'RGBA' and bool(bbox) and a.getextrema()[0] == 0 and edge == 0)
    rows.append(dict(id=folder.name, views=views, visualConsistency='requires-direct-review'))
out = root / 'art-source/production/turnaround-validation.json'
out.write_text(json.dumps(rows, indent=2)+'\n', encoding='utf-8')
failed = [(r['id'], v) for r in rows for v,d in r['views'].items() if d and not d['passes']]
print(json.dumps(dict(characters=len(rows), images=sum(bool(d) for r in rows for d in r['views'].values()), failures=failed)))
raise SystemExit(bool(failed))
