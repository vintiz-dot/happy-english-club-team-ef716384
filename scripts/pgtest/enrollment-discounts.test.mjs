// Runs both real tuition handlers with a dated register, without touching live data.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const studentId = '00000000-0000-0000-0000-000000000001';
const classId = 'class-a';
let fixture;
let writes;
globalThis.__tuitionClient = () => ({ from(table) {
  let rows = fixture[table] || [];
  // PostgREST rows always carry their id; calculate-tuition-bulk pages by it.
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
const dir = mkdtempSync(join(tmpdir(), 'tuition-discounts-'));
const handlers = {};
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: h => { handlers.current = h; } };
for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) {
  const bundle = await build({
    entryPoints: [resolve(`supabase/functions/${name}/index.ts`)], bundle: true,
    format: 'esm', platform: 'node', write: false,
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

function register(type = 'percent', cadence = 'monthly', value = 10) {
  const terms = { student_id: studentId, class_id: classId, discount_type: type,
    discount_value: value, discount_cadence: cadence, rate_override_vnd: null };
  const classes = { id: classId, name: 'Test class', session_rate_vnd: 100000 };
  fixture = {
    students: [{ id: studentId, family_id: null }], classes: [classes], invoices: [],
    enrollments: [
      { ...terms, start_date: '2026-09-01', end_date: '2026-10-15', allowed_days: [3, 5] },
      { ...terms, start_date: '2026-10-16', end_date: null, allowed_days: [3] },
    ],
    sessions: ['2026-09-02', '2026-10-07', '2026-10-09', '2026-10-21', '2026-10-23', '2026-11-04', '2026-11-06']
      .map((date, i) => ({ id: `s${i}`, date, class_id: classId, status: 'Held', classes })),
  };
  fixture.attendance = fixture.sessions.map(s => ({ session_id: s.id, student_id: studentId, status: 'Present' }));
  writes = [];
}

let passed = 0;
async function check(month, base, discount) {
  for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) {
    const response = await handlers[name](new Request('http://localhost/tuition', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' },
      body: JSON.stringify({ month, studentId, studentIds: [studentId] }),
    }));
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    const result = name.endsWith('-bulk') ? body.results[0] : body;
    assert.equal(result.baseAmount, base, `${name} ${month} base`);
    assert.equal(result.totalDiscount, discount, `${name} ${month} discount`);
    assert.equal(result.totalAmount, base - discount, `${name} ${month} charged`);
    if (!name.endsWith('-bulk') && !fixture.invoices.length) {
      assert.equal(body.breakdown.classes.reduce((sum, c) => sum + c.net_amount_vnd, 0), base - discount, 'class net matches discount');
      assert.equal(writes.at(-1).discount_amount, discount, 'saved invoice matches response');
    }
    passed++;
  }
}

// Before, across, and after a weekday split: 10% remains 10%, never 20%.
register();
await check('2026-09', 100000, 10000);
await check('2026-10', 300000, 30000);
await check('2026-11', 100000, 10000);
// A copied fixed allowance is granted once, including legacy "once" terms.
for (const cadence of ['monthly', 'once']) {
  register('amount', cadence, 20000);
  await check('2026-10', 300000, 20000);
  await check('2026-11', 100000, 20000);
}
// If terms really differ, each percentage uses only its own dated lessons.
register(); fixture.enrollments[1].discount_value = 20;
await check('2026-10', 300000, 40000);
register(); fixture.enrollments[1].discount_type = null;
await check('2026-11', 100000, 0);
// An unrelated class is a separate discount, not deduplicated with this one.
register('amount', 'monthly', 20000);
fixture.enrollments.push({ ...fixture.enrollments[1], class_id: 'class-b' });
fixture.classes.push({ ...fixture.classes[0], id: 'class-b' });
fixture.sessions.push({ ...fixture.sessions[5], id: 'extra', class_id: 'class-b' });
fixture.attendance.push({ session_id: 'extra', student_id: studentId, status: 'Present' });
await check('2026-11', 200000, 40000);
// Frozen charged figures survive the corrected live calculation.
register(); fixture.invoices.push({ student_id: studentId, month: '2026-10', tuition_frozen: true,
  base_amount: 900000, discount_amount: 90000, total_amount: 810000, recorded_payment: 0 });
await check('2026-10', 900000, 90000);
console.log(`${passed} passed, 0 failed`);