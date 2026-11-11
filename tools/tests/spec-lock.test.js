// The numbers the team confirmed in docs/design-draft-01.md and the Decision Log (Q01-Q12) must not drift: a change
// to any of them fails here, on purpose. Change the draft first, then this file, then the game.
import { els, errs, step, T, P, finish } from './setup.js';

const fail = m => errs.push('spec lock: ' + m);
const { DEF } = await import('../../src/config/items.js'), Z = await import('../../src/config/zombies.js'), L = await import('../../src/config/loot.js');
const Tm = await import('../../src/config/time.js'), Ai = await import('../../src/entities/ai.js'), Cb = await import('../../src/systems/combat.js');
const same = (a, b) => Math.abs(a - b) < 1e-9;

// 2.2-2.4 weapons: [Damage /10, Fire Rate /10 or null for melee, slot]; Q07: damage = score x 5, seconds a shot = 1.6 / score
const WEAPONS = {
  pistol_c: [3, 5, 'secondary'], shotgun_c: [6, 2, 'primary'], smg_c: [2, 7, 'primary'], bat_c: [4, null, 'melee'],
  pistol_p: [4, 7, 'secondary'], shotgun_p: [7, 4, 'primary'], smg_p: [4, 7, 'primary'], baton_p: [4, null, 'melee'], rifle_p: [6, 5, 'primary'],
  pistol_m: [5, 8, 'secondary'], shotgun_m: [7, 6, 'primary'], smg_m: [5, 9, 'primary'], axe_m: [8, null, 'melee'], rifle_m: [6, 7, 'primary'], sniper_m: [10, 2, 'primary'], lmg_m: [7, 9, 'primary'],
};
for (const id in WEAPONS) {
  const [dmg, rate, slot] = WEAPONS[id], d = DEF[id];
  if (!d) { fail(id + ' is missing'); continue; }
  if (d.dmgR !== dmg || d.dmg !== dmg * 5) fail(id + ' damage ' + d.dmgR + ' (' + d.dmg + '), confirmed ' + dmg + ' (' + dmg * 5 + ')');
  if (rate !== null && (d.rateR !== rate || !same(d.rate, 1.6 / rate))) fail(id + ' fire rate ' + d.rateR + ' (' + d.rate + ' s), confirmed ' + rate);
  if (d.slot !== slot) fail(id + ' slot ' + d.slot + ', confirmed ' + slot);
  if (d.grade !== { c: 'civ', p: 'pol', m: 'mil' }[id.slice(-1)]) fail(id + ' grade ' + d.grade);
}
// D04 ammunition
for (const [id, ammo] of [['pistol_c', 'a9'], ['smg_m', 'a9'], ['shotgun_p', 'a12'], ['rifle_p', 'a556'], ['lmg_m', 'a556'], ['sniper_m', 'a762']]) if (DEF[id].ammo !== ammo) fail(id + ' takes ' + DEF[id].ammo + ', decided ' + ammo);

// 4.2 zombie classes: HP
const HP = { walker: 30, zombie: 30, sprinter: 30, boomer: 120, armor: 150, tyrant: 300 };
for (const k in HP) if (!Z.ZC[k] || Z.ZC[k].hp !== HP[k]) fail(k + ' HP ' + (Z.ZC[k] && Z.ZC[k].hp) + ', confirmed ' + HP[k]);
// Q04-Q05 elites
if (Z.ELITE.armor.chance !== .6 || Z.ELITE.armor.max !== 6 || Z.ELITE.armor.every !== 60) fail('Armor Walker ' + JSON.stringify(Z.ELITE.armor) + ', confirmed 60% a night, at most 6, one every 60 minutes');
if (Z.ELITE.tyrant.chance !== .4) fail('Tyrant chance ' + Z.ELITE.tyrant.chance + ', confirmed 40% a night');

// 3.1 medicine: share of max HP (Q08), and the weights of the tables (Q03)
const HEAL = { bandage: .25, antibiotic: .35, painkiller: .5, firstaid: .8 };
for (const k in HEAL) if (!DEF[k] || !same(DEF[k].heal, HEAL[k])) fail(k + ' heals ' + (DEF[k] && DEF[k].heal) + ', confirmed ' + HEAL[k]);
if (!DEF.resurrect || DEF.resurrect.kind !== 'revive') fail('no Resurrection Kit');
// with player infection on (the creator switched it off in v0.18, and Antibiotic with it) the tables are the draft's
{ const was = Z.INFECTION.on; Z.INFECTION.on = true; L.setMedTables();
  const day = { bandage: 50, antibiotic: 30, resurrect: 1 }, night = { bandage: 50, antibiotic: 30, painkiller: 15, firstaid: 5, resurrect: 1 };
  if (JSON.stringify(L.MED_W.day) !== JSON.stringify(day)) fail('day medicine weights ' + JSON.stringify(L.MED_W.day));
  if (JSON.stringify(L.MED_W.night) !== JSON.stringify(night)) fail('night medicine weights ' + JSON.stringify(L.MED_W.night));
  Z.INFECTION.on = was; L.setMedTables(); }
// 2.2-2.4, Q01-Q02 grades by phase: Civilian 70 by day, Police 40 and Military 10 by night
if (JSON.stringify(L.GRADE_W.day) !== '{"civ":70}' || JSON.stringify(L.GRADE_W.night) !== '{"pol":40,"mil":10}') fail('grade weights ' + JSON.stringify(L.GRADE_W));

// Q11 the phases
if (Tm.NIGHT_START !== 18 * 60 + 30 || Tm.DAY_START !== 6 * 60 || Tm.DUSK_WARN !== 16 * 60) fail('phase times ' + Tm.NIGHT_START + ' / ' + Tm.DAY_START + ' / ' + Tm.DUSK_WARN);

// in the game: guaranteed drops (Q06 a weapon with a full magazine and ammunition of that grade), Q12 the day Walker
els.bStart.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
for (const [kind, grade] of [['armor', 'pol'], ['tyrant', 'mil']]) {
  const z = T.makeAgent(me.pos.x + 4, me.pos.z); T.becomeZombie(z, kind); T.agents.push(z); const d0 = T.drops.length;
  Ai.hurtZombie(z, 9999, 0, 1, 0, false, true, me); step(2);
  const got = T.drops.slice(d0).map(d => d.item), w = got.find(it => DEF[it.id].kind === 'weapon'), a = got.find(it => DEF[it.id].kind === 'ammo');
  if (got.length !== 2 || !w || !a || DEF[w.id].grade !== grade) fail(kind + ' dropped ' + got.map(it => it.id).join(', ') + ', confirmed one ' + grade + ' weapon and one ammunition');
  else if (DEF[w.id].gun && (w.mag !== DEF[w.id].mag || a.id !== DEF[w.id].ammo)) fail(kind + ' gun came with ' + w.mag + ' rounds and ' + a.id);
  z.gone = true; for (const d of T.drops.slice(d0)) d.item && (d.gone = true);
}
{ T.G.outbreak = true; T.G.min = 12 * 60; T.G.phase = 'day'; for (const a of T.agents) a.gone = true; step(2);
  const bot = (await import('../../src/systems/game.js')).addPlayer(); bot.inv = 0; bot.hp = 100; bot.lastHit = 1e12;
  const far = T.makeAgent(bot.pos.x + 5, bot.pos.z); T.becomeZombie(far, 'walker'); T.agents.push(far); let chased = false;
  for (let i = 0; i < 240; i++) { step(1); if (far.seenP) chased = true; }   // it may wander nearer; it must never take the player as its target
  if (chased) fail('a Walker 5 m away went for the player by day');
  far.gone = true; const near = T.makeAgent(bot.pos.x + .7, bot.pos.z); T.becomeZombie(near, 'walker'); T.agents.push(near);
  for (let i = 0; i < 400 && bot.hp >= 100; i++) step(1);   // its first blow (a wound may bleed after it, so only this one is measured)
  if (!same(100 - bot.hp, 6)) fail('a Walker at arm\'s length hit for ' + (100 - bot.hp) + ', confirmed 6');
}
console.log('spec lock: 16 weapons, 6 classes, elites, medicine, grades, phases, guaranteed drops, the day Walker');
finish('spec-lock');
