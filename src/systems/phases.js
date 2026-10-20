import {wpick} from '../core/util.js';
import {G} from '../core/state.js';
import {DAY_START,DUSK_WARN,isNightTod} from '../config/time.js';
import {isSpecial} from '../config/zombies.js';
import {agents,becomeZombie,setKind,zombies,spawnEdge} from '../entities/agents.js';
import {d2} from '../entities/movement.js';
import {player} from '../entities/player.js';
import {fillDay,fillNight} from './drops.js';
import {sfx} from './audio.js';
import {say,feed} from '../ui/hud.js';

// ---------- story + phases ----------
function startOutbreak(){
  G.outbreak=true;
  let best=null,bd=1e9;for(const a of agents){if(a.state!=='human'||a.vendor)continue;const s=Math.abs(Math.sqrt(d2(a,player))-16);if(s<bd){bd=s;best=a;}}
  if(best){becomeZombie(best,'walker');G.alertA=best;G.alertT=8;}
  say('มีคนกัดกันกลางถนน! ตอนกลางวันพวกมันยังเชื่องช้า ใช้เวลานี้หาของ','alarm',7);
}
export const EVENTS=[
  {t:7*60+31,text:'ทุกอย่างเริ่มต้นจากวันธรรมดา'},
  {t:7*60+50,text:'คุณออกจากบ้านมาตัวเปล่า ลองเดินดูของที่ตกอยู่ตามทาง'},
  {t:8*60+20,text:'วิทยุ: รถพยาบาลหลายคันวิ่งเข้าไปทางตลาดเมื่อเช้านี้',cls:'radio'},
  {t:9*60,text:'วิทยุ: มีรายงานผู้ป่วยก้าวร้าวผิดปกติหลายราย',cls:'radio'},
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
  fillNight();feed('ของระดับ Police และ Military เกิดขึ้นทั่วเมือง','pol');
}
function onDay(){
  G.phase='day';sfx.dawn();
  const day=Math.floor(G.min/1440)+1;
  say('รุ่งเช้า วันที่ '+day+' · ซอมบี้กลับมาเชื่องช้า ออกไปหาของได้','',6);
  const zs=zombies();
  for(const z of zs){if(z.kind==='zombie')setKind(z,'walker');else if(isSpecial(z.kind))z.retreat=true;}
  const walkers=zs.filter(z=>z.kind==='walker').sort((a,b)=>d2(b,player)-d2(a,player));
  for(let i=0;i<walkers.length-18;i++)walkers[i].retreat=true;
  G.armorNight=false;G.tyrantPending=false;G.nightSpawnNext=1e9;
  fillDay(.3);
}
function nightMix(){const day=Math.floor(G.min/1440)+1;return {zombie:Math.max(40,65-(day-1)*5),sprinter:20+(day-1)*3,boomer:15+(day-1)*2};}
export function runEvents(){
  for(const e of EVENTS){if(!e.done&&G.min>=e.t){e.done=true;if(e.fn)e.fn();if(e.text)say(e.text,e.cls);}}
  const tod=G.min%1440,day=Math.floor(G.min/1440)+1;
  const ph=isNightTod(tod)?'night':'day';
  if(ph!==G.phase){if(ph==='night')onNight();else onDay();}
  if(ph==='day'&&tod>=DUSK_WARN&&G.duskDay!==day){G.duskDay=day;sfx.alarm();say('NIGHT INCOMING · อีกไม่นานจะมืด เตรียมอาวุธ กระสุน และยา','alarm',7);}
  if(ph==='night'&&G.outbreak){
    if(G.min>=G.nightSpawnNext){G.nightSpawnNext+=45;const n=Math.min(4,2+Math.floor((day-1)/2));const mix=nightMix();for(let k=0;k<n;k++)spawnEdge(wpick(mix));}
    if(G.armorNight&&G.min>=G.armorNext&&!(tod>=300&&tod<DAY_START)){G.armorNext+=60;
      if(G.armorCount<6){const a=spawnEdge('armor');if(a){G.armorCount++;if(!G.armorAnnounced){G.armorAnnounced=true;say('วิทยุ: พบเจ้าหน้าที่ตำรวจติดเชื้อ สวมเกราะกันกระสุน','radio',6);}}}}   // Q05: at most 6 per night
    if(G.tyrantPending&&G.min>=G.tyrantAt){G.tyrantPending=false;const t=spawnEdge('tyrant');if(t)sfx.roar(t.pos.x,t.pos.z);if(t)say('ได้ยินเสียงคำรามจากที่ไกล… Tyrant ออกล่าแล้ว','alarm',7);}
  }
  if(G.min>=G.nextWeather){G.nextWeather+=90;if(Math.random()<.35)G.rainTarget=G.rainTarget?0:1;}
}
