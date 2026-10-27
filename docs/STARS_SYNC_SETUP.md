# Setting up the Pixel Pal sync — admin runbook

The other app is **Pixel Pal**. "Stars" is one of its classes. This page is
the order of switching it on; `STARS_SYNC_SPEC.md` is the design.

## What it does, in one paragraph

Every five minutes HEC reads what teachers recorded in Pixel Pal — register
marks and points — and records them in HEC **as the teacher you choose**,
only in classes that teacher teaches in HEC. A synced mark does everything
a mark made in HEC does: the lesson becomes *Held* (which is what pays the
teacher), tuition is recalculated, streaks move. It never overwrites a mark
somebody made in HEC — it raises those for you to settle. Nothing it cannot
place is thrown away: it waits, and applies once you fix whatever stopped
it.

## Already done

| | |
|---|---|
| Pixel Pal's export endpoint | live, refuses a wrong secret |
| `20261023090000`, `20261023100000`, `20261027090000` | applied |
| Class numbers and the list of children | received |

---

## Step 1 — Apply the engine migration

Paste `supabase/migrations/20261027100000_stars_sync_engine.sql` into the
SQL editor and run it. It ends by printing one row:

| column | should be |
|---|---|
| `engine_installed` | **1** |
| `old_delete_trigger_left` | **0** |
| `cron_available` | `true` |
| `http_available` | `true` |

If `cron_available` or `http_available` is `false`: enable **pg_cron** and
**pg_net** under Database → Extensions, then paste the migration again — it
is safe to re-run. Without them the sync still works, but only when you
press **Run now**.

It also removes an old points trigger that was quietly doing the wrong
thing on deletes (see the migration's section 1). No totals change.

## Step 2 — Rotate the secret, then set it

The secret Pixel Pal sent arrived in the same message as the address, so
treat it as spent: ask for a new one. Their endpoint accepts the old and new
for about an hour.

Set it in the project's **edge function secrets** as `STARPASSCODE`
(`starpasscode` also works). Nowhere else — not in a file, not in a chat.

## Step 3 — Deploy

Two functions need deploying through Lovable:

- **`stars-sync`** — new.
- **`mark-attendance`** — its tuition and streak code moved into a shared
  module the sync also uses. Behaviour is unchanged; the old deployed copy
  keeps working until this one replaces it.

## Step 4 — Set it up, in Admin → Stars Sync

The page lists what is still missing at the top. In order:

1. **Sync lessons from** — the first lesson date to import. Nothing earlier
   comes across, ever. **If anybody has typed Pixel Pal's points into HEC
   by hand, start the day after they last did** — otherwise those points are
   added twice.
2. **Acts as** — your teacher.
3. **Map the classes:**

   | Pixel Pal number | HEC class |
   |---|---|
   | 19 | Stars |
   | 22 | Stars 2 |
   | 12 | Sanrio Grade 6 |

   Each row then says whether it will work. **Ready** means the teacher is
   on that class's roster. **Works for now** means they are only covering
   it — that stops 7 days after their last lesson there. Fix anything that
   is not Ready.
4. **Match the children.** Paste the JSON Pixel Pal gave you into *Match
   from Pixel Pal's list*. Each child is offered only the children enrolled
   in that HEC class. Check every nickname — a wrong match moves one child's
   marks and points onto another. The list itself is not saved; only the
   matches are.

## Step 5 — One supervised run

Leave **Schedule** off and press **Run now**. Then:

- Read **Records → Needs attention.** Every record says what became of it.
- Pick one child and compare their register and points with Pixel Pal.

Running it by hand once is also what lets the schedule start: the function
records its own address on that first run, and the schedule cannot call it
before then.

## Step 6 — Turn the schedule on

Flip **Schedule**. From now on it runs every five minutes.

---

## Running it

**"Nothing has appeared for a child."** Records → Needs attention, and
read the note. The usual ones:

| It says | Do |
|---|---|
| Waiting: not matched | match the child, or map the class |
| Waiting: not enrolled | the child is not enrolled in that HEC class on that date |
| Waiting: no lesson | HEC has no lesson that day — generate it |
| Waiting: teacher | the teacher does not teach that class in HEC (the Classes table says why) |
| Refused: 24 hours | the mark came more than a day after the lesson; a teacher could not change it in HEC either. Enter it yourself. |
| Refused: over the limit | an award above your limits. Raise them if it was meant, and enter it yourself. |

Waiting records are retried every run and apply as soon as the cause is
fixed — up to 60 days after the lesson.

**To settle.** HEC and Pixel Pal disagree about a child's mark, and HEC kept
its own. *Keep HEC's* closes it. *Use Pixel Pal's* marks it through HEC's
normal register, as you.

**Turning it off.** The Schedule switch. Nothing is lost: Pixel Pal keeps
its records and they arrive when it is back on.

**If the teacher leaves.** Their records stop, and wait. Choose another
teacher who is on the classes' roster, and they apply.

**Rotating the secret again.** Pixel Pal sets a new one and accepts both for
an hour; change `STARPASSCODE` within that hour. No code change.

## What the sync can never do

It checks HEC's own rule — does this teacher teach this class — before
every write, and the database itself refuses the rest:

- nothing about money: tuition settings, payments, invoices, payroll;
- nothing about families, staff or accounts;
- it never creates or deletes a student, class, lesson or enrolment;
- it never touches a class you have not mapped;
- it never overwrites a mark somebody made in HEC.
