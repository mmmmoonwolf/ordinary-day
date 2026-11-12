import {$,rnd,pick,wpick} from '../core/util.js';
import {G,isPvp,pvpRule,sideOf} from '../core/state.js';
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
import {OUTBREAK} from '../config/act.js';
import {uiFor,gameOver} from '../ui/hud.js';

// ---------- PvP mode (v0.47) ----------
// Chosen when the host opens a room (ui/online.js): a new game in the same city with G.mode 'pvp'. Players' guns,
// blows and blasts hurt each other (systems/combat.js), a death counts for whoever landed the last hit (p.frags,
// p.deaths), and the dead come back after PVP.respawn seconds at a random place outdoors away from everyone, with
// all they had. On top of the usual zombies a big horde walks across the town every PVP.horde.every minutes. Nothing is
// saved: the survival game saved before it stays for "continue". All of it runs on the host, in simStep.
export const RULES={ffa:'ทุกคนฆ่ากัน',team:'ทีม',infect:'ติดเชื้อ',hill:'ยึดพื้นที่'};   // v0.51
export function startPvp(rule){
  const r=RULES[rule]?rule:RULES[G.pvpRule]?G.pvpRule:'ffa';
  reset();G.mode='pvp';G.dog=null;G.pvpRule=r;G.min=OUTBREAK+PVP.start;G.pvpHorde=OUTBREAK+PVP.horde.first;G.pvpDrop=OUTBREAK+PVP.drop.first;G.pvpT=0;G.hill=null;G.hillMove=0;G.pvpEnd=null;
  for(const e of EVENTS)if(e.t<G.min)e.done=true;   // no bleeding runner or far scream: it starts at the outbreak
  for(const d of drops.slice())if(d.item.id==='resurrect')removeDrop(d);   // v0.49 no Resurrection Kit: dying costs nothing to undo
}
// ---------- rounds (v0.49) ----------
// first to PVP.round.kills kills, or the most after PVP.round.minutes: the end screen shows who won (ui/hud.js), and
// the host starts the next round PVP.round.gap seconds later (or at once with "เล่นอีกครั้ง")
export const leaders=()=>players.filter(p=>!p.away).sort((a,b)=>(b.frags||0)-(a.frags||0)||(a.deaths||0)-(b.deaths||0));
// what a round is played to under each rule, and how far the leading player (or team) is
export const goalOf=()=>pvpRule()==='team'?PVP.team.kills:pvpRule()==='hill'?PVP.hill.points:PVP.round.kills;
export const teamScore=t=>players.filter(p=>!p.away&&(p.team||0)===t).reduce((s,p)=>s+(p.frags||0),0);
// v0.51 the result as everyone's end screen shows it (G.pvpEnd goes out with the snapshot)
function result(timeUp){
  const r=pvpRule(),L=leaders(),top=L[0],tie=L[1]&&(L[1].frags||0)===((top&&top.frags)||0),why=timeUp?'หมดเวลา':'ทำครบ '+goalOf()+' ก่อน';
  if(r==='team'){const a=teamScore(0),b=teamScore(1);return {title:a===b?'เสมอ':(a>b?'ทีมแดง':'ทีมน้ำเงิน')+'ชนะ',cause:why+' · แดง '+a+' : น้ำเงิน '+b};}
  if(r==='infect'){const humans=players.filter(p=>!p.away&&!p.zed).length;return humans?{title:'มนุษย์รอด',cause:'รอดครบ '+PVP.infect.minutes+' นาที · เหลือ '+humans+' คน'}:{title:'ซอมบี้ชนะ',cause:'ทุกคนกลายเป็นซอมบี้'};}
  return {title:tie?'เสมอ':(top?top.name:'')+' ชนะ',cause:why,win:tie||!top?-1:top.id};
}
function endRound(timeUp){
  G.pvpEnd=result(timeUp);G.endCause='pvp';sfx.win();gameOver();
  setTimeout(()=>{if(G.over&&isPvp()&&!isClient())nextRound();},PVP.round.gap*1000);
}
export function nextRound(){startPvp();G.running=true;const o=$('overlay');if(o)o.hidden=true;}
// ---------- infection (v0.51) ----------
// one player starts as a zombie (claws, faster, more HP, ignored by the other zombies); whoever a zombie player kills
// comes back as one; the people win by lasting PVP.infect.minutes
function infection(here){
  if(here.length<2||here.some(p=>p.zed))return;
  const pick=here.filter(p=>p.alive);if(!pick.length)return;
  makeZed(pick[Math.floor(Math.random()*pick.length)]);
}
export function makeZed(p){
  p.zed=true;p.maxHp=PVP.infect.hp;p.hp=p.maxHp;p.car=-1;sfx.zscream?sfx.zscream(p.pos.x,p.pos.z):sfx.scream(p.pos.x,p.pos.z);
  for(const q of players)if(!q.away)uiFor(q).feed(p.name+' กลายเป็นซอมบี้','warn');uiFor(p).updateLoadout(true);
}
// ---------- king of the hill (v0.51) ----------
// a ring somewhere outdoors near the players, moving every PVP.hill.move s; one player alone in it scores a point every
// PVP.hill.every s (two or more inside: nobody scores)
function hill(here,dt){
  const H=PVP.hill;
  if(!G.hill||G.pvpT>=G.hillMove){G.hillMove=G.pvpT+H.move;const alive=here.filter(p=>p.alive);
    const cx=alive.reduce((s,p)=>s+p.pos.x,0)/(alive.length||1),cz=alive.reduce((s,p)=>s+p.pos.z,0)/(alive.length||1);
    const spots=lootSpots.filter(s=>roomAt(s.x,s.z)<0&&freeAt(s.x,s.z,1)&&Math.hypot(s.x-cx,s.z-cz)<70&&(!G.hill||Math.hypot(s.x-G.hill.x,s.z-G.hill.z)>25));
    const s=spots.length?spots[Math.floor(Math.random()*spots.length)]:lootSpots[Math.floor(Math.random()*lootSpots.length)];
    G.hill={x:Math.round(s.x*10)/10,z:Math.round(s.z*10)/10};sfx.radio();}
  const inside=here.filter(p=>p.alive&&Math.hypot(p.pos.x-G.hill.x,p.pos.z-G.hill.z)<H.r);
  if(inside.length!==1)return;
  const p=inside[0];p.hillT=(p.hillT||0)+dt;if(p.hillT>=H.every){p.hillT-=H.every;p.frags=(p.frags||0)+1;}
}
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
    trapT:0,burn:0,swing:0,reloadT:0,vault:null,hop:0,airH:0,roof:-1,helping:null,searching:-1,respawnT:0,shield:true});
  if(p.zedNext){p.zedNext=false;makeZed(p);}   // v0.51 killed by a zombie player: back as one   // v0.49 shield: the untouchable time ends at their first attack
  cureInfection(p);if(p.local)G.endCause=null;
  place(p);uiFor(p).updateLoadout(true);
}
// host, every step while the game runs
export function updatePvp(dt){
  if(!isPvp())return;
  for(const p of players){
    if(!p.pvpIn){p.pvpIn=true;p.team=p.id%2;arm(p);if(p.alive)place(p);}   // v0.51 teams by player number
    if(!p.alive&&!p.away&&(p.respawnT-=dt)<=0)respawn(p);
  }
  const H=PVP.horde,n=players.filter(p=>!p.away).length;
  if(G.min>=G.pvpHorde){G.pvpHorde+=H.every;horde(RR(H.size[0],H.size[1])+H.perPlayer*n,H.cap);}   // v0.49 bigger with more players
  if(G.outbreak&&G.min>=G.pvpDrop){G.pvpDrop+=PVP.drop.every;airdrop(crate);}
  G.pvpT+=dt;const L=leaders(),top=L[0],B=PVP.bounty,r=pvpRule(),here=players.filter(p=>!p.away);
  for(const p of players)p.bounty=r!=='team'&&r!=='infect'&&p===top&&(top.frags||0)>=B.min&&(top.frags||0)-((L[1]&&L[1].frags)||0)>=B.lead;   // v0.51 a price on the leader's head
  if(r==='infect')infection(here);else if(r==='hill')hill(here,dt);
  if(G.over||!top)return;
  const timeUp=G.pvpT>=(r==='infect'?PVP.infect.minutes:PVP.round.minutes)*60;
  const done=r==='team'?Math.max(teamScore(0),teamScore(1))>=PVP.team.kills:r==='infect'?here.length>1&&here.every(p=>p.zed):(top.frags||0)>=goalOf();
  if(done||timeUp)endRound(timeUp&&!done);
}
