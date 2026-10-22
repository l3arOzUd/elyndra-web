import type { ClientContent } from '../data/content';
import { money } from './currency';
import type { MsgOf } from '../net/protocol';
import type { Hud } from './hud';
import { icon, itemIcon } from './icons';
import { REFINE, craftable, gearTitle, imbueCost, isWorn, nextRarity, refinable, refineCost, reforgeCost } from './gear';
import { JOB_INFO, JOB_SKILLS } from './hud';
import { awakenStatus } from './ranks';

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
        const reward = q ? q.rewards.base_exp + ' EXP · ' + money(q.rewards.currency) + q.rewards.items.map(i => ' · ' + (this.c.items.get(i.item_id)?.name ?? i.item_id) + ' ×' + i.qty).join('') : '';
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
        const it = this.c.items.get(id), card = row(it?.name ?? id, (it?.description ?? '') + ' · ' + money(price) + ' each', itemIcon(it));
        const actions = el('div', 'service-actions');
        for (const qty of [1, 10]) actions.append(button('Buy ' + qty, 'buy', id, qty, this.hud.aurel < price * qty));
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
        const card = row('All materials', n.toLocaleString() + ' common and uncommon materials (' + junk.length + ' kinds) · about ' + money(z) + '. Rare materials and items an active quest needs are kept.', icon('crystal', 'service-art'));
        const actions = el('div', 'service-actions'); actions.append(button('Sell all materials', 'sell_junk')); card.append(actions); s.append(card);
      }
      for (const g of gear) {
        const it = this.c.items.get(g.base); if (!it) continue;
        const price = Math.round(it.sell_price * ({ normal: 1, magic: 1.5, rare: 2.5, relic: 5, unique: 4 }[g.rarity] ?? 1));
        const card = row(it.name, g.rarity[0].toUpperCase() + g.rarity.slice(1) + ' · item level ' + g.ilvl + ' · ' + money(price), itemIcon(it));
        const actions = el('div', 'service-actions'); actions.append(button('Sell', 'sell_gear', String(g.uid), 1)); card.append(actions); s.append(card);
      }
      for (const [id, n] of sellable) {
        const it = this.c.items.get(id)!, card = row(it.name, 'Owned ' + n + ' · ' + money(it.sell_price) + ' each', itemIcon(it));
        const actions = el('div', 'service-actions');
        actions.append(button('Sell 1', 'sell', id, 1), button('Sell all (' + n + ')', 'sell', id, n)); card.append(actions); s.append(card);
      }
    }
    if (m.dest?.length) {
      const s = section('Travel');
      for (const [id, cost] of m.dest) {
        const map = this.c.maps.get(id), card = row(map?.name ?? id, (map ? 'Recommended level ' + map.recommended_level_min + '–' + map.recommended_level_max + ' · ' : '') + (cost ? money(cost) : 'Free passage'), icon('portal', 'service-art'));
        card.append(button('Travel →', 'teleport', id, undefined, this.hud.aurel < cost)); s.append(card);
      }
    }
    if (m.role === 'guild_registrar') {
      // Stash (craft.go): gear kept here is neither worn nor carried.
      const cr = this.c.systems.crafting, gear = [...this.hud.gear.values()];
      const stash = gear.filter((g) => g.slot === 'stash'), bag = gear.filter((g) => !g.slot);
      const s = section('Stash');
      s.append(el('p', 'muted small', 'Stash ' + stash.length + ' / ' + cr.stash_max + ' · Bag ' + gear.filter((g) => g.slot !== 'stash').length + ' / ' + cr.bag_max));
      if (!stash.length && !bag.length) s.append(el('p', 'empty-state', 'No gear to store.'));
      for (const g of stash) {
        const it = this.c.items.get(g.base), card = row(gearTitle(it, g), 'In your stash · ' + g.rarity + ' · item level ' + g.ilvl, itemIcon(it, g.rarity));
        card.append(button('Take', 'stash_take', String(g.uid))); s.append(card);
      }
      for (const g of bag) {
        const it = this.c.items.get(g.base), card = row(gearTitle(it, g), 'In your bag · ' + g.rarity + ' · item level ' + g.ilvl, itemIcon(it, g.rarity));
        card.append(button('Store', 'stash_put', String(g.uid), undefined, stash.length >= cr.stash_max)); s.append(card);
      }
      // Job change: free up to a level, then Aurel a level.
      const j = section('Job');
      const lv = this.hud.stats?.lv ?? 1, job = this.hud.stats?.job ?? 'vanguard';
      const cost = lv <= cr.job_change_free_level ? 0 : cr.job_change_per_level * lv;
      j.append(el('p', 'muted small', (cost ? 'Changing job costs ' + money(cost) + ' at Lv ' + lv : 'Free until Lv ' + cr.job_change_free_level) + '. Weapons of another job come off; Echo Totems forget its skills.'));
      for (const name of Object.keys(JOB_INFO)) {
        const card = row(name[0].toUpperCase() + name.slice(1) + (name === job ? ' (current)' : ''), JOB_INFO[name], icon(name === 'vanguard' ? 'sword' : name === 'strider' ? 'bow' : name === 'arcanist' ? 'staff' : 'gear', 'service-art'));
        card.append(button('Become ' + name, 'change_job', name, undefined, name === job || this.hud.aurel < cost)); j.append(card);
      }
      // Skill Awakening (CHARACTER_SYSTEMS.md §15): start a rank-10 skill's
      // trial here, then awaken it with a Sigil and the fee.
      const a = section('Awakening'), ms = this.c.systems.mastery;
      const sigil = [...this.c.items.values()].find((it) => it.name === 'Awakening Sigil');
      const sigils = sigil ? this.hud.inventory[sigil.id] ?? 0 : 0;
      a.append(el('p', 'muted small', 'A skill at rank 10 can take its Awakened form: start its trial, complete the feat, then bring an Awakening Sigil (bosses drop it) and ' + money(ms.awaken_cost) + '. Sigils in your bag: ' + sigils + '.'));
      for (const skill of JOB_SKILLS[job] ?? []) {
        const s = this.c.skills.get(skill), aw = ms.awaken[skill];
        if (!s || !aw) continue;
        const st = awakenStatus(this.c, this.hud.sheet, skill), rank = this.hud.sheet?.mastery[skill]?.[0] ?? 1;
        const line = st.state === 'awakened' ? 'Awakened: ' + aw.text
          : st.state === 'locked' ? 'Rank ' + rank + ' / ' + ms.max_rank + ' · ' + aw.text
          : 'Trial: ' + aw.feat.text + (st.state === 'trial' || st.state === 'complete' ? ' · ' + st.progress.toLocaleString() + ' / ' + st.need.toLocaleString() : '');
        const card = row(aw.name, line, icon('crystal', 'service-art'));
        if (st.state === 'ready') card.append(button('Start trial', 'trial', skill));
        else if (st.state === 'complete') card.append(button('Awaken', 'awaken', skill, undefined, sigils < 1 || this.hud.aurel < ms.awaken_cost));
        else card.append(button(st.state === 'awakened' ? 'Awakened' : st.state === 'trial' ? 'In trial' : 'Needs rank 10', 'noop', skill, undefined, true));
        a.append(card);
      }
    }
    if (m.role === 'craftsman') {
      // Reforge (reroll affixes) and imbue (raise rarity): craft.go.
      const f = section('Reforge');
      const own = [...this.hud.gear.values()].filter((g) => craftable(this.c.items.get(g.base), g));
      const reforgeable = own.filter((g) => g.rarity !== 'normal'), imbueable = own.filter((g) => nextRarity(g));
      if (!own.length) f.append(el('p', 'empty-state', 'No gear that can be reworked.'));
      for (const g of reforgeable) {
        const it = this.c.items.get(g.base)!, cost = reforgeCost(this.c, it, g);
        const card = row(gearTitle(it, g) + (isWorn(g) ? ' (worn)' : ''), 'Reroll every affix (' + g.rarity + (g.rarity === 'relic' ? ', the cap stays' : '') + ') · ' + money(cost), itemIcon(it, g.rarity));
        card.append(button('Reforge', 'reforge', String(g.uid), undefined, this.hud.aurel < cost)); f.append(card);
      }
      for (const g of imbueable) {
        const it = this.c.items.get(g.base)!, cost = imbueCost(this.c, it, g);
        const card = row(gearTitle(it, g) + (isWorn(g) ? ' (worn)' : ''), 'Imbue ' + g.rarity + ' → ' + nextRarity(g) + ' with fresh affixes · ' + money(cost), itemIcon(it, g.rarity));
        card.append(button('Imbue', 'imbue', String(g.uid), undefined, this.hud.aurel < cost)); f.append(card);
      }
      // Refining: weapons and armour, +1 at a time to +10 (refine.go).
      const s = section('Refine');
      const list = [...this.hud.gear.values()].filter((g) => refinable(this.c.items.get(g.base))).sort((a, b) => Number(!!b.slot) - Number(!!a.slot) || (b.refine ?? 0) - (a.refine ?? 0));
      if (!list.length) s.append(el('p', 'empty-state', 'No weapons or armour to refine.'));
      for (const g of list) {
        const it = this.c.items.get(g.base)!, lvl = g.refine ?? 0, cost = refineCost(it, g);
        const risk = lvl >= REFINE.max ? 'At the +' + REFINE.max + ' maximum' : REFINE.chance[lvl] + '% to reach +' + (lvl + 1) + ' · ' + money(cost) + (lvl >= REFINE.dropFrom ? ' · failure drops to +' + (lvl - 1) : REFINE.chance[lvl] < 100 ? ' · failure keeps +' + lvl : '');
        const card = row(gearTitle(it, g) + (g.slot ? ' (worn)' : ''), '+' + REFINE.stepPct + '% base numbers a level · ' + risk, itemIcon(it, g.rarity));
        card.append(button('Refine', 'refine', String(g.uid), undefined, lvl >= REFINE.max || this.hud.aurel < cost)); s.append(card);
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
        needs.append(el('span', this.hud.aurel >= rc.currency ? 'ingredient' : 'ingredient bad', money(rc.currency))); copy.append(needs);
        const ok = rc.inputs.every(i => (this.hud.inventory[i.item_id] ?? 0) >= i.qty) && this.hud.aurel >= rc.currency;
        card.append(button('Craft item', 'craft', rc.id, undefined, !ok)); s.append(card);
      }
    }
    if (sections.length) activate(sections.some(s => s.name === this.tab) ? this.tab : sections[0].name);
    else { tabs.hidden = true; body.append(el('p', 'empty-state', 'Safe travels, adventurer.')); }
    const footer = el('footer', 'window-footer');
    footer.append(el('span', 'muted', 'Your purse'), icon('coin'), el('strong', 'currency', money(this.hud.aurel)));
    r.append(footer); r.hidden = false;
  }
}
