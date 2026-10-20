import {draw as drawAction,specs} from './actions-art.js';
const views=['left','front','right'];
const blinks=Object.fromEntries(await Promise.all(views.map(async view=>{
 const im=new Image();im.src=new URL(`./idle-${view}-blink.png`,import.meta.url).href;await im.decode();return [view,im];
})));
const exhale=new Image();exhale.src=new URL('./idle-back-exhale.png',import.meta.url).href;await exhale.decode();
export function idleDefinition(view){
 return {frames:16,fps:8,loop:true};
}
export function drawIdle(ctx,view,frame){
 const alternate=view==='back'?frame>=5&&frame<=10:frame===12||frame===13;
 if(!alternate){drawAction(ctx,view,0);return}
 const spec=specs[view],[x,y,w,h]=spec.crops[0],s=spec.scale;
 ctx.drawImage(view==='back'?exhale:blinks[view],x,y,w,h,256+(x-spec.hips[0])*s,430+(y-spec.ground[0])*s,w*s,h*s);
}
