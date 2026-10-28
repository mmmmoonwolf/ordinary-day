// ---------- difficulty (v0.5) ----------
// PLACEHOLDER multipliers. They only scale values that are still placeholders: damage the player takes,
// night spawn count and bite infection chance. Zombie HP and the day/night times are confirmed and never change.
export const DIFFS={
  easy:{name:'ง่าย',dmg:.6,spawn:-1,infect:.5},
  normal:{name:'ปกติ',dmg:1,spawn:0,infect:1},
  hard:{name:'ยาก',dmg:1.4,spawn:1,infect:1.5},
};
export const diffOf=g=>DIFFS[g.diff]||DIFFS.normal;
