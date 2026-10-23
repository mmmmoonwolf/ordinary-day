import {G} from '../core/state.js';
import {DEF} from '../config/items.js';
import {ZC} from '../config/zombies.js';
import {agents,makeAgent,becomeZombie,setKind,removeAgent} from '../entities/agents.js';
import {players,player,setPlayer,makePlayer} from '../entities/player.js';
import {drops,spawnDrop,removeDrop} from '../systems/drops.js';
import {curWeapon,freshGear} from '../systems/inventory.js';
import {applyDoors} from '../systems/doors.js';
import {applyBroken,restoreObstacles} from '../systems/obstacles.js';
import {applyEvents} from '../systems/events.js';

// ---------- world snapshot (v0.12) ----------
// The host sends each client what it needs to draw the world about 15 times a second; the client keeps no game
// logic of its own. Positions are rounded to 1 cm. Per client the host remembers what it already sent (`c`), so
// looks of new characters, doors, broken obstacles, loot and the client's own gear only go out when they change.
const ST=['human','infected','zombie','dead'];
const r2=v=>Math.round((v||0)*100)/100;
export function freshSent(){return {seen:new Set(),doors:'',broken:-1,drops:'',gear:'',drop:'',searched:''};}
export function encodeWorld(c,me){
  const s={t:'s',g:{min:r2(G.min),ph:G.phase,rt:G.rainTarget,ob:G.outbreak,bo:G.blackout,ov:G.over,k:G.kills,kb:G.killsBy,df:G.diff,ec:G.endCause,fg:G.fog,ht:G.heat,st:G.site}};   // fog / heat / event site (v0.18)
  const dj=JSON.stringify(G.doors);if(dj!==c.doors){c.doors=dj;s.doors=G.doors;}
  const sj=G.searched.join();if(sj!==c.searched){c.searched=sj;s.sr=G.searched;}   // v0.15
  if(G.broken.length!==c.broken){c.broken=G.broken.length;s.broken=G.broken;}
  const dr=JSON.stringify(G.drop);if(dr!==c.drop){c.drop=dr;s.crate=G.drop||0;}
  s.pl=players.map(p=>[p.id,r2(p.pos.x),r2(p.pos.z),r2(p.face),Math.ceil(p.hp),p.alive?1:0,r2(p.bleed),r2(p.down),r2(p.moving),curWeapon(p).id,
    p.sneak?1:0,r2(p.reloadT),r2(p.swing),r2(p.swingDur),r2(p.recoil),p.inv>0?1:0,p.away?1:0,r2(p.reviveT)]);
  const gj=JSON.stringify(me.gear);
  s.me={id:me.id,inf:r2(me.infect),fo:r2(me.food),wa:r2(me.water),ec:me.endCause,near:me.near?me.near.nid:0,full:me.full?me.full.nid:0,
    nd:me.nearDoor,fd:me.fixDoor,dn:me.nearDown?me.nearDown.id:-1,hp:me.helping?me.helping.id:-1,ht:r2(me.helpT),starv:me.starving?1:0,nb:me.nearBox,sb:me.searching,st:r2(me.searchT)};
  if(gj!==c.gear){c.gear=gj;s.me.gear=me.gear;}
  s.ag=[];s.nw=[];
  for(const a of agents){
    if(a.gone)continue;
    s.ag.push([a.nid,ST.indexOf(a.state),a.kind||0,r2(a.pos.x),r2(a.pos.z),r2(a.face),r2(a.moving),a.state==='zombie'?Math.ceil(a.hp):0,r2(a.fuse),r2(a.wind),a.hitT>0?1:0,a.panic>0?1:0]);
    if(!c.seen.has(a.nid)){c.seen.add(a.nid);s.nw.push([a.nid,a.look]);}
  }
  const key=drops.map(d=>d.nid).join(',');if(key!==c.drops){c.drops=key;s.dr=drops.map(d=>[d.nid,d.item,r2(d.x),r2(d.z)]);}
  return s;
}

// ---------- on the client ----------
const byNid=new Map(),looks=new Map(),dropByNid=new Map();
export function clearClientMaps(){byNid.clear();looks.clear();dropByNid.clear();}
export function dropOf(nid){return dropByNid.get(nid)||null;}
const want=(a,x,z)=>{a.nx=x;a.nz=z;if(!(Math.hypot(x-a.pos.x,z-a.pos.z)<4)){a.pos.x=x;a.pos.z=z;}};   // far off (new, or a jump): no sliding
export function applyWorld(s,myId){
  const g=s.g;Object.assign(G,{min:g.min,phase:g.ph,rainTarget:g.rt,outbreak:g.ob,blackout:g.bo,kills:g.k,killsBy:g.kb||{},diff:g.df,fog:g.fg||0,heat:g.ht||0,site:g.st||null});
  if(s.doors)applyDoors(s.doors);
  if(s.sr)G.searched=s.sr.slice();
  if(s.broken){if(s.broken.length<G.broken.length){restoreObstacles();G.broken=[];}applyBroken(s.broken);G.broken=s.broken.slice();}
  if(s.crate!==undefined){G.drop=s.crate||null;applyEvents();}
  // players: the same ids as on the host; this device's one is `myId`
  const ids=new Set();
  for(const r of s.pl){
    const [id,x,z,face,hp,alive,bleed,down,moving,w,sneak,reloadT,swing,swingDur,recoil,inv,away,reviveT]=r;ids.add(id);
    let p=players.find(q=>q.id===id);
    if(!p){p=makePlayer(id);players.push(p);players.sort((a,b)=>a.id-b.id);}
    if(id===myId&&player!==p){p.local=true;setPlayer(p);}
    want(p,x,z);p.nface=face;Object.assign(p,{hp,bleed,down,moving,sneak:!!sneak,reloadT,swing,swingDur,recoil,inv:inv?.5:0,away:!!away,reviveT});
    if(!alive&&p.alive){p.alive=false;p.state='dead';p.deadT=0;}else if(alive&&!p.alive){p.alive=true;p.state='player';p.deadT=0;}
    if(p!==player||!s.me||!s.me.gear){if(p!==player){const d=DEF[w];p.gear=freshGear();if(d&&d.slot){p.gear.eq[d.slot]={id:w,mag:0};p.gear.active=d.slot;}}}
  }
  for(let i=players.length-1;i>=0;i--)if(!ids.has(players[i].id)){removeAgent(players[i]);players.splice(i,1);}
  // loot on the ground
  if(s.dr){
    const keep=new Set(s.dr.map(d=>d[0]));
    for(const d of drops.slice())if(!keep.has(d.nid)){dropByNid.delete(d.nid);removeDrop(d);}
    for(const [nid,item,x,z] of s.dr)if(!dropByNid.has(nid)&&DEF[item.id])dropByNid.set(nid,spawnDrop(item,x,z,{},nid));
  }
  // this device's player: gear, what is in reach, needs (the HUD, bag and buttons read them as usual)
  const me=s.me;
  if(me&&player){
    if(me.gear)player.gear=me.gear;
    Object.assign(player,{infect:me.inf,food:me.fo,water:me.wa,endCause:me.ec,starving:!!me.starv,nearDoor:me.nd,fixDoor:me.fd,helpT:me.ht,nearBox:me.nb??-1,searching:me.sb??-1,searchT:me.st||0,
      near:dropOf(me.near),full:dropOf(me.full),nearDown:players.find(q=>q.id===me.dn)||null,helping:players.find(q=>q.id===me.hp)||null});
  }
  // people and zombies
  for(const [nid,look] of s.nw||[])looks.set(nid,look);
  const live=new Set();
  for(const r of s.ag){
    const [nid,st,kind,x,z,face,moving,hp,fuse,wind,hit,panic]=r;live.add(nid);
    let a=byNid.get(nid);
    if(!a){a=makeAgent(x,z,looks.get(nid));a.nid=nid;a.face=face;byNid.set(nid,a);agents.push(a);}
    const state=ST[st]||'human';
    if(state==='zombie'||state==='dead'&&kind){
      if(a.state!=='zombie'&&a.state!=='dead'&&ZC[kind])becomeZombie(a,kind);
      else if(kind&&a.kind!==kind&&ZC[kind])setKind(a,kind);
    }
    if(state==='dead'&&a.state!=='dead'){a.state='dead';a.deadT=0;}else if(state!=='dead')a.state=state;
    want(a,x,z);a.nface=face;a.moving=moving;a.fuse=fuse;a.wind=wind;a.panic=panic?1:0;if(hit)a.hitT=.18;if(hp)a.hp=hp;
  }
  for(let i=agents.length-1;i>=0;i--){const a=agents[i];if(!live.has(a.nid)){byNid.delete(a.nid);removeAgent(a);agents.splice(i,1);}}
}
