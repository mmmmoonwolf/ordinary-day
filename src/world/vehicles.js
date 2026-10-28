import {scene} from '../core/renderer.js';
import {S,box,darkMetal} from './materials.js';
import {solids} from './collision.js';

// ---------- the cars that can be driven (v0.45) ----------
// Where they start (rides: added by world/highway.js) and how they look: a plain box car like world/props.js car(), with
// the car model over it once the props have loaded (world/prop-models.js setRides()). Where each one is now, how it faces
// and how much is left of it live in G.cars (systems/vehicles.js), so they are saved and sent to friends online. Each has
// a collision box (low: it can be vaulted) that follows it around.
export const rides=[];   // {x, z, a, id (car model), paint, g (group turned with the car), boxes (the plain car), model, box (in solids), lamps}
export const CAR_HALF=[.95,2.15];   // half width and half length (m)
export function addRide(x,z,a,id,paint){
  const g=new THREE.Group();scene.add(g);
  const body=S({color:paint,roughness:.5,metalness:.35}),glass=S({color:'#1d2226',roughness:.2,metalness:.6}),lamp=S({color:'#e8e2c8',emissive:'#ffe7b0',emissiveIntensity:0});
  const part=(m,w,h,d,px,py,pz)=>{const o=box(m,w,h,d,px,py,pz);scene.remove(o);g.add(o);return o;};
  const boxes=[part(body,1.9,1,4.2,0,.62,0),part(glass,1.7,.7,2.2,0,1.45,-.2)];
  for(const s of [-1,1])for(const t of [-1,1])boxes.push(part(darkMetal,.25,.6,.6,s*.95,.3,t*1.35));
  const lamps=[part(lamp,.4,.16,.06,-.6,.72,2.12),part(lamp,.4,.16,.06,.6,.72,2.12)];   // headlights, lit while someone drives at night
  const r={x,z,a,id,paint,g,boxes,model:null,lamps,lampMat:lamp,body,box:{x0:0,x1:0,z0:0,z1:0,low:true,ride:rides.length}};
  solids.push(r.box);rides.push(r);placeRide(r,x,z,a,1);return r;
}
// moves a ride's look and its collision box (axis-aligned around the turned car)
export function placeRide(r,x,z,a,hpK){
  r.g.position.set(x,0,z);r.g.rotation.y=a;
  const c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),hx=CAR_HALF[0]*c+CAR_HALF[1]*s,hz=CAR_HALF[0]*s+CAR_HALF[1]*c,b=r.box;
  b.x0=x-hx;b.x1=x+hx;b.z0=z-hz;b.z1=z+hz;
  const dead=hpK<=0;if(dead!==!!r.dead){r.dead=dead;const k=dead?.12:1;r.body.color.set(r.paint).multiplyScalar(k);if(r.model)r.model.traverse(m=>{if(m.isMesh&&m.material.userData.base)m.material.color.copy(m.material.userData.base).multiplyScalar(k);});}
}
