import {bus} from '../core/bus.js';
import {G} from '../core/state.js';
import {VERSION} from '../config/version.js';
import {players,freshInput} from '../entities/player.js';
import {addPlayer} from '../systems/game.js';
import {runAction} from '../systems/actions.js';
import {say,feed} from '../ui/hud.js';
import {hostRoom,newCode} from './link.js';
import {cleanName,cleanLook} from '../core/profile.js';
import {encodeWorld,freshSent} from './snapshot.js';

// ---------- hosting a room (v0.12) ----------
// The game keeps running on this device as before. Friends who join get a player of their own: their device sends
// its input (p.input) and actions (systems/actions.js) here, and gets the world (net/snapshot.js) and what the bus
// queued for them back. A friend whose connection drops stays in the world, frozen (p.away), until they come back
// with the same code; their character is kept in the save too.
export const MAX_PLAYERS=4;
const SNAP_EVERY=1/15;   // seconds between world snapshots
export const room={open:false,code:null,conns:[],closer:null};
let snapT=0;
export async function openRoom(){
  if(room.open)return room.code;
  for(let tries=0;tries<4;tries++){
    const code=newCode();
    try{room.closer=await hostRoom(code,onLink);}catch(e){if(e.message==='taken')continue;throw e;}
    Object.assign(room,{open:true,code});bus.on=true;bus.role='host';bus.out.length=0;
    return code;
  }
  throw new Error('เปิดห้องไม่ได้ ลองใหม่อีกครั้ง');
}
export function closeRoom(){
  if(!room.open)return;
  for(const c of room.conns.splice(0)){c.link.send({t:'bye'});c.link.close();if(c.p)c.p.away=true;}
  if(room.closer)room.closer.close();
  Object.assign(room,{open:false,code:null,closer:null});bus.on=false;bus.role='off';bus.out.length=0;
}
export const roomCount=()=>players.filter(p=>p.local||!p.away).length;
function onLink(link){
  const c={link,p:null,token:'',sent:freshSent()};
  link.onData(m=>{try{onMsg(c,m);}catch(e){console.error(e);}});
  link.onClose(()=>gone(c));
}
// the same friend coming back gets their character; a new one a new place, or one left by someone who is not back
function bind(c){
  let p=players.find(q=>!q.local&&q.token===c.token&&!room.conns.some(o=>o!==c&&o.p===q));
  if(!p&&players.length<MAX_PLAYERS)p=addPlayer();
  if(!p)p=players.find(q=>!q.local&&q.away&&!room.conns.some(o=>o!==c&&o.p===q));
  if(p){c.p=p;p.token=c.token;p.away=false;p.input=freshInput();c.sent=freshSent();}
  return p;
}
function onMsg(c,m){
  if(!m||typeof m!=='object')return;
  if(m.t==='hi'){
    if(c.p)return;
    if(m.v!==VERSION){c.link.send({t:'no',why:'เวอร์ชันเกมไม่ตรงกับเจ้าของห้อง ('+VERSION+') รีเฟรชหน้าเว็บแล้วลองใหม่'});return;}
    if(!G.running||G.over){c.link.send({t:'no',why:'เจ้าของห้องยังไม่ได้อยู่ในเกม'});return;}
    c.token=String(m.token||'').slice(0,40);
    for(const o of room.conns.slice())if(o.token===c.token){o.link.close();gone(o);}   // the same device again: drop its old link
    if(!bind(c)){c.link.send({t:'no',why:'ห้องเต็มแล้ว (สูงสุด '+MAX_PLAYERS+' คน)'});return;}
    c.p.name=cleanName(m.name)||'ผู้เล่น '+(c.p.id+1);c.p.wear=cleanLook(m.look);   // v0.41 their name and clothes
    room.conns.push(c);
    if(G.paused)G.paused=false;   // with a friend in, the bag or menu no longer stops the world (Q13)
    c.link.send({t:'w',id:c.p.id,code:room.code});c.link.send(encodeWorld(c.sent,c.p));
    say(c.p.name+' เข้าห้องแล้ว','',4);
    return;
  }
  if(!c.p||!room.conns.includes(c))return;
  if(m.t==='i')setInput(c.p,m.i);
  else if(m.t==='c')runAction(c.p,String(m.n),m.a);
}
const num=(v,lo,hi)=>Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):0;
function setInput(p,i){
  if(!i||typeof i!=='object')return;const I=p.input;
  Object.assign(I,{mx:num(i.mx,-1,1),mz:num(i.mz,-1,1),mag:num(i.mag,0,1),run:!!i.run,sneak:!!i.sneak,slow:!!i.slow,aim:!!i.aim,
    face:Number.isFinite(i.face)?i.face:null,aimDist:num(i.aimDist,0,60),fire:!!i.fire,ads:!!i.ads});
  if(i.jumpQ>0)I.jumpQ=num(i.jumpQ,0,.3);
  if(i.fireQ>0)I.fireQ=num(i.fireQ,0,.3);
}
function gone(c){
  const i=room.conns.indexOf(c);if(i<0)return;room.conns.splice(i,1);
  const p=c.p;if(!p||!players.includes(p))return;
  p.away=true;p.input=freshInput();p.helping=null;
  feed(p.name+' หลุดจากห้อง · เข้ามาใหม่ได้ด้วยรหัสเดิม','warn');
}
// once a frame on the host (also while paused): what the bus queued, and the world 15 times a second
export function hostFrame(dt){
  if(!room.open)return;
  // a new game, or a loaded one, made new players: give each friend theirs again
  for(const c of room.conns)if(!players.includes(c.p)&&bind(c))c.link.send({t:'w',id:c.p.id,code:room.code});
  if(bus.out.length){
    const out=bus.out.splice(0);
    for(const c of room.conns){if(!c.p)continue;const l=out.filter(m=>m.to==='*'||m.to===c.p.id);if(l.length)c.link.send({t:'m',l});}
  }
  snapT+=dt;if(snapT<SNAP_EVERY)return;snapT=0;
  for(const c of room.conns)if(c.p)c.link.send(encodeWorld(c.sent,c.p));
}
