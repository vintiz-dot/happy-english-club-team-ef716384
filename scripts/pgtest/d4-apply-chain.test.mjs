// D4 apply chain: steps 2 (20261114092000), 3A (093000) and 3B (094000) on top
// of 1a + 1b as live (docs/evidence/D4-2-3A-3B-live-apply-brief.md).
//
// Each migration's preflight pins the CR-stripped md5 of the bodies it relies
// on. This suite proves, on the real files, that:
//   - the planned order 2 -> 3A -> 3B pastes, and before each paste every
//     file still to come finds its pins as it expects them;
//   - each step pastes ALONE on 1a + 1b (one may be held back), and every
//     other order pastes too (a held-back step can follow later);
//   - each file pastes a second time after all three (idempotent);
//   - CRLF pastes are the same bodies (1a was pasted with CRLF live);
//   - after all three, the D4 fingerprint is exactly the expected JSON;
//   - the rollback chain 5, 4, 3 returns to 1b (the 1b fingerprint as live,
//     fixtures/d4-1b-live-fingerprint.*, apart from the two 1b bodies that 3A / 3B replaced and their
//     rollbacks leave, by design); re-pasting 20261114091000 then gives 1b
//     exactly; the three steps paste again after that; and rollbacks 2, 1
//     plus D2 give the D release 66 of 66.
//
// Every scenario runs in its own child process (one pglite per process: a
// second one in the same process runs out of wasm memory).
//
//   node scripts/pgtest/d4-apply-chain.test.mjs            all scenarios
//   node scripts/pgtest/d4-apply-chain.test.mjs --scenario plan
import { PGlite } from '@electric-sql/pglite';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { D4_BUILD, statementOf, sortKeys } from './guard-fingerprint.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const { prelude, baseline, mig } = D4_BUILD;
const F1A = '20261114090000_d4_floors.sql';
const F1B = '20261114091000_d4_core_register.sql';
const STEP = {
  '2': '20261114092000_d4_class_fee_history.sql',
  '3A': '20261114093000_d4_lesson_pay_guard.sql',
  '3B': '20261114094000_d4_money_inputs_guard.sql',
};
const ROLLBACK = {
  '3B': 'scripts/ROLLBACK-d4-5-money-inputs.sql',
  '3A': 'scripts/ROLLBACK-d4-4-lesson-pay.sql',
  '2': 'scripts/ROLLBACK-d4-3-class-fee.sql',
  '1b': 'scripts/ROLLBACK-d4-2-register.sql',
  '1a': 'scripts/ROLLBACK-d4-1-floors.sql',
};
const D2 = '20261112091000_session_cancel_guard.sql';
// 1b as live: the D4 fingerprint files at b27bbf06, the commit 1b's functions were sent from
// (D4-1b-live-apply.md; identical to the reviewed 90a059c9 and the last 1b round dfbf32a2).
const ONE_B_SQL = 'scripts/pgtest/fixtures/d4-1b-live-fingerprint.sql';
const ONE_B_JSON = 'scripts/pgtest/fixtures/d4-1b-live-fingerprint.expected.json';
const D4_SQL = 'docs/evidence/D4-release-fingerprint.sql';
const D4_JSON = 'docs/evidence/D4-release-fingerprint.expected.json';
const D_SQL = 'docs/evidence/D-release-fingerprint.sql';
const D_JSON = 'docs/evidence/D-release-fingerprint.expected.json';
// Objects per step (functions / triggers / relations), from the build docs.
const COUNT = { base: [41, 19, 6], '2': [8, 5, 1], '3A': [9, 3, 0], '3B': [41, 19, 0] };
// The 1b bodies a later step replaces (and its rollback leaves, by design).
const REPLACES = { '3A': 'public.d4_guard_status()', '3B': 'public._money_enrollment_rpc_call()' };

const lf = (s) => s.replace(/\r\n/g, '\n');
const crlf = (s) => lf(s).replace(/\n/g, '\r\n');
const fileText = (rel) => lf(readFileSync(resolve(repo, rel), 'utf8'));

/** The pins a migration's preflight compares: [signature, [accepted md5s]] (tuple and ARRAY forms). */
function pinsOf(sql) {
  const out = [];
  for (const m of sql.matchAll(/\('(public\.[a-z_0-9]+\([^']*\))',\s*(?:ARRAY\[([^\]]+)\]|'([0-9a-f]{32})')\)/g)) {
    const md5s = m[2] ? [...m[2].matchAll(/'([0-9a-f]{32})'/g)].map((x) => x[1]) : [m[3]];
    out.push([m[1], md5s]);
  }
  return out;
}

/** One object-by-object comparison of a fingerprint with its expected JSON. */
function compare(want, got) {
  const keyed = (j) => new Map([
    ...(j.functions ?? []).map((f) => [`function ${f.identity}`, f]),
    ...(j.triggers ?? []).map((t) => [`trigger ${t.table}.${t.name}`, t]),
    ...Object.entries(j.relations ?? {}).map(([k, v]) => [`relation ${k}`, v]),
  ]);
  const W = keyed(want), G = keyed(got);
  const differ = [], missing = [], extra = [];
  for (const [k, v] of W) {
    if (!G.has(k)) missing.push(k);
    else if (JSON.stringify(sortKeys(v)) !== JSON.stringify(sortKeys(G.get(k)))) differ.push(k);
  }
  for (const k of G.keys()) if (!W.has(k)) extra.push(k);
  return { differ, missing, extra, counts: [(got.functions ?? []).length, (got.triggers ?? []).length, Object.keys(got.relations ?? {}).length] };
}

// ------------------------------------------------------------------ child: one scenario
async function scenario(name) {
  const results = [];
  const ok = (label, cond, detail) => results.push({ label: `${name}: ${label}`, ok: !!cond, detail: cond ? undefined : detail });
  const db = new PGlite();
  const exec = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
  const fp = async (sqlText) => (await db.query(statementOf(sqlText))).rows[0].fingerprint;
  const md5Of = async (sig) => (await db.query(`SELECT md5(replace(prosrc, E'\\r', '')) m FROM pg_proc WHERE oid = to_regprocedure($1)`, [sig])).rows[0]?.m ?? null;
  const pinsHold = async (step) => {
    const bad = [];
    for (const [sig, md5s] of pinsOf(fileText(`supabase/migrations/${STEP[step]}`))) {
      const m = await md5Of(sig);
      if (!md5s.includes(m)) bad.push(`${sig}=${m} (wants ${md5s.join('|')})`);
    }
    if (step === '3A') {
      // 3A's own pin: the live d4_guard_status is 1b's (df2b7052), or 3A's own on a second paste.
      const m = await md5Of('public.d4_guard_status()');
      if (!['df2b7052707d4a8d06bdc307e6fe96a9', '932bc6aa9eded89d1faa16bdb3f54577'].includes(m)) bad.push(`d4_guard_status=${m}`);
    }
    return bad;
  };
  const paste = async (step, { asCrlf = false, label = '' } = {}) => {
    const text = mig(STEP[step]);
    const err = await exec(asCrlf ? crlf(text) : text);
    ok(`${label}step ${step} (${STEP[step]}) pastes${asCrlf ? ' as CRLF' : ''}`, err === null, err);
    return err === null;
  };
  const rollback = async (step) => {
    const err = await exec(fileText(ROLLBACK[step]));
    ok(`rollback of step ${step} (${ROLLBACK[step]}) runs`, err === null, err);
  };

  // 1a + 1b as live: the D release, the live migrations before D4, 1a pasted with CRLF, 1b with LF.
  await db.exec(prelude);
  for (const f of baseline) await db.exec(mig(f));
  let err = await exec(crlf(mig(F1A)));
  ok('base: 1a pastes (CRLF, as live)', err === null, err);
  err = await exec(mig(F1B));
  ok('base: 1b pastes', err === null, err);
  const oneB = compare(JSON.parse(fileText(ONE_B_JSON)), await fp(fileText(ONE_B_SQL)));
  ok('base: the 1b fingerprint as live (41 functions, 19 triggers, 6 relations), every object identical',
     !oneB.differ.length && !oneB.missing.length && JSON.stringify(oneB.counts) === JSON.stringify(COUNT.base), oneB);

  const want = JSON.parse(fileText(D4_JSON));
  const fullFp = async (applied, label) => {
    const r = compare(want, await fp(fileText(D4_SQL)));
    const notYet = Object.keys(REPLACES).filter((s) => !applied.includes(s)).map((s) => `function ${REPLACES[s]}`);
    const expCounts = [0, 1, 2].map((i) => COUNT.base[i] + applied.reduce((n, s) => n + COUNT[s][i], 0));
    ok(`${label}: every object present is the expected one (only 1b bodies a step not yet pasted would replace differ: ${notYet.join(', ') || 'none'})`,
       JSON.stringify(r.differ.sort()) === JSON.stringify(notYet.sort()) && r.extra.length === 0, r);
    ok(`${label}: ${expCounts.join(' / ')} functions / triggers / relations`, JSON.stringify(r.counts) === JSON.stringify(expCounts), r.counts);
  };

  const orders = {
    plan: ['2', '3A', '3B'], 'alone-2': ['2'], 'alone-3A': ['3A'], 'alone-3B': ['3B'],
    'order-3A-2-3B': ['3A', '2', '3B'], 'order-2-3B-3A': ['2', '3B', '3A'], 'order-3B-2-3A': ['3B', '2', '3A'],
    'order-3A-3B-2': ['3A', '3B', '2'], 'order-3B-3A-2': ['3B', '3A', '2'], 'plan-crlf': ['2', '3A', '3B'],
  };
  const order = orders[name];
  const asCrlf = name === 'plan-crlf';
  const applied = [];
  for (const step of order) {
    for (const s of Object.keys(STEP).filter((x) => !applied.includes(x))) {
      const bad = await pinsHold(s);
      ok(`before step ${step}${applied.length ? ` (after ${applied.join(', ')})` : ' (on 1a + 1b)'}: every pin of step ${s}'s preflight matches`, bad.length === 0, bad);
    }
    if (!(await paste(step, { asCrlf }))) break;
    applied.push(step);
    await fullFp(applied, `after ${applied.join(' -> ')}`);
  }
  if (applied.length === 3) {
    for (const s of ['2', '3A', '3B']) {
      const bad = await pinsHold(s);
      ok(`after all three: step ${s}'s pins still match (a second paste is accepted)`, bad.length === 0, bad);
      await paste(s, { label: 'second paste: ' });
    }
    await fullFp(applied, 'after the second pastes');
  }

  if (name === 'plan') {
    // classes carries triggers of two steps (2: the baseline row on INSERT and the mirror guard on
    // UPDATE; 3B: the delete guard). With both installed (owner lane, as in the SQL editor):
    const code = async (sql, p = []) => { try { await db.query(sql, p); return 'ok'; } catch (e) { return e.code ?? e.message; } };
    const c1 = (await db.query(`INSERT INTO public.classes (id, name, session_rate_vnd) VALUES (gen_random_uuid(), 'chain probe', 150000) RETURNING id`)).rows[0].id;
    const base1 = (await db.query(`SELECT count(*)::int n FROM public.class_fee_history WHERE class_id = $1 AND effective_from = DATE '1900-01-01' AND session_rate_vnd = 150000`, [c1])).rows[0].n;
    ok('both installed: a new class gets its 1900 fee row (step 2)', base1 === 1, base1);
    const del1 = await code(`DELETE FROM public.classes WHERE id = $1`, [c1]);
    const left1 = (await db.query(`SELECT count(*)::int n FROM public.class_fee_history WHERE class_id = $1`, [c1])).rows[0].n;
    ok('  a class with no enrolment is deleted, its fee rows cascade (3B delete guard and step 2 fee guard agree)', del1 === 'ok' && left1 === 0, { del1, left1 });
    const c2 = (await db.query(`INSERT INTO public.classes (id, name, session_rate_vnd) VALUES (gen_random_uuid(), 'chain probe 2', 150000) RETURNING id`)).rows[0].id;
    const kid = (await db.query(`INSERT INTO public.students (full_name) VALUES ('probe child') RETURNING id`)).rows[0].id;
    const enr = await code(`INSERT INTO public.enrollments (class_id, student_id, start_date) VALUES ($1, $2, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)`, [c2, kid]);
    const del2 = await code(`DELETE FROM public.classes WHERE id = $1`, [c2]);
    ok('  a class with an enrolment (from today: tier 0, passes) is refused by 3B, HC121, with step 2 installed', enr === 'ok' && del2 === 'HC121', { enr, del2 });
    const fee = await code(`UPDATE public.classes SET session_rate_vnd = 160000 WHERE id = $1`, [c2]);
    ok('  the fee typed on the class by the owner passes step 2\'s mirror guard (owner lane, with an event); 3B has no UPDATE trigger on classes', fee === 'ok', fee);

    // The rollback chain, newest first, back to 1b.
    for (const s of ['3B', '3A', '2']) await rollback(s);
    const left = (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1)`,
      [['zz_class_fee_money_guard', 'zz_class_fee_mirror_guard', 'zz2_session_pay_guard', 'zz_session_insert_guard', 'zz_session_staff_guard',
        'zz_enrollment_money_guard', 'zz_discount_money_guard', 'zz_discount_definition_guard', 'zz_pay_rate_money_guard', 'zz_staff_pay_mirror_guard',
        'zz_invoice_unfreeze_guard', 'zz_invoice_frozen_keep_guard', 'zz_invoice_frozen_delete_guard', 'zz_family_link_guard',
        'zz_student_delete_guard', 'zz_class_delete_guard']])).rows[0].n;
    ok('rollbacks 5, 4, 3: none of the guard triggers of steps 2 / 3A / 3B is left', left === 0, left);
    const back = compare(JSON.parse(fileText(ONE_B_JSON)), await fp(fileText(ONE_B_SQL)));
    ok('rollbacks 5, 4, 3: the 1b fingerprint again, every 1a / 1b trigger as live; only the two 1b bodies 3A and 3B replaced differ (d4_guard_status, _money_enrollment_rpc_call: left by design)',
       JSON.stringify(back.differ.sort()) === JSON.stringify(['function public._money_enrollment_rpc_call()', 'function public.d4_guard_status()']) &&
       !back.missing.length && JSON.stringify(back.counts) === JSON.stringify(COUNT.base), back);
    err = await exec(mig(F1B));
    ok('then 20261114091000 pasted again (optional, to put the 1b text back): it pastes', err === null, err);
    const exact = compare(JSON.parse(fileText(ONE_B_JSON)), await fp(fileText(ONE_B_SQL)));
    ok('  and the 1b fingerprint is exact: every object identical', !exact.differ.length && !exact.missing.length, exact);
    for (const s of ['2', '3A', '3B']) await paste(s, { label: 're-install after the rollback: ' });
    await fullFp(['2', '3A', '3B'], 're-installed');
    for (const s of ['3B', '3A', '2', '1b', '1a']) await rollback(s);
    err = await exec(mig(D2));
    ok('rollbacks 5, 4, 3, 2, 1 then D2 again: D2 pastes', err === null, err);
    const d = compare(JSON.parse(fileText(D_JSON)), await fp(fileText(D_SQL)));
    ok('  the D release: every function and trigger identical (the D-release objects as live)', !d.differ.length && !d.missing.length, d);
  }
  if (name.startsWith('alone-')) {
    const step = order[0];
    await rollback(step);
    const back = compare(JSON.parse(fileText(ONE_B_JSON)), await fp(fileText(ONE_B_SQL)));
    const kept = REPLACES[step] ? [`function ${REPLACES[step]}`] : [];
    ok(`rollback of step ${step} alone: the 1b fingerprint again (differing only: ${kept.join(', ') || 'nothing'})`,
       JSON.stringify(back.differ) === JSON.stringify(kept) && !back.missing.length, back);
  }
  await db.close();
  console.log('RESULT ' + JSON.stringify(results));
}

// ------------------------------------------------------------------ parent
const SCENARIOS = ['plan', 'alone-2', 'alone-3A', 'alone-3B', 'order-3A-2-3B', 'order-2-3B-3A', 'order-3B-2-3A', 'order-3A-3B-2', 'order-3B-3A-2', 'plan-crlf'];
const si = process.argv.indexOf('--scenario');
if (si > 0) {
  await scenario(process.argv[si + 1]);
} else {
  const only = process.argv.slice(2).filter((a) => SCENARIOS.includes(a));
  let pass = 0, fail = 0;
  for (const s of only.length ? only : SCENARIOS) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--scenario', s], { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20 });
    const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('RESULT '));
    if (!line) { fail++; console.log(`FAIL ${s}: no result (exit ${r.status}) ${String(r.stderr ?? '').slice(-400)}`); continue; }
    for (const x of JSON.parse(line.slice(7))) {
      if (x.ok) { pass++; console.log(`ok   ${x.label}`); }
      else { fail++; console.log(`FAIL ${x.label} ${JSON.stringify(x.detail ?? null).slice(0, 600)}`); }
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
