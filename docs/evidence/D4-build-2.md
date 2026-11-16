# D4 build - step 2 (dated class fees, G-16 / review R-9)

**Where I am / next step:** FIX ROUND COMPLETE (review `D4-2-review.md`, APPLY WITH CHANGES; see "Fix round" below - it supersedes any line above it that disagrees). Built and tested on branch `worktree-agent-a36ad2752b190053b` (from `claude/hec-conductor-setup-efbaa5` b27bbf06). Next step is not mine: the independent review of step 2, then the conductor's live apply (migration, then the three functions, then the screens, one sitting).

Implementer only: nothing pushed, nothing deployed, nothing applied to any database, the live database not looked at. The conductor tip c132bf7b (test-date fix 02b571e6, PC2-harvest) was merged in before the final run.

**Checks (on the merged tree):** `node scripts/pgtest/run.mjs` -> **6268 assertions across 63 suites, 0 failed** (d4 class fee 155, invoice status 268, d4 floors 213, d4 rollback 26 - its fingerprint checks include file 3 and rollback 3 - edge functions typecheck 5, app typecheck 3; no suite skips). `tsc --noEmit -p tsconfig.app.json`: exit 0. `npm run test:bun`: 159 pass, 0 fail. Mutants K01-K32: 32 / 32 caught. `guard-fingerprint.mjs --release d4 --check`: up to date; `--check-unchanged`: only the two 1a-replaced functions differ; `--after-rollback`: 66 of 66. (Before the merge the run showed `session cancel guard` and `d4 D2 carry-over` 3 failures each - the date fixture 02b571e6 fixes; neither suite loads a file of this step.)

## What was built (the files (h) lists for step 2, plus test tooling)

| File | What |
|---|---|
| `supabase/migrations/20261114092000_d4_class_fee_history.sql` | table `class_fee_history` (first-of-month rows + a 1900-01-01 baseline, plain `UNIQUE (class_id, effective_from)`, CHECKs: first of month, fee >= 0, note <= 500); the idempotent baseline insert (rows in the NEW table only, at `classes.session_rate_vnd`); RLS on, one policy (admins read - fix round F-3), authenticated SELECT only, service_role ALL (house rule); `class_fee_on(class, date)` STABLE; `_class_fee_reach`; triggers `class_fee_history.zz_class_fee_money_guard`, `class_fee_history.class_fee_history_no_truncate`, `class_fee_history.audit_class_fee_history` (the generic `audit_row_change`), `classes.class_fee_baseline` (AFTER INSERT), `classes.zz_class_fee_mirror_guard` (BEFORE UPDATE OF session_rate_vnd, WHEN changed); entity `class_fee` of the 1b dispatcher: `_money_plan__class_fee` / `_money_exec__class_fee`, ops `set` and `remove`. Preflight: the 1a/1b objects and the CR-stripped md5 of the seven 1a/1b bodies it relies on; refuses a class with a negative fee. `SET LOCAL lock_timeout = '5s'`, `NOTIFY pgrst`, result set. Replaces nothing; the dispatcher is not re-created. |
| `scripts/ROLLBACK-d4-3-class-fee.sql` | brings the mirror level (`class_fee_on(id, today)`) first, then drops the two guard triggers; states what stays. |
| `supabase/functions/_lib/class-fee.ts` (new, imports nothing) | `indexClassFees`, `classFeeOn(history, classId, date, fallback)`, `isMissingFeeHistory` (by code only: 42P01 / PGRST205 - fix round F-1), `readClassFeeHistory` (paged by id, 200 classes a chunk; `null` for a missing table; throws on any other error). |
| `supabase/functions/calculate-tuition/index.ts` | the history read once, in Wave 2 beside the sessions; `defaultRate` per lesson and `class_breakdown[].session_rate_vnd` (the month's fee) through `classFeeOn`. 13 lines. |
| `supabase/functions/calculate-tuition-bulk/index.ts` | the history read once through `fetchChunked` (paged, as every read of that file); the same two places. 18 lines. |
| `supabase/functions/_lib/projected-per-class.ts` | the history read once; each lesson of the month summed at its fee (`select('id, date')`), `session_rate` the month's fee. |
| `src/components/admin/class/ClassFeeHistory.tsx` (new) | the list (newest first, "until <month>", "now", "not in force yet", note), "New fee from <month>" (month, fee, note; defaults to next month), Remove (not the first fee). Preview -> only a new fee that reaches NO bill is confirmed at once (one override row); every Remove and every change whose plan reaches a bill opens the 1b dialog, at any tier (fix round S-2) with the reached bills, reason, tick (and the correction reason at T3). |
| `src/components/admin/class/ClassSettings.tsx` | the Session Rate field and `session_rate_vnd` in the update are gone; `<ClassFeeHistory classId={classId} />` in their place. |
| `src/lib/classFee.ts` (new, pure, imports nothing) | wording, the list layout, the month helpers, `parseFee`, the refusal texts, the dialog's one-line summary from the plan's own figures. |
| `src/components/admin/money-guard/MoneyGuardDialog.tsx` | three OPTIONAL props (`title`, `intro`, `submitLabel`) so the class-fee screen words the same dialog; left out, the register's dialog reads exactly as before. |
| tests | `scripts/pgtest/d4-class-fee.test.mjs` (174 assertions after the fix round), `scripts/pgtest/d4-class-fee-golden-hook.mjs` (a `node --import` preload that answers `class_fee_history` inside `invoice-status.test.mjs`, which is not edited); `run.mjs` registers `d4 class fee` with `expect: 174`; `d4-prelude.mjs` gains `D4_CLASS_FEE` (the live `classes.session_rate_vnd` column); `guard-fingerprint.mjs` lists file 3, applies `D4_CLASS_FEE` in `checkUnchanged`, and runs rollback 3 first in `--after-rollback`; `d4-mutants.mjs` gains suite `fee` and mutants K01-K32. |
| `docs/evidence/D4-release-fingerprint.*` | regenerated: 49 functions (+8), 24 triggers (+5), 7 relations (+`class_fee_history`); every 1a / 1b entry unchanged (the JSON diff is additions only). |

## Fix round (after `docs/evidence/D4-2-review.md`, APPLY WITH CHANGES)

`review-2` (4194991d) merged in; each finding one commit `D4-2 fix: ...`; the migration edited in place (applied nowhere).

| Finding | Change | Proof |
|---|---|---|
| S-1 (blocker) mojibake in `ClassSettings.tsx` :222, :261, :328 | file rebuilt from the b27bbf06 bytes, only the fee edits re-applied (9d49372c); every file of the step scanned for `C3 A2 E2 82 AC` / `C3 B0 C5 B8` / BOM: none left | `git diff b27bbf06 -- ClassSettings.tsx` = the fee lines only; `d4-class-fee` case "S-1: no re-encoded bytes ... the em dashes and the bank emoji of ClassSettings are intact" |
| S-2 (blocker) T0 saved with no dialog, notes from the browser's calendar | `feeNeedsDialog(op, plan)`: the dialog for every Remove and whenever the plan's `invoices_before` / `refresh_pairs` is non-empty, any tier (and any tier >= 1 or approval); only a new fee reaching NO bill goes straight through. `feeDialogIntro(plan)` words it from the plan (bills reached, tier). The calendar notes (`isPastMonth`, past / future / this-month) are gone; the line under the button says the bills are checked first (0b342d12) | cases "feeNeedsDialog: only a new fee that reaches NO bill goes straight through", "the dialog's wording comes from the plan", "S-2: the screen decides the dialog with feeNeedsDialog ... no calendar-based note"; mutation-free source check |
| T-1 (blocker) V01, V02 survived; F-5 V03, V04 | the review's P2, P3, P7, P8 copied into `d4-class-fee` (d6e7b05a) | V01-V04 now CAUGHT (table below) |
| V05 | not killed - **equivalent**: `_class_fee_reach` always returns a numeric `tier` (the literal 0 of its empty branch, or `tuition_reach`'s `COALESCE(max(tier), 0)`, now possibly raised to the literal 1 by OQ-1) or raises (then the statement fails: closed). The `COALESCE(.., 3)` in the trigger never sees NULL, so `COALESCE(.., 0)` behaves the same | V05 SURVIVED, argued |
| F-1 "no table" by message | `isMissingFeeHistory` = `code === '42P01' \|\| code === 'PGRST205'`, nothing else (004c1d21) | case "F-1: a message alone is never no table" (42703 column, PGRST200 relationship, code-less message all false); mutants K31 (code check dropped) and K33 (message test restored) CAUGHT |
| F-2 rollback 3 header | the reviewer's sentences: with the step-2 functions deployed the fee is the history (change it with a `class_fee_history` row; `classes.session_rate_vnd` alone changes no bill); the old class screen only with the old calculators, same sitting (9324c17e) | `scripts/ROLLBACK-d4-3-class-fee.sql` header |
| F-3 / decision 5 teachers read the history | policy `class_fee_history_admin_read` (admins only); the old `class_fee_history_staff_read` dropped if present (f8bf316d) | cases "F-3: admins read the history; a teacher and a parent read none", "the one policy names no role but admin"; mutant K34 CAUGHT |
| F-4 `UPDATE OF session_rate_vnd` | `BEFORE UPDATE ON public.classes ... WHEN (OLD.session_rate_vnd IS DISTINCT FROM NEW.session_rate_vnd)` (1bc90aa6) | case "F-4: a fee rewritten by an earlier BEFORE trigger (the column not in the SET list) -> HC120" (the review's P11); mutant K35 (column list back) CAUGHT; K13 (WHEN dropped) still CAUGHT |
| Decision 7 the 1900 row by a typed year | the month box has `min` = the class's first lesson or creation month (`feeMonthMin`, never before 2000-01) and `save` refuses below it (`feeMonthAllowed`) (0b342d12) | case "decision 7: the month box starts at the class's first lesson or creation, never 1900" |
| OQ-1 (owner's ruling: YES) | `_class_fee_reach` raises the tier to at least 1 when any reached pair's state is `paid`, `signed` or `frozen` (recorded payment / paid label / floor ever_paid, confirmed / adjusted, frozen) - in ANY month (b3546c6d). Plan and trigger share it, so the acknowledgement check agrees | cases "P4: next month already billed AND paid -> T1", "without a reason -> HC010", "P5: this month, paid -> T1", the T0 control (issued, nothing paid), "the raw write that reaches the paid bill is judged at T1"; mutant K36 CAUGHT |

AGENTS.md rule text for the conductor (design (h)): **"The class fee is read with `classFeeOn` (`supabase/functions/_lib/class-fee.ts`) over `class_fee_history`, never from `classes.session_rate_vnd` (the mirror, \"the fee now\"). A fee changes only through `money_change_checked('class_fee', 'set' | 'remove')`; a change that reaches a bill with money on it asks for a reason in any month."**

Deploy note: `watch-sibling-threshold` must be redeployed WITH `calculate-tuition` and `calculate-tuition-bulk` - it is unchanged, but it bundles `_lib/projected-per-class.ts`, which now reads the history (an old bundle keeps pricing its projection at the mirror).

### Mutation run after the fix round (`node scripts/pgtest/d4-mutants.mjs K01 ... K36 V01 ... V05`)

K01-K36 (K33-K36 new in this round) and the reviewer's V01-V05: **40 caught, 1 survived (V05, equivalent - above)**. V01 (P2), V02 (P3), V03 (P7), V04 (P8) are caught by the copied cases. `git status` clean after the function mutants.

### Checks after the fix round

`node scripts/pgtest/run.mjs` (once, after every fix commit): **6287 assertions across 63 suites, 0 failed** (d4 class fee 174, invoice status 268, d4 rollback 26 with its fingerprint checks, edge functions typecheck 5, app typecheck 3 = `tsc --noEmit -p tsconfig.app.json` exit 0 with the source loaded). Fingerprint regenerated (8bd1870c): `--release d4 --check` up to date, 49 functions / 24 triggers; `--check-unchanged` only the two 1a-replaced functions differ; `--after-rollback` 66 of 66. Golden gate: still byte-identical in all three states (part of the 174).

## The guards as built

**`zz_class_fee_money_guard`** (BEFORE INSERT / UPDATE / DELETE on `class_fee_history`, definer), in order:
1. identity: an UPDATE that changes `class_id` or `effective_from` -> HC121 `fee_row_identity`, every lane.
2. trigger-made writes (depth > 1) pass ONLY as what this file's triggers make: an INSERT of a 1900 row for a class with no row (the baseline of a new class), a DELETE whose class no longer exists (the FK cascade of a deleted class). Any other trigger's write is judged below.
3. DELETE of the 1900 row -> HC121 `baseline_row`, every lane.
4. reach: the lessons of the class from the row's month up to the next row (exclusive), when the fee they are priced at moves (before vs after: INSERT = `class_fee_on(class, date)` vs NEW; UPDATE = OLD vs NEW; DELETE = OLD vs the row before). Children = those with a billable mark (Present / Absent / Late) on such a lesson that is not cancelled; `tuition_reach` (1b) widens them to their families and gives the tier over the months of those lessons only. A change that moves no fee (a note) reaches nothing.
5. acknowledgement: `_money_ack(['class_fee'], class, NULL, row month, NULL, tier)` - this transaction's override, this class, a window starting at this month, a stored tier not lower than the trigger's (else HC011, A-8) - AND the override's op and fee are the row written (`set` with the same `session_rate_vnd`; `remove` for a DELETE).
6. owner lane (SQL editor) -> pass; an `owner_lane` event (with tier and the months to refresh) when the tier is above 0.
7. anything else -> HC120 `money_change_requires_checked_path`, DETAIL `entity=class_fee; tier=N; Change the fee from the class's fee history, from a month, with a reason.` - the service role, a person, an API role without a user, at ANY tier (decision 1).

**`zz_class_fee_mirror_guard`** (BEFORE UPDATE ON `classes`, no column list since fix round F-4, only WHEN the value changes): passes a value equal to `class_fee_on(class, today in Hanoi)` (all the checked op writes, and harmless from anyone: the calculators read the history); the owner passes with an `owner_lane` event; anything else HC120 "Change the fee from the class's fee history". A settings save that sends the column unchanged never fires (tested with the mirror out of level).

**`class_fee_history_no_truncate`**: TRUNCATE -> HC121, the owner included. **`class_fee_baseline`** (AFTER INSERT ON classes): the new class's 1900 row at its fee, `ON CONFLICT DO NOTHING`.

**The checked op** (`money_change_preview` / `money_change_checked`, 1b, admin JWT only):
- `set {class_id, effective_from: 'YYYY-MM-01', session_rate_vnd: whole VND 0..999,999,999, note?}`: inserts the month's row, or updates it when the month has one; `nothing_to_change` when the fee from that month already is that amount (and the note the same).
- `remove {class_id, effective_from}`: never the 1900 row (`baseline_row`), `not_found` for a month with no row.
- refuse codes: `bad_op`, `bad_args`, `not_found` (class or row), `no_baseline`, `baseline_row`, `nothing_to_change`.
- plan: `row_before = {row, history (every row of the class), mirror}` (so the token covers the class's whole history), `change = {class_id, effective_from, session_rate_vnd, note, fee_before, fee_after, window_from, window_to, lessons, moves, fee_now, fee_now_after}`, `reach = {pairs, months, fp}`, tier, `invoices_before`, `refresh_pairs`, impact - all from `tuition_reach`.
- exec: refuses (HC050) when the mirror's guard is missing or disabled, writes the row, then `UPDATE classes SET session_rate_vnd = class_fee_on(id, today)` when it differs; returns `guard_trigger = class_fee_history.zz_class_fee_money_guard`, which `_money_change_apply` checks (HC050).
- the advisory lock key of `_money_change_apply` for `class_fee` args is `money:class_fee:` (the args carry `class_id`, not one of the three keys it reads): every fee change of the school is serialised. Harmless at this volume; noted.

## Tests (`d4-class-fee`, 155 assertions before the fix round; 174 after it)

| Part | Covers |
|---|---|
| preflight | without file 2: refused, names what is missing, installs nothing; a `_money_ack` that is not the reviewed body: refused naming it; the same 1b body pasted with CRLF: accepted; a class with a negative fee: refused, nothing installed. |
| install | no existing row rewritten (classes, attendance, invoices, sessions digests); the baseline is one 1900 row per class at its fee (0 included); a second paste is a no-op on functions, triggers, rows and events; no existing function replaced or re-granted (the dispatcher not re-created); exactly the five triggers added; eight new functions, `search_path=public`, nobody may EXECUTE them; RLS, grants, the one SELECT policy, the plain UNIQUE, `lock_timeout`; admin and teacher read, a parent reads none. |
| resolver and class triggers | `class_fee_on` before / on / after rows, never a later row, no row -> NULL; the CHECKs (not the 1st, negative); a new class's baseline; an empty class can still be deleted (cascade); TRUNCATE refused. |
| a fee from next month | T0, no bill reached, nothing to refresh, the screen's figures; checked with no reason -> one override (who, op, history before, after); the row signed by the admin; the mirror unchanged; earlier lessons at the old fee; no stored bill changed; audit_log row as the admin. |
| a past month | T2; the window ends the day before the next row; `refresh_pairs` never a month before the row's (the child's earlier paid month untouched); the reach is the family (a sibling in another class); an Excused-only child not reached; the stored bills shown; HC010 / HC012 / HC011; a history change after the preview -> HC011; done at T2 with the reason; the mirror follows; earlier months keep their fee. |
| same month / nothing to change | a second fee for a month updates its row; same fee -> `nothing_to_change` (preview and HC015); a note-only change is T0. |
| T3 | a confirmed past bill -> T3, HC013 without the correction reason, reviewed (in `money_change_review_queue`); a frozen past bill -> T3. |
| window | a row the month before an existing row reaches only its own month (T2), not the confirmed month after it. |
| remove | the 1900 row and a missing month refused; a next-month row T0, mirror unchanged; a past row T2, the mirror back to the fee before. |
| raw writes | admin and teacher: 42501 (no grant); the service role: HC120 for a T0 insert, a re-priced baseline (tier 2), a delete; the owner: T0 passes silently, a paid past month passes with an `owner_lane` event (tier, refresh months); identity and baseline HC121 even for the owner; a fee row written by ANOTHER trigger (depth 2) on the service lane -> HC120, and a second "baseline" by it refused. |
| acknowledgement | a random flag, another class, another fee, another month, a `remove` ack used for an insert, a replay of an earlier transaction's real override: all HC120; the acknowledged row passes; A-8 (stored T1, write T2) -> HC011. |
| mirror | an admin typing a fee (the old screen) -> HC120 naming the fee history; a settings save with the fee unchanged passes, also with the mirror out of level; the service role HC120; the owner passes with an event; bringing it level passes; class creation unguarded. |
| who | teacher, parent, service role: preview and checked 42501. |
| bad args | unknown op, not the 1st, no fee, negative, fractional, no class, month 13, an unknown class. |
| HC050 | mirror guard disabled, history guard disabled: nothing written, no override. |
| calculators (bundled, esbuild) | calculate-tuition and -bulk: October at October's fee, November at the new fee, `class_breakdown[].session_rate_vnd` the month's fee; a class with no row -> the mirror; no table (PGRST205, 42P01) -> the mirror, as before; any other read error fails the call; a frozen bill reports its saved figures whatever the history says. projected-per-class: dated, baseline = count x mirror, no table, error throws. `_lib/class-fee.ts` unit cases; imports nothing; each reader reads the history once and prices each lesson through `classFeeOn`. |
| screen | `src/lib/classFee.ts` (labels, next month, list layout, `parseFee`, refusal wording, summary); `ClassSettings` writes no fee and mounts the history; `ClassFeeHistory` writes only through the money guard and prices nothing. |
| golden gate | see below. |
| rollback 3 | the mirror brought level for every class first; the two guards gone, the table, rows and other three triggers stay; the checked path HC050; the fee field writes again; safe twice; the migration pastes again and both guards are back. |

### The golden gate

`fixtures/tuition-figures.golden.json` through the UNEDITED `invoice-status.test.mjs` (its 18 fixtures, response and saved figures, first call and repeat), with `d4-class-fee-golden-hook.mjs` deciding what `class_fee_history` answers:

| State of the history | invoice-status | golden assertions | history reads |
|---|---|---|---|
| no table (PGRST205: functions deployed before the paste) | 268 passed, 0 failed | 36 / 36 PASS, byte-identical | 332 |
| baseline rows (what the migration writes) | 268 passed, 0 failed | 36 / 36 PASS, byte-identical | 664 |
| baseline + a row from 2027-01-01 at 999,999 (after every billed month) | 268 passed, 0 failed | 36 / 36 PASS, byte-identical | 664 |
| negative control: a row from 2026-10-01 at fee + 30,000 | 155 passed, 113 failed | plain month FAILS (the gate sees the history); the frozen bill's saved figures and the month with no lessons still PASS | 672 |

And the `run.mjs` entry of `invoice-status` itself (the stand-in's empty table: no row for any class -> the mirror) stays 268 / 0. The golden file's md5 is the same before and after the four runs (nothing regenerated it).

## Mutations (`node scripts/pgtest/d4-mutants.mjs K01 ... K32`)

| Mutant | Breaks | Verdict (first failing assertion of `d4-class-fee`) |
|---|---|---|
| K01 | the fee resolver takes the newest row regardless of date | CAUGHT: class_fee_on: before the first dated row -> the baseline |
| K02 | a fee row need not start on the first of a month | CAUGHT: a row not on the first of a month is refused by the table (CHECK) |
| K03 | refresh_pairs of a fee row include months before its date | CAUGHT: preview: T0, allowed, no reason asked |
| K04 | the window runs past the next row | CAUGHT: a child whose only mark there is Excused is not reached |
| K05 | the design's literal 'T0 passes': a raw T0 write by the service role leaves no override row | CAUGHT: the service role, a fee from next month (T0): HC120 - only the checked op writes fee rows |
| K06 | the service role is let through on the history | CAUGHT: the service role, a fee from next month (T0): HC120 - only the checked op writes fee rows |
| K07 | the acknowledgement does not check the fee written | CAUGHT: an acknowledgement of this class and month at another fee -> HC120 |
| K08 | the acknowledgement does not check the op | CAUGHT: a "remove" acknowledgement used to insert -> HC120 |
| K09 | the acknowledgement's tier is not compared (A-8) | CAUGHT: A-8: an acknowledgement stored at T1 against a write that reaches T2 -> HC011 token_stale |
| K10 | the 1900 row may be deleted | CAUGHT: the 1900 row is never deleted - HC121 baseline_row, even for the owner |
| K11 | a fee row may change class or month | CAUGHT: a row cannot change month - HC121 fee_row_identity, even for the owner |
| K12 | the mirror takes any value | CAUGHT: an admin typing a new fee into the class (the old settings screen) -> HC120 "change the fee from the fee history" |
| K13 | the mirror guard fires on a save that sends the fee unchanged | CAUGHT: with the mirror out of level, saving the other settings (fee sent unchanged) still passes: the guard fires only on a change |
| K14 | a fee change that moves no fee is still judged by its reach | CAUGHT: a note-only change moves no fee: T0, allowed |
| K15 | the exec does not bring the mirror level | CAUGHT: the fee is in force from that month: the mirror follows the history for today |
| K16 | the exec writes with the mirror's guard switched off | CAUGHT: the mirror guard disabled -> HC050, no row, no override |
| K17 | an Excused mark counts as reached | CAUGHT: a child whose only mark there is Excused is not reached |
| K18 | any trigger-made write passes (not only the baseline and the cascade) | CAUGHT: a fee row written by some other trigger (depth 2) on the service lane -> HC120 |
| K19 | the owner lane leaves no event | CAUGHT: the owner, a fee dated in a paid past month: passes AND leaves an owner_lane event with the tier and the months to refresh (A-1) |
| K20 | preflight no longer checks the 1b bodies | CAUGHT: a _money_ack that is not the reviewed 1b body -> refused, naming it |
| K21 | preflight compares the raw md5 (a CRLF paste of 1b refused) | CAUGHT: the same 1b body pasted with CRLF is accepted (md5 of the CR-stripped text) |
| K22 | a fee function callable by authenticated | CAUGHT: nobody may call any of them directly (anon, authenticated, service_role): the fee is changed through money_change_checked |
| K23 | authenticated may insert into the history | CAUGHT: table: RLS on; authenticated SELECT only (no write grant, no write policy); anon nothing; service_role the house-rule ALL |
| K24 | TRUNCATE of the history allowed | CAUGHT: TRUNCATE of the history is refused (HC121), even for the owner |
| K25 | the baseline is not inserted for existing classes | CAUGHT: the baseline: one 1900-01-01 row per class, at the fee it has today (0 included) |
| K26 | calculate-tuition prices every lesson at the mirror again | CAUGHT: calculate-tuition: October at the October fee (2 x 100,000), November at the new fee (2 x 120,000) |
| K27 | calculate-tuition-bulk prices every lesson at the mirror again | CAUGHT: calculate-tuition-bulk: October at the October fee (2 x 100,000), November at the new fee (2 x 120,000) |
| K28 | projected-per-class at the mirror again | CAUGHT: dated: October projected at the October fee (2 x 100,000) |
| K29 | classFeeOn takes the newest row regardless of the lesson's date | CAUGHT: calculate-tuition: October at the October fee (2 x 100,000), November at the new fee (2 x 120,000) |
| K30 | any history read error is taken for 'no table' (the past silently at today's fee) | CAUGHT: any other read error fails the call instead of pricing the past at today's fee |
| K31 | a missing table by code alone is not recognised | CAUGHT: section "projected-per-class (the sibling winner's projection)" ran to the end without an unexpected error |
| K32 | the class breakdown reports the mirror, not the month's fee | CAUGHT: calculate-tuition: class_breakdown[].session_rate_vnd is the month's fee |

32 mutants (K01-K25 of the migration, K26-K32 of the three readers and `_lib/class-fee.ts`, mutated in place and restored byte for byte): **32 caught on the first run, 0 survivors.** Not written as a mutant: dropping `s.status <> 'Canceled'` from the reach - equivalent today, the cancelled-lesson attendance guard (20261027090000) keeps a cancelled lesson's marks Excused, so no billable mark can sit on one.

## Fingerprints (md5 of the body with CR removed, as `D4-release-fingerprint.sql` computes them)

| Function | md5_prosrc | definer | volatility |
|---|---|---|---|
| `class_fee_on(uuid, date)` | f266a26b22e6b19929dafda7095c9813 | no | STABLE |
| `_class_fee_reach(uuid, date, integer, integer)` (after OQ-1) | b7fe1e41baf0e4ac3885a03f3d61c610 | yes | STABLE |
| `_class_fee_money_guard()` | 3e70d6360ab94d607afaedd170bf6874 | yes | VOLATILE |
| `_class_fee_no_truncate()` | 00f8dc0e3348e24f0e05dc76f3184863 | no | VOLATILE |
| `_class_fee_baseline()` | 636435cd6ddb337af51aaa44f1236d5f | yes | VOLATILE |
| `_class_fee_mirror_guard()` | afe1b71e4bd26f26c6148bbdccbe592c | yes | VOLATILE |
| `_money_plan__class_fee(text, jsonb, uuid)` | e15ee2320eddaf4736c6e360f3f534fb | yes | STABLE |
| `_money_exec__class_fee(jsonb, uuid)` | 9f2652c351c57cf7b6db0433d67ad8fc | yes | VOLATILE |

| Trigger | md5(pg_get_triggerdef) |
|---|---|
| `class_fee_history.zz_class_fee_money_guard` | 0d8858af6a18085f2ff2acb6712f2eaa |
| `class_fee_history.class_fee_history_no_truncate` | 61eda79b56f2d525bcebc4c8f4004740 |
| `class_fee_history.audit_class_fee_history` | 8117d39b76a1096e9f4aeb25dd8ea916 |
| `classes.class_fee_baseline` | 8fcb71f5d113ec68ddfd9c5af6ded9a7 |
| `classes.zz_class_fee_mirror_guard` (after F-4) | ebf1bd33b96da6dc97d67da86b06aafe |

All of them, the table's columns, constraints, policy and privileges are in `docs/evidence/D4-release-fingerprint.expected.json` (paste `D4-release-fingerprint.sql` after the migration and compare). `guard-fingerprint.mjs --check-unchanged`: of the 66 D-release objects only the two functions 1a replaced differ; `--after-rollback` (rollbacks 3, 2, 1, then D2 again): 66 of 66.

Edge function files (md5 of the file with CR removed), for the deploy check:

| File | md5 (CR removed) |
|---|---|
| `supabase/functions/_lib/class-fee.ts` (after F-1) | 6a6d2167918057c6dc9c8c96e108cf1b |
| `supabase/functions/calculate-tuition/index.ts` | c27f77a305aea9db083611fd6c41aaae |
| `supabase/functions/calculate-tuition-bulk/index.ts` | 8cb94f345403c4f28a8f38aee8986a5e |
| `supabase/functions/_lib/projected-per-class.ts` | a66a4e346e5d62d5646cce7b99cf34cf |
| `supabase/functions/watch-sibling-threshold/index.ts` (unchanged; redeploy so it bundles the new `_lib`) | c9b9f9f58fa1cac1496f0bfefc693b95 |

## Rollback (f.7 row "ROLLBACK-d4-3-class-fee.sql")

1. Paste `scripts/ROLLBACK-d4-3-class-fee.sql`: in one transaction it sets `classes.session_rate_vnd = class_fee_on(id, today)` wherever that differs (the mirror level, so a calculator of before step 2 prices as the history does today), then drops `zz_class_fee_money_guard` and `zz_class_fee_mirror_guard`. Its result set must show `d4_class_fee_guards_left = 0`, `mirror_differs = 0`.
2. Only if the resolver itself is at fault: redeploy the previous `calculate-tuition`, `calculate-tuition-bulk` and `watch-sibling-threshold` (the only importer of `_lib/projected-per-class.ts`). The step 2 functions keep working without the triggers (they only read the table).
3. The screen keeps working read-only in effect: any fee change answers HC050 ("the safety check is switched off"); the old field is gone, so the fee is then changed by the owner in the SQL editor until step 2 is re-pasted. Re-pasting the migration restores both triggers (tested).
What stays: the table and its rows (history, never dropped), `class_fee_baseline`, the no-truncate and audit triggers, every function.
Symptom that means "roll back": saving a new fee, or a class's settings, fails with `zz_class_fee_money_guard` / `zz_class_fee_mirror_guard` / `money_change_requires_checked_path` when it should not, or a bill is priced at a fee the history does not show.

Apply order (the design's): migration first, then `calculate-tuition`, `calculate-tuition-bulk`, `watch-sibling-threshold` (they read the history; before the paste they fall back to the mirror, so they may also go first), then the screens. Between the migration and the screens, the OLD ClassSettings' fee field is refused with HC120 when the fee is changed (other settings save as before); between the screens and the migration (wrong order) the new Fee history says "not installed" and no fee can be changed - fail closed.

## Decisions the design left open (FOR THE REVIEWER)

1. **Stricter than b.4's "T0 pass".** A direct write to `class_fee_history` passes only with this transaction's acknowledgement, as the owner, or as the two triggers' own writes - at ANY tier. b.4 says "T0 pass", but nobody but `service_role` (and definer functions) can write the table at all, and no legitimate writer exists outside the checked op; refusing T0 too means every fee row has an override row (who, when, why, before / after). Mutant K05 pins it.
2. **The mirror guard is about the value, not the caller.** c.3 says "owner or ack 'class_fee', else HC120". Built: a value equal to `class_fee_on(class, today)` passes from anyone (it changes no bill - the calculators read the history - and it is all the checked op ever writes), the owner passes with an event, anything else HC120. So an acknowledgement cannot set the mirror to anything else either, and anyone may bring a stale mirror level.
3. **The mirror goes stale at a month turn.** When a fee dated next month comes into force, `classes.session_rate_vnd` still shows the old fee until the next checked change of that class. The three calculators do not read it. The readers that still do: `useFinanceOverview` / `useFinanceSummary` (browser estimates that predate D4 - not tuition figures), `OperationalReports`, `AddSessionModal` / `ModifyEnrollmentModal` / `EnrollmentRateEditor` / class lists (display), and the SQL view `v_projected_base` (used only as a gate in `projected-per-class` and by `_lib/projected.ts`). Not built: a monthly `UPDATE classes SET session_rate_vnd = class_fee_on(id, today) WHERE ...` (the guard lets it through) - a cron job or the screen could run it; the conductor's call.
4. **One line of calculate-tuition left unchanged on purpose:** the "Rate Adjustment" discount line's DISPLAY fields (`defaultRate`, `savingsPerSession`, index.ts line 348) read `sessions[].classes?.[0]?.session_rate_vnd`, which is 0 for the object PostgREST returns - a pre-existing display defect (the amount, `savings`, is priced per lesson through `classFeeOn`). Fixing it changes the golden response of the "rate override below the class rate" fixture, so it is left for its own task.
5. **Who reads the history:** admins only (fix round F-3; was admins and teachers). Authenticated has SELECT only - no INSERT / UPDATE / DELETE grant, unlike AGENTS.md's general line for new tables, because no browser writes this table (as 1b's tables).
6. **Guards the design did not list, all fail-closed:** identity (HC121 `fee_row_identity`), the baseline row (HC121 `baseline_row`), TRUNCATE (HC121), all on every lane including the owner's; the depth exemption narrowed to the two writes this file's triggers make; the generic audit trigger on the history (the owner's writes have no override row).
7. **`set` of the 1900 row is allowed through the checked path** (a correction of the starting fee: it reaches the whole history, so it is T2 / T3 in practice). The screen does not offer it.
8. **`nothing_to_change`** also refuses a new row whose fee equals the fee already in force from that month (a row that would change nothing).
9. **A change that moves no fee** (a note) reaches nothing (T0) even in a confirmed month.
10. **(Superseded by fix round S-2.)** The screen at T0 saved without a dialog (the button names the month; the line under it says what happens: "nothing already billed changes" / "this month's bills are worked out again" / "this corrects bills already worked out"). It still writes its override row, and refreshes the bills in `refresh_pairs` (a row from the current month with bills) through `guarded-change-refresh`.
11. **`MoneyGuardDialog` gained three optional props** (`title`, `intro`, `submitLabel`). The design says the shared dialog pieces were finished in 1b; the change is additive and the register's dialog renders exactly as before.
12. **HC015 refuse codes of this entity (`baseline_row`, `not_found`, `no_baseline`) are not in `_lib/session-guard.ts`'s HC015 map** (no later step edits that file); no edge function calls the class-fee op, and the screen words them itself (`CLASS_FEE_REFUSALS`).
13. **`d4_guard_status()` (1b) does not list the two new guard triggers** (not re-created). The migration's result set and the fingerprint show them. Step 4/5 may extend the card.
14. **`admin-data-import`** (service key, `classes` still on its whitelist until step 3B's G-20) is refused with HC120 when an imported class row carries a CHANGED `session_rate_vnd` (an unchanged one does not fire the guard).
15. The advisory-lock key serialises every class-fee change of the school (above).

## Not verified

The live database (nothing read or written). The screens were type-checked and their logic tested, not rendered. The functions were bundled and driven over a stand-in for PostgREST, not deployed. `npm run test:bun`: run (159 pass, 0 fail, 12 files) - its suites do not touch step 2.
