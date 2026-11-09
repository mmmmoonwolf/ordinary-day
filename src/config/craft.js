// ---------- making things (v0.55) ----------
// PLACEHOLDERS (The Last of Us). Scraps from furniture make things, in the bag: what each recipe takes, and what it
// gives (an item, or `fix`: the melee weapon in hand back to full). A Nail Bomb is a smaller grenade. Traps are put down
// where the player stands: a tripwire rattles its cans when a zombie (or a player of the other side) walks into it, a bear
// trap holds a zombie and hurts it. Both are used up when they go off.
export const RECIPES={
  bandage:{name:'Bandage',need:{cloth:2}},
  nailbomb:{name:'Nail Bomb',need:{nails:3,tape:1}},
  tripwire:{name:'Tripwire',need:{tape:1,nails:1}},
  beartrap:{name:'Bear Trap',need:{nails:4,tape:2}},
  fix:{name:'ซ่อมอาวุธประชิด',need:{tape:2}},
};
export const TRAP={reach:.9,noise:30,hold:4,dmg:40,max:12};   // placed traps in the world at most `max`
