const views=['left','front'];
const images=Object.fromEntries(await Promise.all(views.map(async v=>{const im=new Image();im.src=`actions-${v}.png`;await im.decode();return [v,im]})));
const specs={
 left:{crops:[[0,90,505,460],[510,170,480,380],[990,150,546,400],[0,570,525,430],[530,650,480,350],[1015,650,521,350]],hips:[260,750,1260,270,770,1280],ground:[539,537,536,976,970,969],scale:.55},
 front:{crops:[[0,60,510,450],[510,120,500,390],[1010,70,526,460],[0,550,505,450],[505,610,510,390],[1015,650,521,350]],hips:[256,765,1270,256,765,1270],ground:[499,491,520,984,967,963],scale:.55}
};
const sequences={attack:[0,1,1,2,2,0],hit:[0,3,3,0,0,0],death:[0,4,4,5,5,5],all:[0,1,2,3,4,5]};
const names=['neutral','preparation','impact','recoil','collapse','dead'];
const view=document.querySelector('#view'),clip=document.querySelector('#clip'),slider=document.querySelector('#frame'),g=document.querySelector('#motion').getContext('2d');
function draw(ctx,v,cell){
 const spec=specs[v],[x,y,w,h]=spec.crops[cell],s=spec.scale;
 const dx=sx=>256+(sx-spec.hips[cell])*s,dy=sy=>430+(sy-spec.ground[cell])*s;
 // Adjacent generated poses cross the nominal grid. Exclude only the
 // isolated neighbor fragments; preserve the frog's complete nose/toes.
 const notch=v==='left'&&cell===2?[990,360,11,80]:v==='front'&&cell===4?[505,780,10,60]:null;
 ctx.save();
 if(notch){const [nx,ny,nw,nh]=notch;const path=new Path2D();path.rect(dx(x),dy(y),w*s,h*s);path.rect(dx(nx),dy(ny),nw*s,nh*s);ctx.clip(path,'evenodd')}
 ctx.drawImage(images[v],x,y,w,h,dx(x),dy(y),w*s,h*s);ctx.restore();
}
function ground(ctx){ctx.strokeStyle='#b4c4c5';ctx.beginPath();ctx.moveTo(0,430);ctx.lineTo(512,430);ctx.stroke()}
function render(){g.clearRect(0,0,512,512);ground(g);const cell=sequences[clip.value][Number(slider.value)];draw(g,view.value,cell);document.querySelector('#label').textContent=names[cell]}
function comparison(){const ctx=document.querySelector('#comparison').getContext('2d');ctx.clearRect(0,0,1536,1024);for(let cell=0;cell<6;cell++){ctx.save();ctx.translate(cell%3*512,Math.floor(cell/3)*512);ground(ctx);draw(ctx,view.value,cell);ctx.fillStyle='white';ctx.fillText(names[cell],12,24);ctx.restore()}}
let playing=false,start=0;
function reset(){slider.value='0';start=performance.now();playing=true;render()}
view.onchange=()=>{comparison();reset()};clip.onchange=reset;document.querySelector('#play').onclick=reset;
document.querySelector('#pause').onclick=()=>{playing=!playing;start=performance.now()-Number(slider.value)*160};
slider.oninput=()=>{playing=false;render()};
function tick(t){if(playing){slider.value=String(Math.min(5,Math.floor((t-start)/160)));render();if(Number(slider.value)===5)playing=false}requestAnimationFrame(tick)}
comparison();render();requestAnimationFrame(tick);window.__tideActions={ready:true,draw,sequences,specs};
