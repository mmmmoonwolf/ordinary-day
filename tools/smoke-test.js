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
const startHidden = new Set(['boss', 'bag', 'pOver', 'joy', 'bPick', 'pause']);
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
    focus() {}, setPointerCapture() {}, querySelector() { return el('q'); }, getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0 }; },
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
const { inv } = await import('../src/systems/inventory.js');
const { renderBag, openBag, closeBag } = await import('../src/ui/bag.js');
const S = await import('../src/systems/save.js');
const { hurtPlayer } = await import('../src/systems/combat.js');
const { infectPlayer } = await import('../src/systems/infection.js');
const { useHeal } = await import('../src/systems/inventory.js');
const { gameOver } = await import('../src/ui/hud.js');
const { LZ } = await import('../src/config/goal.js');
const T = { inv, get player() { return P.player; }, makeItem, drops, G, agents, becomeZombie, makeAgent, renderBag, openBag, closeBag };

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
T.inv.bag = T.inv.bag.filter(e => e.id !== 'resurrect'); T.player.inv = 0; T.player.down = 0; hurtPlayer(9999);
if (store.has('ordinary-day.save')) fail('save still exists after death');
console.log('save: restored', live().length, 'agents and', T.drops.length, 'drops at', els.clock.textContent, '| deleted on death', !store.has('ordinary-day.save'));

// 4) infection: progresses with in-game time, blocks regen, Antibiotic cures, a Resurrection Kit clears it, 100% kills
const bad = m => errs.push('v0.4 test: ' + m);
els.bAgain.fire('click'); T.G.running = true;
T.player.hp = 50; infectPlayer(); step(300);
const pc = T.player.infect;
if (!(pc > 0.05 && pc < 0.2)) bad('infection after 5 s should be ~8%, got ' + pc);
if (T.player.hp > 50.01) bad('HP regenerated while infected');
if (els.infRow.hidden) bad('infection bar hidden');
T.inv.bag.push({ id: 'antibiotic', n: 1 }); T.player.hp = T.player.maxHp; useHeal();
if (T.player.infect !== 0 || T.inv.bag.some(e => e.id === 'antibiotic')) bad('Antibiotic did not cure at full HP');
T.inv.bag.push({ id: 'resurrect', n: 1 }); infectPlayer(); T.player.infect = 0.999; step(30);
if (!T.player.alive || T.player.infect !== 0) bad('Resurrection Kit did not save an infected player');
step(240); T.inv.bag = T.inv.bag.filter(e => e.id !== 'resurrect'); T.player.inv = 0;
infectPlayer(); T.player.infect = 0.999; step(30);
if (T.player.alive || T.G.endCause !== 'infected') bad('infection at 100% did not kill (alive ' + T.player.alive + ', cause ' + T.G.endCause + ')');
gameOver();
if (els.oTitle.textContent !== 'คุณกลายเป็นซอมบี้' || !els.sKillsBy.innerHTML.includes('Tyrant') || !els.sBest.innerHTML.includes('สถิติดีสุด')) bad('infected game-over summary not filled');
console.log('infection: after 5 s', (pc * 100).toFixed(1) + '%', '| summary:', els.oTitle.textContent, '|', els.sBest.innerHTML.replace(/<[^>]+>/g, ''));
// 5) goal: day 8 morning, helicopter lands at the LZ, reaching it wins
els.bAgain.fire('click'); T.G.running = true;
T.G.min = 7 * 1440 + 6 * 60 + 5; step(20);
if (!els.msg.textContent.includes('เฮลิคอปเตอร์')) bad('no rescue announcement at dawn of day 8: ' + els.msg.textContent);
if (els.lz.hidden) bad('rescue arrow hidden on day 8 morning');
if (!els.dayline.textContent.includes('รอด 7/7 คืน')) bad('dayline progress: ' + els.dayline.textContent);
T.G.min = 7 * 1440 + 8 * 60 + 30; step(20);
if (T.G.over) bad('won without reaching the LZ');
T.player.pos.x = LZ.x + 1; T.player.pos.z = LZ.z; step(20);
if (!T.G.over || T.G.endCause !== 'won' || els.oTitle.textContent !== 'คุณรอดแล้ว') bad('reaching the helicopter did not win (over ' + T.G.over + ', cause ' + T.G.endCause + ')');
if (store.has('ordinary-day.save')) bad('save kept after winning');
console.log('goal:', els.dayline.textContent, '|', els.oEyebrow.textContent, els.oTitle.textContent, '|', els.sNights.textContent, 'nights | best', store.get('ordinary-day.best'));

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
if (lootSpots.length !== 81 || lootSpots.indexOf(amb[0]) !== 80) afail('ambulance spot should be appended last (index 80 of 81)');
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

console.log(errs.length ? `FAILED: ${errs.length} runtime errors\n` + errs.slice(0, 3).join('\n---\n') : 'PASSED: no runtime errors');
process.exit(errs.length ? 1 : 0);
