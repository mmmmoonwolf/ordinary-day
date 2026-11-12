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
  // B6: the furniture is not a door that heals. Once smashed it cannot be dragged back until the next morning,
  // and pulling it away yourself keeps only what was left of it
  D.toggleDoor(q, k); step(1); const st = T.G.doors[k];
  if (st.open) vfail('B6: the door did not shut again');
  if (D.fixAction(k, q) || q.fixDoor === k) vfail('B6: smashed furniture was offered again');
  const hp1 = st.hp; for (let i = 0; i < 5; i++) Ac.runAction(q, 'fix', []);
  if (st.bar || st.hp !== hp1) vfail('B6: barricaded again after it was smashed: ' + hp1 + ' -> ' + st.hp);
  T.G.phase = 'night'; T.G.min = 1440 + 6 * 60 + 1; step(2);                      // the next morning
  if (T.G.phase !== 'day') vfail('B6: no morning came'); q.hp = q.maxHp || 100; q.bleedW = 0;
  if (D.fixAction(k, q) !== 'barricade') vfail('B6: no furniture the next morning: ' + JSON.stringify(st));
  const hp2 = st.hp; D.fixDoor(q, k); if (!st.bar || st.hp !== hp2 + Sh.BARR.hp) vfail('B6: the morning barricade: ' + st.hp);
  D.damageDoor(k, 30); D.toggleDoor(q, k);                                           // 50 of the 80 left, pulled away from inside
  if (st.bar || st.hp !== hp2) vfail('B6: pulled away, the door has ' + st.hp + ' not its own ' + hp2);
  D.fixDoor(q, k); if (!st.bar || st.hp !== hp2 + Sh.BARR.hp - 30) vfail('B6: put back, it was made whole again: ' + st.hp + ' (door ' + hp2 + ')');
  D.toggleDoor(q, k);
  for (const p of P.players.slice(1)) p.away = true;
  console.log('B6: smashed furniture stays smashed until morning; pulled away and put back it keeps its damage');
  console.log('v0.59: barricaded from inside (+' + Sh.BARR.hp + '), not from outside, gives way, opens from inside');

finish('barricade');
