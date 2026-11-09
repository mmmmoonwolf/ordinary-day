// ---------- the player's name and character (v0.41) ----------
// Made on the start screen (ui/creator.js) and kept in this browser. `look` says which outfit each part of the body comes
// from and the colours over it (null = the outfit's own); without one a player wears the outfit of their number, as
// before. The same look goes to everyone in an online room (net/client.js 'hi', net/snapshot.js `who`).
import {cleanJob} from '../config/jobs.js';
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
export const defaultLook=s=>{const id=OUTFITS[s][0][0];   // v0.58 the first outfit (the last can be locked)
  return {s,hd:id,bd:id,lg:id,ft:id,c:{shirt:null,pants:null,skin:null,hair:null}};};
function read(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o)return {name:cleanName(o.name),look:cleanLook(o.look),job:cleanJob(o.job)};}catch(_){}return {name:'',look:null,job:'none'};}   // v0.58 job
export const profile=read();
export function saveProfile(){try{localStorage.setItem(KEY,JSON.stringify(profile));}catch(_){}}
// the local player wears it (a new game, a loaded one, a room joined)
export function applyProfile(p){if(profile.name)p.name=profile.name;p.wear=profile.look||null;p.job=cleanJob(profile.job);}   // p.wear: p.look is the blocky body's

// v0.58 outfits earned by playing (PLACEHOLDER goals, from the best records of systems/records.js in this browser, any
// difficulty): until then the creator shows them with a lock and what earns them, and a locked part is not kept
export const LOCKS={m_swat:{wins:1},f_soldier:{wins:1},m_punk:{kills:120},f_punk:{kills:120},m_suit:{nights:2},f_suit:{nights:2},m_adventurer:{nights:1},f_adventurer:{nights:1}};
export function bestEver(){
  const b={nights:0,kills:0,wins:0};
  try{const all=JSON.parse(localStorage.getItem('ordinary-day.best')||'{}');for(const k in all){const r=all[k];if(!r||typeof r!=='object')continue;b.nights=Math.max(b.nights,r.nights||0);b.kills=Math.max(b.kills,r.kills||0);b.wins+=r.wins||0;}}catch(_){}
  return b;
}
export function lockOf(id,best=bestEver()){const L=LOCKS[id];if(!L)return '';
  if(L.wins&&best.wins<L.wins)return 'ถึงค่ายทหาร';if(L.kills&&best.kills<L.kills)return 'ฆ่า '+L.kills+' ตัวในเกมเดียว';if(L.nights&&best.nights<L.nights)return 'รอด '+L.nights+' คืน';return '';}
