import {scene} from '../core/renderer.js';
import {G} from '../core/state.js';
import {S,part} from '../world/materials.js';

// ---------- traps on the ground (v0.55) ----------
// G.ptraps drawn on every device, every frame (looks only): a tripwire as two cans on a wire, a bear trap as open jaws.
const can=S({color:'#a9a28c',metalness:.5,roughness:.5}),wire=S({color:'#c9b27a'}),iron=S({color:'#4a4640',metalness:.6,roughness:.5});
const pool={tripwire:[],beartrap:[]};
function make(k){const g=new THREE.Group();
  if(k==='tripwire'){g.add(part(can,.12,.16,.12,-.5,.08,0),part(can,.12,.16,.12,.5,.08,0),part(wire,1,.015,.015,0,.12,0));}
  else{g.add(part(iron,.6,.04,.6,0,.03,0));for(const s of [-1,1])g.add(part(iron,.6,.12,.04,0,.08,s*.28));}
  scene.add(g);return g;}
export function updateTraps(){
  const n={tripwire:0,beartrap:0};
  for(const t of G.ptraps||[]){const L=pool[t.k];if(!L)continue;const g=L[n[t.k]]||(L[n[t.k]]=make(t.k));n[t.k]++;g.visible=!!G.running;g.position.set(t.x,0,t.z);}
  for(const k in pool)for(let i=n[k];i<pool[k].length;i++)pool[k][i].visible=false;
}
