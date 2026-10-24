import * as THREE from "three";
import { loadLayout, type ClientContent, type SpriteBinding } from "./data/content";
import type { WarpDef } from "./data/schema";
import { decodeWalk } from "./data/schema";
import type { Connection } from "./net/connection";
import { EntState, type CombatEvent, type EntityAdd, type MsgOf, type ServerMsg } from "./net/protocol";
import { IsoCamera } from "./render/camera";
import { sceneLighting } from "./render/sceneLighting";
import { COLORS as SKILL_COLORS, ELEMENT_COLORS, Fx, RARITY_COLORS, TOTEM_COLORS } from "./render/fx";
import { wayfarerSprite } from "./render/paperDoll";
import { skillAnimation } from "./render/combatAnimation";
import { SpriteActor } from "./render/spriteActor";
import type { SpriteDef } from "./render/spriteDef";
import { animate, buildMap, type BuiltMap } from "./render/terrain";
import { ClickMarker, TargetMarker, makeHoverCell } from "./render/markers";
import { gameCursor } from "./ui/cursors";
import { headingOf } from "./shared/dir";
import type { Cell } from "./shared/path";
import { ITEM_KEYS, TOTEM_KEYS, type Hud } from "./ui/hud";
import { Minimap } from "./ui/minimap";
import type { NpcDialog } from "./ui/npcDialog";
import { Overlay, type Label } from "./ui/overlay";
import { WalkGrid } from "./world/grid";
import { findPath, smoothPath } from "./world/pathfinding";

/** Remote entities are drawn this far in the past, between two snapshots. */
const INTERP_MS = 120;
const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
/** WASD as screen steps (x right, y down), by physical key so a Thai layout works. */
const WASD: Record<string, [number, number]> = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };

// Where an entity's sprite stands. Melee monsters stack in one cell on the
// server; each is nudged a little, always the same way for the same monster,
// so a pile reads as a pile (and its damage numbers sit over each sprite).
function drawnAt(e: { id: number; kind: string; pos: THREE.Vector3 }, out: THREE.Vector3): THREE.Vector3 {
  out.copy(e.pos);
  if (e.kind === "m") {
    const a = e.id * 2.39996, r = 0.12 + (e.id % 7) * 0.035;
    out.x += Math.cos(a) * r;
    out.z += Math.sin(a) * r;
  }
  return out;
}

interface Sample { t: number; x: number; y: number; h: number; st: number }

interface Ent {
  id: number;
  kind: "p" | "m" | "n";
  look: string;
  ref?: string;
  name: string;
  level: number;
  hp: number; // shown: drops as each hit (or part of a multi-hit) lands
  serverHp: number; // the server's value; hp settles on it
  parts: number; // multi-hit parts still waiting to show
  mhp: number;
  msPerCell: number;
  actor: SpriteActor;
  label: Label | null;
  samples: Sample[];
  pos: THREE.Vector3;
  state: number;
  dead: boolean;
  hurtAt: number;
  leaving: boolean;
}

interface Pile { id: number; x: number; y: number; items: [string, number, string?][]; mesh: THREE.Object3D; requestedAt: number }

const NPC_TINT: Record<string, [number, number, number]> = {
  guild_registrar: [1.1, 1, 0.75], merchant: [0.8, 1.1, 0.8], healer: [1.15, 0.85, 0.9], teleporter: [0.75, 1, 1.2],
  craftsman: [1.1, 0.85, 0.65], guard: [0.75, 0.75, 0.85], scout: [0.9, 1.05, 0.8],
};

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: IsoCamera;
  readonly fx: Fx;
  private readonly moveSun: (focus: THREE.Vector3, mapId?:string) => void;
  private overlay: Overlay;
  private minimap: Minimap;
  private ents = new Map<number, Ent>();
  private piles = new Map<number, Pile>();
  /** Where each recent cast was aimed (shaped effects need it when the hit lands). */
  private lastAim = new Map<number, [number, number]>();
  private selfId = -1;
  private mapId = "";
  private grid: WalkGrid | null = null;
  private built: BuiltMap | null = null;
  private warps: WarpDef[] = [];
  private portalLabels: { label: Label; at: THREE.Vector3 }[] = [];
  private targetId: number | null = null;
  private hoverId: number | null = null;
  private pendingTalk: string | null = null;
  /** A loot pile clicked from afar: picked up once we reach it. */
  private pendingPickup: number | null = null;
  private hoverMarker = makeHoverCell();
  private targetMarker = new TargetMarker(0xffd36b);
  private clickMarker = new ClickMarker(0x9be7ff);
  private clickAge = 1;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mouse = new THREE.Vector2();
  private width = 1;
  private height = 1;
  private moveSeq = 0;
  /** WASD keys held (physical codes), the latest last: it picks the direction. */
  private heldDirs: string[] = [];
  /** The WASD direction last sent to the server (map axes, unit length or zero). */
  private steerDir: [number, number] = [0, 0];
  /** Left button held after a ground click: keep walking toward the cursor. */
  private holdWalk = { on: false, at: 0 };
  /** Client-side prediction of our own walk. */
  private predicted: { path: Cell[]; at: THREE.Vector3 } | null = null;
  /** When we last walked by our own prediction (steering or a click path). */
  private ownWalkAt = 0;
  /** Our own cast in progress (until its first combat event, or a timeout):
   * the server holds a walk ordered meanwhile until the cast lands, so we do
   * not walk ahead of it (that used to snap us back). */
  private castingUntil = 0;
  private castingId = 0;
  private loading = false;
  private debugOn = false;
  private debugInfo: MsgOf<"debug"> | null = null;
  private frameTimes: number[] = [];
  autoLoot = true;

  constructor(
    private readonly view: HTMLElement,
    private readonly conn: Connection,
    private readonly c: ClientContent,
    private readonly sprites: Record<string, SpriteDef>,
    private readonly hud: Hud,
    private readonly dialog: NpcDialog,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    view.prepend(this.renderer.domElement);
    this.overlay = new Overlay(view.querySelector<HTMLElement>(".overlay")!);
    this.minimap = new Minimap(document.getElementById("minimap") as HTMLCanvasElement);
    this.cam = new IsoCamera(1);
    this.fx = new Fx(this.scene);
    this.scene.background = new THREE.Color(0x1d2f27);
    this.moveSun = sceneLighting(this.scene, this.renderer);
    this.scene.add(this.hoverMarker, this.targetMarker.mesh, this.clickMarker.group);
    conn.onMessage((m) => this.onMessage(m));
    hud.onSkill = (s) => this.cast(s);
    hud.onUse = (i) => conn.send({ t: "use", item: i });
    hud.onEquip = (uid, slot) => conn.send({ t: "equip", gear: uid, slot });
    hud.onUnequip = (s) => conn.send({ t: "unequip", slot: s });
    hud.onDiscard = (uid) => conn.send({ t: "discard", gear: uid });
    hud.onStat = (stat, n) => conn.send({ t: "stat", arg: stat, qty: n });
    hud.onResetStats = () => conn.send({ t: "reset_stats" });
    hud.onTotem = (slot) => conn.send({ t: "totem", slot });
    hud.onLink = (slot, skill) => conn.send({ t: "link", slot, skill });
    hud.onTotemFired = (type) => { const me = this.self; if (me) this.fx.aura(me.pos.x, me.pos.z, TOTEM_COLORS[type] ?? 0xffffff); };
    hud.onLevelUp = () => { const me = this.self; if (me) this.fx.celebrate(me.pos.x, me.pos.z, 0xffd36a, 1); };
    hud.onSkillRankUp = (skill) => { const me = this.self; if (me) this.fx.celebrate(me.pos.x, me.pos.z, SKILL_COLORS[skill] ?? 0x8fe8ff, 0.6); };
    dialog.onOp = (npc, op, arg, qty) => conn.send({ t: "npc", npc, op, arg, qty });
    document.getElementById('clear-target')!.onclick = () => { this.targetId = null; this.hud.setTarget(null); };
    document.querySelector<HTMLButtonElement>('[data-close=debug-win]')!.onclick = () => { this.debugOn = false; this.conn.send({ t: 'debug', on: false }); document.getElementById('debug-win')!.hidden = true; };
    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(view);
    this.resize();
  }

  private get self(): Ent | undefined { return this.ents.get(this.selfId); }

  // --- server messages ----------------------------------------------------------

  private onMessage(m: ServerMsg) {
    switch (m.t) {
      case "map": void this.enterMap(m); break;
      case "snap": this.onSnap(m); break;
      case "cast": this.onCast(m); break;
      case "combat": for (const ev of m.ev) this.onCombat(ev); break;
      case "loot": for (const p of m.piles) this.addPile(p); break;
      case "loot_gone": for (const id of m.ids) this.removePile(id); break;
      case "inv": this.hud.setInventory(m); if (this.dialog.current) this.conn.send({ t: "npc", npc: this.dialog.current, op: "talk" }); break;
      case "stats": {
        const prev = this.hud.stats;
        this.hud.setStats(m);
        const me = this.self;
        if (me) {
          me.hp = m.hp; me.mhp = m.mhp; me.label?.setHp(m.hp, m.mhp);
          // EXP gained (kills, quests) floats over our head; a level up says so.
          const at = tmpA.copy(me.pos).addScaledVector(UP, me.actor.height + 0.6);
          if (prev && m.lv > prev.lv) this.overlay.text("LEVEL UP!", at, "total");
          else if (prev && m.lv === prev.lv && m.exp > prev.exp) this.overlay.text(`+${(m.exp - prev.exp).toLocaleString()} EXP`, at.clone().addScaledVector(UP, 0.7), "exp");
        }
        break;
      }
      case "quests": this.hud.setQuests(m.quests); break;
      case "book": this.hud.book.setKills(m.kills); break;
      case "sheet": this.hud.setSheet(m); break;
      case "npc": this.dialog.show(m); break;
      case "notice": this.hud.log(m.text, m.kind); break;
      case "correct": {
        this.predicted = null;
        const me = this.self;
        if (me) me.pos.set(m.pos[0], 0, m.pos[1]);
        break;
      }
      case "debug": this.debugInfo = m; break;
      case "err": this.hud.log(m.msg, "bad"); break;
    }
  }

  private async enterMap(m: MsgOf<"map">) {
    this.loading = true;
    for (const e of [...this.ents.values()]) this.removeEnt(e.id);
    for (const id of [...this.piles.keys()]) this.removePile(id);
    this.fx.clear();
    this.overlay.clear();
    this.dialog.close();
    this.predicted = null;
    this.targetId = null;
    for (const p of this.portalLabels) p.label.remove();
    this.portalLabels = [];
    if (this.built) { this.built.group.removeFromParent(); this.built.dispose(); }
    this.selfId = m.you;
    this.mapId = m.map;
    const layout = await loadLayout(this.c, m.map);
    if (this.mapId !== m.map) return; // a later map change won
    const def = this.c.maps.get(m.map)!;
    const region = this.c.regions.get(def.region_id);
    this.grid = new WalkGrid(layout.width, layout.height);
    this.grid.flags.set(decodeWalk(layout.walk_rle, layout.width * layout.height));
    this.warps = this.c.warps.filter((w) => w.from_map === m.map);
    this.built = buildMap(layout, region, this.warps);
    this.scene.add(this.built.group);
    this.scene.fog = new THREE.Fog(region?.palette.fog ?? "#1d2f27", 120, 260);
    (this.scene.background as THREE.Color).set(region?.palette.fog ?? "#1d2f27");
    for (const w of this.warps) {
      const lbl = this.overlay.label(`⇨ ${this.c.maps.get(w.to_map)?.name ?? w.to_map}${w.requirements.length ? " 🔒" : ""}`, "tag-portal", false);
      this.portalLabels.push({ label: lbl, at: new THREE.Vector3(w.trigger_rect[0] + w.trigger_rect[2] / 2, 3.4, w.trigger_rect[1] + w.trigger_rect[3] / 2) });
    }
    this.minimap.setMap(layout);
    this.cam.target.set(m.pos[0], 0, m.pos[1]);
    const lv = `${def.type.toUpperCase()} · Lv ${def.recommended_level_min}-${def.recommended_level_max}`;
    this.hud.setMap(def.name, `${region?.name ?? ""} · ${lv}`);
    this.hud.log(`Entered ${def.name}`, "info");
    if (def.intro) { this.hud.log(def.intro, "info"); this.hud.showMapCard(def.name, `${region?.name ?? ""} · Lv ${def.recommended_level_min}–${def.recommended_level_max}`, def.intro); }
    this.loading = false;
  }

  private onSnap(m: MsgOf<"snap">) {
    for (const a of m.add ?? []) this.addEnt(a, m.time);
    for (const [id, x100, y100, h, hp, st] of m.e ?? []) {
      const e = this.ents.get(id);
      if (!e) continue;
      e.samples.push({ t: m.time, x: x100 / 100, y: y100 / 100, h: (h * Math.PI) / 180, st });
      if (e.samples.length > 12) e.samples.shift();
      if (hp < e.serverHp && e.kind === "m") e.hurtAt = performance.now();
      e.serverHp = hp;
      // The hit already took its HP off the bar; while parts of a multi-hit
      // are still to show, let them bring it down instead of jumping ahead.
      if (e.parts === 0 || hp > e.hp) { e.hp = hp; e.label?.setHp(hp, e.mhp); }
    }
    for (const id of m.gone ?? []) {
      const e = this.ents.get(id);
      if (!e) continue;
      if (e.dead && e.kind === "m") e.leaving = true; // let the death play out
      // A monster that leaves alive (lost far from home, or out of view) fades.
      else if (e.kind === "m") e.actor.fadeOut(600, () => { if (this.ents.get(id) === e) this.removeEnt(id); });
      else this.removeEnt(id);
    }
  }

  private bindingFor(a: EntityAdd): SpriteBinding {
    if (a.k === "m") return this.c.sprites.monsters[a.look] ?? this.c.sprites.fallback;
    return { sprite: "wayfarer", tint: a.k === "n" ? NPC_TINT[a.look] : a.id === this.selfId ? undefined : [0.85, 0.95, 1.15] };
  }

  private addEnt(a: EntityAdd, t: number) {
    this.removeEnt(a.id);
    const b = this.bindingFor(a);
    // Players wear their equipment: the paper doll baked for this outfit.
    const sprite = (a.k === "p" ? wayfarerSprite(a.gear) : null) ?? this.sprites[b.sprite] ?? this.sprites.wayfarer;
    const actor = new SpriteActor(sprite, { tint: b.tint, scale: b.scale });
    actor.heading = (a.h * Math.PI) / 180;
    const isSelf = a.id === this.selfId;
    const e: Ent = {
      id: a.id, kind: a.k, look: a.look, ref: a.ref, name: a.name, level: a.lv, hp: a.hp, serverHp: a.hp, parts: 0, mhp: a.mhp, msPerCell: a.ms || 150,
      actor, label: null, samples: [{ t, x: a.x, y: a.y, h: actor.heading, st: a.st }], pos: new THREE.Vector3(a.x, 0, a.y),
      state: a.st, dead: a.st === EntState.Dead, hurtAt: 0, leaving: false,
    };
    if (a.k !== "m") {
      e.label = this.overlay.label(a.k === "n" ? a.name : `${a.name}`, isSelf ? "tag-self" : a.k === "n" ? "tag-npc" : "tag-player", a.k === "p", a.k === "n" && a.ref ? this.c.npcs.get(a.ref)?.title : undefined);
      e.label.setHp(a.hp, a.mhp);
    }
    this.ents.set(a.id, e);
    this.scene.add(actor.root);
    if (isSelf) this.cam.target.copy(e.pos);
  }

  private removeEnt(id: number) {
    const e = this.ents.get(id);
    if (!e) return;
    e.actor.dispose();
    e.label?.remove();
    this.ents.delete(id);
    if (this.targetId === id) this.targetId = null;
    if (this.hoverId === id) this.hoverId = null;
  }

  private onCast(m: MsgOf<"cast">) {
    const s = this.c.skills.get(m.skill);
    const e = this.ents.get(m.actor);
    const castMs = Math.max(150, m.hit_at - m.time);
    if (e) {
      e.actor.heading = headingOf(m.aim[0] - e.pos.x, m.aim[1] - e.pos.z);
      e.actor.play(e.kind === "p" ? skillAnimation(s) : "attack", { impactMs: castMs });
      if (s) this.fx.telegraph(s, e.pos.x, e.pos.z, m.aim[0], m.aim[1], castMs);
      if (s && s.cast_ms > 0 && e.kind === "p") e.label?.cast(s.name, castMs);
      if (s?.shape === "mobility") {
        // Where the dash ends: the aim, or as far towards it as the skill reaches.
        const dx = m.aim[0] - e.pos.x, dz = m.aim[1] - e.pos.z, k = Math.min(1, s.range / (Math.hypot(dx, dz) || 1));
        this.fx.dash(e.pos.x, e.pos.z, e.pos.x + dx * k, e.pos.z + dz * k, SKILL_COLORS[s.id] ?? 0x5adcb4, () => e.actor.ghost([0.45, 1.35, 1.25]));
      }
      if (s?.ticks && s.tick_ms) this.fx.field(s, m.aim[0], m.aim[1], s.ticks * s.tick_ms + castMs);
      if (s) { this.lastAim.set(m.cast, [m.aim[0], m.aim[1]]); if (this.lastAim.size > 64) this.lastAim.delete(this.lastAim.keys().next().value!); }
    }
    if (m.echo && e) this.fx.aura(e.pos.x, e.pos.z, 0xffd246, 600, 1.1);
    // An Echo Totem's cast is free: the skill's own cooldown does not start.
    if (m.actor === this.selfId && !m.echo) {
      this.hud.startCooldown(m.skill, m.cd);
      this.predicted = null;
      this.castingId = m.cast;
      this.castingUntil = performance.now() + Math.max(0, m.hit_at - m.time) * 1.6 + 400; // cast pushback can stretch it
    }
  }

  private onCombat(ev: CombatEvent) {
    if (ev.cast && ev.cast === this.castingId) this.castingUntil = 0;
    const src = this.ents.get(ev.src);
    const s = ev.skill ? this.c.skills.get(ev.skill) : undefined;
    if (s && src) {
      const aim = (ev.cast && this.lastAim.get(ev.cast)) || [src.pos.x, src.pos.z];
      if (!this.fx.shaped(s, src.pos.x, src.pos.z, aim[0], aim[1])) this.fx.burst(s, src.pos.x, src.pos.z);
      if (s.id === "coil_mine" && ev.src === this.selfId) this.cam.kick(0.3);
    }
    // Multi-hit skills (RO style): part k of a hit shows k × hit_ms after the
    // first (index in flags bits 8+), and deaths wait for the last part.
    const step = s?.hits && s.hits > 1 ? s.hit_ms ?? 180 : 0;
    // A ranged monster's attack: a dart flies to each target, and the hit
    // shows when it lands (a monster's look is its monster id).
    const shooter = !s && src?.kind === "m" ? this.c.monsters.get(src.look) : undefined;
    let shotMs = 0;
    if (src && shooter && shooter.attack_range > 1.5) {
      const from = src.actor.root.position.clone().addScaledVector(UP, src.actor.height * (shooter.id === "mob_0023" ? 0.85 : 0.55));
      for (const [id, dmg, flags] of ev.hits) {
        const t = this.ents.get(id);
        if (!t) continue;
        const to = t.pos.clone().addScaledVector(UP, t.actor.height * 0.5);
        const ms = THREE.MathUtils.clamp(from.distanceTo(to) * 55, 140, 380);
        this.fx.monsterProjectile(shooter.id, from, to, ELEMENT_COLORS[shooter.element] ?? 0xffffff, ms);
        t.parts++;
        setTimeout(() => { t.parts--; this.showHit(ev, id, dmg, flags); }, ms);
        shotMs = Math.max(shotMs, ms);
      }
    }
    for (const [id, dmg, flags] of shotMs ? [] : ev.hits) {
      const k = flags >> 8;
      const combo = step ? `${ev.cast}:${id}` : undefined;
      const t = k > 0 && step ? this.ents.get(id) : undefined;
      if (t) {
        t.parts++;
        setTimeout(() => { t.parts--; this.showHit(ev, id, dmg, flags, combo); }, k * step);
      } else this.showHit(ev, id, dmg, flags, combo);
    }
    const dieAfter = Math.max(step * ((s?.hits ?? 1) - 1), shotMs);
    // Each target's combo counter (counting up with the parts) floats off after the last one.
    if (step) {
      const ids = new Set(ev.hits.map(([id]) => id));
      setTimeout(() => { for (const id of ids) this.overlay.endCombo(`${ev.cast}:${id}`); }, dieAfter + 60);
    }
    for (const id of ev.deaths ?? []) {
      const t = this.ents.get(id);
      if (!t || t.dead) continue;
      if (dieAfter) setTimeout(() => { if (this.ents.get(id) === t && !t.dead) this.die(t); }, dieAfter);
      else this.die(t);
    }
  }

  private showHit(ev: CombatEvent, id: number, dmg: number, flags: number, combo?: string) {
    const t = this.ents.get(id);
    if (!t) return;
    // A later part of a multi-hit arrives after the snapshot, so it never takes
    // the bar below the server's HP, and the last part settles it there.
    if (flags >> 8 > 0) t.hp = t.parts === 0 ? t.serverHp : Math.max(t.serverHp, t.hp - dmg);
    else t.hp = Math.max(0, t.hp - dmg);
    t.label?.setHp(t.hp, t.mhp);
    t.hurtAt = performance.now();
    t.actor.hitFlash();
    if (!t.dead) t.actor.play("hit");
    // Numbers sit over the sprite as drawn (a pile's members are nudged apart).
    const at = tmpA.copy(t.actor.root.position).setY(0).addScaledVector(UP, t.actor.height + 0.3);
    if (flags & 2) { this.overlay.text("Evade", at, "taken"); return; } // evaded: no damage
    const crit = (flags & 1) === 1;
    if (ev.skill) this.fx.impact(tmpB.copy(t.actor.root.position).setY(t.actor.height * 0.5), SKILL_COLORS[ev.skill] ?? 0xffffff);
    // Every hit flashes on the body: the skill's colour, warm white for a swing, red when it's us being hit.
    if (dmg > 0 && !(flags & 4)) {
      const color = id === this.selfId ? 0xff5a46 : ev.skill ? SKILL_COLORS[ev.skill] ?? 0xfff0c0 : crit ? 0xffd23c : 0xfff0c0;
      this.fx.hit(tmpB.copy(t.actor.root.position).setY(t.actor.height * 0.55), color, crit);
      if (crit && ev.src === this.selfId) this.cam.kick(0.08);
    }
    // Ailments landing (8 burn, 16 shock, 32 chill): a word above the target.
    if (flags & 56 && dmg > 0 && (flags & 8 ? ev.src !== id : true)) this.overlay.text(flags & 16 ? "Shock" : flags & 32 ? "Chill" : "Burn", at.clone().addScaledVector(UP, 0.4), "info");
    if (flags & 4) { this.overlay.text("◈ " + dmg, at, "taken"); return; } // the Aether Shield took it all
    if (combo) this.overlay.part(combo, id, dmg, (flags & 1) === 1, at);
    else this.overlay.damage(id, dmg, (flags & 1) === 1, id === this.selfId ? "taken" : "dmg", at);
    if (id === this.selfId && dmg > t.mhp * 0.1) this.cam.kick(0.25);
  }

  private die(e: Ent) {
    e.dead = true;
    e.label?.el.classList.add("tag-dead");
    e.actor.play("death");
    if (this.targetId === e.id) this.targetId = null;
  }

  // --- loot ----------------------------------------------------------------------

  private addPile(p: { id: number; x: number; y: number; items: [string, number, string?][] }) {
    this.removePile(p.id);
    const g = new THREE.Group();
    // Rare materials, or a gear copy better than normal (third field: its rarity).
    const order = ["normal", "magic", "rare", "unique", "relic"];
    const best = p.items.reduce((b, [, , r]) => (r && order.indexOf(r) > order.indexOf(b) ? r : b), "normal");
    const rare = best !== "normal" || p.items.some(([id, , r]) => !r && ["rare", "epic"].includes(this.c.items.get(id)?.rarity ?? ""));
    const tint = best !== "normal" ? RARITY_COLORS[best] : rare ? 0x7ab8ff : 0xd9b46a;
    const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color: tint, emissive: rare ? new THREE.Color(tint).multiplyScalar(0.3) : 0x3a2a10, flatShading: true }));
    bag.position.y = 0.25;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.34, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: rare ? tint : 0xffe08a, transparent: true, opacity: 0.7, depthWrite: false }));
    ring.position.y = 0.05;
    g.add(bag, ring);
    // Gear better than normal: a light beam you can spot across a horde.
    if (best !== "normal") {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 3.2, 10, 1, true).translate(0, 1.6, 0), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(beam);
    }
    g.position.set(p.x, 0, p.y);
    g.userData.spin = { axis: "y", speed: 1.5 };
    this.scene.add(g);
    this.piles.set(p.id, { ...p, mesh: g, requestedAt: 0 });
  }

  private removePile(id: number) {
    const p = this.piles.get(id);
    if (!p) return;
    p.mesh.removeFromParent();
    p.mesh.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    this.piles.delete(id);
  }

  pickupNearby(force = false) {
    const me = this.self;
    if (!me || me.dead) return;
    const now = performance.now();
    const ids: number[] = [];
    for (const p of this.piles.values()) {
      if (Math.hypot(p.x - me.pos.x, p.y - me.pos.z) > 3 || (!force && now - p.requestedAt < 1500)) continue;
      p.requestedAt = now;
      ids.push(p.id);
    }
    if (ids.length) this.conn.send({ t: "pickup", req: crypto.randomUUID(), loot: ids.slice(0, 64) });
  }

  // --- actions -------------------------------------------------------------------

  private cast(skill: string) {
    const s = this.c.skills.get(skill);
    const me = this.self;
    if (!s || !me || me.dead) return;
    // Why a skill key did nothing, over the player's head where they are looking.
    const head = () => tmpA.copy(me.pos).addScaledVector(UP, me.actor.height + 0.9);
    if ((this.hud.stats?.lv ?? 1) < s.unlock_level) { if (this.overlay.warn(`${s.name}: unlocks at Lv ${s.unlock_level}`, head(), "warn")) this.hud.log(`${s.name} unlocks at Lv${s.unlock_level}`, "bad"); return; }
    if (!this.hud.canCast(skill)) { this.overlay.warn(`${s.name} not ready`, head(), "warn"); return; }
    const sp = this.hud.stats?.sp ?? 0;
    if (sp < s.resource_cost) { if (this.overlay.warn(`Not enough SP  ${sp} / ${s.resource_cost}`, head(), "warn-sp")) this.hud.flashSp(); return; }
    const aim = this.groundPoint() ?? new THREE.Vector3(me.pos.x + Math.sin(me.actor.heading), 0, me.pos.z - Math.cos(me.actor.heading));
    this.conn.send({ t: "cast", skill, aim: [aim.x, aim.z] });
  }

  private walkTo(cell: Cell, marker = true, reach = marker ? 3 : 0) {
    const me = this.self;
    if (!me || !this.grid || me.dead) return;
    const dest = this.grid.nearestWalkable(cell[0], cell[1], reach);
    if (!dest) return;
    this.targetId = null;
    this.pendingTalk = null;
    this.pendingPickup = null;
    const from: Cell = [Math.floor(me.pos.x), Math.floor(me.pos.z)];
    const path = findPath(this.grid, from, dest, { maxNodes: 20000 });
    this.moveSeq++;
    this.conn.send({ t: "move", seq: this.moveSeq, to: [dest[0] + 0.5, dest[1] + 0.5] });
    // While casting, follow the server instead: it starts this walk when the cast lands.
    if (path && path.length > 1 && performance.now() >= this.castingUntil) this.predicted = { path: smoothPath(this.grid, path).slice(1), at: me.pos.clone() };
    if (!marker) return;
    tmpA.set(dest[0] + 0.5, 0.06, dest[1] + 0.5);
    this.clickMarker.group.position.copy(tmpA);
    this.clickAge = 0;
  }

  /** Click and hold on the ground repeats the click every 200 ms at the cell
   * under the cursor (marker included), so the walk follows the mouse. */
  private updateHoldWalk(now: number) {
    if (!this.holdWalk.on || this.heldDirs.length || now - this.holdWalk.at < 200) return;
    this.holdWalk.at = now;
    const p = this.groundPoint();
    if (p) this.walkTo([Math.floor(p.x), Math.floor(p.z)]);
  }

  /**
   * WASD steers: the held keys add up to one of 8 screen directions (W+D is
   * up-right, A+D cancel out), sent to the server only when it changes. The
   * server moves us freely in it at our own speed; updateSelf predicts the
   * same steps so the walk is smooth, not cell by cell.
   */
  private updateKeyWalk() {
    const me = this.self;
    let sx = 0, sy = 0;
    for (const code of this.heldDirs) { sx += WASD[code][0]; sy += WASD[code][1]; }
    // Screen to map axes (the camera's yaw counts), at unit length.
    const c = Math.cos(this.cam.yaw), s = Math.sin(this.cam.yaw);
    let x = sx * c - sy * s, y = sx * s + sy * c;
    const l = Math.hypot(x, y);
    if (l < 1e-6 || !me || me.dead) x = y = 0;
    else { x = Math.round((x / l) * 1e4) / 1e4; y = Math.round((y / l) * 1e4) / 1e4; }
    if (x === this.steerDir[0] && y === this.steerDir[1]) return;
    this.steerDir = [x, y];
    this.conn.send({ t: "steer", dir: [x, y] });
    if (x || y) {
      this.predicted = null;
      this.targetId = null;
      this.pendingTalk = null;
      this.pendingPickup = null;
      this.holdWalk.on = false;
    }
  }

  /** Our own steering step, the server's rule: slide along walls, no squeezing
   * between two blocked corner cells. */
  private steerStep(e: Ent, dt: number) {
    const grid = this.grid!;
    const [ux, uy] = this.steerDir;
    const budget = (dt * 1000) / e.msPerCell;
    const free = (x: number, z: number) => {
      const cx = Math.floor(x), cz = Math.floor(z), ox = Math.floor(e.pos.x), oz = Math.floor(e.pos.z);
      return grid.walkable(cx, cz) && (cx === ox || cz === oz || grid.walkable(cx, oz) || grid.walkable(ox, cz));
    };
    const dx = ux * budget, dz = uy * budget;
    let moved = true;
    if (free(e.pos.x + dx, e.pos.z + dz)) { e.pos.x += dx; e.pos.z += dz; }
    else if (dx && free(e.pos.x + dx, e.pos.z)) e.pos.x += dx;
    else if (dz && free(e.pos.x, e.pos.z + dz)) e.pos.z += dz;
    else moved = false;
    e.actor.heading = headingOf(ux, uy);
    e.actor.setBase(moved ? "walk" : "idle", e.msPerCell);
  }

  private bindInput() {
    const el = this.renderer.domElement;
    let rightDown = false, lastRight = 0, lastX = 0, lastY = 0;
    el.addEventListener("contextmenu", (ev) => ev.preventDefault());
    el.addEventListener("pointerdown", (ev) => {
      this.setMouse(ev);
      if (ev.button === 2) {
        const now = performance.now();
        if (now - lastRight < 300) this.cam.reset();
        lastRight = now;
        rightDown = true;
        lastX = ev.clientX; lastY = ev.clientY;
        el.setPointerCapture(ev.pointerId);
        return;
      }
      if (ev.button !== 0 || this.loading) return;
      const picked = this.pick();
      if (picked) {
        if (picked.kind === "m") {
          this.targetId = picked.id;
          this.predicted = null;
          this.conn.send({ t: "attack", target: picked.id });
        } else if (picked.kind === "n" && picked.ref) {
          this.pendingTalk = picked.ref;
          const me = this.self;
          if (me && me.pos.distanceTo(picked.pos) > 3.5) this.walkTo([Math.floor(picked.pos.x), Math.floor(picked.pos.z) + 1]);
          this.pendingTalk = picked.ref;
        }
        return;
      }
      if (this.steerDir[0] || this.steerDir[1]) return; // WASD is walking us
      const pile = this.pickPile();
      if (pile) {
        const me = this.self;
        if (me && Math.hypot(pile.x - me.pos.x, pile.y - me.pos.z) > 2.5) this.walkTo([Math.floor(pile.x), Math.floor(pile.y)]);
        this.pendingPickup = pile.id;
        return;
      }
      const p = this.groundPoint();
      if (p) {
        this.walkTo([Math.floor(p.x), Math.floor(p.z)]);
        this.holdWalk = { on: true, at: performance.now() };
        el.setPointerCapture(ev.pointerId);
      }
    });
    el.addEventListener("pointermove", (ev) => {
      this.setMouse(ev);
      if (rightDown) {
        if (ev.shiftKey) this.cam.tilt(ev.clientY - lastY);
        else this.cam.turn(ev.clientX - lastX);
        lastX = ev.clientX; lastY = ev.clientY;
      }
    });
    el.addEventListener("pointerup", (ev) => { if (ev.button === 2) rightDown = false; if (ev.button === 0) this.holdWalk.on = false; });
    el.addEventListener("pointercancel", () => { rightDown = false; this.holdWalk.on = false; });
    window.addEventListener("keyup", (ev) => this.releaseKey(ev.code));
    window.addEventListener("blur", () => { this.heldDirs = []; this.holdWalk.on = false; });
    el.addEventListener("wheel", (ev) => { ev.preventDefault(); this.cam.zoom(Math.sign(ev.deltaY)); }, { passive: false });
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { this.dialog.close(); this.hud.closeWindows(); this.targetId = null; (document.activeElement as HTMLElement | null)?.blur(); return; }
      const input = ev.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(input.tagName) || input.isContentEditable || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      // Physical keys (ev.code), not characters: with a Thai layout the 1 key
      // types "ๅ" and I/Z type other letters, so ev.key would miss them.
      if (ev.code in WASD) {
        if (!ev.repeat) this.heldDirs = [...this.heldDirs.filter((c) => c !== ev.code), ev.code];
        return;
      }
      const digit = /^(?:Digit|Numpad)(\d)$/.exec(ev.code);
      const n = digit ? Number(digit[1]) : NaN;
      if (n >= 1 && n <= this.hud.hotbar.length) this.cast(this.hud.hotbar[n - 1]);
      else if (n >= 5 && n < 5 + ITEM_KEYS.length) this.conn.send({ t: "use", item: ITEM_KEYS[n - 5] });
      else if (digit && TOTEM_KEYS.includes(digit[1] as typeof TOTEM_KEYS[number])) this.conn.send({ t: "totem", slot: "charm" + (TOTEM_KEYS.indexOf(digit[1] as typeof TOTEM_KEYS[number]) + 1) });
      else if (ev.code === "KeyC") this.hud.toggle("char-win");
      else if (ev.code === "KeyK") this.hud.toggle("skill-win");
      else if (ev.code === "KeyI") this.hud.toggle("inv-win");
      else if (ev.code === "KeyE") this.hud.toggle("equip-win");
      else if (ev.code === "KeyQ") this.hud.toggle("journal-win");
      else if (ev.code === "KeyB") this.hud.toggle("book-win");
      else if (ev.code === "KeyZ") this.pickupNearby(true);
      // World v3 horde tools: R rings a Lure Bell, T crushes a Camp Feather.
      else if (ev.code === "KeyR") this.conn.send({ t: "use", item: "itm_0900" });
      else if (ev.code === "KeyT") this.conn.send({ t: "use", item: "itm_0902" });
      else if (ev.key === "Home") this.cam.reset();
      else if (ev.key === "F3") { ev.preventDefault(); this.debugOn = !this.debugOn; this.conn.send({ t: "debug", on: this.debugOn }); document.getElementById("debug-win")!.hidden = !this.debugOn; }
    });
  }

  private releaseKey(code: string) {
    this.heldDirs = this.heldDirs.filter((c) => c !== code);
  }

  private setMouse(ev: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(ev.clientX - r.left, ev.clientY - r.top);
  }

  private pick(): Ent | null {
    const cam = this.cam.camera;
    let best: Ent | null = null, bestD = Infinity;
    // The box is the sprite as drawn (its card on screen), at least 36 px
    // each way; among overlapping monsters the one whose centre is nearest wins.
    for (const e of this.ents.values()) {
      if (e.dead || e.id === this.selfId || e.kind === "p") continue;
      let [x0, y0, x1, y1] = e.actor.screenRect(cam, this.width, this.height);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (x1 - x0 < 36) { x0 = cx - 18; x1 = cx + 18; }
      if (y1 - y0 < 36) { y0 = cy - 18; y1 = cy + 18; }
      if (this.mouse.x < x0 || this.mouse.x > x1 || this.mouse.y < y0 || this.mouse.y > y1) continue;
      const d = Math.hypot(this.mouse.x - cx, this.mouse.y - cy);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /** The loot pile under the cursor (within 26 px of it on screen). */
  private pickPile(): Pile | null {
    let best: Pile | null = null, bestD = 26;
    for (const p of this.piles.values()) {
      tmpB.set(p.x, 0.25, p.y).project(this.cam.camera);
      const d = Math.hypot((tmpB.x + 1) / 2 * this.width - this.mouse.x, (1 - tmpB.y) / 2 * this.height - this.mouse.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  private groundPoint(): THREE.Vector3 | null {
    const ndc = new THREE.Vector2((this.mouse.x / this.width) * 2 - 1, -(this.mouse.y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.cam.camera);
    return this.raycaster.ray.intersectPlane(this.groundPlane, new THREE.Vector3());
  }

  private resize() {
    const r = this.view.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setSize(this.width, this.height, false);
    this.cam.camera.aspect = this.width / this.height;
    this.cam.camera.updateProjectionMatrix();
  }

  // --- frame -----------------------------------------------------------------------

  /** Interpolated position of a remote entity at renderTime. */
  private sampleAt(e: Ent, t: number): Sample {
    const s = e.samples;
    if (s.length === 1 || t <= s[0].t) return s[0];
    for (let i = s.length - 1; i > 0; i--) {
      if (s[i - 1].t <= t) {
        const a = s[i - 1], b = s[i];
        if (t >= b.t) return b;
        const k = (t - a.t) / Math.max(1, b.t - a.t);
        return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, h: b.h, st: b.st };
      }
    }
    return s[s.length - 1];
  }

  private updateSelf(e: Ent, dt: number) {
    const latest = e.samples[e.samples.length - 1];
    if ((this.steerDir[0] || this.steerDir[1]) && !e.dead && this.grid && performance.now() >= this.castingUntil) {
      this.steerStep(e, dt);
      this.ownWalkAt = performance.now();
      // Reconcile: if the server disagrees by more than 2.5 cells, trust it.
      if (Math.hypot(latest.x - e.pos.x, latest.y - e.pos.z) > 2.5 && this.conn.serverNow() - latest.t < 300) e.pos.set(latest.x, 0, latest.y);
      return;
    }
    if (this.predicted && !e.dead) {
      // Walk our own path now; the server follows ~1 RTT later.
      const p = this.predicted;
      let budget = (dt * 1000) / e.msPerCell;
      while (budget > 0 && p.path.length) {
        const [cx, cy] = p.path[0];
        const tx = cx + 0.5, tz = cy + 0.5;
        const dx = tx - p.at.x, dz = tz - p.at.z, d = Math.hypot(dx, dz);
        if (d <= budget) { p.at.set(tx, 0, tz); budget -= d; p.path.shift(); }
        else { p.at.x += (dx / d) * budget; p.at.z += (dz / d) * budget; budget = 0; }
        if (d > 1e-4) e.actor.heading = headingOf(dx, dz);
      }
      e.pos.copy(p.at);
      e.actor.setBase(p.path.length ? "walk" : "idle", e.msPerCell);
      if (p.path.length) this.ownWalkAt = performance.now();
      // Reconcile: if the server disagrees by more than 2.5 cells, trust it.
      if (Math.hypot(latest.x - p.at.x, latest.y - p.at.z) > 2.5 && this.conn.serverNow() - latest.t < 300) this.predicted = null;
      if (!p.path.length && Math.hypot(latest.x - p.at.x, latest.y - p.at.z) < 0.2) this.predicted = null;
      return;
    }
    // Server-driven (auto-attack chase, idle): follow the newest sample smoothly.
    const k = 1 - Math.exp(-14 * dt);
    const ox = e.pos.x, oz = e.pos.z;
    e.pos.x += (latest.x - e.pos.x) * k;
    e.pos.z += (latest.y - e.pos.z) * k;
    // Just after our own walk the server is still catching up: its late
    // samples (the rest of an earlier tap, a step back onto its position) must
    // not turn us away from the way we last walked. Later, face its heading,
    // never the glide.
    const settling = performance.now() - this.ownWalkAt < 500;
    const walking = !settling && latest.st === EntState.Walk && Math.hypot(e.pos.x - ox, e.pos.z - oz) > dt * 0.8;
    if (walking || latest.st === EntState.Attack || latest.st === EntState.Cast) e.actor.heading = latest.h;
    if (!e.dead) e.actor.setBase(walking ? "walk" : "idle", e.msPerCell);
  }

  frame(dt: number) {
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length > 600) this.frameTimes.shift();
    const dtMs = dt * 1000;
    const renderT = this.conn.serverNow() - INTERP_MS;
    const now = performance.now();
    this.updateKeyWalk();
    this.updateHoldWalk(now);
    for (const e of this.ents.values()) {
      const prevState = e.state;
      if (e.id === this.selfId) {
        this.updateSelf(e, dt);
        e.state = e.samples[e.samples.length - 1].st;
      } else {
        const s = this.sampleAt(e, renderT);
        const ox = e.pos.x, oz = e.pos.z;
        e.pos.set(s.x, 0, s.y);
        e.state = s.st;
        const moved = Math.hypot(e.pos.x - ox, e.pos.z - oz);
        if (moved > 1e-3 && s.st !== EntState.Attack) e.actor.heading = headingOf(e.pos.x - ox, e.pos.z - oz);
        else if (e.kind !== "n") e.actor.heading = s.h;
        if (!e.dead) e.actor.setBase(moved > dt * 0.6 ? "walk" : "idle", e.msPerCell);
      }
      if (e.state !== prevState) {
        if (e.state === EntState.Attack && !["attack", "shoot", "cast"].includes(e.actor.animator.current)) e.actor.play("attack", { durationMs: e.kind === "m" ? 560 : 340 });
        if (e.state === EntState.Dead && !e.dead) this.die(e);
        if (prevState === EntState.Dead && e.state !== EntState.Dead) { e.dead = false; e.actor.revive(); e.label?.el.classList.remove("tag-dead"); }
      }
      drawnAt(e, e.actor.root.position);
    }
    // Monsters whose death has played out leave.
    for (const e of [...this.ents.values()]) {
      if (e.leaving && e.actor.animator.isDead && !e.actor.animator.current.includes("hit")) {
        e.leaving = false;
        e.actor.fadeOut(700, () => this.removeEnt(e.id));
      }
    }

    const me = this.self;
    this.cam.update(dt, me ? me.pos : this.cam.target);
    this.moveSun(this.cam.target,this.mapId);
    const cam = this.cam.camera;
    for (const e of this.ents.values()) {
      e.actor.update(dtMs, cam, this.cam.yaw);
      // Monster tags exist only while they matter (hover, target, recently hurt).
      if (e.kind === "m") {
        const want = !e.dead && (e.id === this.hoverId || e.id === this.targetId || now - e.hurtAt < 5000);
        if (want && !e.label) { e.label = this.overlay.label(`${e.name} Lv.${e.level}`, "tag-mob", true); e.label.setHp(e.hp, e.mhp); }
        else if (!want && e.label) { e.label.remove(); e.label = null; }
        if (e.label) { e.label.targeted = e.id === this.targetId; e.label.hover = e.id === this.hoverId; }
      }
      // Over the sprite as drawn (a pile's members are nudged apart).
      e.label?.place(tmpA.copy(e.actor.root.position).setY(0).addScaledVector(UP, e.actor.height + 0.35), cam, this.width, this.height);
    }
    for (const p of this.portalLabels) p.label.place(p.at, cam, this.width, this.height);
    for (const p of this.piles.values()) p.mesh.rotation.y += dt * 1.5;
    if (this.built) animate(this.built, dt);
    this.fx.update(dtMs);

    // Talk to an NPC once we're beside it.
    if (this.pendingTalk && me) {
      const npc = [...this.ents.values()].find((e) => e.ref === this.pendingTalk);
      if (npc && npc.pos.distanceTo(me.pos) <= 3.6) {
        this.conn.send({ t: "npc", npc: this.pendingTalk, op: "talk" });
        this.pendingTalk = null;
      }
    }
    if (this.autoLoot && Math.floor(now / 250) !== Math.floor((now - dtMs) / 250)) this.pickupNearby();

    if (this.pendingPickup !== null && me) {
      const p = this.piles.get(this.pendingPickup);
      if (!p) this.pendingPickup = null;
      else if (Math.hypot(p.x - me.pos.x, p.y - me.pos.z) <= 2.5) {
        this.conn.send({ t: "pickup", req: crypto.randomUUID(), loot: [p.id] });
        p.requestedAt = now;
        this.pendingPickup = null;
      }
    }

    // Cursor feedback: sword over monsters, speech over NPCs, hand over loot.
    const hover = this.pick();
    const pile = hover ? null : this.pickPile();
    this.hoverId = hover?.id ?? null;
    const cursor = gameCursor(hover ? (hover.kind === "m" ? "attack" : "talk") : pile ? "pickup" : "walk");
    if (this.renderer.domElement.style.cursor !== cursor) this.renderer.domElement.style.cursor = cursor;
    const gp = hover || pile ? null : this.groundPoint();
    this.hoverMarker.visible = !!gp && !!this.grid;
    if (gp && this.grid) {
      const cx = Math.floor(gp.x), cz = Math.floor(gp.z);
      this.hoverMarker.position.set(cx + 0.5, 0.06, cz + 0.5);
      (this.hoverMarker.material as THREE.MeshBasicMaterial).color.set(this.grid.walkable(cx, cz) ? 0xffffff : 0xff6060);
    }
    const target = this.targetId !== null ? this.ents.get(this.targetId) : undefined;
    this.hud.setTarget(target && !target.dead ? target : null);
    this.targetMarker.mesh.visible = !!target;
    // Under the sprite as drawn (its crowd offset included), not its logical spot.
    if (target) this.targetMarker.place(target.actor.root.position.x, target.actor.root.position.z, now);
    this.clickAge = Math.min(1, this.clickAge + dt * 1.4);
    this.clickMarker.update(this.clickAge);

    this.overlay.update(dtMs, cam, this.width, this.height);
    if (Math.floor(now / 100) !== Math.floor((now - dtMs) / 100)) {
      this.hud.refreshHotbar();
      const mobs: { x: number; y: number; chasing: boolean }[] = [], others: { x: number; y: number }[] = [], npcs: { x: number; y: number }[] = [];
      for (const e of this.ents.values()) {
        if (e.dead) continue;
        if (e.kind === "m") mobs.push({ x: e.pos.x, y: e.pos.z, chasing: now - e.hurtAt < 5000 });
        else if (e.kind === "n") npcs.push({ x: e.pos.x, y: e.pos.z });
        else if (e.id !== this.selfId) others.push({ x: e.pos.x, y: e.pos.z });
      }
      this.minimap.draw(me ? { x: me.pos.x, y: me.pos.z } : null, mobs, others, npcs, this.warps);
      if (this.debugOn) this.renderDebug();
    }
    this.renderer.render(this.scene, cam);
  }

  /** Frame-time statistics for the debug overlay and browser stress tests. */
  frameStats() {
    const v = [...this.frameTimes].sort((a, b) => a - b);
    const n = v.length || 1;
    return {
      frames: v.length, frameP50: v[Math.floor(n * 0.5)] ?? 0, frameP95: v[Math.floor(n * 0.95)] ?? 0,
      fpsP5: v.length ? 1000 / v[Math.min(v.length - 1, Math.floor(n * 0.95))] : 0,
      entities: this.ents.size, mobs: [...this.ents.values()].filter((e) => e.kind === "m" && !e.dead).length,
      drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      kbPerSec: this.conn.bytesPerSec / 1024, rttMs: this.conn.rttMs,
      memoryMB: (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ? (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576 : null,
    };
  }

  private renderDebug() {
    const s = this.frameStats();
    const d = this.debugInfo;
    const lines = [
      `client  ${(1000 / Math.max(1, s.frameP50)).toFixed(0)} fps · frame p95 ${s.frameP95.toFixed(1)} ms · draw calls ${s.drawCalls} · ents ${s.entities}`,
      `net     ${s.kbPerSec.toFixed(1)} KB/s · rtt ${s.rttMs.toFixed(1)} ms`,
      d ? `server  ${d.map} · tick p50 ${d.p50.toFixed(2)} p95 ${d.p95.toFixed(2)} max ${d.max.toFixed(2)} ms · mobs ${d.mobs} · chasing ${d.chasing} · players ${d.players}` : "server  (waiting)",
      ...(d?.pockets ?? []).map((p) => `  ${p.id.padEnd(22)} alive ${String(p.alive).padStart(3)} / ${p.target} · pending ${p.pending} · fail ${p.fail}`),
    ];
    document.getElementById("debug-text")!.textContent = lines.join("\n");
  }
}
