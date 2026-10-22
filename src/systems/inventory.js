import {$} from '../core/util.js';
import {DEF,GRADES,SLOTNAME,gradeOf} from '../config/items.js';
import {spawnDrop,removeDrop} from './drops.js';
import {uiFor} from '../ui/hud.js';
import {renderBag} from '../ui/bag.js';
import {cureInfection} from './infection.js';
import {sfxFor} from './audio.js';
import {freeAt} from '../world/collision.js';
import {walledOff} from '../world/interiors.js';

// ---------- inventory ----------
// Every player carries their own p.gear = {bag, cap, eq:{primary, secondary, melee}, active} (v0.9; it was one
// shared `inv`). Every function takes the player it acts for; messages go to that player only (uiFor).
export const freshGear=()=>({bag:[],cap:6,eq:{primary:null,secondary:null,melee:null},active:'melee'});
const bagOpen=p=>p.local&&!$('bag').hidden;
export function curWeapon(p){const g=p.gear;if(g.active!=='melee'&&!g.eq[g.active])g.active='melee';return g.eq[g.active]||{id:'fist',mag:0};}
export function countAmmo(p,t){let s=0;for(const e of p.gear.bag)if(e.id===t)s+=e.n;return s;}
export function takeAmmo(p,t,n){const bag=p.gear.bag;let got=0;for(let i=bag.length-1;i>=0&&got<n;i--){const e=bag[i];if(e.id!==t)continue;const k=Math.min(e.n,n-got);e.n-=k;got+=k;if(e.n<=0)bag.splice(i,1);}return got;}
export function addStack(p,id,n){const g=p.gear,st=DEF[id].stack;for(const e of g.bag){if(e.id===id&&e.n<st){const k=Math.min(st-e.n,n);e.n+=k;n-=k;if(!n)return 0;}}while(n>0&&g.bag.length<g.cap){const k=Math.min(st,n);g.bag.push({id,n:k});n-=k;}return n;}
export function gradeTag(id){const g=gradeOf(id);return g?' ['+GRADES[g].name+']':'';}
// a downed player (v0.10) cannot use their gear until helped up
const cant=p=>!p.alive||p.bleed>0;
export function switchTo(p,slot){
  if(cant(p))return;const g=p.gear;if(slot!=='melee'&&!g.eq[slot]){uiFor(p).feedOnce('no'+slot,'ยังไม่มี'+SLOTNAME[slot],'warn');return;}
  if(g.active===slot)return;g.active=slot;p.reloadT=0;p.swing=0;p.cool=.25;uiFor(p).updateLoadout(true);
}
// returns false when it did not fit (the item stays on the ground)
export function pickup(p,d,quiet){
  if(cant(p))return false;
  const it=d.item,def=DEF[it.id],gc=gradeOf(it.id)||'get',g=p.gear,U=uiFor(p);
  if(def.kind==='weapon'){
    if(!g.eq[def.slot]){g.eq[def.slot]=it;removeDrop(d);U.feed('+ '+def.name+gradeTag(it.id)+' → '+SLOTNAME[def.slot],gc);switchTo(p,def.slot);}
    else if(g.bag.length<g.cap){g.bag.push(it);removeDrop(d);U.feed('+ '+def.name+gradeTag(it.id)+' (เข้ากระเป๋า)',gc);}
    else{U.feedOnce('full','กระเป๋าเต็ม','warn');return false;}
  } else if(def.kind==='bag'){
    if(g.cap>=def.slots){U.feedOnce('hasbag','มีกระเป๋าเป้แล้ว','warn');return false;}
    g.cap=def.slots;removeDrop(d);U.feed('+ กระเป๋าเป้ · ช่องเก็บของเพิ่มเป็น '+def.slots+' ช่อง');
  } else {
    const left=addStack(p,it.id,it.n);
    if(left===it.n){U.feedOnce('full','กระเป๋าเต็ม','warn',quiet?5000:1500);return false;}
    U.feed('+ '+def.name+' ×'+(it.n-left),def.kind==='revive'?'mil':'get');
    if(left>0)it.n=left;else removeDrop(d);
  }
  sfxFor(p).pickup();U.updateLoadout(true);if(bagOpen(p))renderBag();
  return true;
}
const HEAL_ORDER=['bandage','antibiotic','painkiller','firstaid'];
export function useHeal(p){
  if(cant(p))return;const bag=p.gear.bag,U=uiFor(p);
  if(p.infect>0){const i=bag.findIndex(e=>DEF[e.id].cure);if(i>=0){useItemAt(p,i);return;}}   // infected: cure first
  if(p.hp>=p.maxHp){U.feedOnce('fullhp','สุขภาพเต็มแล้ว');return;}
  for(const id of HEAL_ORDER){const i=bag.findIndex(e=>e.id===id);if(i>=0){useItemAt(p,i);return;}}
  U.feedOnce('noheal','ไม่มียารักษา','warn');
}
export function useItemAt(p,i){if(cant(p)||!p.gear.bag[i])return;const e=p.gear.bag[i],def=DEF[e.id];if(def.kind!=='heal')return;const amt=Math.round(p.maxHp*def.heal);p.hp=Math.min(p.maxHp,p.hp+amt);e.n--;if(e.n<=0)p.gear.bag.splice(i,1);
  const cured=def.cure&&p.infect>0;if(cured)cureInfection(p);
  const U=uiFor(p);U.feed('ใช้ '+def.name+' +'+Math.round(def.heal*100)+'%'+(cured?' · ฆ่าเชื้อแล้ว':''));sfxFor(p).heal();U.updateLoadout(true);}
// food and water: use whichever fixes the lower bar first
export function eatBest(p){
  if(cant(p))return;const U=uiFor(p);
  const has=k=>p.gear.bag.findIndex(e=>DEF[e.id][k]);
  const order=100-p.water>=100-p.food?['water','food']:['food','water'];
  for(const k of order){if(p[k]>=95)continue;const i=has(k);if(i>=0){useFoodAt(p,i);return;}}
  if(p.food>=95&&p.water>=95){U.feedOnce('full','ยังไม่หิวและไม่กระหาย');return;}
  U.feedOnce('nofood','ไม่มีอาหารหรือน้ำในกระเป๋า','warn');
}
export function useFoodAt(p,i){
  if(cant(p)||!p.gear.bag[i])return;const e=p.gear.bag[i],def=DEF[e.id];if(def.kind!=='food')return;
  if(def.food)p.food=Math.min(100,p.food+def.food);if(def.water)p.water=Math.min(100,p.water+def.water);
  e.n--;if(e.n<=0)p.gear.bag.splice(i,1);
  const U=uiFor(p);U.feed((def.water?'ดื่ม ':'กิน ')+def.name);sfxFor(p).eat();U.updateLoadout(true);
}
// drop in front of the player (or the nearest open side), out of auto-pickup reach; `hold` keeps it from being picked
// straight back up until the player has walked away from it (v0.6.1: dropped ammo, meds and food used to bounce back)
export function dropItem(p,it){
  const q=p.pos;let x=q.x,z=q.z;
  for(const da of [0,.6,-.6,1.2,-1.2,1.9,-1.9,2.6,-2.6,Math.PI]){const a=p.face+da,qx=q.x+Math.sin(a)*1.15,qz=q.z+Math.cos(a)*1.15;if(freeAt(qx,qz,.3)&&!walledOff(q.x,q.z,qx,qz)){x=qx;z=qz;break;}}
  Object.assign(spawnDrop(it,x,z),{hold:true,mine:true});   // mine: other survivors never take it (v0.7)
}
// ---------- bag actions (v0.12) ----------
// What the bag screen does, as functions of the player, so a player on another device can ask the host for them.
const okI=(p,i)=>Number.isInteger(i)&&i>=0&&i<p.gear.bag.length;
const SLOTS=['primary','secondary','melee'];
export function equipFromBag(p,i){
  if(cant(p)||!okI(p,i))return;const g=p.gear,it=g.bag[i],d=DEF[it.id];if(d.kind!=='weapon')return;
  const old=g.eq[d.slot];g.eq[d.slot]=it;if(old)g.bag[i]=old;else g.bag.splice(i,1);g.active=d.slot;p.reloadT=0;uiFor(p).updateLoadout(true);
}
export function holdSlot(p,s){if(cant(p)||!SLOTS.includes(s)||!p.gear.eq[s])return;p.gear.active=s;p.reloadT=0;uiFor(p).updateLoadout(true);}
export function unequip(p,s){
  if(cant(p)||!SLOTS.includes(s))return;const g=p.gear,it=g.eq[s];if(!it)return;
  if(g.bag.length>=g.cap){uiFor(p).feedOnce('full','กระเป๋าเต็ม','warn');return;}
  g.bag.push(it);g.eq[s]=null;uiFor(p).updateLoadout(true);
}
export function dropFromBag(p,i){if(!p.alive||!okI(p,i))return;const it=p.gear.bag.splice(i,1)[0];dropItem(p,it);uiFor(p).updateLoadout(true);}
export function dropEquipped(p,s){if(!p.alive||!SLOTS.includes(s))return;const it=p.gear.eq[s];if(!it)return;p.gear.eq[s]=null;dropItem(p,it);uiFor(p).updateLoadout(true);}
