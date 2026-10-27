import {isTouch,$,clamp} from '../core/util.js';
import {cv,view,fpsCam} from '../core/renderer.js';
import {G} from '../core/state.js';
import {DEF} from '../config/items.js';
import {STUB_H} from '../config/shelter.js';
import {ADS,STANCE,SWAY,BREATH,BREATH_REST,KICK} from '../config/handling.js';
import {curWeapon} from '../systems/inventory.js';
import {weaponModel} from '../world/item-models.js';
import {rooms,shownRoom,slab} from '../world/interiors.js';
import {player,HOLD} from '../entities/player.js';
import {skins,makeArms,dropArms,armsFrame} from '../entities/skins.js';
import {settings} from './settings.js';

// ---------- first-person view (v0.28, experimental) ----------
// V or the 👁 button switches between the isometric camera and the eyes of the player this device follows. Only the
// camera and the controls change: the mouse (pointer lock) or a finger on the right half of the screen turns the view,
// the keys and the stick move relative to it, and the player always faces where the view looks. Shots stay level, as in
// the isometric game (the pitch is only for looking). The own body is hidden and the weapon is drawn in front of the
// camera; inside a building the cut-away walls are raised to full height under a ceiling.
// v0.29: aiming down the sights zooms in (the sniper rifle through a scope), the aim drifts and every shot kicks the
// view up, the eyes drop when crouched or prone (config/handling.js)
const SENS=.0022,TOUCH_SENS=.0055,PITCH=[-.8,.6],FOV=72,EDGE_TURN=1.6;   // mouse / finger look speed (rad per pixel), how far down and up, field of view, turning with the cursor at the edge (rad/s, PLACEHOLDER)
const EYE_DOWN=.5,CEIL=3.1,DOOR_TOP=2.2;   // eye height when down (m), room ceiling, top of the door
let touchHint=0;   // v0.35 on a phone, how to look around is shown for a few seconds
export function setFps(on){
  view.fps=on;if(document.body)document.body.classList.toggle('fps',on);
  if(on){view.yaw=player.face;view.pitch=-.08;if(isTouch){touchHint=performance.now()+5000;$('fpsHint').textContent='ลากนิ้วด้านขวาของจอเพื่อหันมอง';}}   // v0.35
  else if(document.pointerLockElement===cv)document.exitPointerLock();
  for(const r of rooms)if(r.shell)r.shell.visible=on;
  vm.visible=false;vmId=null;if(arms)arms.o.visible=false;
  view.sway=0;adsT=0;zoom=1;fpsCam.fov=FOV;fpsCam.updateProjectionMatrix();
  if(!on){for(const id of ['bAds','bStance'])$(id).hidden=true;if(document.body)document.body.classList.remove('scoped','ads');}
}
export const toggleFps=()=>setFps(!view.fps);
export function look(dx,dy,touch){const k=(touch?TOUCH_SENS:SENS)*settings.sens/zoom;view.yaw-=dx*k;view.pitch=clamp(view.pitch-dy*k,...PITCH);}
// looking through a scope right now (Shift then holds the breath instead of running)
export function isScoped(p){if(!view.fps||!p.input.ads)return false;const d=DEF[curWeapon(p).id];return !!d.gun&&ADS.scope.includes(d.model);}
export const mouseLocked=()=>document.pointerLockElement===cv;
export function lockMouse(){if(isTouch||!cv.requestPointerLock)return;try{const r=cv.requestPointerLock();if(r&&r.catch)r.catch(refused);}catch(_){refused();}}
// v0.38 a browser that refuses the lock twice in a row is left alone: clicks then shoot instead of asking again
let lockFails=0;
function refused(){lockFailT=performance.now();lockFails++;}
export const lockRefused=()=>lockFails>=2;
// v0.36 without the lock (not clicked yet, the browser refused it, or Esc just let it go) the mouse still turns the view:
// moving it over the game turns by how far it moved, and resting it near the left or right edge keeps turning
let lockFailT=0,edge=0;
if(globalThis.document&&document.addEventListener){document.addEventListener('pointerlockerror',refused);document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement)lockFails=0;});}
export function freeLook(e){look(e.movementX||0,e.movementY||0,false);const x=e.clientX/innerWidth;edge=x<.05?1:x>.95?-1:0;}
export function clearEdge(){edge=0;}
// stick / keys (right, forward) -> a ground direction, relative to where the view looks
export function fpsMove(ix,iy){const fx=Math.sin(view.yaw),fz=Math.cos(view.yaw);return [-fz*ix+fx*iy,fx*ix+fz*iy];}

// v0.39 the player's own arms (entities/skins.js makeArms): where the head bone sits against the camera (right, up, back; m;
// level with the camera: further ahead the shoulders and the backpack come into view) and how far a shot pushes them back. PLACEHOLDER, set by eye.
// Aiming down the sights only zooms (moving the hands under the crosshair put the left hand across the view).
const ARMS={eye:[.03,-.12,0],kick:.07};
let arms=null;const hv=new THREE.Vector3();
const heldModel=def=>{const m=weaponModel(def.model);HOLD(m,def);return m;};
function viewArms(v,dt,scoped){
  if(arms&&(arms.p!==v||!skins.on)){dropArms(arms);arms=null;}
  if(!arms&&skins.ready&&skins.on){arms=makeArms(v);if(arms){arms.o.rotation.y=Math.PI;fpsCam.add(arms.o);}}
  if(!arms)return false;
  const show=v.alive&&!(v.down>0)&&!(v.bleed>0)&&!scoped;arms.o.visible=show;if(!show)return true;
  armsFrame(arms,v,dt,heldModel);
  const o=arms.o,head=arms.bones.Head;if(!head)return true;
  fpsCam.updateMatrixWorld();o.updateMatrixWorld(true);
  head.getWorldPosition(hv);fpsCam.worldToLocal(hv);
  const [x,y]=ARMS.eye,z=ARMS.eye[2]+(v.recoil||0)*ARMS.kick;
  o.position.x+=x-hv.x;o.position.y+=y-hv.y;o.position.z+=z-hv.z;
  return true;
}
// the weapon in front of the camera
const vm=new THREE.Group();fpsCam.add(vm);vm.visible=false;let vmId=null,vmModel=null,adsT=0,zoom=1;
function viewModel(v,ads,scoped,dt){
  if(viewArms(v,dt,scoped)){vm.visible=false;return;}
  const id=curWeapon(v).id;
  if(id!==vmId){vmId=id;if(vmModel){vm.remove(vmModel);vmModel=null;}
    if(id!=='fist'){const def=DEF[id];vmModel=weaponModel(def.model);vmModel.scale.setScalar(.42);vmModel.rotation.order='YXZ';vm.add(vmModel);
      vmModel.traverse(o=>{if(o.isMesh){o.castShadow=false;o.renderOrder=10;}});}}
  vm.visible=!!vmModel&&v.alive&&!(v.down>0)&&!(v.bleed>0)&&!scoped;if(!vm.visible)return;
  const def=DEF[id],gun=def.gun,t=performance.now()/1000,mv=Math.min(1,(v.moving||0)/4),sway=Math.sin(t*8)*.012*mv;
  let x=gun?.13:.22,y=(gun?-.13:-.26)+Math.abs(sway),z=gun?-.3:-.36,rx=gun?0:-1,ry=Math.PI+(gun?0:.25);   // a melee weapon held up
  if(gun){z+=v.recoil*.06;rx+=v.recoil*.12;if(v.reloadT>0){y-=.12;rx-=.5;}}
  else if(v.swing>0){const k=1-v.swing/Math.max(.05,v.swingDur),a=Math.sin(k*Math.PI);rx=-1+a*1.5;ry=Math.PI+.6-k*1.2;x-=a*.12;}   // down and across
  if(gun&&adsT>0){const k=adsT;x+=(0-x)*k;y+=(-.085-y)*k;z+=(-.24-z)*k;rx*=1-k*.6;}   // up to the eye, along the sights
  vmModel.position.set(x+sway*(1-adsT*.8),y,z);vmModel.rotation.set(rx,ry,0);
}
// full-height walls, the space above the doorway, a tall door and a ceiling for room k, made the first time it is seen
function shell(r){
  if(r.shell)return r.shell;
  const g=new THREE.Group(),y1=r.y0+Math.min(CEIL,r.b.h-.25),D=r.doorBox,cd=r.cutDoor;
  for(const q of r.walls)g.add(slab(r.wallMat,...q,r.y0+STUB_H,y1));
  g.add(slab(r.wallMat,D.x0,D.x1,D.z0,D.z1,r.y0+DOOR_TOP,y1));
  const hx=cd.scale.x/2,hz=cd.scale.z/2;r.shellDoor=slab(cd.material,cd.position.x-hx,cd.position.x+hx,cd.position.z-hz,cd.position.z+hz,cd.position.y+cd.scale.y/2,r.y0+DOOR_TOP);g.add(r.shellDoor);
  g.add(slab(r.wallMat,r.b.cx-r.b.w/2,r.b.cx+r.b.w/2,r.b.cz-r.b.d/2,r.b.cz+r.b.d/2,y1,y1+.12));
  g.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  r.cut.add(g);return (r.shell=g);
}
// once a frame, for the player the camera follows (the local one, or a teammate once dead)
let bob=0,eyeY=STANCE[0].eye,lastRecoil=0,breathT=0,breathRest=0,swayP=0;
export function updateFps(v,dt){
  const mine=v===player;
  if(!mine)view.yaw+=Math.atan2(Math.sin(v.face-view.yaw),Math.cos(v.face-view.yaw))*Math.min(1,dt*6);   // watching a teammate
  const low=!v.alive||v.down>0||v.bleed>0,st=STANCE[v.stance|0]||STANCE[0];bob+=dt*(v.moving||0)*2.2;
  eyeY+=((low?EYE_DOWN:st.eye)-eyeY)*Math.min(1,dt*8);
  const eye=eyeY+Math.sin(bob)*.035*Math.min(1,(v.moving||0)/3)*(v.stance===2?.3:1);
  // aiming down the sights: zoom in by gun, through the scope for a sniper rifle
  const d=DEF[curWeapon(v).id],ads=mine&&!low&&!!v.input.ads&&!!d.gun&&!(v.reloadT>0),scoped=ads&&ADS.scope.includes(d.model)&&adsT>.7;
  adsT+=((ads?1:0)-adsT)*Math.min(1,dt*12);
  const zt=ads?ADS.zoom[d.model]||1.3:1;zoom+=(zt-zoom)*Math.min(1,dt*10);
  if(Math.abs(fpsCam.fov-FOV/zoom)>.01){fpsCam.fov=FOV/zoom;fpsCam.updateProjectionMatrix();}
  const B=document.body;if(B){if(B.classList.contains('scoped')!==scoped)B.classList.toggle('scoped',scoped);if(B.classList.contains('ads')!==adsT>.5)B.classList.toggle('ads',adsT>.5);}
  // the aim drifts (steadier crouched or prone, wider through a scope; Shift holds the breath for a few seconds)
  const holding=scoped&&view.breathKey&&breathRest<=0;
  if(holding){breathT+=dt;if(breathT>BREATH){breathRest=BREATH_REST;breathT=0;}}else{if(breathRest>0)breathRest-=dt;breathT=Math.max(0,breathT-dt);}
  const t=performance.now()/1000,amp=mine&&!low?SWAY.base*((v.moving||0)>.3?SWAY.moving:1)*st.spread*(ads?SWAY.ads:1)*(scoped?SWAY.scope:1)*(holding?.08:1):0;
  view.sway+=((Math.sin(t*1.1)+.5*Math.sin(t*2.7+1))/1.5*amp-view.sway)*Math.min(1,dt*6);
  swayP+=((Math.sin(t*1.6+2)+.4*Math.sin(t*3.3))/1.4*amp*.7-swayP)*Math.min(1,dt*6);
  // every shot kicks the view up and a little sideways, more as the spread grows
  if(mine&&(v.recoil||0)>lastRecoil+.3){const k=1+(v.bloom||0);view.pitch=clamp(view.pitch+KICK.pitch*k*(ads?.7:1),...PITCH);view.yaw+=(Math.random()-.5)*2*KICK.yaw*k;}
  lastRecoil=v.recoil||0;
  fpsCam.position.set(v.pos.x,(v.y||0)+eye+(v.airH||0),v.pos.z);   // v0.30 over an obstacle or hopping
  fpsCam.rotation.set(view.pitch+swayP,view.yaw+view.sway+Math.PI,0,'YXZ');   // v0.37 this line had been swallowed by the comment above since v0.30
  v.b.root.visible=false;   // no own body in front of the eyes (animate() shows it again next frame)
  viewModel(v,ads,scoped,dt);
  const cr=$('cross');if(cr){const s='scale('+(1+(v.bloom||0)*.7).toFixed(2)+')';if(cr.style.transform!==s)cr.style.transform=s;}
  if(isTouch){const g=!!d.gun&&!low;if($('bAds').hidden===g)$('bAds').hidden=!g;if($('bStance').hidden)$('bStance').hidden=false;
    $('bAds').classList.toggle('on',!!v.input.ads);const sn=st.name||'ยืน';if($('bStance').textContent!==sn)$('bStance').textContent=sn;}
  const k=shownRoom();if(k>=0){const r=rooms[k],s=shell(r);s.visible=true;r.shellDoor.visible=r.cutDoor.visible;}
  // the cursor comes back for the bag and the pause menu; a click on the game takes the mouse again
  if(mouseLocked()&&(!$('bag').hidden||!$('pause').hidden||!$('overlay').hidden))document.exitPointerLock();
  const menus=$('bag').hidden&&$('pause').hidden&&$('overlay').hidden;
  if(mine&&!isTouch&&edge&&!mouseLocked()&&G.running&&menus)view.yaw+=edge*EDGE_TURN*settings.sens*dt;
  const hint=(isTouch?performance.now()<touchHint:!mouseLocked())&&G.running&&menus;
  if(hint&&!isTouch){const t=performance.now()-lockFailT<5000?'เบราว์เซอร์ไม่ให้ล็อกเมาส์ · เลื่อนเมาส์หรือพาไปขอบจอเพื่อหัน':'คลิกเพื่อล็อกเมาส์ (หรือเลื่อนเมาส์เพื่อหัน) · V กลับมุมเดิม';if($('fpsHint').textContent!==t)$('fpsHint').textContent=t;}
  if($('fpsHint').hidden===hint)$('fpsHint').hidden=!hint;
}
