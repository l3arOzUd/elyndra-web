const views=['left','front','back','right'];
const images=Object.fromEntries(await Promise.all(views.map(async v=>{const im=new Image();im.src=new URL(`./actions-${v}.png`,import.meta.url).href;await im.decode();return [v,im]})));
const repairedRight=new Image();repairedRight.src=new URL('actions-right-v2.png',import.meta.url).href;await repairedRight.decode();
export const specs={
 left:{crops:[[0,90,505,460],[510,170,480,380],[990,150,546,400],[0,570,525,430],[530,650,480,350],[1015,650,521,350]],hips:[260,750,1260,270,770,1280],ground:[539,537,536,976,970,969],scale:.55},
 front:{crops:[[0,60,510,450],[510,120,500,390],[1010,70,526,460],[0,550,505,450],[505,610,510,390],[1015,650,521,350]],hips:[256,765,1270,256,765,1270],ground:[499,491,520,984,967,963],scale:.55},
 back:{crops:[[15,85,490,415],[535,110,465,390],[1020,15,510,490],[45,530,440,465],[525,620,475,375],[1010,650,515,345]],hips:[260,770,1270,260,770,1270],ground:[494,494,496,985,983,983],scale:.55},
 right:{crops:[[15,75,495,435],[505,85,525,425],[1030,70,506,440],[5,530,500,465],[515,595,510,385],[1025,640,510,340]],hips:[260,770,1280,260,770,1280],ground:[502,502,494,983,970,967],scale:.55}
};
export const sequences={attack:[0,1,1,2,2,0],hit:[0,3,3,0,0,0],death:[0,4,4,5,5,5],all:[0,1,2,3,4,5]};
export const names=['neutral','preparation','impact','recoil','collapse','dead'];
export function draw(ctx,v,cell){
 const spec=specs[v],[x,y,w,h]=spec.crops[cell],s=spec.scale;
 const dx=sx=>256+(sx-spec.hips[cell])*s,dy=sy=>430+(sy-spec.ground[cell])*s;
 // Adjacent generated poses cross the nominal grid. Exclude only the
 // isolated neighbor fragments; preserve the frog's complete nose/toes.
 const notch=v==='left'&&cell===2?[990,360,11,80]:v==='front'&&cell===4?[505,780,10,60]:v==='right'&&cell===1?[1010,400,20,105]:null;
 ctx.save();
 if(notch){const [nx,ny,nw,nh]=notch;const path=new Path2D();path.rect(dx(x),dy(y),w*s,h*s);path.rect(dx(nx),dy(ny),nw*s,nh*s);ctx.clip(path,'evenodd')}
 ctx.drawImage(v==='right'&&cell===2?repairedRight:images[v],x,y,w,h,dx(x),dy(y),w*s,h*s);ctx.restore();
}
