import {groundY} from '../config/world.js';
import {collide} from '../world/collision.js';
import {DEF} from '../config/items.js';
import {agents} from './agents.js';
import {players} from './player.js';
import {curWeapon} from '../systems/inventory.js';
import {skins,dress,undress,skinFrame,skinId} from './skins.js';

// ---------- animation ----------
export function animate(a,dt){
  const p=a.b;
  // with the character models loaded (v0.13) the model plays clips from the agent's state; the blocky body stays hidden
  if(a.sk&&a.state==='player'&&a.sk.id!==skinId(a))undress(a);   // v0.41 a player changed clothes (here or online)
  if(!a.sk&&skins.ready&&skins.on)dress(a);
  if(a.sk){
    a.y+=(groundY(a.pos.x,a.pos.z)-a.y)*Math.min(1,dt*12);p.root.position.set(a.pos.x,a.y,a.pos.z);p.root.rotation.y=a.face;
    if(a.state==='player'){p.root.visible=!(a.inv>0&&a.alive&&Math.floor(a.inv*10)%2===0);tip(a,p,a.alive&&!(a.bleed>0)&&!(a.down>0));}
    skinFrame(a,dt);return;
  }
  if(a.state==='dead'){p.root.position.set(a.pos.x,a.y,a.pos.z);p.root.rotation.y=a.face;return;}
  const amt=Math.min(1,a.moving/1.6);a.phase+=dt*(1.5+Math.min(a.moving,4)*2.7);const s=Math.sin(a.phase)*.75*amt;
  p.legL.rotation.x=s;p.legR.rotation.x=-s;
  if(a.state==='zombie'){
    const tw=a.kind==='tyrant'&&a.wind>0;
    p.armL.rotation.x=tw?-2.8:-1.35+Math.sin(a.phase*.5)*.15;p.armR.rotation.x=tw?-2.8:-1.2+Math.cos(a.phase*.5)*.15;
    p.head.rotation.z=a.kind==='walker'?.35:.2;p.body.rotation.z=Math.sin(a.phase*.5)*(a.kind==='walker'?.09:.05);p.body.rotation.x=a.kind==='sprinter'?.35:.12;
  }
  else if(a.state==='player'){
    const def=DEF[curWeapon(a).id];p.armL.rotation.z=0;p.body.rotation.x=a.sneak?.4:0;p.body.position.y=0;   // crouch while sneaking
    // on the ground: the Resurrection Kit knock-down (falls and gets up in 1.8 s) or downed (v0.10), arms reaching out
    const lie=a.bleed>0?1:a.down>0?-Math.sin(Math.min(1,1-a.down/1.8)*Math.PI):0;   // face down to crawl forward; the Kit throws them on their back
    if(lie){p.body.rotation.x=lie*Math.PI/2;p.body.position.y=Math.abs(lie)*.16;p.armL.rotation.x=-2.9+s*.5;p.armR.rotation.x=-2.9-s*.5;p.legL.rotation.x=s*.3;p.legR.rotation.x=-s*.3;p.root.visible=true;
      a.y+=(groundY(a.pos.x,a.pos.z)-a.y)*Math.min(1,dt*12);p.root.position.set(a.pos.x,a.y,a.pos.z);p.root.rotation.y=a.face;return;}
    if(def.gun){
      const rec=a.recoil*.22;
      if(a.reloadT>0){p.armR.rotation.x=-.9;p.armL.rotation.x=-.6+Math.sin(a.reloadT*14)*.25;}
      else{p.armR.rotation.x=-1.5+rec;if(def.slot==='primary'){p.armL.rotation.x=-1.42+rec;p.armL.rotation.z=.38;}else p.armL.rotation.x=-1.2+rec;}
    } else if(a.swing>0){
      const k=1-a.swing/a.swingDur,id=curWeapon(a).id;
      if(id==='fist'||def.model==='knife')p.armR.rotation.x=-.3-Math.sin(k*Math.PI)*1.3;
      else p.armR.rotation.x=k<.4?-.35-(k/.4)*2.3:-2.65+((k-.4)/.6)*3.5;
      p.armL.rotation.x=-s*.5;
    } else {p.armL.rotation.x=-s*.7;p.armR.rotation.x=(curWeapon(a).id==='fist'?s*.7:-.35+s*.3);}
    p.root.visible=!(a.inv>0&&Math.floor(a.inv*10)%2===0);
  }
  else{const f=a.panic>0?1.5:.8;p.armL.rotation.x=-s*f;p.armR.rotation.x=s*f;p.head.rotation.z=0;}
  a.y+=(groundY(a.pos.x,a.pos.z)-a.y)*Math.min(1,dt*12);
  p.root.position.set(a.pos.x,a.y+Math.abs(Math.sin(a.phase))*.06*amt,a.pos.z);p.root.rotation.y=a.face;
  tip(a,p,a.state==='player');
}
// v0.29 prone: the whole body tipped forward onto the ground, centred on the player; v0.30 vaulting or hopping, leaning into
// it (v0.39 the character models too: the hop clip does the leaning)
function tip(a,p,player){
  const prone=player&&a.stance===2;p.root.rotation.order='YXZ';p.root.rotation.x=prone?Math.PI/2:0;
  if(prone){p.root.position.x-=Math.sin(a.face)*.85;p.root.position.z-=Math.cos(a.face)*.85;p.root.position.y+=.18;}
  if(a.airH>0){p.root.position.y+=a.airH;if(!prone&&!a.sk)p.root.rotation.x=a.airH*.35;}
}
export function separate(){
  const L=agents.filter(a=>a.state!=='dead');for(const p of players)if(p.alive&&!p.vault)L.push(p);   // v0.30 not mid-vault
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];const need=(a.rad||.34)+(b.rad||.34);const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,dd=dx*dx+dz*dz;if(dd>need*need||dd<1e-6)continue;const d=Math.sqrt(dd),push=(need-d)/2;a.pos.x-=dx/d*push;a.pos.z-=dz/d*push;b.pos.x+=dx/d*push;b.pos.z+=dz/d*push;collide(a.pos,a.rad||.34);collide(b.pos,b.rad||.34);}   // never push anyone through a thin wall
}
