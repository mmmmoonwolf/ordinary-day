import {$,isTouch} from '../core/util.js';
import {QUALITY,setQuality} from '../core/renderer.js';
import {setSkinsOn} from '../entities/skins.js';
import {setPropsOn} from '../world/prop-models.js';
import {refreshItems} from '../systems/drops.js';
import {setVolumes} from '../systems/audio.js';

// ---------- settings (v0.8) ----------
// Graphics quality, three volumes and an FPS counter, remembered in this browser. Opened from the pause menu and the
// start screen; it sits on top of whatever opened it and only closes itself.
const KEY='ordinary-day.settings';
export const settings={quality:isTouch?'medium':'high',master:1,music:.6,sfx:1,fps:false,film:true,shake:true,sens:1};   // v0.31 camera shake, first-person mouse / finger look speed
try{Object.assign(settings,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){}
if(!QUALITY[settings.quality])settings.quality='medium';
function store(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}}
// film grain: one noise tile, drawn the first time it is needed
let grained=false;
function grainTile(){
  if(grained)return;grained=true;
  const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d');if(!g||!g.createImageData)return;const d=g.createImageData(180,180);
  for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255|0;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}
  g.putImageData(d,0,0);$('grain').style.backgroundImage='url('+c.toDataURL()+')';
}
function apply(){setQuality(settings.quality);setSkinsOn(settings.quality!=='low');   // low: the old blocky people (v0.13)
  if(setPropsOn(settings.quality!=='low'))refreshItems();   // and the old box guns, items and cars (v0.14)
  setVolumes({master:settings.master,music:settings.music,sfx:settings.sfx});$('fps').hidden=!settings.fps;
  if(document.body){document.body.classList.toggle('film',settings.film);if(settings.film)grainTile();}}   // v0.17
function show(){
  for(const b of document.querySelectorAll('.qual button')){const on=b.dataset.q===settings.quality;b.classList.toggle('on',on);b.setAttribute('aria-checked',on);}
  for(const k of ['master','music','sfx']){$('vol_'+k).value=Math.round(settings[k]*100);$('volN_'+k).textContent=Math.round(settings[k]*100);}
  $('optFps').checked=settings.fps;$('optFilm').checked=settings.film;$('optShake').checked=settings.shake;
  $('optSens').value=Math.round(settings.sens*100);$('optSensN').textContent=settings.sens.toFixed(1)+'×';
}
export function openSettings(){show();$('settings').hidden=false;$('setClose').focus();}
export function closeSettings(){$('settings').hidden=true;}
export function isSettingsOpen(){return !$('settings').hidden;}
// FPS counter, updated twice a second
let frames=0,acc=0;export let fps=0;
export function tickFps(dt){frames++;acc+=dt;if(acc<.5)return;fps=Math.round(frames/acc);frames=0;acc=0;if(settings.fps)$('fps').textContent=fps+' FPS';}
export function initSettings(){
  for(const b of document.querySelectorAll('.qual button'))b.addEventListener('click',()=>{settings.quality=b.dataset.q;store();apply();show();});
  for(const k of ['master','music','sfx'])$('vol_'+k).addEventListener('input',e=>{settings[k]=e.target.value/100;$('volN_'+k).textContent=e.target.value;store();apply();});
  $('optFps').addEventListener('change',e=>{settings.fps=e.target.checked;store();apply();});
  $('optFilm').addEventListener('change',e=>{settings.film=e.target.checked;store();apply();});
  $('optShake').addEventListener('change',e=>{settings.shake=e.target.checked;store();});   // v0.31
  $('optSens').addEventListener('input',e=>{settings.sens=e.target.value/100;$('optSensN').textContent=settings.sens.toFixed(1)+'×';store();});
  for(const id of ['bSettings','bSettings2'])$(id).addEventListener('click',openSettings);
  $('setClose').addEventListener('click',closeSettings);
  apply();
}
