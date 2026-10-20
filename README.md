# วันธรรมดา (Ordinary Day)

เกม zombie survival แนว open-world sandbox มุมกล้อง isometric 3D เล่นบนเว็บเบราว์เซอร์ ทั้งมือถือและคอม หายนะเริ่มต้นจากเช้าวันอังคารธรรมดา ผู้เล่นเกิดมาตัวเปล่า กลางวันออกหาของ กลางคืนเอาชีวิตรอด

**สถานะ:** Prototype v0.3

## เล่นเกม

- **บนเครื่อง:** ต้องเปิดผ่าน dev server เช่น `npx serve .` หรือ `python3 -m http.server 8000` แล้วเปิด `http://localhost:8000` (ต้องต่ออินเทอร์เน็ต เพราะโหลด Three.js และฟอนต์จาก CDN)
- **ดับเบิลคลิก `index.html` ใช้ไม่ได้แล้ว** เพราะเบราว์เซอร์ไม่โหลด ES modules จาก `file://` หน้าเริ่มเกมจะขึ้นข้อความบอกวิธีเปิดแทน
- **GitHub Pages:** Settings → Pages → Source: `main` branch, โฟลเดอร์ `/ (root)` แล้วจะได้ลิงก์เล่นที่อัปเดตทุกครั้งที่ push

## การควบคุม

| การกระทำ | คอม | มือถือ |
| --- | --- | --- |
| เดิน / วิ่ง | WASD / Shift | ลากนิ้วซ้าย / ดันสุดขอบ |
| เล็ง | ตามเมาส์ | เล็งให้อัตโนมัติ |
| โจมตี | คลิกค้าง หรือ Space | กดปุ่มโจมตีค้าง |
| สลับอาวุธ | 1 2 3 | ปุ่ม หลัก รอง ประชิด |
| รีโหลด / เก็บของ / รักษา | R / E / H | ปุ่ม R / ปุ่มเก็บ / ปุ่ม ✚ |
| กระเป๋า | Tab | ปุ่มกระเป๋า (เกมหยุดระหว่างเปิด) |

## เทคโนโลยี

- Three.js r128 (โหลดจาก cdnjs) JavaScript ล้วน ไม่มีขั้นตอน build
- โค้ดเกมเป็น ES modules ใน `src/` (`index.html` มีแค่ HTML + CSS) texture ทั้งหมดวาดด้วยโค้ด ไม่มีไฟล์ภาพหรือเสียง
- ฟอนต์ Chakra Petch และ Big Shoulders Display จาก Google Fonts

## โครงสร้าง repo

```
index.html                     HTML + CSS ของ HUD แล้วโหลด src/main.js
src/main.js                    จุดเริ่ม: สร้างเมือง ผูก input เริ่มเกม และวน loop
src/core/                      util (rng, $), renderer (scene กล้อง แสง), state (G), controls (สถานะปุ่ม)
src/config/                    ตารางค่าเกม: time, world, items, loot, zombies
src/world/                     textures, materials, collision, sidewalk, props, city, item-models, occlusion
src/entities/                  agents, movement, ai, player, animation
src/systems/                   drops, inventory, combat, phases, weather, effects, game (reset)
src/ui/                        hud, bag, input
CLAUDE.md                      กติกาสำหรับ Claude Code และ AI ที่ช่วยพัฒนา
docs/project-summary-v0.3.md   เอกสารสรุประบบทั้งหมด + Decision Log
docs/design-draft-01.md        Game System Design Draft 01 จากทีม
tools/smoke-test.js            ทดสอบตรรกะเกมแบบไม่มีหน้าจอ: node tools/smoke-test.js (หรือ npm test)
```

## เอกสาร

- [สรุปโปรเจกต์ v0.3](docs/project-summary-v0.3.md) ระบบทั้งหมดที่มีในเกม ตัวเลขทุกค่า และ Decision Log Q01–Q12
- [Design Draft 01](docs/design-draft-01.md) สเปกจากทีมที่ v0.3 นำมาทำ

## ประวัติเวอร์ชัน

| เวอร์ชัน | สิ่งที่เพิ่ม |
| --- | --- |
| v0.3.1 | แยก `index.html` เป็น ES modules ใน `src/` โดยพฤติกรรมเกมเหมือน v0.3 ทุกอย่าง (ต้องเปิดผ่าน dev server หรือ GitHub Pages) |
| v0.3 | เฟส DAY / NIGHT, อาวุธ 3 ระดับ (Civilian / Police / Military), loot ตามเวลา, ยา 5 ชนิด + Resurrection Kit, ซอมบี้ 6 คลาส |
| v0.2 | 1 วันในเกม = 5 นาทีจริง, ระบบกระเป๋า, อาวุธ 3 ช่อง, ปืนและกระสุน, loot สุ่มตามโซน |
| v0.1 | เมือง isometric, day/night cycle, ฝน, ประชาชน, ไทม์ไลน์การระบาด |
