import {G} from '../core/state.js';
import {$} from '../core/util.js';
import {DOOR_HP,PLANK_HP,DOOR_MAX,REBUILD_PLANKS,REBUILT_HP,HAMMER_NOISE,SCENT_AFTER,SCENT_EVERY,SCENT_RANGE,SCENT_MAX} from '../config/shelter.js';
import {solids} from '../world/collision.js';
import {rooms,roomAt,showRoom,setDoorLook,doorDist} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {players,viewed} from '../entities/player.js';
import {makeNoise} from '../entities/ai.js';
import {sfx} from './audio.js';
import {uiFor} from '../ui/hud.js';
import {markMapDirty} from '../ui/minimap.js';
import {countAmmo as countOf,takeAmmo as takeOf} from './inventory.js';
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
// the door player p can open or close from where they stand, or -1
export function nearDoor(p){
  if(!p||!p.alive||p.bleed>0)return -1;
  let best=-1,bd=1.7;for(let k=0;k<rooms.length;k++){const d=doorDist(k,p.pos.x,p.pos.z);if(d<bd&&!G.doors[k].broken){bd=d;best=k;}}
  return best;
}
const inBox=(q,r,b)=>q.x>b.x0-r&&q.x<b.x1+r&&q.z>b.z0-r&&q.z<b.z1+r;
// anyone (players included) standing in the doorway; tells player p
const blocked=(p,k)=>{const b=rooms[k].doorBox;if(players.some(q=>q.alive&&inBox(q.pos,.3,b))||agents.some(a=>a.state!=='dead'&&inBox(a.pos,(a.rad||.34)*.9,b))){uiFor(p).feed('มีบางอย่างขวางประตูอยู่','warn');return true;}return false;};
export function toggleDoor(p,k){
  const st=G.doors[k];if(!st||st.broken||!p.alive||p.bleed>0)return false;
  if(st.open&&blocked(p,k))return false;
  st.open=!st.open;sync(k);markMapDirty();sfx.door(rooms[k].dx,rooms[k].dz);
  return true;
}
// ---------- planks (v0.7) ----------
// what the hammer would do at door k: 'rebuild' (broken), 'board' (closed, below DOOR_MAX), 'full', 'open' (close it first)
export function fixAction(k){const st=G.doors[k];return st.broken?'rebuild':st.open?'open':st.hp>=DOOR_MAX?'full':'board';}
// the nearest door (broken ones too) player p could work on with planks, or -1
export function nearFixDoor(p){
  if(!p||!p.alive||p.bleed>0)return -1;
  let best=-1,bd=1.7;for(let k=0;k<rooms.length;k++){const d=doorDist(k,p.pos.x,p.pos.z);if(d<bd){bd=d;best=k;}}
  return best;
}
export function fixDoor(p,k){
  const st=G.doors[k];if(!st||!p.alive||p.bleed>0)return false;const act=fixAction(k),have=countOf(p,'planks'),r=rooms[k],U=uiFor(p);
  if(act==='open'){U.feed('ปิดประตูก่อนแล้วค่อยตอกไม้','warn');return false;}
  if(act==='full'){U.feed('ตอกไม้แน่นเต็มที่แล้ว','warn');return false;}
  const need=act==='rebuild'?REBUILD_PLANKS:1;
  if(have<need){U.feed('ต้องใช้ไม้กระดาน '+need+' แผ่น (มี '+have+')','warn');return false;}
  if(act==='rebuild'&&blocked(p,k))return false;
  takeOf(p,'planks',need);
  if(act==='rebuild'){st.broken=false;st.open=false;st.hp=REBUILT_HP;U.feed('ซ่อมประตูแล้ว · ประตู '+Math.round(st.hp/DOOR_HP*100)+'%');}
  else{st.hp=Math.min(DOOR_MAX,st.hp+PLANK_HP);U.feed('ตอกไม้แล้ว · ประตู '+Math.round(st.hp/DOOR_HP*100)+'%');}
  sync(k);markMapDirty();sfx.thud(r.dx,r.dz);setTimeout(()=>sfx.thud(r.dx,r.dz),180);
  makeNoise(r.dx,r.dz,HAMMER_NOISE);   // loud: zombies nearby come to look
  if(p.local&&!$('bag').hidden)renderBag();
  return true;
}
export function damageDoor(k,dmg){
  const st=G.doors[k];if(!st||st.open)return;
  const r=rooms[k];st.hp-=dmg;sfx.thud(r.dx,r.dz);
  r.cutDoor.position.x+=(Math.random()-.5)*.06;r.cutDoor.position.z+=(Math.random()-.5)*.06;   // rattles
  const now=performance.now()/1000;
  for(const p of players)if(p.room===k&&now-(p.doorWarn||0)>8){p.doorWarn=now;uiFor(p).say('มีซอมบี้กำลังพังประตู! ประตู '+Math.max(0,Math.round(st.hp/DOOR_HP*100))+'%','alarm',4);}
  if(st.hp<=0){st.hp=0;st.broken=true;st.open=true;sync(k);markMapDirty();sfx.crack();makeNoise(r.dx,r.dz,20);for(const p of players)if(p.room===k)uiFor(p).feed('ประตูพังแล้ว','warn');}
}
// once a step: which room each player is in, their scent, and the cutaway for the player on this device
export function updateShelter(){
  for(const p of players){p.room=p.alive?roomAt(p.pos.x,p.pos.z):-1;updateScent(p);}
  const v=viewed();if(v)showRoom(roomAt(v.pos.x,v.pos.z,.45));   // a little wider, so the cutaway is already on in the doorway
}
// ---------- scent (v0.7) ----------
// p.stay = {room, since, next, warned}: how long player p has been in one building (in-game minutes, saved).
// At night, once the stay passes SCENT_AFTER, the nearest zombies are sent to that player every SCENT_EVERY minutes;
// they come to the door and break it down (ai.js keeps them at it while a player is inside).
function updateScent(p){
  const k=p.room;
  if(k<0){p.stay=null;return;}
  if(!p.stay||p.stay.room!==k)p.stay={room:k,since:G.min,next:G.min+SCENT_AFTER,warned:false};
  const st=p.stay;if(G.phase!=='night'||G.min<st.next)return;
  st.next=Math.max(st.next+SCENT_EVERY,G.min);
  const n=Math.min(SCENT_MAX,1+Math.floor((G.min-st.since-SCENT_AFTER)/120));
  const near=agents.filter(a=>a.state==='zombie'&&a.kind!=='walker'&&!a.retreat&&roomAt(a.pos.x,a.pos.z)!==k)
    .map(a=>[a,Math.hypot(a.pos.x-p.pos.x,a.pos.z-p.pos.z)]).filter(([,d])=>d<SCENT_RANGE).sort((a,b)=>a[1]-b[1]).slice(0,n);
  for(const [a] of near)a.heard={x:p.pos.x,z:p.pos.z,t:25};
  if(near.length&&!st.warned){st.warned=true;uiFor(p).say('ซอมบี้เริ่มได้กลิ่นคุณ อยู่ตึกเดิมนานเกินไป เตรียมรับมือที่ประตู','alarm',6);}
}
