// ---------- searching furniture (v0.15) ----------
// PLACEHOLDERS. Every piece of furniture in an enterable building can be searched: stand next to it and hold still for
// SEARCH_SECONDS (E / the pick button). It makes a little noise, then what it held falls out at the player's feet.
// Each 06:00 a searched piece is filled again with chance RESTOCK (times the party's loot factor).
export const SEARCH_SECONDS=2, SEARCH_RANGE=.9, SEARCH_NOISE=7, RESTOCK=.2;   // v0.42 restock .35 -> .2: v0.40 put five times as much furniture in the rooms
// per kind: Thai name, how many items [min, max], chance it is empty, and what the items are (weights).
// Only civilian things: homes hold no police or military gear. 'throw' is a Molotov or a grenade (config/loot.js THROW_W).
export const BOX={
  // v0.42 no food, planks or bottles; homes emptier (most pieces hold nothing: there are five times as many since v0.40)
  kitchen:{name:'ตู้ครัว',items:[1,1],empty:.65,w:{med:40,melee:30,throw:20,ammo:10}},
  shelf:{name:'ชั้นวางของ',items:[1,1],empty:.55,w:{ammo:45,med:35,throw:10,bag:10}},
  drawer:{name:'ตู้ลิ้นชัก',items:[1,2],empty:.5,w:{med:40,ammo:42,weapon:8,melee:10}},   // v0.18 melee; v0.37 more ammo here and on shelves
  sofa:{name:'โซฟา',items:[1,1],empty:.7,w:{ammo:60,med:40}},
  // v0.17 shops and the hospital (config/places.js)
  farm:{name:'ชั้นของในโรงนา',items:[1,2],empty:.35,w:{melee:40,ammo:35,throw:15,med:10}},   // v0.22 the farm's barn and sheds
  medcab:{name:'ตู้ยา',items:[1,2],empty:.25,w:{med:100}},
  gunrack:{name:'ชั้นวางปืน',items:[1,3],empty:.15,w:{ammo:65,weapon:30,mat:5}},
  grocery:{name:'ชั้นวางสินค้า',items:[1,2],empty:.35,w:{med:45,ammo:25,throw:20,bag:10}},
  tools:{name:'ชั้นเครื่องมือ',items:[1,2],empty:.35,w:{melee:60,throw:25,ammo:15}},
  // v0.40 cars in the street (world/interiors.js moreBoxes): guns and ammo left in the glovebox and the boot. "weapon" here
  // is a gun only; a police car holds Police Grade ones
  car:{name:'รถ',items:[1,2],empty:.35,w:{ammo:55,weapon:25,med:20}},
  cop:{name:'รถตำรวจ',items:[1,3],empty:.15,w:{ammo:55,weapon:35,med:10}},
  wreck:{name:'ซากรถ',items:[1,1],empty:.6,w:{ammo:75,weapon:25}},
};
// v0.40 extra cupboards along the walls of every room: [kind, depth, height], picked at random (shops use their own kind)
export const MORE_FURN=[['shelf',.5,1.9],['drawer',.6,1.1],['kitchen',.8,.85],['drawer',.6,1.1],['shelf',.45,1.6]];
export const MORE_GAP=.45;   // m left free between two pieces along a wall
