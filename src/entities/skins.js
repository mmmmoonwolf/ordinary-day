import {clamp} from '../core/util.js';
import {camera} from '../core/renderer.js';
import {DEF} from '../config/items.js';
import {ZC} from '../config/zombies.js';
import {curWeapon} from '../systems/inventory.js';
import {agents} from './agents.js';
import {players} from './player.js';

// ---------- character models (v0.13) ----------
// People, players and zombies wear Quaternius' Ultimate Modular Men / Women characters (CC0; built into
// assets/characters/ by tools/build-characters.mjs). They share one rig, so the clips in anims.glb play on all of
// them. Zombies are the same people: grey-green skin, dulled clothes, arms out, so a bitten person turns in their
// own clothes. Until the models have loaded, on "low" graphics, or if they fail to load, everyone keeps the old
// blocky body (a.b), which also stays underneath, hidden, for the animation code that still writes to it.
// The game logic never reads any of this: the model only follows the agent's state (a.sk).
const LIBS=['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js'];
const BASE='assets/characters/';
const CIVS=['m_casual','m_hoodie','m_beach','m_suit','m_worker','m_farmer','m_punk','f_casual','f_formal','f_suit','f_worker','f_punk'];
const PLAYERS=['m_adventurer','f_adventurer','m_adventurer','f_adventurer'];
const PLAYER_TINT=[null,null,'#3d6fb6','#4f8f4a'];   // players 3 and 4 wear the same outfits in other colours
const MODELS=[...new Set([...CIVS,...PLAYERS,'m_swat','f_soldier'])];
const HEIGHT=1.85;   // m, like the blocky bodies
export const skins={ready:false,failed:false,loaded:0,total:MODELS.length+1,on:true};
const tpl={};let clips={};
function script(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error(src));document.head.appendChild(s);});}
export async function loadSkins(onProgress){
  if(skins.ready||!document.head||!window.WebGLRenderingContext)return;
  try{
    for(const s of LIBS)if(!(s.includes('GLTF')?THREE.GLTFLoader:THREE.SkeletonUtils))await script(s);
    const gl=new THREE.GLTFLoader(),load=u=>new Promise((ok,no)=>gl.load(BASE+u+'.glb',ok,undefined,no));
    const step=()=>{skins.loaded++;if(onProgress)onProgress(skins);};
    const an=await load('anims');for(const c of an.animations)clips[c.name]=c;step();
    await Promise.all(MODELS.map(async id=>{const g=await load(id);tpl[id]=prepare(g.scene);step();}));
    skins.ready=true;
  }catch(e){skins.failed=true;console.warn('character models: '+e.message);}
  if(onProgress)onProgress(skins);
}
// scale to HEIGHT from the bind pose (the head bone), shadows on
function prepare(scene){
  scene.updateMatrixWorld(true);let head=null;scene.traverse(o=>{if(o.isBone&&o.name==='Head')head=o;});
  const v=new THREE.Vector3();if(head)head.getWorldPosition(v);const k=head&&v.y>.5?HEIGHT/(v.y+.25):1;
  const g=new THREE.Group();g.add(scene);scene.scale.multiplyScalar(k);
  scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
  return g;
}
// which outfit: players by number, police zombies in SWAT gear, everyone else from the town (by nid, so every
// device online dresses the same character the same way)
function pick(a){
  if(a.state==='player')return PLAYERS[a.id%PLAYERS.length];
  if(a.kind==='armor')return 'm_swat';
  if(a.kind==='tyrant')return 'm_worker';
  if(a.kind==='boomer')return 'm_farmer';
  if(a.state==='zombie'&&a.nid%9===0)return 'f_soldier';
  return CIVS[a.nid%CIVS.length];
}
export function dress(a){
  if(a.sk||!skins.ready||!skins.on)return;
  const id=pick(a),o=THREE.SkeletonUtils.clone(tpl[id]),bones={},mats=[];
  o.traverse(x=>{
    if(x.isBone)bones[x.name]=x;
    if(x.isMesh){x.material=[].concat(x.material).map(m=>{m=m.clone();m.userData.base=m.color.clone();mats.push(m);return m;});if(x.material.length===1)x.material=x.material[0];}
  });
  if(a.state==='player'&&PLAYER_TINT[a.id%PLAYER_TINT.length])for(const m of mats)if(!/Skin|Hair|Eye|Brow|Black/i.test(m.name)){m.color.lerp(new THREE.Color(PLAYER_TINT[a.id%PLAYER_TINT.length]),.55);m.userData.base.copy(m.color);}
  a.b.root.add(o);a.b.body.visible=false;
  a.sk={o,id,bones,mats,mixer:new THREE.AnimationMixer(o),clip:'',act:null,zombie:false,flash:false,acc:0,swell:1};
  if(a.state==='zombie'||a.state==='dead'&&a.kind)zombify(a);
  if(a.state==='player')a.heldId=null;   // the weapon goes into the model's hand (syncHeld)
}
// graphics quality "low" goes back to the blocky people; anything else puts the models back on as they are drawn
export function setSkinsOn(on){
  skins.on=on;if(on)return;
  for(const a of agents)undress(a);for(const p of players)undress(p);
}
export function undress(a){
  const s=a.sk;if(!s)return;
  s.mixer.stopAllAction();a.b.root.remove(s.o);for(const m of s.mats)m.dispose();
  a.b.body.visible=true;a.sk=null;if(a.state==='player')a.heldId=null;
}
// a bitten person turning, or a zombie changing class at dusk: same clothes, zombie colours
export function zombify(a){
  const s=a.sk;if(!s)return;s.zombie=true;
  const skin=new THREE.Color(a.kind&&ZC[a.kind]?ZC[a.kind].skin:'#8fa37a'),dirt=new THREE.Color('#4a3d33');
  for(const m of s.mats){if(/Skin/i.test(m.name))m.color.copy(skin);else m.color.copy(m.userData.base).multiplyScalar(.62).lerp(dirt,.25);}
}
// once a frame per agent, after animate() has placed the root
const CLIPS={walk:'Walk',run:'Run',idle:'Idle',die:'Death',hit:'HitRecieve',shoot:'Gun_Shoot',gunIdle:'Idle_Gun',gunRun:'Run_Shoot',use:'Interact',punch:'Punch_Right',slash:'Sword_Slash'};
const frustum=new THREE.Frustum(),pv=new THREE.Matrix4(),sphere=new THREE.Sphere();
// once a frame, before the agents: what the camera sees
export function beginSkins(){if(!skins.ready)return;pv.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(pv);}
export function skinFrame(a,dt){
  const s=a.sk;
  sphere.center.set(a.pos.x,1,a.pos.z);sphere.radius=2.5;
  const seen=frustum.intersectsSphere(sphere);s.o.visible=seen;
  s.acc+=dt;if(!seen&&s.acc<.25)return;   // off screen: catch up four times a second
  const step=s.acc;s.acc=0;
  let clip='idle',speed=1,once=false;
  const dead=a.state==='dead'||(a.state==='player'&&!a.alive);
  if(dead||a.bleed>0||a.down>0){clip='die';once=true;}
  else if(a.state==='player'){
    const w=curWeapon(a),def=DEF[w.id];
    if(a.swing>0){clip=w.id==='fist'?'punch':'slash';speed=CLIPS_LEN[clip]/Math.max(.2,a.swingDur);}
    else if(a.reloadT>0)clip='use';
    else if(a.moving>.3){clip=def.gun?'gunRun':a.moving>4?'run':'walk';speed=clip==='walk'?clamp(a.moving/1.5,.5,2):clamp(a.moving/5.5,.6,1.6);}
    else clip=def.gun?(a.recoil>.3?'shoot':'gunIdle'):'idle';
  }
  else if(a.state==='zombie'){
    if(a.wind>0)clip='slash';
    else if(a.swingT>0)clip='punch';
    else if(a.moving>.3){const run=a.moving>3.2;clip=run?'run':'walk';speed=run?clamp(a.moving/5.5,.6,1.5):clamp(a.moving/2.2,.35,1.2);}
  }
  else if(a.moving>.3){const run=a.panic>0||a.moving>2.6;clip=run?'run':'walk';speed=run?clamp(a.moving/5.5,.6,1.5):clamp(a.moving/1.5,.5,1.4);}
  if(a.swingT>0)a.swingT-=step;
  play(s,clip,speed,once);
  s.mixer.update(step);
  // zombies: arms reaching forward, head hanging (on top of the clip, not while striking or dead)
  const b=s.bones;
  if(s.zombie&&!dead&&clip!=='slash'&&clip!=='punch'&&b.UpperArmL){b.UpperArmL.rotation.z-=1.25;b.UpperArmR.rotation.z+=1.25;b.LowerArmL.rotation.z-=.2;b.LowerArmR.rotation.z+=.2;b.Head.rotation.x+=.3;}
  // a bitten person going grey before turning
  if(a.state==='infected'){const k=clamp(1-a.turnT/8,0,1),sk=new THREE.Color(ZC.walker.skin);for(const m of s.mats)if(/Skin/i.test(m.name))m.color.copy(m.userData.base).lerp(sk,k);}
  // hit: red flash · Boomer about to burst: swelling
  const fl=a.hitT>0?Math.max(0,a.hitT)*4:a.kind==='boomer'&&a.fuse>0?.5+.5*Math.sin((1.2-a.fuse)*30):0;
  if(fl>0||s.flash){for(const m of s.mats)m.emissive.setRGB(fl,0,a.fuse>0?fl:0);s.flash=fl>0;}
  const sw=a.kind==='boomer'&&a.fuse>0?1+(1.2-a.fuse)*.22:1;if(sw!==s.swell){s.swell=sw;s.o.scale.setScalar(sw);}
}
const CLIPS_LEN={punch:.83,slash:1.03};
function play(s,clip,speed,once){
  if(s.clip!==clip){
    const c=clips[CLIPS[clip]];if(!c)return;
    const act=s.mixer.clipAction(c);act.reset();act.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat);act.clampWhenFinished=once;
    act.play();if(s.act)act.crossFadeFrom(s.act,once?.15:.25,false);s.act=act;s.clip=clip;
  }
  s.act.timeScale=speed;
}
// the hand the held weapon goes in (players)
export const handOf=a=>a.sk?a.sk.bones.WristR:null;
