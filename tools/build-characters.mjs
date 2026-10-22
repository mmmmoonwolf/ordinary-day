// Builds assets/characters/ from Quaternius' Ultimate Modular Men / Women packs (CC0, glTF "Individual Characters").
// Every character shares one 62-bone rig and the same animations, so the clips are written once (anims.glb) and each
// character keeps only its meshes, quantized. Not part of the game or the tests; run it again when characters change:
//   npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4
//   node tools/build-characters.mjs <folder with "Ultimate modular men pack" and "Women Pack">
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, resample, weld } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/build-characters.mjs <pack folder>'); process.exit(1); }
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'characters');
fs.mkdirSync(out, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const MEN = 'Ultimate modular men pack', WOMEN = 'Women Pack';
// file name in the game -> source
const CHARS = {
  m_casual: [MEN, 'Casual_2'], m_hoodie: [MEN, 'Casual_Hoodie'], m_beach: [MEN, 'Beach'], m_suit: [MEN, 'Suit'], m_worker: [MEN, 'Worker'],
  m_farmer: [MEN, 'Farmer'], m_punk: [MEN, 'Punk'], m_swat: [MEN, 'Swat'], m_adventurer: [MEN, 'Adventurer'],
  f_casual: [WOMEN, 'Casual'], f_formal: [WOMEN, 'Formal'], f_suit: [WOMEN, 'Suit'], f_worker: [WOMEN, 'Worker'], f_punk: [WOMEN, 'Punk'],
  f_soldier: [WOMEN, 'Soldier'], f_adventurer: [WOMEN, 'Adventurer'],
};
const CLIPS = ['Idle', 'Walk', 'Run', 'Death', 'HitRecieve', 'Gun_Shoot', 'Idle_Gun', 'Run_Shoot', 'Interact', 'Punch_Right', 'Sword_Slash'];
const PROPS = /^(Pistol|Sword|Gun)/;   // props some outfits hold; the game attaches its own weapons
const sizes = {};
// an animation with its samplers and channels (disposing only the animation leaves them, and their keyframes, behind; prune then drops
// keyframe data no animation still uses; clips share some of it)
function dropAnim(a) { for (const c of a.listChannels()) c.dispose(); for (const s of a.listSamplers()) s.dispose(); a.dispose(); }
for (const [name, [pack, file]] of Object.entries(CHARS)) {
  const doc = await io.read(path.join(src, pack, file + '.gltf'));
  const root = doc.getRoot();
  for (const a of root.listAnimations()) dropAnim(a);
  for (const n of root.listNodes()) if (n.getMesh() && PROPS.test(n.getName())) { n.getMesh().dispose(); n.dispose(); }
  await doc.transform(weld(), dedup(), prune(), quantize({ quantizeNormal: 8, quantizePosition: 14, quantizeWeight: 8 }));
  await io.write(path.join(out, name + '.glb'), doc);
  sizes[name] = fs.statSync(path.join(out, name + '.glb')).size;
}
// the clips, on a bare skeleton
{
  const doc = await io.read(path.join(src, MEN, 'Worker.gltf'));
  const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!CLIPS.includes(a.getName())) dropAnim(a);
  for (const n of root.listNodes()) if (n.getMesh()) { n.setMesh(null); n.setSkin(null); }
  for (const m of root.listMeshes()) m.dispose();
  await doc.transform(resample(), prune({ keepLeaves: true }), dedup());
  await io.write(path.join(out, 'anims.glb'), doc);
  sizes.anims = fs.statSync(path.join(out, 'anims.glb')).size;
}
const total = Object.values(sizes).reduce((s, v) => s + v, 0);
console.log(Object.entries(sizes).map(([k, v]) => k + ' ' + Math.round(v / 1024) + ' KB').join('\n') + '\ntotal ' + (total / 1048576).toFixed(2) + ' MB');
