"""Read-only image measurements; writes crop manifests and validation JSON only."""
import json
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / 'public/sprites/painted-catalog.json').read_text())

def measure(path, expected):
    alpha = np.asarray(Image.open(path).convert('RGBA'))[:, :, 3]
    _, labels, stats, centers = cv2.connectedComponentsWithStats((alpha > 127).astype('uint8'))
    significant = [(i, s, c) for i, (s, c) in enumerate(zip(stats, centers))
                   if i and s[4] > alpha.size / 300]
    if expected == 1 and significant:
        left = min(int(s[0]) for _, s, _ in significant)
        top = min(int(s[1]) for _, s, _ in significant)
        right = max(int(s[0]+s[2]) for _, s, _ in significant)
        bottom = max(int(s[1]+s[3]) for _, s, _ in significant)
        return [[left, top, right-left, bottom-top]], {'alphaZeroFraction': float((alpha == 0).mean())}
    if len(significant) != expected:
        raise ValueError(f'{path.name}: expected {expected} connected poses, found {len(significant)}')
    significant.sort(key=lambda item: (int(item[2][1] >= alpha.shape[0] / 2) if expected > 1 else 0, item[2][0]))
    boxes, reports = [], []
    ids = [item[0] for item in significant]
    for component, s, _ in significant:
        x, y, w, h = map(int, s[:4])
        left, top = max(0, x - 3), max(0, y - 3)
        right, bottom = min(alpha.shape[1], x + w + 3), min(alpha.shape[0], y + h + 3)
        box = [left, top, right - left, bottom - top]
        other = np.isin(labels[top:bottom, left:right], [i for i in ids if i != component])
        contamination = int(other.sum())
        if expected > 1 and contamination > 64:
            raise ValueError(f'{path.name}: pose {len(boxes)} crop contains {contamination} pixels of another pose')
        boxes.append(box)
        reports.append({'box': box, 'otherPosePixels': contamination})
    return boxes, {'alphaZeroFraction': float((alpha == 0).mean()), 'poses': reports}

def main():
    failures = []
    for creature in CATALOG:
        if int(creature['number']) < 3 or (len(sys.argv) > 1 and creature['id'] not in sys.argv[1:]):
            continue
        base = ROOT / 'public/sprites' / (creature['id'] + '_2d')
        source_manifest = base / 'sources.json'
        if not source_manifest.exists():
            continue
        sources = json.loads(source_manifest.read_text())
        poses, review = {}, {}
        try:
            for key in ['original', 'walk', 'actions']:
                filename = 'reference.png' if key == 'original' else sources[key]
                boxes, report = measure(base / filename, 1 if key == 'original' else 6)
                scale = min(400 / boxes[0][3], 420 / max(b[3] for b in boxes), 448 / max(b[2] for b in boxes))
                poses[key] = {'file': filename, 'boxes': boxes, 'scale': scale}
                if key == 'original' and creature.get('referenceFlip'):
                    poses[key]['flip'] = True
                if key in sources.get('flipFrames', {}):
                    poses[key]['flipFrames'] = sources['flipFrames'][key]
                review[key] = report
            (base / 'poses.json').write_text(json.dumps(poses, indent=2) + '\n')
            out = ROOT.parent / 'sprite/painted_2d' / creature['id']
            out.mkdir(parents=True, exist_ok=True)
            (out / 'atlas-validation.json').write_text(json.dumps(review, indent=2))
            print(creature['id'] + ': measured 1 reference + 6 walk + 6 action poses')
        except ValueError as error:
            failures.append({'id': creature['id'], 'error': str(error)})
            print(str(error))
    (ROOT.parent / 'sprite/painted_2d/measurement-failures.json').write_text(json.dumps(failures, indent=2))
    if failures:
        sys.exit(1)

if __name__ == '__main__':
    main()
