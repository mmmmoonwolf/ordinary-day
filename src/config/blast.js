// ---------- explosions and fire (v0.23) ----------
// PLACEHOLDERS. Gas cylinders and fuel cans blow up when shot or caught in a blast or a fire (world/extras.js tanks);
// grenades blow up a moment after landing; a Molotov or a fuel can leaves the ground burning (systems/blast.js).
// r: radius (m) · zdmg / pdmg: damage to zombies / players at the middle (half at the edge) · door: damage to a door in
// reach · noise: how far zombies hear it (m) · fire: [radius, seconds] of fire left behind
export const BLAST={
  propane:{r:5,zdmg:110,pdmg:55,door:90,noise:45},
  gas:{r:3.5,zdmg:70,pdmg:35,door:50,noise:35,fire:[2.4,8]},
  grenade:{r:4.5,zdmg:120,pdmg:60,door:90,noise:45},
};
export const GRENADE_FUSE=.9;   // seconds from landing to the blast
// burning ground: damage per second to zombies and players standing in it, a Molotov's fire, how long a cylinder sits
// in fire before it goes, and how far the flames are heard
export const FIRE={zdps:28,pdps:12,molotov:[2.6,7],ignite:1.2,noise:26};
// v0.26 the camp: bear traps hold a zombie (s) and hurt it, hold a player (s) and hurt them; walkers left there
export const CAMP_CFG={trapHold:6,trapZ:30,trapHoldP:2,trapP:20,guards:4};
// v0.26 a flare: burns this long (s), calling zombies this far (m) every few seconds
export const FLARE={secs:20,noise:34,every:2.5};
