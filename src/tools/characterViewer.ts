// Character viewer for the art team: try outfits on the Wayfarer paper doll,
// play every animation in all five drawn facings, see the rest pose with its
// pivots, and list part files that are still missing. Reload picks up new
// PNGs without restarting anything.

import { bakeWayfarer, loadPaperDoll, renderWayfarerPose, type PaperDollKit } from "../render/paperDoll";
import type { AnimName, SpriteDef } from "../render/spriteDef";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const ROW_NAMES = ["S — ภาพหน้า", "SW — ใช้ภาพข้าง", "W — ภาพข้าง", "NW — ใช้ภาพข้าง", "N — ภาพหลัง"];
const ANIM_TH: Record<AnimName, string> = { idle: "ยืน (idle)", walk: "เดิน (walk)", attack: "โจมตีตามอาวุธ", shoot: "เล็ง / ดึงสาย / ยิงธนู", cast: "รวบรวมพลัง / ร่ายเวท", hit: "โดนตี (hit)", death: "ตาย (death)" };

let kit: PaperDollKit;
let sprite: SpriteDef;
const chosen = new Map<string, string>(); // slot -> item id

async function load(bust = "") {
  kit = await loadPaperDoll("/sprites/wayfarer/", bust);
}

function buildControls() {
  const slots = new Map<string, [string, string][]>();
  for (const [id, it] of Object.entries(kit.items)) slots.set(it.slot, [...(slots.get(it.slot) ?? []), [id, it.name]]);
  const box = $("slots");
  box.replaceChildren();
  for (const [slot, list] of slots) {
    const sel = document.createElement("select");
    sel.append(new Option(`${slot}: (ไม่ใส่)`, ""));
    for (const [id, name] of list) sel.append(new Option(`${slot}: ${name}`, id));
    sel.value = chosen.get(slot) ?? "";
    sel.setAttribute("aria-label", slot);
    sel.onchange = () => { if (sel.value) chosen.set(slot, sel.value); else chosen.delete(slot); rebake(); };
    const row = document.createElement("div");
    row.className = "row";
    row.append(sel);
    box.append(row);
  }
  const anim = $<HTMLSelectElement>("anim");
  if (!anim.options.length) for (const [a, th] of Object.entries(ANIM_TH)) anim.append(new Option(th, a));
}

function listMissing() {
  const want: string[] = [];
  for (const [view, v] of Object.entries(kit.rig.views)) {
    for (const part of Object.keys(v.parts)) want.push(`base/${view}/${part}.png`);
    for (const [part, variants] of Object.entries(kit.rig.variants ?? {})) for (const variant of variants) want.push(`base/${view}/${part}_${variant}.png`);
    for (const it of Object.values(kit.items)) for (const layer of it.layers) want.push(`items/${it.visual}/${view}/${layer}.png`);
  }
  want.push(...kit.rig.effects ?? []);
  const missing = want.filter((f) => !kit.img.has(f));
  const el = $("missing");
  el.className = missing.length ? "" : "ok";
  el.textContent = missing.length ? missing.join("\n") : `ครบทั้ง ${want.length} ไฟล์`;
}

const animCells: HTMLCanvasElement[] = [];
const restCells: HTMLCanvasElement[] = [];

function rebake() {
  // Same order as the server's GearOrder, so the viewer stacks layers like the game.
  const order = ["weapon", "armor", "boots", "head", "gloves"];
  const rank = (slot: string) => (order.includes(slot) ? order.indexOf(slot) : order.length);
  const gear = [...chosen.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([, id]) => id);
  sprite = bakeWayfarer(kit, gear);
  drawRest(gear);
}

function setup() {
  const animBox = $("anim-cells");
  animBox.replaceChildren();
  animCells.length = 0;
  ROW_NAMES.forEach((name) => {
    const c = document.createElement("canvas");
    c.width = c.height = kit.rig.frame;
    const fig = document.createElement("figure");
    const cap = document.createElement("figcaption");
    cap.textContent = name;
    fig.append(c, cap);
    animBox.append(fig);
    animCells.push(c);
  });
  const restBox = $("rest-cells");
  restBox.replaceChildren();
  restCells.length = 0;
  for (const view of Object.keys(kit.rig.views)) {
    const c = document.createElement("canvas");
    c.width = c.height = kit.rig.canvas / 2;
    const fig = document.createElement("figure");
    const cap = document.createElement("figcaption");
    cap.textContent = view;
    fig.append(c, cap);
    restBox.append(fig);
    restCells.push(c);
  }
}

function drawRest(gear: string[]) {
  const views = Object.keys(kit.rig.views);
  views.forEach((view, i) => {
    const c = restCells[i];
    const g = c.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    const joints=renderWayfarerPose(g,kit,view,gear);
    g.setTransform(1,0,0,1,0,0);
    g.strokeStyle = "#d24"; g.beginPath(); g.moveTo(0, kit.rig.feet[1]/2); g.lineTo(kit.rig.canvas/2, kit.rig.feet[1]/2); g.stroke();
    if ($<HTMLInputElement>("pivots").checked) {
      g.font = "10px system-ui";
      for (const [name, pt] of Object.entries(joints)) {
        g.fillStyle = "#e33"; g.beginPath(); g.arc(pt[0], pt[1], 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#fbb"; g.fillText(name, pt[0] + 5, pt[1] - 3);
      }
    }
  });
}

let t0 = performance.now();
function tick(now: number) {
  const anim = $<HTMLSelectElement>("anim").value as AnimName;
  const sheet = sprite.sheets[anim]!;
  const { frames, fps, loop } = sheet.def;
  const speed = $<HTMLInputElement>("slow").checked ? 0.25 : 1;
  const len = (frames / fps) * 1000;
  const el = (now - t0) * speed;
  // One-shot clips replay after a short pause so they can be watched again.
  const slider=$<HTMLInputElement>("frame");slider.max=String(frames-1);
  const f = $<HTMLInputElement>("paused").checked ? Math.min(frames-1,Number(slider.value)) : loop ? Math.floor((el / 1000) * fps) % frames : Math.min(frames - 1, Math.floor(((el % (len + 700)) / 1000) * fps));
  $("frame-number").textContent=`${f+1} / ${frames}`;
  const F = sprite.json.frame.w;
  animCells.forEach((c, row) => {
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, F, F);
    g.drawImage(sheet.image, f * F, row * F, F, F, 0, 0, F, F);
  });
  requestAnimationFrame(tick);
}

async function main() {
  await load();
  buildControls();
  setup();
  listMissing();
  rebake();
  document.querySelectorAll<HTMLButtonElement>("[data-outfit]").forEach((button) => {
    button.onclick = () => {
      chosen.clear();
      const weapon = button.dataset.outfit;
      if (weapon && weapon !== "base") {
        chosen.set("boots", "itm_0078");
        chosen.set("armor", "itm_0079");
        chosen.set("weapon", weapon);
      }
      buildControls();
      rebake();
      $<HTMLSelectElement>("anim").value="idle";
      $<HTMLInputElement>("paused").checked=false;
      t0=performance.now();
    };
  });
  $("anim").onchange = () => { t0 = performance.now(); };
  for(const [button,weapon,anim]of [["try-melee","itm_0080","attack"],["try-shoot","itm_0081","shoot"],["try-cast","itm_0082","cast"]]) {
    $(button).onclick=()=>{chosen.set("weapon",weapon);buildControls();rebake();$<HTMLSelectElement>("anim").value=anim;t0=performance.now();$<HTMLInputElement>("paused").checked=false;};
  }
  $("frame").oninput=()=>{$<HTMLInputElement>("paused").checked=true;};
  $("pivots").onchange = () => rebake();
  $("reload").onclick = async () => { await load(String(Date.now())); buildControls(); setup(); listMissing(); rebake(); (window as unknown as {__wayfarer:{kit:PaperDollKit}}).__wayfarer.kit=kit; };
  requestAnimationFrame(tick);
  (window as unknown as { __wayfarer: object }).__wayfarer = {
    ready: true, kit, rebake, chosen,
    // Read-only render access for repeatable art review, not player state.
    getSprite: () => sprite,
    bake: bakeWayfarer,
    renderPose: (g: CanvasRenderingContext2D, view: string, gear: string[], anim: AnimName, frame: number) => renderWayfarerPose(g, kit, view, gear, anim, frame),
  };
}

main().catch((e) => { document.body.prepend(String(e)); console.error(e); });
