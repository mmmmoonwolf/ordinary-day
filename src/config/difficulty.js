// ---------- difficulty (v0.5) ----------
// PLACEHOLDER multipliers. They only scale values that are still placeholders: damage the player takes,
// night spawn count, bite infection chance and hunger/thirst. Zombie HP and the day/night times are confirmed and never change.
export const DIFFS={
  easy:{name:'ง่าย',desc:'ซอมบี้ตีเบาลง หิวช้าลง กลางคืนเกิดน้อยลง',dmg:.6,spawn:-1,infect:.5,needs:.7},
  normal:{name:'ปกติ',desc:'ค่าตามที่ออกแบบไว้',dmg:1,spawn:0,infect:1,needs:1},
  hard:{name:'ยาก',desc:'ซอมบี้ตีแรงขึ้น หิวเร็ว กลางคืนเกิดมากขึ้น',dmg:1.4,spawn:1,infect:1.5,needs:1.3},
};
export const diffOf=g=>DIFFS[g.diff]||DIFFS.normal;
