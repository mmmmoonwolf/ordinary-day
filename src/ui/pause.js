import {$} from '../core/util.js';
import {G} from '../core/state.js';
import {ctl,joy} from '../core/controls.js';
import {player} from '../entities/player.js';
import {saveGame} from '../systems/save.js';
import {hhmm,updateLoadout} from './hud.js';
import {closeBag} from './bag.js';
import {showContinue} from './input.js';

// ---------- pause menu ----------
// Stops the game like the bag does (G.paused). Opens by itself when the page goes to the background,
// so a phone player comes back to a paused game instead of a fight.
const when=()=>'วันที่ '+(Math.floor(G.min/1440)+1)+' · '+hhmm(G.min);
export function isPauseOpen(){return !$('pause').hidden;}
export function openPause(){
  if(!G.running||G.over||!player.alive||isPauseOpen())return;
  closeBag();
  $('pause').hidden=false;G.paused=true;ctl.fireHeld=false;joy.id=null;$('joy').hidden=true;
  $('pauseInfo').textContent=when();$('saveMsg').textContent='เกมบันทึกอัตโนมัติทุก 15 วินาทีอยู่แล้ว';
  $('bResume').focus();
}
export function closePause(){if(!isPauseOpen())return;$('pause').hidden=true;G.paused=false;updateLoadout(true);}
export function togglePause(){isPauseOpen()?closePause():openPause();}
export function initPause(){
  $('bPause').addEventListener('click',openPause);
  $('bResume').addEventListener('click',closePause);
  $('bSaveNow').addEventListener('click',()=>{
    $('saveMsg').textContent=saveGame()?'บันทึกแล้ว · '+when():'บันทึกไม่ได้ เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูล (เช่น โหมดไม่ระบุตัวตน)';
  });
  $('bToTitle').addEventListener('click',()=>{
    saveGame();$('pause').hidden=true;G.paused=false;G.running=false;
    showContinue();$('pStart').hidden=false;$('pOver').hidden=true;$('overlay').hidden=false;
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')openPause();});
}
