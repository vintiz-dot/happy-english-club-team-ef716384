# Stars → HEC sync: build specification

A prompt for Claude. Two halves, because the two apps have different
owners:

- **Part A** goes to whoever maintains the Stars app. It asks for one
  small read-only endpoint and **no database credentials of any kind**.
- **Part B** is built in this repo (`happy-english-club-team`). It is the
  consumer.

Build Part A first. Part B cannot be tested without it, and the contract
in Part A is the thing both sides must agree on.

---

## Why it is shaped this way

The Stars app records attendance, points and homework for one class. The
same facts need to appear in HEC, which is the school's system of record
for registers, points and reports. Teachers should mark a lesson once,
in whichever app they are already in, and not type it twice.

Four decisions were taken before this spec was written. They are not
defaults to be revisited while implementing:

1. **One direction only: Stars → HEC.** HEC never writes back. A second
   direction needs origin markers and loop prevention on every row and is
   not worth it until the first direction has run for a term.
2. **Students are matched through an explicit mapping table**, filled in
   by an admin. Nothing syncs for an unmapped student — it waits, visibly.
   No matching on name or email: two children called Minh, or two siblings
   on one parent's email, would silently inherit each other's register and
   points.
3. **Nothing already recorded in HEC is ever overwritten.** If the two
   disagree, HEC keeps what it has and the difference is raised for an
   admin. A teacher's correction made here must never be undone by a
   machine at 3am.
4. **Teacher-level reach only.** The sync may touch registers, points and
   homework. It may not touch money, payroll, families, tuition,
   enrolments, staff or accounts — and that is enforced in the database,
   not left to the care of whoever edits the function next.

**This is a live school system holding real children's records.** Data
arriving from the Stars app is third-party input: it is validated, capped
and logged, never trusted.

---

# PART A — for the Stars app's developer

You are adding **one read-only endpoint** to the Stars app so another
school system can mirror what teachers record there. You are not giving
anybody access to your database.

## What NOT to do

Do not share your Supabase service-role key, your database password, or a
direct Postgres connection. The service-role key bypasses every row
policy you have; handing it over gives the other app total read and write
over every table you own, for ever. Nothing below needs it.

## What to build

A Supabase edge function, `export-events`, that returns an append-only
feed of things teachers have recorded. A feed rather than a table dump,
because the consumer must be able to ask "what has happened since I last
looked" and get a stable, replayable answer.

### 1. An outbox table

```sql
create table if not exists public.export_events (
  seq          bigserial primary key,
  event_id     uuid not null default gen_random_uuid() unique,
  occurred_at  timestamptz not null default now(),
  kind         text not null check (kind in ('attendance', 'points', 'homework')),
  class_ref    text not null,
  student_ref  text not null,
  lesson_date  date not null,
  payload      jsonb not null
);

create index on public.export_events (seq);
```

`seq` is the cursor. It must be **monotonic and gap-tolerant** — the
consumer asks for everything after a number it already has.

Do not paginate on `occurred_at`. Two rows written in the same
millisecond tie, and the consumer then either re-reads them for ever or
skips one. A bigserial cannot tie.

`event_id` is the idempotency key. The consumer stores it and refuses to
apply the same event twice, so a retried run is harmless. **Never reuse
one.** A correction is a new event, not an edit to an old one.

`class_ref` and `student_ref` are whatever stable identifier your app
already has for a class and a student — a UUID, an integer, a code. They
must be **stable for the life of the student**: the mapping on the other
side is keyed on them, and changing one silently detaches a child from
their records. If your app has no stable student identifier, add one
before doing anything else.

### 2. Fill it where teachers record things

Write a row whenever a teacher records one of the three. A trigger on
your existing tables is usually easier to get right than editing every
write path, and it cannot be forgotten by the next feature.

Payload per kind — these field names are the contract:

```jsonc
// kind: "attendance"
{ "status": "Present" | "Absent" | "Excused" | "Late",
  "note": "optional string" }

// kind: "points"
{ "points": 5,                      // integer, may be negative
  "category": "participation" | "homework" | "reading_theory"
             | "vocabulary_quiz" | "adjustment",
  "reason": "optional string" }

// kind: "homework"
{ "title": "Unit 4 workbook p.22",
  "body": "optional instructions",
  "due_date": "2026-11-02" }        // optional, YYYY-MM-DD
```

Anything outside those `status` and `category` values is rejected by the
consumer and reported back as a skipped event. If you need another
category, agree it first — it has to exist on both sides.

### 3. The endpoint

```
GET /functions/v1/export-events?since=<seq>&limit=<n>
Header: x-sync-secret: <shared secret>
```

- `since` defaults to 0, `limit` defaults to 500, cap it at 1000.
- Returns `{ "events": [...], "next_cursor": <highest seq returned> }`,
  ordered by `seq` ascending.
- Returns `[]` and the unchanged cursor when there is nothing new.

Requirements:

- **Compare the secret in constant time.** A plain `===` on a string
  leaks its length and, over enough requests, its contents. Use
  `crypto.subtle.timingSafeEqual` over the encoded bytes, after checking
  the lengths match.
- The secret lives in your Supabase secrets, never in the repository.
- Set `verify_jwt = false` for this function — the shared secret is the
  authentication — and then be sure the secret check is the very first
  thing the handler does, before reading the body or the query.
- **GET only. This endpoint never writes anything.** No POST, no PATCH.
  If the other app ever needs to push something back, that is a separate
  function and a separate conversation.
- Return only the three kinds above. Not names, not contact details, not
  parent information, not anything about staff.
- Log the cursor and row count per request, not the payloads.

### 4. What to hand over

The function URL, and the shared secret, sent separately from the URL and
not over anything public. Nothing else. Rotate the secret by setting a new
one and telling the other side; the endpoint can accept two for the hour
it takes.

---

# PART B — for the HEC repo

Everything below is built in `happy-english-club-team`.

Read `AGENTS.md` first, in full. In particular: migrations live in
`supabase/migrations/` and are applied **by hand** by the owner pasting
them into the Supabase SQL editor; a new table needs explicit `GRANT`s
because `20260712023825` revoked the defaults on `public`; and
`node scripts/pgtest/run.mjs` must pass before and after.

## B1. The tables

One migration, named for what it does. Every table needs RLS, explicit
grants, and the audit trigger used elsewhere in this schema.

```sql
-- Which Stars student is which HEC student. Filled in by an admin.
-- One-to-one in both directions: a Stars student maps to exactly one
-- child here, and no child is the target of two Stars students.
create table public.stars_student_map (
  stars_student_id text primary key,
  student_id       uuid not null unique references public.students(id) on delete restrict,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id)
);

-- Which Stars class is which HEC class.
create table public.stars_class_map (
  stars_class_id text primary key,
  class_id       uuid not null unique references public.classes(id) on delete restrict,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id)
);

-- How far through the feed we have read. Exactly one row.
create table public.stars_sync_cursor (
  id          boolean primary key default true check (id),
  last_seq    bigint  not null default 0,
  last_run_at timestamptz,
  last_error  text
);

-- Every event we were handed, and what became of it. event_id as the
-- primary key is what makes a re-run harmless: the second insert
-- conflicts and the event is not applied twice.
create table public.stars_sync_events (
  event_id     uuid primary key,
  seq          bigint not null,
  kind         text not null,
  raw          jsonb not null,
  received_at  timestamptz not null default now(),
  outcome      text not null check (outcome in (
                 'applied', 'duplicate', 'conflict',
                 'skipped_unmapped', 'skipped_no_session', 'rejected')),
  outcome_note text
);

-- The ones a person needs to look at.
create table public.stars_sync_conflicts (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.stars_sync_events(event_id) on delete cascade,
  student_id    uuid references public.students(id) on delete set null,
  session_id    uuid references public.sessions(id) on delete set null,
  ours          jsonb not null,
  theirs        jsonb not null,
  detected_at   timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references auth.users(id),
  resolution    text check (resolution in ('kept_ours', 'took_theirs', 'dismissed'))
);
```

`on delete restrict` on both mapping tables is deliberate: archiving a
student must fail loudly while a mapping points at them, rather than
silently detaching a child from their Stars records.

RLS: admin reads and writes everything. Teachers may read
`stars_sync_events` and `stars_sync_conflicts` for classes they teach,
and nothing else. No other role sees any of it.

## B2. The write path — three functions, and nothing else

The edge function will hold the service-role key, because Supabase edge
functions have no other way to reach the database. The service role
bypasses RLS entirely, so "teacher-level only" cannot be enforced by row
policies here. It is enforced by making the write surface small enough to
read in one sitting:

**The sync function performs no table writes of its own. It calls exactly
three `SECURITY DEFINER` functions, and they are the complete write
surface.**

```sql
public.stars_apply_attendance(p_event_id uuid, p_stars_class text,
                              p_stars_student text, p_date date,
                              p_status text, p_note text)
public.stars_apply_points(p_event_id uuid, p_stars_class text,
                          p_stars_student text, p_date date,
                          p_points integer, p_category text, p_reason text)
public.stars_apply_homework(p_event_id uuid, p_stars_class text,
                            p_date date, p_title text, p_body text,
                            p_due date)
```

Each returns the outcome string it recorded. Each, in this order:

1. **Already seen?** If `event_id` exists in `stars_sync_events`, return
   `'duplicate'` and write nothing.
2. **Mapped?** Resolve the class and the student through the mapping
   tables. Either missing → `'skipped_unmapped'`. Write nothing, create
   nothing. An unmapped child is a question for an admin, not a reason to
   invent a record.
3. **Is there a lesson?** Find the `sessions` row for that class on that
   date. None → `'skipped_no_session'`.
   **Never create a session, and never change one's status.** Sessions
   are what teachers are paid for; a sync that creates one is a sync that
   writes somebody's wages. This is the single most important rule here.
4. **Validate.** Status in the four allowed values; category in the five;
   `points` an integer within the cap below; `date` not in the future and
   not more than 60 days past. Anything else → `'rejected'` with the
   reason in `outcome_note`.
5. **Would this overwrite?** If a record already exists and differs,
   write a `stars_sync_conflicts` row, return `'conflict'`, and **leave
   ours alone**. Identical → `'duplicate'`.
6. **Apply**, and record `'applied'`.

Tables these three may write, and no others:

| Allowed | Why |
|---|---|
| `attendance` | upsert on `(session_id, student_id)` |
| `point_transactions` | insert only — see the note below |
| `homeworks` | insert only |
| `homework_submissions` | only if homework sync is extended to grades later |
| `stars_sync_*` | the sync's own bookkeeping |

Forbidden, explicitly: `sessions`, `students`, `classes`, `enrollments`,
`teachers`, `teaching_assistants`, `session_participants`, `users`,
`user_roles`, `families`, `payments`, `invoices`, `expenditures`,
`payroll_periods`, `payroll_lines`, `payroll_summaries`,
`payroll_adjustments`, `staff_pay_rates`, `student_points`.

`student_points` is on that list even though points sync. It is a rollup
maintained by `trigger_update_points_from_transaction`, which recomputes
the month from `point_transactions` on every insert. Writing it directly
would fight the trigger and corrupt the totals. Insert the transaction;
the rollup follows.

**Points cap.** A bug in somebody else's app must not be able to award a
child four thousand points overnight. Reject any single event over 50
points in absolute value, and stop the whole run if one student would
gain more than 200 in a day. Put both numbers in a constant with a
comment saying they are a blast radius, not a pedagogical judgement.

## B3. The edge function

`supabase/functions/stars-sync/index.ts`.

- `verify_jwt = true`, and then `requireRole` from `../_lib/auth.ts` with
  the internal service-role path — this is called by the scheduler, never
  by a browser. Follow the pattern in `calculate-payroll`.
- Take the lock before doing anything, using `acquireLock` from
  `../_lib/lock.ts` with job `'stars-sync'`. Two overlapping runs would
  read the same cursor and race on the same events. Release it in a
  `finally`.
- Read `last_seq`, call the Stars endpoint with it, walk the events **in
  `seq` order**, call the matching function for each, and advance the
  cursor **only past events that were recorded** — any outcome counts as
  recorded, including `rejected`. An event that throws stops the run with
  the cursor where it was, so the next run retries from there.
- Page until the feed returns nothing, with a ceiling of 20 pages per run
  so a runaway feed cannot hold the lock all day.
- Never log a payload containing a child's name. Log counts and outcomes.
- On failure: write `last_error`, release the lock, return 500. Do not
  advance the cursor on an error — losing an event is worse than
  processing one twice, which the `event_id` key already makes safe.

Secrets: `STARS_EXPORT_URL` and `STARS_SYNC_SECRET`, in Supabase secrets.
Never in the repository, never in a migration, never in a comment.

## B4. The schedule

```sql
select cron.schedule(
  'stars-sync',
  '*/10 * * * *',
  $$ select net.http_post(
       url := '<project>/functions/v1/stars-sync',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
         'Content-Type', 'application/json'),
       body := '{}'::jsonb) $$
);
```

`pg_cron` and `pg_net` must be enabled on the project — check before
writing this, because nothing in this repo uses them yet and the
migration will fail if they are absent. If they cannot be enabled, call
the function from an external scheduler on the same ten minutes; the
locking and cursor logic are unchanged either way.

Ten minutes, not one. The feed is append-only and the cursor makes a late
run cost nothing, so there is no reason to hammer another school's server.

## B5. The admin screen

A **Stars sync** panel under the admin area. Admin only.

- **Mapping.** Two lists — Stars classes and Stars students seen in the
  feed but not yet mapped — each with a picker to attach them to a class
  or child here. This is the screen that unblocks everything; it should be
  the first thing on the page, with a count of what is waiting.
- **Last run.** When, how many events, how many applied, and the last
  error if there is one.
- **Conflicts.** What the Stars app says against what HEC holds, side by
  side, with *Keep ours* and *Take theirs*. *Take theirs* writes through
  the same three functions, as an admin action, and is audited.
- **Recent events**, filterable by outcome, so "why has nothing appeared
  for Minh" has an answer on the screen rather than in the logs.

## B6. Tests

Add a suite to `scripts/pgtest/`, registered in `run.mjs`, running the
real migration against pglite. It must cover:

- An unmapped student writes **nothing** and records `skipped_unmapped`.
- A date with no session writes nothing, and **no session is created** —
  assert the row count in `sessions` is unchanged.
- Replaying the same `event_id` applies once. Assert the point total, not
  just the outcome string: double-applied points are the failure that
  would actually hurt.
- An existing, differing register entry is left alone and raises a
  conflict.
- An identical one is a `duplicate`, not a conflict.
- A bad status, a bad category, a future date and an over-cap award are
  each `rejected`.
- Points flow through to `student_points` via the existing trigger, with
  the right month.
- **The write surface.** Assert directly that the three functions touch
  no forbidden table — read `pg_depend`/`pg_proc` for the function bodies,
  or run each against a database where the forbidden tables carry a
  trigger that raises on write. This is the test that keeps the
  teacher-level promise true after six months of edits.

## B7. Rollout

1. Apply the migration. Map **one** student and **one** class.
2. Run the function by hand, once, and read `stars_sync_events`.
3. Check that student's register and points in HEC against the Stars app
   by eye.
4. Only then map the rest, and only then enable the cron.

Do not enable the schedule in the same change that creates the tables.
The first run should be watched by a person.

---

## Questions to settle before writing code

- What is in `payload` for a homework the Stars app **grades**? This spec
  syncs the homework itself; grades and submissions are a second step.
- When a teacher deletes something in Stars, is that an event? This spec
  has no `kind: "retraction"`. Decide now whether it needs one, because
  adding it later means reprocessing the feed.
- Which HEC class is the Stars class? If it does not exist here yet, an
  admin creates it in HEC first — the sync will not.
