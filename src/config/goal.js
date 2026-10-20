// ---------- goal ----------
// Survive GOAL_NIGHTS nights; from the next morning a rescue helicopter waits at the LZ every day (v0.4)
export const GOAL_NIGHTS=7;
export const LZ={x:32,z:-32};                 // crossroads at the park's corner: no props within ~9 m
export const RESCUE_FROM=8*60, RESCUE_UNTIL=12*60, RESCUE_RADIUS=3.2;
// a night counts once its morning (06:00) arrives
export const nightsSurvived=min=>Math.max(0,Math.floor((min-6*60)/1440));
