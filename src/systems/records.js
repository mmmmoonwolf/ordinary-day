// ---------- records ----------
// Best results across runs, kept per browser like the save
const BEST_KEY='ordinary-day.best';
export function recordRun(run){
  const best={nights:0,kills:0,wins:0};
  try{Object.assign(best,JSON.parse(localStorage.getItem(BEST_KEY)||'{}'));}catch(_){}
  const isNew=run.nights>best.nights||run.kills>best.kills;
  best.nights=Math.max(best.nights,run.nights);best.kills=Math.max(best.kills,run.kills);if(run.won)best.wins++;
  try{localStorage.setItem(BEST_KEY,JSON.stringify(best));}catch(_){}
  return {best,isNew};
}
