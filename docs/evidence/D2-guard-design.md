# D2 - Cancellation guard: design

Design only. No code, migration or live-database access went into this file.
Paths: `M/` = `supabase/migrations/`, `F/` = `supabase/functions/`. Citations are to this worktree (conductor branch 9ba704c merged).
Inputs read in full: root `AGENTS.md`, `supabase/AGENTS.md`, `docs/MASTER_PLAN.md`, `docs/evidence/D0-inventory.md`, `docs/evidence/D1-evidence-model.md`.

Deliverables the implementer builds from this file:

- `supabase/migrations/20261112091000_session_cancel_guard.sql`
- `scripts/pgtest/session-cancel-guard.test.mjs`, registered in `scripts/pgtest/run.mjs`
- `F/manage-session/index.ts`, `F/bulk-cancel-sessions/index.ts`, `F/schedule-sessions/index.ts` (reporting only), `F/_lib/refresh-cancelled-tuition.ts` (one added export)
- `scripts/ROLLBACK-session-cancel-guard.sql` (section 12)

---

## 0. D0 / D1 claims re-checked in code

| Claim | Verdict | Where |
|---|---|---|
| manage-session runs every action on the service-role client; `cancel` blocks only past `Held`; `force-cancel`, `change-status`, `delete`, `bulk-delete` have canned reasons / no guard | CONFIRMED | `F/manage-session/index.ts:23, 126, 164, 210, 254, 289, 315-319` |
| bulk-cancel: reason optional, `include_held`, no filter required, one set-based UPDATE | CONFIRMED | `F/bulk-cancel-sessions/index.ts:15-16, 96-99, 120-131` |
| Admin `FOR ALL` policy lets an admin write `sessions` directly | CONFIRMED (per migrations) | `M/20251012023454_6adfb949-50dc-4ebb-8853-6de73d8e8441.sql:146` |
| Direct client writes | CONFIRMED | `src/components/admin/SessionActionsModal.tsx:133-136` (delete), `src/components/admin/EditSessionModal.tsx:121-131` (times, teacher), `src/components/schedule/GlobalCalendar.tsx:191` (any column in `next`), `src/components/admin/TeacherScheduleTransfer.tsx:141-157` (teacher) |
| Cancel trigger is AFTER UPDATE, only INTO Canceled; attendance guard takes `FOR UPDATE` on the session | CONFIRMED | `M/20261027090000_cancelled_lesson_attendance_guard.sql:128, 167-172` |
| `refreshCancelledTuition` finds students by reading attendance AFTER the write | CONFIRMED - so it finds nobody after a hard delete (rows cascaded) | `F/_lib/refresh-cancelled-tuition.ts:4-5` |
| `generate-sessions` is empty | CONFIRMED, 0 bytes | `F/generate-sessions/index.ts` |
| D0 S28 "does deleting a class cascade to sessions: UNKNOWN" | RESOLVED: no. `sessions.class_id` and `sessions.teacher_id` are `ON DELETE RESTRICT`; nothing in the tree redefines them | `M/20251012020423_f00f2350-14fd-44b1-b5cc-f0360ab9fcdf.sql:21, 26` |
| D0 "nightly rebuild deletes future Scheduled sessions" | **IMPRECISE, and it matters.** The job runs at `0 2 * * *` database time = 02:00 UTC = **09:00 Hanoi**, and the delete test is `session.date >= today`, so it deletes **today's** sessions too, including one that started at 08:00. An admin run at 21:00 does the same to every lesson taught that day and not yet marked. | `M/20261110160000_schedule_runner_and_nightly_rebuild.sql:27, 38`; `F/schedule-sessions/index.ts:737-746` |
| (new) `normalizeFutureHeld` | **Finding F-1, not in D0's gap list.** It flips `Held -> Scheduled` for non-manual sessions with `date >= today`, on every run including the 09:00 job. A lesson taught and marked this morning is un-Held at 09:00; an evening admin run un-Helds the whole day. Staff are paid only for `Held` (`F/_lib/payroll-sessions.ts:21`). Pre-existing; changes payroll, so it is NOT fixed by D2 - reported to the conductor for D4/owner. D2's guard does not depend on it. | `F/schedule-sessions/index.ts:402-425` |
| No generic SQL-exec RPC, and nothing in the tree calls `set_config` | CONFIRMED by grep over `M/` (`EXECUTE` appears only with fixed `format()` DDL and one fixed count at `M/20261107090000_ai_assisted_admin_actions.sql:643`) | |
| ai_action_apply/undo and the enrollment RPCs write `sessions` | REFUTED: they only read it; they delete `attendance` rows with `marked_by IS NULL` | `M/20261107090000_...sql:795, 806`; `M/20261106100001_date_aware_enrollment_changes.sql:44, 142` |
| admin-data-import "UNKNOWN allow-list" | RESOLVED: fixed list that includes `sessions` and `attendance`, upsert on the service role, per-table error reported | `F/admin-data-import/index.ts:72-76, 97-98` |

Coordinator note: the resume message said two commits of this task were saved. None existed on this branch (`git log` showed only the merge); this file starts from zero.

---

## 1. Decisions in one table

| Topic | Decision |
|---|---|
| Who may cancel | Only `cancel_session_checked`, called with the ADMIN'S OWN JWT. `EXECUTE` is granted to `authenticated` only - not `service_role`. No automation can cancel anything. |
| Flag | `set_config('hec.session_change_ack', <override row id>, true)`. The flag is only a pointer: the trigger accepts it only if a `session_cancel_overrides` row with that id exists for THIS session, THIS kind of change, written in THIS transaction (`txid = txid_current()`), and then clears it. Only the definer RPC can insert that row. |
| Token | sha256 over: algorithm version, action, session id, caller uid, tier, D1 `snapshot_hash`, and the session's status/date/times/class/teacher/`updated_at`. Recomputed under the row lock at confirm. |
| Tiers | T0 not started + NONE; T1 started + NONE; T2 SOFT or STRONG; T3 STRONG + `settled.any`. Reason (>= 15 chars) and token at every tier; explicit confirmation from T1; separate correction reason at T3. |
| Past-date rule | Enforced by the trigger: nothing "started" can be cancelled or deleted outside the RPC. "Started" = `now() >= (date + start_time) AT TIME ZONE 'Asia/Bangkok'`, not "date < today" (the 09:00 job is why). |
| Raw cancel | Never. Every transition into `Canceled` needs the RPC, future ones too (they are T0: one shared reason, no per-lesson confirmation). |
| Raw delete | Allowed only for a session that has not started, is `Scheduled`, and has NONE evidence - the automation lane. Everything else through the RPC. |
| Delete with evidence | Refused (`use_cancel`): cancel it, which keeps the row and the audit. Owner question OQ-1. |
| Date move | Checked path (`move_session_checked`) when the session has started, or has any evidence, or crosses a month with a settled bill/closed payroll. Same-day time edits are free unless they would turn a started lesson into a not-started one. |
| Un-cancel | `uncancel_session_checked`: reason + token + audit row, target status `Scheduled` only, tuition refresh by the edge function. Attendance is NOT restored (OQ-2). |
| Kill switch | None. Rollback is a script the owner pastes; a health function makes "guard off" loud (section 12). |

---

## 2. Tiers

Computed in ONE SQL function, `session_change_tier(p_started boolean, p_evidence jsonb) RETURNS int` (IMMUTABLE, internal, no grants), used by preview, RPC and trigger:

```
level   := p_evidence ->> 'level'
settled := COALESCE((p_evidence -> 'settled' ->> 'any')::boolean, true)   -- redacted/null = settled: fail closed
T3 if level = 'STRONG' AND settled
T2 if level IN ('SOFT','STRONG')
T1 if p_started
T0 otherwise
any other level value -> RAISE (fail closed)
```

`started := now() >= ((s.date + s.start_time) AT TIME ZONE 'Asia/Bangkok')` - the zone the database already uses for this (`M/20251016045745_755294d2-f62d-468d-b15c-a3ad25c73da8.sql:19-23`). One helper, `session_has_started(date, time) RETURNS boolean` (STABLE).

| Tier | Meaning | The admin must | Review queue |
|---|---|---|---|
| T0 | Not started, no evidence. Holidays, teacher leave, bulk. | reason, token | no |
| T1 | Started, no evidence. A taught-but-unmarked lesson looks exactly like this (D1 section 6), so it is never silent. | reason, token, `confirm = true` ("this lesson did not take place") | no (listed, not flagged) |
| T2 | Evidence, SOFT or STRONG. | the same; the UI shows the evidence items first | flagged when STRONG |
| T3 | STRONG and settled. Correction mode. | the same + `correction_reason` (its own >= 15 chars) | always flagged |

Conductor ruling 1 is honoured: no tier refuses a CANCEL. STRONG is "look and explain".

Reason rule (one function, `session_change_reason_ok(text) RETURNS text`, returns the cleaned text or raises `HC010`):

1. `v := btrim(regexp_replace(coalesce(p,''), '\s+', ' ', 'g'))` - outer blanks removed, inner runs of blanks/newlines collapsed to one space.
2. `char_length(v) BETWEEN 15 AND 1000`.
3. At least 5 distinct non-space characters (`"aaaaaaaaaaaaaaa"` and `"..............."` fail). No language test: reasons are written in Vietnamese or English.
4. Lower-cased `v` is not one of the retired canned strings: `no reason provided`, `bulk cancellation`, `admin status change`, `admin force-canceled (correction)`, `deleted via admin interface` (`F/manage-session/index.ts:164, 210, 289`; `F/bulk-cancel-sessions/index.ts:124`; `src/components/admin/CancelSessionDialog.tsx:36`; D0 section C).

---

## 3. Schema (`M/20261112091000_session_cancel_guard.sql`)

### 3.1 `public.session_cancel_overrides` - one row per checked change, append-only

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK default `gen_random_uuid()` | this value is the flag |
| `created_at` | timestamptz NOT NULL default `now()` | when |
| `txid` | bigint NOT NULL default `txid_current()` | binds the row to the transaction that may use it |
| `actor_user_id` | uuid NOT NULL | who - `auth.uid()` inside the RPC, never a parameter |
| `session_id` | uuid NOT NULL | **no foreign key**: the row must outlive a deleted session |
| `class_id`, `teacher_id` | uuid NOT NULL | copied from the session |
| `session_date` | date NOT NULL | |
| `action` | text NOT NULL CHECK in (`cancel`,`delete`,`move`,`uncancel`) | |
| `via` | text NOT NULL CHECK in (`single`,`bulk`) | "bulk item" |
| `batch_id` | uuid NULL | shared by the items of one bulk request |
| `tier` | int NOT NULL CHECK 0..3 | |
| `level` | text NOT NULL CHECK in (`NONE`,`SOFT`,`STRONG`) | |
| `settled` | boolean NOT NULL | `settled.any` |
| `correction_mode` | boolean NOT NULL | true exactly when tier = 3 |
| `reason` | text NOT NULL | cleaned text |
| `correction_reason` | text NULL | NOT NULL when `correction_mode` (CHECK) |
| `confirmed` | boolean NOT NULL | the explicit confirmation |
| `token` | text NOT NULL | the token that was accepted |
| `evidence` | jsonb NOT NULL | the full D1 JSON read under the lock, BEFORE the write (ruling 3). No names. |
| `session_before` | jsonb NOT NULL | `to_jsonb(sessions row)` |
| `change` | jsonb NULL | move: `{new_date,new_start_time,new_end_time}`; uncancel: `{new_status:'Scheduled'}` |
| `affected` | jsonb NOT NULL | `[{student_id, month, status, marked_by_person}]` from `attendance` on this session - ids, no names |
| `invoices_before` | jsonb NOT NULL | the stored `invoices` rows (id, student_id, month, the amount columns, `recorded_payment`, `status`, `confirmation_status`, `tuition_frozen`, carry columns) of the affected students for the session's month, read in SQL under the lock. This is a COPY of what calculate-tuition last wrote; SQL prices nothing. |
| `deleted_rows` | jsonb NULL | delete only: the `attendance` and `session_participants` rows about to cascade |
| `payroll_month_locked` | boolean NOT NULL | from the evidence JSON |
| `review_required` | boolean NOT NULL | section 6 |
| `attached` | jsonb NOT NULL default `'{}'` | what the caller attached: `{source, tuition_before:[...]}`. Stored as given. See 5.4. CHECK `pg_column_size(attached) < 131072`. |

Indexes: `(session_id, created_at DESC)`, `(created_at DESC)`, `(batch_id) WHERE batch_id IS NOT NULL`, `(review_required, created_at DESC)`.

### 3.2 `public.session_cancel_override_events` - what happened afterwards, append-only

`id uuid PK`, `created_at`, `override_id uuid NULL REFERENCES session_cancel_overrides(id)` (RESTRICT), `actor_user_id uuid NULL`, `kind text CHECK in ('guard_installed','tuition_refreshed','tuition_refresh_failed','reviewed','automation_refused')`, `payload jsonb NOT NULL default '{}'`. Index `(override_id, created_at)`.

- `guard_installed`: written by the migration on every paste (`override_id` NULL, payload = migration name). Its earliest `created_at` is "the guard has been on since", which D5's bypass check needs (threat model, detection).
- `tuition_refreshed` / `tuition_refresh_failed`: written by `record_session_override_event` (5.5). Payload = the calculate-tuition responses as the edge function received them (attached, not truth) plus `invoices_after`, which the SQL function itself re-reads from `invoices` at that moment.
- `reviewed`: an admin's sign-off with a note.
- `automation_refused`: see 8.2.

Why a second table: the before/after money snapshot (money rule) has an "after" that only exists once calculate-tuition has run, which is after the cancelling transaction commits. An UPDATE of the audit row would break append-only; a second insert does not.

### 3.3 Append-only, RLS, grants (both tables)

```
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
CREATE POLICY ..._admin_read ON ... FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));   -- the only policy
REVOKE ALL ON ... FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON ... TO authenticated;          -- RLS narrows it to admins
GRANT SELECT ON ... TO service_role;           -- read only; NOT the usual GRANT ALL
```

This is a deliberate exception to "a new table needs `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role`" (root `AGENTS.md`): that rule exists so PostgREST can see the table, and `SELECT` is enough for that. Say so in a migration comment so nobody "fixes" it. Rows are inserted only by the SECURITY DEFINER functions (owner rights).

Triggers on both: `BEFORE UPDATE OR DELETE ... FOR EACH ROW` -> `RAISE 'append-only' USING ERRCODE='HC040'`, and `BEFORE TRUNCATE ... FOR EACH STATEMENT` -> the same. They do not exempt any role.

### 3.4 Review queue

`public.session_cancel_review_queue` - a VIEW `WITH (security_invoker = true)` (so the admin-only policy applies), one row per override where `review_required` and no `reviewed` event exists, with: the override's columns except `evidence`/`session_before`/`deleted_rows` (fetched on open), `tuition_state` = `refreshed` / `failed` / `pending` (latest tuition event, `pending` when none), `age`. `GRANT SELECT TO authenticated`.

`review_required` is set at insert: `tier = 3 OR (tier = 2 AND level = 'STRONG') OR action = 'delete' AND tier >= 1 OR action = 'move' AND tier >= 2`.
A second view, `session_cancel_tuition_pending` (same options): overrides of action cancel/delete/uncancel older than 10 minutes with no `tuition_refreshed` event - this is how a cancel whose refresh failed, or an RPC called straight from a browser console without the edge function, is noticed.

### 3.5 Preflight and idempotency

First statement block (style of `M/20261027090000_...sql:51-82`) RAISES unless all exist: `to_regprocedure('public.session_held_evidence(uuid)')` ("paste 20261112090000_session_held_evidence.sql first"), `has_role(uuid, app_role)`, `auth.uid()`, the `sessions` columns `status, date, start_time, end_time, class_id, teacher_id, updated_at, updated_by, canceled_reason, canceled_by, canceled_at, is_manual, manual_reason`, tables `attendance`, `invoices`, `session_participants`, trigger `trg_cancel_session_excused` on `sessions` and trigger `guard_cancelled_session_attendance` on `attendance` (20261027090000 must be live: this design relies on its lock).
Paste-twice: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION/VIEW`, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, grants restated. Whole file in one `BEGIN ... COMMIT`; ends with `NOTIFY pgrst, 'reload schema'` and a result set (trigger names + `tgenabled`, counts) the SQL editor prints. No backfill, no data change: the migration alters no existing row.

---

## 4. The trigger

```
public.session_change_guard() RETURNS trigger   LANGUAGE plpgsql  SECURITY DEFINER  SET search_path = public
REVOKE ALL ... FROM PUBLIC, anon, authenticated, service_role

CREATE TRIGGER zz_session_change_guard_upd BEFORE UPDATE ON public.sessions FOR EACH ROW
  WHEN (  OLD.status   IS DISTINCT FROM NEW.status
       OR OLD.date     IS DISTINCT FROM NEW.date
       OR OLD.start_time IS DISTINCT FROM NEW.start_time
       OR OLD.class_id IS DISTINCT FROM NEW.class_id)
  EXECUTE FUNCTION public.session_change_guard();
CREATE TRIGGER zz_session_change_guard_del BEFORE DELETE ON public.sessions FOR EACH ROW
  EXECUTE FUNCTION public.session_change_guard();
CREATE TRIGGER zz_session_no_truncate BEFORE TRUNCATE ON public.sessions FOR EACH STATEMENT
  EXECUTE FUNCTION public.session_refuse_truncate();          -- always raises HC030
```

`zz_`: BEFORE row triggers fire in name order, so this one sees `NEW` after `update_sessions_updated_at` and `validate_session_status_trigger` (which can turn `Held` back into `Scheduled`, `M/20251016045745_...sql:17-30`) have had their say. It never modifies `NEW`.

### 4.1 Classify the write

```
kinds := {}
DELETE                                                   -> delete
NEW.status = 'Canceled' AND OLD.status <> 'Canceled'     -> cancel
OLD.status = 'Canceled' AND NEW.status <> 'Canceled'     -> uncancel
OLD.class_id <> NEW.class_id                             -> reclass
OLD.date <> NEW.date
  OR (session_has_started(OLD.date, OLD.start_time)
      AND NOT session_has_started(NEW.date, NEW.start_time)) -> move
no kind (Scheduled<->Held, a time edit that does not un-start the lesson) -> RETURN NEW, no evidence call
more than one kind in a single statement                 -> RAISE HC022 'one change at a time'
```

Deliberately NOT guarded here (stated so the reviewer need not guess): `Scheduled <-> Held`, `teacher_id`, `rate_override_vnd`, notes, and INSERT with any status. The stars engine, mark-attendance and the validate trigger live on `Scheduled <-> Held`; teacher and rate changes move payroll, not whether the lesson exists, and belong to D4. They still land in `audit_log` (`audit_sessions`, `M/20261009130000_audit_every_admin_action.sql:173-175`).

### 4.2 The acknowledged lane

```
v_ack := NULLIF(current_setting('hec.session_change_ack', true), '')
IF v_ack IS NOT NULL THEN
  SELECT * INTO o FROM session_cancel_overrides
   WHERE id::text = v_ack AND session_id = OLD.id AND action = <kind> AND txid = txid_current();
  IF NOT FOUND                      -> RAISE HC020           -- a flag that matches nothing is refused, not ignored
  IF kind = 'reclass'               -> RAISE HC021           -- there is no checked path for it
  IF kind = 'move'     AND (NEW.date, NEW.start_time, NEW.end_time) <> the three values in o.change -> RAISE HC020
  IF kind = 'uncancel' AND NEW.status <> 'Scheduled'                                             -> RAISE HC020
  PERFORM set_config('hec.session_change_ack', '', true);    -- consumed: one row, one write
  RETURN NEW / OLD;
END IF
```

Compare `id::text = v_ack` (never cast the setting to uuid: a malformed value must fail the lookup, not raise a different error).

Why a caller cannot forge this:

1. **The flag alone is worthless.** It must name a row that only `cancel_session_checked` / `move_...` / `uncancel_...` can insert (no INSERT grant to anyone, 3.3), for the same session and kind, in the same transaction.
2. **A PostgREST caller cannot set it anyway.** PostgREST exposes functions of the exposed schema (`public`) only; `set_config` is in `pg_catalog`. The tree has no wrapper around `set_config` and no SQL-exec RPC (section 0). The settings PostgREST itself writes are all under `request.*` (the tree reads `request.headers`, `M/20261009130000_...sql:113`), a different prefix. A PostgREST request is one statement in one transaction, so "set the flag, then update" is not expressible.
3. **`txid`** stops a row from an earlier transaction being pointed at later (replay). `txid_current()` is the top-level transaction id, so the bulk wrapper's sub-blocks share it.
4. **Consumption** stops one acknowledgement covering two writes inside one transaction.
5. The trigger exempts no role: `postgres` in the SQL editor, `service_role`, cron and a SECURITY DEFINER function all take the same path. (What the SQL editor can still do: threat model, row A-17.)

Test `txid_current()` in pglite first (test case 1); if absent use `pg_current_xact_id()::text` in a text column - same semantics.

### 4.3 The unacknowledged lane (automation and plain edits)

Reached with no flag. `ev := public.session_held_evidence(OLD.id)` is called here and only here; any error it raises propagates (refused).

| Kind | Allowed without the RPC when | Otherwise |
|---|---|---|
| cancel | never | `HC020` |
| uncancel | never | `HC020` |
| delete | `NOT session_has_started(OLD.date, OLD.start_time)` AND `OLD.status = 'Scheduled'` AND `ev.level = 'NONE'` | `HC020` |
| move | OLD not started AND `ev.level = 'NONE'` AND NOT (month of `NEW.date` <> month of `OLD.date` AND `COALESCE(ev.settled.any, true)`) | `HC020` |
| reclass | OLD not started AND `OLD.status = 'Scheduled'` AND `ev.level = 'NONE'` | `HC021` |

`HC020` message: `session_change_requires_checked_path`, DETAIL = `kind=<kind>; started=<bool>; level=<level>` (no names, no ids beyond the session's own). `ERRCODE` values are five-character SQLSTATEs in a private class `HC` so PostgREST returns them in `code`.

Why raw cancel is "never" even for a future lesson with no evidence: no automatic path writes `Canceled` (D0 section D; grep in section 0 found only one-off 2025 migrations), so nothing legitimate is lost; and it makes the database invariant simple enough to audit - **every session that becomes Canceled after install has exactly one override row with a person and a reason**. Future cancels stay easy because T0 asks for nothing but the shared reason (section 7.2).

Why raw delete has a lane at all: `schedule-sessions` deletes sessions that fell out of the template, on the service role, from cron (`F/schedule-sessions/index.ts:737-746`). That is legitimate for a lesson that has not begun and that nobody has touched, and for nothing else.

### 4.4 Locks, and why there is no new deadlock

Today: an attendance upsert fires `guard_cancelled_session_attendance` BEFORE INSERT, which takes `sessions ... FOR UPDATE` and only then the attendance row (`M/20261027090000_...sql:128`); a cancel takes the session row (the UPDATE) and then the attendance rows (the AFTER trigger, `:157-160`). Both go session -> attendance.

D2 keeps exactly that order and adds no lock on any other table:

1. RPC: `SELECT ... FROM sessions WHERE id = p FOR UPDATE` (first lock taken, always).
2. RPC, separate statements: evidence, affected, invoices - plain reads, no locks.
3. RPC: INSERT override row (new row, nobody else can see it).
4. RPC: `UPDATE`/`DELETE sessions` (lock already held) -> BEFORE trigger (reads only) -> AFTER trigger / cascade touches attendance.

Because 2 runs in a later statement than 1, under READ COMMITTED it gets a snapshot taken after the lock was granted: every mark committed before the admin got the lock is seen, and no mark can land until the admin commits (D1 section 7.1). `session_held_evidence` is STABLE and uses the snapshot of the PL/pgSQL statement that calls it, which is what we want. The unacknowledged lane has the same property: a BEFORE ROW trigger runs after the row is locked, and its statements snapshot afterwards.

Bulk (`cancel_sessions_checked_bulk`): sessions are processed in ascending `id` so two overlapping bulk requests cannot lock in opposite orders.

Known, pre-existing and unchanged: a plain `UPDATE attendance` of an EXISTING row locks the attendance row first and the session second, the opposite order to a cancel. Postgres detects the deadlock and aborts one side (`40P01`). If the cancel is the victim nothing was cancelled (the edge function returns `retry`); if the mark is the victim the teacher's save fails and the lesson is cancelled. Either way nothing is half-done. D2 does not add a path to this and must not "fix" it by changing the attendance trigger (money rule: do not touch 20261027090000).

---

## 5. The functions

All `SECURITY DEFINER`, `SET search_path = public`. All start with:

```
v_uid := auth.uid();
IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::public.app_role) THEN RAISE 'not allowed' USING ERRCODE = '42501';
```

Grants for every function in 5.1-5.5: `REVOKE ALL ... FROM PUBLIC, anon, service_role; GRANT EXECUTE ... TO authenticated`. `service_role` is left out on purpose: with no `auth.uid()` it would be refused anyway, and leaving the grant out makes "no service-role path" visible in the catalogue. The edge functions therefore call them on a client built from the caller's own `Authorization` header (the anon key + the admin's JWT), which is also what the hard rule "no service role for data a caller could write under RLS" asks for.

### 5.1 `session_change_preview(p_session_id uuid, p_action text, p_change jsonb DEFAULT NULL) RETURNS jsonb` - STABLE

No lock, writes nothing. Returns:

```jsonc
{
  "action": "cancel" | "delete" | "move" | "uncancel",
  "session": { "id","class_id","date","start_time","end_time","status","teacher_id","updated_at" },
  "started": bool,
  "tier": 0|1|2|3,
  "level": "NONE"|"SOFT"|"STRONG",
  "settled": { ...D1 settled... },
  "evidence": { ...the D1 JSON, whole... },
  "requires": { "reason_min": 15, "confirm": bool, "correction_reason": bool },
  "allowed": bool,                    // false: this action cannot be done at all
  "refuse_code": null | "already_canceled" | "not_canceled" | "use_cancel" | "bad_change",
  "affected": [ { "student_id","month","status","marked_by_person": bool } ],
  "invoices_before": [ ...stored invoice rows as in 3.1... ],
  "after_cancel": { "marks_excused": int },     // how many marks the AFTER trigger will rewrite; uncancel: how many rows are Excused
  "token": "<64 hex>"
}
```

The preview deliberately has NO "bill after" figure. Knowing it would need the calculator to price a lesson that is not cancelled yet; SQL must not price and calculate-tuition has no what-if mode (its only preview flag is the internal sibling one, `F/calculate-tuition/index.ts:83-89`). The UI says how many bills will be recalculated and how many of those are paid/confirmed/frozen (from `invoices_before`), and shows real before/after figures once the change is made (5.5).

### 5.2 The token

```
session_change_token(action, uid, tier, s sessions, snapshot_hash) =
  encode(sha256(convert_to(jsonb_build_array(
      1, action, s.id, uid, tier, snapshot_hash,
      s.status, s.date, s.start_time, s.end_time, s.class_id, s.teacher_id,
      to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS'),
      p_change                                   -- move only; NULL otherwise
  )::text, 'UTF8')), 'hex')
```

- It is an acknowledgement, not a secret: an admin can always obtain one by previewing. Its job is to make "I looked at THIS" checkable.
- Stale when: any D1 evidence fact changed (`snapshot_hash`), the session row was written at all (`updated_at` is bumped by `update_sessions_updated_at` on every UPDATE, `M/20251012020423_...sql:46-49`), the lesson's start time passed between preview and confirm (tier 0 -> 1), a bill was paid or the month locked (tier 2 -> 3 and the hash), a different admin confirms, or the action differs.
- Not stale on noise: D1 keeps `marked_at`/`computed_at` out of the hash.
- No expiry clock. An expiry would need either a server secret or a stored nonce; with neither, the token already fails on every change that matters, including the passage of time across the lesson's start.
- A token for session A cannot be used on B (`s.id`), nor a cancel token for a delete.

### 5.3 `cancel_session_checked(p_session_id uuid, p_action text, p_reason text, p_token text, p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}') RETURNS jsonb`

`p_action` in (`cancel`, `delete`). Steps, in this order:

1. Admin check (above). `p_action` check -> `HC015 bad_action`.
2. `v_reason := session_change_reason_ok(p_reason)` (`HC010`).
3. `SELECT * INTO s FROM sessions WHERE id = p_session_id FOR UPDATE;` not found -> `P0002`.
4. `v_ev := session_held_evidence(p_session_id);` (own statement, after the lock).
5. State: cancel of a `Canceled` session -> `HC015 already_canceled`.
6. `v_tier`; `IF p_token IS DISTINCT FROM session_change_token(...) -> HC011 token_stale`.
7. `v_tier >= 1 AND NOT COALESCE(p_confirm,false)` -> `HC012 confirm_required`.
8. `v_tier = 3`: `v_corr := session_change_reason_ok(p_correction_reason)` -> `HC013` when missing/short.
9. `p_action = 'delete' AND v_ev.level <> 'NONE'` -> `HC014 use_cancel`. (A cancelled lesson's marks are all `Excused`, so after a cancel its D/R families are gone and the delete of the now-`Canceled` row is T0/T1 - or T2 if points/transcripts/homework remain, in which case it stays undeletable. Two audited steps, the first holding the evidence. OQ-1.)
10. Build `affected`, `invoices_before`, `deleted_rows` (delete only). All plain `SELECT`s.
11. `INSERT INTO session_cancel_overrides (...) RETURNING id INTO v_id;` `via`/`batch_id`/`attached` come from `p_context` (`via` anything other than `'bulk'` is `'single'`; `batch_id` must parse as uuid or is NULL; `attached` = `p_context -> 'attached'`).
12. `PERFORM set_config('hec.session_change_ack', v_id::text, true);`
13. cancel: `UPDATE sessions SET status='Canceled', canceled_reason=v_reason, canceled_by=v_uid, canceled_at=now(), updated_by=v_uid [, is_manual=true, manual_reason=v_reason when p_context->>'set_manual' = 'true'] WHERE id = p_session_id;`
    delete: `DELETE FROM sessions WHERE id = p_session_id;`
    (`set_manual` exists only to keep what bulk-cancel does today, `F/bulk-cancel-sessions/index.ts:127-128`; it moves no figure.)
14. **`IF current_setting('hec.session_change_ack', true) <> '' THEN RAISE HC050 'guard trigger did not run'`.** If the trigger is missing or disabled the flag is never consumed and the whole call rolls back: the RPC refuses to work without its guard.
15. `RETURN { override_id, action, tier, level, review_required, affected:[{student_id, month}], session_before }`.

Nothing here reads or trusts `p_context` for a decision. An exception anywhere rolls back the override row with everything else, so there is never an audit row for a change that did not happen, nor a change without its row.

### 5.4 Tuition figures: attached, never trusted

Three sources, kept apart in the data:

| What | Who produces it | Where it is stored | Status |
|---|---|---|---|
| Stored bills before | SQL copy of `invoices` rows under the lock | `invoices_before` | fact about the table |
| Canonical figures before (optional) | calculate-tuition, called by the edge function before the RPC | `attached.tuition_before` | attachment; `attached.source = 'manage-session'` |
| Figures after | calculate-tuition, called by the edge function after the commit (the existing `refreshCancelledTuition` flow) | event `tuition_refreshed.payload.responses` | attachment |
| Stored bills after | SQL copy of `invoices` rows inside `record_session_override_event` | event `payload.invoices_after` | fact about the table |

The RPC validates `attached` for size only. No tier, no refusal and no later calculation reads it. The review screen shows the two SQL copies as "what the database held" and the attachments as "what the calculator returned", and flags a disagreement between them.

The edge function does NOT call calculate-tuition before the RPC by default: it would double the number of calculator calls for a bulk holiday cancel (the calculator is rate-limited, `F/calculate-tuition/index.ts:4, 65`; `supabase/AGENTS.md` "30 calls a minute"). `attached.tuition_before` is filled only for single T2/T3 cancels, where the admin is looking at one class.

### 5.5 `record_session_override_event(p_override_id uuid, p_kind text, p_payload jsonb) RETURNS uuid`

Admin only. `p_kind` in (`tuition_refreshed`, `tuition_refresh_failed`, `reviewed`); `reviewed` needs `p_payload->>'note'` to pass `session_change_reason_ok`. For the two tuition kinds the function adds `invoices_after` itself (the override's `affected` students x month). Inserts one event row. A `reviewed` event may be added by any admin including the one who cancelled (two-admin approval is Q2/D4, not decided here; the row records who).

### 5.6 `move_session_checked(p_session_id, p_new_date date, p_new_start time, p_new_end time, p_reason, p_token, p_confirm, p_correction_reason, p_context)` and `uncancel_session_checked(p_session_id, p_reason, p_token, p_context)`

Same skeleton as 5.3 (lock, evidence, token, reason, override row, flag, write, consumed-check), action `move` / `uncancel`.

- move: refuses a `Canceled` session (`HC015`), a no-op, and `end <= start` (`bad_change`). Tiers as in section 2; the write is `UPDATE sessions SET date, start_time, end_time, updated_by`. A `23505` from `sessions_class_date_time_unique` (`M/20251017144629_...sql:29-31`) propagates -> `slot_taken`.
- uncancel: requires `status = 'Canceled'` (`HC015 not_canceled`); always `confirm`-free but reason + token; write is `UPDATE sessions SET status = 'Scheduled', updated_by = v_uid` - `canceled_*` columns are LEFT as they are (history of the cancellation; no rewrite), and attendance is not touched. `23505` -> `slot_taken` (a replacement lesson now sits in the slot).

### 5.7 `cancel_sessions_checked_bulk(p_items jsonb, p_reason text, p_batch_id uuid, p_context jsonb) RETURNS jsonb`

`p_items = [{ "id", "token", "confirm"?, "reason"?, "correction_reason"? }]`, at most 500 (`HC016 too_many`). Sorted by `id`. For each item a `BEGIN ... EXCEPTION WHEN SQLSTATE 'HC010','HC011','HC012','HC013','HC015','P0002' THEN` block calls the same internal core as 5.3 with `via='bulk'`, `batch_id`, the item's own `reason` if given else `p_reason`. Returns `{ done: [{id, override_id, tier}], refused: [{id, code}] }`. One transaction: a crash rolls back everything; a refused item rolls back only itself. Errors outside that list (deadlock, `HC050`, anything unexpected) abort the whole batch.

### 5.8 `session_cancel_guard_status() RETURNS jsonb` - STABLE, admin only

`{ installed_at, update_trigger: 'O'|'D'|null, delete_trigger: ..., truncate_trigger: ..., evidence_function: bool }` from `pg_trigger.tgenabled` and the earliest `guard_installed` event. The review screen shows a red banner unless both row triggers are `'O'` (enabled). This is the "loud" half of having no kill switch.

---

## 6. Settled (requirement b): what happens to money, with existing mechanisms only

D2 adds no money logic. T3 (STRONG + `settled.any`) differs from T2 only in: `correction_reason` required, `correction_mode = true`, always in the review queue. The cancel then flows through exactly what a cancel flows through today:

| Case | What moves, and by which existing mechanism |
|---|---|
| Any cancel | `trg_cancel_session_excused` turns every mark to `Excused` (`M/20261027090000_...sql:157-172`); the lesson stops being billable (`F/_lib/tuition-session.ts:2-4`). |
| Bill not frozen, not paid | Edge function calls calculate-tuition per affected student/month (`F/_lib/refresh-cancelled-tuition.ts:13-17`); it rewrites the invoice (`F/calculate-tuition/index.ts:605-625`). |
| Bill paid or part-paid | Same refresh; the total drops, `recorded_payment` is untouched, and the difference shows in the trigger-maintained `carry_*` balances (`M/20261009120000`, root `AGENTS.md` "Money"). No payment row is edited. |
| Bill frozen (`tuition_frozen`) | `keep_frozen_invoice_amounts` keeps the charged figures on every update and the calculator reports the saved ones (`M/20261106120000_invoice_tuition_freeze.sql:4-25`; root `AGENTS.md` "Frozen bills"). **The cancel changes nothing on that bill.** The preview says so (`invoices_before[].tuition_frozen`); only an admin unfreezing deliberately changes it. D2 never unfreezes. |
| Bill `confirmed`/`adjusted` | Same refresh. NOT VERIFIED here: whether a calculator run after confirmation rewrites `confirmation_status` (D1 cites `F/calculate-tuition/index.ts:576` for the automatic values). D5 must check; D2 changes nothing about it. |
| Sibling discount unresolved | `refreshCancelledTuition` throws on `siblingUnresolved` (`:16`). The lesson is already cancelled; the event `tuition_refresh_failed` is recorded and the override sits in `session_cancel_tuition_pending` until a retry succeeds (7.4). |
| Lesson was `Held`, payroll month OPEN | calculate-payroll no longer counts it (staff are paid for `Held` only, `F/_lib/payroll-sessions.ts:21`). Nothing stored. |
| Lesson was `Held`, payroll month LOCKED | `payroll_lines` for the month are frozen and are not edited by anything in D2. calculate-payroll's `live` figures drop; `PayrollMonthLock` compares `live` with the stored lines and offers to carry the difference into the next open month (`src/components/admin/payroll/PayrollMonthLock.tsx:107-171`; root `AGENTS.md` "A CLOSED month"). Closed-month expenditure rows stay protected by `refuse_payroll_expenditure_write_to_locked_month` (`M/20261022091000_protect_closed_payroll_expenditures.sql:64-103`). The review-queue row carries `payroll_month_locked` so the admin is told to open Payroll for that month. |

"Never rewrite historical sessions, invoices, payments or payroll lines": a cancel changes the session's status (that is the act being authorised and audited); invoices change only through the calculator's normal refresh; payments and payroll lines are never written.

---

## 7. Edge functions (requirement c)

### 7.1 Common rules

- Keep the existing admin check on the service-role client, then build `asAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: <caller's header> } } })`. **Every guarded write goes through `asAdmin.rpc(...)`.** No `supabase.from('sessions').update({status:'Canceled'})` or `.delete()` remains in either function. The service-role client keeps: the role lookup, `audit_log` inserts, `functions.invoke('calculate-tuition')`.
- A reason is required in the request schema everywhere (zod `min(15)` as a courtesy; SQL is the authority). No `reason || '...'` fallbacks.
- Two steps. Step 1 returns a preview with a token; step 2 must send it back. A step-2 request without a token is `preview_required`.
- After a successful RPC: refresh tuition for `result.affected` (new export `refreshTuitionFor(supabase, pairs: {student_id, month}[])` beside `refreshCancelledTuition`, which keeps its signature and delegates - a delete has no attendance left to read, section 0), then `record_session_override_event(override_id, 'tuition_refreshed' | 'tuition_refresh_failed', {...})`, then the existing named `audit_log` entry (kept; now with `override_id`).
- Error mapping (HTTP status, body `{ ok:false, code, message_key, ... }`):

| `code` | From | HTTP | Meaning for the UI |
|---|---|---|---|
| `preview_required` | function | 409 | old screen or missing token: reload |
| `reason_too_short` | `HC010` | 422 | |
| `token_stale` | `HC011` | 409 | something changed: the body carries a fresh preview |
| `confirm_required` | `HC012` | 422 | |
| `correction_reason_required` | `HC013` | 422 | |
| `use_cancel` | `HC014` | 409 | cannot delete a lesson with evidence |
| `already_canceled` / `not_canceled` / `bad_action` / `bad_change` | `HC015` | 409 / 400 | |
| `too_many` | `HC016` | 413 | |
| `requires_checked_path` | `HC020`/`HC021`/`HC022` | 409 | a raw write was refused |
| `slot_taken` | `23505` | 409 | another lesson has that class/date/time |
| `retry` | `40P01`, `40001` | 503 | nothing was changed |
| `not_found` | `P0002` | 404 | |
| `forbidden` | `42501` | 403 | |
| `guard_not_installed` | PostgREST `PGRST202` / `42883` (function missing) | 503 | "Cancelling is switched off until the database update is applied." |
| `guard_broken` | `HC050` | 503 | trigger missing/disabled; nothing was changed |
| `cancelled_refresh_failed` | refresh threw after commit | **200** with `ok:true, tuition:{status:'failed', override_id}` | the lesson IS cancelled; bills are not yet recalculated - show a blocking Retry |

`cancelled_refresh_failed` replaces today's behaviour where the lesson is cancelled and the API answers 500 "Session operation failed" (D0 gap xi; `F/manage-session/index.ts:141-143, 368-375`).

### 7.2 `manage-session`

| Action | New behaviour |
|---|---|
| `preview` (new) `{ id, action: 'cancel'|'delete'|'move'|'uncancel', change? }` | `session_change_preview` -> 200 with the JSON of 5.1 |
| `cancel` `{ id, reason, token, confirm?, correction_reason? }` | `cancel_session_checked('cancel')`. The old "past Held" test (`:126`) is removed: the tier does that job for every status. |
| `force-cancel` | Same as `cancel`, kept as a name so an old screen fails with `preview_required` rather than "Invalid input". No separate privilege, no default reason. |
| `change-status` | to `Canceled` -> the `cancel` path. From `Canceled` -> only to `Scheduled`, through `uncancel_session_checked`. `Scheduled <-> Held` unchanged. |
| `update` | A `status` that would enter or leave `Canceled` -> 409 `requires_checked_path` before any write (the trigger would refuse it anyway). Everything else unchanged. |
| `delete` `{ id, reason, token, confirm? }` | `cancel_session_checked('delete')`. |
| `move` (new) `{ id, date, start_time, end_time, reason?, token?, ... }` | If the preview says the move is free (not started, NONE, no settled month crossing) a plain update on `asAdmin`; else `move_session_checked`. Then refresh tuition when the month changed. |
| `uncancel` (new) `{ id, reason, token }` | `uncancel_session_checked`, then `refreshTuitionFor(affected)` (a no-op for figures while the marks are still Excused, but the brief requires it and it is cheap). |
| `refresh-tuition` (new) `{ override_id }` | Re-runs the refresh for that override's `affected` and records the event. For the Retry button and the pending view. |
| `bulk-delete` | `class_id` or `teacher_id` AND both dates required, range <= 62 days. `step:'preview'` lists; `step:'confirm'` takes `items`. Soft = 7.3. Hard = one `cancel_session_checked('delete')` per item (T0/T1 only; evidence items come back as `use_cancel`). |
| `create` | unchanged (out of scope: creating a session as `Held`/`Canceled` is D0 S7, for D4). |

### 7.3 `bulk-cancel-sessions`

Request: `{ step: 'preview'|'confirm', date_from, date_to (both REQUIRED, <= 62 days apart), class_id?, teacher_id?, reason (confirm), items?, held_items?, include_held? }`.

- `preview`: selects non-`Canceled` sessions in range, calls `session_change_preview(id,'cancel')` for each (cap 500; over the cap -> `too_many`, narrow the range). Returns `{ batch_id, plain: [{id, date, start_time, class_id, token}], needs_ack: [{id, date, ..., tier, level, settled, token, evidence}] }`. `plain` = tier 0. Everything else is in `needs_ack`.
- `confirm`: `items` (the `plain` ids + tokens) go to `cancel_sessions_checked_bulk` with the one batch reason and `set_manual`. **Evidence sessions are excluded by default**: any id not T0 at confirm time is refused by SQL (`confirm_required`) and returned in `refused`, whatever the client claimed.
- `include_held: true` is honoured only together with `held_items: [{ id, token, confirm: true, reason, correction_reason? }]` - a per-session token, a per-session confirmation and, for T2/T3, a per-session reason (the batch reason is not accepted for those: "made to look and explain" means each one). They go through the same bulk RPC with those fields. `include_held` without `held_items` is ignored and reported.
- Response: `{ ok, batch_id, canceled: [...], refused: [{id, code}], needs_ack: [...fresh previews of the refused...], tuition: {status, failed: [...] } }`.

### 7.4 Deploy order and the intermediate states (the owner pastes SQL; functions and SQL can land in either order)

| State | What an admin sees | Closed? |
|---|---|---|
| Nothing new | today's behaviour | (the open state being fixed) |
| D2 migration pasted, OLD functions, OLD UI | Every cancel, force-cancel, bulk cancel, un-cancel: the trigger raises `HC020`, the old function answers 500 "Session operation failed" / "Failed to cancel sessions". Delete from the old UI works only for not-started, untouched Scheduled lessons. Rescheduling a past or marked lesson by drag fails. Nightly rebuild continues (section 8). | Yes. Cancelling is unavailable. |
| NEW functions, no migration | Every cancel/delete/un-cancel: 503 `guard_not_installed`. The new functions have NO fallback to the old raw writes. | Yes. |
| Migration + NEW functions, OLD UI | Old dialogs send no token: 409 `preview_required`, shown by the old UI as a generic failure. `SessionActionsModal`'s direct delete and the calendar drag behave as in row 2. | Yes. |
| All three | The designed behaviour. | |

Recommended order, in one sitting, at a quiet hour: (1) paste `20261112090000` (D1), (2) paste `20261112091000` (D2) and read the result set, (3) deploy `manage-session`, `bulk-cancel-sessions`, `schedule-sessions`, (4) publish the UI (D3). The window in which nobody can cancel is the time between (2) and (4). Doing (3) first instead gives the same closed window with a clearer message; both are safe.

---

## 8. Direct client writes and automatic paths (requirements d, e)

### 8.1 Direct client writes

| Path | After D2 | D3 must |
|---|---|---|
| `SessionActionsModal.tsx:133-136` hard delete | Trigger: allowed only for not-started + Scheduled + NONE; else `HC020`. | Reroute to manage-session `preview`/`delete`; remove the direct call. |
| `EditSessionModal.tsx:121-131` times, teacher, notes | Allowed, EXCEPT a start-time change that turns a started lesson into a not-started one (`move`, `HC020`). | Send date/time changes of started lessons to manage-session `move`. |
| `GlobalCalendar.tsx:191` drag | Date change: free only for not-started + NONE + no settled month crossing; else `HC020`. | Catch `HC020`/409 and open the move dialog (preview -> reason). Its undo is another move and obeys the same rule. |
| `TeacherScheduleTransfer.tsx:141-157`, `AttendanceDrawer.tsx:130`, `SessionDetailDrawer.tsx:116` teacher/notes | Not guarded by D2 (4.1). Teacher changes on `Held` lessons move payroll: D4. | - |
| `AttendanceMarking.tsx:217` teacher sets `Held` | Not guarded. | - |
| Teacher policy 2 (a teacher moves their own `Scheduled` lesson, D0 A3.2) | Same move rule: free before the lesson starts with no evidence; refused otherwise - a teacher has no checked path (admin-only RPC). | Nothing; a teacher asking an admin is the intended outcome. |
| `ClassAdminActions.tsx:306` class delete | Already refused by `ON DELETE RESTRICT` while the class has sessions (section 0). Unchanged. | - |

**Is moving a held lesson a disguised cancel? Yes, for the evidence that is tied to the day.** Attendance follows the session id, so marks survive a move. Points, same-day transcripts and homework are matched by class + date (D1 1.2-1.4): move the lesson to next week and they no longer point at it - its level drops, and a later cancel looks innocent. A started lesson with NO evidence is the taught-but-unmarked case: moved to a future date it becomes a T0 lesson that the automation lane may delete. So the checked path is required whenever the lesson has started or has any evidence. Crossing a month also moves a lesson between two bills; with a settled bill or locked payroll on the source month that is a correction and takes the T3 form. Same-day time edits keep every date-keyed link, so they stay free - except the one that un-starts a lesson.

### 8.2 Automatic paths

"Blocked?" = by the new trigger. No path is exempted by role; each continues only where the row itself qualifies.

| Path | Writes to `sessions` | Blocked? | Rule that lets the legitimate part continue |
|---|---|---|---|
| `generate-sessions` | Nothing: the repo file is 0 bytes. If an older copy is still deployed on the project (unknown, D0 F) it would insert; inserts are not guarded. It cannot cancel or delete through the guard either way. | no | - |
| `schedule-sessions` insert (`:618-630`) | INSERT Scheduled | no (inserts unguarded) | - |
| `schedule-sessions` teacher update (`:659-670`) | `teacher_id` | no (4.1) | - |
| `schedule-sessions` `include-held` (`:683-697`) | `start_time`/`end_time` of Held lessons, admin run only | Only if the new start would make a started lesson not-started (a template moved to later today) -> `HC020`, that one row keeps its time | function already ignores a failed update (`:697 if (!updateError)`) |
| `schedule-sessions` `normalizeFutureHeld` (`:402-425`) | `Held -> Scheduled`, `date >= today` | no | Finding F-1 (section 0): not a cancel, not D2's to change |
| **`schedule-sessions` delete (`:737-746`), incl. the 09:00 Hanoi job** | DELETE of `date >= today`, Scheduled, non-manual, not in template | **Partly, by design.** Not-started + Scheduled + NONE: allowed. A lesson of TODAY that has already begun (08:00 class at the 09:00 run; any taught lesson at an evening admin run), or any lesson with evidence (a child marked early, points that day, homework set that day): refused, row kept. | Lane of 4.3. The function already treats a failed delete as "not removed" (`:748 if (!error)`), so the run completes. |
| stars-sync engine | `Scheduled -> Held`, `Held -> Scheduled` (`M/20261027100000_...sql:726`; `M/20261028090000_...sql:609, 783, 944`; `M/20261104090000_...sql:860`) | no (no kind, no evidence call) | never writes Canceled or deletes |
| `mark-attendance`, `AttendanceMarking` | `Scheduled -> Held` | no | - |
| `auto-mark-attendance`, `repair-attendance` | none (attendance only; each row takes the session lock as today) | no | - |
| Enrollment RPCs, `auto_end_enrollments`, `pause_enrollment` | none (attendance placeholders only, section 0) | no | - |
| `ai_action_apply` / `ai_action_undo` | none (section 0) | no | The chat function gains nothing: the RPCs need an admin JWT and the chat function has no code path to them. Do not add one. |
| `admin-data-import` | UPSERT of `sessions` rows on the service role (`:97`) | An upsert that would cancel, un-cancel, re-class, or move a started/evidence lesson: `HC020`, reported per table (`:98`). New rows and other columns pass. | - |
| Holiday handling | No holiday code was found in `schedule-sessions`; holidays are cancelled by an admin with bulk cancel. Not exhaustively searched outside that function. | - | T0 bulk (7.3) |
| `validate_session_status_on_change` | modifies `NEW.status` Held->Scheduled inside the same write | no | fires before `zz_` |
| Hand-made cron jobs on the live database | UNKNOWN (D0 F). Whatever they are, they meet the same trigger. | | |

`schedule-sessions` change (small, no figure): when a delete or time update fails with `HC020`, push the session into a new `guardKept: [{id, date, start_time, reason:'started_or_evidence'}]` array of the response instead of dropping the error silently, and - when it has an admin caller - nothing more. For the timer run, also insert one `automation_refused` event per kept row through a tiny definer function `log_session_automation_refused(p_session_id uuid, p_source text)` granted to `service_role` only (insert-only, no decision). This is so "the rebuild wanted to delete a lesson that had started" reaches the review screen instead of a log nobody reads. It is the only thing `service_role` may execute in this migration.

Consequence the owner should know: a class whose weekday was removed from the template keeps today's already-started lesson until an admin deletes or cancels it by the checked path. That is the intended direction.

---

## 9. Performance (requirement f)

- The UPDATE trigger's `WHEN` clause means the function is not even called for teacher, notes, rate and `updated_at` writes. `Scheduled <-> Held` calls the function, which returns after classification with no evidence call.
- Acknowledged lane: one primary-key lookup in `session_cancel_overrides`. The evidence was already computed once by the RPC; the trigger does not compute it again.
- Unacknowledged lane (delete, move, reclass): one `session_held_evidence` call - about a dozen indexed reads, "a few milliseconds" (D1 4.6).
- Bulk cancel of N sessions: per session, one lock, one evidence call, two small selects (attendance by `session_id`; invoices by the UNIQUE `(student_id, month)`), one insert, one update plus the existing AFTER trigger. For N = 500 this is 500 evidence calls in one transaction, inside the "well under a second" envelope D1 gives for a few hundred, plus the audit inserts. The preview costs the same again (500 separate RPC round trips from the edge function; if that proves slow, add `session_change_preview_many(uuid[])` - same function in a loop, no new rule).
- Nightly rebuild: one evidence call per deleted row; a template change removes tens of rows, not thousands.
- The tuition refresh after a bulk cancel is the slow part and is unchanged from today (one calculator call per student/month).
- No new index on existing tables.

---

## 10. Test plan - `scripts/pgtest/session-cancel-guard.test.mjs`

Registered in `run.mjs` after the D1 suite with `migrations: ["20261027090000_cancelled_lesson_attendance_guard.sql", "20261112090000_session_held_evidence.sql", "20261112091000_session_cancel_guard.sql"]` - read from `supabase/migrations/`. Prelude = D1's prelude (D1 5.1) plus: `sessions` columns `canceled_reason, canceled_by, canceled_at, is_manual, manual_reason, updated_by, notes`; the REAL `update_updated_at_column` trigger and the REAL `validate_session_status_on_change` trigger on `sessions`; the partial unique index `sessions_class_date_time_unique`; RLS on `sessions` with the admin `FOR ALL` policy and the teacher UPDATE policy copied verbatim; `GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated`, `GRANT ALL ... TO service_role`. Helper `as(uid, jwtRole, dbRole, fn)` as in D1. Fixture "now" is controlled by putting sessions on dates relative to `CURRENT_DATE` (past = -3 days, future = +10 days) and, for "today, started" vs "today, not started", start times computed from `now()` in Bangkok time +/- 2 hours (skip that pair with a logged notice if the run is within 2 hours of midnight Bangkok).

Mechanism
1. `txid_current()` exists; `sha256`, `set_config` behave. 
2. Migration applies twice; second run changes nothing; one more `guard_installed` event.
3. Preflight: without the D1 function the migration raises and installs nothing.
4. `pg_proc`: all functions `prosecdef`, `search_path=public`; `has_function_privilege('service_role', 'cancel_session_checked(...)', 'execute')` is false, and for `anon`; true for `authenticated`.

Bypass attempts (each row of the threat model that names a test)
5. Admin, role `authenticated`, raw `UPDATE sessions SET status='Canceled'` on: a future NONE lesson; a past NONE lesson; a STRONG lesson -> `HC020` all three; row unchanged; no override row.
6. Same as service role and as the superuser session -> `HC020`.
7. Raw `DELETE`: future Scheduled NONE -> succeeds; started NONE -> `HC020`; future with a human `Present` -> `HC020`; future `Held`/`Canceled` -> `HC020`; future with a homework set that day (SOFT) -> `HC020`.
8. Flag forged: `SELECT set_config('hec.session_change_ack', gen_random_uuid()::text, true)` then cancel in the same transaction -> `HC020`.
9. Flag pointing at a REAL override row from an earlier transaction (replay) -> `HC020` (txid).
10. Flag pointing at this transaction's override row for session A while updating session B -> `HC020`.
11. A cancel override used for a delete of the same session in the same transaction -> `HC020`; a move override with a different new date -> `HC020`.
12. One acknowledgement, two writes: after a successful RPC, a second raw cancel-shaped write in the same transaction (un-cancel then cancel) -> `HC020`.
13. `authenticated` cannot `INSERT`/`UPDATE`/`DELETE` either audit table; service role cannot; superuser `UPDATE`/`DELETE`/`TRUNCATE` -> `HC040`. `TRUNCATE sessions` -> `HC030`.
14. Trigger disabled (`ALTER TABLE sessions DISABLE TRIGGER zz_session_change_guard_upd` in the test only): `cancel_session_checked` -> `HC050`, nothing cancelled, no override row; `session_cancel_guard_status()` reports `'D'`. Re-enable.
15. Status flip then cancel: STRONG lesson, admin sets `Held -> Scheduled` raw (allowed), then RPC cancel -> still T2 (the marks remain); an R-only lesson flipped -> T1, still needs reason + confirm.
16. Date to the future then cancel: raw move of a past lesson -> `HC020`; raw move of a future lesson with a same-day point row -> `HC020`.
17. Un-start by time: raw `start_time = '23:59'` on a lesson that started today -> `HC020`.
18. `class_id` change on a started or marked lesson -> `HC021`; cancel + date change in one statement -> `HC022`.
19. Evidence removed first: delete the human marks as admin (allowed today, audited elsewhere), then cancel -> T1; asserts the documented residual, and that the override row's `evidence` shows NONE.

RPC
20. Wrong role: teacher of the class, parent, signed-in user with no role, `anon`, service role with no uid -> `42501` or permission denied; nothing written.
21. Reason: 14 chars -> `HC010`; 15 spaces -> `HC010`; `"aaaaaaaaaaaaaaa"` -> `HC010`; `"  Bulk   cancellation "` -> `HC010`; a 15-char Vietnamese sentence passes; stored reason is the cleaned text.
22. Token: correct token works once; reused after the cancel -> `HC015`/`HC011`; token of session A on B -> `HC011`; cancel token for delete -> `HC011`; admin A's token used by admin B -> `HC011`.
23. Stale by evidence: preview; a teacher marks one child Present; confirm -> `HC011`. Stale by `updated_at`: preview; notes edited; confirm -> `HC011`. Not stale by noise: preview; `marked_at` rewritten; confirm works.
24. Tier change: preview a T2 lesson; lock the payroll month; confirm -> `HC011`; new preview is T3 and needs `correction_reason` (`HC013` without).
25. T1 without `confirm` -> `HC012`. T0 without `confirm` works.
26. STRONG is cancellable (ruling 1): three teacher-marked Present, T2, reason + confirm -> cancelled; marks are `Excused`; override row `evidence.level = 'STRONG'` with `attendance_present.count = 3` (ruling 3: read before).
27. Override row content: actor, reason, tier, `affected` (three students, month), `invoices_before` equal to the invoice rows, `payroll_month_locked`, `review_required`.
28. Atomicity: make the UPDATE fail (unique-index collision on a move; or a CHECK) -> no override row remains.
29. Delete: T0 and T1 delete work and `deleted_rows` holds the attendance rows; delete with evidence -> `HC014`; cancel-then-delete works in two calls with two rows.
30. Already cancelled -> `HC015`; unknown id -> `P0002`; NULL id -> error.
31. Move: free cases succeed raw; checked move of a past lesson writes a `move` row and the session has the new date; marks unchanged; `slot_taken` on collision.
32. Un-cancel: raw -> `HC020`; RPC -> `Scheduled`, `canceled_*` unchanged, attendance still `Excused`, override row `uncancel`; to a slot now occupied -> `23505`; then a teacher can mark Present again (20261027090000's guard no longer applies) .
33. Correction mode: T3 row has `correction_mode`, both reasons, appears in `session_cancel_review_queue`; after a `reviewed` event it leaves the queue; a `reviewed` note under 15 chars -> `HC010`.
34. Events: `record_session_override_event` adds `invoices_after`; non-admin refused; unknown kind refused; `session_cancel_tuition_pending` lists an override with no tuition event once its `created_at` is older than 10 minutes (insert with an old timestamp is impossible - assert the view's predicate with `now() + interval` via a parameterised helper view or by checking the SQL definition).
35. Bulk: 6 items - 3 T0, 1 T1 without confirm, 1 T2 with confirm + own reason, 1 stale token -> `done` 4, `refused` 2 with codes; all share `batch_id`, `via = 'bulk'`; the refused ones are untouched; 501 items -> `HC016`.
36. Views: admin sees the queue; teacher and parent see zero rows.

Locks (two pglite connections are not available in one process: use `dblink`-free emulation where possible, otherwise assert order structurally)
37. Structural: inside one transaction, after `cancel_session_checked` returns, `pg_locks` shows the session row lock was taken before any attendance row was written (assert by a test trigger on `attendance` that records `txid`/sequence into a temp table, and a statement-level probe on `sessions`). 
38. A mark committed just before the RPC is in the stored evidence; the AFTER trigger still excuses it.
39. After the cancel, an attendance write of `Present` on that lesson is refused with `23514` (the existing guard, unchanged and still installed - compare `pg_get_functiondef` of `guard_cancelled_session_attendance` before and after the D2 migration: identical).

Automatic paths (each as the service role)
40. Rebuild delete: future Scheduled NONE row -> deleted; **today's row that started two hours ago -> kept (`HC020`)**; today's row starting in two hours -> deleted; future row with a human mark -> kept; `log_session_automation_refused` inserts an event and only that.
41. Rebuild teacher update and insert -> succeed.
42. `include-held` time update on a past Held lesson (same day, both times in the past) -> succeeds; one that would un-start today's lesson -> `HC020`.
43. Stars engine statements, verbatim: `UPDATE sessions SET status='Held' WHERE id=$1 AND status='Scheduled'` on a started lesson -> succeeds; `SET status='Scheduled' ... AND status='Held'` -> succeeds; neither creates an override row.
44. The seed on session INSERT still runs; a session inserted as `Canceled` seeds `Excused` (20261027090000 section 5).
45. `auto-mark`/`repair`-shaped attendance inserts (`marked_by NULL`) on a Scheduled lesson -> succeed; they do not raise the tier (D1).
46. admin-data-import-shaped upsert: new session row -> inserted; existing row with `status='Canceled'` -> `HC020`; existing row changing only `notes` -> updated.
47. Enrollment-RPC-shaped delete of placeholder attendance (`marked_by IS NULL`, date after the end) -> succeeds.

Existing suites
48. `node scripts/pgtest/run.mjs` total = previous count + D1's + this suite's, 0 failed (section 11).

Edge functions (`edge-functions.test.mjs` type-check plus a small unit test with a scripted client, in the style of `stars-sync-core.test.mjs`): manage-session and bulk-cancel contain no `.from('sessions').update(` with a `status` key and no `.from('sessions').delete(`; each error code of 7.1 maps as tabled; `PGRST202` -> 503 `guard_not_installed` and no write is attempted afterwards; refresh failure -> 200 + `tuition.status='failed'` + a `tuition_refresh_failed` event call.

---

## 11. Existing tests that cancel or delete sessions, and how they stay green

Each suite in `scripts/pgtest/run.mjs` loads only the migrations named in its own entry (`run.mjs:44-140`). **No existing entry names `20261112091000`, so no existing suite has the trigger installed.** They stay green because the guard is absent from their database, not because the guard is weakened. The rule for the implementer: do not add the guard migration to any existing suite's list, and do not edit these files.

Raw writes that WOULD be refused if someone later added the guard to those suites (so the next person knows):

| File:line | Statement | Would hit |
|---|---|---|
| `scripts/pgtest/cancelled-lessons.test.mjs:57` | `UPDATE sessions SET status='Canceled'` | `HC020` (cancel) |
| `cancelled-lessons.test.mjs:84` | same, after `:78`/`:82` set `Held` | `HC020` |
| `cancelled-lessons.test.mjs:78, 82` | `SET status='Held'` on a row that is `Canceled` at that point (after `:57`) | `HC020` (uncancel) |
| `cancelled-lessons.test.mjs:90` | `SET date='2026-10-27'` | `HC020` (move of a started/Canceled lesson) |
| `cancelled-lessons.test.mjs:31` | INSERT as `Canceled` | not guarded |
| `scripts/pgtest/class-overhead.test.mjs:259, 418, 905` | `UPDATE public.sessions SET status='Canceled' WHERE class_id=$1` | `HC020` |
| `class-overhead.test.mjs:251` | `SET status='Scheduled' WHERE class_id=$1` | `HC020` if any row is `Canceled` then |
| `class-overhead.test.mjs:740`, `stars-sync.test.mjs:196` | `SET teacher_id` | not guarded |
| `stars-sync-engine.test.mjs:155`, `ta-standing.test.mjs:48, 57` | INSERT as `Canceled` | not guarded |
| `ai-actions.test.mjs`, `stars-sync-*.test.mjs`, enrollment suites | no session cancel/delete/move found by grep (`Canceled`, `DELETE FROM ... sessions`, `UPDATE ... sessions`, `SET date`) | - |

What the cancelled-lessons assertions protect (marks excused on cancel; non-Excused refused afterwards) is re-asserted WITH the guard installed by cases 26, 38, 39 and 44 of the new suite, through the RPC.

Not run for this design: the worktree has no `node_modules`; nothing above was executed.

---

## 12. Rollout and rollback (requirement i)

Order: section 7.4. Before step (2) the owner should run D5's read-only check of past cancellations; D2 itself changes no existing row.

**Kill switch: recommended NO.** A switch the application can flip is a bypass the application can reach; a switch only the SQL editor can flip is no more than what the SQL editor can already do, with extra code to get wrong. Instead:

- `scripts/ROLLBACK-session-cancel-guard.sql`, pasted by the owner: `DROP TRIGGER zz_session_change_guard_upd, zz_session_change_guard_del ON public.sessions` and nothing else. Tables, audit rows, functions and the truncate guard stay.
- After that rollback the NEW edge functions refuse every cancel with `guard_broken` (`HC050`, 5.3 step 14) - still closed. To get the old behaviour back the owner must ALSO redeploy the previous `manage-session` / `bulk-cancel-sessions`. Rolling back is therefore two deliberate acts, and the state in between is closed.
- Loud: `session_cancel_guard_status()` drives a red banner on the review screen whenever a trigger is missing or disabled.
- Re-install: paste the migration again (idempotent).

---

## 13. Open owner questions (policy only; the default is what the design does until answered)

| # | Question | Default |
|---|---|---|
| OQ-1 | May a lesson that has evidence be hard-DELETED at all, or only cancelled? Deleting removes the register rows for good. | **Only cancelled.** Delete is refused (`use_cancel`); a cancelled lesson with no remaining evidence can then be deleted with its own reason. |
| OQ-2 | When a cancelled lesson is brought back, every child's mark is `Excused` and stays so. Should the system try to restore the marks it had before? | **No.** The register is re-marked by the teacher or an admin; the dialog says how many children are Excused and that the lesson is not billed until it is marked. (Restoring would mean the database re-creating bills from an old snapshot.) |
| OQ-3 | Minimum reason length for a FUTURE lesson with no evidence (holiday, leave). 15 characters rejects "Teacher sick". | **15 everywhere** - one rule, and "Teacher is sick" passes. |
| OQ-4 | May the admin who made a correction-mode cancellation also mark it reviewed? | **Yes for now**; the row records who. Two-admin approval is Q2 (D4). |
| OQ-5 | A lesson that has STARTED today but is otherwise untouched: should the nightly/any rebuild still be allowed to delete it? | **No** - kept and reported (`guardKept`). |
| OQ-6 | Should bulk hard-delete (`manage-session bulk-delete, hard_delete`) survive at all? | **Keep, T0/T1 only**, filters and dates required. Removing it is simpler and safer if nobody uses it. |

Not an owner question but needs a conductor decision: finding F-1 (`normalizeFutureHeld` un-Helds today's taught lessons) - route to D4.

---

## 14. What D3 (UI) needs from this

- **Preview payload**: 5.1, obtained from manage-session `preview` (single) or bulk-cancel `step:'preview'`. Render evidence from `evidence.items[].label_key` (D1), never from own queries. Fetch on dialog open; never cache across opens.
- **Token**: opaque string; send back unchanged with the confirm. On `token_stale` the response body holds a fresh preview - show "this lesson changed while you were looking" and re-render; do not auto-resubmit.
- **Fields by tier**: `requires.reason_min`, `requires.confirm` (a checkbox the admin ticks, never pre-ticked), `requires.correction_reason` (second text box, T3). No default text in any reason box.
- **Error codes**: the table in 7.1. `message_key = 'cancel_guard.' || code`.
- **Wording keys** (D3 owns the words; fable reviews them): `cancel_guard.tier0.title` ... `tier3.title`; `.confirm_not_held`; `.reason_label`; `.correction_reason_label`; `.bills_affected` (n), `.bills_paid` (n), `.bills_frozen` (n, "will not change"); `.payroll_locked`; `.marks_will_be_excused` (n); `.uncancel.marks_excused` (n); `.delete.use_cancel`; `.move.title`; `.bulk.plain_count`, `.bulk.needs_ack_count`; `.refresh_failed`, `.refresh_retry`; `.guard_not_installed`; `.guard_off_banner`; `.stale`; plus `evidence.<type>` from D1.
- **Screens to change**: CancelSessionDialog, DeleteSessionDialog, SessionActionsModal (remove the direct delete and the automatic force-cancel choice, `:66-68`), EditSessionModal and GlobalCalendar (route guarded moves), BulkSessionDelete (two-step, per-lesson acknowledgement list), new review screen over `session_cancel_review_queue`, `session_cancel_tuition_pending`, the `automation_refused` events and `session_cancel_guard_status()`.
- **Types**: the new RPCs/tables are absent from `src/integrations/supabase/types.ts` until the conductor regenerates it; call through untyped `rpc`/edge functions until then.
