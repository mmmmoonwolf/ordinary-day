// ---------- daily events (v0.8) ----------
// PLACEHOLDERS. Per day 2-7: chance of an airdrop, and of a horde (from day 3) or else a blackout; a day with
// neither gets an airdrop. A horde is HORDE.base + day zombies (at most HORDE.max), skipped past HORDE.cap agents.
export const EVENT_CHANCE={airdrop:.6,horde:.5,blackout:.35};
export const AIRDROP_ITEMS=6;
export const HORDE={base:5,max:12,cap:115,bridge:.35};   // v0.25 bridge: share of hordes that come over the bridge from the east (PLACEHOLDER)
// v0.18 random events, every day from day 1 (PLACEHOLDERS). Drawn at the start and at each 06:00 (so they go on after
// day 7): one a day, two from day TWO_FROM. weights pick the kind, [from,to] the in-game time window (minutes of the day).
export const DAILY={twoFrom:4,weights:{alarm:20,stash:20,truck:14,fog:12,raid:10,crash:12,storm:11,bandits:10},   // v0.56 storm   // v0.42 no heat wave (it only made you thirsty)
  window:{alarm:[9*60,17*60],stash:[8*60+30,14*60],truck:[9*60,15*60],fog:[6*60,6*60+20],raid:[11*60,15*60],crash:[19*60+30,23*60],storm:[11*60,19*60],bandits:[9*60,16*60]},
  last:{alarm:40,fog:240,storm:150},   // in-game minutes
  alarmNoise:32,siteItems:[4,6],siteZombies:[2,4]};
// ---------- v0.56 the town running down (PLACEHOLDERS) ----------
// the power fails a bit more each day: the share of street lights and of lit windows still working on day 1, 2, 3, 4+
// (the lamps next in line stutter first); a blackout night still turns everything off
export const POWER={lamps:[1,.65,.35,.12],windows:[1,.7,.4,.15],stutter:.07};
// the emergency radio: a tone, static and a voice (the browser's Thai speech when it has one) at these minutes of the
// day, a message per day; day 1 only after the outbreak; not in PvP
export const BROADCAST={at:[8*60,12*60+30,17*60+10],lines:[
  'ประกาศฉุกเฉิน มีรายงานผู้ป่วยก้าวร้าวกัดคนทั่วเมือง ขอให้ประชาชนอยู่ในอาคาร ปิดประตูให้สนิท',
  'ประกาศจากกองทัพ จุดอพยพอยู่ที่ค่ายทหาร สุดทางหลวงฝั่งตะวันออก ข้ามสะพานไป ค่ายจะเปิดรับผู้รอดชีวิตเช้าวันที่สี่',
  'ไฟฟ้าในเมืองจะถูกตัด อย่าส่งเสียงดัง พวกมันได้ยิน ค่ายทหารเปิดพรุ่งนี้เช้า ทางหลวงฝั่งตะวันออก',
  'ค่ายทหารเปิดแล้ว มุ่งหน้าไปทางตะวันออก ตามทางหลวง เราจะรอถึงที่สุด'],
  static:[1,1.4,2.2,1.6]};   // how much the static covers the voice each day
// a storm (one of the DAILY events): heavy rain, wind, lightning that strikes the ground near a player and starts a
// fire; the rain covers sound and sight, so zombies hear and see less
export const STORM={last:150,hear:.6,sight:.8,every:[3,8],near:[16,45],fire:{r:2.2,sec:20},noise:45};
