// Writes ELYNDRA_WORLD_DESIGN_BIBLE_v2.md from public/data, so every
// table in the bible is the JSON the game runs on. Narrative sections
// (changelog, untested list) are kept here and reviewed by hand.
//
//   npm run bible

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ItemDef, MapDef, MapLayout, MonsterDef, NpcDef, PlayerCurveRow, QuestDef, RecipeDef, RegionDef, ShopDef, SkillDef, SpawnZoneDef, WarpDef,
} from "../src/data/schema";
import { decodeWalk } from "../src/data/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const OUT = join(ROOT, "..", "ELYNDRA_WORLD_DESIGN_BIBLE_v2.md");
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), "utf8"));

const regions = read<RegionDef[]>("regions.json");
const maps = read<MapDef[]>("maps.json");
const monsters = read<MonsterDef[]>("monsters.json");
const items = read<ItemDef[]>("items.json");
const npcs = read<NpcDef[]>("npcs.json");
const shops = read<ShopDef[]>("shops.json");
const recipes = read<RecipeDef[]>("recipes.json");
const quests = read<QuestDef[]>("quests.json");
const zones = read<SpawnZoneDef[]>("spawn_zones.json");
const warps = read<WarpDef[]>("warps.json");
const skills = read<SkillDef[]>("skills.json");
const curve = read<PlayerCurveRow[]>("player_curve.json");

const mob = new Map(monsters.map((m) => [m.id, m]));
const item = new Map(items.map((i) => [i.id, i]));
const map = new Map(maps.map((m) => [m.id, m]));
const npc = new Map(npcs.map((n) => [n.id, n]));
const layout = (m: MapDef): MapLayout => read<MapLayout>(m.layout);
const esc = (s: string) => s.replace(/\|/g, "\\|");
const pct = (bp: number) => `${(bp / 100).toFixed(bp % 100 ? 2 : 0)}%`;
const L: string[] = [];
const p = (...lines: string[]) => L.push(...lines);
const table = (head: string[], rows: (string | number)[][]) => {
  p(`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`);
  for (const r of rows) p(`| ${r.map((c) => esc(String(c))).join(" | ")} |`);
  p("");
};

// Where each item comes from.
const sources = new Map<string, string[]>();
const add = (id: string, s: string) => sources.set(id, [...(sources.get(id) ?? []), s]);
for (const m of monsters) for (const d of m.drops) add(d.item_id, `${m.name} ${pct(d.rate_bp)}`);
for (const s of shops) for (const i of s.items) add(i.item_id, `shop ${npc.get(s.npc_id)?.name ?? s.npc_id} ${i.price}z`);
for (const q of quests) for (const i of q.rewards.items) add(i.item_id, `quest ${q.title}`);
for (const r of recipes) add(r.output.item_id, `craft @ ${npc.get(r.npc_id)?.name ?? r.npc_id}`);

const today = new Date().toISOString().slice(0, 10);

p(
  "# ELYNDRA — World Design & Content Bible v2",
  "",
  `**v2.1 · ${today} · Fantasy × Ancient Technology · Extreme Horde**`,
  "",
  "> ตารางทุกตารางในเอกสารนี้สร้างอัตโนมัติจาก `elyndra-web/public/data` ด้วย `npm run bible` จึงตรงกับ JSON ที่ server และ client ใช้จริงทุกค่า",
  "> ส่วนที่เขียนมือมีเฉพาะคำอธิบาย, Changelog และรายการที่ยังไม่ผ่านการทดสอบ",
  "> ไฟล์ v1 เก็บไว้เป็นประวัติ",
  "",
  "## สารบัญ",
  "1. โลกและเอกลักษณ์ · 2. สถานะการทดสอบ · 3. Changelog · 4. Balance Model · 5. Extreme Horde และกฎของมอน · 6. ภูมิภาค (เริ่มด้วยตาราง **มอนอยู่แผนที่ไหน**) · 7. มอนสเตอร์ · 8. ไอเทมและแหล่งที่มา · 9. Warp · 10. Skill · 11. Player Curve",
  "",
  "## 1. โลกและเอกลักษณ์",
  "",
  "**ELYNDRA: Chronicles of the Shattered Veil** อารยธรรม Aethrion ใช้ผลึก Aetherite ขับเคลื่อนเครือข่าย Meridian Lattice จนเกิด The Sundering ทำให้เครื่องจักรโบราณทำงานผิดปกติ ผู้เล่นเป็นนักสำรวจของ Wayfarer Guild",
  "",
  "**ภาพลักษณ์:** หินแกะสลัก ทองเหลือง เฟือง และผลึกสีฟ้าเขียว พืชกับเครื่องจักรผสานกัน มุมกล้อง 2.5D ตัวละคร 2D sprite บนฉาก 3D แนว stylized",
  "",
  "**ชื่อ:** ELYNDRA ใช้เป็นชื่อเกม, repository, client (`elyndra-web`) และ server (`elyndra-server`) ส่วนรหัสภูมิภาค (`lum`, `ver`, …) ใช้เฉพาะภายในเกม เช่น `lum_town_01`",
  "",
);

p(
  "## 2. สถานะการทดสอบ (อ่านก่อน)",
  "",
  "### ทดสอบจริงแล้ว",
  "- **Validator** (`npm run validate:data`): critical 0 · error 0 · warning 0 กับข้อมูลทั้ง 7 ภูมิภาค มี test 12 ชุดที่ใส่ข้อมูลผิดโดยเจตนา (warp ทับกัน, NPC เรียงแถว, ไอเทมไม่มีที่มา, มอนสเตอร์ไม่ spawn, สเตตัสก๊อปปี้, arbitrage ฯลฯ) เพื่อยืนยันว่าจับได้จริง และคืน exit code ที่ถูกต้อง",
  "- **Lumeris end-to-end** ใน Chrome จริงกับ server จริง: login ที่ Avelorn → รับเควสต์จาก Registrar → warp ไป Dawnmeadow → ฆ่า Mosskin 30 ตัว (~90 วินาที ที่ Lv1) → เก็บของอัตโนมัติ → warp กลับ → ส่งเควสต์ (Lv1 → Lv2) → reload แล้ว login ใหม่ → inventory, zeny และ level ตรงกันทุกค่า ไม่มี console error",
  "- **Server tests** (Go): spawn director เติม Dawnmeadow ครบ 130 ตัวบนช่องที่ถูกต้อง",
  "  - AoE ตีได้สูงสุด 50 เป้าหมายพอดี จาก 90 ตัวในระยะ เรียงตามระยะแล้วตาม id ไม่มีใครโดนซ้ำ",
  "  - kill และ EXP เกิดครั้งเดียว, pickup ซ้ำด้วย request id เดิมไม่ได้ของเพิ่ม และคนที่ไม่ใช่เจ้าของเก็บไม่ได้",
  "  - warp Avelorn ⇄ Dawnmeadow ด้วย goroutine จริง, ส่งเควสต์ซ้ำไม่ได้รางวัลซ้ำ",
  "  - ร้านค้า/ขาย/คราฟต์/สวมใส่/transit ทำงาน และปฏิเสธเมื่อเงินไม่พอหรืออยู่ไกล NPC",
  "  - horde ไล่ผู้เล่น 20 วินาที: มอนระยะประชิดทั้ง 41 ตัวกองรวมในช่องเดียวกับผู้เล่น และตัวนับมอนต่อช่องไม่รั่ว (`TestHordeChaseStacks`)",
  "- **Validator กฎหนึ่งชนิดหนึ่งแผนที่** (`spawn.one_map`): ทดสอบโดยใส่ Mosskin ซ้ำลง Amber Trail แล้ว validator แจ้ง error ตามที่ควร",
  "- **Benchmark** 36 สถานการณ์ (1/2/5/10 ผู้เล่น × มอน 80/130/150 ตัว × ไล่ 10/30/60 ตัว) ผลเต็มอยู่ใน `elyndra-server/docs/BENCHMARK_lum_fld_01.md`",
  "  - tick p95 ≤ 2.51 ms, max ≤ 8.37 ms จากงบ 50 ms ไม่มี tick ไหนเกินงบ",
  "  - bandwidth 2.3–8.0 KB/s ต่อผู้เล่น",
  "  - AoE ถึง 41–47 เป้าหมายเมื่อลากมอน 60 ตัว",
  "- **Network** ด้วย bot 10 ตัวผ่าน WebSocket จริง: 4.9 KB/s ต่อ client, snapshot ทุก 100 ms (p95 100.4 ms), RTT < 0.5 ms บน localhost",
  "- **Browser stress** ใน headless Chrome บน RTX 4060 (D3D11) ลากมอน Lv20 ใน Dawnmeadow: เห็นมอนพร้อมกันสูงสุด 39 ตัว, frame time p95 ≤ 0.6 ms (เวลา CPU ต่อเฟรม), draw calls ≤ 36, JS heap 18–26 MB",
  "",
  "### ยังไม่ผ่านการทดสอบ / ข้อจำกัดที่รู้แล้ว",
  "1. **แผนที่ Lumeris อื่นนอกจาก Avelorn และ Dawnmeadow**: Validator และ server ตรวจแล้ว (warp, ระยะทางเดิน, spawn, NPC) แต่ยังไม่มีใครเดินเล่นจริงใน Amber Trail → Hollowroot, ยังไม่ได้สู้บอส Hollowroot Warden และยังไม่ได้เล่นเควสต์ 2–8 ผ่าน client",
  "2. **อีก 6 ภูมิภาค**: ผ่าน Validator ครบ (layout, warp, spawn, level, NPC, item acquisition, balance model) แต่ยังไม่ได้เปิดเล่น ตัวเลขผ่านแค่การตรวจด้วยโมเดล ยังไม่ได้ playtest",
  "3. **ความจุต่อ instance**: ผู้เล่น 5–10 คนที่ฟาร์มด้วย AoE เต็มที่ใน field เดียว (300–430 kills/นาที) ทำให้ประชากรเฉลี่ยลดเหลือ ~44–90 ตัว และต่ำกว่า min_alive อยู่ 19–91% ของเวลา (ดูตาราง benchmark) ต้องตัดสินใจเรื่อง channel หรือเพดานผู้เล่นต่อ instance (Spec §14)",
  "4. **Job**: ตอนนี้เล่นได้แค่ Vanguard (Cleaving Arc, Iron Cyclone, Anchor Shout) และ Sundering Pulse ส่วน Arcanist, Strider, Machinist มีเฉพาะข้อมูล `implemented: false` และยังไม่มีระบบเลือก job",
  "5. **Art**: Mosskin เป็น sprite จริงตัวเดียว แต่ 8 ทิศเป็นภาพมุมหน้า copy/mirror อีก 93 มอนสเตอร์ใช้ Mosskin ย้อมสีตาม element ผู้เล่นและ NPC เป็น sprite ที่วาดด้วยโค้ด ฉากเป็น low-poly ที่สร้างจาก layout ยังไม่ใช่ `.glb` production",
  "6. **ความปลอดภัย**: login ด้วยชื่ออย่างเดียว ไม่มีรหัสผ่านหรือ token, ไม่มี TLS, rate limit เป็น token bucket แบบง่าย",
  "7. **Persistence**: ใช้ SQLite ไม่ใช่ PostgreSQL ตาม Spec schema เขียนเป็น SQL ธรรมดาเพื่อย้ายได้ แต่ยังไม่ได้ย้ายหรือทดสอบบน PostgreSQL",
  "8. **Party/loot**: ยังไม่มีระบบ party EXP แบ่งตามสัดส่วน damage ส่วน loot เป็น personal ให้คนที่ทำ damage สูงสุด",
  "9. **Prediction**: client ทำ prediction แค่การเดินของตัวเอง (A* เดียวกับ server) แล้ว reconcile เมื่อคลาดเกิน 2.5 ช่อง การโจมตีและสกิลรอยืนยันจาก server ยังไม่ได้ทดสอบบนเน็ตที่มี latency สูง",
  "10. **FPS บนจอจริงและเครื่องสเปกต่ำ**: ยังไม่ได้วัด ผล stress ข้างบนวัดใน headless Chrome บน GPU แรง",
  "11. **ผู้เล่น 2 คนเห็นกันใน client**: ทดสอบผ่าน bot และ Go test แล้ว แต่ยังไม่ได้เปิด client 2 หน้าต่างดูด้วยตา",
  "",
);

p(
  "## 3. Changelog",
  "",
  "### v2.0 → v2.1 (" + today + ")",
  "- **มอนหนึ่งชนิดอยู่แผนที่เดียว**: เดิม 71 จาก 94 ชนิดออกซ้ำ 2–3 แผนที่ ตอนนี้ทุกชนิดมีแผนที่บ้านแผนที่เดียว (ตารางต้นหัวข้อ 6) เลือกตามเควสต์ที่ผูกมอนกับแผนที่ก่อน แล้วจึงตามเลเวล ตำแหน่ง ขนาด และจำนวนของ pocket เดิมไม่เปลี่ยน เปลี่ยนเฉพาะชนิดมอนและข้อความที่อ้างถึง Validator ตรวจด้วยกฎ `spawn.one_map`",
  "- **ลากมอนได้ทั้งแผนที่**: เลิกใช้ leash 35 ช่อง มอนไล่ไม่จำกัดระยะจนกว่าเป้าหมายตาย ออกจากแผนที่ หรือเข้าแคมป์ (`elyndra-server/internal/game/ai.go`) ค่า `leash_radius` ในข้อมูลยังอยู่ แต่เซิร์ฟเวอร์ไม่ใช้ตอนไล่แล้ว",
  "- **มอนระยะประชิดกองรวมจุดเดียว**: มอนที่ระยะโจมตี ≤ 1.5 ช่องเดินเข้าช่องเดียวกับผู้เล่นโดยไม่สนว่าช่องเต็ม ฝูงที่ลากมาจึงรวมเป็นกองเดียวให้ AoE โดนทั้งหมด มอนระยะไกลยังรักษาระยะเหมือนเดิม ฝั่ง client เลื่อนตำแหน่งวาดแต่ละตัวไม่เกิน 0.35 ช่องให้เห็นเป็นกอง",
  "- **Pocket ที่เปลี่ยนจาก elite เป็นมอนฝูง** 3 จุด (Old Pump House, Executor Court, Executor Walk) เพิ่มจำนวนเป็น 25–30 ตัว respawn 7–16 วินาที",
  "- **กล้องล็อกมุม 50°** สำหรับตัวละคร 2D หมุนและเอียงไม่ได้ ซูมได้ (`?freecam` ใน URL ปลดล็อกสำหรับ debug)",
  "- **ปุ่มลัดใช้กับแป้นภาษาไทยได้**: อ่านตำแหน่งปุ่ม (`KeyboardEvent.code`) แทนตัวอักษร ปุ่ม 1–4 สกิล, 5–7 ยา, I กระเป๋า, Z เก็บของ, รวม numpad",
  "",
  "### v1 → v2",
  "",
  "### ข้อมูลที่แก้ (ปัญหาที่ตรวจพบใน v1)",
  "- **Warp**: v1 ทั้ง 100 จุดใช้ trigger `[120,60,4,8]` และ spawn point `[8,64]` เดียวกัน ตอนนี้แต่ละ link เป็นคู่สองทาง มี trigger คนละขอบแผนที่ และจุดลงอยู่ในแคมป์ปลอดภัยห่าง trigger อย่างน้อย 7 ช่อง",
  "- **Spawn**: v1 วนชื่อมอนสเตอร์และใช้ rect 3 แบบเดิมทุกแผนที่ ตอนนี้แต่ละแผนที่มี pocket ของตัวเอง 3–4 จุดตามภูมิประเทศ รวม 110–130 ตัวต่อ field ตาม Extreme Horde เลเวลมอนอยู่ในช่วงของแผนที่ ±2 (elite/boss ±4)",
  "- **Level**: Lumeris เดิมมีแผนที่ถึง Lv28 เกินช่วง 1–20 ของภูมิภาค ตอนนี้ไล่ 1–4 → 3–7 → 5–9 → 8–12 → 11–15 → 14–18 → dungeon 17–20",
  "- **Rotroot และ Barkwarden** ที่ไม่เคย spawn ใน v1 อยู่ใน Broken Orchard และ Hollowroot Cavern แล้ว",
  "- **ไอเทม 12 ชิ้นที่ไม่มีที่มาใน v1** มีที่มาครบ: อุปกรณ์ได้จากคราฟต์, ยาได้จากร้าน, Guild Pass ได้จากเควสต์, Aetherite Shard และ Copper Gear ได้จาก Craglet/Barkwarden",
  "- **NPC**: v1 วาง 35 ตัวเป็นแถวเดียวที่ y=42 ตอนนี้แต่ละเมืองมีผังเป็นของตัวเอง มี NPC ประจำแคมป์ทุก field และ dungeon",
  "- **ตัวเลข**: v1 ใช้ move speed 220 ทุกตัว, ราคา 30 ทุกชิ้นที่ไม่ใช่วัตถุดิบ, เมืองทุกเมืองแนะนำ Lv0–9 ตอนนี้ทุกค่ามาจาก Balance Model (หัวข้อ 4) ปรับต่อตัวพร้อมเหตุผล",
  "",
  "### เพิ่มใหม่",
  "- มอนสเตอร์ใหม่ 59 ตัว (รวม 94) ทุกภูมิภาคมี 13–14 ตัว มีบอส 1 ตัวต่อ dungeon และ elite ในบางภูมิภาค",
  "- ไอเทมใหม่ 120 ชิ้น (รวม 203): วัตถุดิบประจำมอนสเตอร์, rare ประจำภูมิภาค, ไอเทมเควสต์สำหรับเข้า dungeon",
  "- เควสต์ chain 7–8 เควสต์ต่อภูมิภาค (รวม " + quests.length + "), ร้านค้า " + shops.length + " ร้าน, สูตรคราฟต์ " + recipes.length + " สูตร, บทพูดของ NPC ทุกตัว",
  "- ไฟล์ใหม่: `spawn_zones.json` (แทน `spawns.json`), `shops.json`, `recipes.json`, `dialogues.json`, `skills.json`, `player_curve.json`, `maps/<id>.json` (layout + walk grid)",
  "",
  "### เปลี่ยนชื่อ id",
  "- ร้านค้า `shop_<rid>` บางร้านเป็น `shop_<rid>_supply`",
  "- family ของมอนสเตอร์ที่เคยเป็น `wildlife` ระบุละเอียดขึ้น โดย id, ชื่อ และเลเวลเดิมของ seed คงไว้ทุกตัว",
  "",
);

p(
  "## 4. Balance Model",
  "",
  "ตัวเลขทุกค่าคำนวณจาก `elyndra-web/content/model.ts` อิงผู้เล่นอ้างอิงหนึ่งคน (Vanguard ไม่สวมอุปกรณ์) แล้วปรับรายตัวด้วย `mods` ที่มีเหตุผลเขียนกำกับในไฟล์ภูมิภาค Validator ตรวจซ้ำกับเป้าหมายเดียวกันแยกอิสระ",
  "",
  "**ผู้เล่นที่ Lv L**",
  "- HP = 120 + 26(L−1) + 0.9(L−1)²",
  "- ATK = 18 + 4.2(L−1) + 0.045(L−1)²",
  "- DEF = 5 + 1.6(L−1)",
  "- SP = 60 + 5(L−1)",
  "",
  "**Archetype ของมอนสเตอร์** (สร้างเทียบกับผู้เล่นเลเวลเดียวกัน)",
  "",
);
table(["Archetype", "จำนวน basic hit ที่ใช้ฆ่า", "DEF (×ATK ผู้เล่น)", "1 hit = % HP ผู้เล่น", "Attack ms", "Move ms/ช่อง", "EXP ×"], [
  ["swarm", 3.2, 0.1, "1.2%", 1600, 260, 1], ["ranged", 2.6, 0.08, "2%", 1800, 280, 1], ["support", 3.6, 0.1, "0.9%", 2200, 280, 1.15],
  ["bruiser", 7, 0.15, "3.5%", 2000, 300, 2.3], ["construct", 6.5, 0.25, "2.8%", 1900, 340, 2.2], ["elite", 18, 0.2, "6%", 1500, 240, 6.5], ["boss", 120, 0.25, "10%", 1400, 260, 45],
]);
p(
  "**ทำไม swarm ตีเบา**",
  "- รอบตัวผู้เล่นมีมอนยืนได้ 8 ช่อง",
  "- 8 ตัว × 1.2% ทุก 1.6 วินาที ≈ 6% HP ต่อวินาที อยู่รอดได้ช่วง 4–6 วินาทีที่ใช้ AoE กวาด pack",
  "- Cleaving Arc (1.7×) และ Iron Cyclone (2.4×) กำจัด swarm ได้ในประมาณ 2 cast",
  "",
  "**จังหวะเลเวล**",
  "- เวลาต่อเลเวล = 1.2 + 0.36L นาที",
  "- ความเร็วฆ่า = min(70, 25 + 3L) ตัวต่อนาที",
  "- EXP ของ swarm ที่ Lv L = 4 + 2.2·L^1.3",
  "- exp_to_next(L) = เวลาต่อเลเวล × ความเร็วฆ่า × EXP swarm รวมทั้งหมดถึง Lv99 ประมาณ 31 ชั่วโมงของการฟาร์ม",
  "",
  "**อัตราดรอปแบบ horde**",
  "- common 18%, uncommon 4.5%, rare 0.25%",
  "- อัตราเดิม 65% กับการฆ่า 60 ตัวต่อนาทีจะได้วัตถุดิบ 40 ชิ้นต่อนาทีจนเศรษฐกิจพัง",
  "- ราคาขาย common = 2 + 0.9L, uncommon ×4.5, rare ×40",
  "- รายได้จากขายของทั้งหมดใน 1 ชั่วโมง ≈ 1,700 × ราคา common",
  "- ราคาร้านค้า × (1 + Lv เริ่มต้นของภูมิภาค/12) และ Validator ตรวจ arbitrage",
  "",
  "**เปลี่ยนจาก Spec**: Spec §7 เสนอ Mosskin ดรอป Moss Fiber 65% และ Dew Pearl 1% ซึ่งเป็น prototype ตอนนี้ใช้ 18% และ 0.25% ตามเหตุผลด้านเศรษฐกิจข้างบน",
  "",
);

p(
  "## 5. Extreme Horde (implementation)",
  "",
  "**Server**: `elyndra-server` (Go 1.27) แต่ละ map instance เป็น goroutine ของตัวเอง tick 20 Hz (50 ms) snapshot 10 Hz",
  "- **Spatial hash** สำหรับ AoE และ interest management (ส่งเฉพาะ entity ในรัศมี 30 ช่อง และส่งแค่ส่วนที่เปลี่ยน)",
  "- **Flow field** ต่อผู้เล่นที่ถูกไล่ (Dijkstra รัศมี 40 ช่อง) ทำให้มอน 60 ตัวไม่ต้องคำนวณ A* แยกกัน",
  "- **กองมอน (stacking)**: มอนระยะประชิด (ระยะโจมตี ≤ `StackRange` 1.5) เดินเข้าช่องของผู้เล่นและกองรวมกัน ไม่จำกัดจำนวนต่อช่อง ส่วนมอนระยะไกลยังจองช่อง (ไม่เกิน 2 ตัวต่อช่อง และช่องที่มีมอนแล้วมี penalty)",
  "- **AI**: IDLE → CHASE → ATTACK → RETURN ไล่ได้ทั้งแผนที่ (ไม่มี leash) กลับบ้านเมื่อเป้าหมายตาย ออกจากแผนที่ หรือเข้าแคมป์ ความถี่การตัดสินใจขึ้นกับระยะ: 10 Hz ภายใน 12 ช่อง, 5 Hz ถึง 30 ช่อง, 1–2 Hz ไกลกว่านั้น แคมป์เป็นกำแพงสำหรับมอน",
  "- **AoE**: query → กรองตามรูปทรง → เรียงตามระยะแล้วตาม id → ตัดที่ `max_targets` (สูงสุด 50) ใช้ HP ครั้งเดียวต่อ hit การตายและรางวัลเป็น idempotent",
  "- **Spawn director**: รักษา target ของแต่ละ pocket ด้วย respawn queue + jitter 2–8 วินาที, ห่างผู้เล่น ≥6 ช่อง, ห้ามเกิดในแคมป์ ถ้าต่ำกว่า min_alive จะดึง respawn ให้เร็วขึ้น",
  "- **Loot**: personal loot รวมกองในรัศมี 1.5 ช่อง, pickup ใช้ request id + transaction ใน SQLite จึงไม่ซ้ำ",
  "- **Debug overlay (F3)**: tick p50/p95/max, จำนวนมอน, กำลังไล่, ต่อ pocket แสดง alive/pending/target/fail",
  "",
  "### กฎของมอนและแผนที่ (ใช้ตอนออกแบบหรือเพิ่มเนื้อหา)",
  "",
  "| กฎ | รายละเอียด | ตรวจโดย |",
  "|---|---|---|",
  "| หนึ่งชนิด หนึ่งแผนที่ | มอนแต่ละชนิดเกิดได้แผนที่เดียว แผนที่หนึ่งมีมอนธรรมดา 1–3 ชนิด (และ elite หรือบอสได้) | Validator `spawn.one_map` (error) |",
  "| เลเวลตรงแผนที่ | เลเวลมอนอยู่ในช่วงเลเวลของแผนที่ ±2 (elite/boss ±4) | Validator `spawn.level` |",
  "| ฝูงใหญ่พอให้ลาก | field มีมอนรวม 80–150 ตัว และ AoE ตีได้สูงสุด 50 ตัวต่อครั้ง | Validator `spawn.population`, `spawn.horde_band`, `skill.targets` |",
  "| ความหนาแน่น | ทุก pocket มีพื้นที่เดิน ≥ 5 ช่องต่อมอน และไม่ห่างเกิน 60 ช่องต่อมอน (ยกเว้น pocket ของ elite/boss) | Validator `spawn.density` |",
  "| ลากได้ทั้งแผนที่ | ไม่มี leash ไล่จนเป้าหมายตาย ออกจากแผนที่ หรือเข้าแคมป์ | `ai.go` (`validTarget`) |",
  "| กองรวมจุดเดียว | มอนระยะประชิดกองในช่องของผู้เล่น | `ai.go` (`stacks`, `inReach`), test `TestHordeChaseStacks` |",
  "",
  "**เพิ่มหรือย้ายมอน:** แก้ `species` ใน pocket ของ `elyndra-web/content/regions/<รหัส>.ts` แล้วแก้ข้อความที่อ้างถึง (ชื่อ pocket, design_note, landmark, บทบาทแผนที่, บทพูด NPC, สรุปเควสต์) ให้ตรงกัน จากนั้นรัน `npm run build:content`, `npm run validate:data` และ `npm run bible` ตามลำดับ",
  "",
);

// Regions.
p("## 6. ภูมิภาคและแผนที่", "");
table(["ID", "ภูมิภาค", "เมืองหลวง", "Lv", "Dungeon", "ธีม"], regions.map((r) => [r.id, r.name, r.capital, `${r.level_range[0]}–${r.level_range[1]}`, map.get(r.dungeon_map_id)?.name ?? "", r.theme]));

// Quick reference: which monsters live on which map, and how to get there.
const edgeOf = (m: MapDef, r: number[]) => {
  const [x, y, w, h] = r;
  if (x <= 3) return "ตะวันตก";
  if (x + w >= m.width_cells - 3) return "ตะวันออก";
  if (y <= 3) return "เหนือ";
  if (y + h >= m.height_cells - 3) return "ใต้";
  return "กลางแผนที่";
};
p("### มอนอยู่แผนที่ไหน (อ้างอิงด่วน)", "",
  "มอนแต่ละชนิดเกิดแผนที่เดียว (กฎ `spawn.one_map`) จำนวนคือ `target_alive` รวมทุก pocket ของแผนที่นั้น ทางเข้าบอกแผนที่ต้นทางและขอบของแผนที่ต้นทางที่ warp อยู่", "");
for (const r of regions) {
  const order = maps.filter((m) => m.region_id === r.id && m.type !== "town");
  p(`#### ${r.name} · เมือง ${r.capital} · Lv ${r.level_range[0]}–${r.level_range[1]}`, "");
  table(["แผนที่", "Lv", "เข้าได้จาก (ขอบของแผนที่ต้นทาง)", "มอน (Lv · AI · จำนวน)", "รวม"], order.map((m) => {
    const z = zones.find((x) => x.map_id === m.id);
    const count = new Map<string, number>();
    for (const pk of z?.pockets ?? []) {
      const tw = pk.species.reduce((a, s) => a + s.weight, 0);
      for (const s of pk.species) count.set(s.monster_id, (count.get(s.monster_id) ?? 0) + (pk.target_alive * s.weight) / tw);
    }
    const ins = warps.filter((w) => w.to_map === m.id).map((w) => `${map.get(w.from_map)?.name} (${edgeOf(map.get(w.from_map)!, w.trigger_rect)})`);
    const ms = [...count.entries()].sort((a, b) => mob.get(a[0])!.level - mob.get(b[0])!.level).map(([id, n]) => {
      const mm = mob.get(id)!;
      const tag = mm.archetype === "boss" ? " **บอส**" : mm.archetype === "elite" ? " *elite*" : "";
      return `${mm.name}${tag} (Lv${mm.level} · ${mm.behavior} · ${Math.round(n)})`;
    });
    const total = [...count.values()].reduce((a, b) => a + b, 0);
    return [`${m.name} (\`${m.id}\`)`, `${m.recommended_level_min}–${m.recommended_level_max}`, ins.join(", ") || "—", ms.join(", "), Math.round(total)];
  }));
}
for (const r of regions) {
  p(`### ${r.name} (\`${r.id}\`) · Lv ${r.level_range[0]}–${r.level_range[1]}`, "", `**ระบบนิเวศ:** ${r.ecology}`, "");
  const rm = maps.filter((m) => m.region_id === r.id);
  table(["Map", "ชื่อ", "ชนิด", "Lv", "ขนาด", "พื้นที่เดินได้", "Horde (alive)", "บทบาท"], rm.map((m) => {
    const l = layout(m);
    const w = decodeWalk(l.walk_rle, l.width * l.height);
    const walk = w.reduce((s, v) => s + v, 0) / w.length;
    const z = zones.find((x) => x.map_id === m.id);
    const alive = z ? z.pockets.reduce((s, p) => s + p.target_alive, 0) : 0;
    return [`\`${m.id}\``, m.name, m.type, m.type === "town" ? "—" : `${m.recommended_level_min}–${m.recommended_level_max}`, `${m.width_cells}×${m.height_cells}`, `${Math.round(walk * 100)}%`, m.horde ? `${alive} (${m.horde.min_alive}–${m.horde.max_alive})` : "—", m.role];
  }));
  for (const m of rm) {
    const l = layout(m);
    p(`#### ${m.name} (\`${m.id}\`)`, "");
    p(`*${l.theme}* · arrival [${m.arrival.join(", ")}] · ถนน ${l.roads.length} เส้น · สิ่งกีดขวาง ${l.blockers.length} · props ${l.props.length} · safe areas ${l.safe_areas.length}`, "");
    if (l.landmarks.length) p("**Landmarks:** " + l.landmarks.map((x) => `${x.name} [${x.x},${x.y}] — ${x.note}`).join(" · "), "");
    const out = warps.filter((w) => w.from_map === m.id);
    if (out.length) p("**ทางออก:** " + out.map((w) => `→ ${map.get(w.to_map)?.name} (trigger [${w.trigger_rect.join(",")}], ลงที่ [${w.spawn_point.join(",")}]${w.requirements.length ? `, ต้องมี ${w.requirements.map((q) => { const [k, v] = q.split(":"); return k === "item" ? item.get(v)?.name ?? v : q; }).join(", ")}` : ""})`).join(" · "), "");
    const z = zones.find((x) => x.map_id === m.id);
    if (z?.pockets.length) {
      table(["Pocket", "พื้นที่ (rects)", "มอนสเตอร์", "Alive", "Respawn s", "เหตุผลการออกแบบ"], z.pockets.map((pk) => [
        pk.name, pk.rects.map((x) => `[${x.join(",")}]`).join(" "), pk.species.map((s) => `${mob.get(s.monster_id)?.name} Lv${mob.get(s.monster_id)?.level}${pk.species.length > 1 ? ` ×${s.weight}` : ""}`).join(", "),
        pk.target_alive, `${pk.respawn_sec[0]}–${pk.respawn_sec[1]}`, pk.design_note]));
    }
    const ns = npcs.filter((n) => n.map_id === m.id);
    if (ns.length) p("**NPC:** " + ns.map((n) => `${n.name} (${n.role}, [${n.position.join(",")}]${n.destinations?.length ? `, ส่งไป ${n.destinations.map(([d, c]) => `${map.get(d)?.name ?? d} ${c}z`).join("/")}` : ""})`).join(" · "), "");
  }
  const rq = quests.filter((q) => q.region_id === r.id);
  p(`#### เควสต์ ${r.name}`, "");
  table(["ID", "ชื่อ", "Lv", "ผู้ให้ → ส่งที่", "เป้าหมาย", "รางวัล", "สรุป"], rq.map((q) => [
    `\`${q.id}\``, q.title, q.min_level, `${npc.get(q.giver_npc_id)?.name} → ${npc.get(q.turn_in_npc_id)?.name}`,
    q.objectives.map((o) => o.type === "kill" ? `ฆ่า ${mob.get(o.monster_id)?.name} ×${o.count}` : o.type === "collect" ? `เก็บ ${item.get(o.item_id)?.name} ×${o.count}` : `ไป ${map.get(o.map_id)?.name}`).join(", "),
    `${q.rewards.base_exp} EXP, ${q.rewards.currency}z${q.rewards.items.map((i) => `, ${item.get(i.item_id)?.name} ×${i.qty}`).join("")}`, q.summary]));
  const rs = shops.filter((s) => npc.get(s.npc_id)?.map_id && map.get(npc.get(s.npc_id)!.map_id)?.region_id === r.id);
  const rr = recipes.filter((x) => map.get(npc.get(x.npc_id)?.map_id ?? "")?.region_id === r.id);
  if (rs.length) p("**ร้านค้า:** " + rs.map((s) => s.items.map((i) => `${item.get(i.item_id)?.name} ${i.price}z`).join(", ")).join(" · "), "");
  if (rr.length) p("**สูตรคราฟต์:** " + rr.map((x) => `${item.get(x.output.item_id)?.name}${x.output.qty > 1 ? ` ×${x.output.qty}` : ""} ← ${x.inputs.map((i) => `${item.get(i.item_id)?.name} ×${i.qty}`).join(" + ")}${x.currency ? ` + ${x.currency}z` : ""}`).join(" · "), "");
}

// Monsters.
const homeOf = new Map<string, string>();
for (const z of zones) for (const pk of z.pockets) for (const s of pk.species) homeOf.set(s.monster_id, z.map_id);
p("## 7. มอนสเตอร์ทั้งหมด", "", "สเตตัสทุกค่ามาจาก Balance Model คอลัมน์ 'Hits' คือจำนวน basic attack ที่ผู้เล่นอ้างอิงเลเวลเดียวกันใช้ฆ่า", "");
for (const r of regions) {
  p(`### ${r.name}`, "");
  const pl = new Map(curve.map((c) => [c.level, c]));
  table(["ID", "ชื่อ", "Lv", "แผนที่", "Archetype", "AI", "HP", "ATK", "DEF", "Hits", "Atk ms", "Move ms", "EXP", "Drops", "Ecology", "Art brief"],
    monsters.filter((m) => m.region_id === r.id).sort((a, b) => a.level - b.level).map((m) => {
      const pp = pl.get(m.level)!;
      return [`\`${m.id}\``, m.name, m.level, map.get(homeOf.get(m.id) ?? "")?.name ?? "—", m.archetype, m.behavior, m.hp, m.attack, m.defense, (m.hp / Math.max(1, pp.attack - m.defense)).toFixed(1), m.attack_ms, m.move_speed_ms, m.base_exp,
        m.drops.map((d) => `${item.get(d.item_id)?.name} ${pct(d.rate_bp)}${d.max_qty > 1 ? ` ×${d.min_qty}–${d.max_qty}` : ""}`).join(", "), m.ecology, m.art_brief];
    }));
}

// Items.
p("## 8. ไอเทมทั้งหมดและแหล่งที่มา", "", "ไอเทมทุกชิ้นมีที่มาอย่างน้อย 1 ทาง (Validator ตรวจ)", "");
table(["ID", "ชื่อ", "ประเภท", "Rarity", "ราคาขาย", "Stack", "ผล/สเตตัส", "ได้จาก"], items.map((i) => [
  `\`${i.id}\``, i.name, i.category, i.rarity, i.sell_price, i.stack_max,
  i.use ? `${i.use.heal_hp_pct ? `HP +${i.use.heal_hp_pct}%` : ""}${i.use.heal_sp_pct ? `SP +${i.use.heal_sp_pct}%` : ""}` : i.equip ? `${i.equip.slot}${i.equip.job ? `/${i.equip.job}` : ""} ${i.equip.attack ? `ATK+${i.equip.attack} ` : ""}${i.equip.defense ? `DEF+${i.equip.defense} ` : ""}${i.equip.max_hp ? `HP+${i.equip.max_hp} ` : ""}Lv${i.equip.min_level}` : "",
  (sources.get(i.id) ?? []).join("; ")]));

// Warps.
p("## 9. Warp ทั้งหมด", "", "ทุก warp มีคู่ขากลับ (`pair_id`), trigger ไม่ทับกันในแผนที่เดียวกัน และจุดลงอยู่ใน safe area ห่าง trigger ขากลับอย่างน้อย 7 ช่อง", "");
table(["ID", "จาก", "ไป", "Trigger", "จุดลง", "คู่", "เงื่อนไข"], warps.map((w) => [w.id, map.get(w.from_map)?.name ?? w.from_map, map.get(w.to_map)?.name ?? w.to_map, `[${w.trigger_rect.join(",")}]`, `[${w.spawn_point.join(",")}]`, w.pair_id, w.requirements.join(", ") || "—"]));

// Skills.
p("## 10. Skill", "");
table(["ID", "ชื่อ", "Job", "รูปทรง", "ขนาด", "Max targets", "Cast ms", "CD ms", "SP", "×Dmg", "ปลดล็อก Lv", "ใช้งานได้"], skills.map((s) => [
  s.id, s.name, s.job, s.shape, s.shape === "cone" ? `${s.angle_deg}° r${s.radius}` : s.shape === "line" ? `${s.length}×${s.width}` : s.radius ? `r${s.radius}` : "—",
  s.max_targets, s.cast_ms, s.cooldown_ms, s.resource_cost, s.damage_multiplier, s.unlock_level, s.implemented ? "✅" : "ข้อมูลเท่านั้น"]));

// Curve.
p("## 11. Player Curve (ทุก 5 เลเวล)", "");
table(["Lv", "HP", "SP", "ATK", "DEF", "EXP ถึงเลเวลถัดไป"], curve.filter((c) => c.level === 1 || c.level % 5 === 0 || c.level === 99).map((c) => [c.level, c.max_hp, c.max_sp, c.attack, c.defense, c.exp_to_next || "MAX"]));

writeFileSync(OUT, L.join("\n"));
console.log(`bible: ${OUT} (${L.length} lines)`);
