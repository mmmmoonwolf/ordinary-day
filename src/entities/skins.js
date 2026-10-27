import {clamp} from '../core/util.js';
import {activeCam} from '../core/renderer.js';
import {loadGltf} from '../core/gltf.js';
import {DEF} from '../config/items.js';
import {ZC,RISE} from '../config/zombies.js';
import {curWeapon} from '../systems/inventory.js';
import {agents} from './agents.js';
import {players,HAND} from './player.js';
import {lookKey} from '../core/profile.js';

// ---------- character models (v0.13) ----------
// People, players and zombies wear Quaternius' Ultimate Modular Men / Women characters (CC0; built into
// assets/characters/ by tools/build-characters.mjs). They share one rig, so the clips in anims.glb play on all of
// them. Zombies are the same people: grey-green skin, dulled clothes, arms out, so a bitten person turns in their
// own clothes. Until the models have loaded, on "low" graphics, or if they fail to load, everyone keeps the old
// blocky body (a.b), which also stays underneath, hidden, for the animation code that still writes to it.
// The game logic never reads any of this: the model only follows the agent's state (a.sk).
// v0.27 zombies move with Mixamo's zombie clips (Z_*, retargeted into anims.glb by tools/mixamo-clips.mjs): a hunched
// shamble, a lurching run, a punch, the Tyrant's two-armed slam, a flinch when hit, a fall on the back when killed, and
// a bitten person getting back up as a zombie. Without them (an older anims.glb) zombies use the people's clips as before.
// v0.39 players move with Mixamo clips too (P_*): a gun held ready while walking, running, stepping back or sideways and
// kneeling, a hop over obstacles, and on top of the legs an upper-body layer for shooting, reloading and melee swings
// (layer()). Without them players keep the Quaternius clips.
const BASE='assets/characters/';
const CIVS=['m_casual','m_hoodie','m_beach','m_suit','m_worker','m_farmer','m_punk','f_casual','f_formal','f_suit','f_worker','f_punk'];
const PLAYERS=['m_adventurer','f_adventurer','m_adventurer','f_adventurer'];
const PLAYER_TINT=[null,null,'#3d6fb6','#4f8f4a'];   // players 3 and 4 wear the same outfits in other colours
const MODELS=[...new Set([...CIVS,...PLAYERS,'m_swat','f_soldier'])];
const HEIGHT=1.85;   // m, like the blocky bodies
export const skins={ready:false,failed:false,loaded:0,total:MODELS.length+1,on:true};
const tpl={};let clips={};
export async function loadSkins(onProgress){
  if(skins.ready||!document.head||!window.WebGLRenderingContext)return;
  try{
    const load=u=>loadGltf(BASE+u+'.glb');
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
  const {o,bones,mats,id}=build(a);
  a.b.root.add(o);a.b.body.visible=false;
  a.sk={o,id,bones,mats,mixer:new THREE.AnimationMixer(o),clip:'',act:null,zombie:false,flash:false,acc:0,swell:1,react:0};
  if(a.state==='zombie'||a.state==='dead'&&a.kind)zombify(a);
  if(a.state==='player')a.heldId=null;   // the weapon goes into the model's hand (syncHeld)
}
// a copy of an outfit with its own materials (players 3 and 4 in other colours)
function outfit(a,id){
  const o=THREE.SkeletonUtils.clone(tpl[id]),bones={},mats=[];
  o.traverse(x=>{
    if(x.isBone)bones[x.name]=x;
    if(x.isMesh){x.material=[].concat(x.material).map(m=>{m=m.clone();m.userData.base=m.color.clone();mats.push(m);return m;});if(x.material.length===1)x.material=x.material[0];}
  });
  if(a.state==='player'&&!a.wear&&PLAYER_TINT[a.id%PLAYER_TINT.length])for(const m of mats)if(!/Skin|Hair|Eye|Brow|Black/i.test(m.name)){m.color.lerp(new THREE.Color(PLAYER_TINT[a.id%PLAYER_TINT.length]),.55);m.userData.base.copy(m.color);}
  return {o,bones,mats};
}
// v0.41 a player's own character (p.wear, a look from core/profile.js; p.look is the blocky body's): the top's outfit gives the skeleton (and a backpack that goes with
// it); the head, legs and feet of other outfits of the same body are moved onto it and bound to its bones (every outfit has
// the same rig), then the colours go over them
const PART=/^(.+_(Body|Head|Legs|Pants|Feet)|Backpack)$/,slotOf=n=>/Head$/.test(n)?'hd':/(Legs|Pants)$/.test(n)?'lg':/Feet$/.test(n)?'ft':'bd';
const partsOf=o=>{const out=[];o.traverse(x=>{if(PART.test(x.name))out.push(x);});return out;};
function assemble(a,L){
  const {o,bones}=outfit(a,L.bd),byName={};o.traverse(x=>{byName[x.name]=x;});
  for(const slot of ['hd','lg','ft']){
    if(L[slot]===L.bd||!tpl[L[slot]])continue;
    for(const x of partsOf(o))if(slotOf(x.name)===slot)x.parent.remove(x);
    for(const x of partsOf(outfit(a,L[slot]).o)){
      if(slotOf(x.name)!==slot)continue;
      const to=byName[x.parent.name]||o;
      x.traverse(m=>{if(m.isSkinnedMesh)m.bind(new THREE.Skeleton(m.skeleton.bones.map(b=>bones[b.name]||b),m.skeleton.boneInverses),m.bindMatrix);});
      to.add(x);
    }
  }
  paint(o,L);
  const mats=[];o.traverse(x=>{if(x.isMesh)for(const m of [].concat(x.material))if(!mats.includes(m))mats.push(m);});
  return {o,bones,mats};
}
const lin=hex=>new THREE.Color(hex).convertSRGBToLinear();
// skin everywhere; the shirt, the trousers and the hair (or hat) are each the biggest coloured piece of their part, or the
// one named in MAIN where that is something else (the woman explorer's biggest piece of the legs is a belt pouch)
const MAIN={f_adventurer:{lg:'Brown_02'}};
function paint(o,L){
  const c=L.c||{};
  for(const x of partsOf(o)){
    const ms=[];x.traverse(m=>{if(m.isMesh&&!Array.isArray(m.material))ms.push(m);});
    if(c.skin)for(const m of ms)if(/Skin/i.test(m.material.name)){m.material.color.copy(lin(c.skin));m.material.userData.base.copy(m.material.color);}
    const slot=slotOf(x.name),want=x.name==='Backpack'?null:slot==='bd'?c.shirt:slot==='lg'?c.pants:slot==='hd'?c.hair:null;if(!want)continue;
    let best=null,most=0;const named=MAIN[L[slot]]&&MAIN[L[slot]][slot];
    for(const m of ms){if(named?m.material.name!==named:/Skin|Eye|Earring|Visor/i.test(m.material.name))continue;const n=m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count;if(n>most){most=n;best=m.material;}}
    if(best){best.color.copy(lin(want));best.userData.base.copy(best.color);}
  }
}
// what a character wears: a player's own look, else the outfit picked for them
function build(a){
  if(a.state==='player'&&a.wear&&tpl[a.wear.bd])return {...assemble(a,a.wear),id:'look:'+lookKey(a.wear)};
  const id=pick(a);return {...outfit(a,id),id};
}
export const skinId=a=>a.state==='player'&&a.wear?'look:'+lookKey(a.wear):pick(a);
// the creator's turning model (ui/creator.js): the character for a look, standing idle
export function previewModel(look){
  if(!skins.ready)return null;
  const a={state:'player',id:0,wear:look},{o}=build(a),mixer=new THREE.AnimationMixer(o);
  if(clips.Idle)mixer.clipAction(clips.Idle).play();
  return {o,mixer};
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
const CLIPS={walk:'Walk',run:'Run',idle:'Idle',die:'Death',hit:'HitRecieve',shoot:'Gun_Shoot',gunIdle:'Idle_Gun',gunRun:'Run_Shoot',use:'Interact',punch:'Punch_Right',slash:'Sword_Slash',
  zIdle:'Z_Idle',zIdle2:'Z_Idle2',zWalk:'Z_Walk',zWalk2:'Z_Walk2',zRun:'Z_Run',zPunch:'Z_Punch',zSlam:'Z_Attack',zHit:'Z_Hit',zDie:'Z_Fall',zRise:'Z_StandUp',
  pWalk:'P_Walk',pRun:'P_Run',pBack:'P_Back',pSide:'P_Strafe',pAim:'P_Aim',pFire:'P_Fire',pPistol:'P_Pistol',pReload:'P_Reload',pKneel:'P_Kneel',pStab:'P_Stab',pSlash:'P_Slash',pJump:'P_Jump'};
// how fast the zombie clips go at speed 1 (m/s, a 1.85 m model), from the root motion the build took out of them
const ZV={zWalk:.46,zWalk2:.29,zRun:2.67};
// v0.39 the same for the player's clips, and how far they may be sped up (stepping back is a slow step in the clip)
const PV={pWalk:1.2,pRun:4.8,pBack:.29,pSide:.79},PMAX=2.6;
const frustum=new THREE.Frustum(),pv=new THREE.Matrix4(),sphere=new THREE.Sphere(),qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
// once a frame, before the agents: what the camera sees
export function beginSkins(){if(!skins.ready)return;const camera=activeCam();camera.updateMatrixWorld();pv.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(pv);}
export function skinFrame(a,dt){
  const s=a.sk;
  sphere.center.set(a.pos.x,1,a.pos.z);sphere.radius=2.5;
  const seen=frustum.intersectsSphere(sphere);s.o.visible=seen;
  s.acc+=dt;if(!seen&&s.acc<.25)return;   // off screen: catch up four times a second
  const step=s.acc;s.acc=0;
  let clip='idle',speed=1,once=false,up=null;
  const dead=a.state==='dead'||(a.state==='player'&&!a.alive),Z=s.zombie&&clips.Z_Walk;
  s.react-=step;if(a.hitT>.1&&s.react<-.3)s.react=.5;   // a flinch when hit, not again straight away
  if(Z&&dead){clip='zDie';once=true;speed=1.6;}
  else if(dead||a.bleed>0||a.down>0||a.state==='infected'&&a.turnT<RISE.fall){clip='die';once=true;}
  else if(a.state==='player'&&clips.P_Walk){[clip,speed,once]=playerClip(a,s,step);up=upperClip(a,s,step);}
  else if(a.state==='player'){
    const w=curWeapon(a),def=DEF[w.id];
    if(a.swing>0){clip=w.id==='fist'?'punch':'slash';speed=CLIPS_LEN[clip]/Math.max(.2,a.swingDur);}
    else if(a.reloadT>0)clip='use';
    else if(a.moving>.3){clip=def.gun?'gunRun':a.moving>4?'run':'walk';speed=clip==='walk'?clamp(a.moving/1.5,.5,2):clamp(a.moving/5.5,.6,1.6);}
    else clip=def.gun?(a.recoil>.3?'shoot':'gunIdle'):'idle';
  }
  else if(Z){
    const sc=ZC[a.kind]&&ZC[a.kind].scale?ZC[a.kind].scale[1]:1,c=s.clip;
    if(a.rise>0){clip='zRise';once=true;speed=1.5;}
    else if(a.wind>0){clip='zSlam';once=true;speed=1.3;}   // the slam lands as the wind-up ends
    else if(a.swingT>0){clip='zPunch';once=true;speed=1.6;}
    else if(s.react>0){clip='zHit';once=true;speed=1.8;}
    else if(a.moving>(c==='zRun'?1.3:1.6)){clip='zRun';speed=clamp(a.moving/(ZV.zRun*sc),.6,2);}
    else if(a.moving>.3){clip=a.nid%3===0&&a.moving<(c==='zWalk2'?.85:.75)?'zWalk2':'zWalk';speed=clamp(a.moving/(ZV[clip]*sc),.5,2.2);}
    else clip=a.nid%2?'zIdle2':'zIdle';
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
  if(up||s.up)layer(s,up,step);
  s.px=a.pos.x;s.pz=a.pos.z;
  // zombies: arms reaching forward, head hanging (on top of the clip, not while striking or dead)
  const b=s.bones;
  if(s.zombie&&!Z&&!dead&&clip!=='slash'&&clip!=='punch'&&b.UpperArmL){b.UpperArmL.rotation.z-=1.25;b.UpperArmR.rotation.z+=1.25;b.LowerArmL.rotation.z-=.2;b.LowerArmR.rotation.z+=.2;b.Head.rotation.x+=.3;}
  // a gun in the hand points where the player faces whatever the clip does with the wrist (v0.14.1): the run and shoot clips
  // turn the wrist so far that the barrel ended up pointing up or backwards
  if(a.state==='player'&&a.held&&a.held.parent===b.WristR&&DEF[curWeapon(a).id].gun)aimHeld(a.held,b.WristR,a.b.root,a.reloadT>0);
  // a bitten person going grey before turning
  if(a.state==='infected'){const k=clamp(1-a.turnT/8,0,1),sk=new THREE.Color(ZC.walker.skin);for(const m of s.mats)if(/Skin/i.test(m.name))m.color.copy(m.userData.base).lerp(sk,k);}
  // hit: red flash · Boomer about to burst: swelling
  const fl=a.hitT>0?Math.max(0,a.hitT)*4:a.kind==='boomer'&&a.fuse>0?.5+.5*Math.sin((1.2-a.fuse)*30):0;
  if(fl>0||s.flash){for(const m of s.mats)m.emissive.setRGB(fl,0,a.fuse>0?fl:0);s.flash=fl>0;}
  const sw=a.kind==='boomer'&&a.fuse>0?1+(1.2-a.fuse)*.22:1;if(sw!==s.swell){s.swell=sw;s.o.scale.setScalar(sw);}
}
const CLIPS_LEN={punch:.83,slash:1.03};
// the barrel along the way the body faces (tipped up by `tilt`); while reloading (v0.39) it goes with the hands, as they hold it
const xAxis=new THREE.Vector3(1,0,0);
function aimHeld(held,wrist,root,reload,tilt){
  if(reload){held.rotation.set(...HAND.gun);return;}
  wrist.updateWorldMatrix(true,false);root.getWorldQuaternion(qa);wrist.getWorldQuaternion(qb);held.quaternion.copy(qb.invert().multiply(qa));
  if(tilt)held.quaternion.multiply(qa.setFromAxisAngle(xAxis,-tilt));
}
// v0.39 arms in front of the first-person camera (ui/fps.js): the player's own outfit with the head and legs folded away
// (their bones scaled to nothing), playing the same clips as the body seen from above. Null until the models and the
// player's clips have loaded, or on "low" graphics.
const MELEE_UP=.9;   // rad
export function makeArms(p){
  if(!skins.ready||!skins.on||!clips.P_Aim)return null;
  const {o,bones,mats,id}=build(p);
  o.traverse(x=>{if(x.isMesh){x.castShadow=false;x.renderOrder=10;}});
  for(const k of ['Head','UpperLegL','UpperLegR'])if(bones[k])bones[k].scale.setScalar(1e-3);
  return {o,id,p,bones,mats,mixer:new THREE.AnimationMixer(o),clip:'',act:null,up:null,held:null,heldId:null};
}
export function dropArms(s){if(!s)return;s.mixer.stopAllAction();if(s.up)s.up.mixer.stopAllAction();if(s.o.parent)s.o.parent.remove(s.o);for(const m of s.mats)m.dispose();}
// once a frame while the arms are shown: a weapon held ready in both hands (bare fists down, out of sight), the same
// upper-body layer as above (shots, reloads, swings); the weapon in the right hand
export function armsFrame(s,p,dt,makeHeld){
  const w=curWeapon(p),def=DEF[w.id];
  play(s,w.id==='fist'?'idle':'pAim',1,false);s.mixer.update(dt);   // walking only bobs the camera
  layer(s,upperClip(p,s,dt),dt);
  if(w.id!==s.heldId){s.heldId=w.id;if(s.held){s.held.parent.remove(s.held);s.held=null;}if(w.id!=='fist'&&s.bones.WristR){s.held=makeHeld(def);s.bones.WristR.add(s.held);s.held.traverse(o=>{if(o.isMesh){o.castShadow=false;o.renderOrder=10;}});}}
  if(s.held&&def.gun)aimHeld(s.held,s.bones.WristR,s.o,p.reloadT>0);
  else if(s.held)if(p.swing>0)s.held.rotation.set(...HAND.melee);else aimHeld(s.held,s.bones.WristR,s.o,false,MELEE_UP);   // raised, ready to swing
}
// v0.39 the legs of a player: which way they go next to where the player faces (the model's own movement, so the same on
// every device), a gun held ready, kneeling when crouched and still, the hop over something low
function playerClip(a,s,step){
  const def=DEF[curWeapon(a).id];
  if(a.vault||a.airH>.05)return ['pJump',1.4,true];
  if(a.moving>.3&&def.gun){
    const dx=a.pos.x-(s.px??a.pos.x),dz=a.pos.z-(s.pz??a.pos.z),d=Math.hypot(dx,dz);
    if(d>1e-4){s.fwd=(dx*Math.sin(a.face)+dz*Math.cos(a.face))/d;s.side=(dz*Math.sin(a.face)-dx*Math.cos(a.face))/d;}   // side > 0: to the right
    const f=s.fwd??1,sd=s.side||0,v=a.moving;
    if(f<-.5)return ['pBack',clamp(v/PV.pBack,.6,PMAX)];
    if(Math.abs(sd)>.7)return ['pSide',clamp(v/PV.pSide,.6,PMAX)*(sd>0?-1:1)];   // the clip steps to the left; played backwards it goes right
    return v>2.2?['pRun',clamp(v/PV.pRun,.6,1.4)]:['pWalk',clamp(v/PV.pWalk,.5,2)];
  }
  if(a.moving>.3)return a.moving>4?['run',clamp(a.moving/5.5,.6,1.6)]:['walk',clamp(a.moving/1.5,.5,2)];
  if(def.gun)return [a.stance===1?'pKneel':'pAim',1];
  return ['idle',1];
}
// the upper body on top of the legs: a melee swing, a reload, a pistol held out in both hands, the kick of a rifle shot
function upperClip(a,s,step){
  const w=curWeapon(a),def=DEF[w.id];
  if(a.swing>0){
    const clip=w.id==='fist'?'punch':def.verb==='แทง'?'pStab':'pSlash',len=clip==='punch'?CLIPS_LEN.punch:clips[CLIPS[clip]].duration;
    return {clip,speed:len/Math.max(.2,a.swingDur||.4),restart:a.swing>(s.lastSwing||0)+.05,set:()=>s.lastSwing=a.swing};
  }
  s.lastSwing=0;
  const shot=(a.recoil||0)>(s.lastRec||0)+.3;s.lastRec=a.recoil||0;s.fireT=shot&&def.gun?.45:(s.fireT||0)-step;
  if(!def.gun)return null;
  if(a.reloadT>0)return {clip:'pReload',speed:clips.P_Reload.duration/def.reload};
  if(def.slot==='secondary')return {clip:'pPistol',speed:1.4,restart:shot};
  return s.fireT>0?{clip:'pFire',speed:1.6,restart:shot}:null;
}
// upper-body versions of the clips: the spine, arms and head, plus the hips' turn (for the spine, see layer())
const UPPER=/^(Body\.quaternion|(Abdomen|Torso|Chest|Neck|Head|Shoulder|UpperArm|LowerArm|Wrist|Index|Middle|Ring|Pinky|Thumb)[A-Za-z0-9_]*\.quaternion)$/;
const uppers={};
function upperOf(name){const c=clips[name];if(!c)return null;return uppers[name]||(uppers[name]=new THREE.AnimationClip(name+'^',c.duration,c.tracks.filter(t=>UPPER.test(t.name))));}
const qBody=new THREE.Quaternion(),qTmp=new THREE.Quaternion();
// plays the upper-body clip after the legs' mixer and blends it in and out. The clip's spine is kept at the turn it has
// from the clip's own hips (a rifle stance turns the hips one way and the chest back), whatever the legs do with them.
function layer(s,want,step){
  const u=s.up||(s.up={mixer:new THREE.AnimationMixer(s.o),act:null,clip:'',w:0,bones:null,save:null});
  if(!u.bones){u.bones=[];s.o.traverse(o=>{if(o.isBone&&o.name!=='Body'&&UPPER.test(o.name+'.quaternion'))u.bones.push(o);});u.save=u.bones.map(()=>new THREE.Quaternion());}
  if(want&&(want.clip!==u.clip||want.restart)){
    const c=upperOf(CLIPS[want.clip]);
    if(c){const act=u.mixer.clipAction(c);if(u.act&&u.act!==act)u.act.stop();act.reset();act.setLoop(THREE.LoopOnce);act.clampWhenFinished=true;act.play();u.act=act;u.clip=want.clip;}
    if(want.set)want.set();
  }
  u.w+=((want?1:0)-u.w)*Math.min(1,step*(want?14:7));
  if(!u.act)return;
  if(!want&&u.w<.02){u.act.stop();u.act=null;u.clip='';u.w=0;return;}
  if(want)u.act.timeScale=want.speed;
  const body=s.bones.Body,ab=s.bones.Abdomen;if(!body||!ab)return;
  qBody.copy(body.quaternion);u.bones.forEach((b,i)=>u.save[i].copy(b.quaternion));
  u.mixer.update(step);
  ab.quaternion.premultiply(qTmp.copy(qBody).invert().multiply(body.quaternion));body.quaternion.copy(qBody);
  if(u.w<.999)u.bones.forEach((b,i)=>{qTmp.copy(b.quaternion);b.quaternion.copy(u.save[i]).slerp(qTmp,u.w);});
}
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
