import {clamp} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {groundY} from '../config/world.js';
import {DEF} from '../config/items.js';
import {THROW_RANGE,THROW_NOISE} from '../config/stealth.js';
import {BLAST,FIRE,GRENADE_FUSE,FLARE} from '../config/blast.js';
import {rayWall} from '../world/collision.js';
import {itemModel} from '../world/item-models.js';
import {makeNoise} from '../entities/ai.js';
import {countAmmo,takeAmmo} from './inventory.js';
import {blast,ignite} from './blast.js';
import {fireFx} from './effects.js';
import {sfx} from './audio.js';
import {uiFor} from '../ui/hud.js';

// ---------- thrown things (v0.7, v0.23) ----------
// Q / the throw button throws toward where the player aims (p.input.aimDist from the mouse on desktop, else ahead). It
// flies in an arc and lands where aimed or at the first wall. A bottle breaks and its noise draws zombies; a Molotov
// sets the ground on fire there; a grenade blows up a moment later (systems/blast.js). The player picks which one in the
// bag (p.gear.throwId); with none picked, or none of it left, the first they have of bottle, Molotov, grenade.
export const THROWS=['bottle','flare','molotov','grenade'];
export function throwPick(g){const has=id=>g.bag.some(e=>e.id===id&&e.n>0);return g.throwId&&has(g.throwId)?g.throwId:THROWS.find(has)||null;}
const flying=[];
export function throwBottle(p){
  if(!p.alive||p.down>0||p.bleed>0)return false;
  const U=uiFor(p),id=throwPick(p.gear);
  if(!id||countAmmo(p,id)<=0){U.feedOnce('nobottle','ไม่มีของให้ขว้าง (ขวด Molotov หรือระเบิดมือ)','warn');return false;}
  takeAmmo(p,id,1);
  const fx=Math.sin(p.face),fz=Math.cos(p.face),x0=p.pos.x,z0=p.pos.z;
  let dist=p.input.aim?clamp(p.input.aimDist,2,THROW_RANGE):THROW_RANGE*.9;
  dist=Math.max(.8,Math.min(dist,rayWall(x0,z0,fx,fz,dist)-.3));   // hits a wall: lands there
  const m=itemModel(id);scene.add(m);
  flying.push({id,m,x0,z0,x1:x0+fx*dist,z1:z0+fz*dist,t:0,T:.3+dist*.03,by:p,fuse:-1});
  sfx.swing();U.updateLoadout(true);p.aimT=.3;
  return true;
}
export function pickThrow(p,id){if(DEF[id]&&DEF[id].kind==='throw'){p.gear.throwId=id;uiFor(p).updateLoadout(true);}}
export function updateThrows(dt){
  for(let i=flying.length-1;i>=0;i--){
    const f=flying[i];
    if(f.fuse>=0){f.fuse-=dt;if(f.fuse<0){scene.remove(f.m);flying.splice(i,1);blast(f.x1,f.z1,BLAST.grenade,f.by);}continue;}   // a grenade on the ground
    f.t+=dt;const k=Math.min(1,f.t/f.T),x=f.x0+(f.x1-f.x0)*k,z=f.z0+(f.z1-f.z0)*k;
    f.m.position.set(x,groundY(x,z)+1.2*(1-k)+3*k*(1-k),z);f.m.rotation.x+=dt*14;
    if(k<1)continue;
    if(f.id==='grenade'){f.fuse=GRENADE_FUSE;f.m.rotation.set(0,0,Math.PI/2);f.m.position.y=groundY(x,z)+.06;sfx.thud(x,z);continue;}
    scene.remove(f.m);flying.splice(i,1);sfx.glass(x,z);
    if(f.id==='molotov')ignite(x,z,FIRE.molotov[0],FIRE.molotov[1]);
    else if(f.id==='flare'){lures.push({x,z,t:FLARE.secs,next:0});fireFx(x,z,.25,FLARE.secs);}   // v0.26
    else makeNoise(x,z,THROW_NOISE);
  }
}
export function clearThrows(){for(const f of flying)scene.remove(f.m);flying.length=0;lures.length=0;}
// v0.26 a burning flare calls every zombie in earshot to it, again and again until it goes out
const lures=[];
export function updateLures(dt){for(let i=lures.length-1;i>=0;i--){const l=lures[i];l.t-=dt;l.next-=dt;if(l.next<=0){l.next=FLARE.every;makeNoise(l.x,l.z,FLARE.noise);}if(l.t<=0)lures.splice(i,1);}}
