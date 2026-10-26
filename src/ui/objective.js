import {$} from '../core/util.js';
import {screenAngle} from '../core/renderer.js';
import {G} from '../core/state.js';
import {DEF} from '../config/items.js';
import {DOOR_MAX} from '../config/shelter.js';
import {DAY_START,NIGHT_START} from '../config/time.js';
import {rooms,roomAt} from '../world/interiors.js';
import {pois} from '../world/city.js';
import {drops} from '../systems/drops.js';
import {player} from '../entities/player.js';
import {tipsOff} from './tips.js';

// ---------- what to do now (v0.32) ----------
// For the first day and the next morning, a line under the clock says what is worth doing next, with an arrow and the
// distance to where it is: pick up the weapon lying nearby, find food, water and medicine, get into a building and close
// the door before dark, board it up, last the night, then go to the shops. It reads the local player's state only
// (also on a friend's device online) and goes away for good once day 2 afternoon starts, or with the tips turned off.
const DUSK=15*60;   // when finding shelter becomes the goal
const count=(g,kind)=>g.bag.reduce((n,e)=>n+(DEF[e.id]&&DEF[e.id].kind===kind?e.n||1:0),0);
function nearestDrop(p,test,max=60){let best=null,bd=max;for(const d of drops){if(!test(DEF[d.item.id],d.item.id))continue;const k=Math.hypot(d.x-p.pos.x,d.z-p.pos.z);if(k<bd){bd=k;best=d;}}return best;}
// the goal right now: {text, x, z} (x, z where to go, if anywhere), or null when there is nothing to show
export function currentGoal(p){
  const day=Math.floor(G.min/1440)+1,tod=G.min%1440,g=p.gear;
  if(day>2||day===2&&tod>=DUSK||!p.alive)return null;
  const night=tod>=NIGHT_START||tod<DAY_START;
  const armed=!!(g.eq.melee||g.eq.primary||g.eq.secondary),at=d=>d?{x:d.x,z:d.z}:{};
  if(day===1&&!G.outbreak)return armed?{text:'เดินดูเมือง · วันนี้มีอะไรแปลก ๆ'}:{text:'หยิบอาวุธที่ตกอยู่ใกล้ ๆ',...at(nearestDrop(p,d=>d.kind==='weapon',40))};
  if(night)return {text:'รอดให้ถึง 06:00 · เสียงปืนเรียกซอมบี้มา'};
  if(day===2)return {text:'ออกหาเสบียง · ร้านค้ากับโรงพยาบาลมีของดี',...at(nearestPoi(p))};
  if(tod<DUSK){
    if(!armed)return {text:'หาอาวุธ',...at(nearestDrop(p,d=>d.kind==='weapon'))};
    const food=count(g,'food');if(food<2)return {text:'เก็บอาหารหรือน้ำ '+food+'/2',...at(nearestDrop(p,d=>d.kind==='food'))};
    if(count(g,'heal')<1)return {text:'หายาไว้สักชิ้น',...at(nearestDrop(p,d=>d.kind==='heal'))};
    return {text:'หาของเพิ่มก่อนมืด · กระสุน ไม้กระดาน',...at(nearestDrop(p,(d,id)=>d.kind==='ammo'||id==='planks',40))};
  }
  // the hours before dark: get inside, close the door, board it up
  const k=roomAt(p.pos.x,p.pos.z);
  if(k>=0&&G.doors[k]&&!G.doors[k].broken){
    const st=G.doors[k];
    if(st.open)return {text:'ปิดประตู (E / ปุ่มประตู)',x:rooms[k].dx,z:rooms[k].dz};
    if(count(g,'mat')>0&&st.hp<DOOR_MAX)return {text:'ตอกไม้กั้นประตู (B / 🔨)',x:rooms[k].dx,z:rooms[k].dz};
    return {text:'พร้อมแล้ว · รอคืนแรกในตึกนี้'};
  }
  let best=-1,bd=1e9;for(let i=0;i<rooms.length;i++){if(!G.doors[i]||G.doors[i].broken)continue;const d=Math.hypot(rooms[i].dx-p.pos.x,rooms[i].dz-p.pos.z);if(d<bd){bd=d;best=i;}}
  return best>=0?{text:'หาที่หลบก่อนมืด · เข้าตึกแล้วปิดประตู',x:rooms[best].dx,z:rooms[best].dz}:{text:'หาที่หลบก่อนมืด'};
}
function nearestPoi(p){let best=null,bd=1e9;for(const o of pois){if(o.type!=='place')continue;const d=Math.hypot(o.x-p.pos.x,o.z-p.pos.z);if(d<bd){bd=d;best=o;}}return best;}
let acc=1,shown='';
// four times a second
export function updateObjective(dt){
  acc+=dt;if(acc<.25)return;acc=0;
  const el=$('goal'),goal=G.running&&!tipsOff()?currentGoal(player):null;
  if(!goal){if(!el.hidden)el.hidden=true;return;}
  if(el.hidden)el.hidden=false;
  const has=goal.x!==undefined,dx=has?goal.x-player.pos.x:0,dz=has?goal.z-player.pos.z:0,dist=Math.hypot(dx,dz);
  const text=goal.text+(has&&dist>2?' · '+Math.round(dist)+' ม.':'');
  if(text!==shown){shown=text;$('goalText').textContent=text;}
  const ar=$('goalArrow');ar.hidden=!has||dist<=2;if(!ar.hidden)ar.style.transform='rotate('+screenAngle(dx,dz).toFixed(2)+'rad)';
}
