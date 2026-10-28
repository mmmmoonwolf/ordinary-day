// ---------- loot tables ----------
// v0.23 the farm's own weapons (rolled at the farm's loot spots and its barn shelves), and which throwable a 'throw' roll gives
export const FARM_POOL={melee:['pitchfork_c','sickle_c','spade_c','pickaxe_c'],weapons:['dbshotgun_c']};
export const THROW_W={molotov:70,grenade:30};   // PLACEHOLDER (v0.42 no bottles)
export const CAMP_GRADE={civ:40,pol:45,mil:15};   // v0.26 weapon and ammo grades at the camp, day or night (PLACEHOLDER)
export const POOLS={
  civ:{weapons:['pistol_c','shotgun_c','smg_c','bat_c','knife_c','pipe_c'],ammo:['a9','a9','a12'],
    melee:['bat_c','knife_c','pipe_c','crowbar_c','crowbar_c','machete_c','golf_c','wrench_c','wrench_c','sledge_c','katana_c',
      'cleaver_c','dagger_c','hockey_c','poker_c','nunchucks_c']},   // v0.18 'melee' finds (PLACEHOLDER mix; v0.43 five more)
  pol:{weapons:['pistol_p','shotgun_p','smg_p','baton_p','rifle_p'],ammo:['a9','a12','a556']},
  mil:{weapons:['pistol_m','shotgun_m','smg_m','axe_m','rifle_m','sniper_m','lmg_m'],ammo:['a9','a12','a556','a556','a762']},
};
// Draft 01 percentages are used as WEIGHTS inside each phase's table (decision Q02/Q03 default)
export const GRADE_W={day:{civ:70},night:{pol:40,mil:10},nightLot:{pol:40,mil:20}};
import {INFECTION} from './zombies.js';
const MED_ALL={day:{bandage:50,antibiotic:30,resurrect:1},night:{bandage:50,antibiotic:30,painkiller:15,firstaid:5,resurrect:1}};
// v0.18: no Antibiotic while player infection is off (config/zombies.js INFECTION); the other weights are as confirmed
export const MED_W={day:{},night:{}};
export function setMedTables(){for(const ph of ['day','night']){MED_W[ph]={...MED_ALL[ph]};if(!INFECTION.on)delete MED_W[ph].antibiotic;}}
setMedTables();
// v0.37 ammo weights raised (day 38 -> 50, night 42 -> 54; indoors 26 -> 34, 32 -> 42): ammo was too hard to find (PLACEHOLDER)
// v0.42 no food, planks or bottles: their share is simply gone, the rest keep their weights (PLACEHOLDER)
export const CAT_W={day:{weapon:22,ammo:50,med:30,bag:6,throw:5},night:{weapon:32,ammo:54,med:26,throw:5}};
// the two loot spots in each enterable building (v0.14) roll from this table instead of CAT_W; most indoor loot is in the
// furniture (config/search.js)
export const INDOOR_W={day:{weapon:12,ammo:34,med:28,bag:4,throw:5},night:{weapon:18,ammo:42,med:24,throw:5}};
// v0.37 easier to find (PLACEHOLDERS). An ammo roll gives a calibre that a player's gun takes with `AMMO_MATCH` chance, when
// that calibre is in the roll's own pool (so Police / Military ammo still only turns up where and when it did). While a
// player has no backpack and none lies within `near` m of them: one is placed near the start of a new game, the bag
// weight of the street and indoor tables is multiplied by `mult` (and is `night` at night, where it was 0), and searched
// furniture can hold one (weight `search`)
export const AMMO_MATCH=.6;
export const BAG_HELP={mult:3,night:8,search:12,near:45,start:[12,35]};
// v0.7 scarcity, all PLACEHOLDERS. Chance that an empty loot spot gets an item: at a new game, each 06:00 and each 18:30.
// The 06:00 / 18:30 chances shrink by `fade` per day (never below `floor` of the day-1 value), so later days are leaner.
export const REFILL={start:.6,day:.3,night:.4,fade:.85,floor:.4};   // v0.42 unchanged: the street is the riskier, open place to find things
export const refillScale=day=>Math.max(REFILL.floor,Math.pow(REFILL.fade,day-1));
// each 06:00, loot nobody picked up that lies farther than `minDist` from the player is gone with this chance
// (other survivors took it). Police / military / ambulance spots and things the player dropped are never taken.
export const TAKEN={chance:.35,minDist:25};
