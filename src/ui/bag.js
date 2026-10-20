import {$} from '../core/util.js';
import {G} from '../core/state.js';
import {ctl,joy} from '../core/controls.js';
import {DEF,GRADES,SLOTNAME,itemColor} from '../config/items.js';
import {player} from '../entities/player.js';
import {inv,useItemAt,dropItem} from '../systems/inventory.js';
import {feedOnce,updateLoadout} from './hud.js';

// ---------- bag UI ----------
let sel=null;
function bars(label,v){let s='';for(let i=1;i<=10;i++)s+=`<i class="${i<=v?'on':''}"></i>`;return `<span>${label}</span><div class="t">${s}</div><b>${v}/10</b>`;}
function itemDesc(it){
  const d=DEF[it.id];
  if(d.kind==='weapon'){
    if(d.gun)return SLOTNAME[d.slot]+' · แม็ก '+d.mag+' นัด · ใช้กระสุน '+DEF[d.ammo].name+(d.auto?' · ยิงอัตโนมัติ':'')+(d.pierce?' · ทะลุได้ '+d.pierce+' ตัว':'')+(d.heavy?' · เดินช้าลงขณะยิง':'')+' · ในแม็กตอนนี้ '+it.mag+' นัด';
    return SLOTNAME[d.slot]+' · ระยะ '+(d.range||1.4).toFixed(1)+' ม.'+(d.cleave?' · โดนหลายตัวในวงฟัน':'');}
  if(d.kind==='ammo')return 'มี '+it.n+' นัด (สูงสุด '+d.stack+' นัดต่อช่อง)';
  if(d.kind==='heal')return 'ฟื้น '+Math.round(d.heal*100)+'% ของ HP สูงสุด'+(d.cure?' และรักษาการติดเชื้อ':'')+' · มี '+it.n+' ชิ้น';
  if(d.kind==='revive')return 'ทำงานอัตโนมัติเมื่อ HP หมด ชุบชีวิตด้วย HP 100% (ใช้ครั้งเดียว)';
  return '';
}
function cellHTML(it,extra){const d=DEF[it.id];const ct=(d.kind==='ammo'||d.kind==='heal'||d.kind==='revive')?it.n:(d.gun?it.mag:'');const g=d.grade?`<span class="sl">${GRADES[d.grade].name}</span>`:'';return `${extra||g}<span class="nm">${d.name}</span><span class="ct">${ct}</span>`;}
export function renderBag(){
  const eq=$('bagEq');eq.innerHTML='';
  for(const s of ['primary','secondary','melee']){
    const it=inv.eq[s];const b=document.createElement('button');b.className='cell'+(it?'':' blank')+(sel&&sel.where==='eq'&&sel.slot===s?' sel':'');
    if(it)b.style.setProperty('--cat',itemColor(it.id));
    b.innerHTML=it?cellHTML(it,`<span class="sl">${SLOTNAME[s]}</span>`):`<span class="sl">${SLOTNAME[s]}</span><span class="nm" style="color:var(--ink-dim)">${s==='melee'?'มือเปล่า':'ว่าง'}</span>`;
    if(it)b.onclick=()=>{sel={where:'eq',slot:s};renderBag();};
    eq.appendChild(b);
  }
  const grid=$('bagGrid');grid.innerHTML='';
  for(let i=0;i<inv.cap;i++){
    const it=inv.bag[i];const b=document.createElement('button');
    if(!it){b.className='cell blank';b.disabled=true;grid.appendChild(b);continue;}
    b.className='cell'+(sel&&sel.where==='bag'&&sel.i===i?' sel':'');b.style.setProperty('--cat',itemColor(it.id));b.innerHTML=cellHTML(it);
    b.onclick=()=>{sel={where:'bag',i};renderBag();};grid.appendChild(b);
  }
  const cap=$('bagCap');cap.textContent=inv.bag.length+'/'+inv.cap;cap.classList.toggle('full',inv.bag.length>=inv.cap);
  $('bagLabel').textContent=inv.cap>6?'ช่องเก็บของ · กระเป๋าเป้':'ช่องเก็บของ · กระเป๋ากางเกง (หากระเป๋าเป้เพื่อเพิ่มช่อง)';
  const det=$('bagDetail');det.innerHTML='';det.style.removeProperty('--cat');
  const it=sel?(sel.where==='bag'?inv.bag[sel.i]:inv.eq[sel.slot]):null;
  if(!it){sel=null;det.innerHTML='<p>แตะไอเท็มเพื่อดูรายละเอียด ติดตั้ง ใช้ หรือทิ้ง</p>';return;}
  const d=DEF[it.id];det.style.setProperty('--cat',itemColor(it.id));
  det.innerHTML=`<h3>${d.name}${d.grade?`<small>${GRADES[d.grade].name.toUpperCase()} GRADE</small>`:''}</h3>`+(d.kind==='weapon'?`<div class="sbars">${bars('DMG',d.dmgR)}${d.gun?bars('FIRE RATE',d.rateR):''}</div>`:'')+`<p>${itemDesc(it)}</p>`;
  const acts=document.createElement('div');acts.className='acts';
  const btn=(label,fn,pri,dis)=>{const b=document.createElement('button');b.textContent=label;if(pri)b.className='pri';if(dis)b.disabled=true;b.onclick=()=>{fn();updateLoadout(true);renderBag();};acts.appendChild(b);};
  if(sel.where==='bag'){
    if(d.kind==='weapon')btn(inv.eq[d.slot]?'สลับกับ '+DEF[inv.eq[d.slot].id].name:'ติดตั้ง',()=>{const old=inv.eq[d.slot];inv.eq[d.slot]=it;if(old)inv.bag[sel.i]=old;else inv.bag.splice(sel.i,1);inv.active=d.slot;player.reloadT=0;sel={where:'eq',slot:d.slot};},true);
    if(d.kind==='heal')btn('ใช้',()=>{useItemAt(sel.i);if(inv.bag[sel.i]!==it)sel=null;},true,player.hp>=player.maxHp&&!(d.cure&&player.infect>0));
    btn('ทิ้ง',()=>{inv.bag.splice(sel.i,1);dropItem(it);sel=null;});
  } else {
    if(inv.active!==sel.slot)btn('ถือ',()=>{inv.active=sel.slot;player.reloadT=0;},true);
    btn('ถอดเก็บเข้ากระเป๋า',()=>{if(inv.bag.length>=inv.cap){feedOnce('full','กระเป๋าเต็ม','warn');return;}inv.bag.push(it);inv.eq[sel.slot]=null;sel=null;});
    btn('ทิ้ง',()=>{inv.eq[sel.slot]=null;dropItem(it);sel=null;});
  }
  det.appendChild(acts);
}
export function openBag(){if(!G.running||!player.alive)return;sel=null;renderBag();$('bag').hidden=false;G.paused=true;ctl.fireHeld=false;joy.id=null;$('joy').hidden=true;$('bagClose').focus();}
export function closeBag(){if($('bag').hidden)return;$('bag').hidden=true;G.paused=false;updateLoadout(true);}
