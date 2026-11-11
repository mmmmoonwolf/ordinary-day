// v0.52: the director sends a wave when it is too quiet, holds back when the players are hurt; blood night; mega horde; car alarms
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.52 test: ' + m), Dc = (await import('../../src/config/director.js')), Dr = await import('../../src/systems/director.js');
  const Cb = await import('../../src/systems/combat.js'), { DEF } = await import('../../src/config/items.js'), { breakables } = await import('../../src/world/props.js'), { rayWall } = await import('../../src/world/collision.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; T.G.outbreak = true; step(2); const me = T.player; me.inv = 1e9;
  for (const a of T.agents) a.gone = true; step(2);
  const zs = () => T.agents.filter(a => a.state === 'zombie' && !a.gone).length, z0 = zs();
  T.G.calm = Dc.DIRECTOR.calm; Dr.updateDirector(Dc.DIRECTOR.every + .01);
  if (zs() < z0 + Dc.DIRECTOR.wave[0]) vfail('no wave after a quiet spell: ' + z0 + ' -> ' + zs());
  if (!T.agents.some(a => a.state === 'zombie' && a.heard)) vfail('the wave does not know where the player is');
  // hurt: a breather at night
  T.G.phase = 'night'; T.G.min = 22 * 60; T.G.nightSpawnNext = T.G.min; me.hp = 20; Dr.updateDirector(Dc.DIRECTOR.every + .01);
  if (!(T.G.nightSpawnNext >= T.G.min + Dc.DIRECTOR.breathe)) vfail('no breather when hurt: next spawn ' + T.G.nightSpawnNext + ' at ' + T.G.min); me.hp = 100;
  // the blood night: the third night
  T.G.min = 2 * 1440 + 22 * 60; T.G.phase = 'night'; if (!Dr.isBlood()) vfail('night 3 is not a blood night');
  T.G.min = 1 * 1440 + 22 * 60; if (Dr.isBlood()) vfail('night 2 is a blood night');
  if (!T.G.plan.some(e => e.kind === 'mega')) vfail('no mega horde in the plan');
  // a shot into a parked car sets its alarm off
  T.G.alarm = null; const car = breakables.find(b => b.car && !b.broken && !b.car.burned);
  if (car) { let ok = false; for (let k = 0; k < 16 && !ok; k++) { const a = k / 16 * Math.PI * 2; me.pos.x = car.x - Math.sin(a) * 6; me.pos.z = car.z - Math.cos(a) * 6; if (rayWall(me.pos.x, me.pos.z, Math.sin(a), Math.cos(a), 4) >= 3.9) { me.face = a; ok = true; } }
    for (const a of T.agents) if (a.state === 'zombie') a.state = 'dead';
    const w = { id: 'pistol_c', mag: 5 }; Cb.fireGun(me, w, DEF.pistol_c); if (!T.G.alarm) vfail('shooting a parked car did not set off its alarm'); }
  console.log('v0.52: director wave of ' + (zs() - z0) + ', breather when hurt, blood night on night 3, mega horde planned, car alarm from a shot');
  T.G.alarm = null;

finish('director');
