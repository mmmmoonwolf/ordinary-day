import {$,isTouch} from '../core/util.js';
import {QUALITY,setQuality} from '../core/renderer.js';
import {setSkinsOn} from '../entities/skins.js';
import {setVolumes} from '../systems/audio.js';

// ---------- settings (v0.8) ----------
// Graphics quality, three volumes and an FPS counter, remembered in this browser. Opened from the pause menu and the
// start screen; it sits on top of whatever opened it and only closes itself.
const KEY='ordinary-day.settings';
export const settings={quality:isTouch?'medium':'high',master:1,music:.6,sfx:1,fps:false};
try{Object.assign(settings,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){}
if(!QUALITY[settings.quality])settings.quality='medium';
function store(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}}
function apply(){setQuality(settings.quality);setSkinsOn(settings.quality!=='low');   // low: the old blocky people (v0.13)
  setVolumes({master:settings.master,music:settings.music,sfx:settings.sfx});$('fps').hidden=!settings.fps;}
function show(){
  for(const b of document.querySelectorAll('.qual button')){const on=b.dataset.q===settings.quality;b.classList.toggle('on',on);b.setAttribute('aria-checked',on);}
  for(const k of ['master','music','sfx']){$('vol_'+k).value=Math.round(settings[k]*100);$('volN_'+k).textContent=Math.round(settings[k]*100);}
  $('optFps').checked=settings.fps;
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
  for(const id of ['bSettings','bSettings2'])$(id).addEventListener('click',openSettings);
  $('setClose').addEventListener('click',closeSettings);
  apply();
}
