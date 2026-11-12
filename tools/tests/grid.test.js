// The grid in world/collision.js answers exactly as looking at every box does (A1).
// collide(), rayWall() and freeAt() are compared, to the last digit, with the plain loops they replaced, at tens of
// thousands of places over the whole map: in a new game, and again after the boxes have changed under the grid (doors
// shut, cars driven away, an obstacle smashed, the camp gate opened, the supply crate landed).
import { els, errs, step, T, finish } from './setup.js';

const fail = m => errs.push('grid: ' + m);
const C = await import('../../src/world/collision.js'), W = await import('../../src/config/world.js'), V = await import('../../src/world/vehicles.js'), D = await import('../../src/systems/doors.js');
const Ob = await import('../../src/systems/obstacles.js'), Ar = await import('../../src/world/army.js'), Pr = await import('../../src/world/props.js'), Ev = await import('../../src/systems/events.js');
const { solids } = C, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- the loops as they were before the grid
function collideAll(p, r) {
  for (const b of solids) {
    if (p.x < b.x0 - r || p.x > b.x1 + r || p.z < b.z0 - r || p.z > b.z1 + r) continue;
    const qx = clamp(p.x, b.x0, b.x1), qz = clamp(p.z, b.z0, b.z1), dx = p.x - qx, dz = p.z - qz, dd = dx * dx + dz * dz;
    if (dd > r * r) continue;
    if (dd < 1e-9) { const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bb = b.z1 - p.z, m = Math.min(l, rr, t, bb); if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r; }
    else { const d = Math.sqrt(dd); p.x = qx + dx / d * r; p.z = qz + dz / d * r; }
  }
  W.clampWorld(p);
}
function rayWallAll(ox, oz, dx, dz, max) {
  let best = max;
  for (const b of solids) {
    let t0 = 0, t1 = best;
    if (Math.abs(dx) < 1e-6) { if (ox < b.x0 || ox > b.x1) continue; } else { let a = (b.x0 - ox) / dx, c = (b.x1 - ox) / dx; if (a > c) { const s = a; a = c; c = s; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) continue; }
    if (Math.abs(dz) < 1e-6) { if (oz < b.z0 || oz > b.z1) continue; } else { let a = (b.z0 - oz) / dz, c = (b.z1 - oz) / dz; if (a > c) { const s = a; a = c; c = s; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) continue; }
    if (t0 > .05 && t0 < best) best = t0;
  }
  return best;
}
const freeAtAll = (x, z, m) => { for (const b of solids) if (x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m) return false; return W.inWorld(x, z); };

// ---- places to ask about: all over the map, and close around the boxes (where the answers are not trivial)
const R = (a, b) => a + Math.random() * (b - a);
let X0 = 1e9, X1 = -1e9, Z0 = 1e9, Z1 = -1e9; for (const b of solids) { if (Math.abs(b.x0) > 1e5) continue; X0 = Math.min(X0, b.x0); X1 = Math.max(X1, b.x1); Z0 = Math.min(Z0, b.z0); Z1 = Math.max(Z1, b.z1); }
const spot = () => { if (Math.random() < .5) return [R(X0 - 5, X1 + 5), R(Z0 - 5, Z1 + 5)]; const b = solids[Math.floor(Math.random() * solids.length)]; return [R(b.x0 - 1.5, b.x1 + 1.5), R(b.z0 - 1.5, b.z1 + 1.5)]; };
const RADII = [.34, .34, .34, .45, .6, .9, 1.4];
function compare(what, n) {
  let bad = 0, moved = 0, hits = 0, blocked = 0;
  for (let i = 0; i < n && bad < 3; i++) {
    const [x, z] = spot(), r = RADII[i % RADII.length];
    const a = { x, z }, b = { x, z }; C.collide(a, r); collideAll(b, r); if (a.x !== x || a.z !== z) moved++;
    if (a.x !== b.x || a.z !== b.z) { bad++; fail(what + ': collide at ' + x.toFixed(3) + ',' + z.toFixed(3) + ' r ' + r + ' gives ' + a.x + ',' + a.z + ', every box gives ' + b.x + ',' + b.z); }
    // rays: any direction, the four straight ones too, short and long, and not always of length one
    const ang = i % 9 === 0 ? Math.floor(Math.random() * 4) * Math.PI / 2 : R(0, 6.2832), k = i % 11 === 0 ? R(.3, 2) : 1, dx = i % 9 === 0 ? Math.round(Math.sin(ang)) * k : Math.sin(ang) * k, dz = i % 9 === 0 ? Math.round(Math.cos(ang)) * k : Math.cos(ang) * k, max = i % 5 === 0 ? R(60, 400) : R(.5, 45);
    const t = C.rayWall(x, z, dx, dz, max), u = rayWallAll(x, z, dx, dz, max); if (t < max) hits++;
    if (t !== u) { bad++; fail(what + ': rayWall from ' + x.toFixed(3) + ',' + z.toFixed(3) + ' dir ' + dx.toFixed(3) + ',' + dz.toFixed(3) + ' max ' + max.toFixed(1) + ' gives ' + t + ', every box gives ' + u); }
    const m = [0, .4, 1, 1.4, 3][i % 5], f = C.freeAt(x, z, m), g = freeAtAll(x, z, m); if (!f) blocked++;
    if (f !== g) { bad++; fail(what + ': freeAt ' + x.toFixed(3) + ',' + z.toFixed(3) + ' m ' + m + ' gives ' + f + ', every box gives ' + g); }
  }
  if (moved < n / 20 || hits < n / 5 || blocked < n / 20) fail(what + ': the questions were too easy (' + moved + ' pushed, ' + hits + ' rays stopped, ' + blocked + ' not free of ' + n + ')');
  return moved + ' pushed out, ' + hits + ' rays stopped, ' + blocked + ' not free';
}

els.bStart.fire('click'); T.G.running = true; step(2); T.player.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
const first = compare('new game', 20000);

// ---- the boxes change under the grid
const before = solids.length;
for (let k = 0; k < T.G.doors.length; k += 2) { T.G.doors[k].open = false; } D.applyDoors(T.G.doors);                 // half the doors shut: boxes added
V.rides.forEach((r, i) => { const c = T.G.cars[i]; c.x += 9 + i; c.z -= 4; c.a += .7; V.placeRide(r, c.x, c.z, c.a, 1); });   // cars driven off: boxes moved
const car = Pr.breakables.find(b => b.car && !b.broken); Ob.smashNear(car.x, car.z, 3);                                // an obstacle smashed: a box removed
Ar.setGateOpen(true);                                                                                                  // the camp gate: a box moved far away
Ev.airdrop(); step(2);                                                                                                 // a crate somewhere
if (solids.length === before) fail('the boxes did not change (' + before + ')');
const second = compare('after doors, cars, a smashed car, the gate and a crate', 20000);
Ar.setGateOpen(false); D.restoreDoors(); const third = compare('gate shut, doors open again', 6000);

// a box listed by cell must not move: one that does needs dyn:true where it is made
G_played: { T.G.outbreak = true; T.G.min = 20 * 60; step(600); const m = C.movedBoxes(); if (m.length) fail(m.length + ' boxes moved after they were listed by cell (make them with dyn:true): ' + JSON.stringify(m[0])); }
// and the check itself works
{ const b = solids.find(b => !b.dyn && b._c !== undefined), x = b.x0; C.rayWall(0, 0, 1, 0, 1); b.x0 += 2; if (!C.movedBoxes().includes(b)) fail('movedBoxes() did not notice a box that moved'); b.x0 = x; }
console.log('grid: ' + solids.length + ' boxes; the same answers as looking at every box at 46000 places (' + first + '; then ' + second + '; then ' + third + ')');
finish('grid');
