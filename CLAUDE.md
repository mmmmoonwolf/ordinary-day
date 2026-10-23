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
| `core/gltf.js` | `loadGltf(url)` โหลด GLTFLoader / SkeletonUtils จาก jsDelivr ครั้งเดียว ใช้ร่วมกันระหว่างตัวละครและโมเดลของ (v0.14) |
| `core/state.js` | `G` (เวลา เฟส ฝน kills ฯลฯ), `freshG()` |
| `core/bus.js` | คิวสิ่งที่ host ส่งไปเครื่องอื่น `bus` (`on`, `out`, `role` = off/host/client, `cmd`), `send(to,kind,args)`, `isClient()` |
| `core/controls.js` | สถานะปุ่มดิบ `keys`, `ctl`, `mouse`, `joy` อ่านได้เฉพาะ `ui/input.js` (แปลงเป็น `player.input` ใน `pollInput()`) |
| `config/time.js` | `DAY_REAL_SECONDS = 300`, `RATE`, `SPEEDS`, `NIGHT_START`, `DAY_START`, `DUSK_WARN`, `isNightTod()` |
| `config/world.js` | `RC` (เส้นกลางถนน), `OFF` (ระยะทางเท้า), `LIM`, `groundY()`, ฟาร์ม v0.22: `WALL_X` `GATE` `FARM` `inFarm()`, ขอบโลก `inWorld()` / `clampWorld()` (ใช้แทนการเช็ก `LIM` ตรง ๆ) |
| `config/items.js` | `GRADES`, `DEF` (อาวุธ กระสุน ยา อาหาร ไม้กระดาน ขวด, `dur` ความทนอาวุธประชิด), `STACKS` (ชนิดที่ซ้อนและเก็บอัตโนมัติ), `SLOTNAME`, `gradeOf()`, `itemColor()`, `durPct()`, `RING` / `ringColor()` สีวงแหวนของบนพื้นตามประเภท (v0.18) |
| `config/loot.js` | `POOLS`, `GRADE_W`, `MED_W`, `CAT_W`, `FOOD_W`, `INDOOR_W` (จุดในตึก, v0.14 PLACEHOLDER), `REFILL` / `refillScale()` / `TAKEN` (ของหายากตามวัน) |
| `config/zombies.js` | `ZC` (HP ความเร็ว ระยะมอง ดาเมจ โอกาสติดเชื้อ), `INFECT_MINUTES`, `INFECTION.on` (v0.18 ปิดอยู่), `isSpecial()` |
| `config/goal.js` | `GOAL_NIGHTS = 7`, `LZ`, `RESCUE_FROM` / `RESCUE_UNTIL`, `nightsSurvived()` |
| `config/party.js` | ล้มรอเพื่อนช่วย (`BLEED_SECONDS`, `REVIVE_SECONDS` ฯลฯ) และ `PARTY` สเกลตามจำนวนผู้เล่น (PLACEHOLDER), `partyOf()` |
| `config/shelter.js` | ค่าผนัง ประตู การได้ยินผ่านผนัง ไม้กระดาน และกลิ่น (PLACEHOLDER) |
| `config/stealth.js` | ย่องและขวด (PLACEHOLDER) |
| `config/events.js` | โอกาสเกิดเหตุการณ์ประจำวัน ขนาดฝูง, `DAILY` เหตุการณ์สุ่มทุกวัน v0.18 (PLACEHOLDER) |
| `config/search.js` | ค้นเฟอร์นิเจอร์ (v0.15 PLACEHOLDER): `SEARCH_SECONDS`, `SEARCH_RANGE`, `SEARCH_NOISE`, `RESTOCK`, `BOX` (ชื่อ จำนวนของ โอกาสว่าง น้ำหนักต่อชนิด) |
| `config/places.js` | ร้านค้าและโรงพยาบาล (v0.17 PLACEHOLDER): `PLACES` (ชื่อ ป้าย สี ชนิดตู้), `PLACE_W` ตารางจุดเกิดของในร้าน, `PLACE_FILL`, `PLACE_RESTOCK` |
| `config/version.js` | `VERSION` (ขึ้นหน้าเริ่มเกมและแนบในรายงานบั๊ก เปลี่ยนพร้อมตารางเวอร์ชันใน README), `REPO` |
| `config/needs.js` · `difficulty.js` | ค่าหิวกระหาย (PLACEHOLDER) · `DIFFS` ง่าย/ปกติ/ยาก (ตัวคูณ PLACEHOLDER), `diffOf(G)` |
| `world/textures.js` · `materials.js` | texture วาดด้วย canvas, วัสดุที่ใช้ร่วมกัน, `box()`, `part()` |
| `world/collision.js` · `sidewalk.js` | `solids` (กล่องชน), `collide()`, `rayWall()` · กราฟทางเท้าของ NPC |
| `world/props.js` · `city.js` | ต้นไม้ (`trees`) เสาไฟ (`flickers` ไฟเสีย v0.16) รถ (`b.car.burned`) รถพยาบาล ตู้คอนเทนเนอร์ `breakables` (รถ กองขยะ ม้านั่งที่ Tyrant ทุบได้) · `buildCity()`, `buildings`, `lootSpots`, `vendorSpots`, `pois`, `LAYOUT` |
| `world/interiors.js` | ตึกที่เข้าได้ `rooms`, `buildInteriors()`, `roomAt()`, `navStep()` / `viaDoor()` ทางผ่านประตู, `walledOff()` มีผนังกั้นไหม, `showRoom()` cutaway, `boxes` เฟอร์นิเจอร์ที่ค้นได้ (v0.15) และ `boxNear()`, ร้าน `r.place` ชั้นวางร้าน `shopShelves()` ป้าย `placeSign()` (v0.17) |
| `world/decor.js` | เมืองหลังการระบาด (v0.16): `decor` หญ้า พุ่มไม้ ป้าย ไฟจราจร (วาดใน `prop-models.js`), คราบเลือด น้ำมัน ขยะ, `buildDecor()` ใน `main.js` หลัง `buildInteriors()` rng ของตัวเอง ไม่มีกล่องชน |
| `world/clutter.js` | เมืองรกและห้องแน่น (v0.18 PLACEHOLDER): `buildClutter()` ใน `main.js` หลัง `buildDecor()` rng ของตัวเอง, ของเล็กต่อท้าย `decor` (มี `y`, `by:'w'`), ของหนัก `heavy` มีกล่องชนใน `solids` และกล่องเทาตอนกราฟิกต่ำ, ของในห้อง `roomDecor[k]` วาดใน `r.cut` |
| `world/farm.js` | ฟาร์มนอกเมือง (v0.22): `buildFarm()` ใน `main.js` หลัง `buildClutter()` rng ของตัวเอง, ช่องประตูกำแพงตะวันตก (`cityWall` ใน `city.js`), ตึกไม้ `shed()` + ห้องผ่าน `addRoom()` (`interiors.js`, โรงนาเป็น place `BARN`), ไร่ข้าวโพด `farm.corn`, `attach` โมเดลที่ติดกับตึก (ไม้ตีหน้าต่าง Kenney), ของกลางแจ้งเข้า `decor` / `heavy` (`solidAt()` / `furnish()` จาก `clutter.js`) |
| `world/item-models.js` · `occlusion.js` | โมเดลอาวุธและไอเท็ม (ใช้โมเดลจาก `prop-models.js` ถ้ามี ไม่อย่างนั้นแบบกล่องเดิม) · ทำตึกที่บังผู้เล่นให้โปร่งใส |
| `world/prop-models.js` | โมเดลปืน ของ และรถ (v0.14) เฟอร์นิเจอร์ (v0.15): `loadProps()`, `props`, `hasProp()`, `propModel()`, `setPropsOn()` รถวางทับกล่องเดิมของ `car()` ใน `breakables` (`b.car`) เฟอร์นิเจอร์ต่อเป็นแถวทับกล่องใน `boxes` (`FURN`) ต้นไม้และ `decor` รวมเป็นก้อน (`setTown()`, `bake()`) |
| `entities/agents.js` | ร่างตัวละคร, `agents`, `makeAgent()`, `styleZombie()`, `becomeZombie()`, `setKind()`, `spawnEdge()` |
| `entities/movement.js` · `ai.js` | `moveAgent()`, `followNodes()`, `wander()` (ออกจากตึกก่อน) · `updateHuman()`, `updateZombie()`, `hurtZombie()`, `makeNoise()` |
| `entities/skins.js` | โมเดลตัวละคร 3D (v0.13): `loadSkins()`, `dress(a)` / `undress(a)` (`a.sk`), `zombify(a)`, `skinFrame()` เลือกท่าจากสถานะ, `setSkinsOn()` (กราฟิกต่ำ = ตัวละครแบบเรียบ), `handOf(p)` |
| `entities/player.js` · `animation.js` | `players` (ทุกคน), `player` (คนในเครื่องนี้), `makePlayer(i)`, `updatePlayer(p,dt)`, `syncHeld(p)`, `targets()`, `nearestPlayerDist()`, `freshInput()`, `isDown()`, `startHelp(p,q)` (ช่วยลุก หรือชุบเพื่อนที่ตายด้วย Kit), `partySize()`, `isSolo()`, `viewed()` (คนที่กล้องตาม) · `animate()`, `separate()` |
| `systems/drops.js` | `makeItem()`, `rollLoot()`, `drops`, `spawnDrop()`, `fillDay()`, `fillNight()`, `takeByOthers()`, `dropGuaranteed()`, `reachableSpot()`, `refreshItems()` (สร้างโมเดลของบนพื้นใหม่) |
| `systems/search.js` | ค้นเฟอร์นิเจอร์ (v0.15): `nearBoxOf(p)`, `startSearch(p,i)`, `keepSearching(p,dt)`, `rollBox(kind)`, `restockBoxes()` ตอน 06:00, ที่ค้นแล้วอยู่ใน `G.searched` |
| `systems/inventory.js` · `combat.js` | `p.gear` ต่อคน, `freshGear()`, `pickup(p,d)`, `useHeal(p)`, `addStack(p,…)` (ช่องเดียวต่อชนิด ไม่จำกัด), `tidyBag(g)` รวมและเรียงกระเป๋า, `takeAmmo(p,…)` · `fireGun(p,…)`, `meleeHit(p,def)`, `aimAssist(p,def)`, `hurtPlayer(p,n)` (Kit → ล้มถ้ามีเพื่อนยืน → ตาย), `die(p)`, `standing(q)` |
| `systems/phases.js` · `weather.js` | `EVENTS`, `runEvents()` (DAY/NIGHT, spawn กลางคืน) · `updateSky()` ฝน แสง ไฟถนน |
| `systems/effects.js` · `game.js` | เลือด วงแหวน tracer ระเบิด · `reset()` เริ่มเกมใหม่ (ผู้เล่นในเครื่อง 1 คน), `addPlayer()` เพิ่มผู้เล่น |
| `systems/audio.js` · `records.js` | เสียงสังเคราะห์ `sfx.*` เสียงของโลก (ส่งถึงทุกเครื่อง), `sfxFor(p)` เสียงส่วนตัว, `playLocal()` (no-op ถ้าไม่มี WebAudio), `toggleMute()`, `setVolumes()`, เพลง `updateMusic()`, เสียงจริง v0.19 (`FILES` ใน `assets/sounds/`, `sample()`, `sfx.scream`, `thunder`) และฝน กรีดร้องไกล ๆ `updateAmbience()`, v0.20 เสียงซอมบี้ `groan` `zscream` `sfx.growl` หัวใจ เจ็บ และลม `makeWind()`, v0.21 ปืน `GUN_REC` รีโหลด `reload(model)` `sfx.hit` ประตู ไซเรน เฮลิคอปเตอร์ และเสียงวนตามแหล่ง `near()` (ไซเรนตำรวจ ไฟ) เสียงเท้าในตึก · `recordRun()` สถิติดีสุด |
| `systems/infection.js` · `goal.js` | `infectPlayer()`, `updateInfection()`, `cureInfection()` · `updateGoal()` เฮลิคอปเตอร์ ลูกศร และการชนะ |
| `systems/needs.js` · `obstacles.js` | `updateNeeds()` หิวกระหาย · `smashNear()`, `restoreObstacles()`, `applyBroken()` สิ่งกีดขวางที่ Tyrant ทุบ |
| `systems/actions.js` | คำสั่งของผู้เล่นทั้งหมดนอกจากเดินและโจมตี `ACTIONS`, `act(name,…)` (ปุ่มบนเครื่องเรียกอันนี้ เพื่อนจะส่งไป host เอง), `runAction(p,name,args)` บน host |
| `systems/doors.js` | `G.doors`, `toggleDoor()`, `damageDoor()`, `nearDoor()`, `fixDoor()` ไม้กระดาน, `restoreDoors()`, `applyDoors()`, `updateShelter()`, กลิ่น `G.stay` |
| `systems/events.js` | เหตุการณ์ประจำวัน `G.plan`, `planEvents()`, `updateEvents()`, เสบียง `G.drop`, ฝูง `a.march`, ไฟดับ `G.blackout`, เหตุการณ์สุ่มทุกวัน `planDaily(day)` (v0.18: `G.alarm` `G.site` `G.fog` `G.heat`) |
| `systems/throw.js` | ขวดที่ขว้าง `throwBottle()`, `updateThrows()`, `clearThrows()` |
| `systems/save.js` | เซฟอัตโนมัติ 1 ช่องใน localStorage: `saveGame()`, `loadGame()`, `readSave()`, `clearSave()`, `autosave()` |
| `ui/minimap.js` | แผนที่เล็ก `updateMinimap()` พื้นหลังวาดครั้งเดียวจาก `solids` / `LAYOUT` ส่วนที่ขยับวาดทุก 0.1 วินาที จุดสำคัญมาจาก `pois` ใน `world/city.js` |
| `ui/tips.js` | คำแนะนำครั้งแรกที่เจอสถานการณ์ ตาราง `TIPS` = [key, เงื่อนไข, ข้อความ] `updateTips()`, `setTipsOff()` |
| `ui/report.js` | ปุ่มแจ้งบั๊กในหน้าหยุดเกม `reportInfo()` (ข้อมูลที่แนบ), เก็บ error ล่าสุด 5 รายการตั้งแต่โหลดหน้า |
| `ui/settings.js` | หน้าตั้งค่า `settings` (คุณภาพ เสียง FPS ภาพฟิล์มเก่า `film`), `openSettings()`, `tickFps()` |
| `ui/pause.js` | หน้าหยุดเกม `openPause()`, `closePause()`, `togglePause()` ใช้ `G.paused` แบบเดียวกับกระเป๋า เปิดได้ทีละหน้า |
| `ui/hud.js` · `bag.js` · `input.js` | `say()`, `feed()` (ถึงทุกคน), `uiFor(p)` ข้อความ จอแดง (`hurt()`) ถึงผู้เล่นคนเดียว, `receive(m)` แสดงสิ่งที่ host ส่งมา, `updateHUD()`, `updateLoadout()`, `gameOver()` · หน้ากระเป๋า (ของ `player`) · คีย์บอร์ด เมาส์ จอยสติ๊ก ปุ่มบนจอ, `pollInput(p)` |
| `net/link.js` · `host.js` · `client.js` · `snapshot.js` | PeerJS (`hostRoom`, `joinRoom`, `setTransport` สำหรับเทสต์) · เปิดห้อง `room`, `openRoom()`, `closeRoom()`, `hostFrame()` · เข้าห้อง `join()`, `leave()`, `clientStep()` · `encodeWorld()` / `applyWorld()` |
| `ui/online.js` | ช่องรหัสห้องหน้าแรก ปุ่มเปิดห้องในเมนูหยุดเกม `refreshOnline()` |
| `ui/prompts.js` | ปุ่มเก็บของ / ประตู / ค้อน ของผู้เล่นในเครื่อง `updatePrompts()` |

ค่าตัวเลขเกือบทั้งหมดอยู่ในตาราง `DEF`, `ZC`, `POOLS` และ `*_W` ใน `src/config/` แก้ที่ตารางก่อนแก้ตรรกะ

**ข้อควรระวังเวลาแก้โมดูล**

- `rand()` (seed 2626) ต้องถูกเรียกเฉพาะใน `buildCity()` ตามลำดับเดิม ไม่อย่างนั้นผังเมืองจะเปลี่ยน ของที่เพิ่มทีหลัง (เช่นรถพยาบาล) ให้วางท้าย `buildCity()` โดยไม่เรียก `rand()` และต่อ `lootSpots` ท้ายสุด
- โค้ดระดับบนสุดของโมดูล (นอกฟังก์ชัน) ใช้ได้เฉพาะของจากโมดูลชั้นล่าง (`core`, `config`, `world`) เพราะโมดูลชั้นบน import วนกันเอง ตอนโหลดจะยังไม่พร้อม
- ตัวแปรที่หลายไฟล์ต้องเขียนให้เก็บใน object (`G`, `ctl`, ผู้เล่นแต่ละคน) หรือมี setter (`setPlayer()`) เพราะ import ที่เป็น `let` เขียนทับจากไฟล์อื่นไม่ได้
- **หลายผู้เล่น (v0.9):** ตรรกะเกมห้ามอ้าง `player` (คนในเครื่อง) ตรง ๆ ให้รับผู้เล่นเป็นพารามิเตอร์ตัวแรก (`pickup(p,…)`) หรือวน `players` ซอมบี้เลือกเป้าจาก `targets()` `player` ใช้ได้เฉพาะกล้อง HUD แผนที่ เสียง และ cutaway ข้อความถึงผู้เล่นคนใดคนหนึ่งใช้ `uiFor(p).feed(…)` ข้อความถึงทุกคน (กลางคืน วิทยุ) ใช้ `say()` ได้ เสียงส่วนตัว (รีโหลด เก็บของ) ใช้ `sfxFor(p)` ห้ามเขียน `if(p.local)sfx…` เพราะเครื่องของคนอื่นจะไม่ได้ยิน เอฟเฟกต์ใหม่ที่เครื่องอื่นต้องเห็นให้ส่งผ่าน `send()` และเพิ่มใน `FX` / `receive()` ตรรกะเกมห้ามอ่าน `keys` / `mouse` / `joy` ให้อ่าน `p.input` (ชื่อ `p.inv` คือเวลาอมตะ กระเป๋าคือ `p.gear`)
- สิ่งที่เปลี่ยนสถานะเกมต้องอยู่ใน `simStep()` (จังหวะคงที่) ไม่ใช่ในส่วนวาดภาพ เพื่อให้ทุกเครื่องจำลองเหมือนกันตอนเล่นออนไลน์
- **ออนไลน์ (v0.12):** เครื่องเพื่อน (`bus.role==='client'`) ไม่รันตรรกะเกม ปุ่มหรือคำสั่งใหม่ของผู้เล่นต้องเพิ่มใน `ACTIONS` แล้วให้ UI เรียก `act()` ห้ามเรียกฟังก์ชันตรรกะกับ `player` จาก UI ตรง ๆ ไม่อย่างนั้นเพื่อนกดแล้วไม่เกิดอะไร ค่าใหม่ที่จอของเพื่อนต้องเห็น (บนตัวละคร ผู้เล่น หรือ `G`) ต้องเพิ่มใน `encodeWorld()` และ `applyWorld()` ตรรกะที่ทำงานต่อเฟรม (เช่นใน `updateGoal`) ต้องข้ามเมื่อ `isClient()` ผู้เล่นที่ `away` ต้องไม่ถูกนับเป็นคนที่เล่นอยู่
- เพิ่ม field ใหม่ให้ agent, `G`, `inv` หรือไอเท็ม ต้องดูว่าเซฟใน `systems/save.js` ต้องเก็บด้วยไหม ถ้าเปลี่ยนรูปแบบเซฟ ผังเมือง หรือลำดับ `lootSpots` ให้เพิ่ม `SAVE_VERSION` เซฟเก่าจะถูกข้ามแทนที่จะโหลดผิด (`G.broken` เก็บลำดับใน `breakables` ถ้าลำดับการสร้างรถ กองขยะ หรือม้านั่งเปลี่ยนก็ต้องเพิ่มเหมือนกัน)
- `buildInteriors()` รันหลัง `buildCity()` ด้วย rng ของตัวเอง (`mulberry32(606)`) และเลือกตึกตามลำดับใน `buildings` ถ้าเปลี่ยนวิธีเลือกตึกหรือลำดับจุดเกิดของในตึก `G.doors` และจุดของในเซฟเก่าจะชี้ผิด ให้เพิ่ม `SAVE_VERSION`
- ระยะ "มองเห็น" ของซอมบี้ต้องผ่าน `walledOff()` เสมอเมื่อมีฝ่ายหนึ่งอยู่ในตึก อะไรที่ทำดาเมจเป็นวงหรือตีประชิดก็ต้องเช็กด้วย ไม่อย่างนั้นจะทะลุผนัง
- ยังใช้ Three.js r128 จาก CDN ไม่ต้องเพิ่ม build tool จนกว่าจะจำเป็น
- **ตัวละคร 3D (v0.13):** โมเดลเป็นแค่ภาพ ตรรกะเกมห้ามอ่าน `a.sk` ตัวละครแบบเรียบ (`a.b`) ต้องยังทำงานครบเพราะใช้ตอนกราฟิกต่ำ ตอนยังโหลดไม่เสร็จ และในเทสต์ (Node ไม่โหลดโมเดล) สถานะใหม่ที่ควรมีท่าทางให้เพิ่มใน `skinFrame()` แก้ชุดตัวละครที่ `tools/build-characters.mjs` แล้ว build ใหม่ อย่าแก้ไฟล์ `.glb` ด้วยมือ โมเดลปืน ของ และรถ (v0.14) กติกาเดียวกัน: ภาพอย่างเดียว แบบกล่องเดิมต้องใช้ได้ แก้ที่ `tools/build-props.mjs`

## การทดสอบ

- GitHub Actions รัน `npm test` ทุก PR และทุก push เข้า `main` (`.github/workflows/smoke-test.yml`) อย่า merge ถ้าแดง
- `npm test` รัน `tools/smoke-test.js` แล้ว `tools/net-test.js` (host กับเพื่อน 2 process คุยผ่าน IPC แทน WebRTC: เข้าห้อง โลกตรงกัน เดิน เก็บของ กระเป๋า ข้อความ หลุดแล้วกลับเข้า จบเกมแล้วเริ่มใหม่ ปิดห้อง) ทั้งสองใช้ stub จาก `tools/headless.js`
- `node tools/smoke-test.js` จำลองเกม 2 วันเต็มแบบไม่มีหน้าจอ (THREE ถูกแทนด้วย stub) โดย import โมดูลใน `src/` แล้วรายงาน error ใช้จับบั๊กตรรกะเท่านั้น ไม่ได้ตรวจภาพ
- ต้องเปิดผ่าน dev server (`npx serve .`) แล้วทดสอบทั้งจอคอมและจอมือถือ (DevTools device mode) ก่อน commit
- ทดสอบด้วยตาทุกครั้ง: เริ่มเกม 07:30, การระบาด 09:30, เปลี่ยนเป็นกลางคืน 18:30, รุ่งเช้า 06:00, ยิงปืนทุกแบบ, เปิดกระเป๋า, ตายแล้วเล่นใหม่, รีเฟรชหน้าแล้วกดเล่นต่อ, ติดเชื้อแล้วใช้ Antibiotic, เปิดปิดเสียง, หยุดเกมแล้วเซฟเองและกลับหน้าแรก, เก็บ Resurrection Kit ที่รถพยาบาล, คำแนะนำไม่บังตัวละครบนจอแคบ, แผนที่ไม่ทับ HUD ตอนติดเชื้อและมีข้อความยาว (จอ 360 / 412 / 700 / 1280), ดู HUD ที่จอกว้าง 360 px และมือถือแนวนอน 896×414 / 667×375 (ไม่มีอะไรทับกัน แตะสองครั้งหรือถ่างนิ้วแล้วหน้าเว็บไม่ซูม), เช้าวันที่ 8 ตามลูกศรไปขึ้นเฮลิคอปเตอร์, เลือกระดับความยากแล้วเริ่มเกม, กินและดื่มด้วยปุ่ม 🍴, ตีจนอาวุธประชิดพัง, ยิง Armor Walker จากด้านหลัง, Tyrant ทุบรถแล้วรีเฟรชหน้าเล่นต่อ, เข้าตึกแล้วปิดประตู (คอมกด E มือถือแตะปุ่มประตู) ดูหลังคาหายและเห็นข้างใน, ซอมบี้มาพังประตูตอนกลางคืน, ทิ้งกระสุนจากกระเป๋าแล้วไม่เด้งกลับ, เก็บกระสุน ยา อาหารชนิดเดียวกันหลายกองแล้วรวมเป็นช่องเดียว, กระเป๋าเต็มแล้วเหยียบกระสุนเห็นปุ่มกระเป๋าเต็ม, แจ้งบั๊กจากหน้าหยุดเกมแล้วกดคัดลอก, เพิ่มผู้เล่นคนที่ 2 จาก console (`addPlayer()`) ให้ล้มแล้วกดช่วยเพื่อนลุก และให้ตัวเองล้มแล้วดูปุ่มนับถอยหลัง, มีผู้เล่น 2 คนแล้วเปิดกระเป๋า (นาฬิกาเดินต่อ ปุ่ม ×1 หายไป), ให้เพื่อนตายแล้วใช้ Resurrection Kit ชุบ, ตัวเองตายแล้วกล้องตามเพื่อน, เปิดห้องจากเมนูหยุดเกมแล้วให้เพื่อนอีกเครื่อง (หรืออีกหน้าต่าง) เข้าด้วยรหัส เดิน ยิง เก็บของ เปิดกระเป๋า แล้วรีเฟรชหน้าของเพื่อนและเข้าห้องเดิม, ปืน ของบนพื้น และรถเป็นโมเดลใหม่หลังโหลด (ปืนชี้ไปทางที่หันทั้งตอนยืน วิ่ง และยิง ตั้งกราฟิก "ต่ำ" แล้วกลับเป็นกล่อง Tyrant ทุบรถแล้วยุบ) และเข้าตึกค้นเฟอร์นิเจอร์ (เดินหรือโดนตีแล้วหยุดค้น ชิ้นที่ค้นแล้วไม่ขึ้นปุ่ม รีเฟรชหน้าแล้วยังค้นแล้ว เพื่อนออนไลน์เห็นปุ่มค้นและ %), ร้านค้าและโรงพยาบาลมีป้ายเหนือประตูและบนแผนที่ ค้นตู้ในร้านได้ของตามร้าน ปิดเปิดภาพฟิล์มเก่าในหน้าตั้งค่า, เมืองมีต้นไม้ หญ้า ป้าย คราบเลือด รถไฟไหม้ ไฟถนนกะพริบตอนกลางคืน หมอกตอนเช้า และกราฟิก "ต่ำ" กลับเป็นต้นไม้แบบเดิม, ตัวละคร 3D ขึ้นครบหลังโหลด (หน้าแรกบอกความคืบหน้า) ซอมบี้ยื่นแขน ท่าเดิน วิ่ง ยิง ฟาด ตาย ถูกต้อง อาวุธอยู่ในมือ และตั้งกราฟิก "ต่ำ" แล้วกลับเป็นตัวละครแบบเรียบ, ตอกไม้ประตูและซ่อมประตูที่พัง, ย่องผ่านซอมบี้, ขว้างขวดล่อซอมบี้ตอนกลางคืน, หลบตึกเดิมทั้งคืนแล้วซอมบี้มาพังประตู, เปลี่ยนคุณภาพกราฟิกและเสียงในหน้าตั้งค่า, เพลงเปลี่ยนตอนกลางคืนและตอนโดนไล่, เสบียงทิ้งจากฟ้า ฝูงซอมบี้ และไฟดับ, วงแหวนของบนพื้นสีตามประเภท (เปิดและปิดภาพฟิล์มเก่า), เหตุการณ์สุ่มทุกวันและจุดบนแผนที่, เมืองรก (รถบัส ถังขยะใหญ่ชนได้ กราฟิก "ต่ำ" เป็นกล่อง) และของเต็มห้องในตึกแต่ยังเดินจากประตูถึงตู้ได้, เดินผ่านประตูกำแพงตะวันตกไปฟาร์ม (กำแพงส่วนอื่นเดินทะลุไม่ได้) เข้าโรงนาแล้วปิดประตู แผนที่เล็กเลื่อนไปฟาร์มและกลับ ซอมบี้ไล่ตามผ่านประตูกำแพง, เสียงกรีดร้องตอนซอมบี้กัดคนและตอนตาย เสียงฝน (เข้าตึกแล้วเบาลง) ฟ้าแลบฟ้าร้องตอนฝนหนัก, ซอมบี้ครางเมื่ออยู่ใกล้และกรีดตอนเห็นเรา หัวใจเต้นตอนโดนไล่หรือ HP ต่ำ เสียงลมแรงขึ้นตอนกลางคืน, ยิงปืนทุกแบบและรีโหลดได้ยินเสียงจริง ไซเรนก่อนมืด รถตำรวจกลางคืน ไฟที่รถไหม้ เสียงเท้าในตึก และปุ่มปิดเสียงปิดได้ทั้งหมด

## การสรุปงาน

ทุกครั้งที่ทำงานเสร็จ ให้สรุปว่า (1) เปลี่ยนอะไร (2) ค่าไหนเป็น placeholder (3) อะไรยังไม่ได้ทำ (4) ทดสอบอะไรไปแล้วบ้าง และอัปเดต `docs/project-summary.md`, ตารางประวัติเวอร์ชันใน `README.md` และ `VERSION` ใน `src/config/version.js`
