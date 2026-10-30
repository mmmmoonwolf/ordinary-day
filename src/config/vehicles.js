// ---------- cars that can be driven (v0.45) ----------
// PLACEHOLDERS. A few cars still start: at the gas station on the highway (world/highway.js). E / the pick button gets in
// or out; the stick or WASD points where to go and the car turns that way (pull the other way to back up). Speeds in m/s.
export const CAR={
  max:13,rev:4.5,         // top speed forward and backward (13 m/s is about 47 km/h)
  accel:6,brake:14,drag:2.4,   // gaining speed, braking against the stick, slowing with no input (m/s per s)
  steer:2.1,              // turning (rad per s) at speed; it turns less while nearly still
  grip0:.35,backAt:2.6,   // v0.49 the share of that it still turns from standstill; how far (rad) behind the car the stick has to point to back up (was 2.2)
  hp:120,                 // how much it takes before it dies (zombies hitting the driver hit the car, crashes, running zombies down)
  crash:.9,               // a crash costs this × the speed in hp, and the car bounces back
  hitMin:3.5,hitDmg:70,hitCost:3,   // running a zombie down: from this speed, damage at top speed (less when slower), what it costs the car
  hitP:80,                // v0.49 PvP: damage to a player run down at top speed
  noise:24,noiseEvery:1.2,          // the engine calls zombies within noise m, every noiseEvery s while it runs
  reach:3.2,              // how close to the car's middle a player has to be to get in
};
