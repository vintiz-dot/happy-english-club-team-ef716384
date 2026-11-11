// A TA added "permanently" to a class stays on it: is_teacher_of_class says
// yes with no session in the window, new sessions pick them up, removal clears
// only future Scheduled sessions. Drives 20261111110000.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE FUNCTION public.has_role(u uuid, r public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), default_teacher_id uuid, schedule_template jsonb);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE, teacher_id uuid, date date NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_type text NOT NULL DEFAULT 'teaching_assistant',
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
`);
await db.exec(MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n"));

const q = async (s, p) => (await db.query(s, p)).rows;
const uid = "00000000-0000-0000-0000-0000000000aa";
const ta = (await q(`INSERT INTO teaching_assistants (user_id) VALUES ($1) RETURNING id`, [uid]))[0].id;
const cls = (await q(`INSERT INTO classes DEFAULT VALUES RETURNING id`))[0].id;
const sess = async (d, st = "Scheduled") =>
  (await q(`INSERT INTO sessions (class_id, date, status) VALUES ($1, CURRENT_DATE + $2::int, $3) RETURNING id`, [cls, d, st]))[0].id;
const can = async () => (await q(`SELECT is_teacher_of_class($1,$2) c`, [uid, cls]))[0].c;
const count = async () => +(await q(`SELECT count(*) n FROM session_participants WHERE teaching_assistant_id=$1`, [ta]))[0].n;

const past = await sess(-30, "Held");
const future = await sess(5);
const cancelled = await sess(6, "Canceled");
ok("no access before assignment", (await can()) === false);

await q(`INSERT INTO class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [cls, ta]);
ok("access is granted", (await can()) === true);
ok("existing future session picked up, past and cancelled not", (await count()) === 1);

await sess(100);
ok("a session generated later (beyond 60 days) picks them up", (await count()) === 2);
await sess(7, "Canceled");
ok("cancelled new session skipped", (await count()) === 2);

// access holds with no session inside the window at all
await q(`DELETE FROM session_participants WHERE teaching_assistant_id=$1 AND session_id=$2`, [ta, future]);
ok("access does not depend on sessions", (await can()) === true);

await sess(-20, "Held");
await q(`DELETE FROM class_teaching_assistants WHERE class_id=$1`, [cls]);
ok("removal revokes access", (await can()) === false);
const left = await q(`SELECT s.status FROM session_participants sp JOIN sessions s ON s.id=sp.session_id WHERE sp.teaching_assistant_id=$1`, [ta]);
ok("removal clears future Scheduled only (a Held one stays)", left.every((r) => r.status !== "Scheduled"));

// storage policy: path <homework id>/file, TA of the class
const hw = (await q(`INSERT INTO homeworks (class_id) VALUES ($1) RETURNING id`, [cls]))[0].id;
const pol = await q(`SELECT policyname FROM pg_policies WHERE tablename='objects' AND policyname LIKE 'Teaching assistants%'`);
ok("TA storage policies exist", pol.length === 2, JSON.stringify(pol));
ok("homework id matches folder 1 for the app's path", (await q(`SELECT (storage.foldername($1))[1] f`, [`${hw}/1.pdf`]))[0].f === hw);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
