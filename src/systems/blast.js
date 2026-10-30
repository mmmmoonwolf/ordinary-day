import {G} from '../core/state.js';
import {BLAST,FIRE} from '../config/blast.js';
import {solids} from '../world/collision.js';
import {tanks} from '../world/extras.js';
import {props} from '../world/prop-models.js';
import {rooms,walledOff,doorDist} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {hurtZombie,makeNoise} from '../entities/ai.js';
import {hurtPlayer} from './combat.js';
import {damageDoor} from './doors.js';
import {boom,addBlood,fireFx} from './effects.js';
import {sfx} from './audio.js';

// ---------- explosions and burning ground (v0.23) ----------
// blast(): hurts zombies and players in reach (not through walls), knocks at doors, is heard far and sets off gas
// cylinders close by a moment later. Fires burn zombies and players standing in them and heat cylinders until they go.
// Only the host runs this; the look (boom, flames) goes to every device as effects, the blown cylinders in G.blown.
const pending=[];   // cylinders about to go off: {i, t, by}
export const fires=[];   // {x, z, r, t (seconds left)}
export function blast(x,z,o,by){
  boom(x,1,z,.45,10);sfx.explode(x,z);makeNoise(x,z,o.noise);
  for(let i=0;i<5;i++)addBlood(x+(Math.random()*2-1)*o.r*.5,z+(Math.random()*2-1)*o.r*.5);
  for(const p of players){if(!p.alive)continue;const d=Math.hypot(p.pos.x-x,p.pos.z-z);if(d<o.r&&!walledOff(x,z,p.pos.x,p.pos.z))hurtPlayer(p,Math.round(o.pdmg*(1-d/o.r*.5)),by);}   // v0.47 by: whose it was (PvP)
  for(let k=0;k<rooms.length;k++)if(doorDist(k,x,z)<o.r)damageDoor(k,o.door);
  for(const a of agents){if(a.state!=='zombie')continue;const d=Math.hypot(a.pos.x-x,a.pos.z-z);if(d>o.r||walledOff(x,z,a.pos.x,a.pos.z))continue;
    hurtZombie(a,o.zdmg*(1-d/o.r*.5),(a.pos.x-x)/(d||1),(a.pos.z-z)/(d||1),1.4,false,true,by);}
  for(let i=0;i<tanks.length;i++)if(!G.blown.includes(i)&&!pending.some(q=>q.i===i)&&Math.hypot(tanks[i].x-x,tanks[i].z-z)<o.r*.8)pending.push({i,t:.18,by});   // a chain
  if(o.fire)ignite(x,z,o.fire[0],o.fire[1]);
}
export function ignite(x,z,r,sec){fires.push({x,z,r,t:sec,heat:{}});fireFx(x,z,r,sec);makeNoise(x,z,FIRE.noise);}
// a gas cylinder or fuel can goes off (shot, or caught in a blast or fire)
export function blowTank(i,by){
  if(G.blown.includes(i))return;G.blown.push(i);hideTank(i,true);
  const t=tanks[i];blast(t.x,t.z,BLAST[t.kind],by);
}
function hideTank(i,gone){const t=tanks[i];t.entry.gone=gone;
  if(t.entry.model)t.entry.model.visible=!gone&&props.on;if(t.entry.fallback)t.entry.fallback.visible=!gone&&!(props.on&&t.entry.model);
  const k=solids.indexOf(t.box);if(gone&&k>=0)solids.splice(k,1);else if(!gone&&k<0)solids.push(t.box);}
// G.blown -> the cylinders' looks and collision (after loading a save, a new game, or on a friend's device)
export function applyTanks(){for(let i=0;i<tanks.length;i++)hideTank(i,G.blown.includes(i));}
export function clearFires(){fires.length=0;pending.length=0;}
// the nearest cylinder a bullet from (ox,oz) along (dx,dz) hits before maxT: [t, index] or null
export function tankOnRay(ox,oz,dx,dz,maxT){
  let best=null;
  for(let i=0;i<tanks.length;i++){if(G.blown.includes(i))continue;const t=tanks[i],rx=t.x-ox,rz=t.z-oz,along=rx*dx+rz*dz;if(along<0||along>maxT)continue;if(Math.abs(rx*dz-rz*dx)<.35&&(!best||along<best[0]))best=[along,i];}
  return best;
}
export function updateFires(dt){
  for(let i=pending.length-1;i>=0;i--){const q=pending[i];q.t-=dt;if(q.t<=0){pending.splice(i,1);blowTank(q.i,q.by);}}
  for(let i=fires.length-1;i>=0;i--){
    const f=fires[i];f.t-=dt;if(f.t<=0){fires.splice(i,1);continue;}
    for(const a of agents)if(a.state==='zombie'&&Math.hypot(a.pos.x-f.x,a.pos.z-f.z)<f.r){a.burn=(a.burn||0)+FIRE.zdps*dt;if(a.burn>=7){hurtZombie(a,a.burn,0,0,0,false,true,null);a.burn=0;}}   // in bites, not every step
    for(const p of players){if(!p.alive||Math.hypot(p.pos.x-f.x,p.pos.z-f.z)>=f.r){continue;}p.burn=(p.burn||0)+FIRE.pdps*dt;if(p.burn>=1){const n=Math.floor(p.burn);p.burn-=n;hurtPlayer(p,n);}}
    for(let k=0;k<tanks.length;k++){if(G.blown.includes(k)||Math.hypot(tanks[k].x-f.x,tanks[k].z-f.z)>f.r+.4)continue;f.heat[k]=(f.heat[k]||0)+dt;if(f.heat[k]>FIRE.ignite&&!pending.some(q=>q.i===k))pending.push({i:k,t:0,by:null});}
  }
}
