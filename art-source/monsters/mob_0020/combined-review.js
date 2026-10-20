import {draw,definition,views} from './motion-art.js';
const view=document.querySelector('#view'),clip=document.querySelector('#clip'),slider=document.querySelector('#frame');
const canvas=document.querySelector('#motion'),g=canvas.getContext('2d'),small=document.querySelector('#small').getContext('2d');
let playing=true,start=performance.now();
function render(){
 const f=Number(slider.value);g.clearRect(0,0,512,512);draw(g,view.value,clip.value,f);
 small.clearRect(0,0,128,128);small.drawImage(canvas,0,0,128,128);
 document.querySelector('#label').textContent=`${f+1} / ${definition(view.value,clip.value).frames}`;
}
function reset(){const d=definition(view.value,clip.value);slider.max=String(d.frames-1);slider.value='0';playing=true;start=performance.now();render()}
view.onchange=reset;clip.onchange=reset;document.querySelector('#play').onclick=reset;
document.querySelector('#pause').onclick=()=>{playing=!playing;start=performance.now()-Number(slider.value)*1000/definition(view.value,clip.value).fps};
slider.oninput=()=>{playing=false;render()};
function tick(t){
 if(playing){const d=definition(view.value,clip.value),f=Math.floor((t-start)*d.fps/1000);slider.value=String(d.loop?f%d.frames:Math.min(f,d.frames-1));render();if(!d.loop&&f>=d.frames-1)playing=false}
 requestAnimationFrame(tick);
}
const comp=document.querySelector('#comparison').getContext('2d');
for(const [row,v]of views.entries())for(const [col,[c,f]]of [['idle',0],['walk',0],['walk',2],['death',5]].entries()){
 comp.save();comp.translate(col*512,row*512);comp.strokeStyle='#b4c4c5';comp.beginPath();comp.moveTo(0,430);comp.lineTo(512,430);comp.stroke();
 draw(comp,v,c,f);comp.fillStyle='white';comp.fillText(`${v} ${c} ${f}`,12,24);comp.restore();
}
reset();requestAnimationFrame(tick);window.__tideCombined={ready:true,draw,definition};
