import {rnd,pick,wpick} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {G} from '../core/state.js';
import {RC,LIM,RIVER} from '../config/world.js';
import {GOAL_NIGHTS} from '../config/goal.js';
import {POOLS,MED_W,THROW_W} from '../config/loot.js';
import {EVENT_CHANCE,AIRDROP_ITEMS,HORDE,DAILY} from '../config/events.js';
import {breakables} from '../world/props.js';
import {rooms,boxes,roomAt} from '../world/interiors.js';
import {lootSpots} from '../world/city.js';
import {makeNoise} from '../entities/ai.js';
import {dropGuaranteed,removeDrop,drops} from './drops.js';
import {S,part} from '../world/materials.js';
import {solids,freeAt} from '../world/collision.js';
import {agents,makeAgent,becomeZombie} from '../entities/agents.js';
import {nearestPlayerDist,partySize,players} from '../entities/player.js';
import {partyOf} from '../config/party.js';
import {makeItem,spawnDrop,reachableSpot} from './drops.js';
import {sfx} from './audio.js';

// ---------- daily events, from day 2 to the day the army camp opens (v0.8; days 2-7 until v0.46) ----------
// G.plan is drawn once per game (saved with G): each day gets an airdrop, a horde or a blackout, sometimes two.
//   airdrop  (day)   a crate lands at a street corner with Civilian loot around it; walkers wander over to it
//   horde    (night) the radio warns at 19:00, then a pack walks along one main road across the city and leaves
//   blackout (night) street lights and windows go dark until 06:00; only the flashlight is left
// Everything is timed on G.min, so ×2 / ×4 changes nothing.
export function planEvents(){
  const plan=[];
  for(let day=2;day<=GOAL_NIGHTS+1;day++){   // v0.46 through the day the army camp opens
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
  const items=[makeItem(pick(POOLS.civ.weapons)),makeItem(pick(POOLS.civ.ammo)),makeItem(pick(POOLS.civ.ammo)),makeItem(wpick(MED_W.day)),makeItem(wpick(MED_W.day)),makeItem(wpick(THROW_W))].slice(0,AIRDROP_ITEMS);
  for(let k=partyOf(partySize(),'airdrop');k>0;k--)items.push(makeItem(pick([pick(POOLS.civ.ammo),wpick(MED_W.day)])));   // more players, more supplies (v0.10)
  items.forEach((it,k)=>{const a=k/items.length*Math.PI*2,[px,pz]=reachableSpot(x+Math.sin(a)*1.5,z+Math.cos(a)*1.5);spawnDrop(it,px,pz);});
  for(let k=0;k<3;k++){const a=rnd(0,6.28),r=rnd(7,10),wx=x+Math.sin(a)*r,wz=z+Math.cos(a)*r;if(!freeAt(wx,wz,.5))continue;const w=makeAgent(wx,wz);becomeZombie(w,'walker');agents.push(w);}
  sfx.radio();
}
// ---------- horde ----------
// v0.47 count / cap: the PvP mode's bigger hordes (systems/pvp.js)
export function horde(count,cap=HORDE.cap){
  const day=Math.floor(G.min/1440)+1,k2=partyOf(partySize(),'horde'),n=count||Math.round(Math.min(HORDE.max,HORDE.base+day)*k2),ri=1+Math.floor(Math.random()*3),alongX=Math.random()<.5,s=Math.random()<.5?1:-1;
  if(Math.random()<HORDE.bridge){   // v0.25 out of the woods, over the bridge, in through the east gate and across the town
    for(let k=0;k<n&&agents.length<cap;k++){const a=makeAgent(RIVER.x1+12+(k>>1)*1.6,k&1?1.4:-1.4);becomeZombie(a,k%5===4?'boomer':'zombie');a.march={x:-(LIM-1),z:k&1?1.4:-1.4};agents.push(a);}
    sfx.roar(RIVER.x1+10,0,1.6);return;
  }
  for(let k=0;k<n&&agents.length<cap;k++){
    const back=LIM-2-(k>>1)*1.6,side=(k&1?1.4:-1.4);
    const x=alongX?-s*back:RC[ri]+side,z=alongX?RC[ri]+side:-s*back;
    const a=makeAgent(x,z);becomeZombie(a,k%5===4?'boomer':'zombie');a.march=alongX?{x:s*(LIM-1),z:RC[ri]+side}:{x:RC[ri]+side,z:s*(LIM-1)};agents.push(a);
  }
  sfx.roar(alongX?-s*LIM:RC[ri],alongX?RC[ri]:-s*LIM,1.6);
}
// ---------- random events every day (v0.18) ----------
// planDaily(day) adds this day's random events to G.plan; G.site marks a place on the map (a stash, a crashed truck or
// police car) until the next 06:00, G.alarm a car alarm calling zombies, G.fog is the in-game minute it ends at (v0.42 no heat wave).
export function planDaily(day){
  const base=(day-1)*1440,n=day>=DAILY.twoFrom?2:1,used=new Set(),out=[];
  for(let k=0;k<n;k++){
    const w={...DAILY.weights};for(const u of used)delete w[u];const kind=wpick(w);used.add(kind);
    const [a,b]=DAILY.window[kind];out.push({kind,at:base+Math.round(rnd(a,b)),daily:true,done:false,warned:false});
  }
  if(!G.plan)G.plan=[];G.plan.push(...out.filter(e=>e.at>G.min));G.plan.sort((a,b)=>a.at-b.at);
}
const RR=(a,b)=>Math.round(rnd(a-.49,b+.49));
// a free spot on a sidewalk 25-70 m from the nearest player (outside the buildings)
function farSpot(minD=25,maxD=70){
  const c=[];for(let k=0;k<60;k++){const i=Math.floor(Math.random()*5),along=rnd(-60,60),e=(Math.random()<.5?-1:1)*rnd(4.6,6),x=Math.random()<.5?RC[i]+e:along,z=x===along?RC[i]+e:along,d=nearestPlayerDist(x,z);if(d>minD&&d<maxD&&freeAt(x,z,1)&&roomAt(x,z)<0)c.push([x,z]);}
  return c.length?pick(c):null;
}
function guards(x,z,kind){const [a,b]=DAILY.siteZombies;for(let k=RR(a,b);k>0;k--){const t=rnd(0,6.28),r=rnd(4,8),wx=x+Math.sin(t)*r,wz=z+Math.cos(t)*r;if(!freeAt(wx,wz,.5))continue;const w=makeAgent(wx,wz);becomeZombie(w,kind);agents.push(w);}}
function site(kind,items,zkind){
  const s=farSpot();if(!s)return;const [x,z]=s;G.site={kind,x,z,day:Math.floor(G.min/1440)+1};
  items.forEach((it,k)=>{const a=k/items.length*Math.PI*2,[px,pz]=reachableSpot(x+Math.sin(a)*1.2,z+Math.cos(a)*1.2);spawnDrop(it,px,pz);});
  guards(x,z,zkind);sfx.radio();
}
const civ=()=>{const c=wpick({ammo:40,med:30,weapon:15,bag:5,throw:10});return makeItem(c==='ammo'?pick(POOLS.civ.ammo):c==='med'?wpick(MED_W.day):c==='weapon'?pick(POOLS.civ.weapons):c==='bag'?'backpack':wpick(THROW_W));};   // v0.42 no food or planks
const DAILY_RUN={
  alarm(){
    const cars=breakables.filter(b=>b.car&&!b.broken&&!b.car.burned).map(b=>[b,nearestPlayerDist(b.x,b.z)]).filter(([,d])=>d>15&&d<70);if(!cars.length)return;
    const [b]=pick(cars);G.alarm={x:b.x,z:b.z,until:G.min+DAILY.last.alarm,next:G.min};
  },
  stash(){const [a,b]=DAILY.siteItems,items=[];for(let k=RR(a,b);k>0;k--)items.push(civ());site('stash',items,G.phase==='night'?'zombie':'walker');},
  truck(){const items=[];for(let k=RR(5,7);k>0;k--)items.push(makeItem(Math.random()<.6?wpick(MED_W.day):pick(POOLS.civ.ammo)));site('truck',items,'walker');},
  crash(){
    const s=farSpot(30,80);if(!s)return;const [x,z]=s;G.site={kind:'crash',x,z,day:Math.floor(G.min/1440)+1};
    dropGuaranteed('pol',x,z);spawnDrop(makeItem(wpick(MED_W.night)),...reachableSpot(x+1.2,z));guards(x,z,'zombie');   // night only: Police grade stays a night thing
    sfx.explode(x,z);makeNoise(x,z,40);
  },
  fog(){G.fog=G.min+DAILY.last.fog;},
  raid(){
    const list=rooms.map((r,k)=>[r,k]).filter(([r,k])=>!players.some(p=>roomAt(p.pos.x,p.pos.z)===k));if(!list.length)return;
    const [r,k]=pick(list.filter(([r])=>r.place).length&&Math.random()<.7?list.filter(([r])=>r.place):list);
    boxes.forEach((b,i)=>{if(b.room===k&&!G.searched.includes(i))G.searched.push(i);});
    for(let i=drops.length-1;i>=0;i--){const d=drops[i];if(!d.mine&&roomAt(d.x,d.z)===k)removeDrop(d);}
  },
};
const RUN={airdrop,horde:()=>horde(),blackout(){G.blackout=true;},...DAILY_RUN};
export function updateEvents(now){
  for(const e of G.plan||[]){
    if(e.warn&&!e.warned&&G.min>=e.warn&&G.min<e.at){e.warned=true;sfx.radio();}
    if(!e.done&&G.min>=e.at){e.done=true;if(G.min-e.at<120)RUN[e.kind](e);}   // skipped if long past (a save from before it)
  }
  if(G.blackout&&G.phase==='day')G.blackout=false;
  if(G.drop&&G.min>=G.drop.day*1440+6*60){G.drop=null;clearCrate();}   // the crate is gone the next morning; its loot stays
  if(crate)crate.flare.visible=Math.sin(now/200)>0;
  // v0.18: the car alarm keeps calling; the map mark of a site goes at the next 06:00
  if(G.alarm){if(G.min>=G.alarm.until)G.alarm=null;else if(G.min>=G.alarm.next){G.alarm.next=G.min+3;makeNoise(G.alarm.x,G.alarm.z,DAILY.alarmNoise);sfx.carAlarm(G.alarm.x,G.alarm.z);}}
  if(G.site&&G.min>=G.site.day*1440+6*60)G.site=null;
}
// new game / loaded game
export function resetEvents(){clearCrate();planEvents();planDaily(1);}
export function applyEvents(){clearCrate();if(G.drop)makeCrate(G.drop.x,G.drop.z);if(!G.plan)G.plan=[];}
