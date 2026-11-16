# D4 step 2 (dated class fees) - independent review

Independent reviewer. Reviewed branch `worktree-agent-a36ad2752b190053b` at d3cd451f (checked out here as `review-2`). The step-2 work is `b27bbf06..deaee11c` (19 files); `948ed67c` merges the conductor tip (test-date fix 02b571e6, PC2-harvest), which touches no step-2 file; `d3cd451f` edits only the build notes. pglite only: nothing applied, deployed or pushed; the live database was not looked at.

**Where I am / next step:** COMPLETE. Next step is not mine: the builder makes the three blocker changes (S-1, S-2, T-1), the conductor puts OQ-1 to the owner. The migration and the functions need no change to be applied.

## Verdict: APPLY WITH CHANGES

The database file and the three readers are right and fail closed; I could not get a fee row, or `classes.session_rate_vnd`, changed past the checked path by any caller I could reach, and the golden gate is real. Three blockers: two in the SCREENS and one in the TESTS (the migration and the functions can go as they are):

| # | Change | Kind |
|---|---|---|
| S-1 | `ClassSettings.tsx` was re-encoded: three strings are mojibake (`â€”`, `ðŸ¦`) | **blocker** (screens) |
| S-2 | The Fee history screen saves at tier 0 with no dialog, and its notes are worked out from the browser's calendar, not from the plan: it says "Nothing already billed changes" / "You will be asked why" when neither is true | **blocker** (screens) |
| F-1 | `isMissingFeeHistory` takes any "class_fee_history ... does not exist / schema cache" message for "no table" (a column error prices at the mirror) | nice-to-have (before or with deploy) |
| F-2 | Rollback 3 header: say that with the step-2 calculators deployed the mirror prices nothing | nice-to-have |
| F-3 | Policy `class_fee_history_staff_read` tests `has_role(.., 'teacher')` | nice-to-have |
| F-4 | Mirror guard is `UPDATE OF session_rate_vnd`: a future BEFORE trigger rewriting the fee would not be judged | nice-to-have |
| T-1 | Mutants V01 (reach tier over the first month only) and V02 (Absent not reached) survive `d4-class-fee`: add my P2 / P3 cases | **blocker** (tests only) |
| F-5 | V03 / V04 survive too: add P7 / P8 | nice-to-have |
| OQ-1 | A fee row reaching a PAID bill of the current month (or of last month during the first 7 days) is T0: re-priced with no reason | owner question |

Monthly re-level of the mirror: **not needed before go-live** (section 4).

## Findings

### S-1 (blocker, screens) ClassSettings.tsx is mojibake in three places

`src/components/admin/class/ClassSettings.tsx` at d3cd451f, lines 222, 261 and 328: `placeholder="e.g. Class A1 â€” Morning"`, `` `Each day is checked against its own slot â€” this class runs ...` `` and `<h3 ...>ðŸ¦ Classroom Economy</h3>`. At b27bbf06 these were `—`, `—` and `🏦`. Bytes (`git show d3cd451f:... | od -c`): `303 242 342 202 254 342 200 235` = UTF-8 of "â€”" - the em dash was read as Windows-1252 and written back as UTF-8. Visible on every class's settings page. No other step-2 file has it (searched `â€|ðŸ|Ã©|Ã¡` over every file of the step: 3 hits, all here).
Fix: restore those three lines byte for byte from b27bbf06 (`git show b27bbf06:src/components/admin/class/ClassSettings.tsx`), keep the fee changes; add a byte check (no `\xC3\xA2\xE2\x82\xAC`) to the screen section of `d4-class-fee`.

### S-2 (blocker, screens) The T0 path says things that are not true, then saves with no confirmation

`ClassFeeHistory.tsx:103-118`: when the preview is T0 the change is confirmed at once - no dialog, no "are you sure". The note under the button (`:198-202`, `classFee.ts:38, 80-84`) is chosen from the BROWSER's calendar month, not from the plan:
- **"Nothing already billed changes"** (futureNote) is shown for any later month. Probe P4: next month already has a bill (issued and paid in advance) -> the server answers T0 with that bill in `invoices_before` and `refresh_pairs`; the screen saves at once and the refresh re-prices the paid bill. Output: `PASS server: T0 (not a past month), the pre-issued paid bill is in invoices_before and refresh_pairs` / `NOTE the screen confirms this at once with no dialog and says "Nothing already billed changes"`.
- **"... is in the past: ... You will be asked why"** (pastWarning) is shown for any earlier calendar month. The server's "past" is `_money_month_is_past` (before the month of now - 7 days, 1b `:217-220`), so during the first 7 days of a month LAST month is current: T0 for an issued or paid bill, saved at once with no reason, and its paid bills re-priced. (Read from the code; pglite cannot move `now()`.)
- **Remove** at T0 is one click: removing the current month's row re-prices this month's bills with no confirmation.
The prices that result are the right ones (the history says so); what is wrong is that the admin is told otherwise on a money screen and gets no chance to stop.
Fix (small, all in the screen): open `MoneyGuardDialog` whenever the plan's `invoices_before` or `refresh_pairs` is non-empty, also at T0 (the dialog already lists the bills; at T0 it asks for no reason), and for every Remove; take the note from the plan (`refresh_pairs.length`, `tier`), not from `isPastMonth` / the browser date. Add a test in the screen section: a T0 plan with `invoices_before` opens the dialog.

### F-1 (nice-to-have) The "no table" test also matches other errors

`supabase/functions/_lib/class-fee.ts:67-73`: after the code test, any message that names `class_fee_history` and says "does not exist" or "schema cache" counts as "no table", and every lesson is then priced at the mirror. Probe (esbuild, the real module):
```
42703 column error -> true      ("column class_fee_history.session_rate_vnd does not exist")
PGRST200 relationship -> true   ("Could not find a relationship between 'class_fee_history' and 'classes' in the schema cache")
```
Needs schema drift to happen, and today's readers select no embedded relation, so low; but it is the one fail-open in a money reader. Fix: `return code === '42P01' || code === 'PGRST205'` (PostgREST always sends the code), or match only `relation "public.class_fee_history" does not exist` / `Could not find the table 'public.class_fee_history'`; one case in `_lib/class-fee.ts` unit tests.

### F-2 (nice-to-have) Rollback 3 does not say what the fee is after it

`scripts/ROLLBACK-d4-3-class-fee.sql` header. After the script, with the step-2 calculators still deployed (the script says redeploy them only if the resolver is at fault), bills are priced from `class_fee_history`, not from `classes.session_rate_vnd`. So an owner who "changes the fee in the SQL editor" by updating `classes`, or an old ClassSettings put back without the old calculators, changes NO bill - silently. Add: "With the step-2 functions deployed the fee is the history: change it by inserting a `class_fee_history` row. Putting the old class screen back requires putting the old calculators back in the same sitting."

### F-3 (nice-to-have) Teachers read every class's fee history

`20261114092000:173-175`: `has_role(.., 'teacher')`, which root AGENTS.md (S1) names as the pattern to avoid. No leak in practice: `classes` is readable by everyone ("Everyone can view active classes", `20251012020423:64-66`), and the history is not children's data. But no reader needs it (the screen is admin-only; the calculators use the service key), so admin-only keeps the rule clean. Decision 5.

### F-4 (nice-to-have) The mirror guard's column list

`20261114092000:387`: `BEFORE UPDATE OF session_rate_vnd`. Postgres fires a column trigger only when the column is in the statement's SET list, so a BEFORE trigger that rewrites `NEW.session_rate_vnd` during another update is not judged. Probe P11 (a hypothetical `aa_probe_fee` BEFORE trigger setting the fee to 1 when a class is renamed, run as the service role): `NOTE ... not judged by zz_class_fee_mirror_guard (column list) -- {"v":1}` - the fee changed, no HC120. None exists today (the triggers on `classes` are `update_classes_updated_at`, `enforce_class_update_column_scope` and this file's two). Fix: drop `OF session_rate_vnd`; the `WHEN (OLD.session_rate_vnd IS DISTINCT FROM NEW.session_rate_vnd)` clause already limits it, and a BEFORE trigger's WHEN sees what earlier triggers did.

### T-1 / F-5 Pinning gaps - see section 9.

### OQ-1 (owner question) A fee change that reaches money already paid, with no reason

Probe P5: a row from THIS month, a paid bill this month, not confirmed -> T0 (design b.0: "the current month is T0 even when paid"); the change is saved with no reason and the paid bill re-priced. Same for last month during the first 7 days (S-2). The R-8 reason for T0 (the daily register must not ask) does not apply to a fee, which changes a few times a year. Question for the owner: "Should a class-fee change that reaches a bill with money on it (paid or part-paid, any month) ask for a reason?" If yes: `_class_fee_reach` raises its tier to at least 1 when any reached pair's state is `paid` (one line, plus a case). Until then the screen fix in S-2 at least shows the bills before saving.

## 1. Fail closed

Every path I could make fail refuses or writes nothing:
- Reach / tier: `COALESCE(tier, 3)` in the trigger and the plan; `tuition_month_state` is 1b's (any error -> 3, reviewed). The trigger re-judges every row at write time; an ack stored at a lower tier -> HC011 (A-8, tested).
- No helper: preflight refuses (missing 1a/1b objects, the seven 1b bodies by CR-stripped md5, the `class_fee` entity and `owner_lane` kind, a negative fee); nothing installed (tested). The dispatcher raises HC015 `not_installed` if file 3's pair is missing.
- A guard disabled: `_money_exec__class_fee` refuses when the mirror's guard is not `O`; `_money_change_apply` refuses when the history's guard is not `O` (HC050, nothing written, tested both).
- Unexpected callers: teacher, parent, service role on preview / checked -> 42501; raw writes: admin / teacher 42501 (no grant), service role HC120 at every tier, a trigger-made write at depth 2 (insert or, probe P8, delete) HC120; an unknown lane is not the owner.
- Readers: a missing table -> the mirror, exactly as before (tested both codes); any other error throws (tested), except F-1.

## 2. Bypasses, attacked (all run in pglite on the real files)

| Who / what | Attempt | Result |
|---|---|---|
| admin | raw INSERT / UPDATE / DELETE on `class_fee_history` | 42501 (builder) |
| admin | `UPDATE classes SET session_rate_vnd = 999` | HC120 (builder) |
| admin | set the mirror to today's history fee | passes, prices nothing (builder) |
| teacher | `UPDATE classes SET session_rate_vnd` | refused (probe P9) |
| family / student / anon | read history | 0 rows / no grant (builder: parent 0) |
| service role | raw write at T0, at T2, delete | HC120 (builder) |
| service role | `admin-data-import` shape: `INSERT ... ON CONFLICT (id) DO UPDATE SET session_rate_vnd` with another fee | HC120; same fee passes; a NEW class gets its 1900 row at the imported fee (probe P1) |
| service role | mirror to NULL | refused (P1) |
| another trigger (depth 2) | INSERT a dated row; a second "baseline"; DELETE a dated row of a live class | HC120 / 23505 / HC120 (builder, P8) |
| forged ack | random flag; ack of another class / fee / month / op; replay of an earlier tx | HC120 (builder) |
| ack of an EARLIER month used for a later month (same tx) | | HC120 (P7) - only because the trigger also compares `effective_from`; `_money_ack` alone would accept it (p_to NULL) - see V03 |
| owner (SQL editor, pg_cron) | any write | passes; `owner_lane` event when tier > 0; identity, baseline row and TRUNCATE refused even for the owner (builder) |
| `ai_action_apply` / `ai_action_undo` (`docs/sql/ai_action_apply_undo.installed.sql`) | | reads `classes.name` only (`:283`); writes no class and no history - nothing to bind |
| Stars sync (`stars_sync__*`) | | writes no `classes` / history row (no `UPDATE/INSERT ... classes` in any migration but this file) |
| `manage-demo-student` | inserts a class at fee 0 | baseline 0 through the depth-2 exemption (builder: class creation unguarded) |
| delete + re-create a class at another fee | | `sessions.class_id ... ON DELETE RESTRICT` (`20251012020423:21`): a class with lessons cannot be deleted, so there is nothing to re-price |
| re-price the past by a 1900 row | `set` on `1900-01-01` | allowed only through the checked path, T3 when the past is confirmed, every month since the start in reach (P6) - decision 7 |
| re-price the past without the history | `classes.session_rate_vnd` | priced by nobody while a class has a history row; every class has one (baseline insert + `class_fee_baseline`; the 1900 row cannot be deleted; TRUNCATE refused; cascade only with the class) |

I found no bypass. The one place the guard is a column list rather than the value is F-4.

## 3. The golden gate

`fixtures/tuition-figures.golden.json` and `scripts/pgtest/invoice-status.test.mjs`: unchanged (`git diff b27bbf06 d3cd451f` empty for both). The preload hook (`d4-class-fee-golden-hook.mjs`) wraps the suite's own stand-in only for `class_fee_history`. It is not vacuous: (a) it counts reads (332 missing / 664 baseline / 664 future - two reads a call in the baseline modes is the paging: rows, then an empty page); (b) the negative control (a row from 2026-10-01 at fee + 30,000) makes the plain month's response AND saved figures FAIL, while the frozen bill and the month with no lessons PASS. My run of `d4-class-fee` on this tree: **155 passed, 0 failed**, all four golden states as the builder reports.

My own cases, end to end (probe P10: the rows the checked path wrote in pglite, fed to BOTH bundled calculators, four months past2 / past / this / next):
```
PASS baseline only: every month 100000
PASS a row from next month: past2, past and THIS month unchanged; next month 130000 (both calculators)
PASS a past-dated row: raw service write HC120, checked without a reason HC010, nothing written
PASS acknowledged: past2 still 100000; past and this month 110000; next month 130000 (only the reached months moved)
PASS baseline corrected to 90000 with past2 frozen: past2 stays at its saved 100000 (calculate-tuition)
```
Also P2 (a correction spanning a paid month and a confirmed later month takes T3 and refreshes both months) and P3 (an Absent-only child is reached: T2).

## 4. Every place that prices a lesson

`grep session_rate_vnd` over `supabase/functions`, `src`, migrations and `docs/sql`:

| Reader | Uses | Feeds money? |
|---|---|---|
| `calculate-tuition` `:286`, `:595` | `classFeeOn` | yes - dated |
| `calculate-tuition` `:348` | mirror via `classes?.[0]` (always 0) | display fields of the Rate Adjustment line only; the amount is dated (decision 4) |
| `calculate-tuition-bulk` `:337`, `:453` | `classFeeOn` | yes - dated |
| `_lib/projected-per-class.ts` `:66-68` (-> `watch-sibling-threshold`, which posts the retro sibling credit) | `classFeeOn` | yes - dated |
| `v_projected_base` (`20251015032433`) | mirror | no: used only as "has lessons" gate in projected-per-class; `_lib/projected.ts` has no importer |
| `schedule-sessions:220` | selected, never used | no |
| `useFinanceOverview:262-269`, `useFinanceSummary:72-80` ("excused loss"), `OperationalReports:109,149` ("lost tuition") | mirror | no bill, payment or payroll; admin-facing estimates. Already wrong for past months before step 2 whenever a fee changed; after step 2 also stale between a month turn and the next re-level |
| `AddSessionModal`, `ModifyEnrollmentModal`, `EnrollmentRateEditor` ("Default rate"), `ClassesList`, `ClassesTab`, `TeacherProfileClasses`, `StudentOverviewTab` (admin page) | mirror | display |
| `StudentTuitionTab:409` | invoice `class_breakdown` | calculator's dated figure |
| chat, MCP tools, `ai_action_preview`, `explain-family-tuition`, payroll | - | no reader of the class fee (grep) |

Money impact of the stale mirror: none - no reader of it feeds a bill, a payment, payroll or the sibling credit. **A monthly re-level is not needed before go-live.** Recommended later (display truth): a job on the 1st, `UPDATE classes c SET session_rate_vnd = class_fee_on(c.id, today) WHERE ... IS DISTINCT FROM ...` - the mirror guard passes it from any lane (decision 3). The rollback already re-levels before it drops the guards.

## 5. Nothing existing weakened

- Existing tests edited by step 2: **none**. Harness files changed: `run.mjs` (one suite added), `d4-prelude.mjs` (one export added), `guard-fingerprint.mjs` (file 3 and rollback 3 appended to its lists; `D4_CLASS_FEE` applied in `checkUnchanged` - adds a column to the stand-in `classes`, changes no fingerprinted body), `d4-mutants.mjs` (a suite and K01-K32; the SQL branch generalised from CORE to CORE|FEE without changing CORE's behaviour). The release fingerprint JSON diff is additions only (no `-` line). The two edited old tests on the branch (`session-cancel-guard`, `d4-d2-carryover`, 12 lines each) come from the conductor's 02b571e6 (a fixture date: the locked-payroll month moved from 45 to 150 days ahead), merged in, not step 2; no assertion's meaning changed.
- D2 guard, 1a floors, 1b register: file 3 replaces no function and no trigger (tested: every existing function md5 / secdef / config / grant and every trigger def identical; the dispatcher not re-created).
- Frozen bills: the calculators' freeze path is untouched; frozen bills report their saved figures under any history (builder + P10).
- Payment-month confirmation, sibling hold, compare-and-set on `recorded_payment`: no file of those touched; calculate-tuition still writes no `recorded_payment`.

## 6. Apply-ability on live

Preflight md5 of seven 1a/1b bodies, CR stripped (as the 1b review required) - accepted here because they equal the repo's 1b; that they equal LIVE I could not check (no live access): the brief should compare `md5(replace(prosrc, E'\r',''))` of those seven on live before pasting. `SET LOCAL lock_timeout = '5s'` right after BEGIN. Baseline insert from today's `classes.session_rate_vnd`, `WHERE NOT EXISTS ... ON CONFLICT (class_id, effective_from) DO NOTHING` on a plain UNIQUE constraint; second paste is a no-op (tested). Explicit GRANTs: table RLS on, authenticated SELECT, service_role ALL; eight functions revoked from everyone. No partial unique index. Live `classes.session_rate_vnd` is `NOT NULL DEFAULT 210000`, so the `COALESCE(.., 0)` never fires there. Rollback 3: brings the mirror level, drops the two guards, leaves the table, rows, baseline / no-truncate / audit triggers; checked path HC050; migration re-pastes (tested) - plus F-2's wording.

Operational note for the owner (decision 14): until step 3B strips the column, an Admin Data Import whose class rows carry a changed fee fails the whole `classes` upsert (HC120), reported per table in the import result.

## 7. Functions

`git diff b27bbf06 deaee11c -- supabase/functions`: calculate-tuition 13 lines (import, the history in Wave 2's `Promise.all`, two pricing lines), bulk 18 lines (import, history via its paged `fetchChunked`, two pricing lines), projected-per-class 12 lines (import, one read, `select('id, date')`, the per-lesson sum). Nothing else changed. Missing table -> mirror (tested both codes, both calculators and projected). `watch-sibling-threshold` is unchanged but must be redeployed to bundle the new `_lib` (builder lists it). Edge-function typecheck: 5/0.

## 8. Screen

No fee or tuition computed in the browser (tested by the builder's static check; I read both files: `parseFee` parses input, nothing multiplies a fee). Wording: S-2. Also: `<input type="month">` lets an admin type year 1900, which sends a `set` of the baseline row (decision 7) - give the input `min` = the class's first month, or word the baseline as a correction.

## 9. Mutants

Builder: K01-K32 all caught (their table). I re-ran a sample through their runner and added V01-V05 to `scripts/pgtest/d4-mutants.mjs` (my branch); `scripts/pgtest/review/d4-2-probe-mutants.mjs` runs my probe against the same V mutants. `git status` clean after the function mutants (restored byte for byte).

| Mutant | Breaks | `d4-class-fee` | my probe |
|---|---|---|---|
| K05 | raw T0 write by the service role passes | CAUGHT | - |
| K07 | ack does not check the fee | CAUGHT | - |
| K09 | ack's tier not compared (A-8) | CAUGHT | - |
| K18 | any trigger-made write passes | CAUGHT | - |
| K26 | calculate-tuition at the mirror | CAUGHT | - |
| K30 | any read error taken for "no table" | CAUGHT | - |
| **V01** | reach tier over the FIRST reached month only | **SURVIVED** | CAUGHT (P2: tier 2 instead of 3, the confirmed later month not refreshed) |
| **V02** | an Absent mark not counted as reached | **SURVIVED** | CAUGHT (P3: tier 0 instead of 2 - a paid past month re-priced with no reason) |
| V03 | the trigger does not compare the acknowledged month | SURVIVED | CAUGHT (P7) |
| V04 | any trigger-made DELETE passes | SURVIVED | CAUGHT (P8) |
| V05 | the trigger's tier fails open on NULL | SURVIVED | SURVIVED - equivalent (`_class_fee_reach` always returns a tier or raises) |

The code is right in all five; the suite does not hold it. V01 and V02 would let a later edit silently UNDER-tier a correction of paid / confirmed months, which is the thing this step exists to prevent, so **adding P2 and P3 as cases to `d4-class-fee` is a required change (tests only, blocker for the merge)**; P7 and P8 (V03, V04) nice-to-have. All four cases are in `scripts/pgtest/review/d4-2-probe.mjs`, ready to copy.

## 10. The 15 open decisions (the notes list 15)

| # | Decision | Ruling |
|---|---|---|
| 1 | Raw writes refused at every tier, not "T0 passes" | **Accept**: every fee row gets its override row; no legitimate raw writer exists. |
| 2 | Mirror guard judges the value (= history today), not the caller | **Accept**: it prices nothing; lets anyone re-level. Plus F-4. |
| 3 | Mirror stale at a month turn; no re-level built | **Accept**; re-level not needed for money; add a 1st-of-month job later for display (section 4). |
| 4 | calculate-tuition `:348` display fields left | **Accept**: pre-existing, display only, would move the golden. Own task. |
| 5 | Admins and teachers read; authenticated SELECT only | SELECT-only **accept**; teacher read **change (nice-to-have)**: admin only (F-3). |
| 6 | Extra guards (identity, baseline, TRUNCATE, narrow depth exemption, audit trigger) | **Accept**. |
| 7 | `set` of the 1900 row allowed through the checked path | **Accept** (P6: T3 in practice); the screen should not let a month input reach it by accident (section 8). |
| 8 | `nothing_to_change` for a row equal to the fee in force | **Accept**. |
| 9 | A note-only change is T0 | **Accept**. |
| 10 | The screen saves at T0 without a dialog | **Change - blocker** (S-2): dialog whenever bills are reached or on Remove; notes from the plan. |
| 11 | `MoneyGuardDialog` three optional props | **Accept**: additive, defaults as before. |
| 12 | class-fee HC015 codes not in `_lib/session-guard.ts` | **Accept**: no function calls this op; the screen words them. |
| 13 | `d4_guard_status()` does not list the two guards | **Accept**; step 4/5 extends the card. |
| 14 | `admin-data-import` refused on a changed fee | **Accept**; tell the owner (section 6). |
| 15 | One advisory lock for every fee change of the school | **Accept**: fee changes are rare. |

## 11. Files the parallel work will also touch

- **Removal of voluntary contributions / Settle Bill** (payment functions and screens): if it removes the `settledWriteOff` / `WRITE_OFF_KEY_PREFIX` write-off line, it edits `calculate-tuition/index.ts` and `calculate-tuition-bulk/index.ts` (in bulk the `invoice-status.ts` import sits on the line next to this branch's new import - a textual conflict) and probably `scripts/pgtest/invoice-status.test.mjs` / the golden file. Then `d4-class-fee.test.mjs` must be updated with it: its gate hard-codes `goldenLines.length === 36`, `passed >= 268` and the fixture names "plain month", "frozen bill", "no lessons in the month". Also `run.mjs`, root `AGENTS.md`.
- **D4 step 3A** (sessions): `scripts/pgtest/run.mjs`, `d4-mutants.mjs` (SUITES, MUTANTS, the CORE|FEE branch), `d4-prelude.mjs`, `guard-fingerprint.mjs` (`D4_FILES`, rollback list), `docs/evidence/D4-release-fingerprint.sql` / `.expected.json` (regenerate after the merge; both steps add entries). 3A's `AddSessionModal.tsx` shows the mirror as the default rate (with a hard-coded '210,000' fallback) - display only, but 3A is the natural place to read the dated fee there. The AGENTS.md line "the class fee is read with `classFeeOn`, never from `classes.session_rate_vnd`" (design (h)) is not added yet; the conductor adds it at merge.

## 12. Runs (mine, on d3cd451f plus my review files)

- `node scripts/pgtest/run.mjs` (once): **0 suites failed**, 63 suites; the summary line says 6193 assertions because `stars sync core` ends its output with an expected logged stack trace, so its count is not parsed; run alone it is 75 passed, 0 failed -> **6268**, the builder's figure. `d4 class fee` 155/0, `invoice status` 268/0, `d4 rollback` 26/0 (fingerprints with file 3 and rollback 3), `edge functions typecheck` 5/0, `app typecheck` 3/0 (`tsc -p tsconfig.app.json`, source loaded).
- `d4-class-fee` alone: 155 passed, 0 failed (golden gate in all four states as reported).
- My probe `scripts/pgtest/review/d4-2-probe.mjs`: 18 passed, 0 failed, 4 notes (S-2 x2, the stale mirror, F-4).
- Mutants: 6 of the builder's re-run, all caught; V01-V05 all survive the suite, 4 caught by the probe (section 9).
- Not run: `npm run test:bun` (no step-2 file in it; builder 159/0).

## 13. Could not check

The live database (that live 1b equals the preflight's md5s; live triggers on `classes`; whether any pg_cron job writes `classes`). The first-week rule of S-2 by execution (pglite cannot move `now()`; read from `_money_month_is_past`). The screens rendered (read and type-checked only). Concurrency (single-connection pglite). The deployed functions (bundled and driven over a stand-in only).
