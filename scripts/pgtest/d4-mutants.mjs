// D4 mutation runner (docs/evidence/D4-design.md f.6). Not part of run.mjs:
// it takes minutes. Each mutant is ONE textual change to a D4 migration; the
// runner writes the mutated copy to a scratch file, re-computes the
// preflight's "this file" md5 literals for the mutated bodies (otherwise
// every body mutant would be "caught" by the second-paste check alone),
// runs the named suites with the mutated file in place of the real one, and
// reports CAUGHT (some suite failed) or SURVIVED.
//
//   node scripts/pgtest/d4-mutants.mjs            every mutant
//   node scripts/pgtest/d4-mutants.mjs M03 M07    only these
//
// Survivors are reported, not hidden: a survivor needs a new case.
import { PGlite } from '@electric-sql/pglite';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { makeDb, migPath, repo, AUDIT, CANCEL, D1, D2, FLOORS } from './d4-prelude.mjs';

const FREEZE = '20261106120000_invoice_tuition_freeze.sql';
const SUITES = {
  floors: { file: 'd4-floors.test.mjs', migs: [AUDIT, CANCEL, D1, D2, FLOORS, FREEZE] },
  carry: { file: 'd4-d2-carryover.test.mjs', migs: [AUDIT, CANCEL, D1, D2, FLOORS] },
  deployed: { file: 'd4-deployed-functions.test.mjs', migs: [AUDIT, CANCEL, D1, D2, FLOORS] },
};

// [id, what it breaks, find (must occur exactly once), replace, suites]
export const MUTANTS = [
  ['M01', 'a caller D1 refuses writes a floor (R-6)',
    "    RETURN;   -- R-6: a caller D1 refuses writes no floor", "    NULL;", ['floors']],
  ['M02', 'a D1 error is stored as STRONG (R-6)',
    "    v_level := CASE WHEN p_own_level IN ('SOFT', 'STRONG') THEN p_own_level ELSE 'NONE' END;", "    v_level := 'STRONG';", ['floors']],
  ['M03', 'the cancel\'s excuse-all writes a floor',
    "  IF pg_trigger_depth() > 1 AND COALESCE(p_cause ->> 'table', '') = 'attendance' THEN", "  IF false THEN", ['floors']],
  ['M04', 'deleting a CANCELLED lesson reads the effective level (D2 5.3 step 9 broken)',
    "OR (s.status = 'Canceled' AND v_level_now <> 'NONE')", "OR (s.status = 'Canceled' AND v_level <> 'NONE')", ['floors', 'carry']],
  ['M05', 'the lesson guard\'s settled does not read the bill floor',
    "     WHERE COALESCE(f.ever_paid OR f.ever_signed OR f.ever_frozen, false)\n        OR (i.id IS NOT NULL",
    "     WHERE false\n        OR (i.id IS NOT NULL", ['floors']],
  ['M06', 'the bill floor skips recorded_payment',
    "      IF v_rec > 0 AND COALESCE(NEW.recorded_payment, 0) < v_rec THEN", "      IF false THEN", ['floors']],
  ['M07', 'the effective level ignores a STRONG floor',
    "    WHEN v_now = 'STRONG' OR v_floor = 'STRONG' THEN 'STRONG'", "    WHEN v_now = 'STRONG' THEN 'STRONG'", ['floors']],
  ['M08', 'HC024 dropped (a mark can be re-pointed)',
    "  IF TG_OP = 'UPDATE' AND (OLD.session_id IS DISTINCT FROM NEW.session_id", "  IF false AND (OLD.session_id IS DISTINCT FROM NEW.session_id", ['floors', 'carry']],
  ['M09', 'HC025 only for DELETE (un-signing a mark passes)',
    "       AND (TG_OP = 'DELETE' OR NEW.marked_by IS NULL) THEN", "       AND (TG_OP = 'DELETE') THEN", ['floors']],
  ['M10', 'the point keep ignores a re-dated row',
    "          OR OLD.date       IS DISTINCT FROM NEW.date\n", "", ['floors']],
  ['M11', 'the transcript keep ignores an unlinked row',
    "     OR OLD.session_id         IS DISTINCT FROM NEW.session_id\n", "", ['floors']],
  ['M12', 'the submission keep ignores graded_at',
    "                 OR OLD.graded_at   IS DISTINCT FROM NEW.graded_at\n", "", ['floors']],
  ['M13', 'the lesson keep ignores Held -> Scheduled',
    "  WHEN ((OLD.status = 'Held' AND NEW.status IS DISTINCT FROM 'Held' AND NEW.status IS DISTINCT FROM 'Canceled')\n     OR OLD.date IS DISTINCT FROM NEW.date)",
    "  WHEN (OLD.date IS DISTINCT FROM NEW.date)", ['floors', 'carry']],
  ['M14', 'the floor\'s causes are not in erased_recently (no review)',
    "       AND (c ->> 'at')::timestamptz >= now() - interval '30 days'", "       AND false", ['floors']],
  ['M15', 'the token does not cover the floor\'s causes',
    "      v_level_now, v_floor ->> 'level', jsonb_array_length(COALESCE(v_floor -> 'causes', '[]'::jsonb)),\n      md5(COALESCE(v_floor -> 'causes', '[]'::jsonb)::text)\n  )::text, 'UTF8')), 'hex');\n  v_fp",
    "      v_level_now, v_floor ->> 'level'\n  )::text, 'UTF8')), 'hex');\n  v_fp", ['floors']],
  ['M16', 'the G-10 residue is not refreshed',
    "          SELECT unnest(v_res)) st                            -- D4: G-10 residue",
    "          SELECT NULL::uuid WHERE false) st", ['floors']],
  ['M17', 'a floor may be lowered',
    "         OR (OLD.level = 'STRONG' AND NEW.level IS DISTINCT FROM 'STRONG')", "         OR false", ['floors']],
  ['M18', 'a lesson that has not started gets a floor',
    "  IF NOT FOUND OR NOT COALESCE(public.session_has_started(s.date, s.start_time), false) THEN", "  IF NOT FOUND THEN", ['floors']],
  ['M19', 'with a floor, settled is judged over billable rows only',
    "     WHERE a.session_id = s.id AND (v_floor IS NOT NULL OR a.status IN ('Present', 'Absent', 'Late'))",
    "     WHERE a.session_id = s.id AND (a.status IN ('Present', 'Absent', 'Late'))", ['floors']],
  ['M20', 'causes are not capped',
    "     ORDER BY n DESC LIMIT 20) q", "     ORDER BY n DESC LIMIT 200) q", ['floors']],
  ['M21', 'a deleted bill leaves no floor',
    "      v_what := ARRAY['deleted'];", "      v_what := ARRAY[]::text[];", ['floors']],
  ['M22', 'the floor table guard lets the service role write',
    "  IF current_user::text IN ('anon', 'authenticated', 'service_role', 'authenticator')\n     OR current_user <> (SELECT c.relowner::regrole::name FROM pg_class c WHERE c.oid = TG_RELID) THEN\n    RAISE EXCEPTION '% rows are written only by the floor functions'",
    "  IF false THEN\n    RAISE EXCEPTION '% rows are written only by the floor functions'", ['floors']],
  ['M23', 'the keep returns before D1 for every person (no floor from admins / teachers)',
    "  IF v_lane IN ('person', 'unknown')\n     AND NOT COALESCE(", "  IF v_lane IN ('person', 'unknown')\n     OR NOT COALESCE(", ['floors', 'deployed']],
  ['M24', 'the sessions keep fires on a cancel (Held -> Canceled)',
    "AND NEW.status IS DISTINCT FROM 'Canceled')\n     OR OLD.date", ")\n     OR OLD.date", ['floors', 'carry']],
];

const D4_LITERALS = [/('[0-9a-f]{32}'\) THEN\s+-- this file)/g];
async function patchLiterals(text) {
  // Load the mutated file over D1 + D2 (its first paste accepts D2's bodies),
  // read the md5 of the two installed bodies, and put them in the preflight.
  const db = await makeDb(PGlite, { people: true, migrations: [AUDIT, CANCEL, D1, D2] });
  try { await db.exec(text.replace(/\r\n/g, '\n')); }
  catch (e) { await db.close(); return { text, error: e.message }; }
  const m = (await db.query(`SELECT proname, md5(replace(prosrc, E'\\r', '')) m FROM pg_proc
     WHERE proname IN ('_session_change_assess', '_session_erased_recently') ORDER BY proname`)).rows;
  await db.close();
  const [assess, erased] = m.map((r) => r.m);
  let i = 0;
  const out = text.replace(/'[0-9a-f]{32}'\) THEN(\s+)-- this file/g, (_, sp) => `'${i++ === 0 ? assess : erased}') THEN${sp}-- this file`);
  void D4_LITERALS;
  return { text: out };
}

const runSuite = (suite, floorsPath) => new Promise((done) => {
  const args = [join(repo, 'scripts', 'pgtest', suite.file), ...suite.migs.map((f) => (f === FLOORS ? floorsPath : migPath(f)))];
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.on('close', (code) => done({ code, out }));
});

const only = process.argv.slice(2);
const original = readFileSync(migPath(FLOORS), 'utf8').replace(/\r\n/g, '\n');
const results = [];
for (const [id, what, find, repl, suites] of MUTANTS) {
  if (only.length && !only.includes(id)) continue;
  const n = original.split(find).length - 1;
  if (n !== 1) { results.push({ id, what, verdict: `BAD MUTANT (pattern found ${n} times)` }); console.log(`${id} BAD MUTANT (${n})`); continue; }
  const mutated = original.replace(find, repl);
  const { text, error } = await patchLiterals(mutated);
  if (error) { results.push({ id, what, verdict: `CAUGHT at install (${error.slice(0, 80)})` }); console.log(`${id} CAUGHT at install`); continue; }
  const p = resolve(tmpdir(), `d4-mutant-${id}-${process.pid}.sql`);
  writeFileSync(p, text);
  const by = [];
  for (const s of suites) {
    const r = await runSuite(SUITES[s], p);
    if (r.code !== 0) {
      const firstFail = r.out.split('\n').find((l) => l.includes('FAIL')) ?? r.out.split('\n').slice(-3).join(' ');
      by.push(`${s}: ${firstFail.trim().slice(0, 160)}`);
      break;
    }
  }
  const verdict = by.length ? `CAUGHT by ${by[0]}` : `SURVIVED (${suites.join(', ')})`;
  results.push({ id, what, verdict });
  console.log(`${id} ${verdict}`);
}
console.log('\n| Mutant | Breaks | Verdict |\n|---|---|---|');
for (const r of results) console.log(`| ${r.id} | ${r.what} | ${r.verdict.replace(/\|/g, '/')} |`);
const survivors = results.filter((r) => !r.verdict.startsWith('CAUGHT'));
console.log(`\n${results.length - survivors.length} caught, ${survivors.length} survived or bad`);
process.exit(survivors.length ? 1 : 0);
