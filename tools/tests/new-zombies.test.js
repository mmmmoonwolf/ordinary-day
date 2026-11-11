// v0.57: nests grow zombies and burst into loot, the Screamer calls the others, a flashlight drives a Hunter back, Hunters burn at dawn
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.57 test: ' + m), Z = await import('../../src/config/zombies.js'), Ai = await import('../../src/entities/ai.js'), Gm = await import('../../src/systems/game.js');
  els.bAgain.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  T.G.outbreak = true; T.G.nested = false; T.G.min = Z.NEST.at + 1; step(2);
  const nests = T.agents.filter(a => a.kind === 'nest'); if (!nests.length) vfail('no nests');
  const n = nests[0], nx = n.pos.x, nz = n.pos.z; me.pos.x = nx + 8; me.pos.z = nz; me.room = -1; for (let k = 0; k < 12 && !T.agents.some(a => a.from === n.nid); k++) { n.nextBrood = T.G.min; step(2); }   // a spot beside it can be taken
  const brood = T.agents.filter(a => a.from === n.nid); if (!brood.length) vfail('the nest grew nothing');
  for (const b of brood) { b.pos.x = nx + .3; b.pos.z = nz; } step(3); if (Math.hypot(n.pos.x - nx, n.pos.z - nz) > .01) vfail('the nest was pushed');
  for (const b of brood) b.gone = true; const d0 = T.drops.length; Ai.hurtZombie(n, 999, 0, 1, 0, true, true, me); step(2);
  if (n.state !== 'dead' || T.drops.length < d0 + Z.NEST.cache) vfail('the nest did not burst into loot: ' + n.state + ' ' + (T.drops.length - d0));
  for (const a of T.agents) a.gone = true; step(2);
  // the Screamer: sees the player, wails, a zombie 30 m away hears it
  T.G.min = 1440 + 13 * 60; T.G.phase = 'day'; me.pos.x = 0; me.pos.z = -60; while (I.roomAt(me.pos.x, me.pos.z) >= 0) me.pos.x += 3;
  const sc = T.makeAgent(me.pos.x + 6, me.pos.z); T.becomeZombie(sc, 'screamer'); T.agents.push(sc);
  const far = T.makeAgent(me.pos.x - 30, me.pos.z); T.becomeZombie(far, 'zombie'); T.agents.push(far); step(3);
  if (!(sc.screamT > 0) || !far.heard) vfail('screamer: screamT ' + sc.screamT + ' heard ' + !!far.heard);
  for (const a of T.agents) a.gone = true; step(2);
  // the Hunter in a flashlight beam (a second player standing still, facing it)
  const q = Gm.addPlayer(); q.inv = 1e9; q.pos.x = me.pos.x; q.pos.z = me.pos.z + 20; q.room = -1; q.light = true;
  T.G.min = 1440 + 23 * 60; step(2); T.G.phase = 'night';
  const h = T.makeAgent(q.pos.x, q.pos.z + 6); T.becomeZombie(h, 'hunter'); T.agents.push(h); q.face = 0; q.input.face = 0;
  const d0h = Math.hypot(h.pos.x - q.pos.x, h.pos.z - q.pos.z); step(1);
  if (!(h.feed > 0) || !(Math.hypot(h.pos.x - q.pos.x, h.pos.z - q.pos.z) > d0h)) vfail('the flashlight did not drive the hunter back: feed ' + h.feed);
  T.G.min = 2 * 1440 + 6 * 60 + 5; step(3); if (T.agents.includes(h)) vfail('the hunter did not burn at dawn');
  for (const a of T.agents) a.gone = true; step(2);
  console.log('v0.57: ' + nests.length + ' nests, one grew ' + brood.length + ' and burst into loot, a Screamer called a zombie 30 m off, a flashlight drove a Hunter back, Hunters gone at dawn');

finish('new-zombies');
