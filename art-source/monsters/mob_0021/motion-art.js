import {idleSources,idleSequence} from './idle-art.js';
export const views=['front','back','left','right'];
export const clips=['idle','walk','attack','hit','death'];
const actionSpecs={
 front:{file:'actions-front-study.png',scale:.7,crops:[[0,15,595,452],[610,15,600,452],[1210,15,564,452],[0,468,580,410],[580,480,620,398],[1200,540,574,338]],anchors:[[297,451],[910,455],[1490,464],[292,855],[890,853],[1485,846]]},
 back:{file:'actions-back-study.png',scale:.7,crops:[[0,20,585,450],[585,20,615,450],[1160,80,614,390],[0,475,590,405],[590,490,590,390],[1180,550,594,330]],anchors:[[297,465],[895,466],[1470,465],[298,859],[885,851],[1475,846]]},
 left:{file:'actions-left-study-v2.png',scale:.8,crops:[[0,0,512,512],[512,0,496,512],[1008,0,528,512],[0,512,512,512],[512,512,512,512],[1024,512,512,512]],anchors:[[290,477],[815,478],[1320,480],[310,942],[820,935],[1325,933]]},
 right:{file:'actions-right-study.png',scale:.8,crops:[[0,70,530,460],[530,0,520,530],[1000,155,536,375],[0,540,520,450],[520,600,500,380],[1020,640,516,320]],anchors:[[245,518],[765,518],[1245,518],[245,967],[765,961],[1265,943]]},
};
const sequence={attack:[0,1,1,2,2,0],hit:[0,3,3,0,0,0],death:[0,4,4,5,5,5]};
const frontDeath=[0,6,4,4,5,5];
const sideWalk={
 left:['left-profile-study-v2.png','walk-left-lift-24.png','left-profile-study-v2.png','walk-left-lift-13.png'],
 right:['right-profile-study-v2.png','walk-right-lift-24.png','right-profile-study-v2.png','walk-right-lift-13-v2.png'],
};
export const rightAttackSources=['right-profile-study-v2.png','attack-right-windup.png','attack-right-pinch.png'];
export const leftAttackSources=['left-profile-study-v2.png','attack-left-windup.png','attack-left-pinch.png'];
export const rightHitSource='hit-right-brace-v2.png';
export const leftHitSource='hit-left-brace.png';
export const leftDeathSources=['left-profile-study-v2.png','collapse-left-volume.png','death-left-volume-study.png'];
export const leftDeathGround=[1005,988,930];
export const rightDeathSources=['right-profile-study-v2.png','collapse-right-volume.png','death-right-volume-v2.png'];
export const rightDeathGround=[1005,966,985];
const extra=['walk-front-study.png','walk-back-study-v2.png','walk-back-study-v4.png','buckle-front-study.png','collapse-front-volume.png','death-front-volume-v2.png','pinch-back-depth-study.png','death-back-volume-v2.png','death-left-volume-study.png',...rightAttackSources];
export async function loadMotionArt(){
 const files=new Set([...Object.values(idleSources).flat(),...Object.values(sideWalk).flat(),...Object.values(actionSpecs).map(s=>s.file),...extra,rightHitSource,...rightDeathSources,...leftAttackSources,leftHitSource,...leftDeathSources]);
 return Object.fromEntries(await Promise.all([...files].map(async file=>{
  const image=new Image();image.src=new URL('./'+file,import.meta.url).href;await image.decode();return[file,image];
 })));
}
export function definition(clip){
 if(!clips.includes(clip))throw new Error(`Unknown clip ${clip}`);
 return {frames:clip==='idle'?20:clip==='walk'?4:6,fps:clip==='idle'?8:clip==='walk'?4:clip==='hit'?10:6.25,loop:clip==='idle'||clip==='walk'};
}
function whole(g,art,file,scale,x,y){
 const im=art[file];g.drawImage(im,256-x*scale,430-y*scale,im.naturalWidth*scale,im.naturalHeight*scale);
}
export function drawMotion(g,art,view,clip,frame){
 if(!views.includes(view))throw new Error(`Unknown view ${view}`);
 const def=definition(clip);if(!Number.isInteger(frame)||frame<0||frame>=def.frames)throw new Error(`Invalid ${clip} frame ${frame}`);
 g.clearRect(0,0,512,512);
 if(clip==='idle'){
  // Fixed anchors per view; both drawings share their neutral registration.
  const side=view==='left'||view==='right';
  whole(g,art,idleSources[view][idleSequence[frame]],side?.25:.28,view==='left'?920:view==='right'?616:740,view==='front'?978:view==='back'?970:1005);return;
 }
 if(clip==='walk'){
  if(sideWalk[view])whole(g,art,sideWalk[view][frame],.25,view==='left'?920:616,1005);
  else{
   const im=art[view==='front'?'walk-front-study.png':frame===0?'walk-back-study-v4.png':'walk-back-study-v2.png'],w=im.naturalWidth/2,h=im.naturalHeight/2,scale=410/w;
   // Fixed offset for neutral-cell bottom padding, shared by the whole clip.
   g.drawImage(im,(frame%2)*w,Math.floor(frame/2)*h,w,h,51,446-h*scale,w*scale,h*scale);
  }return;
 }
 const cell=view==='front'&&clip==='death'?frontDeath[frame]:sequence[clip][frame];
 if(view==='right'&&clip==='attack'){whole(g,art,rightAttackSources[cell],.25,616,1005);return}
 if(view==='left'&&clip==='attack'){whole(g,art,leftAttackSources[cell],.25,920,1005);return}
 if(view==='right'&&clip==='hit'){whole(g,art,cell===3?rightHitSource:rightAttackSources[0],.25,616,1005);return}
 if(view==='left'&&clip==='hit'){whole(g,art,cell===3?leftHitSource:leftAttackSources[0],.25,920,1005);return}
 if(view==='left'&&clip==='death'){const key=cell===0?0:cell===4?1:2;whole(g,art,leftDeathSources[key],.25,920,leftDeathGround[key]);return}
 if(view==='right'&&clip==='death'){const key=cell===0?0:cell===4?1:2;whole(g,art,rightDeathSources[key],.25,616,rightDeathGround[key]);return}
 if(view==='front'&&clip==='death'){
  const file=cell===5?'death-front-volume-v2.png':cell===4?'collapse-front-volume.png':cell===6?'buckle-front-study.png':'front-rest-study.png';
  whole(g,art,file,.28,740,cell===5?927:cell===4?951:cell===6?970:978);return;
 }
 if(view==='back'&&cell===2){whole(g,art,'pinch-back-depth-study.png',.295,740,988);return}
 if(view==='back'&&cell===5){whole(g,art,'death-back-volume-v2.png',.28,740,914);return}
 if(view==='left'&&cell===5){whole(g,art,'death-left-volume-study.png',.25,920,930);return}
 const spec=actionSpecs[view],r=spec.crops[cell],a=spec.anchors[cell],s=spec.scale;
 g.save();
 // Exclude adjacent-sheet fragments using the same reviewed source rectangles.
 const exclude=view==='back'&&cell===1?[1160,280,40,190]:view==='right'&&cell===1?[1000,200,50,330]:view==='right'&&cell===2?[1000,155,50,45]:null;
 if(exclude){const path=new Path2D();path.rect(0,0,512,512);path.rect(256+(exclude[0]-a[0])*s,430+(exclude[1]-a[1])*s,exclude[2]*s,exclude[3]*s);g.clip(path,'evenodd')}
 g.drawImage(art[spec.file],...r,256+(r[0]-a[0])*s,430+(r[1]-a[1])*s,r[2]*s,r[3]*s);g.restore();
}
