// Input state shared by ui/input.js (writes it) and the player, combat and bag code (read and reset it)
export const keys={};
export const ctl={fireHeld:false,fireQ:0,stance:0,ads:false,adsTouch:false};   // v0.29 stance (C / Z), aiming (right mouse, 🎯)
export const mouse={active:false,ndc:new THREE.Vector2(),world:new THREE.Vector3()};
export const joy={id:null,ox:0,oy:0,x:0,y:0};
