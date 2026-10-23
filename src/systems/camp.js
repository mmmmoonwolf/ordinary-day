import {G} from '../core/state.js';
import {CAMP_CFG,FIRE} from '../config/blast.js';
import {camp,CAMP} from '../world/camp.js';
import {props} from '../world/prop-models.js';
import {agents,makeAgent,becomeZombie} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {hurtZombie} from '../entities/ai.js';
import {hurtPlayer} from './combat.js';
import {sfx,sfxFor} from './audio.js';
import {say,uiFor} from '../ui/hud.js';

// ---------- the camp (v0.26) ----------
// Bear traps: the first zombie or player to step in one is caught (held still, hurt) and the trap is spent; spent traps
// are G.traps (saved, sent online, all back with a new game). The radio left on talks the first time a player comes
// close. Walkers are left at the camp when the outbreak starts. Host only, every step.
export function updateCamp(dt){
  for(let i=0;i<camp.traps.length;i++){
    if(G.traps.includes(i))continue;const t=camp.traps[i];
    for(const a of agents)if(a.state==='zombie'&&Math.hypot(a.pos.x-t.x,a.pos.z-t.z)<.45){G.traps.push(i);applyTraps();a.trapT=CAMP_CFG.trapHold;hurtZombie(a,CAMP_CFG.trapZ,0,0,0,false,true,null);sfx.door(t.x,t.z);break;}
    if(G.traps.includes(i))continue;
    for(const p of players)if(p.alive&&p.down<=0&&Math.hypot(p.pos.x-t.x,p.pos.z-t.z)<.4){G.traps.push(i);applyTraps();p.trapT=CAMP_CFG.trapHoldP;hurtPlayer(p,CAMP_CFG.trapP);sfx.door(t.x,t.z);uiFor(p).feed('เหยียบกับดักหมี! ขยับไม่ได้ชั่วครู่','warn');break;}
  }
  // the fire still burns: whatever stands in it gets hurt, like burning ground (systems/blast.js)
  const f=camp.fire;for(const a of agents)if(a.state==='zombie'&&Math.hypot(a.pos.x-f.x,a.pos.z-f.z)<f.r){a.burn=(a.burn||0)+FIRE.zdps*dt;if(a.burn>=7){hurtZombie(a,a.burn,0,0,0,false,true,null);a.burn=0;}}
  for(const p of players)if(p.alive&&Math.hypot(p.pos.x-f.x,p.pos.z-f.z)<f.r){p.burn=(p.burn||0)+FIRE.pdps*dt;if(p.burn>=1){const n=Math.floor(p.burn);p.burn-=n;hurtPlayer(p,n);}}
  if(!G.campRadio&&camp.radio)for(const p of players)if(p.alive&&Math.hypot(p.pos.x-camp.radio.x,p.pos.z-camp.radio.z)<9){G.campRadio=true;sfx.radio();say('วิทยุที่ค่าย: "...ใครได้ยิน เฮลิคอปเตอร์จะมารับที่ลานจอดในเมืองเช้าวันที่ 8 อย่าออกไปตอนกลางคืน..."','radio',9);break;}
}
// spent traps hidden (after a load, a new game, or on a friend's device)
export function applyTraps(){for(let i=0;i<camp.traps.length;i++){const e=camp.traps[i].entry,gone=G.traps.includes(i);e.gone=gone;if(e.model)e.model.visible=!gone&&props.on;if(e.fallback)e.fallback.visible=!gone&&!(props.on&&e.model);}}
// the outbreak leaves walkers at the camp
export function campGuards(){for(let i=0;i<CAMP_CFG.guards;i++){const a=i/CAMP_CFG.guards*Math.PI*2,z=makeAgent(CAMP.x+Math.cos(a)*4.5,CAMP.z+Math.sin(a)*4.5);becomeZombie(z,'walker');agents.push(z);}}
