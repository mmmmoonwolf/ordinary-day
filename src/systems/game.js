import {$,pick} from '../core/util.js';
import {scene,camTarget} from '../core/renderer.js';
import {G,freshG} from '../core/state.js';
import {lootSpots} from '../world/city.js';
import {agents,removeAgent,spawnPopulation} from '../entities/agents.js';
import {player,setPlayer,makePlayer} from '../entities/player.js';
import {blood} from './effects.js';
import {drops,removeDrop,spawnDrop,makeItem,fillDay} from './drops.js';
import {inv} from './inventory.js';
import {EVENTS} from './phases.js';
import {updateLoadout} from '../ui/hud.js';
import {clearTip} from '../ui/tips.js';
import {restoreObstacles} from './obstacles.js';

// ---------- new game ----------
export function reset(){
  for(const a of agents)removeAgent(a);agents.length=0;if(player)removeAgent(player);
  for(const m of blood){scene.remove(m);m.geometry.dispose();}blood.length=0;
  while(drops.length)removeDrop(drops[0]);
  restoreObstacles();
  Object.assign(G,freshG());
  Object.assign(inv,{bag:[],cap:6,eq:{primary:null,secondary:null,melee:null},active:'melee'});
  for(const e of EVENTS)e.done=false;
  setPlayer(makePlayer());spawnPopulation();camTarget.set(player.pos.x,0,player.pos.z);
  let near=null,nd=1e9;for(const s of lootSpots){if(s.zone!=='city')continue;const d=Math.hypot(s.x-player.pos.x,s.z-player.pos.z);if(d>4&&d<nd){nd=d;near=s;}}
  if(near)spawnDrop(makeItem(pick(['pipe_c','knife_c','bat_c'])),near.x,near.z,near);
  for(const s of lootSpots)if(s.zone==='ambulance')spawnDrop(makeItem('resurrect'),s.x,s.z,s);
  fillDay(.6);
  $('hurt').style.opacity=0;$('boss').hidden=true;clearTip();updateLoadout(true);
}
