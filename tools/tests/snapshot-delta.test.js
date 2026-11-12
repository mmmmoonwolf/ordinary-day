// A snapshot carries only the characters whose row changed, and the numbers of those gone (S3, v0.68.3).
// The full exchange between two devices is in tools/net-test.js; this checks the rules on the host's side.
import { els, errs, step, T, finish } from './setup.js';

const fail = m => errs.push('snapshot-delta: ' + m);
const Sn = await import('../../src/net/snapshot.js'), Gm = await import('../../src/systems/game.js');
els.bStart.fire('click'); T.G.running = true; step(2); T.player.inv = 1e9;
const q = Gm.addPlayer(); q.inv = 1e9; step(2);
const sent = Sn.freshSent(), live = () => T.agents.filter(a => !a.gone);
const first = Sn.encodeWorld(sent, q);
if (first.ag.length !== live().length) fail('the first snapshot has ' + first.ag.length + ' rows for ' + live().length + ' characters');
// nothing moves: nothing is sent
T.G.running = false; const still = Sn.encodeWorld(sent, q);
if (still.ag.length || still.ag0) fail('a still world sent ' + still.ag.length + ' rows and ' + (still.ag0 || []).length + ' gone');
// one moves, one goes
const [a, b] = live(); a.pos.x += 1; b.gone = true;
const next = Sn.encodeWorld(sent, q);
if (next.ag.length !== 1 || next.ag[0][0] !== a.nid) fail('one moved and ' + next.ag.length + ' rows went out: ' + next.ag.map(r => r[0]));
if (!next.ag0 || next.ag0.length !== 1 || next.ag0[0] !== b.nid) fail('the one gone was not named: ' + JSON.stringify(next.ag0));
if (Sn.encodeWorld(sent, q).ag0) fail('the one gone was named twice');
// a friend who joins again starts over: everything
if (Sn.encodeWorld(Sn.freshSent(), q).ag.length !== live().length) fail('a fresh start did not send every row');
console.log('snapshot-delta: ' + first.ag.length + ' rows first, none while still, one when one moves, the gone named once');
finish('snapshot-delta');
