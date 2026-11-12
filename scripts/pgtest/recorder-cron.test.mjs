// The recorder's retention schedule: supabase/migrations/20261112101000_recorder_retention_cron.sql
// (C2 review M7, "the cron gap").
//
// pglite has neither pg_cron nor pg_net, so this runs the REAL migration
// against stand-ins with the same signatures: `cron.schedule(name, schedule,
// command)` / `cron.unschedule(name)` writing a `cron.job` table, and
// `net.http_post(...)` recording what it was asked to send. Then it runs the
// scheduled commands themselves. What it proves: the jobs exist with the
// right names and times; applying twice gives the same jobs; a database
// without the extensions (or without pg_net / the runner table) applies
// without an error and says what it skipped; the runner token is read when the
// job RUNS (rotate it, run the job, the new token is sent) and is not in the
// job's text; the stale sweep calls recorder_expire_stale.
// What it cannot prove: real pg_cron firing on time, real pg_net reaching the
// function, the gateway accepting the anon key, the function being deployed.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIG = process.argv.slice(2).find((f) => f.includes("recorder_retention_cron"));
if (!MIG) { console.log("usage: recorder-cron.test.mjs <20261112101000_recorder_retention_cron.sql>"); console.log("0 passed, 1 failed"); process.exit(1); }
const SQL = readFileSync(MIG, "utf8");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const CRON = `
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobid bigserial PRIMARY KEY, jobname text UNIQUE, schedule text, command text);
CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v bigint;
BEGIN
  INSERT INTO cron.job (jobname, schedule, command) VALUES (job_name, schedule, command)
  ON CONFLICT (jobname) DO UPDATE SET schedule = EXCLUDED.schedule, command = EXCLUDED.command RETURNING jobid INTO v;
  RETURN v;
END $$;
-- Like pg_cron: unscheduling a job that does not exist is an error.
CREATE FUNCTION cron.unschedule(job_name text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM cron.job WHERE jobname = job_name;
  IF NOT FOUND THEN RAISE EXCEPTION 'could not find valid entry for job ''%''', job_name; END IF;
  RETURN true;
END $$;`;
const NET = `
CREATE SCHEMA net;
CREATE TABLE net.sent (url text, headers jsonb, body jsonb, timeout integer);
CREATE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds integer DEFAULT 5000)
RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN INSERT INTO net.sent VALUES (url, headers, body, timeout_milliseconds); RETURN 1; END $$;`;
const RUNNER = `
CREATE TABLE public.schedule_runner (id integer PRIMARY KEY CHECK (id = 1), token text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.schedule_runner (id, token) VALUES (1, 'token-one-aaaaaaaaaaaaaaaaaaaaaaaaaaaa');`;
const EXPIRE = `
CREATE TABLE public.expire_calls (at timestamptz);
CREATE FUNCTION public.recorder_expire_stale(p_now timestamptz DEFAULT now()) RETURNS integer LANGUAGE plpgsql AS $$
BEGIN INSERT INTO public.expire_calls VALUES (p_now); RETURN 0; END $$;`;

async function fresh(parts) {
  const notices = [];
  const db = new PGlite();
  await db.exec(parts.join("\n"));
  const apply = async () => {
    try { await db.query(SQL, [], { onNotice: (n) => notices.push(n.message) }); }
    catch { await db.exec(SQL); }   // a pglite without onNotice: still applies
    return null;
  };
  return { db, notices, apply, jobs: async () => (await db.query(`SELECT jobname, schedule FROM cron.job ORDER BY jobname`)).rows };
}
const tryApply = async (f) => { try { await f.apply(); return null; } catch (e) { return e.message; } };

console.log("=== no pg_cron (the in-process test database, a bare branch) ===");
{
  const f = await fresh([RUNNER, EXPIRE]);
  eq("applies without an error", await tryApply(f), null);
  ok("and says no job was scheduled, and what to do instead", f.notices.some((n) => /pg_cron is not installed/.test(n) && /by hand/.test(n)), f.notices.filter((n) => /^recorder retention/.test(n)).join(" | "));
  eq("nothing else was created (no cron schema appears from this file)", (await f.db.query(`SELECT count(*)::int n FROM pg_namespace WHERE nspname = 'cron'`)).rows[0].n, 0);
}

console.log("=== pg_cron and pg_net present: both jobs, idempotent ===");
{
  const f = await fresh([CRON, NET, RUNNER, EXPIRE]);
  eq("applies", await tryApply(f), null);
  eq("two jobs: the nightly deletion run at 03:00 Hanoi (20:00 UTC) and the hourly stale sweep", await f.jobs(),
    [{ jobname: "recorder-expire-stale", schedule: "17 * * * *" }, { jobname: "recorder-retention", schedule: "0 20 * * *" }]);
  eq("applies a second time", await tryApply(f), null);
  eq("still exactly those two jobs (unscheduled first, scheduled again)", (await f.jobs()).length, 2);
  const cmd = (await f.db.query(`SELECT command FROM cron.job WHERE jobname = 'recorder-retention'`)).rows[0].command;
  ok("the runner token is NOT in the job's text", !cmd.includes("token-one"));
  ok("the job reads it from public.schedule_runner when it runs", /select token from public\.schedule_runner where id = 1/.test(cmd));
  ok("it calls the recorder-retention function, with a POST body and a long timeout", /\/functions\/v1\/recorder-retention'/.test(cmd) && /timeout_milliseconds := 300000/.test(cmd));
  // Rotate the token, then run the job's command as pg_cron would.
  await f.db.query(`UPDATE public.schedule_runner SET token = 'token-two-bbbbbbbbbbbbbbbbbbbbbbbbbbbb' WHERE id = 1`);
  await f.db.exec(cmd);
  const sent = (await f.db.query(`SELECT url, headers, body, timeout FROM net.sent`)).rows;
  eq("run: one POST to the function", sent.map((s) => s.url), ["https://aswgmbefikhsnhogtryv.supabase.co/functions/v1/recorder-retention"]);
  eq("run: it carries the CURRENT token (read at run time, not at scheduling)", sent[0].headers["x-schedule-runner-secret"], "token-two-bbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  ok("run: with the project's public anon key as apikey and bearer (verify_jwt = true needs a JWT)", sent[0].headers.apikey === sent[0].headers.Authorization.replace(/^Bearer /, "") && JSON.parse(Buffer.from(sent[0].headers.apikey.split(".")[1], "base64url").toString()).role === "anon");
  eq("run: an empty body (the nightly run takes no recording id)", sent[0].body, {});
  const sweep = (await f.db.query(`SELECT command FROM cron.job WHERE jobname = 'recorder-expire-stale'`)).rows[0].command;
  await f.db.exec(sweep);
  eq("the stale sweep runs recorder_expire_stale() itself, in SQL", (await f.db.query(`SELECT count(*)::int n FROM public.expire_calls`)).rows[0].n, 1);
}

console.log("=== pg_cron without pg_net, or without the runner table ===");
for (const [label, parts, missing] of [["no pg_net", [CRON, RUNNER, EXPIRE], /pg_net/], ["no runner table", [CRON, NET, EXPIRE], /schedule_runner/]]) {
  const f = await fresh(parts);
  eq(`${label}: applies without an error`, await tryApply(f), null);
  eq(`${label}: the stale sweep is still scheduled, the deletion run is not`, (await f.jobs()).map((j) => j.jobname), ["recorder-expire-stale"]);
  ok(`${label}: the NOTICE names what is missing`, f.notices.some((n) => missing.test(n)), f.notices.filter((n) => /^recorder retention/.test(n)).join(" | "));
}
{
  const f = await fresh([CRON, NET, RUNNER]);
  eq("before the recorder migration: applies, schedules only the deletion run", [await tryApply(f), (await f.jobs()).map((j) => j.jobname)], [null, ["recorder-retention"]]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
