// R22: every className string of the base file is still present verbatim in the useIvory() files (the legacy side).
//   node docs/evidence/A4.6/R22/legacy-check.mjs <baseCommit>
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || '946eb6d1';
const files = ['src/pages/NotFound.tsx', 'src/pages/OAuthConsent.tsx', 'src/pages/Index.tsx', 'src/components/ProfilePicker.tsx', 'src/components/ProfileSwitcher.tsx'];
let ok = 0, bad = 0;
for (const f of files) {
  const old = execSync(`git show ${base}:${f}`, { encoding: 'utf8' });
  const now = fs.readFileSync(f, 'utf8');
  const strs = [...old.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
  for (const s of strs) { if (now.includes(`"${s}"`)) ok++; else { bad++; console.log('MISSING', f, s); } }
  if (!/useIvory\(\)/.test(now)) { bad++; console.log('NO useIvory()', f); }
}
console.log(bad ? 'FAIL' : 'OK', `${ok}/${ok + bad}`);
