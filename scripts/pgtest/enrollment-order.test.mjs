// Two enrollments of one student in one class that cover the same dates.
//
// Both tuition calculators bill a lesson under "the first enrollment that
// matches". calculate-tuition reads the rows with no ORDER BY;
// calculate-tuition-bulk pages them by id. So the row that priced a lesson
// was whichever the database happened to hand over first - and the two
// functions could disagree about it.
//
// The rule now, in both, by one helper (_lib/enrollment-discounts.ts): the
// enrollment CREATED FIRST wins (created_at, then id).
//
// This runs the REAL handlers. Each fixture is seeded four ways - the ids
// agreeing and disagreeing with the creation order, and the unordered read
// handing the rows over oldest first and newest first - and every figure must
// come out the same in all four, in both functions.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const STUDENT = '00000000-0000-0000-0000-000000000001';
const CLASS = '00000000-0000-0000-0000-0000000000c1';
const MONTH = '2025-11';
const RATE = 100000;
const LOW_ID = '11111111-0000-0000-0000-000000000000';
const HIGH_ID = 'eeeeeeee-0000-0000-0000-000000000000';

let fixture;
let writes;
// PostgREST as these functions use it. A read with no order() returns the
// rows as they lie in the array - the "heap order" a test can choose.
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
    upsert(row) { writes.push(row); return Promise.resolve({ error: null }); },
    then(done) { return Promise.resolve({ data: page(), error: null }).then(done); },
  };
  return q;
} });

const dir = mkdtempSync(join(tmpdir(), 'tuition-order-'));
const handlers = {};
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: h => { handlers.current = h; } };
for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) {
  const bundle = await build({
    entryPoints: [resolve(`supabase/functions/${name}/index.ts`)], bundle: true,
    format: 'esm', platform: 'node', write: false, logLevel: 'silent',
    plugins: [{ name: 'test-boundaries', setup(b) {
      b.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/rate-limit\.ts$)/ }, args => ({ path: args.path, namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'js', contents:
        args.path.includes('supabase-js') ? 'export const createClient = globalThis.__tuitionClient;' :
        args.path.includes('zod') ? 'const chain = new Proxy({}, {get: (_, key) => key === "parse" ? v => v : () => chain}); export const z = chain;' :
        args.path.endsWith('/auth.ts') ? 'export const requireRole = async () => ({isServiceRole: false, roles: new Set(["admin"])}); export const callerOwnsStudent = async () => true;' :
        args.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = async () => { throw new Error("Unexpected family calculation"); };' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};'
      }));
    } }],
  });
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  handlers[name] = handlers.current;
}

// Wednesdays and Fridays of November 2025, all held and attended.
const DATES = ['2025-11-05', '2025-11-07', '2025-11-12', '2025-11-14', '2025-11-19', '2025-11-21', '2025-11-26', '2025-11-28'];

// `first` was created first and runs to 14 Nov; `second` was created later and
// starts 8 Nov: seven days (8-14 Nov) belong to both, with lessons on 12 and 14.
function seed(first, second, { idsFollowCreation, oldestFirstInHeap, createdAt }) {
  const classes = { id: CLASS, name: 'Test class', session_rate_vnd: RATE };
  const base = { student_id: STUDENT, class_id: CLASS, discount_type: null, discount_value: null,
    discount_cadence: null, rate_override_vnd: null, allowed_days: null };
  const a = { ...base, ...first, id: idsFollowCreation ? LOW_ID : HIGH_ID,
    created_at: createdAt?.[0] ?? '2025-09-01T03:00:00+00:00', start_date: '2025-09-01', end_date: '2025-11-14' };
  const b = { ...base, ...second, id: idsFollowCreation ? HIGH_ID : LOW_ID,
    created_at: createdAt?.[1] ?? '2025-11-08T03:00:00+00:00', start_date: '2025-11-08', end_date: null };
  const sessions = DATES.map((date, i) => ({ id: `s${i}`, date, class_id: CLASS, status: 'Held', classes }));
  fixture = {
    students: [{ id: STUDENT, family_id: null }], classes: [classes], invoices: [],
    enrollments: oldestFirstInHeap ? [a, b] : [b, a],
    sessions,
    attendance: sessions.map(s => ({ session_id: s.id, student_id: STUDENT, status: 'Present' })),
  };
  writes = [];
}

async function run(name) {
  const response = await handlers[name](new Request('http://localhost/tuition', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' },
    body: JSON.stringify({ month: MONTH, studentId: STUDENT, studentIds: [STUDENT] }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const r = name.endsWith('-bulk') ? body.results[0] : body;
  assert.ok(r && !r.error, `${name} answered`);
  return { baseAmount: r.baseAmount, totalDiscount: r.totalDiscount, totalAmount: r.totalAmount,
    payable: r.carry.payable, carryOutDebt: r.carry.carryOutDebt, carryOutCredit: r.carry.carryOutCredit,
    classes: r.breakdown.classes.map(c => [c.class_id, c.amount_vnd]) };
}

let passed = 0;
const SEEDINGS = [
  { idsFollowCreation: true, oldestFirstInHeap: true },
  { idsFollowCreation: true, oldestFirstInHeap: false },
  { idsFollowCreation: false, oldestFirstInHeap: true },
  { idsFollowCreation: false, oldestFirstInHeap: false },
];

async function scenario(label, first, second, expected, extra = {}) {
  const want = { ...expected, totalAmount: expected.baseAmount - expected.totalDiscount,
    payable: expected.baseAmount - expected.totalDiscount, carryOutDebt: expected.baseAmount - expected.totalDiscount,
    carryOutCredit: 0, classes: [[CLASS, expected.baseAmount]] };
  for (const seeding of SEEDINGS) {
    const how = `${label} [ids ${seeding.idsFollowCreation ? 'follow' : 'reverse'} creation, unordered read ${seeding.oldestFirstInHeap ? 'oldest' : 'newest'} first]`;
    seed(first, second, { ...seeding, ...extra });
    const bulk = await run('calculate-tuition-bulk');
    assert.equal(writes.length, 0, `${how}: bulk writes nothing`);
    const single = await run('calculate-tuition');
    assert.deepEqual(bulk, single, `${how}: bulk and per-student agree on every figure`); passed++;
    assert.deepEqual(bulk, want, `${how}: bulk gives the first-created row's figures`); passed++;
    assert.deepEqual(single, want, `${how}: per-student gives the first-created row's figures`); passed++;
    const saved = writes.at(-1);
    assert.deepEqual([saved.base_amount, saved.discount_amount, saved.total_amount],
      [want.baseAmount, want.totalDiscount, want.totalAmount], `${how}: the saved bill carries the same figures`); passed++;
  }
}

// (a) Identical terms - the pair found live (same override, days and discount).
// 8 lessons: 800,000 at the class rate; override 80,000 saves 160,000; 5% of 800,000 = 40,000.
const same = { rate_override_vnd: 80000, allowed_days: [3, 5], discount_type: 'percent', discount_value: 5, discount_cadence: 'monthly' };
await scenario('identical terms', same, same, { baseAmount: 800000, totalDiscount: 200000 });

// (b) Different rates. The row created first (80,000) prices the lessons of 5, 7, 12 and 14 Nov:
// 4 x 20,000. The later row (60,000) prices only 19-28 Nov: 4 x 40,000. Total saving 240,000.
// Had the later row taken the two shared lessons it would be 280,000.
await scenario('different rates', { rate_override_vnd: 80000 }, { rate_override_vnd: 60000 },
  { baseAmount: 800000, totalDiscount: 240000 });

// (c) Different days and discount. First row: Wednesdays only, 10% -> 5 and 12 Nov, 200,000, 20,000 off.
// Later row: Wed + Fri, 20% -> 19, 21, 26, 28 Nov, 400,000, 80,000 off. Friday 14 Nov is covered by
// the first row, which does not attend Fridays: not billed. Had the later row taken it, base 700,000.
await scenario('different days and discount',
  { allowed_days: [3], discount_type: 'percent', discount_value: 10, discount_cadence: 'monthly' },
  { allowed_days: [3, 5], discount_type: 'percent', discount_value: 20, discount_cadence: 'monthly' },
  { baseAmount: 600000, totalDiscount: 100000 });

// Created in the same millisecond: the microseconds Postgres keeps still say which was first.
await scenario('created microseconds apart', { rate_override_vnd: 80000 }, { rate_override_vnd: 60000 },
  { baseAmount: 800000, totalDiscount: 240000 },
  { createdAt: ['2025-11-08T03:00:00.123456+00:00', '2025-11-08T03:00:00.123457+00:00'] });

// Created at the very same instant (one transaction): the lower id wins, in both functions,
// however the rows are handed over. Here "first" is whichever row holds LOW_ID.
for (const seeding of SEEDINGS) {
  const how = `same created_at [${JSON.stringify(seeding)}]`;
  seed({ rate_override_vnd: 80000 }, { rate_override_vnd: 60000 },
    { ...seeding, createdAt: ['2025-11-08T03:00:00+00:00', '2025-11-08T03:00:00+00:00'] });
  const bulk = await run('calculate-tuition-bulk');
  const single = await run('calculate-tuition');
  assert.deepEqual(bulk, single, `${how}: bulk and per-student agree`); passed++;
  // LOW_ID on the 80,000 row -> 240,000 saved; on the 60,000 row -> 280,000.
  assert.equal(bulk.totalDiscount, seeding.idsFollowCreation ? 240000 : 280000, `${how}: the lower id prices the shared lessons`); passed++;
}

// A row with no created_at (never the case in the table: NOT NULL) sorts after one that has it.
seed({ rate_override_vnd: 80000 }, { rate_override_vnd: 60000 }, { idsFollowCreation: false, oldestFirstInHeap: false });
fixture.enrollments.find(e => e.rate_override_vnd === 60000).created_at = null;
{
  const bulk = await run('calculate-tuition-bulk');
  const single = await run('calculate-tuition');
  assert.deepEqual(bulk, single, 'missing created_at: bulk and per-student agree'); passed++;
  assert.equal(bulk.totalDiscount, 240000, 'missing created_at: the dated row is first'); passed++;
}

console.log(`${passed} passed, 0 failed`);
