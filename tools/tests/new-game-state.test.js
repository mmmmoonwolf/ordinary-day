// A new game starts from nothing, and a loaded one from what was saved (B7).
//  - fields that systems add to G after the start (the nests' `nested`, the director's `calm`) used to stay for the
//    next game on the same page: the second game had no nests
//  - the director's timer was a variable of its module: not reset, not saved
//  - a save did not keep the characters' numbers, so after loading a nest no longer knew its brood
import { els, errs, step, T, finish } from './setup.js';

const fail = m => errs.push('new-game-state: ' + m);
const S = await import('../../src/systems/save.js'), Z = await import('../../src/config/zombies.js'), Dr = await import('../../src/systems/director.js'), Dc = await import('../../src/config/director.js');
const G = T.G, shape = () => JSON.stringify(Object.keys(G).sort());
const nestsAt = () => { G.outbreak = true; G.min = Z.NEST.at + 1; step(2); return T.agents.filter(a => a.kind === 'nest' && a.state === 'zombie'); };

els.bStart.fire('click'); const first = shape(); G.running = true; step(2); T.player.inv = 1e9;
for (const a of T.agents) a.gone = true; step(2);
if (!nestsAt().length) fail('the first game has no nests on day 2');
Dr.updateDirector(Dc.DIRECTOR.every / 2); G.calm = 77;
if (!(G.dirT > 0)) fail('the director\'s timer is not part of the game: ' + G.dirT);

// a new game on the same page
els.bAgain.fire('click');
if (shape() !== first) fail('a new game does not have the fields of the first: ' + Object.keys(G).filter(k => !JSON.parse(first).includes(k)));
if (G.nested || G.calm || G.dirT) fail('carried over: nested ' + G.nested + ' calm ' + G.calm + ' dirT ' + G.dirT);
G.running = true; step(2); T.player.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
let nests = nestsAt(); if (!nests.length) { fail('the second game has no nests on day 2'); G.nested = false; nests = nestsAt(); }

// a nest and its brood, saved and loaded
const n = nests[0], me = T.player; me.pos.x = n.pos.x + 8; me.pos.z = n.pos.z; me.room = -1;
for (let k = 0; k < 20 && T.agents.filter(a => a.from === n.nid).length < 2; k++) { n.nextBrood = G.min; step(2); }
const brood = T.agents.filter(a => a.from === n.nid && a.state === 'zombie').length; if (!brood) fail('the nest grew nothing');
const at = [n.pos.x, n.pos.z]; G.calm = 33; G.dirT = 1.25;
if (!S.saveGame()) fail('could not save');
els.bAgain.fire('click'); step(2);
if (!S.loadGame()) fail('could not load'); step(1);
const n2 = T.agents.find(a => a.kind === 'nest' && Math.hypot(a.pos.x - at[0], a.pos.z - at[1]) < .01);
if (!n2) fail('the nest is not in the loaded game');
else {
  const back = T.agents.filter(a => a.from === n2.nid && a.state === 'zombie').length;
  if (back !== brood) fail('the nest knew ' + brood + ' of its brood before the save and ' + back + ' after loading');
}
if (G.calm !== 33 || Math.abs(G.dirT - 1.25) > .1) fail('the director did not come back: calm ' + G.calm + ' dirT ' + G.dirT);
const ids = T.agents.map(a => a.nid); if (new Set(ids).size !== ids.length) fail('two characters share a number after loading');
const fresh = T.makeAgent(0, 0); if (ids.includes(fresh.nid)) fail('a new character took a number in use: ' + fresh.nid);
console.log('new-game-state: a new game has the first game\'s fields and its nests; loaded, the nest knows its ' + brood + ' brood');
finish('new-game-state');
