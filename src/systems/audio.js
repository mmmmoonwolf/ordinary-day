import {clamp} from '../core/util.js';
import {player} from '../entities/player.js';

// ---------- audio ----------
// Every sound is synthesized with WebAudio (no sound files). Browsers only allow audio after a tap or key press,
// so the context is created on the first gesture. Without WebAudio (or in the headless smoke test) every call is a no-op.
const PREF_KEY='ordinary-day.sound';
let ctx=null,master=null,noiseBuf=null,voices=0,muted=false,rotor=null;
try{muted=localStorage.getItem(PREF_KEY)==='off';}catch(_){}

function ensure(){
  if(ctx){if(ctx.state==='suspended')ctx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.55;master.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
export function initAudio(){for(const ev of ['pointerdown','keydown','touchend'])addEventListener(ev,ensure,{capture:true,passive:true});}
export function isMuted(){return muted;}
export function toggleMute(){
  muted=!muted;try{localStorage.setItem(PREF_KEY,muted?'off':'on');}catch(_){}
  if(master)master.gain.setTargetAtTime(muted?0:.55,ctx.currentTime,.05);
  return muted;
}

// volume and stereo pan from where the sound happens relative to the player
function place(x,z,range){
  if(x===undefined||!player)return {g:1,pan:0};
  const dx=x-player.pos.x,dz=z-player.pos.z,d=Math.hypot(dx,dz);
  return {g:clamp(1-d/range,0,1),pan:clamp((dx-dz)/Math.SQRT2/18,-.8,.8)};
}
function out(pan){const p=ctx.createStereoPanner?ctx.createStereoPanner():null;if(!p)return master;p.pan.value=pan;p.connect(master);return p;}
function voice(len){voices++;setTimeout(()=>voices--,len*1000+100);}
function env(g,t,attack,dur,peak){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+dur);}
function noise(t,dur,o){
  const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
  const f=ctx.createBiquadFilter();f.type=o.type||'lowpass';f.frequency.setValueAtTime(o.f0,t);if(o.f1)f.frequency.exponentialRampToValueAtTime(o.f1,t+dur);f.Q.value=o.q||1;
  const g=ctx.createGain();env(g,t,o.attack||.003,dur,o.peak);
  src.connect(f).connect(g).connect(o.dest);src.start(t,Math.random()*.5);src.stop(t+dur+.1);
}
function tone(t,dur,o){
  const osc=ctx.createOscillator();osc.type=o.wave||'sine';osc.frequency.setValueAtTime(o.f0,t);if(o.f1)osc.frequency.exponentialRampToValueAtTime(o.f1,t+dur);
  const g=ctx.createGain();env(g,t,o.attack||.005,dur,o.peak);
  osc.connect(g).connect(o.dest);osc.start(t);osc.stop(t+(o.attack||.005)+dur+.05);
}
// play(build, x, z, range): build(t, dest, gain) schedules the nodes; skipped when muted, too far or too many voices
function play(len,x,z,range,build){
  if(!ctx||muted||voices>28)return;
  const {g,pan}=place(x,z,range);if(g<.03)return;
  voice(len);build(ctx.currentTime+.005,out(pan),g);
}

const GUN={
  pistol:{f:1900,dur:.12,peak:.5,thump:110},smg:{f:2300,dur:.07,peak:.32,thump:0},rifle:{f:1500,dur:.11,peak:.5,thump:95},
  shotgun:{f:900,dur:.3,peak:.75,thump:80},sniper:{f:1300,dur:.38,peak:.7,thump:70},lmg:{f:1300,dur:.09,peak:.45,thump:85},
};
export const sfx={
  shot(model){const s=GUN[model]||GUN.pistol;play(s.dur,undefined,0,1,(t,d)=>{noise(t,s.dur,{type:'bandpass',f0:s.f,f1:s.f*.4,q:.8,peak:s.peak,dest:d});if(s.thump)tone(t,.09,{f0:s.thump*1.6,f1:s.thump*.5,peak:s.peak*.8,dest:d});});},
  empty(){play(.03,undefined,0,1,(t,d)=>noise(t,.02,{type:'highpass',f0:3500,peak:.25,dest:d}));},
  reload(){play(.4,undefined,0,1,(t,d)=>{noise(t,.03,{type:'highpass',f0:2500,peak:.25,dest:d});noise(t+.25,.04,{type:'highpass',f0:1800,peak:.3,dest:d});});},
  swing(){play(.15,undefined,0,1,(t,d)=>noise(t,.12,{type:'bandpass',f0:600,f1:2400,q:2,peak:.18,attack:.03,dest:d}));},
  thud(x,z){play(.12,x,z,20,(t,d,g)=>{tone(t,.1,{f0:120,f1:50,peak:.5*g,dest:d});noise(t,.06,{f0:700,peak:.25*g,dest:d});});},
  hurt(){play(.2,undefined,0,1,(t,d)=>{tone(t,.16,{wave:'triangle',f0:170,f1:70,peak:.45,dest:d});noise(t,.1,{f0:500,peak:.3,dest:d});});},
  explode(x,z){play(1,x,z,70,(t,d,g)=>{noise(t,.9,{f0:900,f1:90,peak:1*g,dest:d});tone(t,.7,{f0:90,f1:28,peak:.9*g,dest:d});});},
  swell(x,z){play(1.3,x,z,30,(t,d,g)=>{tone(t,1.2,{wave:'sawtooth',f0:90,f1:420,peak:.16*g,attack:.4,dest:d});tone(t,1.2,{f0:180,f1:840,peak:.12*g,attack:.4,dest:d});});},
  roar(x,z,len){len=len||1.3;play(len,x,z,90,(t,d,g)=>{tone(t,len,{wave:'sawtooth',f0:75,f1:42,peak:.4*g,attack:.12,dest:d});tone(t,len,{wave:'sawtooth',f0:79,f1:45,peak:.3*g,attack:.12,dest:d});noise(t,len,{f0:600,f1:200,peak:.35*g,attack:.1,dest:d});});},
  shriek(x,z){play(.6,x,z,45,(t,d,g)=>{tone(t,.5,{wave:'sawtooth',f0:700,f1:1500,peak:.16*g,attack:.03,dest:d});noise(t,.45,{type:'bandpass',f0:2200,f1:3200,q:4,peak:.2*g,attack:.03,dest:d});});},
  pickup(){play(.15,undefined,0,1,(t,d)=>{tone(t,.06,{f0:660,peak:.14,dest:d});tone(t+.06,.08,{f0:990,peak:.12,dest:d});});},
  crack(){play(.35,undefined,0,1,(t,d)=>{noise(t,.25,{type:'highpass',f0:1800,peak:.5,dest:d});tone(t,.2,{wave:'square',f0:220,f1:60,peak:.2,dest:d});});},
  door(x,z){play(.3,x,z,25,(t,d,g)=>{tone(t,.12,{wave:'triangle',f0:190,f1:95,peak:.35*g,dest:d});noise(t,.08,{f0:900,peak:.2*g,dest:d});});},
  eat(){play(.4,undefined,0,1,(t,d)=>{for(const k of [0,.12,.24])noise(t+k,.06,{type:'bandpass',f0:1400,q:2,peak:.18,dest:d});});},
  heal(){play(.5,undefined,0,1,(t,d)=>{tone(t,.15,{f0:520,peak:.16,dest:d});tone(t+.12,.3,{f0:780,peak:.14,dest:d});});},
  infect(){play(.9,undefined,0,1,(t,d)=>{for(const k of [0,.28,.6])tone(t+k,.18,{f0:65,f1:45,peak:.6,dest:d});});},
  radio(){play(.3,undefined,0,1,(t,d)=>noise(t,.25,{type:'bandpass',f0:2600,q:3,peak:.1,attack:.02,dest:d}));},
  alarm(){play(1.6,undefined,0,1,(t,d)=>{for(let i=0;i<4;i++)tone(t+i*.36,.3,{wave:'square',f0:i%2?330:440,peak:.07,attack:.02,dest:d});});},
  night(){play(2.4,undefined,0,1,(t,d)=>{tone(t,2.2,{wave:'sawtooth',f0:55,f1:48,peak:.18,attack:.6,dest:d});tone(t,2.2,{f0:110,f1:96,peak:.1,attack:.6,dest:d});});},
  dawn(){play(1.4,undefined,0,1,(t,d)=>{tone(t,.5,{f0:523,peak:.12,dest:d});tone(t+.25,.6,{f0:659,peak:.11,dest:d});tone(t+.5,.8,{f0:784,peak:.1,dest:d});});},
  win(){play(2.2,undefined,0,1,(t,d)=>{[523,659,784,1047].forEach((f,i)=>tone(t+i*.22,.9,{wave:'triangle',f0:f,peak:.14,dest:d}));});},
  // helicopter rotor: a looping chopped noise whose level follows the distance to the LZ (0 stops it)
  rotor(level,x,z){
    if(!ctx)return;
    const {g,pan}=place(x,z,90),v=muted?0:level*g*.5;
    if(!rotor){if(v<=0)return;
      const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
      const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=420;
      const chop=ctx.createGain();chop.gain.value=.5;const lfo=ctx.createOscillator();lfo.frequency.value=11;const depth=ctx.createGain();depth.gain.value=.5;lfo.connect(depth).connect(chop.gain);
      const vol=ctx.createGain();vol.gain.value=0;const p=out(0);
      src.connect(f).connect(chop).connect(vol).connect(p);src.start();lfo.start();rotor={src,lfo,vol,p};}
    rotor.vol.gain.setTargetAtTime(v,ctx.currentTime,.3);if(rotor.p.pan)rotor.p.pan.setTargetAtTime(pan,ctx.currentTime,.3);
    if(v<=0){const r=rotor;rotor=null;setTimeout(()=>{r.src.stop();r.lfo.stop();},1500);}
  },
};
