// ---------- PvP mode (v0.47) ----------
// PLACEHOLDERS. A room opened as PvP: the same city and zombies, players can shoot and hit each other, the dead come
// back after a moment somewhere random with what they had, and big hordes come through every few hours on top of the
// usual zombies. v0.49: rounds (first to `round.kills`, or most kills after `round.minutes`), a supply crate of
// Military gear now and then, faster healing, a heal for each kill, half the ammo left where you die, cars hit people.
export const PVP={
  start:-1,               // a PvP game starts the minute before the outbreak (in-game minutes from the outbreak: 09:29)
  dmg:1,                  // damage a player's weapon does to another player, times its DEF dmg (zombie damage unchanged)
  respawn:5,              // seconds dead before coming back
  inv:4,                  // seconds untouchable after coming back (v0.49: ends the moment they attack)
  far:28,                 // a new place at least this far from every other player still alive (m)
  near:140,               //   and no further than this from the nearest of them, so the fight is not across the map
  zFar:12,                //   and from every zombie
  kit:{gun:'pistol_c',ammo:['a9',24]},   // what each player starts with, once (weapons and the rest of the bag are kept on death)
  // v0.49 hordes grow with the players in the room: size + perPlayer × players zombies
  horde:{first:50,every:300,size:[12,16],perPlayer:9,cap:170},   // in-game minutes, the first counted from the outbreak (10:20); skipped past `cap` agents
  round:{kills:10,minutes:10,gap:10},   // v0.49 a round ends at `kills` kills or after `minutes` (real); a new one `gap` s later
  drop:{first:80,every:330},            // v0.49 a crate of Military gear (in-game minutes, the first from the outbreak: 10:50; ~80 s)
  killHeal:25,            // v0.49 HP back for a kill
  dropAmmo:.5,            // v0.49 share of each ammo stack left on the ground at death (0: nothing drops)
  regen:{after:5,rate:5,cap:1},         // v0.49 healing on its own: after s untouched, HP per s, up to this share of max HP
  // v0.51 the rules: team (two teams by player number, first team to `kills`), infection (one player starts as a
  // zombie with claws and speed; whoever it kills joins it; people win by lasting `minutes`), hill (stand alone in a
  // ring that moves every `move` s: a point every `every` s, first to `points`)
  team:{kills:15},infect:{minutes:5,speed:1.3,hp:150},hill:{r:7,move:90,every:2,points:30},
  killCam:2.5,            // v0.51 seconds the camera of a player just killed looks at their killer
  bounty:{min:3,lead:2,worth:2},        // v0.51 the leader with at least min kills, lead ahead of the next, carries a red beacon; killing them counts worth kills
};
