import {rnd} from '../core/util.js';
import {muzzle} from '../core/renderer.js';
import {G} from '../core/state.js';
import {ctl} from '../core/controls.js';
import {DEF,durPct} from '../config/items.js';
import {diffOf} from '../config/difficulty.js';
import {BLEED_SECONDS,BLEED_PER_DMG} from '../config/party.js';
import {rayWall} from '../world/collision.js';
import {walledOff} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {hurtZombie,makeNoise} from '../entities/ai.js';
import {addBlood,tracer} from './effects.js';
import {curWeapon,countAmmo,takeAmmo} from './inventory.js';
import {clearSave} from './save.js';
import {cureInfection} from './infection.js';
import {sfx,sfxFor} from './audio.js';
import {uiFor,gameOver} from '../ui/hud.js';

// ---------- combat ----------
// returns false when the hit did not land (dead, knocked back by a Kit, invulnerable). The game ends when no player is left standing.
export function hurtPlayer(p,n){
  if(!p.alive||p.inv>0||p.down>0)return false;
  const U=uiFor(p);
  // already down (v0.10): every hit takes time off what is left before they bleed out
  if(p.bleed>0){p.bleed-=n*diffOf(G).dmg*BLEED_PER_DMG;addBlood(p.pos.x,p.pos.z);U.hurt();if(p.bleed<=0)die(p);return true;}
  p.hp-=n*diffOf(G).dmg;p.lastHit=performance.now()/1000;addBlood(p.pos.x,p.pos.z);
  U.hurt();
  if(p.hp<=0){
    const bag=p.gear.bag,ri=bag.findIndex(e=>e.id==='resurrect');
    if(ri>=0){bag.splice(ri,1);p.hp=0;p.down=1.8;if(p.local)ctl.fireHeld=false;cureInfection(p);p.food=Math.max(p.food,30);p.water=Math.max(p.water,30);p.endCause=null;if(p.local)G.endCause=null;U.say('Resurrection Kit ทำงาน · คุณฟื้นคืนชีพ','',5);U.updateLoadout(true);return true;}
    // a teammate still standing can help them up (v0.10); alone, or when nobody is left standing, it is death
    if(p.endCause!=='infected'&&players.some(q=>q!==p&&standing(q))){goDown(p);return true;}
    die(p);
  }
  return true;
}
export const standing=q=>q.alive&&!(q.bleed>0);
function goDown(p){
  p.hp=0;p.bleed=BLEED_SECONDS;p.reviveT=0;p.helping=null;p.swing=0;p.reloadT=0;p.sneak=false;p.endCause=null;if(p.local)ctl.fireHeld=false;
  uiFor(p).say('คุณล้มลง! รอเพื่อนมาช่วยพยุงภายใน '+BLEED_SECONDS+' วินาที คลานหนีได้ช้า ๆ','alarm',6);
  for(const q of players)if(q!==p)uiFor(q).say('เพื่อนล้มลง! ไปยืนข้าง ๆ แล้วกด ช่วย ก่อนหมดเวลา','alarm',6);
}
export function die(p){
  p.hp=0;p.bleed=0;p.helping=null;p.alive=false;p.state='dead';p.deadT=0;p.endCause=p.endCause||'hurt';
  if(p.local){ctl.fireHeld=false;G.endCause=p.endCause;}
  if(players.some(q=>q.alive)){   // the others play on (v0.11): the dead watch a teammate and can be brought back with a Kit
    uiFor(p).say('คุณตายแล้ว · กำลังดูเพื่อนเล่นต่อ ถ้าเพื่อนมี Resurrection Kit ชุบคุณกลับมาได้','alarm',8);
    for(const q of players)if(q.alive)uiFor(q).feed(p.name+' ตาย · ชุบได้ด้วย Kit','warn');
  }
  // nobody left standing: those still down cannot be helped any more
  if(!players.some(standing))for(const q of players)if(q.alive){q.endCause=q.endCause||'hurt';die(q);return;}
  if(!players.some(q=>q.alive)){clearSave();setTimeout(gameOver,1800);}
}
// turns the player toward the best zombie in front, unless they aim with a mouse
export function aimAssist(p,def){
  if(p.input.aim)return;
  const range=def.gun?def.range*.85:def.range+1.6,cone=def.gun?.8:.4;
  const fx=Math.sin(p.face),fz=Math.cos(p.face);let best=null,bs=-9;
  for(const z of agents){if(z.state!=='zombie'||z.retreat)continue;const dx=z.pos.x-p.pos.x,dz=z.pos.z-p.pos.z,d=Math.hypot(dx,dz);if(d>range||d<1e-3)continue;if(walledOff(p.pos.x,p.pos.z,z.pos.x,z.pos.z))continue;
    const dot=(dx*fx+dz*fz)/d;if(dot<cone&&d>2.2)continue;const s=dot-d/range*.6;if(s>bs){bs=s;best=z;}}
  if(best)p.face=Math.atan2(best.pos.x-p.pos.x,best.pos.z-p.pos.z);
}
export function startReload(p){
  const w=curWeapon(p),def=DEF[w.id];if(!def.gun||p.reloadT>0||!p.alive||p.bleed>0)return;
  if(w.mag>=def.mag)return;
  if(countAmmo(p,def.ammo)<=0){uiFor(p).feedOnce('noammo','ไม่มีกระสุน '+DEF[def.ammo].name+' ในกระเป๋า','warn');return;}
  p.reloadT=def.reload;p.reloadFor=w;sfxFor(p).reload();
}
export function finishReload(p){const w=p.reloadFor,def=DEF[w.id];if(w!==curWeapon(p))return;w.mag+=takeAmmo(p,def.ammo,def.mag-w.mag);uiFor(p).updateLoadout(true);}
export function fireGun(p,w,def){
  const U=uiFor(p);
  if(w.mag<=0){p.cool=.3;sfxFor(p).empty();if(countAmmo(p,def.ammo)>0)startReload(p);else U.feedOnce('noammo','กระสุนหมด · หา '+DEF[def.ammo].name,'warn');return;}
  w.mag--;p.cool=def.rate;p.recoil=1;p.aimT=.5;sfx.shot(def.model,p.pos.x,p.pos.z);
  const fx=Math.sin(p.face),fz=Math.cos(p.face),ox=p.pos.x+fx*.7,oz=p.pos.z+fz*.7;
  const pel=def.pellets||1,pd=def.pellets?def.dmg*1.4/def.pellets:def.dmg;
  for(let k0=0;k0<pel;k0++){
    const ang=p.face+rnd(-def.spread,def.spread),dx=Math.sin(ang),dz=Math.cos(ang);
    const wall=rayWall(ox,oz,dx,dz,def.range);
    const hits=[];
    for(const z of agents){if(z.state!=='zombie')continue;const rx=z.pos.x-ox,rz=z.pos.z-oz,t=rx*dx+rz*dz;if(t<-.3||t>wall)continue;if(Math.abs(rx*dz-rz*dx)<.45+(z.rad-.34))hits.push([Math.max(t,0),z]);}
    hits.sort((a,b)=>a[0]-b[0]);
    const n=Math.min(hits.length,def.pierce||1);let end=n?hits[n-1][0]:wall,armor=false;
    for(let k=0;k<n;k++){const [t,z]=hits[k];if(hurtZombie(z,def.falloff?pd*(1-t/def.range*.6):pd,dx,dz,def.pellets?.12:.25,true,false,p))armor=true;}
    tracer(ox,oz,ox+dx*end,oz+dz*end,armor?'#a9d4ff':null);
  }
  muzzle.position.set(ox,1.4,oz);muzzle.intensity=4;
  makeNoise(p.pos.x,p.pos.z,def.noise);
  if(p.local&&!G.gunTip){G.gunTip=true;U.feed('เสียงปืนดึงดูดซอมบี้ กลางคืนได้ยินไกลขึ้น 1.5 เท่า','warn');}
  U.updateLoadout();
}
export function meleeHit(p,def){
  const fx=Math.sin(p.face),fz=Math.cos(p.face);let best=null,bd=1e9;
  for(const z of agents){if(z.state!=='zombie')continue;const dx=z.pos.x-p.pos.x,dz=z.pos.z-p.pos.z,d=Math.hypot(dx,dz);
    if(d-(z.rad-.34)>def.range||d<1e-3)continue;if((dx*fx+dz*fz)/d<def.arc)continue;if(walledOff(p.pos.x,p.pos.z,z.pos.x,z.pos.z))continue;   // no hitting through a wall
    if(def.cleave){hurtZombie(z,def.dmg,dx/d,dz/d,def.kb,false,false,p);best=best||z;}else if(d<bd){bd=d;best=z;}}
  if(best&&!def.cleave){const dx=best.pos.x-p.pos.x,dz=best.pos.z-p.pos.z,d=Math.hypot(dx,dz);hurtZombie(best,def.dmg,dx/d,dz/d,def.kb,false,false,p);}
  if(best){sfx.thud(best.pos.x,best.pos.z);wearMelee(p,def);}
}
// melee weapons lose 1 durability per swing that connects and break at 0 (fists never break)
function wearMelee(p,def){
  const g=p.gear,w=g.eq.melee,U=uiFor(p);if(!w||g.active!=='melee'||DEF[w.id]!==def||!def.dur)return;
  w.dur=Math.max(0,(w.dur??def.dur)-1);
  if(w.dur<=0){g.eq.melee=null;sfx.crack();U.feed(def.name+' พังแล้ว · หาอาวุธใหม่','warn');U.updateLoadout(true);}
  else if(durPct(w)<=.2)U.updateLoadout();
}
