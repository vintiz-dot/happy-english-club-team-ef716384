// Shared scaffolding for the D4 suites that drive edge functions
// (d4-deployed-functions now; d4-functions-register / -lessons / -inputs
// later). Not a suite.
//
// The stand-in for PostgREST and the bundling are those of
// session-guard-functions.test.mjs (D2), moved here unchanged in behaviour:
// the REAL function source is bundled with esbuild (remote imports
// stubbed), Deno.serve is captured, and every Supabase client is a small
// fake backed by pglite. It records which client made every write and RPC
// ("service" = service-role key, "user" = the caller's JWT), so a suite can
// assert that a person's change never used the service key.
//
// `loadFunction(entry, { commit })` bundles the function as it is in the
// working tree, or - with `commit` - as it was at that commit (git show),
// so a suite can drive the functions AS DEPLOYED against new SQL (R-10).
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { repo } from './d4-prelude.mjs';

export const SERVICE_KEY = 'service-role-key';
export const ANON_KEY = 'anon-key';

export function functionsHarness({ as, asSuper }) {
  const jwts = new Map();                 // bearer token -> user id
  const log = { writes: [], rpcs: [], invokes: [], reads: [] };
  const tuitionFail = new Set();
  const pgErr = (e) => ({ code: e.code, message: e.message, details: e.detail ?? null });

  function fakeClient(key, opts) {
    const header = opts?.global?.headers?.Authorization ?? null;
    const who = header ? 'user' : key === SERVICE_KEY ? 'service' : 'anon';
    const uid = header ? jwts.get(header.replace(/^Bearer\s+/i, '')) ?? null : null;
    const run = (sql, params) => who === 'service' ? as(null, 'service_role', 'service_role', sql, params)
      : who === 'user' ? as(uid, 'authenticated', 'authenticated', sql, params)
      : as(null, 'anon', 'anon', sql, params);

    const from = (table) => {
      const q = { table, op: 'select', cols: '*', values: null, filters: [], one: null, ret: false, onConflict: null };
      const where = (params) => q.filters.length === 0 ? '' : ' WHERE ' + q.filters.map((f) => {
        params.push(f.v);
        const n = `$${params.length}`;
        if (f.op === 'in') return `${f.c}::text = ANY(${n}::text[])`;
        return `${f.c} ${({ eq: '=', neq: '<>', gte: '>=', lte: '<=' })[f.op]} ${n}`;
      }).join(' AND ');
      const val = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
      const exec = async () => {
        const params = [];
        let sql;
        if (q.op === 'select') {
          sql = `SELECT to_jsonb(t) j FROM (SELECT ${q.cols} FROM public.${table}${where(params)}) t`;
        } else if (q.op === 'update') {
          const ks = Object.keys(q.values).filter((k) => q.values[k] !== undefined);
          const sets = ks.map((k) => { params.push(val(q.values[k])); return `${k} = $${params.length}`; });
          sql = `UPDATE public.${table} t SET ${sets.join(', ')}${where(params)} RETURNING to_jsonb(t) j`;
        } else if (q.op === 'delete') {
          sql = `DELETE FROM public.${table} t${where(params)} RETURNING to_jsonb(t) j`;
        } else {
          // insert / upsert, one row or many (PostgREST takes an array)
          const rows = Array.isArray(q.values) ? q.values : [q.values];
          const ks = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
          const tuples = rows.map((r) => `(${ks.map((k) => { params.push(r[k] === undefined ? null : val(r[k])); return `$${params.length}`; }).join(', ')})`);
          const keyCols = q.onConflict ? q.onConflict.split(',').map((c) => c.trim()) : [];
          const onConflict = q.op === 'upsert' && q.onConflict
            ? ` ON CONFLICT (${q.onConflict}) DO UPDATE SET ${ks.filter((k) => !keyCols.includes(k)).map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`
            : '';
          sql = `INSERT INTO public.${table} AS t (${ks.join(', ')}) VALUES ${tuples.join(', ')}${onConflict} RETURNING to_jsonb(t) j`;
        }
        if (q.op !== 'select') log.writes.push({ table, op: q.op, who, uid });
        else log.reads.push({ table, who });
        try {
          const rows = (await run(sql, params)).rows.map((r) => r.j);
          if (q.one === 'single') {
            if (rows.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'not one row' } };
            return { data: rows[0], error: null };
          }
          if (q.one === 'maybe') return { data: rows[0] ?? null, error: null };
          return { data: q.op === 'select' || q.ret ? rows : null, error: null };
        } catch (e) {
          if (e.code === '42P01') return { data: null, error: { code: 'PGRST205', message: e.message } };
          return { data: null, error: pgErr(e) };
        }
      };
      const b = {
        select(cols = '*') { if (q.op !== 'select') q.ret = true; else q.cols = cols.replace(/\s+/g, ' '); return b; },
        update(v) { q.op = 'update'; q.values = v; return b; },
        delete() { q.op = 'delete'; return b; },
        insert(v) { q.op = 'insert'; q.values = v; return b; },
        upsert(v, o) { q.op = 'upsert'; q.values = v; q.onConflict = o?.onConflict ?? null; return b; },
        eq(c, v) { q.filters.push({ op: 'eq', c, v }); return b; },
        neq(c, v) { q.filters.push({ op: 'neq', c, v }); return b; },
        gte(c, v) { q.filters.push({ op: 'gte', c, v }); return b; },
        lte(c, v) { q.filters.push({ op: 'lte', c, v }); return b; },
        in(c, v) { q.filters.push({ op: 'in', c, v }); return b; },
        order() { return b; },
        limit() { return b; },
        single() { q.one = 'single'; return b; },
        maybeSingle() { q.one = 'maybe'; return b; },
        then(res, rej) { return exec().then(res, rej); },
      };
      return b;
    };

    return {
      from,
      auth: {
        getUser: async (token) => jwts.has(token)
          ? { data: { user: { id: jwts.get(token), email: null } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } },
      },
      rpc: async (name, params = {}) => {
        log.rpcs.push({ name, who, uid, params });
        const exists = (await asSuper(`SELECT count(*)::int n FROM pg_proc WHERE proname=$1 AND pronamespace='public'::regnamespace`, [name])).rows[0].n;
        if (!exists) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${name}` } };
        const keys = Object.keys(params);
        const vals = keys.map((k) => { const v = params[k]; return v !== null && typeof v === 'object' ? JSON.stringify(v) : v; });
        const sql = `SELECT public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) r`;
        try { return { data: (await run(sql, vals)).rows[0].r, error: null }; }
        catch (e) { return { data: null, error: pgErr(e) }; }
      },
      functions: {
        invoke: async (name, { body }) => {
          log.invokes.push({ name, who, body });
          if (name === 'calculate-tuition') {
            if (tuitionFail.has(body.studentId)) return { data: { error: 'scripted failure' }, error: null };
            return { data: { totalAmount: 1000, baseAmount: 1000, totalDiscount: 0, sessionCount: 4, tuitionFrozen: false,
                             siblingUnresolved: false, invoiceSaved: true, carry: { carryInCredit: 0, carryInDebt: 0,
                             carryOutCredit: 0, carryOutDebt: 0, status: 'settled' } }, error: null };
          }
          if (name === 'calculate-payroll') return { data: { month: body.month, teachers: [{ id: body.teacherId, totalAmount: 1234 }] }, error: null };
          return { data: null, error: { message: `unexpected invoke ${name}` } };
        },
      },
    };
  }

  globalThis.__fakeCreateClient = (_url, key, opts) => fakeClient(key, opts);
  const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY };
  let captured = null;
  globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };

  /** Bundle a function (working tree, or `commit`) and return its request handler. */
  async function loadFunction(entry, { commit = null } = {}) {
    let entryPath = resolve(repo, entry);
    if (commit) {
      // Write the function and every file under supabase/functions/_lib as
      // they were at that commit into a scratch tree, and bundle from there.
      const root = resolve(tmpdir(), `d4fn-${commit}-${process.pid}`);
      const files = execFileSync('git', ['ls-tree', '-r', '--name-only', commit, '--', dirname(entry), 'supabase/functions/_lib'],
        { cwd: repo, encoding: 'utf8' }).split('\n').filter(Boolean);
      for (const f of files) {
        const text = execFileSync('git', ['show', `${commit}:${f}`], { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 26 });
        const p = resolve(root, f);
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, text);
      }
      entryPath = resolve(root, entry);
    }
    const out = await build({
      entryPoints: [entryPath],
      bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
      plugins: [{
        name: 'remote-imports',
        setup(b) {
          b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: 'remote' }));
          b.onLoad({ filter: /.*/, namespace: 'remote' }, (args) => args.path.includes('zod')
            ? { contents: 'export { z } from "zod";', loader: 'js', resolveDir: repo }
            : { contents: 'export const createClient = (...args) => globalThis.__fakeCreateClient(...args);', loader: 'js' });
        },
      }],
    });
    const p = resolve(tmpdir(), `d4fn.${entry.split('/').slice(-2, -1)[0]}.${commit ?? 'wt'}.${process.pid}.mjs`);
    writeFileSync(p, out.outputFiles[0].text);
    captured = null;
    await import(pathToFileURL(p).href);
    return captured;
  }

  async function call(fn, token, body) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fn(new Request('http://localhost/fn', { method: 'POST', headers, body: JSON.stringify(body) }));
    let json = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  }

  async function person(role) {
    const id = crypto.randomUUID();
    const tok = `jwt-${id}`;
    jwts.set(tok, id);
    if (role) await asSuper(`INSERT INTO user_roles VALUES ($1,$2)`, [id, role]);
    return { id, tok };
  }

  return { log, jwts, tuitionFail, loadFunction, call, person };
}
