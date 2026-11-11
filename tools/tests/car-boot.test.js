// v0.61: the car boot
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.61 test: ' + m), Ac = await import('../../src/systems/actions.js'), Gm = await import('../../src/systems/game.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); for (const a of T.agents) a.gone = true; step(2);
  const c = T.G.cars[0]; if (!c.trunk || !c.trunk.length) vfail('an empty boot at the start');
  const q = Gm.addPlayer(); q.inv = 1e9; q.pos.x = c.x + 2.2; q.pos.z = c.z; step(2);
  if (q.nearCar !== 0) { q.pos.x = c.x; q.pos.z = c.z + 2.2; step(2); }
  if (q.nearCar !== 0) vfail('not by the car: ' + q.nearCar);
  q.gear.bag.push({ id: 'a9', n: 7 }); const n0 = c.trunk.length, had = c.trunk.find(e => e.id === 'a9');
  Ac.runAction(q, 'trunkPut', [q.gear.bag.length - 1]); if (q.gear.bag.some(e => e.id === 'a9') || !c.trunk.some(e => e.id === 'a9')) vfail('not put in the boot');
  const j = c.trunk.findIndex(e => e.id === 'a9'); Ac.runAction(q, 'trunkTake', [j]); if (!q.gear.bag.some(e => e.id === 'a9') || c.trunk.some(e => e.id === 'a9')) vfail('not taken out');
  for (const p of P.players.slice(1)) p.away = true; step(1);
  console.log('v0.61: a boot with ' + n0 + ' things at the start, ammo put in and taken out' + (had ? ' (merged)' : ''));

finish('car-boot');
