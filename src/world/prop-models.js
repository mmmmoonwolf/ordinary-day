import {scene} from '../core/renderer.js';
import {loadGltf} from '../core/gltf.js';
import {breakables} from './props.js';

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
  setCars();
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
function setCars(){
  let i=0;
  for(const b of breakables){
    if(!b.car)continue;const c=b.car,id=c.police?'car_police':PLAIN[i++%PLAIN.length],on=hasProp(id);
    if(on&&!c.model){
      const g=propModel(id,2,CAR_LEN,[.5,0,.5],!!PAINT[id]);
      if(PAINT[id])g.traverse(m=>{if(m.isMesh&&m.material.name===PAINT[id])m.material.color.set(c.paint).convertSRGBToLinear();});
      g.position.set(b.x,0,b.z);if(c.alongX)g.rotation.y=Math.PI/2;
      g.userData.y0=0;g.userData.sy0=1;if(b.broken)g.scale.y=.3;
      scene.add(g);b.meshes.push(g);c.model=g;
    }
    if(c.model)c.model.visible=on;
    for(const m of c.boxes)m.visible=!on;
  }
}
// graphics quality "low" goes back to the box models (ui/settings.js); drops and held weapons are rebuilt by refreshItems()
export function setPropsOn(on){const was=props.on;props.on=on;setCars();return props.ready&&was!==on;}
