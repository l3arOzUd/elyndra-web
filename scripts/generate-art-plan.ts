// Writes MONSTER_ART_PLAN.md (workspace root): every game monster, whether it
// has 2D art, which already-painted creature could stand in for it, and the
// design brief and prompts for the ones still to draw. Built from
// public/data and public/sprites, so it stays in step with the game.
//
// Hand-kept: PROPOSED (painted creature -> game monster) below. Once a pairing
// is accepted and bound in public/sprites/index.json it shows as done.
//
//   npm run art-plan

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MapDef, MonsterDef, RegionDef, SpawnZoneDef } from "../src/data/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const OUT = join(ROOT, "..", "MONSTER_ART_PLAN.md");
const read = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8"));

const regions = read<RegionDef[]>(join(DATA, "regions.json"));
const maps = read<MapDef[]>(join(DATA, "maps.json"));
const monsters = read<MonsterDef[]>(join(DATA, "monsters.json"));
const zones = read<SpawnZoneDef[]>(join(DATA, "spawn_zones.json"));
const spriteIndex = read<{ monsters: Record<string, { sprite: string; placeholder?: boolean }> }>(join(ROOT, "public", "sprites", "index.json"));
const catalog = read<{ number: string; name: string; id: string; gameMonster: string | null }[]>(join(ROOT, "public", "sprites", "painted-catalog.json"));

/**
 * Painted creatures that have no game monster of the same name, paired with
 * the game monster whose role, family and look they fit best. A pairing means
 * renaming that game monster to the painted name (and its text), then binding
 * the sprite. Not applied yet: waiting for the user's yes.
 */
const PROPOSED: Record<string, { monster: string; why: string }> = {
  aether_treant: { monster: "mob_0036", why: "ยักษ์รากไม้ เหมาะเป็นบอสดันเจี้ยนรากไม้ของ Lumeris" },
  stonecap: { monster: "mob_0005", why: "ตัวเตี้ยหนา ขาแบบปู ผิวหิน เข้ากับ bruiser ธาตุดินที่ scree" },
  leafshell: { monster: "mob_0006", why: "เต่าใบไม้ ตัวหนา เป็น bruiser ธาตุพืชได้ แทนหมูป่าหนาม" },
  windpuff: { monster: "mob_0007", why: "สัตว์ลมขนาดเล็ก เป็นฝูงลมที่ทุ่งกังหันได้" },
  croakling: { monster: "mob_0008", why: "สัตว์ครึ่งบกครึ่งน้ำ นิสัยสงบ อยู่ริมลำธาร Moonbrook" },
  rootling: { monster: "mob_0012", why: "สิ่งมีชีวิตกิ่งรากตัวเล็ก นิสัยสงบ ตรงกับ Graftling" },
  petal_sprite: { monster: "mob_0041", why: "ตัวบินโจมตีระยะไกล สีพืชพรรณ แทนผีเสื้อหยก" },
  thornbound: { monster: "mob_0014", why: "เถาวัลย์หนามพันกัน ตรงกับ construct เถาวัลย์" },
  gearling: { monster: "mob_0043", why: "หุ่นทองเหลืองตัวเล็ก เป็นคนสวนสาย support ได้" },
  ruin_golem: { monster: "mob_0015", why: "หุ่นหินโบราณมีแกน Aetherite ตรงกับยามหินรากไม้" },
  verdant_stag: { monster: "mob_0045", why: "กวางเขาพืชและผลึก ตรงกับ elite กวางกลไก" },
  terrabloom: { monster: "mob_0047", why: "ดอกไม้ยักษ์สาย support แทนเห็ดแม่ (Spore Matron)" },
  aether_wraith: { monster: "mob_0055", why: "วิญญาณลอยได้ ตรงกับ Dust Revenant ของ Solenia (ต้องปรับโทนสีทราย)" },
  sky_manta: { monster: "mob_0066", why: "กระเบนบิน ตรงกับ Squall Ray" },
  crystal_mite: { monster: "mob_0024", why: "ไรผลึกน้ำแข็ง ตรงกับ Frost Mite" },
  gust_wisp: { monster: "mob_0025", why: "วิญญาณลมผลึกฟ้า ตรงกับ Prism Wisp" },
};

const mob = new Map(monsters.map((m) => [m.id, m]));
const mapById = new Map(maps.map((m) => [m.id, m]));
const homeOf = new Map<string, string>();
for (const z of zones) for (const p of z.pockets) for (const s of p.species) homeOf.set(s.monster_id, z.map_id);
const hasArt = (id: string) => !!spriteIndex.monsters[id] && !spriteIndex.monsters[id].placeholder;
const proposedFor = new Map(Object.entries(PROPOSED).filter(([, v]) => mob.has(v.monster) && !hasArt(v.monster)).map(([k, v]) => [v.monster, { sprite: k, ...v }]));
const catName = new Map(catalog.map((c) => [c.id, c.name]));

const L: string[] = [];
const p = (...lines: string[]) => L.push(...lines);
const table = (head: string[], rows: (string | number)[][]) => {
  p(`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`);
  for (const r of rows) p(`| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`);
  p("");
};
const today = new Date().toISOString().slice(0, 10);

const spawned = monsters.filter((m) => homeOf.has(m.id));
const done = spawned.filter((m) => hasArt(m.id));
const proposed = spawned.filter((m) => !hasArt(m.id) && proposedFor.has(m.id));
const todo = spawned.filter((m) => !hasArt(m.id) && !proposedFor.has(m.id));
const usedSprites = new Set(Object.values(spriteIndex.monsters).filter(s => !s.placeholder).map(s => s.sprite));
const spare = catalog.filter(c => !usedSprites.has(`${c.id}_2d`) && ![...proposedFor.values()].some(p => p.sprite === c.id));

p(
  "# ELYNDRA — แผนออกแบบมอนสเตอร์ 2D",
  "",
  `**อัปเดต ${today}** · สร้างจากข้อมูลเกมด้วย \`npm run art-plan\` (ใน \`elyndra-web\`) ส่วนที่เขียนมือคือการจับคู่ในหัวข้อ 3 อยู่ต้นไฟล์ \`scripts/generate-art-plan.ts\``,
  "",
  "## 1. สถานะ",
  "",
);
table(["หัวข้อ", "จำนวน"], [
  ["มอนในเกม (ที่เกิดในแผนที่)", spawned.length],
  ["✅ มีภาพ 2D จริงแล้ว", done.length],
  ["🔁 มีภาพวาดแล้ว รอยืนยันการจับคู่ (หัวข้อ 3)", proposed.length],
  ["❌ ต้องออกแบบใหม่", todo.length],
  ["ภาพวาดแล้วที่ยังไม่มีมอนให้ใช้", spare.length ? spare.map((c) => c.name).join(", ") : "—"],
]);

p(
  "## 2. ขั้นตอนต่อหนึ่งตัว (ตามที่ใช้กับ 25 ตัวแรก)",
  "",
  "| ขั้น | ผลลัพธ์ | สเปก |",
  "|---|---|---|",
  "| 1. ภาพหลัก | `sprite/tripo_ready/NN_Name.png` | 1254×1254 พื้นโปร่งใสจริง ไม่มีเงา ตัวเต็ม หันซ้าย (ไปทางซ้ายของภาพ) มุมกล้องระดับสายตาเล็กน้อย |",
  "| 2. บอร์ดท่าเดิน | `public/sprites/<id>_2d/parts/walk.png` | 1536×1024 ตาราง 3×2 = 6 ท่าของวงเดินหนึ่งรอบ ตัวเดียวกัน ขนาดเท่ากัน เท้าอยู่บรรทัดเดียวกันทุกช่อง |",
  "| 3. บอร์ดท่าทาง | `public/sprites/<id>_2d/parts/actions.png` | 1536×1024 ตาราง 3×2: ยืน, เดิน, โจมตี / โดนตี, ตาย (นอนพื้น), ท่าพิเศษ |",
  "| 4. กรอบท่า | `public/sprites/<id>_2d/poses.json` | กรอบของแต่ละท่าในบอร์ด (ดูตัวอย่างจาก `croakling_2d`) |",
  "| 5. ส่งออก | `idle/walk/attack/hit/death.png` + `<id>_2d.sprite.json` | `node scripts/export-painted-2d.mjs <id>` (ต้องเปิด vite ไว้) |",
  "| 6. ผูกกับมอน | `public/sprites/index.json` และ `painted-catalog.json` | `\"mob_xxxx\": { \"sprite\": \"<id>_2d\" }` |",
  "| 7. ตรวจ | ภาพเฟรมสำคัญ + ทดสอบในเกม | ครบ 5 ท่า, ไม่มีเฟรมว่าง, ตายแล้วค้างเฟรมสุดท้าย, ไม่มี error |",
  "",
  "**Prompt ภาพหลัก** (แทน `{NAME}` `{BRIEF}` `{ROLE}` จากตารางในหัวข้อ 4 และแนบ `sprite/tripo_ready/11_Croakling.png` เป็นตัวอย่างสไตล์ทุกครั้ง เพื่อให้มอนทุกตัวลายเส้นและแสงเงาเดียวกัน):",
  "```",
  "ELYNDRA monster concept, single character, not a sheet. {NAME}: {BRIEF}",
  "Match the art style of the attached reference monster (line weight, painterly shading, colour saturation, level of detail) but design a NEW creature; do not copy its body or face.",
  "Role in game: {ROLE}. Fantasy x ancient technology: carved stone, brass, gears, teal-blue Aetherite crystals, plants grown into machines.",
  "Cute-but-readable stylized 2.5D game art, clean silhouette that reads at small size, soft painterly shading.",
  "Full body, facing the LEFT edge of the image in a slight three-quarter view, camera slightly above eye level.",
  "Square 1254x1254, transparent background with real alpha, no ground, no shadow, no text, no border.",
  "```",
  "**Prompt บอร์ด** (แนบภาพหลักเป็น reference):",
  "```",
  "Same character as the reference, exact same design, colours and proportions, facing the LEFT edge.",
  "One 1536x1024 sheet, 3 columns x 2 rows, equal cells, every pose the same size with the feet on the same line.",
  "WALK SHEET: six frames of one walk cycle in order.   |   ACTION SHEET: idle, walk, attack / hit reaction, death lying on the ground, special move.",
  "Transparent background with real alpha, no ground, no shadow, no text, no grid lines.",
  "```",
  "",
  "**ขนาดบนจอ:** ไม่ต้องวาดให้ใหญ่ตามประเภท `content/build.ts` ขยายให้เอง: swarm/ranged/support 1×, bruiser/construct 1.25×, elite 1.6×, boss 2.4×",
  "",
);

p("## 3. ภาพที่วาดแล้ว: ข้อเสนอจับคู่กับมอนในเกม (รอยืนยัน)", "",
  "ถ้ายืนยัน: เปลี่ยนชื่อมอนในเกมเป็นชื่อภาพ แก้ข้อความที่อ้างถึง (art_brief, ecology, บทพูด, เควสต์) แล้วผูก sprite งานวาดจะลดลงตามจำนวนที่จับคู่", "");
table(["ภาพ", "→ มอนในเกม", "ภูมิภาค · แผนที่", "Lv · ประเภท", "เหตุผล"], [...proposedFor.values()].map((x) => {
  const m = mob.get(x.monster)!;
  return [catName.get(x.sprite) ?? x.sprite, `${m.name} (\`${m.id}\`)`, `${regions.find((r) => r.id === m.region_id)?.name} · ${mapById.get(homeOf.get(m.id) ?? "")?.name ?? "—"}`, `${m.level} · ${m.archetype}`, x.why];
}));

p("## 4. รายการทุกตัวตามลำดับงาน", "",
  "เรียงตามลำดับเปิดภูมิภาคใน ROADMAP (Lumeris ก่อน) ในแต่ละภูมิภาคเรียงบอส → elite → ตามเลเวล เพราะบอสคือตัวที่ผู้เล่นจำได้มากที่สุด",
  "",
  "**สถานะ:** ✅ มีภาพแล้ว · 🔁 ใช้ภาพที่วาดแล้วได้ (รอยืนยัน) · ❌ ต้องออกแบบใหม่", "");
const rank = (m: MonsterDef) => (m.archetype === "boss" ? 0 : m.archetype === "elite" ? 1 : 2);
for (const r of regions) {
  const rm = spawned.filter((m) => m.region_id === r.id).sort((a, b) => rank(a) - rank(b) || a.level - b.level);
  const nTodo = rm.filter((m) => !hasArt(m.id) && !proposedFor.has(m.id)).length;
  p(`### ${r.name} (\`${r.id}\`) · Lv ${r.level_range[0]}–${r.level_range[1]} · ต้องออกแบบใหม่ ${nTodo} ตัว`, "", `*ธีม:* ${r.theme}`, "");
  table(["", "ID", "ชื่อ", "Lv", "ประเภท · AI", "Family · ธาตุ", "แผนที่", "โจทย์ออกแบบ (art brief)"], rm.map((m) => {
    const st = hasArt(m.id) ? "✅" : proposedFor.has(m.id) ? `🔁 ${catName.get(proposedFor.get(m.id)!.sprite)}` : "❌";
    return [st, `\`${m.id}\``, m.name, m.level, `${m.archetype} · ${m.behavior}`, `${m.family} · ${m.element}`, mapById.get(homeOf.get(m.id) ?? "")?.name ?? "—", m.art_brief];
  }));
}

writeFileSync(OUT, L.join("\n") + "\n");
console.log(`art plan: ${OUT} (${L.length} lines) · done ${done.length}, proposed ${proposed.length}, to design ${todo.length}`);
