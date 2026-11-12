import {useOf} from '../entities/use.js';
import {climb} from './roofs.js';
import {trunkPut,trunkTake} from './vehicles.js';
import {bus} from '../core/bus.js';
import {player,startHelp} from '../entities/player.js';
import {pickup,useHeal,switchTo,useItemAt,equipFromBag,holdSlot,unequip,dropFromBag,dropEquipped} from './inventory.js';
import {startReload} from './combat.js';
import {toggleDoor,fixDoor} from './doors.js';
import {throwBottle,pickThrow} from './throw.js';
import {startSearch} from './search.js';
import {enterCar,leaveCar} from './vehicles.js';
import {ping} from './pings.js';
import {craft,place} from './craft.js';

// ---------- player actions (v0.12) ----------
// Everything a player does besides moving and attacking (that is p.input). The player's own device calls act():
// alone or on the host it runs at once for the local player; on a client it goes to the host, which runs it for them.
export const ACTIONS={
  // E / the pick button: help a downed (or with a Kit, dead) teammate, take the item, work the door or search the furniture
  // v0.45 in a car it gets out; next to one that starts, in
  // the order of what E does is in entities/use.js, shared with the button on screen
  use(p){const u=useOf(p);if(!u)return;
    if(u.k==='out')leaveCar(p);else if(u.k==='help')startHelp(p,u.q);else if(u.k==='pick')pickup(p,u.d);else if(u.k==='ladder')climb(p,u.id);
    else if(u.k==='door')toggleDoor(p,u.id);else if(u.k==='box')startSearch(p,u.id);else if(u.k==='car')enterCar(p,u.id);},
  fix(p){if(p.fixDoor>=0)fixDoor(p,p.fixDoor);},
  light:p=>{p.light=!p.light;},
  ping:(p,x,z)=>ping(p,+x,+z),   // v0.53 a marker for the team
  craft:(p,id)=>craft(p,String(id)),place:(p,id)=>place(p,String(id)),   // v0.55 making things, putting down traps   // v0.50 the flashlight on / off (T, 🔦)
  reload:p=>startReload(p),heal:p=>useHeal(p),throw:p=>throwBottle(p),pickThrow:(p,id)=>pickThrow(p,id),
  slot:(p,s)=>{if(['primary','secondary','melee'].includes(s))switchTo(p,s);},equip:equipFromBag,hold:holdSlot,unequip,useAt:useItemAt,trunkPut:(p,i)=>trunkPut(p,i),trunkTake:(p,j)=>trunkTake(p,j),   // v0.61 the car boot
  dropBag:dropFromBag,dropEq:dropEquipped,
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
