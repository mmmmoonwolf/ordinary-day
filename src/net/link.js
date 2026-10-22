// ---------- connection (v0.12) ----------
// Rooms use PeerJS (WebRTC between browsers; its free public server only introduces them, Q17). The library loads
// from the CDN the first time someone opens or joins a room, so playing alone never needs it.
// A link is {send(obj), onData(fn), onClose(fn), close()}. Tests swap the transport for their own (setTransport).
const LIB='https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX='ordinary-day-';
const CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I/L to misread
export const newCode=()=>Array.from({length:5},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join('');
export const cleanCode=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
let transport=null;
export function setTransport(t){transport=t;}

let libP=null;
function loadLib(){
  if(window.Peer)return Promise.resolve();
  return libP||(libP=new Promise((ok,no)=>{const s=document.createElement('script');s.src=LIB;s.onload=()=>ok();s.onerror=()=>{libP=null;no(new Error('โหลดระบบออนไลน์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่'));};document.head.appendChild(s);}));
}
// ?peer=host:port uses a PeerJS server of your own (tests run one locally); otherwise the public one
function opts(){
  const q=new URLSearchParams(location.search).get('peer');if(!q)return {debug:0};
  const [host,port]=q.split(':');return {host,port:+port||9000,path:'/',secure:false,debug:0};
}
function wrap(c){
  const on={data:[],close:[]};let shut=false;
  c.on('data',d=>{for(const f of on.data)f(d);});
  const closed=()=>{if(shut)return;shut=true;for(const f of on.close)f();};
  c.on('close',closed);c.on('error',closed);
  return {send:o=>{if(c.open)c.send(o);},onData:f=>on.data.push(f),onClose:f=>on.close.push(f),close:()=>{try{c.close();}catch(_){}closed();}};
}
// open room `code` on this device; onLink(link) for every friend who connects. Resolves to {close()}.
export async function hostRoom(code,onLink){
  if(transport)return transport.host(code,onLink);
  await loadLib();
  return new Promise((ok,no)=>{
    const peer=new window.Peer(PREFIX+code,opts());let up=false;
    peer.on('open',()=>{up=true;ok({close:()=>peer.destroy()});});
    peer.on('connection',c=>c.on('open',()=>onLink(wrap(c))));
    peer.on('disconnected',()=>{if(up&&!peer.destroyed)peer.reconnect();});   // lost the public server: friends already in stay connected
    peer.on('error',e=>{if(!up){peer.destroy();no(new Error(e.type==='unavailable-id'?'taken':'เปิดห้องไม่ได้ ('+e.type+')'));}});
  });
}
// connect to room `code`; resolves to a link
export async function joinRoom(code){
  if(transport)return transport.join(code);
  await loadLib();
  return new Promise((ok,no)=>{
    const peer=new window.Peer(opts());let done=false;
    const fail=m=>{if(done)return;done=true;peer.destroy();no(new Error(m));};
    const timer=setTimeout(()=>fail('ต่อห้องไม่ได้ภายใน 15 วินาที ลองใหม่อีกครั้ง'),15000);
    peer.on('open',()=>{
      const c=peer.connect(PREFIX+code,{reliable:true,serialization:'json'});
      c.on('open',()=>{if(done)return;done=true;clearTimeout(timer);const l=wrap(c);l.onClose(()=>peer.destroy());ok(l);});
    });
    peer.on('error',e=>{clearTimeout(timer);fail(e.type==='peer-unavailable'?'ไม่พบห้อง '+code+' ตรวจรหัสอีกครั้ง':'ต่อห้องไม่ได้ ('+e.type+')');});
  });
}
