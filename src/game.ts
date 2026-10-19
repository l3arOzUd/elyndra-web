import * as THREE from "three";
import { loadLayout, type ClientContent, type SpriteBinding } from "./data/content";
import type { WarpDef } from "./data/schema";
import { decodeWalk } from "./data/schema";
import type { Connection } from "./net/connection";
import { EntState, type CombatEvent, type EntityAdd, type MsgOf, type ServerMsg } from "./net/protocol";
import { IsoCamera } from "./render/camera";
import { Fx } from "./render/fx";
import { SpriteActor } from "./render/spriteActor";
import type { SpriteDef } from "./render/spriteDef";
import { animate, buildMap, makeCellMarker, type BuiltMap } from "./render/terrain";
import { headingOf } from "./shared/dir";
import type { Cell } from "./shared/path";
import { HOTBAR, ITEM_KEYS, type Hud } from "./ui/hud";
import { Minimap } from "./ui/minimap";
import type { NpcDialog } from "./ui/npcDialog";
import { Overlay, project, type Label } from "./ui/overlay";
import { WalkGrid } from "./world/grid";
import { findPath } from "./world/pathfinding";

/** Remote entities are drawn this far in the past, between two snapshots. */
const INTERP_MS = 120;
const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

interface Sample { t: number; x: number; y: number; h: number; st: number }

interface Ent {
  id: number;
  kind: "p" | "m" | "n";
  look: string;
  ref?: string;
  name: string;
  level: number;
  hp: number;
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

interface Pile { id: number; x: number; y: number; items: [string, number][]; mesh: THREE.Object3D; requestedAt: number }

const NPC_TINT: Record<string, [number, number, number]> = {
  guild_registrar: [1.1, 1, 0.75], merchant: [0.8, 1.1, 0.8], healer: [1.15, 0.85, 0.9], teleporter: [0.75, 1, 1.2],
  craftsman: [1.1, 0.85, 0.65], guard: [0.75, 0.75, 0.85], scout: [0.9, 1.05, 0.8],
};

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: IsoCamera;
  readonly fx: Fx;
  private overlay: Overlay;
  private minimap: Minimap;
  private ents = new Map<number, Ent>();
  private piles = new Map<number, Pile>();
  private selfId = -1;
  private mapId = "";
  private grid: WalkGrid | null = null;
  private built: BuiltMap | null = null;
  private warps: WarpDef[] = [];
  private portalLabels: { label: Label; at: THREE.Vector3 }[] = [];
  private targetId: number | null = null;
  private hoverId: number | null = null;
  private pendingTalk: string | null = null;
  private hoverMarker = makeCellMarker(0xffffff);
  private targetMarker = makeCellMarker(0xffd36b);
  private clickMarker = makeCellMarker(0x9be7ff);
  private clickAge = 1;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mouse = new THREE.Vector2();
  private width = 1;
  private height = 1;
  private moveSeq = 0;
  /** Client-side prediction of our own walk. */
  private predicted: { path: Cell[]; at: THREE.Vector3 } | null = null;
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
    this.scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x4b5b3a, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.8);
    sun.position.set(-40, 80, 30);
    this.scene.add(sun);
    this.scene.add(this.hoverMarker, this.targetMarker, this.clickMarker);
    conn.onMessage((m) => this.onMessage(m));
    hud.onSkill = (s) => this.cast(s);
    hud.onUse = (i) => conn.send({ t: "use", item: i });
    hud.onEquip = (i) => conn.send({ t: "equip", item: i });
    hud.onUnequip = (s) => conn.send({ t: "unequip", slot: s });
    dialog.onOp = (npc, op, arg, qty) => conn.send({ t: "npc", npc, op, arg, qty });
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
      case "stats": this.hud.setStats(m); { const me = this.self; if (me) { me.hp = m.hp; me.mhp = m.mhp; me.label?.setHp(m.hp, m.mhp); } } break;
      case "quests": this.hud.setQuests(m.quests); break;
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
    this.loading = false;
  }

  private onSnap(m: MsgOf<"snap">) {
    for (const a of m.add ?? []) this.addEnt(a, m.time);
    for (const [id, x100, y100, h, hp, st] of m.e ?? []) {
      const e = this.ents.get(id);
      if (!e) continue;
      e.samples.push({ t: m.time, x: x100 / 100, y: y100 / 100, h: (h * Math.PI) / 180, st });
      if (e.samples.length > 12) e.samples.shift();
      if (hp < e.hp && e.kind === "m") e.hurtAt = performance.now();
      e.hp = hp;
      e.label?.setHp(hp, e.mhp);
    }
    for (const id of m.gone ?? []) {
      const e = this.ents.get(id);
      if (!e) continue;
      if (e.dead && e.kind === "m") e.leaving = true; // let the death play out
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
    const actor = new SpriteActor(this.sprites[b.sprite] ?? this.sprites.wayfarer, { tint: b.tint, scale: b.scale });
    actor.heading = (a.h * Math.PI) / 180;
    const isSelf = a.id === this.selfId;
    const e: Ent = {
      id: a.id, kind: a.k, look: a.look, ref: a.ref, name: a.name, level: a.lv, hp: a.hp, mhp: a.mhp, msPerCell: a.ms || 150,
      actor, label: null, samples: [{ t, x: a.x, y: a.y, h: actor.heading, st: a.st }], pos: new THREE.Vector3(a.x, 0, a.y),
      state: a.st, dead: a.st === EntState.Dead, hurtAt: 0, leaving: false,
    };
    if (a.k !== "m") {
      e.label = this.overlay.label(a.k === "n" ? a.name : `${a.name}`, isSelf ? "tag-self" : a.k === "n" ? "tag-npc" : "tag-player", a.k === "p");
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
      e.actor.play("attack", { durationMs: castMs + 200 });
      if (s) this.fx.telegraph(s, e.pos.x, e.pos.z, m.aim[0], m.aim[1], castMs);
    }
    if (m.actor === this.selfId) {
      this.hud.startCooldown(m.skill);
      this.predicted = null;
    }
  }

  private onCombat(ev: CombatEvent) {
    const src = this.ents.get(ev.src);
    const s = ev.skill ? this.c.skills.get(ev.skill) : undefined;
    if (s && src) this.fx.burst(s, src.pos.x, src.pos.z);
    for (const [id, dmg, flags] of ev.hits) {
      const t = this.ents.get(id);
      if (!t) continue;
      t.hp = Math.max(0, t.hp - dmg);
      t.label?.setHp(t.hp, t.mhp);
      t.hurtAt = performance.now();
      t.actor.hitFlash();
      if (!t.dead) t.actor.play("hit");
      this.overlay.damage(id, dmg, (flags & 1) === 1, id === this.selfId ? "taken" : "dmg", tmpA.copy(t.pos).addScaledVector(UP, t.actor.height + 0.3));
      if (id === this.selfId && dmg > t.mhp * 0.1) this.cam.kick(0.25);
    }
    for (const id of ev.deaths ?? []) {
      const t = this.ents.get(id);
      if (t && !t.dead) this.die(t);
    }
  }

  private die(e: Ent) {
    e.dead = true;
    e.label?.el.classList.add("tag-dead");
    e.actor.play("death");
    if (this.targetId === e.id) this.targetId = null;
  }

  // --- loot ----------------------------------------------------------------------

  private addPile(p: { id: number; x: number; y: number; items: [string, number][] }) {
    this.removePile(p.id);
    const g = new THREE.Group();
    const rare = p.items.some(([id]) => ["rare", "epic"].includes(this.c.items.get(id)?.rarity ?? ""));
    const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color: rare ? 0x7ab8ff : 0xd9b46a, emissive: rare ? 0x203a66 : 0x3a2a10, flatShading: true }));
    bag.position.y = 0.25;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.34, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: rare ? 0x7ab8ff : 0xffe08a, transparent: true, opacity: 0.7, depthWrite: false }));
    ring.position.y = 0.05;
    g.add(bag, ring);
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
    if (!s || !me || me.dead || !this.hud.canCast(skill)) return;
    if ((this.hud.stats?.lv ?? 1) < s.unlock_level) { this.hud.log(`${s.name} unlocks at Lv${s.unlock_level}`, "bad"); return; }
    const aim = this.groundPoint() ?? new THREE.Vector3(me.pos.x + Math.sin(me.actor.heading), 0, me.pos.z - Math.cos(me.actor.heading));
    this.conn.send({ t: "cast", skill, aim: [aim.x, aim.z] });
  }

  private walkTo(cell: Cell) {
    const me = this.self;
    if (!me || !this.grid || me.dead) return;
    const dest = this.grid.nearestWalkable(cell[0], cell[1], 3);
    if (!dest) return;
    this.targetId = null;
    this.pendingTalk = null;
    const from: Cell = [Math.floor(me.pos.x), Math.floor(me.pos.z)];
    const path = findPath(this.grid, from, dest, { maxNodes: 20000 });
    this.moveSeq++;
    this.conn.send({ t: "move", seq: this.moveSeq, to: [dest[0] + 0.5, dest[1] + 0.5] });
    if (path && path.length > 1) this.predicted = { path: path.slice(1), at: me.pos.clone() };
    tmpA.set(dest[0] + 0.5, 0.06, dest[1] + 0.5);
    this.clickMarker.position.copy(tmpA);
    this.clickAge = 0;
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
      const p = this.groundPoint();
      if (p) this.walkTo([Math.floor(p.x), Math.floor(p.z)]);
    });
    el.addEventListener("pointermove", (ev) => {
      this.setMouse(ev);
      if (rightDown) {
        if (ev.shiftKey) this.cam.tilt(ev.clientY - lastY);
        else this.cam.turn(ev.clientX - lastX);
        lastX = ev.clientX; lastY = ev.clientY;
      }
    });
    el.addEventListener("pointerup", (ev) => { if (ev.button === 2) rightDown = false; });
    el.addEventListener("wheel", (ev) => { ev.preventDefault(); this.cam.zoom(Math.sign(ev.deltaY)); }, { passive: false });
    window.addEventListener("keydown", (ev) => {
      if ((ev.target as HTMLElement).tagName === "INPUT") return;
      // Physical keys (ev.code), not characters: with a Thai layout the 1 key
      // types "ๅ" and I/Z type other letters, so ev.key would miss them.
      const digit = /^(?:Digit|Numpad)(\d)$/.exec(ev.code);
      const n = digit ? Number(digit[1]) : NaN;
      if (n >= 1 && n <= HOTBAR.length) this.cast(HOTBAR[n - 1]);
      else if (n >= 5 && n < 5 + ITEM_KEYS.length) this.conn.send({ t: "use", item: ITEM_KEYS[n - 5] });
      else if (ev.code === "KeyI") this.hud.toggle("inv-win");
      else if (ev.code === "KeyZ") this.pickupNearby(true);
      else if (ev.key === "Home") this.cam.reset();
      else if (ev.key === "F3") { ev.preventDefault(); this.debugOn = !this.debugOn; this.conn.send({ t: "debug", on: this.debugOn }); document.getElementById("debug-win")!.hidden = !this.debugOn; }
      else if (ev.key === "Escape") { this.dialog.close(); this.targetId = null; }
    });
  }

  private setMouse(ev: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(ev.clientX - r.left, ev.clientY - r.top);
  }

  private pick(): Ent | null {
    const cam = this.cam.camera;
    let best: Ent | null = null, bestD = Infinity;
    for (const e of this.ents.values()) {
      if (e.dead || e.id === this.selfId || e.kind === "p") continue;
      const [fx, fy] = project(tmpA.copy(e.pos), cam, this.width, this.height);
      const [, hy] = project(tmpB.copy(e.pos).addScaledVector(UP, e.actor.height * 1.15), cam, this.width, this.height);
      const half = Math.max(14, (fy - hy) * 0.45);
      if (this.mouse.x < fx - half || this.mouse.x > fx + half || this.mouse.y < hy || this.mouse.y > fy + 6) continue;
      const d = Math.hypot(this.mouse.x - fx, this.mouse.y - (fy + hy) / 2);
      if (d < bestD) { bestD = d; best = e; }
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
    const moving = Math.hypot(e.pos.x - ox, e.pos.z - oz) > dt * 0.8;
    if (moving) e.actor.heading = headingOf(e.pos.x - ox, e.pos.z - oz);
    else if (latest.st === EntState.Attack || latest.st === EntState.Cast) e.actor.heading = latest.h;
    if (!e.dead) e.actor.setBase(moving ? "walk" : "idle", e.msPerCell);
  }

  frame(dt: number) {
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length > 600) this.frameTimes.shift();
    const dtMs = dt * 1000;
    const renderT = this.conn.serverNow() - INTERP_MS;
    const now = performance.now();
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
        if (e.state === EntState.Attack) e.actor.play("attack", { durationMs: e.kind === "m" ? 560 : 340 });
        if (e.state === EntState.Dead && !e.dead) this.die(e);
        if (prevState === EntState.Dead && e.state !== EntState.Dead) { e.dead = false; e.actor.revive(); e.label?.el.classList.remove("tag-dead"); }
      }
      e.actor.root.position.copy(e.pos);
      // Melee monsters stack in one cell on the server; nudge each a little,
      // always the same way for the same monster, so a pile reads as a pile.
      if (e.kind === "m") {
        const a = e.id * 2.39996, r = 0.12 + (e.id % 7) * 0.035;
        e.actor.root.position.x += Math.cos(a) * r;
        e.actor.root.position.z += Math.sin(a) * r;
      }
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
      e.label?.place(tmpA.copy(e.pos).addScaledVector(UP, e.actor.height + 0.35), cam, this.width, this.height);
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

    // Cursor feedback.
    const hover = this.pick();
    this.hoverId = hover?.id ?? null;
    this.renderer.domElement.style.cursor = hover ? (hover.kind === "m" ? "crosshair" : "help") : "pointer";
    const gp = hover ? null : this.groundPoint();
    this.hoverMarker.visible = !!gp && !!this.grid;
    if (gp && this.grid) {
      const cx = Math.floor(gp.x), cz = Math.floor(gp.z);
      this.hoverMarker.position.set(cx + 0.5, 0.06, cz + 0.5);
      (this.hoverMarker.material as THREE.MeshBasicMaterial).color.set(this.grid.walkable(cx, cz) ? 0xffffff : 0xff6060);
    }
    const target = this.targetId !== null ? this.ents.get(this.targetId) : undefined;
    this.targetMarker.visible = !!target;
    if (target) { this.targetMarker.position.set(target.pos.x, 0.06, target.pos.z); this.targetMarker.scale.setScalar(1.6 + Math.sin(now / 150) * 0.12); }
    this.clickAge = Math.min(1, this.clickAge + dt * 1.8);
    this.clickMarker.visible = this.clickAge < 1;
    this.clickMarker.scale.setScalar(1 + this.clickAge);
    (this.clickMarker.material as THREE.MeshBasicMaterial).opacity = 1 - this.clickAge;

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
