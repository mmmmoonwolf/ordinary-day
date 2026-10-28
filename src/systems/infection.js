import {INFECTION} from '../config/zombies.js';
import {G} from '../core/state.js';
import {RATE,SPEEDS} from '../config/time.js';
import {INFECT_MINUTES} from '../config/zombies.js';
import {hurtPlayer} from './combat.js';
import {sfxFor} from './audio.js';
import {uiFor} from '../ui/hud.js';

// ---------- infection ----------
// p.infect runs 0 → 1 over INFECT_MINUTES of in-game time (so ×2 / ×4 speed keeps the same in-game length).
// While infected HP does not regenerate; at 1 the player turns. Antibiotic or a Resurrection Kit clears it.
export function infectPlayer(p){
  if(!INFECTION.on||!p.alive||p.infect>0)return;   // switched off (v0.18)
  p.infect=.001;p.infWarn=0;sfxFor(p).infect();
}
export function cureInfection(p){p.infect=0;p.infWarn=0;}
export function updateInfection(p,dt){
  if(!p.alive||!(p.infect>0)||p.down>0||p.bleed>0)return;   // paused while down (v0.10)
  const U=uiFor(p);
  p.infect=Math.min(1,p.infect+dt*RATE*SPEEDS[G.speedIdx]/INFECT_MINUTES);
  if(p.infect>=.5&&p.infWarn<1){p.infWarn=1;sfxFor(p).infect();}
  if(p.infect>=.8&&p.infWarn<2){p.infWarn=2;sfxFor(p).infect();}
  if(p.infect>=1){p.endCause='infected';p.inv=0;hurtPlayer(p,p.hp+999);}
}
