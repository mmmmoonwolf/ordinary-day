import {rnd} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {bloodMat} from '../world/materials.js';
import {boomLight} from '../core/renderer.js';
import {send} from '../core/bus.js';

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
export function boom(x,y,z,t,light){send('*','fx',['boom',x,y,z,t,light]);blast.position.set(x,y,z);blast.userData.t=t;if(light){boomLight.position.set(x,2,z);boomLight.intensity=light;}}
export const FX={blood:addBlood,tracer,boom};
