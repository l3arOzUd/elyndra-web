"""Copy image_gen outputs and original references without altering image pixels."""
from pathlib import Path
import json
import shutil

root = Path(__file__).resolve().parents[1]
review = root.parent / 'sprite/painted_2d'
count = 0
for log in sorted(review.glob('generation-log*.json')):
    for job in json.loads(log.read_text()):
        base = root / 'public/sprites' / (job['id'] + '_2d')
        (base / 'parts').mkdir(parents=True, exist_ok=True)
        target = base / 'parts' / (job['kind'] + '.png')
        if not target.exists():
            shutil.copy2(job['source'], target)
            count += 1
        if not (base / 'reference.png').exists():
            shutil.copy2(root.parent / 'sprite/tripo_ready' / (job['file'] + '.png'), base / 'reference.png')
        path = base / 'sources.json'
        sources = json.loads(path.read_text()) if path.exists() else {}
        sources.setdefault(job['kind'], 'parts/' + job['kind'] + '.png')
        path.write_text(json.dumps(sources, indent=2))
print(f'Copied {count} new atlases; original outputs preserved')
