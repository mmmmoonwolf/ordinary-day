// Headless smoke test for Ordinary Day.
// Runs the game logic for ~2 in-game days with THREE.js and the DOM replaced by stubs,
// then spawns every zombie class next to the player and fires every weapon type.
// It catches runtime errors in game logic only; it does not check rendering.
// Usage: node tools/smoke-test.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let src = scripts[scripts.length - 1];
// expose internals for the combat test
src = src.replace(/\}\)\(\);\s*$/, 'global.__T={inv,DEF,get player(){return player},makeItem,G,agents,becomeZombie,makeAgent,drops,renderBag,openBag,closeBag};})();');

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
const startHidden = new Set(['boss', 'bag', 'pOver', 'joy', 'bPick']);
function el(id) {
  const h = {};
  const e = {
    id, style: { setProperty() {}, removeProperty() {} }, classList: { toggle() {}, remove() {}, add() {} }, dataset: {}, children: [],
    hidden: startHidden.has(id), textContent: '', innerHTML: '', className: '', disabled: false,
    appendChild(c) { this.children.push(c); c.remove = () => { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    get firstChild() { return this.children[0]; },
    addEventListener(t, fn) { (h[t] = h[t] || []).push(fn); },
    fire(t, ev) { (h[t] || []).forEach(f => f(Object.assign({ preventDefault() {}, pointerType: 'touch', pointerId: 1, clientX: 300, clientY: 300, button: 0, target: e }, ev || {}))); },
    focus() {}, setPointerCapture() {}, querySelector() { return el('q'); },
  };
  return e;
}
const els = {};
const handlers = {};
let raf = null;
global.THREE = any();
global.document = { getElementById: id => els[id] || (els[id] = el(id)), createElement: t => { const e = el(t); e.getContext = () => any(); return e; }, querySelectorAll: () => [] };
global.matchMedia = () => ({ matches: false });
global.innerWidth = 1200; global.innerHeight = 800; global.devicePixelRatio = 1;
global.requestAnimationFrame = f => { raf = f; };
global.addEventListener = (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); };
global.window = global;

eval(src);

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
const T = global.__T, p = T.player;
T.inv.eq.primary = T.makeItem('lmg_m'); T.inv.eq.primary.mag = 100;
T.inv.eq.secondary = T.makeItem('pistol_p'); T.inv.eq.melee = T.makeItem('axe_m'); T.inv.cap = 14;
T.inv.bag.push({ id: 'a556', n: 90 }, { id: 'a9', n: 60 }, { id: 'resurrect', n: 1 }, { id: 'firstaid', n: 2 }, T.makeItem('sniper_m'), { id: 'a762', n: 20 }, T.makeItem('shotgun_m'), { id: 'a12', n: 24 });
T.G.min = 18 * 60 + 20; step(200);
for (const k of ['zombie', 'sprinter', 'boomer', 'armor', 'tyrant', 'armor', 'boomer']) { const a = T.makeAgent(p.pos.x + 3 + Math.random() * 4, p.pos.z + 3); T.becomeZombie(a, k); T.agents.push(a); }
for (const slot of ['Digit1', 'Digit2', 'Digit3', 'Digit1']) { key(slot, 'keydown'); for (let i = 0; i < 40; i++) { key('Space', 'keydown'); step(15); key('Space', 'keyup'); step(5); } key('KeyR', 'keydown'); step(150); }
T.openBag(); T.renderBag(); T.closeBag();
console.log('combat: hp', Math.round(p.hp), 'kills', T.G.kills, 'resurrect used', !T.inv.bag.some(e => e.id === 'resurrect'));
for (let i = 0; i < 20; i++) { key('Space', 'keydown'); step(300); key('Space', 'keyup'); }
console.log('after night:', els.clock.textContent, els.phaseName.textContent, 'zombie kinds', [...new Set(T.agents.filter(a => a.state === 'zombie').map(a => a.kind))].join(','));

console.log(errs.length ? `FAILED: ${errs.length} runtime errors\n` + errs.slice(0, 3).join('\n---\n') : 'PASSED: no runtime errors');
process.exit(errs.length ? 1 : 0);
