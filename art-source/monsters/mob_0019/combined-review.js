const files=['walk-left-contacts-v2.png','walk-left-pass-a-v2.png','walk-left-pass-b.png','walk-front.png','walk-back.png','actions-left.png','actions-left-v2.png','actions-front.png','actions-back.png','right.png','actions-right.png','walk-right.png','walk-right-contact-b-v2.png','walk-right-pass-b.png'];
const images=Object.fromEntries(await Promise.all(files.map(async file=>{const im=new Image();im.src=file;await im.decode();return [file,im]})));
const defs={idle:{frames:1,fps:1,loop:true},walk:{frames:4,fps:4,loop:true},attack:{frames:6,fps:8},hit:{frames:6,fps:10},death:{frames:6,fps:6}};
const sequences={idle:[0],attack:[0,1,1,2,2,0],hit:[0,3,3,0,0,0],death:[0,4,4,5,5,5]};
const specs={
 left:{crops:[[0,0,440,555],[450,0,500,555],[960,0,576,555],[0,555,460,469],[470,555,480,469],[980,555,556,469]],hips:[292,798,1360,285,830,1400],ground:[548,548,548,990,980,980],scale:.48},
 front:{crops:[[160,0,300,570],[620,0,310,570],[1020,0,410,570],[80,570,410,454],[600,570,330,454],[980,650,480,374]],hips:[322,778,1210,300,775,1260],ground:[562,562,562,995,985,970],scale:.48},
 back:{crops:[[150,0,280,550],[630,0,375,550],[1100,0,380,560],[90,555,385,469],[600,550,340,474],[1020,650,516,374]],hips:[280,765,1245,260,760,1175],ground:[540,540,550,1009,985,980],scale:.50},
 right:{crops:[null,[500,0,450,510],[1050,0,486,510],[70,510,410,514],[520,600,470,424],[980,700,556,324]],hips:[630,660,1160,240,735,1160],ground:[1180,502,502,970,955,952],scale:.5}
};
function draw(g,clip,f,view){
 g.save();g.translate(view==='right'?192:212,346);
 const part=(file,crop,hip,ground,s)=>{const [x,y,w,h]=crop;g.drawImage(images[file],x,y,w,h,(x-hip)*s,(y-ground)*s,w*s,h*s)};
 if(clip==='walk'){
  if(view==='left'){
   if(f%2===0){const cell=f/2;part('walk-left-contacts-v2.png',[cell*768,0,768,1024],[450,1170][cell],990,.26)}
   else part(f===1?'walk-left-pass-a-v2.png':'walk-left-pass-b.png',[0,0,1254,1254],650,1218,.215);
  }else if(view==='right'){
   if(f<2)part('walk-right.png',[f*768,0,768,512],[460,1090][f],500,.53);
   else part(f===2?'walk-right-contact-b-v2.png':'walk-right-pass-b.png',[0,0,1254,1254],630,f===2?1205:1190,.23);
  }else{
   const front=view==='front',cell=(front?[0,1,2,3]:[0,3,2,1])[f],x=cell%2*768,y=Math.floor(cell/2)*512;
   part(`walk-${view}.png`,[x,y,768,512],(front?[486,1110,484,1110]:[474,1042,474,1042])[cell],(front?[506,506,1010,1010]:[494,494,1003,1003])[cell],front?.54:.55);
  }
 }else{
  const cell=sequences[clip][f],spec=specs[view],file=view==='left'&&(cell===1||cell===3)?'actions-left-v2.png':`actions-${view}.png`;
  if(view==='right'&&cell===0)part('right.png',[0,0,1254,1254],630,1180,.23);
  else part(file,spec.crops[cell],spec.hips[cell],spec.ground[cell],spec.scale);
  if(cell===3&&view==='front')part(file,[80,515,80,55],spec.hips[cell],spec.ground[cell],spec.scale);
  if(cell===3&&view==='back')part(file,[430,530,50,25],spec.hips[cell],spec.ground[cell],spec.scale);
  if(view==='right'){
   if(cell===1)part(file,[950,180,40,60],spec.hips[cell],spec.ground[cell],spec.scale);
   if(cell===2)part(file,[950,340,100,170],spec.hips[cell],spec.ground[cell],spec.scale);
   if(cell===3)part(file,[400,470,80,40],spec.hips[cell],spec.ground[cell],spec.scale);
  }
 }
 g.restore();
}
const g=document.querySelector('#motion').getContext('2d'),view=document.querySelector('#view'),clip=document.querySelector('#clip'),slider=document.querySelector('#frame');
let start=performance.now(),playing=true;
function render(){g.clearRect(0,0,384,384);draw(g,clip.value,Number(slider.value),view.value)}
function reset(){start=performance.now();slider.max=String(defs[clip.value].frames-1);slider.value='0';playing=true;render()}
view.onchange=reset;clip.onchange=reset;document.querySelector('#replay').onclick=reset;
slider.oninput=()=>{playing=false;render()};
document.querySelector('#pause').onclick=()=>{playing=!playing;start=performance.now()-Number(slider.value)*1000/defs[clip.value].fps};
function tick(t){if(playing){const d=defs[clip.value],f=Math.floor((t-start)*d.fps/1000);slider.value=String(d.loop?f%d.frames:Math.min(d.frames-1,f));render()}requestAnimationFrame(tick)}
const comp=document.querySelector('#comparison').getContext('2d');
for(const [row,v]of ['left','front','back','right'].entries())for(const [col,[c,f]]of [['idle',0],['walk',0],['walk',2],['death',5]].entries()){
 comp.save();comp.translate(col*384,row*384);comp.strokeStyle='#b1babe';comp.beginPath();comp.moveTo(0,346);comp.lineTo(384,346);comp.stroke();draw(comp,c,f,v);comp.fillStyle='white';comp.fillText(`${v} ${c} ${f}`,12,20);comp.restore();
}
reset();requestAnimationFrame(tick);window.__wardenCombined={ready:true,draw,defs};
