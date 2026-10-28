import {$} from '../core/util.js';
import {scene,screenAngle} from '../core/renderer.js';
import {G} from '../core/state.js';
import {DAY_START} from '../config/time.js';
import {GOAL_NIGHTS,EXIT,exitOpen,nightsSurvived} from '../config/goal.js';
import {player,players} from '../entities/player.js';
import {clearSave} from './save.js';
import {isClient} from '../core/bus.js';
import {sfx} from './audio.js';
import {gameOver} from '../ui/hud.js';

// ---------- the way out (v0.46, was the rescue helicopter of v0.4) ----------
// After GOAL_NIGHTS nights the army camp at the end of the highway opens (world/army.js, systems/army.js): a siren the
// moment it does, a ring at its far side and the arrow on the HUD pointing there. Everyone still alive walking or
// driving on past EXIT.x gets out to the next town: that wins.
let ring=null;
function build(){
  ring=new THREE.Mesh(new THREE.RingGeometry(3.6,4.1,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#e2a64a',transparent:true,opacity:0,depthWrite:false}));
  ring.position.set(EXIT.x,.06,EXIT.z);scene.add(ring);
}
export function updateGoal(dt,now){
  if(!ring)build();
  const open=exitOpen(G.min);
  ring.material.opacity=open?.35+.35*Math.sin(now/250):0;
  // the arrow: to the gate, and once through it, on to the end of the camp
  const tx=player.pos.x<EXIT.gate?EXIT.gate:EXIT.x,dx=tx-player.pos.x,dz=EXIT.z-player.pos.z,dist=Math.hypot(EXIT.x-player.pos.x,dz);
  const showArrow=open&&player.alive&&G.running;
  if($('lz').hidden===showArrow)$('lz').hidden=!showArrow;
  if(showArrow){
    $('lzArrow').style.transform='rotate('+screenAngle(dx,dz).toFixed(2)+'rad)';   // v0.28 also in first person
    $('lzDist').textContent='ค่ายทหาร '+Math.round(dist)+' ม.';
  }
  if(!G.running||!open||isClient())return;   // in a friend's room the host decides (v0.12)
  const day=Math.floor(G.min/1440);if(G.exitSaid!==day){G.exitSaid=day;if(nightsSurvived(G.min)===GOAL_NIGHTS&&G.min%1440<DAY_START+60)sfx.outbreak();}   // the siren from the camp, the morning it opens
  // everyone still alive has to be through (v0.9: one or more players)
  const alive=players.filter(p=>p.alive&&!p.away);   // v0.12: not those whose device dropped out
  if(alive.length&&alive.every(p=>p.down<=0&&!(p.bleed>0)&&p.pos.x>=EXIT.x)){
    G.endCause='won';clearSave();sfx.win();gameOver();
  }
}
