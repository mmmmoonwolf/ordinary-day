import {$,rnd,pick,wpick} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {DEF} from '../config/items.js';
import {POOLS,MED_W,THROW_W} from '../config/loot.js';
import {isClient} from '../core/bus.js';
import {PVP} from '../config/pvp.js';
import {inWorld} from '../config/world.js';
import {lootSpots} from '../world/city.js';
import {freeAt} from '../world/collision.js';
import {roomAt} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {EVENTS} from './phases.js';
import {horde,airdrop} from './events.js';
import {drops,removeDrop,makeItem} from './drops.js';
import {sfx} from './audio.js';
import {addStack} from './inventory.js';
import {cureInfection} from './infection.js';
import {reset} from './game.js';
import {uiFor,gameOver} from '../ui/hud.js';

// ---------- PvP mode (v0.47) ----------
// Chosen when the host opens a room (ui/online.js): a new game in the same city with G.mode 'pvp'. Players' guns,
// blows and blasts hurt each other (systems/combat.js), a death counts for whoever landed the last hit (p.frags,
// p.deaths), and the dead come back after PVP.respawn seconds at a random place outdoors away from everyone, with
// all they had. On top of the usual zombies a big horde walks across the town every PVP.horde.every minutes. Nothing is
// saved: the survival game saved before it stays for "continue". All of it runs on the host, in simStep.
export function startPvp(){
  reset();G.mode='pvp';G.min=PVP.start;G.pvpHorde=PVP.horde.first;G.pvpDrop=PVP.drop.first;G.pvpT=0;
  for(const e of EVENTS)if(e.t<G.min)e.done=true;   // no bleeding runner or far scream: it starts at the outbreak
  for(const d of drops.slice())if(d.item.id==='resurrect')removeDrop(d);   // v0.49 no Resurrection Kit: dying costs nothing to undo
}
// ---------- rounds (v0.49) ----------
// first to PVP.round.kills kills, or the most after PVP.round.minutes: the end screen shows who won (ui/hud.js), and
// the host starts the next round PVP.round.gap seconds later (or at once with "เล่นอีกครั้ง")
export const leaders=()=>players.filter(p=>!p.away).sort((a,b)=>(b.frags||0)-(a.frags||0)||(a.deaths||0)-(b.deaths||0));
function endRound(){
  G.endCause='pvp';sfx.win();gameOver();
  setTimeout(()=>{if(G.over&&isPvp()&&!isClient())nextRound();},PVP.round.gap*1000);
}
export function nextRound(){startPvp();G.running=true;const o=$('overlay');if(o)o.hidden=true;}
// ---------- the supply crate (v0.49) ----------
// a crate at a street corner now and then (the airdrop of systems/events.js), the flare and the radio calling everyone
// to it: Military gear at night; by day Civilian guns with plenty of ammo, medicine and things to throw (Police and
// Military grades stay night-only, the confirmed loot rule)
function crate(){
  const night=G.phase==='night',P=night?POOLS.mil:POOLS.civ,ammo=()=>{const it=makeItem(pick(P.ammo));it.n=Math.max(it.n||0,DEF[it.id].find[1]);return it;};
  return [makeItem(pick(P.weapons.filter(id=>DEF[id].gun))),ammo(),ammo(),ammo(),makeItem(wpick(MED_W[G.phase])),makeItem(wpick(MED_W[G.phase])),makeItem(wpick(THROW_W)),makeItem(wpick(THROW_W))];
}
const RR=(a,b)=>Math.round(rnd(a-.49,b+.49));
// somewhere outdoors, PVP.far to PVP.near from the nearest other player still alive and at least PVP.zFar from any
// zombie; the best place found when nowhere fits
export function spawnPoint(p){
  const spots=lootSpots.filter(s=>roomAt(s.x,s.z)<0&&inWorld(s.x,s.z,1));
  let best=null,bs=-1;
  for(let k=0;k<120&&spots.length;k++){
    const s=spots[Math.floor(Math.random()*spots.length)],x=s.x+rnd(-1,1),z=s.z+rnd(-1,1);if(!freeAt(x,z,.45))continue;
    let dp=1e9,dz=1e9;
    for(const q of players)if(q!==p&&q.alive&&!q.away)dp=Math.min(dp,Math.hypot(q.pos.x-x,q.pos.z-z));
    for(const a of agents)if(a.state==='zombie')dz=Math.min(dz,Math.hypot(a.pos.x-x,a.pos.z-z));
    const sc=Math.min(dp/PVP.far,dz/PVP.zFar,dp>PVP.near?PVP.near/dp:1);   // 1 or more: fits
    if(sc>=1)return [x,z];if(sc>bs){bs=sc;best=[x,z];}
  }
  return best||[p.pos.x,p.pos.z];
}
function place(p){const [x,z]=spawnPoint(p);p.pos.x=x;p.pos.z=z;p.room=-1;}
// the starting gun and ammo, once per player per game (a friend joining later gets it too)
function arm(p){
  const g=p.gear,K=PVP.kit;
  if(!g.eq.primary&&!g.eq.secondary){g.eq.secondary={id:K.gun,mag:DEF[K.gun].mag};g.active='secondary';}
  addStack(p,K.ammo[0],K.ammo[1]);uiFor(p).updateLoadout(true);
}
export function respawn(p){
  Object.assign(p,{alive:true,state:'player',deadT:0,hp:p.maxHp,bleed:0,down:0,inv:PVP.inv,endCause:null,lastHit:performance.now()/1000,
    trapT:0,burn:0,swing:0,reloadT:0,vault:null,hop:0,airH:0,helping:null,searching:-1,respawnT:0,shield:true});   // v0.49 shield: the untouchable time ends at their first attack
  cureInfection(p);if(p.local)G.endCause=null;
  place(p);uiFor(p).updateLoadout(true);
}
// host, every step while the game runs
export function updatePvp(dt){
  if(!isPvp())return;
  for(const p of players){
    if(!p.pvpIn){p.pvpIn=true;arm(p);if(p.alive)place(p);}
    if(!p.alive&&!p.away&&(p.respawnT-=dt)<=0)respawn(p);
  }
  const H=PVP.horde,n=players.filter(p=>!p.away).length;
  if(G.min>=G.pvpHorde){G.pvpHorde+=H.every;horde(RR(H.size[0],H.size[1])+H.perPlayer*n,H.cap);}   // v0.49 bigger with more players
  if(G.outbreak&&G.min>=G.pvpDrop){G.pvpDrop+=PVP.drop.every;airdrop(crate);}
  G.pvpT+=dt;const top=leaders()[0];
  if(!G.over&&top&&((top.frags||0)>=PVP.round.kills||G.pvpT>=PVP.round.minutes*60))endRound();
}
