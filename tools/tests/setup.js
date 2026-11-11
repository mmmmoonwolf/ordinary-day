// Shared start for the per-system tests in this folder: the headless stubs, the game, and the handful of names the
// tests use. Each test file runs in its own process (tools/run-tests.js), so each starts from a newly built world.
import { els, handlers, store, errs, step, key, seed } from '../headless.js';

await import('../../src/main.js');
const { G } = await import('../../src/core/state.js');
const { agents, becomeZombie, makeAgent } = await import('../../src/entities/agents.js');
const P = await import('../../src/entities/player.js');
const I = await import('../../src/world/interiors.js');
const { makeItem, drops } = await import('../../src/systems/drops.js');
const { renderBag, openBag, closeBag } = await import('../../src/ui/bag.js');

// the game as the tests reach it: T.player and T.inv are this device's player and their gear, whoever that is now
const T = { get inv() { return P.player.gear; }, get player() { return P.player; }, makeItem, drops, G, agents, becomeZombie, makeAgent, renderBag, openBag, closeBag };

// the last line of every test file: report and leave with 0 or 1
function finish(name) {
  console.log(errs.length ? `FAILED: ${name}, ${errs.length} error(s)\n` + errs.slice(0, 3).join('\n---\n') : 'PASSED: ' + name);
  process.exit(errs.length ? 1 : 0);
}

export { els, handlers, store, errs, step, key, seed, T, P, I, G, finish };
