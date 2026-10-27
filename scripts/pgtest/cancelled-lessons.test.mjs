// Cancelled lessons are Excused for everybody, and cannot be anything
// else. Drives supabase/migrations/20261027090000 - the authoritative
// copy. It began life in drizzle/, where nothing would ever have applied
// it, and this suite reached sideways into that folder for the file;
// both halves of that are fixed.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';
let pass = 0, fail = 0;
const ok = (name, value) => { console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}`); value ? pass++ : fail++; };
const db = new PGlite();
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
 CREATE TABLE public.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, date date, status public.session_status);
 CREATE TABLE public.enrollments(class_id uuid, student_id uuid, start_date date, end_date date, allowed_days int[]);
 -- updated_at and created_at are last so the positional inserts below
 -- still line up. They are here because the real table has them and
 -- the backfill writes updated_at; a prelude thinner than production
 -- turns a real column into a test-only failure.
 CREATE TABLE public.attendance(session_id uuid REFERENCES public.sessions(id), student_id uuid, status text DEFAULT 'Present', marked_by uuid, UNIQUE(session_id,student_id),
   created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
`);
// A lesson cancelled BEFORE the guard existed, still marked Present.
// The triggers never see it; only the backfill does. Without that these
// rows also become un-editable, because the guard rejects every update
// that does not set Excused.
const stale = (await db.query(
  `INSERT INTO sessions(class_id,date,status) VALUES(gen_random_uuid(),'2026-09-15','Canceled') RETURNING id`)).rows[0];
await db.query(`INSERT INTO attendance VALUES($1,gen_random_uuid(),'Present',NULL)`, [stale.id]);
await db.query(`INSERT INTO attendance VALUES($1,gen_random_uuid(),'Absent',NULL)`, [stale.id]);

await db.exec(readFileSync(process.argv[2], 'utf8'));

ok('lessons cancelled before the guard existed are repaired',
   (await db.query(`SELECT count(*)::int n FROM attendance WHERE session_id=$1 AND status<>'Excused'`,
     [stale.id])).rows[0].n === 0);
ok('  and they are editable again rather than stuck',
   await (async () => {
     try {
       await db.query(`UPDATE attendance SET status='Excused' WHERE session_id=$1`, [stale.id]);
       return true;
     } catch { return false; }
   })());

// Applying it twice must not break: the owner pastes these by hand and
// a re-paste is an ordinary mistake.
let again = null;
try { await db.exec(readFileSync(process.argv[2], 'utf8')); } catch (e) { again = e.message; }
ok('applies a second time unchanged', again === null);

const sid = (await db.query(`INSERT INTO sessions(class_id,date,status) VALUES(gen_random_uuid(),'2026-10-26','Held') RETURNING id,class_id`)).rows[0];
const student = '00000000-0000-0000-0000-000000000001';
await db.query(`INSERT INTO attendance VALUES($1,$2,'Late',NULL)`, [sid.id, student]);
await db.query(`UPDATE sessions SET status='Canceled' WHERE id=$1`, [sid.id]);
ok('cancelling a Late lesson makes attendance Excused', (await db.query(`SELECT status FROM attendance`)).rows[0].status === 'Excused');
for (const status of ['Present', 'Absent', 'Late']) {
 let blocked = false;
 try { await db.query(`UPDATE attendance SET status=$1 WHERE session_id=$2`, [status, sid.id]); } catch (e) { blocked = e.code === '23514'; }
 ok(`cancelled lesson rejects ${status} update`, blocked);
 blocked = false;
 try { await db.query(`INSERT INTO attendance(session_id,student_id,status) VALUES($1,gen_random_uuid(),$2)`, [sid.id, status]); } catch (e) { blocked = e.code === '23514'; }
 ok(`cancelled lesson rejects ${status} insert`, blocked);
}
let blocked = false;
try { await db.query(`INSERT INTO attendance(session_id,student_id) VALUES($1,gen_random_uuid())`, [sid.id]); } catch (e) { blocked = e.code === '23514'; }
ok('default Present insert is blocked too', blocked);
await db.query(`INSERT INTO enrollments VALUES($1,$2,'2026-10-01',NULL,NULL)`, [sid.class_id, '00000000-0000-0000-0000-000000000002']);
await db.query(`SELECT public._attendance_seed_for_class_dates($1,'2026-10-01','2026-10-31')`, [sid.class_id]);
// Scoped to this lesson. It counted every Excused row in the database,
// which was fine when this lesson was the only fixture and silently
// wrong as soon as another was added.
ok('late enrollment seeds only Excused on cancelled lessons',
   (await db.query(`SELECT count(*)::int n FROM attendance WHERE status='Excused' AND session_id=$1`,
     [sid.id])).rows[0].n === 2);
await db.query(`UPDATE sessions SET status='Held' WHERE id=$1`, [sid.id]);
await db.query(`UPDATE attendance SET status='Present' WHERE student_id=$1`, [student]);
ok('non-cancelled lessons can still be Present', (await db.query(`SELECT status FROM attendance WHERE student_id=$1`, [student])).rows[0].status === 'Present');
for (const status of ['Present', 'Absent']) {
 await db.query(`UPDATE sessions SET status='Held' WHERE id=$1`, [sid.id]);
 await db.query(`UPDATE attendance SET status=$1 WHERE student_id=$2`, [status, student]);
 await db.query(`UPDATE sessions SET status='Canceled' WHERE id=$1`, [sid.id]);
 ok(`cancelling clears existing ${status} attendance`, (await db.query(`SELECT status FROM attendance WHERE student_id=$1`, [student])).rows[0].status === 'Excused');
}
// The session trigger now fires only on the transition INTO Canceled,
// so an ordinary edit to an already-cancelled lesson does no work. The
// outcome must be identical either way.
await db.query(`UPDATE sessions SET date='2026-10-27' WHERE id=$1`, [sid.id]);
ok('editing an already-cancelled lesson leaves attendance Excused',
   (await db.query(`SELECT status FROM attendance WHERE student_id=$1`, [student])).rows[0].status === 'Excused');

await db.close();

const load = async (name) => {
 const path = `/tmp/${name}.${process.pid}.mjs`;
 writeFileSync(path, (await transform(readFileSync(resolve(`supabase/functions/_lib/${name}.ts`), 'utf8'), { loader:'ts',format:'esm' })).code);
 return import(pathToFileURL(path).href);
};
const { isBillableTuitionSession } = await load('tuition-session');
for (const attendance of ['Present','Absent','Late','Excused',undefined]) {
 const charge = isBillableTuitionSession('Canceled',attendance) ? 135000 : 0;
 ok(`cancelled + ${attendance} charges exactly 0 VND`, charge === 0);
}
ok('Held + Present charges the normal 135000 VND', (isBillableTuitionSession('Held','Present') ? 135000 : 0) === 135000);
ok('unknown status fails closed', !isBillableTuitionSession('Holiday','Present'));
const { refreshCancelledTuition } = await load('refresh-cancelled-tuition');
const calls = [];
const mock = {
 from: () => ({ select: () => ({ in: async () => ({ data: [{ session_id:'a',student_id:student },{session_id:'b',student_id:student}],error:null }) }) }),
 functions: { invoke: async (name,{body}) => { calls.push({name,body}); return { data:{totalAmount:0},error:null }; } },
};
await refreshCancelledTuition(mock,[{id:'a',date:'2026-10-26'},{id:'b',date:'2026-10-28'}]);
ok('cancellation refreshes each student/month once', calls.length === 1 && calls[0].name === 'calculate-tuition' && calls[0].body.month === '2026-10');
mock.functions.invoke = async () => ({data:null,error:new Error('offline')});
let failedClosed = false;
try { await refreshCancelledTuition(mock,[{id:'a',date:'2026-10-26'}]); } catch { failedClosed = true; }
ok('failed bill refresh cannot report cancellation fully successful', failedClosed);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);