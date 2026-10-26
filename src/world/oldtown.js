import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC,groundY} from '../config/world.js';
import {OLD,OLD_SIGNS,OLD_HANG,OLD_POSTERS,OLD_SPRAY} from '../config/oldtown.js';
import {solids,freeAt} from './collision.js';
import {buildings,lootSpots,pois} from './city.js';
import {rooms,roomAt} from './interiors.js';

// ---------- an old European town, abandoned (v0.34) ----------
// What makes the streets read as an old European town after everyone left or died, from boxes and one canvas of
// lettering, no models to load: painted shop boards over the shopfronts, iron brackets with hanging signs, wrought-iron
// balconies, planks over the windows, quarantine notices and missing-person posters, red crosses and warnings sprayed
// on the doors, bedsheets with HELP hung from windows; advertising columns pasted with the same posters, body bags laid
// out on the pavement, suitcases dropped by people who ran, police barriers and sandbags, candles and flowers left at
// the walls. (v0.33 tried a Thai town here; it was replaced.)
// Built after everything else with its own rng; nothing that was there moves, no loot spot is covered, the saves stay.
// Facade parts go in one mesh per building that fades and hides with it (b.mats, b.meshes); street things in one mesh.
// Collision: advertising columns, barriers and sandbags (barriers and sandbags can be vaulted).

// ---------- geometry batch ----------
// A frame places local points: rotate about z, then x, then y, then move, then the parent frame's turn.
function frame(x,y,z,ry=0,rx=0,rz=0,parent=null){
  const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx),cz=Math.cos(rz),sz=Math.sin(rz);
  const rot=(a,b,c)=>{let X=a*cz-b*sz,Y=a*sz+b*cz,Z=c;const Y2=Y*cx-Z*sx;Z=Y*sx+Z*cx;Y=Y2;return [X*cy+Z*sy,Y,-X*sy+Z*cy];};
  const dir=(a,b,c)=>{const r=rot(a,b,c);return parent?parent.dir(...r):r;};
  const pt=(a,b,c)=>{const r=rot(a,b,c);r[0]+=x;r[1]+=y;r[2]+=z;return parent?parent.pt(...r):r;};
  return {pt,dir,sub:(X,Y,Z,RY,RX,RZ)=>frame(X,Y,Z,RY,RX,RZ,{pt,dir})};
}
const rgb=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
const AW=1024,AH=1024,WHITE=[4/AW,1-4/AH,4/AW,1-4/AH];   // atlas size; a white texel for plain coloured parts
class Batch{
  constructor(){this.p=[];this.n=[];this.c=[];this.u=[];this.i=[];}
  // quad a b c d (counter-clockwise seen from the front) with uv rect [u0,v0,u1,v1]
  quad(F,a,b,c,d,nrm,col,uv=WHITE){
    const o=this.p.length/3,k=rgb(col),N=F.dir(...nrm),U=[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]];
    [a,b,c,d].forEach((q,j)=>{this.p.push(...F.pt(...q));this.n.push(...N);this.c.push(...k);this.u.push(...U[j]);});
    this.i.push(o,o+1,o+2,o,o+2,o+3);
  }
  // a box centred on the frame's origin; faces: {front, back} uv for the +z / -z faces
  box(F,w,h,d,col,faces={}){
    const X=w/2,Y=h/2,Z=d/2;
    this.quad(F,[-X,-Y,Z],[X,-Y,Z],[X,Y,Z],[-X,Y,Z],[0,0,1],faces.front?'#ffffff':col,faces.front);
    this.quad(F,[X,-Y,-Z],[-X,-Y,-Z],[-X,Y,-Z],[X,Y,-Z],[0,0,-1],faces.back?'#ffffff':col,faces.back);
    this.quad(F,[X,-Y,Z],[X,-Y,-Z],[X,Y,-Z],[X,Y,Z],[1,0,0],col);
    this.quad(F,[-X,-Y,-Z],[-X,-Y,Z],[-X,Y,Z],[-X,Y,-Z],[-1,0,0],col);
    this.quad(F,[-X,Y,Z],[X,Y,Z],[X,Y,-Z],[-X,Y,-Z],[0,1,0],col);
    this.quad(F,[-X,-Y,-Z],[X,-Y,-Z],[X,-Y,Z],[-X,-Y,Z],[0,-1,0],col);
  }
  // a flat-sided prism or cone along the frame's y, centred on its origin (r1 = 0 for a cone)
  cyl(F,r0,r1,h,seg,col,a0=0,side=null){   // side(s): uv rect for side segment s (posters round a column)
    const Y=h/2;
    for(let s=0;s<seg;s++){
      const a=a0+s/seg*Math.PI*2,b=a0+(s+1)/seg*Math.PI*2,m=(a+b)/2,P=(r,t,y)=>[Math.sin(t)*r,y,Math.cos(t)*r];
      const slope=(r0-r1)/h,l=Math.hypot(1,slope);
      const uv=side&&side(s);this.quad(F,P(r0,a,-Y),P(r0,b,-Y),P(r1||1e-4,b,Y),P(r1||1e-4,a,Y),[Math.sin(m)/l,slope/l,Math.cos(m)/l],uv?'#ffffff':col,uv||WHITE);
      if(r1>0)this.quad(F,[0,Y,0],P(r1,a,Y),P(r1,b,Y),[0,Y,0],[0,1,0],col);
      this.quad(F,[0,-Y,0],P(r0,b,-Y),P(r0,a,-Y),[0,-Y,0],[0,-1,0],col);
    }
  }
  mesh(mat,shadow=true){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
    g.setIndex(this.i);g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;
  }
}

// ---------- the lettering atlas ----------
// one 1024 × 1024 canvas: shop boards (512 × 80, two columns), hanging signs (128 × 96), posters (128 × 160) and spray
// paint (256 × 120, transparent)
const R_SIGN=i=>[(i%2)*512,8+Math.floor(i/2)*80,512,80],R_HANG=i=>[i*128,648,128,96],R_POST=i=>[i*128,744,128,160],R_SPRAY=i=>[i*256,904,256,120];
const uvOf=([x,y,w,h],inset=2)=>[(x+inset)/AW,1-(y+h-inset)/AH,(x+w-inset)/AW,1-(y+inset)/AH];
const SERIF='Georgia, "Times New Roman", serif';
let atlasTex=null;
function makeAtlas(){
  const c=document.createElement('canvas');c.width=AW;c.height=AH;const g=c.getContext('2d');atlasTex=new THREE.CanvasTexture(c);atlasTex.encoding=THREE.sRGBEncoding;
  let s=77;const rr=()=>(s=(s*16807)%2147483647)/2147483647;
  const fit=(text,x,y,maxW,px,weight='bold')=>{g.font=weight+' '+px+'px '+SERIF;g.fillText(text,x,y,maxW);};
  const weather=([x,y,w,h],n,fade=.25)=>{g.fillStyle=`rgba(120,110,90,${fade})`;g.fillRect(x,y,w,h);   // sun-bleached
    for(let i=0;i<n;i++){const a=rr(),b=rr(),k=rr();g.fillStyle=k<.6?`rgba(20,18,14,${k*.5})`:`rgba(220,212,190,${k*.2})`;g.fillRect(x+a*w,y+b*h,2+k*6,1+k*3);}
    for(let i=0;i<4;i++){const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'rgba(30,24,16,0)');gr.addColorStop(1,'rgba(30,24,16,.45)');g.fillStyle=gr;g.fillRect(x+rr()*w,y+h*.3,3+rr()*10,h*.7);}};
  g.fillStyle='#ffffff';g.fillRect(0,0,8,8);g.textAlign='center';g.textBaseline='middle';
  OLD_SIGNS.forEach(([main,sub,bg,ink],i)=>{const r=R_SIGN(i),[x,y,w,h]=r;
    g.fillStyle=bg;g.fillRect(x,y,w,h);g.strokeStyle=ink;g.globalAlpha=.7;g.lineWidth=3;g.strokeRect(x+7,y+7,w-14,h-14);g.globalAlpha=1;
    g.fillStyle=ink;fit(main,x+w/2,y+(sub?34:42),w-50,sub?40:48);if(sub)fit(sub,x+w/2,y+62,w-80,15,'');weather(r,260);});
  OLD_HANG.forEach(([text,bg,ink],i)=>{const r=R_HANG(i),[x,y,w,h]=r;g.fillStyle=bg;g.fillRect(x,y,w,h);g.strokeStyle=ink;g.lineWidth=3;g.strokeRect(x+6,y+6,w-12,h-12);
    if(text==='PHARMACIE'){g.fillStyle=ink;g.fillRect(x+w/2-6,y+16,12,34);g.fillRect(x+w/2-17,y+27,34,12);g.fillStyle=ink;fit(text,x+w/2,y+70,w-20,16);}else{g.fillStyle=ink;fit(text,x+w/2,y+h/2+2,w-22,text.length>6?20:30);}weather(r,90);});
  OLD_POSTERS.forEach(([kind,head,...lines],i)=>{const r=R_POST(i),[x,y,w,h]=r;
    g.fillStyle=kind==='show'?(i%2?'#b8743a':'#7a3a3a'):'#d6d0bf';g.fillRect(x+3,y+3,w-6,h-6);
    if(kind==='notice'){g.fillStyle='#8a1a14';g.fillRect(x+3,y+3,w-6,30);g.fillStyle='#f0e8d8';fit(head,x+w/2,y+19,w-16,18);g.fillStyle='#1a1a1a';lines.forEach((l,k)=>fit(l,x+w/2,y+52+k*20,w-14,11,''));}
    else if(kind==='missing'){g.fillStyle='#1a1a1a';fit(head,x+w/2,y+20,w-16,20);g.fillStyle='#6a665c';g.fillRect(x+30,y+36,w-60,62);g.fillStyle='#3a3832';g.beginPath();g.arc(x+w/2,y+58,12,0,7);g.fill();g.fillRect(x+w/2-18,y+72,36,26);g.fillStyle='#1a1a1a';lines.forEach((l,k)=>fit(l,x+w/2,y+114+k*18,w-12,11,''));}
    else{g.fillStyle='#f0d890';fit(head,x+w/2,y+40,w-14,20);g.fillStyle='#f0e8d0';lines.forEach((l,k)=>fit(l,x+w/2,y+80+k*22,w-14,12,''));}
    weather([x+3,y+3,w-6,h-6],120,.15);g.clearRect(x+w-24+rr()*10,y+h-30,30,30);});   // a torn corner
  OLD_SPRAY.forEach(([text,ink],i)=>{const [x,y,w,h]=R_SPRAY(i);g.save();g.translate(x+w/2,y+h/2);g.rotate(-.05+i*.03);g.fillStyle=ink;g.shadowColor=ink;g.shadowBlur=6;
    g.font='bold '+(text==='X'?110:text.length>12?28:44)+'px Arial, sans-serif';g.fillText(text,0,text==='X'?6:0,w-20);g.restore();
    g.fillStyle=ink;for(let k=0;k<7;k++)g.fillRect(x+30+rr()*(w-60),y+h/2+14,2,8+rr()*28);});   // paint running down
  atlasTex.needsUpdate=true;
}
const sharedMat=()=>new THREE.MeshStandardMaterial({map:atlasTex,vertexColors:true,roughness:.88,alphaTest:.5});

// ---------- the town ----------
export const oldtown={signs:0,hang:0,balconies:0,posters:0,columns:[],bags:0,cases:0,barriers:[],sandbags:0,memorials:0,sheets:0};   // what was built (tests, docs)
const C=OLD.colors;
export function buildOldTown(){
  if(!atlasTex)makeAtlas();
  const rng=mulberry32(3434),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)],chance=p=>rng()<p;
  const nearLoot=(x,z,m)=>lootSpots.some(s=>Math.abs(s.x-x)<m&&Math.abs(s.z-z)<m);
  const nearDoor=(x,z,m)=>rooms.some(q=>Math.hypot(q.dx-x,q.dz-z)<m);
  const clear=(x,z,m)=>Math.abs(x)<66&&Math.abs(z)<66&&freeAt(x,z,m)&&roomAt(x,z,.4)<0&&!nearLoot(x,z,m+.8)&&!nearDoor(x,z,m+2.2);
  // a rectangle clear every 0.5 m (lamp posts and trees are thin)
  const roomy=(x,z,hx,hz)=>{for(let a=-hx;a<=hx+.01;a+=.5)for(let b=-hz;b<=hz+.01;b+=.5)if(!clear(x+a,z+b,.15))return false;return true;};
  const block=(x,z,hx,hz,low)=>{const b={x0:x-hx,x1:x+hx,z0:z-hz,z1:z+hz};if(low)b.low=true;solids.push(b);return b;};
  const open=(x,z)=>Math.abs(x)<66&&Math.abs(z)<66&&freeAt(x,z,.25)&&roomAt(x,z,.3)<0;   // for things without collision
  const street=new Batch();
  const city=buildings.filter(b=>!b.farm&&Math.abs(b.cx)<66&&Math.abs(b.cz)<66);
  // the faces of a building: [nx, nz], length, centre, the direction the wall texture runs along it, and whether it looks
  // onto a street (not into the middle of the block)
  const faces=b=>{
    const bx=RC.findIndex((r,i)=>i<4&&b.cx>r&&b.cx<RC[i+1]),bz=RC.findIndex((r,i)=>i<4&&b.cz>r&&b.cz<RC[i+1]),ccx=(RC[bx]+RC[bx+1])/2,ccz=(RC[bz]+RC[bz+1])/2,out=[];
    for(const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const fx=b.cx+nx*b.w/2,fz=b.cz+nz*b.d/2,gap=nx?(ccx+nx*12-fx)*nx:(ccz+nz*12-fz)*nz;
      // texture u runs from this end of the face (BoxGeometry): +x from +z, -x from -z, +z from -x, -z from +x
      const tx=nz?(nz>0?1:-1):0,tz=nx?(nx>0?-1:1):0,L=nx?b.d:b.w;
      out.push({nx,nz,L,x:fx,z:fz,tx,tz,x0:fx-tx*L/2,z0:fz-tz*L/2,street:gap<4.5,b});
    }
    return out;
  };
  const at=(f,t,out)=>[f.x0+f.tx*t+f.nx*out,f.z0+f.tz*t+f.nz*out];
  const doorOn=f=>rooms.find(q=>q.b===f.b&&q.n[0]===f.nx&&q.n[1]===f.nz);
  const poster=(B,F,i)=>{B.quad(F,[-.26,-.34,0],[.26,-.34,0],[.26,.34,0],[-.26,.34,0],[0,0,1],'#ffffff',uvOf(R_POST(i),3));oldtown.posters++;};

  // ---------- facades ----------
  let sprays=0;
  for(const b of city){
    const B=new Batch(),floors=Math.round(b.h/3.2);let used=false;
    for(const f of faces(b)){
      const door=doorOn(f),ry=Math.atan2(f.nx,f.nz),bays=Math.floor(f.L/4);
      const off=t=>{if(!door)return false;const dt=(door.dx-f.x0)*f.tx+(door.dz-f.z0)*f.tz;return Math.abs(t-dt)<3.2;};
      for(let k=0;k<bays;k++){
        const tc=4*k+2;if(tc+1.9>f.L||off(tc))continue;
        if(f.street&&chance(OLD.signP)){   // the shop's painted board over the shopfront, sometimes across two, sometimes hanging off one nail
          const two=k+1<bays&&4*k+6+1.9<=f.L&&!off(tc+4)&&chance(.25),w=two?7.2:3.4,cx=two?tc+2:tc,[x,z]=at(f,cx,.07),tilt=chance(.15)?R(-.2,.2):0;
          B.box(frame(x,.18+2.86,z,ry,0,tilt),w,.58,.06,'#2a2620',{front:uvOf(R_SIGN(Math.floor(rng()*OLD_SIGNS.length)))});oldtown.signs++;used=true;if(two)k++;
        }
        if(chance(OLD.boardP)){const [x,z]=at(f,tc,.06);for(let n=0;n<3;n++)B.box(frame(x,.18+.9+n*.5+R(-.08,.08),z,ry,0,R(-.25,.25)),3.3,.2,.04,pickR(['#5a4a36','#4a3c2c','#6a5840']));used=true;}   // planks nailed over the shopfront
        if(chance(f.street?OLD.sprayP:OLD.sprayP*.6)&&sprays<OLD.sprayMax){const [x,z]=at(f,tc,.09),i=Math.floor(rng()*3);B.quad(frame(x,.18+1.3,z,ry),[-1.3,-.6,0],[1.3,-.6,0],[1.3,.6,0],[-1.3,.6,0],[0,0,1],'#ffffff',uvOf(R_SPRAY(i),0));sprays++;used=true;}
        if(chance(OLD.markP)){const [x,z]=at(f,tc,.1);B.quad(frame(x,.18+1.5,z,ry),[-.8,-.4,0],[.8,-.4,0],[.8,.4,0],[-.8,.4,0],[0,0,1],'#ffffff',uvOf(R_SPRAY(3),0));used=true;}   // the red cross on a house where someone turned
      }
      // posters pasted between the shopfronts, a few over each other
      for(let k=1;k<bays;k++){const t=4*k;if(t>f.L-.4||off(t)||!chance(f.street?OLD.posterP:OLD.posterP*.4))continue;
        for(let n=0;n<1+Math.floor(rng()*3);n++){const [x,z]=at(f,t+R(-.25,.25),.04+n*.006);poster(B,frame(x,.18+1.55+R(-.2,.25),z,ry,0,R(-.08,.08)),Math.floor(rng()*OLD_POSTERS.length));}used=true;}
      if(!f.street)continue;
      // an iron bracket with a small board hanging off it, between two shopfronts
      if(bays>1&&chance(OLD.hangP)){const t=4*(1+Math.floor(rng()*(bays-1)));if(t<f.L-.5&&!off(t)){const [x,z]=at(f,t,0),F=frame(x,.18+3.35,z,ry),i=Math.floor(rng()*OLD_HANG.length);
        B.box(F.sub(0,.12,.5),.04,.04,1,C.iron);B.box(F.sub(0,-.1,.08),.04,.3,.04,C.iron);B.box(F.sub(0,0,.3,0,.6,0),.03,.03,.5,C.iron);
        const S=F.sub(0,-.28,.62);B.box(S,.04,.5,.66,'#2a2620');B.quad(S,[.025,-.24,.32],[.025,-.24,-.32],[.025,.24,-.32],[.025,.24,.32],[1,0,0],'#ffffff',uvOf(R_HANG(i)));B.quad(S,[-.025,-.24,-.32],[-.025,-.24,.32],[-.025,.24,.32],[-.025,.24,-.32],[-1,0,0],'#ffffff',uvOf(R_HANG(i)));
        oldtown.hang++;used=true;}}
      // wrought-iron balconies under the upper windows; now and then a bedsheet with HELP hung over the rail
      for(let fl=1;fl<floors;fl++)for(let k=0;k<bays;k++){
        const tc=4*k+2;if(tc+1.2>f.L)continue;
        const balcony=chance(OLD.balconyP),[x,z]=at(f,tc,0),y0=.18+fl*3.2+.12,F=frame(x,y0,z,ry);
        if(balcony){
          B.box(F.sub(0,0,.34),2,.1,.68,'#5e5a52');for(const s of [-.7,.7])B.box(F.sub(s,-.16,.2),.08,.22,.36,'#5e5a52');
          B.box(F.sub(0,1,.66),2,.04,.04,C.iron);for(const s of [-1,1])B.box(F.sub(s*.98,1,.34),.04,.04,.66,C.iron);
          for(let n=0;n<=12;n++)B.box(F.sub(-.96+n*.16,.53,.66),.02,.9,.02,C.iron);
          for(const s of [-1,1])for(let n=1;n<4;n++)B.box(F.sub(s*.98,.53,.66-n*.16),.02,.9,.02,C.iron);
          oldtown.balconies++;used=true;
        }
        if(oldtown.sheets<OLD.sheetMax&&chance(OLD.sheetP)){const S=F.sub(0,balcony?.15:-.9,balcony?.7:.05,0,balcony?.12:0,R(-.06,.06));B.box(S,1.3,1.9,.02,C.sheet);B.quad(S.sub(0,.1,.015),[-.6,-.3,0],[.6,-.3,0],[.6,.3,0],[-.6,.3,0],[0,0,1],'#ffffff',uvOf(R_SPRAY(2),0));oldtown.sheets++;used=true;}
      }
    }
    if(!used)continue;
    const mat=sharedMat(),m=B.mesh(mat,true);b.mats.push(mat);b.meshes.push(m);   // fades and hides with its building
  }

  // ---------- advertising columns at the corners ----------
  {const spots=[];for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(const [sx,sz] of [[1,1],[-1,1],[1,-1],[-1,-1]])spots.push([(RC[i]+RC[i+1])/2+sx*10.3,(RC[j]+RC[j+1])/2+sz*10.3]);
    for(let tries=0;tries<80&&oldtown.columns.length<OLD.columns;tries++){
      const [x,z]=spots[Math.floor(rng()*spots.length)];if(oldtown.columns.some(([a,c])=>Math.hypot(a-x,c-z)<18)||!roomy(x,z,.7,.7))continue;
      const F=frame(x,groundY(x,z),z,R(0,6.28)),o=Math.floor(rng()*8);
      street.cyl(F.sub(0,.14,0),.66,.66,.28,12,C.column);street.cyl(F.sub(0,1.58,0),.56,.56,2.6,12,C.column,0,s=>uvOf(R_POST((s+o)%8),3));
      street.cyl(F.sub(0,2.95,0),.68,.68,.14,12,C.column);street.cyl(F.sub(0,3.3,0),.62,0,.56,12,C.column);street.cyl(F.sub(0,3.66,0),.05,.05,.2,6,'#8a7a4a');
      block(x,z,.62,.62);oldtown.columns.push([x,z]);
    }}

  // ---------- body bags laid out on the pavement, near the hospital, the ambulance and the police ----------
  const bag=(x,z,ry)=>{const F=frame(x,groundY(x,z)+.13,z,ry),sheet=chance(.3);street.box(F,.62,.26,1.85,sheet?C.sheet:pickR(C.bag));if(!sheet)street.box(F.sub(0,.135,0),.03,.01,1.6,'#5a5a52');else street.box(F.sub(0,.12,.6),.45,.04,.3,'#5a1612');oldtown.bags++;};
  {const near=pois.filter(p=>p.type==='ambulance'||p.type==='police'||p.type==='place'&&p.place&&p.place.type==='hospital');
    for(let tries=0;tries<200&&oldtown.bags<OLD.bags;tries++){
      const p=pickR(near),a=R(0,6.28),d=R(3,7),x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d,n=2+Math.floor(rng()*3),ry=R(0,3.14),ax=Math.cos(ry),az=-Math.sin(ry);
      const row=[];for(let k=0;k<n;k++)row.push([x+ax*k*.8,z+az*k*.8]);if(!row.every(([u,v])=>open(u,v)))continue;
      for(const [u,v] of row)if(oldtown.bags<OLD.bags)bag(u,v,ry+R(-.08,.08));
    }}
  // ---------- suitcases dropped by people who ran ----------
  for(let tries=0;tries<200&&oldtown.cases<OLD.cases;tries++){
    const ri=Math.floor(rng()*5),along=R(-62,62),e=R(-5.5,5.5),vx=chance(.5),x=vx?RC[ri]+e:along,z=vx?along:RC[ri]+e;if(!open(x,z))continue;
    const y=groundY(x,z),F=frame(x,y+.11,z,R(0,6.28)),col=pickR(C.case);
    if(chance(.3)){street.box(F,.6,.08,.42,col);street.box(F.sub(0,.08,-.34,0,-1.2,0),.6,.08,.42,col);street.box(F.sub(0,.06,0),.5,.06,.34,pickR(['#8a7a6a','#5a6a7a','#9a8a5a']));}   // burst open, clothes inside
    else{street.box(F,.62,.22,.42,col);street.box(F.sub(0,.13,0),.16,.03,.04,'#151515');}
    oldtown.cases++;
  }
  // ---------- police barriers and sandbags ----------
  const barrier=(x,z,ry)=>{const F=frame(x,groundY(x,z),z,ry);for(let n=0;n<5;n++)street.box(F.sub(-.8+n*.4,.85,0),.4,.2,.04,C.stripe[n%2]);for(const s of [-.85,.85])for(const r of [-.3,.3])street.box(F.sub(s,.45,0,0,r,0),.05,.95,.05,'#3a3530');};
  {const near=pois.filter(p=>p.type==='police'||p.type==='army');
    for(let tries=0;tries<240&&oldtown.barriers.length<OLD.barriers;tries++){
      let x,z,ry;
      if(chance(.5)&&near.length){const p=pickR(near),a=R(0,6.28),d=R(3.5,7);x=p.x+Math.cos(a)*d;z=p.z+Math.sin(a)*d;ry=R(0,3.14);}
      else{const i=Math.floor(rng()*4),j=Math.floor(rng()*4),side=Math.floor(rng()*4),t=R(-8,8),o=10.6,cx=(RC[i]+RC[i+1])/2,cz=(RC[j]+RC[j+1])/2;[x,z,ry]=side<2?[cx+(side?1:-1)*o,cz+t,Math.PI/2]:[cx+t,cz+(side===2?1:-1)*o,0];}
      const ax=Math.abs(Math.cos(ry)),az=Math.abs(Math.sin(ry)),hx=ax*1+az*.3,hz=az*1+ax*.3;
      if(!roomy(x,z,hx,hz)||oldtown.barriers.some(([a,c])=>Math.hypot(a-x,c-z)<5))continue;
      barrier(x,z,ry);block(x,z,hx,hz,true);oldtown.barriers.push([x,z]);
    }
    for(let tries=0;tries<120&&oldtown.sandbags<OLD.sandbags;tries++){
      const p=near.length?pickR(near):{x:0,z:0},a=R(0,6.28),d=R(4,9),x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d,along=chance(.5);
      const hx=along?1.3:.4,hz=along?.4:1.3;if(!roomy(x,z,hx,hz))continue;
      const F=frame(x,groundY(x,z),z,along?0:Math.PI/2);for(let l=0;l<3;l++)for(let n=0;n<5-l%2;n++)street.box(F.sub(-1.05+n*.52+(l%2)*.26,.12+l*.22,0,R(-.1,.1)),.5,.22,.6,C.sand);
      block(x,z,hx,hz,true);oldtown.sandbags++;
    }}
  // ---------- candles, flowers and photos left at a wall ----------
  for(let tries=0;tries<120&&oldtown.memorials<OLD.memorials;tries++){
    const b=pickR(city),f=pickR(faces(b));if(!f.street||f.L<3)continue;
    const t=R(1,f.L-1),[x,z]=at(f,t,.35);if(!open(x,z)||!open(...at(f,t,.8)))continue;
    const ry=Math.atan2(f.nx,f.nz),y=groundY(x,z);
    for(let n=0;n<9;n++){const [u,v]=at(f,t+R(-.6,.6),R(.15,.6));street.cyl(frame(u,y+.07,v),.035,.035,.14,6,pickR(C.candle));}
    for(let n=0;n<6;n++){const [u,v]=at(f,t+R(-.7,.7),R(.1,.5));street.box(frame(u,y+.04,v,R(0,3)),.25,.06,.08,pickR(C.flower));}
    const [px,pz]=at(f,t,.02);street.quad(frame(px,y+1.2,pz,ry,0,R(-.1,.1)),[-.26,-.34,0],[.26,-.34,0],[.26,.34,0],[-.26,.34,0],[0,0,1],'#ffffff',uvOf(R_POST(1+Math.floor(rng()*2)),3));
    oldtown.memorials++;
  }
  return street.mesh(sharedMat());
}
