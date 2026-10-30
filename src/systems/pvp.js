import {rnd} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {DEF} from '../config/items.js';
import {PVP} from '../config/pvp.js';
import {inWorld} from '../config/world.js';
import {lootSpots} from '../world/city.js';
import {freeAt} from '../world/collision.js';
import {roomAt} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {EVENTS} from './phases.js';
import {horde} from './events.js';
import {addStack} from './inventory.js';
import {cureInfection} from './infection.js';
import {reset} from './game.js';
import {uiFor} from '../ui/hud.js';

// ---------- PvP mode (v0.47) ----------
// Chosen when the host opens a room (ui/online.js): a new game in the same city with G.mode 'pvp'. Players' guns,
// blows and blasts hurt each other (systems/combat.js), a death counts for whoever landed the last hit (p.frags,
// p.deaths), and the dead come back after PVP.respawn seconds at a random place outdoors away from everyone, with
// all they had. On top of the usual zombies a big horde walks across the town every PVP.horde.every minutes. Nothing is
// saved: the survival game saved before it stays for "continue". All of it runs on the host, in simStep.
export function startPvp(){
  reset();G.mode='pvp';G.min=PVP.start;G.pvpHorde=PVP.horde.first;
  for(const e of EVENTS)if(e.t<G.min)e.done=true;   // no bleeding runner or far scream: it starts at the outbreak
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
    trapT:0,burn:0,swing:0,reloadT:0,vault:null,hop:0,airH:0,helping:null,searching:-1,respawnT:0});
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
  if(G.min>=G.pvpHorde){G.pvpHorde+=PVP.horde.every;horde(RR(PVP.horde.size[0],PVP.horde.size[1]),PVP.horde.cap);}
}
