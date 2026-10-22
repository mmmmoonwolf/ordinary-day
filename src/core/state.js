// ---------- state ----------
export const G={};
export function freshG(){return {min:7*60+30,running:G.running||false,paused:false,over:false,outbreak:false,speedIdx:G.speedIdx||0,night:0,rain:0,rainTarget:0,wet:0,
  nextWeather:14*60,kills:0,lastMinShown:-1,alertT:0,alertA:null,gunTip:false,phase:'day',duskDay:0,
  armorNight:false,armorNext:1e9,armorAnnounced:false,armorCount:0,killsBy:{},endCause:null,diff:G.diff||'normal',broken:[],doors:[],stay:null,rescueSaid:'',tyrantPending:false,tyrantAt:1e9,nightSpawnNext:1e9,runNoise:0};}
Object.assign(G,freshG());
