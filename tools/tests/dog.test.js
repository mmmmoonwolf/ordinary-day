// v0.60: the dog
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.60 test: ' + m), { DOG } = await import('../../src/config/dog.js'), Gm = await import('../../src/systems/game.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  const d = T.G.dog; if (!d || d.state !== 'stray') vfail('no stray dog');
  // an open stretch of ground: a spot where 8 m in one direction is clear
  const Col = await import('../../src/world/collision.js'); let ox = 0, oz = 0, ux = 1, uz = 0, found = false;
  for (const s of (await import('../../src/world/city.js')).lootSpots) { if (found || s.zone !== 'city' || I.roomAt(s.x, s.z) >= 0) continue;
    for (const [vx, vz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let ok = true; for (let k = 0; k <= 8; k += .5) if (!Col.freeAt(s.x + vx * k, s.z + vz * k, .6)) ok = false; if (ok) { ox = s.x; oz = s.z; ux = vx; uz = vz; found = true; break; } } }
  me.pos.x = ox - ux * 30; me.pos.z = oz - uz * 30; d.pos.x = ox; d.pos.z = oz;
  const q = Gm.addPlayer(); q.inv = 1e9; q.pos.x = ox + ux * 1.5; q.pos.z = oz + uz * 1.5; step(2);
  if (d.owner !== q.id || d.state !== 'follow') vfail('not tamed: ' + d.owner + ' ' + d.state);
  q.pos.x = ox + ux * 6; q.pos.z = oz + uz * 6; step(60); const fd = Math.hypot(q.pos.x - d.pos.x, q.pos.z - d.pos.z); if (fd > DOG.follow + 1) vfail('did not follow: ' + fd.toFixed(1));
  const z = T.makeAgent(q.pos.x - ux * 3, q.pos.z - uz * 3); T.becomeZombie(z, 'armor'); T.agents.push(z); const hp0 = z.hp; z.feed = 99;
  for (let k = 0; k < 120 && z.hp >= hp0; k++) step(1); if (!(z.hp < hp0)) vfail('the dog did not bite');
  const dh = d.hp; z.feed = 0; d.pos.x = z.pos.x + .4; d.pos.z = z.pos.z; step(30); if (!(d.hp < dh)) vfail('the dog was not hurt next to a zombie');
  z.gone = true; step(2); q.pos.x += 60; step(2); if (Math.hypot(q.pos.x - d.pos.x, q.pos.z - d.pos.z) > 3) vfail('the dog did not catch up');
  d.hp = 1; const z2 = T.makeAgent(d.pos.x + .3, d.pos.z); T.becomeZombie(z2, 'zombie'); T.agents.push(z2); z2.feed = 99; step(30); if (d.state !== 'dead') vfail('the dog did not die');
  for (const a of T.agents) a.gone = true; for (const p of P.players.slice(1)) p.away = true; step(2);
  console.log('v0.60: a stray dog, tamed by walking up, follows, bites a zombie (' + hp0 + ' -> ' + Math.round(z.hp) + '), is hurt by them, catches up after 60 m, dies');

finish('dog');
