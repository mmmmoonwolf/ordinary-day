import {G} from '../core/state.js';
import {RATE,SPEEDS} from '../config/time.js';
import {INFECT_MINUTES} from '../config/zombies.js';
import {hurtPlayer} from './combat.js';
import {sfx} from './audio.js';
import {uiFor} from '../ui/hud.js';

// ---------- infection ----------
// p.infect runs 0 → 1 over INFECT_MINUTES of in-game time (so ×2 / ×4 speed keeps the same in-game length).
// While infected HP does not regenerate; at 1 the player turns. Antibiotic or a Resurrection Kit clears it.
export function infectPlayer(p){
  if(!p.alive||p.infect>0)return;
  p.infect=.001;p.infWarn=0;if(p.local)sfx.infect();
  uiFor(p).say('คุณถูกกัดและติดเชื้อ! หา Antibiotic ก่อนเชื้อลามถึง 100%','alarm',6);
}
export function cureInfection(p){p.infect=0;p.infWarn=0;}
export function updateInfection(p,dt){
  if(!p.alive||!(p.infect>0)||p.down>0)return;
  const U=uiFor(p);
  p.infect=Math.min(1,p.infect+dt*RATE*SPEEDS[G.speedIdx]/INFECT_MINUTES);
  if(p.infect>=.5&&p.infWarn<1){p.infWarn=1;U.feed('เชื้อลามไปครึ่งทางแล้ว ต้องใช้ Antibiotic','warn');if(p.local)sfx.infect();}
  if(p.infect>=.8&&p.infWarn<2){p.infWarn=2;U.say('ตัวเริ่มชา สายตาพร่า… เหลือเวลาไม่มาก','alarm',5);if(p.local)sfx.infect();}
  if(p.infect>=1){p.endCause='infected';p.inv=0;hurtPlayer(p,p.hp+999);}
}
