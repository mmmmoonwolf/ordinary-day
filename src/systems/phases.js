import {wpick,rnd} from '../core/util.js';
import {G} from '../core/state.js';
import {DAY_START,DUSK_WARN,isNightTod} from '../config/time.js';
import {isSpecial,RISE} from '../config/zombies.js';
import {agents,becomeZombie,setKind,zombies,spawnEdge} from '../entities/agents.js';
import {d2} from '../entities/movement.js';
import {players,nearestPlayerDist,partySize} from '../entities/player.js';
import {partyOf} from '../config/party.js';
import {fillDay,fillNight,takeByOthers} from './drops.js';
import {restockBoxes} from './search.js';
import {planDaily} from './events.js';
import {REFILL,refillScale} from '../config/loot.js';
import {sfx} from './audio.js';
import {addBlood} from './effects.js';
import {campGuards} from './camp.js';
import {diffOf} from '../config/difficulty.js';
import {say,feed} from '../ui/hud.js';
import {updateEvents} from './events.js';

// ---------- story + phases ----------
// v0.32 the outbreak is seen happening: a person about 14 m from a player staggers, screams, falls and gets up as a
// zombie (the bitten-person turn of v0.27); the people around run
function startOutbreak(){
  G.outbreak=true;sfx.outbreak();campGuards();   // v0.21 siren, v0.26 walkers left at the camp
  let best=null,bd=1e9;for(const a of agents){if(a.state!=='human'||a.vendor)continue;const s=Math.abs(nearestPlayerDist(a.pos.x,a.pos.z)-14);if(s<bd){bd=s;best=a;}}
  if(best){
    best.state='infected';best.turnT=RISE.fall+1.2;best.panic=0;sfx.scream(best.pos.x,best.pos.z);G.alertA=best;G.alertT=9;
    for(const a of agents){if(a===best||a.state!=='human')continue;const dx=a.pos.x-best.pos.x,dz=a.pos.z-best.pos.z;if(dx*dx+dz*dz<18*18){a.panic=rnd(3,5);a.tx=dx+rnd(-1,1);a.tz=dz+rnd(-1,1);a.vendor=false;}}
  }
  say('มีคนล้มลงกลางถนน แล้วลุกขึ้นมาไม่เหมือนเดิม! ตอนกลางวันพวกมันยังเชื่องช้า ใช้เวลานี้หาของ','alarm',8);
}
// v0.32 the first morning, before it starts: someone running past with blood on them, a scream far away
function bloodyRunner(){
  let best=null,bd=1e9;for(const a of agents){if(a.state!=='human'||a.vendor)continue;const s=Math.abs(nearestPlayerDist(a.pos.x,a.pos.z)-12);if(s<bd){bd=s;best=a;}}
  if(!best)return;const p=players[0],dx=best.pos.x-p.pos.x,dz=best.pos.z-p.pos.z;best.panic=7;best.tx=dz;best.tz=-dx;addBlood(best.pos.x,best.pos.z);   // runs across, past the player
}
function farScream(){const p=players[0],a=Math.random()*Math.PI*2;sfx.scream(p.pos.x+Math.cos(a)*45,p.pos.z+Math.sin(a)*45);}
export const EVENTS=[
  {t:7*60+31,text:'ทุกอย่างเริ่มต้นจากวันธรรมดา'},
  {t:7*60+42,text:'ร้านค้าเพิ่งเปิด คนเริ่มออกมาทำงาน'},   // v0.32 the slower first morning has more to tell
  {t:7*60+55,text:'คุณออกจากบ้านมาตัวเปล่า ลองเดินดูของที่ตกอยู่ตามทาง'},
  {t:8*60+15,text:'วิทยุ: รถพยาบาลหลายคันวิ่งเข้าไปทางตลาดเมื่อเช้านี้',cls:'radio'},
  {t:8*60+40,text:'วิทยุ: โรงพยาบาลประกาศงดรับผู้ป่วยนอกชั่วคราว',cls:'radio'},
  {t:9*60,text:'วิทยุ: มีรายงานผู้ป่วยก้าวร้าวผิดปกติหลายราย',cls:'radio'},
  {t:9*60+12,text:'มีคนวิ่งผ่านไป เสื้อเปื้อนเลือด',fn:bloodyRunner},
  {t:9*60+24,text:'เสียงกรีดร้องดังมาจากที่ไหนสักแห่ง',fn:farScream},
  {t:9*60+30,fn:startOutbreak},
  {t:10*60+15,text:'วิทยุ: ทางการขอให้ประชาชนอยู่ในอาคาร ปิดประตูหน้าต่างให้สนิท',cls:'radio'},
  {t:11*60,text:'ฝนเริ่มตก',fn:()=>{G.rainTarget=1;}},
  {t:12*60+30,text:'สัญญาณโทรศัพท์เริ่มขาดหาย',cls:'radio'},
  {t:13*60+20,fn:()=>{G.rainTarget=0;}},
];
function onNight(){
  G.phase='night';sfx.night();
  say('NIGHT · ซอมบี้เร็วขึ้น หูไว และตีแรงขึ้น ของระดับ Police / Military เริ่มปรากฏ','night',7);
  for(const z of zombies())if(z.kind==='walker')setKind(z,'zombie');
  G.armorNight=Math.random()<.6;G.armorNext=G.min+30;G.armorAnnounced=false;G.armorCount=0;
  G.tyrantPending=Math.random()<.4;G.tyrantAt=G.min-(G.min%1440)+1440;
  G.nightSpawnNext=G.min+15;
  fillNight(Math.min(1,REFILL.night*refillScale(Math.floor(G.min/1440)+1)*partyOf(partySize(),'loot')));feed('ของระดับ Police และ Military เกิดขึ้นทั่วเมือง','pol');
}
function onDay(){
  G.phase='day';sfx.dawn();
  const day=Math.floor(G.min/1440)+1;
  say('รุ่งเช้า วันที่ '+day+' · ซอมบี้กลับมาเชื่องช้า ออกไปหาของได้','',6);
  const zs=zombies();
  for(const z of zs){if(z.kind==='zombie')setKind(z,'walker');else if(isSpecial(z.kind))z.retreat=true;}
  const walkers=zs.filter(z=>z.kind==='walker').sort((a,b)=>nearestPlayerDist(b.pos.x,b.pos.z)-nearestPlayerDist(a.pos.x,a.pos.z));
  for(let i=0;i<walkers.length-18;i++)walkers[i].retreat=true;
  G.armorNight=false;G.tyrantPending=false;G.nightSpawnNext=1e9;
  restockBoxes();   // v0.15
  planDaily(day);   // v0.18 random events for the day
  if(takeByOthers(players)>0)feed('ของที่ทิ้งไว้ไกล ๆ บางส่วนถูกผู้รอดชีวิตคนอื่นเก็บไปแล้ว','warn');
  fillDay(Math.min(1,REFILL.day*refillScale(day)*partyOf(partySize(),'loot')));
}
function nightMix(){const day=Math.floor(G.min/1440)+1;return {zombie:Math.max(40,65-(day-1)*5),sprinter:20+(day-1)*3,boomer:15+(day-1)*2};}
export function runEvents(now){
  for(const e of EVENTS){if(!e.done&&G.min>=e.t){e.done=true;if(e.fn)e.fn();if(e.text)say(e.text,e.cls);}}
  const tod=G.min%1440,day=Math.floor(G.min/1440)+1;
  const ph=isNightTod(tod)?'night':'day';
  if(ph!==G.phase){if(ph==='night')onNight();else onDay();}
  if(ph==='day'&&tod>=DUSK_WARN&&G.duskDay!==day){G.duskDay=day;sfx.alarm();say('NIGHT INCOMING · อีกไม่นานจะมืด เตรียมอาวุธ กระสุน และยา','alarm',7);}
  if(ph==='night'&&G.outbreak){
    if(G.min>=G.nightSpawnNext){G.nightSpawnNext+=45;const n=Math.max(1,Math.min(4,2+Math.floor((day-1)/2))+diffOf(G).spawn+partyOf(partySize(),'spawn'));const mix=nightMix();for(let k=0;k<n;k++)spawnEdge(wpick(mix));}
    if(G.armorNight&&G.min>=G.armorNext&&!(tod>=300&&tod<DAY_START)){G.armorNext+=60;
      if(G.armorCount<6){const a=spawnEdge('armor');if(a){G.armorCount++;if(!G.armorAnnounced){G.armorAnnounced=true;say('วิทยุ: พบเจ้าหน้าที่ตำรวจติดเชื้อ สวมเกราะกันกระสุน','radio',6);}}}}   // Q05: at most 6 per night
    if(G.tyrantPending&&G.min>=G.tyrantAt){G.tyrantPending=false;const t=spawnEdge('tyrant');if(t)sfx.roar(t.pos.x,t.pos.z);if(t)say('ได้ยินเสียงคำรามจากที่ไกล… Tyrant ออกล่าแล้ว','alarm',7);}
  }
  if(G.min>=G.nextWeather){G.nextWeather+=90;if(Math.random()<.35)G.rainTarget=G.rainTarget?0:1;}
  updateEvents(now||0);
}
