import {camTarget} from '../core/renderer.js';
import {G} from '../core/state.js';
import {applyTanks,clearFires} from './blast.js';
import {applyTraps} from './camp.js';
import {DEF} from '../config/items.js';
import {ZC} from '../config/zombies.js';
import {lootSpots} from '../world/city.js';
import {agents,makeAgent,removeAgent,styleZombie} from '../entities/agents.js';
import {player,players} from '../entities/player.js';
import {drops,spawnDrop,removeDrop} from './drops.js';
import {freshGear,tidyBag} from './inventory.js';
import {EVENTS} from './phases.js';
import {reset,addPlayer} from './game.js';
import {feed,updateLoadout} from '../ui/hud.js';
import {applyBroken} from './obstacles.js';
import {applyDoors} from './doors.js';
import {applyEvents} from './events.js';

// ---------- save ----------
// One autosave slot in localStorage, kept per browser. It is deleted when the player dies (survival rules).
// The city is rebuilt from its seed, so loot spots are stored by index; bump SAVE_VERSION when that or the format changes.
const SAVE_KEY='ordinary-day.save',SAVE_VERSION=2;   // 2 (v0.9): players[] with their own gear; 1 still loads (one player)
const AUTOSAVE_EVERY=15;   // real seconds while playing
const AGENT_KEYS=['state','kind','face','phase','node','prev','jx','jz','walk','panic','tx','tz','wait','vendor','hp','maxHp','feed','atk','spd','stuckT','lost','turnT','heard','fuse','wind','retreat','shrieked','march'];
let sinceSave=0,toldPlayer=false;

const validItem=it=>it&&DEF[it.id];
function snapshot(){
  const g=Object.assign({},G,{alertA:null,alertT:0,running:false,paused:false,over:false,lastMinShown:-1});
  return {v:SAVE_VERSION,savedAt:Date.now(),G:g,
    players:players.map(p=>({x:p.pos.x,z:p.pos.z,face:p.face,hp:p.hp,alive:p.alive,down:p.down,bleed:p.bleed,inv:p.inv,infect:p.infect,infWarn:p.infWarn,food:p.food,water:p.water,sinceHit:performance.now()/1000-p.lastHit,stay:p.stay,gear:p.gear,token:p.token})),
    agents:agents.filter(a=>a.state!=='dead'&&!a.gone).map(a=>{const o={x:a.pos.x,z:a.pos.z,look:a.look};for(const k of AGENT_KEYS)o[k]=a[k];return o;}),
    drops:drops.map(d=>({item:d.item,x:d.x,z:d.z,spot:d.spot?lootSpots.indexOf(d.spot):-1,mine:!!d.mine}))};
}
export function saveGame(){
  if(!player||!players.some(p=>p.alive)||G.over)return false;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot()));sinceSave=0;return true;}catch(_){return false;}
}
// version 1 had one player and a shared `inv`; it becomes players[0] with that gear
function upgrade(s){
  if(s&&s.v===1){s.players=[Object.assign({},s.player,{alive:true,gear:s.inv,stay:s.G.stay||null})];delete s.player;delete s.inv;s.v=2;}
  return s&&s.v===SAVE_VERSION?s:null;
}
export function readSave(){
  try{return upgrade(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch(_){return null;}
}
export function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(_){}}
export function loadGame(){
  const s=readSave();if(!s)return false;
  reset();
  for(const a of agents)removeAgent(a);agents.length=0;
  while(drops.length)removeDrop(drops[0]);
  Object.assign(G,s.G,{speedIdx:G.speedIdx,diff:s.G.diff||'normal'});
  for(const e of EVENTS)e.done=G.min>=e.t;
  G.searched=G.searched||[];   // before v0.15 nothing was searched
  G.broken=G.broken||[];applyBroken(G.broken);G.blown=G.blown||[];applyTanks();clearFires();G.traps=G.traps||[];applyTraps();   // v0.23 cylinders already blown
  applyDoors(G.doors);applyEvents();   // saves from before v0.6 have no doors (all open), before v0.8 no events
  s.players.forEach((o,i)=>{
    const p=i?addPlayer():player,g=o.gear||{},eq=g.eq||{};
    p.gear=Object.assign(freshGear(),{bag:(g.bag||[]).filter(validItem),cap:g.cap||6,active:g.active||'melee'});
    for(const k of ['primary','secondary','melee'])p.gear.eq[k]=validItem(eq[k])?eq[k]:null;
    tidyBag(p.gear);   // saves from before v0.14.1 can hold several stacks of one item
    Object.assign(p.pos,{x:o.x,z:o.z});Object.assign(p,{face:o.face,hp:o.hp,down:o.down,bleed:o.bleed||0,inv:o.inv,infect:o.infect||0,infWarn:o.infWarn||0,food:o.food??100,water:o.water??100,stay:o.stay||null,lastHit:performance.now()/1000-o.sinceHit});
    if(o.alive===false)Object.assign(p,{alive:false,state:'dead',deadT:30});
    if(i)Object.assign(p,{token:o.token||null,away:true});   // friends wait as they were until they join the room again (v0.12)
  });
  delete G.stay;camTarget.set(player.pos.x,0,player.pos.z);
  for(const o of s.agents){
    if(o.state==='zombie'&&!ZC[o.kind])continue;
    const a=makeAgent(o.x,o.z,o.look);for(const k of AGENT_KEYS)if(k in o)a[k]=o[k];
    if(a.state==='zombie')styleZombie(a);
    agents.push(a);
  }
  for(const d of s.drops)if(validItem(d.item))spawnDrop(d.item,d.x,d.z,d.spot>=0&&lootSpots[d.spot]&&!lootSpots[d.spot].drop?lootSpots[d.spot]:null).mine=!!d.mine;
  sinceSave=0;updateLoadout(true);
  return true;
}
export function autosave(dt){
  sinceSave+=dt;if(sinceSave<AUTOSAVE_EVERY)return;
  if(saveGame()&&!toldPlayer){toldPlayer=true;feed('บันทึกเกมอัตโนมัติแล้ว เล่นต่อได้แม้ปิดหน้าเว็บ');}
}
export function initSave(){
  // phones often close a tab without warning, so save whenever the page goes to the background
  const saveNow=()=>{if(G.running)saveGame();};
  addEventListener('pagehide',saveNow);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow();});
}
