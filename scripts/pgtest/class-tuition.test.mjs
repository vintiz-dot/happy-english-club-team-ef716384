// The Class Finance report's tuition: calculate-tuition-bulk's `classNet`
// and the browser sums over it (src/lib/finance/classTuition.ts).
//
// What this guards: the report used to read invoices.class_breakdown, whose
// net leaves out the sibling and student discounts, so Net Tuition ran above
// what families were charged (9.5M in October 2026). Every case below ends
// with the same assertion - the classes add up to the charge, to the dong.
import assert from 'node:assert/strict';
import { build, transform } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'class-tuition-'));
async function loadTs(rel, name) {
  const out = join(dir, `${name}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(rel), 'utf8'), { loader: 'ts', format: 'esm' })).code);
  return import(pathToFileURL(out).href);
}

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); passed++; };
const sumNet = (lines) => lines.reduce((n, l) => n + l.net_vnd, 0);
const byId = (lines) => Object.fromEntries(lines.map((l) => [l.class_id, l]));

// ---- _lib/class-net.ts --------------------------------------------------
const { classNetAmounts } = await loadTs('supabase/functions/_lib/class-net.ts', 'class-net');

{
  // A 100k class discount on A, then a month-wide cut to 450k.
  const lines = classNetAmounts(new Map([['A', 300000], ['B', 300000]]), new Map([['A', 100000]]), 450000);
  eq(sumNet(lines), 450000, 'classes sum to the charge');
  const m = byId(lines);
  ok(m.A.net_vnd < m.B.net_vnd, 'the class discount stays on its own class');
  eq([m.A.gross_vnd, m.B.gross_vnd], [300000, 300000], 'gross is the base');
  eq(m.A.net_vnd, 180000, 'A carries 2/5 of the charge');
}
{
  // Thirds do not divide: leftovers go to the largest remainders, still exact.
  const lines = classNetAmounts(new Map([['A', 100000], ['B', 100000], ['C', 100000]]), new Map(), 100000);
  eq(sumNet(lines), 100000, 'rounded classes still sum exactly');
  eq(lines.map((l) => l.net_vnd).sort(), [33333, 33333, 33334], 'one leftover dong');
}
{
  // Every class discounted to nothing but something still charged: split by base.
  const lines = classNetAmounts(new Map([['A', 100000], ['B', 300000]]), new Map([['A', 100000], ['B', 300000]]), 40000);
  eq(byId(lines).B.net_vnd, 30000, 'falls back to the bases');
  eq(classNetAmounts(new Map([['A', 0]]), new Map(), 50000).map((l) => l.net_vnd), [0], 'no base, no share');
  eq(classNetAmounts(new Map(), new Map(), 50000), [], 'no class, nothing to place');
}

// ---- calculate-tuition-bulk, the real handler ----------------------------
let fixture;
let siblingStates = [];
globalThis.__tuitionClient = () => ({ from(table) {
  let rows = fixture[table] || [];
  rows.forEach((r, i) => { if (r.id == null) r.id = `${table}-${String(i).padStart(6, '0')}`; });
  let orderKey = null, lim = Infinity;
  const page = () => { const out = orderKey ? [...rows].sort((a, b) => (String(a[orderKey]) < String(b[orderKey]) ? -1 : String(a[orderKey]) > String(b[orderKey]) ? 1 : 0)) : rows; return out.slice(0, lim); };
  const q = {
    select() { return q; }, order(k) { orderKey = k; return q; }, limit(n) { lim = n; return q; },
    gt(k, v) { rows = rows.filter(r => String(r[k]) > String(v)); return q; },
    eq(k, v) { rows = rows.filter(r => r[k] === v); return q; },
    neq(k, v) { rows = rows.filter(r => r[k] !== v); return q; },
    in(k, vs) { rows = rows.filter(r => vs.includes(r[k])); return q; },
    gte(k, v) { rows = rows.filter(r => r[k] >= v); return q; },
    lt(k, v) { rows = rows.filter(r => r[k] < v); return q; },
    lte(k, v) { rows = rows.filter(r => r[k] <= v); return q; },
    or() { return q; },
    single() { return Promise.resolve({ data: rows[0], error: null }); },
    maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }); },
    upsert() { return Promise.resolve({ error: null }); },
    then(done) { return Promise.resolve({ data: page(), error: null }).then(done); },
  };
  return q;
} });
globalThis.__siblingStates = () => siblingStates;
let handler;
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: h => { handler = h; } };
{
  const bundle = await build({
    entryPoints: [resolve('supabase/functions/calculate-tuition-bulk/index.ts')], bundle: true,
    format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'test-boundaries', setup(b) {
      b.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/clock\.ts$|\/rate-limit\.ts$)/ }, args => ({ path: args.path, namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'js', contents:
        args.path.includes('supabase-js') ? 'export const createClient = globalThis.__tuitionClient;' :
        args.path.includes('zod') ? 'const chain = new Proxy({}, {get: (_, key) => key === "parse" ? v => v : () => chain}); export const z = chain;' :
        args.path.endsWith('/auth.ts') ? 'export const requireRole = async () => ({isServiceRole: false, roles: new Set(["admin"])}); export const callerOwnsStudent = async () => true;' :
        args.path.endsWith('/clock.ts') ? 'export const clockNow = () => new Date(globalThis.__hecNow ?? "2000-01-01T00:00:00Z");' :
        args.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = async () => globalThis.__siblingStates();' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};'
      }));
    } }],
  });
  const file = join(dir, 'calculate-tuition-bulk.mjs');
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
}

const kid = 'student-1';
const classA = { id: 'class-a', name: 'A', session_rate_vnd: 100000 };
const classB = { id: 'class-b', name: 'B', session_rate_vnd: 150000 };
function register() {
  const enrol = (cls, extra = {}) => ({ student_id: kid, class_id: cls.id, start_date: '2026-09-01', end_date: null,
    allowed_days: null, discount_type: null, discount_value: null, discount_cadence: null, rate_override_vnd: null, ...extra });
  fixture = {
    students: [{ id: kid, family_id: 'fam-1', families: { id: 'fam-1', sibling_percent_override: null } }], classes: [classA, classB], invoices: [],
    enrollments: [enrol(classA, { discount_type: 'percent', discount_value: 10, discount_cadence: 'monthly' }), enrol(classB)],
    sessions: [
      ...['2026-11-03', '2026-11-10', '2026-11-17'].map((date, i) => ({ id: `a${i}`, date, class_id: classA.id, status: 'Held', classes: classA })),
      ...['2026-11-05', '2026-11-12'].map((date, i) => ({ id: `b${i}`, date, class_id: classB.id, status: 'Held', classes: classB })),
    ],
    discount_assignments: [{ student_id: kid, effective_from: '2026-01-01', discount_definitions: { is_active: true, type: 'percent', value: 5 } }],
    referral_bonuses: [{ student_id: kid, effective_from: '2026-01-01', type: 'amount', value: 20000 }],
  };
  fixture.attendance = fixture.sessions.map(s => ({ session_id: s.id, student_id: kid, status: 'Present' }));
  siblingStates = [{ family_id: 'fam-1', status: 'assigned', winner_student_id: kid, winner_class_id: classB.id, sibling_percent: 10 }];
}
async function bulk() {
  const response = await handler(new Request('http://localhost/tuition', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' },
    body: JSON.stringify({ month: '2026-11', studentIds: [kid] }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.results[0];
}

{
  register();
  const r = await bulk();
  // Base 300k + 300k, priced by _lib/tuition-pricing.ts (the owner's order, 23 Nov
  // 2026: the school gives away the least). 10% enrollment on A = 30k, leaving 570k;
  // the 20k referral (fixed amounts first) leaves 550k; 5% student on what is left =
  // 27.5k, leaving 522.5k; 10% sibling on B's share of that (522.5k x 300/570 = 275k)
  // = 27.5k. Discounts 105k, charge 495k. (Every percentage on the gross base, as
  // before the rule, gave 110k and 490k.)
  eq([r.baseAmount, r.totalDiscount, r.totalAmount], [600000, 105000, 495000], 'the function prices by the shared rules');
  ok(Array.isArray(r.classNet) && r.classNet.length === 2, 'classNet sent, one line per class');
  eq(sumNet(r.classNet), r.totalAmount, 'classNet sums to the charge, sibling and student discounts included');
  const m = byId(r.classNet);
  eq([m['class-a'].gross_vnd, m['class-b'].gross_vnd], [300000, 300000], 'gross per class is its base');
  // Weights: A 270k (less its 30k enrollment discount), B 272.5k (less its 27.5k
  // sibling discount), so the 495k splits 246,359 / 248,641.
  eq([m['class-a'].net_vnd, m['class-b'].net_vnd], [246359, 248641], 'month-wide discounts spread by what each class still costs');
  eq([r.projected.totalAmount, r.actual.totalAmount], [495000, 495000], 'projected (whole month) and actual (lessons held) are both sent; every lesson here was held');
  // The stored breakdown's old net would have said 270k + 300k = 570k.
  ok(r.breakdown.classes.every((c) => c.net_amount_vnd === undefined), 'breakdown.classes is unchanged for its other readers');
}
{
  // A frozen bill splits its saved total along its saved breakdown.
  register();
  fixture.invoices.push({ student_id: kid, month: '2026-11', tuition_frozen: true, recorded_payment: 0,
    base_amount: 500000, discount_amount: 100000, total_amount: 400000,
    class_breakdown: [{ class_id: 'class-a', amount_vnd: 200000, net_amount_vnd: 200000 },
      { class_id: 'class-b', amount_vnd: 300000, net_amount_vnd: 200000 }] });
  const r = await bulk();
  eq(r.totalAmount, 400000, 'frozen charge stands');
  eq(sumNet(r.classNet), 400000, 'frozen classNet sums to the saved charge');
  eq(byId(r.classNet)['class-b'].gross_vnd, 300000, 'frozen gross is the saved one');
  eq(byId(r.classNet)['class-a'].net_vnd, 200000, 'frozen split follows the saved per-class net');
}

// ---- src/lib/finance/classTuition.ts --------------------------------------
const { tuitionByClass } = await loadTs('src/lib/finance/classTuition.ts', 'class-tuition');
const line = (class_id, gross_vnd, net_vnd) => ({ class_id, gross_vnd, net_vnd });
const enrolled = new Map([['s1', ['A', 'B']], ['s2', ['A']], ['s3', ['C']]]);
{
  const split = tuitionByClass([
    { studentId: 's1', totalAmount: 450000, classNet: [line('A', 300000, 200000), line('B', 300000, 250000)] },
    { studentId: 's2', totalAmount: 100000, classNet: [line('A', 100000, 100000)], siblingUnresolved: true },
    { studentId: 's3', totalAmount: 0, classNet: [line('C', 0, 0)] },
  ], ['s1', 's2', 's3'], enrolled);
  eq(split.byClass.get('A'), { gross: 400000, net: 300000, students: 2 }, 'a class sums its students');
  eq(split.byClass.get('C'), undefined, 'a student billed nothing is not counted');
  eq([split.provisional, split.unattributed, split.unanswered], [1, 0, []], 'provisional named, nothing missing');
}
{
  // s2 errored: A (theirs) is unknown, B still known; nobody silently left out.
  const split = tuitionByClass([
    { studentId: 's1', totalAmount: 450000, classNet: [line('A', 300000, 200000), line('B', 300000, 250000)] },
    { studentId: 's2', error: true },
    { studentId: 's3', totalAmount: 0, classNet: [] },
  ], ['s1', 's2', 's3'], enrolled);
  ok(split.unknownClasses.has('A') && !split.byClass.has('A'), 'an unanswered student makes their class unknown');
  eq(split.byClass.get('B'), { gross: 300000, net: 250000, students: 1 }, 'other classes stand');
  eq(split.unanswered, ['s2'], 'the unanswered student is named');
}
{
  // A function older than classNet: every class it touched is unknown, never the stored net.
  const split = tuitionByClass([{ studentId: 's1', totalAmount: 450000 }], ['s1'], enrolled);
  ok(split.unknownClasses.has('A') && split.unknownClasses.has('B'), 'no classNet reads as unknown');
  ok(tuitionByClass(null, ['s1'], enrolled) === null, 'no answer at all is null');
  ok(tuitionByClass([], ['zz'], enrolled).allUnknown, 'an unanswered student with no known class makes everything unknown');
}
{
  // A frozen bill without a breakdown: its charge is named, not lost.
  const split = tuitionByClass([{ studentId: 's1', totalAmount: 300000, classNet: [] }], ['s1'], enrolled);
  eq(split.unattributed, 300000, 'charge no class carries is reported');
}

console.log(`${passed} passed, 0 failed`);
