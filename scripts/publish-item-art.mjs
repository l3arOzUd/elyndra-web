// Publish already generated, reviewed sheets unchanged. Never ingest reference art.
import { readFileSync, copyFileSync, writeFileSync } from 'node:fs';
const manifest=JSON.parse(readFileSync('art-source/items-v3/manifest.json','utf8'));
const items=JSON.parse(readFileSync('public/data/items.json','utf8'));
const ids=new Set(items.map(i=>i.id)), map={};
for(const sheet of manifest.sheets){
  const n=String(sheet.sheet).padStart(2,'0');
  for(const cell of sheet.cells){
    if(cell.cell<0||cell.cell>=sheet.cols*sheet.rows)throw Error('Invalid atlas cell');
    for(const id of cell.items)if(ids.has(id)){
      if(map[id])throw Error('Duplicate item '+id);
      map[id]=`${n}:${cell.cell}:${sheet.cols}:${sheet.rows}`;
    }
  }
  copyFileSync(`art-source/items-v3/sheet-${n}.png`,`public/ui/painted/items-v3-${n}.png`);
}
writeFileSync('art-source/items-v3/icon-map.json',JSON.stringify(map,null,1)+'\n');
const retained=items.filter(i=>!map[i.id]);
writeFileSync('art-source/items-v3/coverage.json',JSON.stringify({
  total:items.length,published:Object.keys(map).length,
  retained:retained.map(i=>({id:i.id,name:i.name,reason:'Existing v2 painted art; survey pages share the document illustration'})),
},null,2)+'\n');
console.log(`Published ${Object.keys(map).length} items; ${retained.length} retain existing painted illustrations.`);
