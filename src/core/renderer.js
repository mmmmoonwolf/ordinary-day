import {isTouch,$,clamp} from './util.js';

// ---------- renderer ----------
export const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.6:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
$('game').appendChild(renderer.domElement);
export const cv=renderer.domElement;
export const scene=new THREE.Scene();
scene.background=new THREE.Color('#a9b5bb');
scene.fog=new THREE.Fog('#a9b5bb',125,240);
export const camera=new THREE.OrthographicCamera(-1,1,1,-1,1,500);
export const camOffset=new THREE.Vector3(1,1.3,1).normalize().multiplyScalar(130);
// v0.28 first-person view (experimental, ui/fps.js): a perspective camera at the eyes of the player this device follows.
// Only this device's view: the game, the other players and online play do not know about it
export const view={fps:false,yaw:0,pitch:0};
export const fpsCam=new THREE.PerspectiveCamera(72,1,.05,140);scene.add(fpsCam);
export const activeCam=()=>view.fps?fpsCam:camera;
// the on-screen direction (radians, clockwise from up) of a ground vector, for arrows on the HUD
export function screenAngle(dx,dz){
  if(view.fps)return view.yaw-Math.atan2(dx,dz);
  const sx=(dx-dz)/Math.SQRT2,sy=-(dx+dz)/Math.SQRT2;return Math.atan2(sx,sy);   // under the isometric camera
}
export const camTarget=new THREE.Vector3(5,0,5);
let viewH=isTouch?24:32;
export const hemi=new THREE.HemisphereLight('#c8d4dc','#5a5040',0.6);scene.add(hemi);
export const sun=new THREE.DirectionalLight('#fff1dc',2);sun.castShadow=true;
const SM=isTouch?1024:2048;sun.shadow.mapSize.set(SM,SM);sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.03;
sun.shadow.camera.near=1;sun.shadow.camera.far=260;scene.add(sun,sun.target);
export const flash=new THREE.SpotLight('#ffe6bf',0,22,0.55,0.5,1.2);scene.add(flash,flash.target);
export const muzzle=new THREE.PointLight('#ffc477',0,9,2);scene.add(muzzle);
export const boomLight=new THREE.PointLight('#ff9a4a',0,16,2);scene.add(boomLight);
export function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h);
  const asp=w/h;fpsCam.aspect=asp;fpsCam.updateProjectionMatrix();camera.left=-viewH*asp/2;camera.right=viewH*asp/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();
  const s=Math.max(30,viewH*Math.max(1,asp)*0.95);const sc=sun.shadow.camera;sc.left=-s;sc.right=s;sc.top=s;sc.bottom=-s;sc.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();
// graphics quality from the settings page (v0.8): pixel ratio cap, sun shadows and their map size
export const QUALITY={high:{ratio:2,shadow:true,map:2048,name:'สูง'},medium:{ratio:1.6,shadow:true,map:1024,name:'กลาง'},low:{ratio:1,shadow:false,map:512,name:'ต่ำ'}};
export function setQuality(k){
  const q=QUALITY[k]||QUALITY.medium;renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.ratio));
  sun.castShadow=q.shadow;if(sun.shadow.mapSize.x!==q.map){sun.shadow.mapSize.set(q.map,q.map);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
  resize();
}
export function zoom(f){viewH=clamp(viewH*f,14,60);resize();}
