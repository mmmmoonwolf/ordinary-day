// ---------- world constants ----------
export const RC=[-64,-32,0,32,64];
export const OFF=5.3;
export const LIM=67.4;
export function nearestIdx(v){let b=0;for(let i=1;i<5;i++) if(Math.abs(v-RC[i])<Math.abs(v-RC[b])) b=i;return b;}
export function groundY(x,z){return (Math.abs(x-RC[nearestIdx(x)])>4 && Math.abs(z-RC[nearestIdx(z)])>4)?0.18:0.02;}
