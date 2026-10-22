// Read-only audit of game content. Does not substitute similarly named creatures.
import {readFileSync,existsSync,mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..'),workspace=resolve(root,'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const monsters=read('public/data/monsters.json'),items=read('public/data/items.json'),skills=read('public/data/skills.json');
const catalog=read('public/sprites/painted-catalog.json'),index=read('public/sprites/index.json');
const looks=read('public/sprites/wayfarer/equipment.json').items;
const out=resolve(root,'art-source/production');mkdirSync(out,{recursive:true});
const legacyPath=resolve(out,'legacy-front-review.json');
const legacyReviews=existsSync(legacyPath)?JSON.parse(readFileSync(legacyPath,'utf8')).records:[];
const asset=p=>{if(!existsSync(p))return null;const b=readFileSync(p);return {path:relative(root,p).replaceAll('\\','/'),width:b.readUInt32BE(16),height:b.readUInt32BE(20)};};
const records=monsters.map(m=>{
 const reviewPath=resolve(root,`art-source/monsters/${m.id}/turnaround-review.json`);
 const turnaroundReview=existsSync(reviewPath)?JSON.parse(readFileSync(reviewPath,'utf8')):null;
 const original=catalog.find(c=>c.name===m.name);
 const views=Object.fromEntries(['front','back','left','right'].map(view=>{
  const master=asset(resolve(root,`art-source/monsters/${m.id}/${view}.png`));
  const old=original?asset(resolve(workspace,`sprite/tripo_ready/${original.file}_${view}.png`)):null;
  const review=view==='front'?legacyReviews.find(r=>r.id===m.id):null;
  return [view,{master,existingReference:old,...(review?{legacyReview:review}:{}),status:master?'master-created':review?.result==='replacement-required'?'replacement-required':old?'existing-needs-review':'missing'}];
 }));
 const sourceDir=resolve(root,`art-source/monsters/${m.id}`);
 const sourceMotionStudies=existsSync(sourceDir)?readdirSync(sourceDir).filter(n=>/^(idle|walk|attack|hit|death|motion).*review\.json$/.test(n)).map(file=>{
  const data=JSON.parse(readFileSync(resolve(sourceDir,file),'utf8'));
  return {file,status:data.status??'unclassified-study',artApproved:data.artApproved===true,publicBinding:data.publicBinding===true,uniqueDrawings:data.uniqueDrawings??null,remaining:data.remaining??data.limitations??[]};
 }):[];
 const binding=index.monsters[m.id];
 const sprite=binding&&!binding.placeholder?binding.sprite:null;
 const runtimeReviewPath=sprite?resolve(root,`public/sprites/${sprite}/art-review.json`):null;
 const runtimeReview=runtimeReviewPath&&existsSync(runtimeReviewPath)?JSON.parse(readFileSync(runtimeReviewPath,'utf8')):null;
 const animationFiles=Object.fromEntries(['idle','walk','attack','hit','death'].map(a=>[a,sprite?asset(resolve(root,`public/sprites/${sprite}/${a}.png`)):null]));
 return {id:m.id,name:m.name,region:m.region_id,brief:m.art_brief,views,turnaroundReview,sourceMotionStudies,sprite,runtimeReview,animationFiles,animationReview:runtimeReview?.status??'pending-all-required-views'};
});
const equipment=items.filter(i=>i.equip).map(i=>({id:i.id,name:i.name,slot:i.equip.slot,visual:looks[i.id]?.visual??null,generatedAlias:looks[i.id]?.generated??false,status:looks[i.id]?.generated?'shared-look-needs-distinct-design':looks[i.id]?'painted-look-existing':'needs-visual-scope-review'}));
const effects=skills.map(s=>({id:s.id,name:s.name,vfx:s.vfx,implemented:s.implemented,status:'runtime-and-visual-review-required'}));
const report={scope:'All game monster definitions, equipment definitions and skills. Existence is not visual approval.',monsters:records,equipment,skills:effects};
writeFileSync(resolve(out,'art-audit.json'),JSON.stringify(report,null,2)+'\n');
const missing=records.filter(m=>m.views.front.status==='missing');
const lines=['# Art production backlog','',`Monsters: ${records.length}; front masters created: ${records.filter(m=>m.views.front.master).length}; existing front references needing review: ${records.filter(m=>!m.views.front.master&&m.views.front.existingReference).length}; missing front references: ${missing.length}.`,`Equipment definitions: ${equipment.length}; shared generated looks: ${equipment.filter(i=>i.generatedAlias).length}. Skills needing authored VFX review: ${effects.length}.`,'','Order: finish front masters for every monster, then consistent back/left/right, then authored 2D animation and in-game validation. Equipment and VFX remain part of the full objective.','', 'No species renames or proposed cross-species substitutions are treated as completed art. The historical 25-monster sheet is not the game roster.','', '| ID | Monster | Front | Back | Left | Right | Game sprite |','|---|---|---|---|---|---|---|',...records.map(m=>`| ${m.id} | ${m.name} | ${['front','back','left','right'].map(v=>m.views[v].status).join(' | ')} | ${m.sprite??'placeholder'} |`)];
const completeViews=records.filter(m=>Object.values(m.views).every(v=>v.master)).length;
const reviewStatuses=[...new Set(records.map(m=>m.turnaroundReview?.status??'missing-review'))];
const reviewSummary=reviewStatuses.map(status=>`${status}: ${records.filter(m=>(m.turnaroundReview?.status??'missing-review')===status).length}`).join('; ');
const evidence=[
 '',
 '## Completion evidence',
 '',
 `Monsters with source motion review files: ${records.filter(m=>m.sourceMotionStudies.length).length}/${records.length}; this includes incomplete and rejected studies.`,
 `Four-view files present: ${completeViews}/${records.length}. This count does not establish consistent anatomy or visual approval.`,
 `Recorded turnaround review states: ${reviewSummary}.`,
 `Non-placeholder runtime bindings: ${records.filter(m=>m.sprite).length}/${records.length}; placeholder or missing bindings: ${records.filter(m=>!m.sprite).length}. Existing bindings still require animation and Bible fidelity review.`,
 'Animation PNG existence does not verify frame count, distinct motion, leg articulation, death quality, direction coverage or in-game behavior.',
 'Skill VFX implementation and appearance must be inspected in current runtime code; this data-only audit does not classify current effects as generic or finished.'
];
writeFileSync(resolve(out,'BACKLOG.md'),[...lines,...evidence].join('\n')+'\n');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const cards=records.filter(m=>m.views.front.master).map(m=>`<article><img loading="lazy" src="../monsters/${m.id}/front.png" alt="${escape(m.name)} front master"><h2>${escape(m.name)}</h2><small>${m.id} · ${m.region} · Front master</small><p>${escape(m.brief)}</p><p class="status">${['back','left','right'].map(v=>`${v}: ${m.views[v].status}`).join(' / ')}. Source motion review files: ${m.sourceMotionStudies.length}. Runtime: ${m.sprite??'placeholder'}. Visual approval remains separate.</p></article>`).join('\n');
writeFileSync(resolve(out,'gallery.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elyndra monster front masters</title>
<style>body{margin:24px;background:#202831;color:#e8e2d8;font:16px system-ui}h1{color:#d9b970}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{background:#303b46;padding:16px;border-radius:8px}img{width:100%;height:300px;object-fit:contain;background:repeating-conic-gradient(#26303b 0 25%,#303c48 0 50%) 0/24px 24px}h2{margin:12px 0 4px}small,.status{color:#c5b087}button{padding:10px;margin-bottom:20px}body.light img{background:#eee}</style>
<h1>Elyndra — front master review</h1><p>${records.filter(m=>m.views.front.master).length} newly created masters / ${records.length} game monsters. These are references, not completed animated game sprites.</p><p>Compare each image with its current bible brief below. Review anatomy, material, framing and later cross-view consistency; file existence alone is not approval.</p><button onclick="document.body.classList.toggle('light')">Toggle light / dark background</button><main>${cards}</main></html>\n`);
console.log(JSON.stringify({monsters:records.length,newFrontMasters:records.filter(m=>m.views.front.master).length,missingFront:missing.length,equipment:equipment.length,sharedEquipment:equipment.filter(i=>i.generatedAlias).length,skills:effects.length},null,2));
