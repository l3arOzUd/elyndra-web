// Export generated sprite-atlas cells into the project's existing 512px rig.
// This packs/scales illustrated parts; it does not procedurally draw the art.
// Source PNGs and original alpha are retained. First import backs up the kit.
import { readFile, writeFile, mkdir, cp, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'art-source/wayfarer-v1');
const kit = resolve(root, 'public/sprites/wayfarer');
const backup = resolve(source, 'original-kit');
try { await access(backup); } catch { await cp(kit, backup, { recursive: true }); }
const rig = JSON.parse(await readFile(resolve(kit, 'rig.json'), 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
const page = await browser.newPage();
const manifest = [];
try {
  for (const view of ['front', 'side', 'back']) {
    const side = view === 'side';
    const parts = rig.views[view].parts;
    const p = (name) => parts[name].pivot;
    const baseNames = ['head', 'torso', 'arm_near', 'arm_far', 'thigh_near', 'thigh_far', 'shin_near', 'shin_far'];
    const bodyRects = baseNames.map((name) => {
      const [x,y] = p(name);
      if (name === 'head') return [x - (side ? 82 : 85), 64, 170, 169];
      if (name === 'torso') return [x-(side?40:55), 215, side?80:110, 136];
      if (name.startsWith('arm')) return [x-18, y-16, 36, 126];
      if (name.startsWith('thigh')) return [x-19, y-16, 38, 104];
      return [x-(side?41:22), y-15, side?60:44, 480-(y-15)];
    });
    const [hx0,hy0] = p('arm_near');
    const hx = hx0 + (view === 'front' ? -6 : side ? 4 : 6), hy = hy0+96;
    const boots = ['shin_near','shin_far'].map((name) => {
      const [x] = p(name); return [x-(side?43:26),414,side?66:52,66];
    });
    const [tx] = p('torso');
    const coat = [tx-(side?45:61), 211, side?90:122, 149];
    const sleeves = ['arm_near','arm_far'].map((name) => {const [x,y]=p(name);return [x-22,y-19,44,91];});
    const cape = side ? [tx+2,219,87,185] : [tx-79,217,158,189];
    // Weapon atlas grip anchors: fixed to the existing near-hand position.
    const saber = view === 'back' ? [hx-14,hy-14,92,100] : [hx-78,hy-14,92,100];
    const bow = [hx-(view==='back'?39:12),hy-105,52,210];
    const rod = [hx-30,hy-240,60,320];
    const equipNames=['traveler_boots/'+view+'/shin_near','traveler_boots/'+view+'/shin_far',
      'leafweave_coat/'+view+'/torso','leafweave_coat/'+view+'/arm_near','leafweave_coat/'+view+'/arm_far',
      'leafweave_coat/'+view+'/cape','copper_saber/'+view+'/weapon','surveyor_bow/'+view+'/weapon','aether_rod/'+view+'/weapon'];
    for (const type of ['base','joints','equipment']) {
      const isBase=type!=='equipment';
      const sourceFile=type==='joints'?`base-${view}-joints.png`:`${type}-${view}.png`;
      const data = (await readFile(resolve(source, sourceFile))).toString('base64');
      const specs = (isBase ? bodyRects : [...boots,coat,...sleeves,cape,saber,bow,rod]).map((dest,i)=>{
        const row = Math.floor(i/(isBase?4:3)), col=i%(isBase?4:3);
        const xs=isBase?(row===0?[0,.32,.55,.76,1]:[0,.25,.5,.75,1]):[0,.385,.64,1];
        const ys=isBase?[0,.505,1]:[0,.33,.625,1];
        return {dest, region:[xs[col],ys[row],xs[col+1],ys[row+1]],file:isBase?`base/${view}/${baseNames[i]}.png`:`items/${equipNames[i]}.png`};
      }).filter((_,i)=>type==='base'?i<4:type==='joints'?i>=4:true);
      const result = await page.evaluate(async ({data,specs})=>{
        const im=new Image(); im.src='data:image/png;base64,'+data; await im.decode();
        const atlas=document.createElement('canvas');atlas.width=im.width;atlas.height=im.height;
        const ag=atlas.getContext('2d',{willReadFrequently:true});ag.drawImage(im,0,0);
        return specs.map(spec=>{
          const [a,b,c,d]=spec.region;
          const x0=Math.floor(a*im.width),y0=Math.floor(b*im.height),x1=Math.floor(c*im.width),y1=Math.floor(d*im.height);
          const pixels=ag.getImageData(x0,y0,x1-x0,y1-y0).data;
          let l=x1,t=y1,r=0,bot=0,count=0;
          for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[((y-y0)*(x1-x0)+x-x0)*4+3]>24){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);bot=Math.max(bot,y);count++;}
          if(count<100)throw new Error('Empty cell '+spec.file);
          const crop=[Math.max(x0,l-1),Math.max(y0,t-1),Math.min(x1,r+2)-Math.max(x0,l-1),Math.min(y1,bot+2)-Math.max(y0,t-1)];
          const out=document.createElement('canvas');out.width=out.height=512;
          const g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(im,...crop,...spec.dest);
          return {...spec,crop,sourceSize:[im.width,im.height],png:out.toDataURL('image/png').split(',')[1]};
        });
      },{data,specs});
      for(const {png,...entry} of result){
        const file=resolve(kit,entry.file);await mkdir(dirname(file),{recursive:true});await writeFile(file,Buffer.from(png,'base64'));
        manifest.push({...entry,source:sourceFile});
      }
    }
  }
  await writeFile(resolve(source,'import-manifest.json'),JSON.stringify({canvas:512,feet:rig.feet,parts:manifest},null,2)+'\n');
  console.log(`Exported ${manifest.length} illustrated parts; original kit preserved in art-source/wayfarer-v1/original-kit.`);
} finally {await browser.close();}
