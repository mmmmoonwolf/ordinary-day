import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC,groundY,WALL_X} from '../config/world.js';
import {S,part} from './materials.js';
import {freeAt,solids} from './collision.js';
import {heavy} from './clutter.js';
import {buildings,lootSpots,LAYOUT} from './city.js';
import {rooms,roomAt} from './interiors.js';
import {decor} from './decor.js';
import {solidAt} from './clutter.js';
import {live} from './live-props.js';

// ---------- town extras (v0.23) ----------
// Bus stops and benches along the curbs, stop signs at the crossings, billboards on the roofs, cash machines by the shops,
// a building site with scaffolding in the container yard (3,0), and gas cylinders and fuel cans that blow up when shot
// (systems/blast.js). Built after the farm with its own rng; everything appended, nothing that was there moves.
export const tanks=[];   // {x, z, kind: 'propane' | 'gas', box (collision), entry (world/live-props.js)}
const fallMat=S({color:'#4a4640',roughness:.9});
const tankMat={propane:S({color:'#c9c4b6',roughness:.5,metalness:.4}),gas:S({color:'#a8322a',roughness:.6})};
export function addTank(x,z,kind){
  const h=kind==='propane'?1.05:.42,r=kind==='propane'?.3:.2,y=groundY(x,z);
  const fb=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),tankMat[kind]);fb.position.set(x,y+h/2,z);fb.castShadow=true;scene.add(fb);
  const g=new THREE.Group();scene.add(g);
  const e={id:kind==='propane'?'s_propane':'s_gascan',size:h,axis:1,x,y,z,ry:(x*7+z*3)%6.28,group:g,fallback:fb,gone:false,model:null};live.push(e);
  const box={x0:x-r,x1:x+r,z0:z-r,z1:z+r};tanks.push({x,z,kind,box,entry:e});return tanks.length-1;
}
export function buildExtras(){
  const rng=mulberry32(2323),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)];
  const clear=(x,z,r)=>freeAt(x,z,r)&&roomAt(x,z,.5)<0&&!lootSpots.some(s=>Math.hypot(s.x-x,s.z-z)<1)&&!rooms.some(q=>Math.hypot(q.dx-x,q.dz-z)<2.5);
  const put=(id,x,z,size,o={})=>{if(!o.free&&!clear(x,z,o.r??.4))return false;decor.push({id,x,z,ry:o.ry??R(0,6.28),size,shadow:o.shadow??true,y:o.y,by:o.by});return true;};
  // the sidewalk along a block's edge, facing the road: [x, z, ry toward the road]
  const curb=()=>{const i=Math.floor(rng()*4),j=Math.floor(rng()*4),cx=(RC[i]+RC[i+1])/2,cz=(RC[j]+RC[j+1])/2,side=Math.floor(rng()*4),t=R(-9,9),o=10.6;
    return side<2?[cx+(side?1:-1)*o,cz+t,side?Math.PI/2:-Math.PI/2]:[cx+t,cz+(side===2?1:-1)*o,side===2?0:Math.PI];};
  // a finer check than solidAt's for small things in the way (lamp posts, trees): every 0.5 m over the footprint
  const roomy=(x,z,hx,hz)=>{for(let a=-hx;a<=hx+.01;a+=.5)for(let b=-hz;b<=hz+.01;b+=.5)if(!freeAt(x+a,z+b,.2))return false;return true;};
  for(let k=0,n=0;k<40&&n<5;k++){const [x,z,ry]=curb(),sw=Math.abs(Math.cos(ry))>.5;if(roomy(x,z,sw?.6:1.4,sw?1.4:.6)&&solidAt('c_busstop',x,z,1.4,.6,ry+Math.PI/2,2.4,-1)){n++;put('c_bench',x+Math.sin(ry)*-.1,z+Math.cos(ry)*-.1,.9,{free:true,ry:ry+Math.PI});}}   // a shelter with a bench in it
  for(let k=0,n=0;k<40&&n<10;k++){const [x,z,ry]=curb();if(put('c_bench',x,z,.9,{ry:ry+Math.PI}))n++;}
  for(let i=1;i<4;i++)for(let j=1;j<4;j++){if(rng()<.45)continue;const c=[[1,1],[-1,1],[1,-1],[-1,-1]][Math.floor(rng()*4)];put('c_stop',RC[i]+c[0]*4.7,RC[j]+c[1]*4.7,2.4,{ry:Math.atan2(c[0],c[1])});}
  // billboards on three roofs, cash machines against two shop walls
  for(const b of buildings.filter(b=>!b.farm&&b.h>=9&&roomAt(b.cx,b.cz)<0).slice(0,40))if(rng()<.08)put('c_billboard',b.cx+R(-b.w/5,b.w/5),b.cz+R(-b.d/5,b.d/5),5,{free:true,y:.18+b.h+.6,ry:pickR([Math.PI/4,-Math.PI*.75])});
  for(const r of rooms.filter(r=>r.place&&r.place.type!=='farm').slice(0,4)){const [nx,nz]=r.n,[tx,tz]=r.t;put('c_atm',r.dx+nx*.35+tx*2.6,r.dz+nz*.35+tz*2.6,1.6,{ry:Math.atan2(nx,nz)});}
  // a building site in a container yard: scaffolding two modules long and three high, pallets, bricks, barriers
  {let at=null;for(let t=0;t<200&&!at;t++){const [i,j]=t%2?[3,3]:[3,0],x=(RC[i]+RC[i+1])/2+R(-8,8),z=(RC[j]+RC[j+1])/2+R(-8,8);if(roomy(x,z,2.4,1.8)&&!lootSpots.some(s=>Math.abs(s.x-x)<3&&Math.abs(s.z-z)<2.4))at=[x,z];}
    if(at){const [x,z]=at,box={x0:x-2,x1:x+2,z0:z-1.5,z1:z+1.5};solids.push(box);const mesh=part(fallMat,4,6,3,x,.18+3,z);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
      heavy.push({id:null,x,z,ry:0,ex:2,ez:1.5,box,mesh,room:-1,y:.18});   // a solid block drawn by the modules below (its plain box only on "low")
      for(const i of [-.5,.5])for(let lv=0;lv<3;lv++)put('k_scaff',x+i*2,z,2,{free:true,y:.18+lv*2,ry:0,by:'w',shadow:true});
      for(const [dx,dz,id,s] of [[-3.4,2.4,'k_pallet',1.2],[-2.6,3,'k_bricks',.8],[3.2,2.6,'k_planks',1.4],[3.6,-2.2,'k_barrier',1.3],[-3.6,-2.3,'k_roadblock',1.2],[0,3.2,'k_pallet',1.1]])put(id,x+dx,z+dz,s,{by:'w'});}}
  // gas cylinders and fuel cans: by the diner and the shops, in the yards, against walls; a few at the farm
  const spots=[];
  for(const r of rooms){if(r.b.farm)continue;const [nx,nz]=r.n,[tx,tz]=r.t,s=rng()<.5?-1:1,x=r.dx+nx*.6+tx*s*(r.half-.8),z=r.dz+nz*.6+tz*s*(r.half-.8);if(rng()<.55)spots.push([x,z,r.place&&r.place.type==='diner'?'propane':pickR(['propane','gas'])]);}
  for(let k=0;k<16;k++){const b=pickR(buildings.filter(b=>!b.farm));const side=Math.floor(rng()*4),nx=side===0?1:side===1?-1:0,nz=side===2?1:side===3?-1:0,t=R(-.4,.4)*(nx?b.d:b.w);spots.push([b.cx+nx*(b.w/2+.45)+(nz?t:0),b.cz+nz*(b.d/2+.45)+(nx?t:0),rng()<.4?'propane':'gas']);}
  for(const [x,z,kind] of [[-77.6,-9.6,'propane'],[-114.8,-9.8,'propane'],[-91.8,-3.4,'gas'],[-121.6,-3.6,'gas']])spots.push([x,z,kind]);
  let n=0;for(const [x,z,kind] of spots){if(n>=18||Math.abs(x)>66&&x>WALL_X||Math.abs(z)>66||!clear(x,z,.45)||tanks.some(t=>Math.hypot(t.x-x,t.z-z)<6))continue;addTank(x,z,kind);n++;}
  for(const t of tanks)solids.push(t.box);
}
