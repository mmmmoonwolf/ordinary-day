// ---------- time ----------
export const DAY_REAL_SECONDS = 300;              // 1 in-game day = 5 real minutes
export const RATE = 1440 / DAY_REAL_SECONDS;      // in-game minutes per real second
export const SPEEDS=[1,2,4];
export const NIGHT_START=18*60+30, DAY_START=6*60, DUSK_WARN=16*60;   // Q11: warn ~31 real seconds before night at ×1
export const isNightTod=t=>t>=NIGHT_START||t<DAY_START;
