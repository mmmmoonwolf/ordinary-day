import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {GAS,CEMETERY,HIGHWAY,ROAD} from '../config/world.js';
import {GASPLACE} from '../config/places.js';
import {S,box,unitBox,glowMat} from './materials.js';
import {asphaltTex,grassTex,dirtTex} from './textures.js';
import {solids,freeAt} from './collision.js';
import {lootSpots,mapPaint,pois,buildings,occluders} from './city.js';
import {addRoom,rooms,roomAt} from './interiors.js';
import {decor} from './decor.js';
import {solidAt,furnish,heavy} from './clutter.js';
import {shed,windows,ground,merge,M} from './farm.js';
import {addTank,tanks} from './extras.js';
import {addRide} from './vehicles.js';

// ---------- the highway out of town (v0.45) ----------
// Past the camp's woods the east road goes on as a two-lane highway, 400 m of it, waiting to reach another town: empty
// but for the cars people left when they ran, burned out, crashed, nose to tail or across the lanes, with the woods
// close on both sides. On the way: a gas station with its shop (enterable, a place like the shops in town) where two cars
// still start (world/vehicles.js, systems/vehicles.js), and a side road south to a cemetery behind an iron fence. For now
// it ends at an army roadblock. Built last with its own rng; everything appended (loot spots, rooms, solids, decor).
export const highway={wrecks:0,trees:0,graves:0};
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
// a plane with its own copy of a texture, repeated per `tile` m so it does not stretch over the long road
function tiled(make,x0,x1,z0,z1,y,tile,o={}){const t=make();t.repeat.set((x1-x0)/tile,(z1-z0)/tile);return ground(S(Object.assign({map:t,roughness:.95},o)),x0,x1,z0,z1,y);}
export function buildHighway(){
  const d0=decor.length;
  const rng=mulberry32(4545),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)];
  const X0=HIGHWAY.wall.v-2,X1=ROAD.end+8,H=ROAD.half,side=ROAD.side;
  // ---- ground: grass both sides out to the woods, the road, gravel shoulders, lines ----
  tiled(grassTex,HIGHWAY.wall.v,X1+20,-52,104,.007,22);
  {const t=asphaltTex();t.center.set(.5,.5);t.rotation=Math.PI/2;t.repeat.set((ROAD.end+2-X0)/8.4,1);ground(S({map:t,roughness:.92}),X0,ROAD.end+2,-H,H,.015);}   // the town's road texture (its centre dash and edge lines) turned along the road
  for(const s of [-1,1])tiled(dirtTex,X0,ROAD.end+2,s<0?-H-1.6:H,s<0?-H:H+1.6,.012,3);
  mapPaint.push({color:'#3d4431',rects:[[HIGHWAY.wall.v,HIGHWAY.z0,X1,HIGHWAY.z1],[GAS.x0,GAS.z0,GAS.x1,GAS.z1],[CEMETERY.x0,CEMETERY.z0,CEMETERY.x1,CEMETERY.z1]]},{color:'#3a3d40',rects:[[X0,-H,ROAD.end,H],[side.x-side.half,H,side.x+side.half,side.z1]]});
  // telephone poles along the north side, leaning here and there
  {const wood=S({color:lin('#4b3d2e'),roughness:1}),parts=[];
    for(let x=X0+8;x<ROAD.end;x+=26){const tilt=rng()<.2?R(-.12,.12):0,z=-H-3.2;if(x>GAS.x0-2&&x<GAS.x1+2)continue;
      const m=new THREE.Matrix4().compose(new THREE.Vector3(x,4,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt,0,0)),new THREE.Vector3(.24,8,.24));parts.push([unitBox,m]);
      parts.push([unitBox,M(x,7.4,z,.14,.14,1.8)]);solids.push({x0:x-.2,x1:x+.2,z0:z-.2,z1:z+.2});}
    scene.add(merge(parts,wood));}
  // ---- the gas station ----
  const gs=gasStation(rng,R);
  // ---- the cemetery down its side road ----
  tiled(dirtTex,side.x-side.half,side.x+side.half,H,side.z1+2,.014,2.5);
  cemetery(rng,R,pickR);
  // ---- wrecks along the road: never more than part of the road blocked at one place ----
  const KIND=[['car_1',.95,2.15,1.5],['car_2',.95,2.15,1.5],['car_suv',1,2.3,1.8],['car_taxi',.95,2.15,1.5],['car_sport',.95,2.1,1.3],['car_police',.95,2.15,1.6],
    ['c_van',1.05,2.4,2.1],['c_pickup',1.05,2.5,1.8],['k_truck',1.25,3.2,2.6],['k_truck2',1.25,3.4,2.8]];
  for(let x=X0+16;x<ROAD.end-12;x+=R(5,13)){
    if(x>side.x-6&&x<side.x+6)continue;   // the turn to the cemetery stays clear
    const [id,hw,hd,h]=pickR(KIND),how=rng(),cross=how<.18;
    const z=cross?pickR([-1.6,1.6]):how<.7?pickR([-2.1,2.1]):pickR([-H-1.4,H+1.4,-H-4,H+4]);
    const ry=(cross?Math.PI/2:pickR([0,Math.PI]))+R(-.14,.14);
    {const sw=Math.abs(Math.sin(ry))>.5,ex=(sw?hd:hw)+.2,ez=(sw?hw:hd)+.2;if(solids.some(b=>b.x1>x-ex&&b.x0<x+ex&&b.z1>z-ez&&b.z0<z+ez))continue;}   // nothing small under it (a pole between solidAt's test points)
    if(!solidAt(id,x,z,hw,hd,ry,h,-1))continue;
    const hv=heavy[heavy.length-1];hv.burn=rng()<.45;highway.wrecks++;
    if(rng()<.35&&freeAt(x,z+(z>0?-2:2)*(cross?1.6:1),.5))lootSpots.push({x,z:z+(z>0?-2:2)*(cross?1.6:1),zone:id==='car_police'?'police':'city',drop:null});
    for(let k=0;k<3;k++)decor.push({id:pickR(['c_papers','c_papers','c_roadbits','c_bag']),x:x+R(-4,4),z:z+R(-3,3),ry:R(0,6.28),size:R(.7,1.2),by:'w',shadow:false});
  }
  // the end of the road for now: the army closed it
  for(let z=-H-1;z<=H+1;z+=2.2)decor.push({id:'k_roadblock',x:ROAD.end,z,ry:Math.PI/2,size:1.4,by:'w',shadow:true});
  solids.push({x0:ROAD.end-.4,x1:ROAD.end+.4,z0:HIGHWAY.z0,z1:HIGHWAY.z1});
  solidAt('k_truck',ROAD.end-6,-2.4,1.25,3.2,Math.PI/2,2.6,-1);solidAt('k_truck',ROAD.end-7,5.6,1.25,3.2,Math.PI/2+.1,2.6,-1);
  lootSpots.push({x:ROAD.end-5,z:1.4,zone:'military',drop:null});
  // ---- the woods: inside the walkable strip beside the road (no collision, like the camp's woods) and beyond it ----
  const keepOff=(x,z)=>(z>0&&z<12)||(x>GAS.x0-3&&x<GAS.x1+3&&z<-H-2&&z>GAS.z0-6)||(x>CEMETERY.x0-3&&x<CEMETERY.x1+3&&z>H+2)||Math.abs(z)<H+2.2||x>ROAD.end-4;
  for(let k=0;k<1500;k++){const x=R(HIGHWAY.wall.v+4,X1+16),s=rng()<.5?-1:1,far=rng()<.55,z=s*(far?R(HIGHWAY.z1,50):R(H+3,HIGHWAY.z1));
    if(keepOff(x,z)||!freeAt(x,z,.9)&&!far)continue;
    decor.push({id:pickR(['k_pine','k_pine','k_pine','tree_1','tree_2','tree_4','dead_1','dead_3','n_birch','dead_2']),x,z,ry:R(0,6.28),size:R(5,9),shadow:!far});highway.trees++;}
  for(let k=0;k<300;k++){const x=R(HIGHWAY.wall.v+3,ROAD.end),s=rng()<.5?-1:1,z=s*R(H+2,HIGHWAY.z1+6);if(keepOff(x,z))continue;decor.push({id:pickR(['bush_1','bush_2','k_shrub','grass_1','grass_2','n_berry']),x,z,ry:R(0,6.28),size:R(.6,1.3),shadow:false});}
  // nothing loose lying on a loot spot or inside the shop
  for(let i=decor.length-1;i>=d0;i--){const d=decor[i];if(lootSpots.some(s=>Math.hypot(s.x-d.x,s.z-d.z)<.9)||roomAt(d.x,d.z)>=0)decor.splice(i,1);}
  return gs;
}

function gasStation(rng,R){
  const cx=287,H=ROAD.half;
  tiled(dirtTex,GAS.x0+4,GAS.x1-4,-27,-H-1.6,.016,2,{color:lin('#9c9a92')});   // the concrete forecourt
  // the canopy over three pump islands
  const red=S({color:lin('#8e2f27'),roughness:.6}),white=S({color:lin('#d9d6cc'),roughness:.7}),metal=S({color:lin('#6c6f72'),roughness:.5,metalness:.4});
  const roof=[],posts=[];roof.push([unitBox,M(cx,4.9,-13,24,.45,9)]);
  const roofMat=white.clone(),bandMat=red.clone();
  for(const x of [cx-11,cx+11])for(const z of [-17,-9]){posts.push([unitBox,M(x,2.4,z,.45,4.8,.45)]);solids.push({x0:x-.3,x1:x+.3,z0:z-.3,z1:z+.3});}
  const band=[];for(const s of [-1,1])band.push([unitBox,M(cx,4.85,-13+s*4.55,24.1,.6,.1)]);for(const s of [-1,1])band.push([unitBox,M(cx+s*12.05,4.85,-13,.1,.6,9.1)]);
  const rm=merge(roof,roofMat),bm=merge(band,bandMat);scene.add(rm,bm,merge(posts,metal));
  {const b={mats:[roofMat,bandMat],faded:false,cx,cz:-13,w:24,d:9,h:5,meshes:[rm,bm],farm:true,canopy:true};rm.userData.b=bm.userData.b=b;occluders.push(rm,bm);buildings.push(b);}   // fades like a building when it hides the player
  const pumps=[],screens=[];
  for(const x of [cx-6,cx,cx+6]){pumps.push([unitBox,M(x,.12,-13,1.3,.24,4)]);solids.push({x0:x-.65,x1:x+.65,z0:-15,z1:-11});
    for(const z of [-14.2,-11.8]){pumps.push([unitBox,M(x,.95,z,.7,1.6,.55)]);screens.push([unitBox,M(x,1.35,z+(z<-13?-.28:.28),.5,.3,.02)]);}}
  scene.add(merge(pumps,red));scene.add(merge(screens,S({color:lin('#20262a'),roughness:.3})));
  // the shop behind (enterable: a place, its shelves hold what a roadside shop has, config/search.js BOX.gas)
  const shop=shed(cx,-34,15,9,3.8,'#a8a296','#6d6f70');windows(shop,0,1,3,1.6,rng,.6);const k=addRoom(shop,[0,1],rng,GASPLACE);furnish(rooms[k],k,rng);
  // the price board on its pole by the road
  {const c=document.createElement('canvas');c.width=128;c.height=160;const g=c.getContext('2d');
    if(g&&g.fillRect){g.fillStyle='#7d241d';g.fillRect(0,0,128,160);g.fillStyle='#efe9da';g.font='bold 40px sans-serif';g.textAlign='center';g.fillText('GAS',64,46);g.fillStyle='#1b1d1f';for(let i=0;i<3;i++)g.fillRect(14,64+i*30,100,24);g.fillStyle='#d9a531';g.font='bold 20px monospace';for(let i=0;i<3;i++)g.fillText('-.--',64,83+i*30);}
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
    box(metal,.3,7,.3,GAS.x0+5,3.5,-H-2.4);const p=box(S({map:t,roughness:.6}),.2,3,2.4,GAS.x0+5,6.2,-H-2.4);p.rotation.y=Math.PI/2;solids.push({x0:GAS.x0+4.75,x1:GAS.x0+5.25,z0:-H-2.65,z1:-H-2.15});}
  // what can blow up: fuel cans by the pumps, propane in a cage by the shop
  for(const [x,z,kind] of [[cx-3.2,-15.6,'gas'],[cx+3.1,-10.4,'gas'],[cx+8.6,-29.6,'propane'],[cx+9.3,-29.6,'propane'],[cx+10,-29.6,'propane']])solids.push(tanks[addTank(x,z,kind)].box);
  for(const [x,z] of [[cx-9,-22],[cx+4,-23.5],[cx-2.8,-8.6]])if(freeAt(x,z,.5))lootSpots.push({x,z,zone:'city',drop:null});
  for(let k2=0;k2<14;k2++)decor.push({id:pickOf(rng,['c_papers','c_papers','c_bag','c_box','c_cone']),x:R(GAS.x0+5,GAS.x1-5),z:R(-27,-6),ry:R(0,6.28),size:R(.6,1.1),by:'w',shadow:false});
  solidAt('c_dumpster',cx-11,-30,.9,1.6,0,1.3,-1);
  // the two cars that still start: one at a pump, one parked by the shop
  addRide(cx-3,-13.6,0,'car_2','#8a3a30');addRide(cx+10.5,-22.5,-Math.PI/2,'car_suv','#4f5a3a');
  return {shop:k};
}
const pickOf=(rng,a)=>a[Math.floor(rng()*a.length)];

function cemetery(rng,R,pickR){
  const C=CEMETERY,side=ROAD.side,X0=C.x0+6,X1=C.x1-8,Z0=side.z1,Z1=C.z1-6,gate=[side.x-3,side.x+3];
  tiled(grassTex,X0,X1,Z0,Z1,.011,6,{color:lin('#b7b09a')});   // the yard, grass gone grey
  mapPaint.push({color:'#323a2c',rects:[[X0,Z0,X1,Z1]]});pois.push({type:'cemetery',x:(X0+X1)/2,z:(Z0+Z1)/2});
  // the iron fence, 1.9 m panels (a gap at the gate and where it has fallen down at the back)
  const fallen=[[X0+8,'z'],[Z1,'x',X1-14]];
  const panel=(x,z,along)=>{
    const hw=along?.95:.12,hd=along?.12:.95;if(!solidAt(rng()<.12?'g_fence_d':'g_fence',x,z,hw,hd,along?0:Math.PI/2,1.9,-1)){solids.push({x0:x-hw,x1:x+hw,z0:z-hd,z1:z+hd});}};
  for(let x=X0+1;x<X1;x+=2.05){if(x>gate[0]-1&&x<gate[1]+1)continue;panel(x,Z0,true);if(!(x>X1-18&&x<X1-12))panel(x,Z1,true);}
  for(let z=Z0+1;z<Z1;z+=2.05){panel(X0,z,false);if(!(z>Z0+18&&z<Z0+24))panel(X1,z,false);}
  for(const x of gate)decor.push({id:'g_lamp',x,z:Z0-.6,ry:0,size:3.2,shadow:true});
  decor.push({id:'g_gate',x:side.x,z:Z0,ry:0,size:6.4,by:'w',shadow:true});
  // graves in rows either side of the middle path; some dug up, coffins open (the dead walked out)
  for(let x=X0+4;x<X1-3;x+=4.1){if(Math.abs(x-side.x)<4)continue;
    for(let z=Z0+6;z<Z1-12;z+=4.6){if(rng()<.1)continue;const jx=x+R(-.4,.4),jz=z+R(-.3,.3);
      if(!solidAt(pickR(['g_cross','g_round','g_bevel','g_broken','g_deco','g_wide','g_round']),jx,jz,.55,.22,0,1.15,-1))continue;highway.graves++;
      const open=rng()<.22;decor.push({id:open?'g_coffin':'g_grave',x:jx,z:jz+1.6,ry:R(-.1,.1),size:open?1:1.5,by:'w',y:.02,shadow:false});
      if(rng()<.15)decor.push({id:'g_xwood',x:jx+R(-1,1),z:jz+R(1,2.4),ry:R(-.3,.3),size:1.3,shadow:true});}}
  // crypts at the far end, lanterns on the path, crooked pines and dead trees
  solidAt('g_crypt_l',side.x,Z1-5,3.2,3.2,Math.PI,5.2,-1);solidAt('g_crypt',X0+6,Z1-4.5,2.2,2.2,Math.PI,3.6,-1);solidAt('g_crypt',X1-6,Z1-4.5,2.2,2.2,Math.PI,3.6,-1);
  const glow=new THREE.PlaneGeometry(3.2,3.2).rotateX(-Math.PI/2);
  for(let z=Z0+5;z<Z1-10;z+=7)for(const s of [-1,1]){decor.push({id:'g_lantern',x:side.x+s*1.9,z,ry:0,size:.55,shadow:false});const g=new THREE.Mesh(glow,glowMat);g.position.set(side.x+s*1.9,.05,z);scene.add(g);}   // candlelight on the ground after dark
  for(const x of gate){const g=new THREE.Mesh(glow,glowMat);g.scale.setScalar(1.6);g.position.set(x,.05,Z0-.6);scene.add(g);}
  for(let k=0;k<26;k++){const x=R(X0+1,X1-1),z=R(Z0+1,Z1-1);if(Math.abs(x-side.x)<3||!freeAt(x,z,1.2))continue;decor.push({id:pickR(['g_pine','g_pine','dead_1','dead_4']),x,z,ry:R(0,6.28),size:R(4,7),shadow:true});}
  for(const [x,z,zone] of [[side.x,Z1-10,'police'],[X0+6,Z1-8.5,'city'],[X1-6,Z1-8.5,'city'],[side.x+2,Z0+12,'city']])if(freeAt(x,z,.5))lootSpots.push({x,z,zone,drop:null});
}
