# วันธรรมดา (Ordinary Day)

เกม zombie survival แนว open-world sandbox มุมกล้อง isometric 3D เล่นบนเว็บเบราว์เซอร์ ทั้งมือถือและคอม หายนะเริ่มต้นจากเช้าวันอังคารธรรมดา ผู้เล่นเกิดมาตัวเปล่า กลางวันออกหาของ กลางคืนเอาชีวิตรอด

**สถานะ:** Prototype v0.3

## เล่นเกม

- **บนเครื่อง:** ดับเบิลคลิก `index.html` เปิดในเบราว์เซอร์ได้เลย (ต้องต่ออินเทอร์เน็ต เพราะโหลด Three.js และฟอนต์จาก CDN)
- **ผ่าน dev server (แนะนำเวลาพัฒนา):** `npx serve .` หรือ `python3 -m http.server 8000` แล้วเปิด `http://localhost:8000`
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
- ทั้งเกมอยู่ใน `index.html` ไฟล์เดียว texture ทั้งหมดวาดด้วยโค้ด ไม่มีไฟล์ภาพหรือเสียง
- ฟอนต์ Chakra Petch และ Big Shoulders Display จาก Google Fonts

## โครงสร้าง repo

```
index.html                     ตัวเกมทั้งหมด (v0.3)
CLAUDE.md                      กติกาสำหรับ Claude Code และ AI ที่ช่วยพัฒนา
docs/project-summary-v0.3.md   เอกสารสรุประบบทั้งหมด + Decision Log
docs/design-draft-01.md        Game System Design Draft 01 จากทีม
tools/smoke-test.js            ทดสอบตรรกะเกมแบบไม่มีหน้าจอ: node tools/smoke-test.js
```

## เอกสาร

- [สรุปโปรเจกต์ v0.3](docs/project-summary-v0.3.md) ระบบทั้งหมดที่มีในเกม ตัวเลขทุกค่า และ Decision Log Q01–Q12
- [Design Draft 01](docs/design-draft-01.md) สเปกจากทีมที่ v0.3 นำมาทำ

## ประวัติเวอร์ชัน

| เวอร์ชัน | สิ่งที่เพิ่ม |
| --- | --- |
| v0.3 | เฟส DAY / NIGHT, อาวุธ 3 ระดับ (Civilian / Police / Military), loot ตามเวลา, ยา 5 ชนิด + Resurrection Kit, ซอมบี้ 6 คลาส |
| v0.2 | 1 วันในเกม = 5 นาทีจริง, ระบบกระเป๋า, อาวุธ 3 ช่อง, ปืนและกระสุน, loot สุ่มตามโซน |
| v0.1 | เมือง isometric, day/night cycle, ฝน, ประชาชน, ไทม์ไลน์การระบาด |
