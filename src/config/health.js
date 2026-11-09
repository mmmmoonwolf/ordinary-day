// ---------- health coming back by itself (v0.42) ----------
// PLACEHOLDERS. Without hunger and thirst HP came back to full by itself 6 s after the last hit, which made medicine
// pointless: now it comes back slower and only up to `cap` of the maximum (medicine heals the rest). `after` s without
// a hit, `rate` HP per second (it was 1.5 with no cap).
export const REGEN={after:6,rate:.6,cap:.6};
// v0.54 the body (PLACEHOLDERS). A zombie's blow opens a wound now and then: it bleeds (HP lost, a trail of blood, no
// healing on its own) until any medicine is used or it closes by itself; it never bleeds below `floor` HP. Under `limpAt`
// of max HP the player limps: slower and cannot run.
export const WOUND={chance:.3,lasts:45,hp:.55,floor:5,limpAt:.3,limp:.72,trail:1.3};
// v0.54 soaked outdoors in heavy rain the player may fall ill: sneezes zombies hear, for `lasts` s or until a Painkiller
export const ILL={rain:.4,wet:1/80,dry:1/50,chance:1/25,lasts:240,sneeze:[16,34],noise:16};
// v0.54 panic: `count` zombies within `near` m (or a team mate dying close by) and the hands shake: shots stray more
export const PANIC={near:8,count:4,rise:.4,fall:.12,spread:.7,friend:.5,friendNear:18};
