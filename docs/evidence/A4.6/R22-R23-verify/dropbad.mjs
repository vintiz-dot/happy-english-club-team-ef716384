// node dropbad.mjs <results.json>: removes runs that show the app's offline screen (host network drop), so --resume redoes them.
import fs from 'node:fs';
const f = process.argv[2]; const R = JSON.parse(fs.readFileSync(f, 'utf8'));
const bad = Object.keys(R.runs).filter((k) => { const p = R.runs[k].probe || {}; return (p.smallTargets || []).some((s) => /"Retry"/.test(s)) || !p.path; });
for (const k of bad) delete R.runs[k];
fs.writeFileSync(f, JSON.stringify(R, null, 1));
console.log(f, 'dropped', bad.length, bad.join(' '));
