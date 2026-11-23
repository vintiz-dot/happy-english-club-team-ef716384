// src/lib/closedMonthChanges.ts: the rows of Finance > Tuition's "Closed months
// that price differently now". It arranges what calculate-tuition-bulk answers
// (the hold itself is held by register-holes.test.mjs); no pricing in it.
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 600)}` : ''}`);
  value ? pass++ : fail++;
};
const dir = mkdtempSync(join(tmpdir(), 'closed-month-changes-'));
const file = join(dir, 'lib.mjs');
writeFileSync(file, (await build({ entryPoints: [join(repo, 'src', 'lib', 'closedMonthChanges.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
const m = await import(pathToFileURL(file).href);

ok('months before: from the first bill to last month, oldest first, across a year end',
  m.monthsBefore('2025-11', '2026-02').join() === '2025-11,2025-12,2026-01');
ok('months before: nothing when the first month is the current one or later, or malformed',
  m.monthsBefore('2026-02', '2026-02').length === 0 && m.monthsBefore('2026-03', '2026-02').length === 0 && m.monthsBefore('x', '2026-02').length === 0);

const names = new Map([['a', 'An'], ['b', 'Binh']]);
const held = (saved, next) => ({ reason: 'past_month_changed', priced_as_charged: false, message: 'Held: ...',
  lessons: [], saved_base: saved[0], saved_discount: saved[1], saved_total: saved[2], register_base: next[0], register_discount: next[1], register_total: next[2] });
const results = [
  { studentId: 'a', baseAmount: 630000, totalDiscount: 0, totalAmount: 630000, payments: { monthPayments: 630000 }, held: held([630000, 0, 630000], [420000, 0, 420000]) },
  { studentId: 'b', baseAmount: 420000, totalDiscount: 0, totalAmount: 420000, payments: { monthPayments: 0 } },                       // not held
  { studentId: 'c', baseAmount: 100, totalDiscount: 0, totalAmount: 100, held: held([100, 0, 100], [300, 0, 300]) },                    // no name known
  { studentId: 'd', baseAmount: 420000, totalDiscount: 120000, totalAmount: 300000, keptAsCharged: true },                            // kept silently
  { studentId: 'e', error: true },
  { studentId: 'f', baseAmount: 1, totalAmount: 1, held: { reason: 'register_missing_marks', priced_as_charged: true, lessons: [] } }, // the old function's "saved, with a note"
];
const rows = m.heldRows(results, '2026-08', names);
ok('only the held bills become rows: not a plain, a kept, an errored or a priced-as-charged answer', rows.map((r) => r.studentId).join() === 'a,c', rows);
ok('a row carries the function\'s figures untouched, the payment and the difference',
  rows[0].savedTotal === 630000 && rows[0].newTotal === 420000 && rows[0].difference === -210000 && rows[0].paid === 630000 && rows[0].name === 'An' && rows[0].month === '2026-08', rows[0]);
ok('an unknown child is named as such, and a bill that would go up has a positive difference', rows[1].name === 'Unknown student' && rows[1].difference === 200, rows[1]);
ok('no answer at all gives no rows', m.heldRows(null, '2026-08', names).length === 0);

const sorted = m.sortHeldRows([
  { ...rows[0], month: '2026-08', difference: -10, name: 'B' },
  { ...rows[0], month: '2026-10', difference: 5, name: 'C' },
  { ...rows[0], month: '2026-08', difference: 300, name: 'A' },
  { ...rows[0], month: '2026-08', difference: -10, name: 'A' },
]);
ok('sorted: newest month first, then the largest difference either way, then the name',
  sorted.map((r) => `${r.month}:${r.difference}:${r.name}`).join() === '2026-10:5:C,2026-08:300:A,2026-08:-10:A,2026-08:-10:B', sorted.map((r) => `${r.month}:${r.difference}:${r.name}`));
const t = m.heldTotals(rows);
ok('totals: how much more and how much less approving everything would charge', t.bills === 2 && t.up === 200 && t.down === 210000, t);

const src = readFileSync(join(repo, 'src', 'components', 'admin', 'ClosedMonthChanges.tsx'), 'utf8');
ok('the panel finds held bills through calculate-tuition-bulk (which never saves) and changes one only with force + reason',
  /invoke\("calculate-tuition-bulk"/.test(src) && /force: true, reason: why/.test(src) && !/\.from\("invoices"\)\s*\.(update|upsert|insert|delete)/.test(src));
ok('it prices nothing itself', !/\* ?\(?[\w.]+ ?\/ ?100|session_rate_vnd/.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
