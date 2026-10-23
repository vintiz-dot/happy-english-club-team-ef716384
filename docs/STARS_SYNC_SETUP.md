# Setting up the Stars connection — admin runbook

Who does what, in order. `STARS_SYNC_SPEC.md` says what to build; this
says how it gets switched on once it is built.

**The admin screen exists: Admin → Stars Sync.** Its configuration half
is built — the switch, the teacher, the class and child mappings, and
the readiness check. The engine that reads the Stars feed and applies
events is not, because the Stars app has nothing to read yet.

So steps 0, 1, 2 and 4 you can do today. Step 3 waits on the Stars
developer. Mapping is the slow part and it keeps: finish it now and the
day the endpoint lands there is nothing left to do but switch on.

Three roles appear below:

| | |
|---|---|
| **You** | the HEC admin, with the Supabase dashboard and the admin area |
| **Stars dev** | whoever maintains the Stars app |
| **Builder** | whoever implements Part B — Claude, Lovable, or a person |

---

## Step 0 — Send Part A to the Stars dev

Send them `STARS_SYNC_SPEC.md`, Part A. Nothing else can start until
they have built the `export-events` endpoint: there is no feed to read.

Ask them for two things when it is ready:

1. **The endpoint URL** — `https://<their-project>.supabase.co/functions/v1/export-events`
2. **A shared secret** they generate

**Ask for these in two separate messages, and not in anything public** —
not a group chat, not a shared doc, not an email thread with other
people on it. The URL on its own is harmless. The secret on its own is
harmless. Together they are read access to their pupils' records.

**Do not accept their service-role key or database password if offered.**
Part A says why: it would give this app total read and write over
everything they own, for ever. If they offer it, point them back at the
spec.

---

## Step 1 — Apply the homework fix (do this one now)

This is already written and tested, and is independent of the sync. It
repairs four live faults in grading — see the commit, or the top of the
migration file.

**It changes real children's point totals**, so:

### 1a. Look first

Run this on its own in the Supabase SQL editor. It only reads.

```sql
select
  (select coalesce(sum(n - 1), 0) from (
     select count(*) as n from point_transactions
     where type = 'homework' and homework_id is not null
     group by student_id, homework_id having count(*) > 1) d)   as duplicate_awards,
  (select count(*) from point_transactions
    where type = 'early_submission')                            as early_bonus_rows;
```

- **`duplicate_awards`** — how many extra homework awards are standing.
  Every one is a child credited twice for one homework because somebody
  corrected a grade. The migration keeps the newest and drops the rest,
  so this many awards disappear and those children's homework points go
  down. **That is the correction, not a loss.**
- **`early_bonus_rows`** — should be **0**. If it is not, somebody
  widened the type constraint by hand, those bonuses have been invisible
  to the leaderboard until now, and the migration will start counting
  them. Totals go **up** for those children. If this number is not zero,
  read it out before continuing, because parents may ask.

### 1b. Apply it

Paste `supabase/migrations/20261023090000_homework_grading_integrity.sql`
into the SQL editor and run it.

**Pick a quiet moment.** It rebuilds `student_points` for every month in
the database, and a teacher grading while it runs could have their award
counted into the rebuild or not, depending on timing. Before class, or
after.

It ends by printing a row:

| column | what it should say |
|---|---|
| `teacher_can_grade` | **1** — teachers can grade, and it is now written down |
| `award_function_exists` | **1** — the single award path exists |
| `early_bonus_rows` | whatever 1a said |
| `homework_awards_now` | one per child per homework, no duplicates left |
| `rollup_rows_rebuilt` | every month recomputed |

If `teacher_can_grade` or `award_function_exists` is 0, it did not apply
— stop and say so.

### 1c. Check one child

Open a class leaderboard, pick a child whose homework was re-graded at
some point, and confirm their total looks right. Then grade a homework,
change the grade, and confirm the points **replace** rather than add.

### 1d. Then deploy the app

The three grading screens now call `award_homework_points`. Until the
migration is applied **and** the app is deployed, grading will fail —
the function will not exist. Apply first, deploy second, in that order.

---

## Step 2 — Decide the teacher

The sync will act as one teacher, and can do exactly what that teacher
can do in HEC. Stars, Stars 2 and Sanrio Grade 6 belong to one teacher,
so one is enough.

Two different things must be true of them, and they fail differently:

| | Needed for | If it is not true |
|---|---|---|
| Named as the class's **default teacher** (or on a weekly slot) | points, homework, grades | these stop syncing 45 days after their last lesson in that class — quietly |
| The teacher **on the session rows** | attendance | registers never sync at all |

Check both for all three classes before anyone builds anything. The
first is the dangerous one: it works for six weeks and then stops, in
the middle of a term, one class at a time.

**Do not pick an admin.** An admin account would give the sync the whole
school — finance, payroll, families, every class. The entire design
exists to prevent that.

---

## Step 3 — Builder implements Part B

Hand `STARS_SYNC_SPEC.md` Part B to the builder, with the Stars endpoint
URL. They will need from you, in the Supabase dashboard:

| Secret | What it is |
|---|---|
| `STARS_EXPORT_URL` | the URL from step 0 |
| `STARS_SYNC_SECRET` | the secret from step 0 |
| `SUPABASE_JWT_SECRET` | already in your project, under Settings → API |

Set these under **Edge Functions → Secrets**. They are never in the
repository, and nobody needs to paste them into a chat.

They will also ask you to enable **`pg_cron`** and **`pg_net`** under
Database → Extensions. Nothing in this project uses them yet.

---

## Step 4 — Switch it on, one piece at a time

In the admin area under **Stars Sync**, once
`20261023100000_stars_sync_foundation.sql` has been applied. Steps 1 to
3 work today; 4 to 7 need the feed. Do it in this order.

1. **Leave the connection off.** It ships off.
2. **Pick the teacher** from step 2. The panel warns you if they are not
   rostered on all three classes — if it does, fix the roster, do not
   proceed.
3. **Map one class and one child**, using the ids the Stars app uses.
   Each mapped class shows whether it will actually work:

   | | |
   |---|---|
   | **Ready** | the teacher is the class default and is on its lessons |
   | **Half working** | one of the two holds. The row says which, and what will stop |
   | **Paused** | switched off for that class alone |
   | **Blocked** | no teacher, archived, or no login — nothing will sync |

   Fix anything that is not Ready before going further. "Half working"
   is the dangerous one: it syncs for weeks and then stops.

   An unmapped child syncs nothing at all — deliberate, not a fault.
4. **Run it once by hand** and read the events list. Every event says
   what became of it: applied, skipped, conflict, rejected.
5. **Check that one child by eye.** Their register, their points, their
   grades, against the Stars app. This is the only step that proves the
   mapping is right rather than merely accepted.
6. **Map the rest**, then **turn the connection on**.
7. **Enable the schedule** last.

Never do 6 and 7 on the day you do 1 to 5. The first real run should be
watched.

---

## Running it

**Normal.** Every ten minutes it reads whatever is new and applies it.
Nothing to do.

**"Nothing has appeared for Minh."** Stars sync → recent events, filter
to that child. It will say which: `skipped_unmapped` (map them),
`skipped_no_session` (HEC has no lesson that day — generate the session
or fix the date), `outside_edit_window` (the mark came more than 24
hours after the lesson; enter it yourself, you are allowed to and the
sync is not), `conflict` (see below).

**A conflict.** Both apps hold a different answer for the same thing.
HEC keeps what it has and shows you both. *Keep ours* dismisses it;
*Take theirs* writes the Stars value as you, audited as an admin action.
The sync never decides this on its own.

**Turning it off.** The switch in the Stars sync panel, which takes
effect on the next run. It stops immediately and nothing is lost — the
feed is a cursor, so turning it back on picks up where it stopped. Use
it if figures look wrong, if the Stars app is being rebuilt, or over a
holiday.

**If the teacher leaves.** The connection stops by itself: the sync
checks they are still active and still hold the role. Pick a new teacher
who meets both conditions in step 2, and it resumes.

**Rotating the secret.** Ask the Stars dev to set a new one and accept
both for an hour. Change `STARS_SYNC_SECRET` in your dashboard within
that hour. No code change.

---

## What the sync can never do

Worth knowing, because it bounds what can go wrong. It acts as a
teacher, so the database refuses the rest whatever the code says:

- It cannot touch money — tuition, payments, invoices, payroll,
  expenditures.
- It cannot see or change families, staff, or user accounts.
- It cannot create or delete a student, a class, a session or an
  enrolment. **Sessions are what teachers are paid for**, so a sync that
  made one would be writing somebody's wages.
- It cannot reach any class except the three you mapped.
- It cannot overwrite something a teacher recorded in HEC. That becomes
  a conflict for you.
