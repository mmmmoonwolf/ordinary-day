import {$,isTouch} from '../core/util.js';
import {cv,zoom,camera} from '../core/renderer.js';
import {G} from '../core/state.js';
import {keys,ctl,mouse,joy} from '../core/controls.js';
import {SPEEDS} from '../config/time.js';
import {player,startHelp,isSolo} from '../entities/player.js';
import {switchTo,pickup,useHeal,eatBest} from '../systems/inventory.js';
import {toggleDoor,fixDoor} from '../systems/doors.js';
import {throwBottle} from '../systems/throw.js';
import {DIFFS} from '../config/difficulty.js';
import {startReload} from '../systems/combat.js';
import {reset} from '../systems/game.js';
import {readSave,loadGame,clearSave} from '../systems/save.js';
import {chipEls,hhmm,say} from './hud.js';
import {openBag,closeBag} from './bag.js';
import {isMuted,toggleMute} from '../systems/audio.js';
import {isSettingsOpen,closeSettings} from './settings.js';
import {isPauseOpen,togglePause} from './pause.js';

// ---------- input ----------
let rightId=null;
// start screen: offer "continue" when an autosave exists; starting a new day overwrites it
export function showContinue(){
  const s=readSave(),has=!!s;
  $('bContinue').hidden=!has;$('bStart').classList.toggle('alt',has);$('saveNote').hidden=!has;
  if(has)$('contInfo').textContent='วันที่ '+(Math.floor(s.G.min/1440)+1)+' · '+hhmm(s.G.min);
}
// E / the pick button: help a downed teammate up, take the item, open the bag when it is full, or work a door
function usePick(){if(player.nearDown)startHelp(player,player.nearDown);else if(player.near)pickup(player,player.near);else if(player.full)openBag();else if(player.nearDoor>=0)toggleDoor(player,player.nearDoor);}
// keyboard / mouse / stick -> the local player's input, once per simulation step (v0.9: the player reads only p.input)
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),mray=new THREE.Raycaster();
export function pollInput(p){
  const I=p.input;let ix=0,iy=0;
  if(!$('bag').hidden||!$('pause').hidden){Object.assign(I,{mx:0,mz:0,mag:0,run:false,fire:false,fireQ:0,face:null});return;}   // a menu open while the world goes on (v0.11)
  if(keys.KeyW||keys.ArrowUp)iy+=1;if(keys.KeyS||keys.ArrowDown)iy-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;
  if(joy.id!==null){ix+=joy.x;iy-=joy.y;}
  let mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag;mag=1;}
  // screen to ground under the isometric camera: screen right = (1,-1)/√2, screen up = (-1,-1)/√2
  I.mx=(ix-iy)/Math.SQRT2;I.mz=(-ix-iy)/Math.SQRT2;I.mag=mag;
  I.run=!!(keys.ShiftLeft||keys.ShiftRight)||(joy.id!==null&&mag>.9);
  I.slow=!!keys.KeyC;I.sneak=joy.id!==null&&mag>.08&&mag<.45;
  I.aim=mouse.active;I.face=null;
  if(mouse.active){mray.setFromCamera(mouse.ndc,camera);if(mray.ray.intersectPlane(groundPlane,mouse.world)){I.face=Math.atan2(mouse.world.x-p.pos.x,mouse.world.z-p.pos.z);I.aimDist=Math.hypot(mouse.world.x-p.pos.x,mouse.world.z-p.pos.z);}}
  I.fire=ctl.fireHeld;if(ctl.fireQ>0){I.fireQ=ctl.fireQ;ctl.fireQ=0;}
}
function showSound(){for(const id of ['bSound','bSound2'])$(id).textContent='เสียง: '+(isMuted()?'ปิด':'เปิด');}
export function initInput(){
  addEventListener('keydown',e=>{
    if(e.code==='Tab'||e.code==='KeyI'){e.preventDefault();if(!isPauseOpen())$('bag').hidden?openBag():closeBag();return;}
    if(e.code==='Escape'||e.code==='KeyP'){if(isSettingsOpen())closeSettings();else if(!$('bag').hidden)closeBag();else togglePause();return;}
    if(e.code==='KeyM'){toggleMute();showSound();return;}
    if(G.paused)return;
    keys[e.code]=true;
    if(e.code==='Space'){e.preventDefault();if(!e.repeat){ctl.fireHeld=true;ctl.fireQ=.2;}}
    if(e.code==='Digit1')switchTo(player,'primary');if(e.code==='Digit2')switchTo(player,'secondary');if(e.code==='Digit3')switchTo(player,'melee');
    if(e.code==='KeyR')startReload(player);if(e.code==='KeyH')useHeal(player);if(e.code==='KeyG')eatBest(player);
    if(e.code==='KeyE'||e.code==='KeyF')usePick();
    if(e.code==='KeyB'&&player.fixDoor>=0)fixDoor(player,player.fixDoor);
    if(e.code==='KeyQ'&&!e.repeat)throwBottle(player);
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
  $('bSpeed').addEventListener('click',()=>{if(!isSolo())return;G.speedIdx=(G.speedIdx+1)%SPEEDS.length;$('bSpeed').textContent='×'+SPEEDS[G.speedIdx];});
  $('bBag').addEventListener('click',()=>{$('bag').hidden?openBag():closeBag();});
  $('bagClose').addEventListener('click',closeBag);
  $('bag').addEventListener('pointerdown',e=>{if(e.target===$('bag'))closeBag();});
  const atk=$('bAtk');
  atk.addEventListener('pointerdown',e=>{e.preventDefault();mouse.active=e.pointerType==='mouse'&&mouse.active;ctl.fireHeld=true;ctl.fireQ=.2;try{atk.setPointerCapture(e.pointerId);}catch(_){}});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])atk.addEventListener(ev,()=>{ctl.fireHeld=false;});
  $('bReload').addEventListener('click',()=>startReload(player));
  $('bHeal').addEventListener('click',()=>useHeal(player));
  $('bEat').addEventListener('click',()=>eatBest(player));
  // difficulty for new games, remembered in this browser; a continued save keeps its own
  let pref='normal';try{pref=localStorage.getItem('ordinary-day.diff')||'normal';}catch(_){}
  const pickDiff=k=>{if(!DIFFS[k])k='normal';G.diff=k;for(const b of document.querySelectorAll('.diffs button')){b.classList.toggle('on',b.dataset.diff===k);b.setAttribute('aria-checked',b.dataset.diff===k);}$('diffNote').textContent=DIFFS[k].desc;try{localStorage.setItem('ordinary-day.diff',k);}catch(_){}};
  for(const b of document.querySelectorAll('.diffs button'))b.addEventListener('click',()=>pickDiff(b.dataset.diff));
  pickDiff(pref);
  $('bPick').addEventListener('click',usePick);
  $('bFix').addEventListener('click',()=>{if(player.fixDoor>=0)fixDoor(player,player.fixDoor);});
  $('bThrow').addEventListener('click',()=>throwBottle(player));
  for(const c of chipEls)c.addEventListener('click',()=>switchTo(player,c.dataset.slot));
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
