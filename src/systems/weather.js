import {isTouch,rnd,clamp} from '../core/util.js';
import {scene,sun,hemi,flash,camTarget} from '../core/renderer.js';
import {G} from '../core/state.js';
import {roadMat,puddleMat,lampHeadMat,glowMat,wallMats} from '../world/materials.js';
import {sirenR,sirenB,flickers} from '../world/props.js';
import {player} from '../entities/player.js';

// ---------- sky / weather ----------
// v0.16: a greyer, tired palette (overcast day, washed-out dusk) and a low morning haze
// v0.17: darker still, a dirty yellow-grey like old film stock
const C={night:new THREE.Color('#0a0d12'),day:new THREE.Color('#8f9089'),dusk:new THREE.Color('#9a7458'),rain:new THREE.Color('#5d605e'),sunDay:new THREE.Color('#ecdcc0'),sunLow:new THREE.Color('#e39a62'),moon:new THREE.Color('#6a7590'),hemiDay:new THREE.Color('#b4b3a8'),hemiNight:new THREE.Color('#262d3c')};
const tmpC=new THREE.Color(),sunDir=new THREE.Vector3(),moonDir=new THREE.Vector3(-.5,.9,.35).normalize();
const RN=isTouch?900:1600,rainArr=new Float32Array(RN*6),rx=[],ry=[],rz=[];
for(let i=0;i<RN;i++){rx.push(rnd(-48,48));ry.push(rnd(0,40));rz.push(rnd(-48,48));}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainArr,3));
const rainMat=new THREE.LineBasicMaterial({color:'#b9c6d0',transparent:true,opacity:0,depthWrite:false});
const rainLines=new THREE.LineSegments(rainGeo,rainMat);rainLines.frustumCulled=false;scene.add(rainLines);
const roadBase=new THREE.Color('#ffffff'),roadWet=new THREE.Color('#8f959b');
export function updateSky(dt,now){
  const tod=G.min%1440,a=(tod-360)/780*Math.PI,sunH=Math.sin(a);
  const day=clamp(sunH*2.2+.12,0,1);G.night=1-day;
  const dusk=(tod>300&&tod<1260)?clamp(1-Math.abs(sunH)*3,0,1):0;
  G.rain+=(G.rainTarget-G.rain)*Math.min(1,dt*.35);G.wet=clamp(G.wet+(G.rain>.3?.12:-.015)*dt,0,1);
  tmpC.copy(C.night).lerp(C.day,day).lerp(C.dusk,dusk*.55).lerp(C.rain,G.rain*.55*day);
  scene.background.copy(tmpC);scene.fog.color.copy(tmpC);
  const haze=tod>300&&tod<600?clamp(1-Math.abs(tod-420)/180,0,1):0;scene.fog.near=118-haze*22-G.rain*10;scene.fog.far=235-haze*45-G.rain*25;   // morning haze, rain
  sunDir.set(Math.cos(a)*.85,Math.max(sunH,.1)+.12,.45).normalize().lerp(moonDir,G.night).normalize();
  sun.position.copy(camTarget).addScaledVector(sunDir,110);sun.target.position.copy(camTarget);
  sun.intensity=day*(1.9-G.rain*1.1-haze*.35)+G.night*.28;sun.color.copy(C.moon).lerp(C.sunDay,day).lerp(C.sunLow,dusk*.7);
  hemi.intensity=.2+day*(.44-G.rain*.1);hemi.color.copy(C.hemiNight).lerp(C.hemiDay,day);
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
