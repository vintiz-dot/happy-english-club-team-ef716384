// Attendance streaks (docs/evidence/FIX-streaks-bank-uploads.md, item 1).
//
// The real supabase/functions/_lib/attendance-effects.ts runs against a real
// Postgres (pglite) through a small stand-in for the PostgREST calls it
// makes, over tables shaped like production's where it matters:
// point_transactions.date is NOT NULL with NO default (as on live; the
// migration that added it had a default, live does not), month has one.
// Then 20261116091000 (the unique bonus index and the Late streak job), the
// repair script (dry run, back-pay, rebuilt counters) on a hand-computed
// fixture and against the TS rule, and the live code after it.
//
//   node scripts/pgtest/attendance-streaks.test.mjs <20261116091000...sql> <REPAIR...sql>
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { transform } from "esbuild";

const argv = process.argv.slice(2);
const MIG = argv.find((f) => f.includes("attendance_streak_rule"));
const REPAIR = argv.find((f) => f.includes("REPAIR-attendance-streaks"));
if (!MIG || !REPAIR) {
  console.log("usage: attendance-streaks.test.mjs <20261116091000_attendance_streak_rule.sql> <REPAIR-attendance-streaks.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = resolve(tmpdir(), `attendanceEffects.streaks.${process.pid}.mjs`);
writeFileSync(out, (await transform(readFileSync(resolve(repo, "supabase/functions/_lib/attendance-effects.ts"), "utf8"),
  { loader: "ts", format: "esm" })).code);
const fx = await import(pathToFileURL(out).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TYPE public.attendance_status AS ENUM ('Present','Absent','Excused','Late');
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id),
    date date NOT NULL, start_time time NOT NULL DEFAULT '17:00', status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    student_id uuid NOT NULL REFERENCES public.students(id), status public.attendance_status NOT NULL, marked_by uuid,
    UNIQUE (session_id, student_id));
  -- As live has it: date NOT NULL and no default; month defaulted.
  CREATE TABLE public.point_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    points integer NOT NULL, type text NOT NULL CHECK (type IN ('homework','participation','adjustment','correction')),
    date date NOT NULL, month text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, homework_id uuid, homework_title text,
    session_id uuid REFERENCES public.sessions(id), notes text);
  -- 20260108172011
  CREATE TABLE public.student_attendance_streaks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    consecutive_days integer DEFAULT 0, last_attendance_date date, bonuses_awarded integer DEFAULT 0,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE (student_id, class_id));
  -- 20261028090000 section 8
  CREATE TABLE public.stars_sync_effects (id bigserial PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('tuition', 'streak')), dedupe_key text NOT NULL UNIQUE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE, session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
    lesson_date date, month text, attempts integer NOT NULL DEFAULT 0, last_error text,
    queued_at timestamptz NOT NULL DEFAULT now(), generation integer NOT NULL DEFAULT 0,
    CONSTRAINT stars_sync_effects_shape CHECK ((kind = 'tuition' AND month ~ '^[0-9]{4}-[0-9]{2}$')
      OR (kind = 'streak' AND class_id IS NOT NULL AND session_id IS NOT NULL)));
  CREATE FUNCTION public.stars_sync__queue_tuition(p_student uuid, p_month text) RETURNS void
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $f$
    INSERT INTO public.stars_sync_effects (kind, dedupe_key, student_id, month)
    VALUES ('tuition', 'tuition:' || p_student || ':' || p_month, p_student, p_month)
    ON CONFLICT (dedupe_key) DO UPDATE SET generation = public.stars_sync_effects.generation + 1 $f$;
`;
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);

// ------------------------------------------------ a PostgREST stand-in
// Exactly the calls advanceStreaks makes: select with eq / in / like, the
// attendance read embedding its lesson (sessions!inner), insert, upsert.
const hooks = { fail: new Set(), emptyPaidRead: false, inserts: 0 };
const asError = (e) => ({ message: e.message, code: e.code ?? null });
class Query {
  constructor(table) { this.table = table; this.filters = []; this.cols = "*"; }
  select(cols) { this.cols = cols; return this; }
  eq(c, v) { this.filters.push([c, "=", v]); return this; }
  in(c, v) { this.filters.push([c, "in", v]); return this; }
  like(c, v) { this.filters.push([c, "like", v]); return this; }
  where(alias, embedAlias) {
    const params = [];
    const parts = this.filters.map(([c, op, v]) => {
      const col = c.startsWith("sessions.") ? `${embedAlias}.${c.slice(9)}` : `${alias}.${c}`;
      if (op === "in") { params.push(v); return `${col}::text = ANY($${params.length}::text[])`; }
      params.push(v);
      return op === "like" ? `${col} LIKE $${params.length}` : `${col}::text = $${params.length}::text`;
    });
    return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
  }
  async run() {
    if (hooks.fail.has(`${this.table}:select`)) return { data: null, error: { message: "read failed" } };
    if (this.table === "point_transactions" && hooks.emptyPaidRead) return { data: [], error: null };
    try {
      if (this.table === "attendance" && /sessions!inner\(/.test(this.cols)) {
        const w = this.where("a", "s");
        const rows = await q(`SELECT a.session_id, a.status::text AS status,
            json_build_object('id', s.id, 'class_id', s.class_id, 'date', s.date::text,
                              'start_time', s.start_time::text, 'status', s.status::text) AS sessions
          FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id ${w.sql}`, w.params);
        return { data: rows, error: null };
      }
      const cols = this.cols === "*" ? "*" : this.cols.split(",").map((c) => `t.${c.trim()}`).join(", ");
      const w = this.where("t", "t");
      return { data: await q(`SELECT ${cols} FROM public.${this.table} t ${w.sql}`, w.params), error: null };
    } catch (e) { return { data: null, error: asError(e) }; }
  }
  then(res, rej) { return this.run().then(res, rej); }
  async insert(row) {
    if (hooks.fail.has(`${this.table}:insert`)) return { error: { message: "insert refused" } };
    const rows = Array.isArray(row) ? row : [row];
    try {
      for (const r of rows) {
        const keys = Object.keys(r);
        await q(`INSERT INTO public.${this.table} (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
          keys.map((k) => r[k]));
        hooks.inserts += 1;
      }
      return { error: null };
    } catch (e) { return { error: asError(e) }; }
  }
  async upsert(rows, { onConflict }) {
    if (hooks.fail.has(`${this.table}:upsert`)) return { error: { message: "write failed" } };
    try {
      for (const r of rows) {
        const keys = Object.keys(r);
        const conflict = onConflict.split(",").map((s) => s.trim());
        await q(`INSERT INTO public.${this.table} (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})
                 ON CONFLICT (${conflict.join(", ")}) DO UPDATE SET ${keys.filter((k) => !conflict.includes(k)).map((k) => `${k} = EXCLUDED.${k}`).join(", ")}`,
          keys.map((k) => r[k]));
      }
      return { error: null };
    } catch (e) { return { error: asError(e) }; }
  }
}
const invoked = [];
const sb = { from: (t) => new Query(t), functions: { invoke: async (name, { body }) => { invoked.push({ name, body }); return { data: null, error: null }; } } };

// ------------------------------------------------ fixture helpers
const klass = async () => (await one(`INSERT INTO public.classes (name) VALUES ('c') RETURNING id`)).id;
const kid = async () => (await one(`INSERT INTO public.students (full_name) VALUES ('k') RETURNING id`)).id;
const lesson = async (cls, date, { start = "17:00", status = "Held" } = {}) =>
  (await one(`INSERT INTO public.sessions (class_id, date, start_time, status) VALUES ($1,$2,$3,$4) RETURNING id`, [cls, date, start, status])).id;
const mark = async (session, student, status) =>
  q(`INSERT INTO public.attendance (session_id, student_id, status) VALUES ($1,$2,$3)
     ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status`, [session, student, status]);
const streak = async (student, cls) =>
  one(`SELECT consecutive_days c, last_attendance_date::text d, bonuses_awarded b FROM public.student_attendance_streaks WHERE student_id = $1 AND class_id = $2`, [student, cls]);
const bonuses = async (student) =>
  q(`SELECT points, type, date::text, month, session_id, notes FROM public.point_transactions WHERE student_id = $1 ORDER BY date`, [student]);
// What mark-attendance does after saving the register: afterAttendanceMarked
// with the lesson's class, date and id.
const markAndRun = async (cls, session, date, student, status) => {
  await mark(session, student, status);
  await fx.afterAttendanceMarked(sb, { classId: cls, date, sessionId: session, entries: [{ studentId: student, status }] });
};
// What the drain does for a queued streak job.
const drain = (cls, session, date, students) =>
  fx.advanceStreaks(sb, { classId: cls, sessionId: session, lessonDate: date, entries: students.map((studentId) => ({ studentId, status: "Present" })) });

console.log("=== the prelude reproduces live ===");
{
  const C = await klass(), K = await kid();
  let err = null;
  try {
    // The shape advanceStreaks used to insert: no date.
    await q(`INSERT INTO public.point_transactions (student_id, class_id, points, type, notes) VALUES ($1,$2,50,'participation','Attendance streak bonus: 5 consecutive classes attended!')`, [K, C]);
  } catch (e) { err = e.code; }
  eq("the old bonus row (no date) is refused, as every bonus was on live", err, "23502");
}

console.log("=== the rule, pure ===");
{
  const M = (sessionId, date, status, extra = {}) => ({ sessionId, date, status, startTime: "17:00:00", sessionStatus: "Held", ...extra });
  const reg = [M("a", "2026-11-02", "Present"), M("b", "2026-11-04", "Late"), M("c", "2026-11-06", "Excused"),
               M("d", "2026-11-09", "Absent"), M("e", "2026-11-11", "Present"), M("f", "2026-11-13", "Present", { sessionStatus: "Canceled" }),
               M("g", "2026-11-16", null)];
  eq("Absent breaks, Excused / cancelled / unmarked are passed over", [fx.streakRun(reg).run, fx.streakRun(reg).lastAttended], [1, "2026-11-11"]);
  eq("  read up to a lesson, inclusive", [fx.streakRun(reg, "c").run, fx.streakRun(reg, "b").run, fx.streakRun(reg, "d").run], [2, 2, 0]);
  eq("  the latest attended date survives an absence after it", fx.streakRun(reg, "d").lastAttended, "2026-11-04");
  eq("  a lesson not in the register is not found", fx.streakRun(reg, "zz").found, false);
  eq("  a cancelled lesson never owes a bonus", fx.streakRun(reg, "f").boundAttended, false);
  eq("the order of the input does not matter", fx.streakRun([...reg].reverse()).run, 1);
  const sameDay = [M("x2", "2026-11-02", "Present", { startTime: "18:00:00" }), M("x1", "2026-11-02", "Absent", { startTime: "08:00:00" })];
  eq("two lessons on one day are ordered by start time", fx.streakRun(sameDay).run, 1);
  // Only Held lessons take part (conductor's live counts: 734 placeholder
  // 'Present' rows on future Scheduled lessons, 29 'Present' + 5 'Excused'
  // on past lessons still Scheduled).
  const held4 = ["h1", "h2", "h3", "h4"].map((id, i) => M(id, `2026-11-0${i + 1}`, "Present"));
  const future = ["f1", "f2", "f3"].map((id, i) => M(id, `2026-12-0${i + 1}`, "Present", { sessionStatus: "Scheduled" }));
  eq("future Scheduled placeholders do not lengthen the run", [fx.streakRun([...held4, ...future]).run, fx.streakRun([...held4, ...future]).lastAttended], [4, "2026-11-04"]);
  eq("  and never owe a bonus (the 5th mark is a future placeholder)", fx.streakBonusDue(fx.streakRun([...held4, ...future], "f1")), false);
  const pastSched = (status) => M("ps", "2026-11-03", status, { startTime: "18:00:00", sessionStatus: "Scheduled" });
  eq("a past lesson still Scheduled, marked Present, does not count", fx.streakRun([...held4, pastSched("Present")]).run, 4);
  eq("  marked Absent, does not break", fx.streakRun([...held4, pastSched("Absent")]).run, 4);
  eq("a Held lesson after today (by the clock) is left out of the current run",
     fx.streakRun([...held4, M("h9", "2099-01-01", "Absent")], null, { today: "2026-11-16" }).run, 4);
  eq("  and an Absent after the processed lesson never matters to it", fx.streakRun([...held4, M("h5", "2026-11-05", "Absent")], "h4").run, 4);
}

console.log("=== mark-attendance: five lessons, one bonus, dated by the lesson ===");
const C = await klass(), APPLE = await kid();
const dates = ["2026-10-27", "2026-10-29", "2026-11-03", "2026-11-05", "2026-11-10", "2026-11-12", "2026-11-14"];
const L = [];
for (const d of dates) L.push(await lesson(C, d));
for (let i = 0; i < 4; i++) await markAndRun(C, L[i], dates[i], APPLE, "Present");
eq("four lessons: a run of 4, no bonus", [await streak(APPLE, C), (await bonuses(APPLE)).length], [{ c: 4, d: "2026-11-05", b: 0 }, 0]);
await markAndRun(C, L[4], dates[4], APPLE, "Present");
{
  const b = await bonuses(APPLE);
  eq("the fifth pays 50 points, once", b.length, 1);
  eq("  with the lesson's date and month - the column live refused without", [b[0]?.date, b[0]?.month], ["2026-11-10", "2026-11"]);
  eq("  linked to the lesson, type participation, the same wording",
     [b[0]?.points, b[0]?.type, b[0]?.session_id, b[0]?.notes], [50, "participation", L[4], "Attendance streak bonus: 5 consecutive classes attended!"]);
  eq("  the streak row reads 5, one milestone", await streak(APPLE, C), { c: 5, d: "2026-11-10", b: 1 });
}

console.log("=== retries and late lessons cannot inflate it ===");
for (let i = 0; i < 100; i++) await drain(C, L[4], dates[4], [APPLE]);
eq("the same lesson worked 100 more times (the drain's retry): still 5", await streak(APPLE, C), { c: 5, d: "2026-11-10", b: 1 });
eq("  and still one bonus", (await bonuses(APPLE)).length, 1);
eq("an older lesson processed late changes nothing", [await drain(C, L[1], dates[1], [APPLE]), await streak(APPLE, C)], [true, { c: 5, d: "2026-11-10", b: 1 }]);
eq("  and pays nothing (it was lesson 2 of the run)", (await bonuses(APPLE)).length, 1);
await markAndRun(C, L[5], dates[5], APPLE, "Late");
eq("Late counts", await streak(APPLE, C), { c: 6, d: "2026-11-12", b: 1 });
await markAndRun(C, L[6], dates[6], APPLE, "Absent");
eq("Absent resets the run (the latest attended date stays)", await streak(APPLE, C), { c: 0, d: "2026-11-12", b: 0 });
eq("  no bonus for an absence", (await bonuses(APPLE)).length, 1);
eq("  and the Absent still recalculates tuition, as before",
   invoked.filter((c) => c.body.studentId === APPLE).map((c) => c.body.month), ["2026-11"]);
await markAndRun(C, L[6], dates[6], APPLE, "Excused");
eq("re-marked Excused, the absence no longer breaks it", await streak(APPLE, C), { c: 6, d: "2026-11-12", b: 1 });
eq("  and the earlier bonus is not paid again", (await bonuses(APPLE)).length, 1);

console.log("=== only Held lessons take part: Scheduled placeholders neither count nor break ===");
{
  const C7 = await klass(), K = await kid();
  // Four lessons taught (Held, placeholder marks as billing has them), a
  // past lesson nobody turned to Held with an 'Absent', and the seeded
  // 'Present' placeholders on three future lessons.
  const taught = [];
  for (const d of ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"]) { const s = await lesson(C7, d); taught.push(s); await mark(s, K, "Present"); }
  const stale = await lesson(C7, "2026-09-11", { status: "Scheduled" });
  await mark(stale, K, "Absent");
  const next = await lesson(C7, "2026-09-14", { status: "Scheduled" });
  const futures = [];
  for (const d of ["2027-01-04", "2027-01-05", "2027-01-06"]) { const s = await lesson(C7, d, { status: "Scheduled" }); futures.push(s); await mark(s, K, "Present"); }
  for (const f of futures) await drain(C7, f, null, [K]);
  eq("working the future placeholders pays nothing", (await bonuses(K)).length, 0);
  await drain(C7, taught[3], "2026-09-10", [K]);
  eq("  the run is the four taught lessons: the future ones do not lengthen it, the stale Absent does not break it",
     await streak(K, C7), { c: 4, d: "2026-09-10", b: 0 });
  // mark-attendance turns the lesson Held, then runs the effects.
  await q(`UPDATE public.sessions SET status = 'Held' WHERE id = $1 AND status = 'Scheduled'`, [next]);
  await markAndRun(C7, next, "2026-09-14", K, "Present");
  const b = await bonuses(K);
  eq("the fifth TAUGHT lesson pays, on that lesson - not the run of 8 the placeholders would make",
     [b.length, b[0]?.session_id, b[0]?.notes], [1, next, "Attendance streak bonus: 5 consecutive classes attended!"]);
  eq("  and the counter reads 5", await streak(K, C7), { c: 5, d: "2026-09-14", b: 1 });
}

console.log("=== Excused and cancelled lessons neither count nor break ===");
{
  const C2 = await klass(), K = await kid();
  const plan = [["2026-10-01", "Present"], ["2026-10-02", "Present"], ["2026-10-03", "Excused"], ["2026-10-04", "Present", "Canceled"],
                ["2026-10-05", "Present"], ["2026-10-06", "Late"], ["2026-10-07", "Present"]];
  const S = [];
  for (const [d, st, sess] of plan) {
    const s = await lesson(C2, d, { status: sess ?? "Held" });
    S.push(s);
    await mark(s, K, sess === "Canceled" ? "Excused" : st);
  }
  for (let i = 0; i < S.length; i++) await drain(C2, S[i], plan[i][0], [K]);
  eq("P P E (cancelled) P L P is a run of 5", await streak(K, C2), { c: 5, d: "2026-10-07", b: 1 });
  const b = await bonuses(K);
  eq("  the bonus is on the lesson that made it 5", [b.length, b[0]?.session_id, b[0]?.date], [1, S[6], "2026-10-07"]);
}

console.log("=== failure keeps the job; the retry pays once ===");
{
  const C3 = await klass(), K = await kid();
  const S = [];
  for (const d of ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]) { const s = await lesson(C3, d); S.push(s); await mark(s, K, "Present"); }
  hooks.fail.add("point_transactions:insert");
  eq("a refused bonus fails the step, so the drain keeps it", await drain(C3, S[4], "2026-09-05", [K]), false);
  eq("  the streak row is still right", await streak(K, C3), { c: 5, d: "2026-09-05", b: 1 });
  hooks.fail.delete("point_transactions:insert");
  eq("the retry succeeds and pays", [await drain(C3, S[4], "2026-09-05", [K]), (await bonuses(K)).length], [true, 1]);
  eq("another retry pays nothing more", [await drain(C3, S[4], "2026-09-05", [K]), (await bonuses(K)).length], [true, 1]);

  hooks.fail.add("point_transactions:select");
  const before = hooks.inserts;
  eq("not knowing what was paid, it pays nothing and keeps the job", [await drain(C3, S[4], "2026-09-05", [K]), hooks.inserts - before], [false, 0]);
  hooks.fail.delete("point_transactions:select");

  hooks.fail.add("attendance:select");
  await q(`UPDATE public.student_attendance_streaks SET consecutive_days = 3 WHERE student_id = $1`, [K]);
  eq("a register that cannot be read fails the step and writes nothing", [await drain(C3, S[4], "2026-09-05", [K]), (await streak(K, C3)).c], [false, 3]);
  hooks.fail.delete("attendance:select");
  await drain(C3, S[4], "2026-09-05", [K]);

  eq("no lesson given: nothing is written, and the job is kept",
     [await fx.advanceStreaks(sb, { classId: C3, entries: [{ studentId: K, status: "Present" }] }), hooks.inserts - before], [false, 0]);
  eq("no class: nothing to do", await fx.advanceStreaks(sb, { classId: null, sessionId: S[4], entries: [{ studentId: K, status: "Present" }] }), true);
  let threw = false;
  try { await fx.afterAttendanceMarked({ from: () => { throw new Error("database down"); }, functions: sb.functions },
    { classId: C3, date: "2026-09-05", sessionId: S[4], entries: [{ studentId: K, status: "Present" }] }); } catch { threw = true; }
  ok("a failure in streaks never fails the mark that triggered it", !threw);
}

console.log("=== 20261116091000: the unique bonus index and the Late streak job ===");
{
  // The queue function as 20261028090000 installed it, then the migration.
  const old = readFileSync(resolve(repo, "supabase/migrations/20261028090000_stars_sync_review_fixes.sql"), "utf8");
  const body = /CREATE OR REPLACE FUNCTION public\.stars_sync__queue_mark_effects\([\s\S]*?END \$\$;/.exec(old)?.[0];
  ok("the 20261028090000 queue function is found", !!body);
  await db.exec(body);
  await db.exec(`REVOKE ALL ON FUNCTION public.stars_sync__queue_mark_effects(uuid, uuid, date, uuid, text) FROM PUBLIC, anon, authenticated;
                 GRANT EXECUTE ON FUNCTION public.stars_sync__queue_mark_effects(uuid, uuid, date, uuid, text) TO service_role;`);
  const fn = async () => one(`SELECT replace(p.prosrc, E'\\r', '') src, p.prosecdef d, p.proconfig::text c,
      has_function_privilege('anon', p.oid, 'EXECUTE') a, has_function_privilege('authenticated', p.oid, 'EXECUTE') u,
      has_function_privilege('service_role', p.oid, 'EXECUTE') s FROM pg_proc p WHERE p.proname = 'stars_sync__queue_mark_effects'`);
  const F0 = await fn();
  const text = readFileSync(MIG, "utf8");
  let e1 = null; try { await db.exec(text); } catch (e) { e1 = e.message; }
  ok("the migration applies", e1 === null, e1 ?? "");
  let e2 = null; try { await db.exec(text); } catch (e) { e2 = e.message; }
  ok("  and applies a second time", e2 === null, e2 ?? "");
  const F1 = await fn();
  eq("the queue function's body changes only in the statuses that queue a streak",
     F1.src.replace("IF p_status IN ('Present', 'Late') THEN", "IF p_status = 'Present' THEN"), F0.src);
  eq("  still SECURITY DEFINER, search_path pinned; the service role only", [F1.d, F1.c, F1.a, F1.u, F1.s], [true, "{search_path=public}", false, false, true]);

  const C4 = await klass(), K = await kid(), S = await lesson(C4, "2026-11-14");
  const jobs = async () => q(`SELECT kind, generation FROM public.stars_sync_effects WHERE student_id = $1 ORDER BY kind`, [K]);
  await q(`SELECT public.stars_sync__queue_mark_effects($1,$2,'2026-11-14',$3,'Late')`, [S, C4, K]);
  eq("a Late mark from the sync queues a streak step", await jobs(), [{ kind: "streak", generation: 0 }]);
  await q(`SELECT public.stars_sync__queue_mark_effects($1,$2,'2026-11-14',$3,'Present')`, [S, C4, K]);
  eq("  a Present for the same lesson is the same job, asked again", await jobs(), [{ kind: "streak", generation: 1 }]);
  await q(`SELECT public.stars_sync__queue_mark_effects($1,$2,'2026-11-14',$3,'Excused')`, [S, C4, K]);
  eq("  Excused takes it back out and queues tuition, as before", await jobs(), [{ kind: "tuition", generation: 0 }]);

  // The index: a second streak bonus for one child and lesson is refused.
  const L4 = await lesson(C4, "2026-11-15");
  const ins = (notes, type = "participation", session = L4) => q(`INSERT INTO public.point_transactions (student_id, class_id, session_id, points, type, date, notes)
    VALUES ($1,$2,$3,50,$4,'2026-11-15',$5)`, [K, C4, session, type, notes]);
  await ins("Attendance streak bonus: 5 consecutive classes attended!");
  let dup = null; try { await ins("Attendance streak bonus: 10 consecutive classes attended!"); } catch (e) { dup = e.code; }
  eq("a second streak bonus for the same child and lesson is refused (23505)", dup, "23505");
  let other = null; try { await ins("Great answer"); await ins("Great answer"); await ins("Attendance streak bonus: 5", "adjustment"); } catch (e) { other = e.code; }
  eq("  teachers' points on the same lesson are untouched by it", other, null);

  // A race the read cannot see: the insert meets the index, and counts as paid.
  const C5 = await klass(), K5 = await kid();
  const S5 = [];
  for (const d of ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"]) { const s = await lesson(C5, d); S5.push(s); await mark(s, K5, "Present"); }
  await drain(C5, S5[4], "2026-08-07", [K5]);
  hooks.emptyPaidRead = true;
  const r = await drain(C5, S5[4], "2026-08-07", [K5]);
  hooks.emptyPaidRead = false;
  eq("two payers at once: the second is refused by the index, reported as done, one bonus", [r, (await bonuses(K5)).length], [true, 1]);
}

const REPAIR_SQL = readFileSync(REPAIR, "utf8");
const DRY_LINE = "SELECT true AS dry_run;";
const REAL_SQL = REPAIR_SQL.replace(DRY_LINE, "SELECT false AS dry_run;");
// Hanoi's date, from the clock, not from Postgres: the back-pay is dated by it.
const HANOI_TODAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const lastRow = (results) => results[results.length - 1]?.rows?.[0];

console.log("=== the repair: back-pay on a hand-computed fixture ===");
ok("the script starts as a dry run, and has exactly one switch", REPAIR_SQL.split(DRY_LINE).length === 2 && REAL_SQL !== REPAIR_SQL);
{
  // A fresh database, so every number below is worked out by hand.
  const db2 = new PGlite();
  const q2 = async (s, p) => (await db2.query(s, p)).rows;
  await db2.exec(PRELUDE);
  await db2.exec(readFileSync(MIG, "utf8"));
  const X = (await q2(`INSERT INTO public.classes (name) VALUES ('x') RETURNING id`))[0].id;
  const Y = (await q2(`INSERT INTO public.classes (name) VALUES ('y') RETURNING id`))[0].id;
  const d = (i) => `2026-08-${String(i).padStart(2, "0")}`;
  const lessonsX = [];
  for (let i = 1; i <= 12; i++) {
    lessonsX.push((await q2(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,$3) RETURNING id`, [X, d(i), i === 6 ? "Canceled" : "Held"]))[0].id);
  }
  const lessonsY = [];
  for (let i = 1; i <= 5; i++) lessonsY.push((await q2(`INSERT INTO public.sessions (class_id, date) VALUES ($1,$2) RETURNING id`, [Y, d(i)]))[0].id);
  const child = async () => (await q2(`INSERT INTO public.students (full_name) VALUES ('k') RETURNING id`))[0].id;
  const st = { P: "Present", A: "Absent", E: "Excused", L: "Late", "-": null };
  const marks = async (kidId, list, pattern) => {
    for (let i = 0; i < pattern.length; i++) if (st[pattern[i]]) {
      await q2(`INSERT INTO public.attendance (session_id, student_id, status) VALUES ($1,$2,$3)`, [list[i], kidId, st[pattern[i]]]);
    }
  };
  // Lesson 6 of X is cancelled: its mark is Excused, as the guard forces.
  const A = await child(), B = await child(), C = await child(), D = await child(), E = await child(), F = await child();
  await marks(A, lessonsX, "PPPPPEPPPPPP");   // runs 5 at lesson 5, 10 at lesson 11 (6 is cancelled)
  await marks(B, lessonsX, "PPPPAEPPPPP-");   // Absent at 5; run 5 at lesson 11
  await marks(C, lessonsX, "PPEPPEP");        // Excused at 3, cancelled 6: run 5 at lesson 7
  await marks(D, lessonsY, "LLLLL");          // Late counts: 5 at lesson 5 of Y
  await marks(E, lessonsY, "PPPPP");          // 5 at lesson 5 of Y, but the live code already paid it
  await marks(F, lessonsX, "AAAAA");          // nothing
  // Not-yet-taught lessons (conductor's live counts): class Z has three
  // taught lessons then the seeded 'Present' on three FUTURE Scheduled
  // ones; class W has a PAST lesson still Scheduled in the middle.
  const Z = (await q2(`INSERT INTO public.classes (name) VALUES ('z') RETURNING id`))[0].id;
  const W = (await q2(`INSERT INTO public.classes (name) VALUES ('w') RETURNING id`))[0].id;
  const zl = [];
  for (const [date, status] of [[d(1), "Held"], [d(2), "Held"], [d(3), "Held"], ["2027-02-01", "Scheduled"], ["2027-02-02", "Scheduled"], ["2027-02-03", "Scheduled"]]) {
    zl.push((await q2(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,$3) RETURNING id`, [Z, date, status]))[0].id);
  }
  const wl = [];
  for (let i = 1; i <= 6; i++) {
    wl.push((await q2(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,$3) RETURNING id`, [W, d(i), i === 4 ? "Scheduled" : "Held"]))[0].id);
  }
  const G = await child(), H = await child(), I = await child();
  await marks(G, zl, "PPPPPP");               // 3 taught + 3 future placeholders: run 3, nothing owed (not 5 at the 5th)
  await marks(H, wl, "PPPPPP");               // lesson 4 still Scheduled: does not count - run 5 only at lesson 6
  await marks(I, wl, "PPPAPP");               // an Absent on the Scheduled lesson 4 does not break: run 5 at lesson 6
  await q2(`INSERT INTO public.point_transactions (student_id, class_id, session_id, points, type, date, month, notes)
            VALUES ($1,$2,$3,50,'participation',$4,'2026-08','Attendance streak bonus: 5 consecutive classes attended!')`, [E, Y, lessonsY[4], d(5)]);
  // Inflated counters, as the retries left them.
  for (const [k, c] of [[A, X], [B, X], [C, X], [D, Y], [E, Y], [F, X], [G, Z], [H, W], [I, W]]) {
    await q2(`INSERT INTO public.student_attendance_streaks (student_id, class_id, consecutive_days, last_attendance_date, bonuses_awarded) VALUES ($1,$2,612,'2026-11-13',14)`, [k, c]);
  }
  const WANT = [
    `${A}|${lessonsX[4]}|Attendance streak bonus (paid late): 5 classes in a row, lesson of 2026-08-05`,
    `${A}|${lessonsX[10]}|Attendance streak bonus (paid late): 10 classes in a row, lesson of 2026-08-11`,
    `${B}|${lessonsX[10]}|Attendance streak bonus (paid late): 5 classes in a row, lesson of 2026-08-11`,
    `${C}|${lessonsX[6]}|Attendance streak bonus (paid late): 5 classes in a row, lesson of 2026-08-07`,
    `${D}|${lessonsY[4]}|Attendance streak bonus (paid late): 5 classes in a row, lesson of 2026-08-05`,
    `${H}|${wl[5]}|Attendance streak bonus (paid late): 5 classes in a row, lesson of 2026-08-06`,
    `${I}|${wl[5]}|Attendance streak bonus (paid late): 5 classes in a row, lesson of 2026-08-06`,
  ].sort();
  const snap2 = async () => ({
    pts: await q2(`SELECT id, student_id, points, date::text, notes FROM public.point_transactions ORDER BY id`),
    streaks: await q2(`SELECT student_id, consecutive_days, last_attendance_date::text, bonuses_awarded FROM public.student_attendance_streaks ORDER BY student_id`),
    att: await q2(`SELECT session_id, student_id, status::text FROM public.attendance ORDER BY session_id, student_id`),
    ses: await q2(`SELECT id, date::text, status::text FROM public.sessions ORDER BY id`),
  });
  const before = await snap2();

  const dry = lastRow(await db2.exec(REPAIR_SQL));
  eq("DRY RUN: changes nothing at all", await snap2(), before);
  eq("  and says what it would pay: 7 bonuses, 350 points - none for a lesson not yet taught",
     [dry?.mode, Number(dry?.bonuses_to_pay), Number(dry?.points_to_pay)], ["DRY RUN - nothing changed", 7, 350]);
  eq("  per class, largest first, as counts", dry?.bonuses_per_class, [4, 2, 1]);
  eq("  per child, as counts: five children get one, one child gets two", dry?.children_by_bonus_count, { 1: 5, 2: 1 });
  eq("  six children, the largest single-child total 100 points", [Number(dry?.children_paid), Number(dry?.largest_child_points)], [6, 100]);
  eq("  and the counters it would fix", [Number(dry?.rows_over_500_before), Number(dry?.streak_rows_to_change), Number(dry?.max_run_after)], [9, 9, 11]);
  {
    const ids = [A, B, C, D, E, F, G, H, I, X, Y, Z, W, ...lessonsX, ...lessonsY, ...zl, ...wl];
    const printed = JSON.stringify(dry);
    ok("  no id appears in what it prints", ids.every((id) => !printed.includes(id)));
  }

  const real = lastRow(await db2.exec(REAL_SQL));
  eq("REAL RUN: pays the same 7 bonuses it announced", [real?.mode, Number(real?.bonuses_to_pay), Number(real?.points_to_pay)], ["REAL RUN", 7, 350]);
  const paid = await q2(`SELECT student_id || '|' || session_id || '|' || notes k, points, type, date::text, month, created_by
                           FROM public.point_transactions WHERE notes LIKE 'Attendance streak bonus (paid late)%'`);
  eq("  exactly the hand-computed lessons, with the run and the lesson's date in the wording", paid.map((r) => r.k).sort(), WANT);
  eq("  each 50 points, participation, no creator", [...new Set(paid.map((r) => `${r.points}|${r.type}|${r.created_by}`))], ["50|participation|null"]);
  eq("  all dated TODAY in Hanoi, not by the lesson, so past months are not rewritten",
     [...new Set(paid.map((r) => `${r.date}|${r.month}`))], [`${HANOI_TODAY}|${HANOI_TODAY.slice(0, 7)}`]);
  eq("  nothing for the child whose 4th-6th marks are future placeholders",
     (await q2(`SELECT count(*)::int n FROM public.point_transactions WHERE student_id = $1`, [G]))[0].n, 0);
  eq("  the lesson the live code had already paid is not paid again",
     (await q2(`SELECT count(*)::int n FROM public.point_transactions WHERE student_id = $1`, [E]))[0].n, 1);
  eq("  the counters rebuilt, bonuses_awarded = floor(run / 5)",
     await q2(`SELECT consecutive_days c, last_attendance_date::text d, bonuses_awarded b FROM public.student_attendance_streaks
               ORDER BY array_position($1::uuid[], student_id)`, [[A, B, C, D, E, F, G, H, I]]),
     [{ c: 11, d: "2026-08-12", b: 2 }, { c: 5, d: "2026-08-11", b: 1 }, { c: 5, d: "2026-08-07", b: 1 },
      { c: 5, d: "2026-08-05", b: 1 }, { c: 5, d: "2026-08-05", b: 1 }, { c: 0, d: null, b: 0 },
      { c: 3, d: "2026-08-03", b: 0 }, { c: 5, d: "2026-08-06", b: 1 }, { c: 5, d: "2026-08-06", b: 1 }]);
  const after = await snap2();
  eq("  register and lessons untouched", [after.att, after.ses], [before.att, before.ses]);

  const again = lastRow(await db2.exec(REAL_SQL));
  eq("a second real run pays 0 and changes 0 rows", [Number(again?.bonuses_to_pay), Number(again?.streak_rows_to_change)], [0, 0]);
  eq("  and the point rows are as the first left them", (await snap2()).pts, after.pts);
  let dup = null;
  try {
    await q2(`INSERT INTO public.point_transactions (student_id, class_id, session_id, points, type, date, notes)
              VALUES ($1,$2,$3,50,'participation','2026-08-05','Attendance streak bonus: 5 consecutive classes attended!')`, [D, Y, lessonsY[4]]);
  } catch (e) { dup = e.code; }
  eq("the index treats a late bonus and a live one as the same key: a live bonus on a back-paid lesson is refused", dup, "23505");
}

console.log("=== the repair on a fixture like live, against the TS rule; then the live code ===");
{
  // Inflated rows, a child with only absences, a cancelled lesson, Late,
  // Excused, two lessons on one day, and queued jobs.
  const CA = await klass(), CB = await kid().then(() => klass());
  const kids = [];
  for (let i = 0; i < 6; i++) kids.push(await kid());
  const lessonsA = [], lessonsB = [];
  for (let i = 0; i < 14; i++) {
    const d = `2026-07-${String(i + 1).padStart(2, "0")}`;
    lessonsA.push(await lesson(CA, d, { status: i === 6 ? "Canceled" : "Held" }));
    lessonsB.push(await lesson(CB, d, { start: "08:00" }));
    if (i === 3) lessonsB.push(await lesson(CB, d, { start: "18:00" }));
  }
  const pattern = [
    "PPPPPPPPPPPPPP",                 // 14 in a row (13 counted: one is cancelled)
    "PPAPPPPPLPPEPP",                 // Absent at 3, then L and E
    "AAAAAAAAAAAPPP",                 // absences, then a short run
    "PPPPPEEEEEPPPP",                 // Excused passed over
    "PPPPPPPPPPPPPA",                 // ends Absent
    "LLLLLPPPPPLLLL",
  ];
  const st = { P: "Present", A: "Absent", E: "Excused", L: "Late" };
  for (let k = 0; k < kids.length; k++) {
    for (let i = 0; i < 14; i++) {
      await mark(lessonsA[i], kids[k], i === 6 ? "Excused" : st[pattern[k][i]]);
      await mark(lessonsB[i], kids[k], st[pattern[(k + 1) % 6][i]]);
    }
    await mark(lessonsB[14], kids[k], k % 2 ? "Absent" : "Present");   // the 18:00 lesson on day 4
    await q(`INSERT INTO public.student_attendance_streaks (student_id, class_id, consecutive_days, last_attendance_date, bonuses_awarded)
             VALUES ($1,$2,$3,'2026-11-13',14), ($1,$4,$5,NULL,0)`, [kids[k], CA, 600 + k, CB, k]);
  }
  // As on live: a past lesson still Scheduled with placeholder marks, and
  // the seeded 'Present' on future Scheduled lessons, in both classes.
  const pastSched = [await lesson(CA, "2026-07-09", { start: "19:00", status: "Scheduled" }), await lesson(CB, "2026-07-02", { start: "19:00", status: "Scheduled" })];
  const futureSched = [];
  for (const d of ["2027-03-01", "2027-03-02", "2027-03-03", "2027-03-04", "2027-03-05"]) {
    futureSched.push(await lesson(CA, d, { status: "Scheduled" }), await lesson(CB, d, { status: "Scheduled" }));
  }
  for (let k = 0; k < kids.length; k++) {
    for (const s of pastSched) await mark(s, kids[k], k === 1 ? "Excused" : k === 4 ? "Absent" : "Present");
    for (const s of futureSched) await mark(s, kids[k], "Present");
  }
  const KNONE = await kid();
  await q(`INSERT INTO public.student_attendance_streaks (student_id, class_id, consecutive_days, last_attendance_date, bonuses_awarded) VALUES ($1,$2,7,'2026-01-01',1)`, [KNONE, CA]);
  for (let k = 0; k < 3; k++) {
    await q(`INSERT INTO public.stars_sync_effects (kind, dedupe_key, student_id, class_id, session_id, lesson_date, attempts, last_error)
             VALUES ('streak', $1, $2, $3, $4, '2026-07-05', 40, 'streak update failed')`, [`streak:${lessonsA[4]}:${kids[k]}`, kids[k], CA, lessonsA[4]]);
  }
  await q(`INSERT INTO public.stars_sync_effects (kind, dedupe_key, student_id, class_id, session_id, lesson_date, attempts)
           VALUES ('streak', $1, $2, $3, $4, '2026-07-14', 0)`, [`streak:${lessonsA[13]}:${kids[5]}`, kids[5], CA, lessonsA[13]]);
  await q(`INSERT INTO public.stars_sync_effects (kind, dedupe_key, student_id, month, attempts) VALUES ('tuition', $1, $2, '2026-07', 3)`, [`tuition:${kids[0]}:2026-07`, kids[0]]);

  // What the TS rule says is owed, over EVERY child and class in the
  // database (the suites above left registers of their own), read the way
  // advanceStreaks reads them.
  const readMarks = async (student, cls) => {
    const { data } = await new Query("attendance").select("session_id, status, sessions!inner(id, class_id, date, start_time, status)")
      .eq("student_id", student).eq("sessions.class_id", cls);
    return data.map((m) => ({ sessionId: m.session_id, date: m.sessions.date, startTime: m.sessions.start_time, sessionStatus: m.sessions.status, status: m.status }));
  };
  const owedByTs = async () => {
    const out = [];
    const pairs = await q(`SELECT DISTINCT a.student_id, s.class_id FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id`);
    for (const p of pairs) {
      const m = await readMarks(p.student_id, p.class_id);
      for (const l of m) {
        const r = fx.streakRun(m, l.sessionId);
        if (!fx.streakBonusDue(r)) continue;
        const has = (await one(`SELECT count(*)::int n FROM public.point_transactions WHERE student_id = $1 AND session_id = $2
                                 AND type = 'participation' AND notes LIKE 'Attendance streak bonus%'`, [p.student_id, l.sessionId])).n;
        if (!has) out.push(`${p.student_id}|${l.sessionId}|${r.run}|${r.boundDate}`);
      }
    }
    return out.sort();
  };
  const snap = async () => ({
    pts: await q(`SELECT id, points, date::text FROM public.point_transactions ORDER BY id`),
    streaks: await q(`SELECT student_id, class_id, consecutive_days, bonuses_awarded FROM public.student_attendance_streaks ORDER BY student_id, class_id`),
    jobs: await q(`SELECT id, attempts FROM public.stars_sync_effects ORDER BY id`),
    att: await q(`SELECT session_id, student_id, status::text FROM public.attendance ORDER BY session_id, student_id`),
    ses: await q(`SELECT id, date::text, status::text FROM public.sessions ORDER BY id`),
  });
  const owed = await owedByTs();
  ok("the fixture owes back-pay", owed.length > 5, String(owed.length));
  const S0 = await snap();

  const dry = lastRow(await db.exec(REPAIR_SQL));
  eq("DRY RUN changes nothing", await snap(), S0);
  eq("  and announces what the TS rule owes", [Number(dry?.bonuses_to_pay), Number(dry?.points_to_pay)], [owed.length, 50 * owed.length]);
  eq("  it prints counts only", Object.keys(dry ?? {}).sort(), ["bonuses_per_class", "bonuses_to_pay", "children_by_bonus_count", "children_paid",
     "largest_child_points", "max_run_after", "max_run_before", "mode", "points_to_pay", "rows_over_500_before", "stale_streak_jobs_to_delete",
     "streak_rows", "streak_rows_to_change"]);

  const real = lastRow(await db.exec(REAL_SQL));
  const late = (await q(`SELECT student_id || '|' || session_id || '|' || substring(notes from 'paid late\\): ([0-9]+) ') || '|' ||
                                substring(notes from 'lesson of ([0-9-]+)$') k, date::text FROM public.point_transactions
                          WHERE notes LIKE 'Attendance streak bonus (paid late)%'`));
  eq("REAL RUN pays exactly what the TS rule owes, lesson by lesson", late.map((r) => r.k).sort(), owed);
  ok("  all dated today", late.every((r) => r.date === HANOI_TODAY));
  eq("  nothing is owed after it", await owedByTs(), []);
  eq("  and nothing on a lesson not yet taught (past Scheduled or future placeholders)",
     (await one(`SELECT count(*)::int n FROM public.point_transactions pt JOIN public.sessions s ON s.id = pt.session_id WHERE s.status::text <> 'Held'`)).n, 0);
  eq("  none over 500", (await one(`SELECT count(*)::int n FROM public.student_attendance_streaks WHERE consecutive_days > 500`)).n, 0);
  const rows = await q(`SELECT student_id, class_id, consecutive_days c, last_attendance_date::text d, bonuses_awarded b FROM public.student_attendance_streaks ORDER BY student_id, class_id`);
  const diffs = [];
  for (const r of rows) {
    const ts = fx.streakRun(await readMarks(r.student_id, r.class_id), null, { today: HANOI_TODAY });
    const want = { c: ts.run, d: ts.lastAttended, b: Math.floor(ts.run / 5) };
    if (JSON.stringify({ c: r.c, d: r.d, b: r.b }) !== JSON.stringify(want)) diffs.push({ got: r, want });
  }
  eq(`every streak row equals the TS rule (${rows.length} rows)`, diffs, []);
  ok("  and the fixture exercised the rule (runs of 0, 1-4, 5+ all present)",
     rows.some((r) => r.c === 0) && rows.some((r) => r.c > 0 && r.c < 5) && rows.some((r) => r.c >= 5));
  eq("a child with no marks in the class reads 0, no date", await streak(KNONE, CA), { c: 0, d: null, b: 0 });
  const S1 = await snap();
  eq("register and lessons untouched", [S1.att, S1.ses], [S0.att, S0.ses]);
  eq("the refused streak jobs are gone; the untried one and the tuition job stay",
     await q(`SELECT kind, attempts FROM public.stars_sync_effects WHERE student_id = ANY($1::uuid[]) ORDER BY kind, attempts`, [kids]),
     [{ kind: "streak", attempts: 0 }, { kind: "tuition", attempts: 3 }]);
  ok("  as the counts said", Number(dry?.stale_streak_jobs_to_delete) >= 3 && Number(real?.stale_streak_jobs_to_delete) >= 3);

  const again = lastRow(await db.exec(REAL_SQL));
  eq("a second real run pays 0 and changes 0 rows", [Number(again?.bonuses_to_pay), Number(again?.streak_rows_to_change)], [0, 0]);

  console.log("=== the live code after the back-pay pays only new milestones ===");
  const pts = async () => (await one(`SELECT count(*)::int n FROM public.point_transactions`)).n;
  const n0 = await pts();
  // Every lesson of the fixture worked again by the drain, as a retry would.
  for (const [cls, list] of [[CA, lessonsA], [CB, lessonsB]]) {
    for (const s of list) await drain(cls, s, null, kids);
  }
  eq("re-working every back-paid lesson pays nothing", await pts(), n0);
  eq("  and agrees with the counters the repair wrote",
     await q(`SELECT student_id, class_id, consecutive_days c, last_attendance_date::text d, bonuses_awarded b FROM public.student_attendance_streaks ORDER BY student_id, class_id`), rows);
  // kids[0] stands at 13 in class A (14 lessons, one cancelled). Two more.
  const n15 = await lesson(CA, "2026-07-15"), n16 = await lesson(CA, "2026-07-16");
  await markAndRun(CA, n15, "2026-07-15", kids[0], "Present");
  eq("the 14th lesson in a row pays nothing", await pts(), n0);
  await markAndRun(CA, n16, "2026-07-16", kids[0], "Present");
  const fresh = await q(`SELECT session_id, date::text, notes FROM public.point_transactions WHERE student_id = $1 AND session_id = $2`, [kids[0], n16]);
  eq("the 15th pays one new bonus, dated by its lesson, in the live wording",
     [await pts() - n0, fresh[0]?.date, fresh[0]?.notes], [1, "2026-07-16", "Attendance streak bonus: 15 consecutive classes attended!"]);
  eq("  and the counter reads 15, three milestones", await streak(kids[0], CA), { c: 15, d: "2026-07-16", b: 3 });
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
