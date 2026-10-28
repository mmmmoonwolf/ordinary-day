import {G} from '../core/state.js';
import {solids} from '../world/collision.js';
import {breakables} from '../world/props.js';
import {boom} from './effects.js';
import {sfx} from './audio.js';
import {makeNoise} from '../entities/ai.js';
import {markMapDirty} from '../ui/minimap.js';

// ---------- obstacles the Tyrant can smash ----------
// Cars, trash piles and benches (props.js `breakables`) get flattened when a Tyrant is stuck on them:
// their box leaves `solids` so everyone can walk through. G.broken keeps their indices for the save.
function flatten(b,on){
  for(const m of b.meshes){
    if(m.userData.y0===undefined){m.userData.y0=m.position.y;m.userData.sy0=m.scale.y;}
    m.position.y=on?m.userData.y0*.3:m.userData.y0;m.scale.y=on?m.userData.sy0*.3:m.userData.sy0;
  }
}
function smash(b,fx){
  b.broken=true;const i=solids.indexOf(b.box);if(i>=0)solids.splice(i,1);flatten(b,true);markMapDirty();
  if(!fx)return;
  G.broken.push(breakables.indexOf(b));
  boom(b.x,.6,b.z,.4,6);
  sfx.crack();sfx.explode(b.x,b.z);makeNoise(b.x,b.z,30);
}
// breaks the nearest breakable within r of (x,z); returns true if it broke one
export function smashNear(x,z,r){
  let best=null,bd=r;
  for(const b of breakables){
    if(b.broken)continue;const q=b.box,dx=Math.max(q.x0-x,0,x-q.x1),dz=Math.max(q.z0-z,0,z-q.z1),d=Math.hypot(dx,dz);
    if(d<bd){bd=d;best=b;}
  }
  if(best)smash(best,true);
  return !!best;
}
// new game: put everything back
export function restoreObstacles(){
  for(const b of breakables){if(!b.broken)continue;b.broken=false;solids.push(b.box);flatten(b,false);}
  markMapDirty();
}
// loading a save: break what was broken, without effects
export function applyBroken(list){for(const i of list||[]){const b=breakables[i];if(b&&!b.broken)smash(b,false);}}
