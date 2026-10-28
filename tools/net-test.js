// Online play test (v0.12). This process is the host; a child process (this file with --client) is a friend who
// joins its room. They talk through Node's IPC channel instead of WebRTC (net/link.js setTransport), so the test
// runs anywhere, CI included, and checks the protocol and both sides' game state, not PeerJS itself.
// Usage: node tools/net-test.js
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { els, errs, step, key } from './headless.js';

const isClient = process.argv.includes('--client');
await import('../src/main.js');
const { setTransport } = await import('../src/net/link.js');
const P = await import('../src/entities/player.js');
const { G } = await import('../src/core/state.js');
const { agents } = await import('../src/entities/agents.js');
const { drops } = await import('../src/systems/drops.js');
const { bus } = await import('../src/core/bus.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = id => document.getElementById(id);

// a link over IPC: `post` sends, incoming {net} messages are fed with `feed`
function ipcLink(post) {
  const on = { data: [], close: [] }; let shut = false;
  const link = { send: o => { if (!shut) post({ net: JSON.parse(JSON.stringify(o)) }); }, onData: f => on.data.push(f), onClose: f => on.close.push(f),
    close: () => { if (shut) return; shut = true; post({ bye: 1 }); on.close.forEach(f => f()); } };
  return { link, feed: m => { if (!shut) on.data.forEach(f => f(m)); }, drop: () => { if (shut) return; shut = true; on.close.forEach(f => f()); } };
}

if (isClient) {
  // ---------- the friend ----------
  let cur = null;
  setTransport({ join: async () => { cur = ipcLink(m => process.send(m)); process.send({ connect: 1 }); return cur.link; } });
  const net = await import('../src/net/client.js');
  const { act } = await import('../src/systems/actions.js');
  process.on('message', async m => {
    if (m.net && cur) cur.feed(m.net);
    else if (m.bye && cur) cur.drop();
    else if (m.ctl) {
      const [cmd, ...a] = m.ctl; let r = null;
      if (cmd === 'join') { $('roomCode').value = a[0]; $('bJoin').fire('click'); await sleep(60); }
      else if (cmd === 'profile') { const Pr = await import('../src/core/profile.js'); Object.assign(Pr.profile, a[0]); }   // v0.41
      else if (cmd === 'step') step(a[0]);
      else if (cmd === 'key') key(a[0], a[1]);
      else if (cmd === 'act') act(...a);
      else if (cmd === 'leave') net.leave('');
      else if (cmd === 'exit') { process.send({ ctlr: { errs } }); setTimeout(() => process.exit(0), 20); return; }
      const me = P.player;
      r = { role: bus.role, overlay: $('overlay').hidden, over: G.over, again: $('bAgain').hidden, joinMsg: $('joinMsg').textContent, min: G.min, id: net.net.id,
        n: P.players.length, me: me && { id: me.id, x: me.pos.x, z: me.pos.z, gear: me.gear, alive: me.alive }, agents: agents.length,
        zombies: agents.filter(x => x.state === 'zombie').map(x => x.kind), drops: drops.length, doors: G.doors.map(d => d.open),
        feed: $('feed').children.map(c => c.textContent), msg: $('msg').textContent, errs: errs.length, who: P.players.map(p => p.name + '|' + (p.wear ? p.wear.bd : '')) };
      process.send({ ctlr: r });
    }
  });
  process.send({ ready: 1 });
} else {
  // ---------- the host ----------
  const fails = []; const fail = m => fails.push(m);
  const child = fork(fileURLToPath(import.meta.url), ['--client'], { stdio: 'inherit' });
  child.on('exit', code => { if (code) { console.log('FAILED: the friend process crashed (' + code + ')'); process.exit(1); } });
  let cur = null, onLink = null, reply = null, ready = null;
  const readyP = new Promise(r => { ready = r; });
  setTransport({ host: async (code, f) => { onLink = f; return { close() {} }; } });
  child.on('message', m => {
    if (m.ready) ready();
    else if (m.connect) { cur = ipcLink(x => child.send(x)); onLink(cur.link); }
    else if (m.net && cur) cur.feed(m.net);
    else if (m.bye && cur) cur.drop();
    else if (m.ctlr && reply) { const r = reply; reply = null; r(m.ctlr); }
  });
  const ask = (...ctl) => new Promise(r => { if (process.env.NETDBG) console.error('ask', ctl[0]); reply = r; child.send({ ctl }); });
  // both sides play n rounds of 3 frames: the friend's input reaches the host, the host's world reaches the friend
  async function rounds(n) { let r; for (let i = 0; i < n; i++) { r = await ask('step', 3); step(3); await sleep(2); } await sleep(10); return ask('step', 1); }
  await readyP;
  const H = await import('../src/net/host.js');
  const { uiFor, say } = await import('../src/ui/hud.js');
  const { spawnDrop, makeItem } = await import('../src/systems/drops.js');
  const { toggleDoor } = await import('../src/systems/doors.js');
  const { die } = await import('../src/systems/combat.js');
  const { becomeZombie, makeAgent } = await import('../src/entities/agents.js');

  // v0.41 both have made a character on the start screen
  const Pr = await import('../src/core/profile.js'), lookOf = (s, id) => Pr.cleanLook({ s, hd: id, bd: id, lg: id, ft: id, c: { shirt: '#8a1f1f' } });
  Object.assign(Pr.profile, { name: 'Moon', look: lookOf('m', 'm_punk') }); await ask('profile', { name: 'Nok', look: lookOf('f', 'f_soldier') });
  els.bStart.fire('click'); step(5); P.player.inv = 1e9;
  els.bRoom.fire('click'); await sleep(20);
  if (!H.room.open || !/^[A-Z2-9]{5}$/.test(H.room.code)) fail('room did not open: ' + JSON.stringify(H.room.code));
  // the friend joins from the start screen with the code
  let c = await ask('join', H.room.code); c = await rounds(10);
  const p2 = P.players[1];
  if (c.role !== 'client' || !c.overlay || c.n !== 2 || c.id !== 1 || !p2 || p2.away) fail('join: ' + JSON.stringify({ role: c.role, overlay: c.overlay, n: c.n, id: c.id, msg: c.joinMsg }));
  p2.inv = 1e9;
  const who = c.who.join(' / ');
  if (p2.name !== 'Nok' || !p2.wear || p2.wear.bd !== 'f_soldier' || c.who.join() !== 'Moon|m_punk,Nok|f_soldier') fail('names and clothes: host sees ' + p2.name + ' ' + JSON.stringify(p2.wear) + ', friend sees ' + c.who);
  const hostAgents = agents.filter(a => !a.gone).length; const seen = { who, agents: c.agents + '/' + hostAgents, drops: c.drops + '/' + drops.length };
  if (Math.abs(c.agents - hostAgents) > 2 || Math.abs(c.min - G.min) > 2) fail('world differs: agents ' + c.agents + '/' + hostAgents + ', min ' + c.min.toFixed(1) + '/' + G.min.toFixed(1));
  if (c.drops !== drops.length) fail('drops differ: ' + c.drops + '/' + drops.length);
  // the friend walks: their keys move their player on the host, and they see it
  const x0 = p2.pos.x; await ask('key', 'KeyD', 'keydown'); await rounds(20); await ask('key', 'KeyD', 'keyup'); c = await rounds(6);
  seen.walked = (p2.pos.x - x0).toFixed(2) + ' m, friend sees ' + Math.hypot(c.me.x - p2.pos.x, c.me.z - p2.pos.z).toFixed(2) + ' m off';
  if (!(Math.hypot(p2.pos.x - x0, 0) > 1.5)) fail('friend input did not move p2 on the host (' + (p2.pos.x - x0).toFixed(2) + ')');
  if (!(Math.hypot(c.me.x - p2.pos.x, c.me.z - p2.pos.z) < .5)) fail('friend sees itself elsewhere: ' + c.me.x.toFixed(2) + ',' + c.me.z.toFixed(2) + ' vs ' + p2.pos.x.toFixed(2) + ',' + p2.pos.z.toFixed(2));
  // an action: E next to a pistol picks it up on the host; the friend's bag shows it
  spawnDrop(makeItem('pistol_c'), p2.pos.x + .4, p2.pos.z); await rounds(4);
  await ask('key', 'KeyE', 'keydown'); await ask('key', 'KeyE', 'keyup'); c = await rounds(6);
  if (!p2.gear.eq.secondary || !c.me.gear.eq.secondary) fail('pickup through the host: host ' + !!p2.gear.eq.secondary + ', friend ' + !!c.me.gear.eq.secondary);
  // a bag action: drop the pistol
  p2.gear.bag.push({ id: 'bandage', n: 1 }); await rounds(3); await ask('act', 'dropBag', 0); c = await rounds(4);
  if (p2.gear.bag.some(e => e.id === 'bandage') || c.me.gear.bag.some(e => e.id === 'bandage')) fail('bag drop through the host did not happen');
  // messages: one for the friend, one for everyone
  uiFor(p2).feed('ถึงเพื่อนคนเดียว'); say('ถึงทุกคน'); uiFor(P.player).feed('ในเครื่อง host'); c = await rounds(3);
  if (!c.feed.includes('ถึงเพื่อนคนเดียว') || c.feed.includes('ในเครื่อง host') || c.msg !== 'ถึงทุกคน') fail('messages: feed ' + JSON.stringify(c.feed) + ', msg ' + c.msg);
  // a zombie and a door the friend can see
  const z = makeAgent(p2.pos.x + 6, p2.pos.z); becomeZombie(z, 'sprinter'); agents.push(z);
  const { rooms } = await import('../src/world/interiors.js'); toggleDoor(P.player, 0); c = await rounds(3);
  if (!c.zombies.includes('sprinter')) fail('friend does not see the new sprinter');
  if (c.doors[0] !== G.doors[0].open) fail('door 0 differs');
  z.gone = true;
  // the friend drops out: their player waits (away), zombies leave it alone; the same device comes back to it
  await ask('leave'); await sleep(20); step(3);
  if (!p2.away || P.targets().includes(p2) || H.room.conns.length) fail('drop-out: away ' + p2.away + ', conns ' + H.room.conns.length);
  c = await ask('step', 1);
  if (c.role !== 'off' || c.overlay) fail('friend not back at the title after leaving');
  c = await ask('join', H.room.code); c = await rounds(6);
  if (c.id !== p2.id || p2.away || P.players.length !== 2 || !c.me.gear.eq.secondary) fail('rejoin did not give the same player back: ' + JSON.stringify({ id: c.id, away: p2.away, n: P.players.length }));
  // everyone dead: game over on both; the host starts again and the friend is back in the new game
  P.player.inv = 0; p2.inv = 0; die(p2); die(P.player); await sleep(1900); c = await rounds(4);
  if (!G.over || !c.over || !c.again) fail('game over: host ' + G.over + ', friend ' + c.over + ' (again hidden ' + c.again + ')');
  els.bAgain.fire('click'); c = await rounds(8);
  if (G.over || c.over || !c.overlay || c.n !== 2 || !c.me || !c.me.alive) fail('new game after game over: ' + JSON.stringify({ over: c.over, overlay: c.overlay, n: c.n }));
  // closing the room sends the friend to the title
  els.bRoom.fire('click'); await sleep(20); c = await rounds(2);
  if (H.room.open || c.role !== 'off' || !c.joinMsg) fail('close room: friend role ' + c.role + ', msg ' + c.joinMsg);
  const end = await ask('exit');
  const all = errs.concat(end.errs.map(e => 'friend: ' + e));
  console.log('net: join, world ' + JSON.stringify(seen) + ', input, pickup, bag, messages, zombie, door, drop-out + rejoin, game over + new day, close');
  if (fails.length || all.length) { console.log('FAILED\n' + fails.join('\n') + (all.length ? '\n' + all.slice(0, 3).join('\n---\n') : '')); process.exit(1); }
  console.log('PASSED: online play over IPC');
  process.exit(0);
}
