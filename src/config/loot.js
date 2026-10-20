// ---------- loot tables ----------
export const POOLS={
  civ:{weapons:['pistol_c','shotgun_c','smg_c','bat_c','knife_c','pipe_c'],ammo:['a9','a9','a12']},
  pol:{weapons:['pistol_p','shotgun_p','smg_p','baton_p','rifle_p'],ammo:['a9','a12','a556']},
  mil:{weapons:['pistol_m','shotgun_m','smg_m','axe_m','rifle_m','sniper_m','lmg_m'],ammo:['a9','a12','a556','a556','a762']},
};
// Draft 01 percentages are used as WEIGHTS inside each phase's table (decision Q02/Q03 default)
export const GRADE_W={day:{civ:70},night:{pol:40,mil:10},nightLot:{pol:40,mil:20}};
export const MED_W={day:{bandage:50,antibiotic:30,resurrect:1},night:{bandage:50,antibiotic:30,painkiller:15,firstaid:5,resurrect:1}};
export const CAT_W={day:{weapon:22,ammo:38,med:30,bag:6},night:{weapon:32,ammo:42,med:26}};
