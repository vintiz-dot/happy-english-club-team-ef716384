// "Contact Admin" on a teacher's No Access screen (20261122140000).
//
// request_class_access puts one notification in every admin's bell and nobody
// else's; only teaching staff may call it; the name is the server's; asking
// again within 12 hours sends nothing more; a signed-out visitor cannot call it.
//
// The database stand-ins are the lesson speaker marks suite's own (its PRELUDE).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MIG = process.argv.slice(2).find((f) => f.includes("20261122140000_class_access_request"));
if (!MIG) { console.log("usage: class-access-request.test.mjs <its migration>"); console.log("0 passed, 1 failed"); process.exit(1); }
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

const speaker = readFileSync(resolve(here, "lesson-speaker-marks.test.mjs"), "utf8");
const PRELUDE = speaker.slice(speaker.indexOf("const PRELUDE = `") + 17, speaker.indexOf("\n`;", speaker.indexOf("const PRELUDE = `")));
ok("borrowed the lesson suite's database stand-ins", PRELUDE.includes("CREATE TABLE public.user_roles"));

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(`
  ALTER TABLE public.teachers ADD COLUMN full_name text;
  ALTER TABLE public.teaching_assistants ADD COLUMN full_name text;
  CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, type text NOT NULL,
    title text NOT NULL, message text, metadata jsonb, is_read boolean NOT NULL DEFAULT false,
    journal_id uuid, created_at timestamptz NOT NULL DEFAULT now());
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  CREATE POLICY own ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;`);
await db.exec(readFileSync(MIG, "utf8"));
ok("applies", true);
{
  let again = null;
  try { await db.exec(readFileSync(MIG, "utf8")); } catch (e) { again = e.message; }
  ok("applies a second time", again === null, again ?? "");
}

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN1 = U(1), ADMIN2 = U(2), VICTOR = U(3), TAU = U(4), PARENT = U(5), CHILD = U(6);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN1, ADMIN2, VICTOR, TAU, PARENT, CHILD]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'admin'),($3,'teacher'),($4,'teacher'),($5,'family'),($6,'student')`,
  [ADMIN1, ADMIN2, VICTOR, TAU, PARENT, CHILD]);
await q(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1, 'Victor Teacher')`, [VICTOR]);
await q(`INSERT INTO public.teaching_assistants (user_id, full_name) VALUES ($1, 'Tam Assistant')`, [TAU]);
const SKY = (await one(`INSERT INTO public.classes (name) VALUES ('Sky') RETURNING id`)).id;
const PLUTO = (await one(`INSERT INTO public.classes (name) VALUES ('Pluto') RETURNING id`)).id;

async function as(uid, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const ask = async (uid, cls) => (await as(uid, () => db.query(`SELECT public.request_class_access($1) r`, [cls]))).rows[0].r;
const tryAsk = async (uid, cls) => { try { await ask(uid, cls); return null; } catch (e) { return e.message; } };
const bell = async (uid) => (await as(uid, () => db.query(`SELECT type, title, message, metadata FROM public.notifications`))).rows;

console.log("a teacher asks");
const first = await ask(VICTOR, SKY);
eq("it reports how many admins were told", [first.status, first.admins], ["sent", 2]);
const seen = await bell(ADMIN1);
eq("each admin's bell has one request", seen.length, 1);
eq("worded from the server's records", seen[0].message, "Victor Teacher asked for access to Sky.");
eq("it carries the class and who asked", [seen[0].type, seen[0].metadata.class_id, seen[0].metadata.requester_user_id, seen[0].metadata.class_name],
  ["class_access_request", SKY, VICTOR, "Sky"]);
eq("the other admin has it too", (await bell(ADMIN2)).length, 1);
eq("the teacher's own bell does not", (await bell(VICTOR)).length, 0);

console.log("asking again");
eq("the same class within 12 hours sends nothing more", await ask(VICTOR, SKY), { status: "already_sent" });
eq("...so each admin still has one", (await bell(ADMIN1)).length, 1);
eq("another class is a new request", (await ask(VICTOR, PLUTO)).status, "sent");
await q(`UPDATE public.notifications SET created_at = now() - interval '13 hours' WHERE metadata->>'class_id' = $1`, [SKY]);
eq("after 12 hours it can be sent again", (await ask(VICTOR, SKY)).status, "sent");

console.log("who may ask");
eq("a teaching assistant may, under their own name", (await ask(TAU, SKY)).status, "sent");
ok("...and is named", (await bell(ADMIN1)).some((n) => n.message === "Tam Assistant asked for access to Sky."));
refused("a parent may not", await tryAsk(PARENT, SKY), /Only teaching staff/);
refused("a child may not", await tryAsk(CHILD, SKY), /Only teaching staff/);
refused("a signed-out visitor may not", await tryAsk(null, SKY), /Not signed in/);
refused("an unknown class is refused", await tryAsk(VICTOR, U(9)), /Class not found/);
ok("anon has no execute grant", !(await one(`SELECT has_function_privilege('anon', 'public.request_class_access(uuid)', 'EXECUTE') p`)).p);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
