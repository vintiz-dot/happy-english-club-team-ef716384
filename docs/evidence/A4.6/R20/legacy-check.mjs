// R20 inertness check (source level) for every file of the batch. All ten render on routes that are not
// listed yet (staff /schedule, /families/:id, the leaderboards; /schedule for a family or a student; the
// unmounted migration overlay), so every class change must sit behind useIvory() with the old strings kept.
// Run from the repo root: node docs/evidence/A4.6/R20/legacy-check.mjs [baseRef]
// For each file:
//   1. every string literal, and every static piece of every template literal, of the BASE version still
//      exists verbatim in the current file (so each `ivory ? NEW : OLD` legacy branch keeps the old string);
//   2. the file imports useIvory and calls it;
//   3. no added line carries a bare className="..." that the base did not have (a new class string outside
//      an `ivory ?` branch).
import { execSync } from 'node:child_process'; import fs from 'node:fs';
const base = process.argv[2] || '059b66a3';
const FILES = [
  'src/components/calendar/AgendaView.tsx', 'src/components/calendar/CalendarFilters.tsx', 'src/components/calendar/MiniCalendar.tsx',
  'src/components/calendar/MonthView.tsx', 'src/components/calendar/TimeGridView.tsx', 'src/components/shared/ClassLeaderboardShared.tsx',
  'src/components/shared/PodiumBoard.tsx', 'src/components/student/StudentClassLeaderboard.tsx', 'src/pages/FamilyDetail.tsx',
  'src/components/migration/NewSiteMigrationOverlay.tsx',
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
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const oldLines = new Set(old.split('\n').map((l) => l.trim()));
  const lits = literals(old);
  let missing = 0;
  for (const s of lits) { total++; if (!now.includes(s)) { missing++; bad++; console.log('  MISSING', f, JSON.stringify(s)); } }
  const hook = /import \{ useIvory \} from "@\/hooks\/useIvory"/.test(now) && /useIvory\(\)/.test(now);
  if (!hook) { bad++; console.log('  NO useIvory', f); }
  let bare = 0;
  // A line passes when the base had it, when it branches on `ivory` itself (e.g. ring={ivory ? ...} next to an
  // unchanged className), or when it is the JSX of an `{ivory ? (` branch opened on the line before.
  added.forEach((l, i) => {
    const t = l.slice(1).trim(); const prev = i > 0 ? added[i - 1].slice(1).trim() : '';
    const sameClassAsBase = (() => { const m = t.match(/className="[^"]*"/); return m && old.includes(m[0]); })();
    if (/className="/.test(t) && !oldLines.has(t) && !sameClassAsBase && !/ivory \? \($/.test(prev)) { bare++; bad++; console.log('  NOT BRANCHED', f, t.slice(0, 140)); }
  });
  console.log(`${missing || !hook || bare ? 'FAIL' : 'ok  '} ${f}: base literals ${lits.length}, missing ${missing}, useIvory ${hook}, bare new className strings ${bare}`);
}
console.log(bad ? `FAIL: ${bad} problem(s)` : `OK: all ${total} base literals of ${FILES.length} files still present; every file calls useIvory(); no bare new className string`);
process.exit(bad ? 1 : 0);
