import {$} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {G} from '../core/state.js';
import {LISTEN} from '../config/stealth.js';
import {GLOW} from '../world/textures.js';
import {agents} from '../entities/agents.js';
import {player} from '../entities/player.js';

// ---------- listening (v0.50) ----------
// Standing still for a moment (no stick, no keys, not shooting, not driving) the edges of the screen darken and every
// zombie moving or attacking within LISTEN.range shows as a red glow, through walls too: what the player hears. Moving
// again ends it. Only on this device's screen; nothing in the game changes. The flashlight button's look is kept here too.
const pool=[];let still=0,k=0;
function mark(i){
  if(!pool[i]){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:'#ff4a32',transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending}));
    m.renderOrder=9;m.scale.set(1.6,2.2,1);scene.add(m);pool[i]=m;}
  return pool[i];
}
export function updateListen(dt){
  const p=player,I=p&&p.input;
  const quiet=!!(p&&p.alive&&G.running&&!G.over&&I&&I.mag<.05&&!I.fire&&!(I.fireQ>0)&&!(p.car>=0));
  still=quiet?still+dt:0;
  k+=((still>=LISTEN.after?1:0)-k)*Math.min(1,dt*5);
  const el=$('listen');if(el){const o=(k*.85).toFixed(2);if(el.style.opacity!==o)el.style.opacity=o;}
  let n=0;
  if(k>.05)for(const a of agents){
    if(a.state!=='zombie'||a.gone||!((a.moving||0)>.05||a.swingT>0))continue;
    const d=Math.hypot(a.pos.x-p.pos.x,a.pos.z-p.pos.z);if(d>LISTEN.range)continue;
    const m=mark(n++);m.visible=true;m.position.set(a.pos.x,1,a.pos.z);m.material.opacity=k*(1-d/LISTEN.range*.6);
  }
  for(let i=n;i<pool.length;i++)pool[i].visible=false;
  const b=$('bLight');if(b&&p)b.classList.toggle('off',p.light===false);
  // v0.54 panic (and a wound's pulse) round the edges, a sickly tint when ill
  const pe=$('panic');if(pe&&p){const t=performance.now()/1000,o=Math.min(.9,(p.panic||0)*.7+(p.bleedW>0?.18+.12*Math.sin(t*5):0)+(p.sick>0?.15:0));const s=o.toFixed(2);if(pe.style.opacity!==s)pe.style.opacity=s;pe.classList.toggle('sick',p.sick>0);}
}
