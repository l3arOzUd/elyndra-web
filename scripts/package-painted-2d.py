"""Package the completed runtime exports without modifying any images."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root=Path(__file__).resolve().parents[1]
review=root.parent/'sprite/painted_2d'
catalog=json.loads((root/'public/sprites/painted-catalog.json').read_text())
bindings={c['gameMonster']:{'sprite':c['id']+'_2d'} for c in catalog if c['gameMonster']}
(review/'painted-bindings.json').write_text(json.dumps(bindings,indent=2))
archive=review/'elyndra_2d_01-25.zip'
with ZipFile(archive,'w',ZIP_DEFLATED) as z:
    z.write(review/'USAGE.txt','USAGE.txt')
    z.write(review/'painted-bindings.json','painted-bindings.json')
    z.write(root/'public/sprites/painted-catalog.json','sprites/painted-catalog.json')
    for c in catalog:
        base=root/'public/sprites'/(c['id']+'_2d')
        for filename in ['idle.png','walk.png','attack.png','hit.png','death.png',c['id']+'_2d.sprite.json']:
            z.write(base/filename,'sprites/'+base.name+'/'+filename)
    for pattern in ['generation-log*.json','layout-repairs*.json']:
        for p in review.glob(pattern): z.write(p,'prompts/'+p.name)
    for filename in ['frame-validation.json','gallery-validation.json','main-game-validation.json']:
        z.write(review/filename,'validation/'+filename)
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.png')])==125
print(f'{archive}: {archive.stat().st_size/1024/1024:.1f} MiB, 125 PNG sheets + 25 sprite definitions; archive integrity passed')
