import {scene} from '../core/renderer.js';
import {G} from '../core/state.js';
import {groundY} from '../config/world.js';
import {S} from '../world/materials.js';

// ---------- the dog, drawn (v0.60) ----------
// boxes: a body, a head with a snout and ears, four legs that swing, a tail that wags; lying on its side when dead
const fur=S({color:'#7a5232',roughness:.9}),dark=S({color:'#3a2618',roughness:.9}),box=new THREE.BoxGeometry(1,1,1);
const part=(m,w,h,d,x,y,z,parent)=>{const o=new THREE.Mesh(box,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;};
let g=null,legs=[],tail=null,head=null,body=null,ph=0,last=0;
function build(){
  g=new THREE.Group();body=new THREE.Group();g.add(body);
  part(fur,.3,.28,.72,0,.5,0,body);
  head=new THREE.Group();head.position.set(0,.66,.4);body.add(head);
  part(fur,.24,.24,.26,0,0,0,head);part(dark,.14,.12,.18,0,-.04,.18,head);part(dark,.07,.12,.05,-.08,.16,-.04,head);part(dark,.07,.12,.05,.08,.16,-.04,head);
  legs=[[-.1,.26],[.1,.26],[-.1,-.26],[.1,-.26]].map(([x,z])=>{const l=new THREE.Group();l.position.set(x,.4,z);part(fur,.08,.4,.08,0,-.2,0,l);body.add(l);return l;});
  tail=new THREE.Group();tail.position.set(0,.6,-.36);part(fur,.06,.06,.3,0,0,-.14,tail);tail.rotation.x=.6;body.add(tail);
  scene.add(g);
}
export function drawDog(now){
  const d=G.dog;
  if(!d){if(g)g.visible=false;return;}
  if(!g)build();g.visible=true;
  const dt=Math.min(.1,(now-(last||now))/1000);last=now;
  const y=groundY(d.pos.x,d.pos.z);g.position.set(d.pos.x,y,d.pos.z);g.rotation.y=d.face||0;
  if(d.state==='dead'){body.rotation.z=Math.PI/2;body.position.y=.14;return;}
  body.rotation.z=0;
  const mv=Math.min(1,(d.moving||0)/4);ph+=dt*(4+mv*14);
  legs.forEach((l,i)=>{l.rotation.x=Math.sin(ph+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*.7*mv;});
  tail.rotation.y=Math.sin(now/90)*(d.state==='stray'?.25:.6);
  body.position.y=d.sit&&!mv?-.12:0;body.rotation.x=d.sit&&!mv?-.25:0;head.rotation.x=d.state==='chase'?.25:0;
}
