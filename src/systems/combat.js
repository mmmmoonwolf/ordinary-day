import {$,rnd} from '../core/util.js';
import {muzzle} from '../core/renderer.js';
import {G} from '../core/state.js';
import {ctl,mouse} from '../core/controls.js';
import {DEF} from '../config/items.js';
import {rayWall} from '../world/collision.js';
import {agents} from '../entities/agents.js';
import {player} from '../entities/player.js';
import {hurtZombie,makeNoise} from '../entities/ai.js';
import {addBlood,tracer} from './effects.js';
import {inv,curWeapon,countAmmo,takeAmmo} from './inventory.js';
import {clearSave} from './save.js';
import {cureInfection} from './infection.js';
import {sfx} from './audio.js';
import {say,feed,feedOnce,updateLoadout,gameOver} from '../ui/hud.js';

// ---------- combat ----------
export function hurtPlayer(n){
  if(!player.alive||player.inv>0||player.down>0)return false;
  player.hp-=n;player.lastHit=performance.now()/1000;$('hurt').style.opacity=.85;addBlood(player.pos.x,player.pos.z);sfx.hurt();
  if(player.hp<=0){
    const ri=inv.bag.findIndex(e=>e.id==='resurrect');
    if(ri>=0){inv.bag.splice(ri,1);player.hp=0;player.down=1.8;ctl.fireHeld=false;cureInfection();G.endCause=null;say('Resurrection Kit ทำงาน · คุณฟื้นคืนชีพ','',5);updateLoadout(true);return true;}
    player.hp=0;player.alive=false;player.state='dead';player.deadT=0;ctl.fireHeld=false;G.endCause=G.endCause||'hurt';clearSave();setTimeout(gameOver,1800);
  }
  return true;
}
export function aimAssist(def){
  if(mouse.active)return;
  const range=def.gun?def.range*.85:def.range+1.6,cone=def.gun?.8:.4;
  const fx=Math.sin(player.face),fz=Math.cos(player.face);let best=null,bs=-9;
  for(const z of agents){if(z.state!=='zombie'||z.retreat)continue;const dx=z.pos.x-player.pos.x,dz=z.pos.z-player.pos.z,d=Math.hypot(dx,dz);if(d>range||d<1e-3)continue;
    const dot=(dx*fx+dz*fz)/d;if(dot<cone&&d>2.2)continue;const s=dot-d/range*.6;if(s>bs){bs=s;best=z;}}
  if(best)player.face=Math.atan2(best.pos.x-player.pos.x,best.pos.z-player.pos.z);
}
export function startReload(){
  const w=curWeapon(),def=DEF[w.id];if(!def.gun||player.reloadT>0)return;
  if(w.mag>=def.mag)return;
  if(countAmmo(def.ammo)<=0){feedOnce('noammo','ไม่มีกระสุน '+DEF[def.ammo].name+' ในกระเป๋า','warn');return;}
  player.reloadT=def.reload;player.reloadFor=w;sfx.reload();
}
export function finishReload(){const w=player.reloadFor,def=DEF[w.id];if(w!==curWeapon())return;w.mag+=takeAmmo(def.ammo,def.mag-w.mag);updateLoadout(true);}
export function fireGun(w,def){
  if(w.mag<=0){player.cool=.3;sfx.empty();if(countAmmo(def.ammo)>0)startReload();else feedOnce('noammo','กระสุนหมด · หา '+DEF[def.ammo].name,'warn');return;}
  w.mag--;player.cool=def.rate;player.recoil=1;player.aimT=.5;sfx.shot(def.model);
  const fx=Math.sin(player.face),fz=Math.cos(player.face),ox=player.pos.x+fx*.7,oz=player.pos.z+fz*.7;
  const pel=def.pellets||1,pd=def.pellets?def.dmg*1.4/def.pellets:def.dmg;
  for(let p=0;p<pel;p++){
    const ang=player.face+rnd(-def.spread,def.spread),dx=Math.sin(ang),dz=Math.cos(ang);
    const wall=rayWall(ox,oz,dx,dz,def.range);
    const hits=[];
    for(const z of agents){if(z.state!=='zombie')continue;const rx=z.pos.x-ox,rz=z.pos.z-oz,t=rx*dx+rz*dz;if(t<-.3||t>wall)continue;if(Math.abs(rx*dz-rz*dx)<.45+(z.rad-.34))hits.push([Math.max(t,0),z]);}
    hits.sort((a,b)=>a[0]-b[0]);
    const n=Math.min(hits.length,def.pierce||1);let end=n?hits[n-1][0]:wall,armor=false;
    for(let k=0;k<n;k++){const [t,z]=hits[k];if(hurtZombie(z,def.falloff?pd*(1-t/def.range*.6):pd,dx,dz,def.pellets?.12:.25,true))armor=true;}
    tracer(ox,oz,ox+dx*end,oz+dz*end,armor?'#a9d4ff':null);
  }
  muzzle.position.set(ox,1.4,oz);muzzle.intensity=4;
  makeNoise(player.pos.x,player.pos.z,def.noise);
  if(!G.gunTip){G.gunTip=true;feed('เสียงปืนดึงดูดซอมบี้ กลางคืนได้ยินไกลขึ้น 1.5 เท่า','warn');}
  updateLoadout();
}
export function meleeHit(def){
  const fx=Math.sin(player.face),fz=Math.cos(player.face);let best=null,bd=1e9;
  for(const z of agents){if(z.state!=='zombie')continue;const dx=z.pos.x-player.pos.x,dz=z.pos.z-player.pos.z,d=Math.hypot(dx,dz);
    if(d-(z.rad-.34)>def.range||d<1e-3)continue;if((dx*fx+dz*fz)/d<def.arc)continue;
    if(def.cleave){hurtZombie(z,def.dmg,dx/d,dz/d,def.kb,false);best=best||z;}else if(d<bd){bd=d;best=z;}}
  if(best&&!def.cleave){const dx=best.pos.x-player.pos.x,dz=best.pos.z-player.pos.z,d=Math.hypot(dx,dz);hurtZombie(best,def.dmg,dx/d,dz/d,def.kb,false);}
  if(best)sfx.thud(best.pos.x,best.pos.z);
}
