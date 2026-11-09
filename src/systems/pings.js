import {G,isPvp,sideOf} from '../core/state.js';
import {PING} from '../config/party.js';
import {inWorld} from '../config/world.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {drops} from './drops.js';
import {sfxFor} from './audio.js';

// ---------- markers (v0.53) ----------
// A player marks a spot (G on a keyboard where the mouse points or the view looks, 📍 on a phone straight ahead): a
// zombie close to it makes it a danger mark, loot a loot mark, otherwise a place to go. The host keeps them in G.pings
// (sent to everyone, PING.life s each, one per player); each device draws those of its own side (ui/pings.js) and they
// hear a blip. No words: the colour and the icon say it.
export function ping(p,x,z){
  if(!p.alive||!Number.isFinite(x)||!Number.isFinite(z)||!inWorld(x,z))return;
  let k='go',bx=x,bz=z,bd=PING.danger;
  for(const a of agents){if(a.state!=='zombie'||a.gone)continue;const d=Math.hypot(a.pos.x-x,a.pos.z-z);if(d<bd){bd=d;k='danger';bx=a.pos.x;bz=a.pos.z;}}
  if(k==='go'){bd=PING.item;for(const d of drops){const e=Math.hypot(d.x-x,d.z-z);if(e<bd){bd=e;k='item';bx=d.x;bz=d.z;}}}
  G.pings=(G.pings||[]).filter(q=>q.by!==p.id);
  G.pings.push({x:Math.round(bx*10)/10,z:Math.round(bz*10)/10,k,by:p.id,life:PING.life});
  for(const q of players)if(!q.away&&(!isPvp()||sideOf(q)===sideOf(p)))sfxFor(q).ping();
}
// host, every step
export function updatePings(dt){if(G.pings&&G.pings.length)G.pings=G.pings.filter(q=>(q.life-=dt)>0);}
