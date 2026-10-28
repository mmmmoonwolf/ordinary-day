import {rnd,pick,wpick} from '../core/util.js';
import {G} from '../core/state.js';
import {DEF} from '../config/items.js';
import {POOLS,MED_W,FARM_POOL,THROW_W,BAG_HELP} from '../config/loot.js';
import {SEARCH_SECONDS,SEARCH_RANGE,SEARCH_NOISE,RESTOCK,BOX} from '../config/search.js';
import {partyOf} from '../config/party.js';
import {boxes,boxNear,roomAt,rooms} from '../world/interiors.js';
import {PLACE_RESTOCK} from '../config/places.js';
import {makeItem,spawnDrop,needBag,pickAmmo} from './drops.js';
import {sfxFor} from './audio.js';
import {uiFor} from '../ui/hud.js';
import {makeNoise} from '../entities/ai.js';
import {partySize} from '../entities/player.js';

// ---------- searching furniture (v0.15) ----------
// G.searched lists the furniture (indices into world/interiors.js boxes) already emptied; it is saved and sent online.
const searched=i=>G.searched.includes(i);
// the unsearched furniture in reach of the player, in the room they stand in, or -1
export function nearBoxOf(p){const k=roomAt(p.pos.x,p.pos.z);const i=boxNear(p.pos.x,p.pos.z,k,SEARCH_RANGE);return i>=0&&!searched(i)?i:-1;}   // outdoors (-1): the cars (v0.40)
export const boxName=i=>BOX[boxes[i].kind].name;
export function startSearch(p,i){
  if(!p.alive||p.bleed>0||p.down>0||!boxes[i]||searched(i))return false;
  if(p.searching===i)return true;
  p.searching=i;p.searchT=0;p.searchHit=p.lastHit;
  sfxFor(p).reload();makeNoise(p.pos.x,p.pos.z,SEARCH_NOISE);   // rummaging is heard
  return true;
}
// once a step while searching; false when it is over (done, or the player moved, attacked or was hit)
export function keepSearching(p,dt){
  const i=p.searching,b=boxes[i],I=p.input;
  if(!b||searched(i)||I.mag>.08||I.fire||I.fireQ>0||p.lastHit!==p.searchHit||boxNear(p.pos.x,p.pos.z,b.room,SEARCH_RANGE+.3)!==i)return false;
  const q=b.box;p.face=Math.atan2((q.x0+q.x1)/2-p.pos.x,(q.z0+q.z1)/2-p.pos.z);
  p.searchT+=dt;if(p.searchT<SEARCH_SECONDS)return true;
  G.searched.push(i);
  const items=rollBox(b.kind),U=uiFor(p);
  if(!items.length){U.feed(BOX[b.kind].name+' · ว่างเปล่า','warn');return false;}
  for(const it of items)spawnDrop(it,p.pos.x+rnd(-.25,.25),p.pos.z+rnd(-.25,.25));   // at the player's feet: ammo, food and medicine are picked up at once
  U.feed(BOX[b.kind].name+' · เจอ '+items.map(it=>DEF[it.id].name).join(', '),'get');
  return false;
}
// what a piece of furniture holds (civilian things only; a police car Police Grade guns and ammo, v0.40)
const CARS=['car','cop','wreck'];
export function rollBox(kind){
  const t=BOX[kind];if(Math.random()<t.empty)return [];
  const n=Math.round(rnd(t.items[0]-.49,t.items[1]+.49)),out=[];
  let bag=needBag();
  for(let k=0;k<n;k++){
    const c=wpick(bag?{...t.w,bag:BAG_HELP.search}:t.w);   // v0.37 a backpack for whoever still has none
    if(c==='bag'){out.push(makeItem('backpack'));bag=false;continue;}
    const pool=kind==='cop'?POOLS.pol:POOLS.civ,weapons=CARS.includes(kind)?pool.weapons.filter(id=>DEF[id].gun):pool.weapons;
    out.push(makeItem(c==='bag'?'backpack':c==='med'?wpick(MED_W.day):c==='throw'?wpick(THROW_W):c==='weapon'?pick(weapons):c==='melee'?pick(kind==='farm'?FARM_POOL.melee:POOLS.civ.melee):pickAmmo(pool.ammo)));
  }
  return out;
}
// 06:00: some emptied furniture has something in it again
export function restockBoxes(){const f=partyOf(partySize(),'loot');G.searched=G.searched.filter(i=>Math.random()>=Math.min(1,(rooms[boxes[i].room]&&rooms[boxes[i].room].place?PLACE_RESTOCK:RESTOCK)*f));}   // shops refill sooner (v0.17)
