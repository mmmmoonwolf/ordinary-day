// v0.63: up a ladder onto a roof
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.63 test: ' + m), Rw = await import('../../src/world/roofs.js'), Ac = await import('../../src/systems/actions.js'), Gm = await import('../../src/systems/game.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); for (const a of T.agents) a.gone = true; step(2);
  if (Rw.ladders.length < 3) vfail('only ' + Rw.ladders.length + ' ladders');
  const L = Rw.ladders[0], q = Gm.addPlayer(); q.inv = 1e9; q.pos.x = L.lx; q.pos.z = L.lz; step(2);
  if (q.nearLadder !== 0) vfail('no ladder at its foot: ' + q.nearLadder);
  Ac.runAction(q, 'use', []); step(2); if (q.roof !== 0 || !(q.airH > 5)) vfail('not up: roof ' + q.roof + ' airH ' + q.airH);
  q.input.mx = 1; q.input.mz = 0; q.input.mag = 1; step(120); q.input.mag = 0; const R = L.roof; if (q.pos.x > R.x1 + .01 || q.pos.x < R.x0 - .01) vfail('walked off the roof: ' + q.pos.x.toFixed(2));
  const z = T.makeAgent(L.lx, L.lz); T.becomeZombie(z, 'zombie'); T.agents.push(z); const hp0 = q.hp; step(120); if (q.hp < hp0) vfail('a zombie reached the roof');
  if (T.targets && T.targets().includes(q)) vfail('targetable up there');
  z.gone = true; q.pos.x = L.rx; q.pos.z = L.rz; step(2); Ac.runAction(q, 'use', []); step(2); if (q.roof !== -1 || q.airH > .5) vfail('not down');
  for (const p of P.players.slice(1)) p.away = true; step(1);
  console.log('v0.63: ' + Rw.ladders.length + ' ladders, up to ' + L.h.toFixed(1) + ' m, kept on the roof, out of zombies\' reach, down again');

finish('roofs');
