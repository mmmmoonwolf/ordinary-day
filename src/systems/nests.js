import {rnd,pick,wpick} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {NEST,RISE} from '../config/zombies.js';
import {MED_W,THROW_W,POOLS,MATS} from '../config/loot.js';
import {isClient} from '../core/bus.js';
import {lootSpots} from '../world/city.js';
import {roomAt} from '../world/interiors.js';
import {freeAt} from '../world/collision.js';
import {agents,makeAgent,becomeZombie} from '../entities/agents.js';
import {players,nearestPlayerDist} from '../entities/player.js';
import {makeItem,spawnDrop,reachableSpot} from './drops.js';
import {sfx} from './audio.js';
import {addBlood} from './effects.js';

// ---------- nests (v0.57) ----------
// From the morning of day 2 a few heaps of swollen flesh sit in the streets (agents of kind 'nest': guns, blows, blasts
// and fire hurt them like any zombie, entities/agents.js draws them). While a player is near, one grows a zombie every
// little while that rises out of it; destroyed, it bursts and leaves a few things behind. Host only, every step.
export function placeNests(){
  G.nested=true;const out=[];
  const spots=lootSpots.filter(s=>roomAt(s.x,s.z)<0&&freeAt(s.x,s.z,1.4)&&nearestPlayerDist(s.x,s.z)>NEST.far);
  for(let k=0;k<200&&out.length<NEST.count&&spots.length;k++){
    const s=pick(spots);if(out.some(o=>Math.hypot(o.x-s.x,o.z-s.z)<NEST.apart))continue;out.push(s);
    const a=makeAgent(s.x,s.z);becomeZombie(a,'nest');a.face=rnd(0,6.28);a.nextBrood=G.min+rnd(5,NEST.every);agents.push(a);
  }
  return out.length;
}
export function updateNests(){
  if(isClient()||isPvp())return;
  if(!G.nested&&G.outbreak&&G.min>=NEST.at)placeNests();
  for(const n of agents){
    if(n.kind!=='nest')continue;
    if(n.state==='dead'){if(!n.burst)burst(n);continue;}
    if(n.state!=='zombie'||G.min<(n.nextBrood||0))continue;
    n.nextBrood=G.min+NEST.every*(G.phase==='night'?NEST.night:1)*rnd(.8,1.2);
    if(nearestPlayerDist(n.pos.x,n.pos.z)>NEST.near)continue;
    if(agents.filter(a=>a.from===n.nid&&a.state==='zombie').length>=NEST.max)continue;
    const t=rnd(0,6.28),x=n.pos.x+Math.sin(t)*1.5,z=n.pos.z+Math.cos(t)*1.5;if(!freeAt(x,z,.4))continue;
    const a=makeAgent(x,z);becomeZombie(a,G.phase==='night'?'zombie':'walker');a.from=n.nid;a.rise=RISE.up;agents.push(a);addBlood(x,z);
  }
}
// destroyed: a burst of blood and what it had swallowed (civilian things only; Police / Military stay a night thing)
function burst(n){
  n.burst=true;sfx.burst(n.pos.x,n.pos.z);for(let k=0;k<4;k++)addBlood(n.pos.x+rnd(-1,1),n.pos.z+rnd(-1,1));
  const kinds=[()=>pick(POOLS.civ.ammo),()=>wpick(MED_W.day),()=>wpick(THROW_W),()=>pick(MATS)];
  for(let k=0;k<NEST.cache;k++){const a=k/NEST.cache*6.28,[x,z]=reachableSpot(n.pos.x+Math.sin(a)*1.6,n.pos.z+Math.cos(a)*1.6);spawnDrop(makeItem(kinds[k%kinds.length]()),x,z);}
}
