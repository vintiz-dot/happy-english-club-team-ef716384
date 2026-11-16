// R23 domcmp: compare the <main> outerHTML hashes (animations frozen) of two --dom runs, plus their requests and numbers.
//   node domcmp.mjs <before-results.json> <after-results.json>
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).runs, A = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).runs;
const ms = (x) => JSON.stringify(x ?? null);
let bad = 0; const out = [];
for (const k of Object.keys(A).sort()) {
  const a = A[k], b = B[k];
  if (!b) { out.push(`${k}: no before`); bad++; continue; }
  const dom = a.dom && b.dom && a.dom.sha256 === b.dom.sha256 && a.dom.len > 200;
  const req = ms(a.requests?.kinds) === ms(b.requests?.kinds);
  const num = ms(a.probe?.numbers) === ms(b.probe?.numbers);
  if (!dom || !req || !num) bad++;
  out.push(`${k}: <main> ${dom ? 'IDENTICAL' : 'DIFF'} (sha ${a.dom?.sha256?.slice(0, 16)} vs ${b.dom?.sha256?.slice(0, 16)}, ${a.dom?.len} vs ${b.dom?.len} chars, mains ${a.dom?.mains}) | requests ${req ? 'same' : 'DIFF'} (${a.requests?.count}) | numbers ${num ? 'same' : 'DIFF'} (${a.probe?.numbers?.length}) | html attr ${b.probe?.htmlAttr} -> ${a.probe?.htmlAttr}`);
}
out.push(`TOTAL ${Object.keys(A).length} runs, ${bad} with a difference`);
console.log(out.join('\n'));
