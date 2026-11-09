import {rnd,wpick} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {DIRECTOR,BLOOD} from '../config/director.js';
import {GOAL_NIGHTS,nightsSurvived} from '../config/goal.js';
import {inWorld} from '../config/world.js';
import {freeAt} from '../world/collision.js';
import {roomAt} from '../world/interiors.js';
import {agents,makeAgent,becomeZombie} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {horde} from './events.js';
import {sfx} from './audio.js';

// ---------- the director (v0.52) ----------
// Paces the zombies against how the players are doing (config/director.js), and runs the blood night. Host, every
// step of a survival game after the outbreak.
let t=0;
export const isBlood=()=>!isPvp()&&G.phase==='night'&&nightsSurvived(G.min)===GOAL_NIGHTS-1;
export function updateDirector(dt){
  if(isPvp()||!G.outbreak)return;
  G.blood=isBlood();
  if(G.blood&&G.bloodHordes&&G.bloodHordes.length&&G.min>=G.bloodHordes[0]){G.bloodHordes.shift();horde(BLOOD.size);sfx.roar(0,0,2);}
  if((t+=dt)<DIRECTOR.every)return;t=0;
  const here=players.filter(p=>p.alive&&!p.away);if(!here.length)return;
  const hp=here.reduce((s,p)=>s+p.hp/p.maxHp,0)/here.length;
  const chasing=agents.filter(a=>a.state==='zombie'&&!a.gone&&a.seenP&&here.includes(a.seenP)).length;
  G.calm=chasing?0:(G.calm||0)+DIRECTOR.every;
  if(hp<DIRECTOR.hurtHp||chasing>=DIRECTOR.swarm){if(G.phase==='night')G.nightSpawnNext=Math.max(G.nightSpawnNext,G.min+DIRECTOR.breathe);return;}   // a breather
  if(G.calm>=DIRECTOR.calm&&hp>=DIRECTOR.wellHp){G.calm=0;wave(here[Math.floor(Math.random()*here.length)]);}
}
// a few zombies from out of sight, on their way to where the player is
export function wave(p){
  const [a,b]=DIRECTOR.wave,n=Math.round(rnd(a-.49,b+.49)),mix=G.phase==='night'?DIRECTOR.night:DIRECTOR.day;let made=0;
  for(let k=0;k<40&&made<n;k++){
    const ang=rnd(0,Math.PI*2),d=rnd(...DIRECTOR.dist),x=p.pos.x+Math.cos(ang)*d,z=p.pos.z+Math.sin(ang)*d;
    if(!inWorld(x,z,1)||!freeAt(x,z,.5)||roomAt(x,z)>=0)continue;
    const zb=makeAgent(x,z);becomeZombie(zb,wpick(mix));zb.heard={x:p.pos.x,z:p.pos.z,t:12};agents.push(zb);made++;
  }
  return made;
}
