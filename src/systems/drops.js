import {rnd,pick,wpick} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {DEF,gradeOf,itemColor} from '../config/items.js';
import {POOLS,GRADE_W,MED_W,CAT_W} from '../config/loot.js';
import {itemModel} from '../world/item-models.js';
import {lootSpots} from '../world/city.js';

// ---------- loot rolls ----------
export function makeItem(id){const d=DEF[id];if(d.kind==='weapon')return {id,mag:d.gun?Math.floor(rnd(0,d.mag*.6+1)):0};if(d.kind==='ammo')return {id,n:Math.round(rnd(d.find[0],d.find[1]))};if(d.kind==='heal'||d.kind==='revive')return {id,n:1};return {id};}
export function rollLoot(phase,zone,forceGrade){
  const c=forceGrade?(Math.random()<.5?'weapon':'ammo'):wpick(CAT_W[phase]);
  if(c==='bag')return makeItem('backpack');
  if(c==='med')return makeItem(wpick(MED_W[phase]));
  const g=forceGrade||wpick(phase==='day'?GRADE_W.day:(zone==='lot'?GRADE_W.nightLot:GRADE_W.night));
  return makeItem(c==='weapon'?pick(POOLS[g].weapons):pick(POOLS[g].ammo));
}

// ---------- drops on the ground ----------
const ringGeo=new THREE.RingGeometry(.34,.46,24).rotateX(-Math.PI/2);
export const ringMats={};const ringMat=c=>ringMats[c]||(ringMats[c]=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.7,depthWrite:false}));
export const drops=[];
export function spawnDrop(item,x,z,sp){
  const g=new THREE.Group();const m=itemModel(item.id);m.rotation.y=Math.random()*6.28;g.add(m);
  const r=new THREE.Mesh(ringGeo,ringMat(itemColor(item.id)));r.position.y=.015;g.add(r);
  if(gradeOf(item.id)==='mil'){const r2=new THREE.Mesh(ringGeo,ringMat(itemColor(item.id)));r2.scale.setScalar(1.45);r2.position.y=.016;g.add(r2);}
  g.position.set(x,groundY(x,z)+.01,z);scene.add(g);
  const d={item,g,m,x,z,spot:sp||null};drops.push(d);if(sp)sp.drop=d;return d;
}
export function removeDrop(d){scene.remove(d.g);const i=drops.indexOf(d);if(i>=0)drops.splice(i,1);if(d.spot)d.spot.drop=null;}
export function fillDay(chance){for(const s of lootSpots){if(s.drop||s.zone==='police'||s.zone==='military')continue;if(Math.random()<chance)spawnDrop(rollLoot('day',s.zone),s.x,s.z,s);}}
export function fillNight(){for(const s of lootSpots){if(s.drop)continue;
  if(s.zone==='police')spawnDrop(rollLoot('night',s.zone,'pol'),s.x,s.z,s);
  else if(s.zone==='military'){if(Math.random()<.7)spawnDrop(rollLoot('night',s.zone,'mil'),s.x,s.z,s);}
  else if(Math.random()<.4)spawnDrop(rollLoot('night',s.zone),s.x,s.z,s);}}
export function dropGuaranteed(grade,x,z){
  const wid=pick(POOLS[grade].weapons),w=makeItem(wid);w.mag=DEF[wid].gun?DEF[wid].mag:0;
  spawnDrop(w,x+rnd(-.6,.6),z+rnd(-.6,.6));
  const aid=DEF[wid].gun?DEF[wid].ammo:pick(POOLS[grade].ammo);const a=makeItem(aid);a.n=DEF[aid].find[1];spawnDrop(a,x+rnd(-.9,.9),z+rnd(-.9,.9));
}
