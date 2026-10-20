const views=['left','front','back','right'];
const images=Object.fromEntries(await Promise.all(views.map(async v=>{const im=new Image();im.src=new URL(`./hop-${v}.png`,import.meta.url).href;await im.decode();return [v,im]})));
const forefoot=new Image();forefoot.src=new URL('hop-left-forefoot.png',import.meta.url).href;await forefoot.decode();
export const hopSpecs={
 left:{crops:[[50,40,600,470],[670,0,866,525],[0,515,750,410],[800,550,736,474]],anchors:[[350,280],[1010,260],[350,720],[1180,770]],bodyY:[333,312,285,330],names:['crouch','push','airborne tuck','forefoot contact','settled landing']},
 front:{crops:[[0,0,768,512],[768,0,768,512],[0,512,768,512],[768,512,768,512]],anchors:[[384,490],[1152,490],[384,990],[1152,990]],bodyY:[429,420,375,428],names:['crouch','push-off','airborne tuck','forefoot contact']},
 back:{crops:[[0,0,768,512],[768,0,768,530],[0,512,768,512],[768,530,768,494]],anchors:[[396,472],[1150,528],[405,975],[1150,990]],bodyY:[430,430,375,430],names:['crouch','push-off','airborne tuck','forefoot contact']},
 right:{crops:[[0,0,768,512],[768,0,768,512],[0,512,768,512],[768,512,768,512]],anchors:[[390,502],[1200,508],[390,956],[1200,994]],bodyY:[430,430,375,430],names:['crouch','push-off','airborne tuck','forefoot contact']}
};
export function drawHop(ctx,view,f){
 if(view==='left'&&f===3){ctx.drawImage(forefoot,0,515,760,509,256-350*.45,333+(515-770)*.45,760*.45,509*.45);return}
 const spec=hopSpecs[view],cell=view==='left'&&f===4?3:f,[x,y,w,h]=spec.crops[cell],[ax,ay]=spec.anchors[cell],s=.45;
 ctx.drawImage(images[view],x,y,w,h,256+(x-ax)*s,spec.bodyY[cell]+(y-ay)*s,w*s,h*s);
}
