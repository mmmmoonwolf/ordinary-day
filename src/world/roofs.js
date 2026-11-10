import {S,box} from './materials.js';
import {buildings} from './city.js';
import {rooms} from './interiors.js';
import {freeAt} from './collision.js';
import {inWorld} from '../config/world.js';

// ---------- rooftops (v0.62.1 / v0.63) ----------
// A few of the buildings that cannot be entered get an iron ladder on one wall facing open ground (no rand(): picked by
// their order in `buildings`, so the town stays the same). A player at its foot climbs up (systems/roofs.js) onto the
// roof, where zombies cannot follow; they walk inside the roof's edge and come down the same way.
export const ROOF={every:3,maxH:13.5,count:9,reach:1.4,top:1.6,edge:.5};   // PLACEHOLDERS
export const ladders=[];
const iron=S({color:'#3a3b3d',roughness:.6,metalness:.5});
export function buildRoofs(){
  const inside=new Set(rooms.map(r=>r.b));let n=0;
  buildings.forEach((b,i)=>{
    if(ladders.length>=ROOF.count||inside.has(b)||b.h>ROOF.maxH||i%ROOF.every!==1)return;
    for(const [sx,sz] of [[0,1],[1,0],[0,-1],[-1,0]]){
      const half=sx?b.w/2:b.d/2,lx=b.cx+sx*(half+.55),lz=b.cz+sz*(half+.55);
      if(!inWorld(lx,lz,1)||!freeAt(lx,lz,.45)||!freeAt(lx+sx*.8,lz+sz*.8,.45))continue;
      const top=.18+b.h,wx=b.cx+sx*(half+.06),wz=b.cz+sz*(half+.06),along=sx?[0,1]:[1,0];
      for(const o of [-.3,.3])box(iron,sx?.07:.07,top+1.1,sx?.07:.07,wx+along[0]*o,(top+1.1)/2,wz+along[1]*o);
      for(let y=.4;y<top+.9;y+=.42)box(iron,along[0]?.66:.05,.05,along[1]?.66:.05,wx,y,wz);
      ladders.push({b:i,lx,lz,rx:b.cx+sx*(half-1.1),rz:b.cz+sz*(half-1.1),h:top,roof:{x0:b.cx-b.w/2+ROOF.edge,x1:b.cx+b.w/2-ROOF.edge,z0:b.cz-b.d/2+ROOF.edge,z1:b.cz+b.d/2-ROOF.edge}});n++;
      return;
    }
  });
  return n;
}
