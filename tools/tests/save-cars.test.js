// Loading a save puts the cars where they were left: the state, and with it the collision box and the model.
// (Until this test the state came back but the box and model stayed at the starting place.)
import { els, errs, step, store, T, P, finish } from './setup.js';

const fail = m => errs.push('save-cars: ' + m);
const S = await import('../../src/systems/save.js'), W = await import('../../src/world/vehicles.js');
els.bStart.fire('click'); T.G.running = true; step(2); T.player.inv = 1e9;
const centre = r => [(r.box.x0 + r.box.x1) / 2, (r.box.z0 + r.box.z1) / 2];
const c = T.G.cars[0], r = W.rides[0], home = centre(r);
c.x += 12; c.z += 3; c.hp = 77; W.placeRide(r, c.x, c.z, c.a, c.hp); const left = [c.x, c.z];
if (!S.saveGame()) fail('could not save');
els.bAgain.fire('click'); step(2);
if (Math.hypot(centre(r)[0] - home[0], centre(r)[1] - home[1]) > .01) fail('a new game did not put the car back at its start');
if (!S.loadGame()) fail('could not load'); step(2);
const now = centre(r);
if (Math.hypot(T.G.cars[0].x - left[0], T.G.cars[0].z - left[1]) > .01 || T.G.cars[0].hp !== 77) fail('the car\'s state did not come back');
if (Math.hypot(now[0] - left[0], now[1] - left[1]) > .01) fail('the car\'s collision box is at ' + now.map(v => v.toFixed(1)) + ', the save has the car at ' + left.map(v => v.toFixed(1)));
// a save made before the motorbikes existed has fewer cars: loading it adds the missing ones
{ const key = [...store.keys()].find(k => k.startsWith('ordinary-day.save')), s = JSON.parse(store.get(key));
  s.G.cars = s.G.cars.slice(0, 2); store.set(key, JSON.stringify(s));
  if (!S.loadGame()) fail('could not load the older save'); step(2);
  if (T.G.cars.length !== W.rides.length || T.G.cars.some(k => !k || !(k.hp > 0))) fail('an older save has ' + T.G.cars.length + ' cars for ' + W.rides.length + ' rides'); }
console.log('save-cars: a moved car comes back with its box at ' + now.map(v => v.toFixed(1)) + ', an older save gets ' + (W.rides.length - 2) + ' more rides');
finish('save-cars');
