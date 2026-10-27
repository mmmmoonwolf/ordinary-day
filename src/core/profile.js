// ---------- the player's name and character (v0.41) ----------
// Made on the start screen (ui/creator.js) and kept in this browser. `look` says which outfit each part of the body comes
// from and the colours over it (null = the outfit's own); without one a player wears the outfit of their number, as
// before. The same look goes to everyone in an online room (net/client.js 'hi', net/snapshot.js `who`).
const KEY='ordinary-day.profile';
// the outfits in assets/characters/ whose parts can be worn, by body: [file, Thai name]
export const OUTFITS={
  m:[['m_casual','ลำลอง'],['m_hoodie','ฮู้ดดี้'],['m_beach','ชายหาด'],['m_suit','สูท'],['m_worker','ช่าง'],['m_farmer','ชาวไร่'],['m_punk','พังก์'],['m_swat','SWAT'],['m_adventurer','นักเดินทาง']],
  f:[['f_casual','ลำลอง'],['f_formal','ทางการ'],['f_suit','สูท'],['f_worker','ช่าง'],['f_punk','พังก์'],['f_soldier','ทหาร'],['f_adventurer','นักเดินทาง']],
};
// colours to pick from (PLACEHOLDER palettes)
export const PALETTE={
  cloth:['#2b2b2b','#e8e4da','#8a1f1f','#c2532b','#d9a531','#4f7a3a','#2f5d7c','#24345c','#5b3b7a','#7a5a3a','#6b6f73','#b8c4cc'],
  skin:['#f1c9a5','#d9a27c','#b07850','#7a4a2c','#4a2c1a'],
  hair:['#1a1410','#3b2a1e','#6b4423','#a8783c','#d8c27a','#8a8a8a','#7a1f1f','#2f4f8a'],
};
export const NAME_MAX=16;
const HEX=/^#[0-9a-f]{6}$/i;
// a look from anywhere (this browser, a friend online) made safe: known outfits of one body, colours as #rrggbb or null
export function cleanLook(l){
  if(!l||typeof l!=='object'||!OUTFITS[l.s])return null;
  const ids=OUTFITS[l.s].map(o=>o[0]),part=k=>ids.includes(l[k])?l[k]:ids[0],c=l.c&&typeof l.c==='object'?l.c:{};
  const col=k=>typeof c[k]==='string'&&HEX.test(c[k])?c[k].toLowerCase():null;
  return {s:l.s,hd:part('hd'),bd:part('bd'),lg:part('lg'),ft:part('ft'),c:{shirt:col('shirt'),pants:col('pants'),skin:col('skin'),hair:col('hair')}};
}
export const cleanName=n=>String(n??'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,NAME_MAX);
export const lookKey=l=>l?JSON.stringify(l):'';
export const defaultLook=s=>{const id=OUTFITS[s][OUTFITS[s].length-1][0];return {s,hd:id,bd:id,lg:id,ft:id,c:{shirt:null,pants:null,skin:null,hair:null}};};
function read(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o)return {name:cleanName(o.name),look:cleanLook(o.look)};}catch(_){}return {name:'',look:null};}
export const profile=read();
export function saveProfile(){try{localStorage.setItem(KEY,JSON.stringify(profile));}catch(_){}}
// the local player wears it (a new game, a loaded one, a room joined)
export function applyProfile(p){if(profile.name)p.name=profile.name;p.wear=profile.look||null;}   // p.wear: p.look is the blocky body's
