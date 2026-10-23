# Stars → HEC sync: build specification

A prompt for Claude. Two halves, because the two apps have different
owners:

- **Part A** goes to whoever maintains the Stars app. It asks for one
  small read-only endpoint and **no database credentials of any kind**.
- **Part B** is built in this repo (`happy-english-club-team`). It is the
  consumer.

Build Part A first. Part B cannot be tested without it, and the contract
in Part A is what both sides must agree on.

**For the admin turning it on rather than building it, see
[STARS_SYNC_SETUP.md](STARS_SYNC_SETUP.md)** — who does what, in order,
and how to tell it is working.

---

## What this does

The Stars app records attendance, points and homework for three classes
that HEC also holds:

| In Stars | In HEC |
|---|---|
| (their id) | **Stars** |
| (their id) | **Stars 2** |
| (their id) | **Sanrio Grade 6** |

HEC is the school's system of record for registers, points, grades and
reports. A teacher should mark a lesson once, in whichever app they are
already in, and not type it twice.

## The five decisions already taken

Not defaults to revisit while implementing.

1. **One direction: Stars → HEC.** HEC never writes back.
2. **Students are matched through an explicit mapping table**, filled in
   by an admin. Nothing syncs for an unmapped student — it waits,
   visibly. No matching on name or email: two children called Minh, or
   two siblings on one parent's email, would silently inherit each
   other's register and grades.
3. **Nothing already recorded in HEC is ever overwritten.** If the two
   disagree, HEC keeps what it has and raises the difference for an
   admin. A teacher's correction must never be undone by a machine at
   3am.
4. **The sync acts as a real teacher.** Not as the service role. An
   admin picks which teacher, and from then on the sync can do exactly
   what that teacher could do from the HEC app, because it goes through
   the same row-level security. The admin can switch it off.
5. **Deletions sync, except students.** A teacher removing a register
   mark, a point award or a homework in Stars removes it here too. The
   sync never deletes a student, a class, a session or an enrolment.

**This is a live school system holding real children's records.** Data
from the Stars app is third-party input: validated, capped and logged,
never trusted.

---

# PART A — for the Stars app's developer

You are adding **one read-only endpoint** to the Stars app so another
school system can mirror what teachers record there. You are not giving
anybody access to your database.

## What NOT to do

Do not share your Supabase service-role key, your database password, or
a direct Postgres connection. The service-role key bypasses every row
policy you have; handing it over gives the other app total read *and
write* over every table you own, for ever. Nothing below needs it.

## 1. An outbox table

```sql
create table if not exists public.export_events (
  seq          bigserial primary key,
  event_id     uuid not null default gen_random_uuid() unique,
  occurred_at  timestamptz not null default now(),
  kind         text not null check (kind in (
                 'attendance', 'points', 'homework', 'grade', 'retraction')),
  class_ref    text not null,
  student_ref  text,                 -- null for class-wide homework
  lesson_date  date not null,
  payload      jsonb not null
);

create index on public.export_events (seq);
```

`seq` is the cursor: the consumer asks for everything after a number it
already has. **Do not paginate on `occurred_at`** — two rows written in
the same millisecond tie, and the consumer then either re-reads them for
ever or loses one. A bigserial cannot tie.

`event_id` is the idempotency key. The consumer stores it and refuses to
apply the same event twice, so a retried run is harmless. **Never reuse
one.** A correction is a new event, never an edit to an old one.

`class_ref` and `student_ref` are whatever stable identifiers your app
already has. They must be **stable for the life of the student** — the
mapping on the other side is keyed on them, and changing one silently
detaches a child from their records. If your app has no stable student
identifier, add one before anything else here.

## 2. Fill it where teachers record things

A trigger on your existing tables is usually easier to get right than
editing every write path, and it cannot be forgotten by the next
feature. **Emit on deletes too** — see `retraction`.

These field names are the contract:

```jsonc
// kind: "attendance"
{ "status": "Present" | "Absent" | "Excused" | "Late",
  "note": "optional string" }

// kind: "points"
{ "points": 5,                      // integer, may be negative
  "category": "participation" | "homework" | "reading_theory"
             | "vocabulary_quiz" | "adjustment",
  "reason": "optional string" }

// kind: "homework"  — the assignment itself. student_ref is null.
{ "homework_ref": "your stable id for this assignment",
  "title": "Unit 4 workbook p.22",
  "body": "optional instructions",
  "due_date": "2026-11-02" }        // optional, YYYY-MM-DD

// kind: "grade"  — one student's result for a homework already sent
{ "homework_ref": "the same id as the homework event",
  "grade": "A" | "8/10" | whatever string your app uses,
  "feedback": "optional string",
  "status": "graded" | "submitted" | "missing",
  "graded_at": "2026-11-03T09:00:00Z" }

// kind: "retraction"  — undo one earlier event
{ "retracts_event_id": "the uuid of the event being undone",
  "reason": "optional string" }
```

A `grade` must come **after** the `homework` event it refers to. If a
grade arrives first the consumer holds it as `skipped_no_homework`; emit
the homework and the grade will apply on a later run.

A `retraction` names the `event_id` it undoes and nothing else. Do not
try to describe the deletion — the consumer already knows what that
event did and will reverse exactly that. A retraction of a retraction is
not supported; emit a fresh event instead.

## 3. The endpoint

```
GET /functions/v1/export-events?since=<seq>&limit=<n>
Header: x-sync-secret: <shared secret>
```

- `since` defaults to 0, `limit` to 500, capped at 1000.
- Returns `{ "events": [...], "next_cursor": <highest seq returned> }`,
  ordered by `seq` ascending.
- Returns `[]` and the unchanged cursor when there is nothing new.

Requirements:

- **Compare the secret in constant time.** A plain `===` on a string
  leaks its length and, over enough requests, its contents. Use
  `crypto.subtle.timingSafeEqual` over the encoded bytes, after checking
  the lengths match.
- The secret lives in your Supabase secrets, never in the repository.
- Set `verify_jwt = false` — the shared secret is the authentication —
  and make the secret check the first thing the handler does, before
  reading the query or the body.
- **GET only. This endpoint never writes.** No POST, no PATCH.
- Return only the five kinds above. Not names, not contact details, not
  parent information, nothing about staff.
- Log the cursor and the row count, never the payloads.

## 4. What to hand over

The function URL, and the shared secret sent separately from it and not
over anything public. Nothing else. Rotate by setting a new secret and
saying so; the endpoint can accept two for the hour it takes.

---

# PART B — for the HEC repo

Read `AGENTS.md` first, in full. Migrations live in
`supabase/migrations/` and are applied **by hand** by the owner pasting
them into the Supabase SQL editor; a new table needs explicit `GRANT`s
because `20260712023825` revoked the defaults on `public`; and
`node scripts/pgtest/run.mjs` must pass before and after.

## B0. Pre-flight — three things to verify before writing code

**Do not skip these. Each one can invalidate a whole feature below.**

### (a) Can this project mint an HS256 JWT?

The design in B2 signs a short-lived token with the project's legacy JWT
secret. Projects switched to asymmetric signing keys cannot do this.
Check whether `SUPABASE_JWT_SECRET` is available under API settings. If
it is not, use the fallback in B2 and say so in the PR.

### (b) Teacher grading — settled, but confirm the migration is applied

This was open: the tree held three student policies on
`homework_submissions` and no teacher policy, while
`GradeOfflineDialog.tsx` wrote to it from a teacher's browser.

`20261023090000_homework_grading_integrity.sql` declares
`hw_sub_teacher_all` (and `hw_sub_admin_all`) explicitly, so the tree is
now the truth and a teacher can grade. **Confirm it has been applied**
before building the grade path:

```sql
select polname from pg_policy
where polrelid = 'public.homework_submissions'::regclass
  and polname = 'hw_sub_teacher_all';
```

The same migration adds `award_homework_points(student, homework, points,
grade)` — `SECURITY INVOKER`, so the caller's policies still apply. **The
sync awards homework points through it and never inserts into
`point_transactions` directly.** It replaces an award rather than adding
one, which is what stops a re-grade paying twice.

### (c) The teacher — settled

Stars, Stars 2 and Sanrio Grade 6 all belong to **one teacher**, so the
single-row `stars_sync_connection` below is right and no per-class
variant is needed. Confirm that teacher is the class roster's
`default_teacher_id` and the assigned teacher on the session rows — see
B2 for why each matters.

## B1. The tables

One migration. Every table gets RLS, explicit grants, and the audit
trigger used elsewhere in this schema.

```sql
-- The connection itself. Exactly one row. This is the admin's switch.
create table public.stars_sync_connection (
  id         boolean primary key default true check (id),
  enabled    boolean not null default false,
  teacher_id uuid references public.teachers(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Which Stars student is which HEC student. One-to-one both ways.
create table public.stars_student_map (
  stars_student_id text primary key,
  student_id       uuid not null unique references public.students(id) on delete restrict,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id)
);

-- Which Stars class is which HEC class. Three rows, eventually.
create table public.stars_class_map (
  stars_class_id text primary key,
  class_id       uuid not null unique references public.classes(id) on delete restrict,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id)
);

-- Stars homework id -> the homeworks row we created for it. Grades and
-- retractions need to find it again.
create table public.stars_homework_map (
  stars_homework_ref text primary key,
  homework_id        uuid not null unique references public.homeworks(id) on delete cascade,
  created_at         timestamptz not null default now()
);

-- How far through the feed we have read. Exactly one row.
create table public.stars_sync_cursor (
  id          boolean primary key default true check (id),
  last_seq    bigint  not null default 0,
  last_run_at timestamptz,
  last_error  text
);

-- Every event we were handed, and what became of it. event_id as the
-- primary key is what makes a re-run harmless.
--
-- applied_ref holds what the event created, so a later retraction can
-- find it. Without it a retraction has to guess, and a guess here
-- deletes the wrong child's mark.
create table public.stars_sync_events (
  event_id     uuid primary key,
  seq          bigint not null,
  kind         text not null,
  raw          jsonb not null,
  received_at  timestamptz not null default now(),
  outcome      text not null check (outcome in (
                 'applied', 'duplicate', 'conflict', 'retracted',
                 'skipped_unmapped', 'skipped_no_session',
                 'skipped_no_homework', 'rejected')),
  outcome_note text,
  applied_ref  jsonb
);

-- The ones a person needs to look at.
create table public.stars_sync_conflicts (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.stars_sync_events(event_id) on delete cascade,
  student_id  uuid references public.students(id) on delete set null,
  session_id  uuid references public.sessions(id) on delete set null,
  ours        jsonb not null,
  theirs      jsonb not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolution  text check (resolution in ('kept_ours', 'took_theirs', 'dismissed'))
);
```

`on delete restrict` on the mapping tables is deliberate: archiving a
student must fail loudly while a mapping points at them, rather than
silently detaching a child from their Stars records.

RLS: admin reads and writes all of it. The connector teacher may read
and write `stars_sync_events`, `stars_sync_cursor` and
`stars_homework_map`, and read the rest — the sync needs its own
bookkeeping and it has no other identity. Scope that policy to
`teacher_id = (select teacher_id from stars_sync_connection where enabled)`,
so it stops the moment the admin flips the switch. Nobody else sees any
of it.

## B2. Acting as a teacher — the security model

**The sync authenticates as a real teacher. It does not use the service
role for any data write.**

That one decision is what makes "teacher-level only" true and keeps it
true. There is no allowlist of permitted tables to maintain and get
wrong six months from now: the sync runs inside the same row policies
the HEC app already enforces for that person. If the teacher cannot do
it from the app, the sync cannot do it either.

### How

1. Read `stars_sync_connection`. If `enabled` is false, stop. If
   `teacher_id` is null, stop. If that teacher is archived
   (`is_active = false`) or no longer holds the `teacher` role, stop and
   write `last_error`.
2. Mint a JWT signed with `SUPABASE_JWT_SECRET`:
   `{ sub: <teacher's user_id>, role: "authenticated",
      aud: "authenticated", iat: now, exp: now + 300 }`
3. Build the client with the **anon** key and that token in the
   `Authorization` header. `auth.uid()` is now that teacher.
4. Every data read and write goes through that client.

Five minutes of life, because a run should finish in seconds. Never log
the token, never return it, never store it.

**Fallback if the project cannot HS256-sign** (pre-flight (a)): create a
dedicated Supabase auth user for the connector, give it the `teacher`
role and a `teachers` row, put its password in Supabase secrets — set by
the admin in the dashboard, never in this repository — and sign in with
it. If you take this route, that account must itself be rostered on the
three classes, and must never be given the `admin` role.

### The service client, and its one job

The function needs to read its own configuration before it has a teacher
to be, and write its own log. Put that behind a single named helper:

```ts
/** The ONLY service-role client in this function. It touches
 *  stars_sync_* and nothing else, ever. Everything about a child goes
 *  through asTeacher(). */
function bookkeeping() { ... }
```

A test asserts the function constructs the service client exactly once,
inside that helper, and that no `stars_*`-external table name appears in
any statement reached from it.

### Choosing the teacher — read this before picking one

The two tables the sync writes most are protected differently, and the
difference decides whether the connection keeps working:

**`attendance`** — the policy keys on **the session's own
`teacher_id`**:

```sql
session_id IN (SELECT s.id FROM sessions s JOIN teachers t
               ON t.id = s.teacher_id WHERE t.user_id = auth.uid())
```

Per session. No time limit. So the connector teacher must be **the
teacher assigned to the session rows** of those three classes, or
registers do not sync at all.

**`point_transactions` and `homeworks`** — the policy keys on
`is_teacher_of_class`, which since `20261007120000` has two tiers:

- **Roster — permanent.** The class names them as `default_teacher_id`,
  or one of its weekly slots does.
- **Cover — time-boxed.** A non-cancelled session assigned to them
  within `[today − 45 days, today + 60 days]`.

So: **pick the rostered default teacher of all three classes.** Pick a
cover teacher and points and homework stop syncing 45 days after their
last session in each class — silently, one class at a time, in the
middle of a term.

**All three classes belong to one teacher**, so one connection row is
enough. Two things still have to be true of that person, and they are
different things: they must be the class roster's `default_teacher_id`
(or named on a weekly slot) for points and homework, **and** the teacher
assigned to the session rows for registers. Check both before enabling.

Do not pick an admin to dodge a permission problem: an admin account
would hand the sync the whole school, which is exactly what this design
exists to prevent.

### Attribution

Everything the sync writes is attributed to that teacher, which is
right — a person is accountable for it. But it must be distinguishable
from them sitting at a keyboard:

- `attendance.notes` and `point_transactions.notes` carry a leading
  `[Stars]` marker.
- `stars_sync_events` is the authoritative record of what arrived, when,
  and what became of it.

Say so on the admin screen, in one line, under the teacher picker. The
person whose name goes on these rows should know that it does.

### The 24-hour window

`AttendanceDrawer` stops a teacher editing attendance more than 24 hours
after a session ends. That rule is **in the UI only** — no row policy
enforces it, so a token-minted client is not bound by it.

Honour it anyway. The brief is "only what that teacher could already do
from the HEC app", and this is one of those things. A register mark more
than 24 hours after the lesson ended is recorded as
`rejected` with note `outside_edit_window`, and **shown on the admin
screen under "needs attention"** rather than only in a log — a silent
gap in a register is worse than a visible refusal. The admin can then
enter it themselves, which they are allowed to do and the sync is not.

## B3. Applying an event

In `seq` order. For every event, in this order:

1. **Already seen?** `event_id` in `stars_sync_events` → `duplicate`,
   write nothing.
2. **Mapped?** Resolve class and student through the mapping tables.
   Missing → `skipped_unmapped`. Write nothing, create nothing. An
   unmapped child is a question for an admin, not a reason to invent a
   record.
3. **Is there a lesson?** Find the `sessions` row for that class on that
   date. None → `skipped_no_session`.
   **Never create a session, and never change one's status.** Sessions
   are what teachers are paid for; a sync that creates one is a sync
   that writes somebody's wages. This is the most important rule here.
4. **Validate.** Status in the four values; category in the five; points
   an integer within the caps; date not in the future and not more than
   60 days past. Otherwise `rejected`, with the reason in `outcome_note`.
5. **Would this overwrite?** An existing record that differs → write a
   `stars_sync_conflicts` row, return `conflict`, **leave ours alone**.
   Identical → `duplicate`.
6. **Apply**, record `applied`, and store in `applied_ref` what was
   created — table and row id — so a retraction can find it.

### Points, and the rollup you must not touch

Insert into `point_transactions` only — or, for homework points, call
`award_homework_points`. **Never write `student_points`.** It is a rollup
maintained by `trigger_update_points_from_transaction`, which recomputes
the month from `point_transactions`. Writing it directly fights the
trigger and corrupts the totals.

**Cap the blast radius.** Reject any single event over 50 points in
absolute value; stop the run if one student would gain more than 200 in
a day. Put both in a named constant with a comment saying they are a
blast radius, not a pedagogical judgement. A bug in someone else's app
must not be able to award a child four thousand points overnight.

### Homework and grades

- `homework` → insert into `homeworks`, record the pair in
  `stars_homework_map`.
- `grade` → look up `stars_homework_ref`; not found →
  `skipped_no_homework` (it will apply on a later run once the homework
  arrives). Found → upsert `homework_submissions` for that student with
  `grade`, `teacher_feedback`, `status`, `graded_at`, and award any
  points through `award_homework_points` — never by inserting a
  `point_transactions` row.
- A grade whose student is unmapped is `skipped_unmapped` like any other.

### Retractions

Look up `retracts_event_id` in `stars_sync_events`. Unknown, or not
`applied` → `rejected`. Otherwise reverse exactly what `applied_ref`
records:

| It created | Undo by |
|---|---|
| an `attendance` row | delete it — teachers hold a DELETE policy on attendance |
| a `point_transactions` row | **post a compensating entry of `−points`**, never delete |
| a `homeworks` row | delete it, and its `stars_homework_map` row |
| a `homework_submissions` grade | clear `grade`, `teacher_feedback`, `graded_at`; set `status` back to `submitted` |

Mark the original event `retracted` and record the reversal as its own
event row.

**Why points are compensated and not deleted.** The rollup trigger used
to be `AFTER INSERT OR UPDATE` with no DELETE branch, so a deleted
transaction left `student_points` overstated for ever —
`20261023090000` fixed that, and deletes now give the points back.

Compensate anyway. "5 points removed on the 14th" is a fact worth
keeping, and an append-only points history is far easier to explain to a
parent than a row that quietly vanished. The homework award is the one
exception: `award_homework_points` replaces, because two awards for one
homework is not history, it is a double payment.

**Never delete:** a student, a class, a session, an enrolment, a teacher,
an assistant, or a user. The sync has no reason to and, running as a
teacher, no permission to. Do not add one.

## B4. The edge function

`supabase/functions/stars-sync/index.ts`.

- `verify_jwt = true`, then `requireRole` from `../_lib/auth.ts` on the
  internal service-role path — called by the scheduler, never by a
  browser. Follow `calculate-payroll`.
- Take the lock first with `acquireLock` from `../_lib/lock.ts`, job
  `'stars-sync'`. Two overlapping runs would read the same cursor and
  race the same events. Release in a `finally`.
- Read `last_seq`, call the Stars endpoint, walk events **in `seq`
  order**, and advance the cursor **only past events that were
  recorded** — any outcome counts, including `rejected`. An event that
  throws stops the run with the cursor where it was.
- Page until empty, ceiling of 20 pages per run.
- Never log a payload containing a child's name. Counts and outcomes.
- On failure: write `last_error`, release the lock, 500. **Do not
  advance the cursor on an error** — losing an event is worse than
  processing one twice, which the `event_id` key already makes safe.

Secrets: `STARS_EXPORT_URL`, `STARS_SYNC_SECRET`, and
`SUPABASE_JWT_SECRET`. In Supabase secrets. Never in the repository,
never in a migration, never in a comment.

## B5. The schedule

```sql
select cron.schedule(
  'stars-sync', '*/10 * * * *',
  $$ select net.http_post(
       url := '<project>/functions/v1/stars-sync',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
         'Content-Type', 'application/json'),
       body := '{}'::jsonb) $$
);
```

`pg_cron` and `pg_net` must be enabled — **check first, nothing in this
repo uses them yet** and the migration will fail if they are absent. If
they cannot be enabled, call the function from an external scheduler on
the same ten minutes; locking and cursor logic are unchanged.

Ten minutes, not one. The feed is append-only and the cursor makes a
late run cost nothing, so there is no reason to hammer another school's
server.

## B6. The admin screen — BUILT

`src/components/admin/tabs/StarsSyncTab.tsx`, at `/admin?tab=stars-sync`,
on `20261023100000_stars_sync_foundation.sql`. Admin only, and
generalised past this spec: any Stars class maps to any HEC class, each
with its own teacher or the connection default.

What is built: the connection switch, the default teacher, class and
child mappings, and `stars_sync_readiness()` — which reports per class
whether registers and points will each actually sync, and says in words
what will break if not. The activity panels exist and are honest about
being empty.

What is not: everything that reads the feed or applies an event. The
list below is the original brief, kept because the remaining items are
still the brief.

A **Stars sync** panel in the admin area. Admin only.

- **Connection.** An on/off switch and the teacher picker, at the top,
  with one line naming what that teacher's permissions let the sync
  reach, and a warning if the chosen teacher is not rostered on all
  three mapped classes — that is the failure that otherwise shows up as
  "points stopped syncing in November".
- **Mapping.** Stars classes and Stars students seen in the feed but not
  yet mapped, each with a picker. This is what unblocks everything; show
  a count of what is waiting.
- **Needs attention.** Events that were refused for a reason a person can
  fix: outside the edit window, unmapped, no session. Not buried in a
  log.
- **Conflicts.** Theirs against ours, side by side, with *Keep ours* and
  *Take theirs*. *Take theirs* runs as the admin, through the normal
  app path, and is audited as an admin action.
- **Last run** and **recent events**, filterable by outcome, so "why has
  nothing appeared for Minh" has an answer on screen.

## B7. Tests

A suite in `scripts/pgtest/`, registered in `run.mjs`, against pglite
with the real migration. It must cover:

- With `enabled = false`, **nothing is written at all**.
- An unmapped student writes nothing and records `skipped_unmapped`.
- A date with no session writes nothing and **creates no session** —
  assert the `sessions` row count is unchanged.
- Replaying an `event_id` applies once. Assert the **point total**, not
  the outcome string: double-applied points are the failure that hurts.
- An existing differing register entry is untouched and raises a
  conflict; an identical one is a `duplicate`.
- Bad status, bad category, future date, over-cap award → each
  `rejected`.
- Points reach `student_points` through the existing trigger, in the
  right month.
- A retraction of points posts a **compensating entry** and leaves
  `student_points` correct — assert the rollup, which is the thing the
  delete path gets wrong.
- A retraction of attendance deletes the row; a retraction of an unknown
  or un-applied event is `rejected`.
- A grade before its homework is `skipped_no_homework`, and applies once
  the homework arrives.
- **Permission reality.** Run the apply path with
  `request.jwt.claims` set to a teacher who is *not* on those classes
  and assert every write is refused. This is the test that keeps the
  teacher-level promise true after six months of edits — and it tests
  the real policies, not a description of them.

## B8. Rollout

The admin's version of this, with the dashboard steps and what to check,
is [STARS_SYNC_SETUP.md](STARS_SYNC_SETUP.md). In short:

1. Apply the migration. Leave `enabled = false`.
2. Map **one** class and **one** student.
3. Set the teacher. Run the function by hand, once. Read
   `stars_sync_events`.
4. Check that student's register, points and grades by eye against
   Stars.
5. Map the rest. Then enable the cron. Then set `enabled = true`.

Do not enable the schedule in the same change that creates the tables.
The first run should be watched by a person.

---

## Still to settle

- Does Stars record anything for a lesson HEC has no session for? If
  that is routine rather than exceptional, `skipped_no_session` will be
  the common outcome and the real problem is session generation, not the
  sync.
