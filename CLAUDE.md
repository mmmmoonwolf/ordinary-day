# CLAUDE.md — กติกาสำหรับพัฒนา Ordinary Day

เอกสารนี้สำหรับ Claude Code และ AI ที่ช่วยพัฒนาเกม อ่านให้ครบก่อนแก้โค้ด

## บริบท

- เกม isometric 3D zombie survival บนเว็บ ใช้ Three.js r128 (global `THREE` จาก CDN) ไม่มีขั้นตอน build
- โค้ดเกมเป็น ES modules ใน `src/` ส่วน `index.html` มีแค่ HTML + CSS (v0.3.1) ต้องเปิดผ่าน dev server หรือ GitHub Pages เพราะ module โหลดจาก `file://` ไม่ได้
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

## แผนที่โค้ดใน src/

แต่ละไฟล์ยังแบ่งเป็นหมวดด้วยคอมเมนต์ `// ---------- ชื่อหมวด ----------` เหมือนตอนเป็นไฟล์เดียว

| ไฟล์ | มีอะไร |
| --- | --- |
| `main.js` | จุดเริ่ม: `buildCity()`, `initInput()`, `reset()` แล้ววน `loop()` |
| `core/util.js` | `isTouch`, `$`, rng (`mulberry32`, `rand`/`R`/`pickS` แบบ seed, `rnd`/`pick`/`wpick` แบบสุ่มจริง), `clamp` |
| `core/renderer.js` | `renderer`, `scene`, `camera`, `camTarget`, แสง (`sun` `hemi` `flash` `muzzle` `boomLight`), `resize()`, `zoom()` |
| `core/state.js` | `G` (เวลา เฟส ฝน kills ฯลฯ), `freshG()` |
| `core/controls.js` | สถานะ input ที่หลายไฟล์ใช้ร่วม: `keys`, `ctl.fireHeld` / `ctl.fireQ`, `mouse`, `joy` |
| `config/time.js` | `DAY_REAL_SECONDS = 300`, `RATE`, `SPEEDS`, `NIGHT_START`, `DAY_START`, `DUSK_WARN`, `isNightTod()` |
| `config/world.js` | `RC` (เส้นกลางถนน), `OFF` (ระยะทางเท้า), `LIM`, `groundY()` |
| `config/items.js` | `GRADES`, `DEF` (อาวุธ กระสุน ยา), `SLOTNAME`, `gradeOf()`, `itemColor()` |
| `config/loot.js` | `POOLS`, `GRADE_W`, `MED_W`, `CAT_W` |
| `config/zombies.js` | `ZC` (HP ความเร็ว ระยะมอง ดาเมจ), `isSpecial()` |
| `world/textures.js` · `materials.js` | texture วาดด้วย canvas, วัสดุที่ใช้ร่วมกัน, `box()`, `part()` |
| `world/collision.js` · `sidewalk.js` | `solids` (กล่องชน), `collide()`, `rayWall()` · กราฟทางเท้าของ NPC |
| `world/props.js` · `city.js` | ต้นไม้ เสาไฟ รถ ตู้คอนเทนเนอร์ · `buildCity()`, `buildings`, `lootSpots`, `vendorSpots` |
| `world/item-models.js` · `occlusion.js` | โมเดลอาวุธและไอเท็ม · ทำตึกที่บังผู้เล่นให้โปร่งใส |
| `entities/agents.js` | ร่างตัวละคร, `agents`, `makeAgent()`, `styleZombie()`, `becomeZombie()`, `setKind()`, `spawnEdge()` |
| `entities/movement.js` · `ai.js` | `moveAgent()`, `followNodes()` · `updateHuman()`, `updateZombie()`, `hurtZombie()`, `makeNoise()` |
| `entities/player.js` · `animation.js` | `player`, `makePlayer()`, `updatePlayer()`, `syncHeld()` · `animate()`, `separate()` |
| `systems/drops.js` | `makeItem()`, `rollLoot()`, `drops`, `spawnDrop()`, `fillDay()`, `fillNight()`, `dropGuaranteed()` |
| `systems/inventory.js` · `combat.js` | `inv`, `pickup()`, `useHeal()`, `addStack()`, `takeAmmo()` · `fireGun()`, `meleeHit()`, `aimAssist()`, `hurtPlayer()` |
| `systems/phases.js` · `weather.js` | `EVENTS`, `runEvents()` (DAY/NIGHT, spawn กลางคืน) · `updateSky()` ฝน แสง ไฟถนน |
| `systems/effects.js` · `game.js` | เลือด วงแหวน tracer ระเบิด · `reset()` เริ่มเกมใหม่ |
| `ui/hud.js` · `bag.js` · `input.js` | `say()`, `feed()`, `updateHUD()`, `updateLoadout()`, `gameOver()` · หน้ากระเป๋า · คีย์บอร์ด เมาส์ จอยสติ๊ก ปุ่มบนจอ |

ค่าตัวเลขเกือบทั้งหมดอยู่ในตาราง `DEF`, `ZC`, `POOLS` และ `*_W` ใน `src/config/` แก้ที่ตารางก่อนแก้ตรรกะ

**ข้อควรระวังเวลาแก้โมดูล**

- `rand()` (seed 2626) ต้องถูกเรียกเฉพาะใน `buildCity()` ตามลำดับเดิม ไม่อย่างนั้นผังเมืองจะเปลี่ยน
- โค้ดระดับบนสุดของโมดูล (นอกฟังก์ชัน) ใช้ได้เฉพาะของจากโมดูลชั้นล่าง (`core`, `config`, `world`) เพราะโมดูลชั้นบน import วนกันเอง ตอนโหลดจะยังไม่พร้อม
- ตัวแปรที่หลายไฟล์ต้องเขียนให้เก็บใน object (`G`, `inv`, `ctl`) หรือมี setter (`setPlayer()`) เพราะ import ที่เป็น `let` เขียนทับจากไฟล์อื่นไม่ได้
- ยังใช้ Three.js r128 จาก CDN ไม่ต้องเพิ่ม build tool จนกว่าจะจำเป็น

## การทดสอบ

- `node tools/smoke-test.js` (หรือ `npm test`) จำลองเกม 2 วันเต็มแบบไม่มีหน้าจอ (THREE ถูกแทนด้วย stub) โดย import โมดูลใน `src/` แล้วรายงาน error ใช้จับบั๊กตรรกะเท่านั้น ไม่ได้ตรวจภาพ
- ต้องเปิดผ่าน dev server (`npx serve .`) แล้วทดสอบทั้งจอคอมและจอมือถือ (DevTools device mode) ก่อน commit
- ทดสอบด้วยตาทุกครั้ง: เริ่มเกม 07:30, การระบาด 09:30, เปลี่ยนเป็นกลางคืน 18:30, รุ่งเช้า 06:00, ยิงปืนทุกแบบ, เปิดกระเป๋า, ตายแล้วเล่นใหม่

## การสรุปงาน

ทุกครั้งที่ทำงานเสร็จ ให้สรุปว่า (1) เปลี่ยนอะไร (2) ค่าไหนเป็น placeholder (3) อะไรยังไม่ได้ทำ (4) ทดสอบอะไรไปแล้วบ้าง และอัปเดต `docs/project-summary-*.md` กับตารางประวัติเวอร์ชันใน `README.md`
