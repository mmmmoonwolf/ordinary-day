import {$} from '../core/util.js';
import {G} from '../core/state.js';
import {RATE,SPEEDS,NIGHT_START,DAY_START,DUSK_WARN,isNightTod} from '../config/time.js';
import {DEF,GRADES,durPct} from '../config/items.js';
import {diffOf} from '../config/difficulty.js';
import {agents} from '../entities/agents.js';
import {d2} from '../entities/movement.js';
import {player,isSolo} from '../entities/player.js';
import {curWeapon,countAmmo,gradeTag} from '../systems/inventory.js';
import {closeBag} from './bag.js';
import {ZC} from '../config/zombies.js';
import {GOAL_NIGHTS,nightsSurvived} from '../config/goal.js';
import {recordRun} from '../systems/records.js';
import {playLocal} from '../systems/audio.js';
import {send,isClient} from '../core/bus.js';
import {FX} from '../systems/effects.js';
import {throwPick} from '../systems/throw.js';
const THROW_ICON={bottle:'🍾',molotov:'🔥',grenade:'💣',flare:'🎆'};
import {clearTip} from './tips.js';

// ---------- messages ----------
let msgTimer=0;
// say() / feed() are for everyone (night, radio, a Tyrant): shown here and sent to the other devices (v0.11)
function showSay(text,cls,dur){if(cls==='radio')playLocal('radio');const m=$('msg');m.textContent=text;m.className='show '+(cls||'');msgTimer=dur||6;}
export function say(...a){showSay(...a);send('*','say',a);}
export function feed(...a){showFeed(...a);send('*','feed',a);}
function showFeed(text,cls){const f=$('feed');const el=document.createElement('div');el.textContent=text;el.className=cls||'get';f.appendChild(el);while(f.children.length>4)f.removeChild(f.firstChild);setTimeout(()=>el.remove(),3000);}
const once={};export function feedOnce(key,text,cls,gap){const t=performance.now();if(once[key]&&t-once[key]<(gap||2500))return;once[key]=t;showFeed(text,cls);}
function hurtFlash(){$('hurt').style.opacity=.85;playLocal('hurt');}
// messages meant for one player: shown when it is the player on this device, otherwise sent to theirs (v0.11;
// nothing goes anywhere while nobody plays online)
const LOCAL={say:showSay,feed:showFeed,feedOnce,updateLoadout:f=>updateLoadout(f),hurt:hurtFlash};
const away={};
function remote(id){
  const onceAt={};
  return {say:(...a)=>send(id,'say',a),feed:(...a)=>send(id,'feed',a),updateLoadout:()=>send(id,'loadout'),hurt:()=>send(id,'hurt'),
    feedOnce(key,text,cls,gap){const t=performance.now();if(onceAt[key]&&t-onceAt[key]<(gap||2500))return;onceAt[key]=t;send(id,'feed',[text,cls]);}};
}
export function uiFor(p){return p===player?LOCAL:away[p.id]||(away[p.id]=remote(p.id));}
// on another device: what the host sent ({kind, args} from core/bus.js) is shown and played here
export function receive(m){
  const a=m.args||[];
  if(m.kind==='say')showSay(...a);else if(m.kind==='feed')showFeed(...a);else if(m.kind==='hurt')hurtFlash();
  else if(m.kind==='loadout')updateLoadout(true);else if(m.kind==='sfx')playLocal(...a);else if(m.kind==='fx'&&FX[a[0]])FX[a[0]](...a.slice(1));
}

// ---------- HUD ----------
const DAYS=['วันอาทิตย์','วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์'];
const pad=n=>String(n).padStart(2,'0');
export function hhmm(m){const t=Math.floor(m)%1440;return pad(Math.floor(t/60))+':'+pad(t%60);}
const txtCache=new Map();function setText(id,v){if(txtCache.get(id)===v)return;txtCache.set(id,v);$(id).textContent=v;}
export const chipEls=[...document.querySelectorAll('.chips button[data-slot]')];
let loadKey='';
export function updateLoadout(force){
  if(!player)return;
  const inv=player.gear,w=curWeapon(player),def=DEF[w.id];
  const reserve=def.gun?countAmmo(player,def.ammo):0;
  const heals=inv.bag.reduce((s,e)=>s+(DEF[e.id].kind==='heal'?e.n:0),0),foods=inv.bag.reduce((s,e)=>s+(DEF[e.id].kind==='food'?e.n:0),0);
  const key=[w.id,w.mag,w.dur,reserve,inv.active,!!inv.eq.primary,!!inv.eq.secondary,!!inv.eq.melee,heals,foods,player.reloadT>0].join('|');
  if(!force&&key===loadKey)return;loadKey=key;
  $('wName').textContent=def.name;
  const g=def.grade;$('wGrade').textContent=g?GRADES[g].name.toUpperCase()+' GRADE':'';$('loadout').style.setProperty('--wg',g?GRADES[g].color:'rgba(235,231,221,.22)');
  const am=$('wAmmo');
  if(def.gun){am.innerHTML=player.reloadT>0?'<small>รีโหลด…</small>':w.mag+' <small>/ '+reserve+'</small>';am.classList.toggle('low',w.mag<=Math.ceil(def.mag*.2));}
  else if(def.dur){const p=durPct(w);am.innerHTML=Math.ceil(p*100)+'<small>%</small>';am.title='ความทน';am.classList.toggle('low',p<=.2);}
  else{am.textContent='—';am.classList.remove('low');}
  for(const c of chipEls){const s=c.dataset.slot;c.classList.toggle('on',inv.active===s);c.classList.toggle('empty',s!=='melee'&&!inv.eq[s]);c.title=inv.eq[s]?DEF[inv.eq[s].id].name+gradeTag(inv.eq[s].id):(s==='melee'?'มือเปล่า':'ว่าง');}
  $('healN').textContent=heals;$('bHeal').classList.toggle('empty',!heals);
  $('eatN').textContent=foods;$('bEat').classList.toggle('empty',!foods);
  const tid=throwPick(inv),tn=tid?inv.bag.reduce((s,e)=>s+(e.id===tid?e.n:0),0):0;$('bThrow').hidden=!tn;$('throwN').textContent=tn;   // v0.7 bottles, v0.23 the picked throwable
  if(tid){$('throwIc').textContent=THROW_ICON[tid];$('bThrow').title='ขว้าง '+DEF[tid].name+' (Q)';}
  $('bReload').disabled=!def.gun;
  $('atkLabel').textContent=def.verb;
}
function fmtReal(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+pad(s%60);}
let soloShown=true;
export function updateHUD(dt){
  const solo=isSolo();if(solo!==soloShown){soloShown=solo;$('bSpeed').hidden=!solo;$('bSpeed').textContent='×'+SPEEDS[G.speedIdx];}   // ×2 / ×4 only alone (v0.11)
  const m=Math.floor(G.min),tod=m%1440,day=Math.floor(m/1440)+1;
  if(m!==G.lastMinShown){G.lastMinShown=m;$('clock').textContent=hhmm(m);$('dayline').innerHTML='วันที่ '+day+'<span class="wd"> · '+DAYS[(2+day-1)%7]+'</span> · รอด '+Math.min(nightsSurvived(m),GOAL_NIGHTS)+'/'+GOAL_NIGHTS+' คืน';}
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
  $('foodfill').style.width=Math.ceil(player.food)+'%';$('waterfill').style.width=Math.ceil(player.water)+'%';
  const inf=player.infect>0;if($('infRow').hidden===inf)$('infRow').hidden=!inf;
  if(inf){const pc=Math.floor(player.infect*100);setText('infnum',pc+'%');$('inffill').style.width=pc+'%';}
  const hu=$('hurt');const o=parseFloat(hu.style.opacity||0);if(o>0)hu.style.opacity=Math.max(0,o-dt*1.6).toFixed(3);
  if(msgTimer>0){msgTimer-=dt;if(msgTimer<=0)$('msg').classList.remove('show');}
  updateLoadout();
}
const ENDINGS={
  hurt:{eyebrow:'GAME OVER',title:'คุณไม่รอด',text:'บาดเจ็บหนักจนไปต่อไม่ไหว'},
  infected:{eyebrow:'GAME OVER',title:'คุณกลายเป็นซอมบี้',text:'เชื้อลามถึง 100% ก่อนได้ใช้ Antibiotic'},
  starved:{eyebrow:'GAME OVER',title:'คุณไม่รอด',text:'ขาดอาหารหรือน้ำนานเกินไป'},
  won:{eyebrow:'RESCUED',title:'คุณรอดแล้ว',text:'เฮลิคอปเตอร์กู้ภัยพาคุณออกจากเมืองได้สำเร็จ'},
};
export function gameOver(){
  if(G.over)return;
  G.over=true;G.running=false;closeBag();clearTip();$('pause').hidden=true;G.paused=false;
  const end=ENDINGS[G.endCause]||ENDINGS.hurt,nights=nightsSurvived(G.min);
  $('oEyebrow').textContent=end.eyebrow+' · '+diffOf(G).name;$('oTitle').textContent=end.title;$('oCause').textContent=end.text;
  $('sNights').textContent=nights;$('sTime').textContent=hhmm(G.min);$('sDay').textContent=Math.floor(G.min/1440)+1;$('sKill').textContent=G.kills;
  $('sKillsBy').innerHTML=Object.keys(ZC).map(k=>'<span>'+ZC[k].name+'<b>'+(G.killsBy[k]||0)+'</b></span>').join('');
  const {best,isNew}=recordRun({nights,kills:G.kills,won:G.endCause==='won',diff:G.diff});
  $('sBest').innerHTML=(isNew?'<span class="new">สถิติใหม่! </span>':'')+'สถิติดีสุด ('+diffOf(G).name+'): รอด '+best.nights+' คืน · กำจัด '+best.kills+' ตัว'+(best.wins?' · รอดสำเร็จ '+best.wins+' ครั้ง':'');
  // in a friend's room only the host starts the next day (v0.12)
  $('bAgain').hidden=isClient();$('overNote').textContent=isClient()?'รอเจ้าของห้องเริ่มวันใหม่ หรือกลับหน้าแรก':'';$('bOverTitle').hidden=!isClient();
  $('pStart').hidden=true;$('pOver').hidden=false;$('overlay').hidden=false;$('bAgain').focus();
}
