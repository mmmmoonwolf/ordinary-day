// Source checks that run before the tests (npm test). No dependencies.
//  1. every .js file under src/ and tools/ parses (node --check)
//  2. no code swallowed by a comment: the lines here are long and carry their comments at the end, and three times a
//     `// comment` put in the middle of a line has silently cut off the statements after it (v0.17 the rooftop units,
//     v0.47.1 the friend's room, v0.52 a syntax error). A line is flagged when code comes before a `//` comment and
//     the comment's own text looks like code. Put `lint-ok` in a comment that really has to quote code.
// Usage: node tools/lint.js            check the repository
//        node tools/lint.js --self     check that the detector still catches the known cases
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// index of the first `//` that starts a comment (not inside a string, a template or a regular expression), or -1
export function commentStart(line) {
  let quote = null, prev = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && line[i + 1] === '/') return i;
    // a regular expression literal: a slash where a value is expected (after an operator, a bracket or nothing)
    if (c === '/' && line[i + 1] !== '*' && /^[=(,:;!&|?{}\[+\-*%<>~^]?$/.test(prev)) {
      let j = i + 1, cls = false;
      for (; j < line.length; j++) {
        if (line[j] === '\\') { j++; continue; }
        if (line[j] === '[') cls = true; else if (line[j] === ']') cls = false;
        else if (line[j] === '/' && !cls) break;
      }
      if (j < line.length) { i = j; prev = '/'; continue; }
    }
    if (c !== ' ' && c !== '\t') prev = c;
  }
  return -1;
}

// does the text of a comment look like code that was meant to run?
const CODE = [
  /[;}]\s*(?:if|for|while|switch)\(/,                               // ...; if(  }for(
  /[;}]\s*(?:const|let|var|return)\s+[\w$\[{]/,                     // ...; const x   }return y
  /[;}]\s*[A-Za-z_$][\w$]*(?:\.[\w$]+|\[[^\]]*\])*(?:\(|\s*(?:[+\-*/]?=)(?!=))/,   // ...; a.b(   ;x=   ;x+=
  /[a-z]{3,}[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*=(?![=>])/,           // prose run straight into `p.room=`
  /\b(?:for|while)\((?:let|const|var)\s/,                           // a loop header
  /\b(?:if|for|while) ?\(.*\)\s*[A-Za-z_$][\w$.]*\(.*\);?\s*$/,           // if (x) call(...) to the end of the line
  /\w\([^()]*\);\s*$/,                                            // ends in a call and a semicolon
  /\)\{\s*[A-Za-z_$][\w$.]*[(=]/,                                 // ){parts.push(   ){x=
];
export function swallowed(line) {
  const at = commentStart(line);
  if (at < 0 || !line.slice(0, at).trim()) return false;            // no comment, or a comment on its own line
  const text = line.slice(at + 2);
  if (text.includes('lint-ok')) return false;
  return CODE.some(re => re.test(text));
}

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out); else if (/\.(js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

function self() {
  const bad = [
    "  mats.push(det); const nd=1;   // v0.17: grimy rooftop units  for(let i=0;i<nd;i++){parts.push(box(det));}",
    "    ease(p,dt,f);   // faces where it aims now, not a snapshot laterp.room=p.alive?roomAt(p.pos.x,p.pos.z):-1;",
    "    if(G.min>=G.nightSpawnNext){   // v0.52 the blood night  ;G.nightSpawnNext+=45;spawnEdge(kind);}",
    "  a.x=1;   // old; return a.y",
    "  for (let k = 0; k < 9 && q.hp >= 100; k++) { step(1); }   // 40% a shot, one a second or so if (!(q.hp < 100)) vfail('did not shoot');",
  ];
  const good = [
    "  const u='https://example.com/a.js';   // where it loads from",
    "  x=1;   // v0.21; rummaging (no model) stays synthesized",
    "  // p.room=3; whole-line comments are not checked",
    "  const re=/\\/\\/[a-z]+/;x=2;   // a regular expression holding two slashes",
    "  s.replace(/a\\//g,'b');y=1;   // escaped slash, then a real comment: the x = y case",
    "  n=a/b/c;   // divisions, not a regular expression; nothing swallowed",
  ];
  const wrong = [...bad.filter(l => !swallowed(l)).map(l => 'missed: ' + l), ...good.filter(l => swallowed(l)).map(l => 'false alarm: ' + l)];
  console.log(wrong.length ? 'lint self-check FAILED\n' + wrong.join('\n') : 'lint self-check: ' + bad.length + ' caught, ' + good.length + ' left alone');
  return wrong.length;
}

function main() {
  if (self()) return 1;
  if (process.argv.includes('--self')) return 0;
  const list = [...files(join(ROOT, 'src')), ...files(join(ROOT, 'tools')), join(ROOT, 'sw.js')];
  const problems = [];
  for (const f of list) {
    const rel = f.slice(ROOT.length + 1);
    try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
    catch (e) { problems.push(rel + ': does not parse\n' + String(e.stderr).split('\n').slice(0, 5).join('\n')); continue; }
    if (rel === 'tools/lint.js') continue;                           // its own test lines
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (swallowed(line)) problems.push(rel + ':' + (i + 1) + ': code after a comment? ' + line.slice(commentStart(line), commentStart(line) + 160)); });
  }
  console.log(problems.length ? 'FAILED: lint, ' + problems.length + ' problem(s)\n' + problems.join('\n') : 'PASSED: lint (' + list.length + ' files parse, no code swallowed by a comment)');
  return problems.length ? 1 : 0;
}
process.exit(main());
