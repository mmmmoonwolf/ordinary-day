import {$} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {DEF,GRADES,durPct} from '../config/items.js';
import {diffOf} from '../config/difficulty.js';
import {agents} from '../entities/agents.js';
import {d2} from '../entities/movement.js';
import {player,players} from '../entities/player.js';
import {PVP} from '../config/pvp.js';
import {curWeapon,countAmmo,gradeTag} from '../systems/inventory.js';
import {closeBag} from './bag.js';
import {ZC} from '../config/zombies.js';
import {nightsSurvived} from '../config/goal.js';
import {recordRun} from '../systems/records.js';
import {playLocal} from '../systems/audio.js';
import {send,isClient} from '../core/bus.js';
import {FX} from '../systems/effects.js';
import {throwPick} from '../systems/throw.js';
const THROW_ICON={molotov:'🔥',grenade:'💣',flare:'🎆'};
import {shake} from './feel.js';

// ---------- messages ----------
let msgTimer=0;
// say() / feed() are for everyone (night, radio, a Tyrant): shown here and sent to the other devices (v0.11)
function showSay(text,cls,dur){if(cls==='radio')playLocal('radio');const m=$('msg');m.textContent=text;m.className='show '+(cls||'');msgTimer=dur||6;}
export function say(...a){showSay(...a);send('*','say',a);}
export function feed(...a){showFeed(...a);send('*','feed',a);}
function showFeed(text,cls){const f=$('feed');const el=document.createElement('div');el.textContent=text;el.className=cls||'get';f.appendChild(el);while(f.children.length>4)f.removeChild(f.firstChild);setTimeout(()=>el.remove(),3000);}
const once={};export function feedOnce(key,text,cls,gap){const t=performance.now();if(once[key]&&t-once[key]<(gap||2500))return;once[key]=t;showFeed(text,cls);}
function hurtFlash(){$('hurt').style.opacity=.85;playLocal('hurt');shake(.35);}   // v0.31 the camera jolts
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
const pad=n=>String(n).padStart(2,'0');
export function hhmm(m){const t=Math.floor(m)%1440;return pad(Math.floor(t/60))+':'+pad(t%60);}
const txtCache=new Map();function setText(id,v){if(txtCache.get(id)===v)return;txtCache.set(id,v);$(id).textContent=v;}
export const chipEls=[...document.querySelectorAll('.chips button[data-slot]')];
let loadKey='';
export function updateLoadout(force){
  if(!player)return;
  const inv=player.gear,w=curWeapon(player),def=DEF[w.id];
  const reserve=def.gun?countAmmo(player,def.ammo):0;
  const heals=inv.bag.reduce((s,e)=>s+(DEF[e.id].kind==='heal'?e.n:0),0);
  const key=[w.id,w.mag,w.dur,reserve,inv.active,!!inv.eq.primary,!!inv.eq.secondary,!!inv.eq.melee,heals,player.reloadT>0].join('|');
  if(!force&&key===loadKey)return;loadKey=key;
  $('wName').textContent=def.name;
  const g=def.grade;$('wGrade').textContent=g?GRADES[g].name.toUpperCase()+' GRADE':'';$('loadout').style.setProperty('--wg',g?GRADES[g].color:'rgba(235,231,221,.22)');
  const am=$('wAmmo');
  if(def.gun){am.innerHTML=player.reloadT>0?'<small>รีโหลด…</small>':w.mag+' <small>/ '+reserve+'</small>';am.classList.toggle('low',w.mag<=Math.ceil(def.mag*.2));}
  else if(def.dur){const p=durPct(w);am.innerHTML=Math.ceil(p*100)+'<small>%</small>';am.title='ความทน';am.classList.toggle('low',p<=.2);}
  else{am.textContent='—';am.classList.remove('low');}
  for(const c of chipEls){const s=c.dataset.slot;c.classList.toggle('on',inv.active===s);c.classList.toggle('empty',s!=='melee'&&!inv.eq[s]);c.title=inv.eq[s]?DEF[inv.eq[s].id].name+gradeTag(inv.eq[s].id):(s==='melee'?'มือเปล่า':'ว่าง');}
  $('healN').textContent=heals;$('bHeal').classList.toggle('empty',!heals);
  const tid=throwPick(inv),tn=tid?inv.bag.reduce((s,e)=>s+(e.id===tid?e.n:0),0):0;$('bThrow').hidden=!tn;$('throwN').textContent=tn;   // v0.23 the picked throwable
  if(tid){$('throwIc').textContent=THROW_ICON[tid];$('bThrow').title='ขว้าง '+DEF[tid].name+' (Q)';}
  $('bReload').disabled=!def.gun;
  $('atkLabel').textContent=def.verb;
}
let stanceShown=-1;
export function updateHUD(dt){
  const sv=player.alive&&!(player.bleed>0)&&player.sneak?1:0;if(sv!==stanceShown){stanceShown=sv;$('stanceTag').hidden=!sv;$('stanceTag').textContent='ย่อง';}   // v0.29, v0.44 only sneaking
  // v0.42 no clock, day, phase, time speed or head counts on screen: light, sound and what happens tell the time
  let ty=null;for(const a of agents)if(a.state==='zombie'&&a.kind==='tyrant'&&!a.retreat)ty=a;
  const bossOn=!!ty&&Math.sqrt(d2(ty,player))<34;if($('boss').hidden===bossOn)$('boss').hidden=!bossOn;if(ty)$('bossfill').style.width=Math.max(0,ty.hp/ty.maxHp*100)+'%';
  const hp=Math.ceil(player.hp);setText('hpnum',String(hp));$('hpfill').style.width=hp+'%';
  const inf=player.infect>0;if($('infRow').hidden===inf)$('infRow').hidden=!inf;
  if(inf){const pc=Math.floor(player.infect*100);setText('infnum',pc+'%');$('inffill').style.width=pc+'%';}
  const hu=$('hurt');const o=parseFloat(hu.style.opacity||0);if(o>0)hu.style.opacity=Math.max(0,o-dt*1.6).toFixed(3);
  if(msgTimer>0){msgTimer-=dt;if(msgTimer<=0)$('msg').classList.remove('show');}
  updateLoadout();
}
const ENDINGS={
  hurt:{eyebrow:'GAME OVER',title:'คุณไม่รอด',text:'บาดเจ็บหนักจนไปต่อไม่ไหว'},
  infected:{eyebrow:'GAME OVER',title:'คุณกลายเป็นซอมบี้',text:'เชื้อลามถึง 100% ก่อนได้ใช้ Antibiotic'},
  won:{eyebrow:'ESCAPED',title:'คุณรอดแล้ว',text:'ทหารเปิดทางหลวงให้ผู้รอดชีวิตออกจากเมือง เดินทางต่อไปเมืองอื่น'},   // v0.46 (was the rescue helicopter)
};
const escHtml=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// v0.49 the end of a PvP round: who won, everyone's kills and deaths, the next round on its own (systems/pvp.js)
function pvpOver(){
  const L=players.filter(p=>!p.away).sort((a,b)=>(b.frags||0)-(a.frags||0)||(a.deaths||0)-(b.deaths||0)),top=L[0],tie=L[1]&&(L[1].frags||0)===(top.frags||0);
  $('oEyebrow').textContent='PVP · จบรอบ';$('oTitle').textContent=tie?'เสมอ':top===player?'คุณชนะ':(top?top.name:'')+' ชนะ';
  $('oCause').textContent=(top&&(top.frags||0)>=PVP.round.kills?'ฆ่าครบ '+PVP.round.kills+' ก่อน':'หมดเวลา '+PVP.round.minutes+' นาที');
  $('sKillsBy').innerHTML=L.map(p=>'<span>'+escHtml(p.name)+' — <b>'+(p.frags||0)+'</b> ฆ่า · '+(p.deaths||0)+' ตาย</span>').join('');
  $('pOver').classList.add('pvp');$('sBest').innerHTML='';
  $('bAgain').textContent='รอบใหม่';$('bAgain').hidden=isClient();$('overNote').textContent='รอบใหม่เริ่มเองใน '+PVP.round.gap+' วินาที';$('bOverTitle').hidden=!isClient();
  $('pStart').hidden=true;$('pOver').hidden=false;$('overlay').hidden=false;
}
export function gameOver(){
  if(G.over)return;
  G.over=true;G.running=false;closeBag();$('pause').hidden=true;G.paused=false;
  if(isPvp()){pvpOver();return;}
  $('pOver').classList.remove('pvp');$('bAgain').textContent='เล่นอีกครั้ง';
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
