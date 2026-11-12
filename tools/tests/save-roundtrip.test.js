// A save, loaded, is the game that was saved (S2).
// The test plays into a busy second day, takes a picture of everything the rules read (every plain field of G, of each
// character, of each player, every drop), saves, starts a new game, loads, and takes the picture again. Whatever differs
// must be named below with the reason it is allowed to. A field added to a character or to G and not to the save shows
// up here as a difference: that is the point (the nests' brood, the cars and the director's timer were all lost this way).
import { els, errs, step, T, P, finish } from './setup.js';

const fail = m => errs.push('save-roundtrip: ' + m);
const S = await import('../../src/systems/save.js'), Z = await import('../../src/config/zombies.js'), D = await import('../../src/systems/doors.js'), Gm = await import('../../src/systems/game.js');
const G = T.G;

// plain data only: numbers rounded, no models, no functions, nothing that points at another live object
const plain = (v, depth = 0) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : String(v);
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v !== 'object' || depth > 4) return undefined;
  if (Array.isArray(v)) return v.map(x => plain(x, depth + 1));
  if (Object.getPrototypeOf(v) !== Object.prototype) return undefined;       // a THREE object, a Map, a Set
  const o = {}; for (const k of Object.keys(v).sort()) { const x = plain(v[k], depth + 1); if (x !== undefined) o[k] = x; } return o;
};
const fields = (o, skip) => { const out = {}; for (const k of Object.keys(o).sort()) { if (skip.has(k)) continue; const x = plain(o[k]); if (x !== undefined) out[k] = x; } return out; };

// ---- what is left out of the picture: not the game's state at all
const G_SKIP = new Set(['running', 'paused', 'over', 'lastMinShown', 'alertA', 'alertT', 'speedIdx', 'min']);   // the session; min is compared apart
const AGENT_SKIP = new Set(['b', 'sk', 'pos', 'y']);                                                            // models; pos is compared apart
const PLAYER_SKIP = new Set(['b', 'sk', 'pos', 'y', 'input', 'local', 'held', 'gear']);                           // models, this device's controls; gear is compared apart
// ---- what may differ after loading, and why. Anything else that differs fails the test: save it (AGENT_KEYS, the
// players' list or G in systems/save.js), or add it here with the reason it does not need to be
const ALLOW = {
  '.agents.*.moving': 'how fast it is moving this instant; set again by the next step',
  '.agents.*.nodeT': 'time spent walking to the next pavement node; starts again',
  '.agents.*.det': 'the way round an obstacle it is taking right now', '.agents.*.detSide': 'the same',
  '.agents.*.alert': 'where a shot at a bandit came from, a few seconds long',
  '.agents.*.seenP': 'the player a zombie is chasing: a pointer; it sees them again in the next step',
  '.agents.*.growlAt': 'when it last growled (sound)', '.agents.*.swingT': 'the arm swing being drawn', '.agents.*.hitT': 'the flinch being drawn',
  '.agents.*.farmT': 'where in the farm it is wandering to; picks again', '.agents.*.farmTT': 'the same',
  '.players.*.jx': 'the random look of a walk, rolled per body', '.players.*.jz': 'the same', '.players.*.phase': 'the same', '.players.*.spd': 'the same', '.players.*.walk': 'the same',
  '.players.*.nid': 'players are named by id, not nid',
  '.players.*.lastHit': 'kept as seconds since the hit, against a clock that has moved on',
  '.players.*.trailT': 'time to the next drop of the blood trail', '.players.*.pushT': 'how long they have leaned on something to vault it',
  '.players.*.away': 'a friend waits, away, until their device joins the room again (v0.12)',
  '.players.*.job': 'this device\'s comes from the profile; a friend\'s is saved (none here)', '.players.*.wear': 'the same',
};
// two ways of writing "nothing" are the same nothing (a field not there yet and its zero)
const empty = v => v === undefined || v === null || v === 0 || v === false || v === -1 || v === '';
const picture = () => ({
  G: fields(G, G_SKIP), min: Math.round(G.min),
  agents: Object.fromEntries(T.agents.filter(a => a.state !== 'dead' && !a.gone).map(a => [a.nid, Object.assign(fields(a, AGENT_SKIP), { x: plain(a.pos.x), z: plain(a.pos.z) })])),
  players: P.players.map(p => Object.assign(fields(p, PLAYER_SKIP), { x: plain(p.pos.x), z: plain(p.pos.z), gear: plain(p.gear) })),
  drops: T.drops.map(d => d.item.id + '@' + plain(d.x) + ',' + plain(d.z) + (d.item.n ? 'x' + d.item.n : '')).sort(),
});
const diff = (a, b, path, out) => {
  if (a === b) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], path + '.' + k, out); return out; }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push([path, a, b]);
  return out;
};

// ---- a busy game: the second day, night falling, every system with something to remember
els.bStart.fire('click'); G.running = true; step(2); const me = T.player; me.inv = 1e9;
G.min = 9 * 60 + 31; step(120);                                           // the outbreak
G.min = 19 * 60; step(240);                                               // the first night
G.min = 1440 + Z.NEST.at + 1; step(240);                                  // day 2: nests, a screamer, the day's events
G.min = 1440 + 20 * 60; step(300);                                        // the second night: hunters on their way
const k = 3; if (G.doors[k].open) { G.doors[k].open = false; } G.doors[k].hp = 77; D.applyDoors(G.doors);
me.hp = 63; me.bleedW = 2; me.wet = .4;
const mate = Gm.addPlayer(); mate.inv = 1e9; mate.hp = 41; step(30);

const before = picture();
if (!S.saveGame()) fail('could not save');
els.bAgain.fire('click'); step(2);
if (!S.loadGame()) fail('could not load');
const after = picture();
const d = diff(before, after, '', []).filter(([, a, b]) => !(empty(a) && empty(b)));
const lost = {};
for (const [path, a, b] of d) {
  const key = path.replace(/^\.agents\.\d+\./, '.agents.*.').replace(/^\.players\.\d+\./, '.players.*.');
  if (!ALLOW[key]) (lost[key] = lost[key] || []).push(path + ': ' + JSON.stringify(a) + ' before, ' + JSON.stringify(b) + ' after loading');
}
for (const [key, list] of Object.entries(lost)) fail(key + ' did not come back (' + list.length + '): ' + list[0].slice(0, 200));
const nA = Object.keys(before.agents).length, kinds = new Set(Object.values(before.agents).map(a => a.kind || a.npc || a.state));
if (nA < 20 || before.drops.length < 20 || !kinds.has('nest') || !kinds.has('walker') && !kinds.has('zombie')) fail('the game saved was not a busy one: ' + nA + ' characters (' + [...kinds] + '), ' + before.drops.length + ' drops');
console.log('save-roundtrip: ' + nA + ' characters (' + [...kinds].sort().join(' ') + '), ' + before.players.length + ' players, ' + before.drops.length + ' drops and ' + Object.keys(before.G).length + ' fields of G came back; ' + Object.keys(ALLOW).length + ' passing fields are allowed to differ');
finish('save-roundtrip');
