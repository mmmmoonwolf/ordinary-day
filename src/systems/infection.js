import {G} from '../core/state.js';
import {RATE,SPEEDS} from '../config/time.js';
import {INFECT_MINUTES} from '../config/zombies.js';
import {player} from '../entities/player.js';
import {hurtPlayer} from './combat.js';
import {sfx} from './audio.js';
import {say,feed} from '../ui/hud.js';

// ---------- infection ----------
// player.infect runs 0 → 1 over INFECT_MINUTES of in-game time (so ×2 / ×4 speed keeps the same in-game length).
// While infected HP does not regenerate; at 1 the player turns. Antibiotic or a Resurrection Kit clears it.
export function infectPlayer(){
  if(!player.alive||player.infect>0)return;
  player.infect=.001;player.infWarn=0;sfx.infect();
  say('คุณถูกกัดและติดเชื้อ! หา Antibiotic ก่อนเชื้อลามถึง 100%','alarm',6);
}
export function cureInfection(){player.infect=0;player.infWarn=0;}
export function updateInfection(dt){
  if(!player.alive||!(player.infect>0)||player.down>0)return;
  player.infect=Math.min(1,player.infect+dt*RATE*SPEEDS[G.speedIdx]/INFECT_MINUTES);
  if(player.infect>=.5&&player.infWarn<1){player.infWarn=1;feed('เชื้อลามไปครึ่งทางแล้ว ต้องใช้ Antibiotic','warn');sfx.infect();}
  if(player.infect>=.8&&player.infWarn<2){player.infWarn=2;say('ตัวเริ่มชา สายตาพร่า… เหลือเวลาไม่มาก','alarm',5);sfx.infect();}
  if(player.infect>=1){G.endCause='infected';player.inv=0;hurtPlayer(player.hp+999);}
}
