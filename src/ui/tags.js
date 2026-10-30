import {clamp} from '../core/util.js';
import {scene,activeCam,view} from '../core/renderer.js';
import {G,isPvp} from '../core/state.js';
import {players,player} from '../entities/player.js';

// ---------- names over heads and lights at the feet (v0.40) ----------
// Every player has their name over the head (an HTML label: sharp at any size and in Thai) and a soft light on the
// ground round the feet that grows brighter after dark, in the player's own colour. A teammate off the screen keeps a
// label at its edge with an arrow and how far away they are. Your own name is not shown in first person. Visual only.
export const TAG_COLORS=['#ffd34a','#5ad1ff','#ff7ab0','#8dff6a'];   // players 1 to 4 (PLACEHOLDER)
const HEAD=2.2,FAR=14,EDGE=[34,96,130];   // label height over the feet (m), distance shown beyond (m), margins at the screen edges: sides, top (clock), bottom (buttons) in px
const LIGHT={size:3.2,day:.22,night:.85};   // the light at the feet: across (m) and how strong by day and at night (PLACEHOLDER)
let box=null,tex=null;const tags=new Map(),v=new THREE.Vector3();
function glowTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.35,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
function make(p){
  if(!box){box=document.createElement('div');box.id='tags';const g=document.getElementById('game');if(g)g.after(box);else document.body.appendChild(box);tex=glowTex();}   // under the HUD
  const el=document.createElement('div');el.className='tag';el.innerHTML='<b></b><i></i>';box.appendChild(el);
  const col=TAG_COLORS[p.id%TAG_COLORS.length];el.style.setProperty('--c',col);
  const light=new THREE.Mesh(new THREE.PlaneGeometry(LIGHT.size,LIGHT.size).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:tex,color:col,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  light.renderOrder=2;scene.add(light);
  const t={el,name:el.firstChild,info:el.lastChild,light,text:'',sub:''};tags.set(p,t);return t;
}
function drop(p,t){t.el.remove();scene.remove(t.light);t.light.geometry.dispose();t.light.material.dispose();tags.delete(p);}
export function updateTags(){
  if(!document.body)return;
  for(const [p,t] of tags)if(!players.includes(p))drop(p,t);
  const cam=activeCam(),W=innerWidth,H=innerHeight,run=G.running&&!G.over,k=G.night||0;
  for(const p of players){
    const t=tags.get(p)||make(p),on=run&&!p.away;
    // the light at the feet
    t.light.visible=on&&p.alive;if(t.light.visible){t.light.position.set(p.pos.x,(p.y||0)+.04,p.pos.z);t.light.material.opacity=LIGHT.day+(LIGHT.night-LIGHT.day)*k;}
    // the label
    const mine=p===player,hide=!on||(mine&&view.fps)||(!p.alive&&!mine);
    if(hide){if(!t.el.hidden)t.el.hidden=true;continue;}
    v.set(p.pos.x,(p.y||0)+HEAD+(p.airH||0),p.pos.z).project(cam);
    const behind=v.z>1,d=Math.hypot(p.pos.x-player.pos.x,p.pos.z-player.pos.z);
    let x=v.x,y=v.y,edge=false;if(behind){x=-x;y=-y;}
    if(behind||Math.abs(x)>1||Math.abs(y)>1){
      if(mine||isPvp()){if(!t.el.hidden)t.el.hidden=true;continue;}   // v0.47 no pointing the way to someone hunting you
      const m=Math.max(Math.abs(x),Math.abs(y),1e-3);x/=m;y/=m;edge=true;   // onto the edge of the screen, the way they are
    }
    const sx=clamp((x+1)/2*W,EDGE[0],W-EDGE[0]),sy=clamp((1-y)/2*H,EDGE[1],H-EDGE[2]);
    const sub=(p.bleed>0?'ล้ม! ':'')+(!mine&&!isPvp()&&(edge||d>FAR)?Math.round(d)+' ม.':'');
    if(t.text!==p.name){t.text=p.name;t.name.textContent=p.name;}
    if(t.sub!==sub){t.sub=sub;t.info.textContent=sub;}
    t.el.classList.toggle('edge',edge);t.el.classList.toggle('down',p.bleed>0);
    t.el.style.transform='translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px) translate(-50%,-100%)';
    if(edge)t.el.style.setProperty('--a',Math.atan2(-y,x)+'rad');
    if(t.el.hidden)t.el.hidden=false;
  }
}
