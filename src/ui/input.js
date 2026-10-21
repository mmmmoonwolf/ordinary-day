import {$,isTouch} from '../core/util.js';
import {cv,zoom} from '../core/renderer.js';
import {G} from '../core/state.js';
import {keys,ctl,mouse,joy} from '../core/controls.js';
import {SPEEDS} from '../config/time.js';
import {player} from '../entities/player.js';
import {switchTo,pickup,useHeal,eatBest} from '../systems/inventory.js';
import {toggleDoor} from '../systems/doors.js';
import {DIFFS} from '../config/difficulty.js';
import {startReload} from '../systems/combat.js';
import {reset} from '../systems/game.js';
import {readSave,loadGame,clearSave} from '../systems/save.js';
import {chipEls,hhmm,say} from './hud.js';
import {openBag,closeBag} from './bag.js';
import {isMuted,toggleMute} from '../systems/audio.js';
import {isPauseOpen,togglePause} from './pause.js';

// ---------- input ----------
let rightId=null;
// start screen: offer "continue" when an autosave exists; starting a new day overwrites it
export function showContinue(){
  const s=readSave(),has=!!s;
  $('bContinue').hidden=!has;$('bStart').classList.toggle('alt',has);$('saveNote').hidden=!has;
  if(has)$('contInfo').textContent='วันที่ '+(Math.floor(s.G.min/1440)+1)+' · '+hhmm(s.G.min);
}
// E / the pick button: take the item, open the bag when it is full, or work a door
function usePick(){if(player.near)pickup(player.near);else if(player.full)openBag();else if(player.nearDoor>=0)toggleDoor(player.nearDoor);}
function showSound(){for(const id of ['bSound','bSound2'])$(id).textContent='เสียง: '+(isMuted()?'ปิด':'เปิด');}
export function initInput(){
  addEventListener('keydown',e=>{
    if(e.code==='Tab'||e.code==='KeyI'){e.preventDefault();if(!isPauseOpen())$('bag').hidden?openBag():closeBag();return;}
    if(e.code==='Escape'||e.code==='KeyP'){if(!$('bag').hidden)closeBag();else togglePause();return;}
    if(e.code==='KeyM'){toggleMute();showSound();return;}
    if(G.paused)return;
    keys[e.code]=true;
    if(e.code==='Space'){e.preventDefault();if(!e.repeat){ctl.fireHeld=true;ctl.fireQ=.2;}}
    if(e.code==='Digit1')switchTo('primary');if(e.code==='Digit2')switchTo('secondary');if(e.code==='Digit3')switchTo('melee');
    if(e.code==='KeyR')startReload();if(e.code==='KeyH')useHeal();if(e.code==='KeyG')eatBest();
    if(e.code==='KeyE'||e.code==='KeyF')usePick();
  });
  addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space')ctl.fireHeld=false;});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false;ctl.fireHeld=false;});
  cv.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'){mouse.active=true;if(e.button===0&&G.running){ctl.fireHeld=true;ctl.fireQ=.2;}return;}
    mouse.active=false;
    if(e.clientX<innerWidth*.55&&joy.id===null){joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;joy.x=joy.y=0;const j=$('joy');j.style.left=e.clientX+'px';j.style.top=e.clientY+'px';j.hidden=false;$('knob').style.transform='';}
    else{rightId=e.pointerId;ctl.fireHeld=true;ctl.fireQ=.2;}
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
  });
  cv.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'){mouse.active=true;mouse.ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);return;}
    if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=56;if(l>M){dx=dx/l*M;dy=dy/l*M;}joy.x=dx/M;joy.y=dy/M;$('knob').style.transform=`translate(${dx}px,${dy}px)`;
  });
  const endPtr=e=>{if(e.pointerType==='mouse'){ctl.fireHeld=false;return;}if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;$('joy').hidden=true;}if(e.pointerId===rightId){rightId=null;ctl.fireHeld=false;}};
  cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.1:1/1.1);},{passive:false});
  $('bZin').addEventListener('click',()=>zoom(1/1.2));$('bZout').addEventListener('click',()=>zoom(1.2));
  $('bSpeed').addEventListener('click',()=>{G.speedIdx=(G.speedIdx+1)%SPEEDS.length;$('bSpeed').textContent='×'+SPEEDS[G.speedIdx];});
  $('bBag').addEventListener('click',()=>{$('bag').hidden?openBag():closeBag();});
  $('bagClose').addEventListener('click',closeBag);
  $('bag').addEventListener('pointerdown',e=>{if(e.target===$('bag'))closeBag();});
  const atk=$('bAtk');
  atk.addEventListener('pointerdown',e=>{e.preventDefault();mouse.active=e.pointerType==='mouse'&&mouse.active;ctl.fireHeld=true;ctl.fireQ=.2;try{atk.setPointerCapture(e.pointerId);}catch(_){}});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])atk.addEventListener(ev,()=>{ctl.fireHeld=false;});
  $('bReload').addEventListener('click',startReload);
  $('bHeal').addEventListener('click',useHeal);
  $('bEat').addEventListener('click',eatBest);
  // difficulty for new games, remembered in this browser; a continued save keeps its own
  let pref='normal';try{pref=localStorage.getItem('ordinary-day.diff')||'normal';}catch(_){}
  const pickDiff=k=>{if(!DIFFS[k])k='normal';G.diff=k;for(const b of document.querySelectorAll('.diffs button')){b.classList.toggle('on',b.dataset.diff===k);b.setAttribute('aria-checked',b.dataset.diff===k);}$('diffNote').textContent=DIFFS[k].desc;try{localStorage.setItem('ordinary-day.diff',k);}catch(_){}};
  for(const b of document.querySelectorAll('.diffs button'))b.addEventListener('click',()=>pickDiff(b.dataset.diff));
  pickDiff(pref);
  $('bPick').addEventListener('click',usePick);
  for(const c of chipEls)c.addEventListener('click',()=>switchTo(c.dataset.slot));
  $('bStart').addEventListener('click',()=>{clearSave();reset();$('overlay').hidden=true;G.running=true;});
  $('bContinue').addEventListener('click',()=>{if(!loadGame()){showContinue();return;}$('overlay').hidden=true;G.running=true;say('เล่นต่อจากเซฟ · '+$('contInfo').textContent,'',4);});
  showContinue();
  for(const id of ['bSound','bSound2'])$(id).addEventListener('click',()=>{toggleMute();showSound();});showSound();
  $('bAgain').addEventListener('click',()=>{reset();$('overlay').hidden=true;G.running=true;});
  if(isTouch){$('atkKey').textContent='กดค้าง';}
  $('keys').innerHTML=isTouch
    ?'<kbd>นิ้วซ้าย</kbd><span>ลากเพื่อเดิน ดันสุดเพื่อวิ่ง</span><kbd>ปุ่มโจมตี</kbd><span>กดค้างเพื่อยิงต่อเนื่อง เล็งให้อัตโนมัติ</span><kbd>1 2 3</kbd><span>สลับอาวุธหลัก รอง ประชิด</span><kbd>กระเป๋า</kbd><span>ติดตั้ง ใช้ หรือทิ้งของ (เกมหยุดระหว่างเปิด)</span>'
    :'<kbd>W A S D</kbd><span>เดิน (Shift วิ่ง กลางคืนเสียงวิ่งเรียกซอมบี้)</span><kbd>เมาส์</kbd><span>เล็ง · คลิกค้างเพื่อโจมตี</span><kbd>1 2 3</kbd><span>สลับอาวุธหลัก รอง ประชิด</span><kbd>R · E · H</kbd><span>รีโหลด · เก็บของ · ใช้ยา</span><kbd>Tab</kbd><span>เปิดกระเป๋า (เกมหยุดระหว่างเปิด)</span>';
}
