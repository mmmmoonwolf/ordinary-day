// A save names a loot spot by its zone and place, not by its number in the list (L3).
// Adding a spot to the world shifts every number after it; a save made before then put its loot on the wrong spots
// (or the format had to change and old saves were thrown away). Saves that still hold a number load as before.
import { els, errs, step, store, T, finish } from './setup.js';

const fail = m => errs.push('save-spots: ' + m);
const S = await import('../../src/systems/save.js'), { lootSpots } = await import('../../src/world/city.js');
els.bStart.fire('click'); T.G.running = true; step(2); T.player.inv = 1e9;
const onSpot = () => T.drops.filter(d => d.spot).map(d => d.item.id + '@' + d.spot.x.toFixed(2) + ',' + d.spot.z.toFixed(2)).sort().join(' ');
const ids = new Set(lootSpots.map(s => s.zone + '@' + Math.round(s.x * 10) + ',' + Math.round(s.z * 10)));
if (ids.size !== lootSpots.length) fail(lootSpots.length - ids.size + ' loot spots share a zone and a place: they cannot be told apart in a save');
const before = onSpot(), n = T.drops.filter(d => d.spot).length; if (n < 20) fail('only ' + n + ' drops lie on loot spots');
if (!S.saveGame()) fail('could not save');
const key = [...store.keys()].find(k => k.startsWith('ordinary-day.save')), saved = JSON.parse(store.get(key));
if (saved.drops.some(d => typeof d.spot === 'number' && d.spot >= 0)) fail('the save still holds spot numbers');

// the world gains a spot at the front of the list: every number shifts by one
const extra = { x: 3.3, z: -4.4, zone: 'city', drop: null }; lootSpots.unshift(extra);
els.bAgain.fire('click'); step(2); if (!S.loadGame()) fail('could not load');
if (onSpot() !== before) fail('after a spot was added to the world the loot is on other spots');
for (const d of T.drops) if (d.spot && (Math.abs(d.spot.x - d.x) > .01 || Math.abs(d.spot.z - d.z) > .01)) { fail('a ' + d.item.id + ' at ' + d.x.toFixed(1) + ',' + d.z.toFixed(1) + ' belongs to the spot at ' + d.spot.x.toFixed(1) + ',' + d.spot.z.toFixed(1)); break; }
for (const s of lootSpots) if (s.drop && s.drop.spot !== s) { fail('a spot and its drop do not point at each other'); break; }
lootSpots.shift();

// a save from before: numbers. It loads onto the same spots as long as the list is the one it was made with
{ const old = JSON.parse(store.get(key)); const byId = new Map(lootSpots.map((s, i) => [s.zone + '@' + Math.round(s.x * 10) + ',' + Math.round(s.z * 10), i]));
  for (const d of old.drops) if (typeof d.spot === 'string') d.spot = byId.get(d.spot);
  store.set(key, JSON.stringify(old)); els.bAgain.fire('click'); step(2);
  if (!S.loadGame()) fail('could not load a save that holds spot numbers'); if (onSpot() !== before) fail('a save that holds spot numbers put its loot on other spots'); }
console.log('save-spots: ' + n + ' drops stay on their spots when the world gains one; a save with spot numbers still loads');
finish('save-spots');
