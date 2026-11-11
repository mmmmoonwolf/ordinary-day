// v0.49: cars that do not get stuck; PvP rounds, supply crates, ammo left at death, a heal for a kill, the spawn shield, cars hitting people
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.49 test: ' + m), Pv = await import('../../src/systems/pvp.js'), PC = (await import('../../src/config/pvp.js')).PVP;
  const Cb = await import('../../src/systems/combat.js'), Gm = await import('../../src/systems/game.js'), Pl = await import('../../src/entities/player.js'), V = await import('../../src/systems/vehicles.js');
  // the car at the gas station parked over a post: back into it, then drive off
  els.bAgain.fire('click'); T.G.running = true; step(2); const bot = Gm.addPlayer(); bot.inv = 1e9; const c = T.G.cars[0]; bot.pos.x = c.x + 2; bot.pos.z = c.z;
  if (!V.enterCar(bot, 0)) vfail('could not get in the car'); const x0 = c.x, z0 = c.z;
  const drive = (mx, mz, n) => { for (let i = 0; i < n; i++) { Object.assign(bot.input, { mx, mz, mag: 1 }); step(1); } };
  drive(-.707, -.707, 120); drive(0, 1, 120); const moved = Math.hypot(T.G.cars[0].x - x0, T.G.cars[0].z - z0);
  if (moved < 4) vfail('the gas station car only moved ' + moved.toFixed(2) + ' m');
  V.leaveCar(bot);
  // PvP
  Pv.startPvp(); T.G.running = true; const p2 = Gm.addPlayer(); step(12); const p1 = T.player;
  if (T.G.drops === 0) {}
  if (T.drops.some(d => d.item.id === 'resurrect')) vfail('a Resurrection Kit lies around in PvP');
  for (const a of T.agents) a.gone = true; step(2);
  // a kill: the killer heals, half the victim's ammo stays on the ground, the Kit in the bag is not used
  p1.hp = 50; p1.inv = 1e9; p2.inv = 0; p2.gear.bag.push({ id: 'resurrect', n: 1 }); const a0 = p2.gear.bag.find(e => e.id === 'a9').n, d0 = T.drops.length;
  Cb.hurtPlayer(p2, 999, p1);
  const a1 = (p2.gear.bag.find(e => e.id === 'a9') || { n: 0 }).n, left = T.drops.filter(d => d.item.id === 'a9').length;
  if (p2.alive || !p2.gear.bag.some(e => e.id === 'resurrect')) vfail('the Kit was used in PvP (alive ' + p2.alive + ')');
  if (p1.hp !== 50 + PC.killHeal) vfail('no heal for the kill: ' + p1.hp);
  if (a1 !== a0 - Math.floor(a0 * PC.dropAmmo) || T.drops.length <= d0) vfail('ammo at death: ' + a0 + ' -> ' + a1 + ', drops ' + d0 + ' -> ' + T.drops.length);
  // back with a shield that ends at the first shot
  step(Math.round(PC.respawn * 60) + 10);
  if (!p2.alive || !(p2.inv > 0) || !p2.shield) vfail('respawn shield: alive ' + p2.alive + ' inv ' + p2.inv + ' shield ' + p2.shield);
  p2.gear.active = 'secondary'; p2.gear.eq.secondary.mag = 5; p2.cool = 0; p2.reloadT = 0; Object.assign(p2.input, { fire: true, fireQ: .2 }); step(2); Object.assign(p2.input, { fire: false, fireQ: 0 });
  if (p2.shield || p2.inv > 0) vfail('the shield did not end at the first shot (inv ' + p2.inv + ')');
  // a car hitting a player counts for the driver
  { const car = T.G.cars[0]; p1.inv = 0; p1.pos.x = car.x + 2; p1.pos.z = car.z; V.enterCar(p1, 0); const hp0 = p2.hp, f0 = p1.frags || 0; p2.inv = 0;
    p2.pos.x = car.x + Math.sin(car.a) * 3.2; p2.pos.z = car.z + Math.cos(car.a) * 3.2; car.v = 12; for (let i = 0; i < 6; i++) step(1);
    if (!(p2.hp < hp0) && p2.alive) vfail('the car did not hit the player (hp ' + hp0 + ' -> ' + p2.hp + ')'); V.leaveCar(p1); }
  // a supply crate on time
  const dropsBefore = T.drops.length; T.G.min = Math.max(T.G.min, T.G.pvpDrop); step(2);
  if (!T.G.drop || T.drops.length < dropsBefore + 6) vfail('no supply crate: ' + JSON.stringify(T.G.drop) + ' drops ' + dropsBefore + ' -> ' + T.drops.length);
  // the round ends at PVP.round.kills, the end screen names the winner, the next round starts fresh
  p1.inv = 1e9; p1.frags = PC.round.kills - 1; p2.inv = 0; p2.alive = true; p2.hp = 100; Cb.hurtPlayer(p2, 999, p1); step(2);
  if (!T.G.over || els.oTitle.textContent !== 'คุณชนะ' || !els.sKillsBy.innerHTML.includes(String(PC.round.kills))) vfail('round end: over ' + T.G.over + ' title ' + els.oTitle.textContent);
  els.bAgain.fire('click'); await new Promise(r => setTimeout(r, 20)); step(12);
  if (T.G.over || !T.G.running || T.G.mode !== 'pvp' || (Pl.player.frags || 0) !== 0) vfail('next round: over ' + T.G.over + ' mode ' + T.G.mode + ' frags ' + Pl.player.frags);
  // time runs out: most kills wins
  T.G.pvpT = PC.round.minutes * 60; step(2); if (!T.G.over) vfail('the round did not end on time');
  els.bAgain.fire('click'); await new Promise(r => setTimeout(r, 20)); step(4);
  console.log('v0.49: the gas station car drove ' + moved.toFixed(1) + ' m off the post; PvP kill heal, ammo left at death, no Kit, shield ends at a shot, car hits, crate of ' + (T.drops.length >= 0 ? 'gear' : '') + ', round end at ' + PC.round.kills + ' kills and on time, next round');
  els.bAgain.textContent; T.G.mode = 'coop'; els.bAgain.fire('click');

finish('pvp-rounds');
