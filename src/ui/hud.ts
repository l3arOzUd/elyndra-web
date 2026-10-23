import type { ClientContent } from '../data/content';
import { money } from './currency';
import type { BuffView, GearView, MsgOf, QuestView, SheetMsg, TotemView } from '../net/protocol';
import { icon, itemIcon } from './icons';
import { skillIcon, systemIcon } from './art';
import { awakenStatus, rankLines, rankNumbers } from './ranks';
import { drawWayfarerPortrait } from '../render/paperDoll';
import { isWorn as isWornCopy } from './gear';
import { MonsterBook } from './book';
import { CHARM_SLOTS, ECHO_COUNT, gearTitle, RARITY_LABEL, SLOT_LABEL, STAT_IDS, STAT_INFO, affixText, baseLines, gearItem, gearNumbers, kindLabel, requirements } from './gear';

const $ = (id: string) => document.getElementById(id)!;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
export const HOTBAR = ['cleaving_arc', 'iron_cyclone', 'anchor_shout', 'sundering_pulse'] as const;
/** Skills on keys 1-4 for each job: its three skills, then Sundering Pulse. */
export const JOB_SKILLS: Record<string, string[]> = {
  vanguard: [...HOTBAR],
  arcanist: ['prism_field', 'aether_nova', 'gravity_coil', 'sundering_pulse'],
  strider: ['meridian_lance', 'splitshot_array', 'dash_circuit', 'sundering_pulse'],
  machinist: ['coil_mine', 'gearstorm', 'pulse_beacon', 'sundering_pulse'],
};
export const JOB_INFO: Record<string, string> = {
  vanguard: 'Front line: cleaving cones, a spinning blade storm and a taunt.',
  arcanist: 'Caster: a ticking prism field, an aether nova and a coil that pulls the horde in.',
  strider: 'Ranged: a piercing lance, a spread volley and a dash.',
  machinist: 'Engineer: mines, a gear storm and a beacon that strengthens allies.',
};
export const ITEM_KEYS = ['itm_0075', 'itm_0076', 'itm_0077'] as const;
/** Totems worn in the Charm slots fire from keys 8, 9 and 0. */
export const TOTEM_KEYS = ['8', '9', '0'] as const;
const gearKey = (uid: number) => 'g:' + uid;
/** Line art for an empty equipment slot. */
const SLOT_ICON: Record<string, string> = { weapon: 'sword', head: 'shield', armor: 'armor', gloves: 'gloves', boots: 'boots', accessory: 'crystal', charm1: 'star', charm2: 'star', charm3: 'star' };
/** Game windows: opening one closes the others, except Inventory and Equipment, which open side by side. */
const WINDOWS = ['inv-win', 'equip-win', 'journal-win', 'menu-win', 'char-win', 'skill-win', 'book-win'];
const PAIRED = ['inv-win', 'equip-win'];

/** Shared live-game and preview UI. All mutations go through server callbacks. */
export class Hud {
  inventory: Record<string, number> = {};
  equip: Record<string, string> = {};
  /** Every copy of gear, Charm and Totem the character owns, by uid. */
  gear = new Map<number, GearView>();
  aurel = 0;
  stats: MsgOf<'stats'> | null = null;
  sheet: SheetMsg | null = null;
  private totems: TotemView[] = [];
  private buffs: BuffView[] = [];
  private cooldownUntil: Record<string, number> = {};
  private selected: string | null = null;
  /** Bag category tab and the slot selected in the Equipment window. */
  private filter = 'all';
  private equipSel = 'weapon';
  private toastTimer = 0;
  private mapCardTimer = 0;
  /** The Monster Book window (B). */
  readonly book: MonsterBook;
  onUse: (item: string) => void = () => {};
  onEquip: (uid: number, slot?: string) => void = () => {};
  onUnequip: (slot: string) => void = () => {};
  onDiscard: (uid: number) => void = () => {};
  onSkill: (skill: string) => void = () => {};
  onStat: (stat: string, n: number) => void = () => {};
  onResetStats: () => void = () => {};
  onTotem: (slot: string) => void = () => {};
  onLink: (slot: string, skill: string) => void = () => {};
  /** A Totem's effect started (for the effects layer). */
  onTotemFired: (type: string) => void = () => {};
  onLevelUp: (level: number) => void = () => {};
  /** A skill's mastery rank went up (sheet mastery). */
  onSkillRankUp: (skill: string, rank: number) => void = () => {};

  /** The skills on keys 1-4 (JOB_SKILLS of the character's job, or the player's order). */
  hotbar: string[] = [...HOTBAR];
  /** The skill whose rank table is unfolded in the character window. */
  private openRank: string | null = null;
  private job = 'vanguard';
  /** Right-click menu: choose which skill a key holds. */
  private pickSkill(slot: number, at: HTMLElement) {
    document.getElementById('skill-picker')?.remove();
    $('skill-tooltip').hidden = true;
    const menu = el('div', 'skill-picker win'); menu.id = 'skill-picker'; menu.setAttribute('role', 'menu');
    menu.append(el('p', 'eyebrow', 'Key ' + (slot + 1) + ' casts'));
    for (const s of this.c.skills.values()) {
      if (!s.implemented || (s.job !== this.job && s.job !== 'all')) continue;
      const b = el('button', 'subtle', s.name); b.prepend(skillIcon(s.id)); b.setAttribute('role', 'menuitem');
      b.disabled = s.id === this.hotbar[slot];
      b.onclick = () => {
        const next = [...this.hotbar], other = next.indexOf(s.id);
        if (other >= 0) next[other] = next[slot]; // swap when it is already on another key
        next[slot] = s.id;
        try { localStorage.setItem('elyndra.hotbar.' + this.job, JSON.stringify(next)); } catch { /* this session only */ }
        document.querySelectorAll<HTMLButtonElement>('#hotbar .slot:not(.item)').forEach((x) => delete x.dataset.skill);
        this.hotbar = next; this.setSkillSlots(this.job); this.refreshHotbar(); menu.remove();
      };
      menu.append(b);
    }
    const reset = el('button', 'subtle', 'Default order');
    reset.onclick = () => { try { localStorage.removeItem('elyndra.hotbar.' + this.job); } catch { /* ok */ } document.querySelectorAll<HTMLButtonElement>('#hotbar .slot:not(.item)').forEach((x) => delete x.dataset.skill); this.setSkillSlots(this.job); this.refreshHotbar(); menu.remove(); };
    menu.append(reset);
    document.body.append(menu);
    const r = at.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, r.left)) + 'px';
    menu.style.top = Math.max(8, r.top - menu.offsetHeight - 8) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', (ev) => { if (!menu.contains(ev.target as Node)) menu.remove(); }, { once: true }));
  }

  constructor(private readonly c: ClientContent) {
    this.book = new MonsterBook(c);
    const bar = $('hotbar'); bar.replaceChildren();
    HOTBAR.forEach((_, i) => {
      const b = el('button', 'slot');
      b.append(el('span', 'key', String(i + 1)), skillIcon(HOTBAR[i]), el('span', 'name'), el('span', 'sp'), el('span', 'cd'));
      this.bindTooltip(b, () => c.skills.get(b.dataset.skill!)?.name ?? '', () => this.skillText(b.dataset.skill!) + ' · right-click to change');
      b.onclick = () => this.onSkill(b.dataset.skill!);
      b.oncontextmenu = (ev) => { ev.preventDefault(); this.pickSkill(i, b); };
      bar.append(b);
    });
    this.setSkillSlots('vanguard');
    ITEM_KEYS.forEach((id, i) => {
      const it = c.items.get(id), b = el('button', 'slot item'); b.dataset.item = id;
      b.append(el('span', 'key', String(i + 5)), itemIcon(it), el('span', 'name', it?.name ?? id), el('span', 'qty'));
      b.title = (it?.name ?? id) + ': ' + (it?.description ?? ''); b.setAttribute('aria-label', it?.name ?? id);
      this.bindTooltip(b, it?.name ?? id, it?.description ?? '');
      b.onclick = () => this.onUse(id); bar.append(b);
    });
    CHARM_SLOTS.forEach((slot, i) => {
      const b = el('button', 'slot item totem'); b.dataset.totem = slot;
      b.append(el('span', 'key', TOTEM_KEYS[i]), systemIcon('fury'), el('span', 'name', 'Totem'), el('span', 'qty'), el('span', 'cd'));
      b.setAttribute('aria-label', 'Totem in ' + SLOT_LABEL[slot]);
      b.onclick = () => {
        // An Echo Totem has nothing to press: open it to see or change its link.
        const t = this.totems.find((x) => x.slot === slot);
        if (t?.trigger) { this.equipSel = slot; this.toggle('equip-win', true); }
        else this.onTotem(slot);
      };
      bar.append(b);
    });
    $('toggle-inv').onclick = () => this.toggle('inv-win');
    $('toggle-equip').onclick = $('open-equip').onclick = () => this.toggle('equip-win');
    $('toggle-char').onclick = () => this.toggle('char-win');
    $('toggle-skills').onclick = () => this.toggle('skill-win');
    $('toggle-book').onclick = () => this.toggle('book-win');
    $('reset-stats').onclick = () => this.onResetStats();
    $('clear-target').onclick = () => this.setTarget(null);
    $('toggle-journal').onclick = $('open-journal').onclick = () => this.toggle('journal-win');
    $('toggle-menu').onclick = () => this.toggle('menu-win');
    $('toggle-inspector').onclick = () => { this.closeWindows(); this.toggle('inspector'); };
    $('item-search').oninput = () => this.renderInventory();
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b => b.onclick = () => { this.filter = b.dataset.filter!; this.renderInventory(); });
    const compact = (value: boolean) => {
      document.querySelector('.log-win')!.classList.toggle('collapsed', value);
      ($('compact-log') as HTMLInputElement).checked = value;
      $('toggle-log').textContent = value ? '+' : '−';
      $('toggle-log').setAttribute('aria-label', value ? 'Expand adventure log' : 'Collapse adventure log');
    };
    $('toggle-log').onclick = () => compact(!($('compact-log') as HTMLInputElement).checked);
    $('compact-log').onchange = () => compact(($('compact-log') as HTMLInputElement).checked);
    $('fullscreen').onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();
        $('menu-feedback').textContent = '';
      } catch { $('menu-feedback').textContent = 'Fullscreen is unavailable in this browser.'; }
    };
    this.renderInventory(); this.setQuests([]); this.refreshHotbar();
  }

  /** Skill tooltip: SP, cast and cooldown as they stand (rank, Cast Speed, Cooldown Recovery). */
  private skillText(id: string): string {
    const s = this.c.skills.get(id); if (!s) return '';
    const rank = this.sheet?.mastery[id]?.[0] ?? 1, d = this.sheet?.d, n = rankNumbers(this.c, id, rank);
    const awake = this.sheet?.awakened?.includes(id) ? this.c.systems.mastery.awaken[id] : undefined;
    const up5 = rank >= 5 ? this.c.systems.mastery.rank5[id] : undefined;
    const cost = s.resource_cost * (1 - n.spCut / 100);
    const cdr = (d?.cdr ?? 0) * (s.cooldown_ms >= (this.c.systems.rules.ultimate_cooldown_ms ?? 30000) ? 0.5 : 1);
    const cd = s.cooldown_ms * (1 - cdr) * (1 - n.cdCut / 100) / 1000, cast = s.cast_ms * (1 - (d?.cast ?? 0)) * (1 - (up5?.cast_cut ?? 0) / 100) / 1000;
    return (awake ? awake.name : 'Rank ' + rank) + (n.damage && s.damage_multiplier ? ' (+' + n.damage + '% damage)' : '') + ' · ' + Math.round(cost) + ' SP · cast ' + cast.toFixed(2) + 's · cooldown ' + cd.toFixed(1) + 's · ' + s.damage_multiplier + 'x ATK · every target in the area' + (up5 ? ' · ' + up5.text : '') + (awake ? ' · ' + awake.text : '');
  }
  /** One line per number of a copy, for hover tooltips. */
  gearSummary(g: GearView): string {
    const it = this.c.items.get(g.base);
    if (!it?.equip) return '';
    const parts = [RARITY_LABEL[g.rarity] + ' ' + kindLabel(it) + ' · item level ' + g.ilvl + (g.slot === 'stash' ? ' · in stash' : isWornCopy(g) ? ' · worn' : '')];
    parts.push(...baseLines(this.c, it, g));
    for (const [aid, , v] of g.affixes) parts.push(affixText(this.c, aid, v));
    return parts.join(' · ');
  }
  /**
   * Puts a job's skills on keys 1-4: the player's own order for that job
   * (right-click a skill slot to change it, saved in this browser), or
   * JOB_SKILLS.
   */
  setSkillSlots(job: string) {
    this.job = job;
    let saved: string[] = [];
    try { saved = JSON.parse(localStorage.getItem('elyndra.hotbar.' + job) ?? '[]'); } catch { /* defaults */ }
    const valid = (id: string) => { const s = this.c.skills.get(id); return !!s && s.implemented && (s.job === job || s.job === 'all'); };
    this.hotbar = saved.length === 4 && saved.every(valid) ? saved : JOB_SKILLS[job] ?? [...HOTBAR];
    document.querySelectorAll<HTMLButtonElement>('#hotbar .slot:not(.item)').forEach((b, i) => {
      const id = this.hotbar[i], s = this.c.skills.get(id);
      if (!id || b.dataset.skill === id) return;
      b.dataset.skill = id;
      b.querySelector('.painted-icon')?.replaceWith(skillIcon(id));
      b.querySelector('.name')!.textContent = s?.name ?? id;
      // SP cost in the corner, like the item counts on keys 5-7.
      b.querySelector('.sp')!.textContent = s ? String(s.resource_cost) : '';
      b.title = s ? s.name + ' · ' + s.resource_cost + ' SP · ' + s.cooldown_ms / 1000 + 's' : id;
      b.setAttribute('aria-label', b.title);
    });
  }
  private bindTooltip(button: HTMLButtonElement, title: string | (() => string), copy: string | (() => string)) {
    const tip = $('skill-tooltip');
    const show = () => {
      tip.replaceChildren(el('strong', '', typeof title === 'function' ? title() : title), el('p', '', typeof copy === 'function' ? copy() : copy)); tip.hidden = false;
      const rect = button.getBoundingClientRect();
      tip.style.left = Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, rect.left + rect.width / 2 - tip.offsetWidth / 2)) + 'px';
      tip.style.top = Math.max(8, rect.top - tip.offsetHeight - 12) + 'px';
      button.setAttribute('aria-describedby', 'skill-tooltip');
    };
    const hide = () => { tip.hidden = true; button.removeAttribute('aria-describedby'); };
    button.addEventListener('pointerenter', show); button.addEventListener('focus', show);
    button.addEventListener('pointerleave', hide); button.addEventListener('blur', hide); button.addEventListener('click', hide);
  }
  setTarget(target: { name: string; level: number; hp: number; mhp: number } | null) {
    $('target-win').hidden = !target; if (!target) return;
    $('target-name').textContent = target.name; $('target-level').textContent = 'Lv ' + target.level;
    $('target-health').textContent = target.hp.toLocaleString() + ' / ' + target.mhp.toLocaleString();
    $('target-fill').style.width = Math.max(0, Math.min(100, target.hp / target.mhp * 100)) + '%';
  }
  closeWindows() { $('skill-tooltip').hidden = true; for (const id of [...WINDOWS, 'inspector']) $(id).hidden = true; }
  toggle(id: string, force?: boolean) {
    const w = $(id), open = force ?? w.hidden;
    if (open && WINDOWS.includes(id)) {
      $('skill-tooltip').hidden = true; $('inspector').hidden = true;
      for (const other of WINDOWS) if (other !== id && !(PAIRED.includes(id) && PAIRED.includes(other))) $(other).hidden = true;
    }
    w.hidden = !open;
    if (open && id === 'equip-win') this.renderEquipment();
    if (open && (id === 'char-win' || id === 'skill-win')) this.renderCharacter();
    if (open && id === 'book-win') this.book.render();
  }
  /** The card shown on entering a map: its name, level band and what the place is now. */
  showMapCard(name: string, sub: string, intro: string) {
    const card = $('map-card');
    $('map-card-name').textContent = name; $('map-card-sub').textContent = sub; $('map-card-intro').textContent = intro;
    card.hidden = false; card.classList.remove('leaving'); void card.offsetWidth; card.classList.add('showing');
    clearTimeout(this.mapCardTimer);
    this.mapCardTimer = window.setTimeout(() => { card.classList.add('leaving'); this.mapCardTimer = window.setTimeout(() => { card.hidden = true; card.classList.remove('showing', 'leaving'); }, 700); }, 6000);
  }
  setMap(name: string, sub: string) { $('map-name').textContent = name; $('map-region').textContent = sub; $('map-heading').textContent = sub.split('·')[0].trim().toUpperCase(); }
  setStats(s: MsgOf<'stats'>) {
    const prev = this.stats; this.stats = s;
    $('lv').textContent = String(s.lv); $('job').textContent = s.job.toUpperCase();
    if (prev?.job !== s.job) this.setSkillSlots(s.job);
    for (const [key, v, max] of [['hp', s.hp, s.mhp], ['sp', s.sp, s.msp]] as const) {
      $(key + '-text').textContent = v + ' / ' + max;
      $(key + '-fill').style.width = (max ? Math.max(0, Math.min(100, v / max * 100)) : 0) + '%';
    }
    // Aether Shield rides on the HP bar: its own fill and a value after HP.
    const msh = s.msh ?? 0, sh = s.sh ?? 0;
    $('shield-fill').style.width = (msh && s.mhp ? Math.min(100, sh / s.mhp * 100) : 0) + '%';
    if (msh) $('hp-text').textContent += ' · ◈ ' + sh;
    const before = new Map(this.totems.map((t) => [t.slot, t.left]));
    this.totems = s.tot ?? [];
    this.buffs = s.buffs ?? [];
    for (const t of this.totems) if (t.left && !before.get(t.slot)) { const g = this.worn(t.slot); const type = g && this.c.items.get(g.base)?.equip?.totem?.type; if (type) this.onTotemFired(type); }
    if (prev && s.lv > prev.lv) {
      this.onLevelUp(s.lv);
      // Skills this level opens for the job: named in the banner, their hotbar slots glow.
      const fresh = [...this.c.skills.values()].filter((k) => (k.job === this.job || k.job === 'all') && k.unlock_level > prev.lv && k.unlock_level <= s.lv);
      this.celebrate('level', 'LEVEL UP', 'Lv ' + s.lv + (fresh.length ? ' · New skill: ' + fresh.map((k) => k.name).join(', ') : '') + (this.sheet ? ' · +' + (s.lv - prev.lv) * 3 + ' stat points' : ''));
      for (const k of fresh) this.glowSlot(k.id);
    }
    this.renderBuffs();
    $('hp-fill').classList.toggle('low', s.hp / s.mhp < .3);
    $('exp-text').textContent = s.next ? (s.exp / s.next * 100).toFixed(1) + '%' : 'MAX';
    $('exp-fill').style.width = (s.next ? Math.min(100, s.exp / s.next * 100) : 100) + '%';
    $('atk').textContent = String(s.atk); $('def').textContent = String(s.def);
    if (prev?.lv !== s.lv || prev?.job !== s.job) this.renderEquipment();
    else if (!this.sheet && !$('equip-win').hidden) this.renderEquipStats();
    this.refreshHotbar();
    if (prev?.lv !== s.lv || prev?.job !== s.job) this.renderDetail();
  }
  /** ms: the cooldown the server applied (after Cooldown Recovery). */
  startCooldown(skill: string, ms?: number) { const s = this.c.skills.get(skill); if (s) this.cooldownUntil[skill] = performance.now() + (ms ?? s.cooldown_ms); }
  /** The SP bar blinks when a skill was refused for lack of SP. */
  flashSp() { const bar = $('sp-fill').parentElement!; bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash'); }
  canCast(skill: string) { return (this.cooldownUntil[skill] ?? 0) <= performance.now(); }
  refreshHotbar() {
    const lv = this.stats?.lv ?? 1, now = performance.now();
    for (const b of document.querySelectorAll<HTMLButtonElement>('#hotbar .slot')) {
      if (b.dataset.skill) {
        const s = this.c.skills.get(b.dataset.skill), locked = !!s && lv < s.unlock_level;
        const left = (this.cooldownUntil[b.dataset.skill] ?? 0) - now;
        const nosp = !!s && !!this.stats && this.stats.sp < s.resource_cost;
        b.classList.toggle('locked', locked); b.classList.toggle('cooling', left > 0); b.classList.toggle('nosp', nosp);
        b.querySelector('.cd')!.textContent = locked ? 'Lv ' + s!.unlock_level : left > 0 ? (left / 1000).toFixed(1) : '';
        b.disabled = false; // a refused click says why, over the player (game.cast)
      } else if (b.dataset.item) {
        const qty = this.inventory[b.dataset.item] ?? 0;
        b.querySelector('.qty')!.textContent = String(qty); b.classList.toggle('locked', !qty); b.disabled = !qty;
      } else if (b.dataset.totem) {
        const t = this.totems.find((x) => x.slot === b.dataset.totem);
        const worn = [...this.gear.values()].find((g) => g.slot === b.dataset.totem), it = worn && this.c.items.get(worn.base);
        const art = b.querySelector('.painted-icon')!, want = it?.equip?.totem?.type ?? 'fury';
        if ((art as HTMLElement).dataset.totemArt !== want) { const n = systemIcon(want); n.dataset.totemArt = want; art.replaceWith(n); }
        if (t?.trigger) {
          const linked = t.link ? this.c.skills.get(t.link)?.name : undefined;
          b.classList.remove('cooling', 'active'); b.classList.toggle('locked', !t.link); b.classList.add('echo');
          b.querySelector('.qty')!.textContent = t.ch + '/' + t.need;
          b.style.setProperty('--fill', Math.min(100, t.ch / t.need * 100) + '%');
          b.querySelector('.cd')!.textContent = t.link ? '' : 'Link';
          b.title = (it?.name ?? 'Echo Totem') + ' · ' + (linked ? 'casts ' + linked + ' every ' + t.need + ' ' + ECHO_COUNT[t.trigger] : 'no skill linked: click to link one');
          b.disabled = false; continue;
        }
        const ready = !!t && t.ch >= t.need && !t.left;
        b.classList.toggle('locked', !t); b.classList.toggle('cooling', !!t && !ready); b.classList.toggle('active', !!t?.left);
        b.querySelector('.qty')!.textContent = t ? (t.left ? '' : t.ch + '/' + t.need) : '';
        b.style.setProperty('--fill', t ? Math.min(100, t.ch / t.need * 100) + '%' : '0%');
        b.querySelector('.cd')!.textContent = t?.left ? (t.left / 1000).toFixed(1) : '';
        b.title = it ? it.name + (ready ? ' · ready' : t ? ' · ' + t.ch + '/' + t.need + ' kills' : '') : 'No Totem in ' + SLOT_LABEL[b.dataset.totem];
        b.disabled = !ready;
      }
    }
  }
  setInventory(m: MsgOf<'inv'>) {
    if (m.full) { this.inventory = {}; this.gear.clear(); }
    for (const [id, q] of Object.entries(m.items)) { if (q > 0) this.inventory[id] = q; else delete this.inventory[id]; }
    for (const g of m.gear ?? []) this.gear.set(g.uid, g);
    for (const uid of m.gear_gone ?? []) this.gear.delete(uid);
    this.aurel = m.aurel; if (m.equip) this.equip = m.equip;
    this.renderInventory(); this.refreshHotbar(); this.renderBuffs();
    this.book.setInventory(this.inventory);
  }
  /** The worn copy in a slot. */
  worn(slot: string) { return [...this.gear.values()].find((g) => g.slot === slot); }
  setSheet(m: SheetMsg) {
    const old = this.sheet?.mastery;
    this.sheet = m; this.renderCharacter(); this.renderInventory();
    if (!old) return;
    for (const [skill, [rank]] of Object.entries(m.mastery)) {
      if (rank <= (old[skill]?.[0] ?? rank)) continue;
      const name = this.c.skills.get(skill)?.name ?? 'Basic attack', max = this.c.systems.mastery.max_rank;
      const perk = rank >= max ? this.c.systems.mastery.perks[skill] : '';
      this.celebrate('skill', 'SKILL UP', name + ' · Rank ' + rank + (rank >= max ? ' (max)' : '') + (perk ? ' · ' + perk : ''));
      this.glowSlot(skill);
      this.onSkillRankUp(skill, rank);
    }
  }
  /** A big banner in the upper middle of the screen (level up, skill rank up). */
  celebrate(kind: 'level' | 'skill', title: string, sub: string) {
    let box = document.getElementById('celebrations');
    if (!box) { box = el('div'); box.id = 'celebrations'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const b = el('div', 'celebration ' + kind);
    b.append(el('div', 'celebration-rays'), el('strong', 'celebration-title', title), el('span', 'celebration-sub', sub));
    box.append(b);
    while (box.children.length > 3) box.firstElementChild!.remove();
    setTimeout(() => b.remove(), kind === 'level' ? 4200 : 3400);
  }
  /** Makes a skill's hotbar slot shine for a few seconds. */
  glowSlot(skill: string) {
    document.querySelectorAll<HTMLElement>('#hotbar .slot').forEach((b) => {
      if (b.dataset.skill !== skill) return;
      b.classList.remove('fresh'); void b.offsetWidth; b.classList.add('fresh');
      setTimeout(() => b.classList.remove('fresh'), 5000);
    });
  }
  /** Double-click in the bag: use a consumable, wear a copy (a Charm goes to the first free open Charm slot). */
  private quickAction(id: string) {
    if (!id.startsWith('g:')) { if (this.c.items.get(id)?.use) this.onUse(id); return; }
    const g = this.gear.get(Number(id.slice(2))), it = g && gearItem(this.c, g);
    if (!g || g.slot || !it?.equip || !requirements(it, this.stats?.lv ?? 1, this.stats?.job, this.sheet).every(([, ok]) => ok)) return;
    if (it.equip.slot !== 'charm') { this.onEquip(g.uid); return; }
    const lv = this.stats?.lv ?? 1;
    const free = CHARM_SLOTS.find((s, i) => lv >= (this.c.systems.charm_slot_levels[i] ?? 99) && !this.worn(s));
    if (free) this.onEquip(g.uid, free);
  }
  renderInventory() {
    $('aurel').textContent = money(this.aurel);
    this.renderEquipment();
    const search = ($('item-search') as HTMLInputElement).value.trim().toLowerCase();
    const nameOf = (key: string) => key.startsWith('g:') ? this.c.items.get(this.gear.get(Number(key.slice(2)))?.base ?? '')?.name ?? key : this.c.items.get(key)?.name ?? key;
    const itemOf = (key: string) => this.c.items.get(key.startsWith('g:') ? this.gear.get(Number(key.slice(2)))?.base ?? '' : key);
    const inCategory = (id: string, f: string) => { const cat = itemOf(id)?.category; return f === 'all' || cat === f || f === 'material' && cat === 'rare_material' || f === 'charm' && cat === 'totem'; };
    const all = [...[...this.gear.values()].filter(g => !g.slot).map(g => gearKey(g.uid)), ...Object.keys(this.inventory)].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => {
      const on = b.dataset.filter === this.filter;
      b.classList.toggle('active', on); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(on));
      b.querySelector('small')!.textContent = String(all.filter((id) => inCategory(id, b.dataset.filter!)).length);
    });
    const ids = all.filter(id => (!search || nameOf(id).toLowerCase().includes(search)) && inCategory(id, this.filter));
    if (!this.selected || !ids.includes(this.selected)) this.selected = ids[0] ?? null;
    const list = $('inventory'); list.replaceChildren();
    for (const id of ids) {
      const g = id.startsWith('g:') ? this.gear.get(Number(id.slice(2))) : undefined;
      const it = itemOf(id), li = el('li'), b = el('button', 'item-cell rarity-' + (g ? g.rarity : it?.rarity ?? 'common') + (id === this.selected ? ' selected' : ''));
      b.title = nameOf(id) + (g ? ' · ' + RARITY_LABEL[g.rarity] : ''); b.setAttribute('aria-label', g ? nameOf(id) + ', ' + RARITY_LABEL[g.rarity] + ', item level ' + g.ilvl : (it?.name ?? id) + ', quantity ' + this.inventory[id]); b.setAttribute('aria-pressed', String(id === this.selected)); b.dataset.item = id;
      b.append(itemIcon(it, g?.rarity, g?.refine), el('span', 'item-quantity', g ? (g.refine ? '+' + g.refine + ' ' : '') + (g.rarity === 'normal' ? '' : RARITY_LABEL[g.rarity][0]) : String(this.inventory[id])));
      // Selecting only restyles the cells, so a double-click lands on the same button.
      b.onclick = () => {
        this.selected = id;
        list.querySelectorAll<HTMLElement>('.item-cell').forEach((x) => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        this.renderDetail();
      };
      b.ondblclick = () => this.quickAction(id);
      this.bindTooltip(b, () => (g ? gearTitle(it, g) : it?.name ?? id), () => (g ? this.gearSummary(g) : it?.description ?? ''));
      li.append(b); list.append(li);
    }
    // Empty sockets complete the grid, so the satchel reads as a bag of slots (a search shows only matches).
    if (ids.length || !search) for (let i = ids.length; i < Math.max(25, Math.ceil(ids.length / 5) * 5); i++) list.append(el('li', 'empty-slot'));
    $('inv-empty').hidden = ids.length > 0;
    $('inv-empty').textContent = all.length ? 'No items match your search.' : 'Your inventory is empty.';
    const carriedGear = [...this.gear.values()].filter((g) => g.slot !== 'stash').length, bagMax = this.c.systems.crafting?.bag_max ?? 300;
    const full = carriedGear >= bagMax - 20;
    $('bag-count').textContent = all.length + ' in your satchel · gear ' + carriedGear + ' / ' + bagMax + (full ? ' · nearly full: store some at the Guild' : '');
    $('bag-count').classList.toggle('bad', full);
    $('bag-fill').style.width = Math.min(100, carriedGear / bagMax * 100) + '%';
    $('bag-fill').classList.toggle('full', full);
    this.renderDetail();
  }
  /** The Equipment window: paper doll, the selected slot's detail and the totals. */
  private renderEquipment() {
    const lv = this.stats?.lv ?? 1, inactive = new Set(this.sheet?.inactive ?? []);
    const slotButton = (slot: string) => {
      const g = this.worn(slot), it = g && gearItem(this.c, g), ci = CHARM_SLOTS.indexOf(slot as typeof CHARM_SLOTS[number]);
      const open = ci >= 0 ? this.c.systems.charm_slot_levels[ci] ?? 0 : 0, locked = lv < open, off = !!g && inactive.has(g.uid);
      const b = el('button', 'doll-slot' + (g ? ' filled rarity-' + g.rarity : '') + (locked ? ' locked' : '') + (off ? ' inactive' : '') + (slot === this.equipSel ? ' selected' : ''));
      b.dataset.slot = slot; b.setAttribute('aria-pressed', String(slot === this.equipSel));
      const socket = el('span', 'doll-socket');
      socket.append(it ? itemIcon(it, g!.rarity, g!.refine) : icon(SLOT_ICON[slot] ?? 'crystal', 'empty-equip'));
      if (g?.refine) socket.append(el('span', 'item-quantity', '+' + g.refine));
      if (ci >= 0 && it?.equip?.totem) socket.append(el('span', 'slot-key', TOTEM_KEYS[ci]));
      const text = el('span', 'doll-text');
      text.append(el('small', 'eyebrow', SLOT_LABEL[slot]), el('strong', '', it ? gearTitle(it, g!) : locked ? 'Opens at Lv ' + open : 'Empty'));
      if (off) text.append(el('small', 'bad', '✗ No effect'));
      b.append(socket, text);
      b.onclick = () => {
        this.equipSel = slot;
        document.querySelectorAll<HTMLElement>('#equip-win .doll-slot').forEach((x) => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        this.renderEquipDetail();
      };
      b.ondblclick = () => { if (g) this.onUnequip(slot); };
      if (g && it) this.bindTooltip(b, () => gearTitle(it, g), () => this.gearSummary(g));
      return b;
    };
    // Three rows each side: head / weapon / gloves on the left, accessory / body / boots on the right.
    $('doll-left').replaceChildren(...['head', 'weapon', 'gloves'].map(slotButton));
    $('doll-right').replaceChildren(...['accessory', 'armor', 'boots'].map(slotButton));
    $('doll-charms').replaceChildren(...CHARM_SLOTS.map(slotButton));
    $('equipment-job').textContent = this.stats ? this.stats.job[0].toUpperCase() + this.stats.job.slice(1) + ' · Lv ' + lv : '';
    const outfit = [...this.gear.values()].filter(isWornCopy).map((g) => g.base + (g.slot === 'weapon' && g.refine ? '+' + g.refine : '')).sort();
    const canvas = $('doll-canvas') as HTMLCanvasElement;
    if (canvas.dataset.outfit !== outfit.join('+')) {
      const drawn = drawWayfarerPortrait(canvas, outfit);
      if (drawn) canvas.dataset.outfit = outfit.join('+');
      $('equip-win').classList.toggle('no-portrait', !drawn);
    }
    this.renderEquipDetail(); this.renderEquipStats();
  }
  private renderEquipDetail() {
    const d = $('equip-detail'); d.replaceChildren();
    const slot = this.equipSel, g = this.worn(slot);
    if (g) { this.renderGearDetail(d, g); return; }
    const ci = CHARM_SLOTS.indexOf(slot as typeof CHARM_SLOTS[number]), open = ci >= 0 ? this.c.systems.charm_slot_levels[ci] ?? 0 : 0;
    const art = el('span', 'detail-socket'); art.append(icon(SLOT_ICON[slot] ?? 'crystal'));
    this.detailHead(d, art, 'Empty slot', SLOT_LABEL[slot], '', ci >= 0 ? 'Holds a Charm or a Totem · Totems fire from key ' + TOTEM_KEYS[ci] : undefined);
    if ((this.stats?.lv ?? 1) < open) { d.append(el('p', 'item-description', 'This slot opens at Lv ' + open + '.')); return; }
    const kind = ci >= 0 ? 'charm' : slot;
    const fits = [...this.gear.values()].filter((x) => !x.slot && gearItem(this.c, x)?.equip?.slot === kind).sort((a, b) => b.ilvl - a.ilvl);
    const s = this.section(d, fits.length ? 'In your satchel · ' + fits.length : 'In your satchel');
    if (!fits.length) { s.append(el('p', 'muted small', 'Nothing you carry fits this slot yet.')); return; }
    for (const x of fits.slice(0, 6)) {
      const it = gearItem(this.c, x)!, met = requirements(it, this.stats?.lv ?? 1, this.stats?.job, this.sheet).every(([, ok]) => ok);
      const b = el('button', 'candidate rarity-' + x.rarity), text = el('span');
      text.append(el('strong', 'rarity-text-' + x.rarity, gearTitle(it, x)), el('small', met ? 'muted' : 'bad', met ? RARITY_LABEL[x.rarity] + ' · item level ' + x.ilvl : '✗ Requirements not met'));
      b.append(itemIcon(it, x.rarity, x.refine), text, el('span', 'candidate-action', 'Equip'));
      b.disabled = !met; b.onclick = () => this.onEquip(x.uid, ci >= 0 ? slot : undefined);
      s.append(b);
    }
    if (fits.length > 6) s.append(el('p', 'muted small', '+' + (fits.length - 6) + ' more in the Inventory'));
  }
  /** Totals under the paper doll: the character sheet's numbers, or the status values before it arrives. */
  private renderEquipStats() {
    const d = this.sheet?.d, s = this.stats, pct = (v: number) => Math.round(v * 1000) / 10 + '%';
    const groups: [string, [string, string][]][] = d ? [
      ['Offense', [['Attack', String(d.atk)], ['Weapon ATK', String(d.weapon)], ['Critical', pct(d.crit) + ' · ' + pct(d.crit_mult)], ['Attack every', (d.attack_ms / 1000).toFixed(2) + 's']]],
      ['Defense', [['Max HP', String(d.max_hp)], ['Armour', String(d.armour)], ['Evasion', String(d.evasion)], ['Aether Shield', String(d.max_shield)]]],
      ['Resistances', [['Fire', pct(d.res_fire)], ['Cold', pct(d.res_cold)], ['Nature', pct(d.res_nature)], ['Shadow', pct(d.res_shadow)]]],
    ] : [['Totals', [['Attack', String(s?.atk ?? '–')], ['Armour', String(s?.def ?? '–')], ['Max HP', String(s?.mhp ?? '–')], ['Aether Shield', String(s?.msh ?? 0)]]]];
    $('equipment-stats').replaceChildren(...groups.map(([title, rows]) => {
      const g = el('section', 'equip-stat-group'); g.append(el('h4', 'eyebrow', title));
      for (const [k, v] of rows) { const r = el('div', 'derived-row'); r.append(el('span', '', k), el('b', '', v)); g.append(r); }
      return g;
    }));
  }
  private detailHead(d: HTMLElement, art: HTMLElement, eyebrow: string, title: string, titleCls = '', sub?: string) {
    const head = el('div', 'detail-head'), text = el('div', 'detail-title');
    text.append(el('p', 'eyebrow', eyebrow), el('h3', titleCls, title));
    if (sub) text.append(el('small', 'muted', sub));
    head.append(art, text); d.append(head);
  }
  private section(d: HTMLElement, title: string) { const s = el('section', 'detail-sec'); s.append(el('h4', '', title)); d.append(s); return s; }
  /** Detail panel for one copy of gear, a Charm or a Totem. */
  private renderGearDetail(d: HTMLElement, g: GearView) {
    const it = gearItem(this.c, g);
    if (!it?.equip) { d.append(el('p', 'muted', g.base)); return; }
    const e = it.equip;
    this.detailHead(d, itemIcon(it, g.rarity, g.refine), RARITY_LABEL[g.rarity] + ' · item level ' + g.ilvl, gearTitle(it, g), 'rarity-text-' + g.rarity,
      kindLabel(it) + (g.slot === 'stash' ? ' · in stash' : isWornCopy(g) ? ' · worn' : ''));
    if (e.unique || it.category === 'totem' || it.description) d.append(el('p', 'item-description', it.description));
    const lines = baseLines(this.c, it, g);
    if (lines.length) { const s = this.section(d, 'Properties'); for (const line of lines) s.append(el('p', 'item-stat', line)); }
    if (g.affixes.length) {
      const list = el('ul', 'affix-list');
      for (const [id, tier, v] of g.affixes) {
        const li = el('li', id.startsWith('cap_') ? 'affix relic' : 'affix', affixText(this.c, id, v));
        li.append(el('small', 'affix-tier', ' T' + tier)); list.append(li);
      }
      this.section(d, 'Modifiers').append(list);
    }
    const reqs = requirements(it, this.stats?.lv ?? 1, this.stats?.job, this.sheet);
    const chips = el('div', 'req-chips');
    for (const [text, ok] of reqs) chips.append(el('span', 'req ' + (ok ? 'good' : 'bad'), (ok ? '✓ ' : '✗ ') + text));
    this.section(d, 'Requires').append(chips);
    const slot = e.slot === 'charm' ? undefined : e.slot;
    const wearing = slot ? this.worn(slot) : undefined;
    if (slot && !g.slot) {
      const s = this.section(d, wearing ? 'Compared with ' + (gearItem(this.c, wearing)?.name ?? '') : 'Compared with');
      if (!wearing) s.append(el('p', 'good small', 'Nothing worn in this slot'));
      else {
        const mine = gearNumbers(it, g), theirs = gearNumbers(gearItem(this.c, wearing), wearing);
        let rows = 0;
        for (const key of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
          const delta = (mine[key] ?? 0) - (theirs[key] ?? 0); if (!delta) continue;
          const row = el('div', 'compare-row'); row.append(el('span', '', key), el('b', delta > 0 ? 'good' : 'bad', (delta > 0 ? '▲ +' : '▼ ') + Math.round(delta))); s.append(row); rows++;
        }
        if (!rows) s.append(el('p', 'muted small', 'Same base numbers'));
      }
    }
    if (this.sheet?.inactive?.includes(g.uid)) d.append(el('p', 'bad small', 'Worn, but its requirements are not met: it has no effect.'));
    const echo = e.totem && this.c.systems.totem_types.find((x) => x.id === e.totem!.type)?.trigger;
    if (echo) {
      const box = el('div', 'echo-link'), linked = g.link ? this.c.skills.get(g.link) : undefined;
      box.append(el('p', 'eyebrow', 'Linked skill'), el('p', linked ? 'item-stat' : 'bad small', linked ? linked.name : 'None: it casts nothing until you link a skill'));
      if (!g.slot) box.append(el('p', 'muted small', 'Wear it in a Charm slot to link a skill. Changing the link starts the count over.'));
      else {
        const lv = this.stats?.lv ?? 1, job = this.stats?.job;
        const choices = [...this.c.skills.values()].filter((s) => s.implemented && (s.job === job || s.job === 'all') && (s.damage_multiplier > 0 || s.shape === 'taunt'));
        const row = el('div', 'detail-actions');
        for (const s of choices) {
          const b = el('button', s.id === g.link ? 'primary detail-action' : 'subtle detail-action', s.name);
          b.disabled = lv < s.unlock_level || s.id === g.link; if (lv < s.unlock_level) b.title = 'Unlocks at Lv ' + s.unlock_level;
          b.onclick = () => this.onLink(g.slot!, s.id); row.append(b);
        }
        box.append(row);
      }
      d.append(box);
    }
    const actions = el('div', 'detail-actions');
    const met = reqs.every(([, ok]) => ok);
    if (g.slot === 'stash') {
      actions.append(el('p', 'muted small', 'In your stash: take it out at a Guild Registrar.'));
    } else if (g.slot) {
      const b = el('button', 'primary detail-action', 'Unequip'); b.onclick = () => this.onUnequip(g.slot!); actions.append(b);
    } else if (e.slot === 'charm') {
      const lv = this.stats?.lv ?? 1;
      CHARM_SLOTS.forEach((s, i) => {
        const open = lv >= (this.c.systems.charm_slot_levels[i] ?? 99);
        const b = el('button', 'primary detail-action', 'Wear in ' + SLOT_LABEL[s]); b.disabled = !open || !met;
        b.title = !open ? 'Opens at Lv ' + this.c.systems.charm_slot_levels[i] : !met ? 'Requirements not met' : '';
        b.onclick = () => this.onEquip(g.uid, s); actions.append(b);
      });
    } else {
      const b = el('button', 'primary detail-action', 'Equip'); b.disabled = !met; if (!met) b.title = 'Requirements not met';
      b.onclick = () => this.onEquip(g.uid); actions.append(b);
    }
    if (!g.slot) {
      const x = el('button', 'subtle detail-action', 'Discard');
      x.onclick = () => { if (x.dataset.confirm) this.onDiscard(g.uid); else { x.dataset.confirm = '1'; x.textContent = 'Discard: click again'; } };
      actions.append(x);
    }
    const foot = el('div', 'detail-foot');
    foot.append(el('p', 'sell-value', 'Sells for about ' + money(Math.round(it.sell_price * ({ normal: 1, magic: 1.5, rare: 2.5, relic: 5, unique: 4 }[g.rarity] ?? 1)))), actions);
    d.append(foot);
  }
  private renderDetail() {
    const d = $('item-detail'); d.replaceChildren();
    if (this.selected?.startsWith('g:')) {
      const g = this.gear.get(Number(this.selected.slice(2)));
      if (g) { this.renderGearDetail(d, g); return; }
    }
    const id = this.selected, it = id ? this.c.items.get(id) : undefined;
    if (!it || !id) { d.append(icon('bag', 'detail-emblem'), el('h3', '', 'Item details'), el('p', 'muted', 'Select an item to inspect its stats and available actions.')); return; }
    this.detailHead(d, itemIcon(it), it.rarity + ' · ' + it.category.replace('_', ' '), it.name, '', 'Owned ×' + this.inventory[id]);
    d.append(el('p', 'item-description', it.description));
    if (it.use) {
      const s = this.section(d, 'Effect');
      if (it.use.reset_stats) s.append(el('p', 'item-stat', 'Returns all stat points (free up to Lv ' + (this.c.systems.rules.free_reset_level ?? 20) + ')'));
      if (it.use.heal_hp_pct) s.append(el('p', 'item-stat', 'Restores ' + it.use.heal_hp_pct + '% HP'));
      if (it.use.heal_sp_pct) s.append(el('p', 'item-stat', 'Restores ' + it.use.heal_sp_pct + '% SP'));
      s.append(el('p', 'muted small', 'Cooldown ' + (it.use.cooldown_ms ?? 0) / 1000 + 's'));
    }
    if (it.equip) {
      const wearing = this.c.items.get(this.equip[it.equip.slot]);
      const s = this.section(d, 'Properties');
      s.append(el('p', 'item-stat', 'Level ' + it.equip.min_level + ' · ' + (it.equip.job ?? 'All classes')));
      for (const [key, label] of [['attack', 'Attack'], ['armour', 'Armour'], ['evasion', 'Evasion'], ['shield', 'Shield']] as const) {
        const value = it.equip[key] ?? 0, old = wearing?.equip?.[key] ?? 0;
        if (!value && !old) continue;
        const row = el('div', 'compare-row'); row.append(el('span', '', label), el('b', '', '+' + value));
        if (wearing?.id !== id) { const delta = value - old; row.append(el('span', delta > 0 ? 'good' : delta < 0 ? 'bad' : 'muted', (delta > 0 ? '+' : '') + delta)); }
        s.append(row);
      }
      if (wearing && wearing.id !== id) s.append(el('p', 'muted small', 'Compared with ' + wearing.name));
    }
    const foot = el('div', 'detail-foot');
    foot.append(el('p', 'sell-value', 'Sell value ' + money(it.sell_price) + ' each'));
    const equipped = Object.values(this.equip).includes(id);
    if (it.use || it.equip) {
      const b = el('button', 'primary detail-action', it.use ? 'Use item' : equipped ? 'Unequip' : 'Equip item');
      const level = this.stats?.lv ?? 1;
      const wrongJob = !!it.equip?.job && !!this.stats && it.equip.job !== this.stats.job;
      b.disabled = !equipped && !!it.equip && (level < it.equip.min_level || wrongJob);
      if (b.disabled) b.title = wrongJob ? 'Requires ' + it.equip!.job : 'Requires level ' + it.equip!.min_level;
      b.onclick = () => it.use ? this.onUse(id) : equipped && it.equip ? this.onUnequip(it.equip.slot) : undefined; foot.append(b);
      if (b.disabled) foot.append(el('p', 'bad small', b.title));
    }
    d.append(foot);
  }
  /** The character window: stat points, derived numbers and skill ranks. */
  /** Every rank of a skill (CHARACTER_SYSTEMS.md §15): reached ones lit, the next one marked, then its Awakening. */
  private rankTable(skill: string, rank: number, awake: ReturnType<typeof awakenStatus>): HTMLElement {
    const t = el('ol', 'rank-table');
    for (const line of rankLines(this.c, skill)) {
      const li = el('li', 'rank-line' + (line.rank <= rank ? ' reached' : '') + (line.rank === rank + 1 ? ' next' : '') + (line.special ? ' special' : ''));
      li.append(el('b', '', 'R' + line.rank), el('span', '', line.text));
      t.append(li);
    }
    const aw = this.c.systems.mastery.awaken[skill];
    if (aw) {
      const li = el('li', 'rank-line awaken' + (awake.state === 'awakened' ? ' reached' : ''));
      const status = awake.state === 'awakened' ? 'Awakened'
        : awake.state === 'complete' ? 'Trial complete · awaken at a Guild Registrar (Awakening Sigil + ' + this.c.systems.mastery.awaken_cost.toLocaleString() + ' A)'
        : awake.state === 'trial' ? 'Trial ' + awake.progress.toLocaleString() + ' / ' + awake.need.toLocaleString()
        : awake.state === 'ready' ? 'Rank 10: start the trial at a Guild Registrar'
        : 'Needs rank 10, a trial, an Awakening Sigil and ' + this.c.systems.mastery.awaken_cost.toLocaleString() + ' A';
      const body = el('span');
      body.append(el('strong', '', aw.name), el('span', '', ' · ' + aw.text), el('small', 'muted', 'Trial: ' + aw.feat.text), el('small', awake.state === 'awakened' || awake.state === 'complete' ? 'good' : 'muted', status));
      li.append(el('b', '', '★'), body);
      t.append(li);
    }
    return t;
  }

  renderCharacter() {
    const m = this.sheet; if (!m) return;
    $('stat-points').textContent = String(m.points);
    $('reset-stats').textContent = m.free_reset ? 'Reset points (free)' : 'Reset points (Reset Scroll)';
    ($('reset-stats') as HTMLButtonElement).disabled = !Object.values(m.stats).some(v => v > 0);
    const list = $('stat-list'); list.replaceChildren();
    for (const id of STAT_IDS) {
      const row = el('div', 'stat-alloc'), info = STAT_INFO[id], name = el('div', 'stat-name');
      name.append(el('strong', '', info.name), el('small', 'muted', info.text));
      const value = el('b', 'stat-value', String(m.stats[id] ?? 0));
      if (m.bonus[id]) value.append(el('small', 'good', ' +' + m.bonus[id]));
      row.append(systemIcon(id), name, value);
      for (const n of [1, 5]) {
        const b = el('button', 'subtle stat-add', '+' + n); b.disabled = m.points < 1;
        b.setAttribute('aria-label', 'Add ' + Math.min(n, m.points) + ' to ' + info.name);
        b.onclick = () => this.onStat(id, n); row.append(b);
      }
      list.append(row);
    }
    const d = m.d, pct = (v: number) => Math.round(v * 1000) / 10 + '%';
    const capped = (v: number, cap: number) => pct(v) + ' / ' + pct(cap);
    const groups: [string, [string, string][]][] = [
      ['Offense', [['ATK', String(d.atk)], ['Weapon ATK', String(d.weapon)], ['Increased damage', pct(d.inc_damage)], ['Critical chance', capped(d.crit, d.cap_crit)],
        ['Critical damage', pct(d.crit_mult)], ['Cooldown Recovery', capped(d.cdr, d.cap_cdr)], ['Cast Speed', capped(d.cast, d.cap_cast)],
        ['Basic attack every', (d.attack_ms / 1000).toFixed(2) + 's'], ['Area of Effect', '+' + pct(d.area) + (d.area_more !== 1 ? ' · x' + d.area_more : '')]]],
      ['Defense', [['Max HP', String(d.max_hp)], ['Aether Shield', String(d.max_shield)], ['Armour', String(d.armour)], ['Evasion', String(d.evasion) + ' (cap ' + pct(d.cap_evasion) + ')'],
        ['Poise', capped(d.poise, d.cap_poise)], ['Fire / Cold', pct(d.res_fire) + ' / ' + pct(d.res_cold)], ['Nature / Shadow', pct(d.res_nature) + ' / ' + pct(d.res_shadow)]]],
      ['Recovery', [['Leech', pct(d.leech) + ' of damage'], ['Leech rate cap', pct(d.leech_cap) + ' HP/s'], ['On kill', pct(d.hp_on_kill) + ' HP · ' + d.sp_on_kill + ' SP'],
        ['HP regeneration', '+' + pct(d.hp_regen) + '/s'], ['SP regeneration', '+' + pct(d.sp_regen_inc)]]],
      ['Utility', [['Movement speed', '+' + pct(d.move)], ['Loot radius', '+' + d.magnet], ['Aggro radius', '+' + pct(d.grip)], ['Skill duration', '+' + pct(d.duration)], ['EXP bonus', '+' + pct(d.exp_bonus)]]],
    ];
    const derived = $('derived-list'); derived.replaceChildren();
    for (const [title, rows] of groups) {
      const g = el('section', 'derived-group'); g.append(el('h4', 'eyebrow', title));
      for (const [k, v] of rows) { const r = el('div', 'derived-row'); r.append(el('span', '', k), el('b', '', v)); g.append(r); }
      derived.append(g);
    }
    const ranks = $('rank-list'); ranks.replaceChildren();
    for (const [skill, [rank, kills, next]] of Object.entries(m.mastery).sort(([a], [b]) => (a === 'basic' ? -1 : b === 'basic' ? 1 : a.localeCompare(b)))) {
      const s = this.c.skills.get(skill), row = el('div', 'rank-row'), bar = el('div', 'objective-progress'), fill = el('span');
      const ms = this.c.systems.mastery, prev = (skill === 'basic' ? ms.basic_per_rank : s?.rank_points ?? 0) * (rank - 1) * (rank - 1);
      fill.style.width = (next ? Math.min(100, (kills - prev) / Math.max(1, next - prev) * 100) : 100) + '%'; bar.append(fill);
      const awake = awakenStatus(this.c, m, skill), open = this.openRank === skill;
      const head = el('button', 'rank-head'); head.setAttribute('aria-expanded', String(open)); head.title = 'Show what every rank gives';
      head.append(skillIcon(skill), el('strong', '', s?.name ?? 'Basic attack'), el('b', awake.state === 'awakened' ? 'awakened' : '', awake.state === 'awakened' ? 'Awakened' : 'Rank ' + rank), el('span', 'rank-toggle', open ? '▾' : '▸'));
      head.onclick = () => { this.openRank = open ? null : skill; this.renderCharacter(); };
      const per = skill === 'basic' ? '1 point per hit' : '1 point per target · max ' + ms.use_cap + ' per use';
      row.append(head, bar, el('small', 'muted', (next ? kills.toLocaleString() + ' / ' + next.toLocaleString() + ' points' : kills.toLocaleString() + ' points · max rank') + ' · ' + per));
      if (open) row.append(this.rankTable(skill, rank, awake));
      ranks.append(row);
    }
  }
  /** Active Totem effects and Echo counters under the status panel. */
  renderBuffs() {
    const bar = $('buff-bar'); bar.replaceChildren();
    for (const t of this.totems) {
      const g = this.worn(t.slot), it = g && this.c.items.get(g.base), type = it?.equip?.totem?.type;
      if (!type || (!t.left && !t.trigger)) continue;
      const b = el('div', 'buff' + (t.trigger ? ' echo' : '')); b.append(systemIcon(type));
      b.append(el('small', '', t.trigger ? Math.floor(t.ch / t.need * 100) + '%' : Math.ceil(t.left / 1000) + 's'));
      b.title = (it?.name ?? '') + (t.trigger ? ' · ' + t.ch + '/' + t.need + (t.link ? ' → ' + (this.c.skills.get(t.link)?.name ?? t.link) : ' · no skill linked') : ' · ' + (t.left / 1000).toFixed(1) + 's left');
      bar.append(b);
    }
    // Ailments an elite or boss put on you.
    const AIL: Record<string, [string, string]> = { burn: ['wildfire', 'Burning: fire damage every second'], shock: ['surge', 'Shocked: 10% more damage taken'], chill: ['haste', 'Chilled: 20% slower attacks, casts and movement'] };
    for (const a of this.stats?.ail ?? []) {
      const b = el('div', 'buff ailment ' + a.kind); b.append(systemIcon(AIL[a.kind][0]), el('small', '', Math.ceil(a.left / 1000) + 's'));
      b.title = AIL[a.kind][1] + ' · ' + (a.left / 1000).toFixed(1) + 's'; bar.append(b);
    }
    // Consumable buffs (World v3): Haste Draught, Scholar's Tea, Fortune Incense.
    for (const f of this.buffs) {
      const it = this.c.items.get(f.item), b = el('div', 'buff consumable');
      b.append(itemIcon(it), el('small', '', f.left >= 60000 ? Math.ceil(f.left / 60000) + 'm' : Math.ceil(f.left / 1000) + 's'));
      b.title = (it?.name ?? f.item) + ' · +' + f.pct + '% ' + ({ move: 'move speed', exp: 'EXP', drop: 'material drops' }[f.kind]) + ' · ' + Math.ceil(f.left / 1000) + 's left';
      bar.append(b);
    }
  }
  setQuests(qs: QuestView[]) {
    const tracker = $('quest-list'), journal = $('journal-list'); tracker.replaceChildren(); journal.replaceChildren();
    const active = qs.filter(q => q.state === 'active' || q.state === 'ready');
    if (!active.length) {
      tracker.append(el('p', 'muted', 'A new chapter awaits at the Guild.'));
      const empty = el('div', 'journal-empty'); empty.append(icon('book'), el('h3', '', 'No active quests'), el('p', 'muted', 'Speak to a Guild Registrar to accept a quest.')); journal.append(empty);
    }
    for (const q of active) {
      const def = this.c.quests.get(q.id);
      const card = (full: boolean) => {
        const d = el('article', 'quest ' + q.state + (full ? ' journal-card' : ''));
        if (full) d.append(el('p', 'eyebrow', q.state === 'ready' ? 'READY TO TURN IN' : 'IN PROGRESS'));
        d.append(el('h3', 'quest-title', q.title));
        if (full) d.append(el('p', 'muted', q.summary));
        def?.objectives.forEach((o, i) => {
          const label = o.type === 'kill' ? 'Defeat ' + (this.c.monsters.get(o.monster_id)?.name ?? o.monster_id) : o.type === 'collect' ? 'Collect ' + (this.c.items.get(o.item_id)?.name ?? o.item_id) : 'Visit ' + (this.c.maps.get(o.map_id)?.name ?? o.map_id);
          const goal = el('div', 'quest-goal'); goal.append(el('span', '', label), el('b', '', (q.progress[i] ?? 0) + '/' + (q.goals[i] ?? 1))); d.append(goal);
          if (full) { const bar = el('div', 'objective-progress'), fill = el('span'); fill.style.width = Math.min(100, (q.progress[i] ?? 0) / (q.goals[i] || 1) * 100) + '%'; bar.append(fill); d.append(bar); }
        });
        if (q.state === 'ready') d.append(el('p', 'good small', 'Report to ' + (this.c.npcs.get(q.turn_in)?.name ?? q.turn_in)));
        if (full && def) d.append(el('div', 'quest-rewards', 'REWARDS · ' + def.rewards.base_exp.toLocaleString() + ' EXP · ' + money(def.rewards.currency) + def.rewards.items.map(i => ' · ' + (this.c.items.get(i.item_id)?.name ?? i.item_id) + ' ×' + i.qty).join('')));
        return d;
      };
      if (tracker.childElementCount < 3) tracker.append(card(false));
      journal.append(card(true));
    }
    if (active.length > 3) tracker.append(el('p', 'small muted', '+' + (active.length - 3) + ' more in your journal'));
  }
  log(text: string, kind: 'info' | 'good' | 'bad' = 'info') {
    const box = $('log'); box.append(el('div', 'log-' + kind, text));
    while (box.childElementCount > 60) box.firstElementChild!.remove(); box.scrollTop = box.scrollHeight;
    if (kind !== 'info') {
      const toast = $('ui-toast'); toast.textContent = text; toast.hidden = false;
      clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => toast.hidden = true, kind === 'bad' ? 5000 : 3000);
    }
  }
}
