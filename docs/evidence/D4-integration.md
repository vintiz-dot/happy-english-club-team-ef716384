# D4 integration: steps 2 -> 3A -> 3B in one tree

Where I am / next step: merges, chain suite, brief, oracle stand-in fix, screens-alone proof done and committed. Running: mutants (step 2 + 3A runner, then 3B's two), then bun and the final full run.

Branch `d4-integration` = conductor `claude/hec-conductor-setup-efbaa5` 344cbf38 (it already carries 3A, `d4-3a-fix` 965a9f0c, on top of everything live) + `git merge worktree-agent-a36ad2752b190053b` (step 2, 2ef7adab) + `git merge d4-3b-fix` (3B, 4e5b70f8). Pglite only: nothing applied, deployed or pushed; no live database contacted; no real data.

The three migration files are byte-identical (LF md5) to the reviewed heads: 092000 `dbdf981e...`, 093000 `8e3c73a0...`, 094000 `7b0bc8f4...`.

## Conflicts and how each was resolved

Merge 1 (step 2 into the conductor, which has 3A). Screens, functions and `d4-prelude.mjs` merged cleanly (no file of step 2 was touched by the conductor since c132bf7b, where step 2 was cut).

| File | Conflict | Resolution |
|---|---|---|
| `scripts/pgtest/run.mjs` | both added entries after "money guard lib" | both kept, in migration order: `d4 class fee` (expect 174, step 2's pin) then 3A's `d4 lesson pay` 143 / `d4 functions lessons` 74 / `d4 stars interplay` 19 |
| `scripts/pgtest/guard-fingerprint.mjs` | `D4_FILES` and the after-rollback list | `D4_FILES` = 090000, 091000, 092000, 093000; rollbacks newest first 4, 3, 2, 1; step 2's `D4_CLASS_FEE` in the d4 prelude and in `checkUnchanged` kept |
| `scripts/pgtest/d4-mutants.mjs` | constants, SUITES, mutant lists, the file-mutant branch | `FEE` / `ROLLBACK3` beside `LESSON` / `ROLLBACK4`; suite `fee` beside `lesson` / `fnles` / `stars`; step 2's K01-K36 and V01-V05 inserted before 3A's L01-L39 / FL1-FL7 (167 mutants, no duplicate id); the migration-mutant branch serves CORE, LESSON and FEE |
| `docs/evidence/D4-release-fingerprint.{sql,expected.json}` | generated | NOT hand-merged: regenerated (`--release d4`): 58 functions, 27 triggers, 7 relations; against 3A's file additions only (step 2's 14 objects), against step 2's file additions only plus 3A's `d4_guard_status` |

Merge 2 (3B). 3B was cut from 02b571e6; the conductor changed one of its files since (`FamilyDetail.tsx`, 0906c591 "removing a child from a family asks first").

| File | Conflict | Resolution |
|---|---|---|
| `scripts/pgtest/run.mjs` | 3B's four entries vs step 2 / 3A's | all kept; 3B's after 3A's (migration order): `d4 money inputs` 308, `d4 functions inputs` 62, `d4 reach oracle` 200, `money inputs lib` 43 (3B's pins) |
| `src/pages/FamilyDetail.tsx` | conductor: "Remove" opens `ConfirmDestructiveDialog`, then a raw `students.update({family_id: null})`; 3B: "Remove" runs `money.run(family_link / set_family)` with `MoneyInputDialog` | both intents: Remove asks first (the conductor's dialog, its classNames and wording kept, one sentence added: "If this reaches a month already taught or billed, you are asked for a reason next."); on confirm the removal goes through 3B's checked change (tier 0 at once, tier 1+ the reason dialog); the raw write is gone (3B's static scan `money inputs lib` requires that) |
| `guard-fingerprint.mjs` (no textual conflict: 3B never touched it) | file 5 missing from the tooling | added: `D4_FILES` ... 094000; rollbacks 5, 4, 3, 2, 1; the d4 prelude gains 3B's tables (`D4_ENROLMENT_RPCS + D4_INPUTS`, before `D4_CLASS_FEE`, which is `IF NOT EXISTS`) and the baseline the live migrations 3B's preflight reads (invoice freeze, enrolment RPCs, pause, deactivation - all live before D4); `checkUnchanged` installs them whatever prelude its caller passes (`D4_INPUTS` once: it is not idempotent) |
| fingerprint files | generated | regenerated: 99 functions, 46 triggers, 7 relations; against merge 1's file additions only (3B's 60 objects) plus 3B's `_money_enrollment_rpc_call`; every 3B md5 equals `D4-build-3b.md`'s fix-round table |

`d4-mutants.mjs` needed nothing for 3B (its mutants are in `d4-mutants-3b.mjs` / `review3b-mutants.mjs`). `d4-prelude.mjs` only had step 2's addition.

## The apply chain (pins)

No step replaces a body another step pins (table in the brief). 3A pins 1b's `d4_guard_status`; neither step 2 nor 3B pins or replaces it, so no pin needed fixing. 3B's pin of `_money_enrollment_rpc_call` accepts 1b's or its own body. Proved by `scripts/pgtest/d4-apply-chain.test.mjs` (registered in `run.mjs`).

## A real interaction found by the merged run, and its fix

First full run on the merged tree (before the fix): every suite green except two.
- `d4 reach oracle` (3B) 20 / 101: with step 2 merged, the REAL `calculate-tuition` / `compute-sibling-discounts` the oracle bundles read `class_fee_history` (directly and through `_lib/projected-per-class.ts`). The oracle's database does not load 092000 and runs each edit inside a transaction; the stand-in's failed SELECT (42P01, which `isMissingFeeHistory` rightly reads as "no table") aborted that transaction (25P02), so every later read failed. Not a product fault: on live each PostgREST request is its own statement and a missing table aborts nothing. Fix (7529263d, test stand-in only): when the table is absent the stand-in answers an empty history (every lesson at the mirror, exactly what a missing table does). Re-run alone: **200 passed, 0 failed** (3B's pin). No guard, calculator or migration changed.
- `d4 floors` (1a) 212 / 2: "C-1 move: the fixture call succeeds" and the floor case after it - the known clock edge (`clock(0, 3)` + 1 hour crosses midnight after 20:00 Hanoi; the run was at ~20:15). Not changed. Re-run alone with the process clock moved back 8 hours (scratch `--import` preload; pglite reads the JS clock): **213 passed, 0 failed**.

## Results

- `d4 apply chain` (new, `scripts/pgtest/d4-apply-chain.test.mjs`, pinned 238): **238 passed, 0 failed** - plan order with every later preflight's pins checked before each paste; each step alone; all six orders; plan order as CRLF; second pastes; fingerprint after each paste; step 2 + 3B together on `classes`; rollbacks 5, 4, 3 -> 1b (only `d4_guard_status` / `_money_enrollment_rpc_call` differ, by design), 1b re-paste -> exact, re-install, rollbacks 5..1 + D2 -> D release identical; each step's own rollback after it alone.
- Fingerprint: `--release d4` regenerated (99 functions, 46 triggers, 7 relations); `--release d4 --check` up to date; `--check` (D release) up to date; `--check-unchanged` only the two 1a-replaced functions differ; `--check-unchanged --after-rollback` (rollbacks 5, 4, 3, 2, 1 + D2) 66 of 66.
- Screens alone (`tsc --noEmit -p tsconfig.app.json` with the other steps' `src/` files at their pre-step text, new files removed, then `git checkout HEAD -- src`): only step 2's screens (46 files reverted) exit 0; only 3A's (32 reverted) exit 0; only 3B's (22 reverted) exit 0; none of them (50 reverted) exit 0; ~900 src files loaded each time; src clean after each.
