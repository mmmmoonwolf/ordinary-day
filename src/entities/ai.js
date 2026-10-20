import {rnd,pick,clamp,wpick} from '../core/util.js';
import {boomLight} from '../core/renderer.js';
import {G} from '../core/state.js';
import {LIM} from '../config/world.js';
import {ZC} from '../config/zombies.js';
import {POOLS,MED_W} from '../config/loot.js';
import {collide} from '../world/collision.js';
import {nearestNode} from '../world/sidewalk.js';
import {agents,becomeZombie} from './agents.js';
import {lerpAng,moveAgent,followNodes,d2} from './movement.js';
import {player} from './player.js';
import {addBlood,warnRing,blast} from '../systems/effects.js';
import {makeItem,spawnDrop,dropGuaranteed} from '../systems/drops.js';
import {hurtPlayer} from '../systems/combat.js';
import {infectPlayer} from '../systems/infection.js';
import {sfx} from '../systems/audio.js';
import {say,feed} from '../ui/hud.js';

// ---------- AI ----------
export function updateHuman(a,dt){
  if(a.state==='infected'){a.turnT-=dt;const k=clamp(1-a.turnT/8,0,1);a.b.mats[2].color.copy(a.b.base.skin).lerp(new THREE.Color(ZC.walker.skin),k*.7);if(a.turnT<=0){becomeZombie(a);return;}}
  if(G.outbreak){let th=null,td=81;for(const z of agents){if(z.state!=='zombie'||z.retreat)continue;const d=d2(a,z);if(z.kind==='walker'&&d>12.25)continue;if(d<td){td=d;th=z;}}
    if(th){a.panic=rnd(4,6);a.tx=a.pos.x-th.pos.x+rnd(-1,1);a.tz=a.pos.z-th.pos.z+rnd(-1,1);a.vendor=false;}}
  const slow=a.state==='infected'?.7:1;
  if(a.panic>0){a.panic-=dt;moveAgent(a,a.tx,a.tz,3.6*slow,dt);if(a.panic<=0){a.node=nearestNode(a.pos);a.prev=null;}return;}
  if(a.vendor){a.moving=0;a.face=lerpAng(a.face,Math.PI+Math.sin(performance.now()/2400+a.phase)*.6,dt*2);return;}
  followNodes(a,a.walk*slow,dt);
}
function explode(a){
  const R0=4.2;a.state='dead';a.deadT=0;a.b.root.visible=false;a.deadT=24;
  blast.position.set(a.pos.x,1,a.pos.z);blast.userData.t=.4;boomLight.position.set(a.pos.x,2,a.pos.z);boomLight.intensity=9;sfx.explode(a.pos.x,a.pos.z);
  for(let i=0;i<6;i++)addBlood(a.pos.x+rnd(-2,2),a.pos.z+rnd(-2,2));
  const dp=Math.hypot(player.pos.x-a.pos.x,player.pos.z-a.pos.z);if(dp<R0)hurtPlayer(Math.round(45*(1-dp/R0*.5)));
  for(const o of agents){if(o===a)continue;const d=Math.hypot(o.pos.x-a.pos.x,o.pos.z-a.pos.z);if(d>R0)continue;
    if(o.state==='zombie')hurtZombie(o,60,(o.pos.x-a.pos.x)/(d||1),(o.pos.z-a.pos.z)/(d||1),1.2,false,true);
    else if(o.state==='human'){o.state='infected';o.turnT=rnd(3,6);o.panic=5;}}
  makeNoise(a.pos.x,a.pos.z,30);
}
function slam(a){
  const R0=3.2;warnRing.material.opacity=0;blast.position.set(a.pos.x,.4,a.pos.z);blast.userData.t=.3;sfx.thud(a.pos.x,a.pos.z);
  const dx=player.pos.x-a.pos.x,dz=player.pos.z-a.pos.z,d=Math.hypot(dx,dz);
  if(d<R0&&player.alive){hurtPlayer(ZC.tyrant.dmg);player.pos.x+=dx/(d||1)*2.4;player.pos.z+=dz/(d||1)*2.4;collide(player.pos,.34);}
  a.feed=.9;
}
export function updateZombie(a,dt){
  const C=ZC[a.kind];
  if(a.hitT>0){a.hitT-=dt;a.b.mats[0].emissive.setRGB(Math.max(0,a.hitT)*4,0,0);}
  if(a.retreat){const dx=a.pos.x-player.pos.x,dz=a.pos.z-player.pos.z,d=Math.hypot(dx,dz);moveAgent(a,dx,dz,Math.max(1.6,C.speed*.6),dt);
    if(d>36||Math.abs(a.pos.x)>LIM-.5||Math.abs(a.pos.z)>LIM-.5){a.gone=true;}return;}
  if(a.kind==='boomer'&&a.fuse>0){a.fuse-=dt;const k=1.2-a.fuse;a.b.body.scale.setScalar(1+k*.22);a.b.mats[0].emissive.setRGB(.6*(.5+.5*Math.sin(k*30)),.1,.7*(.5+.5*Math.sin(k*30)));a.moving=0;if(a.fuse<=0)explode(a);return;}
  if(a.kind==='tyrant'&&a.wind>0){a.wind-=dt;warnRing.position.set(a.pos.x,a.y+.05,a.pos.z);const k=1-a.wind/.85;warnRing.scale.setScalar(3.2*k+.2);warnRing.material.opacity=.4+.5*k;a.moving=0;if(a.wind<=0)slam(a);return;}
  if(a.feed>0){a.feed-=dt;a.moving=0;return;}
  a.atk-=dt;
  if(a.lost>0){a.lost-=dt;followNodes(a,.8,dt);return;}
  const day=a.kind==='walker';
  let tgt=null,td=C.sense*C.sense;
  for(const h of agents){if(h.state!=='human')continue;const d=d2(a,h);if(d<td){td=d;tgt=h;}}
  const dP=d2(a,player),reachP=.95+(a.rad-.34);
  if(player.alive&&player.down<=0){
    if(day){if(dP<reachP*reachP){tgt=player;td=dP;}}    // Walkers never chase the player, but hit when adjacent
    else if(dP<td){tgt=player;td=dP;}
  }
  if(tgt===player&&a.kind==='sprinter'&&!a.shrieked){a.shrieked=true;sfx.shriek(a.pos.x,a.pos.z);}   // warn before it closes in
  const sp=C.speed*a.spd;
  if(!tgt){
    if(!day&&a.heard&&a.heard.t>0){a.heard.t-=dt;const dx=a.heard.x-a.pos.x,dz=a.heard.z-a.pos.z;if(Math.hypot(dx,dz)<1.5)a.heard.t=0;else moveAgent(a,dx,dz,sp*.85,dt);return;}
    followNodes(a,(day?.6:.8)*a.spd,dt);return;
  }
  td=Math.sqrt(td);
  const reach=a.kind==='tyrant'?2.4:a.kind==='boomer'?2.2:.95+(a.rad-.34);
  if(td<reach){
    a.face=lerpAng(a.face,Math.atan2(tgt.pos.x-a.pos.x,tgt.pos.z-a.pos.z),.3);a.moving=0;
    if(tgt===player){
      if(a.kind==='boomer'){a.fuse=1.2;sfx.swell(a.pos.x,a.pos.z);return;}
      if(a.kind==='tyrant'){if(a.atk<=0){a.atk=2.2;a.wind=.85;sfx.roar(a.pos.x,a.pos.z,.8);}return;}
      if(a.atk<=0){a.atk=C.rate;if(hurtPlayer(C.dmg)&&Math.random()<(C.infect||0))infectPlayer();if(a.kind==='sprinter')a.feed=1.3;}
    } else {tgt.state='infected';tgt.turnT=rnd(6,11);tgt.panic=6;tgt.tx=tgt.pos.x-a.pos.x;tgt.tz=tgt.pos.z-a.pos.z;a.feed=1.4;addBlood(tgt.pos.x,tgt.pos.z);}
    return;
  }
  const ox=a.pos.x,oz=a.pos.z;moveAgent(a,tgt.pos.x-a.pos.x,tgt.pos.z-a.pos.z,day&&tgt!==player?sp*1.4:sp,dt);
  if(Math.hypot(a.pos.x-ox,a.pos.z-oz)<sp*dt*.3){a.stuckT+=dt;if(a.stuckT>1.2){a.stuckT=0;a.lost=3;a.node=nearestNode(a.pos);a.prev=null;}}else a.stuckT=Math.max(0,a.stuckT-dt);
}
export function updateDead(a,dt){a.deadT+=dt;const k=Math.min(1,a.deadT*2.2);a.b.body.rotation.x=-k*Math.PI/2;a.b.body.position.y=k*.16;a.moving=0;}
export function makeNoise(x,z,r){if(G.phase==='night')r*=1.5;for(const a of agents){if(a.state!=='zombie'||a.kind==='walker')continue;const dx=a.pos.x-x,dz=a.pos.z-z;if(dx*dx+dz*dz<r*r)a.heard={x:x+rnd(-2,2),z:z+rnd(-2,2),t:8};}}
export function hurtZombie(z,dmg,dx,dz,kb,isGun,silent){
  let armored=false;
  if(isGun&&ZC[z.kind].armor){dmg*=1-ZC[z.kind].armor;armored=true;}
  const kbm=z.kind==='tyrant'?.12:z.kind==='armor'?.5:z.kind==='boomer'?.6:1;
  z.hp-=dmg;z.hitT=.18;if(z.kind!=='tyrant')z.feed=Math.max(z.feed,.22);z.pos.x+=dx*kb*kbm;z.pos.z+=dz*kb*kbm;collide(z.pos,z.rad);
  if(!silent)z.heard={x:player.pos.x,z:player.pos.z,t:5};if(Math.random()<.35)addBlood(z.pos.x,z.pos.z);
  if(z.hp<=0&&z.state==='zombie'){
    z.state='dead';z.deadT=0;z.fuse=0;z.wind=0;z.b.mats[0].emissive.setRGB(0,0,0);G.kills++;G.killsBy[z.kind]=(G.killsBy[z.kind]||0)+1;addBlood(z.pos.x,z.pos.z);
    if(z.kind==='armor'){dropGuaranteed('pol',z.pos.x,z.pos.z);feed('Armor Walker ดรอปของระดับ Police','pol');}
    else if(z.kind==='tyrant'){dropGuaranteed('mil',z.pos.x,z.pos.z);say('Tyrant ล้มแล้ว · ดรอปของระดับ Military','',6);warnRing.material.opacity=0;}
    else if(Math.random()<.25){const ph=G.phase;const it=Math.random()<.6?makeItem(pick(ph==='day'?POOLS.civ.ammo:POOLS.pol.ammo)):makeItem(wpick(MED_W[ph]));spawnDrop(it,z.pos.x+rnd(-.4,.4),z.pos.z+rnd(-.4,.4));}
  }
  return armored;
}
