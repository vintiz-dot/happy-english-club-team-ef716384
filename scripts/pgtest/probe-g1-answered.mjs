// PROBE: what recordPayment() reports when the network drops (no reply).
import { build } from 'esbuild';
import { FunctionsClient } from '@supabase/functions-js';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out = await build({ entryPoints: ['src/lib/recordPayment.ts'], bundle: true, format: 'esm', platform: 'neutral', write: false });
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
console.log('409 reply   ->', JSON.stringify(await recordPayment({ functions: http }, args)));
console.log(r1.answered ? 'PROVED: a dropped connection is reported answered=true, so every screen makes a NEW key for the retry' : 'not reproduced');
