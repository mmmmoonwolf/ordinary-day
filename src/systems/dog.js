import {rnd,pick} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {DOG} from '../config/dog.js';
import {isClient} from '../core/bus.js';
import {lootSpots} from '../world/city.js';
import {roomAt,walledOff} from '../world/interiors.js';
import {freeAt} from '../world/collision.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {moveAgent} from '../entities/movement.js';
import {makeNoise} from '../entities/ai.js';
import {damage} from './damage.js';
import {sfx} from './audio.js';
import {uiFor} from '../ui/hud.js';

// ---------- the dog (v0.60) ----------
// G.dog (saved, sent online as `dg`): {pos, face, hp, owner (player id or -1), state 'stray' | 'follow' | 'chase' |
// 'dead', moving, atk, barkT}. Host only, every step; ui/dog.js draws it.
export function placeDog(){
  if(isPvp()){G.dog=null;return;}
  const me=players[0],spots=lootSpots.filter(s=>s.zone==='city'&&roomAt(s.x,s.z)<0&&freeAt(s.x,s.z,.6)&&(d=>d>DOG.far[0]&&d<DOG.far[1])(Math.hypot(s.x-me.pos.x,s.z-me.pos.z)));
  const s=spots.length?pick(spots):null;
  G.dog=s?{pos:{x:s.x,z:s.z},face:rnd(0,6.28),hp:DOG.hp,owner:-1,state:'stray',moving:0,atk:0,barkT:0,rad:.3,state2:'',sit:1}:null;
}
export function updateDog(dt){
  const d=G.dog;if(!d||isClient()||d.state==='dead')return;
  d.atk-=dt;d.barkT-=dt;
  if(d.owner<0){   // a stray: sits until someone comes close
    d.moving=0;const p=players.find(q=>q.alive&&!q.away&&Math.hypot(q.pos.x-d.pos.x,q.pos.z-d.pos.z)<DOG.tame);
    if(p){d.owner=p.id;d.state='follow';d.sit=0;sfx.bark(d.pos.x,d.pos.z);uiFor(p).feed('หมาตามมาแล้ว');}
    return;}
  const o=players.find(q=>q.id===d.owner);
  if(!o||o.away){d.moving=0;d.sit=1;return;}
  // bitten: the zombies right by it
  let near=0;for(const a of agents)if(a.state==='zombie'&&a.kind!=='nest'&&Math.hypot(a.pos.x-d.pos.x,a.pos.z-d.pos.z)<.9)near++;
  if(near){d.hp-=DOG.hurtBy*near*dt;if(Math.random()<dt*1.5)sfx.whine(d.pos.x,d.pos.z);}
  else d.hp=Math.min(DOG.hp,d.hp+DOG.heal*dt);
  if(d.hp<=0){d.hp=0;d.state='dead';d.moving=0;sfx.whine(d.pos.x,d.pos.z);for(const q of players)if(!q.away)uiFor(q).feed('หมาตายแล้ว','warn');return;}
  const od=Math.hypot(o.pos.x-d.pos.x,o.pos.z-d.pos.z);
  if(!o.alive||o.car>=0){d.moving=0;d.sit=1;if(o.car<0||od<DOG.lost)return;}
  if(od>DOG.lost){const a=rnd(0,6.28);d.pos.x=o.pos.x+Math.sin(a)*1.5;d.pos.z=o.pos.z+Math.cos(a)*1.5;if(!freeAt(d.pos.x,d.pos.z,.3)){d.pos.x=o.pos.x;d.pos.z=o.pos.z;}return;}   // left behind (a car ride): catches up
  d.sit=0;
  // the zombie it goes for: near its owner, in sight of it, not while it is badly hurt
  let tgt=null,td=1e9,seen=null;
  for(const a of agents){if(a.state!=='zombie'||a.kind==='nest')continue;const dd=Math.hypot(a.pos.x-d.pos.x,a.pos.z-d.pos.z);if(dd>DOG.notice||walledOff(d.pos.x,d.pos.z,a.pos.x,a.pos.z))continue;
    if(!seen||dd<seen.d)seen={a,d:dd};if(Math.hypot(a.pos.x-o.pos.x,a.pos.z-o.pos.z)<DOG.chase&&dd<td){td=dd;tgt=a;}}
  if(seen&&d.barkT<=0&&!o.sneak){d.barkT=DOG.barkEvery;sfx.bark(d.pos.x,d.pos.z);makeNoise(d.pos.x,d.pos.z,DOG.barkNoise);}
  if(tgt&&d.hp>DOG.hp*DOG.flee){
    d.state='chase';
    if(td>DOG.reach)moveAgent(d,tgt.pos.x-d.pos.x,tgt.pos.z-d.pos.z,DOG.speed,dt);
    else{d.moving=0;d.face=Math.atan2(tgt.pos.x-d.pos.x,tgt.pos.z-d.pos.z);if(d.atk<=0){d.atk=DOG.biteEvery;const l=td||1;damage(tgt,DOG.bite,{dx:(tgt.pos.x-d.pos.x)/l,dz:(tgt.pos.z-d.pos.z)/l,kb:.15,silent:true,by:o});tgt.feed=Math.max(tgt.feed||0,.25);sfx.growl2(d.pos.x,d.pos.z);}}
    return;}
  d.state='follow';
  if(od>DOG.follow)moveAgent(d,o.pos.x-d.pos.x,o.pos.z-d.pos.z,od>8?DOG.speed:DOG.walk,dt);else d.moving=0;
}
