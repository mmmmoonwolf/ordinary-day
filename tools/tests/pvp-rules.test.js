// v0.51: PvP kill cam and bounty; team, infection and hill rules
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.51 test: ' + m), Pv = await import('../../src/systems/pvp.js'), PC = (await import('../../src/config/pvp.js')).PVP;
  const Cb = await import('../../src/systems/combat.js'), Gm = await import('../../src/systems/game.js'), Pl = await import('../../src/entities/player.js'), Iv = await import('../../src/systems/inventory.js');
  const start = rule => { Pv.startPvp(rule); T.G.running = true; const q = Gm.addPlayer(); step(12); for (const a of T.agents) a.gone = true; step(2); return [T.player, q]; };
  // free for all: the killer is watched for a moment; the leader carries a bounty worth 2
  let [a, b] = start('ffa'); a.inv = 1e9; b.inv = 0; Cb.hurtPlayer(a, 0, b); a.inv = 0; b.inv = 1e9; Cb.hurtPlayer(a, 999, b);
  if (Pl.viewed() !== b) vfail('kill cam: the camera did not look at the killer'); step(Math.round(PC.killCam * 60) + 5);
  if (Pl.viewed() !== a) vfail('kill cam: still on the killer after ' + PC.killCam + ' s');
  step(Math.round(PC.respawn * 60) + 10); b.frags = PC.bounty.min; a.frags = 0; step(2);
  if (!b.bounty) vfail('no bounty on the leader'); a.inv = 1e9; b.inv = 0; const f0 = a.frags; Cb.hurtPlayer(b, 999, a);
  if (a.frags !== f0 + PC.bounty.worth) vfail('the bounty kill counted ' + (a.frags - f0));
  // teams: no hurting a team mate, the team's total ends the round
  [a, b] = start('team'); const c = Gm.addPlayer(); step(4);
  const mate = [b, c].find(q => q.team === a.team), foe = [b, c].find(q => q.team !== a.team);
  if (!mate || !foe) vfail('teams: ' + [a, b, c].map(q => q.team)); else {
    mate.inv = 0; const h0 = mate.hp; if (Cb.hurtPlayer(mate, 30, a) || mate.hp !== h0) vfail('a team mate was hurt');
    if (Cb.foesOf(a).includes(mate) || !Cb.foesOf(a).includes(foe)) vfail('foesOf with teams');
    a.frags = PC.team.kills - 1; foe.inv = 0; a.inv = 1e9; Cb.hurtPlayer(foe, 999, a); step(2);
    if (!T.G.over || !/ทีม/.test(els.oTitle.textContent)) vfail('team round end: ' + T.G.over + ' ' + els.oTitle.textContent); }
  // infection: one player turns, has claws, is ignored by zombies; a person they kill comes back as one; all zombies ends it
  [a, b] = start('infect'); step(2); const z = [a, b].find(q => q.zed), h = [a, b].find(q => !q.zed);
  if (!z || !h) vfail('infection: nobody turned'); else {
    if (Iv.curWeapon(z).id !== 'claw' || Pl.targets().includes(z)) vfail('a zombie player: ' + Iv.curWeapon(z).id + ' targeted ' + Pl.targets().includes(z));
    h.inv = 0; z.inv = 1e9; Cb.hurtPlayer(h, 999, z); step(Math.round(PC.respawn * 60) + 10);
    if (!h.alive || !h.zed) vfail('killed by a zombie player but not back as one: alive ' + h.alive + ' zed ' + h.zed);
    step(2); if (!T.G.over || els.oTitle.textContent !== 'ซอมบี้ชนะ') vfail('infection end: ' + T.G.over + ' ' + els.oTitle.textContent); }
  // hill: one player alone in the ring scores
  [a, b] = start('hill'); step(2);
  if (!T.G.hill) vfail('no hill'); else { a.pos.x = T.G.hill.x; a.pos.z = T.G.hill.z; b.pos.x = T.G.hill.x + 40; b.pos.z = T.G.hill.z; a.inv = b.inv = 1e9; const f1 = a.frags || 0; step(Math.round(PC.hill.every * 60 * 2) + 10);
    if ((a.frags || 0) < f1 + 2) vfail('hill points: ' + f1 + ' -> ' + a.frags); }
  console.log('v0.51: kill cam ' + PC.killCam + ' s, bounty worth ' + PC.bounty.worth + ', teams without friendly fire, infection turns the killed, all zombies end it, hill scores ' + (a.frags || 0));
  T.G.mode = 'coop'; els.bStart.fire('click'); step(2);

finish('pvp-rules');
