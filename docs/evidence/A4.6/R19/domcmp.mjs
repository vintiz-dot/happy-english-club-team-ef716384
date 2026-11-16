// node domcmp.mjs <outDir> <labelA> <labelB> [--filter=re]  : compare the normalised outerHTML captured per run (r.dom.*)
// Radix popper position variables (sub-pixel layout numbers) are blanked. For the tools sheet, a tool that is
// still a Deferred placeholder (not yet scrolled near) in one run and mounted in the other is reported as
// "mount timing" per tool; every tool mounted in BOTH runs must be byte-identical.
import fs from 'node:fs'; import path from 'node:path';
const [out, LA, LB] = process.argv.slice(2);
const filt = (process.argv.find((a) => a.startsWith('--filter=')) || '').slice(9);
const A = JSON.parse(fs.readFileSync(path.join(out, `${LA}-results.json`), 'utf8')).runs;
const B = JSON.parse(fs.readFileSync(path.join(out, `${LB}-results.json`), 'utf8')).runs;
const norm = (h) => h.replace(/--radix-popper-[a-z-]+: [^;"]+;?/g, '');
const blocks = (h) => { const parts = h.split('<div data-tool="'); return { head: parts[0], tools: Object.fromEntries(parts.slice(1).map((p) => [p.slice(0, p.indexOf('"')), p])) }; };
const placeholder = (b) => /^[a-z]+" class="[^"]*"><div aria-hidden="true" class="[^"]*animate-pulse/.test(b);
let same = 0, diff = 0, missing = 0, timing = 0;
for (const k of Object.keys(A).sort()) {
  if (filt && !new RegExp(filt).test(k)) continue;
  for (const part of Object.keys(A[k].dom || {})) {
    let a = A[k].dom[part], b = B[k]?.dom?.[part];
    const id = `${k} ${part}`;
    if (a == null || b == null) { missing++; console.log(id, 'MISSING', a == null ? 'A' : '', b == null ? 'B' : ''); continue; }
    a = norm(a); b = norm(b);
    if (a === b) { same++; console.log(id, `identical (${a.length} chars)`); continue; }
    if (part === 'sheet') {
      const ba = blocks(a), bb = blocks(b); const notes = []; let bad = ba.head !== bb.head;
      for (const t of new Set([...Object.keys(ba.tools), ...Object.keys(bb.tools)])) {
        const x = ba.tools[t], y = bb.tools[t]; if (x === y) continue;
        if (x && y && (placeholder(x) !== placeholder(y))) notes.push(`${t}: mounted in ${placeholder(x) ? LB : LA} only`);
        else { bad = true; notes.push(`${t}: DIFFERS`); }
      }
      if (!bad) { timing++; console.log(id, 'identical except mount timing ->', notes.join('; ')); continue; }
      diff++; console.log(id, 'DIFF', ba.head !== bb.head ? '(header)' : '', notes.join('; ')); continue;
    }
    diff++; let i = 0; while (a[i] === b[i]) i++; console.log(id, 'DIFF at', i, '\n  A:', a.slice(Math.max(0, i - 100), i + 100), '\n  B:', b.slice(Math.max(0, i - 100), i + 100));
  }
}
console.log(`${LA} vs ${LB}: ${same} identical, ${timing} identical except a Deferred tool's mount timing, ${diff} differ, ${missing} missing`);
