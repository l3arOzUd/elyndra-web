// Preview VFX independent of painted pixels. Anchors use selected impact art.
export const FLARE_DURATION=.22;
export const HIT_TIME=3/8;
const panels={
 front:[[1205,55],[1120,95],[1120,160],[1280,110],[1280,180]],
 left:[[1380,75],[1410,130],[1425,195],[1440,245]],
 back:[[1258,90],[1170,125],[1165,180],[1320,140],[1310,195]],
 right:[[1125,105],[1110,153],[1100,207],[1090,260]]
};
export function flareIntensity(age){
 return Number.isFinite(age)&&age>=0&&age<FLARE_DURATION?(1-age/FLARE_DURATION)**2:0;
}
export function drawSolarFlare(g,view,age,registration){
 const intensity=flareIntensity(age);if(!intensity||!panels[view])return;
 const rear=view==='back',radius=(rear?7:15)+age*15;
 g.save();g.globalCompositeOperation='lighter';
 for(const [sx,sy]of panels[view]){
  const x=(sx-registration.hip)*registration.scale,y=(sy-registration.ground)*registration.scale;
  const glow=g.createRadialGradient(x,y,0,x,y,radius);
  glow.addColorStop(0,`rgba(255,248,195,${intensity*(rear?.35:.8)})`);
  glow.addColorStop(.25,`rgba(255,203,75,${intensity*(rear?.22:.5)})`);
  glow.addColorStop(1,'rgba(255,160,30,0)');
  g.fillStyle=glow;g.beginPath();g.arc(x,y,radius,0,Math.PI*2);g.fill();
  if(!rear){
   g.strokeStyle=`rgba(255,237,156,${intensity*.7})`;g.lineWidth=.8;
   g.beginPath();g.moveTo(x-radius*.65,y);g.lineTo(x+radius*.65,y);
   g.moveTo(x,y-radius*.65);g.lineTo(x,y+radius*.65);g.stroke();
  }
 }
 g.restore();
}
