// v0.59: furniture against a shut door from inside, a gamepad
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.59 test: ' + m), D = await import('../../src/systems/doors.js'), I2 = await import('../../src/world/interiors.js'), Sh = await import('../../src/config/shelter.js'), Ac = await import('../../src/systems/actions.js'), Gm = await import('../../src/systems/game.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  const k = 3, r = I2.rooms[k];
  const q = Gm.addPlayer(); q.inv = 1e9; q.pos.x = r.dx - r.n[0] * 1.2; q.pos.z = r.dz - r.n[1] * 1.2; step(2);
  if (q.room !== k) vfail('not inside: room ' + q.room);
  if (T.G.doors[k].open) D.toggleDoor(q, k); step(1);
  if (q.fixDoor !== k) vfail('no barricade offered: ' + q.fixDoor);
  const hp0 = T.G.doors[k].hp; Ac.runAction(q, 'fix', []); if (!T.G.doors[k].bar || T.G.doors[k].hp !== hp0 + Sh.BARR.hp) vfail('not barricaded: ' + T.G.doors[k].hp);
  const out = Gm.addPlayer(); out.inv = 1e9; out.pos.x = r.dx + r.n[0] * 1.2; out.pos.z = r.dz + r.n[1] * 1.2; step(1);
  D.toggleDoor(out, k); if (T.G.doors[k].open || !T.G.doors[k].bar) vfail('opened from outside');
  D.damageDoor(k, Sh.BARR.hp + 5); if (T.G.doors[k].bar) vfail('still barricaded after the furniture gave way');
  const ok = D.toggleDoor(q, k); if (!T.G.doors[k].open) vfail('could not open from inside: ' + ok + ' ' + JSON.stringify(T.G.doors[k]) + ' alive ' + q.alive + ' bleed ' + q.bleed);
  for (const p of P.players.slice(1)) p.away = true;
  console.log('v0.59: barricaded from inside (+' + Sh.BARR.hp + '), not from outside, gives way, opens from inside');

finish('barricade');
