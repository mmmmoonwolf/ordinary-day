// What the loot tables really give, over 10,000 rolls each (L2).
// A table edit that looks harmless can break a confirmed rule (Police and Military gear is a night thing; the medicine
// weights; no Antibiotic while infection is off). This rolls each source many times and checks the rule and the shares.
// The shares are checked against the tables in config/loot.js, so retuning a PLACEHOLDER weight does not fail here;
// breaking the roll does. The two known exceptions to "Police / Military only at night" are listed and counted, so
// they stay a decision and cannot grow unnoticed.
import { els, errs, step, T, finish } from './setup.js';

const fail = m => errs.push('loot-stats: ' + m);
const Dr = await import('../../src/systems/drops.js'), Se = await import('../../src/systems/search.js'), L = await import('../../src/config/loot.js'), { DEF, gradeOf } = await import('../../src/config/items.js'), { BOX } = await import('../../src/config/search.js'), { INFECTION } = await import('../../src/config/zombies.js');
els.bStart.fire('click'); T.G.running = true; step(2);
const me = T.player; me.gear.cap = DEF.backpack.slots; Dr.fillDay(0);      // everyone has a backpack: the tables as written, no "find a bag" boost
const N = 10000;
const MEDS = new Set(['antibiotic', ...Object.keys(L.MED_W.day), ...Object.keys(L.MED_W.night)]);
const cat = it => { const d = DEF[it.id]; return it.id === 'backpack' ? 'bag' : MEDS.has(it.id) ? 'med' : d.kind === 'weapon' ? (d.gun ? 'gun' : 'melee') : d.kind; };
// ammo has no grade of its own; the calibres only the Police and Military pools hold stand for theirs
const HIGH_AMMO = new Set([...L.POOLS.pol.ammo, ...L.POOLS.mil.ammo].filter(id => !L.POOLS.civ.ammo.includes(id)));
function tally(roll) { const t = { n: 0, cat: {}, grade: {}, id: {}, highAmmo: 0 }; for (let i = 0; i < N; i++) for (const it of [].concat(roll())) { t.n++; const c = cat(it), d = DEF[it.id]; t.cat[c] = (t.cat[c] || 0) + 1; t.id[it.id] = (t.id[it.id] || 0) + 1; if (d.kind === 'weapon') { const g = gradeOf(it.id); t.grade[g] = (t.grade[g] || 0) + 1; } else if (d.kind === 'ammo' && HIGH_AMMO.has(it.id)) t.highAmmo++; } return t; }
// a share that should be `want` of `of` rolls: within four standard deviations (a seeded run is far inside that)
const near = (what, got, of, want) => { const sd = Math.sqrt(of * want * (1 - want)) || 1; if (Math.abs(got - of * want) > 4 * sd + 1) fail(what + ': ' + got + ' of ' + of + ' (' + (got / of * 100).toFixed(1) + '%), the table says ' + (want * 100).toFixed(1) + '%'); };
const share = (w, k) => (w[k] || 0) / Object.values(w).reduce((a, b) => a + b, 0);
const high = t => (t.grade.pol || 0) + (t.grade.mil || 0) + t.highAmmo;
const report = [];

// ---- the street and the two spots in each building, by day and by night
for (const zone of ['city', 'indoor', 'lot']) for (const phase of ['day', 'night']) {
  const t = tally(() => Dr.rollLoot(phase, zone, null, null)), W = (zone === 'indoor' ? L.INDOOR_W : L.CAT_W)[phase], name = zone + ' by ' + phase;
  // the kinds, as the category table says ('weapon' is a gun or a blade of the grade's pool, so both count toward it)
  near(name + ' medicine', t.cat.med || 0, t.n, share(W, 'med')); near(name + ' ammo', t.cat.ammo || 0, t.n, share(W, 'ammo'));
  near(name + ' weapons', (t.cat.gun || 0) + (t.cat.melee || 0), t.n, share(W, 'weapon') + share(W, 'melee')); near(name + ' backpacks', t.cat.bag || 0, t.n, share(W, 'bag'));
  // CONFIRMED: by day only Civilian weapons and ammo; at night only Police and Military, in the table's proportion
  if (phase === 'day' && high(t)) fail(name + ': ' + high(t) + ' Police / Military weapons or ammo by day');
  if (phase === 'night') { const G = zone === 'lot' ? L.GRADE_W.nightLot : L.GRADE_W.night, all = (t.grade.pol || 0) + (t.grade.mil || 0); if (t.grade.civ) fail(name + ': ' + t.grade.civ + ' Civilian weapons from the night table'); near(name + ' Military share of weapons', t.grade.mil || 0, all, share(G, 'mil')); }
  // CONFIRMED: the medicine weights, and no Antibiotic while infection is off
  const M = L.MED_W[phase], meds = t.cat.med || 0; for (const id of Object.keys(M)) near(name + ' ' + id, t.id[id] || 0, meds, share(M, id));
  if (!INFECTION.on && t.id.antibiotic) fail(name + ': ' + t.id.antibiotic + ' Antibiotic with infection off');
  if (phase === 'day' && (t.id.painkiller || t.id.firstaid)) fail(name + ': Painkiller or First Aid by day (' + (t.id.painkiller || 0) + ', ' + (t.id.firstaid || 0) + ')');
  report.push(name + ' ' + Object.entries(t.cat).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round(v / t.n * 100)).join(' '));
}
// ---- the police and military lots at night: always that grade, a weapon or its ammo
for (const [zone, g] of [['police', 'pol'], ['military', 'mil']]) { const t = tally(() => Dr.rollLoot('night', zone, g)), odd = Object.keys(t.id).filter(id => DEF[id].kind === 'weapon' ? gradeOf(id) !== g : !L.POOLS[g].ammo.includes(id));
  if (odd.length) fail(zone + ' at night gave ' + odd + ', not a ' + g + ' weapon or its ammo'); near(zone + ' weapons', (t.cat.gun || 0) + (t.cat.melee || 0), t.n, .5); }
// ---- a guaranteed drop (Armor Walker: Police, Tyrant: Military): a weapon of the grade, loaded, with ammo
for (const g of ['pol', 'mil']) { const d0 = T.drops.length; for (let i = 0; i < 200; i++) Dr.dropGuaranteed(g, 0, 0); const got = T.drops.slice(d0);
  if (got.length !== 400) fail('guaranteed ' + g + ' drops: ' + got.length + ' things for 200 kills');
  for (let i = 0; i < got.length; i += 2) { const w = got[i].item, a = got[i + 1].item, d = DEF[w.id]; if (d.kind !== 'weapon' || gradeOf(w.id) !== g || DEF[a.id].kind !== 'ammo' || d.gun && (w.mag !== d.mag || a.id !== d.ammo)) { fail('guaranteed ' + g + ' drop is ' + JSON.stringify(w) + ' + ' + JSON.stringify(a)); break; } }
  for (const d of got) Dr.removeDrop(d); }
// ---- searched furniture and cars: Civilian only, except a police car (exception 1)
const boxHigh = {};
for (const kind of Object.keys(BOX)) { const t = tally(() => Se.rollBox(kind)); if (high(t)) boxHigh[kind] = high(t); if (!INFECTION.on && t.id.antibiotic) fail('a searched ' + kind + ' gave Antibiotic with infection off'); }
// ---- the two exceptions to "Police / Military only at night", exactly these and no others (an open decision, S4)
const camp = tally(() => Dr.rollLoot('day', 'camp', null, 'river')), campHigh = high(camp);
const EXC = { 'a searched police car (the "cop" box)': Object.keys(boxHigh).join() === 'cop', 'the survivors\' camp by day': campHigh > 0 };
if (Object.keys(boxHigh).some(k => k !== 'cop')) fail('searching gives Police / Military gear from: ' + JSON.stringify(boxHigh) + ' (only a police car is a known exception)');
near('the camp\'s Police + Military share of weapons', (camp.grade.pol || 0) + (camp.grade.mil || 0), (camp.grade.pol || 0) + (camp.grade.mil || 0) + (camp.grade.civ || 0), share(L.CAMP_GRADE, 'pol') + share(L.CAMP_GRADE, 'mil'));
console.log('loot-stats: ' + N + ' rolls each\n  ' + report.join('\n  ') + '\n  exceptions to "Police / Military only at night": ' + Object.entries(EXC).filter(e => e[1]).map(e => e[0]).join('; ') + ' (camp by day: ' + (campHigh / camp.n * 100).toFixed(1) + '% of all finds)');
finish('loot-stats');
