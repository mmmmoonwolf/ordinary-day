import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC} from '../config/world.js';
import {WALL_T,DOOR_W,STUB_H} from '../config/shelter.js';
import {S,part} from './materials.js';
import {solids,freeAt,rayWall} from './collision.js';
import {buildings,lootSpots,LAYOUT} from './city.js';

// ---------- enterable buildings (v0.6) ----------
// One building per city block gets a door. Its solid footprint becomes four walls with a doorway, and while the
// player is inside, the outer shell (walls, roof, parapets) is hidden and a cutaway takes its place: a floor,
// knee-high walls and furniture. Built after buildCity() with its own rng, so the seeded city stays the same
// and the new loot spots go after every existing one.
export const rooms=[];
const floorMats=['#7a6650','#6d6a62','#806c55','#5f6a6e'].map(c=>S({color:c,roughness:.85}));
const furnMats=['#6b5a46','#4c5560','#7d4b3c','#8b8577','#3f4a3a'].map(c=>S({color:c,roughness:.8}));
const doorMat=S({color:'#5a3d26',roughness:.7}),holeMat=S({color:'#141210',roughness:1}),brokenMat=S({color:'#3a2a1c',roughness:.9});
const signMat=S({color:'#3a2f22',emissive:'#ffb35a',emissiveIntensity:.9});
const FURN=[{d:.5,h:1.9},{d:.8,h:.85},{d:.9,h:.75},{d:.6,h:1.1}];   // shelf, counter, sofa, cabinet

// outward normals: +x, -x, +z, -z
const SIDES=[[1,0],[-1,0],[0,1],[0,-1]];
function blockOf(x){for(let i=0;i<4;i++)if(x>RC[i]&&x<RC[i+1])return i;return -1;}
// a mesh placed in world space but not added to the scene (goes into a group)
function slab(mat,x0,x1,z0,z1,y0,y1){return part(mat,x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2);}
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
  const r={b,x0:X0+T,x1:X1-T,z0:Z0+T,z1:Z1-T,n:[nx,nz],t:[tx,tz],dx,dz,half,depth:nx?b.w:b.d,ext:new THREE.Group(),cut:new THREE.Group(),furniture:[]};
  // walls: the door side is split around the doorway; the door itself is its own box, in `solids` only while closed
  const i=solids.indexOf(b.box);if(i>=0)solids.splice(i,1);
  const stubMat=S({color:new THREE.Color(b.base).multiplyScalar(.9),roughness:.9});
  const wallBoxes=[[[0,1],X0,X1,Z1-T,Z1],[[0,-1],X0,X1,Z0,Z0+T],[[1,0],X1-T,X1,Z0+T,Z1-T],[[-1,0],X0,X0+T,Z0+T,Z1-T]];
  for(const [[sx,sz],x0,x1,z0,z1] of wallBoxes){
    const segs=sx!==nx||sz!==nz?[[x0,x1,z0,z1]]:nx?[[x0,x1,z0,dz-DOOR_W/2],[x0,x1,dz+DOOR_W/2,z1]]:[[x0,dx-DOOR_W/2,z0,z1],[dx+DOOR_W/2,x1,z0,z1]];
    for(const q of segs){pushBox(...q);r.cut.add(slab(stubMat,...q,y0,y0+STUB_H));}
  }
  r.doorBox=nx?{x0:Math.min(dx,dx-nx*T),x1:Math.max(dx,dx-nx*T),z0:dz-DOOR_W/2,z1:dz+DOOR_W/2}:{x0:dx-DOOR_W/2,x1:dx+DOOR_W/2,z0:Math.min(dz,dz-nz*T),z1:Math.max(dz,dz-nz*T)};
  const D=r.doorBox;
  // cutaway: floor, door (closed / broken) and furniture against the three other walls
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(r.x1-r.x0,r.z1-r.z0),floorMats[Math.floor(rng()*floorMats.length)]);fl.rotation.x=-Math.PI/2;fl.position.set((r.x0+r.x1)/2,y0+.012,(r.z0+r.z1)/2);fl.receiveShadow=true;r.cut.add(fl);
  r.cutDoor=slab(doorMat,D.x0+(nx?T*.3:0),D.x1-(nx?T*.3:0),D.z0+(nz?T*.3:0),D.z1-(nz?T*.3:0),y0,y0+STUB_H*.95);r.cut.add(r.cutDoor);
  r.cutBroken=slab(brokenMat,D.x0,D.x1,D.z0,D.z1,y0,y0+.08);r.cut.add(r.cutBroken);
  for(const [sx,sz] of SIDES){
    if(sx===nx&&sz===nz||rng()<.2)continue;
    const f=FURN[Math.floor(rng()*FURN.length)],wl=sx?r.z1-r.z0:r.x1-r.x0,L=Math.min(wl-2.8,1.6+rng()*1.8);if(L<1.2)continue;
    const off=(rng()*2-1)*Math.max(0,wl/2-1.4-L/2),fx=sx?(sx>0?r.x1-f.d/2:r.x0+f.d/2):(r.x0+r.x1)/2+off,fz=sz?(sz>0?r.z1-f.d/2:r.z0+f.d/2):(r.z0+r.z1)/2+off;
    const hw=sx?f.d/2:L/2,hd=sx?L/2:f.d/2;
    r.furniture.push(pushBox(fx-hw,fx+hw,fz-hd,fz+hd));r.cut.add(slab(furnMats[Math.floor(rng()*furnMats.length)],fx-hw,fx+hw,fz-hd,fz+hd,y0,y0+f.h));
  }
  // outside: a door or a dark doorway on the wall face, and a lit sign above it so enterable buildings stand out
  const fw=(a,thick)=>nx?[dx+nx*a-thick,dx+nx*a+thick,dz-DOOR_W/2,dz+DOOR_W/2]:[dx-DOOR_W/2,dx+DOOR_W/2,dz+nz*a-thick,dz+nz*a+thick];
  r.extDoor=slab(doorMat,...fw(.04,.04),y0,y0+2.3);r.extHole=slab(holeMat,...fw(.02,.02),y0,y0+2.3);
  const sg=nx?[dx+nx*.08-.06,dx+nx*.08+.06,dz-.7,dz+.7]:[dx-.7,dx+.7,dz+nz*.08-.06,dz+nz*.08+.06];
  r.ext.add(r.extDoor,r.extHole,slab(signMat,...sg,y0+2.55,y0+2.9));
  for(const m of r.cut.children)m.castShadow=m.receiveShadow=true;
  r.cut.visible=false;scene.add(r.cut,r.ext);b.meshes.push(r.ext);
  // two loot spots inside, appended after every existing spot so saved spot indices stay valid
  const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2,depth=nx?r.x1-r.x0:r.z1-r.z0;
  for(const [px,pz] of [[cx+tx*.8,cz+tz*.8],[cx-nx*(depth/2-1.7),cz-nz*(depth/2-1.7)]])if(freeAt(px,pz,.5))lootSpots.push({x:px,z:pz,zone:'indoor',drop:null});
  return r;
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
}

// index of the room containing (x,z), or -1; pad grows the room (the cutaway also covers the doorway)
export function roomAt(x,z,pad=0){for(let k=0;k<rooms.length;k++){const r=rooms[k];if(x>r.x0-pad&&x<r.x1+pad&&z>r.z0-pad&&z<r.z1+pad)return k;}return -1;}
// how a walker at (ax,az) gets to (tx,tz) when a room wall is in the way: the next point to walk to, and the
// room whose door it has to pass (-1 when it can walk straight)
export function navStep(ax,az,tx,tz){
  const ra=roomAt(ax,az),rt=roomAt(tx,tz);
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
export function setDoorLook(k,st){const r=rooms[k];r.extDoor.visible=!st.open;r.extHole.visible=st.open;r.cutDoor.visible=!st.open;r.cutBroken.visible=!!st.broken;}
// is a wall between these two points? Only checked when one of them is inside a room, so outdoor sight works as before
export function walledOff(ax,az,bx,bz){
  const ra=roomAt(ax,az),rb=roomAt(bx,bz);if(ra===rb)return false;
  const dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz);return d>1e-3&&rayWall(ax,az,dx/d,dz/d,d)<d-.1;
}
