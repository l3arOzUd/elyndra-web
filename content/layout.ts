// Turns a MapDesign into a MapLayout: lays down blockers, roads and props,
// scatters decoration deterministically, and bakes the walk grid.

import { encodeWalk, type MapLayout, type Prop, type Rect, type Shape } from "../src/data/schema";
import { hashString, rng } from "../src/shared/rng";
import type { MapDesign } from "./types";
import { farmSite } from '../src/shared/dawnFarm';
import { siteReserved } from '../src/shared/dawnSites';

export function shapeContains(s: Shape, x: number, y: number): boolean {
  const px = x + 0.5, py = y + 0.5;
  if ("rect" in s) {
    const [rx, ry, rw, rh] = s.rect;
    return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
  }
  if ("ellipse" in s) {
    const [cx, cy, rx, ry] = s.ellipse;
    return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
  }
  let inside = false;
  const p = s.poly;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function shapeBounds(s: Shape): Rect {
  if ("rect" in s) return s.rect;
  if ("ellipse" in s) {
    const [cx, cy, rx, ry] = s.ellipse;
    return [Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(rx * 2) + 1, Math.ceil(ry * 2) + 1];
  }
  const xs = s.poly.map((p) => p[0]), ys = s.poly.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
  return [x, y, Math.ceil(Math.max(...xs)) - x + 1, Math.ceil(Math.max(...ys)) - y + 1];
}

/** Cells a road covers: every cell within width/2 of its centre line. */
export function roadCells(points: [number, number][], width: number, each: (x: number, y: number) => void) {
  const r = width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1];
    const minX = Math.floor(Math.min(ax, bx) - r - 1), maxX = Math.ceil(Math.max(ax, bx) + r + 1);
    const minY = Math.floor(Math.min(ay, by) - r - 1), maxY = Math.ceil(Math.max(ay, by) + r + 1);
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const qx = ax + t * dx, qy = ay + t * dy;
      if ((px - qx) ** 2 + (py - qy) ** 2 <= r * r) each(x, y);
    }
  }
}

function blockFootprint(p: Prop, each: (x: number, y: number) => void) {
  if (p.block <= 0) return;
  const h = Math.floor(p.block / 2);
  for (let dy = -h; dy < p.block - h; dy++) for (let dx = -h; dx < p.block - h; dx++) each(Math.round(p.x) + dx, Math.round(p.y) + dy);
}

export function bakeLayout(d: MapDesign, keepClear: [number, number, number][] = []): MapLayout {
  const [w, h] = d.size;
  const walk = new Uint8Array(w * h).fill(d.solid ? 0 : 1);
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < w && y < h) walk[y * w + x] = v; };
  const isRoad = new Uint8Array(w * h);

  for (const s of d.carve ?? []) {
    const [bx, by, bw, bh] = shapeBounds(s);
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (shapeContains(s, x, y)) set(x, y, 1);
  }
  if (d.border) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (Math.min(x, y, w - 1 - x, h - 1 - y) < d.border.width) set(x, y, 0);
    }
  }
  for (const b of d.blockers) {
    const [bx, by, bw, bh] = shapeBounds(b.shape);
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (shapeContains(b.shape, x, y)) set(x, y, 0);
  }
  // Roads win over blockers: that is how bridges and gates are made.
  for (const r of d.roads) roadCells(r.points, r.width, (x, y) => { set(x, y, 1); if (x >= 0 && y >= 0 && x < w && y < h) isRoad[y * w + x] = 1; });
  for (const p of d.props) blockFootprint(p, (x, y) => set(x, y, 0));

  // Scatter decoration where it won't get in the way.
  const rand = rng(hashString(d.id + ":scatter"));
  const props: Prop[] = [...d.props];
  const avoid = (x: number, y: number) => {
    if (d.id === 'lum_fld_01' && (farmSite(x, y) || siteReserved(x,y))) return true;
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return true;
    if (walk[y * w + x] !== 1) return true;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && isRoad[ny * w + nx]) return true;
    }
    // In a town the whole map is safe; only keep scatter off small safe areas (camps).
    if ([...d.safe_areas, ...(d.camps ?? [])].some((r) => (d.type !== "town" || r[2] * r[3] < w * h) && x >= r[0] - 1 && y >= r[1] - 1 && x < r[0] + r[2] + 1 && y < r[1] + r[3] + 1)) return true;
    if (keepClear.some(([cx, cy, cr]) => Math.max(Math.abs(cx - x), Math.abs(cy - y)) <= cr)) return true;
    // Preserve the readable silhouettes of Dawnmeadow's authored focal props.
    if (d.id === 'lum_fld_01' && d.props.some(p =>
      (p.kind === 'aether_pylon' || p.kind === 'aqueduct') && Math.hypot(x - p.x, y - p.y) < 5)) return true;
    return false;
  };
  const inPocket = (x: number, y: number) => d.pockets.some((p) => p.rects.some((r) => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]));
  for (const s of d.scatter) {
    const orchardTree = d.id === 'lum_fld_02' && s.kind === 'tree';
    const count = orchardTree ? Math.ceil(s.count * 0.45) : s.count;
    const area = s.area ?? [0, 0, w, h];
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 30; tries++) {
      const x = area[0] + Math.floor(rand() * area[2]);
      const y = area[1] + Math.floor(rand() * area[3]);
      if (avoid(x, y)) continue;
      if (orchardTree && props.some(p => p.kind === 'tree' && Math.hypot(p.x-x,p.y-y)<7)) continue;
      // Hordes need open ground: blocking scatter is thinned inside pockets.
      if (s.block > 0 && inPocket(x, y) && rand() > 0.12) continue;
      const scale = orchardTree ? (placed % 5 === 0 ? 1.9 + rand()*.25 : 1.15 + rand()*.35) : s.scale ? s.scale[0] + rand() * (s.scale[1] - s.scale[0]) : 1;
      const p: Prop = { kind: s.kind, x, y, block: s.block, scale: Math.round(scale * 100) / 100, rot: Math.round(rand() * 628) / 100 };
      props.push(p);
      blockFootprint(p, (bx, by) => set(bx, by, 0));
      placed++;
    }
  }
  // The border is four blockers like any other, so the client draws it.
  const blockers = [...d.blockers];
  if (d.border) {
    const k = d.border.width;
    const kind = d.border.kind;
    blockers.push(
      { kind, shape: { rect: [0, 0, w, k] } }, { kind, shape: { rect: [0, h - k, w, k] } },
      { kind, shape: { rect: [0, k, k, h - 2 * k] } }, { kind, shape: { rect: [w - k, k, k, h - 2 * k] } },
    );
  }
  // Forest blockers are drawn as trees, so give them trees (not on roads cut through them).
  for (const b of blockers) {
    if (b.kind !== "forest") continue;
    const [bx, by, bw, bh] = shapeBounds(b.shape);
    const orchard = d.id === 'lum_fld_02';
    const spacing = orchard ? 4.8 : 2;
    for (let y = by; y < by + bh; y += spacing) for (let x = bx; x < bx + bw; x += spacing) {
      if (!shapeContains(b.shape, x, y) || rand() < 0.35) continue;
      if (x >= 0 && y >= 0 && x < w && y < h && walk[Math.floor(y) * w + Math.floor(x)] === 1) continue;
      // Canopies spread ~3 cells: keep warps, landings and NPCs open to view.
      if (keepClear.some(([cx, cy, cr]) => Math.hypot(cx - x, cy - y) <= cr + 3)) continue;
      props.push({ kind: d.ground === "snow" ? "pine" : "tree", x: x + rand(), y: y + rand(), block: 0, scale: Math.round((orchard ? 1.5 + rand()*.6 : 0.8 + rand() * 0.6) * 100) / 100, rot: Math.round(rand() * 628) / 100 });
    }
  }
  if (d.id === 'lum_fld_02') {
    // Keep the authored tree positions, but stop treating an entire grove as
    // solid terrain. Border forests remain world boundaries; interior trees
    // use a trunk footprint: saplings occupy one cell, mature trees 2x2.
    for (let i = blockers.length - 1; i >= 0; i--)
      if (blockers[i].kind === 'forest' && d.blockers.includes(blockers[i])) blockers.splice(i, 1);
    for (let i = 0; i < props.length; i++)
      if (props[i].kind === 'tree') props[i] = { ...props[i], block: (props[i].scale ?? 1) >= 1.5 ? 2 : 1 };
    walk.fill(d.solid ? 0 : 1);
    for (const s of d.carve ?? []) {
      const [bx, by, bw, bh] = shapeBounds(s);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (shapeContains(s, x, y)) set(x, y, 1);
    }
    for (const b of blockers) {
      const [bx, by, bw, bh] = shapeBounds(b.shape);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (shapeContains(b.shape, x, y)) set(x, y, 0);
    }
    for (const r of d.roads) roadCells(r.points, r.width, (x, y) => set(x, y, 1));
    for (const p of props) blockFootprint(p, (x, y) => set(x, y, 0));
    // A solid world boundary must read as a continuous thicket. This is
    // visual dressing inside already blocked cells, never extra collision.
    if (d.border?.kind === 'forest') {
      const k = d.border.width;
      const roadNear = (x: number, y: number) => {
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
          const cx=Math.floor(x)+dx,cy=Math.floor(y)+dy;
          if(cx>=0&&cy>=0&&cx<w&&cy<h&&isRoad[cy*w+cx])return true;
        }
        return false;
      };
      const edges = [
        [k-0.6,k,w-k,k], [k-0.6,h-k+0.1,w-k,h-k+0.1],
        [k-0.6,k,k-0.6,h-k], [w-k+0.1,k,w-k+0.1,h-k],
      ];
      for(const [ax,ay,bx,by] of edges) {
        const length=Math.hypot(bx-ax,by-ay);
        for(let t=0;t<length;t+=1.15) {
          const x=ax+(bx-ax)*t/length,y=ay+(by-ay)*t/length;
          if(roadNear(x,y))continue;
          if(keepClear.some(([cx,cy,cr])=>Math.hypot(cx-x,cy-y)<=cr+3))continue;
          if(walk[Math.floor(y)*w+Math.floor(x)]!==0)continue;
          props.push({kind:'bush',x:x-0.5,y:y-0.5,block:0,scale:1.25+0.25*Math.sin(t)});
          if(t%3.45<1.15 && !props.some(p=>p.kind==='tree'&&Math.hypot(p.x-(x-0.5),p.y-(y-0.5))<2.4))
            props.push({kind:'tree',x:x-0.5,y:y-0.5,block:0,scale:1.65});
        }
      }
    }
  }
  return {
    id: d.id,
    width: w,
    height: h,
    theme: d.theme,
    ground: d.ground,
    ...(d.ground_patches?.length ? { ground_patches: d.ground_patches } : {}),
    roads: d.roads,
    blockers,
    props,
    landmarks: d.landmarks,
    safe_areas: d.safe_areas,
    ...(d.camps?.length ? { camps: d.camps } : {}),
    walk_rle: encodeWalk(walk),
  };
}
