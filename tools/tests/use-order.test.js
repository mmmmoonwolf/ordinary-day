// The button on screen and what E does come from one place (entities/use.js), so they agree whatever is near.
import { els, errs, step, T, P, finish } from './setup.js';

const fail = m => errs.push('use-order: ' + m);
const { useOf } = await import('../../src/entities/use.js'), { updatePrompts } = await import('../../src/ui/prompts.js'), Ac = await import('../../src/systems/actions.js');
const Rw = await import('../../src/world/roofs.js');
els.bStart.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);

// the order, on a made-up player with everything near at once
const all = { alive: true, car: -1, nearDown: { alive: true }, full: { item: { id: 'a9' } }, near: { item: { id: 'a9' } }, nearLadder: 0, nearDoor: 2, nearBox: 5, nearCar: 1 };
const want = ['help', 'full', 'pick', 'ladder', 'door', 'box', 'car'], off = { help: 'nearDown', full: 'full', pick: 'near', ladder: 'nearLadder', door: 'nearDoor', box: 'nearBox', car: 'nearCar' };
for (const k of want) { const u = useOf(all); if (!u || u.k !== k) fail('expected ' + k + ', got ' + (u && u.k)); all[off[k]] = typeof all[off[k]] === 'number' ? -1 : null; }
if (useOf(all) !== null) fail('nothing near should be nothing to do');
if (useOf({ ...all, car: 0, near: {} }).k !== 'out') fail('in a car E gets out');
if (useOf({ alive: true, zed: true, car: -1, near: {}, nearDoor: 3 }).k !== 'door' || useOf({ alive: true, zed: true, car: -1, near: {}, nearDoor: -1 })) fail('a zombie player only works doors');

// in the game: at the foot of a ladder with a door also in reach, the button names the ladder and E climbs it
const L = Rw.ladders[0]; me.pos.x = L.lx; me.pos.z = L.lz; step(2);
if (me.nearLadder !== 0) fail('not at the ladder');
me.nearDoor = 0; updatePrompts(); const label = els.pickName.textContent;
Ac.runAction(me, 'use', []);
if (label !== 'ปีนขึ้นหลังคา' || me.roof !== 0) fail('the button said "' + label + '" and E ' + (me.roof === 0 ? 'climbed the ladder' : 'did something else'));
console.log('use-order: help > full bag > pick up > ladder > door > search > car; by a ladder and a door the button and E both climb');
finish('use-order');
