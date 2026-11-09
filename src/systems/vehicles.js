import {jobOf} from '../config/jobs.js';
import {G,isPvp} from '../core/state.js';
import {CAR,TRUNK} from '../config/vehicles.js';
import {DEF,STACKS} from '../config/items.js';
import {rollLoot} from './drops.js';
import {addStack,tidyBag} from './inventory.js';
import {inWorld} from '../config/world.js';
import {solids} from '../world/collision.js';
import {rides,placeRide,CAR_HALF} from '../world/vehicles.js';
import {pumpSpots} from '../world/highway.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {hurtZombie,makeNoise} from '../entities/ai.js';
import {hurtPlayer} from './combat.js';
import {sfx,sfxFor} from './audio.js';
import {uiFor} from '../ui/hud.js';

// ---------- driving (v0.45) ----------
// The cars in world/vehicles.js `rides`: where each is, its heading, speed and hp are in G.cars (saved, sent online). A
// player in a car (p.car = its index) moves with it and is hidden; the stick or WASD points the way and the car turns
// toward it, pulling the opposite way backs up. The car crashes into walls and wrecks (and bounces back), runs zombies
// down, and takes the hits meant for its driver until it dies (then the driver is thrown out and it stays a dead
// wreck). The engine is loud: zombies around it come. All of it runs on the host, in simStep (numbers in
// config/vehicles.js, PLACEHOLDER).
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function freshCars(){return rides.map(r=>({x:r.x,z:r.z,a:r.a,v:0,hp:CAR.hp,fuel:CAR.fuel[0]+Math.random()*(CAR.fuel[1]-CAR.fuel[0]),trunk:bootLoot()}));}   // v0.61 a few things in the boot   // v0.53 part full
// the look and collision of every car from G.cars (after a reset, a load, or a snapshot on a friend's device)
export function applyCars(){for(let i=0;i<rides.length;i++){const c=G.cars&&G.cars[i];if(c)placeRide(rides[i],c.x,c.z,c.a,c.hp);}}
export const driverOf=i=>players.find(p=>p.car===i)||null;
// the car a player could get into (or the one they are in)
export function nearCar(p){
  if(p.car>=0)return p.car;
  if(!G.cars||!p.alive||p.bleed>0)return -1;
  let best=-1,bd=CAR.reach;
  for(let i=0;i<G.cars.length;i++){const c=G.cars[i];if(c.hp<=0||driverOf(i))continue;const d=Math.hypot(c.x-p.pos.x,c.z-p.pos.z);if(d<bd){bd=d;best=i;}}
  return best;
}
export function enterCar(p,i){
  const c=G.cars[i];if(!c||c.hp<=0||driverOf(i)||Math.hypot(c.x-p.pos.x,c.z-p.pos.z)>CAR.reach+.5)return false;
  p.car=i;p.vault=null;p.hop=0;p.airH=0;p.swing=0;p.reloadT=0;p.searching=-1;p.pos.x=c.x;p.pos.z=c.z;p.face=c.a;
  sfxFor(p).door(c.x,c.z);return true;
}
// out on the driver's side, or wherever there is room
export function leaveCar(p){
  const i=p.car;if(!(i>=0))return;const c=G.cars[i];p.car=-1;if(!c)return;
  c.v=0;const rx=Math.cos(c.a),rz=-Math.sin(c.a);   // the car's left (its right is -)
  for(const [ox,oz] of [[rx*1.9,rz*1.9],[-rx*1.9,-rz*1.9],[Math.sin(c.a)*3.2,Math.cos(c.a)*3.2],[-Math.sin(c.a)*3.2,-Math.cos(c.a)*3.2]]){
    const x=c.x+ox,z=c.z+oz;if(freeSpot(x,z)){p.pos.x=x;p.pos.z=z;break;}}
  sfx.door(c.x,c.z);
}
function freeSpot(x,z){if(!inWorld(x,z,.4))return false;for(const b of solids)if(x>b.x0-.4&&x<b.x1+.4&&z>b.z0-.4&&z<b.z1+.4)return false;return true;}
// what the car at (x,z) facing a would hit (other than itself): the four corners and the middles of its sides and ends
const EDGE=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
function hits(i,x,z,a){
  const s=Math.sin(a),c=Math.cos(a),own=rides[i].box,[hw,hl]=CAR_HALF,out=new Set();
  for(const [eu,ew] of EDGE){
    const u=eu*hw,w=ew*hl,px=x+c*u+s*w,pz=z-s*u+c*w;if(!inWorld(px,pz))out.add('world');
    for(const b of solids){if(b===own)continue;if(px>b.x0&&px<b.x1&&pz>b.z0&&pz<b.z1)out.add(b);}}
  return out;
}
// v0.49 blocked only by something it is not already touching: a car that ended up over a post (or was parked on one, as
// at the gas station) used to be stuck for good, forward and back
function blocked(i,c,x,z){const now=hits(i,c.x,c.z,c.a);for(const h of hits(i,x,z,c.a))if(!now.has(h))return true;return false;}
// a player driving, once a step, instead of walking (entities/player.js updatePlayer)
export function driveStep(p,dt){
  const i=p.car,c=G.cars[i];if(!c||c.hp<=0){leaveCar(p);return;}
  const I=p.input;let target=0;
  // v0.53 the horn (attack while driving): loud, zombies come
  p.hornT=(p.hornT||0)-dt;if((I.fire||I.fireQ>0)&&p.hornT<=0){p.hornT=1;sfx.horn(c.x,c.z);makeNoise(c.x,c.z,CAR.hornNoise);}
  // v0.53 fuel: none left, no power; at a pump and nearly still, it fills
  if(c.fuel===undefined)c.fuel=CAR.fuel[1];
  if(Math.abs(c.v)<.5&&pumpSpots.some(s=>Math.hypot(s.x-c.x,s.z-c.z)<CAR.pumpR)&&c.fuel<1){c.fuel=Math.min(1,c.fuel+CAR.refuel*dt);if(c.fuel>=1)uiFor(p).feed('เติมน้ำมันเต็มถัง');}
  if(I.mag>.1&&c.fuel>0){
    // pulling against the car backs it up (v0.49 only nearly straight back, and not while backing into something)
    const want=Math.atan2(I.mx,I.mz),d=wrap(want-c.a),back=Math.abs(d)>CAR.backAt&&!(c.bump>0);
    const turn=back?wrap(want-(c.a+Math.PI)):d,grip=Math.max(CAR.grip0,Math.min(1,Math.abs(c.v)/3));   // v0.49 it turns a little from standstill too
    c.a=wrap(c.a+Math.max(-1,Math.min(1,turn*2))*CAR.steer*grip*dt);   // front (or, backing up, the rear) swings toward the stick
    target=back?-CAR.rev*I.mag:CAR.max*I.mag*Math.max(.25,Math.cos(Math.min(Math.abs(d),1.4)));
  }
  const dv=target-c.v,rate=target===0?CAR.drag:Math.sign(dv)!==Math.sign(c.v)&&c.v!==0?CAR.brake:CAR.accel;
  c.v+=Math.max(-rate*dt,Math.min(rate*dt,dv));
  move(i,c,dt,p);
  p.pos.x=c.x;p.pos.z=c.z;p.face=c.a;p.moving=0;p.room=-1;
  p.noiseT=(p.noiseT||0)-dt;if(p.noiseT<=0&&Math.abs(c.v)>.3){p.noiseT=CAR.noiseEvery;makeNoise(c.x,c.z,CAR.noise);}
}
function move(i,c,dt,driver){
  if(Math.abs(c.v)<.01){c.v=0;return;}
  const nx=c.x+Math.sin(c.a)*c.v*dt,nz=c.z+Math.cos(c.a)*c.v*dt;
  if(c.bump>0)c.bump-=dt;
  if(blocked(i,c,nx,nz)){
    const hit=Math.abs(c.v);if(hit>4){c.hp-=hit*CAR.crash;sfx.clamp(c.x,c.z);if(driver)uiFor(driver).hurt();}   // a crash
    if(c.v<0)c.bump=.8;   // v0.49 backed into something: pulling back now drives forward and turns instead
    c.v*=-.25;
  // v0.58 a mechanic drives further on the same fuel
  }else{if(c.fuel!==undefined){const was=c.fuel;c.fuel=Math.max(0,c.fuel-Math.hypot(nx-c.x,nz-c.z)*CAR.fuelUse*(driver?jobOf(driver).fuel||1:1));if(driver&&was>.15&&c.fuel<=.15)uiFor(driver).feed('น้ำมันใกล้หมด','warn');if(driver&&was>0&&c.fuel<=0)uiFor(driver).feed('น้ำมันหมด','warn');}
    c.x=nx;c.z=nz;}
  // running zombies down (from the front or the back, whichever way it goes)
  if(Math.abs(c.v)>CAR.hitMin){const s=Math.sin(c.a),co=Math.cos(c.a),dir=Math.sign(c.v);
    for(const z of agents){if(z.state!=='zombie'||z.carT>0)continue;const dx=z.pos.x-c.x,dz=z.pos.z-c.z,along=dx*s+dz*co,lat=dx*co-dz*s;
      if(Math.abs(along)>CAR_HALF[1]+.4||Math.abs(lat)>CAR_HALF[0]+(z.rad||.34))continue;
      const k=Math.min(1,Math.abs(c.v)/CAR.max);z.carT=.7;
      hurtZombie(z,CAR.hitDmg*k,s*dir,co*dir,2.6*k,false,false,driver);sfx.hit(z.pos.x,z.pos.z,'blunt');
      const big=z.kind==='tyrant'||z.kind==='armor';c.hp-=CAR.hitCost*(big?5:1);c.v*=big?.25:.82;}
    // v0.49 PvP: other players too, the kill counting for the driver
    if(isPvp())for(const q of players){if(q===driver||!q.alive||q.car>=0||q.carT>0)continue;const dx=q.pos.x-c.x,dz=q.pos.z-c.z,along=dx*s+dz*co,lat=dx*co-dz*s;
      if(Math.abs(along)>CAR_HALF[1]+.4||Math.abs(lat)>CAR_HALF[0]+.34)continue;
      const k=Math.min(1,Math.abs(c.v)/CAR.max);q.carT=.7;hurtPlayer(q,CAR.hitP*k,driver);sfx.hit(q.pos.x,q.pos.z,'blunt');
      q.pos.x+=s*dir*2.2*k;q.pos.z+=co*dir*2.2*k;c.hp-=CAR.hitCost;c.v*=.8;}}
  if(c.hp<=0){c.hp=0;c.v=0;sfx.crack();const d=driverOf(i);if(d){uiFor(d).feed('รถพังแล้ว','warn');leaveCar(d);}}
  placeRide(rides[i],c.x,c.z,c.a,c.hp);
}
// cars nobody drives roll to a stop; zombie hit timers count down (host, every step)
export function updateCars(dt){
  if(!G.cars)return;
  for(let i=0;i<G.cars.length;i++){const c=G.cars[i];if(!driverOf(i)&&c.v){const dv=Math.min(Math.abs(c.v),CAR.drag*2*dt);c.v-=Math.sign(c.v)*dv;move(i,c,dt,null);}}
  for(const z of agents)if(z.carT>0)z.carT-=dt;
  for(const p of players)if(p.carT>0)p.carT-=dt;
}
// a hit meant for a driver hits the car (true when it took it)
export function shieldDriver(p,n){
  if(!(p.car>=0))return false;const c=G.cars[p.car];if(!c||c.hp<=0)return false;
  c.hp-=n;placeRide(rides[p.car],c.x,c.z,c.a,c.hp);if(c.hp<=0){c.hp=0;c.v=0;sfx.crack();uiFor(p).feed('รถพังแล้ว','warn');leaveCar(p);}
  return true;
}

// ---------- the boot (v0.61) ----------
// G.cars[i].trunk: what is kept in it, like the bag (stacks merge). Reached from the bag while in the car or standing by
// it (p.nearCar); the commands go through ACTIONS (trunkPut / trunkTake) so a friend online can use it too.
function bootLoot(){const out=[],n=Math.round(TRUNK.start[0]+Math.random()*(TRUNK.start[1]-TRUNK.start[0]));
  for(let k=0;k<n;k++){const it=rollLoot('day','city');if(it.id==='backpack')continue;const e=out.find(x=>x.id===it.id&&STACKS.has(DEF[it.id].kind));if(e)e.n+=it.n||1;else out.push(it);}
  return out;}
export const trunkOf=p=>{const i=p.car>=0?p.car:p.nearCar;const c=i>=0&&G.cars&&G.cars[i];return c&&c.hp>0?c:null;};
export function trunkPut(p,i){
  const c=trunkOf(p),g=p.gear,it=g.bag[i|0];if(!c||!it)return;if(!c.trunk)c.trunk=[];
  const stack=STACKS.has(DEF[it.id].kind),e=stack&&c.trunk.find(x=>x.id===it.id);
  if(e)e.n+=it.n;else{if(c.trunk.length>=TRUNK.slots){uiFor(p).feed('ท้ายรถเต็ม','warn');return;}c.trunk.push(it);}
  g.bag.splice(i|0,1);sfxFor(p).pickup();uiFor(p).updateLoadout(true);
}
export function trunkTake(p,j){
  const c=trunkOf(p);if(!c||!c.trunk)return;const it=c.trunk[j|0];if(!it)return;const g=p.gear;
  if(STACKS.has(DEF[it.id].kind)){const left=addStack(p,it.id,it.n);if(left>=it.n){uiFor(p).feed('กระเป๋าเต็ม','warn');return;}if(left>0)it.n=left;else c.trunk.splice(j|0,1);}
  else{if(g.bag.length>=g.cap){uiFor(p).feed('กระเป๋าเต็ม','warn');return;}g.bag.push(it);c.trunk.splice(j|0,1);tidyBag(g);}
  sfxFor(p).pickup();uiFor(p).updateLoadout(true);
}
