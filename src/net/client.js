import {$} from '../core/util.js';
import {bus} from '../core/bus.js';
import {G} from '../core/state.js';
import {VERSION} from '../config/version.js';
import {roomAt,showRoom} from '../world/interiors.js';
import {agents} from '../entities/agents.js';
import {lerpAng,moveAgent} from '../entities/movement.js';
import {SNEAK,ADS} from '../config/handling.js';
import {WOUND} from '../config/health.js';
import {PVP} from '../config/pvp.js';
import {jobOf} from '../config/jobs.js';
import {limping} from '../systems/body.js';
import {updateDead} from '../entities/ai.js';
import {player,players,viewed} from '../entities/player.js';
import {clearWorld} from '../systems/game.js';
import {receive,gameOver,updateLoadout} from '../ui/hud.js';
import {renderBag} from '../ui/bag.js';
import {joinRoom,cleanCode} from './link.js';
import {profile} from '../core/profile.js';
import {applyWorld,clearClientMaps} from './snapshot.js';

// ---------- playing in a friend's room (v0.12) ----------
// This device keeps no game logic: it draws the world the host sends, and sends back what its player does
// (p.input about 20 times a second, actions as they happen). A token kept in this browser lets the host give the
// same character back after a dropped connection or a refresh.
export const net={link:null,id:-1,code:'',onLeave:null};
const TOKEN_KEY='ordinary-day.token';
function token(){
  try{let t=localStorage.getItem(TOKEN_KEY);if(!t){t=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(TOKEN_KEY,t);}return t;}
  catch(_){return 'x'+Math.random().toString(36).slice(2);}
}
// resolves once the host has let this device in (the game is then running), or throws with a message to show
export async function join(raw){
  const code=cleanCode(raw);if(code.length!==5)throw new Error('รหัสห้องมี 5 ตัวอักษร');
  const link=await joinRoom(code);
  return new Promise((ok,no)=>{
    let inside=false;
    const timer=setTimeout(()=>{if(!inside){link.close();no(new Error('เจ้าของห้องไม่ตอบ ลองใหม่อีกครั้ง'));}},10000);
    link.onData(m=>{
      if(!m||typeof m!=='object')return;
      if(m.t==='no'){clearTimeout(timer);link.close();no(new Error(m.why||'เข้าห้องไม่ได้'));return;}
      if(m.t==='w'){net.id=m.id;if(!inside){inside=true;clearTimeout(timer);enter(link,code);ok(code);}return;}   // again later: the host began a new game
      if(!inside)return;
      if(m.t==='s')onSnap(m);
      else if(m.t==='m'){for(const x of m.l||[])receive(x);}
      else if(m.t==='bye')leave('เจ้าของห้องปิดห้องแล้ว');
    });
    link.onClose(()=>{clearTimeout(timer);if(!inside)no(new Error('การเชื่อมต่อหลุด ลองใหม่อีกครั้ง'));else leave('หลุดจากห้อง '+code+' · กรอกรหัสเดิมเพื่อกลับเข้าไป');});
    link.send({t:'hi',v:VERSION,token:token(),name:profile.name,look:profile.look,job:profile.job});   // v0.41
  });
}
function enter(link,code){
  clearWorld();clearClientMaps();
  Object.assign(net,{link,code});bus.role='client';bus.on=false;bus.cmd=(n,a)=>link.send({t:'c',n,a});
  Object.assign(G,{running:true,paused:false,over:false});
}
function onSnap(s){
  applyWorld(s,net.id);
  if(!player)return;
  if(s.me&&s.me.gear){updateLoadout(true);if(!$('bag').hidden)renderBag();}
  if(s.g.ov&&!G.over){G.endCause=player.endCause||s.g.ec;gameOver();}
  else if(!s.g.ov&&G.over){Object.assign(G,{over:false,running:true});$('overlay').hidden=true;}   // the host began a new day
}
// back to playing alone (the start screen shows `why`)
export function leave(why){
  if(!net.link)return;
  const l=net.link;net.link=null;l.close();
  bus.role='off';bus.cmd=null;G.running=false;G.over=false;
  clearWorld();clearClientMaps();
  if(net.onLeave)net.onLeave(why||'');
}
// every simulation step on a client: send this player's input, and ease everything toward where the host has it
let sendT=0,lastSent='';
export function clientStep(dt){
  if(!player)return;
  const I=player.input,k=JSON.stringify(I);sendT+=dt;
  // v0.47.1 a Space press (jumpQ) goes once, like a click (fireQ): left in the input it was sent again every half second
  // and the host made the player hop over and over
  if(net.link&&(I.fireQ>0||I.jumpQ>0||(sendT>=.05&&k!==lastSent)||sendT>=.5)){net.link.send({t:'i',i:I});lastSent=k;sendT=0;I.fireQ=0;I.jumpQ=0;}
  const f=1-Math.exp(-dt*14);
  for(const a of agents)ease(a,dt,f);
  for(const p of players){
    const pred=p===player&&predict(p,dt);   // v0.65
    ease(p,dt,f,pred);if(p===player&&p.alive&&I.face!==null&&p.car<0)p.face=I.face;   // v0.47.1 this device's player faces where it aims now, not a snapshot later
    p.room=p.alive?roomAt(p.pos.x,p.pos.z):-1;   // v0.65 this had been swallowed by the comment above since v0.47.1
    p.swing=Math.max(0,p.swing-dt);p.recoil=Math.max(0,p.recoil-dt*8);p.reloadT=Math.max(0,p.reloadT-dt);if(p.inv>0)p.inv-=dt;
  }
  const v=viewed();if(v)showRoom(roomAt(v.pos.x,v.pos.z,.45));
}
// v0.47.1 between snapshots (15 a second) the target goes on at the speed between the last two (at most EXTRA s past
// the last one), so things glide instead of moving in steps
const EXTRA=.12;
function ease(a,dt,f,pred){
  if(a.nx!==undefined&&!pred){if(a.vx&&a.ahead<EXTRA){a.ahead+=dt;a.nx+=a.vx*dt;a.nz+=a.vz*dt;}a.pos.x+=(a.nx-a.pos.x)*f;a.pos.z+=(a.nz-a.pos.z)*f;}
  if(a.nface!==undefined)a.face=lerpAng(a.face,a.nface,Math.min(1,f*1.5));
  if(a.state==='dead')updateDead(a,dt);
  if(a.hitT>0){a.hitT-=dt;a.b.mats[0].emissive.setRGB(Math.max(0,a.hitT)*4,0,0);}
  if(a.kind==='boomer'){const k=a.fuse>0?1.2-a.fuse:0;a.b.body.scale.setScalar(1+k*.22);}
}

// ---------- client prediction (v0.65) ----------
// This device's own player moves the moment its stick or keys say so (the same moveAgent and speeds as the host's
// updatePlayer), instead of a trip to the host and back later. The host stays the judge: its position, carried on by
// how fast it saw the player going over about one trip (PRED.lat), pulls the player back softly while they move, harder
// once they stop, and at once when they disagree by more than PRED.snap (a wall the host saw, a vault, a knock-back).
// Not while driving, vaulting, downed, helping or searching: then the host's position is eased to as before.
export const PRED={lat:.1,gain:2.2,still:7,snap:2.5,dead:.08};   // PLACEHOLDERS
function predict(p,dt){
  const I=p.input;
  if(!p.alive||p.car>=0||p.vault||p.bleed>0||p.searching>=0||p.helping||p.trapT>0||p.nx===undefined)return false;
  const moving=I.mag>.08;
  if(moving){const sp=(I.slow?SNEAK.speed:(I.run?5.8:3.4)*Math.max(.45,I.mag))*(I.ads?ADS.speed:1)*(jobOf(p).speed||1)*(limping(p)?WOUND.limp:1)*(p.zed?PVP.infect.speed:1);
    moveAgent(p,I.mx,I.mz,sp,dt,true);}
  else p.moving=0;
  const tx=p.nx+(p.vx||0)*PRED.lat,tz=p.nz+(p.vz||0)*PRED.lat,ex=tx-p.pos.x,ez=tz-p.pos.z,e=Math.hypot(ex,ez);
  if(e>PRED.snap){p.pos.x=tx;p.pos.z=tz;}
  else if(e>PRED.dead){const k=1-Math.exp(-dt*(moving?PRED.gain:PRED.still));p.pos.x+=ex*k;p.pos.z+=ez*k;}
  return true;
}
