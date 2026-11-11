import {$,isTouch} from '../core/util.js';
import {cv,zoom,camera,view} from '../core/renderer.js';
import {G,isPvp} from '../core/state.js';
import {keys,ctl,mouse,joy} from '../core/controls.js';
import {player} from '../entities/player.js';
import {act} from '../systems/actions.js';
import {DIFFS} from '../config/difficulty.js';
import {PING} from '../config/party.js';
import {reset,travel} from '../systems/game.js';
import {readSave,loadGame,clearSave} from '../systems/save.js';
import {chipEls} from './hud.js';
import {openBag,closeBag} from './bag.js';
import {isMuted,toggleMute} from '../systems/audio.js';
import {isSettingsOpen,closeSettings} from './settings.js';
import {isPauseOpen,togglePause} from './pause.js';
import {toggleFps,setFps,look,lockMouse,mouseLocked,lockRefused,fpsMove,isScoped,freeLook,clearEdge} from './fps.js';

// ---------- input ----------
let rightId=null,lookId=null,lookX=0,lookY=0;   // v0.28 a finger turning the first-person view
// start screen: offer "continue" when an autosave exists; starting a new day overwrites it
export function showContinue(){
  const s=readSave(),has=!!s;
  $('bContinue').hidden=!has;$('bStart').classList.toggle('alt',has);
}
// E / the pick button: open the bag when only a full-bag item is in reach, otherwise the 'use' action (systems/actions.js)
// v0.53 a marker: where the mouse points (from above), where the view looks (first person), or straight ahead
function pingHere(ahead){
  const p=player;if(!p||!p.alive)return;let x,z;
  if(!ahead&&!view.fps&&mouse.active){mray.setFromCamera(mouse.ndc,camera);if(mray.ray.intersectPlane(groundPlane,mouse.world)){x=mouse.world.x;z=mouse.world.z;}}
  if(x===undefined){const a=view.fps?view.yaw:p.face;x=p.pos.x+Math.sin(a)*PING.ahead;z=p.pos.z+Math.cos(a)*PING.ahead;}
  act('ping',Math.round(x*10)/10,Math.round(z*10)/10);
}
function usePick(){if(player.full&&!player.near&&!player.nearDown)openBag();else act('use');}
// keyboard / mouse / stick -> the local player's input, once per simulation step (v0.9: the player reads only p.input)
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),mray=new THREE.Raycaster();
export function pollInput(p){
  const I=p.input;let ix=0,iy=0;const gp=padButtons();   // v0.59 a gamepad
  if(!$('bag').hidden||!$('pause').hidden){Object.assign(I,{mx:0,mz:0,mag:0,run:false,fire:false,fireQ:0,face:null,ads:false});return;}   // a menu open while the world goes on (v0.11)
  if(p.car>=0&&view.fps)setFps(false);   // v0.45 driving is seen from above
  if(keys.KeyW||keys.ArrowUp)iy+=1;if(keys.KeyS||keys.ArrowDown)iy-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;
  if(joy.id!==null){ix+=joy.x;iy-=joy.y;}
  if(gp){ix+=gp.lx;iy-=gp.ly;}
  let mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag;mag=1;}
  // screen to ground under the isometric camera: screen right = (1,-1)/√2, screen up = (-1,-1)/√2
  I.mx=(ix-iy)/Math.SQRT2;I.mz=(-ix-iy)/Math.SQRT2;I.mag=mag;
  if(view.fps)[I.mx,I.mz]=fpsMove(ix,iy);   // v0.28 relative to where the view looks
  I.run=!!(keys.ShiftLeft||keys.ShiftRight)||(joy.id!==null&&mag>.9)||!!(gp&&pad.run&&mag>.08);
  I.slow=false;I.sneak=joy.id!==null&&mag>.08&&mag<.45;
  // C sneaks (toggles; running ends it; v0.44 no crouch or prone), right mouse or 🎯 aims down the sights
  if(I.run&&mag>.08)ctl.sneak=false;
  I.slow=!!ctl.sneak;I.ads=ctl.ads||ctl.adsTouch||!!(gp&&gp.lt);if(ctl.jumpQ>0){I.jumpQ=ctl.jumpQ;ctl.jumpQ=0;}   // v0.30
  view.breathKey=false;if(isScoped(p)){view.breathKey=I.run;I.run=false;}   // through the scope Shift holds the breath
  I.aim=mouse.active;I.face=null;
  if(view.fps){I.face=view.yaw+view.sway;I.aim=!isTouch;I.aimDist=40;}   // v0.28 face where the view looks; on a phone aim assist still helps
  else if(mouse.active){mray.setFromCamera(mouse.ndc,camera);if(mray.ray.intersectPlane(groundPlane,mouse.world)){I.face=Math.atan2(mouse.world.x-p.pos.x,mouse.world.z-p.pos.z);I.aimDist=Math.hypot(mouse.world.x-p.pos.x,mouse.world.z-p.pos.z);}}
  I.fire=ctl.fireHeld;if(ctl.fireQ>0){I.fireQ=ctl.fireQ;ctl.fireQ=0;}
  if(gp)padAim(p,I,gp);
}
// ---------- gamepad (v0.59) ----------
// The standard mapping (Xbox / PlayStation pads in Chrome, Edge, Firefox, Safari): left stick walks (pressed in: run until
// it is let go), right stick aims (first person: turns the view), RT fires, LT aims down the sights, A takes / opens /
// gets in, X reloads, B sneaks, Y the bag (padMenu), LB throws, RB the next weapon, RS the hammer (fix, barricade), D-pad: up the
// flashlight, down a marker, left heals, right vaults; View the first-person view, Menu pauses. It only takes over once
// it is touched, and keyboard, mouse and touch keep working beside it.
const pad={on:false,run:false,prev:[],fire:false,menuPrev:[]};
const firstPad=()=>{const list=typeof navigator!=='undefined'&&navigator.getGamepads?navigator.getGamepads():null;if(list)for(const x of list)if(x&&x.connected)return x;return null;};
const held=(g,i)=>!!(g.buttons[i]&&(g.buttons[i].pressed||g.buttons[i].value>.5));
// The two buttons that open and close screens (Menu: pause, Y: the bag) are read once a frame from the main loop, not
// with the rest of the pad in pollInput(): that runs inside the simulation, which stops while a screen is open in a
// game alone, so a pad could open the bag or the pause menu and then never close it.
export function padMenu(){
  const g=firstPad();if(!g)return;
  const tap=i=>{const now=held(g,i),was=pad.menuPrev[i];pad.menuPrev[i]=now;return now&&!was;},menu=tap(9),bag=tap(3);
  if(!G.running||!(menu||bag))return;
  pad.on=true;
  if(menu){if(isSettingsOpen())closeSettings();else if(!$('bag').hidden)closeBag();else togglePause();}
  else if(!isPauseOpen())$('bag').hidden?openBag():closeBag();
}
const DEAD=.2,ax=(g,i)=>{const v=g.axes[i]||0;return Math.abs(v)<DEAD?0:(v-Math.sign(v)*DEAD)/(1-DEAD);};
function padButtons(){
  const g=firstPad();
  if(!g)return null;
  const b=i=>held(g,i),tap=i=>{const now=b(i),was=pad.prev[i];pad.prev[i]=now;return now&&!was;};
  const s={lx:ax(g,0),ly:ax(g,1),rx:ax(g,2),ry:ax(g,3),lt:b(6),rt:b(7)};
  if(!pad.on){if(!(s.lx||s.ly||s.rx||s.ry||g.buttons.some(x=>x&&x.pressed)))return null;pad.on=true;mouse.active=false;}
  const taps=[];for(let i=0;i<16;i++)if(tap(i))taps.push(i);
  if(G.paused||!$('bag').hidden||!$('pause').hidden){pad.fire=false;return s;}
  if(taps.includes(0))usePick();if(taps.includes(2))act('reload');if(taps.includes(1))ctl.sneak=!ctl.sneak;
  if(taps.includes(4))act('throw');if(taps.includes(11))act('fix');if(taps.includes(8))toggleFps();
  if(taps.includes(5)){const o=['primary','secondary','melee'],g2=player.gear;act('slot',o[(o.indexOf(g2.active)+1)%3]);}
  if(taps.includes(12))act('light');if(taps.includes(13))pingHere();if(taps.includes(14))act('heal');if(taps.includes(15))ctl.jumpQ=.25;
  if(taps.includes(10))pad.run=true;if(!s.lx&&!s.ly)pad.run=false;
  // the trigger fires like the mouse button: held, and a press always gets one shot out
  if(s.rt&&!pad.fire){ctl.fireHeld=true;ctl.fireQ=.2;}else if(!s.rt&&pad.fire)ctl.fireHeld=false;pad.fire=s.rt;
  return s;
}
// the right stick: the way the player faces on the ground (screen directions, like walking), or the first-person view
function padAim(p,I,s){
  if(view.fps){if(s.rx||s.ry)look(s.rx*12,s.ry*9);I.face=view.yaw+view.sway;return;}
  const m=Math.hypot(s.rx,s.ry);
  if(m>.3){const fx=(s.rx+s.ry)/Math.SQRT2,fz=(-s.rx+s.ry)/Math.SQRT2;I.face=Math.atan2(fx,fz);I.aim=true;I.aimDist=6+m*14;}
  else if(I.mag>.08&&!mouse.active){I.face=Math.atan2(I.mx,I.mz);}
}
export const padOn=()=>pad.on;
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
    if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;   // v0.41 typing a name or a room code
    if(e.code==='Tab'||e.code==='KeyI'){e.preventDefault();if(!isPauseOpen())$('bag').hidden?openBag():closeBag();return;}
    if(e.code==='Escape'||e.code==='KeyP'){if(isSettingsOpen())closeSettings();else if(!$('bag').hidden)closeBag();else togglePause();return;}
    if(e.code==='KeyM'){toggleMute();showSound();return;}
    if(G.paused)return;
    if(e.code==='KeyV'&&!e.repeat){toggleFps();return;}   // v0.28
    if(e.code==='KeyC'&&!e.repeat){ctl.sneak=!ctl.sneak;return;}   // v0.29, v0.44 a quiet walk standing up
    keys[e.code]=true;
    if(e.code==='Space'){e.preventDefault();if(!e.repeat){if(view.fps)ctl.jumpQ=.25;else{ctl.fireHeld=true;ctl.fireQ=.2;}}}   // v0.30 first person: Space vaults / hops
    if(e.code==='Digit1')act('slot','primary');if(e.code==='Digit2')act('slot','secondary');if(e.code==='Digit3')act('slot','melee');
    if(e.code==='KeyR')act('reload');if(e.code==='KeyH')act('heal');
    if(e.code==='KeyE'||e.code==='KeyF')usePick();
    if(e.code==='KeyB')act('fix');
    if(e.code==='KeyT'&&!e.repeat)act('light');   // v0.50 the flashlight
    if(e.code==='KeyG'&&!e.repeat)pingHere();   // v0.53 a marker
    if(e.code==='KeyQ'&&!e.repeat)act('throw');
  });
  addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space')ctl.fireHeld=false;});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false;ctl.fireHeld=false;ctl.ads=false;});
  cv.addEventListener('mousedown',e=>{if(e.button===2&&G.running)ctl.ads=true;   // v0.29 (mousedown: a second button held with the first gives no pointerdown)
    if(e.button===0&&(e.buttons&~1)&&G.running&&(!view.fps||mouseLocked()||lockRefused())){ctl.fireHeld=true;ctl.fireQ=.2;}});   // v0.38 the left button pressed while the right one aims: no pointerdown for it either
  addEventListener('mouseup',e=>{if(e.button===2)ctl.ads=false;if(e.button===0)ctl.fireHeld=false;});   // nor a pointerup when the right one is still held
  cv.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'){mouse.active=true;if(view.fps&&!mouseLocked()&&!lockRefused()){lockMouse();return;}if(e.button===0&&G.running){ctl.fireHeld=true;ctl.fireQ=.2;}return;}   // v0.28 the first click takes the mouse
    mouse.active=false;
    if(e.clientX<innerWidth*.55&&joy.id===null){joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;joy.x=joy.y=0;const j=$('joy');j.style.left=e.clientX+'px';j.style.top=e.clientY+'px';j.hidden=false;$('knob').style.transform='';}
    else if(view.fps&&lookId===null){lookId=e.pointerId;lookX=e.clientX;lookY=e.clientY;}   // v0.28 right half turns the view, the attack button fires
    else{rightId=e.pointerId;ctl.fireHeld=true;ctl.fireQ=.2;}
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
  });
  cv.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'&&view.fps&&mouseLocked()){look(e.movementX||0,e.movementY||0,false);return;}
    if(e.pointerType==='mouse'&&view.fps&&G.running){mouse.active=true;freeLook(e);return;}   // v0.36 not locked: the mouse still turns the view
    if(e.pointerId===lookId){look(e.clientX-lookX,e.clientY-lookY,true);lookX=e.clientX;lookY=e.clientY;return;}
    if(e.pointerType==='mouse'){mouse.active=true;mouse.ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);return;}
    if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=56;if(l>M){dx=dx/l*M;dy=dy/l*M;}joy.x=dx/M;joy.y=dy/M;$('knob').style.transform=`translate(${dx}px,${dy}px)`;
  });
  const endPtr=e=>{if(e.pointerType==='mouse'){if(e.button!==2)ctl.fireHeld=false;return;}if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;$('joy').hidden=true;}if(e.pointerId===rightId){rightId=null;ctl.fireHeld=false;}if(e.pointerId===lookId)lookId=null;};
  cv.addEventListener('pointerleave',clearEdge);
  cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{e.preventDefault();if(view.fps)return;zoom(e.deltaY>0?1.1:1/1.1);},{passive:false});
  // v0.35 first person on a phone: the right thumb rests on the buttons there, so a finger that slides off one of them
  // turns the view too (a tap still presses it; a slide does not)
  let slideId=null,slideX=0,slideY=0,slid=false;
  addEventListener('pointerdown',e=>{slid=false;if(!view.fps||e.pointerType==='mouse'||e.target===cv||e.clientX<innerWidth*.55||e.target.closest&&e.target.closest('#bAtk'))return;
    if(!$('bag').hidden||!$('pause').hidden||!$('overlay').hidden)return;slideId=e.pointerId;slideX=e.clientX;slideY=e.clientY;},true);
  addEventListener('pointermove',e=>{if(e.pointerId!==slideId)return;const dx=e.clientX-slideX,dy=e.clientY-slideY;if(!slid&&Math.hypot(dx,dy)<12)return;
    slid=true;look(dx,dy,true);slideX=e.clientX;slideY=e.clientY;},true);
  for(const ev of ['pointerup','pointercancel'])addEventListener(ev,e=>{if(e.pointerId===slideId)slideId=null;},true);
  addEventListener('click',e=>{if(slid){slid=false;e.stopPropagation();e.preventDefault();}},true);
  $('bView').addEventListener('click',toggleFps);
  $('bLight').addEventListener('click',()=>act('light'));   // v0.50
  $('bPing').addEventListener('click',()=>pingHere(true));   // v0.53
  $('bAds').addEventListener('click',()=>{ctl.adsTouch=!ctl.adsTouch;});   // v0.29 touch: aim down the sights on / off
  $('bZin').addEventListener('click',()=>zoom(1/1.2));$('bZout').addEventListener('click',()=>zoom(1.2));
  $('bBag').addEventListener('click',()=>{$('bag').hidden?openBag():closeBag();});
  $('bagClose').addEventListener('click',closeBag);
  $('bag').addEventListener('pointerdown',e=>{if(e.target===$('bag'))closeBag();});
  const atk=$('bAtk');
  let atkX=0,atkY=0;
  atk.addEventListener('pointerdown',e=>{e.preventDefault();mouse.active=e.pointerType==='mouse'&&mouse.active;ctl.fireHeld=true;ctl.fireQ=.2;atkX=e.clientX;atkY=e.clientY;try{atk.setPointerCapture(e.pointerId);}catch(_){}});
  // v0.35 first person on a phone: the thumb on the attack button turns the view as it slides, so you can shoot and aim at once
  atk.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||!view.fps||!ctl.fireHeld)return;look(e.clientX-atkX,e.clientY-atkY,true);atkX=e.clientX;atkY=e.clientY;});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])atk.addEventListener(ev,()=>{ctl.fireHeld=false;});
  $('bReload').addEventListener('click',()=>act('reload'));
  $('bHeal').addEventListener('click',()=>act('heal'));
  // difficulty for new games, remembered in this browser; a continued save keeps its own
  let pref='normal';try{pref=localStorage.getItem('ordinary-day.diff')||'normal';}catch(_){}
  const pickDiff=k=>{if(!DIFFS[k])k='normal';G.diff=k;for(const b of document.querySelectorAll('.diffs button')){b.classList.toggle('on',b.dataset.diff===k);b.setAttribute('aria-checked',b.dataset.diff===k);}try{localStorage.setItem('ordinary-day.diff',k);}catch(_){}};
  for(const b of document.querySelectorAll('.diffs button'))b.addEventListener('click',()=>pickDiff(b.dataset.diff));
  pickDiff(pref);
  $('bPick').addEventListener('click',usePick);
  $('bFix').addEventListener('click',()=>act('fix'));
  $('bThrow').addEventListener('click',()=>act('throw'));
  for(const c of chipEls)c.addEventListener('click',()=>act('slot',c.dataset.slot));
  $('bStart').addEventListener('click',()=>{clearSave();reset();ctl.sneak=false;ctl.adsTouch=false;$('overlay').hidden=true;G.running=true;});
  $('bContinue').addEventListener('click',()=>{if(!loadGame()){showContinue();return;}$('overlay').hidden=true;G.running=true;});
  showContinue();
  for(const id of ['bSound','bSound2'])$(id).addEventListener('click',()=>{toggleMute();showSound();});showSound();
  {const tv=$('bTravel');if(tv)tv.addEventListener('click',()=>{clearSave();travel();});}   // v0.66 on to the next town (or back to the first)
  $('bAgain').addEventListener('click',async()=>{if(isPvp()){(await import('../systems/pvp.js')).nextRound();return;}   // v0.49 the next PvP round
    reset();ctl.sneak=false;ctl.adsTouch=false;$('overlay').hidden=true;G.running=true;});
  if(isTouch){$('atkKey').textContent='กดค้าง';}
}
