import {$,isTouch} from '../core/util.js';
import {G} from '../core/state.js';
import {SPEEDS} from '../config/time.js';
import {VERSION,REPO} from '../config/version.js';
import {diffOf} from '../config/difficulty.js';
import {agents} from '../entities/agents.js';
import {player} from '../entities/player.js';
import {inv} from '../systems/inventory.js';
import {hhmm} from './hud.js';

// ---------- bug report ----------
// "แจ้งบั๊ก" in the pause menu: the player writes what happened, sees exactly what gets attached (version, game
// state, device, the last script errors; nothing personal), then copies it for a chat or opens a GitHub issue.
const errors=[];   // the last few uncaught errors, kept from page load
const keep=(msg,where)=>{errors.push(new Date().toTimeString().slice(0,8)+' '+String(msg).slice(0,200)+(where?' @ '+where:''));if(errors.length>5)errors.shift();};
addEventListener('error',e=>keep(e.message,e.filename?e.filename.split('/').slice(-2).join('/')+':'+e.lineno:''));
addEventListener('unhandledrejection',e=>keep('promise: '+(e.reason&&e.reason.message||e.reason)));

export function reportInfo(){
  const zs=agents.filter(a=>a.state==='zombie'),ppl=agents.filter(a=>a.state==='human').length,p=player;
  return [
    'เวอร์ชัน: '+VERSION,
    'ในเกม: วันที่ '+(Math.floor(G.min/1440)+1)+' '+hhmm(G.min)+' · '+(G.phase==='night'?'NIGHT':'DAY')+' · '+diffOf(G).name+' · ×'+SPEEDS[G.speedIdx],
    'ผู้เล่น: HP '+Math.round(p.hp)+' · อาหาร '+Math.round(p.food)+' · น้ำ '+Math.round(p.water)+' · ติดเชื้อ '+Math.round((p.infect||0)*100)+'%'+(p.room>=0?' · อยู่ในตึก '+p.room:''),
    'กระเป๋า: '+inv.bag.length+'/'+inv.cap+' · ถือ '+(inv.eq[inv.active]?inv.eq[inv.active].id:'fist')+' · '+inv.bag.map(e=>e.id+(e.n?'×'+e.n:'')).join(', '),
    'โลก: ซอมบี้ '+zs.length+' ('+[...new Set(zs.map(z=>z.kind))].join(',')+') · ประชาชน '+ppl+' · ประตู '+(G.doors||[]).map(d=>d.broken?'x':d.open?'o':'c').join(''),
    'อุปกรณ์: '+(isTouch?'จอสัมผัส':'เมาส์/คีย์บอร์ด')+' · จอ '+innerWidth+'×'+innerHeight+' @'+(devicePixelRatio||1)+' · '+navigator.userAgent,
    'error ล่าสุด: '+(errors.length?'\n  '+errors.join('\n  '):'ไม่มี'),
  ].join('\n');
}
function fullText(){const note=$('reportNote').value.trim();return (note?'เกิดอะไรขึ้น: '+note+'\n\n':'')+reportInfo();}
function issueUrl(){
  const note=$('reportNote').value.trim(),title='[บั๊ก '+VERSION+'] '+(note.split('\n')[0].slice(0,60)||'แจ้งจากในเกม');
  const body='**เกิดอะไรขึ้น**\n'+(note||'(ไม่ได้เขียน)')+'\n\n**ข้อมูลจากเกม**\n```\n'+reportInfo().slice(0,5000)+'\n```';
  return REPO+'/issues/new?labels=bug&title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body);
}
const msg=t=>{$('reportMsg').textContent=t;};
export function openReport(){$('pacts').hidden=true;$('reportBox').hidden=false;$('reportText').value=reportInfo();msg('');$('reportNote').focus();}
export function closeReport(){$('reportBox').hidden=true;$('pacts').hidden=false;}
export function initReport(){
  $('bReport').addEventListener('click',openReport);
  $('bReportBack').addEventListener('click',closeReport);
  $('bCopyReport').addEventListener('click',()=>{
    const t=fullText(),fallback=()=>{const a=$('reportText');a.value=t;a.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}msg(ok?'คัดลอกแล้ว วางในแชตที่ส่งให้ผู้สร้างเกมได้เลย':'คัดลอกเองไม่ได้ กดค้างที่กล่องข้อความแล้วเลือกคัดลอก');};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>msg('คัดลอกแล้ว วางในแชตที่ส่งให้ผู้สร้างเกมได้เลย'),fallback);else fallback();
  });
  $('bOpenIssue').addEventListener('click',()=>{window.open(issueUrl(),'_blank','noopener');msg('เปิดหน้า GitHub ในแท็บใหม่แล้ว (ต้องมีบัญชี GitHub) ถ้าไม่มีใช้ปุ่มคัดลอกแทน');});
}
