// S2 independent review - probes for what the builder's suites do not pin
// (docs/evidence/S2-review.md). Not in run.mjs: some of these assert a
// residual the review reports, and are meant to flip when it is fixed.
//
//   node scripts/pgtest/s2-review-probes.test.mjs \
//     supabase/migrations/20261111110000_ta_standing_assignments_and_homework_upload.sql \
//     supabase/migrations/20261021090000_staff_pay_rate_history.sql \
//     supabase/migrations/20261116093000_staff_pay_not_for_every_account.sql \
//     supabase/migrations/20261116094000_teacher_storage_by_class.sql \
//     supabase/migrations/20261113140000_creator_rows_need_class_staff.sql
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { harness, makeDb, cast, rollbackBlock } from "./s2-prelude.mjs";
import { SERVICE_KEY, tokenOf, world, reset, load, call } from "./s2-fn-harness.mjs";
import { resolve } from "node:path";

const { ok, eq, done, bail } = harness("S2 review probes");
const MIGS = process.argv.slice(2);
const pick = (s) => MIGS.find((f) => f.includes(s));
const TA_MIG = pick("20261111110000"), RATE_MIG = pick("20261021090000"), F17 = pick("20261116093000"),
  F18 = pick("20261116094000"), S1F21 = pick("20261113140000");
if (!TA_MIG || !RATE_MIG || !F17 || !F18 || !S1F21) bail("usage: see the header");

// ------------------------------------------------------------------ R-1 (F-18)
// A class-A teacher may file a student_work row (S1's real policy) naming ANY
// storage path; student_work_file_staff_can then answers yes for that path,
// so the teacher reaches a class-B child's routed photo if the name is known.
console.log("=== R-1 F-18: a row in my class can name another class's file ===");
{
  const D = await makeDb(TA_MIG);
  const { q, one, exec, as } = D;
  await D.db.exec(`
    CREATE TABLE public.student_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, uploaded_by uuid,
      storage_path text, status text NOT NULL DEFAULT 'needs_review', member_student_ids uuid[] NOT NULL DEFAULT '{}');
    ALTER TABLE public.student_work ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_work TO authenticated, service_role;`);
  // S1 F-21's real helpers and student_work policies, cut from the live-recorded file.
  const s1 = readFileSync(S1F21, "utf8").replace(/\r/g, "");
  const from = s1.indexOf("-- ------------------------------------------------------------------ helpers");
  const to = s1.indexOf("-- ------------------------------------------------------------------ student_reports");
  if (from < 0 || to < 0) bail("could not cut the S1 student_work block");
  const s1err = await exec(s1.slice(from, to));
  ok("S1's real student_work helpers and policies install", s1err === null, s1err);
  const W = await cast(D);
  const { P } = W;
  const e = await exec(readFileSync(F18, "utf8"));
  ok("the F-18 fix installs", e === null, e);
  const bPath = `students/${W.B1}/general/${randomUUID()}.jpg`;
  await q(`INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('student-work', $1, $2)`, [bPath, P.TEB]);
  await q(`INSERT INTO public.student_work (student_id, class_id, uploaded_by, storage_path) VALUES ($1,$2,$3,$4)`, [W.B1, W.CB, P.TEB, bPath]);
  const before = await as(P.TEA, `SELECT count(*)::int n FROM storage.objects WHERE name = $1`, [bPath]);
  eq("teacher A cannot see class B's photo", before.rows[0]?.n, 0);
  const claim = await as(P.TEA, `INSERT INTO public.student_work (class_id, uploaded_by, storage_path, status) VALUES ($1,$2,$3,'needs_review')`,
    [W.CA, P.TEA, bPath], { keep: true });
  ok("S1's policy lets teacher A file a class-A row (no child) naming class B's path", claim.err === null && claim.n === 1, claim);
  const after = await as(P.TEA, `SELECT count(*)::int n FROM storage.objects WHERE name = $1`, [bPath]);
  const del = await as(P.TEA, `DELETE FROM storage.objects WHERE name = $1`, [bPath]);
  // FLIPPED by the S2 fix round: a students/<child>/ name needs <child> enrolled in the row's class.
  ok("R-1 FIXED: teacher A still cannot read, nor delete, class B's photo after filing that row", after.rows[0]?.n === 0 && del.n === 0, { after, del });
}

// ------------------------------------------------------------------ R-2 (F-17)
// can_view_teacher for a family: the open "lead teacher of an active class"
// branch used to answer most rows at once; now every teacher the family has
// no class with runs both EXISTS branches in full. Timed at school scale.
console.log("=== R-2 F-17: a family listing teachers, at school scale ===");
{
  const D = await makeDb(TA_MIG);
  const { q, one, exec, as } = D;
  ok("pay-rate migration", (await exec(readFileSync(RATE_MIG, "utf8"))) === null);
  await D.db.exec(`ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
    CREATE INDEX ON public.sessions (teacher_id); CREATE INDEX ON public.sessions (class_id);
    CREATE INDEX ON public.enrollments (class_id); CREATE INDEX ON public.enrollments (student_id);
    CREATE INDEX ON public.classes (default_teacher_id);`);
  ok("before (rollback block F-17)", (await exec(rollbackBlock("F-17"))) === null);
  await D.db.exec(`CREATE POLICY "Teachers visible to staff and their classes" ON public.teachers FOR SELECT TO authenticated USING (public.can_view_teacher(id, auth.uid()))`);
  const W = await cast(D);
  // 30 teachers, 3 classes each, 15 children a class, 100 lessons a class.
  await D.db.exec(`
    INSERT INTO public.teachers (full_name) SELECT 'T' || g FROM generate_series(1, 30) g;
    INSERT INTO public.classes (name, default_teacher_id)
      SELECT 'C' || g || '-' || k, t.id FROM (SELECT id, row_number() OVER () g FROM public.teachers WHERE full_name LIKE 'T%') t, generate_series(1,3) k;
    INSERT INTO public.students (full_name) SELECT 'S' || g FROM generate_series(1, 1400) g;
    INSERT INTO public.enrollments (student_id, class_id)
      SELECT s.id, c.id FROM (SELECT id, row_number() OVER () rn FROM public.students WHERE full_name LIKE 'S%') s
      JOIN (SELECT id, row_number() OVER () - 1 cn FROM public.classes WHERE name LIKE 'C%') c ON (s.rn % 90) = c.cn;
    INSERT INTO public.sessions (class_id, teacher_id, date)
      SELECT c.id, c.default_teacher_id, DATE '2026-01-01' + d FROM public.classes c, generate_series(0, 99) d WHERE c.name LIKE 'C%';
    ANALYZE;`);
  const time = async () => {
    const t0 = performance.now();
    const r = await as(W.P.PARENT, `SELECT id FROM public.teachers`);
    return { ms: Math.round(performance.now() - t0), n: r.rows.length, err: r.err };
  };
  await time();
  const b = await time();
  ok("fix installs", (await exec(readFileSync(F17, "utf8"))) === null);
  await time();
  const a = await time();
  console.log(`  INFO  family SELECT teachers: before ${b.ms} ms (${b.n} rows), after ${a.ms} ms (${a.n} rows)`);
  ok("after: the family sees only its own child's teachers", a.n === 2 && a.err === null, a);
  // FLIPPED by the S2 fix round: 20261116093000 now carries the reviewer's
  // body (driven from the caller's own children). Who sees which teacher rows
  // with it, for all 12 logins...
  const everyone = [W.P.ADMIN, W.P.TEA, W.P.TA, W.P.COVER, W.P.TEB, W.P.PARENT, W.P.KID, W.P.SECOND, W.P.PARENT2, W.P.NEW, W.P.FAKE_T, W.P.NOROLE];
  const reach = async () => { const m = []; for (const u of everyone) m.push((await as(u, `SELECT id FROM public.teachers ORDER BY id`)).rows.map((r) => r.id).join(",")); return m; };
  const M_fix = await reach();
  // ...must equal what the first S2 body (lessons x enrollments,
  // can_view_student per pair) gave, which is kept here as the reference.
  const first = await exec(`
    CREATE OR REPLACE FUNCTION public.can_view_teacher(_teacher_id uuid, _uid uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
      SELECT _uid IS NOT NULL AND (
        public.is_staff_member(_uid)
        OR EXISTS (SELECT 1 FROM public.classes c JOIN public.enrollments e ON e.class_id = c.id
                    WHERE c.default_teacher_id = _teacher_id AND public.can_view_student(e.student_id, _uid))
        OR EXISTS (SELECT 1 FROM public.sessions s JOIN public.enrollments e ON e.class_id = s.class_id
                    WHERE s.teacher_id = _teacher_id AND public.can_view_student(e.student_id, _uid))
      )
    $$;`);
  ok("the first S2 body (reference) installs", first === null, first);
  await time();
  const c = await time();
  console.log(`  INFO  first S2 body: ${c.ms} ms (${c.n} rows)`);
  eq("R-2 FIXED: every one of the 12 logins gets exactly the rows the first S2 body gave", await reach(), M_fix);
  // Timing: pglite on a busy laptop varies 2-3x run to run, so the bound is
  // loose; the first body ran ~8x the before-S2 figure and fails it.
  ok(`R-2 FIXED: the shipped body is back near the before-S2 figure (${a.ms} ms vs ${b.ms} ms; bound 3x + 250 ms)`, a.ms <= 3 * b.ms + 250, { before: b.ms, after: a.ms, first: c.ms });
}

// ------------------------------------------------------------------ R-3 (F-13)
// update-student-avatar: the bytes are checked, AND the browser's declared
// type must equal them. A real image whose declared type disagrees (a .jpg
// that is really WebP) and an iPhone/Mac HEIC are refused.
console.log("=== R-3 F-13: avatar uploads the app can send ===");
{
  const h = await load("update-student-avatar", readFileSync(resolve("supabase/functions/update-student-avatar/index.ts"), "utf8"));
  const U = { admin: "u-admin" };
  world.users[U.admin] = { id: U.admin, email: "a@example.test" };
  const base = () => ({ user_roles: [{ user_id: U.admin, role: "admin" }], students: [{ id: "A1", avatar_url: null, full_name: "A1" }] });
  const form = (bytes, type, name) => { const fd = new FormData(); fd.append("file", new File([new Uint8Array(bytes)], name, { type })); fd.append("studentId", "A1"); return fd; };
  const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3];
  const WEBP = [0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3];
  const HEIC = [0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0];
  const run = async (l, bytes, type, name) => {
    reset(base());
    const r = await call(h, "update-student-avatar", { token: tokenOf(U.admin), form: form(bytes, type, name) });
    return { l, status: r.status, stored: world.log.some((e) => e.storage === "upload"), error: r.json?.error };
  };
  const jpg = await run("JPEG from iPhone Safari (HEIC converted)", JPEG, "image/jpeg", "image.jpg");
  ok("a JPEG as iPhone Safari sends it is accepted", jpg.status === 200 && jpg.stored, jpg);
  const jpgAlias = await run("JPEG declared image/jpg", JPEG, "image/jpg", "a.jpg");
  ok("image/jpg is accepted as JPEG", jpgAlias.status === 200 && jpgAlias.stored, jpgAlias);
  // FLIPPED by the S2 fix round (R-3): the bytes decide, the browser's label does not.
  const mis = await run("WebP bytes named .jpg", WEBP, "image/jpeg", "saved.jpg");
  const misUp = world.log.find((e) => e.storage === "upload");
  ok("R-3 FIXED: a real WebP the browser labels image/jpeg is stored, as image/webp .webp", mis.status === 200 && mis.stored && misUp?.contentType === "image/webp" && /\.webp$/.test(misUp?.p ?? ""), { mis, misUp });
  const heic = await run("HEIC from Files / a Mac", HEIC, "image/heic", "IMG_0001.HEIC");
  ok("R-3 FIXED: a HEIC file is refused (400) with its own message, nothing stored", heic.status === 400 && !heic.stored && /HEIC format/.test(heic.error ?? ""), heic);
  const heicNoType = await run("HEIC with no declared type", HEIC, "", "IMG_0002");
  ok("R-3 FIXED: so is a HEIC with no declared type", heicNoType.status === 400 && /HEIC format/.test(heicNoType.error ?? ""), heicNoType);
  const empty = await run("JPEG with no declared type", JPEG, "", "photo");
  ok("R-3 FIXED: a JPEG with an empty declared type is stored (as image/jpeg)", empty.status === 200 && empty.stored, empty);
}

// ------------------------------------------------------------------ R-4 (F-03)
// word-enrichment's only browser caller always sends the sentence.
console.log("=== R-4 F-03: the cache and its one caller ===");
{
  const we = readFileSync(resolve("src/components/vocabulary/WordExplorer.tsx"), "utf8");
  ok("WordExplorer sends context whenever the child typed a sentence (it always has: words are picked from it)",
    /invoke\("word-enrichment",\s*\{\s*body:\s*\{\s*word,\s*context:\s*sentence \|\| undefined/.test(we));
  const fn = readFileSync(resolve("supabase/functions/word-enrichment/index.ts"), "utf8");
  ok("with a context the function neither reads nor writes vocab_cache", /const shared = cleanContext === ""/.test(fn) && /!shared \? \{ data: null \}/.test(fn) && /if \(sb && shared\)/.test(fn));
  console.log("  INFO  => after F-03 every word a child clicks is an OpenAI call and the shared cache stops filling (cost / latency, not a hole)");
}
void SERVICE_KEY;
done();
