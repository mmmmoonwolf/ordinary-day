// v0.50: a quiet kill from behind, the flashlight seen from further at night, listening while standing still
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.50 test: ' + m), Cb = await import('../../src/systems/combat.js'), { DEF } = await import('../../src/config/items.js'), St = await import('../../src/config/stealth.js');
  const Ac = await import('../../src/systems/actions.js'), L = await import('../../src/ui/listen.js');
  const zNear = (dx, dz, face, kind = 'zombie') => { for (const a of T.agents) a.gone = true; step(2); const z = T.makeAgent(T.player.pos.x + dx, T.player.pos.z + dz); T.becomeZombie(z, kind); T.agents.push(z); z.face = face; z.seenP = null; return z; };
  els.bAgain.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; me.gear.active = 'melee'; me.gear.eq.melee = null;
  // behind: the zombie stands 1 m in front of the player, facing away from them
  let z = zNear(0, 1, 0); me.face = 0; me.sneak = true; Cb.meleeHit(me, DEF.fist);
  if (z.state !== 'dead') vfail('a sneaking punch from behind did not kill (hp ' + z.hp + ')');
  z = zNear(0, 1, Math.PI); me.face = 0; me.sneak = true; Cb.meleeHit(me, DEF.fist);
  if (z.state === 'dead') vfail('a punch from the front killed at once');
  z = zNear(0, 1, 0, 'boomer'); me.sneak = true; Cb.meleeHit(me, DEF.fist); if (z.state === 'dead') vfail('a Boomer died from behind at once');
  // flashlight: 17 m off at night, seen with it on, not with it off
  const seen = (on) => { me.light = on; T.G.phase = 'night'; T.G.min = 22 * 60; const z2 = zNear(17, 0, -Math.PI / 2); me.sneak = false; step(3); return !!z2.seenP; };
  const withLight = seen(true), dark = seen(false); me.light = true;
  if (!withLight || dark) vfail('flashlight: seen with it on ' + withLight + ', off ' + dark);
  Ac.act('light'); if (me.light !== false) vfail('T did not switch the flashlight off'); Ac.act('light');
  // listening: still for a moment, a moving zombie behind a wall glows
  z = zNear(8, 0, 0); z.moving = 1; Object.assign(me.input, { mx: 0, mz: 0, mag: 0, fire: false }); for (let i = 0; i < 100; i++) L.updateListen(1 / 60);
  if (!(parseFloat(els.listen.style.opacity) > .5)) vfail('listening did not start: ' + els.listen.style.opacity);
  console.log('v0.50: backstab kills a zombie quietly (not from the front, not a Boomer), flashlight seen from ' + (15 * St.LIGHT.on) + ' m / ' + (15 * St.LIGHT.off) + ' m at night, listening after ' + St.LISTEN.after + ' s');

finish('stealth');
