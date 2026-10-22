import type { ClientContent } from '../data/content';
import type { MonsterDef } from '../data/schema';
import type { SpriteDefJson } from '../render/spriteDef';
import { icon } from './icons';

/** Kills that reveal a monster's drops; bosses and elites reveal them at the first. */
export const BOOK_DROPS_AT = 25;

const ARCHETYPE_LABEL: Record<string, string> = {
  swarm: 'Swarm', ranged: 'Ranged', support: 'Support', bruiser: 'Bruiser', construct: 'Construct', elite: 'Elite', boss: 'Boss',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Portraits: the first idle frame of the monster's sprite, a silhouette until recorded. */
const spriteJson = new Map<string, Promise<SpriteDefJson | null>>();
const images = new Map<string, Promise<HTMLImageElement | null>>();
function loadJson(id: string) {
  if (!spriteJson.has(id)) spriteJson.set(id, fetch(`sprites/${id}/${id}.sprite.json`).then(r => r.ok ? r.json() as Promise<SpriteDefJson> : null).catch(() => null));
  return spriteJson.get(id)!;
}
function loadImage(src: string) {
  if (!images.has(src)) images.set(src, new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return images.get(src)!;
}
async function drawPortrait(canvas: HTMLCanvasElement, c: ClientContent, m: MonsterDef, known: boolean) {
  const bind = c.sprites.monsters[m.id] ?? c.sprites.fallback;
  const json = await loadJson(bind.sprite);
  if (!json) return;
  const file = json.kind === 'puppet' ? json.puppet!.front : json.animations.idle.file;
  const img = await loadImage(`sprites/${bind.sprite}/${file}`);
  if (!img) return;
  const fw = json.kind === 'puppet' ? img.width : json.frame.w, fh = json.kind === 'puppet' ? img.height : json.frame.h;
  const ctx = canvas.getContext('2d')!, W = canvas.width, H = canvas.height;
  // Trim to the painted part of the frame so small creatures fill the portrait.
  const scratch = document.createElement('canvas'); scratch.width = fw; scratch.height = fh;
  const sx = scratch.getContext('2d', { willReadFrequently: true })!; sx.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);
  const px = sx.getImageData(0, 0, fw, fh).data;
  let x0 = fw, y0 = fh, x1 = 0, y1 = 0;
  for (let y = 0; y < fh; y += 2) for (let x = 0; x < fw; x += 2) if (px[(y * fw + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 <= x0) return;
  const bw = x1 - x0 + 2, bh = y1 - y0 + 2, k = Math.min((W - 8) / bw, (H - 8) / bh);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(scratch, x0, y0, bw, bh, (W - bw * k) / 2, (H - bh * k) / 2, bw * k, bh * k);
  ctx.globalCompositeOperation = 'source-atop';
  if (!known) { ctx.fillStyle = '#1d140c'; ctx.fillRect(0, 0, W, H); }
  else if (bind.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${bind.tint.map(v => Math.min(255, v * 200)).join(',')})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(scratch, x0, y0, bw, bh, (W - bw * k) / 2, (H - bh * k) / 2, bw * k, bh * k); }
  ctx.globalCompositeOperation = 'source-over';
}

/** The Monster Book window (B): every monster, its habitat and, once recorded, its story. */
export class MonsterBook {
  kills: Record<string, number> = {};
  private where = 'all';
  private search = '';
  private selected: string | null = null;
  /** Maps in road order: the town, then each field followed by its dungeon. */
  private readonly order: string[];

  constructor(private readonly c: ClientContent) {
    const fields = [...c.maps.values()].filter(m => m.type === 'field').sort((a, b) => a.recommended_level_min - b.recommended_level_min);
    const dungeons = [...c.maps.values()].filter(m => m.type === 'dungeon').sort((a, b) => a.recommended_level_min - b.recommended_level_min);
    this.order = [...fields, ...dungeons].sort((a, b) => a.recommended_level_min - b.recommended_level_min || (a.type === 'field' ? -1 : 1)).map(m => m.id);
  }

  setKills(kills: Record<string, number>) {
    this.kills = kills;
    if (!document.getElementById('book-win')!.hidden) this.render();
  }

  private monsters(): MonsterDef[] {
    const home = (m: MonsterDef) => Math.min(...(m.habitat ?? []).map(h => this.order.indexOf(h.map_id)).filter(i => i >= 0), 999);
    return [...this.c.monsters.values()].sort((a, b) => home(a) - home(b) || a.level - b.level || a.name.localeCompare(b.name));
  }

  render() {
    const win = document.getElementById('book-win')!;
    const all = this.monsters();
    const recorded = all.filter(m => (this.kills[m.id] ?? 0) > 0).length;
    win.querySelector('#book-count')!.textContent = `${recorded} / ${all.length} recorded`;

    const where = win.querySelector<HTMLSelectElement>('#book-where')!;
    if (!where.options.length) {
      where.append(new Option('Every map', 'all'));
      for (const id of this.order) { const m = this.c.maps.get(id)!; where.append(new Option(`${m.name} · Lv ${m.recommended_level_min}–${m.recommended_level_max}`, id)); }
      where.onchange = () => { this.where = where.value; this.render(); };
      const search = win.querySelector<HTMLInputElement>('#book-search')!;
      search.oninput = () => { this.search = search.value.trim().toLowerCase(); this.render(); };
    }
    const shown = all.filter(m => (this.where === 'all' || m.habitat?.some(h => h.map_id === this.where)) && (!this.search || m.name.toLowerCase().includes(this.search)));
    if (!this.selected || !shown.some(m => m.id === this.selected)) this.selected = shown[0]?.id ?? null;

    const list = win.querySelector('#book-list')!; list.replaceChildren();
    if (!shown.length) { const empty = el('div', 'journal-empty'); empty.append(icon('book'), el('p', 'muted', 'No monster matches.')); list.append(empty); }
    for (const m of shown) {
      const n = this.kills[m.id] ?? 0;
      const row = el('button', 'book-row' + (n ? '' : ' unknown') + (m.id === this.selected ? ' selected' : ''));
      row.setAttribute('aria-pressed', String(m.id === this.selected));
      const pic = el('canvas', 'book-thumb'); pic.width = pic.height = 44; void drawPortrait(pic, this.c, m, n > 0);
      const text = el('span', 'book-row-text');
      text.append(el('strong', '', m.name), el('small', '', `Lv ${m.level}${m.bounty ? ' · Gorged' : m.archetype === 'boss' ? ' · Boss' : m.archetype === 'elite' ? ' · Elite' : ''}`));
      row.append(pic, text, el('b', 'book-kills', n ? n.toLocaleString() : '–'));
      row.onclick = () => { this.selected = m.id; this.render(); };
      list.append(row);
    }

    const detail = win.querySelector('#book-detail')!; detail.replaceChildren();
    const m = this.selected ? this.c.monsters.get(this.selected) : null;
    if (!m) return;
    const n = this.kills[m.id] ?? 0, known = n > 0, big = m.archetype === 'boss' || m.archetype === 'elite';
    const portrait = el('canvas', 'book-portrait'); portrait.width = portrait.height = 150; void drawPortrait(portrait, this.c, m, known);
    detail.append(portrait);
    const kind = m.bounty ? 'GORGED BOUNTY' : m.archetype === 'boss' ? 'HEART OF THE LATTICE' : (ARCHETYPE_LABEL[m.archetype] ?? m.archetype).toUpperCase();
    detail.append(el('p', 'eyebrow', `${kind} · ${m.element.toUpperCase()}`), el('h3', '', m.name));
    const facts = el('div', 'book-facts');
    const fact = (k: string, v: string) => { const d = el('div'); d.append(el('span', '', k), el('b', '', v)); facts.append(d); };
    fact('Level', String(m.level));
    fact('HP', m.hp.toLocaleString());
    fact('Base EXP', m.base_exp.toLocaleString());
    fact('Defeated', n.toLocaleString());
    detail.append(facts);
    detail.append(el('p', 'book-behaviour ' + (m.behavior === 'passive' ? 'good' : 'bad'), m.behavior === 'passive' ? 'Passive: ignores you until struck, then fights back.' : 'Hostile: attacks on sight.'));
    const homes = (m.habitat ?? []).map(h => `${this.c.maps.get(h.map_id)?.name ?? h.map_id} · ${h.zone}`);
    if (homes.length) { detail.append(el('h4', '', 'Found in')); const ul = el('ul', 'book-habitat'); for (const h of homes) ul.append(el('li', '', h)); detail.append(ul); }
    if (!known) { detail.append(el('p', 'muted book-locked', 'Defeat one to record what the Guild knows of it.')); return; }
    detail.append(el('h4', '', 'Field notes'), el('p', 'book-text', m.ecology));
    if (m.story) detail.append(el('h4', '', 'Story'), el('p', 'book-text book-story', m.story));
    const dropsAt = big ? 1 : BOOK_DROPS_AT;
    detail.append(el('h4', '', 'Drops'));
    if (n < dropsAt) { detail.append(el('p', 'muted small', `Revealed after ${dropsAt} defeated (${n}/${dropsAt}).`)); return; }
    const ul = el('ul', 'book-drops');
    for (const d of m.drops) {
      const it = this.c.items.get(d.item_id);
      const pct = d.rate_bp / 100;
      ul.append(el('li', '', `${it?.name ?? d.item_id} · ${pct >= 1 ? pct.toFixed(pct % 1 ? 1 : 0) : pct.toFixed(2)}%${d.max_qty > 1 ? ` ×${d.min_qty}–${d.max_qty}` : ''}`));
    }
    detail.append(ul);
  }
}
