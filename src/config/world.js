// ---------- world constants ----------
export const RC=[-64,-32,0,32,64];
export const OFF=5.3;
export const LIM=67.4;
export function nearestIdx(v){let b=0;for(let i=1;i<5;i++) if(Math.abs(v-RC[i])<Math.abs(v-RC[b])) b=i;return b;}
// v0.22 the farm: a walkable area west of the city wall (x = WALL_X), reached through a gate where the z = 0 road leaves town
export const WALL_X=-68.5, GATE=4;
export const FARM={x0:-129,x1:-61,z0:-29,z1:29};   // x1 overlaps the city so the gate can be crossed; the wall in between is solid (world/farm.js)
export const inFarm=(x,z)=>x<WALL_X&&x>FARM.x0&&z>FARM.z0&&z<FARM.z1;
export function groundY(x,z){if(x<WALL_X)return .02;return (Math.abs(x-RC[nearestIdx(x)])>4 && Math.abs(z-RC[nearestIdx(z)])>4)?0.18:0.02;}
// inside the walkable world, m metres clear of its edge: the city square or the farm
export function inWorld(x,z,m=0){const L=LIM-m;return Math.abs(x)<L&&Math.abs(z)<L||x>FARM.x0+m&&x<FARM.x1&&z>FARM.z0+m&&z<FARM.z1-m;}
// moves p back inside the world: to the nearer of the city square and the farm
export function clampWorld(p){
  if(inWorld(p.x,p.z))return;
  const cx=Math.max(-LIM,Math.min(LIM,p.x)),cz=Math.max(-LIM,Math.min(LIM,p.z)),fx=Math.max(FARM.x0,Math.min(FARM.x1,p.x)),fz=Math.max(FARM.z0,Math.min(FARM.z1,p.z));
  if(Math.hypot(p.x-cx,p.z-cz)<=Math.hypot(p.x-fx,p.z-fz)){p.x=cx;p.z=cz;}else{p.x=fx;p.z=fz;}
}
