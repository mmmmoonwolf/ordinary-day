import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {GATE,EAST,RIVER} from '../config/world.js';
import {S,box,grassMat,greyMat,roadMat,walkMat,unitBox} from './materials.js';
import {solids,freeAt} from './collision.js';
import {lootSpots,cityWall,mapPaint} from './city.js';
import {addRoom,rooms,roomAt} from './interiors.js';
import {decor} from './decor.js';
import {solidAt,furnish} from './clutter.js';
import {shed,windows,ground,merge,M} from './farm.js';

// ---------- the river and the bridge (v0.25) ----------
// East of town, through a gate in the east wall where the middle road (z = 0) leaves: the road runs on to a concrete
// bridge over a 12 m river (water is solid: the bridge is the only way over, interiors.js navStep sends walkers to it),
// with an army checkpoint left at its far end and cars abandoned on it, a bait shack on the near bank, a raft tied up,
// and woods on the far bank (where the camp is, world/camp.js). Some nights' hordes come over the bridge
// (systems/events.js). Built after the suburb with its own rng; everything appended.
export const river={water:null};
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
export function buildRiver(){
  const rng=mulberry32(2525),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)];
  const WX=EAST.wall.v;
  // the gate in the east wall
  const w=cityWall.east;if(w){w.scale.z=68.75-GATE;w.position.z=-(68.75+GATE)/2;box(greyMat,.5,.9,68.75-GATE,WX,.45,(68.75+GATE)/2);}
  solids.push({x0:WX-.35,x1:WX+.35,z0:EAST.z0-1,z1:-GATE},{x0:WX-.35,x1:WX+.35,z0:GATE,z1:EAST.z1+1});
  for(const s of [-1,1])box(greyMat,.7,2.2,.7,WX,1.1,s*(GATE+.35));
  // ground, road, banks, water (solid but for the bridge)
  ground(grassMat,WX+.3,EAST.x1+6,EAST.z0-6,EAST.z1+6,.008);
  ground(roadMat,WX-1,RIVER.x0-1.5,-3.6,3.6,.015);ground(roadMat,RIVER.x1+1.5,EAST.x1-2,-3.6,3.6,.015);
  const mud=S({color:lin('#3b3226'),roughness:1});ground(mud,RIVER.x0-1.8,RIVER.x0+.2,EAST.z0-6,EAST.z1+6,.011);ground(mud,RIVER.x1-.2,RIVER.x1+1.8,EAST.z0-6,EAST.z1+6,.011);
  river.water=ground(S({color:lin('#22302f'),roughness:.08,metalness:.55}),RIVER.x0,RIVER.x1,EAST.z0-6,EAST.z1+6,.013);
  solids.push({x0:RIVER.x0,x1:RIVER.x1,z0:EAST.z0-1,z1:-RIVER.bridge},{x0:RIVER.x0,x1:RIVER.x1,z0:RIVER.bridge,z1:EAST.z1+1});
  mapPaint.push({color:'#3d4431',rects:[[WX,EAST.z0,EAST.x1,EAST.z1]]},{color:'#3a3d40',rects:[[WX,-3.6,EAST.x1-2,3.6]]},{color:'#25393a',rects:[[RIVER.x0,EAST.z0,RIVER.x1,-RIVER.bridge],[RIVER.x0,RIVER.bridge,RIVER.x1,EAST.z1]]},{color:'#8a8a86',rects:[[WX-.4,EAST.z0,WX+.4,-GATE],[WX-.4,GATE,WX+.4,EAST.z1],[RIVER.x0-1.5,-RIVER.bridge,RIVER.x1+1.5,RIVER.bridge]]});
  // the bridge: a concrete deck, kerbs and railings, piers standing in the water
  {const conc=S({color:lin('#8c8a84'),roughness:.9}),parts=[],L=RIVER.x1-RIVER.x0+3,cx=(RIVER.x0+RIVER.x1)/2;
    parts.push([unitBox,M(cx,.06,0,L,.1,RIVER.bridge*2+.6)]);
    for(const s of [-1,1]){parts.push([unitBox,M(cx,.22,s*(RIVER.bridge+.15),L,.32,.3)]);
      for(let x=RIVER.x0-1.3;x<=RIVER.x1+1.3;x+=1.25)if(rng()>.08)parts.push([unitBox,M(x,.8,s*(RIVER.bridge+.15),.12,.9,.12)]);
      parts.push([unitBox,M(cx,1.22,s*(RIVER.bridge+.15),L,.1,.16)]);}
    for(const x of [RIVER.x0+3,RIVER.x1-3])for(const s of [-1,1])parts.push([unitBox,M(x,-.4,s*(RIVER.bridge-.6),1.2,.9,1.2)]);
    scene.add(merge(parts,conc));}
  // by the bridge: cars left behind, a checkpoint at the far end (barriers, sandbag-grey blocks), litter
  solidAt('c_van',80,-2.9,1.05,2.4,Math.PI/2,2.1,-1);solidAt('c_pickup',RIVER.x1+12,2.95,1.15,2.6,-Math.PI/2,1.8,-1);   // on the shoulders: the middle of the road stays open for the hordes
  for(const z of [-2.6,0,2.6])decor.push({id:'k_roadblock',x:RIVER.x1+3.2,z,ry:Math.PI/2,size:1.4,by:'w',shadow:true});
  for(const [x,z] of [[RIVER.x1+5,-3.1],[RIVER.x1+5,3.1],[RIVER.x1+6.2,-3.1]])decor.push({id:'k_barrier',x,z,ry:Math.PI/2,size:1.3,by:'w',shadow:true});
  for(let k=0;k<10;k++)decor.push({id:'c_papers',x:R(WX+2,EAST.x1-4),z:R(-3,3),ry:R(0,6.28),size:R(.7,1.1),by:'w',shadow:false});
  // the bait shack on the near bank (enterable), a raft at the water, lily pads and reeds
  const shack=shed(84,-13,7,6,3,'#6d6a5c','#7f878b');windows(shack,0,1,2,1.6,rng,.5);const k=addRoom(shack,[0,1],rng);furnish(rooms[k],k,rng);
  decor.push({id:'s_raft',x:RIVER.x0+1.6,z:-17,ry:0,size:4.6,by:'w',y:.02,shadow:true},{id:'k_planks',x:RIVER.x0-1.2,z:-15.5,ry:.3,size:1.4,by:'w',shadow:true});
  for(let k2=0;k2<12;k2++)decor.push({id:'n_lily',x:R(RIVER.x0+.6,RIVER.x1-.6),z:R(EAST.z0,EAST.z1)*(rng()<.5?1:-1),ry:R(0,6.28),size:R(.6,1.1),by:'w',y:.02,shadow:false});
  for(let k2=0;k2<40;k2++){const s=rng()<.5?-1:1,x=s<0?RIVER.x0-R(.3,2.4):RIVER.x1+R(.3,2.4),z=R(EAST.z0,EAST.z1);if(Math.abs(z)<RIVER.bridge+1)continue;decor.push({id:pickR(['grass_1','grass_1','grass_2','n_mossrock']),x,z,ry:R(0,6.28),size:R(.5,1.2),shadow:false});}
  // woods: the far bank thick with trees (a clearing for the camp), a line along the near bank and the edges
  const clearing=(x,z)=>Math.hypot(x-128,z-16)<11||Math.abs(z)<5;
  for(let k2=0;k2<95;k2++){const x=R(RIVER.x1+3,EAST.x1+4),z=R(EAST.z0-4,EAST.z1+4);if(clearing(x,z)||!freeAt(x,z,1.2))continue;decor.push({id:pickR(['k_pine','k_pine','tree_1','tree_2','tree_4','dead_1','dead_3','n_birch']),x,z,ry:R(0,6.28),size:R(5,8),shadow:true});}
  for(let k2=0;k2<30;k2++){const x=R(RIVER.x1+3,EAST.x1),z=R(EAST.z0,EAST.z1);if(clearing(x,z))continue;decor.push({id:pickR(['bush_1','bush_2','k_shrub','n_berry']),x,z,ry:R(0,6.28),size:R(.6,1.2),shadow:false});}
  for(let k2=0;k2<26;k2++){const x=R(WX+3,RIVER.x0-3),z=R(EAST.z0,EAST.z1);if(Math.abs(z)<5||roomAt(x,z,2)>=0||!freeAt(x,z,1))continue;decor.push({id:pickR(['tree_3','dead_2','k_tree','grass_1','bush_2']),x,z,ry:R(0,6.28),size:R(1,7),shadow:true});}
  // loot: the checkpoint (police grade at night, like the police cars), by the cars, along the banks
  for(const [x,z,zone] of [[RIVER.x1+7.5,-1.6,'police'],[RIVER.x1+7.5,1.6,'city'],[RIVER.x0-2.2,-5.2,'city'],[78,6,'city'],[RIVER.x0-1.5,-19,'city'],[112,-8,'city']])if(freeAt(x,z,.5)&&roomAt(x,z,.5)<0)lootSpots.push({x,z,zone,drop:null});
}
