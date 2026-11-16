// R23: second pass of domcmp - the saved <main> HTML with React's generated ids (useId ":rN:", used by Radix for
// aria-controls / id pairs) renamed in order of first appearance, then compared byte for byte. Anything else must be equal.
//   node domnorm.mjs <domDir> <labelBefore> <labelAfter>
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [dir, lb, la] = process.argv.slice(2);
const norm = (s) => { const m = new Map(); return s.replace(/:r[0-9a-z]+:/g, (x) => { if (!m.has(x)) m.set(x, `:id${m.size}:`); return m.get(x); }); };
let bad = 0, n = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.startsWith(la + '-')).sort()) {
  const g = path.join(dir, lb + f.slice(la.length)); n++;
  const a = fs.readFileSync(path.join(dir, f), 'utf8'), b = fs.readFileSync(g, 'utf8');
  const raw = a === b, eq = norm(a) === norm(b);
  if (!eq) bad++;
  console.log(`${f.slice(la.length + 1)}: raw ${raw ? 'identical' : 'differs'}; ids renamed ${eq ? 'IDENTICAL' : 'DIFF'} (${crypto.createHash('sha256').update(norm(a)).digest('hex').slice(0, 16)}, ${a.length} chars)`);
}
console.log(`TOTAL ${n}, ${bad} differ after renaming generated ids`);
