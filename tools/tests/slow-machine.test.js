// The tests give the same result on a slow machine as on a fast one.
// The game's loop used to measure its first frame against the real clock, while the tests feed it a made-up one: when
// loading the modules took more than a second (CI, four test files at once) the first frames of a test ran no steps at
// all, and a test that passed here failed there with the same seed. This runs one test file in a process that is
// already 2.5 seconds old when the game loads, and expects the same output as a process that starts at once.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), file = pathToFileURL(join(here, 'stealth.test.js')).href;
const run = wait => spawnSync(process.execPath, ['--input-type=module', '-e', `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${wait});await import(${JSON.stringify(file)});`], { encoding: 'utf8', env: { ...process.env, SEED: '20261020' } });
const fast = run(0), slow = run(2500), last = r => (r.stdout || '').trim().split('\n').slice(-3).join('\n');
const bad = [];
if (fast.status !== 0) bad.push('the test fails even at once:\n' + last(fast));
else if (slow.status !== 0) bad.push('the same test fails in a process that started 2.5 s before the game loaded:\n' + last(slow));
else if (fast.stdout !== slow.stdout) bad.push('the two runs printed different things:\n' + last(fast) + '\n---\n' + last(slow));
console.log(bad.length ? 'FAILED: slow-machine, ' + bad.length + ' error(s)\n' + bad.join('\n') : 'slow-machine: the same output from a process that starts at once and one that is 2.5 s old\nPASSED: slow-machine');
process.exit(bad.length ? 1 : 0);
