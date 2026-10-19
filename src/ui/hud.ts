import type { ClientContent } from "../data/content";
import type { MsgOf, QuestView } from "../net/protocol";

const $ = (id: string) => document.getElementById(id)!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export const HOTBAR = ["cleaving_arc", "iron_cyclone", "anchor_shout", "sundering_pulse"] as const;
export const ITEM_KEYS = ["itm_0075", "itm_0076", "itm_0077"] as const;

/** Status, hotbar, quest tracker, inventory, log. DOM only; text via textContent. */
export class Hud {
  inventory: Record<string, number> = {};
  equip: Record<string, string> = {};
  zeny = 0;
  stats: MsgOf<"stats"> | null = null;
  private cooldownUntil: Record<string, number> = {};
  onUse: (item: string) => void = () => {};
  onEquip: (item: string) => void = () => {};
  onUnequip: (slot: string) => void = () => {};
  onSkill: (skill: string) => void = () => {};

  constructor(private readonly c: ClientContent) {
    const bar = $("hotbar");
    HOTBAR.forEach((id, i) => {
      const s = c.skills.get(id);
      const b = el("button", "slot");
      b.dataset.skill = id;
      b.append(el("span", "key", String(i + 1)), el("span", "name", s?.name ?? id), el("span", "cd"));
      b.title = s ? `${s.name}: ${s.shape}, up to ${s.max_targets} targets, ${s.resource_cost} SP, ${s.cooldown_ms / 1000}s` : id;
      b.onclick = () => this.onSkill(id);
      bar.append(b);
    });
    ITEM_KEYS.forEach((id, i) => {
      const b = el("button", "slot item");
      b.dataset.item = id;
      b.append(el("span", "key", String(i + 5)), el("span", "name", c.items.get(id)?.name ?? id), el("span", "qty"));
      b.onclick = () => this.onUse(id);
      bar.append(b);
    });
    $("toggle-inv").onclick = () => this.toggle("inv-win");
  }

  toggle(id: string, force?: boolean) {
    const w = $(id);
    w.hidden = force !== undefined ? !force : !w.hidden;
  }

  setMap(name: string, sub: string) {
    $("map-name").textContent = name;
    $("map-region").textContent = sub;
  }

  setStats(s: MsgOf<"stats">) {
    const prevLevel = this.stats?.lv;
    this.stats = s;
    $("lv").textContent = String(s.lv);
    $("job").textContent = s.job.toUpperCase();
    $("hp-text").textContent = `${s.hp} / ${s.mhp}`;
    $("hp-fill").style.width = `${(s.hp / s.mhp) * 100}%`;
    $("hp-fill").classList.toggle("low", s.hp / s.mhp < 0.3);
    $("sp-text").textContent = `${s.sp} / ${s.msp}`;
    $("sp-fill").style.width = `${(s.sp / s.msp) * 100}%`;
    $("exp-text").textContent = s.next ? `${((s.exp / s.next) * 100).toFixed(1)}%` : "MAX";
    $("exp-fill").style.width = s.next ? `${(s.exp / s.next) * 100}%` : "100%";
    $("atk").textContent = String(s.atk);
    $("def").textContent = String(s.def);
    if (prevLevel !== s.lv) this.refreshHotbar();
  }

  /** The server confirmed a cast: start that slot's cooldown display. */
  startCooldown(skill: string) {
    const s = this.c.skills.get(skill);
    if (s) this.cooldownUntil[skill] = performance.now() + s.cooldown_ms;
  }

  canCast(skill: string): boolean {
    return (this.cooldownUntil[skill] ?? 0) <= performance.now();
  }

  refreshHotbar() {
    const lv = this.stats?.lv ?? 1;
    const now = performance.now();
    for (const b of document.querySelectorAll<HTMLButtonElement>("#hotbar .slot")) {
      if (b.dataset.skill) {
        const s = this.c.skills.get(b.dataset.skill);
        const locked = !!s && lv < s.unlock_level;
        b.classList.toggle("locked", locked);
        const left = (this.cooldownUntil[b.dataset.skill] ?? 0) - now;
        const cd = b.querySelector(".cd")!;
        cd.textContent = locked ? `Lv${s!.unlock_level}` : left > 0 ? (left / 1000).toFixed(1) : "";
        b.classList.toggle("cooling", left > 0);
        b.classList.toggle("nosp", !!s && !!this.stats && this.stats.sp < s.resource_cost);
      } else if (b.dataset.item) {
        b.querySelector(".qty")!.textContent = `×${this.inventory[b.dataset.item] ?? 0}`;
        b.classList.toggle("locked", !this.inventory[b.dataset.item]);
      }
    }
  }

  setInventory(m: MsgOf<"inv">) {
    if (m.full) this.inventory = {};
    for (const [id, q] of Object.entries(m.items)) {
      if (q > 0) this.inventory[id] = q;
      else delete this.inventory[id];
    }
    this.zeny = m.zeny;
    if (m.equip) this.equip = m.equip;
    this.renderInventory();
    this.refreshHotbar();
  }

  renderInventory() {
    $("zeny").textContent = `${this.zeny.toLocaleString()} z`;
    const eq = $("equip");
    eq.replaceChildren();
    for (const slot of ["weapon", "armor", "boots"]) {
      const id = this.equip[slot];
      const row = el("div", "eq-row");
      row.append(el("span", "muted", slot), el("span", "", id ? this.c.items.get(id)?.name ?? id : "—"));
      if (id) { const b = el("button", "", "Remove"); b.onclick = () => this.onUnequip(slot); row.append(b); }
      eq.append(row);
    }
    const list = $("inventory");
    list.replaceChildren();
    const ids = Object.keys(this.inventory).sort();
    for (const id of ids) {
      const it = this.c.items.get(id);
      const li = el("li", `rarity-${it?.rarity ?? "common"}`);
      li.title = it?.description ?? "";
      li.append(el("span", "", it?.name ?? id), el("b", "", `×${this.inventory[id]}`));
      if (it?.use) { const b = el("button", "", "Use"); b.onclick = () => this.onUse(id); li.append(b); }
      if (it?.equip && !Object.values(this.equip).includes(id)) { const b = el("button", "", "Equip"); b.onclick = () => this.onEquip(id); li.append(b); }
      list.append(li);
    }
    $("inv-empty").style.display = ids.length ? "none" : "";
  }

  setQuests(qs: QuestView[]) {
    const box = $("quest-list");
    box.replaceChildren();
    if (!qs.length) box.append(el("div", "muted", "No active quests. Visit the Guild Registrar."));
    for (const q of qs) {
      const d = el("div", `quest ${q.state}`);
      d.append(el("div", "quest-title", q.title + (q.state === "ready" ? "  ✓ ready" : "")));
      const def = this.c.quests.get(q.id);
      def?.objectives.forEach((o, i) => {
        const label = o.type === "kill" ? `Defeat ${this.c.monsters.get(o.monster_id)?.name ?? o.monster_id}`
          : o.type === "collect" ? `Collect ${this.c.items.get(o.item_id)?.name ?? o.item_id}` : `Visit ${this.c.maps.get(o.map_id)?.name ?? o.map_id}`;
        d.append(el("div", "quest-goal", `${label}  ${q.progress[i] ?? 0} / ${q.goals[i]}`));
      });
      if (q.state === "ready") d.append(el("div", "quest-goal good", `Report to ${this.c.npcs.get(q.turn_in)?.name ?? q.turn_in}`));
      box.append(d);
    }
  }

  log(text: string, kind: "info" | "good" | "bad" = "info") {
    const box = $("log");
    box.append(el("div", `log-${kind}`, text));
    while (box.childElementCount > 60) box.firstElementChild!.remove();
    box.scrollTop = box.scrollHeight;
  }
}
