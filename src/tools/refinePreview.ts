import "../fonts.css";
import "../ui/theme.css";
import { loadContent } from "../data/content";
import type { ItemDef } from "../data/schema";
import { DOLL_ANIMS, loadPaperDoll, renderWayfarerPose } from "../render/paperDoll";
import type { AnimName } from "../render/spriteDef";
import { paintedItem } from "../ui/art";
import { RARITY_LETTER, SLOT_LABEL, kindLabel } from "../ui/gear";

// Refine glow preview (ITEM_ART.md §2.2, N-age style): every refinable gear
// type's icon at +0..+10, live (the pulse and twinkles move), in any rarity,
// and the Wayfarer holding each job's weapon at +0..+10 (the glow players
// see on characters). Sample data only; nothing touches the server.

const c = await loadContent();
const kit = await loadPaperDoll();
const app = document.getElementById("app")!;
const LEVELS = Array.from({ length: 11 }, (_, i) => i);
let rarity = "normal";

const style = document.createElement("style");
style.textContent = `
body{margin:0;background:#17130e;color:#eadcb8;font:14px var(--ui-font-body)}
#app{max-width:1280px;margin:0 auto;padding:16px}
h1{font:600 28px var(--ui-font-title);color:#f1e2bf;margin:6px 0}h2{font:600 20px var(--ui-font-title);color:#e9c47c;margin:22px 0 8px}
p.note{color:#bfa77c;margin:4px 0 10px;font-size:13px}
.bar{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.bar button{font:inherit;padding:5px 12px;border:1px solid #6e5432;border-radius:3px;background:#2c241c;color:#e9d9b6;cursor:pointer}
.bar button.on{background:linear-gradient(#b9864a,#8a5f2f);color:#fff7e4;border-color:#d8a964}
.grid{display:grid;grid-template-columns:150px repeat(11,58px);gap:8px 6px;align-items:center;overflow-x:auto;padding-bottom:6px}
.grid .head{color:#bfa77c;font-size:12px;text-align:center}.grid .label{font-size:12px;line-height:1.25}.grid .label small{display:block;color:#9c8662}
.grid .item-cell{width:58px;height:58px}
.dolls{display:grid;grid-template-columns:120px repeat(11,minmax(80px,1fr));gap:6px;align-items:end;overflow-x:auto}
.dolls canvas{width:100%;max-width:110px;aspect-ratio:1;background:radial-gradient(circle at 50% 70%,#3a4a35,#1d2419 70%);border:1px solid #4b3d29;border-radius:3px}
.dolls .head{color:#bfa77c;font-size:12px;text-align:center}
`;
document.head.append(style);

// One base per refinable type: weapons per job, and each armour kind per slot, at item level 30.
const bases: ItemDef[] = [];
const seen = new Set<string>();
for (const it of c.items.values()) {
  const e = it.equip;
  if (!e || !it.drop_pool || e.unique || !["weapon", "head", "armor", "gloves", "boots"].includes(e.slot) || e.item_level !== 30) continue;
  const key = e.slot + ":" + (e.slot === "weapon" ? e.job : e.kind);
  if (seen.has(key)) continue;
  seen.add(key);
  bases.push(it);
}
const ORDER = ["weapon", "head", "armor", "gloves", "boots"];
bases.sort((a, b) => ORDER.indexOf(a.equip!.slot) - ORDER.indexOf(b.equip!.slot) || (a.equip!.job ?? a.equip!.kind ?? "").localeCompare(b.equip!.job ?? b.equip!.kind ?? ""));

const iconGrid = document.createElement("div");
iconGrid.className = "grid";
function drawIcons() {
  iconGrid.replaceChildren();
  iconGrid.append(Object.assign(document.createElement("div"), { className: "head" }), ...LEVELS.map((n) => Object.assign(document.createElement("div"), { className: "head", textContent: n ? "+" + n : "+0" })));
  for (const it of bases) {
    const label = document.createElement("div");
    label.className = "label";
    label.innerHTML = `${it.name}<small>${it.equip!.slot === "weapon" ? SLOT_LABEL.weapon + " · " + it.equip!.job : kindLabel(it)}</small>`;
    iconGrid.append(label);
    for (const n of LEVELS) {
      const cell = document.createElement("div");
      cell.className = "item-cell rarity-" + rarity;
      cell.style.position = "relative";
      cell.append(paintedItem(it, rarity, n));
      const q = document.createElement("span");
      q.className = "item-quantity";
      q.textContent = n ? "+" + n : "";
      if (RARITY_LETTER[rarity]) { const b = document.createElement("b"); b.className = "rarity-letter rarity-" + rarity; b.textContent = RARITY_LETTER[rarity]; q.append(b); }
      cell.append(q);
      iconGrid.append(cell);
    }
  }
}

const bar = document.createElement("div");
bar.className = "bar";
for (const r of ["normal", "magic", "rare", "unique"]) {
  const b = document.createElement("button");
  b.textContent = r[0].toUpperCase() + r.slice(1);
  b.className = r === rarity ? "on" : "";
  b.onclick = () => { rarity = r; [...bar.children].forEach((x) => x.classList.toggle("on", x === b)); drawIcons(); };
  bar.append(b);
}

// The Wayfarer with each job's weapon at every level.
const weaponLooks = new Map<string, string>(); // visual -> item id
for (const [id, look] of Object.entries(kit.items)) if (look.slot === "weapon" && look.visual && !weaponLooks.has(look.visual)) weaponLooks.set(look.visual, id);
const dolls = document.createElement("div");
dolls.className = "dolls";
const canvases: { canvas: HTMLCanvasElement; gear: string[] }[] = [];
let anim: AnimName = "idle";
dolls.append(Object.assign(document.createElement("div"), { className: "head" }), ...LEVELS.map((n) => Object.assign(document.createElement("div"), { className: "head", textContent: "+" + n })));
for (const [visual, id] of weaponLooks) {
  const label = document.createElement("div");
  label.className = "head";
  label.style.textAlign = "left";
  label.textContent = kit.items[id].name ?? visual;
  dolls.append(label);
  for (const n of LEVELS) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = kit.rig.frame;
    dolls.append(canvas);
    canvases.push({ canvas, gear: [n ? `${id}+${n}` : id] });
  }
}
const animBar = document.createElement("div");
animBar.className = "bar";
for (const [a, th] of [["idle", "ยืน"], ["walk", "เดิน"], ["attack", "โจมตี"]] as const) {
  const b = document.createElement("button");
  b.textContent = th;
  b.className = a === anim ? "on" : "";
  b.onclick = () => { anim = a; [...animBar.children].forEach((x) => x.classList.toggle("on", x === b)); };
  animBar.append(b);
}
let start = performance.now();
function tick(now: number) {
  const spec = DOLL_ANIMS[anim]!;
  const frame = Math.floor(((now - start) / 1000) * spec.fps) % spec.frames;
  for (const { canvas, gear } of canvases) {
    const g = canvas.getContext("2d")!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    renderWayfarerPose(g, kit, kit.rig.facings.SW ?? kit.rig.facings.S ?? "front", gear, anim, frame);
  }
  requestAnimationFrame(tick);
}

const title = (tag: string, text: string) => Object.assign(document.createElement(tag), { textContent: text });
const note = (text: string) => Object.assign(document.createElement("p"), { className: "note", textContent: text });
app.append(
  title("h1", "แสงตีบวก (แบบ N-age)"),
  note("ตัวอย่างจากข้อมูลจริงของเกม: ไอเทมทุกชนิดที่ตีบวกได้ (item level 30) ตั้งแต่ +0 ถึง +10 แสงวาบและประกายขยับจริงเหมือนในเกม · ขอบช่องคือ rarity เลือกได้ด้านล่าง"),
  title("h2", "ไอคอน (กระเป๋า · Equipment · ร้าน NPC)"), bar, iconGrid,
  title("h2", "บนตัวละคร (อาวุธเรืองแสง ผู้เล่นคนอื่นเห็นด้วย · ชุดเกราะเรืองเฉพาะบนไอคอน)"), animBar, dolls,
);
drawIcons();
requestAnimationFrame(tick);
(window as unknown as { refineReady: boolean }).refineReady = true;
