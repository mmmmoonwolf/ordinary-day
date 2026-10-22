import {mulberry32} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC,groundY} from '../config/world.js';
import {freeAt} from './collision.js';
import {buildings,lootSpots,LAYOUT} from './city.js';
import {roomAt} from './interiors.js';
import {breakables} from './props.js';

// ---------- the town after the outbreak (v0.16) ----------
// An ordinary town nobody looks after any more: weeds at the walls and along the curbs, overgrown parks and lots, rubble,
// street signs and traffic lights (`decor`, drawn by world/prop-models.js once the models have loaded), and stains on
// the ground that are always drawn: blood, oil and litter. Built after the city and the interiors with its own rng and no
// collision boxes, so the layout, the loot spots and the saves stay as they were.
export const decor=[];   // {id, x, z, ry, size (target height, m), shadow}
export function buildDecor(){
  const rng=mulberry32(1616),R=(a,b)=>a+rng()*(b-a),pickR=a=>a[Math.floor(rng()*a.length)];
  const put=(id,x,z,size,shadow,ry)=>{
    if(Math.abs(x)>66||Math.abs(z)>66||!freeAt(x,z,.3)||roomAt(x,z,.3)>=0||lootSpots.some(s=>Math.hypot(s.x-x,s.z-z)<.9))return;
    decor.push({id,x,z,ry:ry??R(0,6.28),size,shadow:!!shadow});
  };
  const weed=()=>pickR(['grass_1','grass_1','grass_2']);
  // weeds against the walls
  for(const b of buildings){
    const n=2+Math.floor(rng()*4);
    for(let k=0;k<n;k++){const side=Math.floor(rng()*4),t=R(-.45,.45),x=side<2?b.cx+(side?1:-1)*(b.w/2+.3):b.cx+t*b.w,z=side<2?b.cz+t*b.d:b.cz+(side===2?1:-1)*(b.d/2+.3);put(weed(),x,z,R(.35,.7));}
  }
  // along the curbs, and grass in the cracks at the road edges
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    const cx=(RC[i]+RC[i+1])/2,cz=(RC[j]+RC[j+1])/2;
    for(let k=0;k<5;k++){const side=Math.floor(rng()*4),t=R(-11,11),x=side<2?cx+(side?1:-1)*11.6:cx+t,z=side<2?cz+t:cz+(side===2?1:-1)*11.6;put(weed(),x,z,R(.3,.6));}
    const type=LAYOUT[i+','+j];
    // overgrown park and lots: bushes, tall grass, rocks, an old stump or log
    if(type==='park'||type==='lot'){
      const nb=type==='park'?8:3,ng=type==='park'?14:12;
      for(let k=0;k<nb;k++)put(pickR(['bush_1','bush_2']),cx+R(-9.5,9.5),cz+R(-9.5,9.5),R(.7,1.3));
      for(let k=0;k<ng;k++)put(weed(),cx+R(-10,10),cz+R(-10,10),R(.4,.9));
      for(let k=0;k<3;k++)put('rock',cx+R(-10,10),cz+R(-10,10),R(.3,.6));
      put(pickR(['stump','log']),cx+R(-8,8),cz+R(-8,8),R(.4,.6));
    }
  }
  for(let k=0;k<40;k++){const ri=Math.floor(rng()*5),along=R(-62,62),e=(rng()<.5?-1:1)*R(3.6,3.9);if(rng()<.5)put('grass_2',RC[ri]+e,along,R(.2,.4));else put('grass_2',along,RC[ri]+e,R(.2,.4));}
  // traffic lights on the inner crossings, no-parking and warning signs along the streets
  for(let i=1;i<4;i++)for(let j=1;j<4;j++){
    const c=[[1,1],[-1,1],[1,-1],[-1,-1]][(i*3+j)%4];put('tlight',RC[i]+c[0]*4.6,RC[j]+c[1]*4.6,4.2,true,Math.atan2(-c[0],-c[1]));
    if((i+j)%2)put('sign_tri',RC[i]-c[0]*4.6,RC[j]-c[1]*4.6,2.3,true,Math.atan2(c[0],c[1]));
  }
  for(let k=0;k<12;k++){const i=Math.floor(rng()*5),j=Math.floor(rng()*4),s=i===4?-1:i===0?1:rng()<.5?-1:1,z=RC[j]+R(5.5,8.5);if(rng()<.5)put('sign_np',RC[i]+s*4.4,z,2.3,true,s>0?-Math.PI/2:Math.PI/2);else put('sign_np',z,RC[i]+s*4.4,2.3,true,s>0?Math.PI:0);}
  stains(rng,R);
}

// ---------- stains on the ground ----------
// one canvas per kind, every stain of a kind merged into one mesh
function canvasTex(draw){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');draw(g);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
function blob(g,x,y,r,col){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(.7,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
const DRAW={
  blood:g=>{let s=7;const rr=()=>(s=(s*16807)%2147483647)/2147483647;blob(g,64,64,38,'rgba(118,16,12,.92)');blob(g,52,74,22,'rgba(96,12,9,.9)');for(let i=0;i<16;i++){const a=rr()*6.28,d=30+rr()*28;blob(g,64+Math.cos(a)*d,64+Math.sin(a)*d,3+rr()*9,'rgba(110,14,10,.88)');}g.strokeStyle='rgba(100,12,9,.85)';g.lineWidth=5;g.beginPath();g.moveTo(64,64);g.lineTo(120,100);g.stroke();},
  scorch:g=>{blob(g,64,64,60,'rgba(9,8,7,.85)');blob(g,64,64,36,'rgba(4,4,4,.9)');},
  oil:g=>{blob(g,64,64,58,'rgba(14,13,12,.55)');blob(g,52,70,30,'rgba(10,9,8,.5)');},
  litter:g=>{let s=11;const rr=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<9;i++){g.save();g.translate(20+rr()*88,20+rr()*88);g.rotate(rr()*6.28);g.fillStyle=['rgba(214,208,192,.95)','rgba(176,168,150,.95)','rgba(120,135,150,.9)','rgba(190,80,60,.9)'][i%4];g.fillRect(-7,-5,9+rr()*10,6+rr()*8);g.restore();}},
};
function stains(rng,R){
  const list={blood:[],oil:[],litter:[],scorch:[]};
  const add=(k,x,z,s)=>{if(Math.abs(x)>68||Math.abs(z)>68||!freeAt(x,z,.2)&&k!=='oil'&&k!=='scorch')return;list[k].push([x,z,s,R(0,6.28)]);};
  const onStreet=()=>{const ri=Math.floor(rng()*5),along=R(-64,64),e=R(-5.5,5.5);return rng()<.5?[RC[ri]+e,along]:[along,RC[ri]+e];};
  for(let k=0;k<30;k++){const [x,z]=onStreet();add('blood',x,z,R(1.4,3));}
  for(let k=0;k<44;k++){const [x,z]=onStreet();add('litter',x,z,R(.9,1.6));}
  for(let k=0;k<12;k++){const [x,z]=onStreet();add('oil',x,z,R(1.4,2.8));}
  for(const b of breakables)if(b.car&&(b.car.burned||b.car.police)){add(b.car.burned?'scorch':'oil',b.x,b.z,b.car.burned?5.2:2.2);if(b.car.police)add('blood',b.x+R(-2.5,2.5),b.z+R(-2.5,2.5),R(1.4,2.2));}
  for(const k in list){
    const L=list[k];if(!L.length)continue;
    const pos=[],uv=[],nor=[],idx=[];
    for(const [x,z,s,a] of L){
      const y=groundY(x,z)+.015+(k==='litter'?.004:k==='blood'?.002:k==='scorch'?-.002:0),c=Math.cos(a)*s/2,sn=Math.sin(a)*s/2,b=pos.length/3;
      for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){const lx=(u-.5)*2,lz=(v-.5)*2;pos.push(x+lx*c-lz*sn,y,z+lx*sn+lz*c);uv.push(u,v);nor.push(0,1,0);}
      idx.push(b,b+2,b+1,b,b+3,b+2);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));geo.setIndex(idx);
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:canvasTex(DRAW[k]),transparent:true,depthWrite:false,roughness:k==='blood'?.55:1,polygonOffset:true,polygonOffsetFactor:-2}));
    m.receiveShadow=true;m.renderOrder=1;scene.add(m);
  }
}
