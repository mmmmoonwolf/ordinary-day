// v0.54: wounds bleed until medicine, a limp when badly hurt, soaked in the rain then ill (sneezes), panic among zombies
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.54 test: ' + m), H = await import('../../src/config/health.js'), Bd = await import('../../src/systems/body.js'), Iv = await import('../../src/systems/inventory.js');
  const Cb = await import('../../src/systems/combat.js'), { DEF } = await import('../../src/config/items.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  me.bleedW = H.WOUND.lasts; me.hp = 80; step(120); if (!(me.hp < 80 - H.WOUND.hp)) vfail('a wound did not bleed: ' + me.hp);
  me.gear.bag.push({ id: 'bandage', n: 1 }); Iv.useHeal(me); if (me.bleedW > 0) vfail('a Bandage did not close the wound');
  const Gm = await import('../../src/systems/game.js'), bot = Gm.addPlayer(); bot.inv = 1e9; const walk = (hp) => { bot.hp = hp; bot.bleedW = 0; const x0 = bot.pos.x, z0 = bot.pos.z; for (let i = 0; i < 60; i++) { Object.assign(bot.input, { mx: 1, mz: 0, mag: 1, run: true }); step(1); } return Math.hypot(bot.pos.x - x0, bot.pos.z - z0); };
  const slow = walk(20), fast = walk(100); Object.assign(bot.input, { mx: 0, mz: 0, mag: 0, run: false });
  if (!(slow < fast * .9)) vfail('no limp: ' + slow.toFixed(2) + ' vs ' + fast.toFixed(2));
  // soaked: wet climbs in heavy rain outdoors, then illness and a sneeze
  me.room = -1; T.G.rain = 1; T.G.rainTarget = 1; me.wet = 1; me.sick = 0; for (let i = 0; i < 4000 && !(me.sick > 0); i++) Bd.updateBody(me, .1);   // a 1-in-25 chance a second: 60 s missed it 1 run in 12
  if (!(me.sick > 0)) vfail('never fell ill soaked'); me.sneezeT = 0; Bd.updateBody(me, .01); if (!(me.sneezeT > 0)) vfail('no sneeze');
  me.gear.bag.push({ id: 'painkiller', n: 1 }); me.hp = 50; Iv.useHeal(me); if (me.sick > 0) vfail('a Painkiller did not end the illness');
  T.G.rain = 0; T.G.rainTarget = 0;
  // panic: zombies all round; shots stray more
  for (let k = 0; k < 6; k++) { const z = T.makeAgent(me.pos.x + Math.cos(k) * 4, me.pos.z + Math.sin(k) * 4); T.becomeZombie(z, 'walker'); T.agents.push(z); }
  me.panic = 0; for (let i = 0; i < 30; i++) Bd.updateBody(me, .1); if (!(me.panic > .5)) vfail('no panic among zombies: ' + me.panic);
  if (!(Cb.spreadOf(me, DEF.pistol_c) > DEF.pistol_c.spread * 1.3)) vfail('panic did not widen the spread');
  for (const a of T.agents) a.gone = true; step(2);
  console.log('v0.54: wound bleeds and a Bandage closes it, limp at ' + Math.round(H.WOUND.limpAt * 100) + '% (' + (slow / fast).toFixed(2) + '×), soaked -> ill -> sneeze, Painkiller cures, panic ' + me.panic.toFixed(2));

finish('body');
