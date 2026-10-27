// Headless smoke test for Ordinary Day.
// Runs the game logic for ~2 in-game days with THREE.js and the DOM replaced by stubs,
// then spawns every zombie class next to the player and fires every weapon type.
// It catches runtime errors in game logic only; it does not check rendering.
// Usage: node tools/smoke-test.js

import { els, handlers, store, errs, step, key } from './headless.js';

// the game modules read the stubs from headless.js, so they are imported only now
await import('../src/main.js');
// player infection is switched off in the game since v0.18; the older tests below still run its code, so it is on here until the v0.18 section
const ZCF = await import('../src/config/zombies.js'), LOOT = await import('../src/config/loot.js'); ZCF.INFECTION.on = true; LOOT.setMedTables();
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
T.inv.bag.push({ id: 'a9', n: 40 }, { id: 'bandage', n: 3 }); T.inv.eq.secondary = T.makeItem('pistol_c');
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
const PL = await import('../src/config/places.js'), WD = await import('../src/config/world.js');
const amb = lootSpots.filter(sp => sp.zone === 'ambulance');
if (amb.length !== 1 || !amb[0].drop || amb[0].drop.item.id !== 'resurrect') afail('no Resurrection Kit at the ambulance at the start');
if (lootSpots.indexOf(amb[0]) !== 80 || lootSpots.slice(81).some(s => s.zone !== 'indoor' && !PL.PLACE_W[s.zone] && !WD.areaAt(s.x, s.z))) afail('ambulance spot should stay at index 80, with only v0.6 indoor spots (some turned into shops in v0.17) after it');
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
clear(); const t0 = T.G.min; step(60); const fast = T.G.min - t0;
const t1 = T.G.min; step(20, 50); const slow = T.G.min - t1;
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

// 16) v0.11: getting ready for online play
const cfail = m => errs.push('v0.11 test: ' + m);
const { bus } = await import('../src/core/bus.js');
const Hud = await import('../src/ui/hud.js');
const Au = await import('../src/systems/audio.js');
const Fx = await import('../src/systems/effects.js');
// the bus: off by default; on, messages for everyone and for one other player are queued, the local player's are not
clear(); let c2 = Game.addPlayer(); c2.inv = T.player.inv = 1e9;
Hud.say('x'); if (bus.out.length) cfail('bus queued while off');
bus.on = true; bus.out.length = 0;
Hud.say('ทดสอบ', 'radio', 3); Hud.uiFor(c2).feed('ถึง p2'); Hud.uiFor(T.player).feed('ในเครื่อง'); Hud.uiFor(c2).hurt();
Au.sfx.thud(1, 2); Au.sfxFor(c2).reload(); Au.sfxFor(T.player).reload(); Fx.addBlood(3, 4); Fx.tracer(0, 0, 1, 1); Fx.boom(0, 1, 0, .3, 5);
const kinds = bus.out.map(m => m.to + ':' + m.kind + (m.kind === 'sfx' || m.kind === 'fx' ? '.' + m.args[0] : '')).join(' ');
const want = ['*:say', c2.id + ':feed', c2.id + ':hurt', '*:sfx.thud', c2.id + ':sfx.reload', '*:fx.blood', '*:fx.tracer', '*:fx.boom'];
if (want.some(w => !kinds.split(' ').includes(w)) || bus.out.length !== want.length) cfail('bus queue: ' + kinds);
const got = bus.out.splice(0); bus.on = false;
for (const m of got) Hud.receive(m);   // what another device (its bus is off) does with them
// with two players the bag and the pause menu do not stop the world, and there is no ×2 / ×4
T.G.speedIdx = 2; step(2); if (T.G.speedIdx !== 0) cfail('speed not reset with two players');
let w0 = T.G.min; T.openBag(); step(30); if (T.G.paused || !(T.G.min > w0)) cfail('bag stopped the world with two players');
T.player.input.mag = 1; step(1); if (T.player.input.mag !== 0) cfail('the player kept moving with the bag open'); T.closeBag();
const Pz = await import('../src/ui/pause.js'); w0 = T.G.min; Pz.openPause(); step(30); if (T.G.paused || !(T.G.min > w0)) cfail('pause menu stopped the world with two players'); Pz.closePause();
// no friendly fire: p1 shoots straight through p2
Object.assign(T.player.pos, { x: 0, z: 14 }); Object.assign(c2.pos, { x: 0, z: 16 }); c2.inv = 0; c2.hp = 100; T.player.face = 0;
T.inv.eq.secondary = Object.assign(T.makeItem('pistol_c'), { mag: 5 }); T.inv.active = 'secondary';
keys.Space = false; T.player.input.aim = true; Cb.fireGun(T.player, T.inv.eq.secondary, (await import('../src/config/items.js')).DEF.pistol_c);
if (c2.hp !== 100) cfail('a bullet hurt a teammate');
// a dead teammate: no Kit, no luck; with one, back with full HP
c2.gear.bag = []; Cb.hurtPlayer(c2, 9999); T.player.hp = 100; Cb.hurtPlayer(c2, 9999);
if (c2.alive) { c2.inv = 0; T.player.bleed = 0; }
c2.alive && Cb.die(c2);
if (c2.alive) cfail('could not kill p2 for the Kit test');
if (P.viewed() !== T.player) cfail('the camera left a living player');
Object.assign(c2.pos, { x: T.player.pos.x + 1, z: T.player.pos.z }); step(2);
if (T.player.nearDown !== c2) cfail('a dead teammate next to the player is not offered');
T.inv.bag = []; if (P.startHelp(T.player, c2)) cfail('helped a dead teammate up without a Kit');
T.inv.bag.push({ id: 'resurrect', n: 1 }); if (!P.startHelp(T.player, c2)) cfail('could not start using the Kit on a dead teammate');
step(Math.round(Pt.REVIVE_SECONDS * 60) + 5);
if (!c2.alive || c2.hp !== c2.maxHp || c2.state !== 'player' || T.inv.bag.some(e => e.id === 'resurrect')) cfail('Kit revive: alive ' + c2.alive + ', hp ' + c2.hp + ', kit left ' + T.inv.bag.some(e => e.id === 'resurrect'));
// dead, the camera follows a teammate still alive
T.inv.bag = []; T.player.inv = 0; c2.inv = 1e9; Cb.hurtPlayer(c2, 1); Cb.die(T.player);
if (P.viewed() !== c2) cfail('a dead player does not watch the teammate');
Object.assign(c2.pos, { x: -20, z: -20 }); step(120);
const R = await import('../src/core/renderer.js');
if (Math.hypot(R.camTarget.x - c2.pos.x, R.camTarget.z - c2.pos.z) > 3) cfail('camera did not follow the teammate (' + R.camTarget.x.toFixed(1) + ',' + R.camTarget.z.toFixed(1) + ')');
// alone the bag still stops the game
clear(); T.openBag(); w0 = T.G.min; step(10); if (!T.G.paused || T.G.min !== w0) cfail('solo bag no longer pauses'); T.closeBag();
console.log('v0.11: bus (' + want.length + ' kinds, received), bag/pause/speed with two players, no friendly fire, Kit revives a dead teammate, spectate');

// 17) v0.14: food indoors · v0.15: searching furniture
{
  const vfail = m => errs.push('v0.14 / v0.15 test: ' + m);
  const Dr = await import('../src/systems/drops.js'); const { roomAt, rooms, boxes } = await import('../src/world/interiors.js');
  const Se = await import('../src/systems/search.js'); const { SEARCH_SECONDS } = await import('../src/config/search.js'); const Ac = await import('../src/systems/actions.js');
  let fi = 0, fo = 0; for (let i = 0; i < 4000; i++) { if (/^(canned|water)$/.test(Dr.rollLoot('day', 'indoor').id)) fi++; if (/^(canned|water)$/.test(Dr.rollLoot('day', 'city').id)) fo++; }
  if (!(fi > fo * 1.6)) vfail('indoor spots are not richer in food: ' + fi + ' vs ' + fo);
  if (boxes.length < rooms.length || boxes.some(b => roomAt((b.box.x0 + b.box.x1) / 2, (b.box.z0 + b.box.z1) / 2) !== b.room)) vfail(boxes.length + ' furniture for ' + rooms.length + ' rooms, or one outside its room');
  let kf = 0, kn = 0; for (let i = 0; i < 2000; i++) for (const it of Se.rollBox('kitchen')) { kn++; if (/^(canned|water)$/.test(it.id)) kf++; }
  if (!(kf / kn > .55)) vfail('kitchens hold too little food: ' + kf + '/' + kn);
  if (Se.rollBox('drawer').concat(Se.rollBox('drawer'), Se.rollBox('drawer')).some(it => D5[it.id].grade && D5[it.id].grade !== 'civ')) vfail('police / military gear in a home');
  // search one: stand in front of it, press E, hold still
  const pl = T.player; pl.alive = true; pl.state = 'player'; pl.hp = 100; pl.inv = 1e9; pl.bleed = 0; pl.down = 0; T.G.searched = []; T.G.running = true;
  const bi = boxes.findIndex(b => b.kind === 'kitchen'), b = boxes[bi], cx = (b.box.x0 + b.box.x1) / 2, cz = (b.box.z0 + b.box.z1) / 2;
  const at = () => { pl.pos.x = cx - b.n[0] * (b.d / 2 + .35); pl.pos.z = cz - b.n[1] * (b.d / 2 + .35); };
  at(); step(2);
  if (pl.nearBox !== bi) vfail('furniture in reach not offered: nearBox ' + pl.nearBox + ' want ' + bi);
  Ac.ACTIONS.use(pl); if (pl.searching !== bi) vfail('E did not start searching');
  key('KeyW', 'keydown'); step(5); key('KeyW', 'keyup'); step(2);
  if (pl.searching >= 0 || T.G.searched.includes(bi)) vfail('walking off did not stop the search');
  at(); step(2); Ac.ACTIONS.use(pl); const d0 = T.drops.length, bag0 = JSON.stringify(pl.gear.bag);
  step(Math.round(SEARCH_SECONDS * 60) + 5);
  if (!T.G.searched.includes(bi) || pl.searching >= 0) vfail('search did not finish: searched ' + T.G.searched + ' searching ' + pl.searching);
  step(3); if (pl.nearBox === bi) vfail('an emptied piece is still offered');
  const found = T.drops.length - d0 + (JSON.stringify(pl.gear.bag) !== bag0 ? 1 : 0);
  // saved and restocked
  S.saveGame(); T.G.searched = []; S.loadGame(); if (!T.G.searched.includes(bi)) vfail('G.searched not saved');
  T.G.searched = boxes.map((_, i) => i); Se.restockBoxes(); const left = T.G.searched.length;
  if (!(left < boxes.length && left > 0)) vfail('restock: ' + left + ' of ' + boxes.length + ' still empty');
  T.G.searched = [];
  console.log('v0.14 / v0.15: food in indoor rolls ' + (fi / 40).toFixed(0) + '% vs outdoor ' + (fo / 40).toFixed(0) + '% · ' + boxes.length + ' furniture in ' + rooms.length + ' rooms (' + ['kitchen', 'shelf', 'drawer', 'sofa'].map(k => k + ' ' + boxes.filter(x => x.kind === k).length).join(', ') + '), kitchen food ' + Math.round(kf / kn * 100) + '%, searched one (' + (found ? 'found something' : 'empty') + '), ' + (boxes.length - left) + ' restocked at 06:00');
  // v0.14.1: one stack per item, no limit, sorted by category; old saves with split stacks are merged
  const Inv = await import('../src/systems/inventory.js'); const g = T.player.gear; g.bag = []; g.cap = 6;
  Inv.addStack(T.player, 'water', 3); Inv.addStack(T.player, 'a9', 150); Inv.addStack(T.player, 'a9', 150); Inv.addStack(T.player, 'bandage', 9); g.bag.unshift({ id: 'a9', n: 5 }, { id: 'bat_c', mag: 0, dur: 40 }); Inv.tidyBag(g);
  if (JSON.stringify(g.bag.map(e => e.id + ':' + (e.n ?? '-'))) !== JSON.stringify(['bat_c:-', 'a9:305', 'bandage:9', 'water:3'])) vfail('bag not merged / sorted: ' + JSON.stringify(g.bag));
  // v0.16: the town after the outbreak (looks only: no collision boxes, no rand(), clear of loot and rooms)
  const Dc = await import('../src/world/decor.js'); const Pr = await import('../src/world/props.js');
  if (Dc.decor.length < 150 || Dc.decor.some(d => lootSpots.some(s => Math.hypot(s.x - d.x, s.z - d.z) < .85) || roomAt(d.x, d.z) >= 0)) vfail('decor: ' + Dc.decor.length + ' pieces, or one on loot / in a room');
  const burned = Pr.breakables.filter(x => x.car && x.car.burned).length;
  if (!burned || !Pr.flickers.length || Pr.trees.length < 30) vfail('burned cars ' + burned + ', flickering lamps ' + Pr.flickers.length + ', trees ' + Pr.trees.length);
  console.log('v0.16: ' + Dc.decor.length + ' weeds / bushes / signs, ' + Pr.trees.length + ' trees, ' + burned + ' burned cars, ' + Pr.flickers.length + ' flickering lamps');
  // v0.17: shops and the hospital
  const placed = rooms.filter(r => r.place && r.place.type !== 'farm');   // the farm's barn (v0.22) is a place of its own
  if (placed.length !== PL.PLACES.length || new Set(placed.map(r => r.place.type)).size !== PL.PLACES.length) vfail('places: ' + placed.map(r => r.place.type));
  const hosp = rooms.findIndex(r => r.place && r.place.type === 'hospital'), gun = rooms.findIndex(r => r.place && r.place.type === 'gunshop');
  if (!boxes.some(x => x.room === hosp) || boxes.some(x => x.room === hosp && x.kind !== 'medcab') || boxes.some(x => x.room === gun && x.kind !== 'gunrack')) vfail('shop furniture kinds');
  let hm = 0, gw = 0; for (let i = 0; i < 2000; i++) { const it = Dr.rollLoot('day', 'hospital'); if (D5[it.id].kind === 'heal' || it.id === 'resurrect') hm++; const g2 = Dr.rollLoot('day', 'gunshop'); if (D5[g2.id].kind === 'weapon' || D5[g2.id].kind === 'ammo') gw++; }
  if (hm < 1300 || gw < 1700) vfail('place tables: hospital medicine ' + hm + '/2000, gun shop guns+ammo ' + gw + '/2000');
  const hw = Array.from({ length: 300 }, () => Dr.rollLoot('day', 'hardware')).filter(it => D5[it.id].kind === 'weapon'); if (hw.some(it => D5[it.id].gun)) vfail('a gun from the hardware store');
  const pz = lootSpots.filter(s => PL.PLACE_W[s.zone]).length;
  console.log('v0.17: ' + placed.map(r => r.place.type + ' ' + boxes.filter(x => x.room === rooms.indexOf(r)).length).join(', ') + ' furniture; ' + pz + ' shop floor spots; hospital rolls ' + Math.round(hm / 20) + '% medicine, gun shop ' + Math.round(gw / 20) + '% guns / ammo');
  // v0.18: infection off, rings by kind, a random event every day
  ZCF.INFECTION.on = false; LOOT.setMedTables();
  if (LOOT.MED_W.day.antibiotic || LOOT.MED_W.night.antibiotic) vfail('Antibiotic still in the loot tables');
  { const pl = T.player; pl.infect = 0; infectPlayer(pl); if (pl.infect > 0) vfail('a bite infected the player with infection off'); }
  const It = await import('../src/config/items.js'); const rc = ['pistol_c', 'backpack', 'bandage', 'canned', 'water', 'a9'].map(It.ringColor);
  if (new Set(rc).size !== 6) vfail('ring colours not one per kind: ' + rc);
  const Ev = await import('../src/systems/events.js'); const EvC = await import('../src/config/events.js');
  const day = Math.floor(T.G.min / 1440) + 1; T.G.plan = []; Ev.planDaily(day + 1); Ev.planDaily(day + 5);
  const planned = T.G.plan.filter(e => e.daily); if (planned.length !== 3) vfail('daily plan: ' + JSON.stringify(planned));
  const ran = [];
  for (const kind of Object.keys(EvC.DAILY.weights)) {
    T.G.site = null; T.G.alarm = null; T.G.fog = 0; T.G.heat = 0; const d0 = T.drops.length, s0 = T.G.searched.length, a0 = T.agents.length;
    T.player.pos.x = 0; T.player.pos.z = 0; T.G.plan = [{ kind, at: T.G.min - 1, done: false, warned: false, daily: true }]; Ev.updateEvents(0);
    const ok = { alarm: () => T.G.alarm, stash: () => T.G.site && T.drops.length > d0, truck: () => T.G.site && T.drops.length > d0, crash: () => T.G.site && T.drops.length > d0, fog: () => T.G.fog > T.G.min, heat: () => T.G.heat > T.G.min, raid: () => T.G.searched.length > s0 }[kind]();
    if (!ok) vfail('daily event ' + kind + ' did nothing'); else ran.push(kind + (T.agents.length > a0 ? '+' + (T.agents.length - a0) + 'z' : ''));
  }
  T.G.alarm = { x: 5, z: 5, until: T.G.min + 10, next: T.G.min }; Ev.updateEvents(0); if (!(T.G.alarm.next > T.G.min)) vfail('car alarm did not call');
  T.G.alarm = null; T.G.site = null; T.G.fog = 0; T.G.heat = 0; T.G.plan = [];
  // v0.18: a dirtier town and crowded rooms; the new solids stay off the loot, the doorways, the landing zone and each other
  const Cl = await import('../src/world/clutter.js'), Col = await import('../src/world/collision.js'), Gl = await import('../src/config/goal.js');
  const inBox = (q, x, z, m) => x > q.x0 - m && x < q.x1 + m && z > q.z0 - m && z < q.z1 + m;
  for (const h of Cl.heavy) {
    if (lootSpots.some(s => inBox(h.box, s.x, s.z, .3))) vfail('clutter ' + h.id + ' on a loot spot');
    if (rooms.some(r => inBox(h.box, r.dx, r.dz, 1))) vfail('clutter ' + h.id + ' in a doorway');
    if (inBox(h.box, Gl.LZ.x, Gl.LZ.z, 6)) vfail('clutter ' + h.id + ' on the landing zone');
    if (Col.solids.some(q => q !== h.box && inBox(q, (h.box.x0 + h.box.x1) / 2, (h.box.z0 + h.box.z1) / 2, Math.max(h.ex, h.ez) - .3) && !(q.x1 <= h.box.x0 || q.x0 >= h.box.x1 || q.z1 <= h.box.z0 || q.z0 >= h.box.z1))) vfail('clutter ' + h.id + ' overlaps another solid');
  }
  const kinds = id => Cl.heavy.filter(h => h.id === id).length, inside = Cl.roomDecor.reduce((n, l) => n + (l ? l.length : 0), 0);
  if (kinds('c_bus') + kinds('c_van') + kinds('c_pickup') < 4 || kinds('c_dumpster') < 4 || inside < rooms.length * 8) vfail('clutter: wrecks ' + (kinds('c_bus') + kinds('c_van') + kinds('c_pickup')) + ', dumpsters ' + kinds('c_dumpster') + ', room pieces ' + inside);
  // v0.22: the farm through the gate in the west wall
  { const W = await import('../src/config/world.js'), Mv = await import('../src/entities/movement.js'), Fm = await import('../src/world/farm.js'), I2 = await import('../src/world/interiors.js'), Ag = await import('../src/entities/agents.js');
    const farmRooms = I2.rooms.filter(r => W.inFarm(r.b.cx, r.b.cz)), barn = farmRooms.find(r => r.place && r.place.type === 'farm');
    const spots = lootSpots.filter(sp => W.inFarm(sp.x, sp.z)), fb = I2.boxes.filter(b => W.inFarm(b.x, b.z));
    if (farmRooms.length !== 3 || !barn || spots.length < 8 || !fb.length) vfail('farm: rooms ' + farmRooms.length + ', barn ' + !!barn + ', loot spots ' + spots.length + ', furniture ' + fb.length);
    const walk = (x, z, tx, tz, n) => { const a = { pos: { x, z }, rad: .34, face: 0, state: 'player' }; for (let i = 0; i < n; i++) Mv.moveAgent(a, tx - a.pos.x, tz - a.pos.z, 4, 1 / 30); return a.pos; };   // state 'player': raw collision, no v0.37 steering round the wall
    const thru = walk(-60, 0, -100, 0, 400), wall = walk(-60, 12, -100, 12, 400), out = walk(-100, 0, -160, 0, 400);
    if (thru.x > -95) vfail('could not walk through the gate: ' + JSON.stringify(thru));
    if (wall.x < W.WALL_X) vfail('walked through the west wall: ' + JSON.stringify(wall));
    if (out.x < W.FARM.x0 - .1) vfail('walked off the farm: ' + JSON.stringify(out));
    const via = I2.navStep(-60, 15, -100, 15); if (!(Math.abs(via.z) < 1 && via.x > W.WALL_X)) vfail('no way through the gate: ' + JSON.stringify(via));
    // a zombie wandering out there stays on the farm
    const z = Ag.makeAgent(-100, -2); Ag.becomeZombie(z, 'walker'); for (let i = 0; i < 600; i++) Mv.wander(z, 1.2, 1 / 30); Ag.removeAgent ? Ag.removeAgent(z) : 0;
    if (!W.inFarm(z.pos.x, z.pos.z)) vfail('a farm zombie wandered off: ' + JSON.stringify(z.pos));
    console.log('v0.22: farm ' + farmRooms.length + ' rooms (barn ' + I2.boxes.filter(b => b.kind === 'farm').length + ' shelves), ' + spots.length + ' loot spots, ' + Fm.attach.length + ' boarded windows, gate ' + thru.x.toFixed(0) + ', wall held at ' + wall.x.toFixed(1) + ', zombie wandered to ' + z.pos.x.toFixed(0) + ',' + z.pos.z.toFixed(0));
  }
  // v0.24: the suburb through the gate in the south wall
  { const W = await import('../src/config/world.js'), Mv = await import('../src/entities/movement.js'), I2 = await import('../src/world/interiors.js'), Ag = await import('../src/entities/agents.js');
    const sub = I2.rooms.filter(r => W.areaAt(r.b.cx, r.b.cz) === W.SUBURB), spots = lootSpots.filter(sp => W.areaAt(sp.x, sp.z) === W.SUBURB);
    if (sub.length !== 5 || spots.length < 10) vfail('suburb: rooms ' + sub.length + ', loot spots ' + spots.length);
    const walk = (x, z, tx, tz, n) => { const a = { pos: { x, z }, rad: .34, face: 0, state: 'player' }; for (let i = 0; i < n; i++) Mv.moveAgent(a, tx - a.pos.x, tz - a.pos.z, 4, 1 / 30); return a.pos; };   // state 'player': raw collision, no v0.37 steering
    const thru = walk(0, 60, 0, 110, 500), wall = walk(15, 60, 15, 100, 400), back = walk(0, 110, 0, 40, 600);
    if (thru.z < 105) vfail('could not walk through the south gate: ' + JSON.stringify(thru));
    if (wall.z > W.WALL_Z) vfail('walked through the south wall: ' + JSON.stringify(wall));
    if (back.z > 45) vfail('could not walk back into town: ' + JSON.stringify(back));
    const via = I2.navStep(20, 60, 20, 110); if (!(Math.abs(via.x) < 1 && via.z < W.WALL_Z)) vfail('no way through the south gate: ' + JSON.stringify(via));
    const z = Ag.makeAgent(0, 100); Ag.becomeZombie(z, 'walker'); for (let i = 0; i < 600; i++) Mv.wander(z, 1.2, 1 / 30);
    if (W.areaAt(z.pos.x, z.pos.z) !== W.SUBURB) vfail('a suburb zombie wandered off: ' + JSON.stringify(z.pos));
    console.log('v0.24: suburb ' + sub.length + ' rooms, ' + spots.length + ' loot spots, gate ' + thru.z.toFixed(0) + ', wall held at ' + wall.z.toFixed(1) + ', back to ' + back.z.toFixed(0) + ', zombie wandered to ' + z.pos.x.toFixed(0) + ',' + z.pos.z.toFixed(0));
  }
  // v0.25: the river east of town: only the bridge crosses it, walkers are sent over it, some hordes come that way
  { const W = await import('../src/config/world.js'), Mv = await import('../src/entities/movement.js'), I2 = await import('../src/world/interiors.js'), Ev2 = await import('../src/systems/events.js'), EvC2 = await import('../src/config/events.js');
    const walk = (x, z, tx, tz, n) => { const a = { pos: { x, z }, rad: .34, face: 0, state: 'player' }; for (let i = 0; i < n; i++) Mv.moveAgent(a, tx - a.pos.x, tz - a.pos.z, 4, 1 / 30); return a.pos; };   // state 'player': raw collision, no v0.37 steering
    const over = walk(60, 0, 130, 0, 700), swim = walk(85, 15, 120, 15, 500);
    if (over.x < 125) vfail('could not cross the bridge: ' + JSON.stringify(over));
    if (swim.x > W.RIVER.x0) vfail('walked through the river: ' + JSON.stringify(swim));
    const via = I2.navStep(85, 15, 120, 15); if (!(Math.abs(via.z) < 1 && via.x < W.RIVER.x0)) vfail('not sent to the bridge: ' + JSON.stringify(via));
    const shack = I2.rooms.filter(r => W.areaAt(r.b.cx, r.b.cz) === W.EAST), spots = lootSpots.filter(sp => W.areaAt(sp.x, sp.z) === W.EAST);
    // a bridge horde, walked by the zombie AI for a while: they come over the river and through the east gate
    const a0 = T.agents.length, br = EvC2.HORDE.bridge; EvC2.HORDE.bridge = 1; const night = T.G.phase; T.G.phase = 'night'; Ev2.updateEvents && 0; const EvM = await import('../src/systems/events.js');
    T.G.plan = [{ kind: 'horde', at: T.G.min - 1, done: false, warned: true }]; EvM.updateEvents(0); EvC2.HORDE.bridge = br;
    const hz = T.agents.slice(a0).filter(a => a.march); const { updateZombie } = await import('../src/entities/ai.js');
    for (let i = 0; i < 1800; i++) for (const a of hz) if (a.state === 'zombie' && !a.gone) updateZombie(a, 1 / 30);
    const passed = hz.filter(a => a.pos.x < W.EAST.wall.v || a.gone).length; T.G.phase = night; T.G.plan = [];
    if (!hz.length || passed < hz.length / 2) vfail('bridge horde: ' + hz.length + ' zombies, ' + passed + ' got into town; e.g. ' + (hz[0] && JSON.stringify(hz[0].pos)));
    for (const a of hz) a.gone = true;
    console.log('v0.25: bridge crossed to ' + over.x.toFixed(0) + ', river held at ' + swim.x.toFixed(1) + ', ' + shack.length + ' shack, ' + spots.length + ' loot spots, bridge horde ' + passed + '/' + hz.length + ' into town');
  }
  // v0.26: the camp: traps catch once (saved), the fire burns, better loot, guards, flares call zombies
  { const Cw = await import('../src/world/camp.js'), Cs = await import('../src/systems/camp.js'), Cl3 = await import('../src/world/clutter.js'), Th2 = await import('../src/systems/throw.js'), It3 = await import('../src/config/items.js');
    const tents = Cl3.heavy.filter(h => h.id === 's_tent').length, cs = lootSpots.filter(sp => sp.zone === 'camp').length;
    if (Cw.camp.traps.length < 5 || tents < 3 || cs !== 4) vfail('camp: traps ' + Cw.camp.traps.length + ', tents ' + tents + ', loot spots ' + cs);
    T.G.traps = []; Cs.applyTraps(); const tr = Cw.camp.traps[0];
    const z = T.makeAgent(tr.x, tr.z); T.becomeZombie(z, 'zombie'); T.agents.push(z); Cs.updateCamp(1 / 60);
    if (!T.G.traps.includes(0) || !(z.trapT > 0) || !tr.entry.gone) vfail('trap did not catch the zombie');
    const pl = T.player, px = pl.pos.x, pz = pl.pos.z, tr2 = Cw.camp.traps[1]; pl.pos.x = tr2.x; pl.pos.z = tr2.z; pl.inv = 0; const hp0 = pl.hp; Cs.updateCamp(1 / 60); pl.inv = 1e9;
    if (!(pl.trapT > 0) || pl.hp >= hp0) vfail('trap did not catch the player (hp ' + hp0 + ' -> ' + pl.hp + ')'); pl.trapT = 0; pl.hp = pl.maxHp; pl.pos.x = px; pl.pos.z = pz;
    S.saveGame(); T.G.traps = []; Cs.applyTraps(); S.loadGame(); if (T.G.traps.length !== 2 || !Cw.camp.traps[1].entry.gone) vfail('spent traps not restored from the save');
    const f = Cw.camp.fire, z2 = T.makeAgent(f.x, f.z); T.becomeZombie(z2, 'zombie'); T.agents.push(z2); for (let i = 0; i < 120; i++) { Cs.updateCamp(1 / 30); z2.pos.x = f.x; z2.pos.z = f.z; }
    if (!(z2.hp < z2.maxHp * .6) && z2.state === 'zombie') vfail('the camp fire did not burn a zombie (' + z2.hp + ')');
    const rolls = Array.from({ length: 600 }, () => Dr.rollLoot('day', 'camp')), good = rolls.filter(it => ['pol', 'mil'].includes(It3.DEF[it.id].grade)).length;
    if (good < 60 || !rolls.some(it => it.id === 'flare')) vfail('camp loot: ' + good + ' police / military in 600, flare ' + rolls.some(it => it.id === 'flare'));
    const a0 = T.agents.length; Cs.campGuards(); const guards = T.agents.length - a0; for (const g of T.agents.slice(a0)) g.gone = true;
    // a flare draws a zombie 25 m away to where it burns
    pl.gear.bag = [{ id: 'flare', n: 1 }]; pl.pos.x = 0; pl.pos.z = -4; pl.face = 0; pl.input.aim = false; T.G.phase = 'night';
    const z3 = T.makeAgent(0, 30); T.becomeZombie(z3, 'zombie'); T.agents.push(z3); z3.heard = null; Th2.throwBottle(pl); for (let i = 0; i < 120; i++) { Th2.updateThrows(1 / 30); Th2.updateLures(1 / 30); }
    if (!z3.heard) vfail('the flare did not call a zombie'); Th2.clearThrows(); T.G.phase = 'day'; pl.gear.bag = [];
    for (const a of [z, z2, z3]) a.gone = true; T.G.traps = []; Cs.applyTraps();
    console.log('v0.26: camp ' + tents + ' tents, ' + Cw.camp.traps.length + ' traps (caught a zombie and the player, saved), fire burns, ' + Math.round(good / 6) + '% police / military loot, ' + guards + ' guards, flare calls zombies');
  }
  // v0.37: people and zombies walk round what is in the way; a backpack near the start and more often while someone has
  // none; ammo for the guns players carry
  { const Mv2 = await import('../src/entities/movement.js'), Pr = await import('../src/world/props.js'), Col4 = await import('../src/world/collision.js'), Dr = await import('../src/systems/drops.js'), Ob2 = await import('../src/ui/objective.js');
    let tried = 0, round = 0;
    for (const b of Pr.breakables) { if (!b.car || b.broken || tried >= 6) continue; const ax = b.car.alongX, ox = ax ? 0 : 3.2, oz = ax ? 3.2 : 0;
      if (Math.max(Math.abs(b.x) + ox, Math.abs(b.z) + oz) > 65 || !Col4.freeAt(b.x - ox, b.z - oz, .6) || !Col4.freeAt(b.x + ox, b.z + oz, .6)) continue; tried++;
      const a = { pos: { x: b.x - ox, z: b.z - oz }, rad: .34, face: 0, state: 'zombie', kind: 'walker' };
      for (let i = 0; i < 600 && Math.hypot(b.x + ox - a.pos.x, b.z + oz - a.pos.z) > .8; i++) Mv2.moveAgent(a, b.x + ox - a.pos.x, b.z + oz - a.pos.z, 2, 1 / 30);
      if (Math.hypot(b.x + ox - a.pos.x, b.z + oz - a.pos.z) <= .8) round++; }
    if (!tried || round < tried) vfail('steering: went round ' + round + ' of ' + tried + ' cars');
    els.bAgain.fire('click'); T.G.running = true; const pl = T.player;
    const startBag = T.drops.find(d => d.item.id === 'backpack' && Math.hypot(d.x - pl.pos.x, d.z - pl.pos.z) < 36);
    if (!startBag) vfail('no backpack near the start');
    const goal = Ob2.currentGoal(pl); pl.gear.eq.melee = T.makeItem('bat_c'); const goal2 = Ob2.currentGoal(pl);
    if (!/เป้/.test(goal2 && goal2.text)) vfail('no backpack goal: ' + JSON.stringify([goal, goal2]));
    for (const d of T.drops.filter(d => d.item.id === 'backpack')) Dr.removeDrop(d);
    const need = Dr.needBag(); Dr.fillNight(0); let bags = 0; for (let i = 0; i < 600; i++) if (Dr.rollLoot('night', 'city').id === 'backpack') bags++;
    pl.gear.cap = 14; Dr.fillNight(0); let bags2 = 0; for (let i = 0; i < 600; i++) if (Dr.rollLoot('night', 'city').id === 'backpack') bags2++;
    if (!need || !bags || bags2) vfail('backpack help: need ' + need + ', night bags without one ' + bags + ', with one ' + bags2);
    pl.gear.eq.primary = T.makeItem('shotgun_c'); let a12 = 0; for (let i = 0; i < 600; i++) if (Dr.pickAmmo(['a9', 'a9', 'a12']) === 'a12') a12++;
    pl.gear.eq.primary = null;
    if (a12 < 600 * .6) vfail('ammo for the carried shotgun only ' + a12 + ' of 600');
    // two code lines had ended up inside the comment before them (v0.17, v0.30): the first-person camera never turned
    const fs = await import('fs'), fpsSrc = fs.readFileSync(new URL('../src/ui/fps.js', import.meta.url), 'utf8'), citySrc = fs.readFileSync(new URL('../src/world/city.js', import.meta.url), 'utf8');
    if (!/^\s*fpsCam\.rotation\.set\(/m.test(fpsSrc)) vfail('the first-person camera is not turned (fpsCam.rotation.set commented out?)');
    if (!/^\s*mats\.push\(det\)/m.test(citySrc)) vfail('rooftop units are not in their building\'s materials');
    console.log('v0.37: went round ' + round + ' of ' + tried + ' cars; backpack ' + Math.round(Math.hypot(startBag.x - pl.pos.x, startBag.z - pl.pos.z)) + ' m from the start, night bags ' + bags + '/600 without one, ' + bags2 + ' with; shotgun shells ' + a12 + '/600');
  }
  // v0.34: the old town: shop boards, balconies, posters, columns, body bags, barriers built; none of their collision
  // boxes on a loot spot or a doorway; a church bell at dawn
  { const Ot = await import('../src/world/oldtown.js'), Cl3 = await import('../src/world/collision.js'), I4 = await import('../src/world/interiors.js'), Ct = await import('../src/world/city.js');
    const o = Ot.oldtown, n0 = Cl3.solids.length;
    if (o.signs < 25 || o.balconies < 30 || o.posters < 20 || o.columns.length < 4 || o.bags < 8 || o.cases < 15 || o.barriers.length < 5) vfail('old town: ' + JSON.stringify({ ...o, columns: o.columns.length, barriers: o.barriers.length }));
    const on = [...o.columns, ...o.barriers].filter(([x, z]) => Ct.lootSpots.some(s => Math.hypot(s.x - x, s.z - z) < 1) || I4.rooms.some(r => Math.hypot(r.dx - x, r.dz - z) < 2.5)).length;
    if (on) vfail('old town blocks ' + on + ' loot spots or doors');
    let rang = 0; const Au = await import('../src/systems/audio.js'), Ph3 = await import('../src/systems/phases.js'), keep = Au.sfx.bell, m1 = T.G.min, ph1 = T.G.phase; Au.sfx.bell = () => rang++; T.G.min = 1440 + 6 * 60 + 1; T.G.phase = 'night'; Ph3.runEvents(); Au.sfx.bell = keep; T.G.min = m1; T.G.phase = ph1;
    if (!rang) vfail('no church bell at dawn');
    console.log('v0.34: ' + o.signs + ' shop boards, ' + o.hang + ' hanging signs, ' + o.balconies + ' balconies, ' + o.posters + ' posters, ' + o.sheets + ' HELP sheets, ' + o.columns.length + ' columns, ' + o.bags + ' body bags, ' + o.cases + ' suitcases, ' + o.barriers.length + ' barriers, ' + o.sandbags + ' sandbags, ' + o.memorials + ' memorials; ' + n0 + ' solids; bell at dawn');
  }
  // v0.32: the slow first morning, the outbreak seen happening, the goal line
  { const Ob = await import('../src/ui/objective.js'), Tm = await import('../src/config/time.js'), Ph = await import('../src/systems/phases.js');
    els.bAgain.fire('click'); T.G.running = true; const pl = T.player; pl.inv = 1e9; pl.gear.cap = 14;   // v0.37 with a backpack (its own goal is tested below)
    const m0 = T.G.min; step(600); const paced = (T.G.min - m0) / (10 * Tm.RATE);   // 10 real seconds at ×1
    const g0 = Ob.currentGoal(pl);
    for (let k = 0; k < 6; k++) T.agents.push(T.makeAgent(pl.pos.x + Math.sin(k) * 14, pl.pos.z + Math.cos(k) * 14));   // people around, so one is near whoever turns
    T.G.min = 9 * 60 + 29.95; step(30);
    const first = T.agents.find(a => a === T.G.alertA), wasInfected = first && first.state === 'infected', panicked = T.agents.filter(a => a.state === 'human' && a.panic > 0).length;
    step(300); const turned = first && first.state === 'zombie';
    pl.gear.eq.melee = T.makeItem('bat_c'); pl.gear.bag = []; const gFood = Ob.currentGoal(pl);
    pl.gear.bag = [{ id: 'canned', n: 1 }, { id: 'water', n: 1 }, { id: 'bandage', n: 1 }]; const gMore = Ob.currentGoal(pl);
    T.G.min = 16 * 60; const out = Ob.currentGoal(pl);
    const k = 0, r = (await import('../src/world/interiors.js')).rooms[k]; pl.pos.x = (r.x0 + r.x1) / 2; pl.pos.z = (r.z0 + r.z1) / 2; T.G.doors[k].open = false; const inside = Ob.currentGoal(pl);
    T.G.min = 20 * 60; const night = Ob.currentGoal(pl); T.G.min = 1440 + 16 * 60; const gone = Ob.currentGoal(pl);
    pl.pos.x = 5; pl.pos.z = 5;
    const ok = paced > .3 && paced < .4 && /อาวุธ/.test(g0.text) && wasInfected && turned && panicked > 0 && /อาหาร/.test(gFood.text) && /ก่อนมืด/.test(gMore.text) && out.x !== undefined && /ก่อนมืด/.test(out.text) && /พร้อม|ตอก/.test(inside.text) && /06:00/.test(night.text) && gone === null;
    if (!ok) vfail('first day: pace ' + paced.toFixed(2) + ', goals ' + JSON.stringify([g0, gFood, gMore, out, inside, night, gone].map(g => g && g.text)) + ', outbreak infected ' + wasInfected + ' turned ' + turned + ' panicked ' + panicked);
    console.log('v0.32: first morning at ' + paced.toFixed(2) + '× pace; outbreak: one person staggers, falls and turns, ' + panicked + ' run; goals: ' + [g0, gFood, gMore, out, inside, night].map(g => g.text.split(' ')[0]).join(' → '));
  }
  // v0.31: a hit on a zombie sends an impact (blood spray, hit marker for the player who landed it), a kill a bigger one
  { const Ef = await import('../src/systems/effects.js'), Ai4 = await import('../src/entities/ai.js');
    const seen = [], keep = Ef.hooks.impact; Ef.hooks.impact = (x, z, k, by, melee) => seen.push([k, by, !!melee]);
    const pl = T.player, z = T.makeAgent(pl.pos.x + 30, pl.pos.z); T.becomeZombie(z, 'walker'); T.agents.push(z);
    Ai4.hurtZombie(z, 1, 1, 0, .2, true, false, pl); Ai4.hurtZombie(z, 999, 1, 0, .5, false, false, pl); Ef.hooks.impact = keep; z.gone = true;
    if (seen.length !== 2 || seen[0][0] !== 0 || seen[1][0] !== 1 || seen[0][1] !== pl.id || seen[0][2] || !seen[1][2] || !Ef.FX.impact) vfail('impacts: ' + JSON.stringify(seen));
    console.log('v0.31: impacts ' + JSON.stringify(seen) + ' (hit by gun, kill by a blow)');
  }
  // v0.30: vaulting: Space over a bench lands on the far side, a building wall only hops, running into a car vaults it
  { const Col3 = await import('../src/world/collision.js'), Vt = await import('../src/systems/vault.js'), H2 = await import('../src/config/handling.js'), City = await import('../src/world/city.js');
    const pl = T.player, x0 = pl.pos.x, z0 = pl.pos.z, inv0 = pl.inv; pl.inv = 1e9; pl.reloadT = 0; delete pl.trapT;   // a player never caught in a trap has no trapT
    const lows = Col3.solids.filter(b => b.low), kinds = lows.length;
    // a low box with room on both sides along x
    let done = null;
    for (const b of lows) {
      const w = b.x1 - b.x0; if (w > 2.2) continue; const cz = (b.z0 + b.z1) / 2, sx = b.x0 - .9;
      if (!Col3.freeAt(sx, cz, .36) || !Col3.freeAt(b.x1 + .9, cz, .36)) continue;
      pl.pos.x = sx; pl.pos.z = cz; Object.assign(pl.input, { mx: 0, mz: 0, mag: 0, run: false, stance: 0, ads: false, jumpQ: .25, face: Math.PI / 2, fire: false, fireQ: 0 }); pl.face = Math.PI / 2;
      P.updatePlayer(pl, 1 / 60); const went = !!pl.vault; let peak = 0;
      for (let i = 0; i < 60; i++) { P.updatePlayer(pl, 1 / 60); peak = Math.max(peak, pl.airH); }
      if (went) { done = { from: sx, to: pl.pos.x, x1: b.x1, peak }; break; }
    }
    // a building wall: no vault, only a hop
    const bd = City.buildings[0]; pl.pos.x = bd.cx - bd.w / 2 - .6; pl.pos.z = bd.cz; pl.face = Math.PI / 2; Object.assign(pl.input, { jumpQ: .25, mag: 0 }); P.updatePlayer(pl, 1 / 60);
    const wallVault = !!pl.vault, hopped = pl.hop > 0; for (let i = 0; i < 40; i++) P.updatePlayer(pl, 1 / 60);
    pl.vault = null; pl.airH = 0; pl.hop = 0; pl.pos.x = x0; pl.pos.z = z0; pl.inv = inv0; Object.assign(pl.input, { jumpQ: 0, mag: 0, run: false });
    if (kinds < 50 || !done || done.to < done.x1 + .2 || done.peak < H2.VAULT.height * .8 || wallVault || !hopped) vfail('vault: ' + kinds + ' low boxes, ' + JSON.stringify(done) + ', vaulted a building ' + wallVault + ', hopped ' + hopped);
    console.log('v0.30: ' + kinds + ' low obstacles; vaulted one from x ' + done.from.toFixed(1) + ' to ' + done.to.toFixed(1) + ' (far side ' + done.x1.toFixed(1) + ', ' + done.peak.toFixed(2) + ' m up); a building wall only hops');
  }
  // v0.29: aiming down the sights tightens the spread, bursts widen it, prone is slow and hard to notice
  { const Cb3 = await import('../src/systems/combat.js'), H = await import('../src/config/handling.js'), It4 = await import('../src/config/items.js'), Ai3 = await import('../src/entities/ai.js');
    const pl = T.player, def = It4.DEF.rifle_p, hip = Cb3.spreadOf(Object.assign({}, pl, { ads: false, stance: 0, bloom: 0 }), def), aim = Cb3.spreadOf(Object.assign({}, pl, { ads: true, stance: 2, bloom: 0 }), def), burst = Cb3.spreadOf(Object.assign({}, pl, { ads: false, stance: 0, bloom: H.BLOOM.max }), def);
    if (!(aim < hip * .5 && burst > hip * 2)) vfail('spread: hip ' + hip + ', aimed prone ' + aim + ', after a burst ' + burst);
    const x0 = pl.pos.x, z0 = pl.pos.z, inv0 = pl.inv; pl.inv = 1e9; const bag0 = pl.gear.eq.primary, act0 = pl.gear.active;
    const walk = (stance, ads) => { pl.pos.x = x0; pl.pos.z = z0; Object.assign(pl.input, { mx: 1, mz: 0, mag: 1, run: false, stance, ads, face: Math.PI / 2, fire: false }); const x = pl.pos.x; for (let i = 0; i < 30; i++) P.updatePlayer(pl, 1 / 30); return pl.pos.x - x; };
    pl.gear.eq.primary = { id: 'rifle_p', mag: 30 }; pl.gear.active = 'primary';
    const dStand = walk(0, false), dAds = walk(0, true), dProne = walk(2, false), proneNow = pl.stance === 2 && pl.sneak;
    pl.gear.eq.primary = { id: 'rifle_p', mag: 30 }; pl.bloom = 0; pl.cool = 0; Object.assign(pl.input, { mag: 0, stance: 0, ads: false, fire: true }); for (let i = 0; i < 45; i++) P.updatePlayer(pl, 1 / 30); const bl = pl.bloom;
    Object.assign(pl.input, { fire: false, stance: 0, ads: false }); P.updatePlayer(pl, 1 / 30);
    pl.gear.eq.primary = bag0; pl.gear.active = act0; pl.pos.x = x0; pl.pos.z = z0; pl.inv = inv0;
    if (!(dAds < dStand * .7 && dProne < dStand * .3 && proneNow && bl > .25)) vfail('stances: walked ' + dStand.toFixed(2) + ' / aiming ' + dAds.toFixed(2) + ' / prone ' + dProne.toFixed(2) + ' m, prone flag ' + proneNow + ', bloom after a burst ' + bl);
    console.log('v0.29: spread hip ' + hip.toFixed(3) + ' / aimed prone ' + aim.toFixed(3) + ' / after a burst ' + burst.toFixed(3) + ', walked 1 s ' + dStand.toFixed(1) + ' / aiming ' + dAds.toFixed(1) + ' / prone ' + dProne.toFixed(1) + ' m, bloom ' + bl.toFixed(2));
  }
  // v0.28: first-person view: keys move relative to where the view looks, the player faces it, back to the isometric view
  { const Fp = await import('../src/ui/fps.js'), Rd = await import('../src/core/renderer.js'), In = await import('../src/ui/input.js'), Ct = await import('../src/core/controls.js');
    const pl = T.player; Fp.setFps(true); Rd.view.yaw = Math.PI / 2; Ct.keys.KeyW = true; In.pollInput(pl); Ct.keys.KeyW = false;
    const I = pl.input, okW = Math.abs(I.mx - 1) < 1e-6 && Math.abs(I.mz) < 1e-6 && I.face === Math.PI / 2;
    const [rx, rz] = Fp.fpsMove(1, 0), okR = Math.abs(rx) < 1e-6 && Math.abs(rz - 1) < 1e-6;   // facing +x, right is +z
    Fp.look(100, -50, false); const turned = Rd.view.yaw < Math.PI / 2 && Rd.view.pitch > 0;
    const arrow = Rd.screenAngle(Math.sin(Rd.view.yaw), Math.cos(Rd.view.yaw));
    Fp.setFps(false); In.pollInput(pl);
    if (!okW || !okR || !turned || Math.abs(arrow) > 1e-6 || Rd.view.fps || Rd.activeCam() !== Rd.camera) vfail('first person: W ' + okW + ' (' + I.mx + ',' + I.mz + ', face ' + I.face + '), right ' + okR + ', look ' + turned + ', arrow ' + arrow);
    console.log('v0.28: first person moves with the view (W along the look, D to its right), faces it, mouse turns it, back to isometric');
  }
  // v0.27: a bitten person falls down, turns, and lies still while getting up; the zombie clips are in anims.glb
  { const Ai = await import('../src/entities/ai.js'), Zc = await import('../src/config/zombies.js'), fs2 = await import('node:fs'), { RC } = await import('../src/config/world.js');
    const pl = T.player, px = pl.pos.x, pz = pl.pos.z; pl.pos.x = 60; pl.pos.z = 60;
    const h = T.makeAgent(RC[2] + 2, RC[2] + 2); T.agents.push(h); h.state = 'infected'; h.turnT = Zc.RISE.fall + .3; h.panic = 5; h.tx = 1; h.tz = 0;
    let moved = 0, fell = false; for (let i = 0; i < 60 && h.state === 'infected'; i++) { const x = h.pos.x; Ai.updateHuman(h, 1 / 30); if (h.state === 'infected' && h.turnT < Zc.RISE.fall) { fell = true; moved += Math.abs(h.pos.x - x); } }
    if (!fell || moved > 0 || h.state !== 'zombie' || !(h.rise > 1.5)) vfail('turning: fell ' + fell + ', moved ' + moved + ' while down, state ' + h.state + ', rise ' + h.rise);
    const x0 = h.pos.x, z0 = h.pos.z; for (let i = 0; i < 30; i++) Ai.updateZombie(h, 1 / 30);
    if (Math.hypot(h.pos.x - x0, h.pos.z - z0) > 0 || !(h.rise > 0)) vfail('a zombie getting up moved: ' + (h.pos.x - x0).toFixed(2) + ', rise ' + h.rise);
    for (let i = 0; i < 60; i++) Ai.updateZombie(h, 1 / 30); if (h.rise > 0) vfail('still getting up after ' + Zc.RISE.up + ' s');
    h.gone = true; pl.pos.x = px; pl.pos.z = pz;
    const glb = fs2.readFileSync(new URL('../assets/characters/anims.glb', import.meta.url)), json = glb.toString('utf8', 20, 20 + glb.readUInt32LE(12));
    const names = JSON.parse(json).animations.map(a => a.name), want = ['Z_Idle', 'Z_Idle2', 'Z_Walk', 'Z_Walk2', 'Z_Run', 'Z_Punch', 'Z_Attack', 'Z_Hit', 'Z_Fall', 'Z_StandUp', 'Walk', 'Death'];
    const miss = want.filter(n => !names.includes(n)); if (miss.length) vfail('anims.glb is missing ' + miss.join(', '));
    console.log('v0.27: a bitten person fell, turned and got up in ' + Zc.RISE.up + ' s without moving; ' + names.filter(n => n.startsWith('Z_')).length + ' zombie clips in anims.glb');
  }
  // v0.23: gas cylinders blow up when shot (chain, blown list saved), Molotov fire, grenades, farm weapons, town extras
  { const Ex = await import('../src/world/extras.js'), Bl = await import('../src/systems/blast.js'), Th = await import('../src/systems/throw.js'), Cb = await import('../src/systems/combat.js'), It2 = await import('../src/config/items.js'), Cl2 = await import('../src/world/clutter.js'), Col2 = await import('../src/world/collision.js');
    const pl = T.player, bag0 = pl.gear.bag.slice(); pl.inv = 1e9; T.G.blown = []; Bl.applyTanks(); Bl.clearFires();
    if (Ex.tanks.length < 10 || !Ex.tanks.some(t => t.kind === 'propane') || !Ex.tanks.some(t => t.kind === 'gas')) vfail('tanks: ' + Ex.tanks.length);
    // stand 6 m off a propane cylinder with a clear shot (v0.33: power poles stand on the sidewalks), facing it, with a
    // zombie next to the cylinder; one pistol shot
    const shotAt = t => { for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = t.x + dx * 6, zz = t.z + dz * 6; if (Col2.freeAt(x, zz, .5) && Col2.rayWall(x, zz, -dx, -dz, 6) > 5.6) return [x, zz, -dx, -dz]; } return null; };
    // the zombie stands beside the cylinder, not in the line of fire
    const I3 = await import('../src/world/interiors.js');
    const zAt = (t, st) => { for (const [ox, oz] of [[st[3] * 1.3, -st[2] * 1.3], [-st[3] * 1.3, st[2] * 1.3], [st[2] * 1.3, st[3] * 1.3]]) { const x = t.x + ox, zz = t.z + oz; if (Col2.freeAt(x, zz, .4) && !I3.walledOff(t.x, t.z, x, zz)) return [x, zz]; } return null; };
    let tk = Ex.tanks.findIndex(t => t.kind === 'propane' && shotAt(t) && zAt(t, shotAt(t))); if (tk < 0) tk = Ex.tanks.findIndex(t => t.kind === 'propane');
    const t0 = Ex.tanks[tk], st = shotAt(t0), zs = st && zAt(t0, st);
    const z = T.makeAgent(t0.x + 1.2, t0.z); T.becomeZombie(z, 'zombie'); T.agents.push(z);
    if (!st || !zs) vfail('no clear shot at a cylinder'); else {
      pl.pos.x = st[0]; pl.pos.z = st[1]; pl.face = Math.atan2(st[2], st[3]);
      z.pos.x = zs[0]; z.pos.z = zs[1]; z.feed = 99;
      const w = { id: 'pistol_c', mag: 12 }, d0 = It2.DEF.pistol_c, sp = d0.spread; d0.spread = 0; Cb.fireGun(pl, w, d0); d0.spread = sp;
      for (let i = 0; i < 30; i++) Bl.updateFires(1 / 30);
      if (!T.G.blown.includes(tk) || Col2.solids.includes(t0.box)) vfail('shot cylinder did not blow: ' + JSON.stringify(T.G.blown));
      if (z.state === 'zombie') vfail('zombie next to the blast survived (hp ' + z.hp + ')');
    }
    const blownN = T.G.blown.length; S.saveGame(); T.G.blown = []; Bl.applyTanks(); S.loadGame(); if (T.G.blown.length !== blownN || !Ex.tanks[tk].entry.gone) vfail('blown cylinders not restored from the save');
    // a Molotov burns a zombie standing in it, a grenade blows one up
    pl.pos.x = 0; pl.pos.z = -4; pl.face = 0; pl.input.aim = false; pl.gear.bag = [{ id: 'molotov', n: 1 }, { id: 'grenade', n: 1 }, { id: 'bottle', n: 2 }];
    if (Th.throwPick(pl.gear) !== 'bottle') vfail('default throwable should be the bottle'); Th.pickThrow(pl, 'molotov'); if (Th.throwPick(pl.gear) !== 'molotov') vfail('picked throwable');
    const z2 = T.makeAgent(0, -4 + 9.6); T.becomeZombie(z2, 'zombie'); T.agents.push(z2); z2.feed = 99;
    Th.throwBottle(pl); for (let i = 0; i < 300; i++) { Th.updateThrows(1 / 30); Bl.updateFires(1 / 30); z2.pos.x = 0; z2.pos.z = -4 + 9.6; }
    const burnt = z2.state !== 'zombie' || z2.hp < z2.maxHp * .5;
    Th.pickThrow(pl, 'grenade'); const z3 = T.makeAgent(0, -4 + 9.6); T.becomeZombie(z3, 'zombie'); T.agents.push(z3); z3.feed = 99;
    Th.throwBottle(pl); for (let i = 0; i < 90; i++) { Th.updateThrows(1 / 30); Bl.updateFires(1 / 30); }
    if (!burnt || z3.state === 'zombie') vfail('Molotov burnt ' + burnt + ', grenade killed ' + (z3.state !== 'zombie') + ' (' + z3.hp + ')');
    if (Th.throwPick(pl.gear) !== 'bottle') vfail('after the grenade the bottles are next'); Bl.clearFires();
    // the farm rolls its own tools; town extras are there
    const fr = Array.from({ length: 400 }, () => Dr.rollLoot('day', 'farm')).map(it => it.id), tools = fr.filter(id => ['pitchfork_c', 'sickle_c', 'spade_c', 'pickaxe_c', 'dbshotgun_c'].includes(id));
    if (!tools.length || fr.some(id => It2.DEF[id].kind === 'weapon' && !tools.includes(id))) vfail('farm weapons: ' + [...new Set(fr.filter(id => It2.DEF[id].kind === 'weapon'))]);
    const ids = id => Dc.decor.filter(d => d.id === id).length, stops = Cl2.heavy.filter(h => h.id === 'c_busstop').length;
    if (stops < 2 || ids('c_bench') < 5 || ids('n_corn1') + ids('n_corn2') < 100 || ids('n_wheat') < 50) vfail('extras: bus stops ' + stops + ', benches ' + ids('c_bench') + ', corn ' + (ids('n_corn1') + ids('n_corn2')) + ', wheat ' + ids('n_wheat'));
    T.G.blown = []; Bl.applyTanks(); pl.gear.bag = bag0; delete pl.gear.throwId;
    console.log('v0.23: ' + Ex.tanks.length + ' gas cylinders / cans, shot one: blew ' + blownN + ' (chain), saved; Molotov burnt a zombie, grenade killed one; farm tools ' + Math.round(tools.length / 4) + '%; ' + stops + ' bus stops, ' + ids('c_bench') + ' benches, ' + ids('c_stop') + ' stop signs, ' + (ids('n_corn1') + ids('n_corn2')) + ' corn, ' + ids('n_wheat') + ' wheat');
  }
  // v0.19: every recording the game asks for is in assets/sounds/
  { const Au = await import('../src/systems/audio.js'), fs = await import('fs'); const miss = Object.values(Au.FILES).flat().filter(n => !fs.existsSync(new URL('../assets/sounds/' + n + '.mp3', import.meta.url)));
    if (miss.length) vfail('missing sounds: ' + miss); else console.log('v0.19: ' + Object.values(Au.FILES).flat().length + ' recordings (' + Object.entries(Au.FILES).map(([k, l]) => k + ' ' + l.length).join(', ') + ')'); }
  console.log('v0.18: clutter ' + Cl.heavy.filter(h => h.room < 0).length + ' solids outside (bus ' + kinds('c_bus') + ', vans ' + kinds('c_van') + ', pickups ' + kinds('c_pickup') + ', dumpsters ' + kinds('c_dumpster') + '), ' + Cl.heavy.filter(h => h.room >= 0).length + ' beds / tables and ' + inside + ' pieces in ' + rooms.length + ' rooms, ' + Dc.decor.length + ' decor');
  console.log('v0.18: infection off, no Antibiotic, ' + rc.length + ' ring colours, events ran: ' + ran.join(', '));
  console.log('v0.14.1: bag ' + g.bag.map(e => e.id + (e.n ? ' ×' + e.n : '')).join(', '));
}

console.log(errs.length ? `FAILED: ${errs.length} runtime errors\n` + errs.slice(0, 3).join('\n---\n') : 'PASSED: no runtime errors');
process.exit(errs.length ? 1 : 0);
