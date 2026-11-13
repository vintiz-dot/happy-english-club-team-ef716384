// R17 inertness check for the files that render outside the teacher area.
//  1. journal/JournalList.tsx (student + teacher + admin) and exam-reports/StudentExamReportsTab.tsx (student
//     dashboard only) must be byte-identical to the base: the student area is live, and R08 already owns
//     JournalList's ivory branch.
//  2. exam-reports/ExamReportsManager.tsx and ExamReportEditor.tsx (teacher AND admin routes): every string
//     literal and every JSX text on a line removed since the base must still exist verbatim in the new file
//     (the legacy side of an `ivory ? NEW : OLD` choice), and the file must call useIvory().
// Run from the repo root: node docs/evidence/A4.6/R17/legacy-check.mjs [base]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || '72e3372b';
let bad = 0, total = 0;
for (const f of ['src/components/journal/JournalList.tsx', 'src/components/exam-reports/StudentExamReportsTab.tsx']) {
  const old = execSync(`git show ${base}:${f}`, { encoding: 'utf8' });
  const now = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const same = old.replace(/\r\n/g, '\n') === now;
  if (!same) bad++;
  console.log(`${f}: ${same ? 'byte-identical to base' : 'CHANGED'}`);
}
for (const f of ['src/components/exam-reports/ExamReportsManager.tsx', 'src/components/exam-reports/ExamReportEditor.tsx']) {
  const diff = execSync(`git diff -U0 ${base} HEAD -- "${f}"`, { encoding: 'utf8' });
  const now = fs.readFileSync(f, 'utf8');
  const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  let n = 0;
  for (const l of removed) {
    for (const m of l.matchAll(/"([^"]*)"|'([^']*)'|`([^`$]*)`/g)) {
      const s = m[1] ?? m[2] ?? m[3]; if (!s) continue; n++; total++;
      if (!now.includes(s)) { bad++; console.log('MISSING literal', f, JSON.stringify(s)); }
    }
    for (const m of l.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
      const s = m[1].trim(); if (!s) continue; n++; total++;
      if (!now.includes(`"${s}"`) && !now.includes(`>${m[1]}<`)) { bad++; console.log('MISSING text', f, JSON.stringify(s)); }
    }
  }
  if (!/const ivory = useIvory\(\)/.test(now)) { bad++; console.log('NO useIvory()', f); }
  console.log(`${f}: removed lines ${removed.length}, literals/texts checked ${n}`);
}
console.log(bad ? `FAIL ${bad}` : `OK: 2 files unchanged; 2 files keep all ${total} removed literals and texts (legacy branch intact)`);
process.exit(bad ? 1 : 0);
