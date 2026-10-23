import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {GATE,SUBURB,WALL_Z} from '../config/world.js';
import {S,box,grassMat,greyMat,roadMat,walkMat,unitBox} from './materials.js';
import {mk,grain,stains,T} from './textures.js';
import {solids,freeAt} from './collision.js';
import {lootSpots,cityWall,mapPaint} from './city.js';
import {addRoom,rooms,roomAt} from './interiors.js';
import {decor} from './decor.js';
import {solidAt,furnish} from './clutter.js';
import {shed,windows,ground,merge,M} from './farm.js';

// ---------- the suburb (v0.24) ----------
// Six houses on overgrown lawns south of town, through a gate in the south wall where the middle road (x = 0) leaves:
// the road runs on to a dead end, a cross street at z = 98 serves the two big houses. Five houses can be entered and shut
// (homes: kitchens, beds, the clutter of v0.18), one is boarded up. Picket fences, mailboxes, cars in the driveways,
// bins, trees, dead street lamps. Built after the town extras with its own rng; everything appended.
function shingleTex(){const [c,g]=mk(128,128);g.fillStyle='#3d3833';g.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=10)for(let x=-((y/10)%2)*8;x<128;x+=16){const k=.75+Math.random()*.4;g.fillStyle=`rgb(${62*k|0},${56*k|0},${50*k|0})`;g.fillRect(x+1,y+1,14,8);}
  grain(g,128,128,1500,.18,2);stains(g,128,128,8,'90,95,60',22,.4);return T(c,2,2);}
const PAINT=['#a9a08c','#8c9a98','#a48c78','#9a9a8a','#b0a48a','#8e8478'];
export function buildSuburb(){
  const rng=mulberry32(2424),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)];
  // the gate in the south wall, solid either side
  const w=cityWall.south;if(w){w.scale.x=68.75-GATE;w.position.x=-(68.75+GATE)/2;box(greyMat,68.75-GATE,.9,.5,(68.75+GATE)/2,.45,WALL_Z);}
  solids.push({x0:SUBURB.x0-1,x1:-GATE,z0:WALL_Z-.35,z1:WALL_Z+.35},{x0:GATE,x1:SUBURB.x1+1,z0:WALL_Z-.35,z1:WALL_Z+.35});
  for(const s of [-1,1])box(greyMat,.7,2.2,.7,s*(GATE+.35),1.1,WALL_Z);
  // lawns, the road on to a dead end, the cross street, driveways
  ground(grassMat,SUBURB.x0-6,SUBURB.x1+6,WALL_Z+.3,SUBURB.z1+6,.008);
  ground(roadMat,-3.6,3.6,WALL_Z-1,126,.015);ground(roadMat,-28,28,94.6,101.4,.016);
  const drive=(x0,x1,z0,z1)=>ground(walkMat,x0,x1,z0,z1,.017);
  mapPaint.push({color:'#3d4431',rects:[[SUBURB.x0,WALL_Z,SUBURB.x1,SUBURB.z1]]},{color:'#3a3d40',rects:[[-3.6,WALL_Z,3.6,126],[-28,94.6,28,101.4]]},{color:'#8a8a86',rects:[[SUBURB.x0,WALL_Z-.4,-GATE,WALL_Z+.4],[GATE,WALL_Z-.4,SUBURB.x1,WALL_Z+.4]]});
  // houses: [cx, cz, w, d, floors, door side, enterable]
  const H=[[-13,77,9,10,1,[1,0],true],[-13,89.5,9,8,1,[1,0],false],[13,77,9,10,1,[-1,0],true],[13,89.5,9,8,1,[-1,0],true],[-15,113,12,10,2,[0,-1],true],[15,113,12,10,1,[0,-1],true]];
  const roof=S({map:shingleTex(),roughness:.9});
  const fence=[],newRooms=[];
  for(const [cx,cz,hw,hd,fl,side,enter] of H){
    const b=shed(cx,cz,hw,hd,fl*3.2,pickR(PAINT),'#ffffff',roof.map);
    const [nx,nz]=side;windows(b,nx,nz,2,1.6,rng,enter?.25:1);windows(b,-nx,-nz,2,1.6,rng,enter?.4:1);if(fl>1){windows(b,nx,nz,3,4.8,rng,.5);}
    if(enter)newRooms.push(addRoom(b,side,rng));
    // a path to the door, a driveway with a car beside the house, a mailbox and a picket fence along the street
    const fx=cx+nx*(hw/2),fz=cz+nz*(hd/2),sx=nx?(nx>0?3.6:-3.6):cx,sz=nz?(nz>0?101.4:94.6):cz;
    if(nx)drive(Math.min(fx,sx),Math.max(fx,sx),cz-.8,cz+.8);else drive(cx-.8,cx+.8,Math.min(fz,sz),Math.max(fz,sz));
    const t=nx?[0,1]:[1,0],side2=rng()<.5?1:-1,off=(nx?hd:hw)/2+2.2,dx=cx+t[0]*side2*off,dz=cz+t[1]*side2*off;
    if(nx)drive(Math.min(dx-1.4,sx),Math.max(dx+1.4,sx),dz-1.6,dz+1.6);else drive(dx-1.6,dx+1.6,Math.min(dz-1.4,sz),Math.max(dz+1.4,sz));
    if(rng()<.75)solidAt(pickR(['c_van','c_pickup','c_pickup']),dx+nx*1,dz+nz*1,1.1,2.4,nx?Math.PI/2:0,2,-1);
    const mx=nx?sx-nx*1.2:cx+t[0]*1.6,mz=nz?sz-nz*1.2:cz+t[1]*1.6;decor.push({id:'c_mailbox',x:mx,z:mz,ry:Math.atan2(nx,nz),size:1.2,shadow:true});
    // picket fence along the street edge of the lot, a gap for the path and the driveway
    const along=nx?[cz-7,cz+7]:[cx-7.5,cx+7.5],line=nx?sx-nx*.6:sz-nz*.6;
    for(let a=along[0];a<along[1];a+=.25){const gapPath=Math.abs(a-(nx?cz:cx))<1.1,gapDrive=Math.abs(a-(nx?dz:dx))<2;if(gapPath||gapDrive||rng()<.05)continue;
      fence.push(nx?[unitBox,M(line,.45,a,.06,.9,.09)]:[unitBox,M(a,.45,line,.09,.9,.06)]);}
    for(const k of [-1,1])fence.push(nx?[unitBox,M(line,.65,(along[0]+along[1])/2,.04,.07,along[1]-along[0])]:[unitBox,M((along[0]+along[1])/2,.65,line,along[1]-along[0],.07,.04)]);
    // bins, a bike or junk in the yard, weeds against the walls
    decor.push({id:'c_bin',x:mx+(nx?0:1.2),z:mz+(nx?1.2:0),ry:R(0,6.28),size:.95,shadow:true});
    for(let k=0;k<5;k++){const a=R(0,6.28),r=R(hw/2+.4,hw/2+3);const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(freeAt(x,z,.4)&&roomAt(x,z,.3)<0)decor.push({id:pickR(['grass_1','grass_2','bush_1','k_shrub']),x,z,ry:R(0,6.28),size:R(.4,1.1),shadow:false});}
    for(let k=0;k<2;k++){const x=cx-nx*(hw/2+R(2,4))+R(-3,3)*Math.abs(nz),z=cz-nz*(hd/2+R(2,4))+R(-3,3)*Math.abs(nx);if(freeAt(x,z,1.2))decor.push({id:pickR(['tree_1','tree_3','dead_2','n_birch']),x,z,ry:R(0,6.28),size:R(5,7),shadow:true});}
  }
  {const m=merge(fence,S({color:new THREE.Color('#b9b2a2').convertSRGBToLinear(),roughness:.9}));scene.add(m);}
  for(const k of newRooms)furnish(rooms[k],k,rng);
  // trees along the edge, dead street lamps, a road barrier at the dead end, litter
  for(let k=0;k<22;k++){const e=rng(),x=e<.3?SUBURB.x0+R(-3,1.5):e<.6?SUBURB.x1+R(-1.5,3):R(SUBURB.x0,SUBURB.x1),z=e<.6?R(WALL_Z+4,SUBURB.z1):SUBURB.z1+R(-1.5,4);if(Math.abs(x)<5&&z>120)continue;decor.push({id:pickR(['tree_2','tree_4','dead_1','dead_4','n_birch','k_pine']),x,z,ry:R(0,6.28),size:R(5,7.5),shadow:true});}
  for(const z of [80,108,121])for(const s of [-1,1])decor.push({id:'r_light2',x:s*4.4,z,ry:s>0?-Math.PI/2:Math.PI/2,size:4.5,shadow:true});
  for(const x of [-2.4,0,2.4])decor.push({id:'k_roadblock',x,z:125.2,ry:0,size:1.4,by:'w',shadow:true});
  for(let k=0;k<20;k++){const x=R(-3.5,3.5),z=R(WALL_Z+2,125);decor.push({id:'c_papers',x,z,ry:R(0,6.28),size:R(.7,1.1),by:'w',shadow:false});}
  // loot out in the yards and driveways (city tables), appended after every other spot
  for(const [x,z] of [[-6.5,83],[6.5,83],[-22,98],[22,98],[-6,120],[6,107],[-24,72],[24,125]])if(freeAt(x,z,.5)&&roomAt(x,z,.5)<0)lootSpots.push({x,z,zone:'city',drop:null});
}
