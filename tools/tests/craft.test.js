// v0.55: making things from scraps, traps put down, odd weapons (the extinguisher stuns)
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.55 test: ' + m), Ac = await import('../../src/systems/actions.js'), Cf = await import('../../src/systems/craft.js'), { TRAP } = await import('../../src/config/craft.js');
  const Cb = await import('../../src/systems/combat.js'), { DEF } = await import('../../src/config/items.js'), Sr = await import('../../src/systems/search.js');
  els.bAgain.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  const n = id => me.gear.bag.reduce((s, e) => s + (e.id === id ? e.n : 0), 0);
  me.gear.cap = 12; me.gear.bag.push({ id: 'cloth', n: 3 }, { id: 'nails', n: 5 }, { id: 'tape', n: 4 });
  Ac.act('craft', 'bandage'); if (n('bandage') !== 1 || n('cloth') !== 1) vfail('bandage: ' + n('bandage') + ' cloth ' + n('cloth'));
  Ac.act('craft', 'nailbomb'); if (n('nailbomb') !== 1 || n('nails') !== 2 || n('tape') !== 3) vfail('nail bomb');
  Ac.act('craft', 'bandage'); if (n('bandage') !== 1) vfail('made a bandage from one cloth');
  me.gear.eq.melee = { id: 'bat_c', mag: 0, dur: 3 }; Ac.act('craft', 'fix'); if (me.gear.eq.melee.dur !== DEF.bat_c.dur) vfail('tape did not fix the bat');
  Ac.act('craft', 'tripwire'); Ac.act('place', 'tripwire'); if (!T.G.ptraps.length || n('tripwire')) vfail('tripwire not put down');
  const t = T.G.ptraps[0], z = T.makeAgent(t.x + .3, t.z); T.becomeZombie(z, 'walker'); T.agents.push(z); step(2);
  if (T.G.ptraps.length) vfail('the tripwire did not go off');
  me.gear.bag.push({ id: 'beartrap', n: 1 }); me.pos.x += 3; Ac.act('place', 'beartrap'); const bt = T.G.ptraps[0], z2 = T.makeAgent(bt.x, bt.z + .3); T.becomeZombie(z2, 'armor'); T.agents.push(z2); const hp0 = z2.hp; step(2);
  if (!(z2.trapT > 0) || !(z2.hp < hp0)) vfail('the bear trap did not hold / hurt: trapT ' + z2.trapT + ' hp ' + hp0 + '->' + z2.hp);
  // the extinguisher stuns
  me.pos.x -= 3; for (const a of T.agents) a.gone = true; step(1);
  const z3 = T.makeAgent(me.pos.x, me.pos.z + 1); T.becomeZombie(z3, 'armor'); T.agents.push(z3); z3.face = Math.PI; me.face = 0; me.sneak = false; z3.seenP = me;
  Cb.meleeHit(me, DEF.extinguisher_c); if (!(z3.feed >= DEF.extinguisher_c.stun - .01)) vfail('no stun: ' + z3.feed);
  let mats = 0; for (let k = 0; k < 200; k++) mats += Sr.rollBox('tools').filter(it => DEF[it.id].kind === 'mat').length; if (!mats) vfail('no scraps in tool shelves');
  for (const a of T.agents) a.gone = true; step(2);
  console.log('v0.55: bandage, nail bomb, fix, tripwire goes off, bear trap holds, extinguisher stuns, ' + mats + ' scraps from 200 tool shelves');

finish('craft');
