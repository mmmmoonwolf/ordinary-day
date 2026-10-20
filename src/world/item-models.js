import {DEF} from '../config/items.js';
import {S,part,gripMat,bladeMat,batMat,pipeMat,blackMat,gunMetal,oliveMat,whiteMat,woodMat} from './materials.js';

// ---------- item models ----------
const mcache={};const cm=c=>mcache[c]||(mcache[c]=S({color:c,roughness:.6}));
export function weaponModel(model){
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
    case 'lmg':add(oliveMat,.1,.14,1.05,0,0,.38);add(gunMetal,.16,.16,.18,.07,-.12,.22);add(gripMat,.08,.13,.28,0,-.03,-.24);add(gunMetal,.04,.04,.3,0,-.1,.8);break;
  }
  return g;
}
export function itemModel(id){
  const d=DEF[id];if(d.kind==='weapon'){const m=weaponModel(d.model);m.position.y=d.gun?.2:.07;return m;}
  const g=new THREE.Group();
  if(d.kind==='ammo'){g.add(part(cm(d.color),.32,.18,.24,0,.09,0));g.add(part(cm(d.color),.22,.14,.18,.12,.07,.22));}
  else if(id==='bandage'){g.add(part(whiteMat,.3,.12,.2,0,.06,0));g.add(part(whiteMat,.18,.1,.18,.2,.05,.18));}
  else if(id==='antibiotic'){g.add(part(cm('#dfe9f5'),.14,.3,.14,0,.15,0));g.add(part(cm('#3d7dd8'),.15,.08,.15,0,.33,0));}
  else if(id==='painkiller'){g.add(part(cm('#8a64d6'),.28,.16,.18,0,.08,0));g.add(part(whiteMat,.2,.02,.12,0,.17,0));}
  else if(id==='firstaid'){g.add(part(cm('#d8602c'),.44,.26,.32,0,.13,0));g.add(part(whiteMat,.3,.02,.08,0,.27,0));g.add(part(whiteMat,.08,.02,.24,0,.27,0));}
  else if(id==='resurrect'){g.add(part(S({color:'#c9a24a',emissive:'#f0c46b',emissiveIntensity:.6,metalness:.5,roughness:.3}),.4,.28,.3,0,.14,0));g.add(part(whiteMat,.06,.02,.22,0,.29,0));g.add(part(whiteMat,.22,.02,.06,0,.29,0));}
  else if(id==='canned'){g.add(part(cm('#b8b8b0'),.2,.24,.2,0,.12,0));g.add(part(cm('#c9473a'),.21,.1,.21,0,.12,0));g.add(part(cm('#b8b8b0'),.2,.2,.2,.24,.1,.1));}
  else if(id==='water'){g.add(part(cm('#9fd0ec'),.14,.42,.14,0,.21,0));g.add(part(cm('#2f6fb5'),.08,.07,.08,0,.45,0));g.add(part(cm('#9fd0ec'),.14,.42,.14,.2,.21,.12));}
  else if(id==='backpack'){g.add(part(cm('#4f5a3a'),.46,.56,.3,0,.28,0));g.add(part(woodMat,.36,.24,.1,0,.2,.19));}
  return g;
}
