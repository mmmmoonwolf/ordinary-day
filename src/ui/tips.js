import {$,isTouch} from '../core/util.js';
import {G} from '../core/state.js';
import {DUSK_WARN} from '../config/time.js';
import {GOAL_NIGHTS,nightsSurvived} from '../config/goal.js';
import {agents} from '../entities/agents.js';
import {d2} from '../entities/movement.js';
import {player} from '../entities/player.js';
import {lootSpots} from '../world/city.js';
import {DEF,durPct} from '../config/items.js';
import {inv} from '../systems/inventory.js';

// ---------- tips ----------
// Short hints for new players, each shown the first time its situation happens (remembered per browser).
// One tip at a time; the queue only advances while the game is running (not paused).
const SEEN_KEY='ordinary-day.tips',SHOW_FOR=9;
let seen={},off=false,queue=[],showing=null,left=0;
try{const s=JSON.parse(localStorage.getItem(SEEN_KEY)||'{}');seen=s.seen||{};off=!!s.off;}catch(_){}
function store(){try{localStorage.setItem(SEEN_KEY,JSON.stringify({seen,off}));}catch(_){}}
const near=(kind,r)=>agents.some(a=>a.state==='zombie'&&a.kind===kind&&!a.retreat&&d2(a,player)<r*r);
const T=(touch,desk)=>isTouch?touch:desk;
// [key, condition, text] in the order they usually come up
const TIPS=[
  ['loot',()=>G.min>=7*60+36,()=>'วงแหวนบนพื้นคือของที่เก็บได้ ใกล้ ๆ มีอาวุธประชิดรออยู่ '+T('แตะปุ่มเก็บ','กด E')+' เพื่อหยิบ ส่วนกระสุนและยาแค่เดินทับ'],
  ['ambulance',()=>G.min>=8*60+25,()=>'มีรถพยาบาลจอดทิ้งไว้ฝั่งตะวันตกของตลาด หลังรถมี Resurrection Kit ชุบชีวิตได้ 1 ครั้ง'],
  ['outbreak',()=>G.outbreak,()=>'Walker ตอนกลางวันเดินช้าและไม่ไล่ แต่ยืนติดตัวจะโดนกัดและอาจติดเชื้อ'],
  ['dusk',()=>G.phase==='day'&&G.min%1440>=DUSK_WARN,()=>'เตรียมกระสุนกับยาก่อนมืด กลางคืนซอมบี้เร็วและหูไว '+T('ปุ่ม ❚❚','กด P')+' หยุดเกมได้ทุกเมื่อ'],
  ['shelter',()=>player.nearDoor>=0||G.phase==='night',()=>'ตึกที่มีป้ายไฟเหนือประตูเข้าไปหลบได้ '+T('แตะปุ่มประตู','กด E')+' ปิดประตู ซอมบี้ข้างนอกจะมองไม่เห็น แต่ถ้าได้ยินเสียงจะมาพังประตู'],
  ['night',()=>G.phase==='night',()=>'เสียงปืนและการวิ่งเรียกซอมบี้ กลางคืนได้ยินไกลขึ้น 1.5 เท่า ใช้อาวุธประชิดเมื่อทำได้'],
  ['sneak',()=>G.phase==='night'&&G.min%1440>=19*60+30,()=>(isTouch?'ดันจอยสติ๊กเบา ๆ':'กด C ค้าง')+' เพื่อย่อง เดินช้าลง แต่ซอมบี้ต้องเข้ามาใกล้กว่าเดิมครึ่งหนึ่งถึงจะเห็นคุณ'],
  ['bottle',()=>inv.bag.some(e=>e.id==='bottle'),()=>'ขวดแก้วขว้างให้แตกได้ '+T('แตะปุ่ม 🍾','กด Q')+' ซอมบี้จะวิ่งไปดูที่จุดนั้น ใช้ล่อให้พ้นทาง'],
  ['planks',()=>inv.bag.some(e=>e.id==='planks'),()=>'ไม้กระดานใช้ตอกประตูที่ปิดให้ทนขึ้น หรือซ่อมประตูที่พัง ยืนใกล้ประตูแล้ว'+T('แตะปุ่ม 🔨','กด B')+' แต่เสียงค้อนดัง'],
  ['sprinter',()=>near('sprinter',18),()=>'Sprinter วิ่งเร็วกว่าคุณ หนีไม่พ้น หันมาสู้ มันจะชะงักหลังตีคุณ'],
  ['boomer',()=>near('boomer',14),()=>'Boomer พองตัวแล้วระเบิด ยิงจากระยะไกล หรือถอยให้พ้น 4 เมตรตอนมันพอง'],
  ['armor',()=>near('armor',16),()=>'Armor Walker กันกระสุนด้านหน้าได้ครึ่งหนึ่ง ยิงด้านหลังหรือใช้อาวุธประชิดได้ดาเมจเต็ม ฆ่าได้ดรอปของ Police'],
  ['tyrant',()=>near('tyrant',30),()=>'Tyrant ขึ้นวงแดงก่อนทุบ ถอยออกจากวงทันที และมันทุบรถที่ขวางทางได้ ฆ่าได้ดรอปของ Military'],
  ['lowhp',()=>player.alive&&player.hp<40,()=>'HP ใกล้หมด '+T('แตะ ✚','กด H')+' ใช้ยา หรือหลบให้พ้นการโจมตีสัก 6 วินาที HP จะฟื้นเอง'],
  ['infected',()=>player.infect>0,()=>'ติดเชื้อแล้ว HP จะไม่ฟื้นเอง หา Antibiotic (สีฟ้า) '+T('ปุ่ม ✚','ปุ่ม H')+' จะใช้ Antibiotic ก่อน'],
  ['needs',()=>player.alive&&(player.food<35||player.water<35),()=>'เริ่มหิวหรือกระหาย '+T('แตะ 🍴','กด G')+' กินหรือดื่ม หาอาหารกระป๋องกับน้ำดื่มได้ทั่วเมือง ถ้าแถบใดหมด HP จะลดเรื่อย ๆ'],
  ['wear',()=>inv.eq.melee&&DEF[inv.eq.melee.id].dur&&durPct(inv.eq.melee)<=.3,()=>'อาวุธประชิดใกล้พัง (ตัวเลข % ที่มุมขวาล่าง) เก็บอันใหม่ไว้สำรองในกระเป๋า'],
  ['dawn',()=>nightsSurvived(G.min)>=1,()=>'รอดคืนแรกแล้ว ตอนเช้าตัวพิเศษถอยไป ออกหาของได้ อีก '+(GOAL_NIGHTS-1)+' คืนเฮลิคอปเตอร์จะมารับ'],
];
export function tipsOff(){return off;}
export function setTipsOff(v){off=v;if(!v)seen={};queue=[];hide();store();}
function hide(){showing=null;$('tip').classList.remove('show');}
export function updateTips(dt){
  if(!G.running||!player)return;
  if(!off)for(const [key,cond,text] of TIPS){if(seen[key]||!cond())continue;seen[key]=1;store();if(key!=='ambulance'||lootSpots.some(s=>s.zone==='ambulance'&&s.drop))queue.push(text());}
  if(showing){
    // sit in the message slot, or just under the message while one is showing, to stay clear of the player in the middle
    const r=$('msg').getBoundingClientRect();$('tip').style.top=($('msg').classList.contains('show')?r.bottom+8:r.top)+'px';
    left-=dt;if(left<=0)hide();return;
  }
  if(queue.length){showing=queue.shift();left=SHOW_FOR;$('tipText').textContent=showing;$('tip').classList.add('show');}
}
export function clearTip(){queue=[];hide();}
