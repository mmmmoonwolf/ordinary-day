import {G} from '../core/state.js';
import {ARMY,exitOpen} from '../config/goal.js';
import {army,setGateOpen} from '../world/army.js';
import {agents} from '../entities/agents.js';
import {hurtZombie,makeNoise} from '../entities/ai.js';
import {figureModel,skins} from '../entities/skins.js';
import {HOLD} from '../entities/player.js';
import {weaponModel} from '../world/item-models.js';
import {tracer} from './effects.js';
import {sfx} from './audio.js';

// ---------- the soldiers at the army camp (v0.46) ----------
// Once the camp opens (config/goal.js exitOpen, from the morning after the third night) its gate is up and four soldiers,
// two on the watchtowers and two at the gate, shoot the zombies coming at it: on the host, every step (ARMY in
// config/goal.js, PLACEHOLDER), each shot a recorded rifle shot and a tracer everyone sees. They cannot be hurt. Before
// that the camp is shut and empty. The open gate follows G.min on every device, so it needs nothing saved or sent.
const LOOK={s:'m',hd:'m_swat',bd:'m_swat',lg:'m_swat',ft:'m_swat',c:{shirt:'#4d5634',pants:'#4d5634',skin:null,hair:'#4d5634'}};   // olive fatigues
const near=(g,r)=>{let best=null,bd=r*r;for(const z of agents){if(z.state!=='zombie'||z.gone)continue;const dx=z.pos.x-g.x,dz=z.pos.z-g.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=z;}}return best;};
// host, once a step
export function updateArmy(dt){
  setGateOpen(exitOpen(G.min));if(!army.open)return;
  for(const g of army.guards){
    g.cool-=dt;if(g.cool>0)continue;const z=near(g,ARMY.range);if(!z){g.cool=.3;continue;}
    g.cool=ARMY.cool[0]+Math.random()*(ARMY.cool[1]-ARMY.cool[0]);
    const dx=z.pos.x-g.x,dz=z.pos.z-g.z,d=Math.hypot(dx,dz)||1;g.face=Math.atan2(dx,dz);
    sfx.shot('rifle',g.x,g.z);tracer(g.x+dx/d*.6,g.z+dz/d*.6,z.pos.x,z.pos.z);
    if(Math.random()<ARMY.hit)hurtZombie(z,ARMY.dmg,dx/d,dz/d,.4,true,false,null);
    g.noiseT=(g.noiseT||0)-1;if(g.noiseT<=0){g.noiseT=6;makeNoise(g.x,g.z,ARMY.noise);}
  }
}
// every device, every frame: shown once open, turned toward the nearest zombie (looks only), the character model once loaded
export function armyFrame(dt){
  setGateOpen(exitOpen(G.min));
  for(const g of army.guards){
    const show=army.open&&G.running;
    if(show){const z=near(g,ARMY.range);if(z){const want=Math.atan2(z.pos.x-g.x,z.pos.z-g.z),d=Math.atan2(Math.sin(want-g.face),Math.cos(want-g.face));g.face+=d*Math.min(1,dt*6);}}
    if(show&&!g.model&&skins.ready&&skins.on){const m=figureModel(LOOK,'P_Aim');if(m){g.model=m;m.o.position.set(g.x,g.y,g.z);const gun=weaponModel('rifle','q_rifle_m');if(m.hand){HOLD(gun,{gun:true});m.hand.add(gun);}g.fig.parent.add(m.o);}}
    const useModel=!!g.model&&skins.on;
    if(g.model){g.model.o.visible=show&&useModel;if(show&&useModel){g.model.o.rotation.y=g.face;g.model.mixer.update(dt);}}
    g.fig.visible=show&&!useModel;g.fig.rotation.y=g.face;
  }
}
