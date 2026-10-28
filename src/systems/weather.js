import {isTouch,rnd,clamp} from '../core/util.js';
import {scene,sun,hemi,flash,camTarget,view} from '../core/renderer.js';
import {G} from '../core/state.js';
import {roadMat,puddleMat,lampHeadMat,glowMat,wallMats} from '../world/materials.js';
import {sirenR,sirenB,flickers} from '../world/props.js';
import {player} from '../entities/player.js';
import {playLocal} from './audio.js';

// ---------- sky / weather ----------
// v0.16: a greyer, tired palette (overcast day, washed-out dusk) and a low morning haze
// v0.17: darker still, a dirty yellow-grey like old film stock
const C={rain:new THREE.Color('#5d605e')};
// v0.44 with no clock on screen the light tells the time: the sky, the sun (or moon) and the ambient light go through
// dawn, morning, noon, afternoon, evening, dusk and night. [minute of the day, sky / fog, sun colour, sun strength, ambient
// colour, ambient strength]; between two rows everything blends. The sun also crosses the sky (shadows swing round and are
// long early and late). PLACEHOLDER colours, in the same tired film-stock palette as v0.16 / v0.17
const SKY=[
  [0,'#0a0d12','#6a7590',.28,'#262d3c',.2],        // night
  [285,'#0b0e15','#6a7590',.26,'#262d3c',.2],
  [330,'#2a3047','#7f86a6',.3,'#3c4560',.28],      // first light, blue
  [370,'#a1715f','#ff9468',.75,'#8a7480',.36],     // dawn, pink and orange, the sun low
  [450,'#a59f8d','#f4d6a8',1.45,'#bdb6a2',.52],    // morning, hazy and warm
  [720,'#979c9b','#fbf2e2',2,'#c8c7bd',.64],       // noon, white and high
  [900,'#9c9580','#f6dca6',1.85,'#c4b79a',.6],     // afternoon, warmer
  [1035,'#ab8656','#ffad5c',1.45,'#b29a7a',.5],    // evening, golden
  [1110,'#87564a','#ff6f42',.75,'#6c5068',.36],    // dusk, red and violet, the sun going down
  [1155,'#2c2a41','#7f7fa0',.32,'#36374e',.26],    // after sunset, blue-violet
  [1215,'#0b0e15','#6a7590',.28,'#262d3c',.2],     // night
  [1440,'#0a0d12','#6a7590',.28,'#262d3c',.2],
].map(r=>[r[0],new THREE.Color(r[1]),new THREE.Color(r[2]),r[3],new THREE.Color(r[4]),r[5]]);
const L={sky:new THREE.Color(),sun:new THREE.Color(),hemi:new THREE.Color(),sunI:0,hemiI:0};
export function light(tod){
  let i=0;while(i<SKY.length-2&&SKY[i+1][0]<=tod)i++;
  const a=SKY[i],b=SKY[i+1],k=clamp((tod-a[0])/(b[0]-a[0]),0,1),e=k*k*(3-2*k);
  L.sky.copy(a[1]).lerp(b[1],e);L.sun.copy(a[2]).lerp(b[2],e);L.sunI=a[3]+(b[3]-a[3])*e;L.hemi.copy(a[4]).lerp(b[4],e);L.hemiI=a[5]+(b[5]-a[5])*e;
  return L;
}
const tmpC=new THREE.Color(),sunDir=new THREE.Vector3(),moonDir=new THREE.Vector3(-.5,.9,.35).normalize();
const RN=isTouch?900:1600,rainArr=new Float32Array(RN*6),rx=[],ry=[],rz=[];
for(let i=0;i<RN;i++){rx.push(rnd(-48,48));ry.push(rnd(0,40));rz.push(rnd(-48,48));}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainArr,3));
const rainMat=new THREE.LineBasicMaterial({color:'#b9c6d0',transparent:true,opacity:0,depthWrite:false});
const rainLines=new THREE.LineSegments(rainGeo,rainMat);rainLines.frustumCulled=false;scene.add(rainLines);
let bolt=-1e9,nextBolt=0;
const roadBase=new THREE.Color('#ffffff'),roadWet=new THREE.Color('#8f959b');
export function updateSky(dt,now){
  const tod=G.min%1440,a=(tod-360)/780*Math.PI,sunH=Math.sin(a);
  const day=clamp(sunH*2.2+.12,0,1);G.night=1-day;
  G.rain+=(G.rainTarget-G.rain)*Math.min(1,dt*.35);G.wet=clamp(G.wet+(G.rain>.3?.12:-.015)*dt,0,1);
  const lt=light(tod);tmpC.copy(lt.sky).lerp(C.rain,G.rain*.55*day);
  scene.background.copy(tmpC);scene.fog.color.copy(tmpC);
  const haze=tod>300&&tod<600?clamp(1-Math.abs(tod-420)/180,0,1):0;const thick=G.fog>G.min?clamp((G.fog-G.min)/30,0,1):0;scene.fog.near=118-haze*22-G.rain*10-thick*48;scene.fog.far=235-haze*45-G.rain*25-thick*85;
  if(view.fps){scene.fog.near*=.25;scene.fog.far*=.5;}   // v0.28 at eye level the town fades out within ~120 m (and the camera draws no further)   // morning haze, rain, a fog event (v0.18)
  sunDir.set(Math.cos(a)*.85,Math.max(sunH,.1)+.12,.45).normalize().lerp(moonDir,G.night).normalize();
  sun.position.copy(camTarget).addScaledVector(sunDir,110);sun.target.position.copy(camTarget);
  sun.intensity=lt.sunI*(1-day*(G.rain*.58+haze*.18));sun.color.copy(lt.sun);
  hemi.intensity=lt.hemiI-day*G.rain*.1;hemi.color.copy(lt.hemi);
  // v0.19 lightning in heavy rain: a double flash of the sky light, thunder after it (later and duller when far)
  if(G.rain>.7){if(!nextBolt)nextBolt=now+rnd(6e3,2e4);else if(now>=nextBolt){bolt=now;nextBolt=now+rnd(14e3,4e4);playLocal('thunder',rnd(.2,2.4));}}else nextBolt=0;   // PLACEHOLDER: real ms between strikes
  const bt=now-bolt;if(bt<380){const k=bt<90?1:bt<170?.15:bt<260?.75:.3*(1-(bt-260)/120);hemi.intensity+=k*(1.4+G.night*1.6);}
  const lampsOn=G.blackout?0:clamp((G.night-.3)/.3,0,1);   // blackout night (v0.8): no street lights or windows
  for(const m of wallMats)m.emissiveIntensity=G.night*(G.blackout?.08:1.15);
  lampHeadMat.emissiveIntensity=lampsOn*2.2;glowMat.opacity=lampsOn*.6;
  // failing street lights (v0.16): mostly on, with bursts of stutter and short blackouts
  for(const f of flickers){const t=now/1000+f.ph,burst=Math.sin(t*.7)>.55,k=burst?(Math.sin(t*37)*Math.sin(t*11.3)>0?1:.08):(t%9<.35?.1:1);f.head.emissiveIntensity=lampHeadMat.emissiveIntensity*k;f.glow.opacity=glowMat.opacity*k;}
  const sir=G.phase==='night'?1:0,blinkA=Math.sin(now/180)>0;sirenR.emissiveIntensity=sir*(blinkA?2.4:.2);sirenB.emissiveIntensity=sir*(blinkA?.2:2.4);
  flash.intensity=(player&&player.alive)?(G.blackout?clamp((G.night-.3)/.3,0,1):lampsOn)*2.6:0;
  roadMat.roughness=.92-G.wet*.55;roadMat.metalness=G.wet*.15;roadMat.color.copy(roadBase).lerp(roadWet,G.wet);
  puddleMat.opacity=G.wet*.85;rainMat.opacity=G.rain*.5;
  if(G.rain>.02){for(let i=0;i<RN;i++){ry[i]-=dt*30;if(ry[i]<0)ry[i]+=40;const o=i*6;rainArr[o]=rx[i];rainArr[o+1]=ry[i];rainArr[o+2]=rz[i];rainArr[o+3]=rx[i]+.12;rainArr[o+4]=ry[i]-1.1;rainArr[o+5]=rz[i]+.12;}rainGeo.attributes.position.needsUpdate=true;rainLines.position.set(camTarget.x,0,camTarget.z);}
}
