import {SNEAK_SPEED,SNEAK_SENSE} from './stealth.js';

// ---------- aiming, recoil and stances (v0.29) ----------
// PLACEHOLDERS. Aiming down the sights (right mouse held, or the 🎯 button) tightens a gun's spread and slows the walk;
// in the first-person view it also zooms in (zoom ×, by gun model) and the sniper rifle looks through a scope.
// Every shot adds to the spread (bloom) until the gun settles again, so long bursts scatter.
export const ADS={spread:.45,speed:.6,zoom:{pistol:1.2,smg:1.3,shotgun:1.15,dbshotgun:1.15,rifle:1.7,lmg:1.4,sniper:4},scope:['sniper']};
export const BLOOM={add:.3,max:1.5,decay:.6};   // spread × (1 + bloom): per shot, cap, settling per second
// stances: crouched (C) is the old sneak; prone (Z) is slower still, steadier and harder to notice.
// speed m/s; sense = how much of a zombie's usual sight range still notices the player; spread ×; eye height (m)
export const STANCE=[
  {name:'',speed:0,sense:1,spread:1,eye:1.62},
  {name:'หมอบ',speed:SNEAK_SPEED,sense:SNEAK_SENSE,spread:.8,eye:1.05},
  {name:'นอนราบ',speed:.75,sense:.3,spread:.6,eye:.32},
];
// first person only (looks, and where the shot goes): the aim drifts a little (rad), less crouched, prone or holding the
// breath (Shift while looking through the scope, for BREATH s, then a pause of BREATH_REST s)
export const SWAY={base:.006,moving:2.2,ads:.7,scope:1.6};
export const BREATH=3,BREATH_REST=4;
export const KICK={pitch:.018,yaw:.006};   // camera kick per shot (rad), × (1 + bloom)
