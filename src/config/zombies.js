// ---------- zombie classes ----------
// HP + spawn rules from Draft 01 [CONFIRMED]; speeds/damage/infect are PLACEHOLDERS
// infect = chance that a bite infects the player (v0.4); explosions and the Tyrant slam never infect
// v0.18: the creator switched player infection off for now: bites do not infect, Antibiotic is no longer found (one already
// in the bag still heals). An object, not a const flag, so the smoke test can still run the infection code
export const INFECTION={on:false};
export const ZC={
  walker:{name:'Walker',hp:30,speed:.9,sense:6,dmg:6,rate:1.3,infect:.1,skin:'#7d8c69'},
  zombie:{name:'Zombie',hp:30,speed:2.6,sense:15,dmg:15,rate:1.0,infect:.2,skin:'#6f7d5c'},
  sprinter:{name:'Sprinter',hp:30,speed:6.2,sense:18,dmg:12,rate:1.0,infect:.2,skin:'#8c8a62',scale:[.92,1,.92]},
  boomer:{name:'Boomer',hp:120,speed:1.6,sense:14,dmg:0,rate:1,skin:'#8f7d96',scale:[1.45,1.08,1.45]},
  armor:{name:'Armor Walker',hp:150,speed:1.9,sense:15,dmg:15,rate:1.1,infect:.2,skin:'#76836a',scale:[1.08,1.08,1.08],armor:.5},
  tyrant:{name:'Tyrant',hp:300,speed:2.2,sense:22,dmg:35,rate:1,skin:'#9b6a5a',scale:[1.8,1.8,1.8]},
  // v0.57 new classes [PROPOSED, every number PLACEHOLDER; the confirmed classes above are unchanged]
  screamer:{name:'Screamer',hp:40,speed:1.5,sense:16,dmg:4,rate:1.4,infect:.1,skin:'#b9b2a2',scale:[.86,1.04,.86]},
  hunter:{name:'Hunter',hp:90,speed:6.6,sense:26,dmg:20,rate:.8,infect:.2,skin:'#4e4252',scale:[1.02,1.12,1.02]},
  nest:{name:'Nest',hp:160,speed:0,sense:0,dmg:0,rate:1,skin:'#5a2a30'},
};
// v0.57 (PLACEHOLDERS) the Screamer, from day `from`: a share of the night spawns and `day` of them each morning; when it
// sees a player it wails every `every` s, a noise heard `noise` m around that calls the others
export const SCREAMER={from:2,night:10,day:2,every:7,noise:48};
// the night Hunter, from night `from`: `count` of them come `after` in-game minutes into the night, fast and strong, but
// a flashlight on them from `lightR` m (facing within `arc` rad) makes them flinch back; at first light they burn away
export const HUNTER={from:2,count:[2,3],after:60,lightR:11,arc:.45,flinch:.6};
// nests from `at` (in-game minute, day 2 06:00): `count` in the streets, far from the players and from each other; while
// a player is within `near` m one grows a zombie every `every` in-game minutes (faster at night), at most `max` alive;
// destroyed, it leaves `cache` things
export const NEST={at:1440+6*60,count:4,far:55,apart:45,near:70,every:45,night:.6,max:5,cache:4};
// PLACEHOLDER: in-game minutes from bite to turning (~100 real seconds at ×1)
export const INFECT_MINUTES=8*60;
// v0.27 a bitten person falls down for the last seconds before turning, then needs a moment to get up as a zombie
// (it does not move or bite meanwhile). PLACEHOLDER seconds
export const RISE={fall:1.2,up:2};
export const isSpecial=k=>k==='sprinter'||k==='boomer'||k==='armor'||k==='tyrant'||k==='screamer';   // v0.57 the Screamer leaves at dawn too
