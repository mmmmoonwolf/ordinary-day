import {$} from '../core/util.js';
import {camera} from '../core/renderer.js';
import {G} from '../core/state.js';
import {keys,ctl,mouse,joy} from '../core/controls.js';
import {OFF} from '../config/world.js';
import {DEF,itemColor} from '../config/items.js';
import {collide} from '../world/collision.js';
import {weaponModel} from '../world/item-models.js';
import {agents,makeAgent} from './agents.js';
import {moveAgent} from './movement.js';
import {updateDead,makeNoise} from './ai.js';
import {drops} from '../systems/drops.js';
import {curWeapon,pickup,gradeTag} from '../systems/inventory.js';
import {aimAssist,finishReload,fireGun,meleeHit} from '../systems/combat.js';
import {updateInfection} from '../systems/infection.js';
import {updateNeeds} from '../systems/needs.js';
import {LOW_NEED} from '../config/needs.js';
import {sfx} from '../systems/audio.js';
import {nearDoor} from '../systems/doors.js';
import {DOOR_HP} from '../config/shelter.js';

// ---------- player ----------
export let player;
export function setPlayer(p){player=p;}
export function makePlayer(){
  const p=makeAgent(OFF,OFF,{shirt:'#c4612a',pants:'#24272c',skin:'#d8a882',hair:'#15130f'});
  Object.assign(p,{state:'player',hp:100,maxHp:100,alive:true,swing:0,swingDur:.4,hitDone:true,lastHit:-99,face:Math.PI*1.25,cool:0,reloadT:0,recoil:0,aimT:0,held:null,heldId:'fist',down:0,inv:0,infect:0,infWarn:0,food:100,water:100,needWarn:0,starving:false,room:-1,nearDoor:-1});
  return p;
}
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),mray=new THREE.Raycaster();
function nearestPickable(){let best=null,bd=1.6;for(const d of drops){const k=DEF[d.item.id].kind;if(k!=='weapon'&&k!=='bag')continue;const dist=Math.hypot(d.x-player.pos.x,d.z-player.pos.z);if(dist<bd){bd=dist;best=d;}}return best;}
export function updatePlayer(dt){
  if(!player.alive){updateDead(player,dt);return;}
  if(player.inv>0)player.inv-=dt;
  if(player.down>0){player.down-=dt;player.moving=0;const k=1-player.down/1.8;player.b.body.rotation.x=-Math.sin(Math.min(1,k)*Math.PI)*Math.PI/2;
    if(player.down<=0){player.b.body.rotation.x=0;player.hp=player.maxHp;player.inv=3;for(const z of agents){if(z.state!=='zombie')continue;const dx=z.pos.x-player.pos.x,dz=z.pos.z-player.pos.z,d=Math.hypot(dx,dz);if(d<4&&d>1e-3){z.pos.x+=dx/d*3;z.pos.z+=dz/d*3;collide(z.pos,z.rad);z.feed=1;}}}
    return;}
  let ix=0,iy=0;
  if(keys.KeyW||keys.ArrowUp)iy+=1;if(keys.KeyS||keys.ArrowDown)iy-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;
  if(joy.id!==null){ix+=joy.x;iy-=joy.y;}
  let mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag;mag=1;}
  const run=keys.ShiftLeft||keys.ShiftRight||(joy.id!==null&&Math.hypot(joy.x,joy.y)>.9);
  if(mouse.active){mray.setFromCamera(mouse.ndc,camera);if(mray.ray.intersectPlane(groundPlane,mouse.world))player.face=Math.atan2(mouse.world.x-player.pos.x,mouse.world.z-player.pos.z);}
  if(player.aimT>0)player.aimT-=dt;
  const w=curWeapon(),def=DEF[w.id];
  const heavy=def.heavy&&(ctl.fireHeld||player.aimT>0)?.7:1;
  if(mag>.08){const wx=(ix-iy)/Math.SQRT2,wz=(-ix-iy)/Math.SQRT2;moveAgent(player,wx,wz,(run?5.8:3.4)*Math.max(.45,mag)*heavy,dt,mouse.active||player.aimT>0);
    if(run&&G.phase==='night'){G.runNoise-=dt;if(G.runNoise<=0){G.runNoise=.5;makeNoise(player.pos.x,player.pos.z,5);}}}
  else player.moving=0;
  if(player.cool>0)player.cool-=dt;
  if(player.reloadT>0){player.reloadT-=dt;if(player.reloadT<=0)finishReload();}
  if(ctl.fireQ>0)ctl.fireQ-=dt;
  if((ctl.fireHeld||ctl.fireQ>0)&&player.cool<=0&&player.reloadT<=0){
    if(def.gun){if(def.auto||ctl.fireQ>0){ctl.fireQ=0;aimAssist(def);fireGun(w,def);}}
    else{ctl.fireQ=0;aimAssist(def);sfx.swing();player.swing=player.swingDur=def.cd;player.hitDone=false;player.cool=def.cd;player.aimT=.3;}
  }
  if(player.swing>0){player.swing-=dt;if(!player.hitDone&&player.swing<player.swingDur*.55){player.hitDone=true;meleeHit(def);}}
  player.recoil=Math.max(0,player.recoil-dt*8);
  let full=null;   // an item underfoot that does not fit in the bag
  for(let i=drops.length-1;i>=0;i--){const d=drops[i];const k=DEF[d.item.id].kind;if(k!=='ammo'&&k!=='heal'&&k!=='revive'&&k!=='food')continue;
    const dist=Math.hypot(d.x-player.pos.x,d.z-player.pos.z);if(d.hold){if(dist>1.4)d.hold=false;continue;}   // just dropped: wait until the player walks away
    if(dist<.9&&!pickup(d,true))full=d;}
  const np=nearestPickable();const bp=$('bPick');player.full=!np&&full?full:null;
  if(player.full){const key='full'+drops.indexOf(full);   // bag full: say so on the button, which opens the bag to make room (v0.6.1)
    if(bp.hidden||bp.dataset.for!==key){bp.hidden=false;bp.dataset.for=key;$('pickVerb').textContent='';$('pickName').textContent='กระเป๋าเต็ม · '+DEF[full.item.id].name;bp.style.setProperty('--pg','#ff8f7c');bp.style.borderColor='#ff8f7c';}
    player.near=null;player.nearDoor=-1;}
  else if(np){const key=String(drops.indexOf(np));if(bp.hidden||bp.dataset.for!==key){bp.hidden=false;bp.dataset.for=key;$('pickVerb').textContent='เก็บ ';$('pickName').textContent=DEF[np.item.id].name+gradeTag(np.item.id);bp.style.setProperty('--pg',itemColor(np.item.id));bp.style.borderColor=itemColor(np.item.id);}player.near=np;}
  else{player.near=null;const k=nearDoor();player.nearDoor=k;
    if(k>=0){const st=G.doors[k],label=(st.open?'ปิดประตู':'เปิดประตู')+(st.hp<DOOR_HP?' · '+Math.round(st.hp/DOOR_HP*100)+'%':''),key='door'+k+label;   // E / the pick button also works doors (v0.6)
      if(bp.hidden||bp.dataset.for!==key){bp.hidden=false;bp.dataset.for=key;$('pickVerb').textContent='';$('pickName').textContent=label;bp.style.setProperty('--pg','#e2a64a');bp.style.borderColor='#e2a64a';}}
    else if(!bp.hidden)bp.hidden=true;}
  if(performance.now()/1000-player.lastHit>6&&player.hp<player.maxHp&&!(player.infect>0)&&player.food>=LOW_NEED&&player.water>=LOW_NEED)player.hp=Math.min(player.maxHp,player.hp+1.5*dt);
  updateInfection(dt);updateNeeds(dt);
}
export function syncHeld(){
  const id=curWeapon().id;if(id===player.heldId)return;player.heldId=id;
  if(player.held){player.b.armR.remove(player.held);player.held=null;}
  if(id==='fist')return;
  const def=DEF[id],m=weaponModel(def.model);m.position.y=-.66;if(def.gun)m.rotation.x=Math.PI/2;
  player.b.armR.add(m);player.held=m;
}
