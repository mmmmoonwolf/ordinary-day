import {G} from '../core/state.js';
import {OFF} from '../config/world.js';
import {DEF,STACKS} from '../config/items.js';
import {collide} from '../world/collision.js';
import {weaponModel} from '../world/item-models.js';
import {agents,makeAgent} from './agents.js';
import {moveAgent} from './movement.js';
import {updateDead,makeNoise} from './ai.js';
import {drops} from '../systems/drops.js';
import {curWeapon,pickup,freshGear} from '../systems/inventory.js';
import {aimAssist,finishReload,fireGun,meleeHit} from '../systems/combat.js';
import {updateInfection} from '../systems/infection.js';
import {updateNeeds} from '../systems/needs.js';
import {LOW_NEED} from '../config/needs.js';
import {SNEAK_SPEED} from '../config/stealth.js';
import {sfx} from '../systems/audio.js';
import {nearDoor,nearFixDoor} from '../systems/doors.js';

// ---------- players (v0.9) ----------
// `players` holds everyone in the game; `player` is the one on this device (camera, HUD, keyboard and touch).
// A player only acts through p.input (movement, aim, fire), which the local input module or a bot / the network
// fills, and through the action functions that take the player as their first argument (pickup(p,…), fireGun(p,…)…).
export const players=[];
export let player;
export function setPlayer(p){player=p;}
const LOOKS=[{shirt:'#c4612a',pants:'#24272c',skin:'#d8a882',hair:'#15130f'},{shirt:'#3d6fb6',pants:'#2d2a26',skin:'#b98762',hair:'#2a1d12'},
  {shirt:'#4f8f4a',pants:'#33302a',skin:'#e0b896',hair:'#5a3a1e'},{shirt:'#c9a227',pants:'#22252a',skin:'#8d5e3c',hair:'#0f0d0b'}];
export const freshInput=()=>({mx:0,mz:0,mag:0,run:false,sneak:false,slow:false,aim:false,face:null,aimDist:0,fire:false,fireQ:0});
export function makePlayer(i=0){
  const p=makeAgent(OFF+i*1.3,OFF,LOOKS[i%LOOKS.length]);
  Object.assign(p,{state:'player',id:i,local:false,hp:100,maxHp:100,alive:true,swing:0,swingDur:.4,hitDone:true,lastHit:-99,face:Math.PI*1.25,cool:0,reloadT:0,recoil:0,aimT:0,held:null,heldId:'fist',down:0,inv:0,
    infect:0,infWarn:0,food:100,water:100,needWarn:0,starving:false,room:-1,nearDoor:-1,fixDoor:-1,near:null,full:null,sneak:false,runNoise:0,stay:null,endCause:null,gear:freshGear(),input:freshInput()});
  return p;
}
// players that zombies can go after
export const targets=()=>players.filter(p=>p.alive&&p.down<=0);
export function nearestPlayerDist(x,z){let d=1e9;for(const p of players)if(p.alive)d=Math.min(d,Math.hypot(p.pos.x-x,p.pos.z-z));return d;}
function nearestPickable(p){let best=null,bd=1.6;for(const d of drops){const k=DEF[d.item.id].kind;if(k!=='weapon'&&k!=='bag')continue;const dist=Math.hypot(d.x-p.pos.x,d.z-p.pos.z);if(dist<bd){bd=dist;best=d;}}return best;}
export function updatePlayer(p,dt){
  if(!p.alive){updateDead(p,dt);return;}
  if(p.inv>0)p.inv-=dt;
  if(p.down>0){p.down-=dt;p.moving=0;const k=1-p.down/1.8;p.b.body.rotation.x=-Math.sin(Math.min(1,k)*Math.PI)*Math.PI/2;
    if(p.down<=0){p.b.body.rotation.x=0;p.hp=p.maxHp;p.inv=3;for(const z of agents){if(z.state!=='zombie')continue;const dx=z.pos.x-p.pos.x,dz=z.pos.z-p.pos.z,d=Math.hypot(dx,dz);if(d<4&&d>1e-3){z.pos.x+=dx/d*3;z.pos.z+=dz/d*3;collide(z.pos,z.rad);z.feed=1;}}}
    return;}
  const I=p.input,mag=I.mag;
  // sneak (v0.7): hold C, or on touch push the stick only a little (it is already that slow)
  p.sneak=!I.run&&(I.slow||I.sneak);
  if(I.face!==null)p.face=I.face;
  if(p.aimT>0)p.aimT-=dt;
  const w=curWeapon(p),def=DEF[w.id];
  const heavy=def.heavy&&(I.fire||p.aimT>0)?.7:1;
  if(mag>.08){moveAgent(p,I.mx,I.mz,(I.slow&&!I.run?SNEAK_SPEED:(I.run?5.8:3.4)*Math.max(.45,mag))*heavy,dt,I.aim||p.aimT>0);
    if(I.run&&G.phase==='night'){p.runNoise-=dt;if(p.runNoise<=0){p.runNoise=.5;makeNoise(p.pos.x,p.pos.z,5);}}}
  else p.moving=0;
  if(p.cool>0)p.cool-=dt;
  if(p.reloadT>0){p.reloadT-=dt;if(p.reloadT<=0)finishReload(p);}
  if(I.fireQ>0)I.fireQ-=dt;
  if((I.fire||I.fireQ>0)&&p.cool<=0&&p.reloadT<=0){
    if(def.gun){if(def.auto||I.fireQ>0){I.fireQ=0;aimAssist(p,def);fireGun(p,w,def);}}
    else{I.fireQ=0;aimAssist(p,def);if(p.local)sfx.swing();p.swing=p.swingDur=def.cd;p.hitDone=false;p.cool=def.cd;p.aimT=.3;}
  }
  if(p.swing>0){p.swing-=dt;if(!p.hitDone&&p.swing<p.swingDur*.55){p.hitDone=true;meleeHit(p,def);}}
  p.recoil=Math.max(0,p.recoil-dt*8);
  // walk-over pickups; what is in reach for E / the pick button (ui/prompts.js shows it for the local player)
  let full=null;   // an item underfoot that does not fit in the bag
  for(let i=drops.length-1;i>=0;i--){const d=drops[i];if(!STACKS.has(DEF[d.item.id].kind))continue;
    const dist=Math.hypot(d.x-p.pos.x,d.z-p.pos.z);if(d.hold){if(dist>1.4)d.hold=false;continue;}   // just dropped: wait until the player walks away
    if(dist<.9&&!pickup(p,d,true))full=d;}
  const np=nearestPickable(p);p.full=!np&&full?full:null;p.near=p.full?null:np;
  p.nearDoor=p.full||np?-1:nearDoor(p);p.fixDoor=nearFixDoor(p);
  if(performance.now()/1000-p.lastHit>6&&p.hp<p.maxHp&&!(p.infect>0)&&p.food>=LOW_NEED&&p.water>=LOW_NEED)p.hp=Math.min(p.maxHp,p.hp+1.5*dt);
  updateInfection(p,dt);updateNeeds(p,dt);
}
export function syncHeld(p){
  const id=curWeapon(p).id;if(id===p.heldId)return;p.heldId=id;
  if(p.held){p.b.armR.remove(p.held);p.held=null;}
  if(id==='fist')return;
  const def=DEF[id],m=weaponModel(def.model);m.position.y=-.66;if(def.gun)m.rotation.x=Math.PI/2;
  p.b.armR.add(m);p.held=m;
}
