import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {WALL_X,GATE,FARM} from '../config/world.js';
import {BARN} from '../config/places.js';
import {S,box,grassMat,greyMat,unitBox} from './materials.js';
import {mk,grain,stains,T,CORR} from './textures.js';
import {solids,solid,freeAt} from './collision.js';
import {buildings,occluders,lootSpots,pois,cityWall} from './city.js';
import {addRoom,rooms,roomAt} from './interiors.js';
import {decor} from './decor.js';
import {solidAt,furnish} from './clutter.js';

// ---------- the farm (v0.22) ----------
// An abandoned farm west of town, through a gate in the city wall where the middle road (z = 0) leaves as a dirt track:
// a farmhouse, a cottage and a big barn you can enter and shut (the barn is a place with its own goods, config/places.js
// BARN, and could be a base to hold in a later mode), a shed, a silo, hay, trucks left behind, a field of dead corn that
// hides whatever walks in it, and wooden fences. Built last, with its own rng, so the city, its rooms, loot spots and
// saves stay as they were; everything it adds (buildings, rooms, furniture, loot spots, solids) is appended.
// Kenney models (Retro Urban Kit, Building Kit: trucks, pallets, planks, concrete barriers, trees, window barricades)
// are drawn by world/prop-models.js; `attach` holds the ones that belong to a building's shell (hidden with it).
export const attach=[];   // {id, x, y, z, ry, size, group}
export const farm={field:null,corn:null,pond:null};
const tex={};
function planksTex(paint){const [c,g]=mk(128,128);g.fillStyle=paint;g.fillRect(0,0,128,128);
  for(let x=0;x<128;x+=16){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,0,2,128);g.fillStyle=`rgba(255,240,210,${.05+Math.random()*.08})`;g.fillRect(x+3,0,10,128);}
  grain(g,128,128,1800,.2,2);stains(g,128,128,9,'40,30,20',30,.45);stains(g,128,128,6,'150,140,120',18,.3);   // flaking paint and grime
  return T(c);}
function soilTex(){const [c,g]=mk(128,128);g.fillStyle='#4b3b2b';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=16){g.fillStyle='rgba(20,14,8,.45)';g.fillRect(0,y,128,5);g.fillStyle='rgba(120,98,70,.25)';g.fillRect(0,y+8,128,3);}grain(g,128,128,2500,.2,2);return T(c,6,6);}
function trackTex(){const [c,g]=mk(128,128);g.fillStyle='#5a4c3a';g.fillRect(0,0,128,128);grain(g,128,128,3000,.22,2);stains(g,128,128,10,'40,32,22',24,.5);for(const y of [30,98]){g.fillStyle='rgba(30,24,16,.35)';g.fillRect(0,y-8,128,16);}return T(c);}
function cornTex(){const [c,g]=mk(64,128);g.clearRect(0,0,64,128);
  g.strokeStyle='#8a7a4c';g.lineWidth=4;g.beginPath();g.moveTo(32,128);g.lineTo(31,8);g.stroke();
  for(let i=0;i<7;i++){const y=110-i*14,s=i%2?1:-1;g.strokeStyle=['#9c8a52','#7c6d40','#a8955c'][i%3];g.lineWidth=3;g.beginPath();g.moveTo(32,y);g.quadraticCurveTo(32+s*18,y-14,32+s*30,y+6);g.stroke();}
  g.fillStyle='#b59a58';g.fillRect(28,50,7,16);return T(c);}
function hayTex(){const [c,g]=mk(64,64);g.fillStyle='#a88f52';g.fillRect(0,0,64,64);for(let i=0;i<500;i++){g.fillStyle=`rgba(${190+Math.random()*50|0},${160+Math.random()*40|0},${90+Math.random()*30|0},.6)`;g.fillRect(Math.random()*64,Math.random()*64,1,3+Math.random()*5);}stains(g,64,64,5,'70,60,30',14,.5);return T(c);}

// many boxes (or any geometry) put together into one mesh: [geometry, matrix] pairs
function merge(parts,mat){
  let nv=0,ni=0;for(const [geo] of parts){nv+=geo.attributes.position.count;ni+=geo.index.count;}
  const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=new Uint32Array(ni),v=new THREE.Vector3(),nm=new THREE.Matrix3();let ov=0,oi=0;
  for(const [geo,m] of parts){const p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;nm.getNormalMatrix(m);
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);pos.set([v.x,v.y,v.z],(ov+i)*3);v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();nor.set([v.x,v.y,v.z],(ov+i)*3);uv.set([u.getX(i),u.getY(i)],(ov+i)*2);}
    for(let i=0;i<geo.index.count;i++)idx[oi++]=geo.index.getX(i)+ov;ov+=p.count;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(new THREE.BufferAttribute(idx,1));g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,mat);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
const M=(x,y,z,sx,sy,sz,ry=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(sx,sy,sz));
// a flat plane on the ground
function ground(mat,x0,x1,z0,z1,y){const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),mat);m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,y,(z0+z1)/2);m.receiveShadow=true;scene.add(m);return m;}

// a wooden building with a pitched roof (ridge along its longer side); like the city's buildings it is one solid box,
// fades when it hides the player (b.mats) and is cut away when it becomes a room (b.meshes)
function shed(cx,cz,w,d,h,paint,roofCol){
  const wall=S({map:tex[paint]||(tex[paint]=planksTex(paint)),roughness:.95}),roof=S({map:CORR,color:roofCol,roughness:.8,metalness:.25});
  const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++){const f=Math.floor(i/4);uv.setXY(i,uv.getX(i)*(f<2?d:w)/2.2,uv.getY(i)*h/2.2);}
  const body=new THREE.Mesh(geo,wall);body.position.set(cx,.02+h/2,cz);body.castShadow=body.receiveShadow=true;
  // gable roof: a prism along the long side, eaves out 0.4 m
  const along=w>=d,L=(along?w:d)+.8,S2=(along?d:w)/2+.4,rh=S2*.75,top=.02+h;
  const shape=new THREE.Shape();shape.moveTo(-S2,0);shape.lineTo(0,rh);shape.lineTo(S2,0);shape.lineTo(-S2,0);
  const rg=new THREE.ExtrudeGeometry(shape,{depth:L,bevelEnabled:false});rg.translate(0,0,-L/2);if(along)rg.rotateY(Math.PI/2);
  const r=new THREE.Mesh(rg,roof);r.position.set(cx,top,cz);r.castShadow=r.receiveShadow=true;
  // the gable ends filled with boards
  scene.add(body,r);
  const b={mats:[wall,roof],faded:false,cx,cz,w,d,h,base:paint,meshes:[body,r],farm:true};body.userData.b=r.userData.b=b;occluders.push(body,r);
  buildings.push(b);b.box=solid(cx,cz,w/2,d/2);return b;
}
// dark window panes on a wall face (side [nx,nz]) with a Kenney barricade over some of them
function windows(b,nx,nz,n,y,rng,boarded){
  const len=nx?b.d:b.w,g=new THREE.Group();scene.add(g);b.meshes.push(g);
  for(let i=0;i<n;i++){const t=(i+.5)/n*len-len/2,x=b.cx+nx*(b.w/2+.03)+(nz?t:0),z=b.cz+nz*(b.d/2+.03)+(nx?t:0);
    const pane=new THREE.Mesh(unitBox,S({color:'#14171a',roughness:.3,metalness:.2}));pane.scale.set(nx?.04:1.1,1.2,nx?1.1:.04);pane.position.set(x,y,z);g.add(pane);
    if(rng()<boarded)attach.push({id:['b_win_a','b_win_b','b_win_c'][Math.floor(rng()*3)],x:x+nx*.08,y,z:z+nz*.08,ry:Math.atan2(-nz,nx),size:1.4,group:g});}   // the model is a board across z, facing x
}
export function buildFarm(){
  const rng=mulberry32(2222),R=(a,b)=>a+rng()*(b-a);
  // the gate: the west wall is cut either side of the road, solid where it stands
  const w=cityWall.west;if(w){w.scale.z=68.75-GATE;w.position.z=-(68.75+GATE)/2;box(greyMat,.5,.9,68.75-GATE,WALL_X,.45,(68.75+GATE)/2);}
  solids.push({x0:WALL_X-.35,x1:WALL_X+.35,z0:FARM.z0-1,z1:-GATE},{x0:WALL_X-.35,x1:WALL_X+.35,z0:GATE,z1:FARM.z1+1});
  for(const s of [-1,1]){box(greyMat,.7,2.2,.7,WALL_X,1.1,s*(GATE+.35));}   // gate posts
  // ground: overgrown grass, the dirt track and a lane to the barn, the field
  ground(grassMat,FARM.x0-6,WALL_X-.3,FARM.z0-6,FARM.z1+6,.008);
  const road=trackTex();road.repeat.set((WALL_X+2+126)/5.2,1);ground(S({map:road,roughness:1}),-126,WALL_X+2,-2.6,2.6,.014);
  const lane=S({color:new THREE.Color('#5a4c3a').convertSRGBToLinear(),roughness:1});   // flat colours are linear in r128: convert, or they come out paleground(lane,-110,-106,-10.5,-2.6,.013);ground(lane,-85,-81,-10.5,-2.6,.013);ground(lane,-86,-82,2.6,12,.013);
  farm.field=ground(S({map:soilTex(),roughness:1}),-127,-104,8,27,.012);
  // dead corn in rows: two crossed quads per stalk, all one mesh; it hides what walks in it (no collision)
  {const q=new THREE.PlaneGeometry(.9,1);q.translate(0,.5,0);const parts=[];
    let n=0;for(let z=9;z<26.5;z+=1.25)for(let x=-126.3;x<-104.6;x+=.55){if(rng()<.12)continue;const h=R(1.3,2.1),a=R(0,3.14),xx=x+R(-.15,.15),zz=z+R(-.2,.2);parts.push([q,M(xx,.01,zz,1,h,1,a)],[q,M(xx,.01,zz,1,h,1,a+Math.PI/2)]);
      if(n++%2===0)decor.push({id:rng()<.5?'n_corn1':'n_corn2',x:xx,z:zz,ry:a,size:h*1.05,shadow:false,crop:true});}   // v0.23 the 3D corn (every other stalk) takes over once the models load
    const mat=S({map:cornTex(),alphaTest:.5,side:THREE.DoubleSide,roughness:1});farm.corn=merge(parts,mat);farm.corn.castShadow=true;scene.add(farm.corn);}
  // v0.23 a strip of wheat behind the farmhouse, a pond with lily pads, a greenhouse, washing hung out to dry
  ground(S({map:soilTex(),roughness:1}),-102.5,-92,-28.2,-21.2,.012);
  for(let z=-27.6;z<-21.6;z+=.75)for(let x=-102;x<-92.4;x+=.75)if(rng()<.85)decor.push({id:'n_wheat',x:x+R(-.2,.2),z:z+R(-.2,.2),ry:R(0,6.28),size:R(.8,1.1),shadow:false,crop:true});
  {const w=new THREE.Mesh(new THREE.CircleGeometry(3.3,28),S({color:new THREE.Color('#2b3530').convertSRGBToLinear(),roughness:.12,metalness:.5}));w.rotation.x=-Math.PI/2;w.scale.set(1.25,1,1);w.position.set(-95.5,.03,24);w.receiveShadow=true;scene.add(w);farm.pond=w;
    const bank=new THREE.Mesh(new THREE.RingGeometry(3.2,3.9,28),S({color:new THREE.Color('#3f3626').convertSRGBToLinear(),roughness:1}));bank.rotation.x=-Math.PI/2;bank.scale.set(1.25,1,1);bank.position.set(-95.5,.025,24);scene.add(bank);
    solids.push({x0:-95.5-3.6,x1:-95.5+3.6,z0:24-2.6,z1:24+2.6});   // water: walk round it
    for(let k=0;k<7;k++){const a=R(0,6.28),d=R(.5,2.4);decor.push({id:'n_lily',x:-95.5+Math.cos(a)*d*1.25,z:24+Math.sin(a)*d,ry:R(0,6.28),size:R(.7,1.1),by:'w',y:.035,shadow:false});}}
  solidAt('c_greenhouse',-74.5,21.5,2.2,3,0,3,-1);
  // buildings: farmhouse and cottage (homes), the barn (a place), a shed and a silo
  const house=shed(-83,-15,11,9,6.4,'#8d8170','#7d6a5a'),barn=shed(-108,-16.5,14,12,7.5,'#7a3a2c','#8c949a'),cottage=shed(-84,16,9,8,3.6,'#9a9484','#6d5a4a'),hut=shed(-97,15,5,4,3,'#6b5e4c','#7f878b');
  windows(house,0,1,3,1.6,rng,.6);windows(house,0,1,3,4.8,rng,.6);windows(house,1,0,2,1.6,rng,.5);windows(house,-1,0,2,4.8,rng,.5);windows(cottage,0,-1,2,1.6,rng,.7);windows(cottage,1,0,2,1.6,rng,.5);
  const kH=addRoom(house,[0,1],rng),kB=addRoom(barn,[0,1],rng,BARN),kC=addRoom(cottage,[0,-1],rng);
  for(const k of [kH,kB,kC])furnish(rooms[k],k,rng);
  {const sm=S({map:CORR,color:'#9aa0a2',roughness:.6,metalness:.4}),s=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,10,18),sm);s.position.set(-122,5.02,-17);const top=new THREE.Mesh(new THREE.ConeGeometry(2.6,1.6,18),sm);top.position.set(-122,10.8,-17);s.castShadow=top.castShadow=true;s.receiveShadow=true;scene.add(s,top);solid(-122,-17,2.2,2.2);}
  // hay bales (solid), the Kenney trucks and junk (world/clutter.js solidAt: a plain box until the models load)
  {const hm=S({map:hayTex(),roughness:1}),cyl=new THREE.CylinderGeometry(.62,.62,1.2,14);cyl.rotateZ(Math.PI/2);const parts=[];
    for(const [x,z,a] of [[-117,-7.5,0],[-118.4,-7.4,.2],[-117.7,-6.2,1.4],[-99,-12.5,1.57],[-100.2,-12.6,1.5],[-92,6.5,.3],[-112,6,0],[-113.3,6.1,0]]){parts.push([cyl,M(x,.64,z,1,1,1,a)]);solid(x,z,.62,.62);}
    scene.add(merge(parts,hm));}
  solidAt('k_truck',-93,-6.2,1.15,2.6,Math.PI/2,2.6,-1);solidAt('k_flat',-124,-6,1.15,2.6,0,2.6,-1);solidAt('k_truck2',-74,9.5,1.1,1.6,Math.PI,2.2,-1);
  // fences: posts and two rails around the field and along the farm's edge; trees and junk (no collision)
  {const parts=[],rail=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),a=Math.atan2(x1-x0,z1-z0),n=Math.ceil(L/2.4);
      for(let i=0;i<=n;i++){const t=i/n;if(rng()<.08)continue;parts.push([unitBox,M(x0+(x1-x0)*t,.6,z0+(z1-z0)*t,.12,1.2,.12,a)]);}
      for(const y of [.45,.95])if(rng()<.85)parts.push([unitBox,M((x0+x1)/2,y,(z0+z1)/2,.06,.1,L,a)]);};
    rail(-127.5,7.5,-103.5,7.5);rail(-103.5,7.5,-103.5,27.5);rail(-103.5,27.5,-127.5,27.5);
    for(let z=FARM.z0+.5;z<FARM.z1;z+=8)rail(FARM.x0+.6,z,FARM.x0+.6,Math.min(FARM.z1-.5,z+8));
    for(let x=FARM.x0+.5;x<WALL_X-1;x+=8){rail(x,FARM.z0+.6,Math.min(WALL_X-1,x+8),FARM.z0+.6);rail(x,FARM.z1-.6,Math.min(WALL_X-1,x+8),FARM.z1-.6);}
    scene.add(merge(parts,S({color:new THREE.Color('#5e4a36').convertSRGBToLinear(),roughness:.95})));}
  const put=(id,x,z,size,o={})=>decor.push({id,x,z,ry:o.ry??R(0,6.28),size,shadow:o.shadow??true,y:o.y,by:o.by});
  for(let k=0;k<26;k++){const e=rng(),x=e<.4?FARM.x0+R(-4,1):R(FARM.x0,WALL_X-3),z=e<.4?R(FARM.z0,FARM.z1):(rng()<.5?FARM.z0+R(-4,1.5):FARM.z1+R(-1.5,4));if(Math.abs(z)<4&&x>-128)continue;put(rng()<.35?'k_pine':rng()<.6?'k_tree':'dead_'+(1+Math.floor(rng()*5)),x,z,R(5,7.5));}
  for(let k=0;k<14;k++){const x=R(FARM.x0+2,WALL_X-2),z=R(FARM.z0+2,FARM.z1-2);if(freeAt(x,z,1)&&roomAt(x,z,1)<0&&!(x>-128&&x<-103&&z>7&&z<28))put(rng()<.5?'k_shrub':'grass_2',x,z,R(.5,1.1));}
  for(const [id,x,z,s] of [['c_washline',-91,-23.5,2.4],['n_birch',-100.2,21.8,6.5],['n_birch',-90.6,26.5,6],['tree_2',-91.5,20,5.5],['n_berry',-99.8,26.8,.9],['n_berry',-88.6,22.5,.8],['n_mossrock',-92.6,27.2,.6],['k_pallet',-104,-9.5,1.2],['k_pallet',-104.3,-8.2,1.2],['k_planks',-112,-9.3,1.3],['k_planks',-96,-8.5,1.2],['k_bricks',-90,10,.7],['k_pallet',-99.8,12,1.1],['k_barrier',-71,-3.4,1.3],['k_barrier',-71.5,3.6,1.3],['k_roadblock',-72.5,1.2,1.2],['k_lean',-116.5,-17,2.2]])put(id,x,z,s,{by:/^k_/.test(id)?'w':undefined,ry:R(-.4,.4)});
  // loot out in the open (zone 'farm', config/places.js), appended after every other spot
  for(const [x,z] of [[-95,-9],[-99.5,10.5],[-118,-9.5],[-90.5,7.5],[-104.5,4.5],[-76,6],[-125,-3]])if(freeAt(x,z,.5))lootSpots.push({x,z,zone:'farm',drop:null});
}
