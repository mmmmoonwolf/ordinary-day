import {G} from '../core/state.js';
import {RATE,SPEEDS} from '../config/time.js';
import {FOOD_MINUTES,WATER_MINUTES,RUN_THIRST,LOW_NEED,STARVE_HP_PER_MIN} from '../config/needs.js';
import {diffOf} from '../config/difficulty.js';
import {player} from '../entities/player.js';
import {hurtPlayer} from './combat.js';
import {say,feed} from '../ui/hud.js';

// ---------- hunger & thirst ----------
// player.food / player.water run 100 → 0 with in-game time (×2 / ×4 speed keeps the same in-game length).
// Below LOW_NEED HP stops regenerating; at 0 the player loses HP until they eat or drink.
export function updateNeeds(dt){
  if(!player.alive||player.down>0)return;
  const min=dt*RATE*SPEEDS[G.speedIdx]*diffOf(G).needs,running=player.moving>4;
  player.food=Math.max(0,player.food-min*100/FOOD_MINUTES);
  player.water=Math.max(0,player.water-min*100/WATER_MINUTES*(running?RUN_THIRST:1));
  const lowNow=(player.food<LOW_NEED?1:0)+(player.water<LOW_NEED?2:0);
  if(lowNow&~player.needWarn){
    if(lowNow&1&&!(player.needWarn&1))feed('หิวแล้ว · HP จะไม่ฟื้นเองจนกว่าจะได้กิน','warn');
    if(lowNow&2&&!(player.needWarn&2))feed('กระหายน้ำ · HP จะไม่ฟื้นเองจนกว่าจะได้ดื่ม','warn');
  }
  player.needWarn=lowNow;
  const empty=(player.food<=0?1:0)+(player.water<=0?1:0);
  if(empty){
    if(!player.starving){player.starving=true;say(player.water<=0?'ขาดน้ำ! HP กำลังลด หาน้ำดื่มด่วน':'อดอาหาร! HP กำลังลด หาอาหารด่วน','alarm',6);}
    player.hp-=min*STARVE_HP_PER_MIN*empty;
    if(player.hp<=0){player.hp=.01;G.endCause='starved';player.inv=0;hurtPlayer(999);}
  } else player.starving=false;
}
