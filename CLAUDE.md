# CLAUDE.md — กติกาสำหรับพัฒนา Ordinary Day

เอกสารนี้สำหรับ Claude Code และ AI ที่ช่วยพัฒนาเกม อ่านให้ครบก่อนแก้โค้ด

## บริบท

- เกม isometric 3D zombie survival บนเว็บ ใช้ Three.js r128 ไม่มีขั้นตอน build
- ตอนนี้ทั้งเกมอยู่ใน `index.html` ไฟล์เดียว (v0.3)
- ระบบทั้งหมดและตัวเลขทุกค่าอยู่ใน `docs/project-summary-v0.3.md`
- สเปกจากทีมอยู่ใน `docs/design-draft-01.md`
- UI เป็นภาษาไทย ชื่ออาวุธ ชื่อคลาสซอมบี้ และชื่อยาเป็นภาษาอังกฤษตามสเปก

## กติกาที่ห้ามละเมิด

1. **แยกประเภทข้อมูลตามสเปก:** `[CONFIRMED — USER]` ห้ามเปลี่ยนเอง · `[EXISTING]` คือของที่มีอยู่ · `[PROPOSED]` คือข้อเสนอ · `[OPEN]` ห้ามเดาคำตอบแล้วถือเป็นข้อสรุป
2. **ค่าที่ทีมยืนยันแล้ว** (HP ซอมบี้ทุกคลาส, คะแนน DMG / FIRE RATE, % ฟื้นของยา, เงื่อนไขเกิดของ Armor Walker และ Tyrant, ดรอปการันตี) ห้ามปรับเพื่อบาลานซ์ ถ้าคิดว่าควรเปลี่ยนให้เสนอก่อน
3. **ค่าที่เป็น placeholder** ต้องมีคอมเมนต์ `PLACEHOLDER` ในโค้ด และต้องบอกในสรุปงานทุกครั้งที่เพิ่มหรือเปลี่ยน
4. **ต้องเล่นได้ทั้งมือถือและคอม** ทุกครั้งที่แก้ ห้ามทำให้ joystick, ปุ่มโจมตีแบบกดค้าง, aim assist หรือ HUD บนจอแคบพัง
5. **ห้ามอ้างว่าฟีเจอร์เสร็จ** ถ้ายังไม่ได้เปิดเกมในเบราว์เซอร์จริงหรือรัน smoke test
6. **ความเร็วเวลา ×2 / ×4** ต้องไม่ทำให้อัตราเกิดของหรือซอมบี้ผิดนิยาม ทุกอย่างผูกกับนาทีในเกม (`G.min`) ไม่ผูกกับเฟรม
7. **ระบบเดิมที่ไม่เกี่ยวกับงาน** (เมือง ฝน นาฬิกา กระเป๋า รีโหลด) ต้องทำงานเหมือนเดิม

## แผนที่โค้ดใน index.html

โค้ดเรียงเป็นหมวด แต่ละหมวดขึ้นต้นด้วยคอมเมนต์ `// ---------- ชื่อหมวด ----------`

| หมวด | มีอะไร |
| --- | --- |
| time | `DAY_REAL_SECONDS = 300`, `RATE`, `SPEEDS`, `NIGHT_START`, `DAY_START`, `DUSK_WARN` |
| world constants | `RC` (เส้นกลางถนน), `OFF` (ระยะทางเท้า), `groundY()` |
| textures / materials | texture วาดด้วย canvas, วัสดุที่ใช้ร่วมกัน |
| buildings / props | สร้างเมืองจาก seed คงที่ (`mulberry32(2626)`), `solids` (กล่องชน), `lootSpots` |
| item definitions | `GRADES`, `DEF` (อาวุธ กระสุน ยา), `POOLS`, `GRADE_W`, `MED_W`, `CAT_W`, `rollLoot()` |
| zombie classes | `ZC` (HP ความเร็ว ระยะมอง ดาเมจ), `styleZombie()`, `becomeZombie()`, `setKind()` |
| story + phases | `EVENTS`, `onNight()`, `onDay()`, `runEvents()` |
| AI | `updateHuman()`, `updateZombie()`, `explode()`, `slam()`, `hurtZombie()`, `makeNoise()` |
| inventory | `inv`, `pickup()`, `useHeal()`, `addStack()`, `takeAmmo()` |
| combat | `fireGun()`, `meleeHit()`, `aimAssist()`, `updatePlayer()`, `hurtPlayer()` |
| animation / sky / HUD / bag UI / input / loop | ส่วนแสดงผลและการควบคุม |

ค่าตัวเลขเกือบทั้งหมดอยู่ในตาราง `DEF`, `ZC`, `POOLS` และ `*_W` แก้ที่ตารางก่อนแก้ตรรกะ

## งานแรกที่แนะนำ

แยก `index.html` เป็นโมดูล ES (`<script type="module">`) โดย **ไม่เปลี่ยนพฤติกรรมเกม**

```
index.html            HTML + CSS + โหลด main.js
src/config/           items.js, zombies.js, loot.js, time.js
src/world/            textures.js, city.js, props.js
src/entities/         agents.js, ai.js, player.js
src/systems/          combat.js, inventory.js, phases.js, weather.js
src/ui/               hud.js, bag.js, input.js
src/main.js           สร้างทุกอย่างและวน loop
```

ยังใช้ Three.js r128 จาก CDN ได้ ไม่ต้องเพิ่ม build tool จนกว่าจะจำเป็น หลังแยกเสร็จ ให้รัน smoke test และเปิดเกมทั้งแบบจอคอมและจอมือถือ (DevTools device mode) ก่อน commit

## การทดสอบ

- `node tools/smoke-test.js` จำลองเกม 2 วันเต็มแบบไม่มีหน้าจอ (THREE ถูกแทนด้วย stub) แล้วรายงาน error ใช้จับบั๊กตรรกะเท่านั้น ไม่ได้ตรวจภาพ
- หลังแยกโมดูลแล้ว ต้องปรับ smoke test ให้โหลดไฟล์ใหม่
- ทดสอบด้วยตาทุกครั้ง: เริ่มเกม 07:30, การระบาด 09:30, เปลี่ยนเป็นกลางคืน 18:30, รุ่งเช้า 06:00, ยิงปืนทุกแบบ, เปิดกระเป๋า, ตายแล้วเล่นใหม่

## การสรุปงาน

ทุกครั้งที่ทำงานเสร็จ ให้สรุปว่า (1) เปลี่ยนอะไร (2) ค่าไหนเป็น placeholder (3) อะไรยังไม่ได้ทำ (4) ทดสอบอะไรไปแล้วบ้าง และอัปเดต `docs/project-summary-*.md` กับตารางประวัติเวอร์ชันใน `README.md`
