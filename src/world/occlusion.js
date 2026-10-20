import {camera} from '../core/renderer.js';
import {buildings,occluders} from './city.js';
import {player} from '../entities/player.js';

// ---------- occlusion ----------
const ray=new THREE.Raycaster(),rayDir=new THREE.Vector3(),chest=new THREE.Vector3();
export function updateOcclusion(){
  chest.set(player.pos.x,1.2,player.pos.z);rayDir.copy(chest).sub(camera.position);const dist=rayDir.length();rayDir.normalize();
  ray.set(camera.position,rayDir);ray.far=dist-.3;
  const hit=new Set();for(const h of ray.intersectObjects(occluders,false))hit.add(h.object.userData.b);
  for(const b of buildings){const want=hit.has(b);if(want===b.faded)continue;b.faded=want;for(const m of b.mats){m.transparent=want;m.opacity=want?.22:1;m.depthWrite=!want;m.needsUpdate=true;}}
}
