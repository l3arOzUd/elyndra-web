import type { ClientContent } from '../data/content';
import type { MsgOf } from '../net/protocol';
import type { Hud } from './hud';
import { icon, itemIcon } from './icons';
import { REFINE, gearTitle, refinable, refineCost } from './gear';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); e.className = cls; if (text !== undefined) e.textContent = text; return e;
}

/** NPC services use the same server operations as the inventory and live world. */
export class NpcDialog {
  private root = document.getElementById('npc-win')!;
  private tab = '';
  current: string | null = null;
  onOp: (npc: string, op: string, arg?: string, qty?: number) => void = () => {};
  constructor(private readonly c: ClientContent, private readonly hud: Hud) {}
  close() { this.root.hidden = true; this.current = null; }
  show(m: MsgOf<'npc'>) {
    if (this.current !== m.npc) this.tab = '';
    this.current = m.npc;
    const r = this.root; r.replaceChildren();
    const head = el('header', 'window-heading'), title = el('div');
    title.append(el('p', 'eyebrow', m.role.replaceAll('_', ' ')), el('h2', '', m.name));
    const x = el('button', 'close', '×'); x.setAttribute('aria-label', 'Close NPC services'); x.onclick = () => this.close();
    head.append(title, x); r.append(head);
    const greeting = el('div', 'npc-greeting');
    greeting.append(icon(m.role === 'craftsman' ? 'hammer' : m.role === 'merchant' ? 'bag' : m.role === 'healer' ? 'potion' : 'crystal', 'npc-seal'));
    const speech = el('div'); for (const line of m.lines) speech.append(el('p', 'npc-line', line)); greeting.append(speech); r.append(greeting);
    const tabs = el('nav', 'window-tabs service-tabs'); tabs.setAttribute('aria-label', 'Services');
    const body = el('div', 'service-body'); r.append(tabs, body);
    const sections: { name: string; button: HTMLButtonElement; body: HTMLElement }[] = [];
    const activate = (name: string) => {
      this.tab = name;
      sections.forEach(s => { s.body.hidden = s.name !== name; s.button.classList.toggle('active', s.name === name); s.button.setAttribute('aria-pressed', String(s.name === name)); });
    };
    const section = (name: string) => {
      const b = el('button', '', name), s = el('section', 'npc-section');
      b.onclick = () => activate(name); tabs.append(b); body.append(s); sections.push({ name, button: b, body: s }); return s;
    };
    const op = (action: string, arg?: string, qty?: number) => () => this.onOp(m.npc, action, arg, qty);
    const button = (label: string, action: string, arg?: string, qty?: number, disabled = false) => {
      const b = el('button', 'service-action', label); b.onclick = op(action, arg, qty); b.disabled = disabled; return b;
    };
    const row = (name: string, description: string, art: HTMLElement) => {
      const card = el('article', 'service-card'), copy = el('div', 'service-copy');
      copy.append(el('h3', '', name), el('p', 'muted', description)); card.append(art, copy); return card;
    };
    if (m.offer?.length || m.ready?.length) {
      const s = section('Quests');
      for (const id of m.ready ?? []) {
        const q = this.c.quests.get(id);
        const reward = q ? q.rewards.base_exp + ' EXP · ' + q.rewards.currency + ' z' + q.rewards.items.map(i => ' · ' + (this.c.items.get(i.item_id)?.name ?? i.item_id) + ' ×' + i.qty).join('') : '';
        const card = row(q?.title ?? id, 'Your work is done. Rewards: ' + reward, icon('star', 'service-art'));
        card.append(button('Claim reward', 'turnin', id)); s.append(card);
      }
      for (const q of m.offer ?? []) {
        const card = row(q.title, q.summary, icon('scroll', 'service-art'));
        card.append(button('Accept quest', 'accept', q.id)); s.append(card);
      }
    }
    if (m.role === 'healer') {
      const s = section('Restoration'), card = row('A little care for the road', 'Restore your health and spirit before your next adventure.', icon('potion', 'service-art'));
      card.append(button('Restore HP & SP', 'heal')); s.append(card);
    }
    if (m.shop?.length) {
      const s = section('Buy');
      for (const [id, price] of m.shop) {
        const it = this.c.items.get(id), card = row(it?.name ?? id, (it?.description ?? '') + ' · ' + price.toLocaleString() + ' z each', itemIcon(it));
        const actions = el('div', 'service-actions');
        for (const qty of [1, 10]) actions.append(button('Buy ' + qty, 'buy', id, qty, this.hud.zeny < price * qty));
        card.append(actions); s.append(card);
      }
    }
    if (m.role === 'merchant') {
      const s = section('Sell');
      const sellable = Object.entries(this.hud.inventory).filter(([id]) => { const it = this.c.items.get(id); return it && it.category !== 'quest' && it.sell_price > 0 && !Object.values(this.hud.equip).includes(id); });
      const gear = [...this.hud.gear.values()].filter(g => !g.slot);
      if (!sellable.length && !gear.length) s.append(el('p', 'empty-state', 'No unequipped items to sell.'));
      // World v3: one click sells all common/uncommon monster materials (rares and active quest items stay).
      const junk = sellable.filter(([id]) => this.c.items.get(id)!.category === 'material');
      if (junk.length) {
        const n = junk.reduce((a, [, q]) => a + q, 0), z = junk.reduce((a, [id, q]) => a + q * this.c.items.get(id)!.sell_price, 0);
        const card = row('All materials', n.toLocaleString() + ' common and uncommon materials (' + junk.length + ' kinds) · about ' + z.toLocaleString() + ' z. Rare materials and items an active quest needs are kept.', icon('crystal', 'service-art'));
        const actions = el('div', 'service-actions'); actions.append(button('Sell all materials', 'sell_junk')); card.append(actions); s.append(card);
      }
      for (const g of gear) {
        const it = this.c.items.get(g.base); if (!it) continue;
        const price = Math.round(it.sell_price * ({ normal: 1, magic: 1.5, rare: 2.5, relic: 5, unique: 4 }[g.rarity] ?? 1));
        const card = row(it.name, g.rarity[0].toUpperCase() + g.rarity.slice(1) + ' · item level ' + g.ilvl + ' · ' + price.toLocaleString() + ' z', itemIcon(it));
        const actions = el('div', 'service-actions'); actions.append(button('Sell', 'sell_gear', String(g.uid), 1)); card.append(actions); s.append(card);
      }
      for (const [id, n] of sellable) {
        const it = this.c.items.get(id)!, card = row(it.name, 'Owned ' + n + ' · ' + it.sell_price.toLocaleString() + ' z each', itemIcon(it));
        const actions = el('div', 'service-actions');
        actions.append(button('Sell 1', 'sell', id, 1), button('Sell all (' + n + ')', 'sell', id, n)); card.append(actions); s.append(card);
      }
    }
    if (m.dest?.length) {
      const s = section('Travel');
      for (const [id, cost] of m.dest) {
        const map = this.c.maps.get(id), card = row(map?.name ?? id, (map ? 'Recommended level ' + map.recommended_level_min + '–' + map.recommended_level_max + ' · ' : '') + (cost ? cost.toLocaleString() + ' z' : 'Free passage'), icon('portal', 'service-art'));
        card.append(button('Travel →', 'teleport', id, undefined, this.hud.zeny < cost)); s.append(card);
      }
    }
    if (m.role === 'craftsman') {
      // Refining: weapons and armour, +1 at a time to +10 (refine.go).
      const s = section('Refine');
      const list = [...this.hud.gear.values()].filter((g) => refinable(this.c.items.get(g.base))).sort((a, b) => Number(!!b.slot) - Number(!!a.slot) || (b.refine ?? 0) - (a.refine ?? 0));
      if (!list.length) s.append(el('p', 'empty-state', 'No weapons or armour to refine.'));
      for (const g of list) {
        const it = this.c.items.get(g.base)!, lvl = g.refine ?? 0, cost = refineCost(it, g);
        const risk = lvl >= REFINE.max ? 'At the +' + REFINE.max + ' maximum' : REFINE.chance[lvl] + '% to reach +' + (lvl + 1) + ' · ' + cost.toLocaleString() + ' z' + (lvl >= REFINE.dropFrom ? ' · failure drops to +' + (lvl - 1) : REFINE.chance[lvl] < 100 ? ' · failure keeps +' + lvl : '');
        const card = row(gearTitle(it, g) + (g.slot ? ' (worn)' : ''), '+' + REFINE.stepPct + '% base numbers a level · ' + risk, itemIcon(it, g.rarity));
        card.append(button('Refine', 'refine', String(g.uid), undefined, lvl >= REFINE.max || this.hud.zeny < cost)); s.append(card);
      }
    }
    if (m.recipes?.length) {
      const s = section('Craft');
      for (const rc of m.recipes) {
        const it = this.c.items.get(rc.output.item_id), card = row((it?.name ?? rc.output.item_id) + (rc.output.qty > 1 ? ' ×' + rc.output.qty : ''), it?.description ?? '', itemIcon(it));
        const copy = card.querySelector('.service-copy')!, needs = el('div', 'recipe-needs');
        for (const i of rc.inputs) {
          const have = this.hud.inventory[i.item_id] ?? 0;
          needs.append(el('span', have >= i.qty ? 'ingredient good' : 'ingredient bad', (this.c.items.get(i.item_id)?.name ?? i.item_id) + ' ' + have + '/' + i.qty));
        }
        needs.append(el('span', this.hud.zeny >= rc.currency ? 'ingredient' : 'ingredient bad', rc.currency.toLocaleString() + ' z')); copy.append(needs);
        const ok = rc.inputs.every(i => (this.hud.inventory[i.item_id] ?? 0) >= i.qty) && this.hud.zeny >= rc.currency;
        card.append(button('Craft item', 'craft', rc.id, undefined, !ok)); s.append(card);
      }
    }
    if (sections.length) activate(sections.some(s => s.name === this.tab) ? this.tab : sections[0].name);
    else { tabs.hidden = true; body.append(el('p', 'empty-state', 'Safe travels, adventurer.')); }
    const footer = el('footer', 'window-footer');
    footer.append(el('span', 'muted', 'Your purse'), icon('coin'), el('strong', 'currency', this.hud.zeny.toLocaleString() + ' z'));
    r.append(footer); r.hidden = false;
  }
}
