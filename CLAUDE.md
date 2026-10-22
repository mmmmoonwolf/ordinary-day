# CLAUDE.md — กติกาสำหรับพัฒนา Ordinary Day

เอกสารนี้สำหรับ Claude Code และ AI ที่ช่วยพัฒนาเกม อ่านให้ครบก่อนแก้โค้ด

## บริบท

- เกม isometric 3D zombie survival บนเว็บ ใช้ Three.js r128 (global `THREE` จาก CDN) ไม่มีขั้นตอน build
- โค้ดเกมเป็น ES modules ใน `src/` ส่วน `index.html` มีแค่ HTML + CSS (v0.3.1) ต้องเปิดผ่าน dev server หรือ GitHub Pages เพราะ module โหลดจาก `file://` ไม่ได้
- ระบบทั้งหมดและตัวเลขทุกค่าอยู่ใน `docs/project-summary.md`
- สเปกจากทีมอยู่ใน `docs/design-draft-01.md` คำถาม Q01–Q12 ของสเปกผู้สร้างยืนยันแล้ว (ดูตาราง Decision Log ใน project summary) ถือเป็นข้อกำหนดเหมือน `[CONFIRMED — USER]`
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
| `main.js` | จุดเริ่ม: `buildCity()`, `initInput()`, `reset()` แล้ววน `loop()` · `simStep()` จำลองเกมทีละ `STEP` = 1/60 วินาที ส่วนวาดภาพ animation HUD ทำทุกเฟรม |
| `core/util.js` | `isTouch`, `$`, rng (`mulberry32`, `rand`/`R`/`pickS` แบบ seed, `rnd`/`pick`/`wpick` แบบสุ่มจริง), `clamp` |
| `core/renderer.js` | `renderer`, `scene`, `camera`, `camTarget`, แสง (`sun` `hemi` `flash` `muzzle` `boomLight`), `resize()`, `zoom()`, `QUALITY` / `setQuality()` |
| `core/state.js` | `G` (เวลา เฟส ฝน kills ฯลฯ), `freshG()` |
| `core/controls.js` | สถานะปุ่มดิบ `keys`, `ctl`, `mouse`, `joy` อ่านได้เฉพาะ `ui/input.js` (แปลงเป็น `player.input` ใน `pollInput()`) |
| `config/time.js` | `DAY_REAL_SECONDS = 300`, `RATE`, `SPEEDS`, `NIGHT_START`, `DAY_START`, `DUSK_WARN`, `isNightTod()` |
| `config/world.js` | `RC` (เส้นกลางถนน), `OFF` (ระยะทางเท้า), `LIM`, `groundY()` |
| `config/items.js` | `GRADES`, `DEF` (อาวุธ กระสุน ยา อาหาร ไม้กระดาน ขวด, `dur` ความทนอาวุธประชิด), `STACKS` (ชนิดที่ซ้อนและเก็บอัตโนมัติ), `SLOTNAME`, `gradeOf()`, `itemColor()`, `durPct()` |
| `config/loot.js` | `POOLS`, `GRADE_W`, `MED_W`, `CAT_W`, `FOOD_W`, `REFILL` / `refillScale()` / `TAKEN` (ของหายากตามวัน) |
| `config/zombies.js` | `ZC` (HP ความเร็ว ระยะมอง ดาเมจ โอกาสติดเชื้อ), `INFECT_MINUTES`, `isSpecial()` |
| `config/goal.js` | `GOAL_NIGHTS = 7`, `LZ`, `RESCUE_FROM` / `RESCUE_UNTIL`, `nightsSurvived()` |
| `config/party.js` | ล้มรอเพื่อนช่วย (`BLEED_SECONDS`, `REVIVE_SECONDS` ฯลฯ) และ `PARTY` สเกลตามจำนวนผู้เล่น (PLACEHOLDER), `partyOf()` |
| `config/shelter.js` | ค่าผนัง ประตู การได้ยินผ่านผนัง ไม้กระดาน และกลิ่น (PLACEHOLDER) |
| `config/stealth.js` | ย่องและขวด (PLACEHOLDER) |
| `config/events.js` | โอกาสเกิดเหตุการณ์ประจำวัน ขนาดฝูง (PLACEHOLDER) |
| `config/version.js` | `VERSION` (ขึ้นหน้าเริ่มเกมและแนบในรายงานบั๊ก เปลี่ยนพร้อมตารางเวอร์ชันใน README), `REPO` |
| `config/needs.js` · `difficulty.js` | ค่าหิวกระหาย (PLACEHOLDER) · `DIFFS` ง่าย/ปกติ/ยาก (ตัวคูณ PLACEHOLDER), `diffOf(G)` |
| `world/textures.js` · `materials.js` | texture วาดด้วย canvas, วัสดุที่ใช้ร่วมกัน, `box()`, `part()` |
| `world/collision.js` · `sidewalk.js` | `solids` (กล่องชน), `collide()`, `rayWall()` · กราฟทางเท้าของ NPC |
| `world/props.js` · `city.js` | ต้นไม้ เสาไฟ รถ รถพยาบาล ตู้คอนเทนเนอร์ `breakables` (รถ กองขยะ ม้านั่งที่ Tyrant ทุบได้) · `buildCity()`, `buildings`, `lootSpots`, `vendorSpots`, `pois`, `LAYOUT` |
| `world/interiors.js` | ตึกที่เข้าได้ `rooms`, `buildInteriors()`, `roomAt()`, `navStep()` / `viaDoor()` ทางผ่านประตู, `walledOff()` มีผนังกั้นไหม, `showRoom()` cutaway |
| `world/item-models.js` · `occlusion.js` | โมเดลอาวุธและไอเท็ม · ทำตึกที่บังผู้เล่นให้โปร่งใส |
| `entities/agents.js` | ร่างตัวละคร, `agents`, `makeAgent()`, `styleZombie()`, `becomeZombie()`, `setKind()`, `spawnEdge()` |
| `entities/movement.js` · `ai.js` | `moveAgent()`, `followNodes()`, `wander()` (ออกจากตึกก่อน) · `updateHuman()`, `updateZombie()`, `hurtZombie()`, `makeNoise()` |
| `entities/player.js` · `animation.js` | `players` (ทุกคน), `player` (คนในเครื่องนี้), `makePlayer(i)`, `updatePlayer(p,dt)`, `syncHeld(p)`, `targets()`, `nearestPlayerDist()`, `freshInput()`, `isDown()`, `startHelp(p,q)`, `partySize()` · `animate()`, `separate()` |
| `systems/drops.js` | `makeItem()`, `rollLoot()`, `drops`, `spawnDrop()`, `fillDay()`, `fillNight()`, `takeByOthers()`, `dropGuaranteed()`, `reachableSpot()` |
| `systems/inventory.js` · `combat.js` | `p.gear` ต่อคน, `freshGear()`, `pickup(p,d)`, `useHeal(p)`, `addStack(p,…)`, `takeAmmo(p,…)` · `fireGun(p,…)`, `meleeHit(p,def)`, `aimAssist(p,def)`, `hurtPlayer(p,n)` (Kit → ล้มถ้ามีเพื่อนยืน → ตาย), `die(p)`, `standing(q)` |
| `systems/phases.js` · `weather.js` | `EVENTS`, `runEvents()` (DAY/NIGHT, spawn กลางคืน) · `updateSky()` ฝน แสง ไฟถนน |
| `systems/effects.js` · `game.js` | เลือด วงแหวน tracer ระเบิด · `reset()` เริ่มเกมใหม่ (ผู้เล่นในเครื่อง 1 คน), `addPlayer()` เพิ่มผู้เล่น |
| `systems/audio.js` · `records.js` | เสียงสังเคราะห์ `sfx.*` (no-op ถ้าไม่มี WebAudio), `toggleMute()`, `setVolumes()`, เพลง `updateMusic()` · `recordRun()` สถิติดีสุด |
| `systems/infection.js` · `goal.js` | `infectPlayer()`, `updateInfection()`, `cureInfection()` · `updateGoal()` เฮลิคอปเตอร์ ลูกศร และการชนะ |
| `systems/needs.js` · `obstacles.js` | `updateNeeds()` หิวกระหาย · `smashNear()`, `restoreObstacles()`, `applyBroken()` สิ่งกีดขวางที่ Tyrant ทุบ |
| `systems/doors.js` | `G.doors`, `toggleDoor()`, `damageDoor()`, `nearDoor()`, `fixDoor()` ไม้กระดาน, `restoreDoors()`, `applyDoors()`, `updateShelter()`, กลิ่น `G.stay` |
| `systems/events.js` | เหตุการณ์ประจำวัน `G.plan`, `planEvents()`, `updateEvents()`, เสบียง `G.drop`, ฝูง `a.march`, ไฟดับ `G.blackout` |
| `systems/throw.js` | ขวดที่ขว้าง `throwBottle()`, `updateThrows()`, `clearThrows()` |
| `systems/save.js` | เซฟอัตโนมัติ 1 ช่องใน localStorage: `saveGame()`, `loadGame()`, `readSave()`, `clearSave()`, `autosave()` |
| `ui/minimap.js` | แผนที่เล็ก `updateMinimap()` พื้นหลังวาดครั้งเดียวจาก `solids` / `LAYOUT` ส่วนที่ขยับวาดทุก 0.1 วินาที จุดสำคัญมาจาก `pois` ใน `world/city.js` |
| `ui/tips.js` | คำแนะนำครั้งแรกที่เจอสถานการณ์ ตาราง `TIPS` = [key, เงื่อนไข, ข้อความ] `updateTips()`, `setTipsOff()` |
| `ui/report.js` | ปุ่มแจ้งบั๊กในหน้าหยุดเกม `reportInfo()` (ข้อมูลที่แนบ), เก็บ error ล่าสุด 5 รายการตั้งแต่โหลดหน้า |
| `ui/settings.js` | หน้าตั้งค่า `settings` (คุณภาพ เสียง FPS), `openSettings()`, `tickFps()` |
| `ui/pause.js` | หน้าหยุดเกม `openPause()`, `closePause()`, `togglePause()` ใช้ `G.paused` แบบเดียวกับกระเป๋า เปิดได้ทีละหน้า |
| `ui/hud.js` · `bag.js` · `input.js` | `say()`, `feed()`, `uiFor(p)` ข้อความถึงผู้เล่นคนเดียว, `updateHUD()`, `updateLoadout()`, `gameOver()` · หน้ากระเป๋า (ของ `player`) · คีย์บอร์ด เมาส์ จอยสติ๊ก ปุ่มบนจอ, `pollInput(p)` |
| `ui/prompts.js` | ปุ่มเก็บของ / ประตู / ค้อน ของผู้เล่นในเครื่อง `updatePrompts()` |

ค่าตัวเลขเกือบทั้งหมดอยู่ในตาราง `DEF`, `ZC`, `POOLS` และ `*_W` ใน `src/config/` แก้ที่ตารางก่อนแก้ตรรกะ

**ข้อควรระวังเวลาแก้โมดูล**

- `rand()` (seed 2626) ต้องถูกเรียกเฉพาะใน `buildCity()` ตามลำดับเดิม ไม่อย่างนั้นผังเมืองจะเปลี่ยน ของที่เพิ่มทีหลัง (เช่นรถพยาบาล) ให้วางท้าย `buildCity()` โดยไม่เรียก `rand()` และต่อ `lootSpots` ท้ายสุด
- โค้ดระดับบนสุดของโมดูล (นอกฟังก์ชัน) ใช้ได้เฉพาะของจากโมดูลชั้นล่าง (`core`, `config`, `world`) เพราะโมดูลชั้นบน import วนกันเอง ตอนโหลดจะยังไม่พร้อม
- ตัวแปรที่หลายไฟล์ต้องเขียนให้เก็บใน object (`G`, `ctl`, ผู้เล่นแต่ละคน) หรือมี setter (`setPlayer()`) เพราะ import ที่เป็น `let` เขียนทับจากไฟล์อื่นไม่ได้
- **หลายผู้เล่น (v0.9):** ตรรกะเกมห้ามอ้าง `player` (คนในเครื่อง) ตรง ๆ ให้รับผู้เล่นเป็นพารามิเตอร์ตัวแรก (`pickup(p,…)`) หรือวน `players` ซอมบี้เลือกเป้าจาก `targets()` `player` ใช้ได้เฉพาะกล้อง HUD แผนที่ เสียง และ cutaway ข้อความถึงผู้เล่นคนใดคนหนึ่งใช้ `uiFor(p).feed(…)` ข้อความถึงทุกคน (กลางคืน วิทยุ) ใช้ `say()` ได้ ตรรกะเกมห้ามอ่าน `keys` / `mouse` / `joy` ให้อ่าน `p.input` (ชื่อ `p.inv` คือเวลาอมตะ กระเป๋าคือ `p.gear`)
- สิ่งที่เปลี่ยนสถานะเกมต้องอยู่ใน `simStep()` (จังหวะคงที่) ไม่ใช่ในส่วนวาดภาพ เพื่อให้ทุกเครื่องจำลองเหมือนกันตอนเล่นออนไลน์
- เพิ่ม field ใหม่ให้ agent, `G`, `inv` หรือไอเท็ม ต้องดูว่าเซฟใน `systems/save.js` ต้องเก็บด้วยไหม ถ้าเปลี่ยนรูปแบบเซฟ ผังเมือง หรือลำดับ `lootSpots` ให้เพิ่ม `SAVE_VERSION` เซฟเก่าจะถูกข้ามแทนที่จะโหลดผิด (`G.broken` เก็บลำดับใน `breakables` ถ้าลำดับการสร้างรถ กองขยะ หรือม้านั่งเปลี่ยนก็ต้องเพิ่มเหมือนกัน)
- `buildInteriors()` รันหลัง `buildCity()` ด้วย rng ของตัวเอง (`mulberry32(606)`) และเลือกตึกตามลำดับใน `buildings` ถ้าเปลี่ยนวิธีเลือกตึกหรือลำดับจุดเกิดของในตึก `G.doors` และจุดของในเซฟเก่าจะชี้ผิด ให้เพิ่ม `SAVE_VERSION`
- ระยะ "มองเห็น" ของซอมบี้ต้องผ่าน `walledOff()` เสมอเมื่อมีฝ่ายหนึ่งอยู่ในตึก อะไรที่ทำดาเมจเป็นวงหรือตีประชิดก็ต้องเช็กด้วย ไม่อย่างนั้นจะทะลุผนัง
- ยังใช้ Three.js r128 จาก CDN ไม่ต้องเพิ่ม build tool จนกว่าจะจำเป็น

## การทดสอบ

- GitHub Actions รัน `npm test` ทุก PR และทุก push เข้า `main` (`.github/workflows/smoke-test.yml`) อย่า merge ถ้าแดง
- `node tools/smoke-test.js` (หรือ `npm test`) จำลองเกม 2 วันเต็มแบบไม่มีหน้าจอ (THREE ถูกแทนด้วย stub) โดย import โมดูลใน `src/` แล้วรายงาน error ใช้จับบั๊กตรรกะเท่านั้น ไม่ได้ตรวจภาพ
- ต้องเปิดผ่าน dev server (`npx serve .`) แล้วทดสอบทั้งจอคอมและจอมือถือ (DevTools device mode) ก่อน commit
- ทดสอบด้วยตาทุกครั้ง: เริ่มเกม 07:30, การระบาด 09:30, เปลี่ยนเป็นกลางคืน 18:30, รุ่งเช้า 06:00, ยิงปืนทุกแบบ, เปิดกระเป๋า, ตายแล้วเล่นใหม่, รีเฟรชหน้าแล้วกดเล่นต่อ, ติดเชื้อแล้วใช้ Antibiotic, เปิดปิดเสียง, หยุดเกมแล้วเซฟเองและกลับหน้าแรก, เก็บ Resurrection Kit ที่รถพยาบาล, คำแนะนำไม่บังตัวละครบนจอแคบ, แผนที่ไม่ทับ HUD ตอนติดเชื้อและมีข้อความยาว (จอ 360 / 412 / 700 / 1280), ดู HUD ที่จอกว้าง 360 px, เช้าวันที่ 8 ตามลูกศรไปขึ้นเฮลิคอปเตอร์, เลือกระดับความยากแล้วเริ่มเกม, กินและดื่มด้วยปุ่ม 🍴, ตีจนอาวุธประชิดพัง, ยิง Armor Walker จากด้านหลัง, Tyrant ทุบรถแล้วรีเฟรชหน้าเล่นต่อ, เข้าตึกแล้วปิดประตู (คอมกด E มือถือแตะปุ่มประตู) ดูหลังคาหายและเห็นข้างใน, ซอมบี้มาพังประตูตอนกลางคืน, ทิ้งกระสุนจากกระเป๋าแล้วไม่เด้งกลับ, กระเป๋าเต็มแล้วเหยียบกระสุนเห็นปุ่มกระเป๋าเต็ม, แจ้งบั๊กจากหน้าหยุดเกมแล้วกดคัดลอก, เพิ่มผู้เล่นคนที่ 2 จาก console (`addPlayer()`) ให้ล้มแล้วกดช่วยเพื่อนลุก และให้ตัวเองล้มแล้วดูปุ่มนับถอยหลัง, ตอกไม้ประตูและซ่อมประตูที่พัง, ย่องผ่านซอมบี้, ขว้างขวดล่อซอมบี้ตอนกลางคืน, หลบตึกเดิมทั้งคืนแล้วซอมบี้มาพังประตู, เปลี่ยนคุณภาพกราฟิกและเสียงในหน้าตั้งค่า, เพลงเปลี่ยนตอนกลางคืนและตอนโดนไล่, เสบียงทิ้งจากฟ้า ฝูงซอมบี้ และไฟดับ

## การสรุปงาน

ทุกครั้งที่ทำงานเสร็จ ให้สรุปว่า (1) เปลี่ยนอะไร (2) ค่าไหนเป็น placeholder (3) อะไรยังไม่ได้ทำ (4) ทดสอบอะไรไปแล้วบ้าง และอัปเดต `docs/project-summary.md`, ตารางประวัติเวอร์ชันใน `README.md` และ `VERSION` ใน `src/config/version.js`
