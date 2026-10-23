// Ordinary Day — entry point: builds the city, wires input, starts a new game and runs the frame loop.
import {renderer,scene,camera,camOffset,camTarget,flash,muzzle,boomLight} from './core/renderer.js';
import {G} from './core/state.js';
import {$} from './core/util.js';
import {RATE,SPEEDS} from './config/time.js';
import {buildCity} from './world/city.js';
import {buildInteriors} from './world/interiors.js';
import {buildDecor} from './world/decor.js';
import {updateOcclusion} from './world/occlusion.js';
import {agents,removeAgent} from './entities/agents.js';
import {updateHuman,updateZombie,updateDead} from './entities/ai.js';
import {player,players,updatePlayer,syncHeld,isSolo,viewed} from './entities/player.js';
import {animate,separate} from './entities/animation.js';
import {ring,alertRing,blast,tracers} from './systems/effects.js';
import {drops,ringMats,glowMats,refreshItems} from './systems/drops.js';
import {runEvents} from './systems/phases.js';
import {updateSky} from './systems/weather.js';
import {reset} from './systems/game.js';
import {autosave,initSave} from './systems/save.js';
import {updateShelter} from './systems/doors.js';
import {updateThrows} from './systems/throw.js';
import {initAudio,updateMusic} from './systems/audio.js';
import {updateGoal} from './systems/goal.js';
import {updateHUD} from './ui/hud.js';
import {initInput,pollInput} from './ui/input.js';
import {initPause} from './ui/pause.js';
import {updateTips} from './ui/tips.js';
import {updatePrompts} from './ui/prompts.js';
import {updateMinimap} from './ui/minimap.js';
import {VERSION} from './config/version.js';
import {initSettings,tickFps} from './ui/settings.js';
import {bus} from './core/bus.js';
import {hostFrame} from './net/host.js';
import {clientStep} from './net/client.js';
import {initOnline} from './ui/online.js';
import {loadSkins,beginSkins} from './entities/skins.js';
import {loadProps,props} from './world/prop-models.js';
import './ui/report.js';   // keeps the last script errors for bug reports

buildCity();
buildInteriors();   // after the city: its own rng, new loot spots appended
buildDecor();   // v0.16: weeds, signs and stains, own rng, after everything else
initInput();
initSettings();
$('verLabel').textContent='ORDINARY DAY · PROTOTYPE '+VERSION;
initPause();
initSave();
initAudio();
initOnline();

// ---------- loop ----------
// The game state moves in fixed steps of 1/60 s (v0.9), however fast the screen draws, so every device (and later
// every player online) runs the same simulation; drawing, animation and the HUD still run once per frame.
const STEP=1/60,MAX_STEPS=5;
function simStep(dt,now){
  if(bus.role==='client'){if(G.running){pollInput(player);clientStep(dt);}return;}   // in a friend's room the host runs the game (v0.12)
  if(!isSolo())G.speedIdx=0;   // no ×2 / ×4 with more than one player (v0.11)
  if(G.running){G.min+=dt*RATE*SPEEDS[G.speedIdx];runEvents(now);pollInput(player);for(const p of players)if(!p.away)updatePlayer(p,dt);updateShelter();autosave(dt);}
  for(let i=agents.length-1;i>=0;i--){
    const a=agents[i];
    if(a.state==='human'||a.state==='infected')updateHuman(a,dt);
    else if(a.state==='zombie')updateZombie(a,dt);
    else updateDead(a,dt);
    if(a.gone||(a.state==='dead'&&a.deadT>25)){removeAgent(a);agents.splice(i,1);}
  }
  separate();updateThrows(dt);
}
reset();
// character models load in the background; until then everyone is blocky (v0.13)
loadSkins(s=>{const n=$('skinNote');n.hidden=s.ready;n.textContent=s.failed?'โหลดตัวละครไม่ได้ ใช้ตัวละครแบบเรียบแทน':'กำลังโหลดตัวละคร '+s.loaded+'/'+s.total;});
// guns, items and cars too (v0.14)
loadProps().then(()=>{if(props.ready)refreshItems();});
let last=performance.now(),frame=0,acc=0;
function loop(now){
  requestAnimationFrame(loop);
  const real=Math.min(.25,(now-last)/1000),dt=Math.min(.05,real);last=now;frame++;
  if(!G.paused){
    acc+=real;let n=0;while(acc>=STEP&&n<MAX_STEPS){simStep(STEP,now);acc-=STEP;n++;}if(n===MAX_STEPS)acc=0;   // a long stall is dropped, not replayed
    beginSkins();for(const a of agents)animate(a,dt);
    for(const p of players){syncHeld(p);animate(p,dt);}
    for(const tr of tracers){if(tr.t>0){tr.t-=dt;tr.l.material.opacity=Math.max(0,tr.t/.07)*.95;}}
    muzzle.intensity=Math.max(0,muzzle.intensity-dt*60);boomLight.intensity=Math.max(0,boomLight.intensity-dt*20);
    if(blast.userData.t>0){blast.userData.t-=dt;const k=1-blast.userData.t/.4;blast.scale.setScalar(.5+k*4);blast.material.opacity=Math.max(0,.75*(1-k));}else blast.material.opacity=0;
    for(const d of drops)d.m.rotation.y+=dt*.6;
    const pulse=.45+.3*Math.sin(now/280);for(const k in ringMats)ringMats[k].opacity=pulse;for(const k in glowMats)glowMats[k].opacity=.1+.1*Math.sin(now/280);
    updateSky(dt,now);
    updateGoal(dt,now);
    updateTips(dt);
  }
  if(bus.role==='host')hostFrame(real);   // friends in this room: messages and the world, also while paused (v0.12)
  updatePrompts();
  updateMinimap(dt,now);tickFps(dt);
  // music mood: night, after the outbreak, and danger = zombies chasing the player (v0.8)
  const view=viewed();   // the player on this device, or the teammate they watch once dead (v0.11)
  let chasing=0;if(G.running&&view.alive)for(const a of agents)if(a.state==='zombie'&&a.seenP===view&&!a.retreat)chasing++;
  updateMusic({night:G.night||0,outbreak:G.outbreak,danger:Math.min(1,chasing/4)});
  camTarget.x+=(view.pos.x-camTarget.x)*Math.min(1,dt*5);camTarget.z+=(view.pos.z-camTarget.z)*Math.min(1,dt*5);
  camera.position.copy(camTarget).add(camOffset);camera.lookAt(camTarget);
  ring.position.set(player.pos.x,player.y+.03,player.pos.z);ring.visible=player.alive;
  if(G.alertT>0&&G.alertA){G.alertT-=dt;alertRing.position.set(G.alertA.pos.x,G.alertA.y+.04,G.alertA.pos.z);alertRing.material.opacity=Math.min(1,G.alertT)*(.5+.5*Math.sin(now/120));alertRing.scale.setScalar(1+.25*Math.sin(now/200));}else alertRing.material.opacity=0;
  const fx=Math.sin(view.face),fz=Math.cos(view.face);
  flash.position.set(view.pos.x-fx*.2,2.2,view.pos.z-fz*.2);flash.target.position.set(view.pos.x+fx*8,0,view.pos.z+fz*8);
  if(frame%4===0)updateOcclusion();
  updateHUD(dt);
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);
