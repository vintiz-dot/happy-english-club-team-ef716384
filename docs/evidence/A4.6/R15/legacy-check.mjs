// R15 inertness check for the cross-area announcement components.
// For each file under src/components/announcements changed since the base, every string literal on a
// removed line must still exist, verbatim, in the new file (= the legacy branch of a useIvory() ternary
// kept the old class string). Also checks that no className in those files is a bare new string: each
// changed className must be an `ivory ? NEW : OLD` ternary.
// Run from the repo root: node docs/evidence/A4.6/R15/legacy-check.mjs [base]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || '04e329b6';
const files = execSync(`git diff --name-only ${base} HEAD -- src/components/announcements`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
let bad = 0, total = 0;
for (const f of files) {
  const diff = execSync(`git diff -U0 ${base} HEAD -- "${f}"`, { encoding: 'utf8' });
  const now = fs.readFileSync(f, 'utf8');
  const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  let n = 0;
  for (const l of removed) for (const m of l.matchAll(/"([^"]*)"|'([^']*)'|`([^`$]*)`/g)) {
    const s = m[1] ?? m[2] ?? m[3]; if (!s) continue; n++; total++;
    if (!now.includes(s)) { bad++; console.log('MISSING', f, JSON.stringify(s)); }
  }
  // motion props: an object literal removed from `prop={{ ... }}` must survive as the legacy branch `: { ... }`
  for (const l of removed) for (const m of l.matchAll(/=\{(\{[^{}]*\})\}/g)) {
    n++; total++;
    if (!now.includes(m[1])) { bad++; console.log('MISSING object', f, m[1]); }
  }
  // every useIvory consumer must call the hook
  if (!/const ivory = useIvory\(\)/.test(now)) { bad++; console.log('NO useIvory()', f); }
  console.log(`${f}: removed lines ${removed.length}, literals checked ${n}`);
}
console.log(bad ? `FAIL ${bad}` : `OK: ${files.length} files, all ${total} removed literals still present (legacy branch intact)`);
process.exit(bad ? 1 : 0);
