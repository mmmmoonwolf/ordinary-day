import {useOf} from '../entities/use.js';
import {$} from '../core/util.js';
import {G} from '../core/state.js';
import {DEF,itemColor} from '../config/items.js';
import {DOOR_HP} from '../config/shelter.js';
import {player} from '../entities/player.js';
import {drops} from '../systems/drops.js';
import {gradeTag} from '../systems/inventory.js';
import {fixAction} from '../systems/doors.js';
import {REVIVE_SECONDS} from '../config/party.js';
import {jobOf} from '../config/jobs.js';
import {SEARCH_SECONDS} from '../config/search.js';
import {boxName} from '../systems/search.js';

// ---------- action prompts (v0.9: moved out of the player and door code) ----------
// The pick button (E) shows what is in reach for the player on this device: an item, "bag full" over loot that
// does not fit, or the door; the hammer button (B) shows next to a broken door (v0.42 no planks needed).
function pick(key,verb,name,color){
  const bp=$('bPick');if(!bp.hidden&&bp.dataset.for===key)return;
  bp.hidden=false;bp.dataset.for=key;$('pickVerb').textContent=verb;$('pickName').textContent=name;bp.style.setProperty('--pg',color);bp.style.borderColor=color;
}
export function updatePrompts(){
  const p=player,bp=$('bPick'),bf=$('bFix');
  if(!p||!p.alive||!G.running){if(!bp.hidden)bp.hidden=true;if(!bf.hidden)bf.hidden=true;return;}
  if(p.bleed>0)pick('downed'+Math.ceil(p.bleed)+'·'+Math.round(p.reviveT*10),'',p.reviveT>0?'เพื่อนกำลังช่วย '+Math.round(p.reviveT*100)+'%':'ล้ม · รอเพื่อนช่วย '+Math.ceil(p.bleed)+' วิ','#ff8f7c');   // shown, not pressed (v0.10)
  else if(p.helping)pick('help'+Math.round(p.helpT*10),'',(p.helping.alive?'ช่วยพยุงเพื่อน ':'ชุบเพื่อน ')+Math.min(100,Math.round(p.helpT/(REVIVE_SECONDS*(jobOf(p).revive||1))*100))+'%','#7fc8ff');
  else if(p.searching>=0)pick('srch'+Math.round(p.searchT*10),'','ค้น'+boxName(p.searching)+' '+Math.min(100,Math.round(p.searchT/SEARCH_SECONDS*100))+'%','#c9b27a');   // v0.15
  else{
    const u=useOf(p);   // the same answer the action gets (entities/use.js)
    if(!u){if(!bp.hidden)bp.hidden=true;}
    else if(u.k==='help')u.q.alive?pick('down','','ช่วยเพื่อนลุก','#7fc8ff')
      :p.gear.bag.some(e=>e.id==='resurrect')?pick('kit','','ชุบเพื่อนด้วย Kit','#7fc8ff'):pick('nokit','','เพื่อนตาย · ต้องมี Kit','#8a8a86');   // v0.11
    else if(u.k==='full')pick('full'+drops.indexOf(u.d),'','กระเป๋าเต็ม · '+DEF[u.d.item.id].name,'#ff8f7c');   // opens the bag to make room (v0.6.1)
    else if(u.k==='pick')pick(String(drops.indexOf(u.d)),'เก็บ ',DEF[u.d.item.id].name+gradeTag(u.d.item.id),itemColor(u.d.item.id));
    else if(u.k==='out')pick('out'+u.id,'','ลงจากรถ','#9fd3a0');   // v0.45
    else if(u.k==='ladder')pick('lad'+u.id+(p.airH>1.5?'d':'u'),'',p.airH>1.5?'ปีนลง':'ปีนขึ้นหลังคา','#c9c3b4');   // v0.63
    else if(u.k==='door'){const st=G.doors[u.id],label=(st.open?'ปิดประตู':st.bar?'รื้อที่กั้น':'เปิดประตู')+(st.hp!==DOOR_HP?' · '+Math.round(st.hp/DOOR_HP*100)+'%':'');pick('door'+u.id+label,'',label,'#e2a64a');}
    else if(u.k==='box')pick('box'+u.id,'ค้น ',boxName(u.id),'#c9b27a');
    else if(u.k==='car')pick('car'+u.id,'','ขึ้นรถ','#9fd3a0');
  }
  const k=p.fixDoor;
  const st=k>=0&&G.doors[k],how=!st?null:st.broken?'rebuild':!st.open&&!st.bar?'barricade':null;   // p.fixDoor: the host already checked it (a friend's device has no p.room)
  if(!how){if(!bf.hidden)bf.hidden=true;return;}
  const label=how==='barricade'?'กั้นประตู':'ซ่อมประตู';   // v0.59
  if(bf.hidden||bf.dataset.for!==label){bf.hidden=false;bf.dataset.for=label;$('fixName').textContent=label;}
}
