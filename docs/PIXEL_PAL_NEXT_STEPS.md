# Finishing the Pixel Pal sync: homework, grades and names

## Why homework is not syncing

Nothing is broken. The feed was never built to carry it, on either side.

| | |
|---|---|
| **Pixel Pal's feed** | `export-events` sends three kinds of record: `attendance`, `points`, `retraction`. There is no `homework` or `grade` kind, so nothing about an assignment or a grade ever leaves Pixel Pal. |
| **HEC's engine** | Took the same three. Anything else was kept as *Waiting: not supported yet*, and `stars_homework_map` sat empty. Fixed by migration `20261104090000`. |
| **"Homework" points** | These do arrive, as `points` with `category: "homework"`. They count toward homework points on the leaderboard, but they belong to no assignment, so nothing shows under Homework in HEC. |
| **The wording trap** | Pixel Pal only files an award as homework if the teacher's words contain "homework". "HW", "BTVN" or "bài tập" arrive as `participation`. |

**Admin → Stars Sync → Tools → Homework check** shows this for the live data: how
many homework records have arrived, how many awards are labelled homework, and how
many read like homework but were filed as something else.

## Who does what

**In HEC:**

1. Paste `supabase/migrations/20261104090000_stars_sync_homework.sql` into the
   Supabase SQL editor. It ends by printing `homework_engine: true`.
2. Publish in Lovable so the new `stars-roster` function deploys.

**In Pixel Pal:** run the prompt below.

The order does not matter. Records that arrive before HEC is ready wait, and apply
by themselves once it is. Until Pixel Pal has `export-roster`, the Tools page asks
for a pasted list instead.

## The prompt for Pixel Pal

Copy everything inside the box.

````text
Another app, Happy English Club (HEC), reads this app's records through the
export-events edge function, every five minutes. I need three additions so it can
receive homework, grades and children's names. HEC's side is already built to the
contract below, so please follow it exactly.

STEP 1. LOOK BEFORE CHANGING ANYTHING
Look at how this app records homework, then tell me which is true:
  (a) A homework assignment is its own record, and each child has a result on it.
  (b) Homework is only recorded as points, with a reason that mentions homework.
  (c) There is no homework here at all.
If (b) or (c): do steps 3 and 4 only, tell me, and ask me before building any new
homework feature. Do not invent assignments out of point awards.
If (a): do all of it.

Also tell me: can one child be in two classes? If so, do they have one student
number or one per class? HEC links one number to one child, so I need to know.

STEP 2. ADD TWO KINDS OF RECORD TO export-events (only if step 1 found (a))
Everything about the feed stays as it is: seq, event_id, occurred_at, class_ref,
student_ref, lesson_date, payload, oldest first, the cursor, the secret, the limits.
attendance, points and retraction do not change. These are two new values of `kind`.

A homework, one per assignment:
  {
    "seq": <next seq>,
    "event_id": "<uuid>",
    "occurred_at": "<when it was recorded>",
    "kind": "homework",
    "class_ref": "19",
    "student_ref": null,
    "lesson_date": "2026-11-04",       // the day it was set, Vietnam date
    "payload": {
      "homework_ref": "5521",          // this app's permanent id for it, as text
      "title": "Unit 4 workbook p.12", // required, 500 characters at most
      "body": "Optional instructions", // or null
      "due_date": "2026-11-11"         // YYYY-MM-DD, or null
    }
  }

A grade, one per child per assignment:
  {
    "seq": <next seq>,
    "event_id": "<uuid>",
    "occurred_at": "<when it was recorded>",
    "kind": "grade",
    "class_ref": "19",
    "student_ref": "121",
    "lesson_date": "2026-11-11",       // the day it was graded, Vietnam date
    "payload": {
      "homework_ref": "5521",
      "grade": "8/10",                 // required, as the teacher wrote it, 100 characters at most
      "points": 5,                     // whole number, or null if no points go with it
      "feedback": "Nice work"          // or null
    }
  }

The rules:
- A homework must come before its grades in seq order.
- Homework edited: send a new `homework` record with the same homework_ref. It
  replaces what the earlier one said. No retraction.
- Homework deleted: send a `retraction` naming the latest homework record's
  event_id, with reason "removed".
- Grade changed: the same as a register mark today, a `retraction` of the old
  record followed by a new `grade` record.
- Grade removed: a `retraction`, reason "removed".
- DO NOT PAY TWICE. Points that go with a grade travel in grade.payload.points.
  Do NOT also send them as a `points` record. HEC cannot tell the two apart, and
  the child would get both. Awards not tied to a graded homework stay `points`
  records, as they are today.

Backfill, once: add records for homework set and grades given in the last 60 days,
as new records at the end of the feed (new, higher seq; lesson_date and occurred_at
stay the real dates). Do not resend attendance or points. Use a deterministic
event_id so that running the backfill twice cannot create duplicates. If an award
on a backfilled grade already went out as a `points` record, send that grade with
"points": null.

STEP 3. FILE MORE HOMEWORK AS HOMEWORK
`category` is worked out from what the teacher typed, and only the word "homework"
counts. Also treat these as homework, ignoring case and accents: hw, h.w, home work,
btvn, bài tập, bai tap, bài về nhà. A deduction still arrives as `adjustment`. This
is for new records only. Do not change or resend old ones.

STEP 4. ADD A NEW EDGE FUNCTION: export-roster
HEC needs to show an admin children's names instead of numbers. Same project, same
secret, same style as export-events.

  GET /functions/v1/export-roster
  Header: x-sync-secret: <the same secret>

Wrong or missing secret: 401. Any other verb: 405. Send Cache-Control: no-store.
Answer:
  {
    "classes": { "19": "Stars", "22": "Stars 2", "12": "Sanrio Grade 6" },
    "students": { "121": "Bin", "122": "Minh" },
    "student_classes": { "121": ["19"], "122": ["19", "22"] },
    "inactive_students": ["88"]
  }

- classes: every class that export-events can send, class number to name.
- students: every child who has ever appeared in export-events, including archived
  children, student number to the name shown in this app.
- student_classes: each child's current classes. Always a list.
- inactive_students: numbers of archived children.
- Numbers are text, and the same permanent numbers export-events uses.
- Names and class membership only. No parents, phone numbers, emails, birthdays or
  notes. HEC does not store this list.
- Do not add names to export-events. They belong only in this endpoint.

STEP 5. DO NOT
- Do not reset, renumber or reuse any seq or event_id.
- Do not change the shape of attendance, points or retraction.
- Do not put the secret in code, a migration, a comment or a log.
- Do not log payloads. They are about children.

STEP 6. CHECK IT, THEN TELL ME
- export-roster with the right secret answers as above; with a wrong secret, 401;
  with POST, 405.
- export-events with since=<the highest seq before this change> returns only the new
  records, in order, and each homework comes before its grades.
- Running the backfill again adds nothing.
Then tell me: which case step 1 found, the answer about children in two classes, how
many homework and grade records were added, and the highest seq now.
````

## After Pixel Pal has run it

**Admin → Stars Sync → Records**, then the **Homework** view. New assignments and
grades appear there, and in **Tools → Homework check**. Then compare one child's
homework in HEC with Pixel Pal. If Pixel Pal's builder answers that one child has
two numbers, tell whoever maintains HEC: `stars_student_map` allows one number per
child, on purpose, and that would need a deliberate change.
