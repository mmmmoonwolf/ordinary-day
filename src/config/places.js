// ---------- places (v0.17) ----------
// PLACEHOLDERS. Six of the enterable buildings are not homes: biggest first they become a hospital, a gun shop, a grocery,
// a diner, a pharmacy and a hardware store. Each has a sign over the door and a mark on the map; its furniture holds that
// trade's goods (config/search.js BOX[box]) and its floor loot spots roll from PLACE_W, fill PLACE_FILL times as often as
// other spots and their furniture refills with PLACE_RESTOCK instead of RESTOCK.
export const PLACES=[
  {type:'hospital',name:'โรงพยาบาล',sign:'HOSPITAL',color:'#d9534a',box:'medcab'},
  {type:'gunshop',name:'ร้านปืน',sign:'GUNS & AMMO',color:'#d8b04e',box:'gunrack'},
  {type:'grocery',name:'ร้านขายของชำ',sign:'GROCERY',color:'#8fbf6a',box:'grocery'},
  {type:'diner',name:'ร้านอาหาร',sign:'DINER',color:'#e5864e',box:'kitchen'},
  {type:'pharmacy',name:'ร้านขายยา',sign:'DRUGS',color:'#7fb8ef',box:'medcab'},
  {type:'hardware',name:'ร้านเครื่องมือ',sign:'HARDWARE',color:'#c49a62',box:'tools'},
];
// category weights for the floor loot spots of each place (day and night alike; weapon and ammo grades still follow the
// phase, so the gun shop has police and military guns only at night, like everywhere else)
export const PLACE_W={
  hospital:{med:75,food:10,bag:5,mat:10},
  gunshop:{weapon:35,ammo:60,bag:5},
  grocery:{food:80,throw:10,med:5,bag:5},
  diner:{food:85,throw:15},
  pharmacy:{med:85,food:15},
  hardware:{mat:50,throw:20,melee:20,bag:10},
  farm:{food:60,mat:15,melee:10,throw:10,bag:5},   // v0.22 the farm (indoors and out), PLACEHOLDER
};
// v0.22 the farm west of town (world/farm.js): its barn is a place like the shops, but not one of the six above
export const BARN={type:'farm',name:'โรงนา',sign:'FARM',color:'#b5654a',box:'farm'};
export const PLACE_FILL=1.7, PLACE_RESTOCK=.6;
