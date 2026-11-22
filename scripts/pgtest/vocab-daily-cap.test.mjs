// Vocabulary: the 10-a-day cap and the word-bank guard
// (supabase/migrations/20261122150000_vocab_daily_cap.sql), and the level rule
// and checker reading (supabase/functions/_lib/vocab-level.ts).
//
// What this suite holds:
//   1. The cap. vocab_claim_daily_save claims at most 10 distinct words per
//      account per Hanoi day; the 11th is refused; the same word again reuses
//      its claim; another account has its own 10. A deleted word keeps its
//      slot (delete-and-save-again does not free one); release gives a slot
//      back only when the word did not get saved. The day is Hanoi's, not UTC.
//      The claim takes an advisory lock (parallel taps queue).
//   2. Who can call what. The claim and release are service role only; the
//      page's counter (vocab_saves_today) counts only the caller's own.
//   3. The word bank. A signed-in person cannot INSERT a word, nor change its
//      word, level, definition, enrichment or sentences; they can change the
//      picture, their Vietnamese meaning and the practice fields. The service
//      role (save-word) and a SECURITY DEFINER function pass.
//   4. It installs twice, and today's saves from before it count.
//   5. save-word claims through the database and reads the level rule; the
//      page reads vocab_saves_today; the word bank edits sentences through
//      save-word.
//   6. The level rule and the checker reading (vocab-level.ts).
import { PGlite } from '@electric-sql/pglite';
import { transform } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const read = (...p) => readFileSync(join(repo, ...p), 'utf8');
const MIG = read('supabase', 'migrations', '20261122150000_vocab_daily_cap.sql');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 600)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const KID = U(1), KID2 = U(2);
const BASE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
  GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
  CREATE TABLE public.student_vocabulary_entries(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, student_id uuid, class_id uuid,
    word text NOT NULL, root_word text, cefr text, definition_en text, definition_vi text,
    user_examples text[] DEFAULT '{}', enrichment jsonb, image_url text,
    mastery_level int DEFAULT 0, next_review_date timestamptz, times_reviewed int DEFAULT 0,
    times_correct int DEFAULT 0, last_reviewed_at timestamptz,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
  ALTER TABLE public.student_vocabulary_entries ENABLE ROW LEVEL SECURITY;
  CREATE POLICY own_all ON public.student_vocabulary_entries FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_vocabulary_entries TO authenticated;
  GRANT ALL ON public.student_vocabulary_entries TO service_role;
  CREATE TABLE public.vocab_activity_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, student_id uuid,
    class_id uuid, word text, activity_type text, points_awarded int, created_at timestamptz DEFAULT now());
  -- A SECURITY DEFINER writer, like claim_vocab_for_student.
  CREATE FUNCTION public.definer_rename(p_id uuid, p_word text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
    AS $f$ UPDATE public.student_vocabulary_entries SET word = p_word WHERE id = p_id $f$;
  GRANT EXECUTE ON FUNCTION public.definer_rename(uuid, text) TO authenticated;
`;

const db = new PGlite();
await db.exec(BASE);
// A save made earlier today (Hanoi) by KID, before the migration.
await db.query(`INSERT INTO public.vocab_activity_log(user_id, word, activity_type, created_at) VALUES ($1, 'Early', 'save', now())`, [KID]);
await db.exec(MIG);
await db.exec(MIG);
ok('installs twice', true);

const as = async (role, uid, fn) => {
  await db.exec(`SET ROLE ${role}`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uid ?? '']);
  try { return await fn(); } finally { await db.exec('RESET ROLE'); }
};
const claim = (uid, word, limit = 10) => as('service_role', null, async () =>
  (await db.query(`SELECT public.vocab_claim_daily_save($1, $2, $3) AS r`, [uid, word, limit])).rows[0].r);

console.log('\n1. the cap');
{
  const before = await as('service_role', null, async () => (await db.query(`SELECT public.count_vocab_saves_today($1) AS n`, [KID])).rows[0].n);
  ok("today's save from before the migration counts", before === 1, before);
  const early = await claim(KID, 'early');
  ok('the same word again today reuses its claim', early.ok === true && early.reused === true && early.saves_today === 1, early);
  const results = [];
  for (let i = 0; i < 12; i++) results.push(await claim(KID, `word${i}`));
  const granted = results.filter((r) => r.ok).length;
  ok('ten distinct words a day in all, then refused', granted === 9 && results[9].ok === false && results[11].ok === false, results.map((r) => r.ok));
  ok('a refusal reports the count and the limit', results[10].saves_today === 10 && results[10].limit === 10, results[10]);
  const again = await claim(KID, 'WORD3 ');
  ok('a claimed word (any case, spaces) still saves after the cap', again.ok === true && again.reused === true, again);
  const other = await claim(KID2, 'word0');
  ok('another account has its own ten', other.ok === true && other.saves_today === 1, other);
  ok('the claim takes an advisory lock per account', /pg_advisory_xact_lock\(hashtextextended\('vocab_daily_saves:'/.test(MIG));
  ok('the day is Hanoi\'s', /now\(\) AT TIME ZONE 'Asia\/Ho_Chi_Minh'/.test(MIG) && !/AT TIME ZONE 'UTC'/.test(MIG));

  // release: only when the word did not get saved
  await as('service_role', null, () => db.query(`INSERT INTO public.student_vocabulary_entries(user_id, word) VALUES ($1, 'word0')`, [KID]));
  await as('service_role', null, () => db.query(`SELECT public.vocab_release_daily_save($1, 'word0')`, [KID]));
  await as('service_role', null, () => db.query(`SELECT public.vocab_release_daily_save($1, 'word1')`, [KID]));
  const n = await as('service_role', null, async () => (await db.query(`SELECT public.count_vocab_saves_today($1) AS n`, [KID])).rows[0].n);
  ok('release frees an unsaved word and keeps a saved one', n === 9, n);
  // delete the saved word: its slot stays taken
  await as('service_role', null, () => db.query(`DELETE FROM public.student_vocabulary_entries WHERE user_id = $1 AND word = 'word0'`, [KID]));
  const n2 = await as('service_role', null, async () => (await db.query(`SELECT public.count_vocab_saves_today($1) AS n`, [KID])).rows[0].n);
  ok('deleting a word does not free its slot', n2 === 9, n2);
  const back = await claim(KID, 'word0');
  ok('saving the deleted word again reuses its own slot', back.ok === true && back.reused === true, back);
  const yesterday = await db.query(`INSERT INTO public.vocab_daily_saves(user_id, hanoi_day, word) VALUES ($1, public.vocab_hanoi_today() - 1, 'old') RETURNING 1`, [KID2]);
  const k2 = await as('service_role', null, async () => (await db.query(`SELECT public.count_vocab_saves_today($1) AS n`, [KID2])).rows[0].n);
  ok("yesterday's claims do not count today", yesterday.rows.length === 1 && k2 === 1, k2);
}

console.log('\n2. who can call what');
{
  const e1 = await as('authenticated', KID, () => tryIt(() => db.query(`SELECT public.vocab_claim_daily_save($1, 'x', 100)`, [KID])));
  ok('a signed-in person cannot claim (or raise the limit)', e1?.code === '42501', e1);
  const e2 = await as('authenticated', KID, () => tryIt(() => db.query(`SELECT public.vocab_release_daily_save($1, 'word2')`, [KID])));
  ok('a signed-in person cannot release a slot', e2?.code === '42501', e2);
  const e3 = await as('authenticated', KID, () => tryIt(() => db.query(`DELETE FROM public.vocab_daily_saves WHERE user_id = $1`, [KID])));
  ok('a signed-in person cannot delete their claims', e3?.code === '42501', e3);
  const mine = await as('authenticated', KID, async () => (await db.query(`SELECT public.vocab_saves_today() AS n`)).rows[0].n);
  const theirs = await as('authenticated', KID2, async () => (await db.query(`SELECT public.vocab_saves_today() AS n`)).rows[0].n);
  ok('the page counter counts only the caller\'s own', mine === 9 && theirs === 1, { mine, theirs });
}

console.log('\n3. the word bank');
{
  const e1 = await as('authenticated', KID, () => tryIt(() => db.query(
    `INSERT INTO public.student_vocabulary_entries(user_id, word) VALUES ($1, 'sneaky')`, [KID])));
  ok('a signed-in person cannot insert a word', e1?.code === '42501' && /Save word/.test(e1.message), e1);
  const { rows: [row] } = await as('service_role', null, () => db.query(
    `INSERT INTO public.student_vocabulary_entries(user_id, word, cefr, user_examples) VALUES ($1, 'river', 'A2', ARRAY['The river is long.']) RETURNING id`, [KID]));
  ok('the service role (save-word) inserts', !!row?.id);
  for (const [col, val] of [['word', "'lake'"], ['cefr', "'C2'"], ['definition_en', "'x'"], ['enrichment', `'{}'::jsonb`],
    ['user_examples', "ARRAY['zzz']"], ['root_word', "'lak'"], ['class_id', 'gen_random_uuid()']]) {
    const e = await as('authenticated', KID, () => tryIt(() => db.query(`UPDATE public.student_vocabulary_entries SET ${col} = ${val} WHERE id = $1`, [row.id])));
    ok(`a signed-in person cannot change ${col}`, e?.code === '42501', e);
  }
  const fine = await as('authenticated', KID, () => tryIt(() => db.query(
    `UPDATE public.student_vocabulary_entries SET image_url = 'https://x/y.png', definition_vi = 'sông', mastery_level = 2,
       times_reviewed = 3, times_correct = 2, last_reviewed_at = now(), next_review_date = now() WHERE id = $1`, [row.id])));
  ok('they can change the picture, their meaning and practice fields', fine === null, fine);
  const definer = await as('authenticated', KID, () => tryIt(() => db.query(`SELECT public.definer_rename($1, 'stream')`, [row.id])));
  ok('a SECURITY DEFINER function passes', definer === null, definer);
  const svc = await as('service_role', null, () => tryIt(() => db.query(`UPDATE public.student_vocabulary_entries SET user_examples = ARRAY['A new one here.'] WHERE id = $1`, [row.id])));
  ok('the service role changes sentences', svc === null, svc);
  const del = await as('authenticated', KID, () => tryIt(() => db.query(`DELETE FROM public.student_vocabulary_entries WHERE id = $1`, [row.id])));
  ok('they can still delete their own word', del === null, del);
}

console.log('\n5. the callers');
{
  const sw = read('supabase', 'functions', 'save-word', 'index.ts');
  ok('save-word claims through the database', /rpc\("vocab_claim_daily_save"/.test(sw));
  ok('save-word releases a claim when the insert fails', /if \(claimed\) await releaseDailySave/.test(sw));
  ok('save-word no longer counts on the UTC day itself', !/setUTCHours/.test(sw));
  ok('save-word decides the level with levelVerdict, not the model', /levelVerdict\(wordLevel, childLevel\)/.test(sw));
  ok('save-word is behind the spend gate', /requireSpender\(req, corsHeaders, GATE\)/.test(sw));
  ok('save-word awaits the activity log', /const \{ error: logErr \} = await sb\.from\("vocab_activity_log"\)/.test(sw));
  const we = read('src', 'components', 'vocabulary', 'WordExplorer.tsx');
  ok('the page counter reads vocab_saves_today', /rpc\("vocab_saves_today"/.test(we) && !/count_vocab_saves_today" as never/.test(we));
  const store = read('src', 'hooks', 'useVocabularyStore.ts');
  ok('the word bank edits sentences through save-word', /functions\.invoke\("save-word"/.test(store) && !/dbPatch\.user_examples/.test(store));
  const wordEnrich = read('supabase', 'functions', 'word-enrichment', 'index.ts');
  ok('word-enrichment asks Claude first; OpenAI only when Claude fails', /askClaudeCheap/.test(wordEnrich) && wordEnrich.indexOf('askClaudeCheap<any>') < wordEnrich.indexOf('parsed = await openAiFallback'));
  const noClientInsert = !/from\("student_vocabulary_entries"\)\s*\n?\s*\.insert/.test(store + we);
  ok('no browser code inserts into the word bank', noClientInsert);
}

console.log('\n6. the level rule and the checker reading');
{
  const lib = read('supabase', 'functions', '_lib', 'vocab-level.ts');
  ok('vocab-level.ts imports nothing', !/^\s*import\s/m.test(lib));
  const out = join(mkdtempSync(join(tmpdir(), 'vocab-level-')), 'vocab-level.mjs');
  writeFileSync(out, (await transform(lib, { loader: 'ts', format: 'esm' })).code);
  const { baseLevel, levelVerdict, levelBand, readCheck } = await import(pathToFileURL(out).href);
  ok('levels read loosely', baseLevel('a2+') === 'A2' && baseLevel('Pre-A1') === 'Pre-A1' && baseLevel('B1+') === 'B1' && baseLevel('x') === null && baseLevel(null) === null);
  const cases = [
    ['A1', 'A2', 'ok'], ['A2', 'A2', 'ok'], ['B1', 'A2', 'ok'], ['B2', 'A2', 'too_hard'], ['C1', 'A1', 'too_hard'],
    ['A1', 'B1', 'too_easy'], ['A2', 'B1', 'ok'], ['Pre-A1', 'A1', 'ok'], ['A2', 'Pre-A1', 'too_hard'], ['A1', 'Pre-A1', 'ok'],
  ];
  for (const [w, s, v] of cases) ok(`a ${w} word for a ${s} child: ${v}`, levelVerdict(w, s) === v, levelVerdict(w, s));
  ok('the band is named', levelBand('A2') === 'A1 to B1' && levelBand('C2') === 'C1 to C2');
  const r = readCheck({ word_cefr: 'B1', sentences: [{ n: 2, ok: true, reason: '' }, { n: 1, ok: false, reason: 'Wrong meaning.' }, { n: 9, ok: true }] }, 3);
  ok('the checker is read by sentence number', r.wordLevel === 'B1' && r.sentences[0].ok === false && r.sentences[0].reason === 'Wrong meaning.' && r.sentences[1].ok === true, r);
  ok('a sentence the checker left out is not accepted', r.sentences[2].ok === false, r.sentences[2]);
  const junk = readCheck('nonsense', 2);
  ok('an unreadable answer accepts nothing and has no level', junk.wordLevel === null && junk.sentences.every((s) => !s.ok), junk);
  const dup = readCheck({ word_cefr: 'A1', sentences: [{ n: 1, ok: false }, { n: 1, ok: true }] }, 1);
  ok('a repeated sentence number keeps the first answer', dup.sentences[0].ok === false, dup);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
