import {G} from '../core/state.js';
import {$} from '../core/util.js';
import {BARR,DOOR_HP,REBUILT_HP,HAMMER_NOISE,SCENT_AFTER,SCENT_EVERY,SCENT_RANGE,SCENT_MAX} from '../config/shelter.js';
import {solids} from '../world/collision.js';
import {rooms,roomAt,showRoom,setDoorLook,doorDist} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {players,viewed} from '../entities/player.js';
import {makeNoise} from '../entities/ai.js';
import {sfx} from './audio.js';
import {uiFor} from '../ui/hud.js';
import {markMapDirty} from '../ui/minimap.js';
import {renderBag} from '../ui/bag.js';

// ---------- doors (v0.6) ----------
// G.doors[k] = {open, hp, broken} for rooms[k]. A closed door is a box in `solids`, so it blocks walking,
// bullets and sight. Zombies that want what is behind it hit it until it breaks; broken doors stay open
// until a new game. Saved with G.
const fresh=()=>({open:true,hp:DOOR_HP,broken:false});
// v0.59 the furniture against a shut door. While it stands `bar` is set, `base` is the door's own HP under it and
// hp = base + what is left of the furniture. `furn` is what the room still has to put against the door: all of it
// (BARR.hp) until used; what was left when it was pulled away; nothing once the zombies have smashed it, until the
// next morning (restoreFurniture). Without that, dragging it back after every blow made a door that never broke.
const furnOf=st=>st.furn??BARR.hp,baseOf=st=>st.base??DOOR_HP;   // a save from before `base` barricaded a whole door
export function restoreFurniture(){for(const st of G.doors)if(!st.bar)delete st.furn;}
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
  if(st.bar){if(p.room!==k){uiFor(p).feed('ประตูถูกกั้นไว้','warn');sfx.bash(rooms[k].dx,rooms[k].dz);return false;}   // v0.59 barricaded: only from inside, and that first pulls it away
    st.furn=Math.max(0,st.hp-baseOf(st));st.hp=Math.min(st.hp,baseOf(st));st.bar=false;delete st.base;sync(k);sfx.bash(rooms[k].dx,rooms[k].dz);return true;}
  if(st.open&&blocked(p,k))return false;
  st.open=!st.open;sync(k);markMapDirty();sfx.door(rooms[k].dx,rooms[k].dz);
  return true;
}
// ---------- putting a broken door back (v0.7 planks; v0.42 without them) ----------
// what the hammer would do at door k: 'rebuild' when it is broken, else nothing
// v0.59 or 'barricade' when player p is inside with it shut, nothing against it yet and furniture left to use
export function fixAction(k,p){const st=G.doors[k];if(!st)return null;if(st.broken)return 'rebuild';return p&&!st.open&&!st.bar&&furnOf(st)>0&&p.room===k?'barricade':null;}
// the nearest broken door player p could put back, or -1
export function nearFixDoor(p){
  if(!p||!p.alive||p.bleed>0)return -1;
  let best=-1,bd=1.7;for(let k=0;k<rooms.length;k++){if(!fixAction(k,p))continue;const d=doorDist(k,p.pos.x,p.pos.z);if(d<bd){bd=d;best=k;}}
  return best;
}
export function fixDoor(p,k){
  const st=G.doors[k],how=fixAction(k,p);if(!st||!p.alive||p.bleed>0||!how)return false;const r=rooms[k],U=uiFor(p);
  if(how==='barricade'){   // v0.59
    st.bar=true;st.base=st.hp;st.hp+=furnOf(st);U.feed('กั้นประตูแล้ว');sync(k);sfx.bash(r.dx,r.dz);setTimeout(()=>sfx.bash(r.dx,r.dz),300);makeNoise(r.dx,r.dz,BARR.noise);return true;}
  if(blocked(p,k))return false;
  st.broken=false;st.open=false;st.hp=REBUILT_HP;U.feed('ซ่อมประตูแล้ว · ประตู '+Math.round(st.hp/DOOR_HP*100)+'%');
  sync(k);markMapDirty();sfx.hammer(r.dx,r.dz);setTimeout(()=>sfx.hammer(r.dx,r.dz),180);setTimeout(()=>sfx.hammer(r.dx,r.dz),420);
  makeNoise(r.dx,r.dz,HAMMER_NOISE);   // loud: zombies nearby come to look
  if(p.local&&!$('bag').hidden)renderBag();
  return true;
}
export function damageDoor(k,dmg){
  const st=G.doors[k];if(!st||st.open)return;
  const r=rooms[k];st.hp-=dmg;sfx.bash(r.dx,r.dz);if(st.bar&&st.hp<=baseOf(st)){st.bar=false;st.furn=0;delete st.base;sync(k);}   // v0.59 the furniture gave way, smashed
  r.cutDoor.position.x+=(Math.random()-.5)*.06;r.cutDoor.position.z+=(Math.random()-.5)*.06;   // rattles
  const now=performance.now()/1000;
  for(const p of players)if(p.room===k&&now-(p.doorWarn||0)>8){p.doorWarn=now;}
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
  if(near.length&&!st.warned){st.warned=true;}
}
