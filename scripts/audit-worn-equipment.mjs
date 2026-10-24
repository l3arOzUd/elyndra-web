import {readFileSync,existsSync,writeFileSync} from 'node:fs';
const root='art-source/doll-v3';
const manifest=JSON.parse(readFileSync(`${root}/manifest.json`,'utf8'));
const imported=JSON.parse(readFileSync(`${root}/imported.json`,'utf8'));
const sets=manifest.sets.map(s=>{
  const missing=[];
  const layers=[...new Set([...s.layers,...imported[s.visual]??[]])];
  for(const view of manifest.views)for(const layer of layers){
    const file=`public/sprites/wayfarer/items/${s.visual}/${view}/${layer}.png`;
    if(!existsSync(file))missing.push({view,layer,file});
  }
  return {set:s.set,visual:s.visual,slot:s.slot,items:s.items,layers:layers.length*manifest.views.length,sourceExists:existsSync(`${root}/${s.set}.png`),missing};
});
const report={scope:'All planned wearable base families and unique equipment, all rig views and layers. File presence is not visual approval.',sets:sets.length,sourceSheets:sets.filter(s=>s.sourceExists).length,missingLayers:sets.reduce((n,s)=>n+s.missing.length,0),details:sets};
writeFileSync(`${root}/worn-audit.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sets:report.sets,sourceSheets:report.sourceSheets,missingLayers:report.missingLayers}));
if(report.missingLayers)process.exitCode=1;
