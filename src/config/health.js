// ---------- health coming back by itself (v0.42) ----------
// PLACEHOLDERS. Without hunger and thirst HP came back to full by itself 6 s after the last hit, which made medicine
// pointless: now it comes back slower and only up to `cap` of the maximum (medicine heals the rest). `after` s without
// a hit, `rate` HP per second (it was 1.5 with no cap).
export const REGEN={after:6,rate:.6,cap:.6};
