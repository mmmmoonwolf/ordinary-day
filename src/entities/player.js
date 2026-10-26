import {G} from '../core/state.js';
import {OFF} from '../config/world.js';
import {DEF,STACKS} from '../config/items.js';
import {collide} from '../world/collision.js';
import {weaponModel} from '../world/item-models.js';
import {handOf} from './skins.js';
import {agents,makeAgent} from './agents.js';
import {moveAgent} from './movement.js';
import {updateDead,makeNoise} from './ai.js';
import {drops} from '../systems/drops.js';
import {curWeapon,pickup,freshGear} from '../systems/inventory.js';
import {aimAssist,finishReload,fireGun,meleeHit,die} from '../systems/combat.js';
import {updateInfection,cureInfection} from '../systems/infection.js';
import {updateNeeds} from '../systems/needs.js';
import {LOW_NEED} from '../config/needs.js';
import {STANCE,ADS,BLOOM} from '../config/handling.js';
import {sfxFor} from '../systems/audio.js';
import {nearDoor,nearFixDoor} from '../systems/doors.js';
import {nearBoxOf,keepSearching} from '../systems/search.js';
import {CRAWL_SPEED,REVIVE_SECONDS,REVIVE_RANGE,REVIVE_HP} from '../config/party.js';
import {uiFor} from '../ui/hud.js';

// ---------- players (v0.9) ----------
// `players` holds everyone in the game; `player` is the one on this device (camera, HUD, keyboard and touch).
// A player only acts through p.input (movement, aim, fire), which the local input module or a bot / the network
// fills, and through the action functions that take the player as their first argument (pickup(p,…), fireGun(p,…)…).
export const players=[];
export let player;
export function setPlayer(p){player=p;}
const LOOKS=[{shirt:'#c4612a',pants:'#24272c',skin:'#d8a882',hair:'#15130f'},{shirt:'#3d6fb6',pants:'#2d2a26',skin:'#b98762',hair:'#2a1d12'},
  {shirt:'#4f8f4a',pants:'#33302a',skin:'#e0b896',hair:'#5a3a1e'},{shirt:'#c9a227',pants:'#22252a',skin:'#8d5e3c',hair:'#0f0d0b'}];
export const freshInput=()=>({mx:0,mz:0,mag:0,run:false,sneak:false,slow:false,aim:false,face:null,aimDist:0,fire:false,fireQ:0,ads:false,stance:0});   // v0.29 aiming down the sights, 0 standing / 1 crouched / 2 prone
export function makePlayer(i=0){
  const p=makeAgent(OFF+i*1.3,OFF,LOOKS[i%LOOKS.length]);
  Object.assign(p,{state:'player',id:i,name:'ผู้เล่น '+(i+1),local:false,away:false,token:null,hp:100,maxHp:100,alive:true,swing:0,swingDur:.4,hitDone:true,lastHit:-99,face:Math.PI*1.25,cool:0,reloadT:0,recoil:0,aimT:0,held:null,heldId:'fist',down:0,inv:0,
    infect:0,infWarn:0,food:100,water:100,needWarn:0,starving:false,room:-1,nearDoor:-1,bleed:0,reviveT:0,helping:null,helpT:0,nearDown:null,fixDoor:-1,nearBox:-1,searching:-1,searchT:0,searchHit:0,near:null,full:null,sneak:false,stance:0,ads:false,bloom:0,runNoise:0,stay:null,endCause:null,gear:freshGear(),input:freshInput()});
  return p;
}
// players that zombies can go after (v0.12: not one whose device has dropped out of the game, p.away)
export const targets=()=>players.filter(p=>p.alive&&p.down<=0&&!p.away);
export const isDown=p=>p.alive&&p.bleed>0;
// more than one player in the game: the bag and the pause menu no longer stop the world, no ×2 / ×4 (v0.11)
export const isSolo=()=>players.filter(p=>!p.away).length<2;
// who the camera, sounds and cutaway follow: the player on this device, or once they are dead a teammate still alive
export function viewed(){
  if(!player||player.alive)return player;
  return players.find(q=>q.alive&&!(q.bleed>0))||players.find(q=>q.alive)||player;
}
const hasKit=p=>p.gear.bag.some(e=>e.id==='resurrect');
// how many are still in the game (down counts); the world scales with it (config/party.js, v0.10)
export const partySize=()=>Math.max(1,players.filter(p=>p.alive&&!p.away).length);
export function nearestPlayerDist(x,z){let d=1e9;for(const p of players)if(p.alive)d=Math.min(d,Math.hypot(p.pos.x-x,p.pos.z-z));return d;}
function nearestPickable(p){let best=null,bd=1.6;for(const d of drops){const k=DEF[d.item.id].kind;if(k!=='weapon'&&k!=='bag')continue;const dist=Math.hypot(d.x-p.pos.x,d.z-p.pos.z);if(dist<bd){bd=dist;best=d;}}return best;}
export function updatePlayer(p,dt){
  if(!p.alive){updateDead(p,dt);return;}
  if(p.inv>0)p.inv-=dt;
  if(p.down>0){p.down-=dt;p.moving=0;   // the Resurrection Kit knock-down (pose in animation.js)
    if(p.down<=0){p.hp=p.maxHp;p.inv=3;for(const z of agents){if(z.state!=='zombie')continue;const dx=z.pos.x-p.pos.x,dz=z.pos.z-p.pos.z,d=Math.hypot(dx,dz);if(d<4&&d>1e-3){z.pos.x+=dx/d*3;z.pos.z+=dz/d*3;collide(z.pos,z.rad);z.feed=1;}}}
    return;}
  if(p.bleed>0){updateDowned(p,dt);return;}
  const I=p.input,mag=I.mag;
  // stances (v0.29): crouched (C, the old sneak; on touch also a lightly pushed stick) or prone (Z); running stands up
  p.stance=I.run?0:Math.max(I.stance|0,I.slow||I.sneak?1:0);p.sneak=p.stance>0;
  if(I.face!==null)p.face=I.face;
  if(p.aimT>0)p.aimT-=dt;
  const w=curWeapon(p),def=DEF[w.id];
  p.ads=!!(I.ads&&def.gun&&!I.run&&p.reloadT<=0);p.bloom=Math.max(0,p.bloom-dt*BLOOM.decay);   // v0.29 aiming down the sights
  const heavy=(def.heavy&&(I.fire||p.aimT>0)?.7:1)*(p.ads?ADS.speed:1);
  if(p.trapT>0){p.trapT-=dt;p.moving=0;}   // v0.26 caught in a bear trap
  else if(mag>.08){moveAgent(p,I.mx,I.mz,(p.stance?STANCE[p.stance].speed:(I.run?5.8:3.4)*Math.max(.45,mag))*heavy,dt,I.aim||p.aimT>0||p.ads);
    if(I.run&&G.phase==='night'){p.runNoise-=dt;if(p.runNoise<=0){p.runNoise=.5;makeNoise(p.pos.x,p.pos.z,5);}}}
  else p.moving=0;
  if(p.cool>0)p.cool-=dt;
  if(p.reloadT>0){p.reloadT-=dt;if(p.reloadT<=0)finishReload(p);}
  if(I.fireQ>0)I.fireQ-=dt;
  if(p.helping&&!keepHelping(p,dt)){if(isDown(p.helping))p.helping.reviveT=0;p.helping=null;}
  if(p.searching>=0&&!keepSearching(p,dt)){p.searching=-1;p.searchT=0;}   // v0.15
  if((I.fire||I.fireQ>0)&&p.cool<=0&&p.reloadT<=0){
    if(def.gun){if(def.auto||I.fireQ>0){I.fireQ=0;aimAssist(p,def);fireGun(p,w,def);}}
    else{I.fireQ=0;aimAssist(p,def);sfxFor(p).swing();p.swing=p.swingDur=def.cd;p.hitDone=false;p.cool=def.cd;p.aimT=.3;}
  }
  if(p.swing>0){p.swing-=dt;if(!p.hitDone&&p.swing<p.swingDur*.55){p.hitDone=true;if(!def.gun)meleeHit(p,def);}}
  p.recoil=Math.max(0,p.recoil-dt*8);
  // walk-over pickups; what is in reach for E / the pick button (ui/prompts.js shows it for the local player)
  let full=null;   // an item underfoot that does not fit in the bag
  for(let i=drops.length-1;i>=0;i--){const d=drops[i];if(!STACKS.has(DEF[d.item.id].kind))continue;
    const dist=Math.hypot(d.x-p.pos.x,d.z-p.pos.z);if(d.hold){if(dist>1.4)d.hold=false;continue;}   // just dropped: wait until the player walks away
    if(dist<.9&&!pickup(p,d,true))full=d;}
  p.nearDown=nearestDowned(p);
  const np=nearestPickable(p);p.full=!np&&full?full:null;p.near=p.full?null:np;
  p.nearDoor=p.full||np?-1:nearDoor(p);p.fixDoor=nearFixDoor(p);
  p.nearBox=p.full||np||p.nearDoor>=0?-1:nearBoxOf(p);
  if(performance.now()/1000-p.lastHit>6&&p.hp<p.maxHp&&!(p.infect>0)&&p.food>=LOW_NEED&&p.water>=LOW_NEED)p.hp=Math.min(p.maxHp,p.hp+1.5*dt);
  updateInfection(p,dt);updateNeeds(p,dt);
}
// ---------- downed and helping up (v0.10) ----------
// A downed player can only crawl; the clock runs down (hits take more off, see hurtPlayer) and at 0 they die.
function updateDowned(p,dt){
  const I=p.input;I.fireQ=0;p.near=p.full=p.nearDown=null;p.nearDoor=p.fixDoor=p.nearBox=p.searching=-1;
  if(I.face!==null)p.face=I.face;
  if(I.mag>.08&&!(p.reviveT>0))moveAgent(p,I.mx,I.mz,CRAWL_SPEED*Math.min(1,I.mag),dt,false);else p.moving=0;   // held still while a teammate helps
  p.moving=Math.min(p.moving,.4);
  p.bleed-=dt;if(p.bleed<=0)die(p);
}
// a teammate down, or dead (v0.11: a Resurrection Kit brings them back)
function nearestDowned(p){let best=null,bd=REVIVE_RANGE;for(const q of players){if(q===p||!(isDown(q)||q.state==='dead'))continue;const d=Math.hypot(q.pos.x-p.pos.x,q.pos.z-p.pos.z);if(d<bd){bd=d;best=q;}}return best;}
// E / the pick button next to a downed teammate starts helping; walking off, a new attack or the teammate gone stops it
export function startHelp(p,q){
  if(!p.alive||p.bleed>0||p.down>0||!q||!(isDown(q)||q.state==='dead'))return false;
  if(p.helping===q)return true;
  if(!q.alive&&!hasKit(p)){uiFor(p).feedOnce('needkit','ต้องมี Resurrection Kit ถึงจะชุบเพื่อนที่ตายแล้วได้','warn');return false;}
  p.helping=q;p.helpT=0;uiFor(p).feed((q.alive?'กำลังช่วยพยุงเพื่อน':'กำลังชุบเพื่อนด้วย Resurrection Kit')+' · ยืนนิ่ง ๆ '+REVIVE_SECONDS+' วินาที');return true;
}
function keepHelping(p,dt){
  const q=p.helping,I=p.input;
  if(!(isDown(q)||q.state==='dead'&&hasKit(p))||I.mag>.08||I.fire||I.fireQ>0||Math.hypot(q.pos.x-p.pos.x,q.pos.z-p.pos.z)>REVIVE_RANGE+.3)return false;
  p.face=Math.atan2(q.pos.x-p.pos.x,q.pos.z-p.pos.z);
  p.helpT+=dt;q.reviveT=p.helpT/REVIVE_SECONDS;
  if(p.helpT<REVIVE_SECONDS)return true;
  q.reviveT=0;
  if(!q.alive){resurrect(p,q);return false;}
  q.bleed=0;q.hp=REVIVE_HP;q.inv=2;q.lastHit=performance.now()/1000;
  uiFor(q).say('เพื่อนช่วยพยุงคุณขึ้นมาแล้ว · HP '+REVIVE_HP,'',4);uiFor(p).feed('ช่วยเพื่อนลุกขึ้นได้แล้ว');
  return false;
}
// a Resurrection Kit used on a dead teammate (v0.11, the creator's call on open question 6): back with full HP, cured
// and fed at least 30, like the Kit does for its owner
function resurrect(p,q){
  const bag=p.gear.bag,i=bag.findIndex(e=>e.id==='resurrect');if(i<0)return;
  bag.splice(i,1);uiFor(p).updateLoadout(true);
  Object.assign(q,{alive:true,state:'player',deadT:0,hp:q.maxHp,bleed:0,inv:3,down:0,endCause:null,food:Math.max(q.food,30),water:Math.max(q.water,30),lastHit:performance.now()/1000});
  cureInfection(q);if(q.local)G.endCause=null;
  uiFor(q).say(p.name+' ใช้ Resurrection Kit ชุบคุณกลับมาแล้ว','',5);uiFor(p).feed('ชุบ '+q.name+' กลับมาแล้ว');
}
export function syncHeld(p){
  const id=curWeapon(p).id;if(id===p.heldId)return;p.heldId=id;
  if(p.held){if(p.held.parent)p.held.parent.remove(p.held);p.held=null;}
  if(id==='fist')return;
  const def=DEF[id],m=weaponModel(def.model),hand=handOf(p);
  if(hand){HOLD(m,def);hand.add(m);}   // in the character model's right hand (v0.13)
  else{m.position.y=-.66;if(def.gun)m.rotation.x=Math.PI/2;p.b.armR.add(m);}
  p.held=m;
}
// how a weapon sits in the model's hand (WristR's axes)
const HOLD=(m,def)=>{m.position.set(...HAND.pos);m.rotation.set(...(def.gun?HAND.gun:HAND.melee));};
export const HAND={pos:[0,.1,0],gun:[0,-Math.PI/2,0],melee:[Math.PI/2,0,0]};   // barrel forward; a bat or pipe upright in the fist
