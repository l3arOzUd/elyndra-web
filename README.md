# elyndra-web

Client 2.5D ของ ELYNDRA (TypeScript + Vite + Three.js) และระบบ content pipeline (design source → JSON → validator)
ต้องเล่นผ่าน `elyndra-server` เท่านั้น เพราะ client ไม่มีการจำลองเกมฝั่ง browser

## วิธีรัน

```bash
# 1) server (โฟลเดอร์ข้าง ๆ)
cd ../elyndra-server && go run ./cmd/elyndra-server -content ../elyndra-web/public/data

# 2) client
npm install
npm run dev            # http://localhost:5173 แล้วใส่ชื่อตัวละคร
```

การควบคุม:

| ปุ่ม | การทำงาน |
|---|---|
| คลิกซ้าย | เดิน / โจมตี / คุยกับ NPC |
| คลิกขวาลาก | หมุนกล้อง |
| ล้อเมาส์ | ซูม |
| 1-4 | สกิล (เล็งด้วยเมาส์) |
| 5-7 | ใช้ไอเทม |
| I | Inventory |
| Z | เก็บของรอบตัว (เปิด auto-loot ไว้อยู่แล้ว) |
| F3 | Debug overlay (tick ของ server และ spawn pocket) |

## Scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run build:content` | สร้าง `public/data/*.json` และ `public/data/maps/*.json` จาก `content/` |
| `npm run validate:data` | ตรวจ content (exit 0 = ผ่าน, 1 = มี error, 2 = มี critical) · `-- --strict` ให้ warning ทำให้ไม่ผ่านด้วย · `-- --json` · `-- --all` |
| `npm run bible` | สร้าง `../ELYNDRA_WORLD_DESIGN_BIBLE_v2.md` จาก JSON |
| `npx tsx content/check-region.ts <id>` | build Lumeris + ภูมิภาคเดียวลงโฟลเดอร์ชั่วคราวแล้ว validate (สำหรับออกแบบแยกภูมิภาค) |
| `npm test` | unit test + validator test ที่ใส่ข้อมูลผิดโดยเจตนา 12 กรณี |
| `npm run build` | typecheck + production build |

## Content pipeline

```
content/model.ts        balance model: player curve, archetype, EXP, drop, ราคา
content/regions/*.ts    การออกแบบแต่ละภูมิภาค (lum.ts = มาตรฐานอ้างอิง)
content/layout.ts       แปลง layout เป็น walk grid
content/build.ts        เขียน public/data (อย่าแก้ JSON ด้วยมือ ให้แก้ที่ content/ แล้ว build ใหม่)
scripts/validate-data.ts  อ่านเฉพาะ JSON ไม่เชื่อ build จึงจับ bug ของ build ได้ด้วย
```

## โครงสร้าง client

```
src/net/          protocol.ts (สำเนาของ Go protocol), connection.ts (WebSocket, นาฬิกา server, RTT)
src/game.ts       snapshot interpolation 120 ms, prediction การเดินของตัวเอง, combat event → animation, loot, NPC
src/render/       camera, terrain/props (สร้างฉากจาก layout), sprite + animator, fx
src/ui/           hud, hotbar, npcDialog, minimap, overlay (เลขดาเมจรวม 150 ms + pool), inspector
```

## สถานะ

ดูหัวข้อ "สถานะการทดสอบ" ใน `ELYNDRA_WORLD_DESIGN_BIBLE_v2.md`
