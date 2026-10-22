import {rnd,pick,wpick} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {DEF,STACKS,gradeOf,itemColor} from '../config/items.js';
import {POOLS,GRADE_W,MED_W,CAT_W,FOOD_W,INDOOR_W,TAKEN} from '../config/loot.js';
import {itemModel} from '../world/item-models.js';
import {lootSpots} from '../world/city.js';
import {freeAt} from '../world/collision.js';
import {walledOff} from '../world/interiors.js';
import {players} from '../entities/player.js';

// ---------- loot rolls ----------
export function makeItem(id){const d=DEF[id];if(d.kind==='weapon')return d.dur?{id,mag:0,dur:Math.round(d.dur*rnd(.4,1))}:{id,mag:d.gun?Math.floor(rnd(0,d.mag*.6+1)):0};if(d.kind==='ammo')return {id,n:Math.round(rnd(d.find[0],d.find[1]))};if(d.kind==='mat')return {id,n:Math.round(rnd(1,2))};if(STACKS.has(d.kind))return {id,n:1};return {id};}
export function rollLoot(phase,zone,forceGrade){
  const c=forceGrade?(Math.random()<.5?'weapon':'ammo'):wpick((zone==='indoor'?INDOOR_W:CAT_W)[phase]);
  if(c==='bag')return makeItem('backpack');
  if(c==='med')return makeItem(wpick(MED_W[phase]));
  if(c==='food')return makeItem(wpick(FOOD_W));
  if(c==='mat')return makeItem('planks');
  if(c==='throw')return makeItem('bottle');
  const g=forceGrade||wpick(phase==='day'?GRADE_W.day:(zone==='lot'?GRADE_W.nightLot:GRADE_W.night));
  return makeItem(c==='weapon'?pick(POOLS[g].weapons):pick(POOLS[g].ammo));
}

// ---------- drops on the ground ----------
const ringGeo=new THREE.RingGeometry(.34,.46,24).rotateX(-Math.PI/2);
export const ringMats={};const ringMat=c=>ringMats[c]||(ringMats[c]=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.7,depthWrite:false}));
export const drops=[];
// the nearest spot to (x,z) the player can stand on, on the same side of any wall: a drop that lands in a car,
// a wall or furniture would be out of reach (v0.6.1)
export function reachableSpot(x,z){
  if(freeAt(x,z,.3))return [x,z];
  for(let r=.3;r<=2.4;r+=.3)for(let a=0;a<12;a++){const px=x+Math.sin(a*Math.PI/6)*r,pz=z+Math.cos(a*Math.PI/6)*r;if(freeAt(px,pz,.3)&&!walledOff(x,z,px,pz))return [px,pz];}
  return [x,z];
}
// nid names the same drop on every device (v0.12); a client passes the host's
let nextNid=1;
export function spawnDrop(item,x,z,sp,nid){
  if(!sp)[x,z]=reachableSpot(x,z);
  const g=new THREE.Group();const m=itemModel(item.id);m.rotation.y=Math.random()*6.28;g.add(m);
  const r=new THREE.Mesh(ringGeo,ringMat(itemColor(item.id)));r.position.y=.015;g.add(r);
  if(gradeOf(item.id)==='mil'){const r2=new THREE.Mesh(ringGeo,ringMat(itemColor(item.id)));r2.scale.setScalar(1.45);r2.position.y=.016;g.add(r2);}
  g.position.set(x,groundY(x,z)+.01,z);scene.add(g);
  const d={nid:nid||nextNid++,item,g,m,x,z,spot:sp||null};drops.push(d);if(sp)sp.drop=d;return d;
}
export function removeDrop(d){scene.remove(d.g);const i=drops.indexOf(d);if(i>=0)drops.splice(i,1);if(d.spot)d.spot.drop=null;}
export function fillDay(chance){for(const s of lootSpots){if(s.drop||s.zone==='police'||s.zone==='military'||s.zone==='ambulance')continue;if(Math.random()<chance)spawnDrop(rollLoot('day',s.zone),s.x,s.z,s);}}
export function fillNight(chance=.4){for(const s of lootSpots){if(s.drop||s.zone==='ambulance')continue;
  if(s.zone==='police')spawnDrop(rollLoot('night',s.zone,'pol'),s.x,s.z,s);
  else if(s.zone==='military'){if(Math.random()<.7)spawnDrop(rollLoot('night',s.zone,'mil'),s.x,s.z,s);}
  else if(Math.random()<chance)spawnDrop(rollLoot('night',s.zone),s.x,s.z,s);}}
// 06:00: other survivors clear some of the loot lying far from every player (v0.7); returns how many went
const KEEP=new Set(['police','military','ambulance']);
export function takeByOthers(near){
  let n=0;
  for(let i=drops.length-1;i>=0;i--){const d=drops[i];if(d.mine||(d.spot&&KEEP.has(d.spot.zone))||near.some(p=>Math.hypot(d.x-p.pos.x,d.z-p.pos.z)<TAKEN.minDist))continue;if(Math.random()<TAKEN.chance){removeDrop(d);n++;}}
  return n;
}
export function dropGuaranteed(grade,x,z){
  const wid=pick(POOLS[grade].weapons),w=makeItem(wid);w.mag=DEF[wid].gun?DEF[wid].mag:0;if(DEF[wid].dur)w.dur=DEF[wid].dur;
  spawnDrop(w,x+rnd(-.6,.6),z+rnd(-.6,.6));
  const aid=DEF[wid].gun?DEF[wid].ammo:pick(POOLS[grade].ammo);const a=makeItem(aid);a.n=DEF[aid].find[1];spawnDrop(a,x+rnd(-.9,.9),z+rnd(-.9,.9));
}
// the prop models arrived or the graphics quality changed (v0.14): rebuild what lies on the ground; held weapons follow
// in syncHeld()
export function refreshItems(){
  for(const d of drops){const m=itemModel(d.item.id);m.rotation.y=d.m.rotation.y;d.g.remove(d.m);d.g.add(m);d.m=m;}
  for(const p of players)p.heldId=null;
}
