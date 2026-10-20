# ORDINARY DAY — GAME SYSTEM DESIGN (DRAFT 01)

> **เกม:** วันธรรมดา (Ordinary Day)  
> **เอกสาร:** ระบบ Day/Night, Item Rank, Medicine และ Zombie Classes  
> **อ้างอิงฐานระบบ:** Prototype v0.2 จากไฟล์ `วันธรรมดา (Ordinary Day) — สรุปโปรเจกต์เกม.md` (20 ตุลาคม 2026)  
> **สถานะ:** Design Draft สำหรับหารือและนำไปพัฒนากับ Claude; **ยังไม่ใช่สเปกที่อนุมัติให้แก้โค้ดทั้งหมด**  
> **รูปแบบเกม:** Isometric 3D • Zombie Survival • Open-world Sandbox • Browser / PC / Mobile  
> **เทคโนโลยีฐาน:** Three.js r128 / JavaScript / HTML ไฟล์เดียว (ตามเอกสาร v0.2)

## วิธีอ่านสเปก (สำคัญ)

- **[CONFIRMED — USER]** = ข้อกำหนดจากผู้สร้างเกม ให้ยึดตามนี้ก่อน
- **[EXISTING v0.2]** = สิ่งที่มีอยู่ตามเอกสารโปรเจกต์เดิม ไม่ใช่สิ่งที่ยืนยันจากการรันทดสอบ
- **[PROPOSED]** = ไอเดียเพิ่มเติมจากการวิเคราะห์ ยังไม่ถือเป็นคำสั่งให้พัฒนาทันที
- **[OPEN / NEED DECISION]** = ค่าหรือเงื่อนไขที่ยังไม่ชัด ห้าม AI เติมเองแล้วถือว่าเป็นข้อสรุป
- **[CONFLICT]** = จุดที่สเปกใหม่ชนกับพฤติกรรมหรือค่าของ v0.2 ต้องแก้ไปพร้อมกันเมื่ออนุมัติ

**หลักการสำคัญสำหรับ Claude:** เก็บระบบเดิมที่ไม่ขัดกับสเปกไว้, แยกข้อเสนอออกจากข้อกำหนด, ห้ามอ้างว่าฟีเจอร์ใหม่ทำเสร็จแล้วหากยังไม่ได้ทดสอบ, หากต้องเดาตัวเลขให้ระบุว่าเป็น placeholder และแจ้งก่อนใช้เป็นค่าสมดุลถาวร

---

## 1. CORE GAMEPLAY LOOP — วงจรการเล่นหลัก

**[CONFIRMED — USER]**

- **กลางวัน:** ช่วงพักเตรียมตัว ซอมบี้มีน้อย เชื่องช้า ไม่ไล่ล่า หาอาวุธ/กระสุน/ยาได้
- **กลางคืน:** ช่วงเอาชีวิตรอด ซอมบี้มากขึ้น เคลื่อนที่เร็ว หูไว ตีแรง เสียงปืนล่อซอมบี้ได้ มีอาวุธระดับสูงให้เสี่ยงออกไปหา

**[PROPOSED] Gameplay Loop:**

`DAY: Explore & Loot → DUSK: Prepare → NIGHT: Survive / Risk for Rare Loot → DAWN: Recover → Repeat`

**[EXISTING v0.2]** 1 วันในเกม = 5 นาทีจริง (ที่ความเร็ว ×1), เริ่มเกมวันอังคาร 07:30, การระบาดเริ่ม 09:30, มีระบบเร่งเวลา ×1 / ×2 / ×4, ระบบอากาศ/ฝนและไฟกลางคืนอยู่แล้ว

### 1.1 Phase definitions

| Phase | Time (in-game) | Gameplay | Zombie behavior | Available item tiers |
|---|---|---|---|---|
| ☀️ **DAY** | **06:00–18:29** *[PROPOSED BOUNDARY]* | พัก สำรวจ หาเสบียง | เชื่องช้า น้อย ไม่ไล่ล่า | 🟩 Civilian; ยาที่อนุญาตกลางวัน |
| 🌇 **DUSK** | ก่อน 18:30 *[PROPOSED]* | เตือนให้เตรียมตัว | เริ่มเปลี่ยนพฤติกรรม | ตามช่วงเวลาก่อน/หลังการเปลี่ยน |
| 🌙 **NIGHT** | **18:30–05:59** *[PROPOSED BOUNDARY]* | ต่อสู้ หลบหนี หาไอเท็มหายาก | หูไว เร็ว โจมตีแรง | 🟦 Police / 🟨 Military; ยาที่อนุญาตกลางคืน |
| 🌅 **DAWN** | 06:00 เป็นต้นไป | กลับช่วงพักและรีเซ็ตเหตุการณ์ที่เหมาะสม | กลับสู่โหมดกลางวัน | ตามกติกา DAY |

> **หมายเหตุ:** ช่วงเวลา 18:30 มาจากอีเวนต์พระอาทิตย์ตกในเอกสาร v0.2 ส่วนเวลาเริ่ม/จบเฟสยังเป็นข้อเสนอ ไม่ใช่เวลาที่ผู้ใช้กำหนดไว้โดยตรง

### 1.2 Day behavior

**[CONFIRMED — USER]**
- ซอมบี้มีจำนวนน้อย
- เคลื่อนที่ช้าและไม่ไล่ล่าผู้เล่น
- ผู้เล่นใช้เวลาหาทรัพยากรและอุปกรณ์

**[PROPOSED]**
- Walker ยังอาจทำร้ายผู้เล่นเมื่อประชิด แต่ไม่วิ่งตามไกล ๆ
- เหลือเวลาผ่อนคลายพอให้ทำภารกิจเตรียมตัวโดยไม่กลายเป็นเกมต่อสู้ตลอดวัน
- แสดง HUD `DAY PHASE` พร้อมเวลานับถอยหลังเข้า NIGHT

### 1.3 Night behavior

**[CONFIRMED — USER]**
- ซอมบี้หูไวและถูกล่อด้วยเสียงปืน
- เคลื่อนไหวรวดเร็วขึ้น โจมตีแรงขึ้น
- มี Special Infected และโอกาสได้อาวุธ Police/Military

**[PROPOSED]**
- เพิ่มช่วงแจ้งเตือน 30 วินาทีจริงก่อนเปลี่ยนเฟส (ที่ความเร็วเกม ×1)
- แสดง `NIGHT INCOMING`, ใช้สีฟ้าเข้ม/แดงเตือนแทนสีอำพันของกลางวัน
- เสียงฝน/สิ่งแวดล้อมอาจรบกวนการได้ยินของซอมบี้ในอนาคต
- **Night Difficulty Scaling:** เพิ่มความหลากหลาย/ความถี่ของ Special Infected ในคืนหลัง ๆ โดยไม่จำเป็นต้องบวก HP ทั้งเกม

### 1.4 First-day outbreak compatibility

**[EXISTING v0.2]** เช้าวันแรก NPC ยังดำเนินชีวิตตามปกติ แล้วเกิดการระบาดเวลา 09:30

**[PROPOSED]** คงอีเวนต์เปิดเรื่องนี้ไว้ให้สัมพันธ์กับชื่อ *Ordinary Day* หลังเหตุการณ์จึงใช้วงจร DAY/NIGHT ใหม่ ป้องกันไม่ให้เกมเริ่มด้วยซอมบี้เต็มเมืองตั้งแต่เวลา 07:30

---

## 2. ITEM RANK / WEAPON SYSTEM

### 2.1 Visual classification

**[PROPOSED]** ออกแบบสีและสัญลักษณ์สำหรับทั้งโลกเกม วงแหวน loot, ชื่อบนพื้น และ Inventory:

| Rank | สีหลัก | HEX ตัวอย่าง | Icon | Rarity label | ระยะเวลาที่หาได้ |
|---|---|---|---|---|---|
| 🟩 **CIVILIAN GRADE** | เขียว | `#78D99B` | `🛡️` | Common | กลางวัน |
| 🟦 **POLICE GRADE** | ฟ้า/น้ำเงิน | `#66B0FF` | `🛡️✔` | Rare | กลางคืน |
| 🟨 **MILITARY GRADE** | ทอง | `#F0C46B` | `★` | Legendary | กลางคืน |

> สีและระดับความหายากเป็นข้อเสนอเพื่อการสื่อสารทางภาพ; ค่าสถานะอาวุธและเงื่อนไขการดรอปด้านล่างมาจากผู้ใช้

### 2.2 CIVILIAN GRADE — 🟩

**[CONFIRMED — USER]** Drop Rate **70%**, หาได้ **ช่วงกลางวัน**, รวมกระสุนสำหรับอาวุธแต่ละประเภท

| Weapon | Type | Damage | Fire Rate |
|---|---|---:|---:|
| Pistol | Sidearm | **3/10** | **5/10** |
| Pump Action Shotgun | Primary | **6/10** | **2/10** |
| SMG | Primary *[PROPOSED SLOT]* | **2/10** | **7/10** |
| Baseball Bat | Melee | **4/10** | N/A — ไม่ได้กำหนด |

**[PROPOSED]** หาได้ตามถนน บ้าน ร้านค้า รถจอด; เป็นอาวุธเริ่มต้นที่มีข้อดีข้อเสียชัดเจน เช่น Shotgun ยิงแรงแต่ช้า และ SMG ยิงเร็วแต่เปลืองกระสุน

### 2.3 POLICE GRADE — 🟦

**[CONFIRMED — USER]** Drop Rate **40%**, หาได้ **เฉพาะกลางคืน**, รวมกระสุนสำหรับอาวุธแต่ละประเภท

| Weapon | Type | Damage | Fire Rate |
|---|---|---:|---:|
| Pistol | Sidearm | **4/10** | **7/10** |
| Pump Action Shotgun | Primary | **7/10** | **4/10** |
| SMG | Primary *[PROPOSED SLOT]* | **4/10** | **7/10** |
| Police Baton | Melee | **4/10** | N/A — ไม่ได้กำหนด |
| Assault Rifle | Primary | **6/10** | **5/10** |

**[PROPOSED]** แหล่ง loot: รถตำรวจ, จุดควบคุม, ตู้เก็บอาวุธ, Armor Walker; เสริมความแม่นยำ/ความจุกระสุนเป็นตัวแยก rank ได้ แต่ยังไม่ได้กำหนดตัวเลข

### 2.4 MILITARY GRADE — 🟨

**[CONFIRMED — USER]** หาได้ **เฉพาะกลางคืน**, รวมกระสุนสำหรับอาวุธแต่ละประเภท

| Weapon | Type | Damage | Fire Rate |
|---|---|---:|---:|
| Pistol | Sidearm | **5/10** | **8/10** |
| Semi-Auto Shotgun | Primary | **7/10** | **6/10** |
| SMG | Primary *[PROPOSED SLOT]* | **5/10** | **9/10** |
| Axe | Melee | **8/10** | N/A — ไม่ได้กำหนด |
| Assault Rifle | Primary | **6/10** | **7/10** |
| Sniper Rifle | Primary | **10/10** | **2/10** |
| Light Machine Gun (LMG) | Primary | **7/10** | **9/10** |

**[OPEN / NEED DECISION] Drop Rate 10%:** ในข้อความที่ผู้ใช้ส่งมา `(Drop Rate 10%)` อยู่ถัดจาก Light Machine Gun ทำให้ตีความได้ 2 แบบ: **(A)** อาวุธทั้ง Military Grade มี Drop Rate 10% หรือ **(B)** เฉพาะ LMG มี Drop Rate 10% ต้องยืนยันก่อนนำไปเขียน loot table จริง ห้ามสรุปเองเงียบ ๆ

**[PROPOSED]** แหล่ง loot: ขบวนรถทหาร, กล่องเสบียงพิเศษ, Tyrant; LMG อาจมีข้อเสียคือเสียงดังมาก รีโหลดช้า กระสุนจำกัดหรือเคลื่อนที่ช้าขณะยิง

### 2.5 Core implementation rules

**[OPEN / NEED DECISION]**

1. **คะแนน 1–10 ไม่ใช่ Damage จริง:** ต้องกำหนดสูตรแปลงเป็นความเสียหายจริง (HP) และ Fire Rate จริง (นัด/วินาทีหรือวินาที/นัด) แยกก่อนเขียน Combat Balance
2. **Melee Fire Rate:** ผู้ใช้ยังไม่กำหนด ต้องใช้เป็นค่าที่รอปรับ ไม่ควรเดาว่าเป็น 0
3. **ประเภทช่องอาวุธ:** อ้างอิง v0.2 มี Primary / Secondary / Melee; ช่อง SMG, Sniper Rifle และ LMG ในตารางด้านบนเป็นข้อเสนอเบื้องต้น
4. **Ammo mapping:** จะให้ Pistol ใช้ 9mm, Assault Rifle/LMG ใช้ 5.56mm, Shotgun ใช้ 12 gauge และ SMG/Sniper ใช้กระสุนชนิดใด ต้องยืนยันตามระบบที่จะออกแบบ ไม่บังคับให้ทุกปืนใช้กระสุนแบบเดียวกันโดยเดา
5. **Drop Rate ตาม grade:** ไม่ให้นำ 70% + 40% + 10% ไปเป็นความน่าจะเป็นภายในกลุ่มสุ่มเดียว เพราะเปอร์เซ็นต์รวมเกิน 100% และคนละช่วงเวลา
6. **Ammo included:** ผู้ใช้กำหนดว่าแต่ละ rank มีกระสุนของอาวุธประเภทนั้น ๆ อยู่ใน loot pool แต่ยังไม่ได้กำหนดจำนวนกระสุนต่อการดรอป หรือโอกาสสุ่มระหว่างปืนกับกระสุน

**[PROPOSED]** ให้แต่ละ Loot Source มี `allowedPhase`, `grade`, `chance`, `itemPool`, `ammoPool`, และสุ่มแยกตามบริบท โดยเก็บของที่เกิดแล้วไว้บนพื้นแม้เวลาจะเปลี่ยน

---

## 3. MEDICINE SYSTEM

### 3.1 Medicine list

**[CONFIRMED — USER]** ค่าตามข้อความต้นฉบับทั้งหมด

| Icon | Color [PROPOSED] | Medicine | Recover / Effect | Drop Rate | Availability |
|---|---|---|---|---|---|
| 🩹 | 🟩 เขียว | **Bandage** | **Recover 25%** | **50%** | กลางวัน / กลางคืน |
| 🧪 | 🟦 ฟ้า | **Antibiotic** | **Recover 35%** | **30%** | กลางวัน / กลางคืน |
| 💊 | 🟪 ม่วง | **Painkiller** | **Recover 50%** | **15%** | **เฉพาะกลางคืน** |
| 🧰 | 🟧 ส้ม | **First Aid Kit** | **Recover 80%** | **5%** | **เฉพาะกลางคืน** |
| ✨ | 🟨 ทอง | **Resurrection Kit** | **Resurrection 100%** — ชุบคนตาย | **1%** | กลางวัน / กลางคืน |

### 3.2 Proposed functional differences — NOT YET CONFIRMED

| Medicine | Additional mechanic [PROPOSED] |
|---|---|
| Bandage | ใช้รวดเร็ว เหมาะฟื้น HP ระหว่างสำรวจ |
| Antibiotic | นอกจาก Recovery 35% อาจช่วยลดสถานะติดเชื้อเมื่อมีระบบ Infection |
| Painkiller | นอกจาก Recovery 50% อาจลดผลกระทบจากบาดเจ็บชั่วคราว |
| First Aid Kit | ฟื้น 80% แต่มี animation/use time มากกว่าของทั่วไป |
| Resurrection Kit | ชุบเพื่อนร่วมทีมด้วย HP 100%; ถ้าเล่นคนเดียว อาจใช้เป็น self-revive แบบหนึ่งครั้ง |

### 3.3 Unresolved healing rules

**[OPEN / NEED DECISION]**

- `Recover 25% / 35% / 50% / 80%` หมายถึงฟื้น HP **เป็นเปอร์เซ็นต์ของ Max HP** ไม่ใช่ฟื้น 25/35/50/80 หน่วยเสมอ — ความหมายนี้เป็นข้อเสนอเชิงนิยามที่ควรยืนยัน
- สามารถฮีลระหว่างกำลังโจมตีได้หรือไม่ / มีเวลารอใช้กี่วินาที / ฮีลจนเกิน Max HP ได้หรือไม่
- เปอร์เซ็นต์ยาทั้งห้าบวกได้ **101%**; จึงไม่ควรใช้เป็นน้ำหนักสุ่มแบบรวม 100 โดยตรง ต้องกำหนดว่าเป็น **independent drop chance**, **weight**, หรือ **chance ภายใต้ตารางเฉพาะชนิด**
- Resurrection Kit: ถ้า HP เหลือ 0 เกมจบเลยหรือมีสถานะ `Downed`? ระยะเวลาใช้? ชุบได้ภายในกี่วินาทีหลังตาย? ใช้กับ NPC ได้หรือเฉพาะผู้เล่น?

**[EXISTING v0.2 / CONFLICT]** เดิม Bandage ฟื้น +25 HP และ First Aid Kit ฟื้น +60 HP ต้องเปลี่ยนค่าสถานะให้ตรงสเปกใหม่เมื่อมีการอนุมัติระบบนี้

---

## 4. ZOMBIE CLASS SYSTEM

### 4.1 Class legend

| Class group | Color / Icon [PROPOSED] | Members |
|---|---|---|
| **COMMON INFECTED** | 🟩 `👣` / 🟥 | Walker, Zombie |
| **SPECIAL INFECTED** | 🟧 `⚡` / 🟪 `💥` | Splinter, Boomer |
| **ELITE / BOSS INFECTED** | 🟦 `🛡️` / 🟨 `👑` | Armor Walker, Tyrant |

### 4.2 Summary of all zombie types

**[CONFIRMED — USER]**

| Class | Symbol | HP | Spawn phase | Core behavior | Chance / cap | Guaranteed drop |
|---|---|---:|---|---|---|---|
| **Walker** | 🟩 👣 | **30** | กลางวันเท่านั้น | ช้า / ไม่ไล่ล่า | ไม่ได้ระบุ | ไม่ได้ระบุ |
| **Zombie** | 🟥 ☠️ | **30** | กลางคืนเท่านั้น | ซอมบี้ปกติจากเกมเดิม (แต่ HP ใหม่) | ไม่ได้ระบุ | ไม่ได้ระบุ |
| **Splinter** | 🟧 ⚡ | **30** | กลางคืนเท่านั้น | วิ่งเร็วกว่าตัวละครผู้เล่น | ไม่ได้ระบุ | ไม่ได้ระบุ |
| **Boomer** | 🟪 💥 | **120** | กลางคืนเท่านั้น | ซอมบี้อ้วน ระเบิดเมื่อเข้าใกล้ผู้เล่น | ไม่ได้ระบุ | ไม่ได้ระบุ |
| **Armor Walker** | 🟦 🛡️ | **150** | กลางคืนเท่านั้น | ซอมบี้ตำรวจ มีเสื้อกันกระสุน | **โอกาสเกิด 60% / สูงสุด 6 ตัว** | **Police Grade 2 ชิ้น 100%** |
| **Tyrant** | 🟨 👑 | **300** | กลางคืนเท่านั้น | ซอมบี้กลายพันธุ์ตัวใหญ่สไตล์บอส | **โอกาสเกิด 40% / คืนละไม่เกิน 1 ตัว** | **Military Grade 2 ชิ้น 100%** |

> **ความหมายของ 60% / 40% ยังต้องนิยาม:** เป็นโอกาสต่อคืน, ต่ออีเวนต์ Spawn, ต่อครั้งการสุ่ม หรือเงื่อนไขอื่น? ห้ามให้ AI เปลี่ยนไปตีความเป็นการสุ่มทุกเฟรมหรือทุก tick

### 4.3 Class behavior details

#### 🟩 Walker — Passive Day Zombie

**[CONFIRMED — USER]** HP 30; กลางวันเท่านั้น; เคลื่อนไหวช้า ไม่ไล่ล่า

**[PROPOSED]** เดินเตร็ดเตร่แบบ idle/wander; โจมตีได้เมื่อผู้เล่นอยู่ใกล้มาก แต่ไม่มี chase behavior; ใช้เสียงเบาและแอนิเมชันเฉื่อย

#### 🟥 Zombie — Aggressive Night Zombie

**[CONFIRMED — USER]** HP 30; กลางคืนเท่านั้น; อิงซอมบี้พื้นฐานที่มีใน Prototype เดิม

**[PROPOSED]** ตรวจจับด้วยการมองเห็นและเสียง มีสถานะ patrol/search/chase/attack; ตอบสนองต่อเสียงปืนตามระบบ noise เดิม

#### 🟧 Splinter — Fast Hunter

**[CONFIRMED — USER]** HP 30; กลางคืนเท่านั้น; **เร็วกว่าตัวละครผู้เล่น**

**[EXISTING v0.2]** ผู้เล่นวิ่งได้ 5.8 เมตร/วินาที

**[PROPOSED]** ทดลอง Splinter ~6.2 เมตร/วินาที (ค่าทดสอบ ไม่ใช่คำสั่งถาวร); มีเสียงหรือท่าทางบอกล่วงหน้าก่อนพุ่งโจมตี และมีช่วงพักหลังโจมตีเพื่อให้หลบได้

#### 🟪 Boomer — Explosive Zombie

**[CONFIRMED — USER]** HP 120; กลางคืนเท่านั้น; ตัวอ้วนและระเบิดเมื่อเข้าใกล้ผู้เล่น

**[PROPOSED]** เคลื่อนที่ช้ากว่า Splinter; มีเสียง/เอฟเฟกต์เตือนก่อนระเบิด; ระเบิดเป็น Area of Effect; เสียงระเบิดดึงดูดซอมบี้ตัวอื่น; ต้องกำหนดรัศมีและความเสียหายภายหลัง

#### 🟦 Armor Walker — Police Elite

**[CONFIRMED — USER]** HP 150; กลางคืนเท่านั้น; สวมเสื้อกันกระสุน; โอกาสสุ่มเกิด 60%; **สูงสุด 6 ตัว**; กำจัดแล้ว **Police Grade 2 ชิ้น 100%**

**[PROPOSED]** เกราะลดความเสียหายเฉพาะส่วนลำตัว (head/limbs เป็นจุดอ่อน); กระจาย spawn ไม่ให้เกิดติดผู้เล่น; drop 2 ชิ้นต่อการสังหารหนึ่งตัว; ต้องตัดสินใจว่า 6 ตัวคือเพดานพร้อมกันหรือรวมตลอดคืน

#### 🟨 Tyrant — Night Boss

**[CONFIRMED — USER]** HP 300; กลางคืนเท่านั้น; ตัวใหญ่ฟีลบอส; โอกาสเกิด 40%; **คืนละไม่เกิน 1 ตัว**; กำจัดแล้ว **Military Grade 2 ชิ้น 100%**

**[PROPOSED]** โจมตีหนัก พลังผลัก/ทุบเป็นวง; มี telegraph เสียงคำรามก่อนโจมตี/ก่อนปรากฏตัว; อาจทำลายสิ่งกีดขวางบางประเภท; ต้องกำหนดความเร็ว, ระยะโจมตี และ Damage ภายหลัง

### 4.4 Zombie spawn and transition constraints

**[PROPOSED]**

1. **Day/Night transition:** ซอมบี้พื้นฐานที่ยังมีชีวิตอาจสลับ AI role ระหว่าง Walker ↔ Zombie เมื่อถึงช่วงเวลา แทนการลบทิ้งแล้วสร้างตัวใหม่ต่อหน้าผู้เล่น
2. **Special despawn/retreat:** Special Infected กลางคืนที่ยังไม่ตายเมื่อเช้ามาถึง ควรถอยเข้าพื้นที่มืด/อาคาร หรือ despawn เฉพาะนอกระยะกล้อง โดยต้องกำหนดกติกาที่ไม่ทำให้เห็นศัตรูหายตัว
3. **Caps:** เช็ก cap ทุกครั้งก่อน spawn และนับจำนวนที่ตาย/หลุดแผนที่ให้ถูกต้อง
4. **Guaranteed boss loot:** สุ่ม **สองไอเท็ม** จาก rank ที่กำหนดโดยไม่ทำลาย loot ถ้าพื้นเต็ม; ยังต้องตัดสินใจว่าแต่ละชิ้นมีโอกาสเป็นกระสุนหรือเป็นอาวุธเท่านั้น
5. **Sound events:** เดิมเสียงปืนมีการล่อซอมบี้อยู่แล้ว; อาจเพิ่มเสียงฝีเท้า เปิดประตู เสียงระเบิด และเสียงสิ่งของในลำดับถัดไป

**[OPEN / NEED DECISION]**

- โอกาสเกิด 60%/40% นิยามต่ออะไรแน่
- Armor Walker สูงสุด 6 ตัว *พร้อมกัน* หรือ *สะสมตลอดคืน*
- Drop Police/Military 2 ชิ้นหมายถึงอาวุธ 2 ชิ้นแน่นอน หรือไอเท็มใด ๆ ใน rank (รวมกระสุน)
- ค่าความเร็ว/ความแรง/ช่วงรับรู้เสียงของแต่ละชนิด
- Special Infected ที่ยังมีชีวิตตอนรุ่งเช้าควรเกิดอะไรขึ้น

---

## 5. CURRENT v0.2 VS NEW DESIGN — CHANGE IMPACT

| System | Existing v0.2 | New specification / impact |
|---|---|---|
| Day & Night | มี day/night, ซอมบี้กลางคืนเร็วและมองไกลกว่า | **[CONFIRMED — USER]** แยกเป็นกลางวันพัก/กลางคืนอันตรายอย่างชัดเจน |
| Zombie HP | ซอมบี้พื้นฐานสุ่ม HP 90–120 | **[CONFIRMED — USER]** Walker/Zombie/Splinter HP 30, Boomer 120, Armor Walker 150, Tyrant 300 |
| Zombie behavior | กลางวัน/กลางคืนมี AI ไล่เหยื่อ | **[CONFIRMED — USER]** กลางวันเชื่องช้าไม่ไล่ล่า; กลางคืนหูไว วิ่งเร็ว ตีแรง |
| Weapons | ปืนพก/ไรเฟิล/ลูกซอง และอาวุธประชิดแบบไม่มี grade | **[CONFIRMED — USER]** แยก Civilian/Police/Military พร้อม stat score ใหม่ |
| Loot | สุ่มตามโซน 70 จุด มี loot weight และของใหม่ตอน 06:00 | ต้องเพิ่ม grade/phase/drop rules และไม่ปน `% chance` กับ `weight` |
| Ammo | 9mm, 5.56mm, 12 gauge | ต้องขยายให้รองรับ SMG, Sniper, LMG และอาวุธระดับต่าง ๆ |
| Healing | Bandage +25 HP; First Aid Kit +60 HP | **[CONFIRMED — USER]** ยา 5 ชนิด Recover ตามเปอร์เซ็นต์ใหม่, มี Resurrection Kit |
| Death | HP หมด → Game Over ทันที | **[OPEN]** ต้องกำหนด `Downed` / Revive เพื่อรองรับ Resurrection Kit |
| UI | วงแหวน item แยกตามหมวดไอเท็ม | **[PROPOSED]** แยกตามสี grade + icon, เพิ่ม phase warning |
| NPC infection | NPC ถูกกัดแล้วกลายเป็นซอมบี้ | ควรให้เข้ากับการสลับ Walker/Zombie ตามช่วงเวลา |
| Total zombies | เพดานโดยประมาณ ~95 ตัวทั่วเมือง | ต้องทดสอบสมดุลกับ Special Zombie ใหม่และประสิทธิภาพมือถือ |

---

## 6. GAME BALANCE & TECHNICAL RISKS

### 6.1 Gameplay balance

1. **HP 30 และอาวุธเดิม:** อาวุธ v0.2 ทำดาเมจจริงสูงมากเมื่อเทียบกับ HP 30 จำเป็นต้องรีบาลานซ์ **พร้อมกัน** ไม่ใช่เปลี่ยน HP ก่อนแล้วปล่อย Damage เดิมไว้
2. **ความเร็ว Splinter:** ต้องเร็วกว่า *ความเร็ววิ่ง* ของตัวละครจริง ไม่ใช่แค่เร็วกว่าเดิน และต้องมีวิธีรับมือ
3. **70/40/10:** ไม่ใช่สัดส่วนรวม 100%; แยก loot tables / time phases ก่อนใช้ค่าจริง
4. **50/30/15/5/1:** รวม 101%; ห้าม normalize อย่างเงียบ ๆ ก่อนยืนยันว่าค่าคือ chance หรือ weight
5. **Tyrant + guaranteed drops:** ควรใช้ทรัพยากรและมีความเสี่ยงในการสู้ แต่ไม่ปรับ drop การันตีที่ผู้ใช้ระบุ
6. **Night phases:** ผู้เล่นต้องมีทางเลือกว่าจะเสี่ยงออกล่าของดีหรือหลบเพื่อรอดคืนนี้
7. **Revive:** ต้องกำหนดกติกา death/revive เพื่อไม่ให้ Resurrection Kit ไม่มีโอกาสใช้งานใน Single-player

### 6.2 Performance / implementation

- รักษาโลก Three.js และกล้อง Isometric เดิม; ไม่ล้างโปรเจกต์เพื่อสร้างใหม่โดยไม่จำเป็น
- ใช้ **data-driven tables** สำหรับ weapon tiers, zombie classes และ medicine เพื่อเพิ่ม/ปรับค่าได้โดยไม่แก้โค้ดหลายจุด
- AI ซอมบี้ควรมี state machine แบบง่ายและแยก spawn frequency ออกจาก per-frame logic
- ลดต้นทุน render/AI บนมือถือด้วย pooled entities, จำกัดจำนวนที่ใช้งานพร้อมกัน และตรวจเฉพาะสิ่งที่อยู่ใกล้ผู้เล่นตามสมควร
- ระวังการวน AI ตรวจเสียงหรือระยะทุกเฟรมกับซอมบี้จำนวนมาก
- ระบบเวลา ×2 / ×4 ต้องไม่ทำให้อัตราสุ่ม spawn/drop เปลี่ยนผิดจากนิยามของเกม

---

## 7. UI / UX DESIGN RECOMMENDATIONS

**[PROPOSED]**

### 7.1 Top HUD
- เวลาเกมตัวใหญ่ เช่น `18:12` และวันที่ `DAY 02`
- Phase icon: `☀️ DAY`, `🌇 DUSK`, `🌙 NIGHT`
- Warning ก่อนกลางคืน: `NIGHT INCOMING — FIND SHELTER`
- สี Day = amber / warm, Night = dark blue + red warning

### 7.2 Inventory / world loot
- Weapon cards มีกรอบสี rank และ icon ที่อ่านชัดแม้หน้าจอเล็ก
- แสดง `DMG X/10`, `FIRE RATE X/10` เป็นแถบสถานะ
- Ammo ใช้รูปกระสุนและ label caliber; แยกว่าของเป็น Ammo ไม่ใช่ Weapon แม้ใช้ rank color เหมือนกัน
- Medicine ใช้ icon/สีชนิดยา และขึ้น `RECOVER 25%`, `REVIVE 100%` ตามจริง
- UI ไทยเป็นหลักตาม v0.2 โดยคงชื่ออาวุธและชื่อคลาสภาษาอังกฤษตามสเปก

### 7.3 Feedback and telegraph
- เสียง/ท่าทางเฉพาะ Splinter ก่อนโจมตี
- Boomer มีการเตือนก่อนระเบิดอย่างเห็นได้ชัด
- Armor Walker มี visual cue ว่ากระสุนโดนเกราะ
- Tyrant มีคำเตือนสั้น ๆ ก่อน spawn และ feedback เมื่อดรอปของการันตี

---

## 8. RECOMMENDED IMPLEMENTATION ROADMAP

> ทุกขั้นด้านล่างเป็น **ข้อเสนอสำหรับจัดลำดับ** ไม่ใช่คำสั่งให้ Claude ลงมือแก้ทุกระบบในครั้งเดียว

### Phase A — Foundation & Balance
- จัดข้อมูลใน weapon grades / medicine / zombie classes ให้เป็น config table
- แก้กติกา phase กลางวันและกลางคืน
- กำหนดสูตรแปลง Damage/Fire Rate ratings เป็นค่าต่อสู้จริง **เมื่อผู้ใช้ยืนยัน**
- ตรวจ Regression: เดิน ยิง รีโหลด เก็บของ เปิดกระเป๋า ฝน เวลา ทั้ง PC และ Mobile

### Phase B — Item Rank & Loot
- เพิ่มอาวุธและ rank colors
- แยก loot pools กลางวัน/กลางคืน
- กระสุนตามประเภทอาวุธ
- Drop การันตีจาก Armor Walker / Tyrant
- ตรวจ cap และอัตราดรอปตามนิยามที่ยืนยันแล้ว

### Phase C — Special Zombie Classes
- Walker / Zombie / Splinter / Boomer
- Armor Walker / Tyrant พร้อมเงื่อนไข spawn และ drop
- แจ้งสัญญาณก่อนโจมตีเพื่อให้ fair
- ปรับ performance สำหรับมือถือ

### Phase D — Medicine & Resurrection
- เพิ่ม medicine 5 ชนิด
- ระบบ Revive / Downed ตามกติกาที่ผู้ใช้เลือก
- ทดสอบ Death → Revive → Continue → Game Over

### Phase E — Polish
- Day/Night warning, loot card, color/icon consistency, sounds / FX (ถ้าพร้อม)
- ปรับ Night Difficulty Scaling เป็น optional
- ตรวจ balance หลังเล่นต่อเนื่องหลายคืน

---

## 9. OPEN QUESTIONS / DECISION LOG

รายการนี้ใช้ยืนยันก่อนให้ Claude แปลง Draft เป็นโค้ดจริง

| ID | Question | Status |
|---|---|---|
| Q01 | Military Drop Rate 10% คือทั้ง grade หรือเฉพาะ Light Machine Gun? | **OPEN** |
| Q02 | Drop Rate 70/40/10 หมายถึงต่อ loot point / ต่อ item roll / ต่อแหล่งพิเศษ? | **OPEN** |
| Q03 | Medicine Drop Rate รวม 101%: chance อิสระหรือ relative weight? | **OPEN** |
| Q04 | Armor Walker 60% และ Tyrant 40% เป็นการสุ่มต่อคืนหรือ per spawn event? | **OPEN** |
| Q05 | Armor Walker สูงสุด 6 ตัวหมายถึงพร้อมกันหรือทั้งคืน? | **OPEN** |
| Q06 | Guaranteed 2 items เป็นอาวุธล้วนหรือรวมกระสุนของ rank นั้น? | **OPEN** |
| Q07 | คะแนน Damage/Fire Rate 1–10 แปลงเป็นดาเมจจริงและอัตรายิงแบบใด? | **OPEN** |
| Q08 | Recovery เป็น %Max HP ตามข้อเสนอหรือมีนิยามอื่น? | **OPEN** |
| Q09 | Resurrection Kit ใช้ชุบตัวเองเมื่อเล่นเดี่ยวได้หรือไม่? มี Downed timer หรือไม่? | **OPEN** |
| Q10 | ซอมบี้ Special ที่ยังอยู่ตอนเช้าถอยกลับ, หลบแสง, หรือหายไปนอกกล้อง? | **OPEN** |
| Q11 | Night Phase เริ่ม 18:30 ถึง 05:59 ยืนยันหรือจะปรับเวลา? | **OPEN** |
| Q12 | ซอมบี้กลางวันสามารถโจมตีเมื่ออยู่ประชิดได้หรือปลอดภัยอย่างสมบูรณ์? | **OPEN** |

---

## 10. INSTRUCTIONS FOR CLAUDE (DRAFT HANDOFF)

> วางส่วนนี้พร้อมไฟล์สรุป Prototype v0.2 ให้ Claude เพื่อให้เข้าใจทั้งของเดิมและของใหม่ **แต่ยังไม่ควรถือว่าให้ implement ทั้งหมดจนกว่าจะอนุมัติข้อ OPEN**

**บทบาท:** คุณเป็น Gameplay Programmer และ Systems Designer สำหรับเกม *Ordinary Day* พัฒนาบน Three.js / JavaScript เป็นเกม Isometric 3D ที่เล่นบนเว็บ PC และมือถือ

1. อ่านไฟล์สรุป v0.2 และเอกสาร Draft 01 ให้ครบก่อนแก้โค้ด
2. แยก `[CONFIRMED — USER]`, `[EXISTING v0.2]`, `[PROPOSED]` และ `[OPEN]` ตามนิยาม ห้ามทำเหมือนข้อเสนอเป็นข้อสรุปแล้ว
3. ตรวจว่าระบบใหม่ชนกับค่าใดของ Prototype: zombie HP, weapon damage, healing, loot weights, day/night AI, death/revive
4. นำเสนอ **implementation plan แบบ incremental**, แยก model/config, state transitions, logic, UI, tests และ regression risk
5. หากเริ่ม implement ให้ทำเฉพาะ phase ที่อนุมัติ พร้อมอธิบายว่าระบบเก่าใดเปลี่ยน ค่าใดเป็น placeholder และอะไรยังไม่ได้ทำ
6. รักษาการควบคุมและเล่นได้บนมือถือ/คอม รวมทั้งระบบเดิมที่ไม่เกี่ยวข้อง เช่น rain/weather, clock, inventory, reload, procedural city
7. สร้าง acceptance tests ที่ทดสอบได้ เช่น:
   - 07:30 เกมเริ่มอย่างปกติ; 09:30 มีการระบาดตามเหตุการณ์เดิม
   - ช่วงกลางวันไม่มี zombie chase ผู้เล่นตามข้อกำหนด
   - กลางคืน zombie ตรวจจับเสียงปืนและเคลื่อนที่เร็ว/โจมตีแรงขึ้น
   - Loot กลางวันไม่สุ่ม Police/Military ใหม่; Loot กลางคืนไม่สุ่ม Civilian ใหม่ (เว้นมีข้อยกเว้นที่ผู้ใช้กำหนด)
   - Armor Walker มี HP 150, drop Police 2 ชิ้น 100%; Tyrant HP 300, drop Military 2 ชิ้น 100%
   - Night spawn obeys caps/chances **ตามนิยามที่ได้รับการยืนยัน**
   - UI item color/icon ถูกต้อง; ปุ่ม PC/Mobile ยังใช้งานได้
8. ถ้ามีความกำกวมเรื่อง Drop Rate, Respawn, Revive หรือคำนวณ Damage ต้องสรุปคำถามที่มีผลต่อโค้ดและใช้ TODO จนกว่าจะมีข้อกำหนด ห้ามสมมติคำตอบเป็น requirement

---

## 11. DOCUMENT VERSION HISTORY

| Version | Date | Description |
|---|---|---|
| **Draft 01** | **2026-10-20** | เพิ่มรายละเอียด Day/Night Phase, Weapon Tiers 3 ระดับ, Medicine 5 ชนิด, Zombie 6 คลาส, สี/สัญลักษณ์, ข้อเสนอ AI และ Roadmap พร้อม Decision Log |

**ขอบเขต:** ไฟล์นี้เป็น **ส่วนขยายของเอกสารต้นฉบับ v0.2** ไม่ได้แทนที่ทุกหมวดในเอกสารต้นฉบับ เช่น เมือง, NPC, ระบบกระเป๋า, ฝน และเนื้อเรื่อง
