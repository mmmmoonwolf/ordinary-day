import {rand,R,pickS} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {RC} from '../config/world.js';
import {S,box,scaleUV,unitBox,wallMats,groundMat,roadMat,puddleMat,greyMat,walkMat,woodMat,darkMetal,grassMat} from './materials.js';
import {WALLS,TAR,CORR} from './textures.js';
import {solid,freeAt} from './collision.js';
import {tree,lamp,car,ambulance,armyTruck,container,bench,trash} from './props.js';

// The whole city comes from the seeded rand(), so it looks the same every run.
// buildCity() must stay the only consumer of rand() and keep this call order.
export const buildings=[],occluders=[],lootSpots=[];
export const pois=[];   // landmarks for the minimap: {type:'police'|'army'|'ambulance', x, z}
function spot(x,z,zone){lootSpots.push({x,z,zone,drop:null});}

// ---------- buildings ----------
function building(cx,cz,w,d,floors){
  const h=floors*3.2,v=pickS(WALLS),ou=Math.floor(rand()*4)/4;
  const geo=scaleUV(new THREE.BoxGeometry(w,h,d),f=>{if(f===2||f===3)return [w/8,d/8];return [(f<2?d:w)/16,h/12.8,ou+f*.25,0];});
  const wall=S({map:v.map,emissiveMap:v.emi,emissive:'#ffffff',emissiveIntensity:0,roughness:.92});
  const corr=rand()<.28;const roof=S({map:corr?CORR:TAR,color:corr?'#a0a8ac':'#ffffff',roughness:.95});
  const mesh=new THREE.Mesh(geo,[wall,wall,roof,roof,wall,wall]);mesh.position.set(cx,.18+h/2,cz);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
  const para=S({color:new THREE.Color(v.base).multiplyScalar(.82)});const top=.18+h,mats=[wall,roof,para];
  const parts=[box(para,w+.1,.6,.28,cx,top+.3,cz-d/2+.09),box(para,w+.1,.6,.28,cx,top+.3,cz+d/2-.09),box(para,.28,.6,d,cx-w/2+.09,top+.3,cz),box(para,.28,.6,d,cx+w/2-.09,top+.3,cz)];
  const det=S({color:pickS(['#6c6b65','#7a7468','#57595b'])});   // v0.17: grimy rooftop unitsmats.push(det);
  const nd=1+Math.floor(rand()*3);for(let i=0;i<nd;i++){const s=R(.9,2.4);parts.push(box(det,s,R(.6,1.6),s*R(.6,1.2),cx+R(-w/2+1.5,w/2-1.5),top+.5,cz+R(-d/2+1.5,d/2-1.5)));}
  if(rand()<.35)parts.push(box(para,R(2,3),2.2,R(2,3),cx+R(-w/4,w/4),top+1.1,cz+R(-d/4,d/4)));
  const b={mats,faded:false,cx,cz,w,d,h,base:v.base,meshes:[mesh,...parts]};mesh.userData.b=b;occluders.push(mesh);for(const p of parts)p.userData.b=b;occluders.push(...parts);
  buildings.push(b);wallMats.push(wall);b.box=solid(cx,cz,w/2,d/2);
}
function blockB(i,j){return {cx:(RC[i]+RC[i+1])/2,cz:(RC[j]+RC[j+1])/2};}
export const vendorSpots=[];
export const cityWall={west:null,south:null,east:null};
// v0.22+ ground of the areas outside the wall for the minimap: {color, rects: [[x0, z0, x1, z1], ...]} (ui/minimap.js)
export const mapPaint=[];
export const LAYOUT={'1,2':'market','2,1':'park','0,3':'park','3,0':'lot','3,3':'lot'};

export function buildCity(){
  // ---------- ground & roads ----------
  {const g=new THREE.Mesh(new THREE.PlaneGeometry(600,600),groundMat);g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);}
  for(let i=0;i<5;i++){
    const gv=new THREE.PlaneGeometry(8,136);gv.rotateX(-Math.PI/2);const v=new THREE.Mesh(gv,roadMat);v.position.set(RC[i],0.02,0);v.receiveShadow=true;scene.add(v);
    const gh=new THREE.PlaneGeometry(8,136);gh.rotateX(-Math.PI/2);gh.rotateY(Math.PI/2);const h=new THREE.Mesh(gh,roadMat);h.position.set(0,0.021,RC[i]);h.receiveShadow=true;scene.add(h);
  }
  for(let k=0;k<46;k++){
    const g=new THREE.CircleGeometry(1,12);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,puddleMat);const along=R(-64,64),across=R(-3.4,3.4),ri=Math.floor(R(0,5));
    if(rand()<.5)m.position.set(RC[ri]+across,0.035,along);else m.position.set(along,0.035,RC[ri]+across);
    m.scale.set(R(.8,2.6),1,R(.6,1.8));m.rotation.y=R(0,3);m.receiveShadow=true;scene.add(m);
  }
  for(const s of [-1,1]){const h=box(greyMat,137,0.9,0.5,0,0.45,s*68.5),w=box(greyMat,0.5,0.9,137,s*68.5,0.45,0);if(s<0)cityWall.west=w;else{cityWall.south=h;cityWall.east=w;}}   // v0.22 world/farm.js cuts the gate into the west wall

  // ---------- blocks ----------
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    const B=blockB(i,j);
    const sw=new THREE.Mesh(unitBox,walkMat);sw.scale.set(24,.18,24);sw.position.set(B.cx,.09,B.cz);sw.receiveShadow=true;scene.add(sw);
    for(let k=0;k<3;k++){const side=Math.floor(rand()*4),t=R(-9,9),dp=R(.9,1.6);const x=side===0?B.cx-12+dp:side===1?B.cx+12-dp:B.cx+t,z=side===2?B.cz-12+dp:side===3?B.cz+12-dp:B.cz+t;spot(x,z,'city');}
    const type=LAYOUT[i+','+j]||'city';
    if(type==='city'){
      const p=rand(),lots=[];
      if(p<.2)lots.push([B.cx,B.cz,20,20]);
      else if(p<.5){if(rand()<.5)lots.push([B.cx-5,B.cz,10,20],[B.cx+5,B.cz,10,20]);else lots.push([B.cx,B.cz-5,20,10],[B.cx,B.cz+5,20,10]);}
      else lots.push([B.cx-5,B.cz-5,10,10],[B.cx+5,B.cz-5,10,10],[B.cx-5,B.cz+5,10,10],[B.cx+5,B.cz+5,10,10]);
      for(const [lx,lz,lw,ld] of lots){
        if(lots.length===4&&rand()<.22){if(rand()<.5)container(lx,lz,rand()<.5);else{trash(lx+R(-2,2),lz+R(-2,2));tree(lx+R(-2,2),lz+R(-2,2),true);}spot(lx+R(-3.5,3.5),lz+R(-3.5,3.5),'city');spot(lx+R(-3.5,3.5),lz+R(-3.5,3.5),'city');continue;}
        const w=lw-R(.8,2.4),d=ld-R(.8,2.4);
        building(lx+R(-1,1)*(lw-w)/2,lz+R(-1,1)*(ld-d)/2,w,d,2+Math.floor(rand()*(lots.length===1?3:4)));
      }
    } else if(type==='market'){
      for(const oz of [-4.5,1.5,7.5]){
        const z=B.cz+oz;box(woodMat,17,.8,1.3,B.cx,.58,z);
        for(let k=0;k<14;k++)box(S({color:pickS(['#c9b48a','#b5533e','#d9d2c0','#6f8a5a','#c7a24a','#7a8fa6'])}),R(.5,.9),R(.2,.4),R(.5,.8),B.cx-7.8+k*1.2,1.1,z+R(-.2,.2));
        const rg=scaleUV(new THREE.BoxGeometry(18.6,.08,3.5),()=>[6,1]);
        const roof=new THREE.Mesh(rg,S({map:CORR,color:'#8f9ba2',roughness:.7,metalness:.3}));roof.position.set(B.cx,2.75,z+.3);roof.rotation.x=.1;roof.castShadow=roof.receiveShadow=true;scene.add(roof);
        for(const px of [-8.8,-3,3,8.8]){box(darkMetal,.12,2.6,.12,B.cx+px,1.4,z-1.35);box(darkMetal,.12,2.9,.12,B.cx+px,1.5,z+1.95);}
        solid(B.cx,z,8.6,.75);vendorSpots.push([B.cx+R(-6,-1),z+1.25],[B.cx+R(1,6),z+1.25]);
      }
      container(B.cx-5,B.cz-8.5,true);container(B.cx+3,B.cz-8.5,true);
      for(let k=0;k<6;k++)spot(B.cx+R(-8,8),B.cz+(k%2?-1.5:4.5),'market');
    } else if(type==='park'){
      const gm=new THREE.Mesh(new THREE.PlaneGeometry(20.4,20.4),grassMat);gm.rotation.x=-Math.PI/2;gm.position.set(B.cx,.185,B.cz);gm.receiveShadow=true;scene.add(gm);
      for(const [x,z] of [[-6,-6],[6,-5],[-5,5],[6,6],[0,-7],[-7,0],[7,0],[0,7]])if(rand()<.8)tree(B.cx+x+R(-1,1),B.cz+z+R(-1,1),rand()<.5);
      bench(B.cx-2.5,B.cz-2.5,true);bench(B.cx+2.5,B.cz+2.5,true);bench(B.cx+2.8,B.cz-2.2,false);
      box(greyMat,3,.5,3,B.cx,.35,B.cz);solid(B.cx,B.cz,1.5,1.5);
      for(let k=0;k<5;k++)spot(B.cx+R(-9,9),B.cz+R(-9,9),'park');
    } else {
      for(const [x,z,ax] of [[-5,-6,true],[2.5,-6,true],[-6.5,2.5,false],[6.5,3,false],[0,4,true]])if(rand()<.8)container(B.cx+x,B.cz+z,ax);
      container(B.cx-5,B.cz-6,true,2.78);trash(B.cx+7,B.cz-8.5);
      if(i===3&&j===3){armyTruck(B.cx-1,B.cz+8);pois.push({type:'army',x:B.cx-.65,z:B.cz+8});spot(B.cx-1,B.cz+10.2,'military');spot(B.cx+4.6,B.cz+10.2,'military');}
      else car(B.cx-1,B.cz+8,true);
      for(let k=0;k<6;k++)spot(B.cx+R(-9,9),B.cz+R(-9,9),'lot');
    }
  }
  for(let i=0;i<5;i++)for(let j=0;j<4;j++){
    const sx=i===4?-1:1;for(const a of [11,21])lamp(RC[i]+sx*4.4,RC[j]+a,-sx,0);if(rand()<.6)tree(RC[i]+sx*4.4,RC[j]+16,rand()<.6);
    const sz=i===4?-1:1;for(const a of [11,21])lamp(RC[j]+a,RC[i]+sz*4.4,0,-sz);if(rand()<.6)tree(RC[j]+16,RC[i]+sz*4.4,rand()<.6);
  }
  // police cars (night-only Police Grade loot beside them)
  for(const [x,z,ax] of [[RC[1]+2.4,RC[1]+15,false],[RC[3]-15,RC[2]-2.4,true],[RC[2]-2.4,RC[3]+17,false]]){car(x,z,ax,true);pois.push({type:'police',x,z});spot(ax?x:x-2.2,ax?z+2.2:z,'police');}
  for(let k=0;k<18;k++){const ri=Math.floor(R(0,5)),seg=Math.floor(R(0,4)),along=RC[seg]+R(9.5,22.5),side=rand()<.5?-1:1;const vx=rand()<.5;const x=vx?RC[ri]+side*2.4:along,z=vx?along:RC[ri]+side*2.4;if(freeAt(x,z,2.4))car(x,z,!vx);}
  for(let i=lootSpots.length-1;i>=0;i--)if(!freeAt(lootSpots[i].x,lootSpots[i].z,.5))lootSpots.splice(i,1);
  // abandoned ambulance west of the market with one Resurrection Kit per game (v0.4.2); added last so rand() and spot indices stay as before
  ambulance(-29.6,20,false);pois.push({type:'ambulance',x:-29.6,z:20});spot(-29.6,23.4,'ambulance');
}
