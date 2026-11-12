import {jobOf} from '../config/jobs.js';
import {damage,targetsOf,bulletRad,hittable,foesOf,ARMORED} from './damage.js';
// what a player's weapons hit, and who else they can hurt in PvP, live in systems/damage.js (v0.68); kept under the
// old names for the tests and anything outside that still asks combat.js
export {hittable as shootable,foesOf};
import {rnd} from '../core/util.js';
import {muzzle} from '../core/renderer.js';
import {G,isPvp,sideOf} from '../core/state.js';
import {ctl} from '../core/controls.js';
import {DEF,durPct} from '../config/items.js';
import {ADS,BLOOM,SNEAK} from '../config/handling.js';
import {BACKSTAB} from '../config/stealth.js';
import {PANIC} from '../config/health.js';
import {diffOf} from '../config/difficulty.js';
import {BLEED_SECONDS,BLEED_PER_DMG} from '../config/party.js';
import {PVP} from '../config/pvp.js';
import {rayWall} from '../world/collision.js';
import {breakables} from '../world/props.js';
import {DAILY} from '../config/events.js';
import {walledOff} from '../world/interiors.js';
import {players} from '../entities/player.js';
import {makeNoise} from '../entities/ai.js';
import {addBlood,tracer} from './effects.js';
import {tankOnRay,blowTank} from './blast.js';
import {curWeapon,countAmmo,takeAmmo} from './inventory.js';
import {spawnDrop,reachableSpot} from './drops.js';
import {clearSave} from './save.js';
import {cureInfection} from './infection.js';
import {sfx,sfxFor} from './audio.js';
import {uiFor,gameOver} from '../ui/hud.js';
import {shieldDriver,leaveCar} from './vehicles.js';

// ---------- combat ----------
// returns false when the hit did not land (dead, knocked back by a Kit, invulnerable). The game ends when no player is left standing.
// v0.47 `by`: the player whose gun, blow or blast it was (PvP); their damage is not scaled by the difficulty
// Only systems/damage.js calls this (v0.68): everything else says damage(target, n, hit)
export function hurtPlayer(p,n,by){
  if(!p.alive||p.inv>0||p.down>0)return false;
  const foe=by&&by!==p&&by.state==='player'?by:null;n*=foe?PVP.dmg:diffOf(G).dmg;
  if(foe&&isPvp()&&sideOf(foe)===sideOf(p))return false;   // v0.51 no hurting your own side (a team mate's grenade)
  if(shieldDriver(p,n))return true;   // v0.45 in a car: the car takes it
  const U=uiFor(p);
  // already down (v0.10): every hit takes time off what is left before they bleed out
  if(p.bleed>0){p.bleed-=n*BLEED_PER_DMG;addBlood(p.pos.x,p.pos.z);U.hurt();if(p.bleed<=0)die(p);return true;}
  p.hp-=n;p.lastHit=performance.now()/1000;addBlood(p.pos.x,p.pos.z);
  U.hurt();
  if(p.hp<=0){
    const bag=p.gear.bag,ri=bag.findIndex(e=>e.id==='resurrect');
    if(ri>=0&&!isPvp()){bag.splice(ri,1);p.hp=0;p.down=1.8;if(p.local)ctl.fireHeld=false;cureInfection(p);p.endCause=null;if(p.local)G.endCause=null;U.updateLoadout(true);return true;}
    // a teammate still standing can help them up (v0.10); alone, or when nobody is left standing, it is death
    if(!isPvp()&&p.endCause!=='infected'&&players.some(q=>q!==p&&standing(q))){goDown(p);return true;}   // v0.47 no going down in PvP
    die(p,foe);
  }
  return true;
}
export const standing=q=>q.alive&&!(q.bleed>0)&&!q.away;
function goDown(p){
  leaveCar(p);p.hp=0;p.bleed=BLEED_SECONDS;p.reviveT=0;p.helping=null;p.swing=0;p.reloadT=0;p.sneak=false;p.endCause=null;if(p.local)ctl.fireHeld=false;   // v0.42 no words: the countdown on the pick button and the red name over the head say it
}
export function die(p,by){
  leaveCar(p);p.hp=0;p.bleed=0;p.helping=null;p.alive=false;p.state='dead';p.deadT=0;p.endCause=p.endCause||'hurt';
  sfx.scream(p.pos.x,p.pos.z);   // v0.19
  for(const q of players)if(q!==p&&q.alive&&Math.hypot(q.pos.x-p.pos.x,q.pos.z-p.pos.z)<PANIC.friendNear)q.panic=Math.min(1,(q.panic||0)+PANIC.friend);   // v0.54
  if(p.local){ctl.fireHeld=false;G.endCause=p.endCause;}
  // v0.47 PvP: back in a moment somewhere else (systems/pvp.js); the one who landed the last hit gets the kill
  if(isPvp()){p.respawnT=PVP.respawn;p.deaths=(p.deaths||0)+1;p.shield=false;
    // v0.49 everyone sees who killed whom and how close the killer is to winning the round; a kill heals a little
    const bounty=!!(by&&p.bounty);p.killedBy=by?by.id:-1;
    if(by&&by.zed&&!p.zed&&G.pvpRule==='infect')p.zedNext=true;   // v0.51 bitten to death by a zombie player   // v0.51 the camera looks at the killer for a moment (player.js viewed)
    if(by){by.frags=(by.frags||0)+(bounty?PVP.bounty.worth:1);by.hp=Math.min(by.maxHp,by.hp+PVP.killHeal);}
    const tally=G.pvpRule==='team'?players.filter(q=>!q.away&&(q.team||0)===(by&&by.team||0)).reduce((s,q)=>s+(q.frags||0),0)+'/'+PVP.team.kills:by&&G.pvpRule!=='infect'?by.frags+'/'+(G.pvpRule==='hill'?PVP.hill.points:PVP.round.kills):'';
    const line=by?by.name+(by.zed?' กัด ':' ฆ่า ')+p.name+(bounty?' · ค่าหัว':'')+(tally?' · '+tally:''):p.name+' ตาย';
    for(const q of players)if(!q.away)uiFor(q).feed(line,q===p?'warn':'');
    // v0.49 half of each kind of ammo stays where they fell, for whoever gets there first
    if(PVP.dropAmmo>0)for(const e of p.gear.bag.slice()){if(DEF[e.id].kind!=='ammo')continue;const k=Math.floor(e.n*PVP.dropAmmo);if(k<=0)continue;
      e.n-=k;if(e.n<=0)p.gear.bag.splice(p.gear.bag.indexOf(e),1);const [x,z]=reachableSpot(p.pos.x+rnd(-.6,.6),p.pos.z+rnd(-.6,.6));spawnDrop({id:e.id,n:k},x,z);}
    uiFor(p).updateLoadout(true);
    return;}
  if(players.some(q=>q.alive)){   // the others play on (v0.11): the dead watch a teammate and can be brought back with a Kit
    for(const q of players)if(q.alive)uiFor(q).feed(p.name+' ตาย','warn');
    dropPack(p);   // v0.58
  }
  // nobody left standing: those still down cannot be helped any more
  if(!players.some(standing))for(const q of players)if(q.alive){q.endCause=q.endCause||'hurt';die(q);return;}
  if(!players.some(q=>q.alive)){clearSave();setTimeout(gameOver,1800);}
}
const seen=[];   // scratch list for targetsOf(): filled and read inside one call, never kept
// turns the player toward the best target in front (zombies, bandits, the other players in PvP), unless they aim with a mouse
export function aimAssist(p,def){
  if(p.input.aim)return;
  const range=def.gun?def.range*.85:def.range+1.6,cone=def.gun?.8:.4;
  const fx=Math.sin(p.face),fz=Math.cos(p.face);let best=null,bs=-9;
  for(const z of targetsOf(p,seen)){if(z.retreat)continue;const dx=z.pos.x-p.pos.x,dz=z.pos.z-p.pos.z,d=Math.hypot(dx,dz);if(d>range||d<1e-3)continue;if(walledOff(p.pos.x,p.pos.z,z.pos.x,z.pos.z))continue;
    const dot=(dx*fx+dz*fz)/d;if(dot<cone&&d>2.2)continue;const s=dot-d/range*.6;if(s>bs){bs=s;best=z;}}
  if(best)p.face=Math.atan2(best.pos.x-p.pos.x,best.pos.z-p.pos.z);
}
export function startReload(p){
  const w=curWeapon(p),def=DEF[w.id];if(!def.gun||p.reloadT>0||!p.alive||p.bleed>0)return;
  if(w.mag>=def.mag)return;
  if(countAmmo(p,def.ammo)<=0){uiFor(p).feedOnce('noammo','ไม่มีกระสุน '+DEF[def.ammo].name+' ในกระเป๋า','warn');return;}
  p.reloadT=def.reload*(jobOf(p).reload||1);p.reloadFor=w;   // v0.58 a soldier reloads faster
  sfxFor(p).reload(def.model);
}
export function finishReload(p){const w=p.reloadFor,def=DEF[w.id];if(w!==curWeapon(p))return;w.mag+=takeAmmo(p,def.ammo,def.mag-w.mag);uiFor(p).updateLoadout(true);}
// how far a shot may stray (rad, either side): the gun's spread, tighter aiming down the sights and crouched or prone,
// wider after a burst (v0.29)
export function spreadOf(p,def){return def.spread*(p.ads?ADS.spread:1)*(p.sneak?SNEAK.spread:1)*(1+(p.bloom||0))*(1+(p.panic||0)*PANIC.spread);}   // v0.54 panic shakes the hands
// v0.52 the alarm of a parked car the shot ends in (the daily-event alarm of systems/events.js: zombies come for 40 min)
function carAlarm(ox,oz,dx,dz,end){
  for(const b of breakables){if(!b.car||b.broken||b.car.burned)continue;const rx=b.x-ox,rz=b.z-oz,t=rx*dx+rz*dz;
    if(t<0||t>end+1.6||Math.abs(rx*dz-rz*dx)>1.3)continue;G.alarm={x:b.x,z:b.z,until:G.min+DAILY.last.alarm,next:G.min};return;}
}
export function fireGun(p,w,def){
  const U=uiFor(p);
  if(w.mag<=0){p.cool=.3;sfxFor(p).empty();if(countAmmo(p,def.ammo)>0)startReload(p);else U.feedOnce('noammo','กระสุนหมด','warn');return;}
  w.mag--;p.cool=def.rate;p.recoil=1;p.aimT=.5;sfx.shot(def.model,p.pos.x,p.pos.z);
  const fx=Math.sin(p.face),fz=Math.cos(p.face),ox=p.pos.x+fx*.7,oz=p.pos.z+fz*.7;
  const pel=def.pellets||1,pd=def.pellets?def.dmg*1.4/def.pellets:def.dmg;
  for(let k0=0;k0<pel;k0++){
    const sp=spreadOf(p,def),ang=p.face+rnd(-sp,sp),dx=Math.sin(ang),dz=Math.cos(ang);
    let wall=rayWall(ox,oz,dx,dz,def.range);const tank=tankOnRay(ox,oz,dx,dz,wall+.6);if(tank)wall=Math.min(wall,tank[0]);   // v0.23 a gas cylinder stops the bullet, and goes off
    const hits=[];
    for(const z of targetsOf(p,seen)){const rx=z.pos.x-ox,rz=z.pos.z-oz,t=rx*dx+rz*dz;if(t<-.3||t>wall)continue;if(Math.abs(rx*dz-rz*dx)<bulletRad(z))hits.push([Math.max(t,0),z]);}
    hits.sort((a,b)=>a[0]-b[0]);
    const n=Math.min(hits.length,def.pierce||1);let end=n?hits[n-1][0]:wall,armor=false;
    for(let k=0;k<n;k++){const [t,z]=hits[k];if(damage(z,def.falloff?pd*(1-t/def.range*.6):pd,{by:p,dx,dz,kb:def.pellets?.12:.25,gun:true})===ARMORED)armor=true;}
    tracer(ox,oz,ox+dx*end,oz+dz*end,armor?'#a9d4ff':null);
    if(!G.alarm&&!n)carAlarm(ox,oz,dx,dz,end);   // v0.52 a stray bullet into a parked car sets its alarm off
    if(tank&&hits.length<(def.pierce||1))blowTank(tank[1],p);
  }
  p.bloom=Math.min(BLOOM.max,(p.bloom||0)+BLOOM.add);   // v0.29 each shot scatters the next a little more
  muzzle.position.set(ox,1.4,oz);muzzle.intensity=4;
  makeNoise(p.pos.x,p.pos.z,def.noise);
  U.updateLoadout();
}
const BLADE=new Set(['knife','machete','katana','sickle','axe','pitchfork','pickaxe','cleaver','dagger']);   // v0.43 what a blow sounds like
// v0.50 a quiet kill: an ordinary zombie hit from behind, by someone sneaking or that it has not noticed
export function backstab(p,z){
  if(!BACKSTAB.kinds.includes(z.kind)||!(p.sneak||z.seenP!==p))return false;
  const dx=p.pos.x-z.pos.x,dz=p.pos.z-z.pos.z,d=Math.hypot(dx,dz)||1;
  return (dx*Math.sin(z.face)+dz*Math.cos(z.face))/d<-BACKSTAB.arc;
}
// one blow on one target. A zombie caught from behind dies of it, silently (v0.50); the extinguisher stuns (v0.55)
function blow(p,z,def,dx,dz){
  if(z.state==='zombie'&&backstab(p,z)){damage(z,z.hp+1,{by:p,dx,dz,kb:.1,silent:true,melee:true});p.stabs=(p.stabs||0)+1;return;}
  damage(z,def.dmg,{by:p,dx,dz,kb:def.kb,melee:true});
  if(def.stun&&z.state==='zombie')z.feed=Math.max(z.feed||0,def.stun);
}
export function meleeHit(p,def){
  const fx=Math.sin(p.face),fz=Math.cos(p.face);let best=null,bd=1e9;
  for(const z of targetsOf(p)){const dx=z.pos.x-p.pos.x,dz=z.pos.z-p.pos.z,d=Math.hypot(dx,dz);
    if(d-(z.rad-.34)>def.range||d<1e-3)continue;if((dx*fx+dz*fz)/d<def.arc)continue;if(walledOff(p.pos.x,p.pos.z,z.pos.x,z.pos.z))continue;   // no hitting through a wall
    if(def.cleave){blow(p,z,def,dx/d,dz/d);best=best||z;}else if(d<bd){bd=d;best=z;}}
  if(best&&!def.cleave){const dx=best.pos.x-p.pos.x,dz=best.pos.z-p.pos.z,d=Math.hypot(dx,dz);blow(p,best,def,dx/d,dz/d);}
  if(best){
    const front=best.kind==='armor'&&(p.pos.x-best.pos.x)*Math.sin(best.face)+(p.pos.z-best.pos.z)*Math.cos(best.face)>0;   // v0.43 sound only: the blow rings on its armour
    sfx.hit(best.pos.x,best.pos.z,front?'metal':def===DEF.fist?'fist':BLADE.has(def.model)?'blade':'blunt');wearMelee(p,def);}
}
// melee weapons lose 1 durability per swing that connects and break at 0 (fists never break)
function wearMelee(p,def){
  const g=p.gear,w=g.eq.melee,U=uiFor(p);if(!w||g.active!=='melee'||DEF[w.id]!==def||!def.dur)return;
  w.dur=Math.max(0,(w.dur??def.dur)-(jobOf(p).wear||1));   // v0.58 a mechanic's last longer
  if(w.dur<=0){g.eq.melee=null;sfx.crack();U.feed(def.name+' พังแล้ว','warn');U.updateLoadout(true);}
  else if(durPct(w)<=.2)U.updateLoadout();
}

// v0.58 co-op: what a fallen player carried that others can use (ammo, medicine, things to throw, scraps, traps) is left
// where they fell, so the friends still standing can go and get it; a Resurrection Kit brings them back with their weapons
export const PACK_KINDS=['ammo','heal','throw','mat','trap'];   // PLACEHOLDER
export function dropPack(p){
  const g=p.gear;let n=0;
  for(const e of g.bag.slice()){if(!PACK_KINDS.includes(DEF[e.id].kind))continue;g.bag.splice(g.bag.indexOf(e),1);n++;
    const a=n*2.1,[x,z]=reachableSpot(p.pos.x+Math.sin(a)*.7,p.pos.z+Math.cos(a)*.7);spawnDrop({id:e.id,n:e.n},x,z);}
  if(n)uiFor(p).updateLoadout(true);
  return n;
}
