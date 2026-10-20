import {rnd,pick} from '../core/util.js';
import {renderer} from '../core/renderer.js';

// ---------- textures ----------
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function grain(g,w,h,n,alpha,size){for(let i=0;i<n;i++){g.fillStyle=Math.random()<.5?`rgba(0,0,0,${alpha*Math.random()})`:`rgba(255,255,255,${alpha*Math.random()})`;const s=1+Math.random()*size;g.fillRect(Math.random()*w,Math.random()*h,s,s);}}
function stains(g,w,h,n,rgb,maxR,alpha){for(let i=0;i<n;i++){const x=Math.random()*w,y=Math.random()*h,r=maxR*(.3+Math.random()*.7);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${rgb},${alpha*(.4+Math.random()*.6)})`);gr.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}}
function T(c,rx,ry){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
function wallTex(base){
  const [c,g]=mk(256,256),[e,ge]=mk(256,256);
  g.fillStyle=base;g.fillRect(0,0,256,256);grain(g,256,256,2600,.16,2);stains(g,256,256,10,'40,32,24',60,.18);
  for(let i=0;i<18;i++){g.fillStyle='rgba(35,28,22,.13)';g.fillRect(Math.random()*256,Math.random()*200,1+Math.random()*4,30+Math.random()*90);}
  ge.fillStyle='#000';ge.fillRect(0,0,256,256);
  for(let f=0;f<4;f++){
    g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,f*64+61,256,3);
    for(let b=0;b<4;b++){
      const x=b*64+16,y=f*64+13,w=32,h=34;
      g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x-3,y-3,w+6,h+7);
      if(Math.random()<.1){g.fillStyle='#5b4a38';g.fillRect(x,y,w,h);g.fillStyle='rgba(0,0,0,.35)';for(let k=0;k<4;k++)g.fillRect(x,y+k*9+7,w,1.5);}
      else{
        const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,'#3b464f');gr.addColorStop(.5,'#232b32');gr.addColorStop(1,'#2f383f');
        g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='rgba(215,210,198,.55)';g.fillRect(x+w/2-1,y,2,h);g.fillRect(x,y+h*.42,w,1.5);
        if(Math.random()<.42){ge.fillStyle=pick(['#ffcf86','#ffd9a3','#f6b86a','#fff0cc','#c9e0ff']);ge.fillRect(x,y,w,h);ge.fillStyle='#000';ge.fillRect(x+w/2-1,y,2,h);ge.fillRect(x,y+h*.42,w,1.5);if(Math.random()<.5){ge.fillStyle='rgba(0,0,0,.6)';ge.fillRect(x,y,w*(.3+Math.random()*.5),h);}}
      }
      g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x-4,y+h+1,w+8,3);
    }
  }
  return {map:T(c),emi:T(e)};
}
function tarTex(){const [c,g]=mk(128,128);g.fillStyle='#57585a';g.fillRect(0,0,128,128);grain(g,128,128,1500,.15,2);stains(g,128,128,8,'25,25,25',30,.35);stains(g,128,128,4,'120,110,95',22,.25);g.strokeStyle='rgba(0,0,0,.25)';for(let i=0;i<4;i++){g.beginPath();g.moveTo(0,i*32+Math.random()*4);g.lineTo(128,i*32+Math.random()*4);g.stroke();}return T(c);}
function corrTex(){const [c,g]=mk(128,128);for(let x=0;x<128;x+=8){const gr=g.createLinearGradient(x,0,x+8,0);gr.addColorStop(0,'#d9dcdc');gr.addColorStop(.5,'#9fa5a7');gr.addColorStop(1,'#d2d6d6');g.fillStyle=gr;g.fillRect(x,0,8,128);}grain(g,128,128,700,.12,2);stains(g,128,128,16,'168,88,38',22,.65);stains(g,128,128,8,'110,55,25',12,.6);return T(c);}
export function asphaltTex(){const [c,g]=mk(128,128);g.fillStyle='#3d3f42';g.fillRect(0,0,128,128);grain(g,128,128,3000,.18,2);stains(g,128,128,6,'20,20,22',28,.4);stains(g,128,128,4,'95,95,92',20,.18);
  g.strokeStyle='rgba(15,15,15,.6)';g.lineWidth=1;for(let i=0;i<5;i++){g.beginPath();let x=Math.random()*128,y=Math.random()*128;g.moveTo(x,y);for(let k=0;k<5;k++){x+=rnd(-14,14);y+=rnd(-14,14);g.lineTo(x,y);}g.stroke();}
  g.fillStyle='rgba(230,226,214,.82)';g.fillRect(62,6,4,46);g.fillStyle='rgba(230,226,214,.7)';g.fillRect(7,0,3,128);g.fillRect(118,0,3,128);return T(c,1,17);}
export function concreteTex(){const [c,g]=mk(128,128);g.fillStyle='#8f8c85';g.fillRect(0,0,128,128);grain(g,128,128,2200,.14,2);stains(g,128,128,7,'60,58,52',22,.3);g.fillStyle='rgba(40,38,34,.35)';for(let i=0;i<=128;i+=32){g.fillRect(i,0,1.5,128);g.fillRect(0,i,128,1.5);}return T(c,6,6);}
export function grassTex(){const [c,g]=mk(128,128);g.fillStyle='#626d47';g.fillRect(0,0,128,128);stains(g,128,128,10,'112,100,74',26,.7);stains(g,128,128,8,'72,86,48',20,.6);for(let i=0;i<900;i++){g.fillStyle=`rgba(${80+Math.random()*60|0},${95+Math.random()*50|0},${50+Math.random()*30|0},.6)`;g.fillRect(Math.random()*128,Math.random()*128,1,2+Math.random()*3);}return T(c,4,4);}
export function dirtTex(){const [c,g]=mk(128,128);g.fillStyle='#4a473c';g.fillRect(0,0,128,128);grain(g,128,128,2000,.15,2);stains(g,128,128,10,'70,78,48',26,.5);return T(c,70,70);}
function glowTex(){const [c,g]=mk(128,128);const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,205,140,1)');gr.addColorStop(.4,'rgba(255,180,110,.45)');gr.addColorStop(1,'rgba(255,170,100,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
export const WALLS=['#8c5a48','#c4b293','#9c9a91','#b88a7d','#a99f7b','#7b6f66'].map(b=>Object.assign(wallTex(b),{base:b}));
export const TAR=tarTex(),CORR=corrTex(),GLOW=glowTex();
