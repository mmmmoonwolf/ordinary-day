import {bus} from '../core/bus.js';
import {player,startHelp} from '../entities/player.js';
import {pickup,useHeal,switchTo,useItemAt,equipFromBag,holdSlot,unequip,dropFromBag,dropEquipped} from './inventory.js';
import {startReload} from './combat.js';
import {toggleDoor,fixDoor} from './doors.js';
import {throwBottle,pickThrow} from './throw.js';
import {startSearch} from './search.js';
import {enterCar,leaveCar} from './vehicles.js';

// ---------- player actions (v0.12) ----------
// Everything a player does besides moving and attacking (that is p.input). The player's own device calls act():
// alone or on the host it runs at once for the local player; on a client it goes to the host, which runs it for them.
export const ACTIONS={
  // E / the pick button: help a downed (or with a Kit, dead) teammate, take the item, work the door or search the furniture
  // v0.45 in a car it gets out; next to one that starts, in
  use(p){if(p.car>=0)leaveCar(p);else if(p.nearDown)startHelp(p,p.nearDown);else if(p.near)pickup(p,p.near);else if(p.nearDoor>=0)toggleDoor(p,p.nearDoor);else if(p.nearBox>=0)startSearch(p,p.nearBox);else if(p.nearCar>=0)enterCar(p,p.nearCar);},
  fix(p){if(p.fixDoor>=0)fixDoor(p,p.fixDoor);},
  reload:p=>startReload(p),heal:p=>useHeal(p),throw:p=>throwBottle(p),pickThrow:(p,id)=>pickThrow(p,id),
  slot:(p,s)=>{if(['primary','secondary','melee'].includes(s))switchTo(p,s);},equip:equipFromBag,hold:holdSlot,unequip,useAt:useItemAt,dropBag:dropFromBag,dropEq:dropEquipped,
};
export function act(name,...args){
  if(!Object.prototype.hasOwnProperty.call(ACTIONS,name))return;
  if(bus.role==='client'){if(bus.cmd)bus.cmd(name,args);return;}
  ACTIONS[name](player,...args);
}
// on the host: an action a client asked for, run for that client's player
export function runAction(p,name,args){
  if(!Object.prototype.hasOwnProperty.call(ACTIONS,name)||!Array.isArray(args)||args.length>2)return;
  ACTIONS[name](p,...args);
}
