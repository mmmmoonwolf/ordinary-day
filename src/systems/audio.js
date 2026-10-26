import {clamp} from '../core/util.js';
import {send} from '../core/bus.js';
import {player,viewed} from '../entities/player.js';
import {agents} from '../entities/agents.js';
import {G} from '../core/state.js';
import {breakables} from '../world/props.js';
import {fireSpots} from './effects.js';

// ---------- audio ----------
// Sounds are synthesized with WebAudio, except screams, rain and thunder (v0.19, recordings in assets/sounds/). Browsers
// only allow audio after a tap or key press, so the context is created (and the recordings loaded) on the first gesture. Without WebAudio (or in the headless smoke test) every call is a no-op.
const PREF_KEY='ordinary-day.sound';
let ctx=null,master=null,noiseBuf=null,voices=0,muted=false,rotor=null;
try{muted=localStorage.getItem(PREF_KEY)==='off';}catch(_){}

// master -> speakers; sound effects and music each have their own bus so the settings page can set them apart (v0.8)
let sfxBus=null,musicBus=null;const vol={master:1,sfx:1,music:.6};
const masterLevel=()=>muted?0:.55*vol.master;
function ensure(){
  if(ctx){if(ctx.state==='suspended')ctx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ctx=new AC();master=ctx.createGain();master.gain.value=masterLevel();master.connect(ctx.destination);
  sfxBus=ctx.createGain();sfxBus.gain.value=vol.sfx;sfxBus.connect(master);
  musicBus=ctx.createGain();musicBus.gain.value=vol.music;musicBus.connect(master);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  loadSounds();
}
export function setVolumes(v){
  Object.assign(vol,v);if(!ctx)return;
  master.gain.setTargetAtTime(masterLevel(),ctx.currentTime,.05);sfxBus.gain.setTargetAtTime(vol.sfx,ctx.currentTime,.05);musicBus.gain.setTargetAtTime(vol.music,ctx.currentTime,.05);
}
export function initAudio(){for(const ev of ['pointerdown','keydown','touchend'])addEventListener(ev,ensure,{capture:true,passive:true});}
export function isMuted(){return muted;}
export function toggleMute(){
  muted=!muted;try{localStorage.setItem(PREF_KEY,muted?'off':'on');}catch(_){}
  if(master)master.gain.setTargetAtTime(masterLevel(),ctx.currentTime,.05);
  return muted;
}

// volume and stereo pan from where the sound happens relative to the player (or the teammate being watched)
function place(x,z,range){
  if(x===undefined||!player)return {g:1,pan:0};
  const v=viewed(),dx=x-v.pos.x,dz=z-v.pos.z,d=Math.hypot(dx,dz);
  return {g:clamp(1-d/range,0,1),pan:clamp((dx-dz)/Math.SQRT2/18,-.8,.8)};
}
function out(pan){const p=ctx.createStereoPanner?ctx.createStereoPanner():null;if(!p)return sfxBus;p.pan.value=pan;p.connect(sfxBus);return p;}
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

// ---------- recordings (v0.19) ----------
// Pixabay sound effects (README credits), cut, mono and level-matched in assets/sounds/. Until they have loaded, or when
// one fails, the call plays nothing; the game never waits for them.
export const FILES={scream:['scream_m1','scream_m2','scream_m3','scream_m4','scream_m5','scream_m6','scream_w1','scream_w2','scream_x1','scream_x2'],thunder:['thunder1','thunder2','thunder3'],rain:['rain'],
  groan:['groan1','groan2','groan3','groan4','groan5'],zscream:['zscream1','zscream2','zscream3','zscream4','zscream5'],heart:['heart'],hurt:['hurt'],   // v0.20 zombies, heartbeat, the player hurt
  // v0.21 guns, reloads, a punch, the door, steps on wooden floors, loops (helicopter, wind, fire, police siren), sirens
  shot_pistol:['shot_pistol'],shot_rifle:['shot_rifle'],shot_shotgun:['shot_shotgun'],shot_smg:['shot_smg'],reload_pistol:['reload_pistol'],reload_rifle:['reload_rifle'],reload_shotgun:['reload_shotgun'],
  punch:['punch'],door:['door'],step:['step1','step2','step3','step4'],heli:['heli'],wind:['wind'],fire:['fire'],siren_police:['siren_police'],siren_dusk:['siren_dusk'],siren_outbreak:['siren_outbreak']};
const bufs={};let loading=false,lastScream=-9,lastHurt=-9,lastGrowl=-9;
function loadSounds(){
  if(loading||typeof fetch!=='function')return;loading=true;
  for(const k in FILES)for(const n of FILES[k])fetch('assets/sounds/'+n+'.mp3').then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status))
    .then(b=>new Promise((ok,no)=>ctx.decodeAudioData(b,ok,no))).then(buf=>(bufs[k]||(bufs[k]=[])).push(buf)).catch(()=>{});
}
export const soundsLoaded=()=>Object.fromEntries(Object.keys(FILES).map(k=>[k,(bufs[k]||[]).length]));
export const played={};   // how many times each kind has played (tests, bug reports)
export const windLevel=()=>wind?wind.g.gain.value:0;
export const loopLevels=()=>Object.fromEntries(Object.entries(loops).map(([k,L])=>[k,+L.g.gain.value.toFixed(3)]));
export const rainLevel=()=>rainLoop?rainLoop.g.gain.value:0;
// one recording of a kind, picked at random, slightly detuned; far away it is duller (lowpass)
function sample(kind,t,dest,gain,o={}){
  const L=bufs[kind];if(!L||!L.length)return null;
  played[kind]=(played[kind]||0)+1;
  const src=ctx.createBufferSource();src.buffer=L[Math.floor(Math.random()*L.length)];src.playbackRate.value=o.rate||1;
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=o.cut||16000;const g=ctx.createGain();g.gain.value=gain;
  src.connect(f).connect(g).connect(dest);src.start(t);return src;
}
// v0.21 which recording each gun model plays: [kind, playback rate, level]; the sniper is the rifle shot slowed down
const GUN_REC={pistol:['shot_pistol',1,.8],smg:['shot_smg',1.05,.65],lmg:['shot_smg',.85,.8],rifle:['shot_rifle',1,.8],sniper:['shot_rifle',.78,1],shotgun:['shot_shotgun',1,.95],dbshotgun:['shot_shotgun',.9,1]};
const RELOAD_REC={pistol:'reload_pistol',shotgun:'reload_shotgun',dbshotgun:'reload_shotgun',smg:'reload_rifle',rifle:'reload_rifle',lmg:'reload_rifle',sniper:'reload_rifle'};
const GUN={dbshotgun:{f:850,dur:.34,peak:.8,thump:75},
  pistol:{f:1900,dur:.12,peak:.5,thump:110},smg:{f:2300,dur:.07,peak:.32,thump:0},rifle:{f:1500,dur:.11,peak:.5,thump:95},
  shotgun:{f:900,dur:.3,peak:.75,thump:80},sniper:{f:1300,dur:.38,peak:.7,thump:70},lmg:{f:1300,dur:.09,peak:.45,thump:85},
};
const S={
  // heard from where the shooter stands (v0.11: other players' guns are quieter far away)
  shot(model,x,z){const r=GUN_REC[model];if(r&&bufs[r[0]]){play(.9,x,z,70,(t,d,g)=>sample(r[0],t,d,r[2]*g,{rate:r[1]*(.97+Math.random()*.06),cut:1800+g*g*15000}));return;}   // v0.21
    const s=GUN[model]||GUN.pistol;play(s.dur,x,z,70,(t,d,g)=>{noise(t,s.dur,{type:'bandpass',f0:s.f,f1:s.f*.4,q:.8,peak:s.peak*g,dest:d});if(s.thump)tone(t,.09,{f0:s.thump*1.6,f1:s.thump*.5,peak:s.peak*.8*g,dest:d});});},
  empty(){play(.03,undefined,0,1,(t,d)=>noise(t,.02,{type:'highpass',f0:3500,peak:.25,dest:d}));},
  reload(model){const k=RELOAD_REC[model];if(k&&bufs[k]){play(2.9,undefined,0,1,(t,d)=>sample(k,t,d,.7));return;}   // v0.21; rummaging (no model) stays synthesized
    play(.4,undefined,0,1,(t,d)=>{noise(t,.03,{type:'highpass',f0:2500,peak:.25,dest:d});noise(t+.25,.04,{type:'highpass',f0:1800,peak:.3,dest:d});});},
  swing(){play(.15,undefined,0,1,(t,d)=>noise(t,.12,{type:'bandpass',f0:600,f1:2400,q:2,peak:.18,attack:.03,dest:d}));},
  hit(x,z){if(bufs.punch)play(.7,x,z,20,(t,d,g)=>sample('punch',t,d,.6*g,{rate:.85+Math.random()*.3}));else S.thud(x,z);},   // v0.21 a melee blow lands
  // v0.31 a bullet or a blow landing in a zombie (played on every device from the impact effect, so not sent again)
  splat(x,z,k){if(k===2){play(.15,x,z,25,(t,d,g)=>{noise(t,.08,{type:'highpass',f0:3000,peak:.3*g,dest:d});tone(t,.06,{wave:'square',f0:1600,f1:900,peak:.06*g,dest:d});});return;}
    play(.25,x,z,25,(t,d,g)=>{noise(t,k?.16:.07,{f0:k?500:900,f1:150,peak:(k?.55:.28)*g,dest:d});tone(t,k?.14:.07,{f0:k?110:150,f1:45,peak:(k?.5:.22)*g,dest:d});});},
  thud(x,z){play(.12,x,z,20,(t,d,g)=>{tone(t,.1,{f0:120,f1:50,peak:.5*g,dest:d});noise(t,.06,{f0:700,peak:.25*g,dest:d});});},
  hurt(){if(bufs.hurt){if(ctx.currentTime<lastHurt+.3)return;lastHurt=ctx.currentTime;play(.6,undefined,0,1,(t,d)=>sample('hurt',t,d,.75,{rate:.92+Math.random()*.16}));return;}   // v0.20 a recording
    play(.2,undefined,0,1,(t,d)=>{tone(t,.16,{wave:'triangle',f0:170,f1:70,peak:.45,dest:d});noise(t,.1,{f0:500,peak:.3,dest:d});});},
  explode(x,z){play(1,x,z,70,(t,d,g)=>{noise(t,.9,{f0:900,f1:90,peak:1*g,dest:d});tone(t,.7,{f0:90,f1:28,peak:.9*g,dest:d});});},
  swell(x,z){play(1.3,x,z,30,(t,d,g)=>{tone(t,1.2,{wave:'sawtooth',f0:90,f1:420,peak:.16*g,attack:.4,dest:d});tone(t,1.2,{f0:180,f1:840,peak:.12*g,attack:.4,dest:d});});},
  roar(x,z,len){len=len||1.3;if(bufs.zscream)play(2.5,x,z,90,(t,d,g)=>sample('zscream',t,d,g,{rate:.5+Math.random()*.08,cut:600+g*3000}));   // v0.20 a zombie scream played slow and deep, over the synth rumble
    play(len,x,z,90,(t,d,g)=>{tone(t,len,{wave:'sawtooth',f0:75,f1:42,peak:.4*g,attack:.12,dest:d});tone(t,len,{wave:'sawtooth',f0:79,f1:45,peak:.3*g,attack:.12,dest:d});noise(t,len,{f0:600,f1:200,peak:.35*g,attack:.1,dest:d});});},
  shriek(x,z){if(bufs.zscream){play(2.5,x,z,55,(t,d,g)=>sample('zscream',t,d,.9*g,{rate:1.12+Math.random()*.1,cut:2000+g*g*14000}));return;}   // v0.20
    play(.6,x,z,45,(t,d,g)=>{tone(t,.5,{wave:'sawtooth',f0:700,f1:1500,peak:.16*g,attack:.03,dest:d});noise(t,.45,{type:'bandpass',f0:2200,f1:3200,q:4,peak:.2*g,attack:.03,dest:d});});},
  pickup(){play(.15,undefined,0,1,(t,d)=>{tone(t,.06,{f0:660,peak:.14,dest:d});tone(t+.06,.08,{f0:990,peak:.12,dest:d});});},
  crack(){play(.35,undefined,0,1,(t,d)=>{noise(t,.25,{type:'highpass',f0:1800,peak:.5,dest:d});tone(t,.2,{wave:'square',f0:220,f1:60,peak:.2,dest:d});});},
  door(x,z){if(bufs.door){play(2.4,x,z,25,(t,d,g)=>sample('door',t,d,.7*g,{rate:.95+Math.random()*.1}));return;}   // v0.21
    play(.3,x,z,25,(t,d,g)=>{tone(t,.12,{wave:'triangle',f0:190,f1:95,peak:.35*g,dest:d});noise(t,.08,{f0:900,peak:.2*g,dest:d});});},
  glass(x,z){play(.5,x,z,40,(t,d,g)=>{noise(t,.18,{type:'highpass',f0:4200,peak:.45*g,dest:d});for(const k of [.03,.09,.16])tone(t+k,.08,{f0:2600+k*4000,f1:1800,peak:.12*g,dest:d});});},
  eat(){play(.4,undefined,0,1,(t,d)=>{for(const k of [0,.12,.24])noise(t+k,.06,{type:'bandpass',f0:1400,q:2,peak:.18,dest:d});});},
  heal(){play(.5,undefined,0,1,(t,d)=>{tone(t,.15,{f0:520,peak:.16,dest:d});tone(t+.12,.3,{f0:780,peak:.14,dest:d});});},
  infect(){play(.9,undefined,0,1,(t,d)=>{for(const k of [0,.28,.6])tone(t+k,.18,{f0:65,f1:45,peak:.6,dest:d});});},
  // v0.19 a person bitten (or a player killed) screams, at most one every 0.7 s (the outbreak bites many at once);
  // heard far, duller with distance
  scream(x,z){if(!bufs.scream||ctx.currentTime<lastScream+.7)return;lastScream=ctx.currentTime;play(2.8,x,z,75,(t,d,g)=>sample('scream',t,d,.8*g,{rate:.92+Math.random()*.16,cut:1500+g*g*14000}));},
  // v0.20 a zombie notices a player: a scream or a snarl, one every 1.2 s at most
  growl(x,z){if(!bufs.groan||ctx.currentTime<lastGrowl+1.2)return;lastGrowl=ctx.currentTime;const k=Math.random()<.45&&bufs.zscream?'zscream':'groan';play(2.5,x,z,40,(t,d,g)=>sample(k,t,d,.8*g,{rate:.9+Math.random()*.2,cut:1500+g*g*14000}));},
  // thunder after a lightning flash (systems/weather.js); each device has its own storm, so it is not sent
  thunder(delay){if(ctx&&!muted&&bufs.thunder)sample('thunder',ctx.currentTime+delay,sfxBus,.75,{rate:.9+Math.random()*.2,cut:delay>1.2?2500:9000});},
  radio(){play(.3,undefined,0,1,(t,d)=>noise(t,.25,{type:'bandpass',f0:2600,q:3,peak:.1,attack:.02,dest:d}));},
  carAlarm(x,z){play(1.4,x,z,60,(t,d,g)=>{for(let i=0;i<6;i++)tone(t+i*.22,.18,{wave:'square',f0:i%2?880:660,peak:.1*g,attack:.01,dest:d});});},   // v0.18
  alarm(){if(bufs.siren_dusk){play(9.2,undefined,0,1,(t,d)=>sample('siren_dusk',t,d,.45,{cut:3500}));return;}   // v0.21 the town's air-raid siren before dark
    play(1.6,undefined,0,1,(t,d)=>{for(let i=0;i<4;i++)tone(t+i*.36,.3,{wave:'square',f0:i%2?330:440,peak:.07,attack:.02,dest:d});});},
  outbreak(){if(bufs.siren_outbreak)play(9.1,undefined,0,1,(t,d)=>sample('siren_outbreak',t,d,.3,{cut:2500}));},   // v0.21 a civil defence siren far off when it starts
  night(){play(2.4,undefined,0,1,(t,d)=>{tone(t,2.2,{wave:'sawtooth',f0:55,f1:48,peak:.18,attack:.6,dest:d});tone(t,2.2,{f0:110,f1:96,peak:.1,attack:.6,dest:d});});},
  dawn(){play(1.4,undefined,0,1,(t,d)=>{tone(t,.5,{f0:523,peak:.12,dest:d});tone(t+.25,.6,{f0:659,peak:.11,dest:d});tone(t+.5,.8,{f0:784,peak:.1,dest:d});});},
  // v0.34 the church bell in the old town, tolling four times at first light: a deep strike with out-of-tune partials that
  // ring on (it was a temple bell in v0.33)
  bell(){play(11,undefined,0,1,(t,d)=>{for(let k=0;k<4;k++){const s=t+k*2.6;[[1,5,.12],[2.4,3.2,.05],[3.01,2.4,.04],[4.2,1.6,.025],[5.43,1,.015]].forEach(([m,len,pk])=>tone(s,len,{f0:110*m,peak:pk,attack:.003,dest:d}));}});},
  // v0.34 crows somewhere over the roofs by day: two or three hoarse caws
  crow(x,z){play(1.6,x,z,60,(t,d,g)=>{const n=2+Math.floor(Math.random()*2);for(let k=0;k<n;k++){const s=t+k*(.32+Math.random()*.12),f=520+Math.random()*120;tone(s,.2,{wave:'sawtooth',f0:f,f1:f*.62,peak:.07*g,attack:.02,dest:d});noise(s,.18,{type:'bandpass',f0:f*2.2,q:3,peak:.09*g,attack:.02,dest:d});}});},
  win(){play(2.2,undefined,0,1,(t,d)=>{[523,659,784,1047].forEach((f,i)=>tone(t+i*.22,.9,{wave:'triangle',f0:f,peak:.14,dest:d}));});},
  // helicopter rotor: a looping chopped noise whose level follows the distance to the LZ (0 stops it)
  rotor(level,x,z){
    if(!ctx)return;
    const {g,pan}=place(x,z,90),v=muted?0:level*g*.5;
    if(!rotor){if(v<=0)return;
      if(bufs.heli){const src=ctx.createBufferSource();src.buffer=bufs.heli[0];src.loop=true;src.loopStart=.05;src.loopEnd=src.buffer.duration-.05;const vol=ctx.createGain();vol.gain.value=0;const p=out(0);src.connect(vol).connect(p);src.start();rotor={src,lfo:{stop(){}},vol,p};}   // v0.21 a recording
      else{const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
      const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=420;
      const chop=ctx.createGain();chop.gain.value=.5;const lfo=ctx.createOscillator();lfo.frequency.value=11;const depth=ctx.createGain();depth.gain.value=.5;lfo.connect(depth).connect(chop.gain);
      const vol=ctx.createGain();vol.gain.value=0;const p=out(0);
      src.connect(f).connect(chop).connect(vol).connect(p);src.start();lfo.start();rotor={src,lfo,vol,p};}}
    rotor.vol.gain.setTargetAtTime(rotor.lfo.frequency?v:v*1.4,ctx.currentTime,.3);if(rotor.p.pan)rotor.p.pan.setTargetAtTime(pan,ctx.currentTime,.3);
    if(v<=0){const r=rotor;rotor=null;setTimeout(()=>{r.src.stop();r.lfo.stop();},1500);}
  },
};

// Sounds of the world are played here and sent to every other device (v0.11, core/bus.js); the rotor is driven by
// each device's own frame loop. A sound for one player only (their reload click, a pickup) goes through sfxFor(p):
// played here when that player is on this device, otherwise sent to theirs.
export const sfx={};for(const k in S)sfx[k]=k==='rotor'||k==='thunder'?S[k]:(...a)=>{S[k](...a);send('*','sfx',[k,...a]);};
const away={};
export function sfxFor(p){
  if(p.local)return S;
  return away[p.id]||(away[p.id]=Object.fromEntries(Object.keys(S).map(k=>[k,(...a)=>send(p.id,'sfx',[k,...a])])));
}
export const playLocal=(k,...a)=>{if(S[k])S[k](...a);};

// ---------- music (v0.8) ----------
// Synthesized, no files: slow pad chords (major before the outbreak, minor after, low and dark at night), a night drone,
// and a heartbeat that rises with `danger` (0..1, how many zombies are after the player). updateMusic runs every frame
// and schedules a chord every few seconds; nothing plays while muted or with the music volume at 0.
const N=f=>440*Math.pow(2,(f-69)/12);   // midi note -> Hz
const PROG={calm:[[48,52,55],[45,48,52],[41,45,48],[43,47,50]],tense:[[45,48,52],[41,45,48],[38,41,45],[40,44,47]],night:[[33,36,40],[29,33,36],[31,34,38],[28,32,35]]};
let nextChord=0,chordI=0,drone=null,nextBeat=0;
export function updateMusic(m){
  if(!ctx||muted||vol.music<=0||ctx.state!=='running')return;
  const t=ctx.currentTime;
  if(!drone){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=N(33);f.type='lowpass';f.frequency.value=160;g.gain.value=0;o.connect(f).connect(g).connect(musicBus);o.start();drone={o,g};}
  drone.g.gain.setTargetAtTime(m.night*.05,t,1.5);
  if(t>=nextChord){
    const key=m.night>.5?'night':m.outbreak?'tense':'calm',ch=PROG[key][chordI++%4],len=m.night>.5?7:5.5;
    for(const n of ch){const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='triangle';o.frequency.value=N(n+12);o.detune.value=(Math.random()-.5)*8;
      f.type='lowpass';f.frequency.value=key==='night'?500:900;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+1.6);g.gain.exponentialRampToValueAtTime(.0001,t+len);
      o.connect(f).connect(g).connect(musicBus);o.start(t);o.stop(t+len+.1);}
    nextChord=t+len-.8;
  }
  if(m.danger>0&&t>=nextBeat&&bufs.heart){sample('heart',t,musicBus,.35+.55*m.danger,{rate:1+m.danger*.2});nextBeat=t+1.1-m.danger*.45;}   // v0.20 a recorded beat
  if(m.danger>0&&t>=nextBeat){for(const k of [0,.22]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(70,t+k);o.frequency.exponentialRampToValueAtTime(40,t+k+.15);g.gain.setValueAtTime(.0001,t+k);g.gain.exponentialRampToValueAtTime(.25*m.danger,t+k+.02);g.gain.exponentialRampToValueAtTime(.0001,t+k+.2);o.connect(g).connect(musicBus);o.start(t+k);o.stop(t+k+.25);}
    nextBeat=t+1.1-m.danger*.45;}
}

// ---------- ambience (v0.19, wind and moaning v0.20) ----------
// Rain: one looping recording whose level follows G.rain, quieter and duller indoors. After the outbreak someone screams
// somewhere in the town now and then (more often at night), from a random direction; this device only, like the music.
let rainLoop=null,nextCry=0,wind=null,nextGust=0,nextGroan=0,nextCrow=0,lastPos=null,stride=0;
const loops={};
// one looping recording that follows its source: level by distance (range), panned; silent when `on` is false
function near(kind,on,at,range,level,t){
  if(!bufs[kind])return;
  let L=loops[kind];
  if(!L){if(!on)return;const src=ctx.createBufferSource();src.buffer=bufs[kind][0];src.loop=true;src.loopStart=.05;src.loopEnd=src.buffer.duration-.05;
    const g=ctx.createGain();g.gain.value=0;const p=ctx.createStereoPanner?ctx.createStereoPanner():null;src.connect(g);if(p){g.connect(p).connect(sfxBus);}else g.connect(sfxBus);src.start(0,Math.random()*src.buffer.duration*.8);L=loops[kind]={src,g,p};}
  const q=on&&!muted?place(at.x,at.z,range):{g:0,pan:0};L.g.gain.setTargetAtTime(q.g*q.g*level,t,.4);if(L.p)L.p.pan.setTargetAtTime(q.pan,t,.4);
}
// v0.20 wind, synthesized: noise through a wide band (the rush) and a narrow one (the whistle), in slow random gusts;
// stronger at night and in the rain, muffled indoors. A distant scream comes in on a gust.
function makeWind(){
  if(bufs.wind){   // v0.21 a recorded wind loop; the gusts still swell it
    const src=ctx.createBufferSource();src.buffer=bufs.wind[0];src.loop=true;src.loopStart=.05;src.loopEnd=src.buffer.duration-.05;
    const gust=ctx.createGain();gust.gain.value=.5;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4000;const g=ctx.createGain();g.gain.value=0;
    src.connect(gust).connect(lp).connect(g).connect(sfxBus);src.start(0,Math.random()*5);return {src,gust,lp,g,rec:true};
  }
  const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
  const rush=ctx.createBiquadFilter();rush.type='bandpass';rush.frequency.value=380;rush.Q.value=.6;
  const whistle=ctx.createBiquadFilter();whistle.type='bandpass';whistle.frequency.value=850;whistle.Q.value=9;const wg=ctx.createGain();wg.gain.value=.5;
  const gust=ctx.createGain();gust.gain.value=.5;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4000;const g=ctx.createGain();g.gain.value=0;
  src.connect(rush).connect(gust);src.connect(whistle).connect(wg).connect(gust);gust.connect(lp).connect(g).connect(sfxBus);src.start();
  return {src,rush,whistle,gust,lp,g};
}
export function updateAmbience(m){
  if(!ctx||ctx.state!=='running')return;
  const t=ctx.currentTime;
  if(!wind||!wind.rec&&bufs.wind){if(wind){const o=wind;o.g.gain.setTargetAtTime(0,t,.5);setTimeout(()=>o.src.stop(),2000);}wind=makeWind();}   // the recording replaces the synth once loaded
  wind.g.gain.setTargetAtTime(muted||!m.on?0:(wind.rec?.16:.09)*(1+.6*m.night+.5*m.rain)*(m.inside?.45:1),t,1.2);   // PLACEHOLDER wind level
  wind.lp.frequency.setTargetAtTime(m.inside?450:4000,t,.4);
  if(t>=nextGust){const k=Math.random();wind.gust.gain.setTargetAtTime(.25+k*.9,t,.8+Math.random()*1.5);if(wind.rush){wind.rush.frequency.setTargetAtTime(260+k*380,t,1.2);wind.whistle.frequency.setTargetAtTime(650+k*500,t,1.5);}nextGust=t+1.5+Math.random()*3.5;}
  // v0.21 police cars wail at night and burned cars (and a crashed police car) still crackle: one loop each, from the nearest
  const v=viewed();
  if(v){
    let pol=null,pd=1e9,fire=null,fd=1e9;
    for(const b of breakables)if(b.car){const d=Math.hypot(b.x-v.pos.x,b.z-v.pos.z);if(b.car.police&&d<pd){pd=d;pol=b;}if(b.car.burned&&d<fd){fd=d;fire=b;}}
    for(const f of fireSpots){const d=Math.hypot(f.x-v.pos.x,f.z-v.pos.z);if(d<fd){fd=d;fire=f;}}   // v0.23 Molotovs and burning fuel
    if(G.site&&G.site.kind==='crash'){const d=Math.hypot(G.site.x-v.pos.x,G.site.z-v.pos.z);if(d<fd){fd=d;fire=G.site;}}
    near('siren_police',m.on&&m.night>.5&&pol,pol,55,.3,t);near('fire',m.on&&fire,fire,20,.5,t);
    // steps on the wooden floors indoors, one every 0.75 m walked (louder running, quiet sneaking)
    const moved=lastPos?Math.hypot(v.pos.x-lastPos.x,v.pos.z-lastPos.z):0;lastPos={x:v.pos.x,z:v.pos.z};
    if(m.inside&&v.alive&&moved<1){stride+=moved;if(stride>.75&&bufs.step){stride=0;play(.45,v.pos.x,v.pos.z,20,(tt,d,g)=>sample('step',tt,d,(v.sneak?.12:.32)*g,{rate:.9+Math.random()*.2}));}}else stride=0;
  }
  // v0.34 crows by day outdoors, off somewhere over the roofs (this device only)
  if(m.on&&!m.inside&&m.night<.5&&t>=nextCrow){const v=viewed();if(v){const a=Math.random()*6.28;S.crow(v.pos.x+Math.cos(a)*25,v.pos.z+Math.sin(a)*25);}nextCrow=t+14+Math.random()*30;}   // PLACEHOLDER how often
  // zombies close by moan now and then, from where they are (this device only)
  if(m.on&&bufs.groan&&t>=nextGroan){
    const v=viewed();let best=null,n=0;
    if(v)for(const a of agents)if(a.state==='zombie'&&Math.hypot(a.pos.x-v.pos.x,a.pos.z-v.pos.z)<24&&Math.random()<1/++n)best=a;   // one of them, at random
    if(best)play(4,best.pos.x,best.pos.z,26,(tt,d,g)=>sample('groan',tt,d,.55*g,{rate:.8+Math.random()*.35,cut:m.inside?900:1200+g*g*12000}));
    nextGroan=t+(n>4?1.2:2.2)+Math.random()*(n>4?1.8:3.5);   // PLACEHOLDER: more zombies, more moaning
  }
  if(!rainLoop&&bufs.rain&&m.rain>.01){
    const src=ctx.createBufferSource();src.buffer=bufs.rain[0];src.loop=true;src.loopStart=.06;src.loopEnd=src.buffer.duration-.06;   // past the mp3 padding
    const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=12000;const g=ctx.createGain();g.gain.value=0;
    src.connect(f).connect(g).connect(sfxBus);src.start();rainLoop={src,f,g};
  }
  if(rainLoop){rainLoop.g.gain.setTargetAtTime(muted?0:m.rain*(m.inside?.3:.6),t,.6);rainLoop.f.frequency.setTargetAtTime(m.inside?700:12000,t,.3);}
  if(!m.outbreak||!m.alive||muted||!bufs.scream){nextCry=0;return;}
  if(!nextCry){nextCry=t+8+Math.random()*20;return;}
  if(t>=nextCry){
    wind.gust.gain.setTargetAtTime(1.15,t,.4);nextGust=t+3;   // carried in on the wind
    const p=out((Math.random()*2-1)*.8);sample('scream',t+.4,p,(m.inside?.06:.12)+Math.random()*.1,{rate:.85+Math.random()*.2,cut:m.inside?700:1300+Math.random()*1200});
    nextCry=t+(m.night>.5?18+Math.random()*30:40+Math.random()*50);   // PLACEHOLDER: real seconds between distant screams
  }
}
