import {rand,R,pickS} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {S,box,scaleUV,unitBox,trunkMat,whiteMat,leafMats,darkMetal,lampHeadMat,glowMat,woodMat,oliveMat,blackMat} from './materials.js';
import {CORR} from './textures.js';
import {solid,solids} from './collision.js';

// ---------- props ----------
// cars, trash piles and benches a Tyrant can flatten (systems/obstacles.js); registering them never calls rand()
export const breakables=[];
function breakable(kind,n0,x,z){breakables.push({kind,x,z,meshes:scene.children.slice(n0),box:solids[solids.length-1],broken:false});}
const trunkGeo=new THREE.CylinderGeometry(.11,.17,2.6,6);trunkGeo.translate(0,1.3,0);
const paintGeo=new THREE.CylinderGeometry(.18,.19,.85,8);paintGeo.translate(0,.42,0);
const branchGeo=new THREE.CylinderGeometry(.025,.06,1.5,4);branchGeo.translate(0,.75,0);
const canopyGeo=new THREE.IcosahedronGeometry(1.4,0);
export function tree(x,z,bare){
  const g=new THREE.Group();g.position.set(x,groundY(x,z),z);
  const t=new THREE.Mesh(trunkGeo,trunkMat);t.castShadow=true;g.add(t);g.add(new THREE.Mesh(paintGeo,whiteMat));
  if(bare){const n=4+Math.floor(rand()*3);for(let i=0;i<n;i++){const b=new THREE.Mesh(branchGeo,trunkMat);b.position.y=2.2+rand()*.4;b.rotation.set(R(.4,1.0),R(0,6.28),0,'YXZ');b.castShadow=true;g.add(b);}}
  else{for(let i=0;i<2;i++){const c=new THREE.Mesh(canopyGeo,pickS(leafMats));c.position.set(R(-.4,.4),3.2+i*.7,R(-.4,.4));c.scale.setScalar(R(.8,1.15));c.castShadow=true;g.add(c);}}
  scene.add(g);solid(x,z,.22,.22);
}
const poleGeo=new THREE.CylinderGeometry(.07,.09,5.2,6);poleGeo.translate(0,2.6,0);
export function lamp(x,z,ux,uz){
  const g=new THREE.Group();g.position.set(x,0.18,z);g.rotation.y=Math.atan2(ux,uz);
  const p=new THREE.Mesh(poleGeo,darkMetal);p.castShadow=true;g.add(p);
  const a=new THREE.Mesh(unitBox,darkMetal);a.scale.set(.08,.08,1.7);a.position.set(0,5.15,.85);g.add(a);
  const h=new THREE.Mesh(unitBox,lampHeadMat);h.scale.set(.32,.14,.6);h.position.set(0,5.08,1.65);g.add(h);scene.add(g);
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(11,11),glowMat);gl.rotation.x=-Math.PI/2;gl.position.set(x+ux*1.7,0.06,z+uz*1.7);scene.add(gl);
  solid(x,z,.18,.18);
}
const carCols=['#6c7a84','#8a3a30','#c8c2b4','#2f3a46','#5a6448','#9a8a62','#3b3b3b'];
const policeBlue=S({color:'#1f3a6e',roughness:.5,metalness:.35}),policeWhite=S({color:'#dfe2e6',roughness:.5,metalness:.35});
export const sirenR=S({color:'#ff3b2a',emissive:'#ff3b2a',emissiveIntensity:0}),sirenB=S({color:'#3b7bff',emissive:'#3b7bff',emissiveIntensity:0});
export function car(x,z,alongX,police){
  const n0=scene.children.length;
  const m=police?policeWhite:S({color:pickS(carCols),roughness:.5,metalness:.35});const w=alongX?4.2:1.9,d=alongX?1.9:4.2;
  box(m,w,1.0,d,x,0.62,z);
  if(police){box(policeBlue,alongX?4.22:1.92,.28,alongX?1.92:4.22,x,.62,z);box(sirenR,alongX?.18:.5,.14,alongX?.5:.18,x+(alongX?-.1:-.0),1.86,z+(alongX?-.28:-.1));box(sirenB,alongX?.18:.5,.14,alongX?.5:.18,x+(alongX?.1:0),1.86,z+(alongX?.28:.1));}
  box(S({color:'#1d2226',roughness:.2,metalness:.6}),alongX?2.2:1.7,.7,alongX?1.7:2.2,x+(alongX?-.2:0),1.45,z+(alongX?0:-.2));
  for(const s of [-1,1])for(const t of [-1,1]){const wx=alongX?s*1.35:t*.95,wz=alongX?t*.95:s*1.35;box(darkMetal,alongX?.6:.25,.6,alongX?.25:.6,x+wx,.3,z+wz,false);}
  solid(x,z,w/2,d/2);breakable('car',n0,x,z);
}
// abandoned ambulance (no rand(): it is placed after the seeded city is built)
export function ambulance(x,z,alongX){
  const w=alongX?4.6:2.1,d=alongX?2.1:4.6,white=S({color:'#e6e6e2',roughness:.5,metalness:.2}),red=S({color:'#b3362b',roughness:.5});
  box(white,w,1.7,d,x,1.07,z);box(red,alongX?4.62:2.12,.3,alongX?2.12:4.62,x,.75,z);
  box(S({color:'#1d2226',roughness:.2,metalness:.6}),alongX?.1:1.8,.6,alongX?1.8:.1,x+(alongX?2.31:0),1.35,z+(alongX?0:2.31));
  box(sirenR,alongX?.2:.6,.14,alongX?.6:.2,x+(alongX?1.6:-.0),2,z+(alongX?-.0:1.6));box(sirenB,alongX?.2:.6,.14,alongX?.6:.2,x+(alongX?1.6:0),2,z+(alongX?.0:1.6));
  for(const s of [-1,1])for(const t of [-1,1]){const wx=alongX?s*1.5:t*.98,wz=alongX?t*.98:s*1.5;box(darkMetal,alongX?.6:.25,.6,alongX?.25:.6,x+wx,.3,z+wz,false);}
  solid(x,z,w/2,d/2);
}
export function armyTruck(x,z){
  box(oliveMat,6.2,2.4,2.5,x-.6,1.55,z);box(oliveMat,1.9,1.9,2.4,x+3.2,1.3,z);box(S({color:'#1d2226',roughness:.2,metalness:.6}),.1,.7,2,x+4.16,1.7,z);
  for(const px of [-2.6,-.8,3.2])for(const s of [-1,1])box(blackMat,.9,.9,.3,x+px,.45,z+s*1.2,false);
  solid(x+.35,z,3.75,1.3);
}
const containerCols=['#7a4a30','#5e6a72','#8a6a3a','#4a5a4a','#934a35'];
export function container(x,z,alongX,y){
  const w=alongX?6:2.4,d=alongX?2.4:6,h=2.6;
  const geo=scaleUV(new THREE.BoxGeometry(w,h,d),f=>[(f<2?d:w)/3,1]);
  const m=new THREE.Mesh(geo,S({map:CORR,color:pickS(containerCols),roughness:.75,metalness:.25}));
  m.position.set(x,(y||0.18)+h/2,z);m.castShadow=m.receiveShadow=true;scene.add(m);if(!y)solid(x,z,w/2,d/2);
}
export function bench(x,z,alongX){const n0=scene.children.length;box(woodMat,alongX?1.8:.5,.08,alongX?.5:1.8,x,.62,z);box(darkMetal,alongX?1.8:.08,.5,alongX?.08:1.8,x+(alongX?0:-.22),.9,z+(alongX?-.22:0));box(darkMetal,alongX?1.5:.4,.4,alongX?.4:1.5,x,.38,z,false);solid(x,z,alongX?.9:.3,alongX?.3:.9);breakable('bench',n0,x,z);}
export function trash(x,z){const n0=scene.children.length,n=2+Math.floor(rand()*4);for(let i=0;i<n;i++)box(S({color:pickS(['#1f2224','#2c3530','#3a3226'])}),R(.4,.7),R(.35,.55),R(.4,.7),x+R(-.8,.8),.4,z+R(-.8,.8));solid(x,z,.9,.9);breakable('trash',n0,x,z);}
