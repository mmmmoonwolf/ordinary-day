import {rnd,pick,wpick} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {DEF,STACKS,GRADES,gradeOf,itemColor,ringColor} from '../config/items.js';
import {POOLS,GRADE_W,MED_W,CAT_W,FOOD_W,INDOOR_W,TAKEN,FARM_POOL,THROW_W,CAMP_GRADE,AMMO_MATCH,BAG_HELP} from '../config/loot.js';
import {PLACE_W,PLACE_FILL} from '../config/places.js';
import {itemModel} from '../world/item-models.js';
import {lootSpots} from '../world/city.js';
import {freeAt} from '../world/collision.js';
import {walledOff} from '../world/interiors.js';
import {players} from '../entities/player.js';

// ---------- loot rolls ----------
export function makeItem(id){const d=DEF[id];if(d.kind==='weapon')return d.dur?{id,mag:0,dur:Math.round(d.dur*rnd(.4,1))}:{id,mag:d.gun?Math.floor(rnd(0,d.mag*.6+1)):0};if(d.kind==='ammo')return {id,n:Math.round(rnd(d.find[0],d.find[1]))};if(d.kind==='mat')return {id,n:Math.round(rnd(1,2))};if(STACKS.has(d.kind))return {id,n:1};return {id};}
// v0.37 someone still without a backpack, with none lying near them (config/loot.js BAG_HELP); fills check it once
export function needBag(){return players.some(p=>!p.away&&p.alive&&p.gear.cap<DEF.backpack.slots&&!drops.some(d=>d.item.id==='backpack'&&Math.hypot(d.x-p.pos.x,d.z-p.pos.z)<BAG_HELP.near));}
let bagBoost=false;
function catTable(zone,phase){
  const t=(zone==='indoor'?INDOOR_W:CAT_W)[phase];if(!bagBoost)return t;
  return {...t,bag:t.bag?t.bag*BAG_HELP.mult:BAG_HELP.night};
}
// v0.37 an ammo pick from `pool`, more often a calibre someone's gun takes
export function pickAmmo(pool){
  if(Math.random()<AMMO_MATCH){const want=[];for(const p of players){if(p.away||!p.alive)continue;for(const w of [p.gear.eq.primary,p.gear.eq.secondary]){const a=w&&DEF[w.id].ammo;if(a&&pool.includes(a))want.push(a);}}if(want.length)return pick(want);}
  return pick(pool);
}
export function rollLoot(phase,zone,forceGrade){
  const c=forceGrade?(Math.random()<.5?'weapon':'ammo'):wpick(PLACE_W[zone]||catTable(zone,phase));   // v0.17 shops and hospital: their own table
  if(c==='bag')return makeItem('backpack');
  if(c==='med')return makeItem(wpick(MED_W[phase]));
  if(c==='food')return makeItem(wpick(FOOD_W));
  if(c==='mat')return makeItem('planks');
  if(c==='throw')return makeItem(zone==='camp'?'flare':wpick(THROW_W));   // v0.23 sometimes a Molotov or a grenade; v0.26 flares at the camp
  if(zone==='farm'&&(c==='melee'||c==='weapon'))return makeItem(pick(FARM_POOL[c==='melee'?'melee':'weapons']));   // v0.23 farm tools
  const g=forceGrade||wpick(zone==='camp'?CAMP_GRADE:phase==='day'?GRADE_W.day:(zone==='lot'?GRADE_W.nightLot:GRADE_W.night));
  if(c==='melee')return makeItem(pick(POOLS[g].melee||POOLS[g].weapons.filter(id=>!DEF[id].gun)));
  return makeItem(c==='weapon'?pick(POOLS[g].weapons):pickAmmo(POOLS[g].ammo));
}

// ---------- drops on the ground ----------
const ringGeo=new THREE.RingGeometry(.32,.48,24).rotateX(-Math.PI/2);
export const ringMats={};const ringMat=c=>ringMats[c]||(ringMats[c]=new THREE.MeshBasicMaterial({color:new THREE.Color(c).convertSRGBToLinear(),transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));   // full colour, not dimmed by the tone mapping or washed out by the sRGB output (v0.18)
const glowGeo=new THREE.CircleGeometry(.62,24).rotateX(-Math.PI/2);
export const glowMats={};const glowMat=c=>glowMats[c]||(glowMats[c]=new THREE.MeshBasicMaterial({color:new THREE.Color(c).convertSRGBToLinear(),transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));   // a soft disc of light under the ring
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
  const col=ringColor(item.id),r=new THREE.Mesh(ringGeo,ringMat(col));r.position.y=.015;g.add(r);
  const glow=new THREE.Mesh(glowGeo,glowMat(col));glow.position.y=.012;g.add(glow);
  const gr=gradeOf(item.id);if(gr==='pol'||gr==='mil'){const r2=new THREE.Mesh(ringGeo,ringMat(GRADES[gr].color));r2.scale.setScalar(1.4);r2.position.y=.016;g.add(r2);}
  g.position.set(x,groundY(x,z)+.01,z);scene.add(g);
  const d={nid:nid||nextNid++,item,g,m,x,z,spot:sp||null};drops.push(d);if(sp)sp.drop=d;return d;
}
export function removeDrop(d){scene.remove(d.g);const i=drops.indexOf(d);if(i>=0)drops.splice(i,1);if(d.spot)d.spot.drop=null;}
export function fillDay(chance){bagBoost=needBag();for(const s of lootSpots){if(s.drop||s.zone==='police'||s.zone==='military'||s.zone==='ambulance')continue;if(Math.random()<(PLACE_W[s.zone]?Math.min(1,chance*PLACE_FILL):chance))spawnDrop(rollLoot('day',s.zone),s.x,s.z,s);}}
export function fillNight(chance=.4){bagBoost=needBag();for(const s of lootSpots){if(s.drop||s.zone==='ambulance')continue;
  if(s.zone==='police')spawnDrop(rollLoot('night',s.zone,'pol'),s.x,s.z,s);
  else if(s.zone==='military'){if(Math.random()<.7)spawnDrop(rollLoot('night',s.zone,'mil'),s.x,s.z,s);}
  else if(Math.random()<(PLACE_W[s.zone]?Math.min(1,chance*PLACE_FILL):chance))spawnDrop(rollLoot('night',s.zone),s.x,s.z,s);}}
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
