// node diffimg2.mjs <a.png> <b.png> <out.png> : grey copy of A with every pixel whose channel delta > 16 painted magenta
import { chromium } from 'playwright'; import fs from 'node:fs';
const [a, b, out] = process.argv.slice(2);
const br = await chromium.launch({ channel: 'chrome' }); const p = await br.newPage();
const url = await p.evaluate(async ([x, y]) => {
  const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
  const [ia, ib] = await Promise.all([load(x), load(y)]);
  const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
  g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height);
  g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data; const d = da.data;
  for (let j = 0; j < d.length; j += 4) { const m = Math.max(Math.abs(d[j] - db[j]), Math.abs(d[j + 1] - db[j + 1]), Math.abs(d[j + 2] - db[j + 2])); if (m > 16) { d[j] = 255; d[j + 1] = 0; d[j + 2] = 255; } else { d[j] = d[j] * 0.3 + 178; d[j + 1] = d[j + 1] * 0.3 + 178; d[j + 2] = d[j + 2] * 0.3 + 178; } }
  g.putImageData(da, 0, 0); return c.toDataURL('image/png');
}, [a, b].map((f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')));
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); await br.close();
