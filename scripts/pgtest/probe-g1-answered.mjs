// PROBE (review of G1, B-2): what recordPayment() reports when the network
// drops (no reply). From the independent review of 1549ec07, where it printed
// `answered: true` for a dropped connection - so every screen made a NEW key
// for the retry and could pay twice. Kept as the review wrote it (bundle the
// real src/lib/recordPayment.ts, run it with the real FunctionsClient), with
// its print turned into assertions so run.mjs holds the fix: a drop is NOT
// answered (the screen keeps the key), a 409 reply is.
// record-payment.test.mjs section 15 drives the same rule end to end.
import { build } from 'esbuild';
import { FunctionsClient } from '@supabase/functions-js';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => { console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${value ? '' : `  -- ${JSON.stringify(extra)}`}`); value ? pass++ : fail++; };
const out = await build({ entryPoints: [resolve(repo, 'src/lib/recordPayment.ts')], bundle: true, format: 'esm', platform: 'neutral', write: false });
const p = resolve(tmpdir(), `probe-rp-${process.pid}.mjs`); writeFileSync(p, out.outputFiles[0].text);
const { recordPayment } = await import(pathToFileURL(p).href);
const args = { studentId: 'x', month: '2026-11', kind: 'payment', amount: 1, method: 'Cash', occurredAt: '2026-11-17', idempotencyKey: 'k' };
// 1. Network failure: the request may have reached the server, the reply never arrives.
let served = 0;
const dropped = new FunctionsClient('https://example.invalid/functions/v1', { customFetch: async () => { served++; throw new TypeError('Failed to fetch'); } });
const r1 = await recordPayment({ functions: dropped }, args);
console.log('network drop ->', JSON.stringify(r1));
// 2. A 409 reply for comparison.
const http = new FunctionsClient('https://example.invalid/functions/v1', { customFetch: async () => new Response(JSON.stringify({ error: 'dup', duplicate: true }), { status: 409, headers: { 'Content-Type': 'application/json' } }) });
const r2 = await recordPayment({ functions: http }, args);
console.log('409 reply   ->', JSON.stringify(r2));
ok('a dropped connection is NOT answered (the screen keeps the key, so the retry cannot pay twice)', served === 1 && r1.ok === false && r1.answered === false, r1);
ok('a 409 duplicate reply from record-payment is answered, and flagged duplicate', r2.ok === false && r2.answered === true && r2.duplicate === true, r2);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
