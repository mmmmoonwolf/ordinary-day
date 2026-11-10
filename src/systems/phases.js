import {wpick,rnd} from '../core/util.js';
import {G} from '../core/state.js';
import {DAY_START,DUSK_WARN,isNightTod} from '../config/time.js';
import {isSpecial,RISE,SCREAMER,HUNTER} from '../config/zombies.js';
import {isPvp} from '../core/state.js';
import {ACT,ACT2} from '../config/act.js';
import {fireFx} from './effects.js';
import {agents,becomeZombie,setKind,zombies,spawnEdge} from '../entities/agents.js';
import {d2} from '../entities/movement.js';
import {players,nearestPlayerDist,partySize} from '../entities/player.js';
import {partyOf} from '../config/party.js';
import {fillDay,fillNight,takeByOthers} from './drops.js';
import {restockBoxes} from './search.js';
import {planDaily} from './events.js';
import {REFILL,refillScale} from '../config/loot.js';
import {sfx} from './audio.js';
import {addBlood} from './effects.js';
import {campGuards} from './camp.js';
import {diffOf} from '../config/difficulty.js';
import {updateEvents} from './events.js';
import {BLOOD} from '../config/director.js';
import {isBlood} from './director.js';

// ---------- story + phases ----------
// v0.32 the outbreak is seen happening: a person about 14 m from a player staggers, screams, falls and gets up as a
// zombie (the bitten-person turn of v0.27); the people around run
function startOutbreak(){
  G.outbreak=true;sfx.outbreak();campGuards();   // v0.21 siren, v0.26 walkers left at the camp
  let best=null,bd=1e9;for(const a of agents){if(a.state!=='human'||a.vendor)continue;const s=Math.abs(nearestPlayerDist(a.pos.x,a.pos.z)-14);if(s<bd){bd=s;best=a;}}
  if(best){
    best.state='infected';best.turnT=RISE.fall+1.2;best.panic=0;sfx.scream(best.pos.x,best.pos.z);G.alertA=best;G.alertT=9;
    for(const a of agents){if(a===best||a.state!=='human')continue;const dx=a.pos.x-best.pos.x,dz=a.pos.z-best.pos.z;if(dx*dx+dz*dz<18*18){a.panic=rnd(3,5);a.tx=dx+rnd(-1,1);a.tz=dz+rnd(-1,1);a.vendor=false;}}
  }
}
// v0.32 the first morning, before it starts: someone running past with blood on them, a scream far away
function bloodyRunner(){
  let best=null,bd=1e9;for(const a of agents){if(a.state!=='human'||a.vendor)continue;const s=Math.abs(nearestPlayerDist(a.pos.x,a.pos.z)-12);if(s<bd){bd=s;best=a;}}
  if(!best)return;const p=players[0],dx=best.pos.x-p.pos.x,dz=best.pos.z-p.pos.z;best.panic=7;best.tx=dz;best.tz=-dx;addBlood(best.pos.x,best.pos.z);   // runs across, past the player
}
function farScream(){const p=players[0],a=Math.random()*Math.PI*2;sfx.scream(p.pos.x+Math.cos(a)*45,p.pos.z+Math.sin(a)*45);}
// v0.42 the first morning is told only by what happens (no words): someone running past bleeding, a scream far off, the
// outbreak, the rain
export const EVENTS=[
  {t:9*60+12,fn:bloodyRunner},
  {t:9*60+24,fn:farScream},
  {t:9*60+30,fn:startOutbreak},
  {t:11*60,fn:()=>{G.rainTarget=1;}},
  {t:13*60+20,fn:()=>{G.rainTarget=0;}},
];
// v0.66 the second town: the same morning, three hours later (the bitten escapee arrives at ACT2.outbreak)
if(ACT===2){const d=ACT2.outbreak-(9*60+30);for(const e of EVENTS)if(e.t<=9*60+30)e.t+=d;}
function onNight(){
  G.phase='night';sfx.night();
  for(const z of zombies())if(z.kind==='walker')setKind(z,'zombie');
  G.armorNight=Math.random()<.6;G.armorNext=G.min+30;G.armorAnnounced=false;G.armorCount=0;
  G.tyrantPending=Math.random()<.4;G.tyrantAt=G.min-(G.min%1440)+1440;
  G.nightSpawnNext=G.min+15;
  G.huntAt=!isPvp()&&Math.floor(G.min/1440)+1>=HUNTER.from?G.min+HUNTER.after:0;   // v0.57 the Hunters come later in the night
  if(isBlood()){const mid=G.min-(G.min%1440)+1440;G.bloodHordes=BLOOD.hordes.map(m=>mid+m);sfx.roar(0,0,2);}   // v0.52 the last night: hordes at set times
  fillNight(Math.min(1,REFILL.night*refillScale(Math.floor(G.min/1440)+1)*partyOf(partySize(),'loot')));
}
function onDay(){
  G.phase='day';sfx.dawn();sfx.bell();   // v0.34 the church bell at first light
  const day=Math.floor(G.min/1440)+1;
  const zs=zombies();
  for(const z of zs){if(z.kind==='zombie')setKind(z,'walker');else if(isSpecial(z.kind))z.retreat=true;}
  const walkers=zs.filter(z=>z.kind==='walker').sort((a,b)=>nearestPlayerDist(b.pos.x,b.pos.z)-nearestPlayerDist(a.pos.x,a.pos.z));
  for(let i=0;i<walkers.length-18;i++)walkers[i].retreat=true;
  G.armorNight=false;G.tyrantPending=false;G.nightSpawnNext=1e9;G.huntAt=0;
  // v0.57 the Hunters burn away in the first light; Screamers are about by day from day SCREAMER.from
  for(const z of zs)if(z.kind==='hunter'){z.gone=true;fireFx(z.pos.x,z.pos.z,.8,2.5);}
  if(G.outbreak&&!isPvp()&&day>=SCREAMER.from)for(let k=0;k<SCREAMER.day;k++)spawnEdge('screamer');
  restockBoxes();   // v0.15
  planDaily(day);   // v0.18 random events for the day
  takeByOthers(players);
  fillDay(Math.min(1,REFILL.day*refillScale(day)*partyOf(partySize(),'loot')));
}
function nightMix(){const day=Math.floor(G.min/1440)+1;return {zombie:Math.max(40,65-(day-1)*5),sprinter:20+(day-1)*3,boomer:15+(day-1)*2,screamer:day>=SCREAMER.from?SCREAMER.night:0};}   // v0.57 Screamers
export function runEvents(now){
  for(const e of EVENTS){if(!e.done&&G.min>=e.t){e.done=true;if(e.fn)e.fn();}}
  const tod=G.min%1440,day=Math.floor(G.min/1440)+1;
  const ph=isNightTod(tod)?'night':'day';
  if(ph!==G.phase){if(ph==='night')onNight();else onDay();}
  if(ph==='day'&&tod>=DUSK_WARN&&G.duskDay!==day){G.duskDay=day;sfx.alarm();}
  if(ph==='night'&&G.outbreak){
    // v0.52 the blood night: more often, more of them
    if(G.min>=G.nightSpawnNext){const blood=isBlood();G.nightSpawnNext+=blood?BLOOD.spawnEvery:45;const n=Math.max(1,Math.min(4,2+Math.floor((day-1)/2))+diffOf(G).spawn+partyOf(partySize(),'spawn')+(blood?BLOOD.extra:0));const mix=nightMix();for(let k=0;k<n;k++)spawnEdge(wpick(mix));}
    if(G.armorNight&&G.min>=G.armorNext&&!(tod>=300&&tod<DAY_START)){G.armorNext+=60;
      if(G.armorCount<6){const a=spawnEdge('armor');if(a){G.armorCount++;if(!G.armorAnnounced){G.armorAnnounced=true;}}}}   // Q05: at most 6 per night
    if(G.huntAt&&G.min>=G.huntAt){G.huntAt=0;const n=Math.round(rnd(HUNTER.count[0]-.49,HUNTER.count[1]+.49));   // v0.57 the Hunters: they know where the players are
      for(let k=0;k<n;k++){const h=spawnEdge('hunter');if(!h)continue;let q=null,qd=1e9;for(const p of players)if(p.alive&&!p.away){const d=Math.hypot(p.pos.x-h.pos.x,p.pos.z-h.pos.z);if(d<qd){qd=d;q=p;}}
        if(q)h.heard={x:q.pos.x,z:q.pos.z,t:60};if(k===0)sfx.howl(h.pos.x,h.pos.z);}}
    if(G.tyrantPending&&G.min>=G.tyrantAt){G.tyrantPending=false;const t=spawnEdge('tyrant');if(t)sfx.roar(t.pos.x,t.pos.z);}
  }
  if(G.min>=G.nextWeather){G.nextWeather+=90;if(Math.random()<.35)G.rainTarget=G.rainTarget?0:1;}
  updateEvents(now||0);
}
