// ---------- daily events (v0.8) ----------
// PLACEHOLDERS. Per day 2-7: chance of an airdrop, and of a horde (from day 3) or else a blackout; a day with
// neither gets an airdrop. A horde is HORDE.base + day zombies (at most HORDE.max), skipped past HORDE.cap agents.
export const EVENT_CHANCE={airdrop:.6,horde:.5,blackout:.35};
export const AIRDROP_ITEMS=6;
export const HORDE={base:5,max:12,cap:115,bridge:.35};   // v0.25 bridge: share of hordes that come over the bridge from the east (PLACEHOLDER)
// v0.18 random events, every day from day 1 (PLACEHOLDERS). Drawn at the start and at each 06:00 (so they go on after
// day 7): one a day, two from day TWO_FROM. weights pick the kind, [from,to] the in-game time window (minutes of the day).
export const DAILY={twoFrom:4,weights:{alarm:20,stash:20,truck:14,fog:12,raid:10,crash:12},   // v0.42 no heat wave (it only made you thirsty)
  window:{alarm:[9*60,17*60],stash:[8*60+30,14*60],truck:[9*60,15*60],fog:[6*60,6*60+20],raid:[11*60,15*60],crash:[19*60+30,23*60]},
  last:{alarm:40,fog:240},   // in-game minutes
  alarmNoise:32,siteItems:[4,6],siteZombies:[2,4]};
