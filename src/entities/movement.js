import {rnd,pick} from '../core/util.js';
import {collide,freeAt} from '../world/collision.js';
import {areaAt} from '../config/world.js';
import {nodeXZ,neighbors,nearestNode,same} from '../world/sidewalk.js';
import {G} from '../core/state.js';
import {roomAt,viaDoor,doorDist} from '../world/interiors.js';

// ---------- movement ----------
export function lerpAng(a,b,t){const d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t;}
export function moveAgent(a,dx,dz,speed,dt,keepFace){
  const len=Math.hypot(dx,dz);if(len<1e-4){a.moving=0;return;}
  let ux=dx/len,uz=dz/len;const r=a.rad||.34,steer=a.state!=='player'&&a.kind!=='tyrant';   // the Tyrant smashes through instead (systems/obstacles.js)
  // v0.37 going round: a detour heading is kept until the straight way ahead is clear again (checked 4 times a second)
  if(steer&&a.det){a.det.t-=dt;if(a.det.t<=0){if(clearAhead(a.pos.x,a.pos.z,ux,uz,Math.min(len,STEER.look),r)){a.det=null;a.detSide=0;}else a.det.t=STEER.recheck;}if(a.det){ux=a.det.x;uz=a.det.z;}}
  const ox=a.pos.x,oz=a.pos.z,step=speed*dt;
  a.pos.x+=ux*step;a.pos.z+=uz*step;a.moving=speed;
  if(!keepFace)a.face=lerpAng(a.face,Math.atan2(ux,uz),Math.min(1,dt*9));
  collide(a.pos,r);
  // pushed back by something: turn aside, to the same side as last time if that way is open
  if(steer&&step>1e-3&&Math.hypot(a.pos.x-ox,a.pos.z-oz)<step*STEER.blocked)a.det=detour(a,dx/len,dz/len,r);
}
// v0.37 obstacle avoidance for people and zombies (PLACEHOLDER numbers): blocked when a step moves less than `blocked` of
// its length; the straight way counts as clear again when `look` m ahead is free
const STEER={blocked:.45,look:2.2,recheck:.25,hold:[.35,.6],angles:[.55,.95,1.35,1.8,2.3]};
function clearAhead(x,z,ux,uz,d,r){for(let t=.6;t<=d+.01;t+=.6)if(!freeAt(x+ux*t,z+uz*t,r*.9))return false;return true;}
function detour(a,ux,uz,r){
  const side=a.detSide||(Math.random()<.5?1:-1);
  for(const ang of STEER.angles)for(const s of [side,-side]){
    const c=Math.cos(ang*s),sn=Math.sin(ang*s),vx=ux*c-uz*sn,vz=ux*sn+uz*c;
    if(freeAt(a.pos.x+vx*.7,a.pos.z+vz*.7,r*.9)&&freeAt(a.pos.x+vx*1.3,a.pos.z+vz*1.3,r*.9)){a.detSide=s;return {x:vx,z:vz,t:rnd(...STEER.hold)};}
  }
  a.detSide=-side;return {x:-ux,z:-uz,t:.3};   // boxed in: back off and try the other side next
}
export function followNodes(a,speed,dt){
  if(!a.node)a.node=nearestNode(a.pos);
  const [nx,nz]=nodeXZ(a.node),dx=nx+a.jx-a.pos.x,dz=nz+a.jz-a.pos.z;
  a.nodeT=(a.nodeT||0)+dt;
  if(Math.hypot(dx,dz)<.45||a.nodeT>8||a.nodeT<=dt*1.5&&!freeAt(nx+a.jx,nz+a.jz,.3)){   // v0.37 a node that something now stands on, or one not reached in 8 s, counts as passed
    a.nodeT=0;
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
  const A=k<0&&areaAt(a.pos.x,a.pos.z);if(A){areaWander(a,A,speed,dt);return;}   // v0.22 no sidewalks out there
  if(k<0){followNodes(a,speed,dt);return;}
  a.node=null;
  if(G.doors&&G.doors[k]&&!G.doors[k].open&&doorDist(k,a.pos.x,a.pos.z)<1.6){a.moving=0;return;}   // shut in: wait by the door
  const w=viaDoor(k,a.pos.x,a.pos.z,true);moveAgent(a,w.x-a.pos.x,w.z-a.pos.z,speed,dt);
}
// v0.22 a walker out in an area (the farm, the suburb) strolls between random free points of it
function areaWander(a,A,speed,dt){
  a.node=null;
  a.farmTT=(a.farmTT||0)-dt;
  if(!a.farmT||Math.hypot(a.farmT.x-a.pos.x,a.farmT.z-a.pos.z)<1||a.farmTT<=0){a.farmTT=6+Math.random()*6;for(let t=0;t<8;t++){const x=A.x0+3+Math.random()*(A.x1-A.x0-6),z=A.z0+3+Math.random()*(A.z1-A.z0-6);if(areaAt(x,z)===A&&freeAt(x,z,.6)&&roomAt(x,z,.5)<0){a.farmT={x,z};break;}}}
  if(a.farmT)moveAgent(a,a.farmT.x-a.pos.x,a.farmT.z-a.pos.z,speed,dt);
}
export const d2=(a,b)=>{const x=a.pos.x-b.pos.x,z=a.pos.z-b.pos.z;return x*x+z*z;};
