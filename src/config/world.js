// ---------- world constants ----------
export const RC=[-64,-32,0,32,64];
export const OFF=5.3;
export const LIM=67.4;
export function nearestIdx(v){let b=0;for(let i=1;i<5;i++) if(Math.abs(v-RC[i])<Math.abs(v-RC[b])) b=i;return b;}
// v0.22+ areas outside the city wall, each reached through a gate where a middle road leaves town (world/farm.js,
// world/suburb.js). wall: the city wall it lies beyond (axis 'x' or 'z', at v); the gate is GATE either side of 0 on the
// other axis. The rect overlaps the city a little so the gate can be crossed; the wall in between is solid.
// mid: where the minimap centres while a player is out there.
export const GATE=4;
export const AREAS=[
  {id:'farm',x0:-129,x1:-61,z0:-29,z1:29,wall:{axis:'x',v:-68.5},mid:[-99,0]},
  {id:'suburb',x0:-31,x1:31,z0:61,z1:129,wall:{axis:'z',v:68.5},mid:[0,99]},
  {id:'river',x0:61,x1:151,z0:-31,z1:31,wall:{axis:'x',v:68.5},mid:[108,0]},
];
export const FARM=AREAS[0],SUBURB=AREAS[1],EAST=AREAS[2],WALL_X=FARM.wall.v,WALL_Z=SUBURB.wall.v;
// v0.25 the river east of town: water from x0 to x1 (solid, walk round it), crossed only on the bridge (|z| < half)
export const RIVER={x0:92,x1:104,bridge:3.6};
export const riverSide=x=>x<RIVER.x0?-1:x>RIVER.x1?1:0;
// past the area's wall (how far, < 0 still in town)
export const beyond=(A,x,z)=>{const w=A.wall,p=w.axis==='x'?x:z;return w.v<0?w.v-p:p-w.v;};
export function areaAt(x,z){for(const A of AREAS)if(beyond(A,x,z)>0&&x>A.x0&&x<A.x1&&z>A.z0&&z<A.z1)return A;return null;}
export const inFarm=(x,z)=>areaAt(x,z)===FARM;
export function groundY(x,z){if(areaAt(x,z))return .02;return (Math.abs(x-RC[nearestIdx(x)])>4 && Math.abs(z-RC[nearestIdx(z)])>4)?0.18:0.02;}
// inside the walkable world, m metres clear of its edge: the city square or an area
export function inWorld(x,z,m=0){const L=LIM-m;if(Math.abs(x)<L&&Math.abs(z)<L)return true;for(const A of AREAS)if(x>A.x0+m&&x<A.x1-m&&z>A.z0+m&&z<A.z1-m)return true;return false;}
// moves p back inside the world: to the nearest of the city square and the areas
export function clampWorld(p){
  if(inWorld(p.x,p.z))return;
  let bx=Math.max(-LIM,Math.min(LIM,p.x)),bz=Math.max(-LIM,Math.min(LIM,p.z)),bd=Math.hypot(p.x-bx,p.z-bz);
  for(const A of AREAS){const x=Math.max(A.x0,Math.min(A.x1,p.x)),z=Math.max(A.z0,Math.min(A.z1,p.z)),d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;bx=x;bz=z;}}
  p.x=bx;p.z=bz;
}
