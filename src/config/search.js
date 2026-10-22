// ---------- searching furniture (v0.15) ----------
// PLACEHOLDERS. Every piece of furniture in an enterable building can be searched: stand next to it and hold still for
// SEARCH_SECONDS (E / the pick button). It makes a little noise, then what it held falls out at the player's feet.
// Each 06:00 a searched piece is filled again with chance RESTOCK (times the party's loot factor).
export const SEARCH_SECONDS=2, SEARCH_RANGE=.9, SEARCH_NOISE=7, RESTOCK=.35;
// per kind: Thai name, how many items [min, max], chance it is empty, and what the items are (weights).
// Only civilian things: homes hold no police or military gear.
export const BOX={
  kitchen:{name:'ตู้ครัว',items:[1,3],empty:.1,w:{food:70,bottle:15,mat:5,med:10}},
  shelf:{name:'ชั้นวางของ',items:[1,2],empty:.25,w:{food:20,ammo:20,med:20,mat:20,bottle:20}},
  drawer:{name:'ตู้ลิ้นชัก',items:[1,2],empty:.2,w:{med:35,ammo:30,food:15,weapon:10,mat:10}},
  sofa:{name:'โซฟา',items:[1,1],empty:.55,w:{ammo:45,food:30,med:25}},
};
