// Export semantic cells using the same geometry helpers as the content baker.
// Run from elyndra-web: node --import tsx scripts/export-lumeris-guides.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { shapeContains, roadCells } from '../content/layout';
import { lumeris } from '../content/regions/lum';
import { decodeWalk, type MapDef, type MapLayout, type Shape, type WarpDef } from '../src/data/schema';

const root = fileURLToPath(new URL('../..', import.meta.url));
const data = join(root, 'elyndra-web/public/data');
const out = join(root, 'sprite/lumeris_map_guides');
mkdirSync(out, { recursive: true });
const read = (path: string) => JSON.parse(readFileSync(join(data, path), 'utf8'));
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const palette = {
  grass: { color: '#9CCB75', meaning: 'meadow grass' },
  moss: { color: '#678F68', meaning: 'damp moss ground' },
  stone: { color: '#B8BCC0', meaning: 'cream sandstone plaza paving' },
  cave: { color: '#796454', meaning: 'earthy cave floor' },
  forest: { color: '#305E3B', meaning: 'forest floor only, no trees' },
  dirt: { color: '#AD794C', meaning: 'packed dirt road' },
  stone_road: { color: '#DDCFAB', meaning: 'cream cobblestone road' },
  water: { color: '#4EA8D1', meaning: 'flat water surface' },
  rock: { color: '#888477', meaning: 'bare rocky ground beneath rock or cliff geometry' },
  structure: { color: '#778493', meaning: 'flat bare foundation beneath a 3D building, wall or machine; no structure drawn' },
  bridge: { color: '#D4A65B', meaning: 'flat wooden crossing deck, no rails or supports' },
  camp: { color: '#C6B184', meaning: 'trampled camp ground, no tents or props' },
  void: { color: '#211D27', meaning: 'solid uncarved cave area; keep dark and flat' },
};
type Material = keyof typeof palette;
const materials = Object.keys(palette) as Material[];
const ids = Object.fromEntries(materials.map((name, i) => [name, i])) as Record<Material, number>;
const defs: MapDef[] = read('maps.json');
const warps: WarpDef[] = read('warps.json');
const maps = defs.filter(m => m.region_id === 'lum').map((m, index) => {
  const l: MapLayout = read(m.layout);
  const design = lumeris.maps.find(d => d.id === m.id)!;
  const w = l.width, h = l.height, total = w * h;
  if (w !== m.width_cells || h !== m.height_cells) throw new Error(`Size mismatch: ${m.id}`);
  const cells = new Uint8Array(total).fill(ids[design.solid ? 'void' : l.ground as Material]);
  const reconstructedWalk = new Uint8Array(total).fill(design.solid ? 0 : 1);
  const paint = (shape: Shape, action: (i: number) => void) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (shapeContains(shape, x, y)) action(y * w + x);
  };
  // Carve is authoring-only; validate it against the published walk grid below.
  for (const shape of design.carve ?? []) paint(shape, i => { cells[i] = ids.cave; reconstructedWalk[i] = 1; });
  for (const rect of l.safe_areas) {
    if (rect[2] >= w && rect[3] >= h) continue;
    paint({ rect }, i => { if (!design.solid || reconstructedWalk[i]) cells[i] = ids.camp; });
  }
  for (const b of l.blockers) {
    const kind: Material = b.kind === 'forest' ? 'forest' : b.kind === 'water' ? 'water'
      : b.kind === 'cliff' || b.kind === 'rock' ? 'rock' : 'structure';
    paint(b.shape, i => { cells[i] = ids[kind]; reconstructedWalk[i] = 0; });
  }
  const roadMask = new Uint8Array(total);
  for (const r of l.roads) roadCells(r.points, r.width, (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    const kind: Material = r.kind === 'stone' ? 'stone_road' : r.kind === 'bridge' ? 'bridge' : 'dirt';
    cells[i] = ids[kind]; roadMask[i] = 1; reconstructedWalk[i] = 1;
  });
  // Props affect collision only; they are deliberately absent from the ground guide.
  for (const p of l.props) {
    const half = Math.floor(p.block / 2);
    for (let dy = -half; dy < p.block - half; dy++) for (let dx = -half; dx < p.block - half; dx++) {
      const x = Math.round(p.x) + dx, y = Math.round(p.y) + dy;
      if (x >= 0 && y >= 0 && x < w && y < h) reconstructedWalk[y * w + x] = 0;
    }
  }
  const decoded = decodeWalk(l.walk_rle, total);
  const rleCount = l.walk_rle.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
  if (rleCount !== total || decoded.some((v, i) => v !== reconstructedWalk[i])) throw new Error(`Published layout and reconstructed geometry disagree: ${m.id}`);
  const stem = `${String(index + 1).padStart(2, '0')}_${m.name.replaceAll(' ', '_')}`;
  return {
    id: m.id, name: m.name, stem, width: w, height: h, theme: l.theme,
    source: `elyndra-web/public/data/${m.layout}`, source_sha256: hash(join(data, m.layout)),
    cells: Array.from(cells), walk: Array.from(decoded), roads: Array.from(roadMask),
    landmarks: l.landmarks, arrival: m.arrival, props: l.props,
    outgoing_warps: warps.filter(warp => warp.from_map === m.id),
    incoming_landings: warps.filter(warp => warp.to_map === m.id).map(warp => ({ from_map: warp.from_map, point: warp.spawn_point })),
    walkable_cells: decoded.reduce((a, b) => a + b, 0),
  };
});
if (maps.length !== 8) throw new Error(`Expected 8 Lumeris maps, got ${maps.length}`);
writeFileSync(resolve(out, 'layout_snapshot.json'), JSON.stringify({
  pixels_per_cell: 16, coordinates: 'x east/right, y south/down; origin top-left; no rotation or crop',
  palette: materials.map(name => ({ id: ids[name], name, ...palette[name] })),
  sources: { maps: hash(join(data, 'maps.json')), warps: hash(join(data, 'warps.json')), authoring: hash(join(root, 'elyndra-web/content/regions/lum.ts')) },
  maps,
}));
console.log(`Exported ${maps.length} maps; reconstructed collision matches published walk_rle for every cell.`);
