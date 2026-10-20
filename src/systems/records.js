// ---------- records ----------
// Best results across runs, kept per browser like the save, one set per difficulty.
// Records from before v0.5 (no difficulty) count as normal.
const BEST_KEY='ordinary-day.best';
export function recordRun(run){
  let all={};
  try{all=JSON.parse(localStorage.getItem(BEST_KEY)||'{}');}catch(_){}
  if('nights' in all)all={normal:{nights:all.nights,kills:all.kills,wins:all.wins}};
  const best=Object.assign({nights:0,kills:0,wins:0},all[run.diff]);
  const isNew=run.nights>best.nights||run.kills>best.kills;
  best.nights=Math.max(best.nights,run.nights);best.kills=Math.max(best.kills,run.kills);if(run.won)best.wins++;
  all[run.diff]=best;
  try{localStorage.setItem(BEST_KEY,JSON.stringify(all));}catch(_){}
  return {best,isNew};
}
