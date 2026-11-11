// v0.62: survivors and bandits
// One system, one file, its own process and a new game (tools/run-tests.js runs every *.test.js here).
import { els, errs, step, key, store, T, P, I, finish } from './setup.js';

  const vfail = m => errs.push('v0.62 test: ' + m), Nc = await import('../../src/systems/npc.js'), Gm = await import('../../src/systems/game.js'), Cb = await import('../../src/systems/combat.js'), Col = await import('../../src/world/collision.js');
  els.bAgain.fire('click'); T.G.running = true; T.G.min = 12 * 60; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
  T.G.outbreak = true; T.G.npcPlaced = false; step(2); const sv = T.agents.filter(a => a.npc === 'survivor'); if (!sv.length) vfail('no survivors');
  // an open stretch to test on
  let ox = 0, oz = 0, ux = 1, uz = 0, found = false;
  for (const s2 of (await import('../../src/world/city.js')).lootSpots) { if (found || s2.zone !== 'city' || I.roomAt(s2.x, s2.z) >= 0) continue;
    for (const [vx, vz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let ok = true; for (let k = -3; k <= 12; k += .5) if (!Col.freeAt(s2.x + vx * k, s2.z + vz * k, .6)) ok = false; if (ok) { ox = s2.x; oz = s2.z; ux = vx; uz = vz; found = true; break; } } }
  for (const a of sv.slice(1)) a.gone = true; const a = sv[0]; a.pos.x = ox; a.pos.z = oz; me.pos.x = ox - ux * 40; me.pos.z = oz - uz * 40; step(1);
  const z = T.makeAgent(ox + ux * 9, oz + uz * 9); T.becomeZombie(z, 'armor'); T.agents.push(z); z.feed = 99; const hp0 = z.hp;
  for (let k = 0; k < 1200 && z.hp >= hp0; k++) step(1); if (!(z.hp < hp0)) vfail('the survivor did not shoot the zombie');   // 55% a shot
  z.gone = true; step(1);
  const q = Gm.addPlayer(); q.inv = 1e9; q.pos.x = ox + uz * 1.5; q.pos.z = oz + ux * 1.5; step(2); if (a.lead !== q.id) vfail('the survivor did not join');
  // a zombie bites a survivor: it is hurt before it turns
  const z2 = T.makeAgent(a.pos.x + .5, a.pos.z); T.becomeZombie(z2, 'zombie'); T.agents.push(z2); const ah = a.hp; a.atk = 99;
  for (let k = 0; k < 120 && a.hp >= ah; k++) step(1); if (!(a.hp < ah) || a.state !== 'human' && a.hp > 0) vfail('bite: hp ' + ah + '->' + a.hp + ' ' + a.state);
  for (const b of T.agents) b.gone = true; step(2);
  // bandits shoot a player in sight; shot back, one falls and leaves its gun
  const d0 = T.drops.length, bs = Nc.placeBandits(ox + ux * 8, oz + uz * 8); if (!bs.length) vfail('no bandits');
  q.pos.x = ox; q.pos.z = oz; q.inv = 0; q.hp = 100; q.lastHit = 0;
  for (let k = 0; k < 1200 && q.hp >= 100; k++) { q.inv = 0; step(1); }   // 40% a shot, one a second or so
  if (!(q.hp < 100)) vfail('the bandits did not shoot');
  q.inv = 1e9; const b = bs[0], dd = T.drops.length; Nc.hurtNpc(b, 999, q, ux, uz); if (b.state !== 'dead' || T.drops.length < dd + 2) vfail('a bandit did not fall with its gun');
  if (!Cb.shootable(bs[1] || bs[0]) && (bs[1] && bs[1].state === 'human')) vfail('bandits not shootable');
  if (Cb.shootable(a)) vfail('survivors shootable');
  // a bandit or survivor who turns can be killed like any zombie (it used to shrug off guns, blows and blasts)
  { for (const c of T.agents) c.gone = true; step(2); const { DEF } = await import('../../src/config/items.js'), Bl = await import('../../src/systems/blast.js');
    const [t] = Nc.placeBandits(q.pos.x + ux * 3, q.pos.z + uz * 3); for (const c of T.agents) if (c !== t) c.gone = true;
    t.state = 'infected'; t.turnT = .01; step(4); t.rise = 0; t.feed = 99;
    if (t.state !== 'zombie' || t.npc) vfail('a turned bandit is still marked as one: ' + t.state + ' / ' + t.npc);
    q.gear.eq.secondary = { id: 'pistol_c', mag: 12 }; q.gear.active = 'secondary'; q.face = Math.atan2(t.pos.x - q.pos.x, t.pos.z - q.pos.z); q.bloom = 0;
    const h0 = t.hp; Cb.fireGun(q, q.gear.eq.secondary, DEF.pistol_c); if (!(t.hp < h0)) vfail('a pistol shot did nothing to a turned bandit: ' + h0 + ' -> ' + t.hp);
    const [t2] = Nc.placeBandits(q.pos.x + ux * 1.2, q.pos.z + uz * 1.2); for (const c of T.agents) if (c !== t2) c.gone = true; T.becomeZombie(t2, 'armor'); t2.feed = 99; t2.pos.x = q.pos.x + ux * 1.2; t2.pos.z = q.pos.z + uz * 1.2;
    const h1 = t2.hp; Cb.meleeHit(q, DEF.bat_c); if (!(t2.hp < h1)) vfail('a blow did nothing to a turned bandit');
    const h2 = t2.hp; Bl.blast(t2.pos.x, t2.pos.z, (await import('../../src/config/blast.js')).BLAST.grenade, q); step(1); if (!(t2.hp < h2)) vfail('a blast did nothing to a turned bandit'); }
  for (const c of T.agents) c.gone = true; for (const p of P.players.slice(1)) p.away = true; step(2);
  console.log('v0.62: ' + sv.length + ' survivors, one shoots a zombie (' + hp0 + ' -> ' + Math.round(z.hp) + '), joins a player, is hurt by a bite before turning; ' + bs.length + ' bandits shoot a player (hp ' + Math.round(q.hp) + '), one falls and leaves its gun');

finish('npc');
