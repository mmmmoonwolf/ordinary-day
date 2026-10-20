import {groundY} from '../config/world.js';
import {collide} from '../world/collision.js';
import {DEF} from '../config/items.js';
import {agents} from './agents.js';
import {player} from './player.js';
import {curWeapon} from '../systems/inventory.js';

// ---------- animation ----------
export function animate(a,dt){
  const p=a.b;
  if(a.state==='dead'){p.root.position.set(a.pos.x,a.y,a.pos.z);p.root.rotation.y=a.face;return;}
  const amt=Math.min(1,a.moving/1.6);a.phase+=dt*(1.5+Math.min(a.moving,4)*2.7);const s=Math.sin(a.phase)*.75*amt;
  p.legL.rotation.x=s;p.legR.rotation.x=-s;
  if(a.state==='zombie'){
    const tw=a.kind==='tyrant'&&a.wind>0;
    p.armL.rotation.x=tw?-2.8:-1.35+Math.sin(a.phase*.5)*.15;p.armR.rotation.x=tw?-2.8:-1.2+Math.cos(a.phase*.5)*.15;
    p.head.rotation.z=a.kind==='walker'?.35:.2;p.body.rotation.z=Math.sin(a.phase*.5)*(a.kind==='walker'?.09:.05);p.body.rotation.x=a.kind==='sprinter'?.35:.12;
  }
  else if(a===player){
    const def=DEF[curWeapon().id];p.armL.rotation.z=0;
    if(def.gun){
      const rec=a.recoil*.22;
      if(a.reloadT>0){p.armR.rotation.x=-.9;p.armL.rotation.x=-.6+Math.sin(a.reloadT*14)*.25;}
      else{p.armR.rotation.x=-1.5+rec;if(def.slot==='primary'){p.armL.rotation.x=-1.42+rec;p.armL.rotation.z=.38;}else p.armL.rotation.x=-1.2+rec;}
    } else if(a.swing>0){
      const k=1-a.swing/a.swingDur,id=curWeapon().id;
      if(id==='fist'||def.model==='knife')p.armR.rotation.x=-.3-Math.sin(k*Math.PI)*1.3;
      else p.armR.rotation.x=k<.4?-.35-(k/.4)*2.3:-2.65+((k-.4)/.6)*3.5;
      p.armL.rotation.x=-s*.5;
    } else {p.armL.rotation.x=-s*.7;p.armR.rotation.x=(curWeapon().id==='fist'?s*.7:-.35+s*.3);}
    p.root.visible=!(a.inv>0&&Math.floor(a.inv*10)%2===0);
  }
  else{const f=a.panic>0?1.5:.8;p.armL.rotation.x=-s*f;p.armR.rotation.x=s*f;p.head.rotation.z=0;}
  a.y+=(groundY(a.pos.x,a.pos.z)-a.y)*Math.min(1,dt*12);
  p.root.position.set(a.pos.x,a.y+Math.abs(Math.sin(a.phase))*.06*amt,a.pos.z);p.root.rotation.y=a.face;
}
export function separate(){
  const L=agents.filter(a=>a.state!=='dead');if(player.alive)L.push(player);
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];const need=(a.rad||.34)+(b.rad||.34);const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,dd=dx*dx+dz*dz;if(dd>need*need||dd<1e-6)continue;const d=Math.sqrt(dd),push=(need-d)/2;a.pos.x-=dx/d*push;a.pos.z-=dz/d*push;b.pos.x+=dx/d*push;b.pos.z+=dz/d*push;collide(a.pos,a.rad||.34);collide(b.pos,b.rad||.34);}   // never push anyone through a thin wall
}
