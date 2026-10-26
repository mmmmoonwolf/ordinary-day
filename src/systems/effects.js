import {rnd} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {bloodMat} from '../world/materials.js';
import {boomLight} from '../core/renderer.js';
import {send} from '../core/bus.js';
import {playLocal} from './audio.js';

// ---------- effects ----------
// blood, tracers and blasts made by the game are also sent to the other devices (v0.11, core/bus.js)
export const blood=[];
export function addBlood(x,z){send('*','fx',['blood',x,z]);const g=new THREE.CircleGeometry(rnd(.35,.7),9);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,bloodMat);m.position.set(x+rnd(-.3,.3),groundY(x,z)+.012,z+rnd(-.3,.3));m.scale.set(1,1,rnd(.6,1.3));m.receiveShadow=true;scene.add(m);blood.push(m);if(blood.length>80){const o=blood.shift();scene.remove(o);o.geometry.dispose();}}
export const ring=new THREE.Mesh(new THREE.RingGeometry(.48,.62,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#e2a64a',transparent:true,opacity:.75,depthWrite:false}));scene.add(ring);
export const alertRing=new THREE.Mesh(new THREE.RingGeometry(.9,1.15,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ff5a48',transparent:true,opacity:0,depthWrite:false}));scene.add(alertRing);
export const warnRing=new THREE.Mesh(new THREE.RingGeometry(.92,1,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ff4a3a',transparent:true,opacity:0,depthWrite:false}));scene.add(warnRing);
export const blast=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),new THREE.MeshBasicMaterial({color:'#ffb066',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));blast.userData.t=0;scene.add(blast);
export const tracers=[];for(let i=0;i<20;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#ffd38a',transparent:true,opacity:0,depthWrite:false}));l.frustumCulled=false;scene.add(l);tracers.push({l,t:0});}
let tri=0;
export function tracer(x0,z0,x1,z1,col){send('*','fx',['tracer',x0,z0,x1,z1,col]);const tr=tracers[tri++%tracers.length];const a=tr.l.geometry.attributes.position.array;a[0]=x0;a[1]=1.36;a[2]=z0;a[3]=x1;a[4]=1.3;a[5]=z1;tr.l.geometry.attributes.position.needsUpdate=true;tr.l.material.color.set(col||'#ffd38a');tr.t=.07;}
// an explosion flash: the sphere for t seconds and, when given, the orange light
export function boom(x,y,z,t,light){send('*','fx',['boom',x,y,z,t,light]);if(hooks.boom)hooks.boom(x,z,t);blast.position.set(x,y,z);blast.userData.t=t;if(light){boomLight.position.set(x,2,z);boomLight.intensity=light;}}
// v0.23 burning ground (systems/blast.js): flickering flame sprites and a scorch, also on the other devices; fireSpots
// is what the fire sound follows (systems/audio.js)
export const fireSpots=[];
let flameMat=null,flameT=null;
const flameTex=()=>flameT||(flameT=drawFlame());
const drawFlame=()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,40,2,32,36,30);gr.addColorStop(0,'rgba(255,240,180,1)');gr.addColorStop(.35,'rgba(255,150,40,.9)');gr.addColorStop(1,'rgba(160,30,0,0)');g.fillStyle=gr;g.beginPath();g.ellipse(32,36,22,28,0,0,7);g.fill();const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;};
export function fireFx(x,z,r,sec){
  send('*','fx',['fire',x,z,r,sec]);
  if(!flameMat)flameMat=new THREE.SpriteMaterial({map:flameTex(),color:new THREE.Color('#ff8a3a').convertSRGBToLinear(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const g=new THREE.Group(),y=groundY(x,z),n=Math.round(5+r*3),fl=[];
  for(let i=0;i<n;i++){const s=new THREE.Sprite(flameMat),a=Math.random()*6.28,d=Math.sqrt(Math.random())*r*.85;s.position.set(x+Math.cos(a)*d,y+.4,z+Math.sin(a)*d);s.userData.ph=Math.random()*6.28;s.userData.y0=y;s.userData.k=.6+Math.random()*.7;g.add(s);fl.push(s);}
  const sc=new THREE.Mesh(new THREE.CircleGeometry(r,16).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#0c0a08',transparent:true,opacity:.7,depthWrite:false}));sc.position.set(x,y+.016,z);g.add(sc);
  scene.add(g);fireSpots.push({x,z,r,t:sec,g,fl});
}
export function updateFireFx(dt,now){
  for(let i=fireSpots.length-1;i>=0;i--){const f=fireSpots[i];f.t-=dt;const fade=Math.min(1,f.t/1.5);
    if(f.t<=0){scene.remove(f.g);fireSpots.splice(i,1);continue;}
    for(const s of f.fl){const k=s.userData.k*fade*(.75+.25*Math.sin(now/90+s.userData.ph));s.scale.set(.9*k,1.5*k,1);s.position.y=s.userData.y0+.45*k+.1;}}
}
export function clearFireFx(){for(let i=fireSpots.length-1;i>=0;i--){const f=fireSpots[i];if(f.keep)continue;scene.remove(f.g);fireSpots.splice(i,1);}}
// v0.26 flames that never go out (the camp's fire and torches): drawn here on every device, not sent
export function staticFlames(x,z,r,col,h=0){
  const m=new THREE.SpriteMaterial({map:flameTex(),color:new THREE.Color(col).convertSRGBToLinear(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const g=new THREE.Group(),fl=[],n=Math.max(2,Math.round(3+r*4));
  for(let i=0;i<n;i++){const s=new THREE.Sprite(m),a=Math.random()*6.28,d=Math.sqrt(Math.random())*r*.7;s.position.set(x+Math.cos(a)*d,h+.4,z+Math.sin(a)*d);s.userData.ph=Math.random()*6.28;s.userData.k=(.5+Math.random()*.5)*Math.min(1,.4+r);s.userData.y0=h;g.add(s);fl.push(s);}
  scene.add(g);fireSpots.push({x,z,r,t:Infinity,g,fl,keep:true,camp:true});
}
// ---------- impacts (v0.31) ----------
// A hit on a zombie throws a spray of blood the way the blow or the bullet went (sparks off the front of an armoured
// one), more on a kill, with a wet thud; sent to every device. ui/feel.js hangs the hit marker, the camera shake and the
// hit stop for the player who landed it on hooks.impact (no import the other way round).
// k: 0 a hit, 1 a kill, 2 stopped by armour; by: the player's id (-1 for none); melee: a blow, not a bullet
export const hooks={impact:null,boom:null};
const DROPS=[],dropGeo=new THREE.BoxGeometry(.06,.06,.06),dropMats=[new THREE.MeshBasicMaterial({color:'#7a1010'}),new THREE.MeshBasicMaterial({color:'#ffe2a0'})];
for(let i=0;i<90;i++){const m=new THREE.Mesh(dropGeo,dropMats[0]);m.visible=false;m.frustumCulled=false;scene.add(m);DROPS.push({m,vx:0,vy:0,vz:0,t:0});}
let dropI=0,lastSplat=0;
export function impact(x,z,dx,dz,k,by,melee){
  send('*','fx',['impact',x,z,dx,dz,k,by,melee]);
  const n=k===1?14:k===2?6:melee?8:4,spark=k===2,l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
  for(let i=0;i<n;i++){const d=DROPS[dropI++%DROPS.length],s=rnd(1.2,spark?5:3.6);d.m.material=dropMats[spark?1:0];d.m.visible=true;d.t=rnd(.35,.6);
    d.m.position.set(x+dx*.2,rnd(.9,1.4),z+dz*.2);d.vx=dx*s+rnd(-1.2,1.2);d.vz=dz*s+rnd(-1.2,1.2);d.vy=rnd(.6,2.8);d.m.scale.setScalar(rnd(.6,1.6));}
  const now=performance.now();if(now-lastSplat>45){lastSplat=now;playLocal('splat',x,z,k);}
  if(hooks.impact)hooks.impact(x,z,k,by,melee);
}
export function updateImpacts(dt){
  for(const d of DROPS){if(!d.m.visible)continue;d.t-=dt;d.vy-=9.8*dt;const p=d.m.position;p.x+=d.vx*dt;p.y+=d.vy*dt;p.z+=d.vz*dt;
    if(d.t<=0||p.y<groundY(p.x,p.z)+.02)d.m.visible=false;}
}
export const FX={blood:addBlood,tracer,boom,fire:fireFx,impact};
