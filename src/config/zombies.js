// ---------- zombie classes ----------
// HP + spawn rules from Draft 01 [CONFIRMED]; speeds/damage are PLACEHOLDERS
export const ZC={
  walker:{name:'Walker',hp:30,speed:.9,sense:6,dmg:6,rate:1.3,skin:'#7d8c69'},
  zombie:{name:'Zombie',hp:30,speed:2.6,sense:15,dmg:15,rate:1.0,skin:'#6f7d5c'},
  sprinter:{name:'Sprinter',hp:30,speed:6.2,sense:18,dmg:12,rate:1.0,skin:'#8c8a62',scale:[.92,1,.92]},
  boomer:{name:'Boomer',hp:120,speed:1.6,sense:14,dmg:0,rate:1,skin:'#8f7d96',scale:[1.45,1.08,1.45]},
  armor:{name:'Armor Walker',hp:150,speed:1.9,sense:15,dmg:15,rate:1.1,skin:'#76836a',scale:[1.08,1.08,1.08],armor:.5},
  tyrant:{name:'Tyrant',hp:300,speed:2.2,sense:22,dmg:35,rate:1,skin:'#9b6a5a',scale:[1.8,1.8,1.8]},
};
export const isSpecial=k=>k==='sprinter'||k==='boomer'||k==='armor'||k==='tyrant';
