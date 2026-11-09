import {$,clamp} from '../core/util.js';
import {scene,activeCam} from '../core/renderer.js';
import {G,isPvp,sideOf} from '../core/state.js';
import {GLOW} from '../world/textures.js';
import {player,players} from '../entities/player.js';

// ---------- markers on screen (v0.53) ----------
// Each marker of this player's side: a beam of light where it is, and an icon over it (held at the edge of the screen
// when it is off it). Looks only.
const KIND={danger:['⚠','#ff5a3c'],item:['◆','#ffd34a'],go:['➜','#5ad1ff']},pool=[],v=new THREE.Vector3();
function slot(i){
  if(!pool[i]){const beam=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));beam.scale.set(1.2,9,1);scene.add(beam);
    const el=document.createElement('div');el.className='ping';const box=$('pings');if(box)box.appendChild(el);pool[i]={beam,el,k:''};}
  return pool[i];
}
export function updatePings(){
  let n=0;
  if(player&&G.running)for(const q of G.pings||[]){
    const by=players.find(p=>p.id===q.by);if(isPvp()&&by&&sideOf(by)!==sideOf(player))continue;
    const s=slot(n++),[ic,col]=KIND[q.k]||KIND.go,fade=Math.min(1,q.life/1.5);
    if(s.k!==q.k){s.k=q.k;s.el.textContent=ic;s.el.style.setProperty('--c',col);s.beam.material.color.set(col);}
    s.beam.visible=true;s.beam.position.set(q.x,4.5,q.z);s.beam.material.opacity=.7*fade;
    v.set(q.x,2.2,q.z).project(activeCam());let x=v.x,y=v.y;if(v.z>1){x=-x;y=-y;}
    const m=Math.max(Math.abs(x),Math.abs(y));if(m>.92){x*=.92/m;y*=.92/m;}
    const W=innerWidth,H=innerHeight;s.el.style.transform='translate('+clamp((x+1)/2*W,20,W-20).toFixed(0)+'px,'+clamp((1-y)/2*H,20,H-20).toFixed(0)+'px) translate(-50%,-50%)';
    s.el.style.opacity=fade.toFixed(2);s.el.hidden=false;
  }
  for(let i=n;i<pool.length;i++){pool[i].beam.visible=false;pool[i].el.hidden=true;}
}
