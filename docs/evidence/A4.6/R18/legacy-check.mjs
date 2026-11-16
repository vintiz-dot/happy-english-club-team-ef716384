// R18 inertness check for the batch's cross-area files (rendered on the admin's /teachers/:id, unlisted until R21).
// Run from the repo root: node docs/evidence/A4.6/R18/legacy-check.mjs [baseRef]
// For each file:
//   1. every string literal, and every static piece of every template literal, of the BASE version still exists
//      verbatim in the current file (so the `ivory ? NEW : OLD` legacy branch keeps each old class string);
//   2. the file imports useIvory and calls it;
//   3. every className changed since the base is an `ivory ?` ternary (no bare new class string slipped in).
import { execSync } from 'node:child_process'; import fs from 'node:fs';
const base = process.argv[2] || '6ffa1d32';
const FILES = ['src/pages/TeacherProfile.tsx', 'src/components/teacher/TeacherProfilePictureUpload.tsx'];
const literals = (src) => {
  const out = [];
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)) { const s = m[1] ?? m[2]; if (s) out.push(s); }
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) for (const piece of m[1].split(/\$\{[^}]*\}/)) { const t = piece.trim(); if (t) for (const line of t.split('\n')) { const l = line.trim(); if (l) out.push(l); } }
  return out;
};
let bad = 0, total = 0;
for (const f of FILES) {
  const old = execSync(`git show ${base}:${f}`, { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const now = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const diff = execSync(`git diff -U0 ${base} -- "${f}"`, { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).join('\n');
  const lits = literals(old); const remLits = literals(removed);
  let missing = 0;
  for (const s of lits) { total++; if (!now.includes(s)) { missing++; bad++; console.log('  MISSING', f, JSON.stringify(s)); } }
  const hook = /import \{ useIvory \} from "@\/hooks\/useIvory"/.test(now) && /const ivory = useIvory\(\)/.test(now);
  if (!hook) { bad++; console.log('  NO useIvory', f); }
  let bare = 0;
  for (const l of added) if (/className=/.test(l) && !/className=\{ivory \?/.test(l)) { bare++; bad++; console.log('  NOT BRANCHED', f, l.trim().slice(0, 140)); }
  console.log(`${missing || !hook || bare ? 'FAIL' : 'ok  '} ${f}: base literals ${lits.length} (on removed lines ${remLits.length}), missing ${missing}, useIvory ${hook}, unbranched classNames ${bare}`);
}
console.log(bad ? `FAIL: ${bad} problem(s)` : `OK: all ${total} base literals of ${FILES.length} cross-area files still present; every changed className branches on useIvory()`);
process.exit(bad ? 1 : 0);
