// Builds assets/characters/ from Quaternius' Ultimate Modular Men / Women packs (CC0, glTF "Individual Characters").
// Every character shares one 62-bone rig and the same animations, so the clips are written once (anims.glb) and each
// character keeps only its meshes, quantized. Not part of the game or the tests; run it again when characters change:
//   npm i --no-save fbx2gltf@0.9.7-p1 @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4
//   node tools/build-characters.mjs <folder with "Ultimate modular men pack" and "Women Pack">
//     <folder with Mixamo's "Not So Scary Zombie Pack" (FBX, T-pose X Bot included), v0.27; see tools/mixamo-clips.mjs>
//     [folder with the player's Mixamo clips, v0.39: Rifle Walk, Run Forward, Stepping Backward, Strafing, Firing Rifle, Shooting,
//      Reload, Pistol Kneeling Idle, Stabbing, Stable Sword Inward Slash, Jump Up (FBX, Without Skin, spaces as _); see PCLIPS]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, resample, weld } from '@gltf-transform/functions';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ZCLIPS, PCLIPS, addMixamoClips } from './mixamo-clips.mjs';

const src = process.argv[2], mixamo = process.argv[3], mixamoP = process.argv[4];
if (!src || !mixamo) { console.error('usage: node tools/build-characters.mjs <pack folder> <Mixamo zombie pack folder>'); process.exit(1); }
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
  // v0.27 the zombie clips, retargeted from Mixamo while the skin (the rest pose) is still there
  const bin = path.join(path.dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')), 'bin', os.type(), os.type() === 'Windows_NT' ? 'FBX2glTF.exe' : 'FBX2glTF');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mixamo-'));
  const fbx = async (f, dir = mixamo) => { const o = path.join(tmp, f.replace(/ /g, '_').replace(/[()]/g, '')); execFileSync(bin, ['--binary', '-i', path.join(dir, f + '.fbx'), '-o', o], { stdio: 'ignore' }); return io.read(o + '.glb'); };
  const read = async (dir, table) => {
    const files = {};
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.fbx') && f !== 'X Bot.fbx') { const k = f.slice(0, -4).replace(/ /g, '_').replace(/[()]/g, ''); if (Object.values(table).some(c => c[0] === k)) files[k] = await fbx(f.slice(0, -4), dir); }
    return files;
  };
  const bot = await fbx('X Bot');
  addMixamoClips(doc, doc, bot, await read(mixamo, ZCLIPS));
  if (mixamoP) addMixamoClips(doc, doc, bot, await read(mixamoP, PCLIPS), PCLIPS);   // v0.39
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const n of root.listNodes()) if (n.getMesh()) { n.setMesh(null); n.setSkin(null); }
  for (const m of root.listMeshes()) m.dispose();
  await doc.transform(resample(), prune({ keepLeaves: true }), dedup());
  await io.write(path.join(out, 'anims.glb'), doc);
  sizes.anims = fs.statSync(path.join(out, 'anims.glb')).size;
}
const total = Object.values(sizes).reduce((s, v) => s + v, 0);
console.log(Object.entries(sizes).map(([k, v]) => k + ' ' + Math.round(v / 1024) + ' KB').join('\n') + '\ntotal ' + (total / 1048576).toFixed(2) + ' MB');
