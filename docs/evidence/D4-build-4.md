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
