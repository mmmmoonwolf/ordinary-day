import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC,groundY} from '../config/world.js';
import {LZ} from '../config/goal.js';
import {S,part} from './materials.js';
import {solids,freeAt} from './collision.js';
import {buildings,lootSpots} from './city.js';
import {rooms,roomAt} from './interiors.js';
import {decor} from './decor.js';

// ---------- a dirtier town and crowded rooms (v0.18) ----------
// City Pack and Furniture models, placed after world/decor.js with their own rng, so nothing that was there moves.
//  - decor (no collision): papers, rubbish bags, boxes, cones, hydrants, mailboxes, bins, manholes, cracked tarmac, planters,
//    fire escapes and air conditioners on the walls, roof hatches
//  - heavy (a collision box, and a plain box drawn while the models are missing): dumpsters against the walls, a bus, vans
//    and pickups abandoned in the streets, hospital beds and tables in the rooms
//  - roomDecor[k]: what lies around in room k (chairs, carpet, lamp, plants, bins, boxes, bags, papers), drawn with the
//    room's cutaway like the furniture
// Decor items may carry y (wall or roof height) and by:'w' (size is the width, for flat things).
export const heavy=[];   // {id, x, z, ry, ex, ez (half footprint), box, mesh (the plain box), room (-1 outside), y}
export const roomDecor=[];
const fallMat=S({color:'#4a4640',roughness:.9});
export function buildClutter(){
  const rng=mulberry32(1818),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)];
  const clearOf=(x,z,r)=>!lootSpots.some(s=>Math.hypot(s.x-x,s.z-z)<r)&&!rooms.some(q=>Math.hypot(q.dx-x,q.dz-z)<r+2)&&Math.hypot(x-LZ.x,z-LZ.z)>10&&Math.hypot(x-RC[2],z-RC[2])>8;
  const inCity=(x,z)=>Math.abs(x)<66&&Math.abs(z)<66;
  const put=(id,x,z,size,o={})=>{if(!inCity(x,z)||!o.free&&(!freeAt(x,z,o.r??.3)||roomAt(x,z,.3)>=0)||!clearOf(x,z,.9))return false;decor.push({id,x,z,ry:o.ry??R(0,6.28),size,shadow:!!o.shadow,y:o.y,by:o.by});return true;};
  // nothing in front of a doorway; a solid prop: footprint hw x hd (before turning by ry, which is a multiple of 90 degrees), checked against everything
  const solidAt=(id,x,z,hw,hd,ry,h,k)=>{
    const sw=Math.abs(Math.sin(ry))>.5,ex=sw?hd:hw,ez=sw?hw:hd;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(!freeAt(x+a*ex,z+b*ez,.15))return false;
    if(!clearOf(x,z,Math.max(ex,ez)+.8))return false;
    const box={x0:x-ex,x1:x+ex,z0:z-ez,z1:z+ez};solids.push(box);
    const y0=k>=0?.18:groundY(x,z),mesh=part(fallMat,ex*2,h,ez*2,x,y0+h/2,z);mesh.castShadow=mesh.receiveShadow=true;
    if(k>=0)rooms[k].cut.add(mesh);else scene.add(mesh);
    heavy.push({id,x,z,ry,ex,ez,box,mesh,room:k,y:y0});return true;
  };
  // ---- streets ----
  const onStreet=e=>{const i=Math.floor(rng()*5),along=R(-63,63),s=rng()<.5?-1:1,o=R(e[0],e[1])*s;return rng()<.5?[RC[i]+o,along,true]:[along,RC[i]+o,false];};
  for(let k=0;k<70;k++){const [x,z]=onStreet([0,6]);put('c_papers',x,z,R(.7,1.2),{by:'w'});}
  for(let k=0;k<16;k++){const [x,z]=onStreet([.5,3.4]);put('c_roadbits',x,z,R(3,5),{by:'w',free:true,ry:pickR([0,Math.PI/2])});}
  for(let k=0;k<12;k++){const [x,z]=onStreet([0,2.5]);put('c_manhole',x,z,.75,{by:'w',free:true});}
  for(let k=0;k<20;k++){const [x,z]=onStreet([1,3.6]);put('c_cone',x,z,.7);}
  // along the curbs
  const curb=()=>{const i=Math.floor(rng()*4),j=Math.floor(rng()*4),cx=(RC[i]+RC[i+1])/2,cz=(RC[j]+RC[j+1])/2,side=Math.floor(rng()*4),t=R(-10.5,10.5),o=11.3;
    return side<2?[cx+(side?1:-1)*o,cz+t,side?-Math.PI/2:Math.PI/2]:[cx+t,cz+(side===2?1:-1)*o,side===2?Math.PI:0];};
  for(const [id,n,size] of [['c_hydrant',12,.8],['c_mailbox',10,1.2],['c_power',10,1.1],['c_bin',16,.95],['c_planter',6,.9]])for(let k=0;k<n;k++){const [x,z,ry]=curb();put(id,x,z,size,{ry,shadow:true});}
  // ---- against the walls: rubbish, dumpsters, fire escapes, air conditioners, posters ----
  for(const b of buildings){
    if(roomAt(b.cx,b.cz)>=0&&rng()<.3)continue;
    const side=Math.floor(rng()*4),nx=side===0?1:side===1?-1:0,nz=side===2?1:side===3?-1:0,len=nx?b.d:b.w,ry=Math.atan2(nx,nz);
    const at=t=>[b.cx+nx*b.w/2+(nz?t:0),b.cz+nz*b.d/2+(nx?t:0)];
    // rubbish bags and boxes in a heap
    {const t=R(-len/2+1,len/2-1),[fx,fz]=at(t);for(let k=0;k<5;k++)put(rng()<.6?'c_bag':'c_box',fx+nx*R(.35,1.1)+(nz?R(-.9,.9):0),fz+nz*R(.35,1.1)+(nx?R(-.9,.9):0),rng()<.6?R(.42,.55):R(.35,.5));}
    if(rng()<.35){const t=R(-len/2+2,len/2-2),[fx,fz]=at(t);solidAt('c_dumpster',fx+nx*.95,fz+nz*.95,1.22,.65,ry+Math.PI,1.45,-1);}
    const floors=Math.round(b.h/3.2),room=roomAt(b.cx,b.cz)>=0;
    if(nx>0||nz>0){if(!room&&rng()<.5)put('c_roofexit',b.cx+R(-b.w/4,b.w/4),b.cz+R(-b.d/4,b.d/4),.9,{y:.18+b.h,free:true,shadow:true});continue;}   // the camera looks from +x +z: nothing on the walls facing it
    if(floors>=3&&rng()<.55){const t=R(-len/2+2,len/2-2),[fx,fz]=at(t);for(let f=1;f<floors;f++)put('c_fireexit',fx+nx*.32,fz+nz*.32,2.4,{by:'w',y:.18+f*3.2-.1,ry,free:true,shadow:true});}
    for(let k=0;k<2;k++)if(rng()<.5){const t=R(-len/2+1,len/2-1),[fx,fz]=at(t),f=1+Math.floor(rng()*Math.max(1,floors-1));put('c_ac',fx+nx*.3,fz+nz*.3,.75,{by:'w',y:.18+f*3.2+.4,ry,free:true,shadow:true});}
    if(rng()<.25){const t=R(-len/2+1,len/2-1),[fx,fz]=at(t);put('c_poster',fx+nx*.06,fz+nz*.06,1.2,{y:.18+.9,ry,free:true});}
    if(!room&&rng()<.5)put('c_roofexit',b.cx+R(-b.w/4,b.w/4),b.cz+R(-b.d/4,b.d/4),.9,{y:.18+b.h,free:true,shadow:true});
  }
  // ---- wrecks in the street ----
  // along a lane, away from the crossings
  for(const [id,n,hw,hd,h] of [['c_bus',1,1.35,5.2,3],['c_van',3,1.05,2.4,2.1],['c_pickup',3,1.15,2.6,1.8]])
    for(let k=0,tries=0;k<n&&tries<60;tries++){const [x,z,vx]=onStreet([1.6,2.6]),a=vx?z:x;if(RC.some(c=>Math.abs(a-c)<hd+5))continue;if(solidAt(id,x,z,hw,hd,(vx?0:Math.PI/2)+(rng()<.5?Math.PI:0),h,-1))k++;}
  for(let k=0;k<3;k++){const [x,z]=onStreet([.5,3]);put('c_moto',x,z,1.1,{shadow:true});}
  // ---- crowded rooms ----
  rooms.forEach((r,k)=>{
    const list=roomDecor[k]=[],P=r.place&&r.place.type,cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2,[nx,nz]=r.n;
    // keep a lane from the door to the middle of the room, and the space in front of the furniture, clear
    const lane=(x,z,e=0)=>{const ax=r.dx,az=r.dz,bx=cx,bz=cz,vx=bx-ax,vz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz)));return Math.hypot(x-ax-vx*t,z-az-vz*t)<1.5+e;};
    const spot=(m,e=0)=>{for(let t=0;t<20;t++){const x=R(r.x0+m,r.x1-m),z=R(r.z0+m,r.z1-m);if(!lane(x,z,e)&&freeAt(x,z,m)&&!lootSpots.some(s=>Math.hypot(s.x-x,s.z-z)<1.1))return [x,z];}return null;};
    const add=(id,size,m,o={})=>{const s=spot(m);if(s)list.push({id,x:s[0],z:s[1],ry:o.ry??R(0,6.28),size,shadow:!!o.shadow,by:o.by,y:.19});};
    const solid=(id,hw,hd,h)=>{for(let t=0;t<12;t++){const s=spot(Math.max(hw,hd)+.5,Math.max(hw,hd)*.6);if(!s)return;if(solidAt(id,s[0],s[1],hw,hd,pickR([0,Math.PI/2,Math.PI,-Math.PI/2]),h,k))return;}};
    if(P==='hospital')for(let i=0;i<4;i++)solid('f_bed',.5,1,.62);
    else if(P==='diner')for(let i=0;i<3;i++)solid('f_table',.5,.5,.72);
    else if(!P){if(rng()<.8){const big=rng()<.5;solid(big?'f_bedk':'f_bed',big?.78:.5,1,.6);}solid('f_table',.5,.5,.72);if(rng()<.6)solid('f_table',.5,.5,.72);}
    add('f_carpet',2.4,1.4,{by:'w'});
    const chairs=P==='diner'?8:P?3:5;for(let i=0;i<chairs;i++)add(rng()<.6?'f_chair':'f_chair2',.9,.4);
    if(!P){add('f_lamp',1.5,.3,{shadow:true});add('f_plant',.7,.3);add('f_plant',.9,.3);add('f_night',.55,.4);add('f_night',.55,.4);if(rng()<.5)add('f_toilet',.8,.5);}else add('f_plant',.8,.3);
    add('f_tcan',.6,.3);add('f_tcan',.6,.3);if(P==='diner'||P==='grocery')add('f_stool',.7,.35);
    for(let i=0;i<(P?9:7);i++)add(pickR(['c_box','c_box','c_bag']),R(.35,.5),.3);
    for(let i=0;i<7;i++)add('c_papers',R(.6,1),.2,{by:'w'});
  });
}
