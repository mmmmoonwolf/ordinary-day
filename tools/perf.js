// How long a step of the simulation takes with many zombies, headless (no drawing: THREE is a stub).
// Not part of npm test: the numbers depend on the machine. Run it before and after a change to the AI, the collision or
// the movement and compare.   Usage: node tools/perf.js [zombies ...]      (default 50 100 150 250)
// For where the time goes: node --cpu-prof --cpu-prof-dir=/tmp/prof tools/perf.js 150
import { els, step } from './headless.js';
await import('../src/main.js');
const { G } = await import('../src/core/state.js');
const A = await import('../src/entities/agents.js'), P = await import('../src/entities/player.js'), Ai = await import('../src/entities/ai.js'), An = await import('../src/entities/animation.js');
const Col = await import('../src/world/collision.js'), I = await import('../src/world/interiors.js');
els.bStart.fire('click'); step(2); const me = P.player; me.inv = 1e9; G.min = 22 * 60; step(3); G.outbreak = true;
const sizes = process.argv.slice(2).map(Number).filter(n => n > 0);
const bench = (label, n, inside, quiet) => {
  for (const a of A.agents) a.gone = true; step(2);
  if (inside) { const r = I.rooms[3]; me.pos.x = (r.x0 + r.x1) / 2; me.pos.z = (r.z0 + r.z1) / 2; } else { me.pos.x = 2; me.pos.z = 2; }
  step(2);
  // a crowd in rings round the player, one in seven a sprinter: all of them chasing, bunching up and colliding
  for (let k = 0; k < n; k++) { const t = k / n * 6.28, d = 6 + (k % 9) * 2.2, z = A.makeAgent(me.pos.x + Math.sin(t) * d, me.pos.z + Math.cos(t) * d); A.becomeZombie(z, k % 7 === 0 ? 'sprinter' : 'zombie'); A.agents.push(z); }
  const dt = 1 / 60, N = 300; let tz = 0, ts = 0;
  for (let i = 0; i < N; i++) { const t0 = performance.now(); for (const a of A.agents) if (a.state === 'zombie') Ai.updateZombie(a, dt); const t1 = performance.now(); An.separate(); tz += t1 - t0; ts += performance.now() - t1; }
  if (!quiet) console.log(label.padEnd(15) + String(n).padStart(4) + ' zombies   AI ' + (tz / N).toFixed(2) + ' ms   separate ' + (ts / N).toFixed(2) + ' ms   together ' + ((tz + ts) / N).toFixed(2) + ' ms of the 16.7 a step has');
};
bench('', 60, false, true);                                              // warm the JIT
console.log(Col.solids.length + ' collision boxes, ' + I.rooms.length + ' rooms');
for (const n of sizes.length ? sizes : [50, 100, 150, 250]) { bench('street', n, false); bench('player indoors', n, true); }
process.exit(0);
