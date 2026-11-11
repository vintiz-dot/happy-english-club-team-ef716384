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

---

## 3. "That day": time zone

- `sessions.date` / `start_time` / `end_time` are Hanoi wall-clock values (section 0). The function uses ONE constant, `c_tz constant text := 'Asia/Ho_Chi_Minh'`. Existing database code uses `'Asia/Bangkok'`; the two zones have the same offset (UTC+7) and no DST, so results are identical. The test must assert the zone name resolves in pglite (case 21); if it does not, use `'Asia/Bangkok'` as the rest of the database does and say so in a comment.
- The Hanoi day of the session, as an instant range, computed once:
  `v_day_start := (s.date::timestamp AT TIME ZONE c_tz)`, `v_day_end := ((s.date + 1)::timestamp AT TIME ZONE c_tz)`.
  Every `timestamptz` column is tested as `col >= v_day_start AND col < v_day_end` (half-open, index-friendly, no casting of the column).
- `DATE` columns are compared to `s.date` directly. Two of them are not Hanoi dates and the rules already allow for it:
  - `point_transactions.date` is written by the browser as `new Date().toISOString().slice(0,10)` - the UTC date (`src/lib/pointsHelper.ts:114`, same idiom in `awardPoints`). It differs from the Hanoi date only between 00:00 and 07:00 Hanoi time, when no class runs. Accepted.
  - `class_transcripts.transcript_date` is the server's `CURRENT_DATE` at upload (1.2). That is why `transcript_same_day` ALSO accepts `created_at` inside the Hanoi day.
- The lesson window, reported but never used for the level: `v_start := ((s.date + s.start_time) AT TIME ZONE c_tz)`, `v_end := ((s.date + s.end_time) AT TIME ZONE c_tz)`, plus one day when `end_time <= start_time` (same rule as `M/20261028090000_stars_sync_review_fixes.sql:677-681`). `points_awarded.detail.in_lesson_window` counts rows with `created_at` between `v_start - 15 min` and `v_end + 30 min`.
- `now()` appears only in `computed_at`. Nothing about the level, the items or the hash depends on the current time, so the same data gives the same answer tomorrow.

---

## 4. The function

```
public.session_held_evidence(p_session_id uuid) RETURNS jsonb
LANGUAGE plpgsql  STABLE  SECURITY DEFINER  SET search_path = public
```

plus the internal extension point of 1.2:

```
public.session_recording_evidence(p_session_id uuid) RETURNS jsonb
LANGUAGE sql  STABLE  SECURITY DEFINER  SET search_path = public      -- body: SELECT '[]'::jsonb
```

### 4.1 Return value

```jsonc
{
  "version": 1,
  "session": { "id", "class_id", "date": "YYYY-MM-DD", "start_time", "end_time", "status", "teacher_id" },
  "level": "NONE" | "SOFT" | "STRONG",
  "families": { "D": bool, "R": bool, "P": bool, "T": bool, "H": bool },
  "settled": {                       // null when "redacted" is true
    "any": bool,
    "month": "YYYY-MM",
    "payroll_month_locked": bool,
    "payroll_paid_as_held": bool,
    "tuition": bool,
    "tuition_students": int,         // affected students whose month is settled
    "affected_students": int         // attendance rows Present/Absent/Late on this session
  },
  "items": [ Item, ... ],            // fixed order, see 4.2; family M items omitted when redacted
  "snapshot_hash": "<64 lowercase hex>",
  "viewer": "admin" | "teacher" | "internal",
  "redacted": bool,
  "computed_at": "<timestamptz>"     // informational; not hashed
}
```

`Item`:

```jsonc
{
  "type": "attendance_present",      // one of the 12 types below
  "family": "D",
  "strength": "strong" | "soft" | "aux" | "money",
  "label_key": "evidence.attendance_present",   // always "evidence." || type; D3 owns the wording
  "count": 7,
  "detail": { ... },                 // per type, below; counts and ids of staff only
  "at": "<timestamptz>" | null,      // the most recent qualifying row
  "actor_id": "<uuid>" | null        // auth user behind that most recent row, when the table records one
}
```

An item is present only when its `count > 0`. The output never contains a child's name or a child's id: counts only. (Row identities go into the hash, not into the JSON.)

### 4.2 The twelve item types, in output order

| # | type | family / strength | Rows (all scoped as in section 1) | `count` | `detail` | `at` / `actor_id` | row key (for the hash) |
|---|---|---|---|---|---|---|---|
| 1 | `attendance_present` | D / strong | attendance: `session_id = p`, `marked_by IS NOT NULL`, status `Present`/`Late` | rows | `present`, `late`, `pixel_pal` (rows with a `stars_sync_attendance_state` row of equal status), `hec` (the rest), `markers` (distinct `marked_by`) | max `marked_at` / that row's `marked_by` | `student_id:status:marked_by` |
| 2 | `recording_completed` | D / strong | elements returned by `session_recording_evidence(p)` | sum of element `count` (default 1 each) | element `detail` values collected under `recordings: [...]` | max element `at` / its `actor_id` | each element's `row_keys` |
| 3 | `transcript_linked` | D / strong | class_transcripts: `class_id = s.class_id AND session_id = p`, and (`status <> 'failed'` or `audio_storage_path IS NOT NULL`) | rows | `audio` (rows with a stored recording), `analyzed`, `audio_seconds` (sum, rounded) | max `created_at` / `uploaded_by` | `id:status` |
| 4 | `attendance_register_only` | R / soft | emitted ONLY when item 1 is absent: attendance `session_id = p`, `marked_by IS NOT NULL`, status `Absent` | rows | `absent`, `pixel_pal`, `hec`, `markers` | max `marked_at` / `marked_by` | `student_id:status:marked_by` |
| 5 | `status_held` | R / soft | `s.status = 'Held'` | 1 | `flipped_by_stars_sync` (a `stars_sync_held_flips` row exists) | `stars_sync_held_flips.flipped_at` or null / null | literal `Held` |
| 6 | `payroll_paid_as_held` | R / soft | section 2.1 | 1 | `month`, `lines` (matching payroll_lines rows) | `payroll_periods.locked_at` / `locked_by` | `month` + each matching `payroll_lines.id` |
| 7 | `points_awarded` | P / soft | point_transactions, rule of 1.4 | rows | `students` (distinct), `total_points`, `linked_to_session`, `pixel_pal` (`notes LIKE '[Pixel Pal]%'`), `in_lesson_window` | max `created_at` / `created_by` (may be null) | `id:points` |
| 8 | `transcript_same_day` | T / soft | class_transcripts, rule of 1.2 | rows | as item 3 | max `created_at` / `uploaded_by` | `id:status` |
| 9 | `homework_assigned` | H / aux | homeworks: `class_id = s.class_id`, `created_at` in the Hanoi day, no `stars_homework_map` row | rows | `with_due_date` | max `created_at` / `created_by` | `id` |
| 10 | `homework_graded` | H / aux | homework_submissions joined to homeworks of the class, `graded_at` in the Hanoi day, no `stars_sync_grade_state` row | rows | `homeworks` (distinct) | max `graded_at` / null | submission `id` |
| 11 | `payroll_month_locked` | M / money | `payroll_month_is_locked(month)` | 1 | `month` | `locked_at` / `locked_by` | `month` |
| 12 | `invoice_settled` | M / money | section 1.6 | settled affected students | `month`, `affected_students`, `paid` (`recorded_payment > 0` or status paid/partial), `confirmed`, `frozen`, `with_carry_in_credit` (reported, not part of the rule - Q4) | max `confirmed_at` or null / null | `student_id:` + three flags paid/confirmed/frozen as `0/1` |

### 4.3 `snapshot_hash`

Purpose: D2's acknowledgement token says "I saw THIS evidence". The hash must be identical for two reads of unchanged data - by anyone, in any order of rows, at any time - and different as soon as any fact an admin was shown (or the session itself) changes.

Definition, exactly:

```
fp(item)    = md5( string_agg(row_key, ',' ORDER BY row_key) )          -- over that item's qualifying rows
hash_input  = jsonb_build_array(
                1,                                                       -- algorithm version; bump on any rule change
                jsonb_build_array(s.id, s.class_id, s.date, s.start_time, s.end_time, s.status, s.teacher_id),
                v_level,
                jsonb_build_array(payroll_month_locked, payroll_paid_as_held, tuition_settled),
                ( jsonb_agg( jsonb_build_array(type, count, fp) ORDER BY type ) over ALL items present, '[]' if none )
              )
snapshot_hash = encode( sha256( convert_to(hash_input::text, 'UTF8') ), 'hex' )
```

Rules:

1. **Order-stable.** Every aggregate that feeds the hash has an explicit `ORDER BY` on a text key. Nested arrays, not objects, so nothing depends on jsonb key ordering. Row keys are built with `::text` casts of uuids, integers and enum/text values only - no floats, no timestamps.
2. **Computed before redaction** and over ALL twelve types, money included. A teacher and an admin get the same hash for the same data. The hash reveals nothing (SHA-256 over uuids).
3. **Not in the hash:** `computed_at`, `viewer`, `redacted`, labels, every `at` timestamp, every `detail` field that is not already implied by a row key. So a teacher re-saving an unchanged register (new `marked_at`, same statuses, same `marked_by`) does NOT invalidate an admin's acknowledgement, while changing one child from Absent to Present, a different person re-marking, a new point row, a transcript finishing analysis, the month being locked, a bill being paid, or the session being moved or re-statused all do.
4. Seeded rows change the hash only through `invoice_settled` (they define who is affected). A new seeded row for a child with no settled bill changes nothing - correct, the admin was shown nothing about it.
5. `sha256(bytea)` and `md5(text)` are core Postgres (no pgcrypto), so they exist in pglite.

### 4.4 SECURITY DEFINER, and who may call

**Definer, with the check inside.** Reasons:

- The answer has to be the same whoever asks, or the hash is useless as a token. Under INVOKER a teacher cannot read `invoices`, `payroll_lines` or `stars_sync_attendance_state` (admin-only policies: `M/20261021093000_payroll_month_locking.sql:241-255`; `M/20261027100000_stars_sync_engine.sql:180-182`), and a covering teacher's view of `attendance` is limited to sessions they are on (`M/20260403050441_...sql:8-18`). Level and hash would vary by caller.
- D2's trigger calls it from inside a `SECURITY DEFINER` trigger function fired by whichever role performed the update (service role from `manage-session`, `authenticated` from a direct write). The evidence must not depend on that either.
- It is `STABLE` and writes nothing, so definer rights cannot be turned into a write. This matches the existing helpers (`has_role`, `is_teacher_of_class`, `student_enrolled_on`, `payroll_month_is_locked` are all definer).

Authorisation, in this order, inside the function:

```
IF p_session_id IS NULL                      -> RAISE ... USING ERRCODE = '22004'
v_uid  := auth.uid();   v_role := auth.role();
SELECT ... INTO s FROM public.sessions WHERE id = p_session_id;      -- plain read, no lock (STABLE)

internal := v_uid IS NULL AND v_role IS DISTINCT FROM 'authenticated' AND v_role IS DISTINCT FROM 'anon'
            -- service-role edge function, a trigger fired by one, the SQL editor, cron
admin    := v_uid IS NOT NULL AND public.has_role(v_uid, 'admin'::public.app_role)
teacher  := FOUND AND v_uid IS NOT NULL AND public.is_teacher_of_class(v_uid, s.class_id)

IF NOT (internal OR admin OR teacher)        -> RAISE 'not allowed'      USING ERRCODE = '42501'
IF NOT FOUND                                 -> RAISE 'lesson not found' USING ERRCODE = 'P0002'
```

- The 42501 check comes before the not-found check, so a caller who is neither admin nor the class's teacher gets the same error for a real and an invented id: nothing leaks about other classes.
- `is_teacher_of_class` is the one definition of "your class" (`M/20261111110000_ta_standing_assignments_and_homework_upload.sql:54-118`); it includes standing and rostered assistants. Do not write a second test.
- **Teacher view is redacted:** `settled` is `null`, items 11 and 12 are removed, `redacted: true`. Item 6 stays (it carries no amount, only that the month is closed, which staff may already read: `M/20261021093000_...sql:236-239`). Admin and internal views are complete.
- `auth.role()` is already used this way in the tree (`M/20251024152825_6747d865-6888-4aa4-b728-fdb8e5a109d3.sql:35`).

**Missing session never returns JSON.** A `null` or an empty object could be read by a careless caller as "no evidence, go ahead". It raises instead (fail closed). Same for a NULL argument. Any error inside the helper or a lookup propagates; nothing is caught and turned into NONE.

### 4.5 Grants (in the migration, explicitly)

```
REVOKE ALL ON FUNCTION public.session_held_evidence(uuid)      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.session_held_evidence(uuid)  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.session_recording_evidence(uuid) FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

No table is created, so no table GRANTs are needed. No policy changes. The migration starts with a preflight `DO` block in the style of `M/20261027090000_cancelled_lesson_attendance_guard.sql:51-82` that RAISES if any of these is missing, rather than installing a function that fails at the first cancellation: `session_status` label `Canceled`; functions `has_role(uuid, app_role)`, `is_teacher_of_class(uuid, uuid)`, `payroll_month_is_locked(text)`, `auth.uid()`, `auth.role()`; tables `attendance`, `point_transactions`, `class_transcripts`, `homeworks`, `homework_submissions`, `invoices`, `payroll_periods`, `payroll_lines`, `session_participants`, `stars_sync_attendance_state`, `stars_sync_held_flips`, `stars_homework_map`, `stars_sync_grade_state`; columns `invoices.recorded_payment`, `invoices.confirmation_status`, `invoices.tuition_frozen`, `class_transcripts.audio_storage_path`. It must apply twice unchanged (`CREATE OR REPLACE`; the owner pastes by hand).

Because migrations are applied by hand, the live database may lag the tree; the preflight is what turns "a column is not there yet" into a clear message at paste time.

### 4.6 Performance

One session row by primary key, then about a dozen small indexed reads. Every one has an index already; **no new index is required.**

| Read | Index used | Cite |
|---|---|---|
| attendance by `session_id` | `idx_attendance_session_id` | `M/20260504024032_bcf6e388-8d42-470b-b6f9-d272c75e4a9f.sql:5` |
| stars state by `(session_id, student_id)` | primary key | `M/20261027100000_stars_sync_engine.sql:178` |
| held flip by `session_id` | primary key | `M/20261028090000_stars_sync_review_fixes.sql:107` |
| point_transactions by `(class_id, date)` | `idx_point_transactions_class_month` | `M/20251107052426_...sql:19` |
| class_transcripts by `class_id` (+ date) | `idx_transcripts_class` | `M/20260712090000_...sql:117-118` |
| homeworks by `(class_id, created_at)` | `idx_homeworks_class_created` | `M/20260117143635_...sql:10` |
| homework_submissions by `homework_id` | `idx_homework_submissions_homework_id` | `M/20260504024032_...sql:31` |
| stars_homework_map by `homework_id` | UNIQUE | `M/20261023100000_stars_sync_foundation.sql:90` |
| payroll_periods by `month` | primary key | `M/20261021093000_...sql:52` |
| payroll_lines by `(month, teacher_id)` / `(month, assistant_id)` | unique indexes | `M/20261021093000_...sql:115-118` |
| session_participants by `session_id` | `idx_session_participants_session` | `M/20260322050903_f081efc8-9be3-42ea-8ce5-7fe8e7fcdf23.sql:39` |
| invoices by `(student_id, month)` | UNIQUE | `M/20251012022746_...sql:50` |

Write `transcript_linked` as `class_id = s.class_id AND session_id = p` (never `session_id = p` alone: that column has no index). Write each read as its own statement into local variables; do not build one large join. Expected cost is a few milliseconds per session; a bulk cancel of a few hundred sessions calls it once per row inside D2's trigger and stays well under a second. It is called on demand only - never from a list view per row (D3: fetch when the dialog opens).

### 4.7 One copy

`session_held_evidence` is the only place the question "is there evidence this lesson was held?" is answered.

- **D2's trigger and `cancel_session_checked`** call it and compare `snapshot_hash` with the token.
- **Edge functions** (`manage-session`, `bulk-cancel-sessions`) call it by `rpc('session_held_evidence', { p_session_id })` and pass the JSON through; they do not inspect attendance or points themselves.
- **The UI** (D3) renders `level`, `settled` and `items` from that JSON using `label_key`; it must not query `attendance`/`point_transactions` to decide whether to warn, and must not recompute a level from the items.
- No TypeScript mirror of the rules, no SQL view restating them. A new evidence source is a new item type inside this function plus a test case - or, for recordings only, a replacement of `session_recording_evidence`.
- Regenerating `src/integrations/supabase/types.ts` is the conductor's job (shared file); until then the client calls it through an untyped `rpc`.

---

## 5. Test: `scripts/pgtest/session-evidence.test.mjs`

Registered in `scripts/pgtest/run.mjs` beside the cancelled-lessons suite (`run.mjs:47-51`) with

```
migrations: ["20261027090000_cancelled_lesson_attendance_guard.sql",
             "20261112090000_session_held_evidence.sql"]
```

so the REAL cancel trigger is present (case 19) and the SQL is read from `supabase/migrations/`, never from `drizzle/` (root `AGENTS.md`, Database migrations).

### 5.1 Prelude

Same approach as `scripts/pgtest/cancelled-lessons.test.mjs:14-25`: hand-written minimal tables carrying every real column the migrations touch, nothing more. "A prelude thinner than production turns a real column into a test-only failure" (`:19-22`) - so column names and nullability must match `T`.

- Roles `anon`, `authenticated`, `service_role`.
- `CREATE SCHEMA auth`; `auth.uid()` reading `current_setting('test.uid', true)` (as `scripts/pgtest/video-homework.test.mjs:130-131`); `auth.role()` reading `current_setting('test.jwt_role', true)` and returning NULL when empty.
- `public.app_role` enum (take the real labels from `T` Enums); `public.session_status` enum.
- `public.user_roles(user_id, role)` and the real body of `has_role` (`M/20251012023454_6adfb949-50dc-4ebb-8853-6de73d8e8441.sql:34-47`).
- `public.is_teacher_of_class(user_id, class_id)` stub over `classes.default_teacher_user` (same stub as `video-homework.test.mjs:135-139`).
- `public.payroll_month_is_locked(text)`: copy the real body verbatim (`M/20261021093000_...sql:162-173`) with a comment naming the source.
- Tables, with the columns listed:
  - `classes(id, default_teacher_user)`
  - `sessions(id, class_id, date, start_time, end_time, status, teacher_id, updated_at)`
  - `enrollments(class_id, student_id, start_date, end_date, allowed_days)` - needed by 20261027090000's preflight and seed
  - `attendance(id, session_id, student_id, status DEFAULT 'Present', marked_at, marked_by, notes, created_at, updated_at, UNIQUE(session_id, student_id))`
  - `stars_sync_attendance_state(session_id, student_id, status, event_id, updated_at, PK(session_id, student_id))`
  - `stars_sync_held_flips(session_id PK, event_id, flipped_at)`
  - `stars_homework_map(stars_homework_ref PK, homework_id UNIQUE)`
  - `stars_sync_grade_state(homework_id, student_id, grade, PK(homework_id, student_id))`
  - `point_transactions(id, student_id, class_id, session_id, points, type, date, notes, created_by, created_at)`
  - `class_transcripts(id, class_id, session_id, uploaded_by, transcript_date, status, audio_storage_path, audio_duration_seconds, created_at)`
  - `homeworks(id, class_id, due_date, created_by, created_at)`
  - `homework_submissions(id, homework_id, student_id, grade, graded_at)`
  - `payroll_periods(month PK, status, locked_at, locked_by)`
  - `payroll_lines(id, month, teacher_id, assistant_id)`
  - `session_participants(session_id, participant_type, teaching_assistant_id, attended)`
  - `invoices(id, student_id, month, status, recorded_payment, confirmation_status, confirmed_at, tuition_frozen, carry_in_credit, UNIQUE(student_id, month))` - `status` may be plain text in the prelude
- A helper `as(uid, jwtRole, dbRole, fn)` that sets `test.uid`, `test.jwt_role`, `SET ROLE`, runs, and `RESET ROLE` in `finally` (pattern: `scripts/pgtest/ai-actions.test.mjs:108-111`).
- All fixture timestamps are written as explicit UTC instants; the session is `2026-10-26 17:30-19:00` Hanoi. Do not use `now()` in fixtures.

### 5.2 Cases the implementer must write

Each case builds its own session (own class) so counts cannot bleed, and asserts `level`, `families`, the item's `count`, and where stated `settled` and the hash.

Baseline and exclusions

1. A session with nothing: `NONE`, `items = []`, all families false, `settled.any = false`, hash is 64 hex chars.
2. **Seeded rows do not count:** three rows `Present`, `marked_by NULL` (insert them through `_attendance_seed_for_class_dates` with an enrollment) -> `NONE`.
3. **Auto-marked rows do not count:** rows shaped exactly as `auto-mark-attendance` writes them (`Present`, `marked_by NULL`, `marked_at` set) -> `NONE`.
4. **Repair rows do not count:** `Present` and `Absent`, `marked_by NULL`, `notes 'Auto-repaired on 2026-10-27'` -> `NONE`.
5. Human-marked `Excused` only -> `NONE`.
6. Automatic streak bonus (`participation`, `created_by NULL`, `session_id NULL`, same date) -> `NONE`. Vocabulary row with the child's id in `created_by` -> `NONE`. Homework award dated that day -> `NONE`. `adjustment` by an admin -> `NONE`. A negative participation row alone -> `NONE`.

One per evidence type

7. `attendance_present`: one `Late` by a teacher -> `STRONG`, `detail.late = 1`, `detail.hec = 1`, `actor_id` = the teacher.
8. Pixel Pal mark: `Present`, `marked_by` = teacher, `notes 'Pixel Pal'`, matching `stars_sync_attendance_state` -> `STRONG`, `detail.pixel_pal = 1`, `detail.hec = 0`.
9. `attendance_register_only`: two `Absent` by a teacher, session still `Scheduled` -> `SOFT`, family R. Add `status = 'Held'` -> still `SOFT` (same family), items 4 and 5 both present.
10. `status_held` alone -> `SOFT`; with a `stars_sync_held_flips` row `detail.flipped_by_stars_sync = true`.
11. `points_awarded`: (a) teacher row, `session_id NULL`, `date = s.date` -> `SOFT`; (b) admin-panel row, `created_by NULL`, `session_id = s.id` -> counted; (c) a row linked to ANOTHER session of the same class and date -> not counted for this one; (d) a `correction` row -> counted; (e) `in_lesson_window` is 1 for a row created 18:00 Hanoi and 0 for one created 23:00.
12. `transcript_same_day`: (a) `transcript_date = s.date` -> `SOFT`; (b) `transcript_date` the day before but `created_at` 06:30 Hanoi on `s.date` -> counted; (c) `status 'failed'` text paste -> not counted; (d) `status 'failed'` with `audio_storage_path` -> counted, `detail.audio = 1`.
13. `transcript_linked`: `session_id = s.id`, `analyzed` -> `STRONG`, and it is NOT also reported as `transcript_same_day`.
14. `recording_completed`: `CREATE OR REPLACE` the helper to return one element with `row_keys` -> `STRONG`; an element without `row_keys` is dropped; helper returning `NULL` or an object is treated as `[]`. Restore the helper afterwards.
15. `homework_assigned`: created 20:00 Hanoi on `s.date` -> `SOFT`, family H; created 00:30 Hanoi the next day -> not counted; one with a `stars_homework_map` row -> not counted.
16. `homework_graded`: `graded_at` inside the day -> `SOFT`; one with a `stars_sync_grade_state` row -> not counted.
17. Payroll: (a) month locked, session `Scheduled`, no marks -> `NONE`, `settled.payroll_month_locked = true`, `settled.any = true`; (b) session `Held` + line for its teacher -> item 6 present, `payroll_paid_as_held = true`, level `SOFT`; (c) line only for an assistant with `attended = false` -> `payroll_paid_as_held = false`; (d) month `open` -> all false.
18. Invoice: one affected child (seeded `Present` counts as affected) with (a) `recorded_payment > 0`; (b) `confirmation_status 'confirmed'`; (c) `tuition_frozen`; (d) `status 'paid'` -> each gives `settled.tuition = true`, level still `NONE`. (e) `auto_approved` with `recorded_payment = 0` -> false. (f) `paid_amount` is deliberately absent from the prelude: the function must not reference it. (g) a paid invoice for a child whose row on this session is `Excused` -> not affected -> false. (h) `carry_in_credit > 0` only -> `tuition = false`, `detail.with_carry_in_credit = 1`.

Levels and combinations

19. **After a real cancel** (through 20261027090000's trigger): a session with three teacher-marked `Present` is `STRONG`; `UPDATE sessions SET status = 'Canceled'`; the same call now returns `NONE` with `session.status = 'Canceled'`. This pins the fact D2 depends on: read first, then cancel.
20. Truth table: R+P -> `STRONG`; R+T -> `STRONG`; P+T -> `STRONG`; H + exactly one of R/P/T -> `SOFT`; H alone -> `SOFT`; D with nothing else -> `STRONG`; M alone -> `NONE`.
21. Time zone: `SELECT now() AT TIME ZONE 'Asia/Ho_Chi_Minh'` succeeds; a homework created `2026-10-26 17:05Z` (00:05 on the 27th in Hanoi) is NOT on the 26th and IS on the 27th.

Hash

22. **Stable:** two calls on unchanged data give the same hash.
23. **Order-stable:** the same facts (fixed uuids) inserted in opposite row order, in a second database or after delete-and-reinsert -> same hash.
24. **Same for every viewer:** admin, the class's teacher and service role get the same hash; the teacher's JSON has `settled = null`, no item 11/12, `redacted = true`.
25. **Unchanged by noise:** updating only `marked_at` / `updated_at` on a human mark, or adding a seeded row for a child with no settled invoice, leaves the hash unchanged.
26. **Changes with evidence:** each of these changes the hash - one mark `Absent -> Present`; the same mark re-made by a different `marked_by`; a new point row; a point row's `points` edited; a transcript `processing -> analyzed`; session `Scheduled -> Held`; session date or start time moved; payroll month locked; an affected child's invoice gaining `recorded_payment`; a new recording element from the helper.

Access

27. `anon` cannot execute (`permission denied for function`).
28. Signed-in user with no role, and a teacher of a DIFFERENT class -> `42501`; and the same `42501` for a random uuid (no existence leak).
29. Admin with a random uuid -> `P0002`. NULL argument -> `22004`.
30. `authenticated` cannot execute `session_recording_evidence` directly.
31. The migration applies a second time unchanged.
32. Volatility and settings: `pg_proc.provolatile = 's'`, `prosecdef = true`, and `proconfig` contains `search_path=public` for both functions.

---

## 6. Risks

False STRONG (the nudge fires, or D2 demands more, for a lesson that did not run)

| Risk | How it arises | Mitigation |
|---|---|---|
| **Cancelled at the door after roll-call** | Teacher marks the children who turned up, then the lesson is abandoned (power cut, teacher ill). Marks are real, the lesson is not. | This is the case the nudge exists for; the admin sees who was marked, by whom, when, and acknowledges with a reason. **D2 must therefore treat STRONG as "acknowledge and explain", never as an absolute refusal** - otherwise this legitimate cancellation becomes impossible. Stated for D2 in section 7. |
| Teacher saves the register with defaults | The teacher screen upserts a row for every child with the teacher's id (`src/components/teacher/AttendanceMarking.tsx:195-206`). A teacher who opens the wrong lesson and presses Save creates STRONG evidence. | Same path: acknowledge. The item shows `markers` and `at`, so a register saved at 09:00 for a 17:30 lesson looks wrong at a glance. |
| Pixel Pal register pre-filled | If Pixel Pal sends `Present` for children nobody ticked (unknown - Q3). | Engine already refuses marks before start + 5 min. `detail.pixel_pal` lets the admin see the source. Q3 decides whether Pixel-Pal-only should drop to SOFT. |
| Forged or mistaken `marked_by` | RLS does not constrain the column (1.1). | Only staff can write attendance at all; out of scope for D1, worth a line in A5's audit. |
| Two lessons of one class on one day | Unlinked points and same-day transcripts count for both. | Only SOFT families are affected; a direct (D) item is always per session. |
| Homework set BECAUSE the lesson was called off | 1.3. | Homework is auxiliary: SOFT at most. |
| Admin sets `Held` by hand, teacher awards points for another reason that day | R + P = STRONG without a lesson. | Rare; acknowledge path. |

False NONE (a taught lesson can be cancelled with no warning)

| Risk | How it arises | Mitigation |
|---|---|---|
| **Nobody marked the register** | Teacher forgot; the 10 pm job filled in `Present` with `marked_by NULL`. By design those do not count, so a genuinely taught, unmarked lesson is NONE. | Unavoidable without inventing evidence. D2's stale-screen protection and the settled flag still apply; whether a past-dated cancellation with NONE should still ask for a reason is a D2/D3 decision. |
| **Evidence already erased** | Function called after the session is `Canceled`: every mark is `Excused`. | Callers read first (case 19). D2 stores the JSON it acted on. |
| Session deleted | `attendance`, stars state and held flips cascade away; points and transcripts lose `session_id` (`ON DELETE SET NULL`). | D2 must guard DELETE with the same function, before the delete. |
| Child's `Present` rewritten to `Excused` by an enrollment change | The lesson falls outside a changed enrollment; older rows were excused by the 20261106090000 back-fill (`M/20261106090000_attendance_enrollment_guard.sql:14-17`). | Other children's marks normally remain. Not fixable here. |
| Transcript uploaded days later | Lands on another date; `session_id` is never set. | SOFT type only; workstream C's recorder gives a linked, STRONG source. |
| Points written before 07:00 Hanoi | UTC date is the previous day. | No class runs then. |
| `repair-attendance` used to record a real lesson after the fact | Rows have `marked_by NULL`. | By rule not counted; an admin ran the repair and an admin is cancelling. |
| Live database behind the tree | A table this reads is not there yet. | Preflight refuses to install (4.5). |

Other

- **Month-level payroll.** `payroll_paid_as_held` can be true for a lesson marked Held after the month was locked (not actually in the paid count), and false for one that was Held at lock time and has since been reset. It is wording help, not arithmetic; any carry-forward figure comes from `calculate-payroll` and `PayrollMonthLock`, never from here.
- **Old `Held` rows.** The October 2025 back-fill set `Held` on every session with any attendance row, seeded ones included (1.7). For lessons before that date `status_held` alone means little. It is only SOFT.
- **Hash scope.** The hash covers what this function reads. A change elsewhere that matters to a cancellation (an enrollment edit, a discount) does not move it. D2's token should also carry the session's `updated_at` if it wants "nothing at all changed".

---

## 7. Notes for D2, D3 and D5 (consequences of this model, not decisions made for them)

1. **Read before write, under the session lock.** D2's guard must be a `BEFORE UPDATE` (and `BEFORE DELETE`) trigger on `sessions`: `trg_cancel_session_excused` is an AFTER trigger and destroys the marks (`M/20261027090000_...sql:167-172`). `cancel_session_checked` should `SELECT ... FROM sessions WHERE id = p FOR UPDATE` first and call `session_held_evidence` in a LATER statement: every attendance write takes the same row lock (`M/20261027090000_...sql:128`), so once the admin's transaction holds it no mark can land between the check and the cancel, and the function then sees every mark committed before the lock was granted.
2. **Persist the snapshot.** Store the full JSON (it has no names) in D2's append-only audit row together with the token and the reason. After the cancel the function can no longer reproduce it.
3. **Do not hard-block on STRONG.** See the first risk. The level selects how much the admin must confirm; `settled.any` selects the heavier path.
4. **D5, past cancellations.** For lessons already cancelled, points, transcripts and homework (items 3, 7, 8, 9, 10) are still readable by calling this function on the cancelled session. Item 1 is not; the pre-cancel marks survive only in `audit_log` (`entity = 'attendance'`, `diff -> 'new' ->> 'status'`, `actor_user_id`) and only since `M/20261009130000_audit_every_admin_action.sql` was applied (`:152-156`). The trigger's own rewrite to `Excused` is not logged there, because writes made by another trigger are skipped (`:87-89`) - so the last logged value IS the human mark. D5's owner SQL should read that, clearly separate from this function.
5. **D3.** Render from the JSON. `label_key` values are `evidence.<type>` for the twelve types in 4.2. Fetch on dialog open and again on confirm; a changed `snapshot_hash` is the stale-screen signal.
6. **Workstream C.** Replace `session_recording_evidence` only; contract in 1.2. Add a positive case against the real table in the recorder's own test.

---

## 8. Open questions for the owner (policy only)

| # | Question | Recommended default (what the design above does) |
|---|---|---|
| Q1 | A teacher marked every child **Absent** and nothing else exists. Is that "held"? It is billed like a held lesson today. | **SOFT.** A register was taken, nobody was recorded as there. |
| Q2 | Do marks that arrived from **Pixel Pal** count as fully as marks made in HEC? | **Yes, STRONG.** They already pay the teacher and bill the family. |
| Q3 | Does Pixel Pal's register **pre-fill Present**? (Not answerable from this repo.) If it does, should a lesson whose only marks are Pixel Pal's drop to SOFT? | Keep **STRONG** until Pixel Pal's behaviour is confirmed; the item shows the source either way. |
| Q4 | A family's bill for the month has no payment recorded against it but is covered by **credit carried in** from an earlier overpayment. Does that count as "already paid" for the settled flag? | **No** - reported in the detail (`with_carry_in_credit`), not part of the flag. Cancelling only increases their credit. |
| Q5 | Should **homework set or marked that day** count at all? It is the weakest signal and is sometimes set because a lesson was called off. | **Yes, as SOFT only**, never towards STRONG. Dropping it means removing family H and cases 15-16. |
| Q6 | Should a lesson that is `Held` in a **locked payroll month** be STRONG on that alone (the teacher has very probably been paid for it)? | **No, SOFT + settled.** The data cannot tie a payroll line to a lesson; the settled path already makes the admin stop. |

## 9. What could not be determined

- **Pixel Pal's register defaults** (Q3): external system, not in this repo.
- **Whether pglite ships `Asia/Ho_Chi_Minh`.** Existing suites only exercise `Asia/Bangkok`. Case 21 settles it; fallback stated in section 3. Nothing was executed for this design (the worktree has no `node_modules`).
- **The live database's state.** By rule no live access was used. Unknown: whether every migration this reads has been pasted; how many old `Held` sessions come from the 2025 back-fill; whether any live `class_transcripts.session_id` is non-null (no code writes it); the server time zone behind `transcript_date DEFAULT CURRENT_DATE` (assumed UTC, the Supabase default - the same-day rule is written to be right either way).
- **Whether a payroll line included a given lesson**: not recorded anywhere (1.5).
- **D0's inventory** of cancel paths was not present in this worktree. Section 1.7 lists the status-changing paths found while verifying; D0 is the authority for the full list.
- `app_role` enum labels for the prelude were not read; the implementer takes them from `T` Enums.
