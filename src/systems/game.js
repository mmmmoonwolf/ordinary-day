import {$,pick} from '../core/util.js';
import {scene,camTarget} from '../core/renderer.js';
import {G,freshG} from '../core/state.js';
import {lootSpots} from '../world/city.js';
import {agents,removeAgent,spawnPopulation} from '../entities/agents.js';
import {player,players,setPlayer,makePlayer} from '../entities/player.js';
import {blood} from './effects.js';
import {drops,removeDrop,spawnDrop,makeItem,fillDay} from './drops.js';
import {EVENTS} from './phases.js';
import {updateLoadout} from '../ui/hud.js';
import {clearTip} from '../ui/tips.js';
import {restoreObstacles} from './obstacles.js';
import {REFILL,PANTRY} from '../config/loot.js';
import {restoreDoors} from './doors.js';
import {clearThrows} from './throw.js';
import {resetEvents} from './events.js';

// ---------- new game ----------
// a second (third, fourth) player in the same game; driven by its p.input (a bot in the tests, the network later)
export function addPlayer(){const p=makePlayer(players.length);players.push(p);return p;}
// an empty city: no people, players or loot, doors whole, the clock at the start (a client fills it from the host)
export function clearWorld(){
  for(const a of agents)removeAgent(a);agents.length=0;for(const p of players)removeAgent(p);players.length=0;
  for(const m of blood){scene.remove(m);m.geometry.dispose();}blood.length=0;
  while(drops.length)removeDrop(drops[0]);clearThrows();
  restoreObstacles();
  Object.assign(G,freshG());restoreDoors();resetEvents();
  for(const e of EVENTS)e.done=false;
}
export function reset(){
  clearWorld();
  const me=makePlayer(0);me.local=true;players.push(me);setPlayer(me);spawnPopulation();camTarget.set(player.pos.x,0,player.pos.z);   // one player on this device; more join with addPlayer() (v0.9)
  let near=null,nd=1e9;for(const s of lootSpots){if(s.zone!=='city')continue;const d=Math.hypot(s.x-player.pos.x,s.z-player.pos.z);if(d>4&&d<nd){nd=d;near=s;}}
  if(near)spawnDrop(makeItem(pick(['pipe_c','knife_c','bat_c'])),near.x,near.z,near);
  for(const s of lootSpots)if(s.zone==='ambulance')spawnDrop(makeItem('resurrect'),s.x,s.z,s);
  fillDay(REFILL.start,PANTRY.start);
  $('hurt').style.opacity=0;$('boss').hidden=true;clearTip();updateLoadout(true);
}
