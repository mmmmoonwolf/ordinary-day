import {solids,rayWall,freeAt} from '../world/collision.js';
import {roomAt} from '../world/interiors.js';
import {VAULT} from '../config/handling.js';

// ---------- vaulting (v0.30) ----------
// Low obstacles (a collision box marked `low`: benches, rubbish heaps, cars, market counters, the park fountain, beds,
// tables, sofas, kitchen counters, cabinets, hay bales) can be vaulted: Space in the first-person view, or by running
// straight into one (any view; on a phone the stick pushed all the way). The player goes over on a fixed path in
// VAULT.dur s, with no collision meanwhile, and lands on the far side; zombies still have to walk round.
// Without anything to vault, Space only hops (looks only). p.airH is how high off the ground the player is (drawn by
// animate() and the first-person camera, sent to friends online).

// what the player would vault going in direction (dx, dz) with an obstacle no further than `reach` m: the start and
// landing points, or null (nothing low ahead, something else in the way, too deep, or no room to land)
export function vaultTarget(p,dx,dz,reach=VAULT.reach){
  const l=Math.hypot(dx,dz);if(l<1e-4)return null;dx/=l;dz/=l;
  const ox=p.pos.x,oz=p.pos.z,r=p.rad||.34,first=rayWall(ox,oz,dx,dz,reach+r+.5);
  for(const b of solids){
    if(!b.low)continue;
    let t0=-1e9,t1=1e9;
    for(const [o,d,lo,hi] of [[ox,dx,b.x0,b.x1],[oz,dz,b.z0,b.z1]]){
      if(Math.abs(d)<1e-6){if(o<lo||o>hi){t0=1e9;break;}continue;}
      let a=(lo-o)/d,c=(hi-o)/d;if(a>c){const s=a;a=c;c=s;}t0=Math.max(t0,a);t1=Math.min(t1,c);
    }
    if(t0>t1||t0<0||t0>reach+r)continue;
    if(first<t0-.08)continue;   // something else is hit first
    if(t1-t0>VAULT.depth)continue;   // too deep to clear (a car only across, not along)
    const land=t1+r+.12,lx=ox+dx*land,lz=oz+dz*land;
    if(!freeAt(lx,lz,r-.04)||roomAt(lx,lz)!==roomAt(ox,oz))continue;
    return {x0:ox,z0:oz,x1:lx,z1:lz,t:0};
  }
  return null;
}
export function startVault(p,dx,dz,reach){const v=vaultTarget(p,dx,dz,reach);if(!v)return false;p.vault=v;p.hop=0;p.swing=0;p.face=Math.atan2(dx,dz);return true;}
// once a step while vaulting (instead of walking)
export function updateVault(p,dt){
  const v=p.vault;v.t=Math.min(1,v.t+dt/VAULT.dur);const k=v.t;
  p.pos.x=v.x0+(v.x1-v.x0)*k;p.pos.z=v.z0+(v.z1-v.z0)*k;p.airH=Math.sin(k*Math.PI)*VAULT.height;
  p.moving=Math.hypot(v.x1-v.x0,v.z1-v.z0)/VAULT.dur;
  if(k>=1){p.vault=null;p.airH=0;}
}
