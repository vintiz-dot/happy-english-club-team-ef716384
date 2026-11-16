# D4 build - step 3B (money inputs)

**DONE - waiting for the conductor's review**

**Where I am / next step:** COMPLETE - built, tested, mutants run (57 of 57 caught), full run green (6658 assertions, 66 suites, 0 failed). Pushed. Next step is not mine: the conductor's review.

Builder on PC2, branch `pc2/d4-3b` from origin/conductor/work 02b571e6 (steps 1a and 1b in it, both live). Nothing applied to any database, nothing deployed, no Supabase / Lovable / Cloudflare tool used; every test runs against the in-process Postgres of `scripts/pgtest`. No real user data.

Spec: `docs/evidence/D4-design.md` revision 2 - b.0, b.4 (G-13 to G-21), b.5, b.8, c.0, c.5, (d) "Step 3B", f.2-f.7, (h) row 3B.

## What was built

| File | What |
|---|---|
| `supabase/migrations/20261114094000_d4_money_inputs_guard.sql` | Nine guard triggers on twelve tables, `audit_families`, the RPC `change_enrollment_terms`, and the plan / exec pairs of `enrollment`, `discount_assignment`, `referral_bonus`, `pay_rate`, `invoice_freeze`, `family_link` (reached through step 1b's `money_change_preview` / `money_change_checked`; the dispatcher is NOT re-created). One `BEGIN ... COMMIT`, `SET LOCAL lock_timeout = '5s'`, a preflight that refuses loudly (missing objects, or a 1a / 1b body that is not the reviewed one, CR-stripped md5), safe to paste twice, no table created or altered, no existing row written, `NOTIFY pgrst`, a result set of the trigger names. Replaces ONE step 1b body (below). |
| `scripts/ROLLBACK-d4-5-money-inputs.sql` | Drops the nine guard triggers (twelve `DROP TRIGGER IF EXISTS`) and nothing else. States the required second step. |
| `supabase/functions/update-enrollment-rate/index.ts` | The admin's own JWT only (a service-key caller is refused). `effectiveDate` -> `('enrollment','set_terms_from')` (the past keeps its rate; T0 from this month); none -> `('enrollment','set_rate')`. `preview: true` reads only. T1+ without `ack` -> 409 `money_requires_checked_path` with the preview, nothing written. The service key only resolves the caller and runs calculate-tuition over the override's refresh pairs. |
| `supabase/functions/create-family/index.ts` | Every enrolment is previewed as the caller (`enroll_new`) BEFORE anything is created. All T0: family, children and enrolments are created, all on the caller's client, each enrolment through `money_change_checked`. Any T1+ without `ack {reason, confirm, token}` -> 409 `preview_required`, nothing created. A missing guard -> 503, nothing created. |
| `supabase/functions/manage-demo-student/index.ts` | Still on the service lane, nothing exempted. A refused enrolment write (HC120 / HC121) is no longer ignored: the demo account is locked again, `demo_access.enabled = false`, 409 `demo_reset_needs_owner`. |
| `supabase/functions/admin-data-import/index.ts` | `enrollments`, `sessions`, `attendance`, `discount_definitions`, `discount_assignments` are not importable (a dry run still counts them and names them); `session_rate_vnd` is dropped from class rows. The screen's dry-run box now travels in the body. |
| `src/lib/moneyInputs.ts` (new) | Entity and op wording, the change lines, every refusal's sentence with its next step. Pure. |
| `src/components/admin/money-guard/useMoneyInput.ts`, `MoneyInputDialog.tsx` (new) | On top of `useMoneyChange` (unchanged): `run()` previews, confirms a tier-0 change at once (one row still written), opens the dialog for tier 1+; `runMany()` sends the tier-0 items in bulk (50 a call) and opens a dialog for each of the others. The dialog reuses `Fields.tsx` and `ReachTable.tsx` unchanged. `MoneyGuardDialog.tsx`, `useMoneyChange.ts`, `api.ts`, `moneyGuard.ts` are NOT edited. |
| screens | `BulkEnrollmentDateSetter`, `class/ClassEnrollments`, `ModifyEnrollmentModal` ("from a date" first; the whole-enrolment rate is a second button), `discount/EditEnrollmentDiscountModal` (same), `EnrollmentRateEditor` (same; the in-place weekday write is gone), `EnrollStudentDialog`, `StudentForm`, `EnrollmentRequestsManager`, `FamilyForm` (Create Family), `StudentsList` (deactivate), `discount/AssignDiscountModal`, `discount/StudentDiscountsTab`, `discount/EditDiscountModal`, `DiscountManager`, `staff/PayRateHistory`, `student/BillFreezePanel` (unfreeze), `SiblingDiscountCompute`, `pages/FamilyDetail`, `FamilyMembersManager`, `tabs/DataTab`, `src/lib/aiActions.ts` (wording). Logic only: no class name of the design rollout was changed. |
| screens the design did not list | `EnrollmentManager` (Classes page: a raw enrolment insert and a raw end) and `StudentEditDrawer` (a raw `family_id` update) wrote guarded columns; both moved. `TeacherEditDrawer` and `ta/TAProfileDrawer` needed NO change: they no longer write the rate (the design's line numbers were of an older file); the rate is written only by `PayRateHistory`, which they embed. |
| tests | `scripts/pgtest/d4-inputs-prelude.mjs` (adds to `d4-prelude.mjs`, edits nothing), `d4-money-inputs.test.mjs`, `d4-functions-inputs.test.mjs`, `d4-reach-oracle.test.mjs`, `money-inputs-lib.test.mjs`, `d4-mutants-3b.mjs`; four entries added to `run.mjs` (only mine). |

## The rule of every trigger of this file

1. Work out the reach of the write. Enrolments, discounts and bonuses: `_money_span` (INSERT / DELETE: the row's span; a date-only UPDATE: the days entering or leaving; any other pricing column: the whole span of both versions). Pay rates: the row's date to the day before the person's next row. Mirror columns: the dates before the person's earliest history row. Family fields: every child of the old and the new family, from the moved child's earliest enrolment, open-ended.
2. Tier from stored facts: `_money_tuition_reach` -> step 1b's `tuition_reach` (widened to the family, R-8a), or `_money_pay_reach` -> step 1b's `payroll_reach`. An error or NULL is tier 3.
3. Tier 0 -> pass (any lane). Otherwise an acknowledgement of THIS transaction (`_money_input_ack`: the flag names an override row of this txid and entity; step 1b's `_money_ack` checks child, window and tier - lower stored tier -> HC011) AND the write is the one acknowledged (per-trigger: class, op, columns, row or person). Otherwise the owner lane passes with one `owner_lane` event. Otherwise HC120 (`entity=..; tier=..; <next step>`): admins, any other person, and the service role alike.
4. HC121 (no checked path, every lane, owner included): an enrolment's child or class changed, a discount's child changed, a definition in use changed / deleted, a student with history deleted, a class with enrolments deleted.

## Guards, and the test and mutant that prove each

Suite `d4-money-inputs` unless said. "raw" = the write a screen used to make, as an admin.

| Guard | Refuses | Proved by (assertion, abbreviated) | Mutant |
|---|---|---|---|
| G-13 `enrollments.zz_enrollment_money_guard` | start date moved over a paid past month (P13); rate, discount, weekdays in place (P14); backdated end, delete, backdated insert of a new child (P15) | "P13 start date moved ... HC120 tier=2", "P14 rate typed in place", "P14 30%", "P14 weekdays", "P15 ended two months back", "P15 deleted raw", "P15 a NEW child enrolled from a past month ... tier=1"; T0 cases pass untouched (six assertions) | S01, S07, S09, S39, S43 |
| G-13 identity | `student_id` / `class_id` changed, every lane | "student_id changed, admin / service / owner lane: HC121 enrollment_identity", "class_id changed" | S04 |
| G-13 service / owner lanes | service refused at T1+; owner passes with an event | "service lane is refused ...", "owner lane (SQL editor): passes, and ONE owner_lane event" | S02, S03 |
| G-13 acknowledgement | another class, child, kind of change, window, transaction, entity; a lower stored tier (A-8); a transfer does not cover a third enrolment | section "the acknowledgement covers one change, exactly" (13 assertions) | S10, S11, S12 |
| G-13 dated RPCs | `end_enrollment`, `modify_enrollment_transfer`, `change_enrollment_days` direct and backdated: HC120; the checked `end` / `transfer` / `set_days` do them (two rows and moved marks under one acknowledgement); from today the RPCs still work directly | section "end / transfer / pause / set_days go through the live dated RPCs" | S30 |
| G-13 pause | a DIRECT `pause_enrollment` over a paid past month is now HC025 (register guard); the checked `pause` does it; A-6 in the plan | "pause_enrollment called directly ... HC025", "checked pause", "A-6 in the plan" | S28, S34 |
| G-13 deactivation (b.5) | a raw deactivate with this month's bill confirmed: HC120 (the trigger-made enrolment end is judged); `end_all`, then deactivate | section "deactivating a child" | S01 |
| G-14 `change_enrollment_terms` | non-admins (42501), the service role (no grant), a non-term column, half a discount (22023); backdated direct call HC120; from today T0, split, past row keeps its rate | section "G-14" | S31, S32, S33 |
| G-15 `zz_discount_money_guard` (assignments, bonuses) | assign from the past, end / remove in the past, a bonus value; the child of a row changed: HC121 `discount_identity` on three lanes; a discount dated the 1st of next month reaches this month's confirmed bill | section "G-15 discount assignments and referral bonuses" | S05, S08, S40 |
| G-15 `zz_discount_definition_guard` | value / type / `is_active` changed or the row deleted while an assignment reaches T1+: HC121 `definition_in_use`, every lane; a name passes; a definition assigned only from this month may change | section "G-15 discount definitions" | S13, S14, S15 |
| G-17 `zz_pay_rate_money_guard` | a backdated rate for someone with Held lessons (T1), into a closed month (T3, reviewed), a re-dated row, the baseline edited, a backdated delete; the service lane; another person's acknowledgement | section "G-17 pay rates" | S17, S19, S44 |
| G-17 `zz_staff_pay_mirror_guard` | a raw rate on the staff row of someone with taught lessons and no dated rate; with a baseline row it is T0; a name is never judged | section "G-17 the mirror columns" | S16, S18 |
| G-18 `zz_invoice_unfreeze_guard` | a raw unfreeze by an admin: HC120 T2, T3 when paid / confirmed (now or ever - the bill floor); another bill's acknowledgement | section "G-18" | S20, S21, S22 |
| G-19 `zz_family_link_guard` | moving / un-linking a child with paid past months, the sibling hold, the family percentage, deleting the family (SET NULL); the NEW family's children are in reach; linking a child with no enrolment is free | section "G-19" | S06, S23, S24, S42, S45 |
| G-21 `zz_student_delete_guard`, `zz_class_delete_guard` | a student with a payment (three lanes), with only a person's mark, with a paid bill (also after the payment was reset: the floor), a class with an enrolment (two lanes) | section "G-21" | S25, S26, S27 |
| step 1b helper | an enrolment acknowledgement that is not end / transfer / pause opens nothing on the register; one that is passes only the rows those RPCs write; a comment naming an RPC forges nothing; `stars_sync_resolve_conflict` exactly as before | section "step 1b's register guard, with file 5 over it" | S29, S30 |
| checked path | HC010 / HC011 / HC012 / HC013, a bill written between preview and confirm, T0 still one row, review of T3 and of T2-in-bulk, HC016, HC017, HC050 with the trigger disabled, teacher / parent / service role 42501, append-only row | sections "the checked path", "bulk and HC050" | S12, S35, S36, S37 |
| preflight / install | refuses without file 2, or over a body that is not the reviewed one; CRLF paste accepted; second paste a no-op; exactly one existing function body differs; grants; no dynamic SQL; no table | sections "preflight", "install" | S38 |
| rollback 5 | triggers gone, rows and functions stay, raw passes, checked path HC050, direct pause recorded again, safe twice, re-paste restores | section "rollback 5" | - |
| b.5 `update-enrollment-rate` | 401 / 403 / the service key 403; T1+ without ack 409 and nothing written; stale token; the write is `money_change_checked` on the caller's client; refresh by calculate-tuition only (suite `d4-functions-inputs`) | sections "update-enrollment-rate ..." | F01, F02, F03 |
| b.5 `create-family` | start date last month: 409 `preview_required`, NOTHING created; wrong token / short reason / no confirmation: nothing created; with the ack one override per enrolment; every write on the caller's client; an unknown class refused before anything exists | sections "create-family ..." | F04, F05, F06, F07 |
| b.5 `manage-demo-student` | demo child in a real class over a paid past month: 409 `demo_reset_needs_owner`, enrolment kept, demo left off and locked | section "manage-demo-student" | F08 |
| G-20 `admin-data-import` | the five tables not written, not even attempted; the fee stripped; the dry-run box honoured | section "admin-data-import" | F09, F10, F11, F12 |
| f.5 static | no raw writer of a money input left in `src/**`; service-key writers = the allow-list of one; MCP tools write nothing; the chat function names none of the checked RPCs (suite `money-inputs-lib`) | "no screen writes ... raw", "service-key writers ... exactly the allow-list", "the MCP tools ... write nothing" | F09 |
| f.4 oracle | suite `d4-reach-oracle`: 86 edits made behind the guard's back, the REAL calculate-tuition and compute-sibling-discounts re-run over 10 bills each time: every edit that moved a past or signed-off bill of either child (66 of them) had tier >= 1 and the (child, month) in `refresh_pairs`; 12 edits were tier 0 and moved only this month's unsigned bill; the raw statement by an admin is refused exactly when the plan's tier is >= 1; 8 pay-rate edits priced by the SQL resolver | whole suite | S16, S19, S23, S24, S39-S43 |

## Mutants

`node scripts/pgtest/d4-mutants-3b.mjs` - each mutant is one textual change to the migration (45) or to one of the four functions (12), run against the named suites.

| Mutant | Breaks | Verdict |
|---|---|---|
| S01 | the gate lets everything through (every money-input guard dead) | CAUGHT by inputs: P13 start date moved a month later over a PAID past month, raw: HC120 entity=enrollment tier=2, with the next step |
| S02 | the service lane passes like the owner (one mutant for every trigger: they share the gate) | CAUGHT by inputs: service lane is refused where a person would need a reason: HC120 |
| S03 | the owner lane leaves no event | CAUGHT by inputs: owner lane (SQL editor): passes, and ONE owner_lane event names the table, the row and the tier |
| S04 | enrollment_identity dropped (an enrolment may change child or class) | CAUGHT by inputs: student_id changed, admin lane: HC121 enrollment_identity "end it and start a new one" |
| S05 | discount_identity dropped (R-5: a discount may be re-pointed at another child) | CAUGHT by inputs: R-5 an assignment re-pointed at another child, admin lane: HC121 discount_identity |
| S06 | the family reach leaves out the children of the NEW family (R-14) | CAUGHT by inputs: a child joining a family whose other child has a CONFIRMED past month: T3 - every child of the NEW family is in reach |
| S07 | days entering an enrolment of a class taught in a past month are tier 0 (backdated enrol of a new child) | CAUGHT by inputs: days ENTERING an enrolment of a class that was taught in a past month: T1 (the child is not enrolled yet) |
| S08 | a discount dated the 1st does not reach the month before (the calculator reads it there) | CAUGHT by inputs: a discount dated the 1st of NEXT month reaches THIS month's confirmed bill (calculate-tuition reads effective_from <= next month's first day): HC120 |
| S09 | a rate / discount / weekday change is judged like a date-only change (reaches no day) | CAUGHT by inputs: _money_span a rate changed: the whole span (it is not dated) |
| S10 | the acknowledgement ignores the class (a transfer covers the child's third enrolment) | CAUGHT by inputs: but not a third, unrelated enrolment of the same child in that transaction: HC120 |
| S11 | the acknowledgement ignores the kind of change (a set_rate covers a start date) | CAUGHT by inputs: nor another KIND of change to the same row (a start date under a set_rate): HC120 |
| S12 | the acknowledgement skips step 1b's _money_ack (child, window, tier: A-8) | CAUGHT by inputs: A-8: stored at T1 while the trigger finds T2 (a payment landed in between): HC011 token_stale |
| S13 | a definition may be switched off while in use (is_active not a pricing column) | CAUGHT by inputs: switching it off (the calculator skips an inactive definition for every month): HC121 |
| S14 | a definition in use may be deleted (definition guard on UPDATE only) | CAUGHT by inputs: deleting it: HC121 |
| S15 | definition_in_use ignores the reach (never refuses) | CAUGHT by inputs: the value of a definition whose assignment reaches a paid past month: HC121 definition_in_use, "create a new discount" |
| S16 | the mirror columns pay nobody whatever the history (mirror guard always tier 0) | CAUGHT by inputs: someone with taught lessons and no dated rate: the mirror IS the rate - a raw edit is HC120, "from the pay-rate history, from a date" |
| S17 | a pay-rate acknowledgement for one person covers another's row | CAUGHT by inputs: an acknowledgement for ANOTHER person does not cover this one's row: HC120 |
| S18 | the pay plan ignores what moving "the rate now" reaches (first dated rate of someone with no history) | CAUGHT by inputs: section "G-17 pay rates (P18)" ran to the end without an unexpected error |
| S19 | an UPDATE of a pay rate is always "only the note" | CAUGHT by inputs: that future row re-dated into the past, raw: HC120 |
| S20 | unfreezing a paid or confirmed bill is T2, not T3 | CAUGHT by inputs: preview unfreeze of a bill with money on it: T3 (correction mode), the bill and its state shown |
| S21 | the unfreeze tier ignores the bill floor (reset the payment, then unfreeze at T2) | CAUGHT by inputs: G-9 under it: the payment reset to 0 first does not lower the tier (the bill floor): still T3 |
| S22 | any acknowledged unfreeze unfreezes any bill | CAUGHT by inputs: an acknowledgement for another bill does not unfreeze this one: HC120 |
| S23 | families.sibling_percent_override is not guarded | CAUGHT by inputs: P20 the sibling percentage of a family with a paid past month, raw: HC120 |
| S24 | students.sibling_discount_from is not guarded | CAUGHT by inputs: a sibling-discount hold typed raw: HC120 |
| S25 | a student whose only history is a person's mark may be deleted | CAUGHT by inputs: a student whose only history is one mark made by a person: HC121 |
| S26 | the student delete guard ignores the bill floor | CAUGHT by inputs: the payment reset to 0 first: still HC121 (the bill floor remembers) |
| S27 | class_has_history dropped | CAUGHT by inputs: a class with an enrolment, admin lane: HC121 class_has_history "archive it instead" |
| S28 | a direct pause_enrollment over billed months is still let through (not judged once its checked path exists) | CAUGHT by inputs: pause_enrollment called directly over a paid past month: refused by the register guard, HC025 (its checked path now exists) |
| S29 | ANY enrolment acknowledgement opens the register (not only end / transfer / pause) | SURVIVED the first run (the case only tried to bill a child back, which the row filter refuses anyway); a case added (an old billed mark set to Excused under a set_rate acknowledgement); re-run: CAUGHT by inputs |
| S30 | the checked end / transfer / pause cannot write their register rows (the helper does not answer for them) | CAUGHT by inputs: section "G-13 end / transfer / pause / set_days go through the live dated RPCs" ran to the end without an unexpected error |
| S31 | change_enrollment_terms open to any signed-in user | CAUGHT by inputs: by a teacher: 42501 |
| S32 | change_enrollment_terms granted to the service role | CAUGHT by inputs: grants: change_enrollment_terms for authenticated only (not anon, not service_role); every other new function: nobody  -- ["change_enrollment_terms(uuid,jsonb,date)" |
| S33 | change_enrollment_terms accepts any column (a start date as a "term") | CAUGHT by inputs: a term that is not a rate or a discount (start_date): 22023, nothing changed |
| S34 | A-6 dropped from the pause plan (a person's Present un-billed at tier 0) | CAUGHT by inputs: A-6 in the plan: a pause that un-bills a mark a PERSON made as Late, after the week, is at least T1 whatever the bill (a placeholder: T0) |
| S35 | the exec does not check the enrolment is still the one previewed | CAUGHT by inputs: the exec refuses a plan whose enrolment changed since it was previewed: HC011, nothing written |
| S36 | enroll_new can be applied with no child | CAUGHT by inputs: it cannot be APPLIED without the child: HC015 student_required, no row |
| S37 | an open-ended reach stops at today (a bill already signed off for NEXT month is not reached) | CAUGHT by inputs: an enrolment that began today, with NEXT month's bill already confirmed: a raw rate is HC120 tier=2 (an open-ended reach runs to the last billed month) |
| S38 | the preflight no longer checks the step 1a / 1b bodies | CAUGHT by inputs: a tuition_month_state that is not the reviewed 1b body -> refused, naming it, nothing installed  -- null |
| S39 | deleting an enrolment is not guarded | CAUGHT by inputs: P15 deleted raw: HC120 |
| S40 | referral bonuses are not guarded | CAUGHT by inputs: every trigger that existed is unchanged; added: the nine guards (on twelve tables) and audit_families  -- ["classes.zz_class_delete_guard","discount_assignments.zz_d |
| S41 | the reach skips the first month that has a bill (narrowing off by a month) | CAUGHT by oracle: enrolment start moved to 2026-07-15: the oracle ran  -- "25P02 current transaction is aborted, commands ignored until end of transaction block" |
| S42 | a family change reaches only from today, not from the child's first enrolment | CAUGHT by oracle: sibling held out of the family discount until 2026-09-01 [family_link.set_sibling_from] T0: 1 past / signed-off bill(s) moved, each in the reach |
| S43 | a new enrolment row reaches only its first day (INSERT span collapsed) | CAUGHT by oracle: discount assigned from 2026-07-01 [discount_assignment.assign] T3: 3 past / signed-off bill(s) moved, each in the reach |
| S44 | the first pay rate of a person can be removed (earlier dates fall to the mirror) | CAUGHT by inputs: the person's first rate cannot be removed: first_rate |
| S45 | the family guard accepts an acknowledgement of the other kind (a hold covers a move) | CAUGHT by inputs: an acknowledged set_sibling_from does not cover moving the child to another family: HC120 |
| F01 | update-enrollment-rate goes on to the write at tier 1+ without an ack | CAUGHT by fn: P14 the whole-enrolment rate over a PAID past month, no ack: 409 money_requires_checked_path with the preview, NOTHING written |
| F02 | update-enrollment-rate writes the rate with the service key (the old way) | CAUGHT by fn: an enrolment that began today (T0): 200, the rate is set, no dialog |
| F03 | update-enrollment-rate does not check the enrolment is that child's | CAUGHT by fn: an enrolment that is not that child's: 400, nothing written |
| F04 | create-family creates the family before asking for the reason | CAUGHT by fn: start date last month, no ack: 409 preview_required with the preview (tier 1, both enrolments listed) |
| F05 | create-family does not compare the token | CAUGHT by fn: a wrong token: 409 token_stale, nothing created |
| F06 | create-family writes the family with the service key | CAUGHT by fn: every row was written on the caller's client (families, students, and the enrolment by money_change_checked): no service-key write at all |
| F07 | create-family inserts the enrolment raw with the service key (the old way) | CAUGHT by fn: no start date (today): 200 - family, child and enrolment created, nothing asked |
| F08 | manage-demo-student ignores the guard's refusal and enables the demo | CAUGHT by fn: the demo child in a real class over a PAID past month: 409 demo_reset_needs_owner; nothing is exempted for this function |
| F09 | admin-data-import imports enrolments again | CAUGHT by lib: admin-data-import: none of the five money tables is importable, and the fee is stripped from class rows  -- "'families', 'students', 'teachers', 'classes', 'bank_inf |
| F10 | admin-data-import imports the register again | CAUGHT by fn: dry run: every table is still counted, and the five money tables are named as not imported |
| F11 | admin-data-import keeps the class fee in imported rows | CAUGHT by fn: a class's fee is dropped from imported class rows (it has its own dated history) |
| F12 | admin-data-import: the screen's dry-run box is ignored (a ticked dry run imports) | SURVIVED the first run (no case sent the box in the body); a case added; re-run: CAUGHT by fn |

**57 mutants: 55 caught on the first run, 2 survivors (S29, F12), each caught after one new case; 57 of 57 caught.** Equivalent mutants deliberately not listed, because step 1b re-checks the same thing: the acknowledgement's transaction id and tier (step 1b's `_money_ack`), the family widening inside `tuition_reach`, and "update-enrollment-rate accepts the service key" (the RPC then has no caller and answers 42501).

## Checks

Run on this PC (Windows, Node 26.13.1) at the branch tip, nothing else changed afterwards.

| Check | Result |
|---|---|
| `node scripts/pgtest/run.mjs` | **6658 assertions across 66 suites, 0 suite(s) failed.** This step's suites: d4 money inputs 257, d4 functions inputs 62, d4 reach oracle 187, money inputs lib 40 (each pinned with `expect`). Unchanged and green with file 5's code in the tree: d4 floors 213, d4 D2 carry-over 275, d4 deployed functions 37, d4 rollback 26, d4 register 140, d4 functions register 34, money guard lib 45, session cancel guard 266, session guard functions 135, invoice status 268, edge functions typecheck 5 (105 files), app typecheck 3. |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npm run test:bun` | **Could not be run on this PC**: the bun binary `npx` fetches does not start ("This version of ...\bun.exe is not compatible with the version of Windows you're running"), so the script exits non-zero before any test. The same 13 files (`scripts/*.test.ts`) were run under node with a small stand-in for `bun:test` (scratch only, not committed): 13 files, **166 tests pass, 0 fail**. None of them imports a file this step changed. The conductor should run `npm run test:bun` on the other computer. |
| mutants | 57 of 57 caught (table above) |
| lint | eslint over every changed `src` file: no error other than the repo's existing `no-explicit-any`; no rules-of-hooks error |

Two things about the first full run, for honesty:
- `cancelled lessons` (a suite and a file this branch does not touch) failed with `ENOENT ... C:\tmp\tuition-session.<pid>.mjs`: it writes its bundle to `/tmp`, which did not exist on this PC. I created `C:\tmp` and ran the whole suite again; that is the green run above. The folder is still there (removing it was refused by the tool's safety check): two small `.mjs` temp files of that suite, and a `Log.log` I did not create.
- `money guard lib` (step 1b's) failed its source check "ModifyEnrollmentModal: every failure toast goes through rpcErrorText" (it pins exactly four). The modal was changed to keep its four `rpcErrorText` toasts; the 1b test file was not edited.

## Function fingerprints (md5 of the body with CR removed, as `D4-release-fingerprint.sql` computes it)

Computed in pglite after pasting the file over D1, D2, files 1 and 2 (LF text). 40 new functions, 1 replaced. `docs/evidence/D4-release-fingerprint.*` and `guard-fingerprint.mjs` are NOT regenerated here (shared tooling; the conductor regenerates per step) - these are the values it should produce for file 5.

| Function | md5 (CR-stripped body) | definer | volatility | authenticated / service_role |
|---|---|---|---|---|
| `_class_delete_guard()` | e09b027a2c1eae98a5161e8bc8ee3595 | yes | v | - / - |
| `_discount_definition_guard()` | 8ed3b4f73189a1468c4681c614b80a3b | yes | v | - / - |
| `_discount_money_guard()` | fd385aa1558b69518037eac6a084f9ca | yes | v | - / - |
| `_enrollment_money_guard()` | 1657fcf356d000be17c701a1a53b164c | yes | v | - / - |
| `_family_link_guard()` | 85747b452655aaf91c188575c6bb24c1 | yes | v | - / - |
| `_invoice_unfreeze_guard()` | a66d21b14fe5149e2bcb77d37f7370bc | yes | v | - / - |
| `_money_date(text)` | b84d745998882ed916f3411cfed11e33 | no | i | - / - |
| `_money_enrollment_rpc_call()` (REPLACED, was 8796eb026e4187149b639f7efa82e81d) | b63e90a3ef684c6e32c800401194e809 | no | s | - / - |
| `_money_enrollment_terms(jsonb)` | 0b87e3d1554fc90518cbafd89cb7135a | no | i | - / - |
| `_money_exec__discount(text,jsonb,uuid)` | 2f5a3a5c5406e23b47b21809f0fc63df | yes | v | - / - |
| `_money_exec__discount_assignment(jsonb,uuid)` | 10721fdfe402fcf709e81fd9f7c85b04 | yes | v | - / - |
| `_money_exec__enrollment(jsonb,uuid)` | dd3d4ecefbadfe5d485ce0af834bd9b7 | yes | v | - / - |
| `_money_exec__family_link(jsonb,uuid)` | e72bf143739d75861b7892f4cf59c8ab | yes | v | - / - |
| `_money_exec__invoice_freeze(jsonb,uuid)` | 6e30c1f6745a93c404acf1bcad6a9b0a | yes | v | - / - |
| `_money_exec__pay_rate(jsonb,uuid)` | 0c2a5c26ab8ad254f8a3f0f29b504e05 | yes | v | - / - |
| `_money_exec__referral_bonus(jsonb,uuid)` | 6a57df845845894019213e11bd6d38a0 | yes | v | - / - |
| `_money_family_kids(uuid[])` | f294a6bc9bcb1a0e2826cf0d23d8046e | yes | s | - / - |
| `_money_family_reach(uuid,uuid,uuid)` | c72cdb226c9aa52d1e819a7dc2009d2b | yes | s | - / - |
| `_money_input_ack(text,uuid,date,date,integer)` | 9473b3313d861f5b41546690d2ef524c | yes | s | - / - |
| `_money_input_gate(text,text,text,uuid,integer,boolean,text)` | 014b577b5d2e8dddcdd17b5ee4611a05 | yes | v | - / - |
| `_money_input_plan(text,text,uuid,jsonb,jsonb,jsonb,integer,text)` | e871a3b8a0be185559b7d81bd33b15cd | no | s | - / - |
| `_money_pay_combine(jsonb,jsonb)` | 9973dbcad0e1d5b00e275f8a71090956 | no | i | - / - |
| `_money_pay_mirror_reach(uuid,uuid,date)` | 389c5c400866670c497f5661290cc559 | yes | s | - / - |
| `_money_pay_rate_on(uuid,uuid,date,uuid,jsonb)` | 0616e5bdb8067f96d105851fe89a77f6 | yes | s | - / - |
| `_money_pay_reach(uuid,uuid,date,date)` | a80f0b195ebef60f89da152ca83ec1a2 | yes | s | - / - |
| `_money_pay_row_reach(uuid,uuid,date,uuid)` | 9e0414e22a32ed3f366c4e2f992b3411 | yes | s | - / - |
| `_money_plan__discount(text,text,jsonb)` | 8839b4bc6d395110225b0ca1c35d00aa | yes | s | - / - |
| `_money_plan__discount_assignment(text,jsonb,uuid)` | 1aed03a81e566fa6a756ee2fbf436d3c | yes | s | - / - |
| `_money_plan__enrollment(text,jsonb,uuid)` | 0248b6518f1dd554bb35db7bc12c2ca7 | yes | s | - / - |
| `_money_plan__family_link(text,jsonb,uuid)` | ec091aa27440c3110f93e40b0a94fbb6 | yes | s | - / - |
| `_money_plan__invoice_freeze(text,jsonb,uuid)` | 9c4f583e0d0f729689c08bce2ea62a5e | yes | s | - / - |
| `_money_plan__pay_rate(text,jsonb,uuid)` | aa28af8b81495574af464d95444978a3 | yes | s | - / - |
| `_money_plan__referral_bonus(text,jsonb,uuid)` | 0156ce9527177b37aab481f4e0869440 | yes | s | - / - |
| `_money_span(jsonb,jsonb,text,text,text[],integer)` | 608318266bf25a46ac5a4de896319e9c | no | i | - / - |
| `_money_tuition_reach(uuid[],uuid,date,date)` | 1b134afbddd2c82f35e24768101146c1 | yes | s | - / - |
| `_money_unfreeze_tier(uuid)` | 226e22c1c0715645fe69fc46c5e7e805 | yes | s | - / - |
| `_money_uuid(text)` | 22dcde6a13fd3802135d90e986dc35a4 | no | i | - / - |
| `_pay_rate_money_guard()` | c5638802659cb1ca21037bcbdcc0f59b | yes | v | - / - |
| `_staff_pay_mirror_guard()` | cac197dfb3e26ebe30b5c19bbc29185a | yes | v | - / - |
| `_student_delete_guard()` | 72ec5875fda2471e3c973b4339459603 | yes | v | - / - |
| `change_enrollment_terms(uuid,jsonb,date)` | 0d25fcb5cb723cf23ebcc365a78bbb0b | yes | v | EXECUTE / - |

| Trigger | function | md5(pg_get_triggerdef) | enabled |
|---|---|---|---|
| `classes.zz_class_delete_guard` | `_class_delete_guard` | 2f790ddfb3c181634b51b25e9715d0c7 | O |
| `discount_assignments.zz_discount_money_guard` | `_discount_money_guard` | c5ef1e99461576ab85b838e1312f6fe2 | O |
| `discount_definitions.zz_discount_definition_guard` | `_discount_definition_guard` | 26aa5a51423fa572043933933e6da6f4 | O |
| `enrollments.zz_enrollment_money_guard` | `_enrollment_money_guard` | ef2e1a821049fe1e085db7e231cb6798 | O |
| `families.audit_families` | `audit_row_change` | 40b8ba1f06ea44a7524802940705ed40 | O |
| `families.zz_family_link_guard` | `_family_link_guard` | b5c8c9d2d8c5e8be521816871a284b28 | O |
| `invoices.zz_invoice_unfreeze_guard` | `_invoice_unfreeze_guard` | 67aeafe4f55e261d9a730df57483c036 | O |
| `referral_bonuses.zz_discount_money_guard` | `_discount_money_guard` | f6cfee33a2bce332863b3c66b44d7ca7 | O |
| `staff_pay_rates.zz_pay_rate_money_guard` | `_pay_rate_money_guard` | 036bd8e68eb35416a545f5b9bfe9e55e | O |
| `students.zz_family_link_guard` | `_family_link_guard` | c1cf5719b0cbf0d96bbfc60310d53201 | O |
| `students.zz_student_delete_guard` | `_student_delete_guard` | 6f6043e2332c453f5a03d4d6116b88b5 | O |
| `teachers.zz_staff_pay_mirror_guard` | `_staff_pay_mirror_guard` | f1db8ec0f6227ae8f3dc753af3ce15a9 | O |
| `teaching_assistants.zz_staff_pay_mirror_guard` | `_staff_pay_mirror_guard` | 0bf37a3d1b7a8e8f56c89fb4edf19748 | O |

Every new function pins `search_path=public`. No new table, view, policy or grant on a table.

## Rollback (rollback 5)

1. Paste `scripts/ROLLBACK-d4-5-money-inputs.sql`: twelve `DROP TRIGGER IF EXISTS` (the nine guards). Rows, functions, `audit_families` stay.
2. At once redeploy the previous `update-enrollment-rate` and `create-family` and publish the previous screens: with the triggers gone `money_change_checked` refuses every money-input change (HC050, nothing written - closed), and the new screens and those two functions send their changes through it. `manage-demo-student` and `admin-data-import` may stay.
3. The step 3B body of `_money_enrollment_rpc_call()` stays and, with the enrolment guard gone, answers exactly as step 1b's did (tested: a direct pause over a paid past month is recorded again, not refused). To put the 1b text itself back, paste `20261114091000` again - only AFTER the rollback script, never with the 3B triggers installed (the checked end / transfer / pause would then be refused by the register guard).
Symptom that means "roll back": an ordinary enrolment, discount, pay-rate or family change of THIS month cannot be saved, or one fails naming one of the nine triggers / `guard_broken` where the screen offers no reason dialog.

## Paste / deploy order and what is true in between

Migration first, then the four functions, then the screens, in one sitting. Between the migration and the screens every newly guarded write by a person is refused by the database when it reaches a billed month (HC120 / HC121, worded by the old screens only where they already used `rpcErrorText`); tier-0 writes work as before. Between the migration and the functions: the old `update-enrollment-rate` and `create-family` write with the service key and are refused at T1+ (HC120) - closed, never recorded-and-passed. If the functions were deployed BEFORE the migration they answer 503 for any enrolment change (`not_installed`), nothing written (tested).

## Decisions the design left open - FOR THE REVIEWER

Each was built the way that fails closed and changes least.

1. **One step 1b body is replaced: `_money_enrollment_rpc_call()`** (same signature, attributes, no grants; 8796eb02... -> b63e90a3...). Design c.5 does not say this, but it cannot be avoided: the checked `end` / `transfer` / `pause` call the live dated RPCs, whose own register writes (placeholder marks removed or seeded, marks set to Excused) are judged by step 1b's `zz_attendance_money_guard`; that guard knows them only when the RPC is the OUTERMOST frame, which it no longer is under `money_change_checked`. Step 1b's own comment says the exemption holds "until step 3B gives enrolments their own checked path". The new body adds one branch before the old text: the flag names an override row of THIS transaction with entity `enrollment` and op `end` / `transfer` / `pause` -> `'checked_<op>'`. The guard's own row filter still applies (an unsigned row removed or seeded, or Excused; anything else HC025 - tested). `_attendance_money_guard` itself is NOT touched. Alternatives rejected: replacing the register guard (larger live surface), or a second attendance-entity override per mark (step 1b never acknowledges a delete).
2. **A direct `pause_enrollment` at T1+ is now refused (HC025)** while `zz_enrollment_money_guard` is installed and enabled - the helper no longer takes it for an exempt RPC. `pause_enrollment` writes no enrolment row, so the enrolment trigger cannot gate it; without this it would have stayed "recorded, not refused" although its checked path now exists. With rollback 5 the 1b answer returns. `end_enrollment` / `modify_enrollment_transfer` need no such line (the enrolment trigger refuses their first statement); `ai_action_apply` / `ai_action_undo` / `stars_sync_resolve_conflict` are left exactly as 1b's ruling has them.
3. **HC121 applies on every lane, the owner lane included** (identity changes, the two delete guards, `definition_in_use`). The design gives no lane for HC121; G-10's HC024 is "every lane". The owner can still deactivate / archive, or drop the trigger knowingly.
4. **`is_active` is a pricing column of a discount definition.** calculate-tuition skips an inactive definition for EVERY month (`index.ts:371`), so switching one off re-prices billed months. Consequence for the school: a definition that was ever assigned over a billed month cannot be switched off; end its assignments instead (`set_end`). If the owner wants "retire from the picker" without re-pricing, that needs a calculator change, not a guard change.
5. **A discount's reach starts one day before `effective_from`.** Both calculators read assignments with `effective_from <= <first day of NEXT month>`, so an assignment dated the 1st already applies to the month before. Proved by the oracle (mutant S08 is caught).
6. **Open-ended reach** = to today or the last month any child of the family has a bill for, whichever is later (families pay in advance; tested with next month's bill confirmed, mutant S37). **Narrowing:** the reach starts at the first bill, bill floor or non-cancelled lesson of those children - every earlier month is "no bill, no lesson" (T0) by `tuition_month_state`'s own table. This keeps `refresh_pairs` to months that can exist (an enrolment from 2020 does not list 80 months).
7. **Days ENTERING an enrolment** of a class taught in a past month are at least T1 even when the child has no bill and no other enrolment (`tuition_month_state` cannot see it: the child is not enrolled yet). This is b.7's "started on the 28th, entered on the 13th: one dialog" and P15.
8. **`enroll_new` previewed with no child** (create-family, before anything exists): `target_id` is the class, `student_ids` empty, tier from the class rule alone; it cannot be APPLIED without `student_id` (HC015 `student_required`). The function previews again with the new child's id and confirms with that token.
9. **create-family writes the family and the children on the caller's client too** (hard rule: no service role for data the caller can write under RLS; the admin policies already allow it - `StudentForm` and `StudentEditDrawer` insert both from the browser). **T0 enrolments also go through `money_change_checked`** (one row each), not a plain insert as b.5's table says - the money rule ("every money-affecting admin write leaves a row") decided it. One token for the request = sha256 of the enrolments' own tokens. If an enrolment is refused AFTER the family exists (something moved in between) the answer is 200 with `partial: true` and `enrollment_errors`, never a failed creation.
10. **update-enrollment-rate** no longer recalculates the body's `month` unconditionally: only the override's `refresh_pairs` (design b.4: nothing runs the calculator over a month outside the reach). `EnrollmentRateEditor` recalculates the month on screen only when the change reaches it. The function refuses the service key (no caller in the repo uses it).
11. **manage-demo-student** on a refusal also re-locks the account (a random password) and sets `enabled = false`: its password step runs before the sandbox step, and a demo login still enrolled in a real class shows real classmates' names. It also stops ignoring the errors of those two writes.
12. **admin-data-import's dry run.** The screen never sent its "Dry run" box (the function read a query parameter `supabase.functions.invoke` cannot set), so a ticked dry run imported. The body flag is honoured now. Outside G-20's text, inside its intent; say if it should be a separate change.
13. **Pay rates.** `('pay_rate','remove')` refuses the person's FIRST rate (`first_rate`): without it the earlier dates fall back to the mirror. The plan of `set` / `remove` includes what moving "the rate now" (the mirror) reaches. **Finding, not fixed:** `create-teacher` / `create-teaching-assistant` write no baseline row, so staff created after 21 Oct 2026 have no dated rate and their lessons are paid from the mirror; their first dated rate - even "from today" - moves the mirror and so re-prices those lessons. The guard now says so (T1, "N lessons already taught are paid at this rate"; tested), where before it happened silently. Recommended: an owner-run insert of a 1900-01-01 baseline (the staff row's current rate) for every member of staff without a history row - after it this path is T0 again. Not done here: it writes rows.
14. **Bulk.** `runMany` previews every item, sends only the tier-0 ones through `money_changes_checked_bulk`, and opens ONE dialog per item that needs a reason (its own reason, never the batch's). So a T2+ change is never made "in bulk" from these screens and HC017 cannot be met; the SQL bulk path itself is tested with a T2 item.
15. **Deletes that cascade.** A student with no money but an enrolment over taught past months: the cascade to `enrollments` is judged (HC120). A family delete un-links its children (SET NULL), which the family guard judges. Both fail closed.
16. **`ClassAdminActions`' hard delete** is unchanged: it already refuses a class with enrolments before the write; HC121 is the database's backstop for the race and would toast the raw message there.
17. **Screens:** unfreeze skips the old "Unlock?" alert - the reason dialog is the confirmation (one dialog, not two). `EditEnrollmentDiscountModal` / `EnrollmentRateEditor` gain an "applies from" date and a "Correct a mistake for the whole enrolment" tick; `ModifyEnrollmentModal` a second button. Plain markup, no rollout class touched.
18. **New refuse codes** (`first_rate`, `not_frozen`, `student_required`) are not in `_lib/session-guard.ts`'s HC015 map (step 1b: "no later step edits this file's map"), so an edge function reports them as 400 `bad_request`; the browser words them from `moneyInputs.ts`. None of the four functions can meet them except `bad_args`.

## For the conductor (shared files I did not edit)

- `d4_guard_status()` (1b) lists only the 1a / 1b triggers; the nine of this file are not on the status card. It needs the names added (the query in the migration's last `SELECT` has them) - one replace, shared with steps 2 and 3A.
- `scripts/pgtest/guard-fingerprint.mjs`, `docs/evidence/D4-release-fingerprint.*`: add file 5 and rollback 5; `_money_enrollment_rpc_call()` will show as changed (expected, decision 1).
- `scripts/pgtest/d4-mutants.mjs` and `money-guard-lib.test.mjs` are untouched: this step's mutants and wording tests are in `d4-mutants-3b.mjs` and `money-inputs-lib.test.mjs` so 3A and 3B do not collide.
- `src/integrations/supabase/types.ts`: `change_enrollment_terms` is new; every call here goes through the untyped wrappers.
- Root `AGENTS.md`, when merged: a write to enrolments, discounts, pay rates, family links or a frozen flag goes through `money_change_checked`, and a new op needs an edit in `d4-reach-oracle`; no function writes a guarded table with the service key for a person (allow-list in `money-inputs-lib.test.mjs`); a rate or discount changes "from a date" with `change_enrollment_terms`.
- `d4-reach-oracle`: add the class-fee edits (step 2) and the lesson edits (step 3A) to `EDITS` when those merge.

## Not built, and why

- **The pay oracle over the bundled `calculate-payroll`.** The pay oracle here prices every Held lesson with the SQL resolver rule (`teacher_rate_on`'s) before and after each rate edit. Driving the 1,057-line function needs stand-ins for seven more tables and its other three edits (a teacher, a lesson's times, an assistant) are step 3A's guard. Left for the merge of 3A.
- **Class-fee and lesson edits in the oracle**: steps 2 and 3A (files not in this branch).
- `TeacherEditDrawer`, `ta/TAProfileDrawer`: nothing to move (see above).

## Not verified

The live database. The screens were type-checked and linted for hook rules, not rendered. `refreshMoneyChange` against the real `guarded-change-refresh` (its own suite is step 1b's). Concurrency (pglite is one connection): the row re-check in each exec is tested by calling the exec with a stale plan.
