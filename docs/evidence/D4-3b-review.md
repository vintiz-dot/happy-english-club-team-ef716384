# D4 step 3B (money inputs) - independent review

Independent reviewer. Reviewed `origin/pc2/d4-3b` at 3b09300f (built on `origin/conductor/work` 02b571e6), checked out as `review-3b`. pglite only: nothing applied, deployed or pushed; no live database contacted. Reviewer probes are committed on this branch: `scripts/pgtest/review3b-probes.mjs`, `review3b-oracle.mjs` (the builder's oracle, its school and the REAL bundled calculate-tuition / compute-sibling-discounts, with my edits), `review3b-mutants.mjs` (the builder's runner with my list).

**Where I am / next step:** findings written and fixes proven in pglite; full suite and mutation runs in progress (counts filled in below when done).

## Verdict: APPLY WITH CHANGES

Must change before the live paste (blockers):
1. **B-1** - `enrollments.created_at` (and `id`) treated as identity: HC121 when changed.
2. **B-2** - a frozen bill cannot be deleted or moved to another child / month without the unfreeze path.
3. Both cases into `d4-money-inputs`, the trigger inventory and the rollback script updated (`zz_invoice_frozen_keep_guard`, `zz_invoice_frozen_delete_guard`), fingerprints regenerated.

Must change before the functions / screens go out (major):
4. **M-1** - `link-student-user` (not in b.5's list): a lone child linked into a new empty family is now HC120 whenever the child has billed past months, and the function ignores the error (family created, child not linked, success returned).

Nice-to-have (minor): N-1 audit triggers for the money inputs that have none; N-2 `families.is_active` / `students.is_active` feed the sibling count unguarded (design gap); N-3 the "discount from this month" case is T1 after the first week (calculator's `effective_from <= next month's 1st`); N-4 dialog intro wording for a T1 with no bill; N-5 the acknowledgement's child scope is the whole family (defence in depth only).

Everything else I attacked held (section 3).

## 1. Blockers

### B-1 (blocker): `created_at` decides which overlapping enrolment prices a lesson, and is not guarded

`supabase/migrations/20261114094000_d4_money_inputs_guard.sql:502-509`: the identity check covers `student_id` / `class_id`; `_money_span`'s priced columns are start / end / `allowed_days` / `rate_override_vnd` / `discount_*`. Any other column change is "nothing priced" (`:510-511`, `RETURN NEW`). But both calculators order a child's enrolments by `created_at`, then `id`, and the FIRST created row of a class prices every lesson two rows both cover (`supabase/functions/_lib/enrollment-discounts.ts:15-36`, `calculate-tuition/index.ts:127,172`, `calculate-tuition-bulk/index.ts:132`). Overlapping rows are a case the code exists for (`enrollment-order.test.mjs`).

Probe (`review3b-probes.mjs` P1, `review3b-oracle.mjs` O1; real calculators): child B has two overlapping enrolments of one class, the later one with a 50,000 rate override. As an admin under RLS (a single PostgREST PATCH):

```
PROBE P1a admin swaps created_at of two overlapping enrolments (past confirmed + paid month): ALLOWED
PROBE P1b admin changes rate_override_vnd on the same row (control): refused HC120 ... tier=3
PROBE P1c service role swaps created_at: ALLOWED
PROBE O1 created_at of the later, overlapping enrolment set before the first (B): admin raw statement ALLOWED; past/signed bills moved: 6  <== HOLE
   {"kid":"A","month":"2026-08","past":true,"signed":true,"was":380000,"is":400000}
   {"kid":"B","month":"2026-08","past":true,"signed":true,"was":350000,"is":130000}
   ... 2026-09 (paid) and 2026-10 (billed) for both children
```

A confirmed and a paid past month of both children (the sibling's through the sibling discount) re-priced with no reason, no override row, no tier.

Fix (executed, scratch copy `inputs-fixed.sql`): in `_enrollment_money_guard`, add `OR NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at` to the HC121 `enrollment_identity` condition. No legitimate writer changes either. With it: P1a / P1c HC121, O1 refused, 0 bills moved; the builder's suites over the patched file: `d4-money-inputs` 256/257 (the one failure is the trigger inventory, expected - see B-2), `d4-reach-oracle` 187/187.

### B-2 (blocker): a frozen bill can be deleted or re-keyed; calculate-tuition then re-creates the month unfrozen

`:1560-1563`: `zz_invoice_unfreeze_guard` fires only on `UPDATE ... WHEN (OLD.tuition_frozen AND NOT NEW.tuition_frozen)`. The live `keep_frozen_invoice_amounts` (`20261106120000:8-22`) keeps the figures on UPDATE but not `month` / `student_id`, and nothing guards DELETE ("Admins can manage invoices", `20251012023454:128`). After either, the month has no bill and calculate-tuition writes a new, unfrozen one at today's price. The 1a floor still remembers `ever_frozen` (so later tiers stay right), but the bill itself is re-priced - G-18's whole point.

```
PROBE P2a admin UPDATE tuition_frozen=false (control): refused HC120 ... entity=invoice_freeze; tier=2
PROBE P2b admin re-keys a frozen bill to another month: ALLOWED   (after: no bill left for 2026-09)
PROBE P2c service inserts a fresh unfrozen bill for that month (what calculate-tuition does next): ALLOWED
PROBE P2d admin DELETEs a frozen bill: ALLOWED
PROBE O3 frozen bill of A (2026-07) DELETED by an admin after a history correction: ALLOWED; past/signed bills moved: 1  <== HOLE
   {"kid":"A","month":"2026-07","past":true,"signed":true,"was":380000,"is":220000,"frozen_was":true,"frozen_is":false}
PROBE O4 frozen bill of A re-keyed to another month by an admin: ALLOWED; 380000 -> 220000, frozen -> not  <== HOLE
PROBE O5 control: frozen bill of A unfrozen raw by an admin: REFUSED HC120
```

Fix (executed): one function and two triggers, gated like an unfreeze (same tier, no acknowledgement path - unfreeze first; the owner lane passes with an event):

```sql
CREATE OR REPLACE FUNCTION public._invoice_frozen_keep_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  PERFORM public._money_input_gate('invoice_freeze', 'invoices', TG_OP, OLD.id, public._money_unfreeze_tier(OLD.id), false,
    'A frozen bill is not deleted or moved. Unfreeze it first, from the child''s bill, with a reason.');
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $fn$;
CREATE TRIGGER zz_invoice_frozen_keep_guard BEFORE UPDATE ON public.invoices FOR EACH ROW
  WHEN (OLD.tuition_frozen AND (OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.month IS DISTINCT FROM NEW.month))
  EXECUTE FUNCTION public._invoice_frozen_keep_guard();
CREATE TRIGGER zz_invoice_frozen_delete_guard BEFORE DELETE ON public.invoices FOR EACH ROW
  WHEN (OLD.tuition_frozen) EXECUTE FUNCTION public._invoice_frozen_keep_guard();
-- + REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated, service_role; DROP TRIGGER IF EXISTS before each; both in rollback 5
```

The WHEN must compare values, not use `UPDATE OF month, student_id`: calculate-tuition's upsert sets every column it sends (`ON CONFLICT ... DO UPDATE SET month = EXCLUDED.month, ...`), so `UPDATE OF` would refuse the calculator on every frozen bill. With the fix: P2b / P2d HC120, O3 / O4 refused, 0 bills moved; the builder's oracle (which recalculates frozen bills every edit) 187/187. Who deletes invoices today: `ai_action_undo` (`docs/sql/ai_action_apply_undo.installed.sql:217,318`) for a child it created - never a frozen bill in practice; it would be refused, all or none, if one were.

## 2. Major

### M-1: `link-student-user` silently half-links a child

`supabase/functions/link-student-user/index.ts:346-370` (service key, `:30-32`; not in design b.5's writer list, not touched by the step): when a child has no family and the admin ticks "update family email", it creates a family and then `update({ family_id })` the child, ignoring the result. With 3B, `_money_family_reach(child, NULL, new)` (`:365-384`) reaches the child's own months from its first enrolment, so a child with any billed past month is T1+ and the service lane is refused:

```
PROBE P3  service role: students.family_id NULL -> a new family with no other child (link-student-user:365): refused HC120 ... entity=family_link; tier=3
PROBE P3b admin: the same: refused HC120 ... tier=3
```

The function then logs "auto_created_for_student" and returns success: an orphan family, the child unlinked. The refusal is also spurious: a family of one has no sibling discount, so this move reaches no figure. Fix, both: (a) in `_money_family_reach` (or the family trigger), tier 0 when neither the old family (without the child) nor the new one has another child - nothing can move; (b) `link-student-user` checks the error of that update (and of the family insert) and reports it (AGENTS: errors are not swallowed). (a) alone removes the regression; (b) is right regardless. Add the function to b.5's inventory. A probe case: lone child with a confirmed past month linked into an empty family -> T0.

## 3. Attacked and held

Executed in pglite (`review3b-probes.mjs`), each as the caller named:
- `change_enrollment_terms` direct: teacher 42501, service role 42501 (no grant), admin backdated into a paid month HC120, admin from today T0 with an `audit_log` `change_terms` row (no override row: a direct RPC call at T0 is audited, not "checked" - acceptable, same as the other dated RPCs) (P5a-d).
- `end_enrollment` direct, backdated over a paid month: HC120 (P7b). A direct `pause_enrollment` over billed lessons: HC025 (builder's case, re-read).
- The acknowledgement: flag + override row of THIS txid (forging needs an INSERT into `money_change_overrides`, refused to every non-definer lane by 1b); a token for another row, another person, another bill, a lower stored tier (HC011), another transaction - builder's 13 cases re-read and the mutants S10-S12, S17, S22, S45 caught. `hec.money_change_ack` cannot be set through PostgREST (no `set_config` in an exposed schema) and is useless without the row.
- The PG_CONTEXT check: 3B adds only a branch BEFORE it, keyed on an override row of this txid with entity `enrollment` and op `end`/`transfer`/`pause`; the outermost-frame rule is unchanged; the comment forgery is still HC025 (builder's case). The flag is set and cleared around the exec only (`20261114091000:1023-1025`), so no client statement runs while it names a row.
- Fail closed: every reach error (NULL date, bad range) raises HC015 inside the trigger; an unknown tier is 3 (`_money_input_gate` `COALESCE(p_tier, 3)`); the unknown lane is refused (`_caller_lane` 'unknown' falls to RAISE); `_money_unfreeze_tier` of a missing bill is 3. `tuition_frozen = NULL` is kept true by the live keep trigger before the guard's WHEN is evaluated (P2e; the column is NOT NULL on live anyway).
- SECURITY DEFINER: every new function pins `search_path=public` and schema-qualifies its tables; no dynamic SQL; grants: only `change_enrollment_terms` to authenticated (checks `has_role(auth.uid(),'admin')` first). No new table, so no grant / schema-cache / partial-index issue.
- Trigger order: every guard is `zz_` and sorts after the live BEFORE triggers that rewrite `NEW` (`keep_frozen_invoice_amounts`, `update_*_updated_at`, `sync_students_deactivated_at`); the deactivation trigger's enrolment UPDATE (depth 2) is judged - the 3B guards do not skip nested writes.
- Cascades: student delete -> enrolments (judged), family delete -> `family_id` SET NULL (judged), definition delete (HC121 while in use). TRUNCATE is not reachable through PostgREST (authenticated has no TRUNCATE; service role has, but only over SQL).
- Reach vs the calculators: every column calculate-tuition / -bulk read from the guarded tables is in a reach (enrolments: the seven priced columns + `created_at`/`id` = B-1; assignments: `discount_def_id`, dates, lead day; bonuses `select *` = type/value/cadence/dates; definitions: type/value/is_active (start/end/cadence/amortize guarded though unread); students `family_id`, `sibling_discount_from`; families `sibling_percent_override`); pay: `staff_pay_rates` the six columns, mirror the three, before the first row only (matches `_lib/pay-history.ts` `rateOnDate` fallback). Payroll counts only Held lessons and TA `session_participants` (`_lib/payroll-sessions.ts`), as `payroll_reach` does.

## 4. Nothing existing weakened; nothing live broken

- Only one existing body replaced (`_money_enrollment_rpc_call`, 8796eb02 -> b63e90a3; same attributes, no grants); no existing trigger changed; no row written except one `guard_installed` event (builder's install section, re-run). The cancelled-lesson trigger, session eligibility, closed-payroll trigger, payment-month confirmation, sibling hold, D2, 1a floors and the 1b register are not touched; the full suite is green over them (section 7).
- No existing test assertion was edited: the diff touches only new test files and four new `run.mjs` entries. The 1b source check on `ModifyEnrollmentModal` was satisfied by keeping the code's four `rpcErrorText` toasts, not by editing the test.
- Live writers: calculate-tuition / -bulk never set `tuition_frozen` (grep) and are unaffected; Stars sync and mark-attendance write only the register (unchanged path); `ai_action_apply` / `undo` (definer, person lane): T0 unchanged, T1+ now refused all-or-none and worded by `aiActions.ts` (design A-21). Note: undo of an enrolment whose months have since become billed is now HC120 (time alone), worded "do it from the enrolment screen". `create-teacher` / `-teaching-assistant` / `manage-admin-users` write unguarded columns. `link-student-user` = M-1. `admin-data-import` still upserts `students` / `families` / `teachers` with the service key: a row that moves a family link, a sibling field or a staff rate over billed months now fails that table's import (fail closed, reported per table) - pre-existing service-key use, noted only.
- Window between paste and screens: old screens' raw T1+ writes are HC120/HC025 (closed), as (h) states.

## 5. History and audit

The migration rewrites no row. New paths never rewrite the past: `change_enrollment_terms` splits (the old row ends the day before) unless the date is on or before the start, where it is the whole-span edit judged by the trigger. Every checked change leaves one append-only `money_change_overrides` row (who, when, reason, `row_before`, `change`, reach) - 1b's table, its insert / update guards unchanged; the owner lane leaves an `owner_lane` event.
**N-1 (minor):** `referral_bonuses`, `discount_definitions`, `teachers`, `teaching_assistants` have no audit trigger (`20261009130000:151-155` lists neither; 3B adds only `audit_families`), so a T0 raw write to them through the API leaves no row at all. Add `audit_<table>` with `audit_row_change()` for those four, as was done for families.

## 6. Functions and screens

- `update-enrollment-rate`: admin JWT only (`allowServiceRole: false`), preview / confirm on the caller's client, the enrolment checked to be the child's, service key only for the refresh over `refresh_pairs`; a refresh error after the commit is reported as a warning, not a failed change. `create-family`: every enrolment previewed before anything is created, one digest token, family / children / enrolments on the caller's client; a refusal after creation returns `partial`. `manage-demo-student`: no longer ignores the two enrolment errors; re-locks the demo on HC120/121. `admin-data-import`: five tables cut, fee stripped, dry run honoured. Edge-function typecheck green.
- Screens: no figure is computed in the browser (grep of the diff); recalculation only by invoking calculate-tuition. Dialog text matches the plan (`moneyInputs.ts`). **N-4 (minor):** `inputIntro` says "reaches months that are already billed ... those bills are worked out again" also for a T1 that reaches a taught past month with NO bill (days entering an enrolment); say "already taught or billed".
- **N-3 (minor, operability):** because both calculators read assignments with `effective_from <= <first of next month>`, a discount "from the 1st of this month" reaches last month; after the first week that month is past, so the ordinary "discount from this month" is a T1 dialog (b.7 says "none"), and if confirmed its refresh re-prices last month. The guard is right about the calculator; the calculator is the bug (the 1st-of-month fix on `keen-vaughan`). Tell the owner; the fix belongs to the calculator, not the guard.
- **N-2 (minor, design gap):** the sibling count reads `students.is_active` and `families.is_active` (`compute-sibling-discounts/index.ts:42,179,196`, `_lib/projected-per-class.ts:9`). `UPDATE families SET is_active=false` over confirmed past months: ALLOWED (P4a). It moves a figure only when the family calculator runs again for a past month (sibling state unresolved), so it is narrow; record it in (g) or guard it like `sibling_percent_override`.
- **N-5 (minor):** `_money_input_ack` passes the override's own `target_id` to `_money_ack` (so that check is vacuous) and the enrolment INSERT / end / transfer checks test only the class and the op, so an `enroll` acknowledgement for child A covers an insert for sibling B (P6: ALLOWED). Not reachable - no client statement runs inside the checked transaction - but it is weaker than the comment says; add `v_kid` = the planned child for INSERTs.

## 7. Runs

(filled in below)

## 8. Apply-ability, preflight, rollback

- Preflight (`:55-145`): every function, table and column the file reads; the 1a/1b bodies it relies on by CR-stripped md5. I recomputed the md5 of those bodies from the repo files: `_caller_lane` 66001c3b, `_money_ack` 471a5563, `tuition_reach` d48607bb, `tuition_month_state` 73384021, `payroll_reach` 5ccecd82, `_money_enrollment_rpc_call` 8796eb02 (1b) / b63e90a3 (this file) - all equal the literals. 1b is live from the reviewed commit (`D4-1b-live-apply.md` on conductor/work), so they should match live; the conductor's pre-paste probe should still read them on live. `SET LOCAL lock_timeout = '5s'` right after BEGIN; one transaction; safe twice (builder's CRLF-twice case).
- Not checked by the preflight but relied on: 1b's dispatcher lists the six 3B entities (`20261114091000:826-836, 851-861`) - it does, and an absent entity function is `not_installed`, closed.
- Rollback 5 drops the nine guards (twelve triggers); with them gone `money_change_checked` refuses (HC050), raw writes pass as before, a direct pause is recorded again (builder's section, re-read). After B-2 it must also drop the two new invoice triggers.

## 9. Mutants

(filled in below)

## 10. Not checked

- The live database (by the rules). Overlapping enrolments on live (B-1's reach in practice): the conductor can count them read-only (`SELECT count(*) FROM enrollments a JOIN enrollments b ON a.student_id=b.student_id AND a.class_id=b.class_id AND a.id<b.id AND a.start_date <= COALESCE(b.end_date,'9999-12-31') AND b.start_date <= COALESCE(a.end_date,'9999-12-31')`).
- `ai_action_apply` / `undo` executed with 3B installed (their suite's prelude lacks the D4 tables); judged from the installed SQL.
- `npm run test:bun`: no bun on this PC (the builder could not run it either); no bun test file changed.
- Screens rendered; concurrency (pglite is one connection).
