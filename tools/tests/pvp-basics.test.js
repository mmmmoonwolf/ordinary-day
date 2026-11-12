// v0.47: PvP: a room's new game where players hurt each other, the dead come back elsewhere with their gear, big hordes, no save
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.47 test: ' + m), S = await import('../../src/systems/save.js'), Pv = await import('../../src/systems/pvp.js'), PC = (await import('../../src/config/pvp.js')).PVP;
  const Cb = await import('../../src/systems/combat.js'), Gm = await import('../../src/systems/game.js'), Pl = await import('../../src/entities/player.js'), { DEF } = await import('../../src/config/items.js');
  const { rayWall } = await import('../../src/world/collision.js'), Sn = await import('../../src/net/snapshot.js');
  els.bAgain.fire('click'); T.G.running = true; step(2); S.saveGame(); const kept = S.readSave().G.min;
  Pv.startPvp(); T.G.running = true; const p2 = Gm.addPlayer(); step(12);
  const p1 = T.player, zs = () => T.agents.filter(a => a.state === 'zombie' && !a.gone).length;
  if (T.G.mode !== 'pvp' || !(Math.abs(T.G.min - (9 * 60 + 29)) < 2)) vfail('PvP did not start a new game at the outbreak: ' + T.G.mode + ' ' + T.G.min);
  if (T.G.pvpHorde !== 10 * 60 + 20 || T.G.pvpDrop !== 10 * 60 + 50) vfail('the first horde / crate moved: ' + T.G.pvpHorde + ' ' + T.G.pvpDrop);   // the first town's times, as before B8
  for (const p of [p1, p2]) if (!p.gear.eq.secondary || p.gear.eq.secondary.id !== PC.kit.gun || !p.gear.bag.some(e => e.id === PC.kit.ammo[0])) vfail(p.name + ' has no starting gun or ammo');
  const apart = Math.hypot(p1.pos.x - p2.pos.x, p1.pos.z - p2.pos.z);
  if (Sn.encodeWorld(Sn.freshSent(), p1).g.md !== 'pvp') vfail('the snapshot does not carry the mode');
  if (S.saveGame() || S.readSave().G.min !== kept) vfail('a PvP game was saved over the survival one');
  // p1 shoots p2 down on an open stretch: kill and death counted, no game over, p2 back after PVP.respawn somewhere else, gear kept
  for (const a of T.agents) a.gone = true; step(2);
  let dir = null; for (let k = 0; k < 16 && !dir; k++) { const a = k / 16 * Math.PI * 2; if (rayWall(p1.pos.x, p1.pos.z, Math.sin(a), Math.cos(a), 7) >= 6.5) dir = a; }
  const put = d => { for (const a of T.agents) if (a.state === 'zombie' || a.state === 'infected') a.state = 'dead'; p2.pos.x = p1.pos.x + Math.sin(dir) * d; p2.pos.z = p1.pos.z + Math.cos(dir) * d; p1.face = dir; p2.inv = 0; };
  if (dir === null) vfail('no open line around the player'); else {
    p1.inv = 1e9; put(4); const w = p1.gear.eq.secondary, hp0 = p2.hp; p1.gear.active = 'secondary'; w.mag = 99; p1.input.aim = true;
    Cb.fireGun(p1, w, DEF[w.id]); if (!(p2.hp < hp0)) vfail('a bullet did not hurt the other player (' + hp0 + ' -> ' + p2.hp + ')');
    for (let k = 0; k < 40 && p2.alive; k++) { put(4); Cb.fireGun(p1, w, DEF[w.id]); }
    if (p2.alive || p1.frags !== 1 || p2.deaths !== 1 || T.G.over) vfail('the kill: alive ' + p2.alive + ' frags ' + p1.frags + ' deaths ' + p2.deaths + ' over ' + T.G.over);
    if (Pl.viewed() !== p1) vfail('the camera left the player');
    step(Math.round(PC.respawn * 60) + 10);
    const away = Math.hypot(p1.pos.x - p2.pos.x, p1.pos.z - p2.pos.z);
    if (!p2.alive || p2.hp !== p2.maxHp || !p2.gear.eq.secondary || away < 10 || away > PC.near + 5) vfail('respawn: alive ' + p2.alive + ' hp ' + p2.hp + ' gun ' + !!p2.gear.eq.secondary + ' ' + away.toFixed(1) + ' m away');
    // a punch, then aim assist turning toward the other player
    put(1); p2.inv = 0; const h1 = p2.hp; Cb.meleeHit(p1, DEF.fist); if (!(p2.hp < h1)) vfail('a punch did not hurt the other player');
    put(5); p1.face = dir + .5; p1.input.aim = false; Cb.aimAssist(p1, DEF[w.id]); if (Math.abs(p1.face - dir) > .05) vfail('aim assist did not turn to the other player'); p1.input.aim = true;
    // the player on this device killed: no game over, back again
    p1.inv = 0; p2.inv = 1e9; Cb.hurtPlayer(p1, 999, p2);
    if (p1.alive || T.G.over || p2.frags !== 1) vfail('the local player\'s death: alive ' + p1.alive + ' over ' + T.G.over);
    step(Math.round(PC.respawn * 60) + 10); if (!p1.alive || T.G.endCause) vfail('the local player did not come back: ' + p1.alive + ' ' + T.G.endCause);
  }
  // a big horde on time, and no way out on the morning of day 4
  const z0 = zs(); T.G.min = T.G.pvpHorde; step(2); const big = zs() - z0;
  if (big < 20) vfail('the PvP horde brought only ' + big);
  const { EXIT } = await import('../../src/config/goal.js'); T.G.min = 3 * 1440 + 7 * 60; for (const p of Pl.players) { p.pos.x = EXIT.x + 1; p.pos.z = 0; p.inv = 1e9; } step(30);
  if (T.G.over) vfail('PvP ended at the army camp');
  els.bStart.fire('click'); if (T.G.mode !== 'coop') vfail('a new game stayed in PvP');
  console.log('v0.47: PvP 2 players ' + apart.toFixed(0) + ' m apart, kill / death counted, respawned with gear, punch, aim assist, horde of ' + big + ', not saved, no way out');

finish('pvp-basics');
