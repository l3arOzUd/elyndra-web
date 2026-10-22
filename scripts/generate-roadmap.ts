// Writes ROADMAP.md (workspace root): the plan, and the state of every town,
// field and dungeon, built from public/data and public/sprites so the per-map
// tables always match what the game runs. `npm run roadmap` validates the
// data first, so a generated roadmap means the data passed the validator.
//
// Hand-kept parts are the constants below: the phases, and which maps have
// been played through by a person. Update them when that changes.
//
//   npm run roadmap

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MapDef, MonsterDef, NpcDef, QuestDef, RegionDef, SpawnZoneDef, WarpDef } from "../src/data/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const OUT = join(ROOT, "..", "ROADMAP.md");
const read = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8"));

const regions = read<RegionDef[]>(join(DATA, "regions.json"));
const maps = read<MapDef[]>(join(DATA, "maps.json"));
const monsters = read<MonsterDef[]>(join(DATA, "monsters.json"));
const npcs = read<NpcDef[]>(join(DATA, "npcs.json"));
const quests = read<QuestDef[]>(join(DATA, "quests.json"));
const zones = read<SpawnZoneDef[]>(join(DATA, "spawn_zones.json"));
const warps = read<WarpDef[]>(join(DATA, "warps.json"));
const spriteIndex = read<{ monsters: Record<string, { sprite: string; placeholder?: boolean }> }>(join(ROOT, "public", "sprites", "index.json"));
const catalog = read<{ number: string; name: string; id: string; gameMonster: string | null }[]>(join(ROOT, "public", "sprites", "painted-catalog.json"));

const mob = new Map(monsters.map((m) => [m.id, m]));
const mapById = new Map(maps.map((m) => [m.id, m]));

// --- hand-kept state -----------------------------------------------------------------

/** Maps a person has actually played through in the client (not only bots or tests). */
const PLAYTESTED = new Set(["lum_town_01", "lum_fld_01"]);
/** Scenery: every map's ground, trees and buildings are generated low-poly from its layout. */
const SCENE_REVIEW_DIR = join(ROOT, "..", "output", "terrain-review");

type Status = "✅" | "⏳" | "❌";
const PHASES: { title: string; goal: string; items: [Status, string][] }[] = [
  {
    title: "ช่วง 0 · พื้นฐานระบบ (เสร็จแล้ว)",
    goal: "เซิร์ฟเวอร์, client, ข้อมูล 7 ภูมิภาค และกฎ Extreme Horde ทำงานและตรวจได้",
    items: [
      ["✅", "เซิร์ฟเวอร์ Go 20 Hz, client Three.js, SQLite, validator และ test"],
      ["✅", "ข้อมูลครบ 7 ภูมิภาค: 57 แผนที่, 94 มอน, 203 ไอเทม, 114 warp, 115 NPC, เควสต์ทุกภูมิภาค"],
      ["✅", "มอนหนึ่งชนิดอยู่แผนที่เดียว (validator `spawn.one_map`) และเควสต์เก็บของใช้ดรอปในแผนที่ตัวเอง (`quest.collect_offmap`)"],
      ["✅", "ลากมอนได้ทั้งแผนที่ (ไม่มี leash) และมอนระยะประชิดกองรวมจุดเดียว"],
      ["✅", "กล้องล็อก 50° สำหรับตัวละคร 2D, ปุ่มลัดใช้กับแป้นภาษาไทยได้"],
      ["✅", "แอนิเมชัน 2D ครบ 5 ท่า 25 ตัว ทดสอบในฉากเกมจริงแล้ว"],
      ["✅", "Git 3 repo (elyndra-web, elyndra-server, workspace)"],
    ],
  },
  {
    title: "ช่วง 1 · Lumeris เล่นได้ครบ (Lv 1–20)",
    goal: "ผู้เล่นใหม่เล่นตั้งแต่ Avelorn ถึงล้มบอส Hollowroot Warden ได้จริง ทุกมอนมีภาพจริง",
    items: [
      ["⏳", "ผูกภาพ 2D ที่วาดแล้ว 18 ตัวเข้ากับมอนในเกม (ดูหัวข้อ 5) หรือเพิ่มเป็นมอนใหม่ (รอตัดสินใจ)"],
      ["❌", "ภาพ 2D ของ Lumeris ที่ยังขาด: ดูคอลัมน์มอนในหัวข้อ 4"],
      ["✅", "ขนาดตัวตามประเภท: bruiser/construct 1.25×, elite 1.6×, boss 2.4× คูณขนาดของภาพแต่ละตัว (ART_SIZE) ให้ตรงกับตัวจริง (content/build.ts)"],
      ["✅", "เนื้อเรื่องหลักใน LORE_BIBLE.md และในเกม (content/lore.ts): NPC มีชื่อและบุคลิกครบ 64 คน, ป้ายและคำอธิบายตอนเข้าแผนที่, สรุปเควสต์ 55 เควสต์เล่าเรื่อง, เรื่องของบอส 7 ตัวและ elite 4 ตัว, สมุดมอน (B) · validator ตรวจ lore.*"],
      ["✅", "บทพูด NPC เปลี่ยนตามความคืบหน้าของเรื่อง: 18 คนพูดใหม่หลังแต่ละบท (lore.ts STORY_STAGES, เซิร์ฟเวอร์เลือกบทล่าสุดที่จบแล้ว)"],
      ["✅", "ระบบตัวละครผู้เล่นแบบ paper doll: ชุดเปลี่ยนตามอุปกรณ์ที่สวม ผู้เล่นคนอื่นเห็นด้วย (ใช้ภาพชั่วคราว) + หน้า character-viewer.html"],
      ["❌", "ภาพจริงของตัวละครผู้เล่นและอุปกรณ์ 5 ชิ้น: 51 ไฟล์ ตาม CHARACTER_ART_GUIDE.md"],
      ["⏳", "เล่นจริงทุกแผนที่ของ Lumeris และเควสต์ 1–8 ครบผ่าน client รวมการสู้บอส · ฝั่งเซิร์ฟเวอร์ผ่านแล้ว (`TestLumerisQuestChainPlaythrough`): เควสต์ 1–8 ทำได้ครบไม่ติด, Lv 1→18 ฆ่า ~3,500 ตัว (ฟาร์มเพิ่ม ~2,850) ≈ 61 นาทีที่ความเร็วฆ่าตามออกแบบ เทียบเป้า 75 นาที (ยังไม่รวมเวลาเดิน) เหลือคนเล่นผ่าน client และสู้บอสจริง"],
      ["⏳", "กองมอน 50 ตัว: ตัดสินใจว่าจะให้แน่นแบบตอนนี้หรือกระจายให้เห็นเป็นกอง"],
      ["⏳", "ขึ้นออนไลน์ครั้งแรก (รอเลือกที่วางเซิร์ฟเวอร์ Go): deploy ทีละส่วน เซิร์ฟเวอร์ → client แล้วเช็ค /healthz และเข้าเกมจริงหลัง deploy ทุกครั้ง เพื่อเจอปัญหา latency และ 2 client ตั้งแต่เนิ่นๆ"],
    ],
  },
  {
    title: "ช่วง 2 · ระบบอาชีพและระบบตัวละคร",
    goal: "เลือกอาชีพได้ ทุกอาชีพใช้สกิลได้จริง และระบบตัวละครครบตาม CHARACTER_SYSTEMS.md",
    items: [
      ["✅", "เลือกอาชีพตอนสร้างตัวละคร และเปลี่ยนอาชีพที่ Guild Registrar (ฟรีถึง Lv10)"],
      ["✅", "สกิลครบ 13 ตัวทั้ง 4 อาชีพ พร้อมขั้นสกิล 1–10 จากการใช้ และความสามารถขั้น 10"],
      ["✅", "สเตตัส 6 ตัว (กดเอง 3 แต้ม/เลเวล), เพดาน, Armour/Evasion/Aether Shield, ต้านธาตุ, ดาเมจธาตุ, สถานะผิดปกติ"],
      ["✅", "ไอเทมสุ่มออปชั่น, Unique 18 ชิ้น, Charm/Relic, Totem และ Echo Totem, ตีบวก, reforge/imbue, คลังเก็บของ"],
      ["✅", "หน้าต่าง Character, แถบบัพ, ไอคอนระบบ, เอฟเฟกต์สกิลทุกรูปทรง, ภาพอุปกรณ์ 39 แบบบนตัวละคร"],
      ["✅", "อุปกรณ์และ balance ต่ออาชีพ: จำลองการต่อสู้ทุกอาชีพ/elite/บอส/เศรษฐกิจ (elyndra-server balance_*_test.go)"],
      ["✅", "อุปกรณ์แต่ละยุคต่างกันที่รูปทรง (ขอบเหล็ก ขอบทอง หมุดอัญมณี) ไอคอนสกิลวาดเต็มกรอบของอาชีพใหม่ และราคา Reset Scroll ตามเลเวล"],
    ],
  },
  {
    title: "ช่วง 3 · ฉากจริงของ Lumeris",
    goal: "พื้น ต้นไม้ อาคาร และเอฟเฟกต์เป็นงานออกแบบ ไม่ใช่ low-poly อัตโนมัติ",
    items: [
      ["❌", "Texture splatting, props, อาคารของ Avelorn และ 6 ทุ่ง + ดันเจี้ยน"],
      ["❌", "Particle/เอฟเฟกต์สกิลและการตายเป็นกลุ่ม"],
    ],
  },
  {
    title: "ช่วง 4 · ภูมิภาค 2–7",
    goal: "เปิดทีละภูมิภาค: ภาพมอนครบ, ฉาก, แล้วเล่นจริงทั้งภูมิภาค",
    items: regions.filter((r) => r.id !== "lum").map((r): [Status, string] => {
      const ids = speciesOfRegion(r.id);
      const art = ids.filter(hasArt).length;
      return [art === ids.length ? "⏳" : "❌", `${r.name} (Lv ${r.level_range[0]}–${r.level_range[1]}): ภาพมอน ${art}/${ids.length}, ฉาก, เล่นจริง ${countPlaytested(r.id)}/${maps.filter((m) => m.region_id === r.id).length} แผนที่`];
    }),
  },
  {
    title: "ช่วง 5 · ก่อนเปิดให้คนอื่นเล่น",
    goal: "ปลอดภัยและรับผู้เล่นหลายคนได้",
    items: [
      ["❌", "ล็อกอินด้วยรหัสผ่าน/token และ TLS (ตอนนี้ใช้ชื่ออย่างเดียว)"],
      ["❌", "ระบบปาร์ตี้และการแบ่ง EXP/loot"],
      ["❌", "ผู้เล่นหลายคนต่อ instance: channel หรือเพดานผู้เล่น (ประชากรมอนลดเมื่อ 5–10 คนฟาร์มพร้อมกัน)"],
      ["❌", "วัด FPS บนจอจริงและเครื่องสเปกต่ำ, ทดสอบ 2 client ด้วยตา, ทดสอบบนเน็ตที่มี latency"],
      ["❌", "ย้าย SQLite → PostgreSQL ตาม Spec (ถ้าจำเป็น)"],
    ],
  },
];

// --- helpers ------------------------------------------------------------------------------

function speciesOfMap(mapId: string): string[] {
  const z = zones.find((x) => x.map_id === mapId);
  const set = new Set<string>();
  for (const p of z?.pockets ?? []) for (const s of p.species) set.add(s.monster_id);
  return [...set].sort((a, b) => (mob.get(a)!.level - mob.get(b)!.level));
}
function speciesOfRegion(regionId: string): string[] {
  return [...new Set(maps.filter((m) => m.region_id === regionId).flatMap((m) => speciesOfMap(m.id)))];
}
function hasArt(id: string): boolean {
  const b = spriteIndex.monsters[id];
  return !!b && !b.placeholder;
}
function countPlaytested(regionId: string): number {
  return maps.filter((m) => m.region_id === regionId && PLAYTESTED.has(m.id)).length;
}
const ROLE_TH: Record<string, string> = {
  guild_registrar: "กิลด์ (เควสต์)", merchant: "ร้านค้า", healer: "หมอ", teleporter: "ส่งตัว", craftsman: "คราฟต์", guard: "ยาม", scout: "หน่วยสำรวจ",
};

const L: string[] = [];
const p = (...lines: string[]) => L.push(...lines);
const table = (head: string[], rows: (string | number)[][]) => {
  p(`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`);
  for (const r of rows) p(`| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`);
  p("");
};
const today = new Date().toISOString().slice(0, 10);

// --- document -------------------------------------------------------------------------------

const allSpecies = monsters.filter((m) => speciesOfRegion(m.region_id).includes(m.id));
const withArt = allSpecies.filter((m) => hasArt(m.id)).length;
const unbound = catalog.filter((c) => !c.gameMonster);

p(
  "# ELYNDRA — Roadmap และสถานะทุกแผนที่",
  "",
  `**อัปเดต ${today}** · ตารางสถานะแผนที่สร้างจากข้อมูลเกมจริงด้วย \`npm run roadmap\` (ใน \`elyndra-web\`) ซึ่งรัน validator ก่อน ถ้าข้อมูลไม่ผ่าน เอกสารนี้จะไม่ถูกสร้าง`,
  "",
  "> ส่วนที่เขียนมือ (แผนงานในหัวข้อ 2 และรายการแผนที่ที่เล่นจริงแล้ว) อยู่ต้นไฟล์ `elyndra-web/scripts/generate-roadmap.ts` แก้ที่นั่นแล้วรันใหม่",
  "> รายละเอียดการออกแบบทั้งหมดอยู่ใน `ELYNDRA_WORLD_DESIGN_BIBLE_v2.md`",
  "",
  "**สัญลักษณ์:** ✅ เสร็จ/ผ่าน · ⏳ กำลังทำหรือรอตัดสินใจ · ❌ ยังไม่เริ่ม",
  "",
  "## 1. ภาพรวม",
  "",
);
table(["หัวข้อ", "สถานะ"], [
  ["ภูมิภาค", `${regions.length}`],
  ["แผนที่", `${maps.length} (เมือง ${maps.filter((m) => m.type === "town").length}, ทุ่ง ${maps.filter((m) => m.type === "field").length}, ดันเจี้ยน ${maps.filter((m) => m.type === "dungeon").length}) · ข้อมูลและ layout ✅ ครบทุกแผนที่`],
  ["มอนในแผนที่", `${allSpecies.length} ชนิด · มีภาพ 2D จริง ${withArt} · ยังใช้ภาพแทน ${allSpecies.length - withArt}`],
  ["ภาพ 2D ที่วาดแล้วแต่ยังไม่ผูกกับมอนในเกม", `${unbound.length} ตัว (หัวข้อ 5)`],
  ["เควสต์ / NPC / warp", `${quests.length} / ${npcs.length} / ${warps.length}`],
  ["เล่นจริงโดยคนแล้ว", `${PLAYTESTED.size} จาก ${maps.length} แผนที่ (${[...PLAYTESTED].map((id) => mapById.get(id)?.name).join(", ")})`],
  ["ฉาก", "ทุกแผนที่ใช้ฉาก low-poly ที่สร้างอัตโนมัติจาก layout ยังไม่มีฉากออกแบบจริง"],
]);

p("## 2. แผนงาน", "");
for (const ph of PHASES) {
  p(`### ${ph.title}`, "", `**เป้าหมาย:** ${ph.goal}`, "");
  for (const [s, t] of ph.items) p(`- ${s} ${t}`);
  p("");
}

p("## 3. สรุปรายภูมิภาค", "");
table(["ภูมิภาค", "Lv", "เมือง", "ทุ่ง/ดันเจี้ยน", "ชนิดมอน", "ภาพ 2D จริง", "เควสต์", "NPC", "เล่นจริง"], regions.map((r) => {
  const rm = maps.filter((m) => m.region_id === r.id);
  const sp = speciesOfRegion(r.id);
  return [r.name, `${r.level_range[0]}–${r.level_range[1]}`, mapById.get(r.town_map_id)?.name ?? "", rm.filter((m) => m.type !== "town").length, sp.length,
    `${sp.filter(hasArt).length}/${sp.length}`, quests.filter((q) => q.region_id === r.id).length, npcs.filter((n) => rm.some((m) => m.id === n.map_id)).length,
    `${countPlaytested(r.id)}/${rm.length}`];
}));

p("## 4. ทุกแผนที่และทุกเมือง", "",
  "คอลัมน์ **มอน**: ✅ มีภาพ 2D จริง · ❌ ยังใช้ภาพแทน (Mosskin ย้อมสี) คอลัมน์ **ฉาก**: 🖼️ ถ่ายภาพตรวจฉากในเบราว์เซอร์แล้ว · ⚙️ สร้างอัตโนมัติ ยังไม่ได้ตรวจด้วยตา", "");
for (const r of regions) {
  p(`### ${r.name} (\`${r.id}\`) · Lv ${r.level_range[0]}–${r.level_range[1]}`, "");
  const rm = maps.filter((m) => m.region_id === r.id)
    .sort((a, b) => (a.type === "town" ? -1 : b.type === "town" ? 1 : a.type === "dungeon" ? 1 : b.type === "dungeon" ? -1 : a.recommended_level_min - b.recommended_level_min));
  table(["แผนที่", "ชนิด", "Lv", "ข้อมูล", "ฉาก", "มอน / บริการ", "เควสต์", "NPC", "เล่นจริง", "งานที่เหลือ"], rm.map((m) => {
    const ns = npcs.filter((n) => n.map_id === m.id);
    const qs = quests.filter((q) => ns.some((n) => n.id === q.giver_npc_id));
    const scene = existsSync(join(SCENE_REVIEW_DIR, `${m.id}.png`)) ? "🖼️" : "⚙️";
    const played = PLAYTESTED.has(m.id);
    const todo: string[] = [];
    let what: string;
    if (m.type === "town") {
      const roles = [...new Set(ns.map((n) => n.role))].filter((x) => x !== "scout");
      what = roles.map((x) => ROLE_TH[x] ?? x).join(", ");
    } else {
      const sp = speciesOfMap(m.id);
      what = sp.map((id) => {
        const mm = mob.get(id)!;
        const tag = mm.archetype === "boss" ? " บอส" : mm.archetype === "elite" ? " elite" : "";
        return `${hasArt(id) ? "✅" : "❌"} ${mm.name}${tag} Lv${mm.level}`;
      }).join("<br>");
      const missing = sp.filter((id) => !hasArt(id)).length;
      if (missing) todo.push(`ภาพมอน ${missing} ชนิด`);
    }
    todo.push("ฉากจริง");
    if (!played) todo.push(m.type === "town" ? "เล่นจริง: บริการ NPC ทุกตัว" : "เล่นจริง");
    return [`${m.name} (\`${m.id}\`)`, m.type === "town" ? "เมือง" : m.type === "field" ? "ทุ่ง" : "ดันเจี้ยน",
      m.type === "town" ? "—" : `${m.recommended_level_min}–${m.recommended_level_max}`, "✅", scene, what, qs.length || "—", ns.length, played ? "✅" : "❌", todo.join(", ")];
  }));
}

p("## 5. ภาพ 2D ที่วาดแล้วแต่ยังไม่ผูกกับมอนในเกม", "",
  "ภาพครบ 5 ท่าและทดสอบในฉากเกมแล้ว แต่ไม่มีมอนในข้อมูลเกมชื่อตรงกัน ต้องตัดสินใจว่าจะใช้แทนมอนที่ยังเป็นภาพแทน หรือเพิ่มเป็นมอนใหม่", "");
table(["#", "ภาพ", "ไฟล์"], unbound.map((c) => [c.number, c.name, `public/sprites/${c.id}_2d/`]));

writeFileSync(OUT, L.join("\n") + "\n");
console.log(`roadmap: ${OUT} (${L.length} lines)`);
