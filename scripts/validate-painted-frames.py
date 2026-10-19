"""Read-only checks of the final runtime sprite sheets."""
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT/'public/sprites/painted-catalog.json').read_text())
report = []
for c in catalog:
    base = ROOT/'public/sprites'/(c['id']+'_2d')
    definition = json.loads((base/(c['id']+'_2d.sprite.json')).read_text())
    assert definition['kind']=='sheet' and definition['facingMode']=='left-right'
    row = {'id':c['id'],'clips':{}}
    for clip, spec in definition['animations'].items():
        pixels = np.asarray(Image.open(base/spec['file'].split('?')[0]).convert('RGBA'))
        assert pixels.shape==(384,384*spec['frames'],4), (c['id'],clip,'dimensions')
        frames = [pixels[:,i*384:(i+1)*384] for i in range(spec['frames'])]
        for frame in frames:
            a=frame[:,:,3]
            assert (a>127).sum()>100, (c['id'],clip,'empty')
            assert not (np.concatenate([a[0],a[-1],a[:,0],a[:,-1]])>127).any(), (c['id'],clip,'clipped edge')
        unique=len({f.tobytes() for f in frames})
        if clip=='walk': assert unique==6, (c['id'],'duplicate walk')
        if clip=='death':
            assert spec['hold'] and np.array_equal(frames[-1],frames[-2]), (c['id'],'death hold')
        row['clips'][clip]={'frames':spec['frames'],'distinctFrames':unique,'transparentBorder':True}
    report.append(row)
(ROOT.parent/'sprite/painted_2d/frame-validation.json').write_text(json.dumps(report,indent=2))
print(f'{len(report)} characters / {sum(len(r["clips"]) for r in report)} sheets: dimensions, alpha borders, six walk frames and death hold passed')
