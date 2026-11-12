// v0.53: markers (danger / loot / go, one per player, gone after a while) and cars with fuel and a horn
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.53 test: ' + m), Ac = await import('../../src/systems/actions.js'), { PING } = await import('../../src/config/party.js');
  const { CAR } = await import('../../src/config/vehicles.js'), V = await import('../../src/systems/vehicles.js'), Gm = await import('../../src/systems/game.js'), { pumpSpots } = await import('../../src/world/highway.js');
  els.bAgain.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  const z = T.makeAgent(me.pos.x + 10, me.pos.z); T.becomeZombie(z, 'zombie'); T.agents.push(z);
  Ac.act('ping', me.pos.x + 11, me.pos.z); if (!T.G.pings.length || T.G.pings[0].k !== 'danger') vfail('a mark by a zombie is not danger: ' + JSON.stringify(T.G.pings));
  z.gone = true; step(1); const d = T.drops[0]; if (d) { Ac.act('ping', d.x + .5, d.z); if (T.G.pings.length !== 1 || T.G.pings[0].k !== 'item') vfail('a mark by loot: ' + JSON.stringify(T.G.pings)); }
  Ac.act('ping', me.pos.x + 3, me.pos.z + 40); step(Math.round(PING.life * 60) + 5); if (T.G.pings.length) vfail('marks did not fade');
  // fuel: driving uses it, empty means no power, a pump fills it
  const bot = Gm.addPlayer(); bot.inv = 1e9; const c = T.G.cars[1]; c.fuel = 0; bot.pos.x = c.x; bot.pos.z = c.z + 2; V.enterCar(bot, 1);
  const x0 = c.x, z0 = c.z; for (let i = 0; i < 120; i++) { Object.assign(bot.input, { mx: 0, mz: 1, mag: 1 }); step(1); }
  const went = Math.hypot(c.x - x0, c.z - z0); if (c.fuel > 0 || went > 3) vfail('an empty car went ' + went.toFixed(1) + ' m (fuel ' + c.fuel + ')');
  c.x = pumpSpots[0].x + 2.5; c.z = pumpSpots[0].z + 2.5; c.v = 0; const f0 = c.fuel; for (let i = 0; i < 60; i++) { Object.assign(bot.input, { mx: 0, mz: 0, mag: 0 }); step(1); }
  if (!(c.fuel > f0 + .05)) vfail('no fuel at the pump: ' + f0 + ' -> ' + c.fuel);
  c.fuel = 1; c.x = x0; c.z = z0; const x1 = c.x; for (let i = 0; i < 120; i++) { Object.assign(bot.input, { mx: 0, mz: 1, mag: 1 }); step(1); }
  if (!(c.fuel < 1)) vfail('driving did not use fuel');
  Object.assign(bot.input, { fire: true }); step(2); Object.assign(bot.input, { fire: false }); if (!(bot.hornT > 0)) vfail('no horn');
  V.leaveCar(bot);
  console.log('v0.53: marks danger / loot / go fade after ' + PING.life + ' s; empty car stays, pump refuels, driving burns fuel, horn');

finish('pings-fuel');
