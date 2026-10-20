import {draw as drawAction,sequences} from './actions-art.js';
import {drawHop,hopSpecs} from './hop-art.js';
import {drawIdle,idleDefinition} from './idle-art.js';
export const views=['left','front','back','right'];
export function definition(view,clip){
 if(clip==='idle')return idleDefinition(view);
 if(clip==='walk')return {frames:hopSpecs[view].names.length,fps:5,loop:true};
 return {frames:sequences[clip].length,fps:clip==='hit'?10:6.25,loop:false};
}
export function draw(ctx,view,clip,frame){
 if(clip==='walk'){
  const scale=view==='front'?.85:view==='back'?.92:1;
  ctx.save();ctx.translate(256,430);ctx.scale(scale,scale);ctx.translate(-256,-430);
  drawHop(ctx,view,frame);ctx.restore();
 }else if(clip==='idle')drawIdle(ctx,view,frame);
 else drawAction(ctx,view,sequences[clip][frame]);
}
