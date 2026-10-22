// Headless browser stand-in for the game's tests (tools/smoke-test.js, tools/net-test.js): THREE.js and the DOM
// are replaced by stubs, so the game modules in src/ load and run in Node. Import this before any game module.
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
export const els = {};
export const handlers = {};
let raf = null;
global.THREE = any();
global.document = { getElementById: id => els[id] || (els[id] = el(id)), createElement: t => { const e = el(t); e.getContext = () => any(); return e; }, querySelectorAll: () => [], visibilityState: 'visible', addEventListener: (t, fn) => { (handlers['document:' + t] = handlers['document:' + t] || []).push(fn); } };
global.matchMedia = () => ({ matches: false });
global.innerWidth = 1200; global.innerHeight = 800; global.devicePixelRatio = 1;
global.requestAnimationFrame = f => { raf = f; };
global.addEventListener = (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); };
global.window = global;
export const store = new Map();
global.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };


export const errs = [];
let now = 1000;
// run n frames of ms each (every frame runs the game's requestAnimationFrame loop once)
export function step(n, ms = 16.7) { for (let i = 0; i < n; i++) { now += ms; try { raf(now); } catch (e) { errs.push(e.stack); } } }
export const key = (code, type) => (handlers[type] || []).forEach(f => f({ code, preventDefault() {}, stopPropagation() {}, repeat: false }));
