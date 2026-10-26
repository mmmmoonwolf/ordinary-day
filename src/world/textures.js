import {rnd,pick} from '../core/util.js';
import {renderer} from '../core/renderer.js';

// ---------- textures ----------
export function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
export function grain(g,w,h,n,alpha,size){for(let i=0;i<n;i++){g.fillStyle=Math.random()<.5?`rgba(0,0,0,${alpha*Math.random()})`:`rgba(255,255,255,${alpha*Math.random()})`;const s=1+Math.random()*size;g.fillRect(Math.random()*w,Math.random()*h,s,s);}}
export function stains(g,w,h,n,rgb,maxR,alpha){for(let i=0;i<n;i++){const x=Math.random()*w,y=Math.random()*h,r=maxR*(.3+Math.random()*.7);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${rgb},${alpha*(.4+Math.random()*.6)})`);gr.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}}
export function T(c,rx,ry){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
// v0.33: Thai shophouses (ตึกแถว). The canvas is eight floors high (city.js maps 3.2 m to each 64 px row, from the
// bottom): the ground floor is a row of shops behind roll-up steel shutters, some pulled half up or forced open, some
// glass fronts; above, aluminium windows behind steel grilles, many boarded or broken. Faded paint, small mosaic tiles,
// bare concrete or old brick, black mould running down from every ledge. Each bay is 4 m (64 px) wide, so world/thai.js
// can hang signs over the shops and air conditioners between the windows.
const WH=512;
function bricks(g,base){
  const c=new THREE.Color(base);
  for(let y=0;y<WH;y+=8)for(let x=-(y/8%2)*8;x<256;x+=16){const k=.82+Math.random()*.3;g.fillStyle=`rgb(${c.r*255*k|0},${c.g*255*k|0},${c.b*255*k|0})`;g.fillRect(x+1,y+1,14,6);}
}
function tiles(g,base){const c=new THREE.Color(base);for(let y=0;y<WH;y+=5)for(let x=0;x<256;x+=5){const k=.86+Math.random()*.22;g.fillStyle=`rgb(${c.r*255*k|0},${c.g*255*k|0},${c.b*255*k|0})`;g.fillRect(x,y,4,4);}}
function shutter(g,x,y,w,h,paint){
  g.fillStyle=paint;g.fillRect(x,y,w,h);
  for(let k=y+2;k<y+h;k+=3){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x,k,w,1);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(x,k+1,w,1);}
  for(let i=0;i<3;i++){const sx=x+Math.random()*w,gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'rgba(120,58,26,0)');gr.addColorStop(1,'rgba(120,58,26,.45)');g.fillStyle=gr;g.fillRect(sx,y+h*.3,2+Math.random()*6,h*.7);}   // rust
  g.fillStyle='rgba(20,20,20,.75)';g.fillRect(x+w/2-2,y+h-5,4,4);   // padlock
}
function wallTex(base,style){
  const [c,g]=mk(256,WH),[e,ge]=mk(256,WH);
  g.fillStyle=style==='brick'?'#4a4038':base;g.fillRect(0,0,256,WH);
  if(style==='brick')bricks(g,base);else if(style==='tile')tiles(g,base);
  grain(g,256,WH,6400,.2,2);stains(g,256,WH,28,'30,32,24',60,.3);
  if(style==='paint')for(let i=0;i<22;i++){const x=Math.random()*240,y=Math.random()*(WH-16),w=8+Math.random()*26,h=6+Math.random()*18;g.fillStyle='rgba(150,146,134,.5)';g.fillRect(x,y,w,h);g.fillStyle='rgba(0,0,0,.16)';g.fillRect(x,y+h,w,1.5);}   // paint flaking off the render
  ge.fillStyle='#000';ge.fillRect(0,0,256,WH);
  for(let f=0;f<8;f++){
    const y=f*64,ground=f===7;
    for(let i=0;i<5;i++){const x=Math.random()*256,gr=g.createLinearGradient(0,y+62,0,y+62+50);gr.addColorStop(0,'rgba(18,20,14,.42)');gr.addColorStop(1,'rgba(18,20,14,0)');g.fillStyle=gr;g.fillRect(x,y+62,2+Math.random()*9,50);}   // mould from the ledge above
    g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,y,256,3);g.fillStyle='rgba(220,214,196,.16)';g.fillRect(0,y+3,256,2);   // floor ledge
    for(let b=0;b<4;b++){
      const x=b*64,r=Math.random();
      if(ground){
        g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x,y,6,64);g.fillRect(x+58,y,6,64);   // the pillars between shops
        g.fillStyle='#2a2b2b';g.fillRect(x+6,y+14,52,5);   // the shutter box
        if(r<.5)shutter(g,x+6,y+19,52,45,Math.random()<.25?pick(['#4f6f86','#5d7a5a','#8a4a3a']):'#8d9192');
        else if(r<.72){const h=12+Math.random()*20;shutter(g,x+6,y+19,52,h,'#8d9192');g.fillStyle='#0b0b0c';g.fillRect(x+6,y+19+h,52,45-h);}   // pulled half up
        else if(r<.88){g.fillStyle='#0d0e0f';g.fillRect(x+6,y+19,52,45);g.fillStyle='rgba(120,110,90,.3)';for(let k=0;k<3;k++)g.fillRect(x+10,y+28+k*11,44,2);g.fillStyle='rgba(150,150,150,.5)';g.fillRect(x+6,y+19,52,3);}   // forced open, shelves inside
        else{g.fillStyle='#1b2023';g.fillRect(x+6,y+19,52,45);g.fillStyle='rgba(190,196,198,.55)';g.fillRect(x+6,y+19,52,2);for(const k of [6,24,40,57])g.fillRect(x+k,y+19,2,45);g.fillStyle='rgba(160,175,185,.18)';g.beginPath();g.moveTo(x+8,y+21);g.lineTo(x+20,y+21);g.lineTo(x+8,y+40);g.fill();}   // glass front with a door
        continue;
      }
      const wx=x+14,wy=y+13,w=36,h=34;
      g.fillStyle='rgba(0,0,0,.38)';g.fillRect(wx-3,wy-3,w+6,h+7);
      if(r<.16){g.fillStyle='#5a4a38';g.fillRect(wx,wy,w,h);g.fillStyle='rgba(0,0,0,.4)';for(let k=0;k<4;k++)g.fillRect(wx,wy+k*9+7,w,1.5);}   // boarded up
      else if(r<.26){g.fillStyle='#0d0f10';g.fillRect(wx,wy,w,h);g.fillStyle='rgba(150,165,170,.45)';g.beginPath();g.moveTo(wx,wy);g.lineTo(wx+w*.6,wy);g.lineTo(wx+w*.2,wy+h*.5);g.fill();}   // broken
      else{
        const gr=g.createLinearGradient(wx,wy,wx+w,wy+h);gr.addColorStop(0,'#3a3f40');gr.addColorStop(.5,'#1e2324');gr.addColorStop(1,'#2c3132');
        g.fillStyle=gr;g.fillRect(wx,wy,w,h);g.fillStyle='rgba(200,204,200,.5)';g.fillRect(wx+w/2-1,wy,2,h);g.fillRect(wx,wy,w,1.5);g.fillRect(wx,wy+h-1.5,w,1.5);   // aluminium sliding window
        if(Math.random()<.4){g.fillStyle=pick(['rgba(170,120,110,.45)','rgba(120,140,160,.45)','rgba(180,170,130,.45)']);g.fillRect(wx+1,wy+1,w*.45,h-2);}   // a curtain
        if(Math.random()<.18){ge.fillStyle=pick(['#ffb85e','#ffc982','#f2a24e']);ge.fillRect(wx,wy,w,h);ge.fillStyle='#000';ge.fillRect(wx+w/2-1,wy,2,h);}
      }
      if(r>=.16&&Math.random()<.75){   // steel grille (เหล็กดัด) in front: bars and a band of diamonds
        const col=pick(['rgba(30,30,30,.9)','rgba(30,30,30,.9)','rgba(214,210,196,.85)','rgba(60,90,70,.9)']);g.fillStyle=col;ge.fillStyle='#000';
        for(let k=wx;k<=wx+w;k+=4){g.fillRect(k,wy-1,1.2,h+2);ge.fillRect(k,wy-1,1.2,h+2);}
        g.strokeStyle=col;g.lineWidth=1.2;g.beginPath();for(let k=wx;k<wx+w;k+=8){g.moveTo(k,wy+h/2);g.lineTo(k+4,wy+h/2-4);g.lineTo(k+8,wy+h/2);g.lineTo(k+4,wy+h/2+4);g.closePath();}g.stroke();
        g.fillRect(wx-2,wy-2,w+4,1.5);g.fillRect(wx-2,wy+h,w+4,1.5);
      }
      g.fillStyle='rgba(220,212,190,.16)';g.fillRect(wx-4,wy+h+1,w+8,3);
    }
  }
  return {map:T(c),emi:T(e)};
}
function tarTex(){const [c,g]=mk(128,128);g.fillStyle='#57585a';g.fillRect(0,0,128,128);grain(g,128,128,1500,.15,2);stains(g,128,128,8,'25,25,25',30,.35);stains(g,128,128,4,'120,110,95',22,.25);g.strokeStyle='rgba(0,0,0,.25)';for(let i=0;i<4;i++){g.beginPath();g.moveTo(0,i*32+Math.random()*4);g.lineTo(128,i*32+Math.random()*4);g.stroke();}return T(c);}
function corrTex(){const [c,g]=mk(128,128);for(let x=0;x<128;x+=8){const gr=g.createLinearGradient(x,0,x+8,0);gr.addColorStop(0,'#d9dcdc');gr.addColorStop(.5,'#9fa5a7');gr.addColorStop(1,'#d2d6d6');g.fillStyle=gr;g.fillRect(x,0,8,128);}grain(g,128,128,700,.12,2);stains(g,128,128,16,'168,88,38',22,.65);stains(g,128,128,8,'110,55,25',12,.6);return T(c);}
export function asphaltTex(){const [c,g]=mk(128,128);g.fillStyle='#3d3f42';g.fillRect(0,0,128,128);grain(g,128,128,3000,.18,2);stains(g,128,128,6,'20,20,22',28,.4);stains(g,128,128,4,'95,95,92',20,.18);
  g.strokeStyle='rgba(15,15,15,.6)';g.lineWidth=1;for(let i=0;i<5;i++){g.beginPath();let x=Math.random()*128,y=Math.random()*128;g.moveTo(x,y);for(let k=0;k<5;k++){x+=rnd(-14,14);y+=rnd(-14,14);g.lineTo(x,y);}g.stroke();}
  g.fillStyle='rgba(230,226,214,.82)';g.fillRect(62,6,4,46);g.fillStyle='rgba(230,226,214,.7)';g.fillRect(7,0,3,128);g.fillRect(118,0,3,128);return T(c,1,17);}
export function concreteTex(){const [c,g]=mk(128,128);g.fillStyle='#7c7870';g.fillRect(0,0,128,128);grain(g,128,128,2600,.17,2);stains(g,128,128,10,'52,48,40',24,.38);stains(g,128,128,4,'70,78,48',14,.3);g.fillStyle='rgba(40,38,34,.35)';for(let i=0;i<=128;i+=32){g.fillRect(i,0,1.5,128);g.fillRect(0,i,128,1.5);}return T(c,6,6);}
export function grassTex(){const [c,g]=mk(128,128);g.fillStyle='#5d6141';g.fillRect(0,0,128,128);stains(g,128,128,10,'112,100,74',26,.7);stains(g,128,128,8,'72,86,48',20,.6);for(let i=0;i<900;i++){g.fillStyle=`rgba(${80+Math.random()*60|0},${95+Math.random()*50|0},${50+Math.random()*30|0},.6)`;g.fillRect(Math.random()*128,Math.random()*128,1,2+Math.random()*3);}return T(c,4,4);}
export function dirtTex(){const [c,g]=mk(128,128);g.fillStyle='#4a473c';g.fillRect(0,0,128,128);grain(g,128,128,2000,.15,2);stains(g,128,128,10,'70,78,48',26,.5);return T(c,70,70);}
function glowTex(){const [c,g]=mk(128,128);const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,205,140,1)');gr.addColorStop(.4,'rgba(255,180,110,.45)');gr.addColorStop(1,'rgba(255,170,100,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
export const WALLS=[['#b3a582','paint'],['#7f907f','paint'],['#a3847a','paint'],['#7d8890','tile'],['#6b4334','brick'],['#77746c','concrete']].map(([b,s])=>Object.assign(wallTex(b,s),{base:b}));
export const TAR=tarTex(),CORR=corrTex(),GLOW=glowTex();
// v0.33 Thai lettering on canvases: Chakra Petch (loaded by index.html) or the system's Thai font. draw() runs now and
// once more when the font's Thai glyphs have loaded, so the texture it fills must be flagged for upload in draw()
export const THAI_FONT='"Chakra Petch", Tahoma, "Leelawadee UI", Thonburi, "Noto Sans Thai", sans-serif';
const fontReady=globalThis.document&&document.fonts&&document.fonts.load?Promise.all(['700','500'].map(w=>document.fonts.load(w+' 40px "Chakra Petch"','กขคงไทย'))).catch(()=>{}):null;
export function withThaiFont(draw){draw();if(fontReady)fontReady.then(draw);}
