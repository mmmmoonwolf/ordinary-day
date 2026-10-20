import {clamp} from '../core/util.js';
import {LIM} from '../config/world.js';

// solid boxes on the ground plane, used for movement, bullets and loot placement
export const solids=[];
export function solid(cx,cz,hw,hd){const b={x0:cx-hw,x1:cx+hw,z0:cz-hd,z1:cz+hd};solids.push(b);return b;}
export function freeAt(x,z,m){for(const b of solids)if(x>b.x0-m&&x<b.x1+m&&z>b.z0-m&&z<b.z1+m)return false;return Math.abs(x)<LIM&&Math.abs(z)<LIM;}
export function collide(p,r){
  for(const b of solids){
    if(p.x<b.x0-r||p.x>b.x1+r||p.z<b.z0-r||p.z>b.z1+r)continue;
    const qx=clamp(p.x,b.x0,b.x1),qz=clamp(p.z,b.z0,b.z1),dx=p.x-qx,dz=p.z-qz,dd=dx*dx+dz*dz;
    if(dd>r*r)continue;
    if(dd<1e-9){const l=p.x-b.x0,rr=b.x1-p.x,t=p.z-b.z0,bb=b.z1-p.z,m=Math.min(l,rr,t,bb);if(m===l)p.x=b.x0-r;else if(m===rr)p.x=b.x1+r;else if(m===t)p.z=b.z0-r;else p.z=b.z1+r;}
    else{const d=Math.sqrt(dd);p.x=qx+dx/d*r;p.z=qz+dz/d*r;}
  }
  p.x=clamp(p.x,-LIM,LIM);p.z=clamp(p.z,-LIM,LIM);
}
export function rayWall(ox,oz,dx,dz,max){
  let best=max;
  for(const b of solids){
    let t0=0,t1=best;
    if(Math.abs(dx)<1e-6){if(ox<b.x0||ox>b.x1)continue;}else{let a=(b.x0-ox)/dx,c=(b.x1-ox)/dx;if(a>c){const s=a;a=c;c=s;}t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)continue;}
    if(Math.abs(dz)<1e-6){if(oz<b.z0||oz>b.z1)continue;}else{let a=(b.z0-oz)/dz,c=(b.z1-oz)/dz;if(a>c){const s=a;a=c;c=s;}t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)continue;}
    if(t0>.05&&t0<best)best=t0;
  }
  return best;
}
