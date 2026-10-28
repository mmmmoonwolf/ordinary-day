import {scene} from '../core/renderer.js';
import {ARMY,ROAD,HIGHWAY} from '../config/world.js';
import {S,box,unitBox,glowMat} from './materials.js';
import {asphaltTex,grassTex} from './textures.js';
import {solids} from './collision.js';
import {mapPaint,pois} from './city.js';
import {ground,merge,M} from './farm.js';
import {armyTruck} from './props.js';

// ---------- the army camp at the end of the highway (v0.46) ----------
// Where the highway ends: a wall of earth-filled barriers across the woods' strip, a boom gate over the road, two
// watchtowers behind it, tents, trucks and floodlights, and the road going on east out of it to the next town (not built
// yet). The gate stays shut until the morning after the third night (config/goal.js exitOpen); then it lifts, soldiers
// stand on the towers and at the gate and cover the survivors coming in (systems/army.js), and walking or driving on
// past EXIT.x wins. Built at the end of buildHighway() without its rng; the gate's collision box is moved away while open.
export const army={gate:null,boom:null,open:false,guards:[]};
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
export function buildArmyCamp(){
  const G=ROAD.end,H=ROAD.half,A=ARMY,Z=HIGHWAY.z1+.5;
  // the road on through the camp, and grass on past where the highway's ends (not over it: the two would flicker)
  {const x0=G+28,t=grassTex();t.repeat.set((A.x1+20-x0)/22,112/22);ground(S({map:t,roughness:1}),x0,A.x1+20,-52,60,.007);}
  {const t=asphaltTex();t.center.set(.5,.5);t.rotation=Math.PI/2;t.repeat.set(1,(A.x1+20-G)/8.4);ground(S({map:t,roughness:.92}),G,A.x1+20,-H,H,.015);}
  mapPaint.push({color:'#3f4433',rects:[[G,A.z0,A.x1,A.z1]]},{color:'#3a3d40',rects:[[G,-H,A.x1,H]]});pois.push({type:'army',x:G+18,z:0});
  // the wall: earth-filled barriers either side of the road, out to the edge of the strip
  const tan=S({color:lin('#8c7f62'),roughness:1}),mesh=S({color:lin('#5c5a50'),roughness:.8,metalness:.3}),olive=S({color:lin('#4d5634'),roughness:.9}),wood=S({color:lin('#5a4a38'),roughness:1});
  {const parts=[],frame=[];
    for(const s of [-1,1])for(let z=H+1.1;z<Z;z+=1.3){const zz=s*(z+.65);parts.push([unitBox,M(G,.8,zz,1.25,1.6,1.25)]);frame.push([unitBox,M(G,1.62,zz,1.3,.06,1.3)]);}
    scene.add(merge(parts,tan),merge(frame,mesh));
    for(const s of [-1,1])solids.push({x0:G-.65,x1:G+.65,z0:s<0?-Z-1:H+1,z1:s<0?-H-1:Z+1});}
  // the boom gate over the road (lifts when it opens) and its posts
  {const post=S({color:lin('#d9d6cc'),roughness:.7}),red=S({color:lin('#a8322a'),roughness:.6});
    for(const s of [-1,1])box(post,.35,1.3,.35,G-.2,.65,s*(H+.7));
    const boom=new THREE.Group();boom.position.set(G-.2,1.1,-H-.7);
    for(let i=0;i<6;i++){const m=box(i%2?post:red,.16,.16,(2*H+1.4)/6,0,0,(i+.5)*(2*H+1.4)/6);scene.remove(m);boom.add(m);}
    scene.add(boom);army.boom=boom;
    army.gate={x0:G-.5,x1:G+.5,z0:-H-1.05,z1:H+1.05};army.shut={...army.gate};solids.push(army.gate);}
  // two watchtowers just inside, and where the soldiers stand
  for(const s of [-1,1]){const x=G+4.5,z=s*10.5,legs=[],top=[];
    for(const a of [-1,1])for(const b of [-1,1])legs.push([unitBox,M(x+a*1.1,1.9,z+b*1.1,.22,3.8,.22)]);
    top.push([unitBox,M(x,3.85,z,2.8,.2,2.8)]);   // no roof: seen from above it would hide the soldier
    for(const a of [-1,1])top.push([unitBox,M(x+a*1.3,4.25,z,.2,.6,2.8)],[unitBox,M(x,4.25,z+a*1.3,2.8,.6,.2)]);
    scene.add(merge(legs,wood),merge(top,olive));solids.push({x0:x-1.35,x1:x+1.35,z0:z-1.35,z1:z+1.35});
    army.guards.push({x:x-.6,y:3.95,z,face:-Math.PI/2,cool:0,fig:null,model:null});}
  for(const s of [-1,1])army.guards.push({x:G+1.6,y:0,z:s*(H+2.4),face:-Math.PI/2,cool:0,fig:null,model:null});
  // inside: tents, trucks, a flag, floodlights (their glow comes on after dark, like the street lights)
  {const tents=[];for(const [x,z] of [[G+16,-11],[G+24,-11],[G+16,11],[G+24,11]]){tents.push([unitBox,M(x,1.1,z,5,2.2,3.6)]);solids.push({x0:x-2.5,x1:x+2.5,z0:z-1.8,z1:z+1.8});}
    scene.add(merge(tents,olive));}
  armyTruck(G+33,-8.6);armyTruck(G+34,8.6);
  box(S({color:lin('#c9c4b6')}),.12,8,.12,G+9,4,-7);box(S({color:lin('#4d5634')}),.04,1,1.6,G+9,7.4,-6.2);
  {const glow=new THREE.PlaneGeometry(9,9).rotateX(-Math.PI/2),pole=S({color:lin('#3a3d40'),roughness:.6,metalness:.4});
    for(const [x,z] of [[G+8,-6],[G+8,6],[G+28,0]]){box(pole,.18,6,.18,x,3,z);box(S({color:'#d8d4c8',emissive:'#ffe7b0',emissiveIntensity:.6}),.6,.35,.5,x,6,z);const g=new THREE.Mesh(glow,glowMat);g.position.set(x+1,.05,z);scene.add(g);solids.push({x0:x-.15,x1:x+.15,z0:z-.15,z1:z+.15});}}
  // a soldier as plain boxes (low graphics, or before the character models load)
  for(const g of army.guards){const f=new THREE.Group(),skin=S({color:lin('#c99a78')});
    for(const [m,w,h,d,x,y] of [[olive,.45,.62,.28,0,1.2],[skin,.24,.26,.24,0,1.66],[olive,.28,.3,.3,0,1.84],[olive,.18,.82,.2,-.12,.42],[olive,.18,.82,.2,.12,.42]]){const p=box(m,w,h,d,x,y,0);scene.remove(p);f.add(p);}
    const gun=box(S({color:'#2b2d30'}),.09,.09,.8,.12,1.3,.35);scene.remove(gun);f.add(gun);   // facing +z, like every character
    f.position.set(g.x,g.y,g.z);f.rotation.y=g.face;f.visible=false;scene.add(f);g.fig=f;}
}
// lifts or lowers the gate (and moves its collision box out of the way while open)
export function setGateOpen(open){
  if(!army.gate||open===army.open)return;army.open=open;
  Object.assign(army.gate,open?{x0:-1e6,x1:-1e6,z0:-1e6,z1:-1e6}:army.shut);
  army.boom.rotation.x=open?1.35:0;
}
