// ---------- glTF loading (v0.14) ----------
// GLTFLoader and SkeletonUtils come from the three.js r128 examples on jsdelivr, added once as plain scripts the first
// time a model is needed (character models, entities/skins.js; prop models, world/prop-models.js).
const LIBS=['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js'];
function script(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error(src));document.head.appendChild(s);});}
let libs=null;
export async function loadGltf(url){
  if(!libs)libs=(async()=>{for(const s of LIBS)if(!(s.includes('GLTF')?THREE.GLTFLoader:THREE.SkeletonUtils))await script(s);})();
  try{await libs;}catch(e){libs=null;throw e;}
  return new Promise((ok,no)=>new THREE.GLTFLoader().load(url,ok,undefined,no));
}
