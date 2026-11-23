// src/lib/sincePaidLine.ts: the one sentence that says what a month's payment
// paid for. It words calculate-tuition's `sincePaid` (priced by
// _lib/tuition-pricing.ts explainPayment, tuition-pricing.test.mjs); it prices nothing.
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
const dir = mkdtempSync(join(tmpdir(), 'since-paid-line-'));
const file = join(dir, 'lib.mjs');
writeFileSync(file, (await build({ entryPoints: [join(repo, 'src', 'lib', 'sincePaidLine.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
const { sincePaidLine } = await import(pathToFileURL(file).href);
const sp = (o) => ({ kind: 'exact', paid: 0, payable: 0, difference: 0, carryCounted: true, lessons: [], ...o });

ok('nothing paid, no answer, or paid exactly what is asked: no sentence',
  sincePaidLine(null) === null && sincePaidLine(sp({ kind: 'none' })) === null && sincePaidLine(sp({ kind: 'exact', paid: 1470000, payable: 1470000 })) === null);

const nov = sincePaidLine(sp({ kind: 'explained', paid: 1470000, payable: 1260000, difference: 210000, lessons: [{ date: '2026-11-24', state: 'cancelled', price_vnd: 210000 }] }));
ok('the November case, in English', nov?.tone === 'credit'
  && nov.en === 'You paid 1.470.000 ₫. Since then 1 lesson is no longer billed: 24 Nov (cancelled). The amount due for this month is now 1.260.000 ₫, and 210.000 ₫ is credit for next month.', nov?.en);
ok('and in Vietnamese', nov?.vi === 'Quý phụ huynh đã thanh toán 1.470.000 ₫. Sau đó có 1 buổi không còn tính phí: 24/11 (lớp nghỉ). Số tiền cần thanh toán tháng này còn 1.260.000 ₫; 210.000 ₫ được chuyển sang tháng sau.', nov?.vi);

const two = sincePaidLine(sp({ kind: 'explained', paid: 1260000, payable: 840000, difference: 420000,
  lessons: [{ date: '2026-11-05', state: 'excused' }, { date: '2026-11-24', state: 'cancelled' }] }));
ok('two lessons, one excused: both named with why', /2 lessons are no longer billed: 5 Nov \(excused\), 24 Nov \(cancelled\)\./.test(two?.en ?? '') && /5\/11 \(nghỉ có phép\), 24\/11 \(lớp nghỉ\)/.test(two?.vi ?? ''), two);

const oct = sincePaidLine(sp({ kind: 'exact', paid: 1470000, payable: 1260000, difference: 210000, carryCounted: false }));
ok('the October case: the month paid in full while credit was carried in', oct?.tone === 'credit'
  && oct.en === "You paid this month's lessons in full (1.470.000 ₫). The 210.000 ₫ of credit you already had moves to next month.", oct?.en);

const over = sincePaidLine(sp({ kind: 'over', paid: 1500000, payable: 1260000, difference: 240000 }));
ok('more paid than asked and no lesson explains it: said plainly, toned "check"', over?.tone === 'check'
  && /^You paid 1\.500\.000 ₫; the amount due for this month is 1\.260\.000 ₫\. The extra 240\.000 ₫ is credit for next month\. It does not come from a cancelled or excused lesson\.$/.test(over.en), over?.en);

const under = sincePaidLine(sp({ kind: 'under', paid: 1000000, payable: 1470000, difference: -470000 }));
ok('less paid than asked', under?.tone === 'owed' && under.en === 'You paid 1.000.000 ₫ of 1.470.000 ₫. 470.000 ₫ is still to pay.', under?.en);

const owing = sincePaidLine(sp({ kind: 'explained', paid: 1470000, payable: 1560000, difference: -90000, lessons: [{ date: '2026-11-24', state: 'cancelled' }] }));
ok('explained but still short (a balance was brought in): says what is still to pay', owing?.tone === 'owed' && /90\.000 ₫ is still to pay\.$/.test(owing.en), owing?.en);

const src = readFileSync(join(repo, 'src', 'lib', 'sincePaidLine.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
ok('it prices nothing: no multiplication or percentage of an amount', !/price_vnd\s*[*\/]|[*\/]\s*100\b/.test(src));
ok('every amount goes through the one formatter', /from "\.\/money"/.test(src) && !/toLocaleString/.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
