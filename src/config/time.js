// ---------- time ----------
export const DAY_REAL_SECONDS = 360;              // 1 in-game day = 6 real minutes (v0.46, was 5)
export const RATE = 1440 / DAY_REAL_SECONDS;      // in-game minutes per real second
export const SPEEDS=[1,2,4];
export const NIGHT_START=18*60+30, DAY_START=6*60, DUSK_WARN=16*60;   // Q11: warn ~31 real seconds before night at ×1
export const isNightTod=t=>t>=NIGHT_START||t<DAY_START;
// The clock is one number, G.min: in-game minutes since 00:00 of day 1. Which day it is and the time of day are read
// off it here, not worked out again in each file (v0.68):
export const DAY_MIN=1440;
export const dayOf=min=>Math.floor(min/DAY_MIN)+1;        // which day it is: 1, 2, 3 ...
export const todOf=min=>min%DAY_MIN;                      // minutes since this day's 00:00 (time of day)
export const midnightOf=min=>min-(min%DAY_MIN);           // this day's 00:00, as a G.min
// v0.32 PLACEHOLDER: on the first morning, before the outbreak, the clock runs at this pace (07:30-09:30 lasts ~70 real
// seconds instead of 25) so the ordinary day can be seen before it ends; every in-game time stays as confirmed (Q11)
export const CALM_PACE=.35;
