// ---------- playing together (v0.10) ----------
// PLACEHOLDERS. Downed: with a teammate still standing, a player at 0 HP (and no Resurrection Kit) falls and waits
// for help instead of dying. Alone it is death as before. Hits while down shorten the time left.
export const BLEED_SECONDS=45;     // time a downed player lasts without help
export const BLEED_PER_DMG=.4;     // seconds lost per point of damage taken while down
export const CRAWL_SPEED=.6;       // m/s a downed player can drag themselves
export const REVIVE_SECONDS=4;     // a teammate standing still next to them
export const REVIVE_RANGE=1.6;
export const REVIVE_HP=30;
// Scaling by the number of players still alive (index = players, 1 = solo and unchanged). Zombie HP, Armor Walker
// (at most 6 a night) and the Tyrant are confirmed rules and do not scale.
export const PARTY={
  spawn:[0,0,1,2,3],         // extra zombies per night wave
  horde:[1,1,1.35,1.7,2],    // horde size multiplier
  loot:[1,1,1.3,1.55,1.8],   // daily / nightly loot refill multiplier
  airdrop:[0,0,2,3,4],       // extra airdrop items
};
export const partyOf=(n,key)=>PARTY[key][Math.max(1,Math.min(4,n))];
