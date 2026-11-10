import {ladders,ROOF} from '../world/roofs.js';
import {sfxFor} from './audio.js';

// ---------- climbing (v0.63) ----------
// p.roof: the ladder (and so the roof) a player is up on, or -1. While up there p.airH is the roof's height, movement is
// kept inside the roof's edge (entities/movement.js), zombies leave them alone (entities/player.js targets) and they
// can still shoot, throw and be shot by people.
export function nearLadder(p){
  if(!p.alive||p.bleed>0||p.car>=0)return -1;
  if(p.roof>=0){const L=ladders[p.roof];return Math.hypot(p.pos.x-L.rx,p.pos.z-L.rz)<ROOF.top?p.roof:-1;}
  for(let i=0;i<ladders.length;i++){const L=ladders[i];if(Math.hypot(p.pos.x-L.lx,p.pos.z-L.lz)<ROOF.reach)return i;}
  return -1;
}
export function climb(p,i){
  const L=ladders[i];if(!L)return false;
  if(p.roof>=0){p.roof=-1;p.pos.x=L.lx;p.pos.z=L.lz;p.airH=0;}
  else{p.roof=i;p.pos.x=L.rx;p.pos.z=L.rz;p.airH=L.h;}
  p.vault=null;p.hop=0;p.searching=-1;sfxFor(p).ladder&&sfxFor(p).ladder();
  return true;
}
export const roofH=p=>p.roof>=0&&ladders[p.roof]?ladders[p.roof].h:0;
export function keepOnRoof(a){const R=ladders[a.roof].roof;a.pos.x=Math.min(R.x1,Math.max(R.x0,a.pos.x));a.pos.z=Math.min(R.z1,Math.max(R.z0,a.pos.z));}
