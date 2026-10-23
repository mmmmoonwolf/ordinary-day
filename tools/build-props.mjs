// Builds assets/props/props.glb from Quaternius' packs (CC0, FBX): guns, a few survival items and cars (v0.14), furniture (v0.15),
// trees, plants and street signs (v0.16).
// Every prop is converted with FBX2glTF, then all of them go into one file, one top-level node per prop named as in
// PROPS below, with shared materials merged and the meshes quantized. Not part of the game or the tests; run it again
// when the props change:
//   npm i --no-save fbx2gltf@0.9.7-p1 @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4
//   node tools/build-props.mjs <folder with "Guns", "Survival Pack", "Foods", "Furnitures", "Trees", "Natures", "Streets" and "Cars">
//     <folder with the v0.18 glTF packs unzipped into "City Pack" and "Weapons Pack">
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, quantize, weld, join } from '@gltf-transform/functions';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const src = process.argv[2], src2 = process.argv[3];
if (!src || !src2) { console.error('usage: node tools/build-props.mjs <FBX pack folder> <glTF pack folder>'); process.exit(1); }
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'props');
fs.mkdirSync(out, { recursive: true });
const bin = path.join(path.dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')), 'bin', os.type(), os.type() === 'Windows_NT' ? 'FBX2glTF.exe' : 'FBX2glTF');
// name in the game -> source file (world/prop-models.js says which game model uses which)
const PROPS = {
  lmg: 'Guns/AssaultRifle2_1',   // v0.18: the other guns, the knife and the axe come from the Weapons Pack (w_*)
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
  // v0.18 (glTF packs, "glb:"): Weapons Pack 002 "In Case of Zombies" (one shared texture; guns lie flat with the muzzle
  // towards -z, melee weapons the handle towards +z) and the City Pack for a dirtier town
  w_glock: 'glb:Weapons Pack/Glock', w_smg: 'glb:Weapons Pack/Submachine Gun', w_rifle: 'glb:Weapons Pack/Rifle-yyW7pc4MG0', w_shotgun: 'glb:Weapons Pack/Shotgun',
  w_sniper: 'glb:Weapons Pack/Sniper', w_bat: 'glb:Weapons Pack/Baseball Bat', w_pipe: 'glb:Weapons Pack/Pipe', w_baton: 'glb:Weapons Pack/Police Baton',
  w_knife: 'glb:Weapons Pack/Hunters Knife', w_axe: 'glb:Weapons Pack/Axe', w_crowbar: 'glb:Weapons Pack/Crowbar', w_machete: 'glb:Weapons Pack/Machete',
  w_golf: 'glb:Weapons Pack/Golf Club', w_wrench: 'glb:Weapons Pack/Wrench', w_sledge: 'glb:Weapons Pack/Sledge Hammer', w_katana: 'glb:Weapons Pack/Katana',
  c_dumpster: 'glb:City Pack/Dumpster', c_cone: 'glb:City Pack/Cone', c_papers: 'glb:City Pack/Debris Papers', c_hydrant: 'glb:City Pack/Fire hydrant',
  c_mailbox: 'glb:City Pack/Mailbox', c_power: 'glb:City Pack/Power Box', c_bin: 'glb:City Pack/Trash Can', c_bag: 'glb:City Pack/trah bag grey',
  c_box: 'glb:City Pack/Box', c_fireexit: 'glb:City Pack/Fire Exit', c_ac: 'glb:City Pack/Air conditioner', c_roofexit: 'glb:City Pack/Roof Exit',
  c_planter: 'glb:City Pack/Planter & Bushes', c_manhole: 'glb:City Pack/Manhole Cover', c_roadbits: 'glb:City Pack/Road Bits', c_fence: 'glb:City Pack/Fence Piece',
  c_poster: 'glb:City Pack/Rock band poster', c_bus: 'glb:City Pack/Bus', c_van: 'glb:City Pack/Van', c_pickup: 'glb:City Pack/Pickup Truck', c_moto: 'glb:City Pack/Motorcycle',
  // dense rooms (v0.18, Quaternius Furniture, FBX)
  // v0.22 the farm west of town: Kenney Retro Urban Kit and Building Kit (CC0, glTF with small external textures)
  k_truck: 'glb:Kenney Retro/truck-grey', k_truck2: 'glb:Kenney Retro/truck-green-cargo', k_flat: 'glb:Kenney Retro/truck-flat', k_pallet: 'glb:Kenney Retro/pallet',
  k_planks: 'glb:Kenney Retro/planks', k_fence: 'glb:Kenney Retro/wall-fence', k_barrier: 'glb:Kenney Retro/detail-barrier-strong-damaged', k_roadblock: 'glb:Kenney Retro/detail-barrier-type-a',
  k_tree: 'glb:Kenney Retro/tree-large', k_pine: 'glb:Kenney Retro/tree-pine-large', k_shrub: 'glb:Kenney Retro/tree-shrub', k_lean: 'glb:Kenney Retro/roof-metal-type-a', k_bricks: 'glb:Kenney Retro/detail-bricks-type-a',
  b_win_a: 'glb:Kenney Building/barricade-window-a', b_win_b: 'glb:Kenney Building/barricade-window-b', b_win_c: 'glb:Kenney Building/barricade-window-c', b_door: 'glb:Kenney Building/barricade-doorway-a',
  f_bed: 'Furnitures/Bed_Single', f_bedk: 'Furnitures/Bed_King', f_table: 'Furnitures/Table_RoundSmall', f_chair: 'Furnitures/Chair_1', f_chair2: 'Furnitures/Chair_2',
  f_toilet: 'Furnitures/Bathroom_Toilet', f_carpet: 'Furnitures/Carpet_2', f_plant: 'Furnitures/Houseplant_3', f_lamp: 'Furnitures/Light_Floor1',
  f_night: 'Furnitures/NightStand_1', f_tcan: 'Furnitures/Trashcan_Small1', f_stool: 'Furnitures/Stool',
  car_police: 'Cars/Cop', car_1: 'Cars/NormalCar1', car_2: 'Cars/NormalCar2', car_suv: 'Cars/SUV', car_taxi: 'Cars/Taxi', car_sport: 'Cars/SportsCar',
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'props-'));
const ids = Object.keys(PROPS);
const doc = await io.read(convert(ids[0]));
const scene = doc.getRoot().listScenes()[0];
name(scene, ids[0]);
for (const id of ids.slice(1)) {
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
  if (PROPS[id].startsWith('glb:')) return path.join(src2, PROPS[id].slice(4) + '.glb');
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
