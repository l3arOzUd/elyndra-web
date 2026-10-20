import {draw} from './motion-art.js';
// The engine requests eight facings. Diagonal rows explicitly reuse the
// matching side drawing; east uses authored right art, never mirrored left.
export const facings=[
 ['S','front'],['SW','left'],['W','left'],['NW','left'],
 ['N','back'],['NE','right'],['E','right'],['SE','right']
];
export const definitions={
 idle:{frames:16,fps:8,loop:true},
 walk:{frames:5,fps:5,loop:true,refMsPerCell:280},
 attack:{frames:6,fps:6.25,events:{hit:3}},
 hit:{frames:6,fps:10},
 death:{frames:6,fps:6.25,hold:true}
};
export function exportDraft(){
 const json={id:'tidehopper_2d',kind:'sheet',facingMode:'directional',
  frame:{w:384,h:384},pivot:{x:192,y:346},pixelsPerCell:300,
  rows:facings.map(([dir])=>dir),
  animations:Object.fromEntries(Object.entries(definitions).map(([name,def])=>[name,{file:`${name}.png`,...def}]))};
 const images={},sizes={};
 for(const [clip,def]of Object.entries(definitions)){
  const canvas=document.createElement('canvas');canvas.width=384*def.frames;canvas.height=384*facings.length;
  const ctx=canvas.getContext('2d');
  for(const [row,[,view]]of facings.entries())for(let frame=0;frame<def.frames;frame++){
   // Non-left hops have no separate settled landing drawing yet. Reuse
   // crouch at the fifth step and expose that limitation in validation.
   const key=clip==='walk'&&view!=='left'&&frame===4?0:frame;
   ctx.save();ctx.translate(frame*384,row*384+23.5);ctx.scale(.75,.75);
   draw(ctx,view,clip,key);ctx.restore();
  }
  images[clip]=canvas.toDataURL('image/png');
  sizes[clip]={width:canvas.width,height:canvas.height};
 }
 return {json,images,sizes};
}
