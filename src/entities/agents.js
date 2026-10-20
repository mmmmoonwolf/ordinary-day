import {rnd,pick} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {G} from '../core/state.js';
import {isNightTod} from '../config/time.js';
import {groundY} from '../config/world.js';
import {ZC} from '../config/zombies.js';
import {S,part,eyeMat,vestMat} from '../world/materials.js';
import {nodeXZ,nearestNode,randomNode} from '../world/sidewalk.js';
import {vendorSpots} from '../world/city.js';
import {player} from './player.js';

// ---------- characters ----------
const SHIRTS=['#5f7a8c','#8c4a3e','#c9c2b0','#3f4a3a','#7a6a8a','#a88a4a','#2f3b4f','#9a5a6a','#6b6b6b','#d0c8b8','#476b6b','#b07a52'];
const PANTS=['#2b2f36','#3c3f45','#4a4033','#26303d','#5a5248','#1f2329'];
const SKINS=['#e0b896','#c99a74','#a87a58','#f0caa8','#8a6248'];
const HAIR=['#1c1916','#2e2620','#4a3a2a','#121212','#7a6a5a','#8a8478'];
function makeBody(look){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const mShirt=S({color:look.shirt}),mPants=S({color:look.pants}),mSkin=S({color:look.skin,roughness:.8}),mHair=S({color:look.hair});
  const limb=(x,y,mat,w,h,d)=>{const g=new THREE.Group();g.position.set(x,y,0);g.add(part(mat,w,h,d,0,-h/2,0));body.add(g);return g;};
  const legL=limb(-.13,.86,mPants,.2,.86,.22),legR=limb(.13,.86,mPants,.2,.86,.22);
  const torso=part(mShirt,.52,.64,.3,0,1.17,0);body.add(torso);
  const armL=limb(-.34,1.45,mShirt,.15,.6,.17),armR=limb(.34,1.45,mShirt,.15,.6,.17);
  armL.add(part(mSkin,.13,.14,.14,0,-.66,0));armR.add(part(mSkin,.13,.14,.14,0,-.66,0));
  const head=part(mSkin,.3,.32,.3,0,1.67,0);body.add(head);head.add(part(mHair,1.07,.38,1.07,0,.42,-.06));
  const eyes=new THREE.Group();eyes.add(part(eyeMat,.17,.12,.07,-.23,.06,.52));eyes.add(part(eyeMat,.17,.12,.07,.23,.06,.52));eyes.visible=false;head.add(eyes);
  scene.add(root);
  return {root,body,torso,legL,legR,armL,armR,head,eyes,extra:null,mats:[mShirt,mPants,mSkin,mHair],base:{shirt:mShirt.color.clone(),skin:mSkin.color.clone()}};
}
export const agents=[];
export function makeAgent(x,z,look){
  look=look||{shirt:pick(SHIRTS),pants:pick(PANTS),skin:pick(SKINS),hair:pick(HAIR)};
  const b=makeBody(look);
  return {b,look,pos:{x,z},y:groundY(x,z),face:Math.random()*6.28,moving:0,phase:Math.random()*6,state:'human',kind:null,rad:.34,node:null,prev:null,
    jx:rnd(-.35,.35),jz:rnd(-.35,.35),walk:rnd(1.1,1.6),panic:0,tx:0,tz:0,wait:0,vendor:false,hp:100,feed:0,atk:0,spd:rnd(.9,1.1),
    stuckT:0,lost:0,turnT:0,deadT:0,hitT:0,heard:null,fuse:0,wind:0,retreat:false};
}
export function removeAgent(a){scene.remove(a.b.root);for(const m of a.b.mats)m.dispose();}

// ---------- zombie classes ----------
export function styleZombie(a){
  const c=ZC[a.kind],m=a.b.mats;m[2].color.set(c.skin);
  if(a.kind==='armor'){m[0].color.set('#2b3a57');m[1].color.set('#1f2633');}
  else if(a.kind==='sprinter')m[0].color.set('#9a5a2a');
  else if(a.kind==='tyrant'){m[0].color.set('#3a2a26');m[1].color.set('#2a201c');}
  else if(a.kind==='boomer')m[0].color.set('#5e5368');
  else m[0].color.copy(a.b.base.shirt).multiplyScalar(.5).lerp(new THREE.Color('#3a2a22'),.3);
  const s=c.scale||[1,1,1];a.b.root.scale.set(s[0],s[1],s[2]);a.rad=.34*Math.max(s[0],s[2]);
  a.b.eyes.visible=a.kind!=='walker';
  if(a.kind==='armor'&&!a.b.extra){const g=new THREE.Group();g.add(part(vestMat,.58,.5,.36,0,1.2,0));g.add(part(vestMat,.36,.14,.36,0,1.86,0));a.b.body.add(g);a.b.extra=g;}
  if(a.kind==='tyrant'){a.b.armR.scale.set(1.5,1.25,1.5);a.b.head.scale.set(.26,.26,.26);}
}
export function becomeZombie(a,kind){
  a.state='zombie';a.kind=kind||(isNightTod(G.min%1440)?'zombie':'walker');a.hp=ZC[a.kind].hp;a.maxHp=a.hp;
  a.vendor=false;a.panic=0;a.node=nearestNode(a.pos);a.prev=null;a.spd=rnd(.9,1.1);a.retreat=false;
  styleZombie(a);
}
export function setKind(a,kind){const ratio=a.hp/a.maxHp;a.kind=kind;a.maxHp=ZC[kind].hp;a.hp=Math.max(1,a.maxHp*ratio);styleZombie(a);}
export function zombies(){return agents.filter(a=>a.state==='zombie');}

// ---------- spawning ----------
export function spawnPopulation(){
  for(let k=0;k<36;k++){const n=randomNode();const [x,z]=nodeXZ(n);const a=makeAgent(x+rnd(-2,2),z+rnd(-2,2));a.node=n;agents.push(a);}
  for(const [x,z] of vendorSpots){const a=makeAgent(x,z);a.vendor=true;a.face=Math.PI;agents.push(a);}
}
export function spawnEdge(kind){
  if(agents.length>=95&&kind!=='tyrant')return null;
  for(let tries=0;tries<24;tries++){const n=randomNode();if(n.i!==0&&n.i!==4&&n.j!==0&&n.j!==4&&tries<18)continue;const [x,z]=nodeXZ(n);
    if(Math.hypot(x-player.pos.x,z-player.pos.z)<28&&tries<23)continue;const a=makeAgent(x,z);becomeZombie(a,kind);agents.push(a);return a;}
  return null;
}
