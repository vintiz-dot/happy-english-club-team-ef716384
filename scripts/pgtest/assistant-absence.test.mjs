// An assistant who missed a lesson should not be paid for it, and
// nobody who did not miss one should lose anything when the migration
// lands. Drives supabase/migrations/20261022090000.
//
// The query shape asserted here is the one calculate-payroll sends for a
// TA's lessons. It is reproduced rather than imported, because that
// function talks to PostgREST and cannot be run in-process - so if the
// filter there changes, change it here too.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE TYPE public.session_status AS ENUM ('Scheduled', 'Held', 'Canceled');

  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.teachers(id),
    date date NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.session_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_type text NOT NULL DEFAULT 'teaching_assistant',
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    UNIQUE (session_id, teaching_assistant_id));
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

// A database as it stood BEFORE the migration, with a TA already on
// three lessons. Nothing about their pay should change when it lands.
const db = new PGlite();
await db.exec(PRELUDE);
const cls = (await db.query(`INSERT INTO public.classes (name) VALUES ('A') RETURNING id`)).rows[0].id;
const ta = (await db.query(`INSERT INTO public.teaching_assistants (full_name) VALUES ('Linh') RETURNING id`)).rows[0].id;
const sessions = [];
for (const d of ["2026-07-02", "2026-07-09", "2026-07-16"]) {
  const sid = (await db.query(
    `INSERT INTO public.sessions (class_id, date) VALUES ($1,$2) RETURNING id`, [cls, d])).rows[0].id;
  await db.query(
    `INSERT INTO public.session_participants (session_id, teaching_assistant_id) VALUES ($1,$2)`, [sid, ta]);
  sessions.push({ sid, date: d });
}

console.log("=== applying it to a database that already has rosters ===");
await db.exec(sql());
ok("the migration applies", true);
let second = null;
try { await db.exec(sql()); } catch (e) { second = e.message; }
ok("and applies a second time unchanged", second === null, second ?? "");

{
  const r = await db.query(`SELECT count(*)::int c FROM public.session_participants WHERE attended`);
  ok("every lesson already on the books stays paid", r.rows[0].c === 3, String(r.rows[0].c));
  const col = await db.query(`SELECT is_nullable, column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='session_participants' AND column_name='attended'`);
  ok("  because the column is NOT NULL and defaults to present",
     col.rows[0].is_nullable === "NO" && /true/.test(col.rows[0].column_default),
     JSON.stringify(col.rows[0]));
  const note = await db.query(`SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='session_participants' AND column_name='absence_note'`);
  ok("a reason can be recorded beside it", note.rows.length === 1);
}

console.log("=== what payroll then sees ===");
// The filter calculate-payroll uses: this TA's lessons, minus the ones
// marked absent.
const paidSessions = async () =>
  (await db.query(
    `SELECT s.date::text AS date
       FROM public.session_participants sp
       JOIN public.sessions s ON s.id = sp.session_id
      WHERE sp.teaching_assistant_id = $1
        AND sp.participant_type = 'teaching_assistant'
        AND sp.attended IS NOT FALSE
      ORDER BY s.date`, [ta])).rows.map((r) => r.date);

{
  ok("all three lessons are paid to begin with", (await paidSessions()).length === 3);

  await db.query(
    `UPDATE public.session_participants SET attended = false, absence_note = 'Sick'
      WHERE teaching_assistant_id = $1 AND session_id = $2`, [ta, sessions[1].sid]);

  const paid = await paidSessions();
  ok("the missed lesson drops out of their pay", paid.length === 2, paid.join(","));
  ok("  and it is the right one", !paid.includes("2026-07-09"), paid.join(","));

  const roster = await db.query(
    `SELECT count(*)::int c FROM public.session_participants WHERE teaching_assistant_id = $1`, [ta]);
  ok("  while the roster still says they were meant to be there",
     roster.rows[0].c === 3, String(roster.rows[0].c));
  ok("  with the reason kept",
     (await db.query(`SELECT absence_note n FROM public.session_participants WHERE attended = false`)).rows[0].n === "Sick");
}

console.log("=== putting it back ===");
{
  await db.query(
    `UPDATE public.session_participants SET attended = true, absence_note = NULL
      WHERE teaching_assistant_id = $1 AND session_id = $2`, [ta, sessions[1].sid]);
  ok("marking them present again restores the lesson", (await paidSessions()).length === 3);
}

console.log("=== re-saving a session's assistants ===");
{
  // EditSessionModal used to delete every TA row and re-insert, which
  // silently put an absent assistant back on the payroll. It now diffs:
  // only the assistants actually removed are deleted, and the ones still
  // selected are upserted with ignoreDuplicates, so their row - and the
  // absence on it - survives.
  await db.query(
    `UPDATE public.session_participants SET attended = false, absence_note = 'Sick'
      WHERE session_id = $1`, [sessions[0].sid]);
  ok("one lesson is unpaid before the save", (await paidSessions()).length === 2);

  // The save, with the same assistant still selected.
  await db.query(
    `DELETE FROM public.session_participants
      WHERE session_id = $1 AND participant_type = 'teaching_assistant'
        AND teaching_assistant_id <> ALL($2::uuid[])`, [sessions[0].sid, [ta]]);
  await db.query(
    `INSERT INTO public.session_participants (session_id, teaching_assistant_id)
     VALUES ($1,$2) ON CONFLICT (session_id, teaching_assistant_id) DO NOTHING`,
    [sessions[0].sid, ta]);

  ok("re-saving the session does not quietly put them back on the payroll",
     (await paidSessions()).length === 2, (await paidSessions()).join(","));
  ok("  and the reason is still there",
     (await db.query(`SELECT absence_note n FROM public.session_participants WHERE attended = false`)).rows[0].n === "Sick");

  // Removing them for real still works.
  await db.query(
    `DELETE FROM public.session_participants
      WHERE session_id = $1 AND participant_type = 'teaching_assistant'
        AND teaching_assistant_id <> ALL($2::uuid[])`, [sessions[0].sid, []]);
  ok("taking an assistant off a lesson still removes them",
     (await paidSessions()).length === 2 &&
     (await db.query(`SELECT count(*)::int c FROM public.session_participants WHERE session_id=$1`, [sessions[0].sid])).rows[0].c === 0);
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
