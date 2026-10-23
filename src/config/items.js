// ---------- item definitions (data-driven) ----------
// Ratings 1–10 come from the design draft; real values below are PLACEHOLDERS:
// damage = rating × 5 (Q07), seconds per shot = 1.6 / fire-rate rating
// dur = how many hits a melee weapon lasts (v0.5, PLACEHOLDER); fists never break
export const GRADES={civ:{name:'Civilian',color:'#78D99B'},pol:{name:'Police',color:'#66B0FF'},mil:{name:'Military',color:'#F0C46B'}};
export const DEF={fist:{name:'มือเปล่า',kind:'weapon',slot:'melee',dmg:10,dmgR:1,range:1.45,cd:.42,kb:.4,arc:.5,verb:'ต่อย',model:'fist'}};
function gun(id,name,grade,slot,dmgR,rateR,o){DEF[id]=Object.assign({name,grade,kind:'weapon',slot,gun:true,dmgR,rateR,dmg:dmgR*5,rate:1.6/rateR,verb:'ยิง'},o);}
function melee(id,name,grade,dmgR,o){DEF[id]=Object.assign({name,grade,kind:'weapon',slot:'melee',dmgR,dmg:dmgR*5,verb:'ฟาด'},o);}
const PISTOL={ammo:'a9',reload:1.2,range:22,spread:.035,noise:22,model:'pistol'};
const PUMP={ammo:'a12',pellets:7,falloff:true,reload:2.6,range:13,spread:.28,noise:28,model:'shotgun'};
const SMG={ammo:'a9',auto:true,mag:30,reload:1.6,range:18,spread:.09,noise:20,model:'smg'};
const AR={ammo:'a556',auto:true,mag:30,reload:2.1,range:30,spread:.05,noise:34,model:'rifle'};
gun('pistol_c','Pistol','civ','secondary',3,5,Object.assign({mag:12},PISTOL));
gun('shotgun_c','Pump Action Shotgun','civ','primary',6,2,Object.assign({mag:6},PUMP));
gun('smg_c','SMG','civ','primary',2,7,Object.assign({},SMG));
melee('bat_c','Baseball Bat','civ',4,{dur:70,range:2.0,cd:.58,kb:1.5,arc:.2,cleave:true,model:'bat'});
melee('knife_c','Knife','civ',3,{dur:60,range:1.6,cd:.3,kb:.3,arc:.5,verb:'แทง',model:'knife'});
melee('pipe_c','Steel Pipe','civ',3,{dur:90,range:1.9,cd:.52,kb:1.0,arc:.35,cleave:true,model:'pipe'});
gun('pistol_p','Pistol','pol','secondary',4,7,Object.assign({mag:15},PISTOL));
gun('shotgun_p','Pump Action Shotgun','pol','primary',7,4,Object.assign({mag:7},PUMP));
gun('smg_p','SMG','pol','primary',4,7,Object.assign({},SMG));
melee('baton_p','Police Baton','pol',4,{dur:120,range:1.8,cd:.45,kb:1.0,arc:.35,model:'baton'});
gun('rifle_p','Assault Rifle','pol','primary',6,5,Object.assign({},AR));
gun('pistol_m','Pistol','mil','secondary',5,8,Object.assign({mag:17},PISTOL));
gun('shotgun_m','Semi-Auto Shotgun','mil','primary',7,6,Object.assign({},PUMP,{mag:8,reload:2.2}));
gun('smg_m','SMG','mil','primary',5,9,Object.assign({},SMG,{mag:35}));
melee('axe_m','Axe','mil',8,{dur:100,range:2.1,cd:.72,kb:1.2,arc:.25,cleave:true,verb:'จาม',model:'axe'});
gun('rifle_m','Assault Rifle','mil','primary',6,7,Object.assign({},AR));
gun('sniper_m','Sniper Rifle','mil','primary',10,2,{ammo:'a762',mag:5,reload:2.8,range:46,spread:.004,noise:42,pierce:3,model:'sniper'});
gun('lmg_m','Light Machine Gun','mil','primary',7,9,{ammo:'a556',auto:true,mag:100,reload:4.2,range:30,spread:.08,noise:44,heavy:true,model:'lmg'});
// v0.18 melee weapons from the Weapons Pack: not in Draft 01, so every number here, the DMG rating included, is a PLACEHOLDER.
// Found by searching tool shelves, drawers and the hardware store ('melee' loot, POOLS.civ.melee), not in the street tables
melee('crowbar_c','Crowbar','civ',4,{dur:120,range:1.8,cd:.5,kb:1.1,arc:.35,model:'crowbar'});
melee('machete_c','Machete','civ',5,{dur:70,range:1.9,cd:.45,kb:.6,arc:.4,cleave:true,verb:'ฟัน',model:'machete'});
melee('golf_c','Golf Club','civ',3,{dur:45,range:2.1,cd:.55,kb:1.4,arc:.3,model:'golf'});
melee('wrench_c','Pipe Wrench','civ',3,{dur:130,range:1.6,cd:.45,kb:.9,arc:.4,model:'wrench'});
melee('sledge_c','Sledgehammer','civ',7,{dur:90,range:2.0,cd:.95,kb:2.2,arc:.25,cleave:true,verb:'ทุบ',model:'sledge'});
melee('katana_c','Katana','civ',6,{dur:80,range:2.1,cd:.5,kb:.7,arc:.35,cleave:true,verb:'ฟัน',model:'katana'});
Object.assign(DEF,{
  a9:{name:'9mm',kind:'ammo',find:[10,24],color:'#b8913a'},
  a556:{name:'5.56mm',kind:'ammo',find:[20,40],color:'#5f6b44'},
  a12:{name:'12 Gauge',kind:'ammo',find:[4,10],color:'#9a3328'},
  a762:{name:'7.62mm',kind:'ammo',find:[3,8],color:'#4a4f5a'},
  bandage:{name:'Bandage',kind:'heal',heal:.25,color:'#78D99B'},
  antibiotic:{name:'Antibiotic',kind:'heal',heal:.35,cure:true,color:'#66B0FF'},
  painkiller:{name:'Painkiller',kind:'heal',heal:.5,color:'#b58cff'},
  firstaid:{name:'First Aid Kit',kind:'heal',heal:.8,color:'#ff9a4a'},
  resurrect:{name:'Resurrection Kit',kind:'revive',color:'#F0C46B'},
  backpack:{name:'กระเป๋าเป้',kind:'bag',slots:14,color:'#e8e3d6'},
  // v0.5 food and water (PLACEHOLDER amounts, % of the bar)
  canned:{name:'อาหารกระป๋อง',kind:'food',food:45,color:'#d9a24a'},
  water:{name:'น้ำดื่ม',kind:'food',water:50,color:'#6fb3e0'},
  // v0.7: planks board up doors, bottles are thrown to lure zombies with the noise
  planks:{name:'ไม้กระดาน',kind:'mat',color:'#a9834f'},
  bottle:{name:'ขวดแก้ว',kind:'throw',color:'#7fae8a'},
});
export const SLOTNAME={primary:'อาวุธหลัก',secondary:'อาวุธรอง',melee:'อาวุธประชิด'};
export function gradeOf(id){return DEF[id].grade||null;}
export function itemColor(id){const d=DEF[id];if(d.kind==='weapon'&&d.grade)return GRADES[d.grade].color;if(d.kind==='ammo')return '#d9d2bf';return d.color||'#e8e3d6';}
export function wname(id){return DEF[id].name;}
// v0.18: the glowing ring under an item on the ground shows what kind of thing it is; a Police / Military weapon also gets
// a second, outer ring in its grade colour
export const RING={weapon:'#ff5a3c',bag:'#c77dff',med:'#3fe07a',food:'#ffa43a',water:'#3fb0ff',ammo:'#ffe23a',other:'#d8d2c0'};
export function ringColor(id){const d=DEF[id];return RING[d.kind==='weapon'?'weapon':d.kind==='ammo'?'ammo':d.kind==='heal'||d.kind==='revive'?'med':d.kind==='food'?(d.water?'water':'food'):id==='backpack'?'bag':'other'];}
// melee wear left, 0..1; items from before v0.5 have no dur and count as new
// kinds that stack (n) and are picked up by walking over them; since v0.14.1 one stack per item, with no limit
export const STACKS=new Set(['ammo','heal','revive','food','mat','throw']);
export function durPct(it){const m=DEF[it.id].dur;return m?Math.max(0,(it.dur??m)/m):1;}
