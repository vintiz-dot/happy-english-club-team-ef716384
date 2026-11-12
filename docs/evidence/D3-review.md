VERDICT: INCOMPLETE

Where I am / next step: all findings fixed and committed, aligned to the final contract. Next: final screenshots, tsc, cleanup, verdict.

Written and checked against the fake-client harness only. No sign-in, no live Supabase, no MCP, no deploy.

Environment note: the SHARED node_modules was partly deleted during this run (no `.bin`, no `@alloc/*`, `@dnd-kit`, pglite); I removed my junction with `cmd //c rmdir` and ran `npm ci --ignore-scripts` INSIDE this worktree, so nothing shared was touched. The harness copy is `C:\Users\Dell\hec-tools\d3-harness\preview-r\` (repointed to this worktree, fake client now speaking the FINAL contract) and Vite must run with cwd = the worktree, or Tailwind's `./src/**` content glob finds nothing and no utility class is generated.

## Known defect: dialog not centred at 375 (FIXED, 62a1f38)

Cause, proven from the computed style (`C:\Users\Dell\hec-tools\d3-harness\probe-center.mjs`, strong scenario):

```
320x568 during open : transform matrix(0.9989,0,0,0.9989,0,0)  anim spring-in:running  rect left 160 top 284   (= 50% / 50%)
320x568 after 1.5 s : transform matrix(1,0,0,1,-152,-261.3)    no anim                 rect left 8 top 23     (centred)
1280    during open : transform matrix(1.0079,0,0,1.0079,0,0)                           rect left 638 top 397
```

The shared `spring-in` keyframes (`tailwind.config.ts:213`) set `transform: scale(...)`, which REPLACES the centring `translate(-50%,-50%)` of `src/components/ui/dialog.tsx:39` for the 0.4 s of the open animation. Not a mobile variant and not a harness artefact: it happens at every width; the 375 shot simply caught the animation. Every Dialog in the app does it briefly (outside my files: `ui/*`, for the conductor / the primitives agent).

Fix (GuardDialog only): centred by `inset-0 m-auto h-fit` plus `translate-x-0 translate-y-0`, so there is no translate for the keyframes to remove; the scale animates around the centre. After the fix, during AND after the animation: 375x812 rect 8,32 359x747, Keep 659-707, Cancel 715-763; 320x568 rect 8,23 304x523, Keep 424-472, Cancel 480-528 (inside 568); 1280 rect 352,40 576x720. The body scrolls inside the dialog (`min-h-0 flex-1 overflow-y-auto`); header and footer stay put, so Keep and the destructive button are always reachable. All 375 shots re-taken and looked at (e18235f, then again on the final contract).

## Findings (all fixed unless marked)

| # | sev | where (before fix) | finding | fix |
|---|---|---|---|---|
| F-1 | MAJOR | `src/lib/sessionGuard.ts:606-623` parseInvokeError | Wrong for 3 of 4 supabase-js outcomes (read in `@supabase/functions-js` 2.75 `FunctionsClient.invoke` / `types.js`): a gateway 401 `{code:401,"Invalid JWT"}` was spread over our code so `code` became the NUMBER 401 (unknown, not blocking); a not-deployed function (404 `{code:"NOT_FOUND"}`) showed as an unknown code; `FunctionsRelayError` (context = Response with the RELAY's body) fell to `unexpected`. | Guard bodies trusted only when they look like ours (`ok:false` or a known code); otherwise by HTTP status (401 unauthorized, 403 forbidden, 404 function_missing, else http_error); relay -> `relay`; FetchError (context = TypeError/AbortError, no body) -> `network`; a body already read is not read twice. Tests build real `Response`s inside FunctionsError-shaped errors. 62a1f38 |
| F-2 | MAJOR | `sessionGuard.ts:219-220`, `useGuardedChange.ts:134` | After a CONFIRM that ended in network / relay / 5xx-without-body, the dialog said "Nothing was changed" - the request may have committed before the answer was lost. Same in bulk ("Nothing was changed by this step"). | `UNKNOWN_OUTCOME_CODES` -> "Not confirmed ... cannot tell whether the lesson was changed ... reload", lists refreshed; bulk drops the preview so the same tokens are not resent. 62a1f38, bulk in 3rd commit |
| F-3 | MAJOR | `useGuardedChange.ts:134-158` | A confirm answer arriving after the dialog was closed/reopened still set `done`; `load()` never cleared `success`, so a reopened dialog could carry the old result. | Answers for a closed dialog only invalidate queries; `load()` clears `success`. (Closing during submit was already blocked.) 62a1f38 |
| F-4 | MAJOR | `sessionGuard.ts:566` payrollLine | One calculate-payroll row for a DIFFERENT teacher was shown as this lesson's teacher's pay. | Superseded by the final contract: a preview never shows a pay figure (one line "Pay is recalculated by Payroll after the change."), even if an older server sends `payroll`. 5091d2e |
| F-5 | MAJOR | `useGuardedChange.ts` token_stale branch | On `token_stale` the fresh preview replaced the old one but the OLD consequences (bills) stayed on screen - and a changed bill is exactly why the token goes stale under the final contract. | Fresh `consequences` from the error body are shown; if absent, the preview's own fresh `invoices_before`. The stale list now says "A family bill for this lesson changed". 5091d2e |
| F-6 | MAJOR | `BulkSessionDelete.tsx:405-453` result | Results were not per lesson (refused showed only a code, no lesson); not-attempted lessons were not listed; the bill-refresh advice "cancel again from a single lesson to use its retry" is impossible (a cancelled lesson answers `already_canceled`). | Every line names its lesson (date, time, class) from the kept preview rows; Cancelled / Refused / Not attempted lists; evidence lessons left alone counted; a per-lesson "Retry the bill refresh" calling the contract's `refresh-tuition` with that lesson's `override_id` (from `tuition.per_session`). 3rd commit |
| F-7 | MINOR | `BulkSessionDelete.tsx:96-135`, `useGuardedChange.ts:166` | Double submit possible in the same tick (state-only `busy`); bill-refresh retry unguarded. | Ref guards. |
| F-8 | MINOR | `sessionGuard.ts:248` | "another administrator will look at it" is wrong (self-review allowed for now). | "This change is recorded for review." |
| F-9 | MINOR | `GuardDialog.tsx` | Focus fell to the page when the footer swapped (result, error, stale). | Done focused on the result; Keep on error / stale; the destructive button's description includes the error banner. |
| F-10 | MINOR | `sessionGuard.ts:788` isSessionRelatedQuery | Missed lesson screens the old parents refetched by other names (`student-lessons-all`, `lesson-overview(s)`, `today-agenda`, `lost-revenue`, `teacher-lost-income`, `excused-absences`, ...). | Pattern widened; test lists them. |
| F-11 | MINOR | final contract | Adapter read flat bills; the final shape is `{student_id, month, bill: {...} | null}`; `bill: null` must read "no bill yet", never 0 or "not available"; new codes `rate_limited`, `outside_criteria` had no wording; child count counted (child, month) pairs. | `readStoredBills()` reads `bill` (flat kept as fallback); "No bill saved yet for <month>"; `recorded_payment` shown as "paid this month"; wording for both codes; children counted distinct. 5091d2e |

Item checks with no defect found:
- 2 (money): no `+ - reduce Math. Number(` on a figure in any D3 file; `Number()` only converts for display; the totals row counts bills.
- 3 (keyboard): Keep has initial focus (seen in every open shot); Enter on it and Escape keep the lesson; the destructive button is disabled until reason, tick, correction reason and typed date are all valid and is labelled with the action ("Cancel this lesson", "Move to 14 Nov"); Enter in the reason box is a newline, Enter in the typed-date box is swallowed; the tick is a Radix checkbox (Enter does nothing).
- 4 (typed date): plain YYYY-MM-DD comparison; `Date.UTC` only to reject 31/02; edge tests added (leap day, year boundary, a `+07:00` timestamp, spacing) and the suite was run with `TZ=Asia/Ho_Chi_Minh`.
- 5 (bulk): evidence lessons unticked by default, each with its own tick, reason, correction reason and typed date, no "apply to all"; chunks of 50 are the SERVER's (`bulk-cancel-sessions`), the screen sends one confirm.
- 6 (invalidation): the old dialogs invalidated nothing themselves (their parents' `onSuccess` refetched; GlobalCalendar invalidated `calendar-sessions` + refetch). The new ones still call every parent's `onSuccess`/`refetch` AND invalidate by predicate.

## Item 8: the five direct writes to `sessions` outside D3

Executed pglite probe (`.probe/`, deleted): the REAL migrations 20261009130000, 20261027090000, 20261112090000, 20261112091000 loaded as `session-cancel-guard.test.mjs` loads them; each write run as the app runs it (role `authenticated`, the caller's uid, RLS on).

| write | future lesson | started today | Held with marks | settled month (paid bill + payroll locked) |
|---|---|---|---|---|
| AttendanceDrawer:129 admin swaps teacher_id (+updated_by) | allowed | allowed | allowed | allowed |
| SessionDetailDrawer:115 admin notes | allowed | allowed | allowed | allowed |
| SessionDetailDrawer:115 admin teacher_id | allowed | allowed | allowed | allowed |
| TeacherScheduleTransfer:143 admin bulk teacher_id `.in()` | allowed | allowed | allowed | allowed |
| TeacherScheduleTransfer:156 admin conflict reassign | allowed | allowed | allowed | allowed |
| AttendanceMarking:216 TEACHER Scheduled->Held `.eq(status,Scheduled)` | allowed, no change (validate trigger keeps a future lesson Scheduled) | allowed, changed to Held | allowed, 0 rows (already Held) | allowed, 0 rows |

Also: an ended lesson still Scheduled with marks - all six allowed, the teacher's flip changes it to Held. NOTHING IS REFUSED, so none of the five is a release blocker. Not a blocker but worth the owner's eye (already D4 by ruling): an admin can move a taught lesson's teacher in a payroll-locked month with no reason (pay moves between teachers silently).

## Item 7: capability table

| capability | old path (c7c5f21) | new path | gap verdict |
|---|---|---|---|
| cancel | CancelSessionDialog -> manage-session `cancel`, no token, reason "No reason provided" | GuardDialog: preview -> `cancel` with token + reason (+ confirm, correction, typed date) | - |
| force-cancel | SessionActionsModal: automatic `force-cancel` for a past Held lesson | gone; the same GuardDialog `cancel` (server treats both alike) | - |
| un-cancel | SessionActionsModal `change-status` / class EditSessionModal `update` | GuardDialog `uncancel` | - |
| Scheduled <-> Held | `change-status` | unchanged (`change-status` with a reason) / class modal `update` | - |
| Canceled -> Held | `change-status` | not offered (server `uncancel_to_scheduled_only`); restore, then mark Held | acceptable for release |
| delete | SessionActionsModal raw `.delete()` / DeleteSessionDialog `delete` | GuardDialog `delete`; `use_cancel` -> "Cancel instead" | - |
| bulk cancel | BulkSessionDelete one-step | two-step preview/confirm, per-lesson acknowledgement | - |
| bulk delete | none (the old screen only cancelled) | none; server has `bulk-delete` (now bulk-cancel shape) | acceptable: a whole new screen, not small |
| edit times | admin EditSessionModal raw `.update()` | GuardDialog `move`, then teacher/notes via `update` | - |
| move date | admin EditSessionModal / calendar drag raw update | GuardDialog `move` | - |
| calendar drag (+ Undo) | GlobalCalendar raw update | GuardDialog `move`; Undo is another checked move | a time-only drag opens the dialog (`kind:null`, one click, no reason): acceptable |
| mark reviewed | none | ADDED: review screen "Mark as reviewed" with a 15+ char note -> `record_session_override_event('reviewed')` (existing RPC, appends an audit event, changes no lesson/bill/pay) | added (small, server action exists); reviewer-must-differ stays the owner's call |

## Final field names the adapter reads (`readStoredBills()` in `src/lib/sessionGuard.ts`)

- preview: `consequences.invoices_before[]` -> `{ student_id, month, bill: { total_amount, discount_amount, recorded_payment, status, confirmation_status, tuition_frozen } | null }`; fallbacks: flat rows, `consequences.bills`, `preview.invoices_before`, old `consequences.tuition[].before`.
- children: `consequences.affected_students[].student_id` (distinct), else `preview.affected`.
- `after` / `pay_line`: not read for figures; fixed wording.
- token_stale: `error.preview` + `error.consequences`.
- success: `result.override_id`, `result.review_required`, `tuition.{status, results[], failed[]}`; retry `refresh-tuition {override_id}`.
- bulk: `canceled|done`, `refused[{id,code}]`, `not_attempted`, `needs_ack`, `held_ignored`, `stopped`, `tuition.per_session[{id, override_id, status}]`, `tuition.failed`.
- errors: `code` (+ `status`, `retryAfter` passed through).

## What remains for the conductor

1. `src/components/ui/dialog.tsx` + `spring-in`: every OTHER dialog in the app is off-centre for 0.4 s while opening (the same cause). Fix in the primitive (e.g. keyframes that include `translate(-50%,-50%)`, or inset/margin centring).
2. Not deployed, not run against a real Supabase: the dialogs were exercised only with the fake client. The functions and the dialogs must ship together (old screens get `preview_required`).
3. Bulk needs_ack rows now carry `consequences`; the bulk screen does not show those bills per row yet (evidence and reason only). Not wrong, less informative.
4. The review screen's "reviewed" state is read from the queue view limited to 1000 rows.
5. The shared node_modules damage noted above (restored by the conductor at ~11:30).
