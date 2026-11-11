// v0.56: the power failing day by day, the emergency radio, the storm (lightning, fire, covered sounds)
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.56 test: ' + m), { lamps } = await import('../../src/world/props.js'), Au = await import('../../src/systems/audio.js'), Bl = await import('../../src/systems/blast.js'), Ai = await import('../../src/entities/ai.js');
  els.bAgain.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  const dark = () => lamps.filter(l => l.head.emissiveIntensity === 0).length;
  T.G.min = 22 * 60; step(3); const d1 = dark(); T.G.min = 2 * 1440 + 22 * 60; step(3); const d3 = dark();
  if (!(d3 > d1 + lamps.length * .3)) vfail('lamps dark day 1 ' + d1 + ', day 3 ' + d3 + ' of ' + lamps.length);
  // the radio
  const orig = Au.sfx.broadcast; let heard = null; Au.sfx.broadcast = d => { heard = d; orig(d); };
  T.G.min = 1440 + 12 * 60 + 20; T.G.castAt = null; step(2); const at = T.G.castAt; T.G.min = at + .2; step(2);
  if (heard !== 1 || !(T.G.castAt > at)) vfail('no broadcast on day 2: ' + heard + ' next ' + T.G.castAt);
  Au.sfx.broadcast = orig;
  // the storm: zombies hear less, lightning strikes near the player and starts a fire
  for (const a of T.agents) a.gone = true; step(1);
  me.pos.x = 0; me.pos.z = -60; me.room = -1; while (I.roomAt(me.pos.x, me.pos.z) >= 0) me.pos.x += 3;
  T.G.plan = []; T.G.min = 1440 + 13 * 60; T.G.phase = "day"; const z = T.makeAgent(me.pos.x + 20, me.pos.z); T.becomeZombie(z, 'zombie'); T.agents.push(z);
  T.G.storm = 0; z.heard = null; Ai.makeNoise(me.pos.x, me.pos.z, 25); const calm = !!z.heard;
  T.G.storm = T.G.min + 60; T.G.boltAt = T.G.min; z.heard = null; Ai.makeNoise(me.pos.x, me.pos.z, 25); const stormy = !!z.heard;
  if (!calm || stormy) vfail('storm hearing: calm ' + calm + ' storm ' + stormy);
  z.gone = true; const f0 = Bl.fires.length; for (let k = 0; k < 6 && Bl.fires.length === f0; k++) { T.G.boltAt = T.G.min; step(2); }
  if (Bl.fires.length === f0) vfail('no lightning strike');
  if (T.G.rainTarget !== 1) vfail('no rain in the storm');
  T.G.min = T.G.storm + 1; step(2); if (T.G.storm) vfail('the storm did not end');
  for (const a of T.agents) a.gone = true; step(2);
  console.log('v0.56: dark lamps day 1 ' + d1 + ' / day 3 ' + d3 + ' of ' + lamps.length + ', day 2 broadcast, storm muffles a noise at 20 m, lightning started a fire');

finish('town-decay');
