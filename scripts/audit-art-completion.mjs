// Read-only audit of game content. Does not substitute similarly named creatures.
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..'),workspace=resolve(root,'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const monsters=read('public/data/monsters.json'),items=read('public/data/items.json'),skills=read('public/data/skills.json');
const catalog=read('public/sprites/painted-catalog.json'),index=read('public/sprites/index.json');
const looks=read('public/sprites/wayfarer/equipment.json').items;
const out=resolve(root,'art-source/production');mkdirSync(out,{recursive:true});
const asset=p=>{if(!existsSync(p))return null;const b=readFileSync(p);return {path:relative(root,p).replaceAll('\\','/'),width:b.readUInt32BE(16),height:b.readUInt32BE(20)};};
const records=monsters.map(m=>{
 const original=catalog.find(c=>c.name===m.name);
 const views=Object.fromEntries(['front','back','left','right'].map(view=>{
  const master=asset(resolve(root,`art-source/monsters/${m.id}/${view}.png`));
  const old=original?asset(resolve(workspace,`sprite/tripo_ready/${original.file}_${view}.png`)):null;
  return [view,{master,existingReference:old,status:master?'master-created':old?'existing-needs-review':'missing'}];
 }));
 const binding=index.monsters[m.id];
 const sprite=binding&&!binding.placeholder?binding.sprite:null;
 const animationFiles=Object.fromEntries(['idle','walk','attack','hit','death'].map(a=>[a,sprite?asset(resolve(root,`public/sprites/${sprite}/${a}.png`)):null]));
 return {id:m.id,name:m.name,region:m.region_id,brief:m.art_brief,views,sprite,animationFiles,animationReview:'pending-all-required-views'};
});
const equipment=items.filter(i=>i.equip).map(i=>({id:i.id,name:i.name,slot:i.equip.slot,visual:looks[i.id]?.visual??null,generatedAlias:looks[i.id]?.generated??false,status:looks[i.id]?.generated?'shared-look-needs-distinct-design':looks[i.id]?'painted-look-existing':'needs-visual-scope-review'}));
const effects=skills.map(s=>({id:s.id,name:s.name,vfx:s.vfx,implemented:s.implemented,status:'generic-shape-effect-needs-authored-skill-vfx'}));
const report={scope:'All game monster definitions, equipment definitions and skills. Existence is not visual approval.',monsters:records,equipment,skills:effects};
writeFileSync(resolve(out,'art-audit.json'),JSON.stringify(report,null,2)+'\n');
const missing=records.filter(m=>m.views.front.status==='missing');
const lines=['# Art production backlog','',`Monsters: ${records.length}; front masters created: ${records.filter(m=>m.views.front.master).length}; existing front references needing review: ${records.filter(m=>!m.views.front.master&&m.views.front.existingReference).length}; missing front references: ${missing.length}.`,`Equipment definitions: ${equipment.length}; shared generated looks: ${equipment.filter(i=>i.generatedAlias).length}. Skills needing authored VFX review: ${effects.length}.`,'','Order: finish front masters for every monster, then consistent back/left/right, then authored 2D animation and in-game validation. Equipment and VFX remain part of the full objective.','', 'No species renames or proposed cross-species substitutions are treated as completed art. The historical 25-monster sheet is not the game roster.','', '| ID | Monster | Front | Back | Left | Right | Game sprite |','|---|---|---|---|---|---|---|',...records.map(m=>`| ${m.id} | ${m.name} | ${['front','back','left','right'].map(v=>m.views[v].status).join(' | ')} | ${m.sprite??'placeholder'} |`)];
writeFileSync(resolve(out,'BACKLOG.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({monsters:records.length,newFrontMasters:records.filter(m=>m.views.front.master).length,missingFront:missing.length,equipment:equipment.length,sharedEquipment:equipment.filter(i=>i.generatedAlias).length,skills:effects.length},null,2));
