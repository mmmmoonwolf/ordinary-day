// Ordinary Day — entry point: builds the city, wires input, starts a new game and runs the frame loop.
import {renderer,scene,camera,camOffset,camTarget,flash,muzzle,boomLight} from './core/renderer.js';
import {G} from './core/state.js';
import {$} from './core/util.js';
import {RATE,SPEEDS} from './config/time.js';
import {buildCity} from './world/city.js';
import {buildInteriors} from './world/interiors.js';
import {updateOcclusion} from './world/occlusion.js';
import {agents,removeAgent} from './entities/agents.js';
import {updateHuman,updateZombie,updateDead} from './entities/ai.js';
import {player,updatePlayer,syncHeld} from './entities/player.js';
import {animate,separate} from './entities/animation.js';
import {ring,alertRing,blast,tracers} from './systems/effects.js';
import {drops,ringMats} from './systems/drops.js';
import {runEvents} from './systems/phases.js';
import {updateSky} from './systems/weather.js';
import {reset} from './systems/game.js';
import {autosave,initSave} from './systems/save.js';
import {updateShelter} from './systems/doors.js';
import {updateThrows} from './systems/throw.js';
import {initAudio} from './systems/audio.js';
import {updateGoal} from './systems/goal.js';
import {updateHUD} from './ui/hud.js';
import {initInput} from './ui/input.js';
import {initPause} from './ui/pause.js';
import {updateTips} from './ui/tips.js';
import {updateMinimap} from './ui/minimap.js';
import {VERSION} from './config/version.js';
import './ui/report.js';   // keeps the last script errors for bug reports

buildCity();
buildInteriors();   // after the city: its own rng, new loot spots appended
initInput();
$('verLabel').textContent='ORDINARY DAY · PROTOTYPE '+VERSION;
initPause();
initSave();
initAudio();

// ---------- loop ----------
reset();
let last=performance.now(),frame=0;
function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(now-last)/1000);last=now;frame++;
  if(!G.paused){
    if(G.running){G.min+=dt*RATE*SPEEDS[G.speedIdx];runEvents();updatePlayer(dt);updateShelter();autosave(dt);}
    for(let i=agents.length-1;i>=0;i--){
      const a=agents[i];
      if(a.state==='human'||a.state==='infected')updateHuman(a,dt);
      else if(a.state==='zombie')updateZombie(a,dt);
      else updateDead(a,dt);
      if(a.gone||(a.state==='dead'&&a.deadT>25)){removeAgent(a);agents.splice(i,1);continue;}
      animate(a,dt);
    }
    separate();syncHeld();animate(player,dt);
    for(const tr of tracers){if(tr.t>0){tr.t-=dt;tr.l.material.opacity=Math.max(0,tr.t/.07)*.95;}}
    muzzle.intensity=Math.max(0,muzzle.intensity-dt*60);boomLight.intensity=Math.max(0,boomLight.intensity-dt*20);
    if(blast.userData.t>0){blast.userData.t-=dt;const k=1-blast.userData.t/.4;blast.scale.setScalar(.5+k*4);blast.material.opacity=Math.max(0,.75*(1-k));}else blast.material.opacity=0;
    for(const d of drops)d.m.rotation.y+=dt*.6;
    const pulse=.45+.3*Math.sin(now/280);for(const k in ringMats)ringMats[k].opacity=pulse;
    updateSky(dt,now);
    updateGoal(dt,now);
    updateTips(dt);updateThrows(dt);
  }
  updateMinimap(dt,now);
  camTarget.x+=(player.pos.x-camTarget.x)*Math.min(1,dt*5);camTarget.z+=(player.pos.z-camTarget.z)*Math.min(1,dt*5);
  camera.position.copy(camTarget).add(camOffset);camera.lookAt(camTarget);
  ring.position.set(player.pos.x,player.y+.03,player.pos.z);ring.visible=player.alive;
  if(G.alertT>0&&G.alertA){G.alertT-=dt;alertRing.position.set(G.alertA.pos.x,G.alertA.y+.04,G.alertA.pos.z);alertRing.material.opacity=Math.min(1,G.alertT)*(.5+.5*Math.sin(now/120));alertRing.scale.setScalar(1+.25*Math.sin(now/200));}else alertRing.material.opacity=0;
  const fx=Math.sin(player.face),fz=Math.cos(player.face);
  flash.position.set(player.pos.x-fx*.2,2.2,player.pos.z-fz*.2);flash.target.position.set(player.pos.x+fx*8,0,player.pos.z+fz*8);
  if(frame%4===0)updateOcclusion();
  updateHUD(dt);
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);
