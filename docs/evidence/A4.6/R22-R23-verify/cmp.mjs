// node cmp.mjs <before-results.json> <after-results.json> [w320-results.json]
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).runs;
const A = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).runs;
const W = process.argv[4] && fs.existsSync(process.argv[4]) ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')).runs : {};
const j = (x) => JSON.stringify(x);
// the checkout path appears in Vite /@fs/ asset URLs (avatars): two trees, two paths - normalised before comparing
const fsn = (s) => (s || '').replace(/\/@fs\/[^"]*?\/src\//g, '/@fs/REPO/src/');
const lines = [];
const out = (s) => { lines.push(s); };
let reqSame = 0, numSame = 0, n = 0;
out('## Before (conductor 2e88891a) vs after (parent-release)');
for (const k of Object.keys(A).sort()) {
  const a = A[k], b = B[k]; if (!b) { out(`${k}: no before run`); continue; } n++;
  const rq = j(a.requests.kinds) === j(b.requests.kinds); if (rq) reqSame++;
  const nm = j(a.probe.numbers) === j(b.probe.numbers) && j(a.probe.dialogNumbers) === j(b.probe.dialogNumbers); if (nm) numSame++;
  const notes = [];
  if (!rq) notes.push('REQUESTS differ: ' + j(Object.fromEntries(Object.keys({ ...a.requests.kinds, ...b.requests.kinds }).filter((x) => a.requests.kinds[x] !== b.requests.kinds[x]).map((x) => [x, [b.requests.kinds[x] || 0, a.requests.kinds[x] || 0]]))));
  if (!nm) { const d = (x, y) => { const m = new Map(); for (const v of x) m.set(v, (m.get(v) || 0) + 1); for (const v of y) m.set(v, (m.get(v) || 0) - 1); return [...m].filter(([, c]) => c).map(([v, c]) => `${v}:${c > 0 ? '-' : '+'}${Math.abs(c)}`); }; notes.push('NUMBERS differ (main ' + j(d(b.probe.numbers, a.probe.numbers)) + ', dialogs ' + j(d(b.probe.dialogNumbers, a.probe.dialogNumbers)) + ')'); }
  if (a.domRaw !== undefined) notes.push(`dom raw ${fsn(a.domRaw) === fsn(b.domRaw) ? 'IDENTICAL' : 'DIFFERS'} (${b.domRawHash} / ${a.domRawHash}), normalised ${fsn(a.domNorm) === fsn(b.domNorm) ? 'IDENTICAL' : 'DIFFERS'}, html attr ${b.domAttr}/${a.domAttr}`);
  notes.push(`attr ${b.probe.htmlAttr}->${a.probe.htmlAttr}`);
  if ((a.errors || []).length || a.actionError) notes.push('ERR ' + j(a.errors) + ' ' + (a.actionError || ''));
  out(`${k}: req ${rq ? 'same' : 'DIFF'}, numbers ${nm ? 'same' : 'DIFF'}; ${notes.join('; ')}`);
}
out(`\nrequests identical ${reqSame}/${n}, numbers identical ${numSame}/${n}`);
out('\n## Money (every element showing an amount with ₫), after');
for (const k of Object.keys(A).sort()) { const m = A[k].probe.money; if (!m.length) continue; const bad = m.filter((x) => x.serif || !x.tab || x.brass || !x.ink); out(`${k}: ${m.length} amounts, off-rule ${bad.length}${bad.length ? ' ' + j(bad) : ''} | ${m.map((x) => x.t + (x.nowrap ? '' : ' [wraps]')).join(' | ')}`); }
out('\n## Money, before (for reference)');
for (const k of Object.keys(B).sort()) { const m = B[k].probe.money; if (!m.length) continue; out(`${k}: ${m.map((x) => x.t).join(' | ')}`); }
const ax = (R, title) => {
  out(`\n## axe critical/serious, ${title}`);
  for (const k of Object.keys(R).sort()) { const r = R[k].axe; if (!r) continue; const cs = r.rules; if (!cs.length) continue; out(`${k}: ` + cs.map((x) => `${x.impact} ${x.id} x${x.n} (in main ${x.inMain}) @ ${x.t.join(' ; ')}`).join(' || ')); }
};
ax(A, 'after'); ax(B, 'before'); ax(W, 'after 320');
const geo = (R, title) => {
  out(`\n## overflow / off-screen / long name / small targets, ${title}`);
  for (const k of Object.keys(R).sort()) { const p = R[k].probe; out(`${k}: overflow ${p.overflow} (${p.scrollW}/${p.clientW}), offscreen ${p.offscreenCount}${p.offscreenCount ? ' ' + j(p.offscreen.slice(0, 3)) : ''}, long name ${p.longName.shown} shown / ${p.longName.clipped.length} clipped${p.longName.clipped.length ? ' ' + j(p.longName.clipped) : ''}, lines ${j(p.longName.lines)}, small ${p.smallTargets.length}${p.smallTargets.length ? ' ' + j(p.smallTargets.slice(0, 4)) : ''}`); }
};
geo(A, 'after'); geo(W, 'after 320');
console.log(lines.join('\n'));
