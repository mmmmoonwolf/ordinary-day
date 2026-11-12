// v0.58: jobs (kit, faster reload, slower wear), a fallen friend's pack, loot by district, outfits to earn
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.58 test: ' + m), J = await import('../../src/config/jobs.js'), Gm = await import('../../src/systems/game.js'), Cb = await import('../../src/systems/combat.js');
  const Dr = await import('../../src/systems/drops.js'), { DEF } = await import('../../src/config/items.js'), Pf = await import('../../src/core/profile.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  const n = (p, id) => p.gear.bag.reduce((s, e) => s + (e.id === id ? e.n : 0), 0);
  const sol = Gm.addPlayer(); sol.inv = 1e9; sol.job = 'soldier'; Gm.giveKit(sol);
  if (!sol.gear.eq.secondary || sol.gear.eq.secondary.id !== 'pistol_c' || n(sol, 'a9') < 18) vfail('soldier kit');
  sol.gear.active = 'secondary'; sol.gear.eq.secondary.mag = 0; Cb.startReload(sol); const rs = sol.reloadT;
  const civ = Gm.addPlayer(); civ.inv = 1e9; civ.gear.eq.secondary = { id: 'pistol_c', mag: 0 }; civ.gear.active = 'secondary'; civ.gear.bag.push({ id: 'a9', n: 20 }); Cb.startReload(civ);
  if (!(rs < civ.reloadT)) vfail('soldier reload ' + rs + ' vs ' + civ.reloadT);
  const mech = Gm.addPlayer(); mech.inv = 1e9; mech.job = 'mechanic'; Gm.giveKit(mech); if (n(mech, 'tape') < 2) vfail('mechanic kit');
  mech.gear.eq.melee = { id: 'bat_c', mag: 0, dur: 10 }; mech.gear.active = 'melee';
  const z = T.makeAgent(mech.pos.x, mech.pos.z + 1); T.becomeZombie(z, 'armor'); T.agents.push(z); mech.face = 0; z.face = 0;
  Cb.meleeHit(mech, DEF.bat_c); if (mech.gear.eq.melee.dur !== 9.5) vfail('mechanic wear: ' + mech.gear.eq.melee.dur);
  z.gone = true;
  // a fallen friend's pack
  const med = Gm.addPlayer(); med.job = 'medic'; Gm.giveKit(med); med.gear.bag.push({ id: 'a12', n: 6 }); med.inv = 0; const d0 = T.drops.length;
  Cb.die(med); if (n(med, 'bandage') || n(med, 'a12') || T.drops.length < d0 + 3) vfail('no pack: ' + (T.drops.length - d0));
  // loot by district
  let city = 0, sub = 0; for (let k = 0; k < 3000; k++) { if (DEF[Dr.rollLoot('day', 'city').id].kind === 'heal') city++; if (DEF[Dr.rollLoot('day', 'city', null, 'suburb').id].kind === 'heal') sub++; }
  if (!(sub > city * 1.2)) vfail('suburb medicine ' + sub + ' vs town ' + city);
  // outfits to earn
  if (!Pf.lockOf('m_swat', { nights: 0, kills: 0, wins: 0 }) || Pf.lockOf('m_swat', { nights: 3, kills: 0, wins: 1 }) || Pf.lockOf('m_casual')) vfail('outfit locks');
  for (const q of P.players.slice(1)) q.away = true;
  console.log('v0.58: soldier kit and reload ' + rs.toFixed(2) + ' s vs ' + civ.reloadT.toFixed(2) + ' s, mechanic wear 0.5, pack of ' + (T.drops.length - d0) + ', medicine in the suburb ' + sub + ' vs town ' + city + ' of 3000, SWAT locked until a win');

finish('jobs');
