# D3 dialogs ("Check before cancelling")

Where I am / next step: DONE. Final commit made; node_modules links removed.

Written and rendered against a FAKE client only. Nothing deployed, no live Supabase, no sign-in.

## Files

New: `src/lib/sessionGuard.ts` (all wording, validators, adapter), `scripts/sessionGuard.test.ts`, `src/components/admin/session-guard/` (`api.ts`, `useGuardedChange.ts`, `GuardDialog.tsx`, `EvidenceCards.tsx`, `ConsequenceTable.tsx`, `Fields.tsx`, `CancelOverridesReview.tsx`).
Rewired: `CancelSessionDialog`, `DeleteSessionDialog`, `SessionActionsModal` (direct hard delete and automatic force-cancel removed), `EditSessionModal` (admin/; time change -> checked move, teacher/notes -> `update`), `class/EditSessionModal` (status into/out of Canceled -> guard), `BulkSessionDelete` (two-step), `schedule/GlobalCalendar` (drag -> move dialog; Undo is another checked move), `tabs/AutomationTab.tsx` (review screen added as an advanced section; `Admin.tsx` NOT touched).

## Field names assumed (D-review-3 F-1 contract change)

All read through ONE adapter, `readStoredBills()` in `src/lib/sessionGuard.ts`; a rename is a one-line change there.
- Stored bills list: `consequences.invoices_before`, else `consequences.bills`, else `preview.invoices_before`, else the older `consequences.tuition[].before`.
- Each bill: `student_id`, `month`, `total_amount`, `discount_amount`, `recorded_payment`, `status`, `confirmation_status`, `tuition_frozen` (the same keys the migration stores in `invoices_after`).
- Missing total -> "Current bill: not available". No "after" figure is ever shown or computed; the line "The new bill is worked out after the lesson is cancelled and shown here." is shown. `consequences.reason === 'not_requested'` -> "figures were not requested".
- Teacher pay line: `consequences.payroll { fetched, month, teacher_id, response.payrollData[].{teacherId,totalAmountActual,sessionsCountActual} }`, shown as "as it stands now"; not-fetched -> "could not be worked out".
- Success: `result.override_id`, `result.review_required`, `tuition.{status,results[],failed[]}`. Errors: `code`, `preview` (on `token_stale`), `use_action`. Wording is keyed on `code` (ERROR_TEXT), not `message_key` (D2-guard-design's `cancel_guard.*` keys differ from D2-edge-build's `sessionGuard.error.*`; code is the same in both).
- Review screen reads `session_cancel_overrides` (table), `session_cancel_review_queue` and `session_cancel_tuition_pending` (views) with the admin's own client, cast through `any` because `types.ts` lacks them. "Reviewed" = review_required and absent from the queue view.

## Verification

- `npx --yes bun test scripts/sessionGuard.test.ts`: 30 pass, 0 fail (reason mirror, typed date, canSubmit gating, error codes and parseInvokeError, stale diff, stored-bill rows/totals without arithmetic, payroll line, refresh summary, bulk grouping and acknowledgement, review filters).
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0 (run after the type fixes; the later contrast edits changed only CSS class strings). The first run had caught 14 real errors (boolean `ok` does not narrow without strictNullChecks), fixed.
- No direct write to `sessions` in any file I touched (grep script over `src/`, `.from("sessions")` followed by insert/update/delete/upsert). Remaining direct session writes elsewhere in `src/` (not mine; contract says unaffected by the functions, but the migration's trigger still governs them):
  - `src/components/admin/class/AttendanceDrawer.tsx:129`
  - `src/components/admin/class/SessionDetailDrawer.tsx:115` (teacher/notes)
  - `src/components/admin/TeacherScheduleTransfer.tsx:143` and `:156`
  - `src/components/teacher/AttendanceMarking.tsx:216` (teacher sets Held)
- Screenshots in `docs/evidence/D3/` at 375 and 1280 (each under 300 KB, PNG): loading skeleton, NONE future, NONE past, SOFT (open, ready), STRONG (open, wrong date, ready with typed date), settled/correction, stale token (banner, button disabled again), partly failed refresh with retry, guard not installed, unknown error code shown, delete refused -> "Cancel instead" -> cancel dialog, move, bulk with mixed evidence (preview, ticked rows with own reason, result), review screen (needs review, expanded row, weekly digest). The first few (none-future, none-past, soft-1, strong-1) pre-date the opaque dialog surface and contrast tweak.
- axe-core on the open dialog (soft, ready state, 1280): 0 violations after the contrast fix (before it: 1 serious `color-contrast` on the destructive button text, #f04242 on near-white 3.68:1; the destructive tint is now the border and icon, text is foreground). Harness-only moderate findings on the bulk/review pages (`landmark-one-main`, `page-has-heading-one`, `region`) come from the bare harness page having no `<main>`, not from the components. No horizontal page scroll at 375 in any state.

## Not implemented / ambiguous in the contract

1. Marking an override "reviewed" (`record_session_override_event('reviewed')`) is not on the screen: the brief asked for the queue state only, and the reviewer-must-differ rule is an owner decision.
2. Bulk HARD delete (manage-session `bulk-delete`) has no screen; the old screen only cancelled.
3. `Canceled -> Held` via status menu: not offered (server returns `uncancel_to_scheduled_only`).
4. A time-only drag (preview `kind: null`) still opens the dialog (one click, no reason) rather than moving silently.
5. The preview's `invoices_before` field names are assumed (see above); the real per-bill payroll "after" is never shown.
6. Contract keys differ between D2-guard-design (`cancel_guard.*`) and D2-edge-build (`sessionGuard.error.*`); the UI keys on `code`.
7. The harness could not exercise real `supabase-js` `functions.invoke` error objects; `parseInvokeError` reads `error.context.json()` per the contract.
