import {$} from '../core/util.js';
import {camera,fpsCam,view,activeCam} from '../core/renderer.js';
import {bus} from '../core/bus.js';
import {DEF} from '../config/items.js';
import {hooks} from '../systems/effects.js';
import {curWeapon} from '../systems/inventory.js';
import {player,isSolo} from '../entities/player.js';
import {settings} from './settings.js';

// ---------- feel (v0.31) ----------
// What makes a hit land, on this device only: the camera shakes (own shots by gun, blows landed, being hurt,
// explosions nearby), a hit marker shows where a zombie was hit by this player (red and bigger for a kill, pale for
// armour), and playing alone a landed blow freezes the world for a few hundredths of a second (hit stop, main.js).
// Nothing here changes the game; the shake can be turned off in the settings and is gentler with reduced motion.
const GUN_SHAKE={pistol:.05,smg:.035,rifle:.06,lmg:.06,shotgun:.2,dbshotgun:.24,sniper:.26};
const reduce=globalThis.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?.4:1;
export const feel={trauma:0,stop:0};
export function shake(a){if(settings.shake)feel.trauma=Math.min(1,feel.trauma+a*reduce);}
let markT=0,markX=0,markZ=0,markKill=false,lastRecoil=0;
// set once from main.js (module top level must not touch systems/ yet: the modules import each other)
export function initFeel(){
  hooks.impact=(x,z,k,by,melee)=>{
    if(!player||by!==player.id)return;
    markT=k===1?.4:.22;markX=x;markZ=z;markKill=k===1;
    const el=$('hitmark');el.classList.toggle('kill',markKill);el.classList.toggle('armor',k===2);
    shake(melee?(k===1?.32:.2):k===1?.12:.04);
    if(melee&&isSolo()&&bus.role!=='client')feel.stop=Math.max(feel.stop,k===1?.11:.06);   // alone only: online the host runs everyone's game
  };
  hooks.boom=(x,z)=>{if(!player)return;const d=Math.hypot(x-player.pos.x,z-player.pos.z);if(d<28)shake(.75*(1-d/28));};
}
const v3=new THREE.Vector3();
// once a frame, after the cameras are placed
export function updateFeel(dt){
  const r=player.recoil||0;if(r>lastRecoil+.3){const d=DEF[curWeapon(player).id];if(d&&d.gun)shake(GUN_SHAKE[d.model]||.05);}lastRecoil=r;
  feel.trauma=Math.max(0,feel.trauma-dt*1.8);
  const s=feel.trauma*feel.trauma;
  if(s>0){const t=performance.now()/1000,n=a=>Math.sin(t*a)*.6+Math.sin(t*a*2.3+1.7)*.4;
    if(view.fps){fpsCam.rotation.x+=n(37)*s*.05;fpsCam.rotation.y+=n(43)*s*.05;}
    else{camera.position.x+=n(41)*s*.9;camera.position.y+=n(47)*s*.6;camera.position.z+=n(53)*s*.9;}}
  const el=$('hitmark');
  if(markT>0){markT-=dt;let x=innerWidth/2,y=innerHeight/2;
    if(!view.fps){v3.set(markX,1.2,markZ).project(activeCam());x=(v3.x+1)/2*innerWidth;y=(1-v3.y)/2*innerHeight;}
    el.style.transform='translate('+x.toFixed(0)+'px,'+y.toFixed(0)+'px) scale('+(markKill?1.4:1)+')';el.style.opacity=Math.max(0,Math.min(1,markT*6)).toFixed(2);if(el.hidden)el.hidden=false;}
  else if(!el.hidden)el.hidden=true;
}
