import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
globalThis.__paymentZod = z;
const studentId = '00000000-0000-0000-0000-000000000001';
const changes = [];
const rpcs = [];
const invoices = ['2026-07', '2026-08'].map(month => ({ id: month, month,
  student_id: studentId, total_amount: 100000, paid_amount: 900000,
  recorded_payment: 0, status: 'issued' }));
globalThis.__paymentClient = () => ({
  auth: { getUser: async () => ({ data: { user: { id: studentId } } }) },
  functions: { invoke: async () => ({ error: null }) },
  // Phase 1b: the payment is written by record_family_payment, in one transaction.
  rpc: async (name, args) => { rpcs.push({ name, args }); return { data: { success: true }, error: null }; },
  from(table) {
    let rows = table === 'invoices' ? invoices : table === 'ledger_accounts'
      ? ['AR', 'CASH', 'BANK'].map(code => ({ code, id: code })) : [{ role: 'admin' }];
    let update;
    const q = {
      select() { return q; }, order() { return q; },
      in(k, values) { rows = rows.filter(r => values.includes(r[k])); return q; },
      eq(k, value) { if (table !== 'user_roles' && table !== 'ledger_accounts') rows = rows.filter(r => r[k] === value); return q; },
      neq(k, value) { rows = rows.filter(r => r[k] !== value); return q; },
      single: async () => ({ data: rows[0] }),
      insert(value) { changes.push({ table, value }); return Promise.resolve({ error: null }); },
      upsert() { return Promise.resolve({ error: null }); },
      update(value) { update = value; return q; },
      then(done) { if (update) changes.push({ table, value: update, rows: rows.map(r => r.id) });
        return Promise.resolve({ data: rows, error: null }).then(done); },
    };
    return q;
  },
});
let handler;
globalThis.Deno = { serve: h => { handler = h; }, env: { get: () => 'test-only' } };
const bundled = await build({ entryPoints: [resolve('supabase/functions/family-payment/index.ts')],
  bundle: true, format: 'esm', platform: 'node', write: false,
  plugins: [{ name: 'test-boundaries', setup(b) {
    b.onResolve({ filter: /(^https?:\/\/|\/rate-limit\.ts$)/ }, args => ({ path: args.path, namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents:
      args.path.includes('supabase-js') ? 'export const createClient = globalThis.__paymentClient;' :
      args.path.includes('zod') ? 'export const z = globalThis.__paymentZod;' :
      'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};', loader: 'js' }));
  } }],
});
const file = join(mkdtempSync(join(tmpdir(), 'family-month-')), 'handler.mjs');
writeFileSync(file, bundled.outputFiles[0].text);
await import(pathToFileURL(file).href);
const body = { familyId: studentId, selectedStudentIds: [studentId], amount: 50000,
  method: 'Cash', occurredAt: '2026-07-25T12:00:00Z', allocationMode: 'oldest-first' };
async function call(payload) { return handler(new Request('http://localhost/payment', {
  method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(payload),
})); }
assert.equal((await call(body)).status, 400, 'missing tuition month rejected');
assert.equal(changes.length + rpcs.length, 0, 'missing month makes no financial writes');
assert.equal((await call({ ...body, month: '2026-08' })).status, 200);
assert.equal(rpcs.length, 1, 'one call to record_family_payment');
const rec = rpcs[0];
assert.equal(rec.name, 'record_family_payment');
assert.equal(rec.args.p_month, '2026-08', 'July receipt credited only to the August bill and ledger month');
assert.deepEqual(rec.args.p_allocations.map(a => [a.student_id, a.amount]), [[studentId, 50000]], 'the whole 50,000 on the child, once');
assert.equal(rec.args.p_amount, 50000);
assert.equal(changes.filter(c => ['payments', 'payment_allocations', 'ledger_entries', 'invoices'].includes(c.table)).length, 0,
  'no separate writes to payments, allocations, ledger or bills');
console.log('7 passed, 0 failed');