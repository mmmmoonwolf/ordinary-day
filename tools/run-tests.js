// Runs every tools/tests/*.test.js, each in its own Node process (a newly built world each), a few at a time.
// Usage: node tools/run-tests.js [name ...]     e.g. node tools/run-tests.js dog roofs
import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'tests');
const only = process.argv.slice(2);
const files = readdirSync(DIR).filter(f => f.endsWith('.test.js') && (!only.length || only.includes(f.replace('.test.js', '')))).sort();
if (!files.length) { console.log('FAILED: no test files match ' + only.join(' ')); process.exit(1); }

const run = file => new Promise(done => {
  const child = spawn(process.execPath, [join(DIR, file)], { env: process.env });
  let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
  const timer = setTimeout(() => { out += '\nFAILED: ' + file + ' timed out after 120 s'; child.kill(); }, 120000);
  child.on('close', code => { clearTimeout(timer); done({ file, code, out: out.trimEnd() }); });
});

const results = [], queue = files.slice(), workers = Math.max(1, Math.min(4, cpus().length));
await Promise.all(Array.from({ length: workers }, async () => { while (queue.length) results.push(await run(queue.shift())); }));
results.sort((a, b) => a.file.localeCompare(b.file));
for (const r of results) console.log(r.out);
const bad = results.filter(r => r.code !== 0);
console.log(bad.length ? 'FAILED: ' + bad.length + ' of ' + results.length + ' system tests (' + bad.map(r => r.file).join(', ') + ')' : 'PASSED: ' + results.length + ' system tests');
process.exit(bad.length ? 1 : 0);
