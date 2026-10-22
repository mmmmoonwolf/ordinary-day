import {clamp} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {mouse} from '../core/controls.js';
import {groundY} from '../config/world.js';
import {THROW_RANGE,THROW_NOISE} from '../config/stealth.js';
import {rayWall} from '../world/collision.js';
import {itemModel} from '../world/item-models.js';
import {player} from '../entities/player.js';
import {makeNoise} from '../entities/ai.js';
import {countAmmo,takeAmmo} from './inventory.js';
import {sfx} from './audio.js';
import {feedOnce,updateLoadout} from '../ui/hud.js';

// ---------- thrown bottles (v0.7) ----------
// Q / the 🍾 button throws toward where the player aims (the mouse on desktop, the facing on touch). The bottle
// flies in an arc, breaks where it lands or on the first wall, and the noise there draws zombies to the spot.
const flying=[];
export function throwBottle(){
  if(!player.alive||player.down>0)return false;
  if(countAmmo('bottle')<=0){feedOnce('nobottle','ไม่มีขวดแก้วให้ขว้าง','warn');return false;}
  takeAmmo('bottle',1);
  const fx=Math.sin(player.face),fz=Math.cos(player.face),x0=player.pos.x,z0=player.pos.z;
  let dist=mouse.active?clamp(Math.hypot(mouse.world.x-x0,mouse.world.z-z0),2,THROW_RANGE):THROW_RANGE*.9;
  dist=Math.max(.8,Math.min(dist,rayWall(x0,z0,fx,fz,dist)-.3));   // hits a wall: breaks there
  const m=itemModel('bottle');scene.add(m);
  flying.push({m,x0,z0,x1:x0+fx*dist,z1:z0+fz*dist,t:0,T:.3+dist*.03});
  sfx.swing();updateLoadout(true);player.aimT=.3;
  return true;
}
export function updateThrows(dt){
  for(let i=flying.length-1;i>=0;i--){
    const f=flying[i];f.t+=dt;const k=Math.min(1,f.t/f.T),x=f.x0+(f.x1-f.x0)*k,z=f.z0+(f.z1-f.z0)*k;
    f.m.position.set(x,groundY(x,z)+1.2*(1-k)+3*k*(1-k),z);f.m.rotation.x+=dt*14;
    if(k<1)continue;
    scene.remove(f.m);flying.splice(i,1);sfx.glass(x,z);makeNoise(x,z,THROW_NOISE);
  }
}
export function clearThrows(){for(const f of flying)scene.remove(f.m);flying.length=0;}
