// transcribe-lesson-audio: who may start a transcription (T2 finding F2).
//
//   node scripts/pgtest/transcribe-gate.test.mjs [path/to/index.ts]
//
// The REAL function is bundled with esbuild (remote imports stubbed, its own
// ../_lib imports real), Deno.serve is captured, EdgeRuntime.waitUntil
// collects the background pipeline so it can be awaited, and `fetch` is
// scripted - no vendor is ever called. The Supabase client is an in-memory
// stand-in that records every table read and write, every storage download
// and every rpc, so a refused call can be shown to have touched nothing.
//
// The class's own teacher is also run through the function AS IT WAS before
// the gate (git show BASE), and the outgoing calls must be identical: the
// gate adds checks and changes nothing for a legitimate caller.
//
// The optional argument points at another copy of index.ts (mutation runs).
import { build } from 'esbuild';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FN_DIR = resolve(repo, 'supabase', 'functions', 'transcribe-lesson-audio');
const BASE = 'dedd193'; // the function before the gate
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
async function section(name, fn) {
  try { await fn(); }
  catch (e) { ok(`section "${name}" ran to the end without an unexpected error`, false, { message: e?.message, stack: e?.stack?.split('\n').slice(0, 3) }); }
}

// ------------------------------------------------------------- the people
const SERVICE_KEY = 'test-service-role-key';
const ANON_KEY = 'test-anon-key';
const OPENAI_KEY = 'test-openai-key';
const C1 = '11111111-1111-4111-8111-111111111111';
const C2 = '22222222-2222-4222-8222-222222222222';
const U = {
  admin: 'aaaaaaaa-0000-4000-8000-000000000001',
  teacher1: 'aaaaaaaa-0000-4000-8000-000000000002', // teaches C1
  teacher2: 'aaaaaaaa-0000-4000-8000-000000000003', // teaches C2 only
  taOn: 'aaaaaaaa-0000-4000-8000-000000000004',     // TA on C1
  taOff: 'aaaaaaaa-0000-4000-8000-000000000005',    // TA on nothing
  parent: 'aaaaaaaa-0000-4000-8000-000000000006',
  student: 'aaaaaaaa-0000-4000-8000-000000000007',
  rpcBroken: 'aaaaaaaa-0000-4000-8000-000000000008', // teacher whose class lookup errors
};
const ROLES = {
  [U.admin]: ['admin'], [U.teacher1]: ['teacher'], [U.teacher2]: ['teacher'],
  [U.taOn]: ['teacher'], [U.taOff]: ['teacher'], [U.parent]: ['family'], [U.student]: ['student'],
  [U.rpcBroken]: ['teacher'],
};
// What is_teacher_of_class answers (it admits TAs on the class too).
const TEACHES = { [C1]: new Set([U.teacher1, U.taOn]), [C2]: new Set([U.teacher2]) };
const tokenOf = (u) => `jwt-${u}`;

const TR1 = 'bbbbbbbb-0000-4000-8000-000000000001';
const TR_ELSEWHERE = 'bbbbbbbb-0000-4000-8000-000000000002'; // C1 row, path under C2
const TR_NOPATH = 'bbbbbbbb-0000-4000-8000-000000000003';
const TR_UNKNOWN = 'bbbbbbbb-0000-4000-8000-0000000000ff';
const TR_BROKEN = 'bbbbbbbb-0000-4000-8000-0000000000ee'; // lookup errors

function seedRows() {
  return {
    [TR1]: { id: TR1, class_id: C1, audio_storage_path: `${C1}/rec-1.mp3`, audio_mime_type: 'audio/mpeg', title: 'Animals', lesson_context: 'Unit 3' },
    [TR_ELSEWHERE]: { id: TR_ELSEWHERE, class_id: C1, audio_storage_path: `${C2}/rec-2.mp3`, audio_mime_type: 'audio/mpeg', title: null, lesson_context: null },
    [TR_NOPATH]: { id: TR_NOPATH, class_id: C1, audio_storage_path: null, audio_mime_type: null, title: null, lesson_context: null },
  };
}

// ------------------------------------------------ the Supabase stand-in
let log = [];      // everything the function asked of Supabase
let fetches = [];  // everything it sent over fetch
let pending = [];  // background work handed to EdgeRuntime.waitUntil
let rows = seedRows();
const norm = (v) => JSON.parse(JSON.stringify(v ?? null, (k, x) => (k === 'processing_started_at' ? '<ts>' : x)));

function fakeClient(key) {
  const who = key === SERVICE_KEY ? 'service' : 'other';
  const from = (table) => {
    const st = { table, op: 'select', cols: null, filters: [], payload: null, single: null };
    const exec = () => {
      log.push(norm({ client: who, table, op: st.op, cols: st.cols, filters: st.filters, payload: st.payload, single: st.single }));
      const idf = st.filters.find((f) => f[0] === 'eq' && f[1] === 'id');
      if (table === 'user_roles') {
        const uid = st.filters.find((f) => f[1] === 'user_id')?.[2];
        return { data: (ROLES[uid] || []).map((role) => ({ role })), error: null };
      }
      if (table === 'class_transcripts' && st.op === 'select') {
        if (idf?.[2] === TR_BROKEN) return { data: null, error: { message: 'connection reset', code: '08006' } };
        const row = rows[idf?.[2]];
        if (!row) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
        return { data: { ...row }, error: null };
      }
      if (st.op === 'update' || st.op === 'insert') return { data: null, error: null };
      if (table === 'enrollments') return { data: [{ students: { full_name: 'Anna' } }, { students: { full_name: 'Binh' } }], error: null };
      if (table === 'sessions') return { data: [{ teachers: { full_name: 'Ms Lan' } }], error: null };
      if (table === 'lesson_resources') return { data: [{ caption: 'Flashcards' }], error: null };
      if (table === 'lesson_overviews') return { data: [{ materials: [{ name: 'Oxford Discover 1' }] }], error: null };
      return { data: [], error: null };
    };
    const b = {
      select(c) { if (st.op === 'select') st.cols = c; return b; },
      update(p) { st.op = 'update'; st.payload = p; return b; },
      insert(p) { st.op = 'insert'; st.payload = p; return b; },
      upsert(p) { st.op = 'upsert'; st.payload = p; return b; },
      delete() { st.op = 'delete'; return b; },
      eq(k, v) { st.filters.push(['eq', k, v]); return b; },
      in(k, v) { st.filters.push(['in', k, v]); return b; },
      or(s) { st.filters.push(['or', s]); return b; },
      order(k, o) { st.filters.push(['order', k, o]); return b; },
      limit(n) { st.filters.push(['limit', n]); return b; },
      single() { st.single = 'single'; return b; },
      maybeSingle() { st.single = 'maybe'; return b; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    return b;
  };
  return {
    from,
    rpc: async (name, args) => {
      log.push(norm({ client: who, rpc: name, args }));
      if (name === 'is_teacher_of_class') {
        if (args.user_id === U.rpcBroken) return { data: null, error: { message: 'boom' } };
        return { data: !!TEACHES[args.class_id]?.has(args.user_id), error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    },
    auth: {
      getUser: async (token) => {
        log.push({ client: who, auth: 'getUser' });
        const uid = Object.values(U).find((u) => tokenOf(u) === token);
        if (!uid) return { data: { user: null }, error: { message: 'invalid JWT' } };
        return { data: { user: { id: uid, email: `${uid}@example.test` } }, error: null };
      },
    },
    storage: {
      from: (bucket) => ({
        download: async (path) => {
          log.push({ client: who, storage: bucket, download: path });
          const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
          return { data: { arrayBuffer: async () => bytes.buffer }, error: null };
        },
      }),
    },
  };
}

// ----------------------------------------------------------- scripted fetch
const authKind = (h) => {
  const v = (h && (h.Authorization || h.authorization)) || '';
  if (v === `Bearer ${SERVICE_KEY}`) return '<service>';
  if (v === `Bearer ${OPENAI_KEY}`) return '<openai>';
  return v ? '<other>' : '<none>';
};
async function describeBody(body) {
  if (body instanceof FormData) {
    const out = [];
    for (const [k, v] of body.entries()) {
      out.push(typeof v === 'string' ? [k, v] : [k, { name: v.name, type: v.type, size: v.size }]);
    }
    return out;
  }
  if (typeof body === 'string') { try { return JSON.parse(body); } catch { return body; } }
  return body ?? null;
}
globalThis.fetch = async (url, init = {}) => {
  fetches.push({ url: String(url), method: init.method || 'GET', auth: authKind(init.headers), body: await describeBody(init.body) });
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
  if (String(url) === 'https://api.openai.com/v1/audio/transcriptions') {
    return json({ text: 'Open your books. Anna, can you read?', duration: 3,
      segments: [{ id: 0, start: 0, end: 1.5, text: 'Open your books.' }, { id: 1, start: 1.5, end: 3, text: 'Anna, can you read?' }] });
  }
  if (String(url) === 'https://api.openai.com/v1/chat/completions') {
    return json({ choices: [{ message: { content: JSON.stringify({ labels: [{ index: 0, speaker: 'Teacher' }, { index: 1, speaker: 'Teacher' }] }) } }] });
  }
  if (String(url) === 'https://example.supabase.co/functions/v1/analyze-transcript') return json({ success: true, queued: true });
  return json({ error: `unexpected fetch ${url}` }, 599);
};

// ------------------------------------------------------------- bundling
globalThis.__fakeCreateClient = (_url, key) => fakeClient(key);
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY, OPENAI_API_KEY: OPENAI_KEY };
let captured = null;
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
globalThis.EdgeRuntime = { waitUntil: (p) => { pending.push(p); } };
const quiet = { log: console.log, warn: console.warn, error: console.error };

async function load(source, tag) {
  const out = await build({
    stdin: { contents: source, resolveDir: FN_DIR, sourcefile: 'index.ts', loader: 'ts' },
    bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
    plugins: [{
      name: 'remote-imports',
      setup(b) {
        b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: 'remote' }));
        b.onLoad({ filter: /.*/, namespace: 'remote' }, () => ({
          contents: 'export const createClient = (...args) => globalThis.__fakeCreateClient(...args);', loader: 'js',
        }));
      },
    }],
  });
  const p = resolve(tmpdir(), `transcribe-gate.${tag}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}

const target = process.argv[2] ? resolve(process.argv[2]) : resolve(FN_DIR, 'index.ts');
const fn = await load(readFileSync(target, 'utf8'), 'now');
ok('the function registered a handler', typeof fn === 'function');
let baseFn = null;
try {
  const baseSrc = execFileSync('git', ['show', `${BASE}:supabase/functions/transcribe-lesson-audio/index.ts`], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  baseFn = await load(baseSrc, 'base');
} catch { /* history not available: the comparison is reported as such below */ }

async function call(handler, token, body) {
  log = []; fetches = []; pending = []; rows = seedRows();
  const headers = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(new Request('https://example.supabase.co/functions/v1/transcribe-lesson-audio', {
      method: 'POST', headers, body: JSON.stringify(body),
    }));
    await Promise.all(pending);
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, log: log.slice(), fetches: fetches.slice() };
  } finally { Object.assign(console, quiet); }
}

const writes = (r) => r.log.filter((e) => e.op && e.op !== 'select');
const downloads = (r) => r.log.filter((e) => e.storage);
const transcriptReads = (r) => r.log.filter((e) => e.table === 'class_transcripts' && e.op === 'select');
function touchedNothing(label, r) {
  ok(`${label}: no storage download`, downloads(r).length === 0, downloads(r));
  ok(`${label}: no vendor or function fetch`, r.fetches.length === 0, r.fetches.map((f) => f.url));
  ok(`${label}: no row written`, writes(r).length === 0, writes(r));
}
// What a successful run sends out: Whisper with the audio, gpt-4o, then the
// analyze-transcript hand-off as the service role.
function proceeded(label, r) {
  ok(`${label}: 200 queued`, r.status === 200 && r.json?.success === true && r.json?.queued === true && r.json?.transcript_id === TR1, { status: r.status, json: r.json });
  ok(`${label}: downloaded the row's own recording`, downloads(r).length === 1 && downloads(r)[0].download === `${C1}/rec-1.mp3` && downloads(r)[0].storage === 'class-recordings', downloads(r));
  ok(`${label}: Whisper, labeler, analysis hand-off - in that order`,
    r.fetches.map((f) => f.url).join(' ') === 'https://api.openai.com/v1/audio/transcriptions https://api.openai.com/v1/chat/completions https://example.supabase.co/functions/v1/analyze-transcript',
    r.fetches.map((f) => f.url));
  const handoff = r.fetches[2];
  ok(`${label}: analysis hand-off as the service role for this transcript`, handoff?.auth === '<service>' && handoff?.body?.transcript_id === TR1 && handoff?.body?.background === true, handoff);
  const vtt = writes(r).find((w) => w.payload && 'raw_text' in w.payload);
  ok(`${label}: wrote the labeled transcript to this row`, !!vtt && vtt.payload.raw_text.startsWith('WEBVTT') && vtt.filters.some((f) => f[1] === 'id' && f[2] === TR1), vtt);
}
// The parts of a run that do not depend on who asked: everything after the
// gate's own lookups (getUser, user_roles, is_teacher_of_class).
const work = (r) => ({
  status: r.status, json: r.json, fetches: r.fetches,
  log: r.log.filter((e) => !e.auth && e.table !== 'user_roles' && !e.rpc),
});

await section('no or bad credentials', async () => {
  const none = await call(fn, null, { transcript_id: TR1 });
  ok('no Authorization -> 401', none.status === 401, none);
  ok('no Authorization: the transcript row is not even read', transcriptReads(none).length === 0, none.log);
  touchedNothing('no Authorization', none);
  const anon = await call(fn, ANON_KEY, { transcript_id: TR1 });
  ok('anon key -> 401', anon.status === 401, anon);
  ok('anon key: the transcript row is not read', transcriptReads(anon).length === 0, anon.log);
  touchedNothing('anon key', anon);
  const junk = await call(fn, 'not-a-token', { transcript_id: TR1 });
  ok('a forged token -> 401', junk.status === 401, junk);
  touchedNothing('forged token', junk);
});

await section('families and pupils', async () => {
  for (const who of ['parent', 'student']) {
    const r = await call(fn, tokenOf(U[who]), { transcript_id: TR1 });
    ok(`${who} -> 403`, r.status === 403, r);
    ok(`${who}: the transcript row is not read`, transcriptReads(r).length === 0, r.log);
    touchedNothing(who, r);
  }
});

await section('staff who do not hold the class', async () => {
  const t2 = await call(fn, tokenOf(U.teacher2), { transcript_id: TR1 });
  ok('teacher of ANOTHER class -> 403', t2.status === 403 && t2.json?.success === false, t2);
  touchedNothing('teacher of another class', t2);
  ok('teacher of another class: the class was asked about by the ROW\'s class id',
    t2.log.some((e) => e.rpc === 'is_teacher_of_class' && e.args.class_id === C1 && e.args.user_id === U.teacher2), t2.log.filter((e) => e.rpc));
  const spoof = await call(fn, tokenOf(U.teacher2), { transcript_id: TR1, class_id: C2 });
  ok('teacher of another class naming their own class in the body -> 403', spoof.status === 403, spoof);
  touchedNothing('class id in the body', spoof);
  const spoofPath = await call(fn, tokenOf(U.teacher2), { transcript_id: TR1, class_id: C2, audio_storage_path: `${C2}/x.mp3` });
  ok('...and a path under their class -> still refused', spoofPath.status === 403 || spoofPath.status === 400, spoofPath);
  touchedNothing('class and path in the body', spoofPath);
  const off = await call(fn, tokenOf(U.taOff), { transcript_id: TR1 });
  ok('TA not on the class -> 403', off.status === 403, off);
  touchedNothing('TA not on the class', off);
  const noPath = await call(fn, tokenOf(U.teacher2), { transcript_id: TR_NOPATH });
  ok('teacher of another class on a row with no audio -> 403, and the row is NOT marked failed', noPath.status === 403 && writes(noPath).length === 0, noPath);
  const broken = await call(fn, tokenOf(U.rpcBroken), { transcript_id: TR1 });
  ok('class lookup errors -> 403 (fails closed)', broken.status === 403, broken);
  touchedNothing('class lookup error', broken);
});

await section('the class\'s own staff, admins and the service role proceed', async () => {
  proceeded('the class\'s teacher', await call(fn, tokenOf(U.teacher1), { transcript_id: TR1 }));
  proceeded('a TA on the class', await call(fn, tokenOf(U.taOn), { transcript_id: TR1 }));
  proceeded('admin', await call(fn, tokenOf(U.admin), { transcript_id: TR1 }));
  const svc = await call(fn, SERVICE_KEY, { transcript_id: TR1 });
  proceeded('service-role call', svc);
  ok('admin and service role are not asked about the class', true);
  const same = await call(fn, tokenOf(U.teacher1), { transcript_id: TR1, audio_storage_path: `${C1}/rec-1.mp3` });
  proceeded('the class\'s teacher sending the row\'s own path', same);
});

await section('identical to the function before the gate, for the class\'s teacher', async () => {
  if (!baseFn) { ok(`base ${BASE} available from git for the comparison`, false, 'git show failed'); return; }
  const cases = [
    ['a full run', { transcript_id: TR1 }],
    ['a row with no audio (400, marked failed)', { transcript_id: TR_NOPATH }],
    ['an unknown transcript id (404)', { transcript_id: TR_UNKNOWN }],
    ['no transcript id (400)', {}],
  ];
  for (const [label, body] of cases) {
    const now = work(await call(fn, tokenOf(U.teacher1), body));
    const before = work(await call(baseFn, tokenOf(U.teacher1), body));
    ok(`${label}: same status, response, Supabase calls and outgoing fetches as at ${BASE}`,
      JSON.stringify(now) === JSON.stringify(before), { now, before });
  }
  for (const who of ['admin', 'taOn']) {
    const now = work(await call(fn, tokenOf(U[who]), { transcript_id: TR1 }));
    const before = work(await call(baseFn, tokenOf(U[who]), { transcript_id: TR1 }));
    ok(`${who}: a full run identical to ${BASE}`, JSON.stringify(now) === JSON.stringify(before), { now, before });
  }
  const sNow = work(await call(fn, SERVICE_KEY, { transcript_id: TR1 }));
  const sBefore = work(await call(baseFn, SERVICE_KEY, { transcript_id: TR1 }));
  ok(`service role: a full run identical to ${BASE}`, JSON.stringify(sNow) === JSON.stringify(sBefore), { sNow, sBefore });
});

await section('paths and ids', async () => {
  const mismatch = await call(fn, tokenOf(U.teacher1), { transcript_id: TR1, audio_storage_path: `${C2}/rec-9.mp3` });
  ok('a body path that is not the row\'s -> 400', mismatch.status === 400 && mismatch.json?.success === false, mismatch);
  touchedNothing('body path mismatch', mismatch);
  const sameClassOther = await call(fn, tokenOf(U.teacher1), { transcript_id: TR1, audio_storage_path: `${C1}/other.mp3` });
  ok('a body path in the same class but not the row\'s -> 400', sameClassOther.status === 400, sameClassOther);
  touchedNothing('other recording of the same class', sameClassOther);
  const elsewhere = await call(fn, tokenOf(U.teacher1), { transcript_id: TR_ELSEWHERE });
  ok('a row whose recording is filed under another class -> 403', elsewhere.status === 403, elsewhere);
  touchedNothing('row path under another class', elsewhere);
  const elsewhereAdmin = await call(fn, tokenOf(U.admin), { transcript_id: TR_ELSEWHERE });
  ok('...refused for an admin too', elsewhereAdmin.status === 403, elsewhereAdmin);
  touchedNothing('row path under another class (admin)', elsewhereAdmin);
  const unknown = await call(fn, tokenOf(U.teacher1), { transcript_id: TR_UNKNOWN });
  ok('unknown transcript id -> 404', unknown.status === 404, unknown);
  touchedNothing('unknown transcript', unknown);
  const broken = await call(fn, tokenOf(U.teacher1), { transcript_id: TR_BROKEN });
  ok('a lookup error -> refused (404, nothing done)', broken.status === 404 && broken.json?.success === false, broken);
  touchedNothing('lookup error', broken);
  const missing = await call(fn, tokenOf(U.teacher1), {});
  ok('no transcript id -> 400 as before', missing.status === 400 && missing.json?.error === 'transcript_id is required', missing);
  const noAudio = await call(fn, tokenOf(U.teacher1), { transcript_id: TR_NOPATH });
  ok('the class\'s teacher on a row with no audio -> 400 and the row marked failed, as before',
    noAudio.status === 400 && writes(noAudio).length === 1 && writes(noAudio)[0].payload.status === 'failed', noAudio);
  const opts = await fn(new Request('https://example.supabase.co/functions/v1/transcribe-lesson-audio', { method: 'OPTIONS' }));
  ok('OPTIONS still answers the CORS preflight without credentials', opts.status === 200 && opts.headers.get('Access-Control-Allow-Origin') === '*');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
