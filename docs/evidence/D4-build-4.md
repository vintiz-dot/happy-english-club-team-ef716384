# D4 step 4 build: change approvals (built switched OFF)

Branch `claude/d4-step4-approvals`, from `claude/hec-conductor-setup-efbaa5` at efcb3a64. Pglite only: no live
database, no deploy, no push; no real data.

**Where I am / next step:** built and proved (see Results). Next step is not mine: the fable review of step 4, then
the conductor's merge and a live-apply brief (paste after 3A and 3B are live).

Owner's ruling (D-22): approvals are BUILT SWITCHED OFF. The setting row ships `enabled = false`; while off,
`change_approval_needed` answers "not required" for everything, the three triggers return at once, and
`request_change_approval` refuses with `approval_not_needed`. Behaviour is today's (proved by running one scenario
with and without file 6 and comparing every answer, tier and row).

## What was built

| File | What |
|---|---|
| `supabase/migrations/20261114095000_d4_change_approvals.sql` | tables `change_approval_settings` (one row, OFF), `change_approval_requests`, `change_approval_events` (both append-only, owner-only inserts, admin read, explicit GRANTs: authenticated SELECT, service_role ALL - the triggers refuse its writes); view `change_approval_queue` (security_invoker, status inline); the rule `change_approval_needed` and the claim `_change_request_claim` (replace 1b's stubs); 1b's `_money_change_full_plan` replaced with one change (below); the planner `_approval_plan` (every checked function a request can name: money single / bulk, D2 cancel / move / uncancel / bulk, settings, grant admin, pay carried forward); RPCs `request_change_approval`, `approval_request_preview`, `approve_change_request`, `reject_change_request`, `withdraw_change_request`, `release_own_request`, `acknowledge_released_request`, `set_change_approval_settings`, `change_approval_status` (authenticated only; admin checked inside); internal writers `grant_admin_role`, `carry_payroll_adjustments` (no grant: run only by an approval); triggers `session_cancel_overrides.zz_session_override_approval` (D2's own changes, no change to `_session_change_apply`), `user_roles.zz_admin_grant_guard` (A-18), `payroll_adjustments.zz_pay_adjustment_approval` (A-4). Preflight: every earlier step's guard trigger present; 28 bodies pinned (CR-stripped md5): D2's apply / RPCs / bulk, 1a's assess, 1b's apply / bulk / preview / dispatcher, every `_money_plan__*` whose impact the rule reads (steps 1b, 2, 3A, 3B), and the three bodies this file replaces (1b's or its own). No existing row changed; safe to paste twice and as CRLF. |
| `scripts/ROLLBACK-d4-6-approvals.sql` | drops the three triggers, nothing else. Approvals then read as off (installed = `zz_session_override_approval` exists). |
| `src/lib/approvals.ts` | pure: reason and status wording, HC060-HC065 sentences with the next step, the request params built from a dialog's plan and form (money, D2, pay), the queue order, a mirror of "loosens" for the button's wording. |
| `src/components/admin/approvals/{api.ts, ApprovalInbox.tsx, ApprovalSettingsCard.tsx, PendingApprovalBadge.tsx}` | typed RPC wrappers; the inbox (request beside the change recomputed now; approve / reject with a sentence / withdraw / release alone / acknowledge / ask again); the settings card (switch on needs two admins, off or looser while on goes to the other admin, the off statement for a school left with one admin); the waiting count. |
| `money-guard/useMoneyChange.ts`, `MoneyGuardDialog.tsx`, `MoneyInputDialog.tsx` | `requestApproval()`; when the preview says approval is required the button reads "Send for approval" and sends the change as typed with the preview's token. |
| `session-guard/useGuardedChange.ts`, `GuardDialog.tsx` | `requestApproval()`; an `approval_required` refusal offers "Send for approval" (D2's checked function with the arguments as typed). |
| `session-guard/CancelOverridesReview.tsx` | tabs (overrides / waiting for approval); "asked by X; approved and made by Y", read from the approval record's applied event (never from the row's caller-written `attached`). |
| `payroll/PayrollMonthLock.tsx` | a carry refused with HC060 offers the request for the same rows; the waiting count. |
| `tabs/AutomationTab.tsx` (conductor's file; one section added) | mounts the settings card, inbox and count. |
| tests | `d4-approvals.test.mjs` (new, registered), `approvals-lib.test.mjs` (new, registered), `d4-apply-chain.test.mjs` extended, `d4-mutants.mjs` A01-A30, `d4-prelude.mjs` `D4_PAYROLL_ADJ`, `guard-fingerprint.mjs` file 6 + rollback 6, fingerprint regenerated. |

## Decisions taken while building (for the reviewer)

1. **`_money_change_full_plan` is replaced.** 1b hands the rule only the plan's `impact`, which for step 2 and some 3B
   entities carries no `tier`; the `tier3` line needs it, and the rule judges an impact without a tier as T3 (fail
   closed), which would make every fee change from next month wait. File 6's body is 1b's with one change: the
   impact handed to the hook gains the plan's own (clamped) tier. Token, fingerprint, `requires`, review rule
   unchanged. Pinned (1b's md5 or file 6's). Rollback 6 leaves it (re-pasting 1b puts 1b's text back).
2. **Families / paid lines fire only when the change itself is T2+.** T0 / T1 never wait on those two lines whatever
   the window. The window (R-12) adds the same person's T2+ changes of the last 24 hours from BOTH override tables,
   including this transaction's (a batch is judged whole: the 15-item case is refused at the third item and nothing is
   written), and including changes made while approval was off. Changes applied under an approval are excluded,
   recognised by the approval event's txid (never by the caller-written context).
3. **Who is named.** The change runs as the approver (as the design says for D2), so `actor_user_id` is the approver
   in BOTH override tables and `canceled_by` too; the requester is in the request, its events and `attached`
   (informational). Design (e) said money rows store the requester; that needs 1b's apply replaced. The review
   screen shows both names from the approval record.
4. **Rollback 6 reads as off** by the missing trigger; a present-but-disabled approval trigger while on is HC050. A
   missing settings row is HC050 with the repair INSERT even while off (A-15): it stops every checked change and every
   D2 cancel until repaired (only the owner can delete the row).
5. **Approve = apply, in one transaction, inside a subtransaction**: a change the checked function now refuses
   (HC010-HC017, HC060, P0002) or a batch item refused is recorded as `stale` and applies nothing (a batch is whole
   or nothing). HC050 and other errors propagate (nothing recorded, nothing changed).
6. **HC065 for loosening** (design b.8): `set_change_approval_settings` answers HC065 `loosen`; the screens treat it
   like HC060 and offer the request.
7. **`grant_admin_role` / `carry_payroll_adjustments` have no grant**: they run only inside an approval. While off,
   admins are added and pay carried as today.
8. **Expiry 7 days, solo release (A-17) off by default**, `acknowledge_released_request` keeps a released request in
   front of the other admin until read.
9. **Not wired in screens** (the database refuses correctly; the screen shows the refusal): the money bulk screens
   (`runMany` / BulkEnrollmentDateSetter) and bulk-cancel-sessions' one-request offer (the DB accepts
   `money_changes_checked_bulk` and `cancel_sessions_checked_bulk` requests and the suite proves them); 3A's
   lesson-pay dialog (`useGuardedPayChange`); `manage-admin-users` (service role) cannot give the admin role while on
   (HC060; use the grant request). No edge function changed in step 4.
10. **`d4_guard_status` not replaced** (would pin 3A's 932bc6aa); approval has its own `change_approval_status`.

## Results

- `d4 approvals` (new, pinned 141): **141 passed, 0 failed**. OFF: one scenario (previews and checked changes of
  attendance T1-T3, a fee into a signed month, an unfreeze, a money batch, D2 cancel and bulk cancel, a pay carry, an
  admin grant on the service lane) run on 1a..3B and on 1a..3B + 6 in two child processes: every answer, tier and
  row identical; no request or event written; asking refused as not needed. ON: under / over 5,000,000 VND; HC060 and
  nothing written; one request, HC063 for a second; requester cannot approve (HC061), reject, or use their token;
  approver's preview, token, approve = apply, override names approver and asker; audit append-only; stale (payment
  landed, mark changed) recorded and refused; expired HC064; reject needs a sentence; withdraw by the asker only;
  tier3 via the fee plan (no tier in its impact) and a fee from next month not waiting; unfreeze; closed payroll (3A
  reteach); D2 single and bulk through the insert trigger; 15-item batch refused whole then one request applied
  whole; the 24-hour window (third single change waits; changes while off count; T1 never; approved changes not
  counted again); pay carry and its stale double; admin grant by request only; an approval is not a vehicle (another
  change in the approver's transaction, or a replay later: HC060); settings (two admins, loosen needs the other,
  tighten at once); solo release (off by default, not before the delay, asker only, acknowledged by the other);
  disabled trigger / missing row HC050 (A-15); rollback 6 reads as off, rows kept, re-paste on again.
- `approvals lib` (new, pinned 35): 35 / 0 (wording of every reason the migration emits, request builders, queue,
  settings mirror, static checks of the screens: only the nine RPCs, no table write, asked-by from the approval
  record).
- `d4 apply chain` extended (pin 238 -> 344): 344 / 0 - 2 -> 3A -> 3B -> 4 in all six orders of the first three and as
  CRLF; step 4 refused early and installs nothing; second pastes; rollback 6 alone (exactly the three triggers go);
  rollbacks 6..3 back to 1b (the five replaced 1b bodies differ, by design), 1b re-paste exact but for the two stubs,
  re-install, rollbacks 6..1 + D2 = the D release.
- Fingerprint `--release d4` regenerated: 129 functions, 57 triggers, 11 relations (step 4: 30 / 11 / 4).
  `--release d4 --check` and `--check` up to date; `--check-unchanged`: only the two 1a functions differ;
  `--check-unchanged --after-rollback` (rollbacks 6..1 + D2): 66 of 66.
- Mutants A01-A30 (`node scripts/pgtest/d4-mutants.mjs A01 ... A30`; the runner patches file 6's own pins for a
  mutated body): **30 / 30 caught**. A06 (claim without the this-transaction / this-caller check) survived the first
  run and is caught by the replay case added for it.
- `tsc --noEmit -p tsconfig.app.json`: exit 0 (also `app typecheck` 3/0 in the run).
- Full `node scripts/pgtest/run.mjs` (05:00 Hanoi, clock moved back 8 hours for 3B's after-midnight edge): **8477
  assertions across 88 suites, 1 failed: `d4 floors` 212 / 2**, the known 1a clock edge (C-1 move; the moved-back
  clock landed after 20:00). Re-run alone on the real clock: **213 / 0**. Every other suite green, every pin met;
  all earlier D4 suites unchanged (no existing suite edited apart from the apply chain, which step 4 owns by the brief).

## Not verified

- The live database, the deploys, the screens in a browser (pglite and the type-checker only).
- Bulk screens, 3A's lesson-pay dialog and `manage-admin-users` are not wired for requests (decision 9).
- `npm run test:bun` not run (no bun-tested file touched).
- Root `AGENTS.md` rule ("approval is decided in `change_approval_needed` only") not added: conductor's file.

## Fix round 1 (review REVIEW-d4-step4.md, SHIP WITH CHANGES)

**Where I am / next step:** every finding answered and tested (below). Next step is not mine: a re-review of this
round, then the conductor's merge, deploys (client and the three functions) and the paste.

Branch `d4-step4-fix` from `2d076ccb`. Pglite and the type-checker only: nothing deployed, nothing on the live
database, nothing pushed. Only file 6 (`20261114095000`, not applied anywhere) and step 4's screens / functions
changed; every pinned body of 1a..3B is untouched and the 28 preflight pins are unchanged except file 6's OWN
`_money_change_full_plan` md5 (`5bcb5952...` -> `b27d8f2f6fd43ed006ce43ff180359c6`, because of N-3; 1b's
`8f8b9abd...` is still accepted, so the paste over live works as before).

**File 6 LF md5 (CR stripped): `2138769745a241da0797e9655cf69a8a`** (was `a2fb36e52c1df3664621ebae0d8a90d7`). 1600 lines.

| Finding | Change | Test |
|---|---|---|
| B-1 carry rewritten / deleted | `zz_pay_adjustment_approval` is now `BEFORE INSERT OR UPDATE OR DELETE`. While on (and `on_pay_adjustment`), outside the owner lane: an UPDATE that changes anything but `reason` / `created_by` is HC060, a DELETE is HC060 (no request kind writes either, so no claim can allow them; the correction is a carry of the difference, which is a request). Off, or the owner lane: as before. Fails closed: row missing = HC050 on UPDATE too. | d4-approvals: raise / move teacher / move month / service lane / delete refused, reason-only rewording accepted, owner lane accepted, the negative carry by request applied; OFF scenario now also UPDATEs and DELETEs a carry (identical with and without file 6). Probe P1, P2a, P2b now pass. Mutants A31-A33. |
| B-2 approval never refreshes bills | `guarded-change-refresh` gains `approve`, `release` and `approval-refresh`: it calls `approve_change_request` / `release_own_request` with the admin's OWN JWT, then `refreshApprovedChange` (`_lib/money-guard.ts`) reads the request's kind and override ids from `change_approval_queue` as the caller and runs the direct path's refresh - `refreshMoneyChange` for money, `refreshAndRecord` for a D2 lesson override (skipping one already `tuition_refreshed`) - recording each outcome on the override as the approver, plus an `approval_applied` / `approval_released_alone` audit row. The inbox (`approvals/api.ts`) approves and releases only through it, says whether every bill came back, and offers "Work out the bills again" (`approval-refresh`, idempotent) on an applied money / lesson request. A function too old for the actions answers `bad_action` before doing anything: the inbox says "not updated yet, nothing was done". | Probe P4 (registered): the RPC alone leaves the bill pending (characterisation) and approval-refresh clears it; through the function a money change and a D2 cancel end `tuition_refreshed`, nothing pending, calculate-tuition on the service client for the child and month, the decision on the approver's client; a failed refresh is reported failed and the retry finishes it; stale, not-applied, teacher and self-approval answered correctly. approvals-lib static checks. |
| M-1 bulk cancel half done | Chose BOTH: before the first chunk of a batch over 50 lessons, `bulk-cancel-sessions` asks the new read-only RPC `change_approval_check` for the WHOLE batch (the same plan and rule `request_change_approval` uses; a whole-batch "not required" implies every row passes, as each row is judged on its own impact plus the rows before it). Required: 409 `approval_required`, nothing cancelled, the one request offered with the items as sent. More than 200 lessons while on: 413, nothing changed. The race left (something changes between the question and a later chunk) is no longer an early return: what was cancelled is refreshed, audited and answered `ok: true, partial, stopped: approval_required` with the rest `not_attempted` and offered as one request. `BulkSessionDelete` keeps the offer and sends it ("Send these N lessons for approval"). Check missing (step 4 not installed) = off. | Probe P5: 51 plain + 1 T3 lesson: nothing cancelled, the offered params accepted by `request_change_approval` (52 fingerprints); with the check taken away the first 50 are cancelled, audited (count 50, 2 not attempted), reported truthfully; off: cancelled at once. d4-approvals: check required / not required / teacher refused. Mutant A36. The 3A single-chunk case (d4 functions lessons) unchanged. |
| M-2 admin role, orphan account | `manage-admin-users` asks `change_approval_status` as the caller BEFORE `createUser` (create), before the insert (promote) and before deleting roles (updateRole to admin): on = 409 `approval_required` with a sentence (and, for an existing account, the grant request offered). If the role insert is refused anyway the new account is deleted again (`account_removed`); updateRole puts the earlier roles back. `AdminUsersManager` reads the function's own error body and turns a refused Promote into "Send for approval" (`grant_admin_role`, with a reason). | Probe P6 (fake auth admin): create on = no account; promote / updateRole on = no role, teacher role kept; the offered grant approved through the function gives the role; check missing = account removed again; off = as before. approvals-lib static checks. |
| M-3 wording | `approval_required` (and `approval_already_pending`) in `sessionGuard` `ERROR_TEXT`, `approval_required` in `lessonPayGuard` `PAY_ERROR_TEXT`, each with the next step. The 3A lesson-pay dialog now offers "Send for approval" (the checked money op `('session', op)` as previewed, with its token). Money bulk's rare race names the reasons and says what was and was not made. | approvals-lib. |
| Decision 4 addition | `_change_approval_settings_guard` refuses DELETE of the settings row for everyone, the owner included (HC041, naming the switch-off function and the rollback). A missing row is still HC050 (A-15); removing it needs a deliberate DROP / DISABLE of the trigger. | d4-approvals (owner and service delete refused; the A-15 cases now disable the guard first); probe P3-0. Mutant A34. |
| N-3 | `_approval_impact_tier`: the higher of the plan's tier and the impact's own (not 0-3 = 3), in `_money_change_full_plan` and both item branches of `_approval_plan`. | d4-approvals; mutants A12 (updated), A35. |
| N-1 | `reasonText` / `reasonSentence(reasons, thresholds)` name the setting's own families / paid figures (from the preview's `approval.thresholds`, the stored request preview in the inbox); HC064 no longer says "7 days". | approvals-lib. |
| N-2 | `MoneyChangesReview` names who asked and who approved, from `change_approval_queue` (never the row's context). | approvals-lib static. |
| N-6 | A change sent for approval from a `runMany` queue stops it and says how many were not made (toast); every send now confirms itself with a toast. | approvals-lib static. |
| N-4 | `_approval_plan` keeps only `source` (100 chars) and `set_manual = 'true'` of the requester's context. | d4-approvals; mutant A37. |
| N-5 | Not changed: the owner's `off_statement` writes no `settings_changed` event and revoking an admin is not guarded while on; both belong in the live-apply / switch-on brief. | - |

Also found and fixed: `updateRole` to admin deleted the account's roles before the (refused) insert. Nothing found
that could not be fixed, so `set_change_approval_settings` still accepts `enabled = true` (two administrators). The
switch must not be turned on before the step 4 client and the three functions below are deployed: an older inbox
approves through the bare RPC and leaves the bills unrefreshed (B-2).

Functions to deploy (all three type-check in `edge functions typecheck`; `_lib` files are bundled with each):

- `guarded-change-refresh` - `index.ts`, `_lib/money-guard.ts`, `_lib/session-guard.ts`, `_lib/auth.ts`
- `bulk-cancel-sessions` - `index.ts`, `_lib/session-guard.ts`
- `manage-admin-users` - `index.ts`, `_lib/rate-limit.ts`

(`_lib/money-guard.ts` and `_lib/session-guard.ts` are also bundled by manage-session, mark-attendance,
repair-attendance and the 3B functions; their changes there are additions only - `refreshApprovedChange`,
`approvalPrecheck`, `APPROVAL_BATCH_CAP` - so those need no redeploy.)

### Fix round 1 results

- Full `node scripts/pgtest/run.mjs` (08:39 Hanoi, real clock - inside 08:00-20:00, so not moved back): **8538
  assertions across 89 suites, 1 failed: `d4 apply chain` 326 / 18** - its object count for step 4 was still 30
  functions; file 6 now adds 32 (`change_approval_check`, `_approval_impact_tier`). Count updated
  (`'4': [32, 11, 4]`) and the suite re-run alone: **344 / 0**. Every other suite green and at or above its pin,
  including `d4 approvals` **157 / 0** (pin 141 -> 157), `approvals lib` **50 / 0** (35 -> 50), `d4 approvals review
  probe` **47 / 0** (new, registered, pinned 47), `d4 functions lessons` 74 / 0 (the 3A single-chunk HC060 case
  unchanged), `d4 functions register` 34 / 0, `edge functions typecheck` 5 / 0, `app typecheck`, `shared-module
  mirrors` 19 / 0.
- OFF stays today's: the builder's OFF-equivalence scenario (one scenario with and without file 6, every answer,
  tier and row compared) passes, now also UPDATEing and DELETEing a carry; the only OFF-path additions outside the
  database are a read-only `change_approval_check` before a bulk cancel of more than 50 lessons and a read-only
  `change_approval_status` before an admin grant (both answer "off" at once; missing function = off).
- `tsc --noEmit -p tsconfig.app.json`: exit 0. `npm run test:bun`: 250 pass, 0 fail, 1801 expects, 18 files.
- Fingerprint `--release d4` regenerated: 131 functions, 57 triggers, 11 relations (step 4: 32 / 11 / 4);
  `--release d4 --check` up to date; `--check-unchanged`: only the two 1a functions differ.
- Mutants (file 6, suite d4 approvals): **37 / 37 caught** - A01-A30 (A12 re-pointed at the N-3 expression) and
  the new A31 (carry UPDATE passes), A32 (carry DELETE passes), A33 (trigger back to INSERT only), A34 (owner may
  delete the settings row), A35 (impact tier lowered), A36 (whole-batch check never requires), A37 (whole context
  replayed). Run in two passes (A01-A08, then A09-A37: the scratch folder holding the first pass's log was cleared
  mid-run by someone else; A01-A08 had all been reported caught before it went).
