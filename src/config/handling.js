import {SNEAK_SPEED,SNEAK_SENSE} from './stealth.js';

// ---------- aiming, recoil and stances (v0.29) ----------
// PLACEHOLDERS. Aiming down the sights (right mouse held, or the 🎯 button) tightens a gun's spread and slows the walk;
// in the first-person view it also zooms in (zoom ×, by gun model) and the sniper rifle looks through a scope.
// Every shot adds to the spread (bloom) until the gun settles again, so long bursts scatter.
export const ADS={spread:.45,speed:.6,zoom:{pistol:1.2,smg:1.3,shotgun:1.15,dbshotgun:1.15,rifle:1.7,lmg:1.4,sniper:4},scope:['sniper']};
export const BLOOM={add:.3,max:1.5,decay:.6};   // spread × (1 + bloom): per shot, cap, settling per second
// v0.44 no crouching or lying prone any more (v0.29's stances): sneaking (C, or a lightly pushed stick) is a slow, quiet
// walk standing up. speed m/s; sense = how much of a zombie's usual sight range still notices the player; spread ×
export const SNEAK={speed:SNEAK_SPEED,sense:SNEAK_SENSE,spread:.8};
export const EYE=1.62;   // eye height in the first-person view (m)
// first person only (looks, and where the shot goes): the aim drifts a little (rad), less when holding the
// breath (Shift while looking through the scope, for BREATH s, then a pause of BREATH_REST s)
export const SWAY={base:.006,moving:2.2,ads:.7,scope:1.6};
export const BREATH=3,BREATH_REST=4;
export const KICK={pitch:.018,yaw:.006,ads:1.3,punch:.07,arms:2.2};   // camera kick per shot (rad), × (1 + bloom); v0.48 aimed down the sights or through a scope (PLACEHOLDER): the kick × ads, the view pushed back (fov × 1 + punch, fading) and the arms / gun shoved back × arms
// vaulting low obstacles (v0.30): how far ahead (m), how deep an obstacle can be, how long it takes (s) and how high
// the arc goes (m); running into one vaults when it is within auto m (v0.44 walking into one too, after pushing against it for push s);
// a hop without anything to vault
export const VAULT={reach:1.1,auto:.55,push:.22,depth:2.4,dur:.55,height:.75,hop:.42,hopH:.3};
