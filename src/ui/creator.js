import {$,pick} from '../core/util.js';
import {OUTFITS,PALETTE,profile,saveProfile,cleanName,cleanLook,defaultLook,applyProfile} from '../core/profile.js';
import {G} from '../core/state.js';
import {bus} from '../core/bus.js';
import {skins,previewModel} from '../entities/skins.js';
import {player} from '../entities/player.js';

// ---------- name and character creator (v0.41) ----------
// On the start screen: the name others see over your head, and "แต่งตัวละคร" for the body (man or woman), which outfit
// the head (hair or hat), the top, the trousers and the shoes come from, and the colours of the top, the trousers, the
// hair and the skin. A turning model shows it (its own small renderer, made the first time the panel opens, drawing only
// while it is open; drag it to turn it). Kept in this browser (core/profile.js), worn in the next game and in friends' rooms.
const PARTS=['hd','bd','lg','ft'],COLS=['shirt','pants','hair','skin'];
let look=null,view=null;
export function initCreator(){
  const n=$('pName');if(!n)return;
  n.value=profile.name;
  n.addEventListener('input',()=>{profile.name=cleanName(n.value);saveProfile();if(player&&bus.role!=='client')player.name=profile.name||'ผู้เล่น 1';});
  $('bChar').addEventListener('click',open);
  $('bCharDone').addEventListener('click',close);
  $('bCharRandom').addEventListener('click',()=>{const ids=OUTFITS[look.s].map(o=>o[0]);for(const k of PARTS)look[k]=pick(ids);for(const k of COLS)look.c[k]=Math.random()<.25?null:pick(PALETTE[k==='skin'?'skin':k==='hair'?'hair':'cloth']);changed();});
  for(const b of document.querySelectorAll('#charSex button'))b.addEventListener('click',()=>{if(look.s===b.dataset.sex)return;look=Object.assign(defaultLook(b.dataset.sex),{c:look.c});changed();});
  for(const row of document.querySelectorAll('.partrow')){
    const k=row.dataset.part,step=d=>{const ids=OUTFITS[look.s].map(o=>o[0]);look[k]=ids[(ids.indexOf(look[k])+d+ids.length)%ids.length];changed();};
    row.querySelector('.prev').addEventListener('click',()=>step(-1));row.querySelector('.next').addEventListener('click',()=>step(1));
  }
  for(const box of document.querySelectorAll('.swatches')){
    const k=box.dataset.col,list=[null,...PALETTE[k==='skin'?'skin':k==='hair'?'hair':'cloth']];
    for(const c of list){const b=document.createElement('button');b.type='button';if(c)b.style.setProperty('--c',c);else{b.className='orig';b.title='สีเดิมของชุด';}b.setAttribute('aria-label',c||'สีเดิม');b.dataset.c=c||'';
      b.addEventListener('click',()=>{look.c[k]=c;changed();});box.appendChild(b);}
  }
}
function open(){
  look=cleanLook(profile.look)||defaultLook('m');
  $('pStart').hidden=true;$('pChar').hidden=false;
  if(!view)view=makeView();view.start();changed();
}
function close(){
  profile.look=cleanLook(look);saveProfile();
  if(player&&bus.role!=='client'&&!G.running)applyProfile(player);   // the next game wears it (online, the next room joined)
  if(view)view.stop();
  $('pChar').hidden=true;$('pStart').hidden=false;
}
function changed(){
  for(const b of document.querySelectorAll('#charSex button')){const on=b.dataset.sex===look.s;b.classList.toggle('on',on);b.setAttribute('aria-checked',on);}
  for(const row of document.querySelectorAll('.partrow')){const o=OUTFITS[look.s].find(x=>x[0]===look[row.dataset.part]);row.querySelector('b').textContent=o?o[1]:'';}
  for(const box of document.querySelectorAll('.swatches'))for(const b of box.querySelectorAll('button'))b.classList.toggle('on',(b.dataset.c||null)===look.c[box.dataset.col]);
  if(view)view.show(look);
}
// the turning model
function makeView(){
  const cv=$('charView'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.setSize(cv.clientWidth||200,cv.clientHeight||266,false);
  r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,(cv.clientWidth||200)/(cv.clientHeight||266),.1,30);cam.position.set(0,1.05,3.7);cam.lookAt(0,.92,0);
  scene.add(new THREE.HemisphereLight('#f4ecdf','#3a3530',1.1));const sun=new THREE.DirectionalLight('#fff4e0',1.4);sun.position.set(2,4,3);scene.add(sun);
  let model=null,want=null,turn=.5,drag=null,raf=0,last=0;
  cv.onpointerdown=e=>{drag=e.clientX;cv.setPointerCapture(e.pointerId);};
  cv.onpointermove=e=>{if(drag===null)return;turn+=(e.clientX-drag)*.012;drag=e.clientX;};
  cv.onpointerup=cv.onpointercancel=()=>{drag=null;};
  const frame=now=>{
    raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
    if(want&&skins.ready){drop();model=previewModel(want);want=null;if(model)scene.add(model.o);}
    $('charWait').hidden=!!model;
    if(model){if(drag===null)turn+=dt*.45;model.o.rotation.y=turn;model.mixer.update(dt);}
    r.render(scene,cam);
  };
  const drop=()=>{if(!model)return;scene.remove(model.o);model.mixer.stopAllAction();model.o.traverse(x=>{if(x.isMesh)for(const m of [].concat(x.material))m.dispose();});model=null;};
  return {show:l=>{want=JSON.parse(JSON.stringify(l));},start:()=>{last=performance.now();if(!raf)raf=requestAnimationFrame(frame);},stop:()=>{cancelAnimationFrame(raf);raf=0;drop();}};
}
