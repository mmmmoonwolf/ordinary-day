import {G} from '../core/state.js';
import {DOOR_HP} from '../config/shelter.js';
import {solids} from '../world/collision.js';
import {rooms,roomAt,showRoom,setDoorLook,doorDist} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {player} from '../entities/player.js';
import {makeNoise} from '../entities/ai.js';
import {sfx} from './audio.js';
import {say,feed} from '../ui/hud.js';
import {markMapDirty} from '../ui/minimap.js';

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
export function toggleDoor(k){
  const st=G.doors[k];if(!st||st.broken)return false;
  if(st.open){const b=rooms[k].doorBox;
    if(inBox(player.pos,.3,b)||agents.some(a=>a.state!=='dead'&&inBox(a.pos,(a.rad||.34)*.9,b))){feed('มีบางอย่างขวางประตูอยู่','warn');return false;}}
  st.open=!st.open;sync(k);markMapDirty();sfx.door(rooms[k].dx,rooms[k].dz);
  return true;
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
}
