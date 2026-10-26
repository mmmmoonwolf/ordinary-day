import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC,groundY} from '../config/world.js';
import {THAI,THAI_SIGNS,THAI_TALL,THAI_BANNERS,THAI_SPRAY} from '../config/thai.js';
import {withThaiFont,THAI_FONT} from './textures.js';
import {solids,freeAt} from './collision.js';
import {buildings,lootSpots} from './city.js';
import {rooms,roomAt} from './interiors.js';

// ---------- a Thai town (v0.33) ----------
// Everything that makes the streets read as Thailand, built from boxes and one canvas of lettering, no models to load:
// shop signs in Thai over the shutters, awnings, air conditioners between the windows, tall signs and banners on the
// upper floors, spray-painted messages from the first days; concrete power poles with tangled cables down every street
// and service wires to the houses; spirit houses (ศาลพระภูมิ) in front of buildings; rows of parked scooters, food carts
// with umbrellas and plastic stools; blue water drums and glazed jars; red-and-white kerbs at the crossings.
// Built after everything else with its own rng; nothing that was there moves, no loot spot is covered, the saves stay.
// Facade parts go in one mesh per building that fades and hides with it (b.mats, b.meshes); street things in one mesh.
// Collision: poles, spirit houses, scooter rows, carts, drums and jars (scooters, carts, drums and jars can be vaulted).

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
  cyl(F,r0,r1,h,seg,col,a0=0){
    const Y=h/2;
    for(let s=0;s<seg;s++){
      const a=a0+s/seg*Math.PI*2,b=a0+(s+1)/seg*Math.PI*2,m=(a+b)/2,P=(r,t,y)=>[Math.sin(t)*r,y,Math.cos(t)*r];
      const slope=(r0-r1)/h,l=Math.hypot(1,slope);
      this.quad(F,P(r0,a,-Y),P(r0,b,-Y),P(r1||1e-4,b,Y),P(r1||1e-4,a,Y),[Math.sin(m)/l,slope/l,Math.cos(m)/l],col);
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
// one 1024 × 1024 canvas: shop boards (512 × 80, two columns), tall signs (64 × 256), banners (512 × 124) and spray
// paint (256 × 120, transparent). Redrawn once the Thai font has loaded
const R_SIGN=(i)=>[(i%2)*512,8+Math.floor(i/2)*80,512,80],R_TALL=i=>[i*64,648,64,256],R_BAN=i=>[512,648+i*124,512,124],R_SPRAY=i=>[i*256,904,256,120];
const uvOf=([x,y,w,h],inset=2)=>[(x+inset)/AW,1-(y+h-inset)/AH,(x+w-inset)/AW,1-(y+inset)/AH];
let atlasTex=null;
function makeAtlas(){
  const c=document.createElement('canvas');c.width=AW;c.height=AH;const g=c.getContext('2d');atlasTex=new THREE.CanvasTexture(c);atlasTex.encoding=THREE.sRGBEncoding;
  let s=77;const rr=()=>(s=(s*16807)%2147483647)/2147483647;const dirt=[];for(let i=0;i<5000;i++)dirt.push([rr(),rr(),rr(),rr()]);
  const fit=(text,x,y,maxW,px,weight=700)=>{g.font=weight+' '+px+'px '+THAI_FONT;g.fillText(text,x,y,maxW);};
  const weather=([x,y,w,h],n)=>{for(let i=0;i<n;i++){const d=dirt[(i*7+x+y)%dirt.length];g.fillStyle=d[2]<.5?`rgba(30,26,20,${d[3]*.3})`:`rgba(230,224,206,${d[3]*.14})`;g.fillRect(x+d[0]*w,y+d[1]*h,2+d[2]*5,1+d[3]*3);}
    for(let i=0;i<3;i++){const d=dirt[(i*31+x)%dirt.length],gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'rgba(110,60,30,0)');gr.addColorStop(1,'rgba(110,60,30,.35)');g.fillStyle=gr;g.fillRect(x+d[0]*w,y+h*.4,3+d[1]*8,h*.6);}};
  withThaiFont(()=>{
    g.clearRect(0,0,AW,AH);g.fillStyle='#ffffff';g.fillRect(0,0,8,8);g.textAlign='center';g.textBaseline='middle';
    THAI_SIGNS.forEach(([main,sub,bg,ink],i)=>{const r=R_SIGN(i),[x,y,w,h]=r;
      g.fillStyle=bg;g.fillRect(x,y,w,h);g.strokeStyle=ink;g.globalAlpha=.6;g.lineWidth=4;g.strokeRect(x+5,y+5,w-10,h-10);g.globalAlpha=1;
      g.fillStyle=ink;fit(main,x+w/2,y+(sub?33:42),w-40,sub?44:52);if(sub)fit(sub,x+w/2,y+64,w-60,18,500);weather(r,160);});
    THAI_TALL.forEach(([text,bg,ink],i)=>{const r=R_TALL(i),[x,y,w,h]=r;g.fillStyle=bg;g.fillRect(x,y,w,h);g.save();g.translate(x+w/2,y+h/2);g.rotate(-Math.PI/2);g.fillStyle=ink;fit(text,0,2,h-24,38);g.restore();weather(r,90);});
    THAI_BANNERS.forEach(([main,sub,bg,ink],i)=>{const r=R_BAN(i),[x,y,w,h]=r;g.fillStyle=bg;g.fillRect(x,y,w,h);g.fillStyle=ink;g.fillRect(x,y,w,10);g.fillRect(x,y+h-10,w,10);fit(main,x+w/2,y+52,w-30,40);fit(sub,x+w/2,y+92,w-50,22,500);weather(r,120);});
    THAI_SPRAY.forEach(([text,ink],i)=>{const [x,y,w,h]=R_SPRAY(i);g.save();g.translate(x+w/2,y+h/2);g.rotate(-.06+i*.04);g.fillStyle=ink;g.shadowColor=ink;g.shadowBlur=6;fit(text,0,0,w-24,46);g.restore();
      g.fillStyle=ink;for(let k=0;k<7;k++){const d=dirt[i*13+k];g.fillRect(x+24+d[0]*(w-48),y+h/2+12,2,10+d[1]*30);}});   // paint running down
    atlasTex.needsUpdate=true;
  });
}
const sharedMat=()=>new THREE.MeshStandardMaterial({map:atlasTex,vertexColors:true,roughness:.85,alphaTest:.5});

// ---------- the town ----------
export const thai={poles:[],shrines:[],scooters:0,carts:0,signs:0};   // what was built (tests, docs)
const C=THAI.colors;
export function buildThai(){
  if(!atlasTex)makeAtlas();
  const rng=mulberry32(3333),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)],chance=p=>rng()<p;
  const nearLoot=(x,z,m)=>lootSpots.some(s=>Math.abs(s.x-x)<m&&Math.abs(s.z-z)<m);
  const nearDoor=(x,z,m)=>rooms.some(q=>Math.hypot(q.dx-x,q.dz-z)<m);
  const clear=(x,z,m)=>Math.abs(x)<66&&Math.abs(z)<66&&freeAt(x,z,m)&&roomAt(x,z,.4)<0&&!nearLoot(x,z,m+.8)&&!nearDoor(x,z,m+2.2);
  // a rectangle clear every 0.5 m (lamp posts and trees are thin)
  const roomy=(x,z,hx,hz)=>{for(let a=-hx;a<=hx+.01;a+=.5)for(let b=-hz;b<=hz+.01;b+=.5)if(!clear(x+a,z+b,.15))return false;return true;};
  const block=(x,ax,low)=>{const b={x0:x[0]-ax[0],x1:x[0]+ax[0],z0:x[1]-ax[1],z1:x[1]+ax[1]};if(low)b.low=true;solids.push(b);return b;};
  const street=new Batch();
  const city=buildings.filter(b=>!b.farm&&Math.abs(b.cx)<66&&Math.abs(b.cz)<66);
  // the faces of a building that look onto a street: [nx, nz, length, centre x, centre z, along x, along z, start]
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

  // ---------- facades ----------
  const sprayAt=[];
  for(const b of city){
    const B=new Batch(),floors=Math.round(b.h/3.2);let used=false;
    for(const f of faces(b)){
      const door=doorOn(f),ry=Math.atan2(f.nx,f.nz),bays=Math.floor(f.L/4);
      const off=t=>{if(!door)return false;const dt=(door.dx-f.x0)*f.tx+(door.dz-f.z0)*f.tz;return Math.abs(t-dt)<3.2;};
      for(let k=0;k<bays;k++){
        const tc=4*k+2;if(tc+1.9>f.L||off(tc))continue;
        if(f.street){
          // the shop's board over the shutter, sometimes over two bays, sometimes hanging off one hook
          if(chance(THAI.signP)){const two=k+1<bays&&4*k+6+1.9<=f.L&&!off(tc+4)&&chance(.3),w=two?7.4:3.5,cx=two?tc+2:tc,[x,z]=at(f,cx,.07),tilt=chance(.12)?R(-.18,.18):0;
            const F=frame(x,.18+2.86,z,ry,0,tilt),i=Math.floor(rng()*THAI_SIGNS.length);B.box(F,w,.62,.05,'#2b2b2b',{front:uvOf(R_SIGN(i))});thai.signs++;used=true;if(two)k++;}
          // an awning over the shop
          if(chance(THAI.awningP)){const [x,z]=at(f,tc,.55),F=frame(x,.18+2.42,z,ry,.28,0);B.box(F,3.7,.04,1.1,pickR(C.awning));used=true;}
        }
        // spray paint on the shutters: the first days written on the walls
        if(chance(f.street?THAI.sprayP:THAI.sprayP*.6)&&sprayAt.length<THAI.sprayMax){const [x,z]=at(f,tc,.03),F=frame(x,.18+1.25,z,ry),i=Math.floor(rng()*THAI_SPRAY.length);B.quad(F,[-1.3,-.6,0],[1.3,-.6,0],[1.3,.6,0],[-1.3,.6,0],[0,0,1],'#ffffff',uvOf(R_SPRAY(i),0));sprayAt.push([x,z]);used=true;}
      }
      // air conditioners between the windows of the upper floors
      for(let fl=1;fl<floors;fl++)for(let k=1;k<=bays;k++){
        const t=4*k;if(t>f.L-.6||!chance(f.street?THAI.acP:THAI.acP*.7))continue;
        const [x,z]=at(f,t,.2),F=frame(x,.18+fl*3.2+1.15,z,ry);B.box(F,.8,.56,.32,'#cfccc2');B.box(F.sub(0,0,.165),.5,.42,.01,'#3c3e3f');used=true;
        if(chance(.5))B.box(F.sub(.3,-.26-.6,-.1),.03,1.2,.03,'#d0d0c8');   // the drain pipe
      }
      if(!f.street||floors<3)continue;
      // a tall sign standing off the wall
      if(chance(THAI.tallP)){const t=4*Math.max(1,Math.floor(rng()*bays));if(t<f.L-.5){const [x,z]=at(f,t,.42),F=frame(x,.18+3.2+1.6,z,ry),i=Math.floor(rng()*THAI_TALL.length);B.box(F,.07,2.5,.62,'#333333',{});
        B.quad(F,[.04,-1.2,.3],[.04,-1.2,-.3],[.04,1.2,-.3],[.04,1.2,.3],[1,0,0],'#ffffff',uvOf(R_TALL(i)));B.quad(F,[-.04,-1.2,-.3],[-.04,-1.2,.3],[-.04,1.2,.3],[-.04,1.2,-.3],[-1,0,0],'#ffffff',uvOf(R_TALL(i)));used=true;}}
      // a vinyl banner tied across the first floor
      if(f.L>=6&&chance(THAI.bannerP)){const [x,z]=at(f,f.L/2+R(-1,1),.06),F=frame(x,.18+3.2+1.4,z,ry),i=Math.floor(rng()*THAI_BANNERS.length);B.quad(F,[-2.6,-.63,0],[2.6,-.63,0],[2.6,.63,0],[-2.6,.63,0],[0,0,1],'#ffffff',uvOf(R_BAN(i)));used=true;}
    }
    if(!used)continue;
    const mat=sharedMat(),m=B.mesh(mat,false);b.mats.push(mat);b.meshes.push(m);   // fades and hides with its building
  }

  // ---------- red-and-white kerbs at every crossing ----------
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    const cx=(RC[i]+RC[i+1])/2,cz=(RC[j]+RC[j+1])/2;
    for(const sx of [-1,1])for(const sz of [-1,1])for(let s=0;s<THAI.kerb/.5;s++){
      const col=s%2?C.kerb[1]:C.kerb[0],a=12-.25-s*.5;
      street.box(frame(cx+sx*a,.1,cz+sz*11.93),.5,.18,.15,col);street.box(frame(cx+sx*11.93,.1,cz+sz*a),.15,.18,.5,col);
    }
  }

  // ---------- power poles and their cables ----------
  // down every street on the side away from the lamps (on the lamp side, between them, for the two edge streets)
  const lines=[],wires=[];
  for(let i=0;i<5;i++)for(const vert of [true,false]){
    const edge=i===0||i===4,side=edge?(i===4?-1:1):(i===4?1:-1),row=[];
    for(let j=0;j<4;j++)for(const a of edge?[6,26]:[6,16,26]){
      const along=RC[j]+a,across=RC[i]+side*4.45,x=vert?across:along,z=vert?along:across;
      if(!clear(x,z,.4))continue;
      solids.push({x0:x-.16,x1:x+.16,z0:z-.16,z1:z+.16});row.push([x,z]);thai.poles.push([x,z]);
      const F=frame(x,groundY(x,z),z,vert?0:Math.PI/2);
      street.cyl(F.sub(0,4,0),.16,.1,8,4,C.pole,Math.PI/4);
      street.box(F.sub(0,7.5,0),1.7,.1,.1,C.pole);street.box(F.sub(0,6.8,0),1.3,.1,.1,C.pole);
      for(const o of [-.75,-.3,.3,.75])street.box(F.sub(o,7.62,0),.07,.14,.07,'#b8b4a8');
      if(chance(THAI.transformerP)){street.box(F.sub(0,5.3,.35),.9,.08,.6,C.pole);for(const o of [-.25,.25])street.cyl(F.sub(o,5.8,.35),.2,.2,.9,8,'#5d6463');}
      if(chance(THAI.coilP))street.cyl(F.sub(.25,4.6,0,0,0,Math.PI/2),.32,.32,.22,10,'#0a0a0a');   // a coil of spare cable
      if(chance(.5))street.box(F.sub(0,2.1,-.15),.04,4.2,.06,'#0a0a0a');   // a cable down the pole
    }
    lines.push({row,vert,side});
  }
  // cables between neighbours on a street: high lines that sag a little, a bundle lower down that sags a lot
  const sag=(a,b,y0,y1,s,ox,oz)=>{let px=a[0]+ox,py=y0,pz=a[1]+oz;for(let k=1;k<=10;k++){const t=k/10,x=a[0]+(b[0]-a[0])*t+ox,z=a[1]+(b[1]-a[1])*t+oz,y=y0+(y1-y0)*t-s*4*t*(1-t);wires.push(px,py,pz,x,y,z);px=x;py=y;pz=z;}};
  for(const {row,vert} of lines)for(let k=0;k+1<row.length;k++){
    const a=row[k],b=row[k+1];if(Math.hypot(b[0]-a[0],b[1]-a[1])>24)continue;
    for(const o of [-.75,-.3,.3,.75])sag(a,b,7.62,7.62,R(.25,.45),vert?o:0,vert?0:o);
    for(const o of [-.55,.55])sag(a,b,6.92,6.92,R(.3,.5),vert?o:0,vert?0:o);
    for(let n=0;n<2+Math.floor(rng()*3);n++){const o=R(-.25,.25);sag(a,b,R(4.7,5.2),R(4.7,5.2),R(.8,1.6),vert?o:0,vert?0:o);}
  }
  // service wires from the poles to the houses across the sidewalk
  for(const [px,pz] of thai.poles){
    let best=null,bd=14;for(const b of city){const dx=Math.max(b.cx-b.w/2-px,0,px-b.cx-b.w/2),dz=Math.max(b.cz-b.d/2-pz,0,pz-b.cz-b.d/2),d=Math.hypot(dx,dz);if(d>2&&d<bd){bd=d;best=b;}}
    if(!best)continue;
    for(let n=0;n<1+Math.floor(rng()*3);n++){const hx=Math.max(best.cx-best.w/2,Math.min(best.cx+best.w/2,px+R(-4,4))),hz=Math.max(best.cz-best.d/2,Math.min(best.cz+best.d/2,pz+R(-4,4)));sag([px,pz],[hx,hz],4.9,R(3.6,4.3),R(.2,.5),0,0);}
  }

  // ---------- spirit houses ----------
  const shrine=(x,z,ry)=>{
    const F=frame(x,groundY(x,z),z,ry);
    street.box(F.sub(0,.05,0),.6,.1,.6,C.shrineBase);street.box(F.sub(0,.65,0),.2,1.1,.2,C.shrineBase);
    street.box(F.sub(0,1.24,0),.95,.08,.75,C.shrineBase);street.box(F.sub(0,1.3,0),.99,.05,.79,C.gold);
    street.box(F.sub(0,1.55,-.05),.48,.44,.4,C.shrineBody);street.box(F.sub(0,1.5,.16),.16,.28,.01,'#2a1a10');
    for(const s of [-1,1])street.box(F.sub(s*.25,1.55,.16),.04,.46,.04,C.gold);
    street.box(F.sub(0,1.83,-.05),.62,.1,.52,C.gold);
    const roof=F.sub(0,2.05,-.05);street.cyl(roof,.48,0,.42,4,C.shrineRoof,Math.PI/4);street.cyl(roof.sub(0,.3,0),.24,0,.32,4,C.shrineRoof,Math.PI/4);street.cyl(roof.sub(0,.55,0),.05,0,.4,4,C.gold);
    // offerings: red soda bottles, a garland of marigolds, little figures
    for(let k=0;k<4;k++)street.cyl(F.sub(-.38+k*.1,1.37,.3),.025,.025,.14,6,'#c42a1e');
    street.cyl(F.sub(.3,1.32,.28),.06,.06,.04,8,'#e6a020');street.cyl(F.sub(0,1.15,.11),.13,.13,.06,8,'#e08a1a');
    for(const s of [-1,1])street.box(F.sub(s*.42,1.35,.05),.06,.1,.12,s>0?'#e8e4da':'#2a2a2a');
  };
  {const cand=[];for(const b of city)for(const f of faces(b))if(f.street&&f.L>3)cand.push(f);
    for(let tries=0;tries<120&&thai.shrines.length<THAI.shrines;tries++){
      const f=pickR(cand),t=chance(.5)?.75:f.L-.75,[x,z]=at(f,t,.75);
      if(!roomy(x,z,.4,.4)||thai.shrines.some(([a,c])=>Math.hypot(a-x,c-z)<14))continue;
      shrine(x,z,Math.atan2(f.nx,f.nz));thai.shrines.push([x,z]);block([x,z],[.35,.35]);
    }}

  // ---------- scooters ----------
  const scooter=(F,col)=>{
    for(const z of [-.62,.62])street.cyl(F.sub(0,.23,z,0,0,Math.PI/2),.23,.23,.1,10,'#161616');
    street.box(F.sub(0,.32,.05),.3,.1,.75,'#2a2a2a');street.box(F.sub(0,.55,-.32),.36,.34,.72,col);street.box(F.sub(0,.77,-.3),.32,.1,.62,'#1c1c1c');
    street.box(F.sub(0,.7,.36,0,-.22,0),.38,.7,.14,col);street.box(F.sub(0,.48,.62),.16,.08,.42,col);
    street.box(F.sub(0,1.02,.45),.1,.36,.1,'#2a2a2a');street.box(F.sub(0,1.14,.45),.64,.05,.05,'#1a1a1a');street.box(F.sub(0,1.08,.5),.3,.15,.2,col);
    for(const s of [-1,1])street.box(F.sub(s*.26,1.3,.43),.08,.05,.02,'#2a2a2a');
  };
  const parkRow=(f,t,n)=>{
    const h=(n-1)*.4,[x,z]=at(f,t,1.35),ry=Math.atan2(f.nx,f.nz),hx=f.nx?1.05:h+.35,hz=f.nx?h+.35:1.05;
    if(!roomy(x,z,hx,hz))return false;
    for(let k=0;k<n;k++){const [sx,sz]=at(f,t-h+k*.8,1.35),F=frame(sx,groundY(sx,sz),sz,ry+R(-.12,.12));scooter(chance(.1)?frame(sx,groundY(sx,sz)+.18,sz,ry,0,Math.PI/2.15):F,pickR(C.scooter));thai.scooters++;}
    block([x,z],[hx-.15,hz-.15],true);return true;
  };
  {let rows=0;const cand=[];for(const b of city)for(const f of faces(b))if(f.street&&f.L>=4)cand.push(f);
    for(let tries=0;tries<200&&rows<THAI.scooterRows;tries++){const f=pickR(cand),n=2+Math.floor(rng()*4),t=R(1.2+n*.4,f.L-1.2-n*.4);if(t>0&&parkRow(f,t,n))rows++;}}
  // and some left in the road by the kerb, fallen over
  for(let tries=0,n=0;tries<80&&n<THAI.scooterRoad;tries++){const ri=Math.floor(rng()*5),along=R(-60,60),e=(chance(.5)?1:-1)*R(2.5,3.3),vx=chance(.5),x=vx?RC[ri]+e:along,z=vx?along:RC[ri]+e;
    if(RC.some(r=>Math.abs(r-along)<5.5))continue;   // by the kerb, clear of the lanes a horde marches down and of the crossings
    if(!roomy(x,z,.9,.9))continue;const ry=R(0,6.28);scooter(frame(x,groundY(x,z)+.18,z,ry,0,Math.PI/2.1),pickR(C.scooter));block([x,z],[.7,.7],true);n++;thai.scooters++;}

  // ---------- food carts, plastic stools and tables ----------
  const stool=(x,z,col,down)=>{const y=groundY(x,z);if(down)street.cyl(frame(x,y+.17,z,R(0,6),Math.PI/2,0),.17,.13,.42,8,col);else street.cyl(frame(x,y+.22,z),.17,.13,.44,8,col);};
  const table=(x,z)=>{const y=groundY(x,z),F=frame(x,y,z,R(0,1.6));street.box(F.sub(0,.72,0),.75,.04,.75,'#b9bcbc');for(const [a,b] of [[-.32,-.32],[.32,-.32],[-.32,.32],[.32,.32]])street.box(F.sub(a,.36,b),.04,.72,.04,'#9a9d9d');};
  const cart=(x,z,ry)=>{
    const F=frame(x,groundY(x,z),z,ry);
    street.box(F.sub(0,.55,0),1.4,.7,.7,'#b5b9b8');street.box(F.sub(0,1.12,0),1.2,.44,.55,'#9fc4cc');street.box(F.sub(0,1.36,0),1.24,.04,.6,'#b5b9b8');
    for(const s of [-1,1])street.cyl(F.sub(s*.5,.2,.38,0,Math.PI/2,0),.2,.2,.06,10,'#1a1a1a');
    street.box(F.sub(-.82,.85,0),.3,.04,.5,'#8a8d8d');street.box(F.sub(.1,1.9,-.2),.04,1.9,.04,'#555555');
    street.cyl(F.sub(.1,2.75,-.2),1.15,0,.38,10,pickR(C.umbrella));
    if(chance(.6))street.box(F.sub(.75,.45,-.1),.32,.42,.32,'#c03030');   // an ice box
  };
  {let n=0;for(let tries=0;tries<200&&n<THAI.carts;tries++){
    let x,z,ry;
    if(n<2){x=(RC[1]+RC[2])/2+R(-9,9);z=(RC[2]+RC[3])/2+pickR([-7.6,-1.6,4.4]);ry=0;}   // in the market, between the stalls
    else{const i=Math.floor(rng()*4),j=Math.floor(rng()*4),side=Math.floor(rng()*4),t=R(-8,8),o=10.4,cx=(RC[i]+RC[i+1])/2,cz=(RC[j]+RC[j+1])/2;
      [x,z,ry]=side<2?[cx+(side?1:-1)*o,cz+t,Math.PI/2]:[cx+t,cz+(side===2?1:-1)*o,0];}
    if(!roomy(x,z,1.1,1.1))continue;
    cart(x,z,ry);block([x,z],ry?[.4,.75]:[.75,.4],true);n++;thai.carts++;
    for(let k=0;k<3+Math.floor(rng()*4);k++){const a=R(0,6.28),d=R(1.2,2.2),sx=x+Math.cos(a)*d,sz=z+Math.sin(a)*d;if(clear(sx,sz,.2))stool(sx,sz,pickR(C.stool),chance(.3));}
    if(chance(.6)){const a=R(0,6.28),tx=x+Math.cos(a)*1.9,tz=z+Math.sin(a)*1.9;if(clear(tx,tz,.45))table(tx,tz);}
  }}
  // a few more stools left in front of the shops
  for(let k=0;k<THAI.stools;k++){const b=pickR(city),f=pickR(faces(b));if(!f.street)continue;const [x,z]=at(f,R(.5,f.L-.5),R(.6,1.6));if(clear(x,z,.2))stool(x,z,pickR(C.stool),chance(.4));}

  // ---------- water drums and glazed jars against the walls ----------
  for(let tries=0,n=0;tries<160&&n<THAI.drums;tries++){
    const b=pickR(city),f=pickR(faces(b)),jar=chance(.4),r=jar?.36:.3,[x,z]=at(f,R(.6,f.L-.6),r+.12);
    if(!roomy(x,z,r,r))continue;const y=groundY(x,z);
    if(jar){street.cyl(frame(x,y+.12,z),.24,.36,.24,10,C.jar);street.cyl(frame(x,y+.42,z),.36,.3,.36,10,C.jar);street.cyl(frame(x,y+.66,z),.2,.16,.12,10,C.jar);}
    else{street.cyl(frame(x,y+.45,z),.3,.3,.9,12,C.drum);street.cyl(frame(x,y+.92,z),.31,.31,.04,12,'#20467a');}
    block([x,z],[r,r],true);n++;
  }

  const sm=sharedMat(),mesh=street.mesh(sm);
  if(wires.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:C.wire}));scene.add(l);}
  return mesh;
}
