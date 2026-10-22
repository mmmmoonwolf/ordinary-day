import {rnd,pick,wpick} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {G} from '../core/state.js';
import {RC,LIM} from '../config/world.js';
import {GOAL_NIGHTS} from '../config/goal.js';
import {POOLS,MED_W} from '../config/loot.js';
import {EVENT_CHANCE,AIRDROP_ITEMS,HORDE} from '../config/events.js';
import {S,part} from '../world/materials.js';
import {solids,freeAt} from '../world/collision.js';
import {agents,makeAgent,becomeZombie} from '../entities/agents.js';
import {nearestPlayerDist} from '../entities/player.js';
import {makeItem,spawnDrop,reachableSpot} from './drops.js';
import {sfx} from './audio.js';
import {hhmm,say} from '../ui/hud.js';

// ---------- daily events, days 2-7 (v0.8) ----------
// G.plan is drawn once per game (saved with G): each day gets an airdrop, a horde or a blackout, sometimes two.
//   airdrop  (day)   a crate lands at a street corner with Civilian loot around it; walkers wander over to it
//   horde    (night) the radio warns at 19:00, then a pack walks along one main road across the city and leaves
//   blackout (night) street lights and windows go dark until 06:00; only the flashlight is left
// Everything is timed on G.min, so ×2 / ×4 changes nothing.
export function planEvents(){
  const plan=[];
  for(let day=2;day<=GOAL_NIGHTS;day++){
    const base=(day-1)*1440,n=plan.length;
    if(Math.random()<EVENT_CHANCE.airdrop)plan.push({kind:'airdrop',at:base+Math.round(rnd(10*60,15*60))});
    if(day>=3&&Math.random()<EVENT_CHANCE.horde){const at=base+Math.round(rnd(21*60,23*60+30));plan.push({kind:'horde',at,warn:base+19*60});}
    else if(Math.random()<EVENT_CHANCE.blackout)plan.push({kind:'blackout',at:base+19*60});
    if(plan.length===n)plan.push({kind:'airdrop',at:base+Math.round(rnd(10*60,15*60))});   // never an empty day
  }
  G.plan=plan.sort((a,b)=>a.at-b.at).map(e=>Object.assign(e,{done:false,warned:false}));
}
// ---------- airdrop ----------
const crateMat=S({color:'#5a6640',roughness:.8}),strapMat=S({color:'#2b2d22'}),flareMat=S({color:'#ff5a3c',emissive:'#ff3a1c',emissiveIntensity:2});
let crate=null;
function makeCrate(x,z){
  const g=new THREE.Group();g.add(part(crateMat,1.2,.9,1.2,0,.63,0),part(strapMat,1.24,.08,.2,0,.63,0),part(strapMat,.2,.08,1.24,0,1.08,0));
  const flare=part(flareMat,.14,.14,.14,.5,1.15,.5);g.add(flare);g.position.set(x,0,z);scene.add(g);
  const box={x0:x-.6,x1:x+.6,z0:z-.6,z1:z+.6};solids.push(box);crate={g,box,flare};
}
export function clearCrate(){if(!crate)return;scene.remove(crate.g);const i=solids.indexOf(crate.box);if(i>=0)solids.splice(i,1);crate=null;}
function airdrop(){
  // a street corner 20-70 m from the nearest player
  const spots=[];for(let i=1;i<4;i++)for(let j=1;j<4;j++){const x=RC[i]+rnd(-2,2),z=RC[j]+rnd(-2,2),d=nearestPlayerDist(x,z);if(d>20&&d<70&&freeAt(x,z,1.2))spots.push([x,z]);}
  if(!spots.length)return;
  const [x,z]=pick(spots);makeCrate(x,z);G.drop={x,z,day:Math.floor(G.min/1440)+1};
  // daytime loot only: Police / Military grades stay night-only (confirmed rule)
  const items=[makeItem(pick(POOLS.civ.weapons)),makeItem(pick(POOLS.civ.ammo)),makeItem(pick(POOLS.civ.ammo)),makeItem(wpick(MED_W.day)),makeItem('canned'),makeItem('water')].slice(0,AIRDROP_ITEMS);
  items.forEach((it,k)=>{const a=k/items.length*Math.PI*2,[px,pz]=reachableSpot(x+Math.sin(a)*1.5,z+Math.cos(a)*1.5);spawnDrop(it,px,pz);});
  for(let k=0;k<3;k++){const a=rnd(0,6.28),r=rnd(7,10),wx=x+Math.sin(a)*r,wz=z+Math.cos(a)*r;if(!freeAt(wx,wz,.5))continue;const w=makeAgent(wx,wz);becomeZombie(w,'walker');agents.push(w);}
  sfx.radio();say('วิทยุ: เครื่องบินทิ้งเสบียงลงกลางถนน ดูจุดเขียวบนแผนที่ แต่ระวัง ซอมบี้ก็ได้ยินเสียงร่ม','radio',8);
}
// ---------- horde ----------
function horde(){
  const day=Math.floor(G.min/1440)+1,n=Math.min(HORDE.max,HORDE.base+day),ri=1+Math.floor(Math.random()*3),alongX=Math.random()<.5,s=Math.random()<.5?1:-1;
  for(let k=0;k<n&&agents.length<HORDE.cap;k++){
    const back=LIM-2-(k>>1)*1.6,side=(k&1?1.4:-1.4);
    const x=alongX?-s*back:RC[ri]+side,z=alongX?RC[ri]+side:-s*back;
    const a=makeAgent(x,z);becomeZombie(a,k%5===4?'boomer':'zombie');a.march=alongX?{x:s*(LIM-1),z:RC[ri]+side}:{x:RC[ri]+side,z:s*(LIM-1)};agents.push(a);
  }
  sfx.roar(alongX?-s*LIM:RC[ri],alongX?RC[ri]:-s*LIM,1.6);say('ฝูงซอมบี้เข้าเมืองแล้ว! หลบให้พ้นถนนใหญ่','alarm',6);
}
const RUN={airdrop,horde,blackout(){G.blackout=true;say('ไฟฟ้าดับทั้งเมือง คืนนี้มืดกว่าปกติ เหลือแค่ไฟฉาย','night',7);}};
export function updateEvents(now){
  for(const e of G.plan||[]){
    if(e.warn&&!e.warned&&G.min>=e.warn&&G.min<e.at){e.warned=true;sfx.radio();say('วิทยุ: ฝูงซอมบี้กำลังเคลื่อนผ่านเมืองคืนนี้ ราว '+hhmm(e.at)+' หลบให้พ้นถนนใหญ่','radio',8);}
    if(!e.done&&G.min>=e.at){e.done=true;if(G.min-e.at<120)RUN[e.kind](e);}   // skipped if long past (a save from before it)
  }
  if(G.blackout&&G.phase==='day')G.blackout=false;
  if(G.drop&&G.min>=G.drop.day*1440+6*60){G.drop=null;clearCrate();}   // the crate is gone the next morning; its loot stays
  if(crate)crate.flare.visible=Math.sin(now/200)>0;
}
// new game / loaded game
export function resetEvents(){clearCrate();planEvents();}
export function applyEvents(){clearCrate();if(G.drop)makeCrate(G.drop.x,G.drop.z);if(!G.plan)G.plan=[];}
