import {G} from '../core/state.js';
import {$} from '../core/util.js';
import {DOOR_HP,PLANK_HP,DOOR_MAX,REBUILD_PLANKS,REBUILT_HP,HAMMER_NOISE,SCENT_AFTER,SCENT_EVERY,SCENT_RANGE,SCENT_MAX} from '../config/shelter.js';
import {solids} from '../world/collision.js';
import {rooms,roomAt,showRoom,setDoorLook,doorDist} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {player} from '../entities/player.js';
import {makeNoise} from '../entities/ai.js';
import {sfx} from './audio.js';
import {say,feed} from '../ui/hud.js';
import {markMapDirty} from '../ui/minimap.js';
import {countAmmo as countOf,takeAmmo as takeOf,inv} from './inventory.js';
import {renderBag} from '../ui/bag.js';

// ---------- doors (v0.6) ----------
// G.doors[k] = {open, hp, broken} for rooms[k]. A closed door is a box in `solids`, so it blocks walking,
// bullets and sight. Zombies that want what is behind it hit it until it breaks; broken doors stay open
// until a new game. Saved with G.
const fresh=()=>({open:true,hp:DOOR_HP,broken:false});
function sync(k){
  const st=G.doors[k],b=rooms[k].doorBox,i=solids.indexOf(b);
  if(st.open&&i>=0)solids.splice(i,1);else if(!st.open&&i<0)solids.push(b);
  setDoorLook(k,st);
}
export function applyDoors(list){G.doors=rooms.map((_,k)=>Object.assign(fresh(),list&&list[k]));for(let k=0;k<rooms.length;k++)sync(k);markMapDirty();}
export function restoreDoors(){applyDoors(null);}
// the door the player can open or close from here, or -1
export function nearDoor(){
  if(!player||!player.alive)return -1;
  let best=-1,bd=1.7;for(let k=0;k<rooms.length;k++){const d=doorDist(k,player.pos.x,player.pos.z);if(d<bd&&!G.doors[k].broken){bd=d;best=k;}}
  return best;
}
const inBox=(p,r,b)=>p.x>b.x0-r&&p.x<b.x1+r&&p.z>b.z0-r&&p.z<b.z1+r;
const blocked=k=>{const b=rooms[k].doorBox;if(inBox(player.pos,.3,b)||agents.some(a=>a.state!=='dead'&&inBox(a.pos,(a.rad||.34)*.9,b))){feed('มีบางอย่างขวางประตูอยู่','warn');return true;}return false;};
export function toggleDoor(k){
  const st=G.doors[k];if(!st||st.broken)return false;
  if(st.open&&blocked(k))return false;
  st.open=!st.open;sync(k);markMapDirty();sfx.door(rooms[k].dx,rooms[k].dz);
  return true;
}
// ---------- planks (v0.7) ----------
// what the hammer would do at door k: 'rebuild' (broken), 'board' (closed, below DOOR_MAX), 'full', 'open' (close it first)
export function fixAction(k){const st=G.doors[k];return st.broken?'rebuild':st.open?'open':st.hp>=DOOR_MAX?'full':'board';}
// the nearest door (broken ones too) the player can work on with planks, or -1
export function nearFixDoor(){
  if(!player||!player.alive)return -1;
  let best=-1,bd=1.7;for(let k=0;k<rooms.length;k++){const d=doorDist(k,player.pos.x,player.pos.z);if(d<bd){bd=d;best=k;}}
  return best;
}
export function fixDoor(k){
  const st=G.doors[k];if(!st)return false;const act=fixAction(k),have=countOf('planks'),r=rooms[k];
  if(act==='open'){feed('ปิดประตูก่อนแล้วค่อยตอกไม้','warn');return false;}
  if(act==='full'){feed('ตอกไม้แน่นเต็มที่แล้ว','warn');return false;}
  const need=act==='rebuild'?REBUILD_PLANKS:1;
  if(have<need){feed('ต้องใช้ไม้กระดาน '+need+' แผ่น (มี '+have+')','warn');return false;}
  if(act==='rebuild'&&blocked(k))return false;
  takeOf('planks',need);
  if(act==='rebuild'){st.broken=false;st.open=false;st.hp=REBUILT_HP;feed('ซ่อมประตูแล้ว · ประตู '+Math.round(st.hp/DOOR_HP*100)+'%');}
  else{st.hp=Math.min(DOOR_MAX,st.hp+PLANK_HP);feed('ตอกไม้แล้ว · ประตู '+Math.round(st.hp/DOOR_HP*100)+'%');}
  sync(k);markMapDirty();sfx.thud(r.dx,r.dz);setTimeout(()=>sfx.thud(r.dx,r.dz),180);
  makeNoise(r.dx,r.dz,HAMMER_NOISE);   // loud: zombies nearby come to look
  if(!$('bag').hidden)renderBag();
  return true;
}
// the hammer button, next to the pick button: shown near a door the player can board or rebuild with the planks they carry
function updateFixButton(){
  const k=nearFixDoor(),b=$('bFix'),have=countOf('planks');player.fixDoor=-1;
  const act=k>=0?fixAction(k):null,show=k>=0&&have>0&&(act==='rebuild'||act==='board');
  if(!show){if(!b.hidden)b.hidden=true;return;}
  player.fixDoor=k;const label=(act==='rebuild'?'ซ่อมประตู ('+REBUILD_PLANKS+' แผ่น)':'ตอกไม้ +'+Math.round(PLANK_HP/DOOR_HP*100)+'%')+' · มี '+have;
  if(b.hidden||b.dataset.for!==label){b.hidden=false;b.dataset.for=label;$('fixName').textContent=label;}
}
let warnAt=-99;
export function damageDoor(k,dmg){
  const st=G.doors[k];if(!st||st.open)return;
  const r=rooms[k];st.hp-=dmg;sfx.thud(r.dx,r.dz);
  r.cutDoor.position.x+=(Math.random()-.5)*.06;r.cutDoor.position.z+=(Math.random()-.5)*.06;   // rattles
  const now=performance.now()/1000;
  if(player.room===k&&now-warnAt>8){warnAt=now;say('มีซอมบี้กำลังพังประตู! ประตู '+Math.max(0,Math.round(st.hp/DOOR_HP*100))+'%','alarm',4);}
  if(st.hp<=0){st.hp=0;st.broken=true;st.open=true;sync(k);markMapDirty();sfx.crack();makeNoise(r.dx,r.dz,20);feed('ประตูพังแล้ว','warn');}
}
// once a frame: which room the player is in, and the cutaway that goes with it
export function updateShelter(){
  player.room=player.alive?roomAt(player.pos.x,player.pos.z):-1;
  showRoom(roomAt(player.pos.x,player.pos.z,.45));   // a little wider, so the cutaway is already on in the doorway
  updateScent();updateFixButton();
}
// ---------- scent (v0.7) ----------
// G.stay = {room, since, next, warned}: how long the player has been in one building (in-game minutes, saved with G).
// At night, once the stay passes SCENT_AFTER, the nearest zombies are sent to the player every SCENT_EVERY minutes;
// they come to the door and break it down (ai.js keeps them at it while the player is inside).
function updateScent(){
  const k=player.room;
  if(k<0){G.stay=null;return;}
  if(!G.stay||G.stay.room!==k)G.stay={room:k,since:G.min,next:G.min+SCENT_AFTER,warned:false};
  const st=G.stay;if(G.phase!=='night'||G.min<st.next)return;
  st.next=Math.max(st.next+SCENT_EVERY,G.min);
  const n=Math.min(SCENT_MAX,1+Math.floor((G.min-st.since-SCENT_AFTER)/120));
  const near=agents.filter(a=>a.state==='zombie'&&a.kind!=='walker'&&!a.retreat&&roomAt(a.pos.x,a.pos.z)!==k)
    .map(a=>[a,Math.hypot(a.pos.x-player.pos.x,a.pos.z-player.pos.z)]).filter(([,d])=>d<SCENT_RANGE).sort((a,b)=>a[1]-b[1]).slice(0,n);
  for(const [a] of near)a.heard={x:player.pos.x,z:player.pos.z,t:25};
  if(near.length&&!st.warned){st.warned=true;say('ซอมบี้เริ่มได้กลิ่นคุณ อยู่ตึกเดิมนานเกินไป เตรียมรับมือที่ประตู','alarm',6);}
}
