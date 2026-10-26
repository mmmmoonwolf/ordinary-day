import {$,isTouch} from '../core/util.js';
import {cv,zoom,camera,view} from '../core/renderer.js';
import {G} from '../core/state.js';
import {keys,ctl,mouse,joy} from '../core/controls.js';
import {SPEEDS} from '../config/time.js';
import {player,isSolo} from '../entities/player.js';
import {act} from '../systems/actions.js';
import {DIFFS} from '../config/difficulty.js';
import {reset} from '../systems/game.js';
import {readSave,loadGame,clearSave} from '../systems/save.js';
import {chipEls,hhmm,say} from './hud.js';
import {openBag,closeBag} from './bag.js';
import {isMuted,toggleMute} from '../systems/audio.js';
import {isSettingsOpen,closeSettings} from './settings.js';
import {isPauseOpen,togglePause} from './pause.js';
import {toggleFps,look,lockMouse,mouseLocked,fpsMove,isScoped} from './fps.js';

// ---------- input ----------
let rightId=null,lookId=null,lookX=0,lookY=0;   // v0.28 a finger turning the first-person view
// start screen: offer "continue" when an autosave exists; starting a new day overwrites it
export function showContinue(){
  const s=readSave(),has=!!s;
  $('bContinue').hidden=!has;$('bStart').classList.toggle('alt',has);$('saveNote').hidden=!has;
  if(has)$('contInfo').textContent='วันที่ '+(Math.floor(s.G.min/1440)+1)+' · '+hhmm(s.G.min);
}
// E / the pick button: open the bag when only a full-bag item is in reach, otherwise the 'use' action (systems/actions.js)
function usePick(){if(player.full&&!player.near&&!player.nearDown)openBag();else act('use');}
// keyboard / mouse / stick -> the local player's input, once per simulation step (v0.9: the player reads only p.input)
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),mray=new THREE.Raycaster();
export function pollInput(p){
  const I=p.input;let ix=0,iy=0;
  if(!$('bag').hidden||!$('pause').hidden){Object.assign(I,{mx:0,mz:0,mag:0,run:false,fire:false,fireQ:0,face:null,ads:false});return;}   // a menu open while the world goes on (v0.11)
  if(keys.KeyW||keys.ArrowUp)iy+=1;if(keys.KeyS||keys.ArrowDown)iy-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;
  if(joy.id!==null){ix+=joy.x;iy-=joy.y;}
  let mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag;mag=1;}
  // screen to ground under the isometric camera: screen right = (1,-1)/√2, screen up = (-1,-1)/√2
  I.mx=(ix-iy)/Math.SQRT2;I.mz=(-ix-iy)/Math.SQRT2;I.mag=mag;
  if(view.fps)[I.mx,I.mz]=fpsMove(ix,iy);   // v0.28 relative to where the view looks
  I.run=!!(keys.ShiftLeft||keys.ShiftRight)||(joy.id!==null&&mag>.9);
  I.slow=false;I.sneak=joy.id!==null&&mag>.08&&mag<.45;
  // v0.29 C crouches, Z goes prone (toggles; running stands up), right mouse or 🎯 aims down the sights
  if(I.run&&mag>.08)ctl.stance=0;
  I.stance=ctl.stance;I.ads=ctl.ads||ctl.adsTouch;if(ctl.jumpQ>0){I.jumpQ=ctl.jumpQ;ctl.jumpQ=0;}   // v0.30
  view.breathKey=false;if(isScoped(p)){view.breathKey=I.run;I.run=false;}   // through the scope Shift holds the breath
  I.aim=mouse.active;I.face=null;
  if(view.fps){I.face=view.yaw+view.sway;I.aim=!isTouch;I.aimDist=40;}   // v0.28 face where the view looks; on a phone aim assist still helps
  else if(mouse.active){mray.setFromCamera(mouse.ndc,camera);if(mray.ray.intersectPlane(groundPlane,mouse.world)){I.face=Math.atan2(mouse.world.x-p.pos.x,mouse.world.z-p.pos.z);I.aimDist=Math.hypot(mouse.world.x-p.pos.x,mouse.world.z-p.pos.z);}}
  I.fire=ctl.fireHeld;if(ctl.fireQ>0){I.fireQ=ctl.fireQ;ctl.fireQ=0;}
}
function showSound(){for(const id of ['bSound','bSound2'])$(id).textContent='เสียง: '+(isMuted()?'ปิด':'เปิด');}
// the page must never zoom (v0.13.1): iOS Safari ignores user-scalable=no, so a pinch or double tap on the start screen
// or a sheet zoomed the whole game in, and the game screen (touch-action:none) gave no way to pinch back out
function noZoom(){
  for(const ev of ['gesturestart','gesturechange','gestureend'])document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
  document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
  document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
  // already zoomed in anyway (an older page, the keyboard): rewriting the viewport tag makes iOS snap back to 1
  const vv=globalThis.visualViewport;if(!vv)return;const meta=document.querySelector('meta[name=viewport]');if(!meta)return;
  const base=meta.content;let t=0;
  vv.addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{if(vv.scale>1.01){meta.content=base+', minimum-scale=1';setTimeout(()=>{meta.content=base;},50);}},400);});
}
export function initInput(){
  noZoom();
  addEventListener('keydown',e=>{
    if(e.code==='Tab'||e.code==='KeyI'){e.preventDefault();if(!isPauseOpen())$('bag').hidden?openBag():closeBag();return;}
    if(e.code==='Escape'||e.code==='KeyP'){if(isSettingsOpen())closeSettings();else if(!$('bag').hidden)closeBag();else togglePause();return;}
    if(e.code==='KeyM'){toggleMute();showSound();return;}
    if(G.paused)return;
    if(e.code==='KeyV'&&!e.repeat){toggleFps();return;}   // v0.28
    if(e.code==='KeyC'&&!e.repeat){ctl.stance=ctl.stance===1?0:1;return;}   // v0.29
    if(e.code==='KeyZ'&&!e.repeat){ctl.stance=ctl.stance===2?0:2;return;}
    keys[e.code]=true;
    if(e.code==='Space'){e.preventDefault();if(!e.repeat){if(view.fps)ctl.jumpQ=.25;else{ctl.fireHeld=true;ctl.fireQ=.2;}}}   // v0.30 first person: Space vaults / hops
    if(e.code==='Digit1')act('slot','primary');if(e.code==='Digit2')act('slot','secondary');if(e.code==='Digit3')act('slot','melee');
    if(e.code==='KeyR')act('reload');if(e.code==='KeyH')act('heal');if(e.code==='KeyG')act('eat');
    if(e.code==='KeyE'||e.code==='KeyF')usePick();
    if(e.code==='KeyB')act('fix');
    if(e.code==='KeyQ'&&!e.repeat)act('throw');
  });
  addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space')ctl.fireHeld=false;});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false;ctl.fireHeld=false;ctl.ads=false;});
  cv.addEventListener('mousedown',e=>{if(e.button===2&&G.running)ctl.ads=true;});   // v0.29 (mousedown: a second button held with the first gives no pointerdown)
  addEventListener('mouseup',e=>{if(e.button===2)ctl.ads=false;});
  cv.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'){mouse.active=true;if(view.fps&&!mouseLocked()){lockMouse();return;}if(e.button===0&&G.running){ctl.fireHeld=true;ctl.fireQ=.2;}return;}   // v0.28 the first click takes the mouse
    mouse.active=false;
    if(e.clientX<innerWidth*.55&&joy.id===null){joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;joy.x=joy.y=0;const j=$('joy');j.style.left=e.clientX+'px';j.style.top=e.clientY+'px';j.hidden=false;$('knob').style.transform='';}
    else if(view.fps&&lookId===null){lookId=e.pointerId;lookX=e.clientX;lookY=e.clientY;}   // v0.28 right half turns the view, the attack button fires
    else{rightId=e.pointerId;ctl.fireHeld=true;ctl.fireQ=.2;}
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
  });
  cv.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'&&view.fps&&mouseLocked()){look(e.movementX||0,e.movementY||0,false);return;}
    if(e.pointerId===lookId){look(e.clientX-lookX,e.clientY-lookY,true);lookX=e.clientX;lookY=e.clientY;return;}
    if(e.pointerType==='mouse'){mouse.active=true;mouse.ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);return;}
    if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=56;if(l>M){dx=dx/l*M;dy=dy/l*M;}joy.x=dx/M;joy.y=dy/M;$('knob').style.transform=`translate(${dx}px,${dy}px)`;
  });
  const endPtr=e=>{if(e.pointerType==='mouse'){if(e.button!==2)ctl.fireHeld=false;return;}if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;$('joy').hidden=true;}if(e.pointerId===rightId){rightId=null;ctl.fireHeld=false;}if(e.pointerId===lookId)lookId=null;};
  cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{e.preventDefault();if(view.fps)return;zoom(e.deltaY>0?1.1:1/1.1);},{passive:false});
  $('bView').addEventListener('click',toggleFps);
  $('bAds').addEventListener('click',()=>{ctl.adsTouch=!ctl.adsTouch;});   // v0.29 touch: aim down the sights on / off
  $('bStance').addEventListener('click',()=>{ctl.stance=(ctl.stance+1)%3;});
  $('bZin').addEventListener('click',()=>zoom(1/1.2));$('bZout').addEventListener('click',()=>zoom(1.2));
  $('bSpeed').addEventListener('click',()=>{if(!isSolo())return;G.speedIdx=(G.speedIdx+1)%SPEEDS.length;$('bSpeed').textContent='×'+SPEEDS[G.speedIdx];});
  $('bBag').addEventListener('click',()=>{$('bag').hidden?openBag():closeBag();});
  $('bagClose').addEventListener('click',closeBag);
  $('bag').addEventListener('pointerdown',e=>{if(e.target===$('bag'))closeBag();});
  const atk=$('bAtk');
  atk.addEventListener('pointerdown',e=>{e.preventDefault();mouse.active=e.pointerType==='mouse'&&mouse.active;ctl.fireHeld=true;ctl.fireQ=.2;try{atk.setPointerCapture(e.pointerId);}catch(_){}});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])atk.addEventListener(ev,()=>{ctl.fireHeld=false;});
  $('bReload').addEventListener('click',()=>act('reload'));
  $('bHeal').addEventListener('click',()=>act('heal'));
  $('bEat').addEventListener('click',()=>act('eat'));
  // difficulty for new games, remembered in this browser; a continued save keeps its own
  let pref='normal';try{pref=localStorage.getItem('ordinary-day.diff')||'normal';}catch(_){}
  const pickDiff=k=>{if(!DIFFS[k])k='normal';G.diff=k;for(const b of document.querySelectorAll('.diffs button')){b.classList.toggle('on',b.dataset.diff===k);b.setAttribute('aria-checked',b.dataset.diff===k);}$('diffNote').textContent=DIFFS[k].desc;try{localStorage.setItem('ordinary-day.diff',k);}catch(_){}};
  for(const b of document.querySelectorAll('.diffs button'))b.addEventListener('click',()=>pickDiff(b.dataset.diff));
  pickDiff(pref);
  $('bPick').addEventListener('click',usePick);
  $('bFix').addEventListener('click',()=>act('fix'));
  $('bThrow').addEventListener('click',()=>act('throw'));
  for(const c of chipEls)c.addEventListener('click',()=>act('slot',c.dataset.slot));
  $('bStart').addEventListener('click',()=>{clearSave();reset();ctl.stance=0;ctl.adsTouch=false;$('overlay').hidden=true;G.running=true;});
  $('bContinue').addEventListener('click',()=>{if(!loadGame()){showContinue();return;}$('overlay').hidden=true;G.running=true;say('เล่นต่อจากเซฟ · '+$('contInfo').textContent,'',4);});
  showContinue();
  for(const id of ['bSound','bSound2'])$(id).addEventListener('click',()=>{toggleMute();showSound();});showSound();
  $('bAgain').addEventListener('click',()=>{reset();ctl.stance=0;ctl.adsTouch=false;$('overlay').hidden=true;G.running=true;});
  if(isTouch){$('atkKey').textContent='กดค้าง';}
  $('keys').innerHTML=isTouch
    ?'<kbd>นิ้วซ้าย</kbd><span>ลากเพื่อเดิน ดันสุดเพื่อวิ่ง</span><kbd>ปุ่มโจมตี</kbd><span>กดค้างเพื่อยิงต่อเนื่อง เล็งให้อัตโนมัติ</span><kbd>1 2 3</kbd><span>สลับอาวุธหลัก รอง ประชิด</span><kbd>👁</kbd><span>มุมมองบุคคลที่หนึ่ง (ทดลอง) นิ้วขวาลากเพื่อหันมอง ปุ่ม 🎯 เล็งศูนย์ ปุ่มท่าทาง ยืน หมอบ นอน</span><kbd>ดันจอยสุด</kbd><span>วิ่งชนของเตี้ย เช่นม้านั่ง รถ โต๊ะ แล้วกระโดดข้าม ซอมบี้ต้องเดินอ้อม</span><kbd>กระเป๋า</kbd><span>ติดตั้ง ใช้ หรือทิ้งของ (เกมหยุดระหว่างเปิด)</span>'
    :'<kbd>W A S D</kbd><span>เดิน (Shift วิ่ง กลางคืนเสียงวิ่งเรียกซอมบี้)</span><kbd>เมาส์</kbd><span>เล็ง · คลิกค้างเพื่อโจมตี</span><kbd>1 2 3</kbd><span>สลับอาวุธหลัก รอง ประชิด</span><kbd>R · E · H</kbd><span>รีโหลด · เก็บของ · ใช้ยา</span><kbd>Tab</kbd><span>เปิดกระเป๋า (เกมหยุดระหว่างเปิด)</span><kbd>V</kbd><span>มุมมองบุคคลที่หนึ่ง (ทดลอง) เมาส์หันมอง</span><kbd>คลิกขวา</kbd><span>เล็งศูนย์ (ปืน) · Sniper มองผ่านกล้อง กด Shift กลั้นหายใจ</span><kbd>C · Z</kbd><span>หมอบ · นอนราบ (เดินช้า เสียงเบา ซอมบี้เห็นยาก ยิงแม่นขึ้น)</span><kbd>Shift + เดินชน</kbd><span>วิ่งชนของเตี้ย (ม้านั่ง รถ เคาน์เตอร์ โต๊ะ) แล้วกระโดดข้าม · มุมบุคคลที่หนึ่งกด Space</span>';
}
