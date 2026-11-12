// One way to hurt anything (systems/damage.js, v0.68): what each kind of target does with a hit, what a player's weapons
// can reach, and that nothing in src/ goes round it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { els, errs, step, T, P, finish } from './setup.js';

const fail = m => errs.push('damage: ' + m);
const D = await import('../../src/systems/damage.js'), Gm = await import('../../src/systems/game.js'), Pv = await import('../../src/systems/pvp.js');
const { ZC } = await import('../../src/config/zombies.js'), { DEF } = await import('../../src/config/items.js');
els.bStart.fire('click'); T.G.running = true; T.G.min = 12 * 60; T.G.outbreak = true; step(2);
const me = T.player; me.inv = 0; for (const a of T.agents) a.gone = true; step(2);
const at = (x, z, set) => { const a = T.makeAgent(me.pos.x + x, me.pos.z + z); set(a); T.agents.push(a); return a; };
const zed = (kind, x = 30, z = 0) => at(x, z, a => { T.becomeZombie(a, kind); a.face = Math.PI / 2; });   // faces +x

// --- kinds
const z = zed('zombie'), townie = at(34, 0, () => {}), bandit = at(38, 0, a => { a.npc = 'bandit'; a.gun = 'pistol_c'; a.hp = 100; }), friend = at(42, 0, a => { a.npc = 'survivor'; a.gun = 'pistol_c'; a.hp = 100; });
const dead = zed('zombie', 46); dead.state = 'dead';
const kinds = [[me, 'player'], [z, 'zombie'], [bandit, 'npc'], [friend, 'npc'], [townie, null], [dead, null], [null, null]];
for (const [t, k] of kinds) if (D.kindOf(t) !== k) fail('kindOf says ' + D.kindOf(t) + ' for a ' + (k || 'nobody'));

// --- a zombie: the amount comes off, armour only from the front and only against bullets
{ const hp = z.hp, r = D.damage(z, 10, { dx: 1, dz: 0, kb: 0 }); if (r !== D.HIT || z.hp !== hp - 10) fail('a zombie hit for 10 lost ' + (hp - z.hp) + ' (' + r + ')'); }
{ const a = zed('armor', 30, 6); a.hp = 1e4; const hp = a.hp, cut = 1 - ZC.armor.armor;   // enough to take all three
  if (D.damage(a, 100, { dx: -1, dz: 0, gun: true }) !== D.ARMORED || Math.abs(hp - a.hp - 100 * cut) > 1e-6) fail('a bullet into the front of an Armor Walker took ' + (hp - a.hp) + ', not ' + 100 * cut);
  const hp2 = a.hp; if (D.damage(a, 100, { dx: 1, dz: 0, gun: true }) !== D.HIT || hp2 - a.hp !== 100) fail('a bullet into its back took ' + (hp2 - a.hp));
  const hp3 = a.hp; if (D.damage(a, 50, { dx: -1, dz: 0 }) !== D.HIT || hp3 - a.hp !== 50) fail('a blow on its front took ' + (hp3 - a.hp)); a.gone = true; }
{ const k = zed('zombie', 30, 12), kills = T.G.kills; D.damage(k, k.hp + 1, { silent: true }); if (k.state !== 'dead' || T.G.kills !== kills + 1) fail('a zombie hit for more than it has did not die'); }
// --- people with guns, and people without
{ const hp = bandit.hp; if (!D.damage(bandit, 30, { by: me }) || bandit.hp !== hp - 30) fail('a bandit hit for 30 lost ' + (hp - bandit.hp));
  const fh = friend.hp; D.damage(friend, 30, {}); if (friend.hp !== fh - 30) fail('a survivor in a blast lost ' + (fh - friend.hp));
  const th = townie.hp; if (D.damage(townie, 30, { by: me }) !== D.MISS || townie.hp !== th || townie.state !== 'human') fail('a townsperson was hurt');
  if (D.damage(dead, 30, {}) !== D.MISS || D.damage(null, 30) !== D.MISS) fail('the dead or nobody was hurt'); }
// --- a player: hurt, and not when they cannot be
{ me.hp = 100; if (!D.damage(me, 10) || me.hp >= 100) fail('the player was not hurt: ' + me.hp);
  me.inv = 5; const hp = me.hp; if (D.damage(me, 10) !== D.MISS || me.hp !== hp) fail('an untouchable player was hurt'); me.inv = 1e9; }
// --- what a player's weapons reach: zombies and bandits, not survivors, not townspeople
{ const seen = D.targetsOf(me);
  if (!seen.includes(z) || !seen.includes(bandit)) fail('targetsOf misses a zombie or a bandit');
  if (seen.includes(friend) || seen.includes(townie) || seen.includes(dead) || seen.includes(me)) fail('targetsOf holds a survivor, a townsperson, the dead or the player');
  const turned = at(50, 0, a => { a.npc = 'bandit'; a.gun = 'pistol_c'; }); T.becomeZombie(turned, 'zombie');
  if (D.kindOf(turned) !== 'zombie' || !D.targetsOf(me).includes(turned)) fail('a bandit that turned is not a zombie to a weapon');
  const keep = []; if (D.targetsOf(me, keep) !== keep) fail('targetsOf did not fill the list it was given'); }
// --- PvP: the other side is a target, your own is not; a weapon's hit lands, the same side's does not
{ Pv.startPvp('team'); T.G.running = true; const a = T.player, mate = Gm.addPlayer(), foe = Gm.addPlayer(); step(3);
  a.team = 0; mate.team = 0; foe.team = 1; for (const p of [a, mate, foe]) { p.inv = 0; p.hp = 100; p.shield = false; }
  const seen = D.targetsOf(a); if (!seen.includes(foe) || seen.includes(mate) || seen.includes(a)) fail('PvP targets: foe ' + seen.includes(foe) + ' mate ' + seen.includes(mate));
  if (!D.damage(foe, DEF.pistol_c.dmg, { by: a, dx: 1, dz: 0, gun: true }) || foe.hp >= 100) fail('a shot did not hurt the other team: ' + foe.hp);
  if (D.damage(mate, DEF.pistol_c.dmg, { by: a, dx: 1, dz: 0, gun: true }) !== D.MISS || mate.hp !== 100) fail('a shot hurt a team mate: ' + mate.hp);
  for (const p of P.players.slice(1)) p.away = true; }

// --- nothing in src/ hurts anything except through damage()
{ const src = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src'), files = [];
  const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js')) files.push(p); } }; walk(src);
  for (const f of files) {
    if (f.endsWith(join('systems', 'damage.js'))) continue;
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/(?<![\w.])(hurtZombie|hurtPlayer|hurtNpc)\(/.test(code) && !/export function (hurtZombie|hurtPlayer|hurtNpc)\(/.test(code)) fail(f.slice(src.length + 1) + ':' + (i + 1) + ' calls ' + RegExp.$1 + '() itself; it should say damage()');
    });
  } }
console.log('damage: zombie, armour front and back, bandit, survivor, townsperson, player, PvP sides; every caller in src/ goes through damage()');
finish('damage');
