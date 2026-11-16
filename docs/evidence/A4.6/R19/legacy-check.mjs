// R19 inertness check, source side. Run from the repo root: node docs/evidence/A4.6/R19/legacy-check.mjs [base]
// For every file of the batch that renders (all its class changes sit behind useIvory()):
//   1. every string literal, and every static piece of every template literal, of the BASE version of the
//      file still exists verbatim in the current file (the legacy branch keeps each old class string);
//   2. every motion object removed from a `prop={{ ... }}` survives verbatim (the legacy branch of a ternary);
//   3. the file imports useIvory and calls it.
import { execSync } from 'node:child_process'; import fs from 'node:fs';
const base = process.argv[2] || '0abba34b';
const FILES = [
  'src/components/classroom-tools/ClassroomToolsLauncher.tsx', 'src/components/classroom-tools/AttendanceTool.tsx',
  'src/components/classroom-tools/BackgroundMusic.tsx', 'src/components/classroom-tools/WheelSpinner.tsx',
  'src/components/classroom-tools/TeamMaker.tsx', 'src/components/classroom-tools/studio/ClassScreen.tsx',
  'src/components/classroom-tools/studio/StudioKit.tsx', 'src/components/CommandPalette.tsx', 'src/components/AdminTopBar.tsx',
  'src/components/chat/AssistantChat.tsx', 'src/components/NotificationBell.tsx', 'src/components/PWAInstallButton.tsx',
];
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
  const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  const lits = literals(old); const remLits = literals(removed.join('\n'));
  let missing = 0;
  for (const s of lits) { total++; if (!now.includes(s)) { missing++; bad++; console.log('  MISSING', f, JSON.stringify(s)); } }
  let objs = 0;
  for (const l of removed) for (const m of l.matchAll(/=\{(\{[^{}]*\})\}/g)) { objs++; total++; if (!now.includes(m[1])) { bad++; console.log('  MISSING object', f, m[1]); } }
  const hook = /import \{ useIvory \} from "@\/hooks\/useIvory"/.test(now) && /= useIvory\(\)/.test(now);
  if (!hook) { bad++; console.log('  NO useIvory', f); }
  console.log(`${missing || !hook ? 'FAIL' : 'ok  '} ${f}: base literals ${lits.length} (on removed lines ${remLits.length}), motion objects removed ${objs}, missing ${missing}, useIvory ${hook}`);
}
console.log(bad ? `FAIL: ${bad} problem(s)` : `OK: all ${total} base literals / objects of ${FILES.length} files still present; every file branches on useIvory()`);
process.exit(bad ? 1 : 0);
