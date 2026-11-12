# Tuition release - live deploy log

**Where I am / next step:** DONE - all seven functions are live at v4 from `release/tuition-1b` 93ca410, each identical to the repo byte for byte and booted; money sums unchanged. LIVE AND VERIFIED - ready for the push to main. (First run below stopped at step 1 on probe 7; the resumed run follows it.)

First run: source `release/tuition-1` at 9804590. Live project `aswgmbefikhsnhogtryv`. 12 Nov 2026, about 15:45 UTC.

## Step 1 - present state (read-only)

### Functions on live (`list_edge_functions`)

| function | version | status | verify_jwt | entrypoint on live |
|---|---|---|---|---|
| calculate-tuition | 3 | ACTIVE | true | `source/supabase/functions/calculate-tuition/index.ts` |
| smart-family-payment | 3 | ACTIVE | true | `source/supabase/functions/smart-family-payment/index.ts` |
| family-payment | 3 | ACTIVE | true | `source/supabase/functions/family-payment/index.ts` |
| settle-bill | 3 | ACTIVE | true | `source/supabase/functions/settle-bill/index.ts` |
| delete-payment | 3 | ACTIVE | true | `source/supabase/functions/delete-payment/index.ts` |
| confirm-tuition | 3 | ACTIVE | true | `source/supabase/functions/confirm-tuition/index.ts` |
| calculate-tuition-bulk | 3 | ACTIVE | true | `source/supabase/functions/calculate-tuition-bulk/index.ts` |

All seven carry the same `updated_at` (1794314839082): one deploy of the whole folder. Nobody has deployed any of them since.

### Rollback source saved

`C:\Users\Dell\hec-tools\tuition-rollback\<function>\v3\...` - the files `get_edge_function` returned, byte for byte (CRLF as stored on live), plus `_meta.json` (version, verify_jwt, entrypoint, ezbr_sha256). Written by a script that reads the tool results out of this session's own transcript (`extract.mjs`), not re-typed, so there is no transcription step to doubt.

File names as live returns them: `functions/<name>/index.ts` + `functions/_lib/<file>.ts` for the five with `_lib` imports; `<name>/index.ts` alone for settle-bill and delete-payment.

### Live source against origin/main 0f372a6 (script compare, only CRLF -> LF normalised)

| function | files on live | result |
|---|---|---|
| calculate-tuition | index, rate-limit, auth, sibling-state, tuition-session, enrollment-discounts | all identical |
| smart-family-payment | index, rate-limit | identical |
| family-payment | index, rate-limit | identical |
| settle-bill | index | identical |
| delete-payment | index | identical |
| confirm-tuition | index, auth | identical |
| calculate-tuition-bulk | index, auth, sibling-state, tuition-session, enrollment-discounts | all identical |

Live is exactly main; it has no logic the release lacks. The only difference is line endings (live was deployed from a CRLF working copy).

### Release blobs checked

The 13 files to send (7 entrypoints + rate-limit, auth, sibling-state, tuition-session, enrollment-discounts, invoice-status) were exported from 9804590 with autocrlf off: 0 CR bytes in each, and the git blob hash of each exported file equals `git ls-tree 9804590`. Relative imports read from each file: exactly the manifest's list; no `_lib` file imports another file. `supabase/config.toml` has `verify_jwt = true` for all seven.

### Pre-deploy probes

| probe | result | expected |
|---|---|---|
| 4 `recorded_payment IS NULL` | 0 | 0 |
| **7 overlapping enrollments in one class** | **1** | **0 - STOP** |
| CHECK-invoice-status-resets q0 | audit columns 2 of 2, invoices audit trigger 1, trail starts 2026-10-10 | can run |
| CHECK q1 | confirmed_then_reset 69, payment_but_issued 421 | recorded |
| T1 review 2 section 1 (stored label -> label by the rule) | issued->paid 349, issued->partial 64, draft->paid 6, draft->partial 2, draft->issued 2, partial->paid 13, paid->issued 6, paid->partial 3 (445) | same as the review measured |

Probe 7 in detail (one extra read, counts only, no id or name selected): 1 pair of rows, 1 student, one class. The two rows overlap for 7 days, all inside 2025-11. Between the two rows: `rate_override_vnd` same, `allowed_days` same, discount type / value / cadence same. Their `id` order is the opposite of their `created_at` order. That student has 12 bills, 1 of them frozen.

What that means for P1-m1: the new bulk read returns enrollments in `id` order, so for lessons in those 7 days `enrollments.find` may pick the other row of the pair. Both rows carry the same override rate, the same allowed days and the same discount terms, and `enrollmentDiscounts` groups by (class, type, value, cadence), so by reading the charge for 2025-11 comes out the same whichever row is picked. I did not execute that; the brief says stop on a non-zero count, so I stopped. Note also that only calculate-tuition-bulk changes its read order; calculate-tuition (the one that saves bills) keeps its single unordered read.

### Baseline aggregates (invoices, 708 rows, at 2026-11-12 15:45:41 UTC)

- by `status`: issued 557, paid 115, partial 26, draft 10
- by `confirmation_status`: auto_approved 497, confirmed 156, needs_review 55
- sum `recorded_payment` 864,719,903
- sum `total_amount` 884,051,800
- also: sum `base_amount` 950,702,000; sum `discount_amount` 67,174,200; sum `paid_amount` 5,178,349,523 (cumulative column); newest `updated_at` 2026-11-12 07:41:38 UTC

## Steps 2 to 4

Not started. No function deployed, no boot probe sent, no log read.

## Notes for whoever runs step 2

- The Write and Edit tools strip trailing spaces from what is typed into them; `family-payment` (19 lines), `smart-family-payment` (3), `confirm-tuition` (3) and `_lib/rate-limit.ts` (10) have lines ending in spaces. A Bash call keeps them. Whether `deploy_edge_function` keeps them is not known yet: step 3's compare will say. They are whitespace at line ends outside any string, so a loss changes no behaviour, but the compare would then read "identical except trailing whitespace", not "identical".
- Step 3 can be done without re-typing: `get_edge_function` results are in the session transcript, and `extract.mjs` + `cmp.mjs` (session scratchpad, `tools/`) write them out and compare them with the exported blobs.
- Live returns and stores paths as `functions/<name>/index.ts`; the earlier MCP deploys in this project (manage-session, bulk-cancel-sessions, transcribe-lesson-audio) used `<name>/index.ts` + `_lib/<file>.ts`, which is what the manifest asks for.

(End of the first run: stopped at step 1, probe 7 = 1, nothing deployed.)

# RESUMED - source is now `release/tuition-1b` at 93ca410

Conductor's changes to the brief: files from 93ca410; probe 7 = 1 is expected (an overlapping pair is priced by the row created first, in both calculators); re-check live before step 2; trailing whitespace may be normalised in the step 3 compare.

## Re-check before step 2 (2026-11-12 16:54 UTC, read-only)

- 93ca410 against 9804590, under `supabase/functions`: exactly three files differ (`_lib/enrollment-discounts.ts`, `calculate-tuition/index.ts`, `calculate-tuition-bulk/index.ts`); the other ten are byte-identical. The 13 files exported from 93ca410 have 0 CR bytes and their git blob hashes equal `git ls-tree 93ca410`. Imports: unchanged list; the new helper file still imports nothing.
- The new code selects `enrollments.id, created_at`: both columns exist on live (`uuid NOT NULL`, `timestamptz NOT NULL`), 0 rows with a NULL `created_at`.
- Seven functions: still v3, ACTIVE, verify_jwt true, same `ezbr_sha256` as in step 1. Nobody deployed in between.
- Aggregates: identical to step 1 in every figure (708 bills; issued 557 / paid 115 / partial 26 / draft 10; auto_approved 497 / confirmed 156 / needs_review 55; recorded_payment 864,719,903; total_amount 884,051,800; newest `updated_at` still 07:41:38 UTC). Nothing moved.
- Probe 7 = 1 (expected). Probe 4 = 0.
- Audit baseline (CHECK-invoice-status-resets): q4 confirmed-then-reset events 20; q5 paid/partial -> issued by the service role 70; q6 `recorded_payment` lowered by the service role 0; 523 invoice audit rows, the last at 07:41:14 UTC.

## Step 2 / 3 - deploys

How each deploy is checked: `get_edge_function`, then a script (`verify.mjs`) reads the returned files out of the tool result on disk and compares them with the blobs exported from 93ca410 - no re-typing on the checking side. Boot probe, two POSTs with body `{}`: A with no Authorization header (the gateway answers), B with the public client key as apikey + Bearer (passes the gateway, so the function has to boot and answer itself). B is the one that proves the boot.

Uploaded as `<function>/index.ts` + `_lib/<file>.ts`, entrypoint `<function>/index.ts`, verify_jwt true.

| # | function | version | files compared with 93ca410 | probe A | probe B |
|---|---|---|---|---|---|
| 1 | calculate-tuition | 3 -> 4, ACTIVE, verify_jwt true | 7 of 7 identical, byte for byte (index, rate-limit, auth, sibling-state, tuition-session, enrollment-discounts, invoice-status) - trailing spaces survived the upload | 401 gateway | 401 `{"error":"Unauthorized"}` from the function (17:02:59 UTC) |
| 2 | smart-family-payment | 3 -> 4, ACTIVE, verify_jwt true | 3 of 3 identical, byte for byte (index, rate-limit, invoice-status) | 401 gateway | 400 `{"error":"Unauthorized"}` from the function (17:05:27 UTC) - see note |
| 3 | family-payment | 3 -> 4, ACTIVE, verify_jwt true | 3 of 3 identical, byte for byte (index, rate-limit, invoice-status) | 401 gateway | 400 `{"error":"Unauthorized"}` from the function (17:07:52 UTC) - see note |
| 4 | settle-bill | 3 -> 4, ACTIVE, verify_jwt true | 2 of 2 identical, byte for byte (index, invoice-status) | 401 gateway | 401 `{"error":"Unauthorized"}` from the function (17:09:44 UTC) |
| 5 | delete-payment | 3 -> 4, ACTIVE, verify_jwt true | 2 of 2 identical, byte for byte (index, invoice-status) | 401 gateway | 400 `{"error":"Unauthorized"}` from the function (17:11:07 UTC) - see note |
| 6 | confirm-tuition | 3 -> 4, ACTIVE, verify_jwt true | 3 of 3 identical, byte for byte (index, auth, invoice-status) | 401 gateway | 401 `{"error":"Unauthorized"}` from the function (17:12:58 UTC) |
| 7 | calculate-tuition-bulk | 3 -> 4, ACTIVE, verify_jwt true | 6 of 6 identical, byte for byte (index, auth, sibling-state, tuition-session, enrollment-discounts, invoice-status) | 401 gateway | 401 `{"error":"Unauthorized"}` from the function (17:16:02 UTC) |

All seven probed once more together at 17:16:52 UTC: same seven answers. No redeploy was needed for any function and nothing was restored from the v3 copies.

Note on probe B = 400: smart-family-payment, family-payment and delete-payment refuse an unknown caller with `throw new Error('Unauthorized')`, and their own `catch` answers every error with status 400. That is the function's code on main as well as in the release (unchanged lines), so 400 with that body is the booted function refusing the caller, not a boot failure and not a 5xx. The no-header POST (A) is 401 for all.

## Step 4 - after all seven (read-only)

Aggregates at 2026-11-12 17:17:23 UTC against the baseline (15:45 and 16:54):

| figure | before | after |
|---|---|---|
| bills | 708 | 708 |
| sum `recorded_payment` | 864,719,903 | 864,719,903 - UNCHANGED |
| sum `total_amount` | 884,051,800 | 884,051,800 - UNCHANGED |
| sum `base_amount` / `discount_amount` / `paid_amount` | 950,702,000 / 67,174,200 / 5,178,349,523 | the same three |
| `status` | issued 557, paid 115, partial 26, draft 10 | the same |
| `confirmation_status` | auto_approved 497, confirmed 156, needs_review 55 | the same |
| newest `invoices.updated_at` | 07:41:38 UTC | 07:41:38 UTC; 0 bills updated since 16:54 |

Nothing moved: no bill has been recalculated since the deploy (no tuition screen was opened), so no label has changed yet. The 445 label changes the review counted will appear as bills are opened.

Manifest probes:
1. Function list: seven at v4, ACTIVE, verify_jwt true (from each deploy answer and each `get_edge_function`).
2. Boot: table above.
3. Logs: below.
4. `recorded_payment IS NULL`: 0.
5. Status counts: as above; to be read again after screens have been opened.
6. Label transitions stored -> rule: unchanged (issued->paid 349, issued->partial 64, draft->paid 6, draft->partial 2, draft->issued 2, partial->paid 13, paid->issued 6, paid->partial 3). Audit trail: confirmed-then-reset events 20 (was 20); paid/partial -> issued by the service role 70 (was 70); `recorded_payment` lowered by the service role 0 (was 0); 523 invoice audit rows, the last still 07:41:14 UTC.
7. Overlapping enrollments in one class: 1 (expected; priced by the row created first).
8. Not mine: after the push.

Logs, 16:55 to the time of reading (`query_logs`, counts only):
- Requests to the seven: only my own probes (curl), every one answered by version 4: 401 for calculate-tuition, settle-bill, confirm-tuition, calculate-tuition-bulk; 401 (no header) and 400 (public key) for smart-family-payment, family-payment, delete-payment. No 5xx. No request from the app reached any of the seven in the window.
- Runtime events for the seven: Boot and Shutdown (EarlyDrop) only; boot times 38 to 48 ms; no boot error, no worker error.
- Error-level lines from the seven: 6, all mine - the `console.error` of smart-family-payment, family-payment and delete-payment for the two public-key probes each ("Error: Unauthorized"), at the probe times.
- Slowest calculate-tuition-bulk execution: 1,603 ms, a cold-start probe that stopped at the gate. No real bulk call has run yet, so P1-m3 (duration on the first live load) is still to be watched.
- Not one of the seven, noted only: stars-sync (v3, untouched) logged 25 error-level lines over 5 calls that all answered 200.

Second read at 17:27:37 UTC, twelve minutes after the last deploy: logs for the seven unchanged (my 28 probe requests, 14 boots, 14 shutdowns, the same 6 error lines; no 5xx, no boot error, still no request from the app). Aggregates identical again: 708 bills, same status and confirmation counts, recorded_payment 864,719,903, total_amount 884,051,800, newest `updated_at` 07:41:38 UTC, `recorded_payment` lowered by the service role 0.

Not checked, because nothing has exercised it yet: a signed-in call to any of the seven (the probes stop at the gate), so the new code paths past authentication have booted but not run on live; the duration of a real calculate-tuition-bulk load; the label changes as bills are opened. Rollback source remains at `C:\Users\Dell\hec-tools\tuition-rollback\<function>\v3\`.

**Where I am / next step:** DONE. LIVE AND VERIFIED - ready for the push to main (the conductor's step; nothing pushed from here).
