import {$} from '../core/util.js';
import {bus} from '../core/bus.js';
import {G} from '../core/state.js';
import {room,openRoom,closeRoom,roomCount,MAX_PLAYERS} from '../net/host.js';
import {net,join,leave} from '../net/client.js';
import {cleanCode} from '../net/link.js';
import {say} from './hud.js';
import {showContinue} from './input.js';

// ---------- online play: buttons (v0.12) ----------
// The start screen joins a friend's room by its 5-letter code; the pause menu opens this game as a room.
const CODE_KEY='ordinary-day.room';
let busy=false;
function toTitle(why){
  $('pStart').hidden=false;$('pOver').hidden=true;$('overlay').hidden=false;$('pause').hidden=true;G.paused=false;
  $('joinMsg').textContent=why||'';showContinue();
}
export function refreshOnline(){
  const client=bus.role==='client';
  $('bSaveNow').hidden=client;$('bRoom').hidden=client;
  $('bToTitle').textContent=client?'ออกจากห้อง':'เซฟแล้วกลับหน้าแรก';
  if(client){$('roomMsg').innerHTML='อยู่ในห้อง <b>'+net.code+'</b> ของเพื่อน · เกมเดินต่อระหว่างเปิดเมนูนี้';return;}
  $('bRoom').textContent=room.open?'ปิดห้อง':'เปิดห้องให้เพื่อนเข้า';
  $('roomMsg').innerHTML=room.open?'รหัสห้อง <b>'+room.code+'</b> · ผู้เล่น '+roomCount()+'/'+MAX_PLAYERS+' · ให้เพื่อนเปิดเกมแล้วกรอกรหัสนี้ที่หน้าแรก':'เล่นกับเพื่อนสูงสุด '+MAX_PLAYERS+' คน เพื่อนเข้าระหว่างเกมได้ตลอด';
}
export function initOnline(){
  let last='';try{last=localStorage.getItem(CODE_KEY)||'';}catch(_){}
  const inp=$('roomCode');inp.value=last;
  inp.addEventListener('input',()=>{const v=cleanCode(inp.value);if(v!==inp.value)inp.value=v;});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')$('bJoin').click();e.stopPropagation();});
  $('bJoin').addEventListener('click',async()=>{
    if(busy)return;const code=cleanCode(inp.value);
    if(code.length!==5){$('joinMsg').textContent='กรอกรหัสห้อง 5 ตัวที่เพื่อนเห็นในเมนูหยุดเกม';inp.focus();return;}
    busy=true;$('bJoin').disabled=true;$('joinMsg').textContent='กำลังต่อห้อง '+code+' …';
    try{await join(code);try{localStorage.setItem(CODE_KEY,code);}catch(_){}
      $('joinMsg').textContent='';$('overlay').hidden=true;say('เข้าห้อง '+code+' แล้ว · เจ้าของห้องเป็นคนเซฟเกม','',5);}
    catch(e){$('joinMsg').textContent=e.message||'เข้าห้องไม่ได้';}
    busy=false;$('bJoin').disabled=false;
  });
  net.onLeave=why=>toTitle(why);
  $('bOverTitle').addEventListener('click',()=>leave(''));
  $('bRoom').addEventListener('click',async()=>{
    if(busy)return;
    if(room.open){closeRoom();say('ปิดห้องแล้ว เพื่อนที่อยู่ในห้องถูกพากลับหน้าแรก','',4);refreshOnline();return;}
    busy=true;$('roomMsg').textContent='กำลังเปิดห้อง …';
    try{const code=await openRoom();say('เปิดห้องแล้ว · รหัส '+code+' ให้เพื่อนกรอกที่หน้าแรก','',8);}
    catch(e){$('roomMsg').textContent=e.message||'เปิดห้องไม่ได้';busy=false;return;}
    busy=false;refreshOnline();
  });
  setInterval(()=>{if(!$('pause').hidden&&!busy)refreshOnline();},1000);   // the player count while the menu is open
}
// leaving the game for the title: a client leaves the room, a host closes it
export function leaveOnline(){if(bus.role==='client')leave('');else closeRoom();}
