import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC,GATE,AREAS,beyond,RIVER,riverSide} from '../config/world.js';
import {WALL_T,DOOR_W,STUB_H,DOOR_HP,PLANK_HP} from '../config/shelter.js';
import {S,part} from './materials.js';
import {concreteTex} from './textures.js';
import {solids,freeAt,rayWall} from './collision.js';
import {buildings,lootSpots,LAYOUT,pois} from './city.js';
import {PLACES} from '../config/places.js';
import {MORE_FURN,MORE_GAP} from '../config/search.js';
import {breakables} from './props.js';

// ---------- enterable buildings (v0.6) ----------
// One building per city block gets a door. Its solid footprint becomes four walls with a doorway, and while the
// player is inside, the outer shell (walls, roof, parapets) is hidden and a cutaway takes its place: a floor,
// knee-high walls and furniture. Built after buildCity() with its own rng, so the seeded city stays the same
// and the new loot spots go after every existing one.
export const rooms=[];
const floorMats=['#6e5c48','#5f5b52','#6d5a46','#565b5c'].map(c=>S({map:concreteTex(),color:c,roughness:.95}));   // v0.17: worn, stained floors
const furnMats=['#6b5a46','#4c5560','#7d4b3c','#8b8577','#3f4a3a'].map(c=>S({color:c,roughness:.8}));
export const doorMat=S({color:'#5a3d26',roughness:.7,emissive:'#ffffff',emissiveIntensity:0}),holeMat=S({color:'#141210',roughness:1}),brokenMat=S({color:'#3a2a1c',roughness:.9});
const plankMat=S({color:'#a9834f',roughness:.85});
export const frameMat=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false});   // v0.40
const signMat=S({color:'#3a2f22',emissive:'#ffb35a',emissiveIntensity:.9});
const FURN=[{d:.5,h:1.9,kind:'shelf'},{d:.8,h:.85,kind:'kitchen'},{d:.9,h:.75,kind:'sofa'},{d:.6,h:1.1,kind:'drawer'}];   // shelf, counter, sofa, cabinet
// every piece of furniture can be searched once (v0.15, systems/search.js); its index here names it in G.searched and online
export const boxes=[];

// outward normals: +x, -x, +z, -z
const SIDES=[[1,0],[-1,0],[0,1],[0,-1]];
function blockOf(x){for(let i=0;i<4;i++)if(x>RC[i]&&x<RC[i+1])return i;return -1;}
// a mesh placed in world space but not added to the scene (goes into a group)
export function slab(mat,x0,x1,z0,z1,y0,y1){return part(mat,x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2);}
const pushBox=(x0,x1,z0,z1)=>{const b={x0,x1,z0,z1};solids.push(b);return b;};

// best door side of a building, or null when every side is blocked
function doorSide(b,bcx,bcz){
  let best=null,bs=-1e9;
  for(const [nx,nz] of SIDES){
    const half=nx?b.d/2:b.w/2,fx=b.cx+nx*b.w/2,fz=b.cz+nz*b.d/2;
    if(half*2<DOOR_W+2)continue;
    const ox=fx+nx*1.4,oz=fz+nz*1.4,tx=-nz,tz=nx;
    if(Math.abs(ox-bcx)>11.6||Math.abs(oz-bcz)>11.6)continue;   // the doorway must open onto this block's sidewalk
    if(!freeAt(ox,oz,.6)||!freeAt(ox+tx*.8,oz+tz*.8,.4)||!freeAt(ox-tx*.8,oz-tz*.8,.4))continue;
    const s=(fx-b.cx)*nx+(fz-b.cz)*nz+((fx-bcx)*nx+(fz-bcz)*nz)+(nx>0||nz>0?3:0);   // face the street, and the camera when possible
    if(s>bs){bs=s;best=[nx,nz];}
  }
  return best;
}
function makeRoom(b,[nx,nz],rng){
  const T=WALL_T,X0=b.cx-b.w/2,X1=b.cx+b.w/2,Z0=b.cz-b.d/2,Z1=b.cz+b.d/2,y0=.18;
  const tx=-nz,tz=nx,dx=b.cx+nx*b.w/2,dz=b.cz+nz*b.d/2,half=nx?b.d/2:b.w/2;
  const r={b,x0:X0+T,x1:X1-T,z0:Z0+T,z1:Z1-T,n:[nx,nz],t:[tx,tz],dx,dz,half,depth:nx?b.w:b.d,ext:new THREE.Group(),cut:new THREE.Group(),furniture:[],walls:[],y0};
  // walls: the door side is split around the doorway; the door itself is its own box, in `solids` only while closed
  const i=solids.indexOf(b.box);if(i>=0)solids.splice(i,1);
  const stubMat=S({color:new THREE.Color(b.base).multiplyScalar(.9),roughness:.9});
  const wallBoxes=[[[0,1],X0,X1,Z1-T,Z1],[[0,-1],X0,X1,Z0,Z0+T],[[1,0],X1-T,X1,Z0+T,Z1-T],[[-1,0],X0,X0+T,Z0+T,Z1-T]];
  for(const [[sx,sz],x0,x1,z0,z1] of wallBoxes){
    const segs=sx!==nx||sz!==nz?[[x0,x1,z0,z1]]:nx?[[x0,x1,z0,dz-DOOR_W/2],[x0,x1,dz+DOOR_W/2,z1]]:[[x0,dx-DOOR_W/2,z0,z1],[dx+DOOR_W/2,x1,z0,z1]];
    for(const q of segs){pushBox(...q);r.walls.push(q);r.cut.add(slab(stubMat,...q,y0,y0+STUB_H));}
  }
  r.wallMat=stubMat;   // v0.28 the first-person view raises these walls to full height (ui/fps.js)
  r.doorBox=nx?{x0:Math.min(dx,dx-nx*T),x1:Math.max(dx,dx-nx*T),z0:dz-DOOR_W/2,z1:dz+DOOR_W/2}:{x0:dx-DOOR_W/2,x1:dx+DOOR_W/2,z0:Math.min(dz,dz-nz*T),z1:Math.max(dz,dz-nz*T)};
  const D=r.doorBox;
  // cutaway: floor, door (closed / broken) and furniture against the three other walls
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(r.x1-r.x0,r.z1-r.z0),floorMats[Math.floor(rng()*floorMats.length)]);fl.rotation.x=-Math.PI/2;fl.position.set((r.x0+r.x1)/2,y0+.012,(r.z0+r.z1)/2);fl.receiveShadow=true;r.cut.add(fl);
  r.cutDoor=slab(doorMat,D.x0+(nx?T*.3:0),D.x1-(nx?T*.3:0),D.z0+(nz?T*.3:0),D.z1-(nz?T*.3:0),y0,y0+STUB_H*.95);r.cut.add(r.cutDoor);
  r.cutBroken=slab(brokenMat,D.x0,D.x1,D.z0,D.z1,y0,y0+.08);r.cut.add(r.cutBroken);
  // planks nailed across the inside of the door (v0.7), shown by setDoorLook from the door's extra HP
  const px=dx-nx*(T+.05),pz=dz-nz*(T+.05),pw=DOOR_W/2+.2;
  r.cutPlanks=[.35,.72].map(h=>slab(plankMat,nx?px-.04:dx-pw,nx?px+.04:dx+pw,nx?dz-pw:pz-.04,nx?dz+pw:pz+.04,y0+h,y0+h+.14));r.cut.add(...r.cutPlanks);
  for(const [sx,sz] of SIDES){
    if(sx===nx&&sz===nz||rng()<.2)continue;
    const f=FURN[Math.floor(rng()*FURN.length)],wl=sx?r.z1-r.z0:r.x1-r.x0,L=Math.min(wl-2.8,1.6+rng()*1.8);if(L<1.2)continue;   // same rng calls as before v0.15
    const off=(rng()*2-1)*Math.max(0,wl/2-1.4-L/2),fx=sx?(sx>0?r.x1-f.d/2:r.x0+f.d/2):(r.x0+r.x1)/2+off,fz=sz?(sz>0?r.z1-f.d/2:r.z0+f.d/2):(r.z0+r.z1)/2+off;
    const hw=sx?f.d/2:L/2,hd=sx?L/2:f.d/2;
    const box=pushBox(fx-hw,fx+hw,fz-hd,fz+hd);box.low=f.h<=1.2;const mesh=slab(furnMats[Math.floor(rng()*furnMats.length)],fx-hw,fx+hw,fz-hd,fz+hd,y0,y0+f.h);
    r.furniture.push(box);r.cut.add(mesh);
    boxes.push({room:rooms.length,kind:f.kind,box,mesh,x:fx,z:fz,n:[sx,sz],L,d:f.d,h:f.h,y0,cut:r.cut,model:null});
  }
  // outside: a door or a dark doorway on the wall face, and a lit sign above it so enterable buildings stand out
  const fw=(a,thick)=>nx?[dx+nx*a-thick,dx+nx*a+thick,dz-DOOR_W/2,dz+DOOR_W/2]:[dx-DOOR_W/2,dx+DOOR_W/2,dz+nz*a-thick,dz+nz*a+thick];
  r.extDoor=slab(doorMat,...fw(.04,.04),y0,y0+2.3);r.extHole=slab(holeMat,...fw(.02,.02),y0,y0+2.3);
  const sg=nx?[dx+nx*.08-.06,dx+nx*.08+.06,dz-.7,dz+.7]:[dx-.7,dx+.7,dz+nz*.08-.06,dz+nz*.08+.06];
  r.sign=slab(signMat,...sg,y0+2.55,y0+2.9);r.ext.add(r.extDoor,r.extHole,r.sign);r.sg=[nx,nz,dx,dz,y0];
  // v0.40 a white frame round the doorway that lights up after dark (world/glow.js), open or shut
  const fr=(a0,a1,h0,h1)=>slab(frameMat,...(nx?[dx+nx*.06-.05,dx+nx*.06+.05,dz+a0,dz+a1]:[dx+a0,dx+a1,dz+nz*.06-.05,dz+nz*.06+.05]),y0+h0,y0+h1);
  r.frame=[fr(-DOOR_W/2-.12,-DOOR_W/2,0,2.42),fr(DOOR_W/2,DOOR_W/2+.12,0,2.42),fr(-DOOR_W/2-.12,DOOR_W/2+.12,2.3,2.42)];for(const m of r.frame)m.castShadow=m.receiveShadow=false;r.ext.add(...r.frame);
  for(const m of r.cut.children)m.castShadow=m.receiveShadow=true;
  r.cut.visible=false;scene.add(r.cut,r.ext);b.meshes.push(r.ext);
  // two loot spots inside, appended after every existing spot so saved spot indices stay valid
  const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2,depth=nx?r.x1-r.x0:r.z1-r.z0;
  for(const [px,pz] of [[cx+tx*.8,cz+tz*.8],[cx-nx*(depth/2-1.7),cz-nz*(depth/2-1.7)]])if(freeAt(px,pz,.5))lootSpots.push({x:px,z:pz,zone:'indoor',drop:null});
  return r;
}
// v0.22 an enterable building outside the city blocks (world/farm.js): door on side [nx,nz]; appended, so saved indices stay
export function addRoom(b,side,rng,place){
  const r=makeRoom(b,side,rng),k=rooms.length;rooms.push(r);
  if(place){r.place=place;for(const x of boxes)if(x.room===k)x.kind=place.box;for(const s of lootSpots)if(s.zone==='indoor'&&roomAt(s.x,s.z)===k)s.zone=place.type;placeSign(r);pois.push({type:'place',place,x:b.cx,z:b.cz});}
  return k;
}
export function buildInteriors(){
  const rng=mulberry32(606);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    if(LAYOUT[i+','+j])continue;
    const bcx=(RC[i]+RC[i+1])/2,bcz=(RC[j]+RC[j+1])/2;
    let pick=null,side=null,area=0;
    for(const b of buildings){if(blockOf(b.cx)!==i||blockOf(b.cz)!==j||b.w<6.8||b.d<6.8)continue;const s=doorSide(b,bcx,bcz);if(s&&b.w*b.d>area){area=b.w*b.d;pick=b;side=s;}}
    if(pick)rooms.push(makeRoom(pick,side,rng));
  }
  // v0.17: the biggest rooms become the shops and the hospital (config/places.js); their furniture and floor loot spots
  // take the place's goods. Nothing is added or reordered, so saves keep their indices
  const big=rooms.map((r,k)=>[r.b.w*r.b.d,k]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]);
  PLACES.forEach((P,n)=>{
    if(!big[n])return;const k=big[n][1],r=rooms[k];r.place=P;
    for(const b of boxes)if(b.room===k)b.kind=P.box;
    for(const s of lootSpots)if(s.zone==='indoor'&&roomAt(s.x,s.z)===k)s.zone=P.type;
    placeSign(r);pois.push({type:'place',place:P,x:r.b.cx,z:r.b.cz});
    shopShelves(r,k);
  });
}

// v0.40 more to search: cupboards along every wall of every room wherever they fit (clear of the doorway, the floor loot
// spots, the clutter and each other; nothing stands in the middle, so the way from the door stays open), and every car in
// the street. Run once after every builder (main.js) with its own rng, so the furniture before it keeps its index in
// `boxes` (and in saves). PLACEHOLDER sizes and gaps in config/search.js
export function moreBoxes(){
  const rng=mulberry32(4040),y0=.18,M=.03;
  const clear=(x0,x1,z0,z1)=>!solids.some(b=>x0<b.x1-M&&x1>b.x0+M&&z0<b.z1-M&&z1>b.z0+M)&&!lootSpots.some(p=>p.x>x0-.6&&p.x<x1+.6&&p.z>z0-.6&&p.z<z1+.6);
  rooms.forEach((r,k)=>{
    for(const [sx,sz] of SIDES){
      const lo=sx?r.z0:r.x0,hi=sx?r.z1:r.x1,door=sx===r.n[0]&&sz===r.n[1],dc=sx?r.dz:r.dx;
      for(let at=lo+.15;at<hi-1;){
        const [kind,d,h]=MORE_FURN[Math.floor(rng()*MORE_FURN.length)],L=1+rng()*.8,a0=at,a1=at+L;
        if(a1>hi-.15)break;
        if(door&&a1>dc-DOOR_W/2-1.3&&a0<dc+DOOR_W/2+1.3){at=dc+DOOR_W/2+1.3;continue;}   // the doorway and the step in
        const w=sx?(sx>0?[r.x1-d,r.x1]:[r.x0,r.x0+d]):null,v=sz?(sz>0?[r.z1-d,r.z1]:[r.z0,r.z0+d]):null;
        const q=sx?{x0:w[0],x1:w[1],z0:a0,z1:a1}:{x0:a0,x1:a1,z0:v[0],z1:v[1]};
        if(!clear(q.x0,q.x1,q.z0,q.z1)){at+=.3;continue;}
        const box=pushBox(q.x0,q.x1,q.z0,q.z1);box.low=h<=1.2;
        const mesh=slab(furnMats[Math.floor(rng()*furnMats.length)],q.x0,q.x1,q.z0,q.z1,r.y0,r.y0+h);mesh.castShadow=mesh.receiveShadow=true;
        r.furniture.push(box);r.cut.add(mesh);
        boxes.push({room:k,kind:r.place?r.place.box:kind,box,mesh,x:(q.x0+q.x1)/2,z:(q.z0+q.z1)/2,n:[sx,sz],L,d,h,y0:r.y0,cut:r.cut,model:null});
        at=a1+MORE_GAP;
      }
    }
  });
  for(const c of breakables)if(c.car)boxes.push({room:-1,kind:c.car.police?'cop':c.car.burned?'wreck':'car',box:c.box,mesh:null,x:c.x,z:c.z,car:c,cut:null,model:null});
}
// shops are mostly shelves: two more along the door wall, one each side of the doorway, clear of it (v0.17). Appended to
// `boxes` after every room's own furniture, so G.searched indices from v0.15 saves stay the same
function shopShelves(r,k){
  const [nx,nz]=r.n,[tx,tz]=r.t,depth=.55,h=1.6,L=Math.min(2.6,r.half-DOOR_W/2-1.7);if(L<1.1)return;
  for(const s of [-1,1]){
    const a=s*(DOOR_W/2+1.2+L/2),cx=r.dx-nx*(WALL_T+depth/2)+tx*a,cz=r.dz-nz*(WALL_T+depth/2)+tz*a;
    const hw=nx?depth/2:L/2,hd=nx?L/2:depth/2;
    if(!freeAt(cx,cz,.2)||lootSpots.some(p=>Math.abs(p.x-cx)<hw+.6&&Math.abs(p.z-cz)<hd+.6))continue;
    const box=pushBox(cx-hw,cx+hw,cz-hd,cz+hd),y0=.18,mesh=slab(furnMats[1],cx-hw,cx+hw,cz-hd,cz+hd,y0,y0+h);
    r.furniture.push(box);r.cut.add(mesh);mesh.castShadow=mesh.receiveShadow=true;
    boxes.push({room:k,kind:r.place.box,box,mesh,x:cx,z:cz,n:[nx,nz],L,d:depth,h,y0,cut:r.cut,model:null});
  }
}
// an old painted board over the door with the place's name, lit a little at night (v0.17)
function placeSign(r){
  const P=r.place,c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');
  g.fillStyle='#2b241c';g.fillRect(0,0,512,96);g.strokeStyle='rgba(220,205,170,.5)';g.lineWidth=6;g.strokeRect(6,6,500,84);
  g.fillStyle=P.color;g.font='bold 58px Georgia, "Times New Roman", serif';g.textAlign='center';g.textBaseline='middle';g.fillText(P.sign,256,52,470);
  for(let i=0;i<500;i++){g.fillStyle=`rgba(${Math.random()<.5?0:200},${Math.random()<.5?0:190},${Math.random()<.5?0:160},${Math.random()*.18})`;g.fillRect(Math.random()*512,Math.random()*96,2+Math.random()*4,1+Math.random()*3);}   // weathered
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
  const [nx,nz,dx,dz,y0]=r.sg,m=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.64),S({map:t,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:.45,roughness:.9}));
  m.position.set(dx+nx*.1,y0+2.75,dz+nz*.1);m.rotation.y=Math.atan2(nx,nz);m.castShadow=false;
  r.sign.visible=false;r.ext.add(m);r.placeSign=m;
}
// the furniture in room k nearest to (x,z) whose edge is within r, or -1 (v0.15)
export function boxNear(x,z,k,r){
  let best=-1,bd=r;
  for(let i=0;i<boxes.length;i++){const b=boxes[i];if(b.room!==k)continue;const q=b.box,d=Math.hypot(Math.max(q.x0-x,0,x-q.x1),Math.max(q.z0-z,0,z-q.z1));if(d<bd){bd=d;best=i;}}
  return best;
}
// index of the room containing (x,z), or -1; pad grows the room (the cutaway also covers the doorway)
export function roomAt(x,z,pad=0){for(let k=0;k<rooms.length;k++){const r=rooms[k];if(x>r.x0-pad&&x<r.x1+pad&&z>r.z0-pad&&z<r.z1+pad)return k;}return -1;}
// how a walker at (ax,az) gets to (tx,tz) when a room wall is in the way: the next point to walk to, and the
// room whose door it has to pass (-1 when it can walk straight)
export function navStep(ax,az,tx,tz){
  const ra=roomAt(ax,az),rt=roomAt(tx,tz);
  if(ra<0)for(const A of AREAS){const a=beyond(A,ax,az)>0,t=beyond(A,tx,tz)>0;if(a===t)continue;const w=A.wall,lat=w.axis==='x'?az:ax,s=(w.v<0?-1:1)*(a?1:-1);   // v0.22 city <-> an area: through the gate in the wall
    if(Math.abs(lat)>GATE-1.2)return w.axis==='x'?{x:w.v+s*2.5,z:0,door:-1}:{x:0,z:w.v+s*2.5,door:-1};}
  {const sa=riverSide(ax),st=riverSide(tx);if(ra<0&&sa&&st&&sa!==st&&Math.abs(az)>RIVER.bridge-1.2)return {x:sa<0?RIVER.x0-2.5:RIVER.x1+2.5,z:0,door:-1};}   // v0.25 across the river: over the bridge
  if(ra===rt)return {x:tx,z:tz,door:-1};
  return ra>=0?viaDoor(ra,ax,az,true):viaDoor(rt,ax,az,false);
}
export function viaDoor(k,ax,az,leaving){
  const r=rooms[k],[nx,nz]=r.n,[tx,tz]=r.t,rx=ax-r.dx,rz=az-r.dz,along=rx*nx+rz*nz,lat=rx*tx+rz*tz;
  if(leaving)return along<-.7&&Math.abs(lat)>.35?{x:r.dx-nx,z:r.dz-nz,door:k}:{x:r.dx+nx*1.8,z:r.dz+nz*1.8,door:k};
  if(along>.5)return Math.abs(lat)>.35?{x:r.dx+nx,z:r.dz+nz,door:k}:{x:r.dx-nx*1.4,z:r.dz-nz*1.4,door:k};
  if(along>=-WALL_T-.2&&Math.abs(lat)<r.half+.4)return {x:r.dx-nx*1.4,z:r.dz-nz*1.4,door:k};   // on the door side or in the doorway
  // beside the building: round the front corner; behind it: get to a back corner first
  const s=lat<0?-1:1,back=along<-r.depth&&Math.abs(lat)<r.half+.8?r.depth+1.2:-1.2;
  return {x:r.dx+tx*s*(r.half+1.2)-nx*back,z:r.dz+tz*s*(r.half+1.2)-nz*back,door:-1};
}
// distance from (x,z) to the middle of a room's doorway
export const doorDist=(k,x,z)=>Math.hypot(x-rooms[k].dx,z-rooms[k].dz);

// cutaway: show the inside of room k (and the outside of every other building); -1 shows no inside
let shown=-1;
export function shownRoom(){return shown;}
export function showRoom(k){
  if(k===shown)return;
  if(shown>=0){const r=rooms[shown];for(const m of r.b.meshes)m.visible=true;r.cut.visible=false;}
  if(k>=0){const r=rooms[k];for(const m of r.b.meshes)m.visible=false;r.cut.visible=true;}
  shown=k;
}
// door look for a state {open, broken}
export function setDoorLook(k,st){const r=rooms[k];r.extDoor.visible=!st.open;r.extHole.visible=st.open;r.cutDoor.visible=!st.open;r.cutBroken.visible=!!st.broken;
  const boards=st.open?0:Math.ceil((st.hp-DOOR_HP)/PLANK_HP);r.cutPlanks.forEach((m,i)=>{m.visible=i<boards;});}
// is a wall between these two points? Only checked when one of them is inside a room, so outdoor sight works as before
export function walledOff(ax,az,bx,bz){
  const ra=roomAt(ax,az),rb=roomAt(bx,bz);if(ra===rb)return false;
  const dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz);return d>1e-3&&rayWall(ax,az,dx/d,dz/d,d)<d-.1;
}
