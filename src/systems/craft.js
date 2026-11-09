import {G} from '../core/state.js';
import {DEF} from '../config/items.js';
import {RECIPES,TRAP} from '../config/craft.js';
import {agents} from '../entities/agents.js';
import {players} from '../entities/player.js';
import {makeNoise,hurtZombie} from '../entities/ai.js';
import {addStack,tidyBag} from './inventory.js';
import {sfx,sfxFor} from './audio.js';
import {uiFor} from '../ui/hud.js';
import {isPvp,sideOf} from '../core/state.js';

// ---------- making things and putting down traps (v0.55) ----------
// craft(p,id) from the bag (ACTIONS.craft): takes the scraps, gives the thing (config/craft.js RECIPES). place(p,id)
// (ACTIONS.place) puts a trap from the bag at the player's feet: G.ptraps (saved, sent online; ui/traps.js draws them).
// Host, every step: a tripwire rattles when a zombie or another side's player walks into it (a loud noise, zombies come),
// a bear trap holds and hurts a zombie. Both go when they go off.
const count=(p,id)=>p.gear.bag.reduce((s,e)=>s+(e.id===id?e.n||0:0),0);
export const canCraft=(p,id)=>{const r=RECIPES[id];if(!r)return false;for(const k in r.need)if(count(p,k)<r.need[k])return false;
  if(id==='fix'){const w=p.gear.eq.melee;return !!(w&&DEF[w.id].dur&&(w.dur??DEF[w.id].dur)<DEF[w.id].dur);}return true;};
function take(p,id,n){const bag=p.gear.bag;for(let i=bag.length-1;i>=0&&n>0;i--){const e=bag[i];if(e.id!==id)continue;const k=Math.min(e.n,n);e.n-=k;n-=k;if(e.n<=0)bag.splice(i,1);}}
export function craft(p,id){
  const r=RECIPES[id];if(!r||!p.alive||p.zed||!canCraft(p,id))return false;
  const U=uiFor(p);
  if(id!=='fix'&&p.gear.bag.length>=p.gear.cap&&!p.gear.bag.some(e=>e.id===id)){const left=Object.keys(r.need).every(k=>count(p,k)>r.need[k]);if(!left){U.feedOnce('full','กระเป๋าเต็ม','warn');return false;}}
  for(const k in r.need)take(p,k,r.need[k]);
  if(id==='fix'){const w=p.gear.eq.melee;w.dur=DEF[w.id].dur;}else addStack(p,id,1);
  tidyBag(p.gear);sfxFor(p).hammer?sfxFor(p).hammer(p.pos.x,p.pos.z):sfxFor(p).pickup();U.feed(id==='fix'?'ซ่อม '+DEF[p.gear.eq.melee.id].name+' แล้ว':'ทำ '+r.name+' แล้ว');U.updateLoadout(true);
  return true;
}
export function place(p,id){
  if(!p.alive||p.zed||DEF[id]?.kind!=='trap'||count(p,id)<1)return false;
  G.ptraps=G.ptraps||[];if(G.ptraps.length>=TRAP.max)G.ptraps.shift();
  take(p,id,1);G.ptraps.push({k:id,x:Math.round(p.pos.x*10)/10,z:Math.round(p.pos.z*10)/10,by:p.id});
  sfx.clamp(p.pos.x,p.pos.z);uiFor(p).updateLoadout(true);return true;
}
export function updateTraps(dt){
  const T=G.ptraps;if(!T||!T.length)return;
  for(let i=T.length-1;i>=0;i--){
    const t=T[i],owner=players.find(q=>q.id===t.by);let hit=null;
    for(const a of agents){if(a.state!=='zombie'||a.gone)continue;const dx=a.pos.x-t.x,dz=a.pos.z-t.z;if(dx*dx+dz*dz<TRAP.reach*TRAP.reach){hit=a;break;}}
    if(!hit&&t.k==='tripwire'&&isPvp()&&owner)for(const q of players){if(!q.alive||q===owner||sideOf(q)===sideOf(owner))continue;if(Math.hypot(q.pos.x-t.x,q.pos.z-t.z)<TRAP.reach){hit=q;break;}}
    if(!hit)continue;T.splice(i,1);
    if(t.k==='tripwire'){sfx.clamp(t.x,t.z);sfx.carAlarm?sfx.glass(t.x,t.z):0;makeNoise(t.x,t.z,TRAP.noise);if(owner)uiFor(owner).feed('กับดักลวดดัง','warn');}
    else{sfx.clamp(t.x,t.z);if(hit.state==='zombie'){hurtZombie(hit,TRAP.dmg,0,0,0,false,true,owner);if(hit.state==='zombie')hit.trapT=TRAP.hold;}}
  }
}
