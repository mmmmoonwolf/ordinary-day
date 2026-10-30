import {$} from '../core/util.js';
import {G,isPvp} from '../core/state.js';
import {ctl,joy} from '../core/controls.js';
import {player,isSolo} from '../entities/player.js';
import {saveGame} from '../systems/save.js';
import {updateLoadout} from './hud.js';
import {closeBag} from './bag.js';
import {showContinue} from './input.js';
import {diffOf} from '../config/difficulty.js';
import {initReport,closeReport} from './report.js';
import {refreshOnline,leaveOnline} from './online.js';
import {isClient} from '../core/bus.js';

// ---------- pause menu ----------
// Stops the game like the bag does (G.paused). Opens by itself when the page goes to the background,
// so a phone player comes back to a paused game instead of a fight. With other players in the game it only opens
// the menu: the world keeps going (v0.11).
const when=()=>(isPvp()?'PvP · ':'')+diffOf(G).name;   // v0.42 no day or time shown; v0.47 the mode
export function isPauseOpen(){return !$('pause').hidden;}
export function openPause(){
  if(!G.running||G.over||!player.alive||isPauseOpen())return;
  closeBag();
  $('pause').hidden=false;G.paused=isSolo();ctl.fireHeld=false;joy.id=null;$('joy').hidden=true;
  $('pauseInfo').textContent=when();$('saveMsg').textContent='';
  closeReport();refreshOnline();$('bResume').focus();
}
export function closePause(){if(!isPauseOpen())return;$('pause').hidden=true;G.paused=false;updateLoadout(true);}
export function togglePause(){isPauseOpen()?closePause():openPause();}
export function initPause(){
  $('bPause').addEventListener('click',openPause);initReport();
  $('bResume').addEventListener('click',closePause);
  $('bSaveNow').addEventListener('click',()=>{
    $('saveMsg').textContent=saveGame()?'บันทึกแล้ว':'บันทึกไม่ได้ เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูล (เช่น โหมดไม่ระบุตัวตน)';
  });
  $('bToTitle').addEventListener('click',()=>{
    if(isClient()){leaveOnline();return;}   // a client leaves the room (v0.12); the title screen comes from net/client.js
    leaveOnline();saveGame();$('pause').hidden=true;G.paused=false;G.running=false;
    showContinue();$('pStart').hidden=false;$('pOver').hidden=true;$('overlay').hidden=false;
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')openPause();});
}
