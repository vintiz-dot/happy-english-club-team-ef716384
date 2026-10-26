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
 CREATE TABLE public.attendance(session_id uuid REFERENCES public.sessions(id), student_id uuid, status text DEFAULT 'Present', marked_by uuid, UNIQUE(session_id,student_id));
`);
await db.exec(readFileSync(process.argv[2], 'utf8'));
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
ok('late enrollment seeds only Excused on cancelled lessons', (await db.query(`SELECT count(*)::int n FROM attendance WHERE status='Excused'`)).rows[0].n === 2);
await db.query(`UPDATE sessions SET status='Held' WHERE id=$1`, [sid.id]);
await db.query(`UPDATE attendance SET status='Present' WHERE student_id=$1`, [student]);
ok('non-cancelled lessons can still be Present', (await db.query(`SELECT status FROM attendance WHERE student_id=$1`, [student])).rows[0].status === 'Present');
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
let storedInvoice = 135000;
const mock = {
 from: () => ({ select: () => ({ in: async () => ({ data: [{ session_id:'a',student_id:student },{session_id:'b',student_id:student}],error:null }) }) }),
 functions: { invoke: async (name,{body}) => { calls.push({name,body}); storedInvoice = isBillableTuitionSession('Canceled','Present') ? 135000 : 0; return { data:{totalAmount:storedInvoice},error:null }; } },
};
await refreshCancelledTuition(mock,[{id:'a',date:'2026-10-26'},{id:'b',date:'2026-10-28'}]);
ok('cancellation refreshes each student/month once', calls.length === 1 && calls[0].name === 'calculate-tuition' && calls[0].body.month === '2026-10');
ok('previously charged saved bill becomes zero', storedInvoice === 0);
mock.functions.invoke = async () => ({data:null,error:new Error('offline')});
let failedClosed = false;
try { await refreshCancelledTuition(mock,[{id:'a',date:'2026-10-26'}]); } catch { failedClosed = true; }
ok('failed bill refresh cannot report cancellation fully successful', failedClosed);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);