import {camera,view} from '../core/renderer.js';
import {buildings,occluders} from './city.js';
import {viewed} from '../entities/player.js';
import {rooms,shownRoom} from './interiors.js';

// ---------- occlusion ----------
const ray=new THREE.Raycaster(),rayDir=new THREE.Vector3(),chest=new THREE.Vector3();
export function updateOcclusion(){
  if(view.fps){for(const b of buildings)if(b.faded){b.faded=false;for(const m of b.mats){m.transparent=false;m.opacity=1;m.depthWrite=true;m.needsUpdate=true;}}return;}   // v0.28 nothing in the way from the eyes
  const v=viewed();chest.set(v.pos.x,1.2,v.pos.z);rayDir.copy(chest).sub(camera.position);const dist=rayDir.length();rayDir.normalize();
  ray.set(camera.position,rayDir);ray.far=dist-.3;
  const hit=new Set();for(const h of ray.intersectObjects(occluders,false))hit.add(h.object.userData.b);
  const inside=shownRoom()>=0?rooms[shownRoom()].b:null;   // the building the player is in is cut away, not faded
  for(const b of buildings){const want=hit.has(b)&&b!==inside;if(want===b.faded)continue;b.faded=want;for(const m of b.mats){m.transparent=want;m.opacity=want?.22:1;m.depthWrite=!want;m.needsUpdate=true;}}
}
