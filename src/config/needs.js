// ---------- hunger & thirst (v0.5) ----------
// PLACEHOLDERS. Bars run 100 → 0 over these in-game minutes (1 in-game day = 1440 min = 5 real minutes at ×1)
export const FOOD_MINUTES=2880, WATER_MINUTES=1800;
export const RUN_THIRST=1.5;        // running drinks faster
export const LOW_NEED=25;           // below this HP stops regenerating
export const STARVE_HP_PER_MIN=.15; // HP lost per in-game minute for each empty bar
