// Builds assets/props/props.glb from Quaternius' packs (CC0, FBX): guns, a few survival items and cars (v0.14), furniture (v0.15),
// trees, plants and street signs (v0.16).
// Every prop is converted with FBX2glTF, then all of them go into one file, one top-level node per prop named as in
// PROPS below, with shared materials merged and the meshes quantized. Not part of the game or the tests; run it again
// when the props change:
//   npm i --no-save fbx2gltf@0.9.7-p1 @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4
//   node tools/build-props.mjs <folder with "Guns", "Survival Pack", "Foods", "Furnitures", "Trees", "Natures", "Streets" and "Cars">
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, quantize, weld, join } from '@gltf-transform/functions';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/build-props.mjs <pack folder>'); process.exit(1); }
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'props');
fs.mkdirSync(out, { recursive: true });
const bin = path.join(path.dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')), 'bin', os.type(), os.type() === 'Windows_NT' ? 'FBX2glTF.exe' : 'FBX2glTF');
// name in the game -> source file (world/prop-models.js says which game model uses which)
const PROPS = {
  pistol: 'Guns/Pistol_1', smg: 'Guns/SubmachineGun_1', rifle: 'Guns/AssaultRifle_1', shotgun: 'Guns/Shotgun_1',
  sniper: 'Guns/SniperRifle_1', lmg: 'Guns/AssaultRifle2_1',
  knife: 'Survival Pack/Knife', axe: 'Survival Pack/Axe',
  canned: 'Survival Pack/Can_Closed', water: 'Survival Pack/WaterBottle_1', bandage: 'Survival Pack/Bandages',
  firstaid: 'Survival Pack/FirstAidKit', backpack: 'Survival Pack/Backpack', bottle: 'Foods/Bottle1',
  // furniture in the enterable buildings (v0.15), put together along the walls by world/prop-models.js
  f_fridge: 'Furnitures/Kitchen_Fridge', f_kdrawers: 'Furnitures/Kitchen_2Drawers', f_ksink: 'Furnitures/Kitchen_Sink', f_koven: 'Furnitures/Kitchen_Oven',
  f_kcab: 'Furnitures/Kitchen_Cabinet1', f_k3: 'Furnitures/Kitchen_3Drawers', f_bookshelf: 'Furnitures/Bookshelf', f_shelf: 'Furnitures/Shelf_Large',
  f_couch: 'Furnitures/Couch_Large1', f_couch_m: 'Furnitures/Couch_Medium2', f_drawer1: 'Furnitures/Drawer_1', f_drawer2: 'Furnitures/Drawer_2', f_drawer5: 'Furnitures/Drawer_5',
  // the town (v0.16): trees (untextured: world/prop-models.js colours bark and leaves), weeds, bushes, rubble and street signs
  tree_1: 'Trees/Tree_1', tree_2: 'Trees/Tree_10', tree_3: 'Trees/Tree_9', tree_4: 'Trees/Tree_7',
  dead_1: 'Trees/DeadTree_1', dead_2: 'Trees/DeadTree_7', dead_3: 'Trees/DeadTree_8', dead_4: 'Trees/DeadTree_9', dead_5: 'Trees/DeadTree_2',
  bush_1: 'Natures/Bush_1', bush_2: 'Natures/Bush_2', grass_1: 'Natures/Grass_2', grass_2: 'Natures/Grass_Short',
  rock: 'Natures/Rock_1', stump: 'Natures/TreeStump', log: 'Natures/WoodLog',
  sign_np: 'Streets/Sign_NoParking', sign_tri: 'Streets/Sign_Triangle', tlight: 'Streets/TrafficLight_2',
  car_police: 'Cars/Cop', car_1: 'Cars/NormalCar1', car_2: 'Cars/NormalCar2', car_suv: 'Cars/SUV', car_taxi: 'Cars/Taxi', car_sport: 'Cars/SportsCar',
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'props-'));
const doc = await io.read(convert('pistol'));
const scene = doc.getRoot().listScenes()[0];
name(scene, 'pistol');
for (const id of Object.keys(PROPS).slice(1)) {
  mergeDocuments(doc, await io.read(convert(id)));
  const s = doc.getRoot().listScenes().find(x => x !== scene);   // the one just merged in
  name(s, id);
  for (const n of s.listChildren()) { s.removeChild(n); scene.addChild(n); }
  s.dispose();
}
// the tree models come untextured: bark and leaves get flat colours here, before dedup() would merge the two identical
// grey materials into one (world/prop-models.js then varies the leaves per tree)
const lin = h => [1, 3, 5].map(i => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2)).concat(1);
for (const m of doc.getRoot().listMaterials()) { if (m.getName() === 'Bark') m.setBaseColorFactor(lin('#4f4134')); if (m.getName() === 'Tree_Leaves') m.setBaseColorFactor(lin('#6a7243')); }
// one buffer for the whole file
const [buf, ...extra] = doc.getRoot().listBuffers();
for (const a of doc.getRoot().listAccessors()) a.setBuffer(buf);
for (const b of extra) b.dispose();
await doc.transform(dedup(), join(), weld(), prune(), quantize({ quantizeNormal: 8, quantizePosition: 14 }));
await io.write(path.join(out, 'props.glb'), doc);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(scene.listChildren().map(n => n.getName()).join(' ') + '\nprops.glb ' + Math.round(fs.statSync(path.join(out, 'props.glb')).size / 1024) + ' KB');

function convert(id) {
  const f = path.join(tmp, id);
  execFileSync(bin, ['--binary', '-i', path.join(src, PROPS[id] + '.fbx'), '-o', f], { stdio: 'ignore' });
  return f + '.glb';
}
// one top-level node per prop, named for the game, holding whatever the FBX had
function name(s, id) {
  const g = doc.createNode(id);
  for (const n of s.listChildren()) { s.removeChild(n); g.addChild(n); }
  s.addChild(g);
}
