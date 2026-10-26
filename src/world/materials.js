import {scene} from '../core/renderer.js';
import {asphaltTex,pavingTex,grassTex,dirtTex,GLOW} from './textures.js';

// ---------- materials ----------
export const S=o=>new THREE.MeshStandardMaterial(Object.assign({roughness:.9,metalness:0},o));
export const roadMat=S({map:asphaltTex(),roughness:.92}),walkMat=S({map:pavingTex()}),grassMat=S({map:grassTex(),roughness:1}),groundMat=S({map:dirtTex(),roughness:1});
export const woodMat=S({color:'#6b5a46'}),darkMetal=S({color:'#3a3d40',roughness:.6,metalness:.4}),greyMat=S({color:'#8a8a86'}),whiteMat=S({color:'#e4e1d8'}),trunkMat=S({color:'#4e4438'});
export const leafMats=[S({color:'#4f5e34',flatShading:true}),S({color:'#606a3a',flatShading:true}),S({color:'#3f4e30',flatShading:true})];
export const lampHeadMat=S({color:'#d8d4c8',emissive:'#ffcf8a',emissiveIntensity:0});
export const glowMat=new THREE.MeshBasicMaterial({map:GLOW,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
export const puddleMat=S({color:'#2a3138',roughness:.06,metalness:.7,transparent:true,opacity:0,depthWrite:false});
export const bloodMat=S({color:'#5a0f0c',roughness:.35,transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
export const gunMetal=S({color:'#2b2d30',roughness:.45,metalness:.6}),bladeMat=S({color:'#c9ccd0',roughness:.25,metalness:.9}),gripMat=S({color:'#3a2a1e'}),batMat=S({color:'#a77b4c',roughness:.7}),pipeMat=S({color:'#8d9397',roughness:.35,metalness:.8}),oliveMat=S({color:'#4f5636',roughness:.7}),blackMat=S({color:'#17191b',roughness:.6});
export const eyeMat=new THREE.MeshBasicMaterial({color:'#ff3b2a'});
export const vestMat=S({color:'#1b1f26',roughness:.7});
export const unitBox=new THREE.BoxGeometry(1,1,1);
export const wallMats=[];
export function box(mat,w,h,d,x,y,z,shadow=true){const m=new THREE.Mesh(unitBox,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;}
export function scaleUV(geo,fn){const uv=geo.attributes.uv;for(let f=0;f<6;f++){const r=fn(f);for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*r[0]+(r[2]||0),uv.getY(i)*r[1]+(r[3]||0));}}uv.needsUpdate=true;return geo;}
// a box that is not added to the scene (item models and character parts)
export function part(mat,w,h,d,x,y,z){const m=new THREE.Mesh(unitBox,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;return m;}
