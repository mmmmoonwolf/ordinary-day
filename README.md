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
| เปิด/ปิดเสียง | M | ปุ่มเสียงในหน้ากระเป๋า |

## เป้าหมาย

รอดให้ครบ 7 คืน (คืนหนึ่งนับเมื่อถึง 06:00 ของเช้าถัดไป) แล้วตั้งแต่เช้าวันที่ 8 เฮลิคอปเตอร์กู้ภัยจะลงจอดที่สี่แยกมุมสวนสาธารณะ ทุกวันเวลา 08:00–12:00 มีลูกศรใต้นาฬิกาชี้ทางและบอกระยะ เดินเข้าไปในวงลงจอดเพื่อชนะ ถ้าไปไม่ทันจะกลับมาใหม่วันถัดไป

## การติดเชื้อ

ซอมบี้ที่กัดมีโอกาสทำให้ติดเชื้อ (Walker 10% · Zombie, Sprinter, Armor Walker 20% · ระเบิดของ Boomer และการทุบของ Tyrant ไม่ติดเชื้อ ค่าเหล่านี้เป็น placeholder) เชื้อลามจาก 0% ถึง 100% ใน 8 ชั่วโมงในเกม (ราว 100 วินาทีจริงที่ ×1) ระหว่างติดเชื้อ HP ไม่ฟื้นเอง ถึง 100% จะกลายเป็นซอมบี้และจบเกม Antibiotic รักษาได้ (ใช้ได้แม้ HP เต็ม และปุ่มรักษาจะเลือก Antibiotic ก่อนเมื่อติดเชื้อ) Resurrection Kit ที่ทำงานก็ล้างเชื้อด้วย

## การเซฟ

เกมบันทึกอัตโนมัติทุก 15 วินาทีระหว่างเล่น และทุกครั้งที่ปิดหรือพับหน้าเว็บ เปิดเกมครั้งถัดไปจะมีปุ่ม **เล่นต่อ** บอกวันที่และเวลาในเกมที่เซฟไว้ เซฟเก็บในเบราว์เซอร์เครื่องนั้น (localStorage) มีช่องเดียว กด **เริ่มวันใหม่** จะลบเซฟเดิม และเซฟจะถูกลบเมื่อตัวละครตาย

## เทคโนโลยี

- Three.js r128 (โหลดจาก cdnjs) JavaScript ล้วน ไม่มีขั้นตอน build
- โค้ดเกมเป็น ES modules ใน `src/` (`index.html` มีแค่ HTML + CSS) texture ทั้งหมดวาดด้วยโค้ด ไม่มีไฟล์ภาพหรือเสียง
- ฟอนต์ Chakra Petch และ Big Shoulders Display จาก Google Fonts

## โครงสร้าง repo

```
index.html                     HTML + CSS ของ HUD แล้วโหลด src/main.js
src/main.js                    จุดเริ่ม: สร้างเมือง ผูก input เริ่มเกม และวน loop
src/core/                      util (rng, $), renderer (scene กล้อง แสง), state (G), controls (สถานะปุ่ม)
src/config/                    ตารางค่าเกม: time, world, items, loot, zombies, goal
src/world/                     textures, materials, collision, sidewalk, props, city, item-models, occlusion
src/entities/                  agents, movement, ai, player, animation
src/systems/                   drops, inventory, combat, phases, weather, effects, game (reset), save, audio, infection, goal, records
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
| v0.4 | หน้าสรุปตอนจบ + สถิติดีสุด, เสียงสังเคราะห์ทั้งเกม, ติดเชื้อเมื่อโดนกัด + Antibiotic รักษา, เป้าหมายรอด 7 คืนแล้วขึ้นเฮลิคอปเตอร์ |
| v0.3.3 | ระบบเซฟอัตโนมัติ ปุ่มเล่นต่อบนหน้าเริ่มเกม เซฟถูกลบเมื่อตาย |
| v0.3.2 | ใช้คำตอบ Decision Log Q01–Q12 ที่ยืนยันแล้ว: ดาเมจอาวุธ = คะแนน × 5, Armor Walker รวมไม่เกิน 6 ตัวต่อคืน, เตือน NIGHT INCOMING ตั้งแต่ 16:00 |
| v0.3.1 | แยก `index.html` เป็น ES modules ใน `src/` โดยพฤติกรรมเกมเหมือน v0.3 ทุกอย่าง (ต้องเปิดผ่าน dev server หรือ GitHub Pages) · แก้บั๊กหน้ากระเป๋า ฉากเริ่มเกม และแถบ HP บอสค้างบนจอเมื่อเปิดนอก claude.ai |
| v0.3 | เฟส DAY / NIGHT, อาวุธ 3 ระดับ (Civilian / Police / Military), loot ตามเวลา, ยา 5 ชนิด + Resurrection Kit, ซอมบี้ 6 คลาส |
| v0.2 | 1 วันในเกม = 5 นาทีจริง, ระบบกระเป๋า, อาวุธ 3 ช่อง, ปืนและกระสุน, loot สุ่มตามโซน |
| v0.1 | เมือง isometric, day/night cycle, ฝน, ประชาชน, ไทม์ไลน์การระบาด |
