import {ROAD} from './world.js';
// ---------- goal ----------
// v0.46 survive GOAL_NIGHTS nights (was 7 with a helicopter at the LZ, v0.4): from the next morning the army camp at the end
// of the highway (world/army.js) opens its gate, soldiers on its towers cover the way in, and everyone alive walking (or
// driving) on through the camp, past EXIT.x, gets out to the next town
export const GOAL_NIGHTS=3;
export const LZ={x:32,z:-32};                 // the old landing zone (v0.4), still kept clear of clutter
export const EXIT={gate:ROAD.end,x:ROAD.end+34,z:0};   // the camp's gate, and where the road on out of it begins
// a night counts once its morning (06:00) arrives
export const nightsSurvived=min=>Math.max(0,Math.floor((min-6*60)/1440));
export const exitOpen=min=>nightsSurvived(min)>=GOAL_NIGHTS;
// the soldiers covering the camp (PLACEHOLDER): how far they shoot (m), damage per hit, how often a shot hits, seconds
// between shots, and how loud the shooting is (zombies within noise m come)
export const ARMY={range:44,dmg:40,hit:.8,cool:[.45,.9],noise:30};
