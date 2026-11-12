// v0.66 the second town, headless: the page as it loads after "เดินทางต่อ" (ACT 2 in sessionStorage, the first town's
// bag carried over). Checks the city is a different one, the morning stays calm until ACT2.outbreak, the bag came along,
// and a day and a night run without errors. Usage: node tools/act2-test.js (npm test runs it after the smoke test)
import { els, errs, step } from './headless.js';
const ss = new Map([['ordinary-day.act', '2'], ['ordinary-day.carry', JSON.stringify({ gear: { bag: [{ id: 'a9', n: 33 }, { id: 'bandage', n: 2 }], eq: { secondary: { id: 'pistol_c', mag: 7 } }, cap: 12, active: 'secondary' } })]]);
globalThis.sessionStorage = { getItem: k => ss.has(k) ? ss.get(k) : null, setItem: (k, v) => ss.set(k, String(v)), removeItem: k => ss.delete(k) };
await import('../src/main.js');
const fail = m => errs.push('act 2: ' + m);
const { ACT, ACT2 } = await import('../src/config/act.js'), { buildings } = await import('../src/world/city.js'), { G } = await import('../src/core/state.js');
const P = await import('../src/entities/player.js'), { EVENTS } = await import('../src/systems/phases.js');
if (ACT !== 2) fail('not in the second town');
// the first town's buildings, by the seed 2626 (from a fresh copy of the generator's numbers: count and the first sizes)
const sig = buildings.slice(0, 6).map(b => b.w.toFixed(1) + 'x' + b.d.toFixed(1) + 'x' + b.h.toFixed(1)).join(' ');
const FIRST = '8.8x7.7x12.8 8.7x8.1x9.6 8.1x8.7x12.8';   // the first town's first three buildings (seed 2626)
if (sig.startsWith(FIRST)) fail('same city as the first: ' + sig);
if (!EVENTS.some(e => Math.abs(e.t - ACT2.outbreak) < 1)) fail('no outbreak at ' + ACT2.outbreak);
step(2); const me = P.player; if (!G.running) fail('did not go straight into the game');
if (!me.gear.bag.some(e => e.id === 'a9' && e.n >= 33) || !me.gear.eq.secondary || me.gear.eq.secondary.mag !== 7) fail('the bag did not come along: ' + JSON.stringify(me.gear));
if (ss.has('ordinary-day.carry')) fail('the carried bag was not used up');
me.inv = 1e9; G.min = 10 * 60; step(30); if (G.outbreak) fail('outbreak before ' + ACT2.outbreak);
G.min = ACT2.outbreak + 1; step(30); if (!G.outbreak) fail('no outbreak at ' + ACT2.outbreak);
G.min = 20 * 60; step(120); G.min = 1440 + 7 * 60; step(120);
// B8: a PvP game in this town starts the minute before this town's outbreak, with its first horde and crate after it
// (they were clock times of the first town: three in-game hours of an empty, calm town before anything happened)
{ const { startPvp } = await import('../src/systems/pvp.js'), { PVP } = await import('../src/config/pvp.js'), { nextCast } = await import('../src/systems/events.js');
  startPvp('ffa'); G.running = true;
  if (G.min !== ACT2.outbreak - 1) fail('PvP starts at minute ' + G.min + ', the outbreak here is at ' + ACT2.outbreak);
  if (G.pvpHorde !== ACT2.outbreak + PVP.horde.first || G.pvpDrop !== ACT2.outbreak + PVP.drop.first) fail('PvP horde ' + G.pvpHorde + ' crate ' + G.pvpDrop + ' are not timed from the outbreak');
  for (const p of P.players) p.inv = 1e9; step(600);                               // ten seconds
  if (!G.outbreak) fail('ten seconds into a PvP game and no outbreak (minute ' + G.min.toFixed(0) + ')');
  if (nextCast(0) < ACT2.outbreak) fail('the emergency radio speaks at ' + nextCast(0) + ', before the outbreak'); }
console.log('act 2: city ' + buildings.length + ' buildings (' + sig.split(' ').slice(0, 3).join(' ') + ' …), calm until ' + Math.floor(ACT2.outbreak / 60) + ':' + String(ACT2.outbreak % 60).padStart(2, '0') + ', bag carried, a night run');
console.log(errs.length ? `FAILED: ${errs.length} runtime errors\n` + errs.slice(0, 3).join('\n---\n') : 'PASSED: the second town');
process.exit(errs.length ? 1 : 0);
