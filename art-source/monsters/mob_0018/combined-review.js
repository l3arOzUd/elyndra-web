const sideFiles=['walk-left-contact-a-v5.png','walk-left-pass-a.png','walk-left-contact-b.png','walk-left-pass-b.png'];
const files=[...sideFiles,'walk-front.png','walk-back.png','actions-left.png','actions-front.png','actions-back.png','actions-back-v2.png','idle-front-settle.png','idle-left-settle.png'];
const images=Object.fromEntries(await Promise.all(files.map(async file=>{const im=new Image();im.src=file;await im.decode();return [file,im]})));
const defs={idle:{frames:6,fps:4,loop:true},walk:{frames:4,fps:4,loop:true},attack:{frames:6,fps:8},hit:{frames:6,fps:12},death:{frames:6,fps:7}};
const seq={idle:[0,0,0,0,0,0],attack:[0,1,1,2,2,0],hit:[0,3,3,0,0,0],death:[0,4,4,5,5,5]};
const specs={
 left:{crops:[[0,0,512,550],[512,0,468,550],[980,0,556,550],[0,550,512,474],[512,550,512,474],[1024,550,512,474]],anchors:[260,750,1280,280,780,1280],ground:[542,542,542,1000,1000,985],scale:.55},
 front:{crops:[[0,0,512,525],[512,0,512,525],[1024,0,512,525],[0,525,530,499],[530,525,494,499],[1024,525,512,499]],anchors:[285,785,1290,270,790,1290],ground:[510,516,519,981,985,997],scale:.60},
 back:{crops:[[0,0,512,525],[512,0,512,525],[1024,0,512,525],[0,525,530,499],[530,525,494,499],[1024,525,512,499]],anchors:[255,775,1290,280,770,1290],ground:[511,511,511,993,977,982],scale:.60}
};
function draw(g,clip,f,view){
 g.save();g.translate(192,346);
 if(view==='right'){g.scale(-1,1);view='left'}
 if(clip==='walk'){
  if(view==='left'){
   const im=images[sideFiles[f]],s=.25,anchor=[627,627,650,650][f],ground=[1220,1220,1230,1230][f];
   g.drawImage(im,-anchor*s,-ground*s,im.width*s,im.height*s);
  }else{
   const front=view==='front',cell=(front?[0,3,2,1]:[0,1,2,3])[f],sx=cell%2*768,sy=Math.floor(cell/2)*512;
   const anchor=(front?[446,1090,441,1090]:[442,1098,443,1098])[cell],ground=(front?[499,494,997,1005]:[493,482,1001,981])[cell],s=.62;
   g.drawImage(images[`walk-${view}.png`],sx,sy,768,512,(sx-anchor)*s,(sy-ground)*s,768*s,512*s);
  }
 }else{
  const cell=seq[clip][f],spec=specs[view],[sx,sy,w,h]=spec.crops[cell],s=spec.scale;
  const file=clip==='idle'&&(view==='front'||view==='left')&&(f===2||f===3)?`idle-${view}-settle.png`:view==='back'&&cell===2?'actions-back-v2.png':`actions-${view}.png`;
  g.drawImage(images[file],sx,sy,w,h,(sx-spec.anchors[cell])*s,(sy-spec.ground[cell])*s,w*s,h*s);
 }
 g.restore();
}
const canvas=document.querySelector('#motion'),g=canvas.getContext('2d'),view=document.querySelector('#view'),clip=document.querySelector('#clip'),slider=document.querySelector('#frame');
let start=performance.now(),playing=true;
function render(){g.clearRect(0,0,384,384);draw(g,clip.value,Number(slider.value),view.value)}
function reset(){start=performance.now();slider.max=defs[clip.value].frames-1;slider.value=0;playing=true;render()}
view.onchange=reset;clip.onchange=reset;document.querySelector('#replay').onclick=reset;
slider.oninput=()=>{playing=false;render()};
document.querySelector('#pause').onclick=()=>{playing=!playing;start=performance.now()-Number(slider.value)*1000/defs[clip.value].fps};
function tick(t){if(playing){const def=defs[clip.value];let f=Math.floor((t-start)*def.fps/1000);f=def.loop?f%def.frames:Math.min(def.frames-1,f);slider.value=f;render()}requestAnimationFrame(tick)}
const comp=document.querySelector('#comparison').getContext('2d');
for(const [row,v]of ['left','front','back'].entries())for(const [col,[c,f]]of [['idle',0],['walk',0],['walk',2],['death',5]].entries()){
 comp.save();comp.translate(col*384,row*384);comp.strokeStyle='#b1babe';comp.beginPath();comp.moveTo(0,346);comp.lineTo(384,346);comp.stroke();draw(comp,c,f,v);comp.fillStyle='white';comp.fillText(`${v} ${c} ${f}`,12,20);comp.restore();
}
reset();requestAnimationFrame(tick);window.__duneCombined={ready:true,draw,defs};
