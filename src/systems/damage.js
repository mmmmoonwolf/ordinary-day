import {isPvp,sideOf} from '../core/state.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {hurtZombie} from '../entities/ai.js';
import {hurtPlayer} from './combat.js';
import {hurtNpc} from './npc.js';
import {impact} from './effects.js';

// ---------- one way to hurt anything (v0.68) ----------
// Everything that can be hurt is one of a few kinds, and each kind has its own rules: a player (Kit, downed, PvP
// sides, the car they sit in), a zombie (armour, knock-back, drops), a person with a gun (survivors and bandits).
// Until this file every weapon, blast and trap chose between hurtPlayer / hurtZombie / hurtNpc itself, so a new kind
// had to be added to every one of them, and the one that was missed made a target nothing could kill (the bandit that
// turned, v0.62). Now a source says damage(target, amount, hit) and the kind decides the rest.
//
// A new kind of target: give it a name in kindOf() and a case in damage(). A new source of damage: call damage();
// if it should also find its own targets, take them from targetsOf().

// what a character is to a weapon: 'player', 'zombie', 'npc' (a living person with a gun), or null (the dead, the
// gone, and townspeople, whom nothing here hurts)
export const kindOf=t=>!t?null:t.state==='player'?'player':t.state==='zombie'?'zombie':t.npc&&t.state==='human'?'npc':null;
// agents a gun, a blow or a blast can hit (players are separate: foesOf)
export const hittable=a=>a.state==='zombie'||a.npc==='bandit'&&a.state==='human';
// v0.47 who else a player can hurt: in PvP everyone else still up, in the game and not on their side (v0.51)
export const foesOf=p=>isPvp()?players.filter(q=>q!==p&&q.alive&&!q.away&&!(q.inv>0)&&sideOf(q)!==sideOf(p)):[];
// everything player p's weapons can hit; `out` is reused by callers that ask every frame
export function targetsOf(p,out=[]){
  out.length=0;for(const a of agents)if(hittable(a))out.push(a);
  if(isPvp())for(const q of foesOf(p))out.push(q);
  return out;
}
// how far from its centre a bullet still hits it (m): the big ones are wider
export const bulletRad=t=>t.state==='player'?.42:.45+(t.rad-.34);

// Hurt target t by n.
//   by      who did it (a player for score, PvP and the hit marker; anything with a pos for "where it came from")
//   dx, dz  the direction the hit travels (unit vector), for armour, knock-back and the blood
//   kb      knock-back (m)
//   gun     a bullet: zombie armour counts
//   silent  the zombie does not learn where it came from (a blast, a trap, fire, a stab in the back)
//   melee   a blow, for the look of the hit on a player
// Returns MISS (0: it did not land, so `if(damage(...))` reads as "it hit"), HIT, or ARMORED (a zombie's armour took
// most of it).
export const MISS=0,HIT=1,ARMORED=2;
export function damage(t,n,o){
  const by=o&&o.by||null,dx=o&&o.dx||0,dz=o&&o.dz||0;
  switch(kindOf(t)){
    case 'player':{
      if(!hurtPlayer(t,n,by))return MISS;
      // a weapon's hit on another player shows like one on a zombie; blasts, fire and traps only show as the hurt
      if(by&&by.state==='player'&&(o.gun||o.melee))impact(t.pos.x,t.pos.z,dx,dz,t.alive?0:1,by.id,!!o.melee);
      return HIT;}
    case 'zombie':return hurtZombie(t,n,dx,dz,o&&o.kb||0,!!(o&&o.gun),!!(o&&o.silent),by)?ARMORED:HIT;
    case 'npc':hurtNpc(t,n,by,dx,dz);return HIT;
  }
  return MISS;
}
