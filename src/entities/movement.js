import {rnd,pick} from '../core/util.js';
import {collide,freeAt} from '../world/collision.js';
import {FARM,WALL_X,inFarm} from '../config/world.js';
import {nodeXZ,neighbors,nearestNode,same} from '../world/sidewalk.js';
import {G} from '../core/state.js';
import {roomAt,viaDoor,doorDist} from '../world/interiors.js';

// ---------- movement ----------
export function lerpAng(a,b,t){const d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t;}
export function moveAgent(a,dx,dz,speed,dt,keepFace){
  const len=Math.hypot(dx,dz);if(len<1e-4){a.moving=0;return;}
  a.pos.x+=dx/len*speed*dt;a.pos.z+=dz/len*speed*dt;a.moving=speed;
  if(!keepFace)a.face=lerpAng(a.face,Math.atan2(dx,dz),Math.min(1,dt*9));
  collide(a.pos,a.rad||.34);
}
export function followNodes(a,speed,dt){
  if(!a.node)a.node=nearestNode(a.pos);
  const [nx,nz]=nodeXZ(a.node),dx=nx+a.jx-a.pos.x,dz=nz+a.jz-a.pos.z;
  if(Math.hypot(dx,dz)<.45){
    if(a.wait>0){a.wait-=dt;a.moving=0;return;}
    let nb=neighbors(a.node).filter(n=>!same(n,a.prev));if(!nb.length)nb=neighbors(a.node);
    const walks=nb.filter(n=>n.k==='w');const choice=(walks.length&&Math.random()<.78)?pick(walks):pick(nb);
    a.prev=a.node;a.node=choice;if(Math.random()<.18)a.wait=rnd(1,4);return;
  }
  moveAgent(a,dx,dz,speed,dt);
}
// walk the sidewalks, but first find the way out when inside a building (v0.6)
export function wander(a,speed,dt){
  const k=roomAt(a.pos.x,a.pos.z);
  if(k<0&&inFarm(a.pos.x,a.pos.z)){farmWander(a,speed,dt);return;}   // v0.22 no sidewalks out there
  if(k<0){followNodes(a,speed,dt);return;}
  a.node=null;
  if(G.doors&&G.doors[k]&&!G.doors[k].open&&doorDist(k,a.pos.x,a.pos.z)<1.6){a.moving=0;return;}   // shut in: wait by the door
  const w=viaDoor(k,a.pos.x,a.pos.z,true);moveAgent(a,w.x-a.pos.x,w.z-a.pos.z,speed,dt);
}
// v0.22 a walker at the farm strolls between random free points of it
function farmWander(a,speed,dt){
  a.node=null;
  a.farmTT=(a.farmTT||0)-dt;
  if(!a.farmT||Math.hypot(a.farmT.x-a.pos.x,a.farmT.z-a.pos.z)<1||a.farmTT<=0){a.farmTT=6+Math.random()*6;for(let t=0;t<8;t++){const x=FARM.x0+3+Math.random()*(WALL_X-FARM.x0-6),z=FARM.z0+3+Math.random()*(FARM.z1-FARM.z0-6);if(freeAt(x,z,.6)&&roomAt(x,z,.5)<0){a.farmT={x,z};break;}}}
  if(a.farmT)moveAgent(a,a.farmT.x-a.pos.x,a.farmT.z-a.pos.z,speed,dt);
}
export const d2=(a,b)=>{const x=a.pos.x-b.pos.x,z=a.pos.z-b.pos.z;return x*x+z*z;};
