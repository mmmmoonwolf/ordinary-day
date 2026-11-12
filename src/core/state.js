// ---------- state ----------
export const G={};
export function freshG(){return {min:7*60+30,running:G.running||false,paused:false,over:false,outbreak:false,speedIdx:G.speedIdx||0,night:0,rain:0,rainTarget:0,wet:0,
  nextWeather:14*60,kills:0,lastMinShown:-1,alertT:0,alertA:null,gunTip:false,phase:'day',duskDay:0,
  armorNight:false,armorNext:1e9,armorAnnounced:false,armorCount:0,killsBy:{},endCause:null,diff:G.diff||'normal',broken:[],blown:[],traps:[],campRadio:false,doors:[],searched:[],plan:[],drop:null,site:null,alarm:null,fog:0,dog:null,npcPlaced:false,storm:0,boltAt:0,castAt:null,blackout:false,mode:'coop',pvpHorde:1e9,pings:[],ptraps:[],rescueSaid:'',tyrantPending:false,tyrantAt:1e9,nightSpawnNext:1e9,runNoise:0,nested:false,calm:0,dirT:0};}
Object.assign(G,freshG());
// A new game: every field back to its start. Fields that systems add later and freshG() does not list (the nests'
// `nested`, the director's `calm`, the camp siren's `exitSaid`, the PvP round) are removed, not kept: left behind
// they carried on into the next game on the same page (no nests in the second game, a stale blood night).
export function resetG(){const f=freshG();for(const k of Object.keys(G))delete G[k];Object.assign(G,f);}
// v0.47 a PvP room (systems/pvp.js) rather than playing together against the zombies
export const isPvp=()=>G.mode==='pvp';
// v0.51 PvP rules: everyone for themselves (ffa), two teams, infection (zombie players against people), king of the
// hill; sideOf: players on the same side cannot hurt each other
export const pvpRule=()=>G.pvpRule||'ffa';
export const sideOf=p=>G.pvpRule==='team'?'t'+(p.team||0):G.pvpRule==='infect'?(p.zed?'z':'h'):'p'+p.id;
