import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {loadGltf} from '../core/gltf.js';
import {breakables,trees} from './props.js';
import {decor} from './decor.js';
import {boxes,rooms} from './interiors.js';
import {heavy,roomDecor} from './clutter.js';
import {attach,farm} from './farm.js';
import {live} from './live-props.js';

// ---------- prop models (v0.14) ----------
// Guns, knives, axes, food, water, medicine, backpacks, bottles and cars from Quaternius' packs (CC0; built into
// assets/props/props.glb by tools/build-props.mjs, one top-level node per prop). Like the character models they are only
// looks: until the file has loaded, on "low" graphics, or if it fails to load, everything keeps its old box model.
export const props={ready:false,failed:false,on:true};
const tpl={};
export async function loadProps(){
  if(props.ready||!document.head||!window.WebGLRenderingContext)return;
  try{
    const g=await loadGltf('assets/props/props.glb');
    for(const n of [...g.scene.children]){n.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;}});n.updateMatrixWorld(true);tpl[n.name]=n;}
    props.ready=true;
  }catch(e){props.failed=true;console.warn('prop models: '+e.message);}
  setCars();setFurniture();setTown();
}
export const hasProp=id=>props.ready&&props.on&&!!tpl[id];
// a copy of prop `id` in a group, scaled so its size along `axis` (0 x, 1 y, 2 z of the source model) is `len`, and moved so
// `at` (0..1 along each axis of its bounding box) sits at the group's origin. Materials are shared unless `own`.
const bb=new THREE.Box3(),v=new THREE.Vector3();
export function propModel(id,axis,len,at,own){
  const src=tpl[id],o=src.clone(true);
  if(own)o.traverse(m=>{if(m.isMesh)m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):m.material.clone();});
  bb.setFromObject(src);bb.getSize(v);const k=len/(v.getComponent(axis)||1);
  o.scale.multiplyScalar(k);
  for(let i=0;i<3;i++)o.position.setComponent(i,o.position.getComponent(i)*k-(bb.min.getComponent(i)+v.getComponent(i)*at[i])*k);
  const g=new THREE.Group();g.add(o);return g;
}
// cars: each one built by world/props.js car() gets a model over its box (kept for "low" graphics and the Tyrant smash, which
// flattens every mesh in the breakable's list, the model included). Plain cars get the box car's paint.
const PLAIN=['car_1','car_2','car_suv','car_1','car_2','car_suv','car_taxi','car_sport'],PAINT={car_1:'Blue',car_2:'LightBlue',car_suv:'White'};
export const CAR_LEN=4.3;
const CHAR=new THREE.Color(.005,.0045,.004);   // burned out: soot black (linear)
function setCars(){
  let i=0;
  for(const b of breakables){
    if(!b.car)continue;const c=b.car,id=c.police?'car_police':PLAIN[i++%PLAIN.length],on=hasProp(id);
    if(on&&!c.model){
      const g=propModel(id,2,CAR_LEN,[.5,0,.5],!!PAINT[id]||c.burned);
      if(c.burned)g.traverse(m=>{if(m.isMesh){m.material.color.copy(CHAR);m.material.roughness=1;m.material.metalness=0;}});   // v0.16
      else if(PAINT[id])g.traverse(m=>{if(m.isMesh&&m.material.name===PAINT[id])m.material.color.set(c.paint).convertSRGBToLinear();});
      g.position.set(b.x,0,b.z);if(c.alongX)g.rotation.y=Math.PI/2;
      g.userData.y0=0;g.userData.sy0=1;if(b.broken)g.scale.y=.3;
      scene.add(g);b.meshes.push(g);c.model=g;
    }
    if(c.model)c.model.visible=on;
    for(const m of c.boxes)m.visible=!on;
  }
}
// graphics quality "low" goes back to the box models (ui/settings.js); drops and held weapons are rebuilt by refreshItems()
export function setPropsOn(on){const was=props.on;props.on=on;setCars();setFurniture();setTown();return props.ready&&was!==on;}
// furniture (v0.15): each box along a wall of an enterable building becomes a row of modules, scaled to the box's height
// (or depth, whichever is smaller), stretched along the wall to fill it, backs against the wall, fronts into the room.
// They sit in the room's cutaway group, so they show only when the player is inside, like the boxes did.
const FURN={kitchen:['f_fridge','f_kdrawers','f_ksink','f_koven','f_kcab','f_k3'],shelf:['f_bookshelf','f_shelf'],drawer:['f_drawer1','f_drawer5','f_drawer2'],sofa:['f_couch'],
  medcab:['f_drawer5','f_shelf','f_drawer1'],gunrack:['f_shelf','f_bookshelf'],grocery:['f_shelf','f_fridge','f_shelf'],tools:['f_shelf','f_drawer2'],farm:['f_shelf','f_drawer2','f_shelf']};   // v0.22 the barn   // v0.17 shops
const sizeOf=id=>{bb.setFromObject(tpl[id]);return bb.getSize(new THREE.Vector3());};
function furnModel(b){
  const ids=FURN[b.kind];if(!ids.every(id=>tpl[id]))return null;
  const ref=sizeOf(ids[b.kind==='kitchen'?1:0]),s=Math.min(Math.max(b.h,b.kind==='gunrack'||b.kind==='grocery'||b.kind==='tools'||b.kind==='farm'?1.5:0)/ref.y,b.d/ref.z);   // shop shelves stand at least 1.5 m
  const row=[];let len=0;
  for(let k=0;len<b.L;k++){const id=b.kind==='sofa'?(b.L<1.9&&tpl.f_couch_m?'f_couch_m':'f_couch'):ids[k%ids.length],w=sizeOf(id).x*s;if(row.length&&len+w/2>b.L)break;row.push([id,w]);len+=w;}
  const g=new THREE.Group(),[sx,sz]=b.n,th=Math.atan2(-sx,-sz),ax=Math.cos(th),az=-Math.sin(th),k=b.L/len;
  const cx=(b.box.x0+b.box.x1)/2,cz=(b.box.z0+b.box.z1)/2,wx=cx+sx*b.d/2,wz=cz+sz*b.d/2;
  let at=-b.L/2;
  for(const [id,w] of row){
    const src=tpl[id],o=src.clone(true),m=new THREE.Group();bb.setFromObject(src);
    o.position.x-=(bb.min.x+bb.max.x)/2;o.position.y-=bb.min.y;o.position.z-=bb.min.z;m.add(o);
    m.scale.set(s*k,s,s);m.rotation.y=th;const c=at+w*k/2;m.position.set(wx+ax*c,b.y0,wz+az*c);at+=w*k;g.add(m);
  }
  return g;
}
function setFurniture(){
  for(const b of boxes){
    if(!b.mesh)continue;   // v0.40 a car (its model is the car's own)
    const on=props.ready&&props.on;
    if(on&&!b.model){b.model=furnModel(b);if(b.model)b.cut.add(b.model);}
    if(b.model)b.model.visible=on;b.mesh.visible=!(on&&b.model);
  }
}

// ---------- the town (v0.16) ----------
// Trees (over the old ones, which stay for "low" graphics) and world/decor.js `decor`. Hundreds of small models would be
// hundreds of draw calls, so they are baked: every copy's triangles go into one mesh per material and per 46 m square of
// the city (the squares let the camera skip what it does not see). Trees, signs and traffic lights cast shadows.
const LEAVES=['#6a7243','#86783f','#7a5a34'].map(c=>new THREE.Color(c).convertSRGBToLinear());
const TOWN_COL={Bark:'#4f4134',Green:'#56603a'};
let town=null;
const v3=new THREE.Vector3(),n3=new THREE.Vector3(),nm=new THREE.Matrix3();
// reads a vertex attribute value; glTF quantized attributes are normalized integers, which r128's getX leaves raw
function reader(a){
  const arr=a.isInterleavedBufferAttribute?a.data.array:a.array;
  const d=!a.normalized?1:arr instanceof Int8Array?127:arr instanceof Uint8Array?255:arr instanceof Int16Array?32767:arr instanceof Uint16Array?65535:1;
  return (i,c)=>{const v=c===0?a.getX(i):c===1?a.getY(i):a.getZ(i);return d===1?v:Math.max(v/d,-1);};
}
const partsCache={};
function partsOf(id){
  if(partsCache[id])return partsCache[id];
  const out=[];tpl[id].traverse(m=>{if(m.isMesh)out.push({geo:m.geometry,mat:m.material,rel:m.matrixWorld.clone()});});
  bb.setFromObject(tpl[id]);const size=bb.getSize(new THREE.Vector3());
  return partsCache[id]={out,size,anchor:new THREE.Vector3((bb.min.x+bb.max.x)/2,bb.min.y,(bb.min.z+bb.max.z)/2)};
}
// copies [{id,x,y,z,ry,size,shadow,mat(material)}] -> a group of merged meshes. size is the height, or the width with by:'w'
// (v0.18, flat things); fit:[w,d] instead scales the model into that footprint, turned a quarter if its long side is the other way
function bake(list){
  const buckets=new Map(),M=new THREE.Matrix4(),P=new THREE.Matrix4(),Q=new THREE.Quaternion(),U=new THREE.Vector3(0,1,0);
  for(const c of list){
    const pr=partsOf(c.id),z=pr.size;let k=c.size/((c.by==='w'?Math.max(z.x,z.z):z.y)||1),ry=c.ry;
    if(c.fit){const sw=Math.abs(Math.sin(ry))>.5,mx=sw?z.z:z.x,mz=sw?z.x:z.z,turn=(mx>mz)!==(c.fit[0]>c.fit[1]);if(turn)ry+=Math.PI/2;k=Math.min(c.fit[0]/(turn?mz:mx),c.fit[1]/(turn?mx:mz));}
    P.compose(new THREE.Vector3(c.x,c.y,c.z),Q.setFromAxisAngle(U,ry),new THREE.Vector3(k,k,k)).multiply(new THREE.Matrix4().makeTranslation(-pr.anchor.x,-pr.anchor.y,-pr.anchor.z));
    const key0=Math.floor((c.x+70)/46)+','+Math.floor((c.z+70)/46)+(c.shadow?'s':'');
    for(const p of pr.out){const mat=c.mat?c.mat(p.mat):p.mat,key=key0+mat.uuid;let b=buckets.get(key);if(!b)buckets.set(key,b={mat,shadow:c.shadow,items:[]});b.items.push([p.geo,M.multiplyMatrices(P,p.rel).clone()]);}
  }
  const g=new THREE.Group();
  for(const b of buckets.values()){
    let nv=0,ni=0;for(const [geo] of b.items){nv+=geo.attributes.position.count;ni+=geo.index?geo.index.count:geo.attributes.position.count;}
    const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),idx=new Uint32Array(ni),hasUv=b.items.every(([geo])=>geo.attributes.uv),uv=hasUv?new Float32Array(nv*2):null;let ov=0,oi=0;
    for(const [geo,m] of b.items){
      const pa=geo.attributes.position,na=geo.attributes.normal,rp=reader(pa),rn=na?reader(na):null,ru=hasUv?reader(geo.attributes.uv):null;nm.getNormalMatrix(m);   // textured models (City Pack) keep their uv
      for(let i=0;i<pa.count;i++){
        v3.set(rp(i,0),rp(i,1),rp(i,2)).applyMatrix4(m);pos.set([v3.x,v3.y,v3.z],(ov+i)*3);
        if(ru){uv[(ov+i)*2]=ru(i,0);uv[(ov+i)*2+1]=ru(i,1);}
        if(rn){n3.set(rn(i,0),rn(i,1),rn(i,2)).applyMatrix3(nm).normalize();nor.set([n3.x,n3.y,n3.z],(ov+i)*3);}else nor[(ov+i)*3+1]=1;
      }
      if(geo.index)for(let i=0;i<geo.index.count;i++)idx[oi++]=geo.index.getX(i)+ov;else for(let i=0;i<pa.count;i++)idx[oi++]=ov+i;
      ov+=pa.count;
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setIndex(new THREE.BufferAttribute(idx,1));if(uv)geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,b.mat);mesh.castShadow=b.shadow;mesh.receiveShadow=true;g.add(mesh);
  }
  return g;
}
const own={};
function townMat(m,leaf){
  if(m.name==='Tree_Leaves'){const k='leaf'+leaf;return own[k]||(own[k]=Object.assign(m.clone(),{color:LEAVES[leaf].clone()}));}
  const c=TOWN_COL[m.name];if(!c)return m;return own[m.name]||(own[m.name]=Object.assign(m.clone(),{color:new THREE.Color(c).convertSRGBToLinear()}));
}
// v0.23 corn and wheat dried out: one straw colour over the models' greens
const CROP=new THREE.Color('#a48f58').convertSRGBToLinear();
function cropMat(m){return own['crop'+m.uuid]||(own['crop'+m.uuid]=Object.assign(m.clone(),{color:CROP.clone().lerp(m.color,.25)}));}
const heavyCopy=h=>({id:h.id,x:h.x,y:h.y,z:h.z,ry:h.ry,fit:[h.ex*2,h.ez*2],shadow:true,mat:m=>m});
function setTown(){
  const on=props.ready&&props.on;
  if(on&&!town){
    const H=i=>((i*2654435761)>>>0)/4294967296;   // a fixed 0..1 per tree, so the town looks the same every time
    const list=trees.map((t,i)=>{const leaf=Math.floor(H(i+7)*3);return {id:t.bare?'dead_'+(1+i%5):'tree_'+(1+i%4),x:t.x,y:t.g.position.y,z:t.z,ry:H(i)*6.28,size:t.bare?4.6+H(i+3)*1.6:5+H(i+3)*1.8,shadow:true,mat:m=>townMat(m,leaf)};});
    for(const d of decor)list.push({id:d.id,x:d.x,y:d.y??groundY(d.x,d.z),z:d.z,ry:d.ry,size:d.size,by:d.by,shadow:d.shadow,mat:d.crop?cropMat:/^[cf]_/.test(d.id)?m=>m:m=>townMat(m,0)});
    for(const h of heavy)if(h.room<0)list.push(heavyCopy(h));
    town=bake(list.filter(c=>tpl[c.id]));scene.add(town);   // a model missing from an old cached props.glb is left out
    // v0.18: the clutter in each room, in its cutaway group
    rooms.forEach((r,k)=>{const l=(roomDecor[k]||[]).map(d=>({...d,mat:m=>m}));for(const h of heavy)if(h.room===k)l.push(heavyCopy(h));const ok=l.filter(c=>tpl[c.id]);if(ok.length){r.clutter=bake(ok);r.cut.add(r.clutter);}});
  }
  if(town)town.visible=on;
  for(const t of trees)t.g.visible=!(on&&town);
  for(const r of rooms)if(r.clutter)r.clutter.visible=on;
  if(farm.corn)farm.corn.visible=!(on&&town&&tpl.n_corn1);   // v0.23 the flat corn stays for "low" graphics
  // v0.23 props that can disappear (gas cylinders): one model each over its plain stand-in
  for(const e of live){if(on&&!e.model&&tpl[e.id]){e.model=propModel(e.id,e.axis??1,e.size,e.at||[.5,0,.5]);e.model.position.set(e.x,e.y,e.z);e.model.rotation.y=e.ry||0;e.group.add(e.model);}
    if(e.model)e.model.visible=on&&!e.gone;if(e.fallback)e.fallback.visible=!e.gone&&!(on&&e.model);}
  // v0.22 models fixed to a farm building (window barricades), in its shell group so they hide with it
  for(const a of attach){if(on&&!a.model&&tpl[a.id]){a.model=propModel(a.id,2,a.size,[.5,.5,.5]);a.model.position.set(a.x,a.y,a.z);a.model.rotation.y=a.ry;a.group.add(a.model);}if(a.model)a.model.visible=on;}
  for(const h of heavy)h.mesh.visible=!(on&&town&&(!h.id||tpl[h.id]));   // the plain box stays for "low" graphics and while loading
}
