// ---------- a Thai town (v0.33) ----------
// How much of each thing world/thai.js puts in the city, and the words on the signs. PLACEHOLDER: every number here is a
// first guess at what looks right, not tuned. Shop names are made up, no brands; phone numbers have x in them.
export const THAI={
  signP:.62,awningP:.3,sprayP:.1,sprayMax:26,acP:.32,tallP:.32,bannerP:.1,   // per bay / per face of a building
  kerb:6,                 // metres of red-and-white kerb from each corner of a block
  transformerP:.16,coilP:.3,   // per power pole
  shrines:14,scooterRows:18,scooterRoad:9,carts:9,stools:30,drums:16,
  colors:{
    kerb:['#a8352d','#d6d1c4'],pole:'#6f6c66',wire:'#000000',
    awning:['#4f7a5a','#3f5f86','#8a3b33','#b08a3a','#5d6f78'],
    shrineBase:'#d8d0bc',shrineBody:'#e6dcc4',shrineRoof:'#a8382a',gold:'#c99a3a',
    scooter:['#8a2a26','#1d1f22','#d8d6d0','#2e4f7a','#c46a8a','#6e7478','#b7a37a'],
    umbrella:['#a8352d','#2f5d92','#3f7a4a','#c99a2a'],stool:['#b8302a','#2c5d9e','#d0a020','#3f7a4a'],
    drum:'#2a5d9a',jar:'#5a3a24',
  },
};
// shop boards: [name, line under it, board colour, letters colour]
export const THAI_SIGNS=[
  ['ข้าวมันไก่','ไก่ต้ม · ไก่ทอด','#f2eee2','#b42a22'],
  ['ก๋วยเตี๋ยวเรือ','น้ำตก · ต้มยำ','#a8261e','#f4d23a'],
  ['ห้างทองเจริญสุข','ทองแท้ 96.5%','#9e1b16','#e8c25a'],
  ['ซ่อมมอเตอร์ไซค์','ปะยาง · เปลี่ยนน้ำมันเครื่อง','#f0c42a','#1d3f8a'],
  ['ร้านตัดผม','ชาย · หญิง · เด็ก','#2a5ea8','#ffffff'],
  ['กาแฟโบราณ','โอเลี้ยง · ชาเย็น · ปาท่องโก๋','#5a3a22','#f1e2c0'],
  ['ข้าวแกง','อาหารตามสั่ง','#2f7a3e','#ffffff'],
  ['มือถือ','ซ่อม · เติมเงิน · ฟิล์มกันรอย','#ffffff','#1f4fa0'],
  ['ซัก อบ รีด','รับ-ส่งถึงบ้าน','#8cc7e6','#14406e'],
  ['นวดแผนไทย','นวดเท้า · นวดน้ำมัน','#6a2244','#f4d27a'],
  ['ร้านเสริมสวย','ตัด สระ ไดร์ ทำสี','#f2a6c0','#7a1840'],
  ['อะไหล่ยนต์','ราคาส่ง','#151515','#f0c42a'],
  ['คลินิกเวชกรรม','เปิด 17.00 - 20.00 น.','#f4f4f0','#1d7a46'],
  ['ส้มตำ ไก่ย่าง','ข้าวเหนียว · ลาบ · น้ำตก','#e0782a','#ffffff'],
  ['ร้านเกม','อินเทอร์เน็ต ชม.ละ 15 บาท','#101820','#4ae0e0'],
  ['ให้เช่า','โทร. 08x-xxx-xxxx','#ffffff','#c02020'],
];
// tall signs standing off the upper floors: [words, board, letters]
export const THAI_TALL=[['โรงแรม','#a8261e','#ffffff'],['หอพัก','#1f4fa0','#ffffff'],['คาราโอเกะ','#5a1a6a','#f4d23a'],['ร้านยา','#ffffff','#1d7a46'],['ทอง','#9e1b16','#e8c25a'],['ห้องว่าง','#f0c42a','#a8261e'],['ซ่อมแอร์','#ffffff','#1f4fa0'],['ข้าวต้ม','#2f7a3e','#ffffff']];
// vinyl banners from the first days of the outbreak: [headline, line under it, background, letters]
export const THAI_BANNERS=[
  ['ประกาศ! งดออกจากบ้านหลัง 18.00 น.','ศูนย์ปฏิบัติการฉุกเฉินเทศบาล','#f4f2ea','#b42a22'],
  ['จุดคัดกรองผู้ป่วย','ผู้มีอาการไข้ ตาแดง ก้าวร้าว แจ้ง 1669 ทันที','#f0c42a','#151515'],
];
// spray paint on the shutters: [words, paint]
export const THAI_SPRAY=[['ช่วยด้วย','#b01810'],['อย่าเข้า!!','#151515'],['มีคนรอด 3 คน','#e8e4da'],['ข้างในติดเชื้อ','#b01810']];
