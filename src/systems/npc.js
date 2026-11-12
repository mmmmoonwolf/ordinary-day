import {rnd,pick,wpick} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {NPC,BANDIT} from '../config/npc.js';
import {DEF} from '../config/items.js';
import {POOLS,MED_W} from '../config/loot.js';
import {isClient} from '../core/bus.js';
import {lootSpots} from '../world/city.js';
import {roomAt,walledOff} from '../world/interiors.js';
import {freeAt,rayWall} from '../world/collision.js';
import {agents,makeAgent} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {moveAgent,lerpAng} from '../entities/movement.js';
import {makeNoise} from '../entities/ai.js';
import {damage} from './damage.js';
import {makeItem,spawnDrop,reachableSpot} from './drops.js';
import {tracer,impact,addBlood} from './effects.js';
import {sfx} from './audio.js';
import {uiFor} from '../ui/hud.js';

// ---------- survivors and bandits (v0.62) ----------
// They are ordinary people (agents in state 'human') with a.npc = 'survivor' | 'bandit', a gun (a.gun, a DEF id), a home
// spot (a.home) and, for a survivor that joined a player, a.lead = that player's id. Host only (updateHuman calls
// updateNpc for them, every step); tracers, shots and blood go to every device like a player's.
const civGuns=()=>POOLS.civ.weapons.filter(id=>DEF[id].gun);
function person(kind,x,z){
  const C=NPC.colors[kind],a=makeAgent(x,z,{shirt:C.shirt,pants:C.pants,skin:pick(['#e0b896','#c99a74','#a87a58','#8a6248']),hair:pick(['#1c1916','#2e2620','#4a3a2a'])});
  Object.assign(a,{npc:kind,hp:NPC.hp,maxHp:NPC.hp,gun:pick(civGuns()),home:{x,z},lead:-1,atk:rnd(0,1),vendor:false});
  agents.push(a);return a;
}
const outdoor=(lo,hi)=>lootSpots.filter(s=>s.zone==='city'&&roomAt(s.x,s.z)<0&&freeAt(s.x,s.z,.6)&&(d=>d>lo&&d<hi)(Math.min(...players.filter(p=>!p.away).map(p=>Math.hypot(s.x-p.pos.x,s.z-p.pos.z)))));
export function placeSurvivors(){
  G.npcPlaced=true;if(isPvp())return 0;const spots=outdoor(NPC.far[0],NPC.far[1]);let n=0;
  for(let k=0;k<NPC.survivors&&spots.length;k++){const s=spots.splice(Math.floor(Math.random()*spots.length),1)[0];person('survivor',s.x,s.z);n++;}
  return n;
}
// a DAILY event (systems/events.js): a group of bandits around a little stash
export function placeBandits(x,z){
  const n=Math.round(rnd(BANDIT.group[0]-.49,BANDIT.group[1]+.49)),out=[];
  for(let k=0;k<n;k++){const t=k/n*6.28,bx=x+Math.sin(t)*2.2,bz=z+Math.cos(t)*2.2;if(!freeAt(bx,bz,.4))continue;out.push(person('bandit',bx,bz));}
  for(let k=0;k<BANDIT.stash;k++){const [sx,sz]=reachableSpot(x+rnd(-1,1),z+rnd(-1,1));spawnDrop(makeItem(k?wpick(MED_W.day):pick(POOLS.civ.ammo)),sx,sz);}
  return out;
}
export function updateNpcs(){if(!isClient()&&G.outbreak&&!G.npcPlaced)placeSurvivors();}
// a person with a gun is hurt. Only systems/damage.js calls this (v0.68): everything else says damage(target, n, hit)
export function hurtNpc(a,dmg,by,dx=0,dz=0){
  if(a.state!=='human')return false;
  a.hp-=dmg;a.hitT=.18;if(by&&by.pos)a.alert={x:by.pos.x,z:by.pos.z,t:10};impact(a.pos.x,a.pos.z,dx,dz,a.hp<=0?1:0,by&&by.state==='player'?by.id:-1,false);
  if(a.hp<=0)fall(a);
  return false;
}
function fall(a){
  a.state='dead';a.deadT=0;a.moving=0;addBlood(a.pos.x,a.pos.z);sfx.scream(a.pos.x,a.pos.z);
  const d=DEF[a.gun];if(d){spawnDrop(makeItem(a.gun),...reachableSpot(a.pos.x+.5,a.pos.z));const it=makeItem(d.ammo);spawnDrop(it,...reachableSpot(a.pos.x-.5,a.pos.z));}
  if(a.npc==='survivor'&&a.lead>=0){const p=players.find(q=>q.id===a.lead);if(p)uiFor(p).feed('ผู้รอดชีวิตตายแล้ว','warn');}
}
// one shot at a target; a miss still flies (tracer) and makes noise
function shoot(a,t,hit,dmg){
  const d=DEF[a.gun],dx=t.pos.x-a.pos.x,dz=t.pos.z-a.pos.z,l=Math.hypot(dx,dz)||1;a.face=Math.atan2(dx,dz);a.moving=0;
  sfx.shot(d.model,a.pos.x,a.pos.z);makeNoise(a.pos.x,a.pos.z,(d.noise||20)*.8);
  const ox=a.pos.x+dx/l*.6,oz=a.pos.z+dz/l*.6,ok=Math.random()<hit,ang=ok?0:rnd(-.25,.25),ux=Math.sin(a.face+ang),uz=Math.cos(a.face+ang),end=Math.min(l,rayWall(ox,oz,ux,uz,l+1));
  tracer(ox,oz,ox+ux*end,oz+uz*end);
  if(!ok||end<l-.6)return;
  // a zombie it shoots for the player it follows learns where that player is; a player it shoots is hurt as by the world (the difficulty scales it)
  damage(t,dmg,{dx:dx/l,dz:dz/l,kb:.2,gun:true,by:t.state!=='player'&&a.lead>=0?players.find(q=>q.id===a.lead)||null:null});
}
const sees=(a,t,r)=>{const d=Math.hypot(t.pos.x-a.pos.x,t.pos.z-a.pos.z);return d<r&&!walledOff(a.pos.x,a.pos.z,t.pos.x,t.pos.z)&&rayWall(a.pos.x,a.pos.z,(t.pos.x-a.pos.x)/(d||1),(t.pos.z-a.pos.z)/(d||1),d)>=d-.3?d:0;};
function nearestZombie(a,r){let best=null,bd=1e9;for(const z of agents){if(z.state!=='zombie'||z.kind==='nest'&&r<9)continue;const d=sees(a,z,r);if(d&&d<bd){bd=d;best=z;}}return best;}
export function updateNpc(a,dt){
  a.atk-=dt;if(a.hitT>0)a.hitT-=dt;
  if(a.npc==='bandit')return bandit(a,dt);
  // a survivor: joins the first player who walks up (while they have room for one), then keeps close to them
  if(a.lead<0){const p=players.find(q=>q.alive&&!q.away&&Math.hypot(q.pos.x-a.pos.x,q.pos.z-a.pos.z)<NPC.tame&&agents.filter(b=>b.npc==='survivor'&&b.state==='human'&&b.lead===q.id).length<NPC.follow);
    if(p){a.lead=p.id;uiFor(p).feed('ผู้รอดชีวิตมาด้วย');}}
  const z=nearestZombie(a,NPC.sight);
  if(z&&a.atk<=0){a.atk=NPC.every*rnd(.85,1.15);shoot(a,z,NPC.hit,NPC.dmg);return;}
  const o=a.lead>=0?players.find(q=>q.id===a.lead):null;
  if(o&&o.alive&&!o.away){const d=Math.hypot(o.pos.x-a.pos.x,o.pos.z-a.pos.z);
    if(d>NPC.lost&&o.car<0){a.pos.x=o.pos.x+rnd(-1.5,1.5);a.pos.z=o.pos.z+rnd(-1.5,1.5);if(!freeAt(a.pos.x,a.pos.z,.34)){a.pos.x=o.pos.x;a.pos.z=o.pos.z;}return;}
    if(d>NPC.keep&&o.car<0){moveAgent(a,o.pos.x-a.pos.x,o.pos.z-a.pos.z,d>8?NPC.run:NPC.walk,dt);return;}}
  if(z)a.face=lerpAng(a.face,Math.atan2(z.pos.x-a.pos.x,z.pos.z-a.pos.z),.2);
  a.moving=0;
}
function bandit(a,dt){
  // the players they can see; anyone who shot them is remembered for a while
  let tgt=null,td=1e9;for(const p of players){if(!p.alive||p.away)continue;const d=sees(a,p,BANDIT.sight);if(d&&d<td){td=d;tgt=p;}}
  if(a.alert){a.alert.t-=dt;if(a.alert.t<=0)a.alert=null;}
  if(tgt){
    if(td<BANDIT.back){moveAgent(a,a.pos.x-tgt.pos.x,a.pos.z-tgt.pos.z,NPC.walk,dt,true);a.face=Math.atan2(tgt.pos.x-a.pos.x,tgt.pos.z-a.pos.z);}
    if(a.atk<=0){a.atk=BANDIT.every*rnd(.85,1.2);shoot(a,tgt,BANDIT.hit,BANDIT.dmg);}
    return;}
  const z=nearestZombie(a,9);if(z&&a.atk<=0){a.atk=BANDIT.every;shoot(a,z,NPC.hit,NPC.dmg);return;}
  if(a.alert){moveAgent(a,a.alert.x-a.pos.x,a.alert.z-a.pos.z,NPC.walk,dt);if(Math.hypot(a.alert.x-a.pos.x,a.alert.z-a.pos.z)<1.5)a.alert=null;return;}
  const h=Math.hypot(a.home.x-a.pos.x,a.home.z-a.pos.z);if(h>4)moveAgent(a,a.home.x-a.pos.x,a.home.z-a.pos.z,NPC.walk,dt);else a.moving=0;
}
