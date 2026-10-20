import {RC,OFF,nearestIdx} from '../config/world.js';

// ---------- sidewalk graph ----------
export function validNode(i,j,sx,sz){return !(i<0||i>4||j<0||j>4||(i===0&&sx<0)||(i===4&&sx>0)||(j===0&&sz<0)||(j===4&&sz>0));}
export function nodeXZ(n){return [RC[n.i]+n.sx*OFF,RC[n.j]+n.sz*OFF];}
export function neighbors(n){const L=[];const add=(i,j,sx,sz,k)=>{if(validNode(i,j,sx,sz))L.push({i,j,sx,sz,k});};
  add(n.i+n.sx,n.j,-n.sx,n.sz,'w');add(n.i,n.j+n.sz,n.sx,-n.sz,'w');add(n.i,n.j,-n.sx,n.sz,'c');add(n.i,n.j,n.sx,-n.sz,'c');return L;}
export function nearestNode(p){const i=nearestIdx(p.x),j=nearestIdx(p.z);let sx=p.x>=RC[i]?1:-1,sz=p.z>=RC[j]?1:-1;if(!validNode(i,j,sx,sz)){if(i===0)sx=1;if(i===4)sx=-1;if(j===0)sz=1;if(j===4)sz=-1;}return {i,j,sx,sz};}
export const same=(a,b)=>a&&b&&a.i===b.i&&a.j===b.j&&a.sx===b.sx&&a.sz===b.sz;
export function randomNode(){for(;;){const n={i:Math.floor(Math.random()*5),j:Math.floor(Math.random()*5),sx:Math.random()<.5?-1:1,sz:Math.random()<.5?-1:1};if(validNode(n.i,n.j,n.sx,n.sz))return n;}}
