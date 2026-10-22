import {$} from '../core/util.js';
import {scene} from '../core/renderer.js';
import {G} from '../core/state.js';
import {DAY_START} from '../config/time.js';
import {GOAL_NIGHTS,LZ,RESCUE_FROM,RESCUE_UNTIL,RESCUE_RADIUS,nightsSurvived} from '../config/goal.js';
import {S,part,whiteMat,blackMat} from '../world/materials.js';
import {player,players} from '../entities/player.js';
import {clearSave} from './save.js';
import {sfx} from './audio.js';
import {say,gameOver} from '../ui/hud.js';

// ---------- rescue ----------
// After GOAL_NIGHTS nights a helicopter lands at the LZ every morning (RESCUE_FROM–RESCUE_UNTIL). Reaching it wins.
const FLY=20;   // in-game minutes to land or take off
let heli=null,rotor=null,pad=null;
function build(){
  const red=S({color:'#b3362b',roughness:.5}),glass=S({color:'#1d2a33',roughness:.15,metalness:.6});
  heli=new THREE.Group();
  heli.add(part(whiteMat,1.7,1.5,3.6,0,1.35,0),part(red,1.72,.3,3.62,0,1.2,0),part(glass,1.5,.8,1.1,0,1.65,1.45));
  heli.add(part(whiteMat,.35,.35,3.6,0,1.75,-3.3),part(red,.08,.9,.7,0,2.1,-5));
  for(const s of [-1,1])heli.add(part(blackMat,.1,.1,3.4,s*.85,.12,0),part(blackMat,.08,.5,.08,s*.85,.4,.9),part(blackMat,.08,.5,.08,s*.85,.4,-.9));
  rotor=new THREE.Group();rotor.position.y=2.25;rotor.add(part(blackMat,.22,.05,8,0,0,0),part(blackMat,8,.05,.22,0,0,0));heli.add(rotor);
  heli.position.set(LZ.x,0,LZ.z);heli.rotation.y=Math.PI/4;heli.visible=false;scene.add(heli);
  pad=new THREE.Mesh(new THREE.RingGeometry(RESCUE_RADIUS-.35,RESCUE_RADIUS,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#e2a64a',transparent:true,opacity:0,depthWrite:false}));
  pad.position.set(LZ.x,.05,LZ.z);scene.add(pad);
}
export function updateGoal(dt,now){
  if(!heli)build();
  const day=Math.floor(G.min/1440)+1,tod=G.min%1440,ready=nightsSurvived(G.min)>=GOAL_NIGHTS;
  const morning=ready&&tod>=DAY_START&&tod<RESCUE_UNTIL;
  // helicopter height: drops in from RESCUE_FROM, lifts off at RESCUE_UNTIL
  const t=tod-RESCUE_FROM,up=tod-RESCUE_UNTIL;
  let h=-1;if(ready&&t>=0&&up<0)h=Math.max(0,(FLY-t)/FLY)*30;else if(ready&&up>=0&&up<FLY)h=up/FLY*30;
  heli.visible=h>=0;if(heli.visible){heli.position.y=h;rotor.rotation.y+=dt*28;}
  pad.material.opacity=morning?.35+.35*Math.sin(now/250):0;
  sfx.rotor(heli.visible&&G.running?1:0,LZ.x,LZ.z);
  const dx=LZ.x-player.pos.x,dz=LZ.z-player.pos.z,dist=Math.hypot(dx,dz);
  const showArrow=morning&&player.alive&&G.running;
  if($('lz').hidden===showArrow)$('lz').hidden=!showArrow;
  if(showArrow){
    // screen direction of a ground vector under the isometric camera (see player movement in entities/player.js)
    const sx=(dx-dz)/Math.SQRT2,sy=-(dx+dz)/Math.SQRT2;
    $('lzArrow').style.transform='rotate('+Math.atan2(sx,sy).toFixed(2)+'rad)';
    $('lzDist').textContent=(h===0?'เฮลิคอปเตอร์ ':'จุดลงจอด ')+Math.round(dist)+' ม.';
  }
  if(!G.running||!ready)return;
  const stage=tod>=DAY_START&&tod<RESCUE_FROM?'coming':t>=0&&up<0?'landed':up>=0?'left':'';
  if(stage&&G.rescueSaid!==day+':'+stage){G.rescueSaid=day+':'+stage;
    if(stage==='coming')say((day===GOAL_NIGHTS+1?'รอดครบ '+GOAL_NIGHTS+' คืนแล้ว! ':'')+'วิทยุ: เฮลิคอปเตอร์กู้ภัยจะลงจอดที่สี่แยกข้างสวนตอน 08:00 และรอถึง 12:00 ตามลูกศรไป','radio',9);
    else if(stage==='landed')say('เฮลิคอปเตอร์มาถึงแล้ว! ไปให้ถึงก่อน 12:00','alarm',7);
    else say('เฮลิคอปเตอร์บินออกไปแล้ว จะกลับมาอีกพรุ่งนี้ 08:00','alarm',7);}
  // everyone still alive has to be on board (v0.9: one or more players)
  const alive=players.filter(p=>p.alive);
  if(h===0&&alive.length&&alive.every(p=>p.down<=0&&Math.hypot(LZ.x-p.pos.x,LZ.z-p.pos.z)<RESCUE_RADIUS)){
    G.endCause='won';clearSave();sfx.rotor(0);sfx.win();say('ขึ้นเฮลิคอปเตอร์ได้แล้ว คุณรอด!','',6);gameOver();
  }
}
