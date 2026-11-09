import {rnd,clamp} from '../core/util.js';
import {G} from '../core/state.js';
import {WOUND,ILL,PANIC} from '../config/health.js';
import {agents} from '../entities/agents.js';
import {makeNoise} from '../entities/ai.js';
import {addBlood} from './effects.js';
import {sfx} from './audio.js';
import {uiFor} from '../ui/hud.js';

// ---------- the body (v0.54) ----------
// Wounds that bleed, a limp when badly hurt, falling ill from the rain, panic among zombies (numbers in config/health.js).
// Host, once a step for each living player who is up (entities/player.js updatePlayer). Nothing on screen says so in
// words: blood on the ground and a red pulse, slower steps, sneezes, a dark edge round the view and shaking hands.
export function updateBody(p,dt){
  // bleeding
  if(p.bleedW>0){
    p.bleedW-=dt;p.hp=Math.max(Math.min(p.hp,WOUND.floor),p.hp-WOUND.hp*dt);
    if((p.trailT=(p.trailT||0)-dt)<=0){p.trailT=WOUND.trail;addBlood(p.pos.x,p.pos.z);if(Math.random()<.4)uiFor(p).hurt();}
  }
  // soaked in the rain, then ill
  const out=p.room<0&&!(p.car>=0),soak=out&&G.rain>ILL.rain;
  p.wet=clamp((p.wet||0)+(soak?ILL.wet:-ILL.dry)*dt,0,1);
  if(p.wet>=1&&!(p.sick>0)&&Math.random()<ILL.chance*dt){p.sick=ILL.lasts;p.sneezeT=rnd(...ILL.sneeze);}
  if(p.sick>0){p.sick-=dt;if((p.sneezeT-=dt)<=0){p.sneezeT=rnd(...ILL.sneeze);sfx.sneeze(p.pos.x,p.pos.z);makeNoise(p.pos.x,p.pos.z,ILL.noise);}}
  // panic
  let n=0;for(const a of agents){if(a.state!=='zombie'||a.gone)continue;const dx=a.pos.x-p.pos.x,dz=a.pos.z-p.pos.z;if(dx*dx+dz*dz<PANIC.near*PANIC.near)n++;}
  p.panic=clamp((p.panic||0)+(n>=PANIC.count?PANIC.rise:-PANIC.fall)*dt,0,1);
}
// a zombie's blow: sometimes a wound
export function wound(p){if(Math.random()<WOUND.chance)p.bleedW=WOUND.lasts;}
export const limping=p=>p.hp<p.maxHp*WOUND.limpAt;
