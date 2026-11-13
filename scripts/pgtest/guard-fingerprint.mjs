// Catalog fingerprint of what a release's migrations created or replaced.
//
//   node scripts/pgtest/guard-fingerprint.mjs [--check]                 D release (D1 + D2)
//   node scripts/pgtest/guard-fingerprint.mjs --release d4 [--check]    D4 so far (D release + D4 files)
//   node scripts/pgtest/guard-fingerprint.mjs --check-unchanged         the 66 D-release objects after D4
//   node scripts/pgtest/guard-fingerprint.mjs --check-unchanged --after-rollback   ... after the D4 rollbacks: 66/66
//
// 1. Loads a prelude, then the release's BASELINE migrations, snapshots the
//    catalog, then the release's NEW migrations (the real files).
// 2. Diffs the catalog before and after to decide which objects the new
//    migrations created or replaced (nothing is hand-listed).
// 3. Writes ONE read-only SELECT (jsonb_build_object / jsonb_agg) that
//    produces a fingerprint of exactly those objects, runs it on pglite, and
//    writes the expected JSON (keys sorted). The conductor pastes the .sql
//    into the live SQL editor after applying the migrations and compares the
//    one JSON value with the expected file.
//
// The D release keeps its files byte for byte (docs/evidence/D-release-
// fingerprint.*). D4 (design f.6) adds `md5_def` = md5(pg_get_triggerdef)
// to every trigger entry, so a changed WHEN clause or event list shows.
//
// --check re-derives the files and fails if they differ from what is on disk
// (line endings ignored: a Windows checkout has CRLF).
// --check-unchanged applies D1, D2 and every D4 file, runs the D-release
// statement, and compares with the D-release expected JSON: of the 66
// objects exactly _session_change_assess and _session_erased_recently may
// differ (design c.0); every other one must be identical.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { D2_PRELUDE, D4_PEOPLE } from './d4-prelude.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mig = (n) => readFileSync(resolve(root, 'supabase/migrations', n), 'utf8').replaceAll('\r\n', '\n'); // LF as committed; a CRLF checkout must not change prosrc
const testSrc = readFileSync(resolve(root, 'scripts/pgtest/session-cancel-guard.test.mjs'), 'utf8').replaceAll('\r\n', '\n');
const PRELUDE = testSrc.match(/const PRELUDE = `([\s\S]*?)`;\r?\n/)[1];
const AUDIT = '20261009130000_audit_every_admin_action.sql';
const CANCEL = '20261027090000_cancelled_lesson_attendance_guard.sql';
const D1 = '20261112090000_session_held_evidence.sql';
const D2 = '20261112091000_session_cancel_guard.sql';
const D4_FILES = ['20261114090000_d4_floors.sql', '20261114091000_d4_core_register.sql'];   // each D4 step appends its file here
const ENROL = '20261106090000_attendance_enrollment_guard.sql';   // student_enrolled_on, read by D4 file 2
const ROLES = ['anon', 'authenticated', 'service_role'];

const RELEASES = {
  d: {
    label: 'D release',
    prelude: PRELUDE,
    baseline: [AUDIT, CANCEL],
    added: [D1, D2],
    triggerTables: ['sessions', 'attendance', 'session_cancel_overrides', 'session_cancel_override_events'],
    triggerDefMd5: false,
    sqlPath: 'docs/evidence/D-release-fingerprint.sql',
    jsonPath: 'docs/evidence/D-release-fingerprint.expected.json',
  },
  d4: {
    label: 'D4 release',
    prelude: D2_PRELUDE + D4_PEOPLE,
    baseline: [AUDIT, CANCEL, ENROL, D1, D2],
    added: D4_FILES,
    triggerTables: null,          // every trigger the D4 files created or replaced
    triggerDefMd5: true,
    sqlPath: 'docs/evidence/D4-release-fingerprint.sql',
    jsonPath: 'docs/evidence/D4-release-fingerprint.expected.json',
  },
};

const q = (db, sql) => db.query(sql).then((r) => r.rows);

// ---- catalog snapshot used only to decide WHICH objects to fingerprint ----
const SNAP = {
  fns: `SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS k,
          md5(concat_ws('|', p.prosrc, p.prosecdef, p.provolatile, coalesce(p.proconfig::text,''),
            pg_get_function_result(p.oid),
            has_function_privilege('anon',p.oid,'EXECUTE'), has_function_privilege('authenticated',p.oid,'EXECUTE'),
            has_function_privilege('service_role',p.oid,'EXECUTE'))) AS sig
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'`,
  trgs: `SELECT c.relname||'.'||t.tgname AS k, md5(concat_ws('|', t.tgtype, t.tgenabled, pg_get_triggerdef(t.oid))) AS sig
         FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE NOT t.tgisinternal AND n.nspname='public'`,
  rels: `SELECT c.relname AS k, c.relkind AS kind, md5(concat_ws('|', c.relrowsecurity,
           (SELECT string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull, ',' ORDER BY a.attnum)
              FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
           (SELECT string_agg(policyname||cmd||md5(coalesce(qual,''))||md5(coalesce(with_check,'')), ',' ORDER BY policyname)
              FROM pg_policies pp WHERE pp.schemaname='public' AND pp.tablename=c.relname))) AS sig
         FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relkind IN ('r','v','p')`,
};
const snapshot = async (db) => {
  const out = {};
  for (const [name, sql] of Object.entries(SNAP)) out[name] = new Map((await q(db, sql)).map((r) => [r.k, r]));
  return out;
};
const changed = (before, after) => [...after.values()].filter((r) => !before.has(r.k) || before.get(r.k).sig !== r.sig);

// ---- the single read-only statement (parameterised only by the lists) ----
const lit = (a) => `ARRAY[${a.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ')}]::text[]`;
const roleObj = (f) => `jsonb_build_object(${ROLES.map((r) => `'${r}', ${f(r)}`).join(', ')})`;
export function buildSql({ fns, trgs, rels }, { label = 'D release', triggerDefMd5 = false } = {}) {
  return `-- ${label} fingerprint: ONE read-only SELECT returning one jsonb value.
-- Generated by scripts/pgtest/guard-fingerprint.mjs - do not edit by hand.
-- md5_prosrc is of the body with CR removed: a file pasted with CRLF (live
-- step 1a was) is the same body, and must not read as a changed one.
SELECT jsonb_build_object(
  'functions', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'identity', f.ident,
      'proname', f.proname,
      'identity_arguments', f.args,
      'md5_prosrc', md5(replace(f.prosrc, E'\\r', '')),
      'security_definer', f.prosecdef,
      'volatility', f.provolatile,
      'config', COALESCE((SELECT jsonb_agg(c ORDER BY c) FROM unnest(f.proconfig) AS c), '[]'::jsonb),
      'execute', ${roleObj((r) => `has_function_privilege('${r}', f.oid, 'EXECUTE')`)}
    ) ORDER BY f.ident)
    FROM (SELECT p.oid, p.proname, p.prosrc, p.prosecdef, p.provolatile, p.proconfig,
                 pg_get_function_identity_arguments(p.oid) AS args,
                 n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS ident
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public') f
    WHERE f.ident = ANY(${lit(fns)})
  ), '[]'::jsonb),
  'triggers', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'table', c.relname, 'tgtype', t.tgtype::int,
      'function', fp.proname, 'enabled', t.tgenabled::text${triggerDefMd5 ? `,
      'md5_def', md5(pg_get_triggerdef(t.oid))` : ''}
    ) ORDER BY c.relname, t.tgname)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_proc fp ON fp.oid = t.tgfoid
    WHERE NOT t.tgisinternal AND n.nspname = 'public' AND c.relname || '.' || t.tgname = ANY(${lit(trgs)})
  ), '[]'::jsonb),
  'relations', COALESCE((
    SELECT jsonb_object_agg(c.relname, jsonb_build_object(
      'kind', c.relkind::text,
      'row_level_security', c.relrowsecurity,
      'force_row_level_security', c.relforcerowsecurity,
      'columns', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
          'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped), '[]'::jsonb),
      'constraints', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'name', k.conname, 'type', k.contype::text, 'md5_def', md5(pg_get_constraintdef(k.oid))) ORDER BY k.conname)
        FROM pg_constraint k WHERE k.conrelid = c.oid), '[]'::jsonb),
      'policies', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'name', pp.policyname, 'cmd', pp.cmd,
          'roles', (SELECT COALESCE(jsonb_agg(r ORDER BY r), '[]'::jsonb) FROM unnest(pp.roles) AS r),
          'md5_qual', md5(pp.qual), 'md5_with_check', md5(pp.with_check)) ORDER BY pp.policyname)
        FROM pg_policies pp WHERE pp.schemaname = 'public' AND pp.tablename = c.relname), '[]'::jsonb),
      'privileges', ${roleObj((r) => `(SELECT COALESCE(jsonb_agg(pr ORDER BY pr), '[]'::jsonb)
          FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS pr
          WHERE has_table_privilege('${r}', c.oid, pr))`)}
    ))
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'p') AND c.relname = ANY(${lit(rels)})
  ), '{}'::jsonb),
  'informational', jsonb_build_object(
    'view_definitions_md5', COALESCE((
      SELECT jsonb_object_agg(c.relname, md5(pg_get_viewdef(c.oid, true)))
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'v' AND c.relname = ANY(${lit(rels)})
    ), '{}'::jsonb),
    'view_options', COALESCE((
      SELECT jsonb_object_agg(c.relname, COALESCE(to_jsonb(c.reloptions), '[]'::jsonb))
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'v' AND c.relname = ANY(${lit(rels)})
    ), '{}'::jsonb)
  )
) AS fingerprint;
`;
}

export const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;
/** The statement of a generated .sql file, ready for db.query (comments and the final ';' removed). */
export const statementOf = (sql) => sql.replace(/\r\n/g, '\n').replace(/^--.*\n/gm, '').trim().replace(/;$/, '');

async function build(cfg) {
  const db = new PGlite();
  await db.exec(cfg.prelude);
  for (const f of cfg.baseline) await db.exec(mig(f));
  const before = await snapshot(db);
  for (const f of cfg.added) await db.exec(mig(f));
  const after = await snapshot(db);

  const fns = changed(before.fns, after.fns).map((r) => r.k).sort();
  const trgsAll = changed(before.trgs, after.trgs).map((r) => r.k).sort();
  const trgs = cfg.triggerTables ? trgsAll.filter((k) => cfg.triggerTables.includes(k.split('.')[0])) : trgsAll;
  const relsChanged = changed(before.rels, after.rels);
  const rels = relsChanged.map((r) => r.k).sort();
  const droppedFns = [...before.fns.keys()].filter((k) => !after.fns.has(k));
  const droppedTrgs = [...before.trgs.keys()].filter((k) => !after.trgs.has(k));
  const touchedExisting = relsChanged.filter((r) => before.rels.has(r.k)).map((r) => r.k);
  const replacedFns = fns.filter((k) => before.fns.has(k));
  if (trgsAll.length !== trgs.length) console.error('WARN triggers outside the listed tables:', trgsAll.filter((k) => !trgs.includes(k)));
  if (droppedFns.length) console.error('WARN functions dropped:', droppedFns);
  if (droppedTrgs.length) console.error('WARN triggers dropped:', droppedTrgs);
  if (touchedExisting.length) console.error('NOTE pre-existing relations changed by the migrations (included):', touchedExisting);

  const sql = buildSql({ fns, trgs, rels }, cfg);
  const fp = (await db.query(statementOf(sql))).rows[0].fingerprint;
  const expected = JSON.stringify(sortKeys(fp), null, 2) + '\n';
  await db.close();
  return { sql, expected, counts: { functions: fns.length, triggers: trgs.length, relations: rels.length,
                                     replacedFunctions: replacedFns, touchedExisting, droppedFns, droppedTrgs } };
}

/**
 * The D-release statement on a database with D1, D2 and every D4 file,
 * compared object by object with the D-release expected JSON.
 */
export async function checkUnchanged({ prelude = D2_PRELUDE + D4_PEOPLE, d4Files = D4_FILES, after = null } = {}) {
  const db = new PGlite();
  await db.exec(prelude);
  for (const f of [AUDIT, CANCEL, ENROL, D1, D2, ...d4Files]) await db.exec(mig(f));
  if (after) await after(db);
  const live = (await db.query(statementOf(readFileSync(resolve(root, RELEASES.d.sqlPath), 'utf8')))).rows[0].fingerprint;
  await db.close();
  const want = JSON.parse(readFileSync(resolve(root, RELEASES.d.jsonPath), 'utf8'));
  const diff = [];
  let total = 0;
  const byKey = (arr, key) => new Map((arr ?? []).map((o) => [key(o), o]));
  const cmp = (kind, a, b) => {
    for (const [k, v] of a) {
      total++;
      if (JSON.stringify(sortKeys(v)) !== JSON.stringify(sortKeys(b.get(k)))) diff.push(`${kind} ${k}`);
    }
    for (const k of b.keys()) if (!a.has(k)) diff.push(`${kind} ${k} (extra)`);
  };
  cmp('function', byKey(want.functions, (o) => o.identity), byKey(live.functions, (o) => o.identity));
  cmp('trigger', byKey(want.triggers, (o) => `${o.table}.${o.name}`), byKey(live.triggers, (o) => `${o.table}.${o.name}`));
  const parts = (rels) => new Map(Object.entries(rels ?? {}).flatMap(([r, o]) => [[`${r}`, null], ...Object.entries(o).map(([p, v]) => [`${r}.${p}`, v])]).filter(([, v]) => v !== null));
  cmp('relation-part', parts(want.relations), parts(live.relations));
  total += Object.keys(want.relations ?? {}).length;   // the relations themselves, as D-live-apply counted them
  return { total, diff };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--check-unchanged') && process.argv.includes('--after-rollback')) {
    // D4 rollback (design f.7): every D4 rollback script, newest first, then
    // 20261112091000 pasted again -> the 66 objects must all match.
    const rollbacks = ['scripts/ROLLBACK-d4-2-register.sql', 'scripts/ROLLBACK-d4-1-floors.sql'];   // newest first
    const { total, diff } = await checkUnchanged({ after: async (x) => {
      for (const r of rollbacks) await x.exec(readFileSync(resolve(root, r), 'utf8'));
      await x.exec(mig(D2));
    } });
    console.log(`D-release objects compared: ${total}; differing: ${diff.length} (${diff.join('; ')})`);
    console.log(diff.length === 0 && total === 66 ? '66 of 66 again' : 'NOT RESTORED');
    process.exit(diff.length === 0 && total === 66 ? 0 : 1);
  }
  if (process.argv.includes('--check-unchanged')) {
    const { total, diff } = await checkUnchanged();
    const allowed = ['function public._session_change_assess(s sessions, p_action text, p_change jsonb, p_uid uuid)',
                     'function public._session_erased_recently(p_session_id uuid)'];
    const unexpected = diff.filter((d) => !allowed.includes(d));
    console.log(`D-release objects compared: ${total}; differing: ${diff.length} (${diff.join('; ')})`);
    console.log(unexpected.length === 0 && diff.length === allowed.length ? 'only the two replaced functions differ' : `UNEXPECTED: ${unexpected.join('; ')}`);
    process.exit(unexpected.length === 0 && diff.length === allowed.length ? 0 : 1);
  }
  const which = process.argv.includes('--release') ? process.argv[process.argv.indexOf('--release') + 1] : 'd';
  const cfg = RELEASES[which];
  if (!cfg) { console.error(`unknown release ${which}`); process.exit(2); }
  const { sql, expected, counts } = await build(cfg);
  const sqlPath = resolve(root, cfg.sqlPath);
  const jsonPath = resolve(root, cfg.jsonPath);
  if (process.argv.includes('--check')) {
    const lf = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    const same = lf(sqlPath) === sql && lf(jsonPath) === expected;
    console.log(same ? 'fingerprint files up to date' : 'fingerprint files DIFFER');
    process.exit(same ? 0 : 1);
  }
  mkdirSync(dirname(sqlPath), { recursive: true });
  writeFileSync(sqlPath, sql);
  writeFileSync(jsonPath, expected);
  console.log(expected);
  console.error('objects covered:', JSON.stringify(counts));
}
