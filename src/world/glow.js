import {G} from '../core/state.js';
import {rooms,boxes,doorMat,frameMat} from './interiors.js';

// ---------- what glows in the dark (v0.40) ----------
// The doors of enterable buildings and a frame round their doorways glow white after dark, so a way in can be found at
// night. Everything that can still be searched glows too, furniture (v0.15) and cars (v0.40), and goes dark once
// searched. Each piece gets its own copies of its materials the first time it is drawn (emissive white, set every
// frame); a model that comes later (props loading, graphics quality) is picked up when it shows. Visual only.
// PLACEHOLDER brightness, by day (0) and at night (1):
export const GLOW={door:[0,.55],frame:[0,.75],box:[.06,.28],car:[.04,.22],pulse:.18};
const lerp=(r,k)=>r[0]+(r[1]-r[0])*k;
// what is drawn for a box right now: the furniture model or its plain box, the car model or its boxes
function shown(b){
  if(b.car){const c=b.car.car;return c.model&&c.model.visible?[c.model]:c.boxes;}
  return [b.model&&b.model.visible?b.model:b.mesh];
}
const owned=new WeakSet();   // materials already copied for one piece (not in userData: clone() copies that as JSON)
function own(objs){
  const mats=[];
  for(const o of objs)o.traverse(m=>{
    if(!m.isMesh)return;
    const list=[].concat(m.material).map(x=>{if(owned.has(x))return x;const c=x.clone();owned.add(c);if(c.emissive)c.emissive.set('#ffffff');return c;});
    m.material=Array.isArray(m.material)?list:list[0];for(const x of list)if(x.emissive)mats.push(x);
  });
  return mats;
}
export function updateGlow(now){
  const k=G.night||0,pulse=1+GLOW.pulse*Math.sin(now/420),done=new Set(G.searched);
  doorMat.emissiveIntensity=lerp(GLOW.door,k);frameMat.opacity=lerp(GLOW.frame,k);
  for(let i=0;i<boxes.length;i++){
    const b=boxes[i];
    if(b.room>=0&&rooms[b.room]&&!rooms[b.room].cut.visible&&!b.glow)continue;   // furniture shows only inside; set up when first seen
    const objs=shown(b);if(!objs.length||!objs[0])continue;
    if(!b.glow||b.glow.objs[0]!==objs[0])b.glow={objs,mats:own(objs)};
    const v=done.has(i)?0:lerp(b.car?GLOW.car:GLOW.box,k)*pulse;
    for(const m of b.glow.mats)m.emissiveIntensity=v;
  }
}
