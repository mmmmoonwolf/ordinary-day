import {$,rnd} from '../core/util.js';
import {DEF,GRADES,SLOTNAME,gradeOf} from '../config/items.js';
import {player} from '../entities/player.js';
import {spawnDrop,removeDrop} from './drops.js';
import {freeAt} from '../world/collision.js';
import {walledOff} from '../world/interiors.js';
import {feed,feedOnce,updateLoadout} from '../ui/hud.js';
import {renderBag} from '../ui/bag.js';
import {cureInfection} from './infection.js';
import {sfx} from './audio.js';

// ---------- inventory ----------
export const inv={bag:[],cap:6,eq:{primary:null,secondary:null,melee:null},active:'melee'};
export function curWeapon(){if(inv.active!=='melee'&&!inv.eq[inv.active])inv.active='melee';return inv.eq[inv.active]||{id:'fist',mag:0};}
export function countAmmo(t){let s=0;for(const e of inv.bag)if(e.id===t)s+=e.n;return s;}
export function takeAmmo(t,n){let got=0;for(let i=inv.bag.length-1;i>=0&&got<n;i--){const e=inv.bag[i];if(e.id!==t)continue;const k=Math.min(e.n,n-got);e.n-=k;got+=k;if(e.n<=0)inv.bag.splice(i,1);}return got;}
export function addStack(id,n){const st=DEF[id].stack;for(const e of inv.bag){if(e.id===id&&e.n<st){const k=Math.min(st-e.n,n);e.n+=k;n-=k;if(!n)return 0;}}while(n>0&&inv.bag.length<inv.cap){const k=Math.min(st,n);inv.bag.push({id,n:k});n-=k;}return n;}
export function gradeTag(id){const g=gradeOf(id);return g?' ['+GRADES[g].name+']':'';}
export function switchTo(slot){
  if(slot!=='melee'&&!inv.eq[slot]){feedOnce('no'+slot,'ยังไม่มี'+SLOTNAME[slot],'warn');return;}
  if(inv.active===slot)return;inv.active=slot;player.reloadT=0;player.swing=0;player.cool=.25;updateLoadout(true);
}
export function pickup(d,quiet){
  const it=d.item,def=DEF[it.id],gc=gradeOf(it.id)||'get';
  if(def.kind==='weapon'){
    if(!inv.eq[def.slot]){inv.eq[def.slot]=it;removeDrop(d);feed('+ '+def.name+gradeTag(it.id)+' → '+SLOTNAME[def.slot],gc);switchTo(def.slot);}
    else if(inv.bag.length<inv.cap){inv.bag.push(it);removeDrop(d);feed('+ '+def.name+gradeTag(it.id)+' (เข้ากระเป๋า)',gc);}
    else{feedOnce('full','กระเป๋าเต็ม','warn');return false;}
  } else if(def.kind==='bag'){
    if(inv.cap>=def.slots){feedOnce('hasbag','มีกระเป๋าเป้แล้ว','warn');return false;}
    inv.cap=def.slots;removeDrop(d);feed('+ กระเป๋าเป้ · ช่องเก็บของเพิ่มเป็น '+def.slots+' ช่อง');
  } else {
    const left=addStack(it.id,it.n);
    if(left===it.n){feedOnce('full','กระเป๋าเต็ม','warn',quiet?5000:1500);return false;}
    feed('+ '+def.name+' ×'+(it.n-left),def.kind==='revive'?'mil':'get');
    if(left>0)it.n=left;else removeDrop(d);
  }
  sfx.pickup();updateLoadout(true);if(!$('bag').hidden)renderBag();
  return true;
}
const HEAL_ORDER=['bandage','antibiotic','painkiller','firstaid'];
export function useHeal(){
  if(!player.alive)return;
  if(player.infect>0){const i=inv.bag.findIndex(e=>DEF[e.id].cure);if(i>=0){useItemAt(i);return;}}   // infected: cure first
  if(player.hp>=player.maxHp){feedOnce('fullhp','สุขภาพเต็มแล้ว');return;}
  for(const id of HEAL_ORDER){const i=inv.bag.findIndex(e=>e.id===id);if(i>=0){useItemAt(i);return;}}
  feedOnce('noheal','ไม่มียารักษา','warn');
}
export function useItemAt(i){const e=inv.bag[i],def=DEF[e.id];if(def.kind!=='heal')return;const amt=Math.round(player.maxHp*def.heal);player.hp=Math.min(player.maxHp,player.hp+amt);e.n--;if(e.n<=0)inv.bag.splice(i,1);
  const cured=def.cure&&player.infect>0;if(cured)cureInfection();
  feed('ใช้ '+def.name+' +'+Math.round(def.heal*100)+'%'+(cured?' · ฆ่าเชื้อแล้ว':''));sfx.heal();updateLoadout(true);}
// food and water: use whichever fixes the lower bar first
export function eatBest(){
  if(!player.alive)return;
  const has=k=>inv.bag.findIndex(e=>DEF[e.id][k]);
  const order=100-player.water>=100-player.food?['water','food']:['food','water'];
  for(const k of order){if(player[k]>=95)continue;const i=has(k);if(i>=0){useFoodAt(i);return;}}
  if(player.food>=95&&player.water>=95){feedOnce('full','ยังไม่หิวและไม่กระหาย');return;}
  feedOnce('nofood','ไม่มีอาหารหรือน้ำในกระเป๋า','warn');
}
export function useFoodAt(i){
  const e=inv.bag[i],def=DEF[e.id];if(def.kind!=='food')return;
  if(def.food)player.food=Math.min(100,player.food+def.food);if(def.water)player.water=Math.min(100,player.water+def.water);
  e.n--;if(e.n<=0)inv.bag.splice(i,1);
  feed((def.water?'ดื่ม ':'กิน ')+def.name);sfx.eat();updateLoadout(true);
}
// drop in front of the player (or the nearest open side), out of auto-pickup reach; `hold` keeps it from being picked
// straight back up until the player has walked away from it (v0.6.1: dropped ammo, meds and food used to bounce back)
export function dropItem(it){
  const p=player.pos;let x=p.x,z=p.z;
  for(const da of [0,.6,-.6,1.2,-1.2,1.9,-1.9,2.6,-2.6,Math.PI]){const a=player.face+da,qx=p.x+Math.sin(a)*1.15,qz=p.z+Math.cos(a)*1.15;if(freeAt(qx,qz,.3)&&!walledOff(p.x,p.z,qx,qz)){x=qx;z=qz;break;}}
  Object.assign(spawnDrop(it,x,z),{hold:true,mine:true});   // mine: other survivors never take it (v0.7)
}
