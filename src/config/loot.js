// ---------- loot tables ----------
export const POOLS={
  civ:{weapons:['pistol_c','shotgun_c','smg_c','bat_c','knife_c','pipe_c'],ammo:['a9','a9','a12']},
  pol:{weapons:['pistol_p','shotgun_p','smg_p','baton_p','rifle_p'],ammo:['a9','a12','a556']},
  mil:{weapons:['pistol_m','shotgun_m','smg_m','axe_m','rifle_m','sniper_m','lmg_m'],ammo:['a9','a12','a556','a556','a762']},
};
// Draft 01 percentages are used as WEIGHTS inside each phase's table (decision Q02/Q03 default)
export const GRADE_W={day:{civ:70},night:{pol:40,mil:10},nightLot:{pol:40,mil:20}};
export const MED_W={day:{bandage:50,antibiotic:30,resurrect:1},night:{bandage:50,antibiotic:30,painkiller:15,firstaid:5,resurrect:1}};
// food (v0.5), planks and bottles (v0.7) weights are PLACEHOLDERS
export const CAT_W={day:{weapon:22,ammo:38,med:30,bag:6,food:24,mat:10,throw:8},night:{weapon:32,ammo:42,med:26,food:16,mat:6,throw:6}};
export const FOOD_W={canned:1,water:1.2};
// v0.14 food is mostly found indoors (PLACEHOLDERS): the two loot spots in each enterable building roll from this table
// instead of CAT_W (food about 1 in 3 instead of 1 in 6), and each building has a pantry spot that only ever holds canned
// food or water. Pantry chances do not fade with the days like REFILL; they still scale with the party size.
export const INDOOR_W={day:{weapon:12,ammo:26,med:28,bag:4,food:44,mat:10,throw:8},night:{weapon:18,ammo:32,med:24,food:38,mat:6,throw:6}};
export const PANTRY={start:.8,day:.5,night:.25};
// v0.7 scarcity, all PLACEHOLDERS. Chance that an empty loot spot gets an item: at a new game, each 06:00 and each 18:30.
// The 06:00 / 18:30 chances shrink by `fade` per day (never below `floor` of the day-1 value), so later days are leaner.
export const REFILL={start:.6,day:.3,night:.4,fade:.85,floor:.4};
export const refillScale=day=>Math.max(REFILL.floor,Math.pow(REFILL.fade,day-1));
// each 06:00, loot nobody picked up that lies farther than `minDist` from the player is gone with this chance
// (other survivors took it). Police / military / ambulance spots and things the player dropped are never taken.
export const TAKEN={chance:.35,minDist:25};
