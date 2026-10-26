import {rnd,pick} from '../core/util.js';
import {renderer} from '../core/renderer.js';

// ---------- textures ----------
export function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
export function grain(g,w,h,n,alpha,size){for(let i=0;i<n;i++){g.fillStyle=Math.random()<.5?`rgba(0,0,0,${alpha*Math.random()})`:`rgba(255,255,255,${alpha*Math.random()})`;const s=1+Math.random()*size;g.fillRect(Math.random()*w,Math.random()*h,s,s);}}
export function stains(g,w,h,n,rgb,maxR,alpha){for(let i=0;i<n;i++){const x=Math.random()*w,y=Math.random()*h,r=maxR*(.3+Math.random()*.7);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${rgb},${alpha*(.4+Math.random()*.6)})`);gr.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}}
export function T(c,rx,ry){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
// v0.34: an old European town nobody lives in any more. The canvas is eight floors high (city.js maps 3.2 m to each 64 px
// row, from the bottom). Ground floor: old shopfronts in painted wooden frames (dark glass, smashed, boarded or behind a
// rusted roller shutter) and arched doorways on a stone plinth. Above: tall narrow windows in stone surrounds with
// louvred wooden shutters, open, closed, one hanging loose or gone; a cornice at every floor; stone blocks, flaking
// render or dark brick, damp and grime under every ledge and ivy climbing from the pavement. Each bay is 4 m (64 px)
// wide, so world/oldtown.js can hang signs over the shops and balconies under the windows.
const WH=512;
const shade=(c,k)=>`rgb(${c.r*255*k|0},${c.g*255*k|0},${c.b*255*k|0})`;
function bricks(g,base){const c=new THREE.Color(base);for(let y=0;y<WH;y+=8)for(let x=-(y/8%2)*8;x<256;x+=16)g.fillStyle=shade(c,.78+Math.random()*.3),g.fillRect(x+1,y+1,14,6);}
function ashlar(g,base){const c=new THREE.Color(base);for(let y=0;y<WH;y+=16)for(let x=-(y/16%2)*20;x<256;x+=40){g.fillStyle=shade(c,.86+Math.random()*.18);g.fillRect(x+1,y+1,38,14);}}
function louvre(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(x,y,w,h);g.fillStyle='rgba(0,0,0,.35)';for(let k=y+3;k<y+h-2;k+=3)g.fillRect(x+1,k,w-2,1);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);}
function wallTex(base,style){
  const [c,g]=mk(256,WH),[e,ge]=mk(256,WH),col=new THREE.Color(base);
  g.fillStyle=style==='brick'?'#3e342d':style==='stone'?'#4a4740':base;g.fillRect(0,0,256,WH);
  if(style==='brick')bricks(g,base);else if(style==='stone')ashlar(g,base);
  grain(g,256,WH,7000,.22,2);stains(g,256,WH,30,'26,24,20',70,.32);
  if(style==='render')for(let i=0;i<26;i++){const x=Math.random()*240,y=Math.random()*(WH-20),w=10+Math.random()*30,h=8+Math.random()*22;g.fillStyle='rgba(84,70,58,.6)';g.fillRect(x,y,w,h);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x,y+h,w,1.5);}   // render fallen off, bare masonry under it
  ge.fillStyle='#000';ge.fillRect(0,0,256,WH);
  const shutterCol=pick(['#4b5a48','#3f4f5a','#5a4636','#55534c','#6a5a3a']);
  for(let f=0;f<8;f++){
    const y=f*64,ground=f===7;
    for(let i=0;i<6;i++){const x=Math.random()*256,gr=g.createLinearGradient(0,y+60,0,y+60+60);gr.addColorStop(0,'rgba(16,15,12,.5)');gr.addColorStop(1,'rgba(16,15,12,0)');g.fillStyle=gr;g.fillRect(x,y+60,2+Math.random()*10,60);}   // damp running from the cornice
    g.fillStyle=shade(col,1.12);g.fillRect(0,y,256,4);g.fillStyle='rgba(0,0,0,.42)';g.fillRect(0,y+4,256,2);   // the cornice
    for(let b=0;b<4;b++){
      const x=b*64,r=Math.random();
      if(ground){
        g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,y+56,64,8);   // stone plinth
        const frame=pick(['#2f3b30','#3a2a24','#2a2f38','#3b3428']);
        if(r<.2){   // an arched doorway
          g.fillStyle='rgba(0,0,0,.4)';g.fillRect(x+18,y+20,28,40);g.fillStyle='#0c0b0a';g.beginPath();g.moveTo(x+21,y+60);g.lineTo(x+21,y+30);g.arc(x+32,y+30,11,Math.PI,0);g.lineTo(x+43,y+60);g.fill();
          g.fillStyle=shade(col,1.1);g.fillRect(x+16,y+18,32,2);
        }else{
          g.fillStyle=frame;g.fillRect(x+6,y+16,52,42);
          const gx=x+9,gy=y+19,gw=46,gh=34,k=Math.random();
          if(k<.35){g.fillStyle='#14171a';g.fillRect(gx,gy,gw,gh);g.fillStyle='rgba(160,170,175,.16)';g.beginPath();g.moveTo(gx+2,gy+2);g.lineTo(gx+16,gy+2);g.lineTo(gx+2,gy+20);g.fill();g.fillStyle=frame;g.fillRect(gx+gw/2-1,gy,2,gh);}   // dark glass
          else if(k<.6){g.fillStyle='#070707';g.fillRect(gx,gy,gw,gh);g.fillStyle='rgba(150,165,170,.4)';g.beginPath();g.moveTo(gx,gy);g.lineTo(gx+gw*.5,gy);g.lineTo(gx+gw*.15,gy+gh*.6);g.fill();g.beginPath();g.moveTo(gx+gw,gy+gh);g.lineTo(gx+gw*.6,gy+gh);g.lineTo(gx+gw,gy+gh*.5);g.fill();}   // smashed
          else if(k<.8){g.fillStyle='#4e4232';g.fillRect(gx,gy,gw,gh);g.fillStyle='rgba(0,0,0,.45)';for(let n=0;n<5;n++)g.fillRect(gx,gy+n*7+5,gw,1.5);}   // boarded
          else{g.fillStyle='#6d6a64';g.fillRect(gx,gy,gw,gh);for(let n=gy+2;n<gy+gh;n+=3){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(gx,n,gw,1);}for(let n=0;n<3;n++){const sx=gx+Math.random()*gw,gr=g.createLinearGradient(0,gy,0,gy+gh);gr.addColorStop(0,'rgba(110,52,22,0)');gr.addColorStop(1,'rgba(110,52,22,.55)');g.fillStyle=gr;g.fillRect(sx,gy+8,3+Math.random()*7,gh-8);}}   // a rusted roller shutter
        }
        continue;
      }
      const wx=x+20,wy=y+10,w=24,h=42;
      g.fillStyle=shade(col,1.15);g.fillRect(wx-4,wy-5,w+8,4);g.fillRect(wx-5,wy+h,w+10,3);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(wx-3,wy+h+3,w+6,2);   // lintel and sill
      g.fillStyle='rgba(0,0,0,.45)';g.fillRect(wx-2,wy-1,w+4,h+2);
      if(r<.12){g.fillStyle='#4a3e30';g.fillRect(wx,wy,w,h);g.fillStyle='rgba(0,0,0,.45)';for(let n=0;n<5;n++)g.fillRect(wx,wy+n*8+5,w,1.5);continue;}   // boarded
      if(r<.3){louvre(g,wx,wy,w/2,h,shutterCol);louvre(g,wx+w/2,wy,w/2,h,shutterCol);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(wx+w/2-.5,wy,1,h);continue;}   // shutters closed
      const gr=g.createLinearGradient(wx,wy,wx+w,wy+h);gr.addColorStop(0,'#2a2d2c');gr.addColorStop(.5,'#141716');gr.addColorStop(1,'#202322');g.fillStyle=gr;g.fillRect(wx,wy,w,h);
      g.fillStyle='rgba(170,165,150,.45)';g.fillRect(wx+w/2-1,wy,2,h);g.fillRect(wx,wy+h*.38,w,1.5);g.fillRect(wx,wy+h*.7,w,1.5);   // casement bars
      if(r<.42){g.fillStyle='#050505';g.fillRect(wx+2,wy+4,w-4,h*.5);}   // a pane gone
      if(Math.random()<.35){g.fillStyle='rgba(150,140,118,.4)';g.fillRect(wx+1,wy+1,w*.4,h-2);}   // a torn curtain
      if(Math.random()<.08){ge.fillStyle=pick(['#ffb85e','#f2a24e']);ge.fillRect(wx,wy,w,h);ge.fillStyle='#000';ge.fillRect(wx+w/2-1,wy,2,h);}
      // the shutters open against the wall: both, one, or one hanging off a hinge
      const s=Math.random();
      if(s<.55){louvre(g,wx-13,wy,12,h,shutterCol);louvre(g,wx+w+1,wy,12,h,shutterCol);}
      else if(s<.75)louvre(g,wx+w+1,wy,12,h,shutterCol);
      else if(s<.88){g.save();g.translate(wx-1,wy+h);g.rotate(-.35);louvre(g,-12,-h+6,12,h,shutterCol);g.restore();}
    }
  }
  // ivy climbing from the pavement up a corner
  if(Math.random()<.5){const x0=Math.random()*200;for(let i=0;i<900;i++){const yy=WH-Math.pow(Math.random(),1.6)*220,xx=x0+(Math.random()-.5)*(60+(WH-yy)*.1);g.fillStyle=`rgba(${40+Math.random()*30|0},${60+Math.random()*35|0},${30+Math.random()*20|0},.85)`;g.fillRect(xx,yy,2+Math.random()*3,2+Math.random()*3);}}
  return {map:T(c),emi:T(e)};
}
function tarTex(){const [c,g]=mk(128,128);g.fillStyle='#57585a';g.fillRect(0,0,128,128);grain(g,128,128,1500,.15,2);stains(g,128,128,8,'25,25,25',30,.35);stains(g,128,128,4,'120,110,95',22,.25);g.strokeStyle='rgba(0,0,0,.25)';for(let i=0;i<4;i++){g.beginPath();g.moveTo(0,i*32+Math.random()*4);g.lineTo(128,i*32+Math.random()*4);g.stroke();}return T(c);}
function corrTex(){const [c,g]=mk(128,128);for(let x=0;x<128;x+=8){const gr=g.createLinearGradient(x,0,x+8,0);gr.addColorStop(0,'#d9dcdc');gr.addColorStop(.5,'#9fa5a7');gr.addColorStop(1,'#d2d6d6');g.fillStyle=gr;g.fillRect(x,0,8,128);}grain(g,128,128,700,.12,2);stains(g,128,128,16,'168,88,38',22,.65);stains(g,128,128,8,'110,55,25',12,.6);return T(c);}
export function asphaltTex(){const [c,g]=mk(128,128);g.fillStyle='#3d3f42';g.fillRect(0,0,128,128);grain(g,128,128,3000,.18,2);stains(g,128,128,6,'20,20,22',28,.4);stains(g,128,128,4,'95,95,92',20,.18);
  g.strokeStyle='rgba(15,15,15,.6)';g.lineWidth=1;for(let i=0;i<5;i++){g.beginPath();let x=Math.random()*128,y=Math.random()*128;g.moveTo(x,y);for(let k=0;k<5;k++){x+=rnd(-14,14);y+=rnd(-14,14);g.lineTo(x,y);}g.stroke();}
  g.fillStyle='rgba(230,226,214,.82)';g.fillRect(62,6,4,46);g.fillStyle='rgba(230,226,214,.7)';g.fillRect(7,0,3,128);g.fillRect(118,0,3,128);return T(c,1,17);}
// v0.34 the pavements: worn stone setts, sunk and cracked, weeds and dirt in the joints
export function pavingTex(){const [c,g]=mk(256,256);g.fillStyle='#3d3a35';g.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=16)for(let x=-(y/16%2)*12;x<256;x+=24){const k=.8+Math.random()*.3,v=96*k|0;g.fillStyle=`rgb(${v+6},${v+2},${v-6})`;g.fillRect(x+1.5,y+1.5,21,13);}
  grain(g,256,256,4000,.18,2);stains(g,256,256,14,'40,36,28',30,.4);stains(g,256,256,6,'60,70,40',16,.35);return T(c,3,3);}
export function concreteTex(){const [c,g]=mk(128,128);g.fillStyle='#7c7870';g.fillRect(0,0,128,128);grain(g,128,128,2600,.17,2);stains(g,128,128,10,'52,48,40',24,.38);stains(g,128,128,4,'70,78,48',14,.3);g.fillStyle='rgba(40,38,34,.35)';for(let i=0;i<=128;i+=32){g.fillRect(i,0,1.5,128);g.fillRect(0,i,128,1.5);}return T(c,6,6);}
export function grassTex(){const [c,g]=mk(128,128);g.fillStyle='#5d6141';g.fillRect(0,0,128,128);stains(g,128,128,10,'112,100,74',26,.7);stains(g,128,128,8,'72,86,48',20,.6);for(let i=0;i<900;i++){g.fillStyle=`rgba(${80+Math.random()*60|0},${95+Math.random()*50|0},${50+Math.random()*30|0},.6)`;g.fillRect(Math.random()*128,Math.random()*128,1,2+Math.random()*3);}return T(c,4,4);}
export function dirtTex(){const [c,g]=mk(128,128);g.fillStyle='#4a473c';g.fillRect(0,0,128,128);grain(g,128,128,2000,.15,2);stains(g,128,128,10,'70,78,48',26,.5);return T(c,70,70);}
function glowTex(){const [c,g]=mk(128,128);const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,205,140,1)');gr.addColorStop(.4,'rgba(255,180,110,.45)');gr.addColorStop(1,'rgba(255,170,100,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
export const WALLS=[['#8a8478','stone'],['#8d7a5c','render'],['#6b4334','brick'],['#7d776c','render'],['#757067','stone'],['#5e3a30','brick']].map(([b,s])=>Object.assign(wallTex(b,s),{base:b}));
export const TAR=tarTex(),CORR=corrTex(),GLOW=glowTex();
