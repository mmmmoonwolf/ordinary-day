import {clamp} from '../core/util.js';
import {inWorld,clampWorld} from '../config/world.js';

// solid boxes on the ground plane, used for movement, bullets and loot placement
// ---------- the grid (v0.68) ----------
// collide() and rayWall() are asked hundreds of times a step (every character, every line of sight) and used to look
// at every box each time: half of a step's time with a crowd. The boxes are now also listed by the 4 m cell they
// touch, and a question looks only at the cells it can reach. The answers are the same to the last digit: collide()
// still pushes out of the boxes in the order they were added, rayWall() takes the nearest of the same hits.
//  - `solids` stays the one list; anything may push to it or splice from it (doors, smashed cars, the supply crate),
//    which marks the grid stale and it is listed again at the next question
//  - a box whose corners CHANGE after it is added (a car that drives, the camp gate) must be made with `dyn:true`:
//    those are not listed by cell but looked at every time. movedBoxes() finds one that was not (tools/tests/grid)
const CELL=4,EPS=1e-3,PAD=1,HUGE=4096;
const grid=new Map(),dyn=[],cand=[];let stale=true,built=0,stamp=0;
class Solids extends Array{
  push(...b){stale=true;return super.push(...b);}
  splice(...a){stale=true;return super.splice(...a);}
  pop(){stale=true;return super.pop();}
  shift(){stale=true;return super.shift();}
  unshift(...b){stale=true;return super.unshift(...b);}
  static get [Symbol.species](){return Array;}   // filter(), map() and slice() give plain arrays
}
export const solids=new Solids();
const key=(cx,cz)=>(cx+32768)*65536+(cz+32768);
function list(){
  grid.clear();dyn.length=0;
  for(let i=0;i<solids.length;i++){
    const b=solids[i];b._i=i;b._s=0;
    const x0=Math.floor((b.x0-EPS)/CELL),x1=Math.floor((b.x1+EPS)/CELL),z0=Math.floor((b.z0-EPS)/CELL),z1=Math.floor((b.z1+EPS)/CELL);
    if(b.dyn||!((x1-x0+1)*(z1-z0+1)<=HUGE)){dyn.push(b);continue;}   // moving, or absurdly large (or not a number): looked at every time
    b._c=b.x0+b.x1*3+b.z0*7+b.z1*13;                                  // where it was when listed, for movedBoxes()
    for(let cx=x0;cx<=x1;cx++)for(let cz=z0;cz<=z1;cz++){const k=key(cx,cz);let c=grid.get(k);if(!c)grid.set(k,c=[]);c.push(b);}
  }
  stale=false;built=solids.length;
}
const fresh=()=>{if(stale||built!==solids.length)list();};
// boxes listed by cell whose corners have changed since: each needs `dyn:true` where it is made (for the tests)
export function movedBoxes(){fresh();return solids.filter(b=>!b.dyn&&b._c!==undefined&&b._c!==b.x0+b.x1*3+b.z0*7+b.z1*13);}
// the boxes that reach into the square (x±m, z±m), in the order they were added, into `cand`; returns how many
function near(x,z,m){
  fresh();stamp++;let n=0;
  const x0=Math.floor((x-m)/CELL),x1=Math.floor((x+m)/CELL),z0=Math.floor((z-m)/CELL),z1=Math.floor((z+m)/CELL);
  for(let cx=x0;cx<=x1;cx++)for(let cz=z0;cz<=z1;cz++){const c=grid.get(key(cx,cz));if(c)for(const b of c)if(b._s!==stamp){b._s=stamp;cand[n++]=b;}}
  for(const b of dyn)cand[n++]=b;
  for(let i=1;i<n;i++){const b=cand[i];let j=i-1;while(j>=0&&cand[j]._i>b._i){cand[j+1]=cand[j];j--;}cand[j+1]=b;}   // a handful: insertion sort
  return n;
}
export function solid(cx,cz,hw,hd){const b={x0:cx-hw,x1:cx+hw,z0:cz-hd,z1:cz+hd};solids.push(b);return b;}
export function freeAt(x,z,m){
  const n=near(x,z,Math.max(m,0));
  for(let i=0;i<n;i++){const b=cand[i];if(x>b.x0-m&&x<b.x1+m&&z>b.z0-m&&z<b.z1+m)return false;}
  return inWorld(x,z);
}
// push the point p (radius r) out of one box
function out(p,r,b){
  if(p.x<b.x0-r||p.x>b.x1+r||p.z<b.z0-r||p.z>b.z1+r)return;
  const qx=clamp(p.x,b.x0,b.x1),qz=clamp(p.z,b.z0,b.z1),dx=p.x-qx,dz=p.z-qz,dd=dx*dx+dz*dz;
  if(dd>r*r)return;
  if(dd<1e-9){const l=p.x-b.x0,rr=b.x1-p.x,t=p.z-b.z0,bb=b.z1-p.z,m=Math.min(l,rr,t,bb);if(m===l)p.x=b.x0-r;else if(m===rr)p.x=b.x1+r;else if(m===t)p.z=b.z0-r;else p.z=b.z1+r;}
  else{const d=Math.sqrt(dd);p.x=qx+dx/d*r;p.z=qz+dz/d*r;}
}
export function collide(p,r){
  const sx=p.x,sz=p.z,n=near(sx,sz,r+PAD);let far=false;
  for(let i=0;i<n&&!far;i++){out(p,r,cand[i]);if(Math.abs(p.x-sx)>PAD||Math.abs(p.z-sz)>PAD)far=true;}
  // thrown further than the cells that were looked at (it stood deep inside a box): do it again against every box
  if(far){p.x=sx;p.z=sz;for(const b of solids)out(p,r,b);}
  clampWorld(p);   // the city square or the farm (v0.22)
}
// where the ray (ox,oz)+t(dx,dz) first enters box b before `best`, or `best`
function enter(b,ox,oz,dx,dz,best){
  let t0=0,t1=best;
  if(Math.abs(dx)<1e-6){if(ox<b.x0||ox>b.x1)return best;}else{let a=(b.x0-ox)/dx,c=(b.x1-ox)/dx;if(a>c){const s=a;a=c;c=s;}t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return best;}
  if(Math.abs(dz)<1e-6){if(oz<b.z0||oz>b.z1)return best;}else{let a=(b.z0-oz)/dz,c=(b.z1-oz)/dz;if(a>c){const s=a;a=c;c=s;}t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return best;}
  return t0>.05&&t0<best?t0:best;
}
export function rayWall(ox,oz,dx,dz,max){
  fresh();stamp++;let best=max;
  for(const b of dyn)best=enter(b,ox,oz,dx,dz,best);
  // walk the cells the ray passes through, nearest first, and stop once the next cell starts beyond the nearest hit
  let cx=Math.floor(ox/CELL),cz=Math.floor(oz/CELL);
  const ax=Math.abs(dx),az=Math.abs(dz),stepX=dx>0?1:-1,stepZ=dz>0?1:-1,dtx=ax<1e-9?Infinity:CELL/ax,dtz=az<1e-9?Infinity:CELL/az;
  let tx=ax<1e-9?Infinity:((dx>0?cx+1:cx)*CELL-ox)/dx,tz=az<1e-9?Infinity:((dz>0?cz+1:cz)*CELL-oz)/dz;
  for(let guard=0;guard<100000;guard++){
    const c=grid.get(key(cx,cz));if(c)for(const b of c)if(b._s!==stamp){b._s=stamp;best=enter(b,ox,oz,dx,dz,best);}
    if(Math.min(tx,tz)>=best)break;
    if(tx<tz){cx+=stepX;tx+=dtx;}else{cz+=stepZ;tz+=dtz;}
  }
  return best;
}
