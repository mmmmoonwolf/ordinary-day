// ---------- PvP mode (v0.47) ----------
// PLACEHOLDERS. A room opened as PvP: the same city and zombies, players can shoot and hit each other, the dead come
// back after a moment somewhere random with what they had, and big hordes come through every few hours on top of the
// usual zombies. v0.49: rounds (first to `round.kills`, or most kills after `round.minutes`), a supply crate of
// Military gear now and then, faster healing, a heal for each kill, half the ammo left where you die, cars hit people.
export const PVP={
  start:9*60+29,          // a PvP game starts the minute before the outbreak (in-game minutes)
  dmg:1,                  // damage a player's weapon does to another player, times its DEF dmg (zombie damage unchanged)
  respawn:5,              // seconds dead before coming back
  inv:4,                  // seconds untouchable after coming back (v0.49: ends the moment they attack)
  far:28,                 // a new place at least this far from every other player still alive (m)
  near:140,               //   and no further than this from the nearest of them, so the fight is not across the map
  zFar:12,                //   and from every zombie
  kit:{gun:'pistol_c',ammo:['a9',24]},   // what each player starts with, once (weapons and the rest of the bag are kept on death)
  // v0.49 hordes grow with the players in the room: size + perPlayer × players zombies
  horde:{first:10*60+20,every:300,size:[12,16],perPlayer:9,cap:170},   // in-game minutes; skipped past `cap` agents
  round:{kills:10,minutes:10,gap:10},   // v0.49 a round ends at `kills` kills or after `minutes` (real); a new one `gap` s later
  drop:{first:10*60+50,every:330},      // v0.49 a crate of Military gear (in-game minutes; ~80 s)
  killHeal:25,            // v0.49 HP back for a kill
  dropAmmo:.5,            // v0.49 share of each ammo stack left on the ground at death (0: nothing drops)
  regen:{after:5,rate:5,cap:1},         // v0.49 healing on its own: after s untouched, HP per s, up to this share of max HP
};
