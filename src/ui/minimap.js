import {$} from '../core/util.js';
import {G} from '../core/state.js';
import {DAY_START} from '../config/time.js';
import {RC} from '../config/world.js';
import {GOAL_NIGHTS,LZ,RESCUE_UNTIL,nightsSurvived} from '../config/goal.js';
import {solids} from '../world/collision.js';
import {LAYOUT,pois,lootSpots} from '../world/city.js';
import {rooms} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {player,players} from '../entities/player.js';

// ---------- minimap ----------
// The whole city, turned to match the isometric camera (screen up = world -x,-z), so the map reads like the view.
// Streets, blocks and buildings are drawn once into `base`; landmarks, nearby zombies and the player are redrawn every 0.1 s.
const HALF=58,HEAR=18;   // world half-size shown (the far road corners fall just outside); zombies are only shown within HEAR metres, like hearing them
let cv=null,g=null,base=null,px=0,dpr=1,acc=0;
const C={road:'#3a3d40',block:'#5b5e5f',park:'#4d5b39',building:'#9a978e',room:'#4a4640'};
function xy(x,z){const k=px/2/(HALF*Math.SQRT2);return [px/2+(x-z)/Math.SQRT2*k,px/2+(x+z)/Math.SQRT2*k];}
function quad(c,x0,z0,x1,z1){const a=xy(x0,z0),b=xy(x1,z0),d=xy(x1,z1),e=xy(x0,z1);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(d[0],d[1]);c.lineTo(e[0],e[1]);c.closePath();c.fill();}
function buildBase(){
  base=document.createElement('canvas');base.width=base.height=px;const c=base.getContext('2d');
  c.fillStyle=C.road;quad(c,-HALF,-HALF,HALF,HALF);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    const cx=(RC[i]+RC[i+1])/2,cz=(RC[j]+RC[j+1])/2;
    c.fillStyle=LAYOUT[i+','+j]==='park'?C.park:C.block;quad(c,cx-12,cz-12,cx+12,cz+12);
  }
  c.fillStyle=C.building;
  for(const b of solids)if((b.x1-b.x0)*(b.z1-b.z0)>=6)quad(c,b.x0,b.z0,b.x1,b.z1);   // buildings, stalls, containers, cars; not trees or lamps
  // enterable buildings: hollow, with the door in amber (open), brown (closed) or red (broken)
  rooms.forEach((r,k)=>{const b=r.b,st=G.doors[k]||{open:true};c.fillStyle=C.building;quad(c,b.cx-b.w/2,b.cz-b.d/2,b.cx+b.w/2,b.cz+b.d/2);
    c.fillStyle=C.room;quad(c,r.x0,r.z0,r.x1,r.z1);const D=r.doorBox,[nx,nz]=r.n;
    c.fillStyle=st.broken?'#c9473a':st.open?'#e2a64a':'#7a5532';quad(c,D.x0-Math.abs(nz)*.2+nx*.6,D.z0-Math.abs(nx)*.2+nz*.6,D.x1+Math.abs(nz)*.2+nx*.6,D.z1+Math.abs(nx)*.2+nz*.6);});
}
function dot(x,z,r,fill,stroke){const [u,v]=xy(x,z);g.beginPath();g.arc(u,v,r,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.lineWidth=dpr;g.strokeStyle=stroke;g.stroke();}}
function draw(now){
  g.clearRect(0,0,px,px);g.drawImage(base,0,0);
  const s=dpr*Math.max(1,px/dpr/110);   // marker scale: bigger on the desktop map
  for(const p of pois){
    if(p.type==='police')dot(p.x,p.z,2.2*s,'#66B0FF');
    else if(p.type==='army')dot(p.x,p.z,2.6*s,'#F0C46B');
    else if(p.type==='place'){const [u,v]=xy(p.x,p.z),r=2.3*s;g.fillStyle=p.place.color;g.fillRect(u-r,v-r,r*2,r*2);g.lineWidth=dpr;g.strokeStyle='#16130d';g.strokeRect(u-r,v-r,r*2,r*2);}   // shops and the hospital (v0.17)
    else{const kit=lootSpots.some(sp=>sp.zone==='ambulance'&&sp.drop);const [u,v]=xy(p.x,p.z),r=2.6*s;
      g.fillStyle=kit?'#f2f0ea':'rgba(242,240,234,.35)';g.fillRect(u-r,v-r,r*2,r*2);g.fillStyle='#c9473a';g.fillRect(u-r*.2,v-r*.75,r*.4,r*1.5);g.fillRect(u-r*.75,v-r*.2,r*1.5,r*.4);}
  }
  const tod=G.min%1440;
  if(nightsSurvived(G.min)>=GOAL_NIGHTS&&tod>=DAY_START&&tod<RESCUE_UNTIL){const [u,v]=xy(LZ.x,LZ.z);g.beginPath();g.arc(u,v,(4+Math.sin(now/250))*s,0,Math.PI*2);g.lineWidth=1.6*s;g.strokeStyle='#e2a64a';g.stroke();}
  if(G.drop){const [u,v]=xy(G.drop.x,G.drop.z),r=(2.4+.6*Math.sin(now/180))*s;g.fillStyle='#7fd16a';g.fillRect(u-r,v-r,r*2,r*2);g.lineWidth=dpr;g.strokeStyle='#16130d';g.strokeRect(u-r,v-r,r*2,r*2);}   // airdrop crate (v0.8)
  for(const a of agents){
    if(a.state!=='zombie'||a.retreat)continue;
    if(a.march){dot(a.pos.x,a.pos.z,1.5*s,'#ff6a4a');continue;}   // a horde shows at any distance
    if(a.kind==='tyrant')dot(a.pos.x,a.pos.z,(3+.8*Math.sin(now/160))*s,'#ff4a3a','#16130d');
    else if(Math.hypot(a.pos.x-player.pos.x,a.pos.z-player.pos.z)<HEAR)dot(a.pos.x,a.pos.z,1.3*s,'#c9473a');
  }
  for(const p of players)if(p!==player)dot(p.pos.x,p.pos.z,2.2*s,!p.alive?'#8a8a86':p.bleed>0?'#ff6b5a':'#7fc8ff','#16130d');   // other players (v0.9), red while down (v0.10)
  // player: an arrow pointing where the player faces, in map space
  const [u,v]=xy(player.pos.x,player.pos.z),fx=Math.sin(player.face),fz=Math.cos(player.face),ang=Math.atan2((fx-fz)/Math.SQRT2,-(fx+fz)/Math.SQRT2);
  g.save();g.translate(u,v);g.rotate(ang);g.beginPath();g.moveTo(0,-4.2*s);g.lineTo(3*s,3.2*s);g.lineTo(0,1.6*s);g.lineTo(-3*s,3.2*s);g.closePath();
  g.fillStyle=player.alive?'#e2a64a':'#8a8a86';g.fill();g.lineWidth=dpr;g.strokeStyle='#16130d';g.stroke();g.restore();
}
export function markMapDirty(){base=null;}   // a building block changed (an obstacle was smashed or restored, a door opened or closed)
export function updateMinimap(dt,now){
  if(!cv){cv=$('minimap');if(!cv||!cv.getContext)return;g=cv.getContext('2d');}
  acc+=dt;if(acc<.1&&base)return;acc=0;
  const css=Math.round(cv.getBoundingClientRect().width||0);if(css<20||!player)return;
  dpr=Math.min(2,devicePixelRatio||1);
  if(Math.round(css*dpr)!==px){px=Math.round(css*dpr);cv.width=cv.height=px;base=null;}
  if(!base)buildBase();   // size changes with the screen
  draw(now);
}
