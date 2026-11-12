// v0.64: the motorbike
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.64 test: ' + m), Wv = await import('../../src/world/vehicles.js'), Vh = await import('../../src/systems/vehicles.js'), { BIKE, CAR } = await import('../../src/config/vehicles.js'), Gm = await import('../../src/systems/game.js'), Cb = await import('../../src/systems/combat.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); for (const a of T.agents) a.gone = true; step(2);
  const bikes = Wv.rides.map((r, i) => [r, i]).filter(([r]) => r.kind === 'bike'); if (bikes.length < 1) vfail('no motorbike');
  const [, bi] = bikes[0], c = T.G.cars[bi]; c.fuel = 1; if (c.hp !== BIKE.hp) vfail('bike hp ' + c.hp);
  const q = Gm.addPlayer(); q.inv = 1e9; q.pos.x = c.x + 1.2; q.pos.z = c.z; step(2);
  if (!Vh.enterCar(q, bi)) vfail('could not get on');
  q.inv = 0; q.hp = 100; const hp0 = q.hp; Cb.hurtPlayer(q, 10); if (!(q.hp < hp0) || c.hp !== BIKE.hp) vfail('the bike shielded its rider: ' + q.hp + ' bike ' + c.hp);
  q.inv = 1e9; const x0 = c.x, z0 = c.z; q.input.mx = Math.sin(c.a); q.input.mz = Math.cos(c.a); q.input.mag = 1; let top = 0; for (let k = 0; k < 150; k++) { step(1); top = Math.max(top, Math.abs(c.v)); }
  q.input.mag = 0; if (!(Math.hypot(c.x - x0, c.z - z0) > 3)) vfail('did not ride: ' + Math.hypot(c.x - x0, c.z - z0).toFixed(1));
  Vh.leaveCar(q); for (const p of P.players.slice(1)) p.away = true; step(1);
  console.log('v0.64: ' + bikes.length + ' motorbikes, rode ' + Math.hypot(c.x - x0, c.z - z0).toFixed(1) + ' m (top ' + top.toFixed(1) + ' m/s, a car tops at ' + CAR.max + '), the rider takes the hits');

finish('motorbike');
