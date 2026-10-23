import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {S} from './materials.js';
import {freeAt} from './collision.js';
import {lootSpots,mapPaint,pois} from './city.js';
import {decor} from './decor.js';
import {solidAt} from './clutter.js';
import {addTank} from './extras.js';
import {live} from './live-props.js';
import {staticFlames} from '../systems/effects.js';

// ---------- the survivors' camp (v0.26) ----------
// In the clearing in the woods across the river (world/river.js): tents round a fire that still burns, torches, crates,
// a radio left on, a gas cylinder too close to the fire, and bear traps set round the edge (systems/camp.js: they catch
// a zombie or a careless player once). Its four loot spots roll the 'camp' table with better grades (systems/drops.js);
// walkers are left guarding it when the outbreak starts. Built after the river with its own rng; everything appended.
export const CAMP={x:128,z:16,r:10};
export const camp={fire:{x:CAMP.x,z:CAMP.z,r:.9},traps:[],radio:null};   // traps: {x, z, entry (live-props)}
const trapMat=S({color:'#4a4a48',roughness:.5,metalness:.6});
export function buildCamp(){
  const rng=mulberry32(2626),R=(a,b)=>a+rng()*(b-a);
  const {x:cx,z:cz}=CAMP;
  mapPaint.push({color:'#4a4632',rects:[[cx-9,cz-9,cx+9,cz+9]]});pois.push({type:'camp',x:cx,z:cz});
  // the fire (always burning: it hurts what stands in it, systems/blast.js) and stones round it, the tents in a ring
  decor.push({id:'s_bonfire',x:cx,z:cz,ry:0,size:1.6,by:'w',shadow:false});staticFlames(cx,cz,.8,'#ff8a3a');
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4,x=cx+Math.cos(a)*5.6,z=cz+Math.sin(a)*5.6,ry=Math.atan2(cx-x,cz-z);solidAt('s_tent',x,z,1.2,1.5,Math.round(ry/(Math.PI/2))*(Math.PI/2),1.6,-1);}
  // torches on the paths in, crates and pallets, a radio on a crate, a gas cylinder by the fire
  for(const a of [1.2,2.6,4.1,5.4]){const x=cx+Math.cos(a)*8.6,z=cz+Math.sin(a)*8.6;decor.push({id:'s_torch',x,z,ry:0,size:1.5,shadow:false});staticFlames(x,z+.02,.12,'#ffb060',1.55);}
  for(const [dx,dz] of [[2.6,-1.2],[2.9,-.2],[-2.4,2.6]])decor.push({id:'c_box',x:cx+dx,z:cz+dz,ry:R(0,6.28),size:.55,shadow:true});
  decor.push({id:'k_pallet',x:cx-3,z:cz-2.6,ry:.4,size:1.2,by:'w',shadow:true},{id:'s_radio',x:cx+2.7,z:cz-.7,ry:-.5,size:.32,by:'w',y:.6,shadow:false});
  camp.radio={x:cx+2.7,z:cz-.7};
  addTank(cx-2.2,cz+1.6,'propane');
  // bear traps round the edge, where the paths come in
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2+R(-.2,.2),d=R(7.2,9.4),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(!freeAt(x,z,.4))continue;
    const g=new THREE.Group();scene.add(g);const fb=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.05,10),trapMat);fb.position.set(x,.05,z);scene.add(fb);
    const e={id:'s_trap',size:.75,axis:0,x,y:.03,z,ry:R(0,6.28),group:g,fallback:fb,gone:false,model:null};live.push(e);camp.traps.push({x,z,entry:e});}
  // loot between the fire and the tents ('camp' table, config/places.js)
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4,x=cx+Math.cos(a)*2.7,z=cz+Math.sin(a)*2.7;if(freeAt(x,z,.4))lootSpots.push({x,z,zone:'camp',drop:null});}
}
