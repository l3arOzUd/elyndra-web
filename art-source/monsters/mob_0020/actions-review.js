import {draw,sequences,specs,names} from './actions-art.js';
const view=document.querySelector('#view'),clip=document.querySelector('#clip'),slider=document.querySelector('#frame'),g=document.querySelector('#motion').getContext('2d');
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
