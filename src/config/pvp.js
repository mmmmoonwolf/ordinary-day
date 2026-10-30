// ---------- PvP mode (v0.47) ----------
// PLACEHOLDERS. A room opened as PvP: the same city and zombies, players can shoot and hit each other, the dead come
// back after a moment somewhere random with everything they had (nothing drops), and big hordes come through every few
// hours on top of the usual zombies. No end: it goes on until the host leaves.
export const PVP={
  start:9*60+29,          // a PvP game starts the minute before the outbreak (in-game minutes)
  dmg:1,                  // damage a player's weapon does to another player, times its DEF dmg (zombie damage unchanged)
  respawn:5,              // seconds dead before coming back
  inv:3,                  // seconds untouchable after coming back
  far:28,                 // a new place at least this far from every other player still alive (m)
  near:140,               //   and no further than this from the nearest of them, so the fight is not across the map
  zFar:12,                //   and from every zombie
  kit:{gun:'pistol_c',ammo:['a9',24]},   // what each player starts with (kept for good: nothing is lost on death)
  horde:{first:10*60+20,every:240,size:[32,44],cap:170},   // in-game minutes; zombies per horde; skipped past `cap` agents
};
