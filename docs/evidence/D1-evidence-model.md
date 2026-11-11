# D1 - Evidence model: "was this class held?"

Design only. No code, no migration and no live-database access went into this file.
Every schema claim cites `file:line` in this repo at `9ba819f` (conductor branch, on top of `origin/main` c7c5f21).
Paths: `M/` = `supabase/migrations/`, `F/` = `supabase/functions/`, `T` = `src/integrations/supabase/types.ts`.

Deliverables the implementer builds from this file:

- `supabase/migrations/20261112090000_session_held_evidence.sql` (D's timestamp block, MASTER_PLAN section 5)
- `scripts/pgtest/session-evidence.test.mjs`, registered in `scripts/pgtest/run.mjs`

Nothing here changes a figure, a guard or a row. The function is read-only (`STABLE`).

---

## 0. Facts everything below rests on

| Fact | Where |
|---|---|
| `sessions(id, class_id, date DATE, start_time TIME, end_time TIME, status session_status, teacher_id, ...)`. Date and times are wall-clock values with no zone. | `M/20251012020423_f00f2350-14fd-44b1-b5cc-f0360ab9fcdf.sql:19-32`; `T:3593-3613` |
| `session_status` is exactly `Scheduled`, `Held`, `Canceled`. | `M/20251012020423_...sql:2` |
| `canceled_reason / canceled_by / canceled_at` exist on sessions. | `M/20251017022007_0bc6b318-3a3a-4584-a89f-e0bb9d198246.sql:2-5` |
| At most one non-cancelled session per `(class_id, date, start_time)`; two sessions of one class on one date ARE possible (different start times). | `M/20251017144629_04ea3541-2935-42d5-a06b-37bbed64d2b4.sql:29-31` |
| The database treats session wall-clock as `Asia/Bangkok` (UTC+7, no DST - identical offset to `Asia/Ho_Chi_Minh`). | `M/20251016045745_755294d2-f62d-468d-b15c-a3ad25c73da8.sql:19-23`; `M/20261028090000_stars_sync_review_fixes.sql:677-678` |
| `attendance(session_id, student_id, status, marked_at, marked_by NULLABLE, notes, created_at, updated_at)`, `UNIQUE(session_id, student_id)`, status in `Present/Absent/Excused/Late`. | `M/20251012062405_b0d6758e-c136-4ded-98c5-446357e758a6.sql:2-13`; `M/20260712100000_attendance_allow_late_status.sql:16-17`; `T:277-288` |
| Cancelling a session rewrites EVERY attendance row on it to `Excused` (AFTER UPDATE trigger, only on the transition into `Canceled`). `marked_by` is left as it was. | `M/20261027090000_cancelled_lesson_attendance_guard.sql:150-172` |
| Every attendance write takes `FOR UPDATE` on the parent session row. | `M/20261027090000_...sql:128` |
| A session is billable for a child only when status is `Scheduled`/`Held` AND the child's attendance row is `Present`/`Absent`/`Late`. No row, or `Excused`, is not billed. | `F/_lib/tuition-session.ts:2-4`; `F/calculate-tuition/index.ts:189-200` |
| Staff are paid only for `Held` sessions. | `F/_lib/payroll-sessions.ts:21` |

Consequence that shapes the whole design: **the evidence must be read BEFORE the cancel lands.** After it, the marks are all `Excused` and the strongest evidence type is gone. See section 7 (notes for D2/D5).

---

## 1. Candidate evidence, verified against the real tables

### 1.1 Attendance marked by a person (Present / Late)

**Supported. This is the primary STRONG source.**

Table `attendance`, joined by `attendance.session_id = p_session_id` (direct FK, `ON DELETE CASCADE`, `M/20251012062405_...sql:4`). Index `idx_attendance_session_id` exists (`M/20260504024032_bcf6e388-8d42-470b-b6f9-d272c75e4a9f.sql:5`).

Who writes attendance, and what each writer leaves in `marked_by`:

| Writer | `marked_by` | `status` | `notes` | Human? | Cite |
|---|---|---|---|---|---|
| Seed on session insert / enrollment insert (`_attendance_seed_for_class_dates`) | `NULL` (literal) | `Present`, or `Excused` for a cancelled lesson / a weekday outside `allowed_days` | NULL | **No** - exists from the moment the session is generated, including future sessions | `M/20261027090000_...sql:181-208` (NULL at :200); triggers `M/20251012065759_96bef71a-5176-485d-8357-3c2a25cb2688.sql:23-45, 48-65` |
| `auto-mark-attendance` (cron, 10 pm) | `null` ("System-marked") | `Present` | NULL | **No** | `F/auto-mark-attendance/index.ts:99-107`. It only inserts rows for children with no row, and never touches `sessions.status` (it only reads it, `:44-48`) |
| `repair-attendance` (admin tool) | `null` | admin's choice of `Present/Absent/Excused` | `Auto-repaired on YYYY-MM-DD` | **No** for our purpose: a bulk back-fill over a date range, not a register taken in a lesson | `F/repair-attendance/index.ts:96-102` |
| `generate-sessions` | - | - | - | n/a: `F/generate-sessions/index.ts` is an empty file (0 bytes). Sessions come from `schedule-sessions`; attendance rows come from the seed trigger above. | |
| `mark-attendance` (teacher or admin, service role after its own checks) | caller's `user.id` | any of the four | optional | **Yes** | `F/mark-attendance/index.ts:151-158`; role gate `:64`; teaches-this-class gate `:121-132` |
| Teacher screen writing straight through RLS | `user?.id` | any | optional | **Yes** | `src/components/teacher/AttendanceMarking.tsx:195-206` |
| Stars sync (`stars_sync__apply_event`) | the acting TEACHER's `user_id` | `Present/Absent/Excused/Late` as Pixel Pal sent | `'Pixel Pal'` | **Teacher's register, taken in Pixel Pal** (see below) | `M/20261028090000_stars_sync_review_fixes.sql:775-781`; state row `:792-795` |
| `stars_sync_resolve_conflict` (admin settles a conflict) | `auth.uid()` (the admin) | Pixel Pal's value | unchanged | **Yes** | `M/20261104090000_stars_sync_homework.sql:857-859` |
| Stars withdrawal | restores the previous `status`/`marked_by`, or deletes the row | | | restores whatever it was | `M/20261028090000_...sql:569-598` |
| Cancel trigger | unchanged | `Excused` | unchanged | No | `M/20261027090000_...sql:157-160` |
| Enrollment guard | unchanged (may force `Excused` when `marked_by IS NULL`) | | | No | `M/20261106100000_attendance_guard_no_auto_changes.sql:11-16` |

**The rule that separates human from automatic: `marked_by IS NOT NULL`.** All three automatic writers (seed, auto-mark, repair) write `NULL`; every person-driven path writes a user id. `supabase/AGENTS.md` states the same thing ("seeded placeholders (`marked_by IS NULL AND status = 'Present'`) - repair-attendance also writes `marked_by IS NULL`").

Limit of that rule, stated honestly: RLS does not constrain the column. The admin and teacher policies check only who the caller is and which session (`M/20251012063108_f0e79539-c9bf-469c-a44f-801b2fc06e3b.sql:13-27`; `M/20260403050441_977c8954-c264-4b1d-bc3d-5fd3871116e1.sql:8-67`), so a hand-written request could store any `marked_by`. No screen does. The effect of a forged NULL is a false NONE on that row, and of a forged id a false STRONG; both are only reachable by staff who can mark the register anyway.

**Stars-sync marks: they count, at full strength.** Decision and reasons:

1. The mark is not invented by HEC. It is a record a teacher made in Pixel Pal's register; the engine refuses it unless the lesson has started in HEC (`now >= start + 5 min`, `M/20261028090000_...sql:683-687`), unless it was made within 24 h of the lesson's end (`:689-693`), unless the class and child are mapped and the child is enrolled that day (`:624-641`), and unless the chosen teacher passes `is_teacher_of_class` (`M/20261104090000_...sql:113`).
2. `supabase/AGENTS.md`: "A Pixel Pal mark has to do exactly what a mark made in HEC does". It already flips the lesson to `Held` and so already pays the teacher (`M/20261028090000_...sql:783-790`). Evidence that is good enough to pay on is good enough to warn on.
3. Excluding it would give a false NONE for exactly the classes whose teachers use Pixel Pal - the direction that lets a taught class be cancelled silently.

They stay distinguishable for the admin: a mark is reported as `pixel_pal` when a `stars_sync_attendance_state` row exists for `(session_id, student_id)` with the same `status` (`M/20261027100000_stars_sync_engine.sql:172-179`). That table also gets a row when the sync merely "adopted" a value a person had already entered (`M/20261028090000_...sql:742-751`), which is fine: then both sources agree.

Could not determine from the repo: whether Pixel Pal's own register pre-fills `Present` for everyone (i.e. whether a Pixel Pal `Present` is always a deliberate tick). See open question Q3.

**Counting rule (type `attendance_present`):** rows with `session_id = p AND marked_by IS NOT NULL AND status IN ('Present','Late')`.

**Second, weaker type (`attendance_register_only`):** rows with `marked_by IS NOT NULL AND status = 'Absent'` when there is no `attendance_present` row. A person took the register and nobody was there. Human-marked `Excused` is NOT evidence: it is what a person marks for a lesson a child (or everyone) did not have.

### 1.2 Transcript / lesson recording

**Partly supported. The direct link exists in the schema and is never written; the usable link today is class + upload day, which is heuristic.**

- `class_transcripts(class_id NOT NULL, session_id NULLABLE -> sessions ON DELETE SET NULL, uploaded_by NOT NULL, transcript_date DATE NOT NULL DEFAULT CURRENT_DATE, source_format, status in processing/analyzed/failed, audio_storage_path, audio_duration_seconds, created_at)`: `M/20260712090000_data_driven_instruction_pipelines.sql:98-115`; audio columns and `'audio'` format `M/20260717090000_audio_transcript_pipeline.sql:9-17`; `T:913-937`.
- Index: `idx_transcripts_class (class_id, transcript_date DESC)` (`M/20260712090000_...sql:117-118`).
- **No code path sets `session_id` or `transcript_date`.** Both inserts in `src/pages/TeacherTranscripts.tsx` (`:261-271` pasted text, `:323-335` audio upload) send neither; `grep session_id src/pages/TeacherTranscripts.tsx` finds nothing. So `session_id` is NULL on every existing row and `transcript_date` is the column default: **the UTC date of the upload**, not the lesson date. A recording uploaded the next morning, or before 07:00 Hanoi time, lands on a different date from the lesson.
- Always a person: `uploaded_by` is NOT NULL and the insert policies are admin or `is_teacher_of_class` (`M/20260712090000_...sql:122-130`). Nothing automatic creates transcripts.

Two types:

- `transcript_linked` (STRONG): `class_transcripts.session_id = p AND status <> 'failed'`. Dormant today; it becomes live the day anything writes `session_id` (workstream C, or a future "which lesson is this?" picker). A `failed` row is excluded because a failed paste proves nothing; a failed AUDIO row still has a file, so `failed` rows with `audio_storage_path IS NOT NULL` are counted.
- `transcript_same_day` (SOFT): `session_id IS NULL AND class_id = s.class_id AND (transcript_date = s.date OR created_at falls inside the Hanoi day of s.date)`, same `failed` rule. Heuristic by construction, so it never reaches STRONG alone.

`lesson_overviews` (`M/20260718090000_lesson_overviews.sql:26-37`) is derived from a transcript (`transcript_id UNIQUE`) and is not counted separately - it is the same act seen twice.

**Extension point for workstream C's recorder (`class_recordings`-style table).** The table does not exist and its columns are not decided, so the function must not name it. The migration creates a second, internal function:

```
public.session_recording_evidence(p_session_id uuid) RETURNS jsonb   -- STABLE, SECURITY DEFINER, search_path = public
```

D1 ships it returning `'[]'::jsonb`. `session_held_evidence` calls it and treats each element as an item of type `recording_completed` (STRONG). Workstream C's migration does `CREATE OR REPLACE FUNCTION public.session_recording_evidence` - and nothing else - returning one element per COMPLETED recording of that session in the item shape of section 4 (`count`, `detail`, `at`, `actor_id`, `row_keys`). `session_held_evidence`, the trigger, the edge functions and the UI do not change. Rules the main function enforces on what comes back, so a careless replacement cannot weaken the guard: a non-array or NULL result is treated as `[]`; `type`, `strength`, `family` and `label_key` are overwritten by the main function; an element without a non-empty `row_keys` array is dropped. `EXECUTE` on the helper is revoked from everyone; only the definer function calls it. No dynamic SQL and no `to_regclass` probing: both would make the result depend on catalog state the test cannot see.

### 1.3 Homework assigned or checked that day

**Weakly supported. No link to a session; class + day only; and it is not evidence of presence.**

- `homeworks(class_id NOT NULL, due_date, created_by, created_at timestamptz DEFAULT now())`: `M/20251012110051_906fecf6-f2cf-44da-a036-6afc3bea4db5.sql:2-10`; `T:1884-1895`. Index `idx_homeworks_class_created (class_id, created_at DESC)` (`M/20260117143635_07bd3d8a-bcd5-45a8-a340-e9aca0cb5d50.sql:10`).
- "Assigned that day" = `class_id = s.class_id AND created_at` inside the Hanoi day of `s.date`.
- Human vs automatic: teacher/admin screens insert with their own id. The Stars sync also inserts homeworks, as the acting teacher (`M/20261104090000_stars_sync_homework.sql:498-499`), and its `created_at` is the time the SYNC ran, not when the teacher set the work. Sync-created homeworks are identified by a `stars_homework_map` row for the `homework_id` (`:500-501`) and are **excluded** from this type.
- "Checked that day" = `homework_submissions.graded_at` inside the Hanoi day, for a homework of the class (`T:1812-1829`; there is no `graded_by` column, so no actor). The Stars sync writes grades too (`M/20261104090000_...sql:657-666`); rows with a `stars_sync_grade_state` entry for the same `(homework_id, student_id)` (`M/20261104090000_...sql:59-67`) are excluded for the same reason as above. `stars_homework_map.homework_id` is UNIQUE (`M/20261023100000_stars_sync_foundation.sql:88-92`).
- Why only auxiliary: homework is set and marked from home at any hour, and a teacher whose class was called off will often set homework that very day to make up for it. On its own it lifts NONE to SOFT so the admin sees it; it can never contribute to STRONG.

Types `homework_assigned`, `homework_graded`, both family `H` (auxiliary).

### 1.4 Points awarded for the class that day

**Supported as SOFT, with care about which rows.**

- `point_transactions(class_id NOT NULL, session_id NULLABLE -> sessions ON DELETE SET NULL, student_id, points, type, date DATE NOT NULL, created_by NULLABLE, notes, created_at)`: `M/20251107052426_4399bd71-e2f2-4b22-856d-269afb51c7e3.sql:2-15`; `T:3159-3173`. Index `idx_point_transactions_class_month (class_id, date)` (`:19`).
- Types allowed: `homework, participation, adjustment, correction, reading_theory, vocabulary_quiz, early_submission` (`M/20261023090000_homework_grading_integrity.sql:73-77`).

Which rows mean "a teacher rewarded a child in this lesson":

| Writer | type | `created_by` | `session_id` | Counts? |
|---|---|---|---|---|
| Teacher live award (`awardPoints`) | `participation` / `correction` | teacher | set only while the session is still `Scheduled` (`getTodaySession`, `src/lib/pointsHelper.ts:113-123`), else NULL | **Yes** (`src/lib/pointsHelper.ts:83-89`) |
| Admin "participation points" panel in the attendance drawer | `participation` | **NULL** | the session | **Yes**, through the session link (`src/components/admin/ParticipationPoints.tsx:40-50`) |
| Award applied from a transcript suggestion | `participation` | teacher | NULL, `date = transcript_date` | Yes (`src/pages/TeacherTranscripts.tsx:671-681`) |
| Stars sync points | Pixel Pal's category | acting teacher | the day's single live session, else NULL | Yes when category is `participation`; notes start `[Pixel Pal]` (`M/20261028090000_...sql:854-859`) |
| **Attendance streak bonus** (automatic, +50) | `participation` | NULL | NULL | **No** (`F/_lib/attendance-effects.ts:145-151`) |
| Demo seed rows | `participation` | NULL | NULL | No (`F/manage-demo-student/index.ts:218-221`) |
| Vocabulary games (written with the CHILD's id in `created_by`) | `vocabulary_quiz` | child | NULL | No - wrong type (`F/record-practice/index.ts:59-67`, `F/save-word/index.ts:272-280`, `F/ocr-vocab-scan/index.ts:128-136`) |
| Homework award | `homework` | - | - | No: dated to the DUE date, not the lesson (`M/20261023090000_...sql:215-217`) |
| `adjustment`, `reading_theory`, `early_submission` | | | | No: corrections, test scores and submission timing, none tied to a lesson being taught |

**Counting rule (type `points_awarded`):** `class_id = s.class_id AND date = s.date AND type IN ('participation','correction') AND points > 0 AND (session_id = p OR (session_id IS NULL AND created_by IS NOT NULL))`.

That one predicate excludes every automatic row in the table above (all have `created_by IS NULL AND session_id IS NULL`) and includes the admin panel through its session link. A row linked to a DIFFERENT session of the same class and day is excluded; an unlinked row counts for every session of that class on that day (documented ambiguity, section 6).

Negative rows are ignored. A Pixel Pal award later withdrawn leaves a `+n` and a compensating `-n` (`M/20261028090000_...sql:496-502`) and still counts once; accepted, because points alone can only reach SOFT.

`skill_assessments` is not counted separately. `awardPoints` writes it in the same call as the point row (`src/lib/pointsHelper.ts:66-100`), so it adds nothing, and `approve_video_feedback` also writes a `speaking` score there (root `AGENTS.md`, Video homework) which is homework, not a lesson.

### 1.5 Payroll line / closed payroll month

**Supported per MONTH, not per session. So it is the "settled" flag first, and only SOFT corroboration of "held".**

- `payroll_periods(month text 'YYYY-MM' PK, status open/locked, locked_at, locked_by)`: `M/20261021093000_payroll_month_locking.sql:50-69`.
- `payroll_lines(month, teacher_id XOR assistant_id, sessions_count, total_minutes, total_amount_vnd, created_at)`: `:86-113`. **There is no session id on a payroll line.** It is impossible to say from the data that THIS lesson was among the `sessions_count` that was paid.
- `public.payroll_month_is_locked(text)` already exists, STABLE, granted to `authenticated` and `service_role` (`:162-176`). Reuse it; do not restate the rule.

What can be said: `payroll_month_is_locked(to_char(s.date,'YYYY-MM'))`, and, when the session is `Held` now and a line exists for its teacher (or for an assistant rostered on it with `attended`), that it was *very probably* paid. A session marked Held after the month was locked looks the same; that is the approximation, named in the output as `payroll_paid_as_held` and never used as more than SOFT.

### 1.6 Invoice paid or confirmed for the month

**Supported per student per month. It is NOT evidence that the lesson happened.** Bills are issued for the month ahead: `calculate-tuition` bills `Scheduled` sessions as well as `Held` ones (`F/_lib/tuition-session.ts:3`), so a paid October bill says nothing about whether 14 October was taught. It contributes to the **settled** flag only and never to the level.

- `invoices(student_id, month TEXT 'YYYY-MM', UNIQUE(student_id, month), status invoice_status, total_amount, paid_amount, recorded_payment, confirmation_status, confirmed_by, confirmed_at, tuition_frozen, carry_in_credit, ...)`: `M/20251012022746_8a89c9cd-950e-445d-bbcc-f917592fb193.sql:36-51`; `M/20251015053836_03ddf504-d67d-4256-aeef-c9ff04b8566f.sql:3`; `M/20251117061416_2afa5f4f-f2a4-48ba-9c52-9939e4ece5e9.sql:10-11`; `T:1976-2004`.
- `recorded_payment` is the month's own payments; `paid_amount` is cumulative across months and must not be used (`F/calculate-tuition/index.ts:554, 584-585`; root `AGENTS.md`, "Money").
- `confirmation_status`: `auto_approved` and `needs_review` are set by the calculator on every run (`F/calculate-tuition/index.ts:576`) - automatic, not counted. `confirmed` / `adjusted` are set by an admin through `confirm-tuition` (`F/confirm-tuition/index.ts:53-60`) - counted.
- `status` becomes `paid` / `partial` when a family payment is applied (`F/family-payment/index.ts:259-263`); `calculate-tuition` writes `issued` (`:593`).

**Affected students** of a session = children with an attendance row on it whose status is `Present`, `Absent` or `Late` - seeded rows included, because a seeded `Present` IS billed. These are exactly the rows the cancel trigger will turn to `Excused`, i.e. exactly the bills a cancellation moves.

**A student's month is settled** when their invoice for `to_char(s.date,'YYYY-MM')` exists and any of: `COALESCE(recorded_payment,0) > 0`; `status IN ('paid','partial')`; `confirmation_status IN ('confirmed','adjusted')`; `tuition_frozen`.

### 1.7 Status `Held`

**Supported, SOFT. It is a consequence of a mark, not an independent observation.**

Who flips `Scheduled -> Held`:

| Path | Cite | Note |
|---|---|---|
| `mark-attendance`, after ANY mark including all-Absent or all-Excused | `F/mark-attendance/index.ts:174-178` | teacher or admin |
| Teacher screen, only once 5 min past the end | `src/components/teacher/AttendanceMarking.tsx:208-221` | |
| Stars sync on a Pixel Pal mark; remembered in `stars_sync_held_flips`, and undone if the marks are withdrawn | `M/20261028090000_...sql:783-790, 604-611` | |
| `stars_sync_resolve_conflict` | `M/20261104090000_...sql:860` | admin |
| Admin sets it by hand: `manage-session` `change-status` / `update` | `F/manage-session/index.ts:192-217, 85-104` | no lesson needed |
| One-time back-fill in Oct 2025: every session that had ANY attendance row, seeded ones included | `M/20251012072856_8443195f-5eea-432b-be9f-890b61f5cbe8.sql:26-33` | old `Held` rows are not all human |

A BEFORE trigger silently turns `Held` back into `Scheduled` if the lesson has not reached start + 5 min (`M/20251016045745_...sql:17-30`), so `Held` cannot sit on a future lesson. There is no column recording when or by whom the flip happened (`audit_log` has it for updates since `M/20261009130000_audit_every_admin_action.sql:173-175`, but the evidence function does not read the audit log - too slow and not the source of truth).

Because the flip is caused by the same act as an attendance mark, `Held` and `attendance_register_only` are ONE family and cannot add up to STRONG together.

### 1.8 Other signals looked for

| Candidate | Finding |
|---|---|
| Video homework (`video_submissions`) | Keyed to `homework_id`, `class_id`, `student_id`; no session and recorded at home (`T:5934-5959`). Not evidence. |
| `lesson_overviews`, `lesson_resources`, `transcript_point_suggestions`, `transcript_speaker_metrics` | All hang off a transcript. Covered by 1.2; not counted again. |
| `skill_assessments` | Covered by 1.4; not counted again. |
| `student_work` (photographed classwork) | `class_id`, `created_at`, `uploaded_by`, no session (`T:5039-5063`). Plausible future SOFT type; left out now because uploads happen days later and the workflow column mixes homework in. Not counted. |
| `session_participants.attended` | An admin's record that an assistant did NOT work a lesson; default `true` (`T:3535-3546`). Says nothing about the lesson. Not counted. |
| Teacher check-in / clock-in | **None exists.** Searched migrations, functions and `src` for check-in/clock-in tables; the only hits are admin-unlock and access-code code. |
| `student_attendance_streaks` | Derived from marks. Not counted. |
| `audit_log` | Holds who changed what on `attendance` and `sessions` (`M/20261009130000_...sql:152-156, 173-175`). Used by D5 for PAST cancellations (section 7), not by this function. |

---

## 2. Levels: the truth table

Every item belongs to one family. The level is a pure function of which families are present.

| Family | Types in it | Meaning |
|---|---|---|
| **D** direct | `attendance_present`, `transcript_linked`, `recording_completed` | A person recorded a child as there, or the lesson itself was captured and tied to this session |
| **R** register / status | `attendance_register_only`, `status_held`, `payroll_paid_as_held` | Somebody treated the lesson as having run |
| **P** live teaching | `points_awarded` | A teacher rewarded children for this class that day |
| **T** transcript by day | `transcript_same_day` | A transcript or recording for this class turned up that day |
| **H** homework (auxiliary) | `homework_assigned`, `homework_graded` | Work was set or marked that day |
| **M** money (no level) | `payroll_month_locked`, `invoice_settled` | Feeds `settled` only |

```
STRONG  if  D is present
        or  at least two of {R, P, T} are present
SOFT    if  exactly one of {R, P, T} is present
        or  H is present
NONE    otherwise
```

M never changes the level. H never raises anything above SOFT. Several types inside one family count once.

Spelled out (D absent in every row below; with D present the level is STRONG regardless):

| R | P | T | H | Level |
|---|---|---|---|---|
| - | - | - | - | NONE |
| - | - | - | yes | SOFT |
| yes | - | - | any | SOFT |
| - | yes | - | any | SOFT |
| - | - | yes | any | SOFT |
| yes | yes | - | any | STRONG |
| yes | - | yes | any | STRONG |
| - | yes | yes | any | STRONG |
| yes | yes | yes | any | STRONG |

Single-type consequences worth reading twice:

| Only this is true | Level | Why |
|---|---|---|
| Seeded `Present` rows, any number | NONE | `marked_by IS NULL` |
| `auto-mark-attendance` rows | NONE | `marked_by IS NULL` |
| `repair-attendance` rows | NONE | `marked_by IS NULL` |
| One child marked `Present` or `Late` by a teacher, admin or Pixel Pal | STRONG | D |
| Everyone marked `Absent` by a teacher (session is therefore `Held`) | SOFT | R only: `attendance_register_only` + `status_held` are one family |
| Everyone marked `Excused` by a person, session `Held` | SOFT | `status_held` only |
| `Held` set by an admin, nothing else | SOFT | R |
| `Held` + participation points that day | STRONG | R + P |
| Points that day, session still `Scheduled` | SOFT | P |
| Transcript uploaded that day, nothing else | SOFT | T |
| Homework set that day, nothing else | SOFT | H |
| Automatic streak bonus dated that day | NONE | excluded row |
| Month's payroll locked, bill paid, session `Scheduled`, no marks | NONE, `settled.any = true` | M does not make a lesson held |
| Month locked, session `Held`, teacher has a payroll line | SOFT, settled | R (`status_held`, `payroll_paid_as_held`) |

No thresholds on counts: one qualifying row puts its family in play. Counts are reported for the admin to judge, not used to decide. (A threshold such as "three children" would make the level depend on class size and would need an owner decision per class.)

### 2.1 `settled` - separate from the level

```
settled.payroll_month_locked  = payroll_month_is_locked(to_char(s.date,'YYYY-MM'))
settled.payroll_paid_as_held  = payroll_month_locked AND s.status = 'Held'
                                AND a payroll_lines row exists for that month for s.teacher_id,
                                    or for an assistant on this session with participant_type = 'teaching_assistant' AND attended
settled.tuition               = at least one AFFECTED student's month is settled (1.6)
settled.tuition_students      = how many
settled.any                   = payroll_month_locked OR tuition
```

`settled.any` is what D2 keys its heavier path on. It is deliberately the wide reading asked for in the brief ("falls in a closed payroll month, or in a month with a paid/confirmed invoice for an affected student"). `payroll_paid_as_held` is the narrower fact, kept so D2/D3 can word the warning ("the teacher has probably been paid for this lesson").
