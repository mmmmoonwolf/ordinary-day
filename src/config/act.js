// ---------- the second town (v0.66) ----------
// Reaching the end of the army camp can lead on to another town instead of the end screen: the page loads again with
// ACT 2 in this tab (sessionStorage), and the city is built from another seed, so its streets, buildings and shops differ
// (the farm, suburb, river, highway and camp around it stay). Nobody there knows yet: the morning is calm for longer,
// until a bitten survivor from the first town staggers in at `outbreak`. The player brings their bag and weapons.
const K='ordinary-day.act',CARRY='ordinary-day.carry',REJOIN='ordinary-day.rejoin';
const ss=()=>{try{return globalThis.sessionStorage||null;}catch(_){return null;}};
export const ACT=(()=>{const s=ss();try{return s&&s.getItem(K)==='2'?2:1;}catch(_){return 1;}})();
export const SEED=ACT===2?7151:2626;   // 2626: the first town, as it has always been
export const ACT2={outbreak:12*60+30};   // PLACEHOLDER in-game minute the escapee arrives (the first town: 09:30)
// The in-game minute of the outbreak in this town: 09:30 in the first (confirmed, Q11). Whatever is timed against the
// outbreak (the morning's events, a PvP game's start, the first radio broadcast) reads it here, not as 9*60+30.
export const OUTBREAK=ACT===2?ACT2.outbreak:9*60+30;
export function goTo(act,carry){const s=ss();if(!s)return false;try{s.setItem(K,String(act));if(carry)s.setItem(CARRY,JSON.stringify(carry));else s.removeItem(CARRY);}catch(_){return false;}return true;}
export function takeCarry(){const s=ss();if(!s)return null;try{const c=JSON.parse(s.getItem(CARRY)||'null');s.removeItem(CARRY);return c;}catch(_){return null;}}
export function setRejoin(code){const s=ss();try{if(s)s.setItem(REJOIN,code);}catch(_){}}
export function takeRejoin(){const s=ss();try{const c=s&&s.getItem(REJOIN);if(c)s.removeItem(REJOIN);return c||'';}catch(_){return '';}}
