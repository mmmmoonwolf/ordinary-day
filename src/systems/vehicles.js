import {G} from '../core/state.js';
import {CAR} from '../config/vehicles.js';
import {inWorld} from '../config/world.js';
import {solids} from '../world/collision.js';
import {rides,placeRide,CAR_HALF} from '../world/vehicles.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {hurtZombie,makeNoise} from '../entities/ai.js';
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
export function freshCars(){return rides.map(r=>({x:r.x,z:r.z,a:r.a,v:0,hp:CAR.hp}));}
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
// would the car at (x,z) facing a hit anything (other than itself)? the four corners and the middles of its long sides
function blocked(i,x,z,a){
  const s=Math.sin(a),c=Math.cos(a),own=rides[i].box,[hw,hl]=CAR_HALF;
  for(const [u,w] of [[hw,hl],[-hw,hl],[hw,-hl],[-hw,-hl],[hw,0],[-hw,0],[0,hl],[0,-hl]]){
    const px=x+c*u+s*w,pz=z-s*u+c*w;if(!inWorld(px,pz))return true;
    for(const b of solids){if(b===own)continue;if(px>b.x0&&px<b.x1&&pz>b.z0&&pz<b.z1)return true;}}
  return false;
}
// a player driving, once a step, instead of walking (entities/player.js updatePlayer)
export function driveStep(p,dt){
  const i=p.car,c=G.cars[i];if(!c||c.hp<=0){leaveCar(p);return;}
  const I=p.input;let target=0;
  if(I.mag>.1){
    const want=Math.atan2(I.mx,I.mz),d=wrap(want-c.a),back=Math.abs(d)>2.2;   // pulling against the car backs it up
    const turn=back?wrap(want-(c.a+Math.PI)):d,grip=Math.min(1,Math.abs(c.v)/3);
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
  if(blocked(i,nx,nz,c.a)){
    const hit=Math.abs(c.v);if(hit>4){c.hp-=hit*CAR.crash;sfx.clamp(c.x,c.z);if(driver)uiFor(driver).hurt();}   // a crash
    c.v*=-.25;
  }else{c.x=nx;c.z=nz;}
  // running zombies down (from the front or the back, whichever way it goes)
  if(Math.abs(c.v)>CAR.hitMin){const s=Math.sin(c.a),co=Math.cos(c.a),dir=Math.sign(c.v);
    for(const z of agents){if(z.state!=='zombie'||z.carT>0)continue;const dx=z.pos.x-c.x,dz=z.pos.z-c.z,along=dx*s+dz*co,lat=dx*co-dz*s;
      if(Math.abs(along)>CAR_HALF[1]+.4||Math.abs(lat)>CAR_HALF[0]+(z.rad||.34))continue;
      const k=Math.min(1,Math.abs(c.v)/CAR.max);z.carT=.7;
      hurtZombie(z,CAR.hitDmg*k,s*dir,co*dir,2.6*k,false,false,driver);sfx.hit(z.pos.x,z.pos.z,'blunt');
      const big=z.kind==='tyrant'||z.kind==='armor';c.hp-=CAR.hitCost*(big?5:1);c.v*=big?.25:.82;}}
  if(c.hp<=0){c.hp=0;c.v=0;sfx.crack();const d=driverOf(i);if(d){uiFor(d).feed('รถพังแล้ว','warn');leaveCar(d);}}
  placeRide(rides[i],c.x,c.z,c.a,c.hp);
}
// cars nobody drives roll to a stop; zombie hit timers count down (host, every step)
export function updateCars(dt){
  if(!G.cars)return;
  for(let i=0;i<G.cars.length;i++){const c=G.cars[i];if(!driverOf(i)&&c.v){const dv=Math.min(Math.abs(c.v),CAR.drag*2*dt);c.v-=Math.sign(c.v)*dv;move(i,c,dt,null);}}
  for(const z of agents)if(z.carT>0)z.carT-=dt;
}
// a hit meant for a driver hits the car (true when it took it)
export function shieldDriver(p,n){
  if(!(p.car>=0))return false;const c=G.cars[p.car];if(!c||c.hp<=0)return false;
  c.hp-=n;placeRide(rides[p.car],c.x,c.z,c.a,c.hp);if(c.hp<=0){c.hp=0;c.v=0;sfx.crack();uiFor(p).feed('รถพังแล้ว','warn');leaveCar(p);}
  return true;
}
