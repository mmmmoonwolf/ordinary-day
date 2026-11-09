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
import {restoreObstacles} from './obstacles.js';
import {REFILL,BAG_HELP} from '../config/loot.js';
import {restoreDoors} from './doors.js';
import {clearThrows} from './throw.js';
import {applyTanks,clearFires} from './blast.js';
import {applyTraps} from './camp.js';
import {clearFireFx} from './effects.js';
import {resetEvents} from './events.js';
import {applyProfile} from '../core/profile.js';
import {jobOf} from '../config/jobs.js';
import {DEF} from '../config/items.js';
import {addStack} from './inventory.js';
import {uiFor} from '../ui/hud.js';
import {freshCars,applyCars} from './vehicles.js';

// ---------- new game ----------
// a second (third, fourth) player in the same game; driven by its p.input (a bot in the tests, the network later)
export function addPlayer(){const p=makePlayer(players.length);players.push(p);return p;}
// an empty city: no people, players or loot, doors whole, the clock at the start (a client fills it from the host)
export function clearWorld(){
  for(const a of agents)removeAgent(a);agents.length=0;for(const p of players)removeAgent(p);players.length=0;
  for(const m of blood){scene.remove(m);m.geometry.dispose();}blood.length=0;
  while(drops.length)removeDrop(drops[0]);clearThrows();
  restoreObstacles();
  Object.assign(G,freshG());G.cars=freshCars();applyCars();applyTanks();clearFires();clearFireFx();restoreDoors();resetEvents();applyTraps();   // v0.23 every gas cylinder back, v0.26 every trap
  for(const e of EVENTS)e.done=false;
}
export function reset(){
  clearWorld();
  const me=makePlayer(0);me.local=true;applyProfile(me);giveKit(me);players.push(me);setPlayer(me);spawnPopulation();camTarget.set(player.pos.x,0,player.pos.z);   // one player on this device; more join with addPlayer() (v0.9); v0.41 wearing the name and clothes made on the start screen
  let near=null,nd=1e9;for(const s of lootSpots){if(s.zone!=='city')continue;const d=Math.hypot(s.x-player.pos.x,s.z-player.pos.z);if(d>4&&d<nd){nd=d;near=s;}}
  if(near)spawnDrop(makeItem(pick(['pipe_c','knife_c','bat_c'])),near.x,near.z,near);
  // v0.37 and a backpack a little further on (config/loot.js BAG_HELP.start)
  const far=lootSpots.filter(s=>s.zone==='city'&&!s.drop&&(d=>d>BAG_HELP.start[0]&&d<BAG_HELP.start[1])(Math.hypot(s.x-player.pos.x,s.z-player.pos.z)));
  if(far.length){const s=pick(far);spawnDrop(makeItem('backpack'),s.x,s.z,s);}
  for(const s of lootSpots)if(s.zone==='ambulance')spawnDrop(makeItem('resurrect'),s.x,s.z,s);
  fillDay(REFILL.start);
  $('hurt').style.opacity=0;$('boss').hidden=true;updateLoadout(true);
}

// v0.58 what a player's job starts them with (config/jobs.js), once per game
export function giveKit(p){
  p.kitGot=true;const g=p.gear;
  for(const [id,n] of jobOf(p).kit){const d=DEF[id];if(!d)continue;
    if(d.gun){if(!g.eq.secondary&&d.slot==='secondary'){g.eq.secondary={id,mag:d.mag};g.active='secondary';}else if(!g.eq.primary&&d.slot==='primary')g.eq.primary={id,mag:d.mag};}
    else addStack(p,id,n);}
  uiFor(p).updateLoadout(true);
}
