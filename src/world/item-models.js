import {DEF} from '../config/items.js';
import {S,part,gripMat,bladeMat,batMat,pipeMat,blackMat,gunMetal,oliveMat,whiteMat,woodMat} from './materials.js';
import {hasProp,propModel} from './prop-models.js';

// ---------- item models ----------
const GREEN=new THREE.Color(.62,.8,.5);   // v0.43 the 5.56 box (linear)
const mcache={};const cm=c=>mcache[c]||(mcache[c]=S({color:c,roughness:.6}));
// prop models (v0.14), sized like the box models they replace. Guns: the source points its barrel along +x, so it is turned
// to +z; [length, where the hand is from the back]. Knife and axe stand along +y, laid down along +z.
const GUN={pistol:[.32,.12],smg:[.55,.2],rifle:[1.05,.33],shotgun:[1.12,.3],sniper:[1.4,.3],lmg:[1.2,.33],
  // v0.43 the Police and Military guns (DEF[id].look), the same way round
  q_pistol_p:[.3,.16],q_pistol_m:[.32,.16],q_shotgun_p:[1.0,.3],q_shotgun_m:[1.1,.3],q_smg_p:[.6,.3],q_smg_m:[.6,.3],q_rifle_p:[1.0,.33],q_rifle_m:[.92,.33]};
const MELEE={knife:.36,axe:.98};
// v0.18 Weapons Pack models: [prop, length, where the hand is from the back]. They lie flat with the muzzle or head towards
// -z and the gun's underside towards +x, so FLIP turns them: z -> -z (forward), x -> -y (down), y -> -x
const WP={pistol:['w_glock',.32,.22],smg:['w_smg',.6,.25],rifle:['w_rifle',1.0,.3],shotgun:['w_shotgun',1.1,.3],sniper:['w_sniper',1.35,.28],
  knife:['w_knife',.36,.14],bat:['w_bat',1.0,.1],pipe:['w_pipe',1.1,.1],baton:['w_baton',.7,.16],axe:['w_axe',.95,.1],
  crowbar:['w_crowbar',.9,.1],machete:['w_machete',.72,.16],golf:['w_golf',1.05,.08],wrench:['w_wrench',.5,.16],sledge:['w_sledge',1.0,.1],katana:['w_katana',1.05,.16],
  pitchfork:['w_pitchfork',1.5,.1],sickle:['w_sickle',.5,.25],spade:['w_spade',1.15,.1],pickaxe:['w_pickaxe',.95,.1],dbshotgun:['w_dbshotgun',1.05,.3],   // v0.23
  cleaver:['w_cleaver',.42,.18],dagger:['w_dagger',.42,.16],hockey:['w_hockey',1.25,.1],poker:['w_poker',.85,.1],nunchucks:['w_nunchucks',.45,.3]};   // v0.43
const FLIP=new THREE.Matrix4().makeBasis(new THREE.Vector3(0,-1,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,-1));
export function weaponModel(model,look){
  if(look&&GUN[look]&&hasProp(look))model=look;   // v0.43 a Police / Military gun's own model, when it has loaded
  if(hasProp(model)){
    const turn=(g,ax,a)=>{g.rotation[ax]=a;const o=new THREE.Group();o.add(g);return o;};
    if(GUN[model]){const [len,hand]=GUN[model];return turn(propModel(model,0,len,[hand,.55,.5]),'y',-Math.PI/2);}
  }
  const w=WP[model];
  if(w&&hasProp(w[0])){const g=propModel(w[0],2,w[1],[.5,.5,1-w[2]]);g.quaternion.setFromRotationMatrix(FLIP);const o=new THREE.Group();o.add(g);return o;}
  const g=new THREE.Group(),add=(m,w,h,d,x,y,z)=>g.add(part(m,w,h,d,x,y,z));
  switch(model){
    case 'knife':add(gripMat,.05,.05,.14,0,0,.04);add(bladeMat,.02,.05,.28,0,0,.25);break;
    case 'bat':add(batMat,.06,.06,.4,0,0,.05);add(batMat,.11,.11,.62,0,0,.52);break;
    case 'pipe':add(pipeMat,.06,.06,1.1,0,0,.45);break;
    case 'baton':add(blackMat,.06,.06,.75,0,0,.3);add(blackMat,.05,.05,.14,0,-.08,.04);break;
    case 'axe':add(batMat,.06,.06,.95,0,0,.38);add(bladeMat,.03,.28,.2,0,.12,.8);break;
    case 'pistol':add(gunMetal,.06,.1,.28,0,0,.12);add(gunMetal,.05,.15,.07,0,-.09,.01);break;
    case 'smg':add(gunMetal,.07,.11,.5,0,0,.18);add(gunMetal,.05,.22,.07,0,-.14,.16);add(gunMetal,.05,.12,.07,0,-.09,-.02);break;
    case 'rifle':add(gunMetal,.07,.12,.92,0,0,.32);add(gunMetal,.05,.2,.08,0,-.13,.26);add(gripMat,.07,.12,.28,0,-.02,-.24);add(gunMetal,.04,.06,.2,0,.09,.2);break;
    case 'shotgun':add(gunMetal,.07,.08,.98,0,0,.36);add(gripMat,.08,.1,.24,0,-.06,.32);add(gripMat,.07,.13,.3,0,-.03,-.22);break;
    case 'sniper':add(gunMetal,.06,.08,1.25,0,0,.48);add(gripMat,.07,.13,.32,0,-.03,-.26);add(gunMetal,.07,.07,.34,0,.1,.18);break;
    case 'crowbar':add(blackMat,.04,.04,.85,0,0,.35);add(blackMat,.04,.12,.04,0,.05,.78);break;
    case 'machete':add(gripMat,.05,.05,.16,0,0,.04);add(bladeMat,.02,.09,.52,0,.02,.38);break;
    case 'golf':add(pipeMat,.03,.03,.95,0,0,.42);add(bladeMat,.05,.09,.12,0,-.03,.92);break;
    case 'wrench':add(pipeMat,.05,.05,.38,0,0,.15);add(pipeMat,.06,.12,.1,0,.03,.36);break;
    case 'sledge':add(batMat,.05,.05,.9,0,0,.38);add(gunMetal,.12,.12,.26,0,0,.84);break;
    case 'katana':add(blackMat,.04,.04,.24,0,0,.06);add(bladeMat,.02,.05,.78,0,0,.58);break;
    case 'pitchfork':add(batMat,.04,.04,1.3,0,0,.55);add(pipeMat,.24,.02,.04,0,0,1.2);for(const x of [-.1,0,.1])add(pipeMat,.02,.02,.24,x,0,1.32);break;   // v0.23
    case 'sickle':add(gripMat,.04,.04,.16,0,0,.04);add(bladeMat,.02,.04,.3,0,.08,.2);add(bladeMat,.02,.04,.2,0,.16,.36);break;
    case 'spade':add(batMat,.04,.04,.9,0,0,.38);add(pipeMat,.2,.02,.28,0,0,.96);break;
    case 'pickaxe':add(batMat,.05,.05,.9,0,0,.38);add(gunMetal,.05,.5,.06,0,0,.82);break;
    case 'cleaver':add(gripMat,.05,.05,.14,0,0,.04);add(bladeMat,.02,.12,.24,0,.03,.22);break;   // v0.43
    case 'dagger':add(gripMat,.05,.05,.12,0,0,.03);add(bladeMat,.08,.02,.03,0,0,.1);add(bladeMat,.02,.04,.26,0,0,.24);break;
    case 'hockey':add(batMat,.04,.04,1.1,0,0,.45);add(batMat,.05,.06,.24,0,-.03,1.02);break;
    case 'poker':add(blackMat,.03,.03,.82,0,0,.33);add(blackMat,.03,.1,.03,0,.04,.7);break;
    case 'nunchucks':add(batMat,.05,.05,.3,0,0,.1);add(batMat,.05,.05,.3,0,-.06,.35);break;
    case 'dbshotgun':add(gunMetal,.09,.06,.72,0,0,.42);add(gripMat,.07,.13,.32,0,-.03,-.06);break;
    case 'lmg':add(oliveMat,.1,.14,1.05,0,0,.38);add(gunMetal,.16,.16,.18,.07,-.12,.22);add(gripMat,.08,.13,.28,0,-.03,-.24);add(gunMetal,.04,.04,.3,0,-.1,.8);break;
  }
  return g;
}
// items on the ground with a prop model: [height, or width when `w`]
const ITEM={a9:[.26,1,'w_am9'],a12:[.26,1,'w_am12'],a762:[.3,1,'w_amrifle'],a556:[.3,1,'w_amrifle',1],   // v0.43 boxes of ammo; 5.56 a greener box
  bandage:[.18],firstaid:[.42,'w'],backpack:[.55],molotov:[.34,0,'w_molotov'],grenade:[.14,0,'w_grenade'],flare:[.34,1,'s_flare']};   // [size, by width, prop id when not the item id]
export function itemModel(id){
  const d=DEF[id];
  if(d.kind==='weapon'){const m=weaponModel(d.model,d.look),p=hasProp(d.model)||(WP[d.model]&&hasProp(WP[d.model][0]));if(p){m.rotation.z=Math.PI/2;m.position.y=.06;}else m.position.y=d.gun?.2:.07;return m;}   // a prop weapon lies on its side
  if(ITEM[id]&&hasProp(ITEM[id][2]||id)){const [s,w,pid,tint]=ITEM[id],m=propModel(pid||id,w?0:1,s,[.5,0,.5],!!tint);
    if(tint)m.traverse(o=>{if(o.isMesh)o.material.color.multiply(GREEN);});return m;}
  const g=new THREE.Group();
  if(d.kind==='ammo'){g.add(part(cm(d.color),.32,.18,.24,0,.09,0));g.add(part(cm(d.color),.22,.14,.18,.12,.07,.22));}
  else if(id==='bandage'){g.add(part(whiteMat,.3,.12,.2,0,.06,0));g.add(part(whiteMat,.18,.1,.18,.2,.05,.18));}
  else if(id==='antibiotic'){g.add(part(cm('#dfe9f5'),.14,.3,.14,0,.15,0));g.add(part(cm('#3d7dd8'),.15,.08,.15,0,.33,0));}
  else if(id==='painkiller'){g.add(part(cm('#8a64d6'),.28,.16,.18,0,.08,0));g.add(part(whiteMat,.2,.02,.12,0,.17,0));}
  else if(id==='firstaid'){g.add(part(cm('#d8602c'),.44,.26,.32,0,.13,0));g.add(part(whiteMat,.3,.02,.08,0,.27,0));g.add(part(whiteMat,.08,.02,.24,0,.27,0));}
  else if(id==='resurrect'){g.add(part(S({color:'#c9a24a',emissive:'#f0c46b',emissiveIntensity:.6,metalness:.5,roughness:.3}),.4,.28,.3,0,.14,0));g.add(part(whiteMat,.06,.02,.22,0,.29,0));g.add(part(whiteMat,.22,.02,.06,0,.29,0));}
  else if(id==='molotov'){g.add(part(cm('#6e8a52'),.1,.24,.1,0,.12,0));g.add(part(cm('#d8c9a8'),.04,.1,.04,0,.29,0));}   // v0.23
  else if(id==='flare'){g.add(part(cm('#d84a3a'),.08,.08,.3,0,.05,0));g.add(part(cm('#2b2d30'),.06,.14,.06,0,.06,-.1));}   // v0.26
  else if(id==='grenade'){g.add(part(cm('#4f5a36'),.11,.13,.11,0,.07,0));g.add(part(pipeMat,.03,.05,.05,0,.16,0));}
  else if(id==='backpack'){g.add(part(cm('#4f5a3a'),.46,.56,.3,0,.28,0));g.add(part(woodMat,.36,.24,.1,0,.2,.19));}
  return g;
}
