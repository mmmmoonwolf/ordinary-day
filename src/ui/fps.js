import {isTouch,$,clamp} from '../core/util.js';
import {cv,view,fpsCam} from '../core/renderer.js';
import {G} from '../core/state.js';
import {DEF} from '../config/items.js';
import {STUB_H} from '../config/shelter.js';
import {curWeapon} from '../systems/inventory.js';
import {weaponModel} from '../world/item-models.js';
import {rooms,shownRoom,slab} from '../world/interiors.js';
import {player} from '../entities/player.js';

// ---------- first-person view (v0.28, experimental) ----------
// V or the 👁 button switches between the isometric camera and the eyes of the player this device follows. Only the
// camera and the controls change: the mouse (pointer lock) or a finger on the right half of the screen turns the view,
// the keys and the stick move relative to it, and the player always faces where the view looks. Shots stay level, as in
// the isometric game (the pitch is only for looking). The own body is hidden and the weapon is drawn in front of the
// camera; inside a building the cut-away walls are raised to full height under a ceiling.
const SENS=.0022,TOUCH_SENS=.0055,PITCH=[-.8,.6];   // mouse / finger look speed (rad per pixel), how far down and up
const EYE=1.62,EYE_DOWN=.5,CEIL=3.1,DOOR_TOP=2.2;   // eye height standing / down (m), room ceiling, top of the door
export function setFps(on){
  view.fps=on;if(document.body)document.body.classList.toggle('fps',on);
  if(on){view.yaw=player.face;view.pitch=-.08;}
  else if(document.pointerLockElement===cv)document.exitPointerLock();
  for(const r of rooms)if(r.shell)r.shell.visible=on;
  vm.visible=false;vmId=null;
}
export const toggleFps=()=>setFps(!view.fps);
export function look(dx,dy,touch){const k=touch?TOUCH_SENS:SENS;view.yaw-=dx*k;view.pitch=clamp(view.pitch-dy*k,...PITCH);}
export const mouseLocked=()=>document.pointerLockElement===cv;
export function lockMouse(){if(!isTouch&&cv.requestPointerLock)try{cv.requestPointerLock();}catch(_){}}
// stick / keys (right, forward) -> a ground direction, relative to where the view looks
export function fpsMove(ix,iy){const fx=Math.sin(view.yaw),fz=Math.cos(view.yaw);return [-fz*ix+fx*iy,fx*ix+fz*iy];}

// the weapon in front of the camera
const vm=new THREE.Group();fpsCam.add(vm);vm.visible=false;let vmId=null,vmModel=null;
function viewModel(v){
  const id=curWeapon(v).id;
  if(id!==vmId){vmId=id;if(vmModel){vm.remove(vmModel);vmModel=null;}
    if(id!=='fist'){const def=DEF[id];vmModel=weaponModel(def.model);vmModel.scale.setScalar(.42);vmModel.rotation.order='YXZ';vm.add(vmModel);
      vmModel.traverse(o=>{if(o.isMesh){o.castShadow=false;o.renderOrder=10;}});}}
  vm.visible=!!vmModel&&v.alive&&!(v.down>0)&&!(v.bleed>0);if(!vm.visible)return;
  const def=DEF[id],gun=def.gun,t=performance.now()/1000,mv=Math.min(1,(v.moving||0)/4),sway=Math.sin(t*8)*.012*mv;
  let x=gun?.13:.22,y=(gun?-.13:-.26)+Math.abs(sway),z=gun?-.3:-.36,rx=gun?0:-1,ry=Math.PI+(gun?0:.25);   // a melee weapon held up
  if(gun){z+=v.recoil*.06;rx+=v.recoil*.12;if(v.reloadT>0){y-=.12;rx-=.5;}}
  else if(v.swing>0){const k=1-v.swing/Math.max(.05,v.swingDur),a=Math.sin(k*Math.PI);rx=-1+a*1.5;ry=Math.PI+.6-k*1.2;x-=a*.12;}   // down and across
  vmModel.position.set(x+sway,y,z);vmModel.rotation.set(rx,ry,0);
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
let bob=0;
export function updateFps(v,dt){
  if(v!==player)view.yaw+=Math.atan2(Math.sin(v.face-view.yaw),Math.cos(v.face-view.yaw))*Math.min(1,dt*6);   // watching a teammate
  const low=!v.alive||v.down>0||v.bleed>0;bob+=dt*(v.moving||0)*2.2;
  const eye=low?EYE_DOWN:EYE+Math.sin(bob)*.035*Math.min(1,(v.moving||0)/3);
  fpsCam.position.set(v.pos.x,(v.y||0)+eye,v.pos.z);fpsCam.rotation.set(view.pitch,view.yaw+Math.PI,0,'YXZ');
  v.b.root.visible=false;   // no own body in front of the eyes (animate() shows it again next frame)
  viewModel(v);
  const k=shownRoom();if(k>=0){const r=rooms[k],s=shell(r);s.visible=true;r.shellDoor.visible=r.cutDoor.visible;}
  // the cursor comes back for the bag and the pause menu; a click on the game takes the mouse again
  if(mouseLocked()&&(!$('bag').hidden||!$('pause').hidden||!$('overlay').hidden))document.exitPointerLock();
  const hint=!isTouch&&!mouseLocked()&&G.running&&$('bag').hidden&&$('pause').hidden&&$('overlay').hidden;
  if($('fpsHint').hidden===hint)$('fpsHint').hidden=!hint;
}
