export const isTouch = matchMedia('(pointer:coarse)').matches;
export const $ = id => document.getElementById(id);

// ---------- rng ----------
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const rand = mulberry32(2626);
export const R = (a,b)=>a+(b-a)*rand();
export const pickS = arr=>arr[Math.floor(rand()*arr.length)];
export const rnd = (a,b)=>a+(b-a)*Math.random();
export const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export function wpick(obj){let s=0;for(const k in obj)s+=obj[k];let r=Math.random()*s;for(const k in obj){r-=obj[k];if(r<=0)return k;}return Object.keys(obj)[0];}
