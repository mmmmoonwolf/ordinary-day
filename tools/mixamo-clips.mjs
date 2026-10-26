// Zombie clips from Mixamo (v0.27), retargeted onto the Quaternius rig and added to anims.glb by build-characters.mjs.
// Mixamo animations are free to use in a game but not to hand out as files, so the FBX files stay out of the repository:
// only the retargeted keyframes end up in assets/characters/anims.glb.
// Both rigs stand in a T-pose at rest, so a bone's turn away from its rest pose in world space carries over as it is:
//   target world = source world * source rest^-1 * target rest
// The Quaternius feet are IK bones under Root (not under the shin), so they are placed where the retargeted shin ends.
// Root motion is taken out (the game moves the zombies): the hips keep their sway but end where they started.

// clip name in the game -> Mixamo file (FBX2glTF output, spaces as _), optional [from, to] seconds, loop
export const ZCLIPS = {
  Z_Idle: ['zombie_idle', null, true], Z_Idle2: ['zombie_scratch_idle', null, true],
  Z_Walk: ['walking', null, true], Z_Walk2: ['walking_2', null, true], Z_Run: ['zombie_running', null, true],
  Z_Punch: ['zombie_punching', null, false], Z_Attack: ['zombie_attack', [.7, 2.4], false],   // arms up and down: the Tyrant's slam
  Z_Hit: ['zombie_reaction_hit', [.25, 1.2], false], Z_Fall: ['zombie_stumbling', [1.1, 3.83], false],   // falls on its back: a zombie's death
  Z_StandUp: ['zombie_stand_up', null, false],   // a bitten person getting up as a zombie
};
// Quaternius bone <- Mixamo bone (without "mixamorig:"); bones not listed keep their rest pose
const MAP = {
  Body: 'Hips', Abdomen: 'Spine', Torso: 'Spine1', Chest: 'Spine2', Neck: 'Neck', Head: 'Head',
  'Shoulder.L': 'LeftShoulder', 'UpperArm.L': 'LeftArm', 'LowerArm.L': 'LeftForeArm', 'Wrist.L': 'LeftHand',
  'Shoulder.R': 'RightShoulder', 'UpperArm.R': 'RightArm', 'LowerArm.R': 'RightForeArm', 'Wrist.R': 'RightHand',
  'UpperLeg.L': 'LeftUpLeg', 'LowerLeg.L': 'LeftLeg', 'Foot.L': 'LeftFoot',
  'UpperLeg.R': 'RightUpLeg', 'LowerLeg.R': 'RightLeg', 'Foot.R': 'RightFoot',
};
const FPS = 20;   // keys per second; plenty for a shambling zombie seen from above

// ---- quaternions [x,y,z,w] ----
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qinv = q => [-q[0], -q[1], -q[2], q[3]];
const qrot = (q, v) => { const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qinv(q)); return [p[0], p[1], p[2]]; };
const qnorm = q => { const l = Math.hypot(...q) || 1; return q.map(v => v / l); };
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(v => -v); d = -d; }
  if (d > .9995) return qnorm(a.map((v, i) => v + (b[i] - v) * t));
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + b[i] * wb);
}
function m3quat(m) {   // m[row][col], a pure rotation
  const tr = m[0][0] + m[1][1] + m[2][2]; let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s, s / 4]; }
  else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; q = [s / 4, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s]; }
  else if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; q = [(m[0][1] + m[1][0]) / s, s / 4, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s]; }
  else { const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; q = [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, s / 4, (m[1][0] - m[0][1]) / s]; }
  return qnorm(q);
}
// the bind pose of every joint of a skin, from its inverse bind matrix (rotation, position, uniform scale)
function bindPose(skin) {
  const ibm = skin.getInverseBindMatrices(), out = {};
  skin.listJoints().forEach((j, i) => {
    const e = ibm.getElement(i, []), A = (r, c) => e[c * 4 + r];   // column-major
    const s = 1 / Math.hypot(A(0, 0), A(1, 0), A(2, 0));
    const R = [[0, 1, 2].map(c => A(c, 0) * s), [0, 1, 2].map(c => A(c, 1) * s), [0, 1, 2].map(c => A(c, 2) * s)];   // R = (A*s)^T
    const u = [A(0, 3), A(1, 3), A(2, 3)], t = [0, 1, 2].map(r => -s * (R[r][0] * u[0] + R[r][1] * u[1] + R[r][2] * u[2]));
    out[j.getName()] = { q: m3quat(R), p: t, s };
  });
  return out;
}
// a channel's value at time t (linear; rotations slerped)
function sample(sampler, t) {
  const inp = sampler.getInput(), out = sampler.getOutput(), n = inp.getCount();
  let i = 0; while (i < n - 1 && inp.getScalar(i + 1) <= t) i++;
  const a = out.getElement(i, []); if (i >= n - 1 || sampler.getInterpolation() === 'STEP') return a;
  const t0 = inp.getScalar(i), t1 = inp.getScalar(i + 1), k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), b = out.getElement(i + 1, []);
  return a.length === 4 ? slerp(a, b, k) : a.map((v, j) => v + (b[j] - v) * k);
}

// workerDoc: a Quaternius character with its skin (rest pose, bone lengths); botDoc: Mixamo's X Bot in a T-pose (rest pose);
// srcDocs: name -> Mixamo animation document; animsDoc: the clip file the new animations go into
export function addMixamoClips(animsDoc, workerDoc, botDoc, srcDocs) {
  const tRest = bindPose(workerDoc.getRoot().listSkins()[0]), sRest = {};
  for (const [k, v] of Object.entries(bindPose(botDoc.getRoot().listSkins()[0]))) sRest[k.replace('mixamorig:', '')] = v;
  const root = animsDoc.getRoot(), nodes = {};
  for (const n of root.listNodes()) nodes[n.getName()] = n;
  // the target hierarchy in order, parents first, from Root
  const order = [], parentOf = {};
  (function walk(n) { order.push(n.getName()); for (const c of n.listChildren()) { parentOf[c.getName()] = n.getName(); walk(c); } })(nodes.Root);
  const bones = order.filter(b => tRest[b]);
  const sc = tRest.Root.s;   // the skin is bound 1.19x bigger than the scene skeleton
  // rest local rotation and translation of every target bone, from the bind pose; Root keeps its node values
  const restLocal = {};
  for (const b of bones) {
    const p = parentOf[b];
    if (b === 'Root') { restLocal[b] = { q: nodes.Root.getRotation(), t: nodes.Root.getTranslation() }; continue; }
    const P = tRest[p], B = tRest[b];
    restLocal[b] = { q: qmul(qinv(P.q), B.q), t: qrot(qinv(P.q), B.p.map((v, i) => (v - P.p[i]) / sc)) };
  }
  // fingers keep the slight curl of the Quaternius idle clip rather than the flat T-pose hand
  const idle = root.listAnimations().find(a => a.getName() === 'Idle');
  if (idle) for (const c of idle.listChannels()) { const b = c.getTargetNode().getName(); if (/Index|Middle|Ring|Pinky|Thumb/.test(b) && c.getTargetPath() === 'rotation' && restLocal[b]) restLocal[b].q = sample(c.getSampler(), 0); }
  // where the ankle sits on the shin, for the IK feet
  const footOff = {};
  for (const s of ['L', 'R']) { const sh = tRest['LowerLeg.' + s], f = tRest['Foot.' + s]; footOff[s] = qrot(qinv(sh.q), f.p.map((v, i) => (v - sh.p[i]) / sc)); }
  const hipK = qrot(qinv(tRest.Root.q), tRest.Body.p.map((v, i) => (v - tRest.Root.p[i]) / sc))[1] / sRest.Hips.p[1];
  const bodyRest = restLocal.Body.t;

  const buffer = root.listBuffers()[0];
  for (const [name, [file, span, loop]] of Object.entries(ZCLIPS)) {
    const src = srcDocs[file]; if (!src) { console.warn('missing ' + file); continue; }
    const sAnim = src.getRoot().listAnimations()[0], ch = {};
    for (const c of sAnim.listChannels()) ch[c.getTargetNode().getName().replace('mixamorig:', '') + '/' + c.getTargetPath()] = c.getSampler();
    const sNodes = {}, sParent = {};
    for (const n of src.getRoot().listNodes()) { const k = n.getName().replace('mixamorig:', ''); sNodes[k] = n; for (const c of n.listChildren()) sParent[c.getName().replace('mixamorig:', '')] = k; }
    const end = sAnim.listSamplers().reduce((m, s) => Math.max(m, s.getInput().getMax([])[0]), 0);
    const t0 = span ? span[0] : 0, t1 = span ? Math.min(span[1], end) : end, n = Math.max(2, Math.round((t1 - t0) * FPS) + 1);
    // source world rotations and the hips position at time t, the whole body turned by yaw
    const sPose = (t, yaw) => {
      const sw = {}, top = { q: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], p: [0, 0, 0] };
      const sWorld = k => {
        if (sw[k]) return sw[k];
        const node = sNodes[k], r = ch[k + '/rotation'] ? sample(ch[k + '/rotation'], t) : node.getRotation();
        const tr = ch[k + '/translation'] ? sample(ch[k + '/translation'], t) : node.getTranslation();
        const par = sParent[k] && sNodes[sParent[k]] && sParent[k] in sRest ? sWorld(sParent[k]) : top;
        return (sw[k] = { q: qmul(par.q, r), p: qrot(par.q, tr).map((v, i) => v + par.p[i]) });
      };
      return sWorld;
    };
    // some zombies shamble along sideways: turn the clip so the chest faces +z (where the game moves it), on average for a
    // loop, at the start for a one-off (it follows a walk or an idle)
    let fx = 0, fz = 0;
    for (let f = 0; f < (loop ? n : 1); f++) {   // across the shoulders (to the left) is +x at rest
      const W = sPose(t0 + (t1 - t0) * f / (n - 1), 0), l = W('LeftArm').p, r = W('RightArm').p; fx += l[0] - r[0]; fz += l[2] - r[2];
    }
    const yaw = Math.atan2(fz, fx);
    const times = [], frames = [];
    for (let f = 0; f < n; f++) {
      const t = t0 + (t1 - t0) * f / (n - 1); times.push(t - t0);
      const sWorld = sPose(t, yaw);
      // target, parents first
      const tw = {}, local = {};
      for (const b of bones) {
        const p = parentOf[b], pw = p && tw[p] ? tw[p] : { q: [0, 0, 0, 1], p: [0, 0, 0] };
        let q, t;
        if (MAP[b] && sRest[MAP[b]] && sNodes[MAP[b]]) {
          const S = sWorld(MAP[b]);
          q = qmul(qinv(pw.q), qmul(qmul(S.q, qinv(sRest[MAP[b]].q)), tRest[b].q));
        } else q = restLocal[b].q;
        t = restLocal[b].t;
        if (b === 'Body') { const H = sWorld('Hips').p, R0 = sRest.Hips.p; t = bodyRest.map((v, i) => v + (H[i] - R0[i]) * hipK); }
        if (b === 'Foot.L' || b === 'Foot.R') {
          const sh = tw['LowerLeg.' + b.slice(-1)], at = qrot(sh.q, footOff[b.slice(-1)]).map((v, i) => v + sh.p[i]);
          t = qrot(qinv(pw.q), at.map((v, i) => v - pw.p[i]));
        }
        local[b] = { q, t };
        tw[b] = { q: qmul(pw.q, q), p: qrot(pw.q, t).map((v, i) => v + pw.p[i]) };
      }
      frames.push(local);
    }
    // root motion out: the body drifts back to where it started by the end (x and z), the feet with it
    const d0 = frames[0].Body.t, d1 = frames[n - 1].Body.t;
    frames.forEach((fr, f) => {
      const k = f / (n - 1), dx = d0[0] + (d1[0] - d0[0]) * k - bodyRest[0], dz = d0[2] + (d1[2] - d0[2]) * k - bodyRest[2];
      for (const b of ['Body', 'Foot.L', 'Foot.R']) { fr[b].t = [fr[b].t[0] - dx, fr[b].t[1], fr[b].t[2] - dz]; }
    });
    // keep each rotation track on one side (no sign flips between keys)
    for (const b of bones) for (let f = 1; f < n; f++) { const a = frames[f - 1][b].q, c = frames[f][b].q; if (a[0] * c[0] + a[1] * c[1] + a[2] * c[2] + a[3] * c[3] < 0) frames[f][b].q = c.map(v => -v); }
    const anim = animsDoc.createAnimation(name);
    const input = animsDoc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer);
    for (const b of bones) for (const path of ['rotation', 'translation']) {
      const key = path === 'rotation' ? 'q' : 't', size = key === 'q' ? 4 : 3, arr = new Float32Array(n * size);
      frames.forEach((fr, f) => arr.set(fr[b][key], f * size));
      const out = animsDoc.createAccessor().setType(size === 4 ? 'VEC4' : 'VEC3').setArray(arr).setBuffer(buffer);
      const s = animsDoc.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR');
      anim.addSampler(s).addChannel(animsDoc.createAnimationChannel().setTargetNode(nodes[b]).setTargetPath(path).setSampler(s));
    }
    console.log(name + ' ' + (t1 - t0).toFixed(2) + ' s' + (loop ? ' loop' : '') + ', turned ' + Math.round(yaw * 180 / Math.PI) + ' deg');
  }
}
