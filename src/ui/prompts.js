import {$} from '../core/util.js';
import {G} from '../core/state.js';
import {DEF,itemColor} from '../config/items.js';
import {DOOR_HP,PLANK_HP,REBUILD_PLANKS} from '../config/shelter.js';
import {player} from '../entities/player.js';
import {drops} from '../systems/drops.js';
import {gradeTag,countAmmo} from '../systems/inventory.js';
import {fixAction} from '../systems/doors.js';

// ---------- action prompts (v0.9: moved out of the player and door code) ----------
// The pick button (E) shows what is in reach for the player on this device: an item, "bag full" over loot that
// does not fit, or the door; the hammer button (B) shows when they carry planks next to a door they can board.
function pick(key,verb,name,color){
  const bp=$('bPick');if(!bp.hidden&&bp.dataset.for===key)return;
  bp.hidden=false;bp.dataset.for=key;$('pickVerb').textContent=verb;$('pickName').textContent=name;bp.style.setProperty('--pg',color);bp.style.borderColor=color;
}
export function updatePrompts(){
  const p=player,bp=$('bPick'),bf=$('bFix');
  if(!p||!p.alive||!G.running){if(!bp.hidden)bp.hidden=true;if(!bf.hidden)bf.hidden=true;return;}
  if(p.full)pick('full'+drops.indexOf(p.full),'','กระเป๋าเต็ม · '+DEF[p.full.item.id].name,'#ff8f7c');   // opens the bag to make room (v0.6.1)
  else if(p.near)pick(String(drops.indexOf(p.near)),'เก็บ ',DEF[p.near.item.id].name+gradeTag(p.near.item.id),itemColor(p.near.item.id));
  else if(p.nearDoor>=0){const st=G.doors[p.nearDoor],label=(st.open?'ปิดประตู':'เปิดประตู')+(st.hp!==DOOR_HP?' · '+Math.round(st.hp/DOOR_HP*100)+'%':'');pick('door'+p.nearDoor+label,'',label,'#e2a64a');}
  else if(!bp.hidden)bp.hidden=true;
  const k=p.fixDoor,have=countAmmo(p,'planks'),act=k>=0?fixAction(k):null;
  if(!(k>=0&&have>0&&(act==='rebuild'||act==='board'))){if(!bf.hidden)bf.hidden=true;return;}
  const label=(act==='rebuild'?'ซ่อมประตู ('+REBUILD_PLANKS+' แผ่น)':'ตอกไม้ +'+Math.round(PLANK_HP/DOOR_HP*100)+'%')+' · มี '+have;
  if(bf.hidden||bf.dataset.for!==label){bf.hidden=false;bf.dataset.for=label;$('fixName').textContent=label;}
}
