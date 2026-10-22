import {G} from '../core/state.js';
import {RATE,SPEEDS} from '../config/time.js';
import {FOOD_MINUTES,WATER_MINUTES,RUN_THIRST,LOW_NEED,STARVE_HP_PER_MIN} from '../config/needs.js';
import {diffOf} from '../config/difficulty.js';
import {hurtPlayer} from './combat.js';
import {uiFor} from '../ui/hud.js';

// ---------- hunger & thirst ----------
// p.food / p.water run 100 → 0 with in-game time (×2 / ×4 speed keeps the same in-game length).
// Below LOW_NEED HP stops regenerating; at 0 the player loses HP until they eat or drink.
export function updateNeeds(p,dt){
  const U=uiFor(p);
  if(!p.alive||p.down>0||p.bleed>0)return;
  const min=dt*RATE*SPEEDS[G.speedIdx]*diffOf(G).needs,running=p.moving>4;
  p.food=Math.max(0,p.food-min*100/FOOD_MINUTES);
  p.water=Math.max(0,p.water-min*100/WATER_MINUTES*(running?RUN_THIRST:1));
  const lowNow=(p.food<LOW_NEED?1:0)+(p.water<LOW_NEED?2:0);
  if(lowNow&~p.needWarn){
    if(lowNow&1&&!(p.needWarn&1))U.feed('หิวแล้ว · HP จะไม่ฟื้นเองจนกว่าจะได้กิน','warn');
    if(lowNow&2&&!(p.needWarn&2))U.feed('กระหายน้ำ · HP จะไม่ฟื้นเองจนกว่าจะได้ดื่ม','warn');
  }
  p.needWarn=lowNow;
  const empty=(p.food<=0?1:0)+(p.water<=0?1:0);
  if(empty){
    if(!p.starving){p.starving=true;U.say(p.water<=0?'ขาดน้ำ! HP กำลังลด หาน้ำดื่มด่วน':'อดอาหาร! HP กำลังลด หาอาหารด่วน','alarm',6);}
    p.hp-=min*STARVE_HP_PER_MIN*empty;
    if(p.hp<=0){p.hp=.01;p.endCause='starved';p.inv=0;hurtPlayer(p,999);}
  } else p.starving=false;
}
