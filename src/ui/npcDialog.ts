import type { ClientContent } from "../data/content";
import type { MsgOf } from "../net/protocol";
import type { Hud } from "./hud";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** The NPC window: dialogue plus whatever service the NPC offers. */
export class NpcDialog {
  private root = document.getElementById("npc-win")!;
  current: string | null = null;
  onOp: (npc: string, op: string, arg?: string, qty?: number) => void = () => {};

  constructor(private readonly c: ClientContent, private readonly hud: Hud) {}

  close() {
    this.root.hidden = true;
    this.current = null;
  }

  show(m: MsgOf<"npc">) {
    this.current = m.npc;
    const r = this.root;
    r.replaceChildren();
    const head = el("header");
    head.append(el("span", "", m.name), el("span", "muted", m.role.replace("_", " ")));
    const x = el("button", "close", "✕");
    x.onclick = () => this.close();
    head.append(x);
    r.append(head);
    for (const line of m.lines) r.append(el("p", "npc-line", line));
    const op = (o: string, arg?: string, qty?: number) => () => this.onOp(m.npc, o, arg, qty);
    const section = (title: string) => { const s = el("div", "npc-section"); s.append(el("h4", "", title)); r.append(s); return s; };

    if (m.offer?.length) {
      const s = section("Quests");
      for (const q of m.offer) {
        const row = el("div", "npc-row");
        row.append(el("div", "", q.title), el("div", "muted small", q.summary));
        const b = el("button", "", "Accept");
        b.onclick = op("accept", q.id);
        row.append(b);
        s.append(row);
      }
    }
    if (m.ready?.length) {
      const s = section("Report");
      for (const id of m.ready) {
        const q = this.c.quests.get(id);
        const row = el("div", "npc-row");
        row.append(el("div", "", q?.title ?? id), el("div", "muted small", q ? `Reward: ${q.rewards.base_exp} EXP, ${q.rewards.currency} z${q.rewards.items.map((i) => `, ${this.c.items.get(i.item_id)?.name} ×${i.qty}`).join("")}` : ""));
        const b = el("button", "good", "Turn in");
        b.onclick = op("turnin", id);
        row.append(b);
        s.append(row);
      }
    }
    if (m.role === "healer") {
      const s = section("Treatment");
      const b = el("button", "", "Restore HP and SP");
      b.onclick = op("heal");
      s.append(b);
    }
    if (m.shop?.length) {
      const s = section("Buy");
      for (const [id, price] of m.shop) {
        const row = el("div", "npc-row");
        row.append(el("span", "", this.c.items.get(id)?.name ?? id), el("span", "muted", `${price} z`));
        for (const q of [1, 10]) { const b = el("button", "", `×${q}`); b.onclick = op("buy", id, q); row.append(b); }
        s.append(row);
      }
    }
    if (m.role === "merchant") {
      const s = section("Sell");
      const sellable = Object.entries(this.hud.inventory).filter(([id]) => { const it = this.c.items.get(id); return it && it.category !== "quest" && it.sell_price > 0; });
      if (!sellable.length) s.append(el("div", "muted", "Nothing to sell."));
      for (const [id, n] of sellable) {
        const it = this.c.items.get(id)!;
        const row = el("div", "npc-row");
        row.append(el("span", "", `${it.name} ×${n}`), el("span", "muted", `${it.sell_price} z each`));
        const one = el("button", "", "1"); one.onclick = op("sell", id, 1);
        const all = el("button", "", "All"); all.onclick = op("sell", id, n);
        row.append(one, all);
        s.append(row);
      }
    }
    if (m.dest?.length) {
      const s = section("Transit");
      for (const [mapId, cost] of m.dest) {
        const mp = this.c.maps.get(mapId);
        const row = el("div", "npc-row");
        row.append(el("span", "", mp?.name ?? mapId), el("span", "muted", mp ? `Lv ${mp.recommended_level_min}-${mp.recommended_level_max}` : ""), el("span", "muted", cost ? `${cost} z` : "free"));
        const b = el("button", "", "Go");
        b.onclick = op("teleport", mapId);
        row.append(b);
        s.append(row);
      }
    }
    if (m.recipes?.length) {
      const s = section("Craft");
      for (const rc of m.recipes) {
        const out = this.c.items.get(rc.output.item_id);
        const row = el("div", "npc-row col");
        row.append(el("div", "", `${out?.name ?? rc.output.item_id}${rc.output.qty > 1 ? ` ×${rc.output.qty}` : ""}${out?.equip ? `  (${out.equip.slot}${out.equip.attack ? ` ATK+${out.equip.attack}` : ""}${out.equip.defense ? ` DEF+${out.equip.defense}` : ""}, Lv${out.equip.min_level})` : ""}`));
        const needs = rc.inputs.map((i) => `${this.c.items.get(i.item_id)?.name ?? i.item_id} ${this.hud.inventory[i.item_id] ?? 0}/${i.qty}`).join(" · ");
        const ok = rc.inputs.every((i) => (this.hud.inventory[i.item_id] ?? 0) >= i.qty) && this.hud.zeny >= rc.currency;
        row.append(el("div", "muted small", `${needs} · ${rc.currency} z`));
        const b = el("button", ok ? "good" : "", "Craft");
        b.disabled = !ok;
        b.onclick = op("craft", rc.id);
        row.append(b);
        s.append(row);
      }
    }
    r.hidden = false;
  }
}
