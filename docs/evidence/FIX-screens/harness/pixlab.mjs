// node pixlab.mjs <outDir> <labelA> <labelB> [re]  : pixels differing (any channel delta > 16, and > 0) for every <labelA>-*.png that has a <labelB> twin
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const [out, LA, LB, re] = process.argv.slice(2);
const files = fs.readdirSync(out).filter((f) => f.startsWith(LA + '-') && f.endsWith('.png') && (!re || new RegExp(re).test(f))).sort();
const br = await chromium.launch({ channel: 'chrome' });
const p = await br.newPage();
let zero = 0, nonzero = 0; const rows = [];
for (const fa of files) {
  const fb = LB + fa.slice(LA.length);
  if (!fs.existsSync(path.join(out, fb))) { rows.push(`${fa}: no ${LB} twin`); continue; }
  const r = await p.evaluate(async ([x, y]) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    let any = 0, big = 0;
    for (let j = 0; j < da.length; j += 4) { const d = Math.max(Math.abs(da[j] - db[j]), Math.abs(da[j + 1] - db[j + 1]), Math.abs(da[j + 2] - db[j + 2])); if (d > 0) any++; if (d > 16) big++; }
    return { any, big, total: da.length / 4 };
  }, [fa, fb].map((f) => 'data:image/png;base64,' + fs.readFileSync(path.join(out, f)).toString('base64')));
  if (r.any === 0) zero++; else nonzero++;
  rows.push(`${fa.slice(LA.length + 1)}: ${r.size ? 'SIZE ' + r.size : `${r.any} px differ (${r.big} > 16) of ${r.total}`}`);
}
await br.close();
console.log(rows.join('\n'));
console.log(`${LA} vs ${LB}: ${zero} pairs pixel-identical, ${nonzero} differ`);
