// Headless smoke test for Ordinary Day.
// Runs the game logic for ~2 in-game days with THREE.js and the DOM replaced by stubs,
// then spawns every zombie class next to the player and fires every weapon type.
// It catches runtime errors in game logic only; it does not check rendering.
// Usage: node tools/smoke-test.js

// stub that accepts any property access, call or construction
function any() {
  const f = function () {};
  delete f.length; delete f.name;
  return new Proxy(f, {
    get(t, p) {
      if (p === Symbol.iterator) return function* () {};
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'then') return undefined;
      if (!Object.prototype.hasOwnProperty.call(t, p)) Object.defineProperty(t, p, { value: any(), writable: true, configurable: true });
      return t[p];
    },
    set(t, p, v) { Object.defineProperty(t, p, { value: v, writable: true, configurable: true }); return true; },
    apply() { return any(); },
    construct() { return any(); },
  });
}
const startHidden = new Set(['boss', 'bag', 'pOver', 'joy', 'bPick', 'pause', 'reportBox', 'bFix', 'bThrow', 'settings', 'fps']);
function el(id) {
  const h = {};
  const e = {
    id, style: { setProperty() {}, removeProperty() {} }, classList: { toggle() {}, remove() {}, add() {}, contains() { return false; } }, dataset: {}, children: [],
    hidden: startHidden.has(id), textContent: '', innerHTML: '', className: '', disabled: false,
    appendChild(c) { this.children.push(c); c.remove = () => { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    get firstChild() { return this.children[0]; },
    addEventListener(t, fn) { (h[t] = h[t] || []).push(fn); },
    fire(t, ev) { (h[t] || []).forEach(f => f(Object.assign({ preventDefault() {}, pointerType: 'touch', pointerId: 1, clientX: 300, clientY: 300, button: 0, target: e }, ev || {}))); },
    focus() {}, setPointerCapture() {}, querySelector() { return el('q'); }, getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 150 }; }, getContext() { return any(); },
  };
  return e;
}
const els = {};
const handlers = {};
let raf = null;
global.THREE = any();
global.document = { getElementById: id => els[id] || (els[id] = el(id)), createElement: t => { const e = el(t); e.getContext = () => any(); return e; }, querySelectorAll: () => [], visibilityState: 'visible', addEventListener: (t, fn) => { (handlers['document:' + t] = handlers['document:' + t] || []).push(fn); } };
global.matchMedia = () => ({ matches: false });
global.innerWidth = 1200; global.innerHeight = 800; global.devicePixelRatio = 1;
global.requestAnimationFrame = f => { raf = f; };
global.addEventListener = (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); };
global.window = global;
const store = new Map();
global.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

// the game modules read the stubs above, so they are imported only now
await import('../src/main.js');
const { G } = await import('../src/core/state.js');
const { agents, becomeZombie, makeAgent } = await import('../src/entities/agents.js');
const P = await import('../src/entities/player.js');
const { makeItem, drops } = await import('../src/systems/drops.js');
const { renderBag, openBag, closeBag } = await import('../src/ui/bag.js');
const S = await import('../src/systems/save.js');
const { hurtPlayer } = await import('../src/systems/combat.js');
const { infectPlayer } = await import('../src/systems/infection.js');
const { useHeal } = await import('../src/systems/inventory.js');
const { gameOver } = await import('../src/ui/hud.js');
const { LZ } = await import('../src/config/goal.js');
const T = { get inv() { return P.player.gear; }, get player() { return P.player; }, makeItem, drops, G, agents, becomeZombie, makeAgent, renderBag, openBag, closeBag };

const errs = [];
let now = 1000;
function step(n) { for (let i = 0; i < n; i++) { now += 16.7; try { raf(now); } catch (e) { errs.push(e.stack); } } }
const key = (code, type) => (handlers[type] || []).forEach(f => f({ code, preventDefault() {}, repeat: false }));

// 1) free play for ~2 in-game days
els.bStart.fire('click');
for (let s = 0; s < 640; s++) {
  const c = ['KeyW', 'KeyD', 'KeyS', 'KeyA'][Math.floor(s / 7) % 4];
  key(c, 'keydown'); if (s % 3 === 0) key('Space', 'keydown');
  key('KeyE', 'keydown'); key('KeyH', 'keydown'); if (s % 11 === 0) key('KeyR', 'keydown');
  if (s % 13 === 0) key('Digit' + (1 + s % 3), 'keydown');
  step(60); key(c, 'keyup'); key('Space', 'keyup');
  if (s % 80 === 0) console.log('t', s + 's', els.clock.textContent, els.phaseName.textContent, 'people', els.cH.textContent, 'zombies', els.cZ.textContent, 'kills', els.cK.textContent, 'hp', els.hpnum.textContent);
}

// 2) combat test: every weapon type vs every zombie class
els.bAgain.fire('click');
const p = T.player;
T.inv.eq.primary = T.makeItem('lmg_m'); T.inv.eq.primary.mag = 100;
T.inv.eq.secondary = T.makeItem('pistol_p'); T.inv.eq.melee = T.makeItem('axe_m'); T.inv.cap = 14;
T.inv.bag.push({ id: 'a556', n: 90 }, { id: 'a9', n: 60 }, { id: 'resurrect', n: 1 }, { id: 'firstaid', n: 2 }, T.makeItem('sniper_m'), { id: 'a762', n: 20 }, T.makeItem('shotgun_m'), { id: 'a12', n: 24 });
T.G.min = 18 * 60 + 20; step(200);
for (const k of ['zombie', 'sprinter', 'boomer', 'armor', 'tyrant', 'armor', 'boomer']) { const a = T.makeAgent(p.pos.x + 3 + Math.random() * 4, p.pos.z + 3); T.becomeZombie(a, k); T.agents.push(a); }
for (const slot of ['Digit1', 'Digit2', 'Digit3', 'Digit1']) { key(slot, 'keydown'); for (let i = 0; i < 40; i++) { key('Space', 'keydown'); step(15); key('Space', 'keyup'); step(5); } key('KeyR', 'keydown'); step(150); }
T.openBag(); T.renderBag(); T.closeBag();
const killsBySum = Object.values(T.G.killsBy).reduce((a, b) => a + b, 0);
if (killsBySum !== T.G.kills) errs.push('kills per class ' + killsBySum + ' != kills ' + T.G.kills);
console.log('combat: hp', Math.round(p.hp), 'kills', T.G.kills, JSON.stringify(T.G.killsBy), 'resurrect used', !T.inv.bag.some(e => e.id === 'resurrect'));
for (let i = 0; i < 20; i++) { key('Space', 'keydown'); step(300); key('Space', 'keyup'); }
console.log('after night:', els.clock.textContent, els.phaseName.textContent, 'zombie kinds', [...new Set(T.agents.filter(a => a.state === 'zombie').map(a => a.kind))].join(','));

// 3) save system: autosave while playing, load restores the same world, death deletes the save
const fail = m => errs.push('save test: ' + m);
els.bAgain.fire('click');
T.inv.bag.push({ id: 'bandage', n: 3 }, { id: 'a9', n: 40 }); T.inv.eq.secondary = T.makeItem('pistol_c');
T.player.inv = 1e9;   // keep the player alive so the result does not depend on the night's zombies
T.G.min = 19 * 60; step(1000);
if (!store.has('ordinary-day.save')) fail('no autosave after ~17 s of play');
store.clear(); document.visibilityState = 'hidden'; handlers['document:visibilitychange'].forEach(f => f()); document.visibilityState = 'visible';
if (!store.has('ordinary-day.save')) fail('no save when the page went to the background');
S.saveGame();
const live = () => T.agents.filter(a => a.state !== 'dead' && !a.gone);
const before = { min: T.G.min, phase: T.G.phase, x: T.player.pos.x, z: T.player.pos.z, hp: T.player.hp, agents: live().map(a => a.state + ':' + a.kind).sort().join(), drops: T.drops.length, inv: JSON.stringify([T.inv.bag, T.inv.eq, T.inv.active, T.inv.cap]) };
els.bAgain.fire('click'); step(30);
if (!S.loadGame()) fail('loadGame returned false');
const after = { min: T.G.min, phase: T.G.phase, x: T.player.pos.x, z: T.player.pos.z, hp: T.player.hp, agents: live().map(a => a.state + ':' + a.kind).sort().join(), drops: T.drops.length, inv: JSON.stringify([T.inv.bag, T.inv.eq, T.inv.active, T.inv.cap]) };
for (const k in before) if (before[k] !== after[k]) fail(k + ' changed after load: ' + String(before[k]).slice(0, 60) + ' -> ' + String(after[k]).slice(0, 60));
T.G.running = true; step(300);
T.inv.bag = T.inv.bag.filter(e => e.id !== 'resurrect'); T.player.inv = 0; T.player.down = 0; hurtPlayer(T.player, 9999);
if (store.has('ordinary-day.save')) fail('save still exists after death');
console.log('save: restored', live().length, 'agents and', T.drops.length, 'drops at', els.clock.textContent, '| deleted on death', !store.has('ordinary-day.save'));

// 4) infection: progresses with in-game time, blocks regen, Antibiotic cures, a Resurrection Kit clears it, 100% kills
const bad = m => errs.push('v0.4 test: ' + m);
els.bAgain.fire('click'); T.G.running = true;
T.player.hp = 50; infectPlayer(T.player); step(300);
const pc = T.player.infect;
if (!(pc > 0.05 && pc < 0.2)) bad('infection after 5 s should be ~8%, got ' + pc);
if (T.player.hp > 50.01) bad('HP regenerated while infected');
if (els.infRow.hidden) bad('infection bar hidden');
T.inv.bag.push({ id: 'antibiotic', n: 1 }); T.player.hp = T.player.maxHp; useHeal(T.player);
if (T.player.infect !== 0 || T.inv.bag.some(e => e.id === 'antibiotic')) bad('Antibiotic did not cure at full HP');
T.inv.bag.push({ id: 'resurrect', n: 1 }); infectPlayer(T.player); T.player.infect = 0.999; step(30);
if (!T.player.alive || T.player.infect !== 0) bad('Resurrection Kit did not save an infected player');
step(240); T.inv.bag = T.inv.bag.filter(e => e.id !== 'resurrect'); T.player.inv = 0;
infectPlayer(T.player); T.player.infect = 0.999; step(30);
if (T.player.alive || T.G.endCause !== 'infected') bad('infection at 100% did not kill (alive ' + T.player.alive + ', cause ' + T.G.endCause + ')');
gameOver();
if (els.oTitle.textContent !== 'คุณกลายเป็นซอมบี้' || !els.sKillsBy.innerHTML.includes('Tyrant') || !els.sBest.innerHTML.includes('สถิติดีสุด')) bad('infected game-over summary not filled');
console.log('infection: after 5 s', (pc * 100).toFixed(1) + '%', '| summary:', els.oTitle.textContent, '|', els.sBest.innerHTML.replace(/<[^>]+>/g, ''));
// 5) goal: day 8 morning, helicopter lands at the LZ, reaching it wins
els.bAgain.fire('click'); T.G.running = true;
T.G.min = 7 * 1440 + 6 * 60 + 5; step(20);
if (!els.msg.textContent.includes('เฮลิคอปเตอร์')) bad('no rescue announcement at dawn of day 8: ' + els.msg.textContent);
if (els.lz.hidden) bad('rescue arrow hidden on day 8 morning');
if (!els.dayline.innerHTML.includes('รอด 7/7 คืน')) bad('dayline progress: ' + els.dayline.innerHTML);
T.G.min = 7 * 1440 + 8 * 60 + 30; step(20);
if (T.G.over) bad('won without reaching the LZ');
T.player.pos.x = LZ.x + 1; T.player.pos.z = LZ.z; step(20);
if (!T.G.over || T.G.endCause !== 'won' || els.oTitle.textContent !== 'คุณรอดแล้ว') bad('reaching the helicopter did not win (over ' + T.G.over + ', cause ' + T.G.endCause + ')');
if (store.has('ordinary-day.save')) bad('save kept after winning');
console.log('goal:', els.dayline.innerHTML.replace(/<[^>]+>/g, ''), '|', els.oEyebrow.textContent, els.oTitle.textContent, '|', els.sNights.textContent, 'nights | best', store.get('ordinary-day.best'));

// 6) pause menu: P / Esc / background tab pause the game, manual save, back to the title, new day resets
const pfail = m => errs.push('pause test: ' + m);
els.bAgain.fire('click'); T.G.running = true; T.player.inv = 1e9; step(10);
key('KeyP', 'keydown');
const m0 = T.G.min; step(60);
if (!T.G.paused || els.pause.hidden || T.G.min !== m0) pfail('P did not pause (paused ' + T.G.paused + ')');
key('Tab', 'keydown'); if (!els.bag.hidden) pfail('bag opened over the pause menu');
store.clear(); els.bSaveNow.fire('click');
if (!store.has('ordinary-day.save') || !els.saveMsg.textContent.startsWith('บันทึกแล้ว')) pfail('manual save failed: ' + els.saveMsg.textContent);
els.bResume.fire('click'); step(10);
if (T.G.paused || !els.pause.hidden || T.G.min === m0) pfail('resume did not continue the game');
key('Escape', 'keydown'); if (!T.G.paused) pfail('Esc did not pause'); key('Escape', 'keydown'); if (T.G.paused) pfail('Esc did not resume');
document.visibilityState = 'hidden'; handlers['document:visibilitychange'].forEach(f => f()); document.visibilityState = 'visible';
if (!T.G.paused || els.pause.hidden) pfail('background tab did not pause');
els.bToTitle.fire('click');
if (T.G.running || T.G.paused || els.overlay.hidden || els.pStart.hidden || els.bContinue.hidden) pfail('back to title did not show the start screen with continue');
T.G.min = 3000; els.bStart.fire('click');
if (T.G.min !== 450 || store.has('ordinary-day.save') || !T.G.running) pfail('new day after back-to-title did not start fresh (min ' + T.G.min + ')');
console.log('pause: P/Esc/background pause, manual save, back to title, new day OK =', !errs.some(e => e.startsWith('pause test')));

// 7) ambulance Resurrection Kit and first-time tips
const afail = m => errs.push('ambulance/tips test: ' + m);
const { lootSpots } = await import('../src/world/city.js');
const { fillDay, fillNight } = await import('../src/systems/drops.js');
const { freeAt } = await import('../src/world/collision.js');
els.bAgain.fire('click'); T.G.running = true; T.player.inv = 1e9;
const amb = lootSpots.filter(sp => sp.zone === 'ambulance');
if (amb.length !== 1 || !amb[0].drop || amb[0].drop.item.id !== 'resurrect') afail('no Resurrection Kit at the ambulance at the start');
if (lootSpots.indexOf(amb[0]) !== 80 || lootSpots.slice(81).some(s => s.zone !== 'indoor')) afail('ambulance spot should stay at index 80, with only v0.6 indoor spots after it');
if (!freeAt(amb[0].x, amb[0].z, 0.4)) afail('ambulance kit sits inside a solid');
T.player.pos.x = amb[0].x; T.player.pos.z = amb[0].z; step(5);
if (!T.inv.bag.some(e => e.id === 'resurrect') || amb[0].drop) afail('walking onto the kit did not pick it up');
fillDay(1); fillNight();
if (amb[0].drop) afail('day/night refills put loot back at the ambulance');
els.bAgain.fire('click'); T.G.running = true; T.player.inv = 1e9;
const { setTipsOff } = await import('../src/ui/tips.js');
setTipsOff(true); setTipsOff(false);   // same as turning tips off and on in the pause menu: shows them all again
T.G.min = 7 * 60 + 40; step(3);
const tip1 = els.tipText.textContent;
if (!tip1.includes('วงแหวน')) afail('first tip should explain loot rings, got: ' + tip1);
step(600);
const tip2 = els.tipText.textContent;
if (tip2 === tip1) afail('tip queue did not advance after 9 s');
const seenTips = JSON.parse(store.get('ordinary-day.tips') || '{}').seen || {};
console.log('ambulance kit + tips:', amb[0].x, amb[0].z, '| tips seen', Object.keys(seenTips).join(','), '| now:', tip2.slice(0, 40));

// 8) v0.5: melee durability, hunger/thirst, Armor Walker back, Tyrant smashing, difficulty
const vfail = m => errs.push('v0.5 test: ' + m);
const { DEF: D5, durPct } = await import('../src/config/items.js');
const { meleeHit } = await import('../src/systems/combat.js');
const { hurtZombie } = await import('../src/entities/ai.js');
const { eatBest } = await import('../src/systems/inventory.js');
const { breakables } = await import('../src/world/props.js');
const { solids } = await import('../src/world/collision.js');
const { smashNear } = await import('../src/systems/obstacles.js');
els.bAgain.fire('click'); T.G.running = true; T.player.inv = 1e9;
// durability
const pipe = T.makeItem('pipe_c');
if (!(pipe.dur >= 36 && pipe.dur <= 90)) vfail('found pipe durability out of range: ' + pipe.dur);
if (durPct({ id: 'knife_c' }) !== 1) vfail('pre-v0.5 knife without dur should count as new');
T.inv.eq.melee = { id: 'knife_c', mag: 0, dur: 1 }; T.inv.active = 'melee'; T.player.face = 0;
const victim = T.makeAgent(T.player.pos.x, T.player.pos.z + 1); T.becomeZombie(victim, 'zombie'); T.agents.push(victim);
meleeHit(T.player, D5.knife_c);
if (T.inv.eq.melee !== null) vfail('knife at 1 durability did not break after a hit');
// hunger and thirst
T.player.food = 50; T.player.water = 50; step(600);
const f1 = T.player.food, w1 = T.player.water;
if (!(f1 < 50 && w1 < 50 && 50 - w1 > 50 - f1)) vfail('needs did not drain (water faster): food ' + f1.toFixed(2) + ' water ' + w1.toFixed(2));
T.inv.bag.push({ id: 'water', n: 1 }, { id: 'canned', n: 1 }); T.player.water = 10; eatBest(T.player);
if (T.player.water < 59 || T.inv.bag.some(e => e.id === 'water')) vfail('G did not drink the water first when thirstier');
T.player.hp = 60; T.player.food = 0; T.player.water = 80; const hp0 = T.player.hp; step(120);
if (!(T.player.hp < hp0)) vfail('empty food bar did not drain HP');
for (const a of T.agents) a.gone = true; step(2);   // nobody else may hit the player during this check
T.player.inv = 0; T.inv.bag = T.inv.bag.filter(e => e.id !== 'resurrect'); T.player.food = 0; T.player.water = 0; T.player.hp = 0.5; step(30);
if (T.player.alive || T.G.endCause !== 'starved') vfail('starving did not end the game as starved (cause ' + T.G.endCause + ')');
// Armor Walker: front armored, back full damage
els.bAgain.fire('click'); T.G.running = true; T.player.inv = 1e9;
const arm = T.makeAgent(T.player.pos.x + 6, T.player.pos.z); T.becomeZombie(arm, 'armor'); arm.face = 0; T.agents.push(arm);
const front = hurtZombie(arm, 20, 0, -1, 0, true), hpA = arm.hp, back = hurtZombie(arm, 20, 0, 1, 0, true);
if (!front || back || hpA !== 140 || arm.hp !== 120) vfail('armor front/back: front ' + front + ' back ' + back + ' hp ' + hpA + ' -> ' + arm.hp);
// Tyrant smashing, reset restores, save/load keeps it broken
const carB = breakables.find(b => b.kind === 'car'), bi = breakables.indexOf(carB);
if (!carB || !smashNear(carB.x, carB.z, 3) || solids.includes(carB.box) || !T.G.broken.includes(bi)) vfail('smashNear did not break the car');
S.saveGame(); els.bAgain.fire('click');
if (carB.broken || !solids.includes(carB.box)) vfail('new game did not restore the smashed car');
S.loadGame();
if (!carB.broken || solids.includes(carB.box)) vfail('loading the save did not re-break the car');
// difficulty: only the damage the player takes changes here
const hit = diff => { els.bAgain.fire('click'); T.G.diff = diff; T.G.running = true; T.player.inv = 0; T.player.hp = 100; hurtPlayer(T.player, 10); return 100 - T.player.hp; };
const dE = hit('easy'), dN = hit('normal'), dH = hit('hard');
if (Math.abs(dE - 6) > 1e-6 || Math.abs(dN - 10) > 1e-6 || Math.abs(dH - 14) > 1e-6) vfail('difficulty damage scale: ' + [dE, dN, dH].join('/'));
T.G.diff = 'hard'; T.G.endCause = 'hurt'; T.G.over = false; gameOver();
const bestAll = JSON.parse(store.get('ordinary-day.best') || '{}');
if (!bestAll.hard || !els.oEyebrow.textContent.includes('ยาก')) vfail('records not kept per difficulty: ' + store.get('ordinary-day.best'));
T.G.diff = 'normal';
console.log('v0.5: durability, needs (food', (50 - f1).toFixed(2), 'water', (50 - w1).toFixed(2), 'in 10 s), armor back, tyrant smash + save, difficulty', [dE, dN, dH].join('/'));

// 9) v0.6: enterable buildings, doors, walls block sight and blows, zombies break doors
const ifail = m => errs.push('v0.6 test: ' + m);
const I = await import('../src/world/interiors.js');
const Dr = await import('../src/systems/doors.js');
const { buildings } = await import('../src/world/city.js');
const { makeNoise } = await import('../src/entities/ai.js');
const { DOOR_HP, HEAR_WALL } = await import('../src/config/shelter.js');
const rooms = I.rooms;
if (rooms.length < 6) ifail('only ' + rooms.length + ' enterable buildings');
for (const r of rooms) {
  if (solids.includes(r.b.box)) ifail('a room still has its solid footprint');
  if (!freeAt(r.dx + r.n[0] * 1.4, r.dz + r.n[1] * 1.4, .5)) ifail('a doorway opens onto something solid');
  if (!freeAt((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, .5)) ifail('a room centre is blocked by furniture');
}
const indoorSpots = lootSpots.filter(s => s.zone === 'indoor').length;
// a clean world: no people or zombies but the ones each check adds
const clear = () => { els.bAgain.fire('click'); T.G.running = true; for (const a of T.agents) a.gone = true; step(2); T.player.inv = 0; T.player.hp = 100; };
const zAt = (x, z, kind = 'zombie') => { const a = T.makeAgent(x, z); T.becomeZombie(a, kind); T.agents.push(a); return a; };
const r = rooms[0], k = 0, [nx, nz] = r.n, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
// walking in turns the cutaway on, and the door can be shut behind
clear(); T.player.pos.x = cx; T.player.pos.z = cz; step(2);
if (T.player.room !== k || I.shownRoom() !== k || !r.cut.visible || r.b.meshes[0].visible) ifail('cutaway did not switch on inside the room');
T.player.pos.x = r.dx - nx * .2; T.player.pos.z = r.dz - nz * .2; step(1);
if (Dr.toggleDoor(T.player, k)) ifail('door closed on a player standing in the doorway');
T.player.pos.x = r.dx - nx * 1.2; T.player.pos.z = r.dz - nz * 1.2; step(1);
if (T.player.nearDoor !== k) ifail('door prompt did not show next to the door');
key('KeyE', 'keydown'); key('KeyE', 'keyup');
if (T.G.doors[k].open || !solids.includes(r.doorBox)) ifail('E did not close the door');
// a zombie outside does not see a player deep inside, cannot hit through the wall, and is not reached by melee
T.player.pos.x = cx - nx * 1.5; T.player.pos.z = cz - nz * 1.5; step(1);
const zo = zAt(r.dx + nx * 6, r.dz + nz * 6); step(60 * 4);
if (T.player.hp < 100 || I.roomAt(zo.pos.x, zo.pos.z) === k) ifail('zombie outside got at the player through a closed door');
// a noise inside brings it to the door, and it breaks the door down
makeNoise(T.player.pos.x, T.player.pos.z, 40); step(60 * 20);
if (!T.G.doors[k].broken) ifail('zombie did not break the door (hp ' + T.G.doors[k].hp + ', zombie at ' + zo.pos.x.toFixed(1) + ',' + zo.pos.z.toFixed(1) + ')');
step(60 * 3);
if (!(T.player.hp < 100)) ifail('zombie did not come through the broken door');
// a zombie behind the building walks round to the door when it hears the player right behind the wall
clear(); const r2 = rooms[1], [mx, mz] = r2.n, c2x = (r2.x0 + r2.x1) / 2, c2z = (r2.z0 + r2.z1) / 2, depth2 = mx ? (r2.x1 - r2.x0) : (r2.z1 - r2.z0);
T.player.pos.x = c2x - mx * (depth2 / 2 - .6); T.player.pos.z = c2z - mz * (depth2 / 2 - .6); step(1);
const zb = zAt(c2x - mx * (depth2 / 2 + 1.4), c2z - mz * (depth2 / 2 + 1.4));step(60 * 25);
if (!(T.player.hp < 100) || I.roomAt(zb.pos.x, zb.pos.z) !== 1) ifail('zombie behind the building did not find the door (at ' + zb.pos.x.toFixed(1) + ',' + zb.pos.z.toFixed(1) + ' room ' + I.roomAt(zb.pos.x, zb.pos.z) + ')');
// melee does not reach through a wall
clear(); T.player.pos.x = c2x - mx * (depth2 / 2 - .5); T.player.pos.z = c2z - mz * (depth2 / 2 - .5); T.player.face = Math.atan2(-mx, -mz);
const zw = zAt(c2x - mx * (depth2 / 2 + .9), c2z - mz * (depth2 / 2 + .9)); zw.feed = 99; meleeHit(T.player, D5.bat_c);
if (zw.hp < 30) ifail('melee hit through a wall');
// closed doors muffle noise
clear(); T.player.pos.x = cx; T.player.pos.z = cz; Dr.toggleDoor(T.player, k);
const zn = zAt(r.dx + nx * 16, r.dz + nz * 16); zn.feed = 99; makeNoise(cx, cz, 25);
const heardShut = !!zn.heard; Dr.toggleDoor(T.player, k); makeNoise(cx, cz, 25);
if (heardShut || !zn.heard) ifail('door did not muffle noise (shut ' + heardShut + ', open ' + !!zn.heard + ')');
// door state survives save / new game / load
Dr.toggleDoor(T.player, k); T.G.doors[k].hp = 50; S.saveGame(); els.bAgain.fire('click');
if (!T.G.doors[k].open || T.G.doors[k].hp !== DOOR_HP || solids.includes(r.doorBox)) ifail('new game did not reset the doors');
S.loadGame();
if (T.G.doors[k].open || T.G.doors[k].hp !== 50 || !solids.includes(r.doorBox)) ifail('loading the save lost the door state');
console.log('v0.6:', rooms.length, 'enterable buildings of', buildings.length, '(doors facing the camera:', rooms.filter(r => r.n[0] > 0 || r.n[1] > 0).length + ')', '|', indoorSpots, 'indoor loot spots | door broken, wall sight, round-the-corner, noise, save OK');

// 10) v0.6.1 regressions: dropped items must not bounce back, a full bag says so, drops stay reachable
const rfail = m => errs.push('v0.6.1 test: ' + m);
const Inv6 = await import('../src/systems/inventory.js');
const { reachableSpot, spawnDrop: spawnD } = await import('../src/systems/drops.js');
const spawnDropAt = (id, x, z) => spawnD({ id, n: 6 }, x, z);
clear(); T.player.inv = 1e9;
T.inv.bag = [{ id: 'a9', n: 30 }]; Inv6.dropItem(T.player, T.inv.bag.shift()); step(30);
if (T.inv.bag.length) rfail('dropped ammo bounced straight back into the bag');
const dropped = T.drops[T.drops.length - 1];
if (Math.hypot(dropped.x - T.player.pos.x, dropped.z - T.player.pos.z) < 1) rfail('dropped item landed under the player');
T.player.pos.x += 3; step(2); T.player.pos.x = dropped.x; T.player.pos.z = dropped.z; step(2);
if (!T.inv.bag.some(e => e.id === 'a9')) rfail('dropped ammo could not be picked up again after walking away');
T.inv.bag = []; for (let i = 0; i < T.inv.cap; i++) T.inv.bag.push({ id: 'pistol_c', mag: 0 });
const nDrops = T.drops.length; spawnDropAt('a12', T.player.pos.x, T.player.pos.z); step(2);
if (T.drops.length !== nDrops + 1 || els.bPick.hidden || !els.pickName.textContent.includes('กระเป๋าเต็ม')) rfail('full bag did not show the bag-full button over ammo');
key('KeyE', 'keydown'); if (els.bag.hidden) rfail('E over ammo with a full bag did not open the bag'); els.bagClose.fire('click');
let unreachable = 0;
for (const b of solids.slice(0, 200)) { const [x, z] = reachableSpot(b.x0 + .25, (b.z0 + b.z1) / 2); if (!freeAt(x, z, .3)) unreachable++; }   // a drop just inside the edge, like one knocked out of a dying zombie
if (unreachable) rfail(unreachable + ' drops inside solids could not be moved somewhere reachable');
console.log('v0.6.1: drop does not bounce back, full-bag button, drops moved out of solids');

// 11) v0.6.2: bug report from the pause menu
clear(); key('KeyP', 'keydown'); els.bReport.fire('click');
const info = els.reportText.value;
if (els.reportBox.hidden || !els.pacts.hidden) errs.push('v0.6.2 test: bug report panel did not open');
if (!/เวอร์ชัน: \d+\.\d+/.test(info) || !info.includes('วันที่') || !info.includes('อุปกรณ์')) errs.push('v0.6.2 test: report is missing version, day or device: ' + info.slice(0, 80));
const { VERSION } = await import('../src/config/version.js');
if (!els.verLabel.textContent.endsWith(VERSION)) errs.push('v0.6.2 test: version label not set to ' + VERSION);
els.bReportBack.fire('click'); if (!els.reportBox.hidden) errs.push('v0.6.2 test: back did not close the report panel');
key('KeyP', 'keydown');
console.log('v0.6.2: bug report', info.split('\n').length, 'lines |', info.split('\n')[0]);

// 12) v0.7: scarcer loot, scent, planks, sneak, bottles
const sfail = m => errs.push('v0.7 test: ' + m);
const L7 = await import('../src/config/loot.js');
const D7 = await import('../src/systems/drops.js');
const Sh = await import('../src/config/shelter.js');
const Th = await import('../src/systems/throw.js');
if (L7.refillScale(1) !== 1 || !(L7.refillScale(7) < .5) || L7.refillScale(30) !== L7.REFILL.floor) sfail('refill scale by day');
clear();
const far = D7.spawnDrop({ id: 'a9', n: 5 }, T.player.pos.x + 40, T.player.pos.z), mine = D7.spawnDrop({ id: 'a9', n: 5 }, T.player.pos.x + 41, T.player.pos.z); mine.mine = true;
const police = lootSpots.find(s => s.zone === 'police'); if (police.drop) D7.removeDrop(police.drop); D7.spawnDrop({ id: 'a9', n: 5 }, police.x, police.z, police);
for (let i = 0; i < 40 && T.drops.includes(far); i++) D7.takeByOthers([T.player]);
if (T.drops.includes(far) || !T.drops.includes(mine) || !police.drop) sfail('other survivors: far loot should go, own drops and police spots stay');
// scent: hide in a closed room at night, a zombie 20 m away is sent to the door
clear(); T.G.phase = 'night'; T.G.min = 22 * 60;
const r7 = rooms[2], k7 = 2; T.player.pos.x = (r7.x0 + r7.x1) / 2; T.player.pos.z = (r7.z0 + r7.z1) / 2; step(1); Dr.toggleDoor(T.player, k7);
const zs = zAt(r7.dx + r7.n[0] * 18, r7.dz + r7.n[1] * 18); zs.feed = 1e9; step(1);
if (zs.heard && zs.heard.t > 0) sfail('zombie smelled the player straight away');
T.G.min += Sh.SCENT_AFTER + 1; step(2);
if (!zs.heard || Math.hypot(zs.heard.x - T.player.pos.x, zs.heard.z - T.player.pos.z) > 1) sfail('scent did not send the zombie after ' + Sh.SCENT_AFTER + ' min in one building');
// planks: board a closed door, rebuild a broken one
T.inv.bag = [{ id: 'planks', n: 3 }]; T.player.pos.x = r7.dx - r7.n[0] * 1.2; T.player.pos.z = r7.dz - r7.n[1] * 1.2; step(1);
if (T.player.fixDoor !== k7 || els.bFix.hidden) sfail('hammer button did not show by a closed door with planks');
key('KeyB', 'keydown');
if (T.G.doors[k7].hp !== Sh.DOOR_HP + Sh.PLANK_HP) sfail('B did not board the door (hp ' + T.G.doors[k7].hp + ')');
Object.assign(T.G.doors[k7], { open: true, broken: true, hp: 0 }); Dr.applyDoors(T.G.doors); step(1);
key('KeyB', 'keydown');
if (T.G.doors[k7].broken || T.G.doors[k7].open || T.G.doors[k7].hp !== Sh.REBUILT_HP || T.inv.bag.some(e => e.id === 'planks')) sfail('rebuilding the broken door went wrong: ' + JSON.stringify(T.G.doors[k7]) + ' bag ' + JSON.stringify(T.inv.bag));
// sneak: a zombie 10 m away notices a walking player but not a sneaking one
const sense = (sneak) => { clear(); T.G.phase = 'night'; T.G.min = 22 * 60; const z = zAt(T.player.pos.x + 10, T.player.pos.z); if (sneak) key('KeyC', 'keydown'); step(3); key('KeyC', 'keyup'); return !!z.seenP; };
const seenWalking = sense(false), seenSneaking = sense(true);
if (!seenWalking || seenSneaking) sfail('sneak: seen walking ' + seenWalking + ', seen sneaking ' + seenSneaking);
// bottle: thrown, breaks, the noise pulls a zombie
clear(); T.G.phase = 'night'; T.G.min = 22 * 60; T.player.face = 0; T.inv.bag = [{ id: 'bottle', n: 1 }];
const zb7 = zAt(T.player.pos.x + 20, T.player.pos.z + 8); zb7.feed = 1e9;
key('KeyQ', 'keydown'); key('KeyQ', 'keyup'); step(60);
if (T.inv.bag.length || !zb7.heard || zb7.heard.t <= 0) sfail('bottle did not draw the zombie (heard ' + JSON.stringify(zb7.heard) + ')');
console.log('v0.7: scarcer loot, scent after', Sh.SCENT_AFTER, 'min, planks board + rebuild, sneak, bottle noise');

// 13) v0.8: daily events, settings, music
const efail = m => errs.push('v0.8 test: ' + m);
const Ev = await import('../src/systems/events.js');
const St = await import('../src/ui/settings.js');
const { updateMusic } = await import('../src/systems/audio.js');
clear();
for (let day = 2; day <= 7; day++) if (!T.G.plan.some(e => Math.floor(e.at / 1440) + 1 === day)) efail('day ' + day + ' has no event');
if (T.G.plan.some(e => e.kind === 'horde' && Math.floor(e.at / 1440) + 1 < 3)) efail('horde before day 3');
// airdrop now: crate + loot + map marker, gone the next morning (its loot stays)
T.G.min = 1440 + 11 * 60; T.G.plan = [{ kind: 'airdrop', at: T.G.min + 1, done: false }]; const nd = T.drops.length; step(20);
if (!T.G.drop || T.drops.length < nd + 5) efail('airdrop: drop ' + JSON.stringify(T.G.drop) + ', items ' + (T.drops.length - nd));
const dropAt = T.G.drop && { ...T.G.drop };
if (dropAt && T.drops.some(d => Math.hypot(d.x - dropAt.x, d.z - dropAt.z) < 3 && d.item.id.endsWith('_p'))) efail('daytime airdrop had Police loot');
S.saveGame(); els.bAgain.fire('click'); if (T.G.drop) efail('new game kept the airdrop');
S.loadGame(); if (!T.G.drop || !solids.some(b => Math.abs((b.x0 + b.x1) / 2 - dropAt.x) < .01 && Math.abs((b.z0 + b.z1) / 2 - dropAt.z) < .01)) efail('loading did not bring the crate back');
T.G.running = true; T.player.inv = 1e9; T.G.min = 2 * 1440 + 6 * 60 + 5; step(3);
if (T.G.drop) efail('crate still there the next morning');
// horde: marches along a road and leaves
clear(); T.G.min = 2 * 1440 + 22 * 60; T.G.phase = 'night'; T.G.plan = [{ kind: 'horde', at: T.G.min, done: false }];
step(3); const horde = T.agents.filter(a => a.march);
if (horde.length < 6) efail('horde spawned ' + horde.length);
const h0 = horde[0] && Math.hypot(horde[0].march.x - horde[0].pos.x, horde[0].march.z - horde[0].pos.z); T.player.pos.x = 999; step(60 * 8); T.player.pos.x = 5.3;
if (horde[0] && !horde[0].gone && Math.hypot(horde[0].march.x - horde[0].pos.x, horde[0].march.z - horde[0].pos.z) > h0 - 5) efail('horde did not march');
// blackout
clear(); T.G.min = 3 * 1440 + 19 * 60 - 1; T.G.phase = 'night'; T.G.plan = [{ kind: 'blackout', at: T.G.min, done: false }]; step(5);
if (!T.G.blackout) efail('blackout did not start');
T.G.min = 4 * 1440 + 6 * 60 + 1; step(3); if (T.G.blackout) efail('blackout did not end at dawn');
// settings are remembered; music runs without WebAudio
els.optFps.checked = true; els.optFps.fire('change');
if (!JSON.parse(store.get('ordinary-day.settings')).fps) efail('settings not saved');
els.optFps.checked = false; els.optFps.fire('change');
updateMusic({ night: 1, outbreak: true, danger: 1 });
console.log('v0.8: events plan', T.G.plan.map(e => e.kind[0]).join(''), '| airdrop, horde of', horde.length, ', blackout, settings saved');

// 14) v0.9: two players in one game (the second one driven by a bot through p.input), fixed simulation steps
const mfail = m => errs.push('v0.9 test: ' + m);
const Game = await import('../src/systems/game.js');
const Inv9 = await import('../src/systems/inventory.js');
const Cb = await import('../src/systems/combat.js');
clear(); T.player.inv = 1e9;
const p2 = Game.addPlayer(); p2.inv = 1e9;
if (P.players.length !== 2 || p2.local || P.player !== P.players[0]) mfail('addPlayer did not add a second, non-local player');
// own gear: what p2 picks up is p2's
const d9 = T.makeItem('a9'); const dd = (await import('../src/systems/drops.js')).spawnDrop(d9, p2.pos.x, p2.pos.z); Inv9.pickup(p2, dd);
if (!p2.gear.bag.some(e => e.id === 'a9') || T.inv.bag.some(e => e.id === 'a9')) mfail('p2 pickup went to the wrong bag');
// the bot walks: input moves p2, not p1
const p1x = T.player.pos.x, p2x = p2.pos.x; Object.assign(p2.input, { mx: 1, mz: 0, mag: 1 }); step(60); Object.assign(p2.input, { mx: 0, mz: 0, mag: 0 });
if (!(p2.pos.x > p2x + 2) || Math.abs(T.player.pos.x - p1x) > .5) mfail('bot input moved the wrong player (p2 ' + (p2.pos.x - p2x).toFixed(2) + ', p1 ' + (T.player.pos.x - p1x).toFixed(2) + ')');
// a zombie next to p2 and far from p1 goes for p2
T.G.min = 22 * 60; T.G.phase = 'night'; p2.inv = 0; p2.hp = 100; T.player.hp = 100;
const z9 = zAt(p2.pos.x + 1.2, p2.pos.z); step(120);
if (z9.seenP !== p2 || !(p2.hp < 100) || T.player.hp < 100) mfail('zombie should chase and hit the nearer player p2 (seen ' + (z9.seenP === p2 ? 'p2' : z9.seenP === T.player ? 'p1' : 'none') + ', p2 hp ' + p2.hp + ')');
// p2 shoots with its own gun and ammo
z9.gone = true; step(2);
p2.gear.eq.secondary = Object.assign(T.makeItem('pistol_c'), { mag: 5 }); p2.gear.active = 'secondary';
Object.assign(p2.pos, { x: 0, z: 14 }); if (!freeAt(0, 14, .4) || !freeAt(0, 19, .4)) mfail('test spot on the road is blocked');   // the middle of a road: nothing in the line of fire
const target = zAt(0, 19); target.feed = 1e9; p2.face = 0; p2.input.aim = false;
Object.assign(p2.input, { fire: true, fireQ: .2 }); step(4); Object.assign(p2.input, { fire: false, fireQ: 0 });
if (!(p2.gear.eq.secondary.mag < 5) || !(target.hp < 30)) mfail('p2 could not shoot its own pistol (mag ' + p2.gear.eq.secondary.mag + ', target hp ' + target.hp + ')');
// one player down is not game over; both are
T.player.inv = 0; T.inv.bag = []; Cb.hurtPlayer(T.player, 9999); step(150);
if (T.G.over || !T.player.alive || !(T.player.bleed > 0)) mfail('with p2 standing, p1 should be down and waiting for help (alive ' + T.player.alive + ', over ' + T.G.over + ')');
p2.inv = 0; p2.gear.bag = []; Cb.hurtPlayer(p2, 9999);
await new Promise(r => setTimeout(r, 1900)); if (!T.G.over) mfail('game did not end with every player dead');
// save / load keeps both players with their own gear
clear(); const q2 = Game.addPlayer(); q2.gear.bag.push({ id: 'planks', n: 4 }); q2.pos.x += 3; T.inv.bag.push({ id: 'water', n: 2 });
S.saveGame(); els.bAgain.fire('click'); S.loadGame();
const s2 = P.players[1];
if (P.players.length !== 2 || !s2.gear.bag.some(e => e.id === 'planks') || !T.inv.bag.some(e => e.id === 'water') || s2.gear.bag.some(e => e.id === 'water')) mfail('save/load lost a player or mixed their bags');
// an old (v1) save still loads as one player
store.set('ordinary-day.save', JSON.stringify({ v: 1, savedAt: 0, G: Object.assign({}, T.G, { stay: null }), player: { x: 10, z: 10, face: 0, hp: 77, down: 0, inv: 0, infect: 0, infWarn: 0, food: 50, water: 60, sinceHit: 9 }, inv: { bag: [{ id: 'a9', n: 7 }], cap: 6, eq: { primary: null, secondary: null, melee: null }, active: 'melee' }, agents: [], drops: [] }));
if (!S.loadGame() || P.players.length !== 1 || Math.round(T.player.hp) !== 77 || !T.inv.bag.some(e => e.id === 'a9' && e.n === 7)) mfail('a v1 save did not load into one player');
// the rescue waits for every live player
clear(); const r3 = Game.addPlayer(); T.player.inv = r3.inv = 1e9;
T.G.min = 7 * 1440 + 9 * 60; Object.assign(T.player.pos, { x: LZ.x, z: LZ.z }); step(5);
if (T.G.over) mfail('rescued while the second player was still away');
Object.assign(r3.pos, { x: LZ.x + 1, z: LZ.z }); step(5);
if (!T.G.over || T.G.endCause !== 'won') mfail('not rescued with both players at the LZ');
// fixed steps: game time per real second does not depend on the frame rate
clear(); const t0 = T.G.min; for (let i = 0; i < 60; i++) { now += 16.7; raf(now); } const fast = T.G.min - t0;
const t1 = T.G.min; for (let i = 0; i < 20; i++) { now += 50; raf(now); } const slow = T.G.min - t1;
if (Math.abs(fast - slow) > .2) mfail('game time per second differs with frame rate: 60 fps ' + fast.toFixed(2) + ' vs 20 fps ' + slow.toFixed(2));
console.log('v0.9: two players (own gear, bot input, nearest target, own gun, game over when all dead, save v2 + v1 upgrade, rescue waits for both), fixed steps', fast.toFixed(2), '/', slow.toFixed(2), 'min');

// 15) v0.10: downed and helped up, the world scales with the number of players
const dfail = m => errs.push('v0.10 test: ' + m);
const Pt = await import('../src/config/party.js');
// alone: 0 HP is death, as before
clear(); T.inv.bag = []; Cb.hurtPlayer(T.player, 9999);
if (T.player.alive || T.player.bleed > 0) dfail('a solo player went down instead of dying');
// with a teammate: down, cannot act, can crawl, hits shorten the clock
clear(); let b2 = Game.addPlayer(); T.player.inv = 1e9; b2.inv = 0;
b2.gear.eq.secondary = Object.assign(T.makeItem('pistol_c'), { mag: 5 }); b2.gear.active = 'secondary';
Cb.hurtPlayer(b2, 9999);
if (!b2.alive || b2.bleed !== Pt.BLEED_SECONDS || T.G.over) dfail('p2 did not go down (alive ' + b2.alive + ', bleed ' + b2.bleed + ')');
const bx = b2.pos.x; Object.assign(b2.input, { mx: 1, mz: 0, mag: 1, fire: true, fireQ: .2 }); step(60); Object.assign(b2.input, { mx: 0, mz: 0, mag: 0, fire: false, fireQ: 0 });
const crawled = b2.pos.x - bx;
if (!(crawled > .2 && crawled < Pt.CRAWL_SPEED * 1.2)) dfail('crawl moved ' + crawled.toFixed(2) + ' m in 1 s');
if (b2.gear.eq.secondary.mag !== 5) dfail('a downed player fired');
const dd10 = (await import('../src/systems/drops.js')).spawnDrop(T.makeItem('a9'), b2.pos.x, b2.pos.z);
if (Inv9.pickup(b2, dd10)) dfail('a downed player picked something up');
Inv9.switchTo(b2, 'melee'); if (b2.gear.active !== 'secondary') dfail('a downed player switched weapons');
const bl = b2.bleed; Cb.hurtPlayer(b2, 10); if (!(b2.bleed < bl - 3)) dfail('a hit on a downed player did not shorten the clock');
// helped up: the teammate stands next to them for REVIVE_SECONDS
Object.assign(T.player.pos, { x: b2.pos.x - 1, z: b2.pos.z }); T.player.inv = 0; step(2);
if (T.player.nearDown !== b2) dfail('the teammate next to a downed player is not offered to help');
P.startHelp(T.player, b2); step(Math.round(Pt.REVIVE_SECONDS * 60 / 2));
if (!(b2.reviveT > .3 && b2.reviveT < .7)) dfail('revive progress ' + b2.reviveT);
step(Math.round(Pt.REVIVE_SECONDS * 60 / 2) + 5);
if (b2.bleed > 0 || !b2.alive || Math.round(b2.hp) !== Pt.REVIVE_HP) dfail('not helped up (bleed ' + b2.bleed + ', hp ' + b2.hp + ')');
// helping stops when the helper walks off
b2.inv = 0; Cb.hurtPlayer(b2, 9999); P.startHelp(T.player, b2); step(60);
const { keys } = await import('../src/core/controls.js'); keys.KeyD = true; step(10); keys.KeyD = false;
if (T.player.helping || b2.reviveT !== 0) dfail('walking off did not stop helping');
// bleeding out is death; the other player plays on
step(Math.round(Pt.BLEED_SECONDS * 60) + 10);
if (b2.alive || T.G.over) dfail('bleed-out: p2 alive ' + b2.alive + ', game over ' + T.G.over);
// a downed player is saved and loaded as down
clear(); b2 = Game.addPlayer(); b2.inv = 0; Cb.hurtPlayer(b2, 9999); S.saveGame(); els.bAgain.fire('click'); S.loadGame();
if (!(P.players[1] && P.players[1].bleed > 0)) dfail('save/load lost the downed state');
// turning from the infection is never a downed state
clear(); b2 = Game.addPlayer(); T.player.inv = 1e9; T.player.infect = .9999; step(30);
if (T.player.alive) dfail('a player who turned went down instead of dying');
// only one left standing goes down: everyone left is dead and the game ends
clear(); b2 = Game.addPlayer(); T.inv.bag = []; b2.gear.bag = []; Cb.hurtPlayer(b2, 9999); Cb.hurtPlayer(T.player, 9999);
if (b2.alive || T.player.alive) dfail('nobody standing, but someone is still down');
await new Promise(r => setTimeout(r, 1900)); if (!T.G.over) dfail('game did not end when nobody was left standing');
// party scaling: a horde for two is bigger than for one, solo is unchanged
const hordeFor = n => { clear(); for (let i = 1; i < n; i++) Game.addPlayer(); for (const p of P.players) p.inv = 1e9;
  T.G.min = 4 * 1440 + 22 * 60; T.G.phase = 'night'; T.G.plan = [{ kind: 'horde', at: T.G.min, done: false }]; step(2); return T.agents.filter(a => a.march).length; };
const h1 = hordeFor(1), h2 = hordeFor(2);
const { HORDE } = await import('../src/config/events.js');
if (!(h2 > h1) || h1 !== Math.min(HORDE.max, HORDE.base + 5)) dfail('horde: solo ' + h1 + ', two players ' + h2);
if (Pt.partyOf(1, 'spawn') !== 0 || Pt.partyOf(1, 'loot') !== 1 || Pt.partyOf(1, 'horde') !== 1 || Pt.partyOf(1, 'airdrop') !== 0) dfail('solo is scaled');
console.log('v0.10: solo death, downed (crawl', crawled.toFixed(2), 'm/s, no actions), helped up, walk-off cancels, bleed-out, save, infection, wipe; horde solo', h1, '/ two', h2);

console.log(errs.length ? `FAILED: ${errs.length} runtime errors\n` + errs.slice(0, 3).join('\n---\n') : 'PASSED: no runtime errors');
process.exit(errs.length ? 1 : 0);
