// Voluntary contributions and Settle Bill are removed (owner, D-23,
// 2026-11-16: "remove voluntary contributions entirely. remove settle bill
// also entirely."). docs/evidence/REMOVE-voluntary-and-settle.md.
//
// What this suite holds:
//   1. settle-bill is a stub: every request after the CORS preflight is 410
//      { error: "Settle bill has been removed" }, and it touches nothing -
//      no client, no environment, no network, not even the request body.
//   2. Nothing left in the app or the functions can CREATE a voluntary
//      contribution or a settlement (a read-only grep over the source).
//   3. The assumption behind removing the calculators' write-off reader
//      (removed since, FOLLOWUPS-writeoff-payroll): zero
//      'settlement-writeoff-' rows. The preflight
//      scripts/CHECK-writeoff-reader-removal.sql counts them (run here on a
//      copy of the two tables, empty and with one such row), and the golden
//      tuition figures contain no write-off at all. Nothing reads
//      settlements any more.
//
// The payment paths themselves (the old option refused with 400, a leftover
// kept as unapplied cash) run on the real handlers in invoice-status.test.mjs,
// section "D-23".
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const cache = new Map();
const read = (rel) => { if (!cache.has(rel)) cache.set(rel, readFileSync(join(repo, rel), 'utf8')); return cache.get(rel); };

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};

// ------------------------------------------------------------ 1. the stub
console.log('\nsettle-bill is a 410 stub that touches nothing');
{
  const stubPath = 'supabase/functions/settle-bill/index.ts';
  const stub = read(stubPath);
  const code = stub.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok('it imports nothing (no client, no _lib, no schema library)', !/^\s*import\b/m.test(code) && !/\bfrom\s+['"]/.test(code));
  ok('it reads no environment, makes no client and no request of its own',
     !/Deno\.env|createClient|\bfetch\(|\.from\(|functions\.invoke|\.json\(\)|\.text\(\)|\.formData\(/.test(code));

  // Run it: Deno.serve captured, and every way out of the handler a trap.
  const touched = [];
  const trap = (what) => () => { touched.push(what); throw new Error(`settle-bill stub touched ${what}`); };
  let handler = null;
  globalThis.Deno = { env: { get: trap('Deno.env') }, serve: (h) => { handler = h; } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = trap('fetch');
  const out = mkdtempSync(join(tmpdir(), 'removed-settle-'));
  const bundle = await build({ entryPoints: [join(repo, stubPath)], bundle: true, format: 'esm', platform: 'node', write: false });
  const file = join(out, 'settle-bill.mjs');
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  ok('it registers a handler', typeof handler === 'function');

  const pre = await handler(new Request('http://localhost/settle-bill', { method: 'OPTIONS' }));
  ok('the CORS preflight is answered as before (200, the same headers)',
     pre.status === 200 && pre.headers.get('Access-Control-Allow-Origin') === '*'
       && /authorization/.test(pre.headers.get('Access-Control-Allow-Headers') || ''));

  const requests = [
    ['a write-off as the old dialog sent it', { settlementType: 'discount', studentId: '11111111-1111-4111-8111-111111111111', month: '2026-10', amount: 400000, reason: 'hardship' }],
    ['a voluntary contribution with consent', { settlementType: 'voluntary_contribution', studentId: '11111111-1111-4111-8111-111111111111', month: '2026-10', amount: 250000, reason: 'x', consentGiven: true, approverName: 'x' }],
    ['unapplied cash', { settlementType: 'unapplied_cash', studentId: '11111111-1111-4111-8111-111111111111', month: '2026-10', amount: 1, reason: 'x' }],
    ['an empty body', null],
  ];
  for (const [label, body] of requests) {
    const req = new Request('http://localhost/settle-bill', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' },
      body: body === null ? undefined : JSON.stringify(body),
    });
    const res = await handler(req);
    const text = await res.text();
    ok(`${label}: 410 {"error":"Settle bill has been removed"}, JSON, CORS kept, body never read`,
       res.status === 410 && text === JSON.stringify({ error: 'Settle bill has been removed' })
         && res.headers.get('Content-Type') === 'application/json' && res.headers.get('Access-Control-Allow-Origin') === '*'
         && req.bodyUsed === false, { status: res.status, text });
  }
  const bad = new Request('http://localhost/settle-bill', { method: 'POST', body: '{not json' });
  const r1 = await handler(bad);
  ok('a malformed body and no Authorization: still 410 (nothing is parsed or checked, so nothing can fail differently)', r1.status === 410);
  const r2 = await handler(new Request('http://localhost/settle-bill', { method: 'GET' }));
  ok('any other method: 410', r2.status === 410);
  ok('across all of it: no environment read, no network call', touched.length === 0, touched);
  globalThis.fetch = realFetch;
  ok('supabase/config.toml still declares it, verify_jwt = true (the gateway answers a call with no token 401 before the stub)',
     /\[functions\.settle-bill\]\s*\r?\nverify_jwt = true/.test(read('supabase/config.toml')));
}

// --------------------------------------------- 2. nothing can create them
console.log('\nNothing in the app or the functions can create a voluntary contribution or a settlement');
{
  const walk = (dir, exts) => {
    const outFiles = [];
    for (const name of readdirSync(join(repo, dir))) {
      const rel = `${dir}/${name}`;
      const st = statSync(join(repo, rel));
      if (st.isDirectory()) outFiles.push(...walk(rel, exts));
      else if (exts.some((e) => name.endsWith(e))) outFiles.push(rel);
    }
    return outFiles;
  };
  const app = walk('src', ['.ts', '.tsx']).filter((f) => f !== 'src/integrations/supabase/types.ts');
  const fns = walk('supabase/functions', ['.ts']);
  const all = [...app, ...fns];
  const hits = (re, files = all) => files.filter((f) => re.test(read(f)));
  ok(`the source was read (${app.length} app files, ${fns.length} function files)`, app.length > 500 && fns.length > 50);

  ok('no file writes the settlements table (insert / upsert / update after from("settlements"))',
     hits(/from\(\s*['"]settlements['"]\s*\)[\s\S]{0,300}?\.(insert|upsert|update)\(/).length === 0,
     hits(/from\(\s*['"]settlements['"]\s*\)[\s\S]{0,300}?\.(insert|upsert|update)\(/));
  ok('  and no file reads it either: the calculators\' write-off reader is removed',
     hits(/['"]settlements['"]/).length === 0, hits(/['"]settlements['"]/));
  ok('no file posts a ledger key for a contribution or a settlement (tx_key `...contribution...` / `settlement-...`)',
     hits(/tx_key:\s*`[^`]*(contribution|settlement-)/).length === 0, hits(/tx_key:\s*`[^`]*(contribution|settlement-)/));
  ok('  and nothing names WRITE_OFF_KEY_PREFIX, WRITE_OFF_NAME or settledWriteOff any more (key, reader and line all gone)',
     hits(/WRITE_OFF_KEY_PREFIX|WRITE_OFF_NAME|settledWriteOff/).length === 0, hits(/WRITE_OFF_KEY_PREFIX|WRITE_OFF_NAME|settledWriteOff/));
  ok('no ledger leg is posted to REVENUE by a payment function (the contribution legs were the only ones)',
     hits(/accountMap\.get\(\s*['"]REVENUE['"]\s*\)/, fns).length === 0, hits(/accountMap\.get\(\s*['"]REVENUE['"]\s*\)/, fns));
  ok('no screen calls settle-bill', hits(/invoke\(\s*['"`]settle-bill/, app).length === 0, hits(/invoke\(\s*['"`]settle-bill/, app));
  ok('the Settle Bill dialog and the Voluntary Contribution Repair tool are gone, and nothing imports them',
     !existsSync(join(repo, 'src/components/admin/SettleBillModal.tsx')) && !existsSync(join(repo, 'src/components/admin/VoluntaryContributionRepair.tsx'))
       && hits(/SettleBillModal|VoluntaryContributionRepair/, app).length === 0, hits(/SettleBillModal|VoluntaryContributionRepair/, app));
  ok('no screen sends or offers the voluntary option or its consent (only history screens name it)',
     JSON.stringify(hits(/voluntary_contribution/, app)) === JSON.stringify(['src/components/admin/FamilyPaymentActivityLog.tsx'])
       && hits(/consentGiven/, app).length === 0, { voluntary: hits(/voluntary_contribution/, app), consent: hits(/consentGiven/, app) });
  ok('  the activity log shows a past one as history: "Voluntary contribution (no longer offered)"',
     /"Voluntary contribution \(no longer offered\)"/.test(read('src/components/admin/FamilyPaymentActivityLog.tsx')));
  ok('  the ledger inspector lists past ones and has no control that deletes them',
     /Voluntary contributions \(no longer offered\)/.test(read('src/components/admin/LedgerBalanceInspector.tsx'))
       && !/handleReverseContribution|reversingContribution/.test(read('src/components/admin/LedgerBalanceInspector.tsx')));
  ok('  the Automation tab offers no repair card for them', !/Voluntary/i.test(read('src/components/admin/tabs/AutomationTab.tsx')));
  // OVERPAYMENT (owner's decision, after D-23): a leftover now goes on a
  // bill as credit instead of unapplied cash; the screens say so.
  ok('the three family payment screens say what happens to a leftover: credit on the child\'s next bill, no choice offered',
     ['FamilyPaymentModal.tsx', 'SmartFamilyPaymentModal.tsx', 'BatchFamilyPaymentModal.tsx'].every((f) => {
       const t = read(`src/components/admin/${f}`);
       return /The extra \{[^}]+\} (₫ )?will show as credit on/.test(t) && /next bill\./.test(t)
         && /"credit_next_bill"/.test(t) && !/unapplied_cash/.test(t) && !/RadioGroupItem value="(unapplied_cash|credit_next_bill)"/.test(t);
     }));

  for (const f of ['family-payment', 'smart-family-payment']) {
    const t = read(`supabase/functions/${f}/index.ts`);
    const refuse = t.indexOf("body?.leftoverHandling === 'voluntary_contribution'");
    const firstWrite = Math.min(...['.insert(', '.upsert(', '.update(', 'addToRecordedPayment('].map((w) => t.indexOf(w)).filter((i) => i >= 0));
    ok(`${f}: the leftover options are 'credit_next_bill' (and 'unapplied_cash', refused when there is a leftover); voluntary is refused (400) before the first write`,
       /leftoverHandling: z\.enum\(\['credit_next_bill', 'unapplied_cash'\]\)\.optional\(\)/.test(t) && refuse > 0 && refuse < firstWrite
         && /status: 400/.test(t.slice(refuse, refuse + 400)) && !/consentGiven/.test(t));
    const stale = t.indexOf("leftoverHandling === 'unapplied_cash'");
    ok(`  ${f}: a leftover sent as 'unapplied_cash' (a screen from before) is refused (400) before the first write, and no unapplied-cash pair is posted any more`,
       stale > 0 && stale < firstWrite && /UNAPPLIED_REPLACED/.test(t.slice(stale, stale + 200))
         && !/family-credit-/.test(t) && !/accountMap\.get\(\s*['"]CREDIT['"]\s*\)/.test(t));
  }
  ok('delete-payment still recognises the contribution keys, so a payment made before the removal is deleted whole',
     /own\('family-contribution'\)/.test(read('supabase/functions/delete-payment/index.ts'))
       && /own\('smart-family-contribution'\)/.test(read('supabase/functions/delete-payment/index.ts')));

  const sqlFiles = [...walk('supabase/migrations', ['.sql']), ...walk('docs/sql', ['.sql'])];
  ok(`no SQL (${sqlFiles.length} migration / installed-function files) inserts into settlements`,
     sqlFiles.every((f) => !/insert\s+into\s+(public\.)?settlements\b/i.test(read(f))), sqlFiles.filter((f) => /insert\s+into\s+(public\.)?settlements\b/i.test(read(f))));
  ok('  and the settlements CHECK constraint is not changed by any migration after the one that made it (the past rows stay valid)',
     sqlFiles.filter((f) => /settlement_type/.test(read(f))).join() === 'supabase/migrations/20251024050029_0843ed71-7091-484b-93eb-e79cdc95e119.sql',
     sqlFiles.filter((f) => /settlement_type/.test(read(f))));
}

// ------------------------------- 3. zero write-offs is the assumption
console.log('\nThe write-off reader can go only while live holds no settlement-writeoff- row');
{
  const sql = read('scripts/CHECK-writeoff-reader-removal.sql');
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').replace(/'[^']*'/g, "''");
  ok('the preflight is SELECT statements only',
     !/\b(insert|update|delete|alter|drop|create|truncate|grant|revoke|call|do)\b/i.test(code)
       && code.split(';').filter((x) => x.trim()).every((x) => /^\s*select\b/i.test(x)));
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public.ledger_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid, tx_key text, debit integer DEFAULT 0, credit integer DEFAULT 0, month text);
    CREATE TABLE public.settlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, month text, settlement_type text, amount integer, tx_id uuid);
  `);
  const preflight = async () => {
    const res = await db.exec(sql);
    const rows = res.filter((r) => r.rows?.length).map((r) => r.rows[0]);
    return { legs: Number(rows[0]?.writeoff_ledger_legs), counted: Number(rows[1]?.counted_writeoffs), amount: Number(rows[1]?.counted_amount) };
  };
  // The SHAPE of live as the conductor read it (counts only): 2 'discount'
  // settlements keyed settlement-discount- (the old, ledger-only kind), 2
  // voluntary contributions, no settlement-writeoff- key. Amounts synthetic.
  await db.exec(`
    INSERT INTO public.settlements (settlement_type, amount, tx_id) VALUES
      ('discount', 100000, '00000000-0000-4000-8000-000000000001'), ('discount', 100000, '00000000-0000-4000-8000-000000000002'),
      ('voluntary_contribution', 10000, '00000000-0000-4000-8000-000000000003'), ('voluntary_contribution', 10000, '00000000-0000-4000-8000-000000000004');
    INSERT INTO public.ledger_entries (tx_id, tx_key, debit) VALUES
      ('00000000-0000-4000-8000-000000000001', 'settlement-discount-a', 100000), ('00000000-0000-4000-8000-000000000002', 'settlement-discount-b', 100000),
      ('00000000-0000-4000-8000-000000000003', 'settlement-contribution-c', 10000), ('00000000-0000-4000-8000-000000000004', 'settlement-contribution-d', 10000);
  `);
  let p = await preflight();
  ok('the shape of live (2 old-kind discounts, 2 contributions, no write-off key): 0 legs, 0 counted - the reader counts nothing',
     p.legs === 0 && p.counted === 0 && p.amount === 0, p);
  await db.exec(`INSERT INTO public.ledger_entries (tx_id, tx_key, debit) VALUES ('00000000-0000-4000-8000-000000000001', 'settlement-writeoff-x', 100000);`);
  p = await preflight();
  ok('  and it does see one: a write-off key on a discount settlement reads 1 leg, 1 counted, its amount', p.legs === 1 && p.counted === 1 && p.amount === 100000, p);

  const golden = read('scripts/pgtest/fixtures/tuition-figures.golden.json');
  ok('the golden tuition figures hold no write-off: no "Settle Bill write-off" line, no settlement-writeoff- key, no settlement discount',
     golden.length > 1000 && !/Settle Bill write-off|settlement-writeoff|isSettlement/.test(golden));
  ok('the reader is gone from both invoice-status copies (no settledWriteOff / WRITE_OFF_*), and the preflight still counts the key it used, settlement-writeoff-',
     ['supabase/functions/_lib/invoice-status.ts', 'src/lib/invoiceStatus.ts'].every((f) => !/settledWriteOff|WRITE_OFF_KEY_PREFIX|WRITE_OFF_NAME/.test(read(f)))
       && /LIKE 'settlement-writeoff-%'/.test(sql));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
