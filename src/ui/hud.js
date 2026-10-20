import {$} from '../core/util.js';
import {G} from '../core/state.js';
import {RATE,SPEEDS,NIGHT_START,DAY_START,DUSK_WARN,isNightTod} from '../config/time.js';
import {DEF,GRADES} from '../config/items.js';
import {agents} from '../entities/agents.js';
import {d2} from '../entities/movement.js';
import {player} from '../entities/player.js';
import {inv,curWeapon,countAmmo,gradeTag} from '../systems/inventory.js';
import {closeBag} from './bag.js';

// ---------- messages ----------
let msgTimer=0;
export function say(text,cls,dur){const m=$('msg');m.textContent=text;m.className='show '+(cls||'');msgTimer=dur||6;}
export function feed(text,cls){const f=$('feed');const el=document.createElement('div');el.textContent=text;el.className=cls||'get';f.appendChild(el);while(f.children.length>4)f.removeChild(f.firstChild);setTimeout(()=>el.remove(),3000);}
const once={};export function feedOnce(key,text,cls,gap){const t=performance.now();if(once[key]&&t-once[key]<(gap||2500))return;once[key]=t;feed(text,cls);}

// ---------- HUD ----------
const DAYS=['วันอาทิตย์','วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์'];
const pad=n=>String(n).padStart(2,'0');
export function hhmm(m){const t=Math.floor(m)%1440;return pad(Math.floor(t/60))+':'+pad(t%60);}
const txtCache=new Map();function setText(id,v){if(txtCache.get(id)===v)return;txtCache.set(id,v);$(id).textContent=v;}
export const chipEls=[...document.querySelectorAll('.chips button[data-slot]')];
let loadKey='';
export function updateLoadout(force){
  if(!player)return;
  const w=curWeapon(),def=DEF[w.id];
  const reserve=def.gun?countAmmo(def.ammo):0;
  const heals=inv.bag.reduce((s,e)=>s+(DEF[e.id].kind==='heal'?e.n:0),0);
  const key=[w.id,w.mag,reserve,inv.active,!!inv.eq.primary,!!inv.eq.secondary,!!inv.eq.melee,heals,player.reloadT>0].join('|');
  if(!force&&key===loadKey)return;loadKey=key;
  $('wName').textContent=def.name;
  const g=def.grade;$('wGrade').textContent=g?GRADES[g].name.toUpperCase()+' GRADE':'';$('loadout').style.setProperty('--wg',g?GRADES[g].color:'rgba(235,231,221,.22)');
  const am=$('wAmmo');
  if(def.gun){am.innerHTML=player.reloadT>0?'<small>รีโหลด…</small>':w.mag+' <small>/ '+reserve+'</small>';am.classList.toggle('low',w.mag<=Math.ceil(def.mag*.2));}
  else{am.textContent='—';am.classList.remove('low');}
  for(const c of chipEls){const s=c.dataset.slot;c.classList.toggle('on',inv.active===s);c.classList.toggle('empty',s!=='melee'&&!inv.eq[s]);c.title=inv.eq[s]?DEF[inv.eq[s].id].name+gradeTag(inv.eq[s].id):(s==='melee'?'มือเปล่า':'ว่าง');}
  $('healN').textContent=heals;$('bHeal').classList.toggle('empty',!heals);
  $('bReload').disabled=!def.gun;
  $('atkLabel').textContent=def.verb;
}
function fmtReal(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+pad(s%60);}
export function updateHUD(dt){
  const m=Math.floor(G.min),tod=m%1440,day=Math.floor(m/1440)+1;
  if(m!==G.lastMinShown){G.lastMinShown=m;$('clock').textContent=hhmm(m);$('dayline').textContent='วันที่ '+day+' · '+DAYS[(2+day-1)%7];}
  const night=isNightTod(tod),left=night?(tod>=NIGHT_START?1440-tod+DAY_START:DAY_START-tod):NIGHT_START-tod;
  const real=left/(RATE*SPEEDS[G.speedIdx]);
  const ph=night?'night':(tod>=DUSK_WARN?'dusk':'day');
  const pe=$('phase');if(pe.className!==ph)pe.className=ph;
  setText('phaseName',night?'NIGHT':ph==='dusk'?'NIGHT INCOMING':'DAY');
  setText('phaseEta',(night?'เช้าใน ':'มืดใน ')+fmtReal(real));
  let h=0,z=0,ty=null;for(const a of agents){if(a.state==='human'||a.state==='infected')h++;else if(a.state==='zombie'){z++;if(a.kind==='tyrant'&&!a.retreat)ty=a;}}
  setText('cH',String(h));setText('cZ',String(z));setText('cK',String(G.kills));
  const bossOn=!!ty&&Math.sqrt(d2(ty,player))<34;if($('boss').hidden===bossOn)$('boss').hidden=!bossOn;if(ty)$('bossfill').style.width=Math.max(0,ty.hp/ty.maxHp*100)+'%';
  const hp=Math.ceil(player.hp);setText('hpnum',String(hp));$('hpfill').style.width=hp+'%';
  const hu=$('hurt');const o=parseFloat(hu.style.opacity||0);if(o>0)hu.style.opacity=Math.max(0,o-dt*1.6).toFixed(3);
  if(msgTimer>0){msgTimer-=dt;if(msgTimer<=0)$('msg').classList.remove('show');}
  updateLoadout();
}
export function gameOver(){
  G.over=true;G.running=false;closeBag();
  $('sTime').textContent=hhmm(G.min);$('sDay').textContent=Math.floor(G.min/1440)+1;$('sKill').textContent=G.kills;
  $('pStart').hidden=true;$('pOver').hidden=false;$('overlay').hidden=false;$('bAgain').focus();
}
