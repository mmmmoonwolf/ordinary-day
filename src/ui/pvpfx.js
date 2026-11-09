import {scene} from '../core/renderer.js';
import {G,isPvp} from '../core/state.js';
import {PVP} from '../config/pvp.js';
import {GLOW} from '../world/textures.js';
import {players} from '../entities/player.js';
import {zombify,undress} from '../entities/skins.js';

// ---------- PvP in the world (v0.51) ----------
// Every device, every frame, looks only: the king-of-the-hill ring and its green beacon, and zombie players in the
// infection rules (green skin on the 3D model, or on the plain one).
let ring=null,disc=null,beacon=null;
function build(){
  ring=new THREE.Mesh(new THREE.RingGeometry(PVP.hill.r-.6,PVP.hill.r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#9dffb4',transparent:true,depthWrite:false}));
  disc=new THREE.Mesh(new THREE.CircleGeometry(PVP.hill.r-.6,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#b8ffc8',transparent:true,opacity:.14,depthWrite:false}));   // bright enough to read with the old-film look on
  beacon=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:'#6fe08a',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));beacon.scale.set(3,14,1);
  scene.add(ring,disc,beacon);
}
export function updatePvpFx(now){
  if(!ring)build();
  const h=isPvp()&&G.hill&&G.running;ring.visible=disc.visible=beacon.visible=!!h;
  if(h){ring.position.set(G.hill.x,.22,G.hill.z);ring.material.opacity=.75+.25*Math.sin(now/220);disc.position.set(G.hill.x,.21,G.hill.z);beacon.position.set(G.hill.x,7,G.hill.z);beacon.material.opacity=.35+.15*Math.sin(now/300);}
  for(const p of players){
    const z=isPvp()&&!!p.zed;
    if(z){if(p.sk&&!p.sk.zombie)zombify(p);if(!p.zedLook){p.b.mats[2].color.set('#8fa37a');p.zedLook=true;}}
    else if(p.zedLook){p.zedLook=false;p.b.mats[2].color.copy(p.b.base.skin);if(p.sk&&p.sk.zombie)undress(p);}   // dressed again as themselves next frame
  }
}
