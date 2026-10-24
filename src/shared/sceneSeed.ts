import { decodeWalk, type MapLayout } from '../data/schema';
import { hashString, rng } from './rng';
import { farmSite } from './dawnFarm';
import { siteReserved } from './dawnSites';

/** Decorative preview only. Solid props and the authoritative walk grid never move. */
export function sceneSeed(base: MapLayout, seed: number): MapLayout {
  if (!seed || !Number.isSafeInteger(seed)) return base;
  const rand = rng(hashString(`${base.id}:${seed}`));
  const walk = decodeWalk(base.walk_rle, base.width * base.height);
  const nearRoad = (x: number, y: number) => base.roads.some(r => r.points.slice(1).some(([bx, by], i) => {
    const [ax, ay] = r.points[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy || 1)));
    return Math.hypot(x-ax-t*dx, y-ay-t*dy) < r.width / 2 + 2;
  }));
  const valid = (x: number, y: number) => x > 2 && y > 2 && x < base.width-3 && y < base.height-3 &&
    walk[y*base.width+x] === 1 && !nearRoad(x,y) &&
    ![...base.safe_areas,...(base.camps ?? [])].some(([a,b,w,h])=>x>=a-2&&x<a+w+2&&y>=b-2&&y<b+h+2) &&
    !base.landmarks.some(l=>Math.hypot(l.x-x,l.y-y)<6) &&
    !(base.id==='lum_fld_01' && (farmSite(x,y)||siteReserved(x,y)));
  return {...base, props: base.props.map(p=>{
    if(p.block || !['bush','rock','flowers','grass'].includes(p.kind)) return p;
    for(let i=0;i<12;i++) {
      const x=Math.round(p.x+(rand()-.5)*8),y=Math.round(p.y+(rand()-.5)*8);
      if(valid(x,y)) return {...p,x,y,rot:rand()*Math.PI*2,scale:(p.scale??1)*(.85+rand()*.3)};
    }
    return p;
  })};
}
