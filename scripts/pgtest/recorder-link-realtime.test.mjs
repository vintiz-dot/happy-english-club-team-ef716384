// The recorder's phone link channel (20261123170000): a private Realtime
// broadcast topic `recorder-link:<user id>`. Realtime asks realtime.messages'
// policies as the caller - SELECT to join and receive, INSERT to send - with
// the topic in `realtime.topic()`. Only the teacher or admin whose id is in
// the topic may do either; another teacher, a family, a child and the
// signed-out get nothing, and no other topic is opened.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const mig = MIGS.find((f) => /recorder_link_realtime/.test(f));
if (!mig) throw new Error("usage: recorder-link-realtime.test.mjs <recorder_link_realtime migration>");

// Supabase Realtime's own table and topic(), as the extension installs them (the parts the policies read).
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE SCHEMA realtime;
  CREATE TABLE realtime.messages (id bigserial PRIMARY KEY, topic text NOT NULL, extension text NOT NULL,
    payload jsonb, event text, private boolean DEFAULT true, inserted_at timestamptz DEFAULT now());
  ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('realtime.topic', true), '') $f$;
  GRANT USAGE ON SCHEMA realtime TO authenticated, anon;
  GRANT USAGE ON SCHEMA auth TO authenticated, anon;
  GRANT SELECT, INSERT ON realtime.messages TO authenticated, anon;
  GRANT USAGE ON SEQUENCE realtime.messages_id_seq TO authenticated, anon;
`;

const db = new PGlite();
await db.exec(PRELUDE);
await db.exec(readFileSync(mig, "utf8"));
ok("applies", true);
{
  let again = null;
  try { await db.exec(readFileSync(mig, "utf8")); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}
{
  const bare = new PGlite();
  let err = null;
  try { await bare.exec(readFileSync(mig, "utf8")); } catch (e) { err = e.message; }
  ok("a database without Realtime skips it rather than failing", err === null, err ?? "");
}

const T1 = "22222222-2222-4222-8222-222222222222";
const T2 = "55555555-5555-4555-8555-555555555555";
const ADMIN = "11111111-1111-4111-8111-111111111111";
const FAMILY = "33333333-3333-4333-8333-333333333333";
const topicOf = (u) => `recorder-link:${u}`;
// A message on every topic, written as the service role would (the Realtime server stores what it relays).
for (const u of [T1, T2, ADMIN, FAMILY]) await db.query(`INSERT INTO realtime.messages (topic, extension, payload) VALUES ($1, 'broadcast', '{}'), ($1, 'presence', '{}')`, [topicOf(u)]);
await db.query(`INSERT INTO realtime.messages (topic, extension, payload) VALUES ('other-topic', 'broadcast', '{}')`);

async function as(uid, role, topic, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true), set_config('realtime.topic', $3, true)`, [uid ?? "", role ?? "", topic ?? ""]);
  await db.exec(uid ? "SET LOCAL ROLE authenticated" : "SET LOCAL ROLE anon");
  try { return await fn(); } finally { await db.exec("ROLLBACK"); }
}
// Join / receive: Realtime selects the topic's messages as the caller; any row = allowed.
const canJoin = (uid, role, topic) => as(uid, role, topic, async () =>
  (await db.query(`SELECT count(*)::int AS n FROM realtime.messages WHERE topic = $1 AND extension = 'broadcast'`, [topic])).rows[0].n > 0);
const canSend = (uid, role, topic, extension = "broadcast") => as(uid, role, topic, async () => {
  try { await db.query(`INSERT INTO realtime.messages (topic, extension, payload) VALUES ($1, $2, '{}')`, [topic, extension]); return true; }
  catch { return false; }
});

eq("a teacher joins and sends on their OWN topic", [await canJoin(T1, "teacher", topicOf(T1)), await canSend(T1, "teacher", topicOf(T1))], [true, true]);
eq("an admin joins and sends on their own", [await canJoin(ADMIN, "admin", topicOf(ADMIN)), await canSend(ADMIN, "admin", topicOf(ADMIN))], [true, true]);
eq("another teacher can neither listen nor send on it", [await canJoin(T2, "teacher", topicOf(T1)), await canSend(T2, "teacher", topicOf(T1))], [false, false]);
eq("nor can an admin on a teacher's topic (it is per account)", [await canJoin(ADMIN, "admin", topicOf(T1)), await canSend(ADMIN, "admin", topicOf(T1))], [false, false]);
eq("a family account gets nothing, even on a topic with its own id", [await canJoin(FAMILY, "family", topicOf(FAMILY)), await canSend(FAMILY, "family", topicOf(FAMILY))], [false, false]);
eq("the signed-out get nothing", [await canJoin(null, null, topicOf(T1)), await canSend(null, null, topicOf(T1))], [false, false]);
eq("no other topic is opened", [await canJoin(T1, "teacher", "other-topic"), await canSend(T1, "teacher", "other-topic")], [false, false]);
eq("a teacher cannot write into their topic's name from another topic", await as(T1, "teacher", "other-topic", async () => {
  try { await db.query(`INSERT INTO realtime.messages (topic, extension, payload) VALUES ($1, 'broadcast', '{}')`, [topicOf(T1)]); return true; } catch { return false; }
}), false);
eq("presence is not opened (the link uses broadcast only)", await canSend(T1, "teacher", topicOf(T1), "presence"), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
