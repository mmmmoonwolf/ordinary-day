import {camTarget} from '../core/renderer.js';
import {G} from '../core/state.js';
import {DEF} from '../config/items.js';
import {ZC} from '../config/zombies.js';
import {lootSpots} from '../world/city.js';
import {agents,makeAgent,removeAgent,styleZombie} from '../entities/agents.js';
import {player} from '../entities/player.js';
import {drops,spawnDrop,removeDrop} from './drops.js';
import {inv} from './inventory.js';
import {EVENTS} from './phases.js';
import {reset} from './game.js';
import {feed,updateLoadout} from '../ui/hud.js';
import {applyBroken} from './obstacles.js';

// ---------- save ----------
// One autosave slot in localStorage, kept per browser. It is deleted when the player dies (survival rules).
// The city is rebuilt from its seed, so loot spots are stored by index; bump SAVE_VERSION when that or the format changes.
const SAVE_KEY='ordinary-day.save',SAVE_VERSION=1;
const AUTOSAVE_EVERY=15;   // real seconds while playing
const AGENT_KEYS=['state','kind','face','phase','node','prev','jx','jz','walk','panic','tx','tz','wait','vendor','hp','maxHp','feed','atk','spd','stuckT','lost','turnT','heard','fuse','wind','retreat','shrieked'];
let sinceSave=0,toldPlayer=false;

const validItem=it=>it&&DEF[it.id];
function snapshot(){
  const g=Object.assign({},G,{alertA:null,alertT:0,running:false,paused:false,over:false,lastMinShown:-1});
  return {v:SAVE_VERSION,savedAt:Date.now(),G:g,
    player:{x:player.pos.x,z:player.pos.z,face:player.face,hp:player.hp,down:player.down,inv:player.inv,infect:player.infect,infWarn:player.infWarn,food:player.food,water:player.water,sinceHit:performance.now()/1000-player.lastHit},
    inv:{bag:inv.bag,cap:inv.cap,eq:inv.eq,active:inv.active},
    agents:agents.filter(a=>a.state!=='dead'&&!a.gone).map(a=>{const o={x:a.pos.x,z:a.pos.z,look:a.look};for(const k of AGENT_KEYS)o[k]=a[k];return o;}),
    drops:drops.map(d=>({item:d.item,x:d.x,z:d.z,spot:d.spot?lootSpots.indexOf(d.spot):-1}))};
}
export function saveGame(){
  if(!player||!player.alive||G.over)return false;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot()));sinceSave=0;return true;}catch(_){return false;}
}
export function readSave(){
  try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return s&&s.v===SAVE_VERSION?s:null;}catch(_){return null;}
}
export function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(_){}}
export function loadGame(){
  const s=readSave();if(!s)return false;
  reset();
  for(const a of agents)removeAgent(a);agents.length=0;
  while(drops.length)removeDrop(drops[0]);
  Object.assign(G,s.G,{speedIdx:G.speedIdx,diff:s.G.diff||'normal'});
  for(const e of EVENTS)e.done=G.min>=e.t;
  G.broken=G.broken||[];applyBroken(G.broken);
  Object.assign(inv,{bag:s.inv.bag.filter(validItem),cap:s.inv.cap,eq:{},active:s.inv.active});
  for(const k of ['primary','secondary','melee'])inv.eq[k]=validItem(s.inv.eq[k])?s.inv.eq[k]:null;
  const p=s.player;Object.assign(player.pos,{x:p.x,z:p.z});Object.assign(player,{face:p.face,hp:p.hp,down:p.down,inv:p.inv,infect:p.infect||0,infWarn:p.infWarn||0,food:p.food??100,water:p.water??100,lastHit:performance.now()/1000-p.sinceHit});
  camTarget.set(p.x,0,p.z);
  for(const o of s.agents){
    if(o.state==='zombie'&&!ZC[o.kind])continue;
    const a=makeAgent(o.x,o.z,o.look);for(const k of AGENT_KEYS)if(k in o)a[k]=o[k];
    if(a.state==='zombie')styleZombie(a);
    agents.push(a);
  }
  for(const d of s.drops)if(validItem(d.item))spawnDrop(d.item,d.x,d.z,d.spot>=0&&lootSpots[d.spot]&&!lootSpots[d.spot].drop?lootSpots[d.spot]:null);
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
