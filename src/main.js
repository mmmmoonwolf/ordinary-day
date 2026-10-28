// Ordinary Day — entry point: builds the city, wires input, starts a new game and runs the frame loop.
import {renderer,scene,camera,camOffset,camTarget,flash,muzzle,boomLight,view as cam,activeCam} from './core/renderer.js';
import {G} from './core/state.js';
import {$} from './core/util.js';
import {RATE,SPEEDS,CALM_PACE} from './config/time.js';
import {buildCity} from './world/city.js';
import {buildInteriors,roomAt,moreBoxes} from './world/interiors.js';
import {buildDecor} from './world/decor.js';
import {buildClutter} from './world/clutter.js';
import {buildFarm} from './world/farm.js';
import {buildExtras} from './world/extras.js';
import {buildSuburb} from './world/suburb.js';
import {buildRiver} from './world/river.js';
import {buildCamp} from './world/camp.js';
import {buildOldTown} from './world/oldtown.js';
import {updateCamp} from './systems/camp.js';
import {updateOcclusion} from './world/occlusion.js';
import {agents,removeAgent} from './entities/agents.js';
import {updateHuman,updateZombie,updateDead} from './entities/ai.js';
import {player,players,updatePlayer,syncHeld,isSolo,viewed} from './entities/player.js';
import {animate,separate} from './entities/animation.js';
import {ring,alertRing,blast,tracers,updateFireFx,updateImpacts} from './systems/effects.js';
import {drops,ringMats,glowMats,refreshItems} from './systems/drops.js';
import {runEvents} from './systems/phases.js';
import {updateSky} from './systems/weather.js';
import {reset} from './systems/game.js';
import {autosave,initSave} from './systems/save.js';
import {updateShelter} from './systems/doors.js';
import {updateThrows,updateLures} from './systems/throw.js';
import {updateFires} from './systems/blast.js';
import {initAudio,updateMusic,updateAmbience} from './systems/audio.js';
import {updateGoal} from './systems/goal.js';
import {updateHUD} from './ui/hud.js';
import {initInput,pollInput} from './ui/input.js';
import {initPause} from './ui/pause.js';
import {updatePrompts} from './ui/prompts.js';
import {updateMinimap} from './ui/minimap.js';
import {VERSION} from './config/version.js';
import {initSettings,tickFps} from './ui/settings.js';
import {bus} from './core/bus.js';
import {hostFrame} from './net/host.js';
import {clientStep} from './net/client.js';
import {initOnline} from './ui/online.js';
import {updateFps} from './ui/fps.js';
import {updateTags} from './ui/tags.js';
import {initCreator} from './ui/creator.js';
import {updateGlow} from './world/glow.js';
import {feel,updateFeel,initFeel} from './ui/feel.js';
import {loadSkins,beginSkins} from './entities/skins.js';
import {loadProps,props} from './world/prop-models.js';
import './ui/report.js';   // keeps the last script errors for bug reports

buildCity();
buildInteriors();   // after the city: its own rng, new loot spots appended
buildDecor();   // v0.16: weeds, signs and stains, own rng, after everything else
buildClutter();   // v0.18: City Pack litter, wrecks and dumpsters, crowded rooms; own rng, after the decor
buildFarm();   // v0.22: the farm west of town, through the gate; own rng, everything appended
buildExtras();   // v0.23: bus stops, benches, signs, billboards, a building site, gas cylinders; own rng, appended
buildSuburb();   // v0.24: the suburb south of town, through the gate; own rng, appended
buildRiver();   // v0.25: the river and the bridge east of town; own rng, appended
buildCamp();   // v0.26: the survivors' camp in the woods across the river; own rng, appended
buildOldTown();   // v0.34: an old European town, abandoned: shop boards, balconies, posters, body bags, barriers; own rng
moreBoxes();   // v0.40: more cupboards in every room and the cars to search; own rng, appended to `boxes`, last
initInput();
initSettings();
$('verLabel').textContent='ORDINARY DAY · PROTOTYPE '+VERSION;
initPause();
initSave();
initAudio();
initOnline();
initFeel();
initCreator();   // v0.41 the name and the character on the start screen

// ---------- loop ----------
// The game state moves in fixed steps of 1/60 s (v0.9), however fast the screen draws, so every device (and later
// every player online) runs the same simulation; drawing, animation and the HUD still run once per frame.
const STEP=1/60,MAX_STEPS=5;
function simStep(dt,now){
  if(bus.role==='client'){if(G.running){pollInput(player);clientStep(dt);}return;}   // in a friend's room the host runs the game (v0.12)
  if(!isSolo())G.speedIdx=0;   // no ×2 / ×4 with more than one player (v0.11)
  if(G.running){G.min+=dt*RATE*SPEEDS[G.speedIdx]*(G.outbreak?1:CALM_PACE);runEvents(now);pollInput(player);for(const p of players)if(!p.away)updatePlayer(p,dt);updateShelter();autosave(dt);}
  for(let i=agents.length-1;i>=0;i--){
    const a=agents[i];
    if(a.state==='human'||a.state==='infected')updateHuman(a,dt);
    else if(a.state==='zombie')updateZombie(a,dt);
    else updateDead(a,dt);
    if(a.gone||(a.state==='dead'&&a.deadT>25)){removeAgent(a);agents.splice(i,1);}
  }
  separate();updateThrows(dt);updateLures(dt);updateFires(dt);if(G.running)updateCamp(dt);
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
    const frozen=feel.stop>0;if(frozen)feel.stop-=real;   // v0.31 hit stop: a landed blow holds the world still for a moment
    if(!frozen){acc+=real;let n=0;while(acc>=STEP&&n<MAX_STEPS){simStep(STEP,now);acc-=STEP;n++;}if(n===MAX_STEPS)acc=0;}   // a long stall is dropped, not replayed
    const adt=frozen?0:dt;beginSkins();for(const a of agents)animate(a,adt);
    for(const p of players){syncHeld(p);animate(p,adt);}
    updateImpacts(dt);
    for(const tr of tracers){if(tr.t>0){tr.t-=dt;tr.l.material.opacity=Math.max(0,tr.t/.07)*.95;}}
    muzzle.intensity=Math.max(0,muzzle.intensity-dt*60);boomLight.intensity=Math.max(0,boomLight.intensity-dt*20);
    if(blast.userData.t>0){blast.userData.t-=dt;const k=1-blast.userData.t/.4;blast.scale.setScalar(.5+k*4);blast.material.opacity=Math.max(0,.75*(1-k));}else blast.material.opacity=0;
    for(const d of drops)d.m.rotation.y+=dt*.6;
    const pulse=.62+.25*Math.sin(now/280);for(const k in ringMats)ringMats[k].opacity=pulse;for(const k in glowMats)glowMats[k].opacity=.14+.1*Math.sin(now/280);
    updateSky(dt,now);updateFireFx(dt,now);updateGlow(now);   // v0.40 doors and what is left to search glow after dark
    updateGoal(dt,now);
  }
  if(bus.role==='host')hostFrame(real);   // friends in this room: messages and the world, also while paused (v0.12)
  updatePrompts();
  updateMinimap(dt,now);tickFps(dt);
  // music mood: night, after the outbreak, and danger = zombies chasing the player (v0.8)
  const view=viewed();   // the player on this device, or the teammate they watch once dead (v0.11)
  let chasing=0;if(G.running&&view.alive)for(const a of agents)if(a.state==='zombie'&&a.seenP===view&&!a.retreat)chasing++;
  const low=G.running&&view.alive&&view.hp<35?.25+.75*(35-view.hp)/35:0;   // v0.20 the heart also races when hurt badly
  updateMusic({night:G.night||0,outbreak:G.outbreak,danger:Math.max(low,Math.min(1,chasing/4))});
  updateAmbience({on:G.running&&!G.over,rain:G.running?G.rain||0:0,night:G.night||0,outbreak:G.running&&G.outbreak&&!G.over,alive:view.alive,inside:roomAt(view.pos.x,view.pos.z)>=0});   // v0.19 rain, distant screams · v0.20 wind, moaning
  camTarget.x+=(view.pos.x-camTarget.x)*Math.min(1,dt*5);camTarget.z+=(view.pos.z-camTarget.z)*Math.min(1,dt*5);
  camera.position.copy(camTarget).add(camOffset);camera.lookAt(camTarget);
  if(cam.fps)updateFps(view,dt);   // v0.28 first-person view
  updateFeel(dt);   // v0.31 camera shake, hit marker
  updateTags();   // v0.40 names over heads, lights at the feet
  ring.position.set(player.pos.x,player.y+.03,player.pos.z);ring.visible=player.alive&&!cam.fps;
  if(G.alertT>0&&G.alertA){G.alertT-=dt;alertRing.position.set(G.alertA.pos.x,G.alertA.y+.04,G.alertA.pos.z);alertRing.material.opacity=Math.min(1,G.alertT)*(.5+.5*Math.sin(now/120));alertRing.scale.setScalar(1+.25*Math.sin(now/200));}else alertRing.material.opacity=0;
  const fx=Math.sin(view.face),fz=Math.cos(view.face);
  flash.position.set(view.pos.x-fx*.2,2.2,view.pos.z-fz*.2);flash.target.position.set(view.pos.x+fx*8,0,view.pos.z+fz*8);
  if(frame%4===0)updateOcclusion();
  updateHUD(dt);
  renderer.render(scene,activeCam());
}
requestAnimationFrame(loop);
