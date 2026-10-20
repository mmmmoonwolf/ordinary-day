import {rnd,pick} from '../core/util.js';
import {collide} from '../world/collision.js';
import {nodeXZ,neighbors,nearestNode,same} from '../world/sidewalk.js';

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
export const d2=(a,b)=>{const x=a.pos.x-b.pos.x,z=a.pos.z-b.pos.z;return x*x+z*z;};
