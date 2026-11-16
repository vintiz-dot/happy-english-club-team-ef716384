# Brief: apply D4 steps 2 (dated class fees), 3A (lessons) and 3B (money inputs) on the LIVE project

Not authorised by this file. Each step needs the owner's go-ahead; nothing here has been applied, deployed or pushed. Live project id: `aswgmbefikhsnhogtryv`. Production database, real children, real money: class fees and enrolments decide tuition, lessons decide teacher pay. Do EXACTLY these steps, in this order, and nothing else. If any check differs from what is expected, STOP immediately, change nothing further, and report.

Source: branch `d4-integration` (conductor `claude/hec-conductor-setup-efbaa5` 344cbf38 + step 2 `2ef7adab` + step 3B `4e5b70f8`; 3A `965a9f0c` was already in the conductor). The three migration files are byte-identical (LF md5) to the reviewed heads. Supersedes `D4-3a-live-apply-brief.md` (its mark-attendance "before" copy was v4; live is v5 since the streak fix - corrected below) and the apply notes in `D4-build-2.md` / `D4-build-3b.md`.

Steps 1a and 1b are live and verified (`D4-1b-live-apply.md`). The order is **2 -> 3A -> 3B**, each in its own sitting OUTSIDE teaching hours, each one: pre-checks, the owner's paste, post-checks, functions at once, screens with the next Cloudflare deploy. Any step can be held back: each pastes alone on 1a + 1b and in any order (proved, below). A held-back step is applied later with its own section unchanged.

## How it was proved (pglite, the real files)

`scripts/pgtest/d4-apply-chain.test.mjs` (in `run.mjs`): on 1a (pasted CRLF, as live) + 1b, with the live migrations before D4 as the baseline:
- the planned order 2 -> 3A -> 3B pastes; BEFORE each paste every file still to come finds every one of its pins (the CR-stripped md5 literals of its preflight) as it expects; after each paste the D4 fingerprint is exactly the expected JSON for the objects present (the only differences allowed: the two 1b bodies a later step replaces, while that step is not yet pasted);
- each step pastes ALONE on 1a + 1b; all six orders paste; the plan order pasted with CRLF gives the same bodies;
- after all three, each file pastes a second time (idempotent), and the fingerprint is the expected JSON exactly (99 functions, 46 triggers, 7 relations);
- with step 2 and 3B both on `classes`: a new class gets its 1900 fee row; a class with no enrolment is deleted and its fee rows cascade; a class with an enrolment is refused (HC121); an owner's fee typed on the class passes step 2's mirror guard;
- rollbacks 5, 4, 3 -> the 1b fingerprint as live (`scripts/pgtest/fixtures/d4-1b-live-fingerprint.*`, the files at b27bbf06), every 1a / 1b object identical except the two 1b bodies 3A and 3B replaced, which their rollbacks leave by design (`d4_guard_status`: 3A's; `_money_enrollment_rpc_call`: 3B's); re-pasting `20261114091000` then gives 1b exactly; the three steps paste again after that; rollbacks 5, 4, 3, 2, 1 and D2 again -> the D release, every object identical. Each step's own rollback after it alone -> 1b (differing only in the body that step replaced).

**The pins, and why the chain holds.** No step replaces a body another step pins:

| file | pins (CR-stripped md5) | replaces |
|---|---|---|
| 2 `20261114092000` | `_caller_lane` 66001c3b, `tuition_month_state` 73384021, `tuition_reach` d48607bb, `_money_ack` 471a5563, `_money_change_plan` 3efa9ebc, `_money_change_exec` b5efef0f, `_money_change_apply` 7f03dfff (all 1a / 1b) | nothing |
| 3A `20261114093000` | `_caller_lane`, `_lesson_in_free_week` 4e8eac60, `_money_ack`, `_money_change_plan`, `_money_change_exec`, `payroll_reach` 5ccecd82; `d4_guard_status` = 1b's df2b7052 (with 3A's insertion removed, so its own second paste passes) | `d4_guard_status` (1b) |
| 3B `20261114094000` | `_caller_lane`, `_money_ack`, `tuition_reach`, `tuition_month_state`, `payroll_reach`; `_money_enrollment_rpc_call` = 1b's 8796eb02 OR 3B's b63e90a3 | `_money_enrollment_rpc_call` (1b) |

Neither step 2 nor 3B pins or replaces `d4_guard_status`, so 3A's pin of 1b's body holds in every order; no pin needed changing. Consequence, said plainly: `d4_guard_status()` (the status card) lists the 1a / 1b triggers and 3A's three, NOT the five of step 2 or the nineteen of 3B (both build docs flag it). A later replace that adds them must pin 3A's body (932bc6aa), not 1b's.

## Rules (all three steps)

- First action of each sitting: create `docs/evidence/D4-<step>-live-apply.md` (`D4-2-live-apply.md`, `D4-3a-live-apply.md`, `D4-3b-live-apply.md`) with a "Where I am / next step" line and commit; append each result and commit after each part.
- md5 is ALWAYS of the text with CR removed: function bodies `md5(replace(prosrc, E'\r', ''))`, files the LF blob. Live 1a was pasted with CRLF; a raw md5 would stop a healthy database.
- Every file sent or pasted comes from the integration head, byte for byte, LF line endings. Record the LF md5 of each.
- **OWNER PASTE** marks the only writes to the database: the owner pastes the named file into the Supabase SQL editor (AGENTS.md: the owner applies migrations by hand). Everything else in "pre-checks" and "post-checks" is a read-only catalog query or a count (Supabase MCP `execute_sql`); never a row about a child. Functions: `deploy_edge_function`, `get_edge_function`, `list_edge_functions`.
- Never print or read a secret. No push except the screens' normal deploy, per "Screens" of each step.
- Each migration starts `SET LOCAL lock_timeout = '5s'`: a lock-timeout error installs nothing; wait a minute, paste again. A preflight refusal (`... cannot be installed; missing: ...`) installs nothing: STOP, report verbatim.

### The shared read-only checks

**C1 - the pins** (paste as is; every row must say `ok = true`, except as the step says):

```sql
SELECT t.sig, md5(replace(p.prosrc, E'\r', '')) AS live_md5, t.want, md5(replace(p.prosrc, E'\r', '')) = ANY (t.want) AS ok
FROM (VALUES
  ('public._caller_lane()', ARRAY['66001c3b6eb716a6380e4155fba75409']),
  ('public._lesson_in_free_week(date, time without time zone, time without time zone)', ARRAY['4e8eac6021039710f90d12805c2c041d']),
  ('public._money_ack(text[], uuid, uuid, date, date, integer)', ARRAY['471a55638387068f1279a2d7c669c4c4']),
  ('public._money_change_plan(text, text, jsonb, uuid)', ARRAY['3efa9ebcb79c47c65947f2636e07edd0']),
  ('public._money_change_exec(text, jsonb, uuid)', ARRAY['b5efef0f546d40e397daa3fd0648db06']),
  ('public._money_change_apply(text, text, jsonb, text, text, boolean, text, jsonb, text, uuid)', ARRAY['7f03dfffb2532174d6d8ed9733f5fd7f']),
  ('public.tuition_month_state(uuid, text)', ARRAY['733840210ed1f3360fb9c3122d5466b9']),
  ('public.tuition_reach(uuid[], uuid, date, date)', ARRAY['d48607bb917eb05de1acd586e0c83b4f']),
  ('public.payroll_reach(uuid, uuid, date, date)', ARRAY['5ccecd82b3d859cb5ec37f4b0ac7973f']),
  -- 1b's body, or 3A's once 3A is live:
  ('public.d4_guard_status()', ARRAY['df2b7052707d4a8d06bdc307e6fe96a9', '932bc6aa9eded89d1faa16bdb3f54577']),
  -- 1b's body, or 3B's once 3B is live:
  ('public._money_enrollment_rpc_call()', ARRAY['8796eb026e4187149b639f7efa82e81d', 'b63e90a3ef684c6e32c800401194e809'])
) AS t(sig, want)
LEFT JOIN pg_proc p ON p.oid = to_regprocedure(t.sig)
ORDER BY 1;
```

Record which of the two md5s `d4_guard_status` and `_money_enrollment_rpc_call` show: df2b7052 / 8796eb02 = 3A / 3B not live yet; 932bc6aa / b63e90a3 = live. Anything else, or a NULL `live_md5`: STOP.

**C2 - the D4 fingerprint.** Run `docs/evidence/D4-release-fingerprint.sql` (one SELECT, read-only, LF md5 `ed0baa219479903b9573c9487961235f`); compare with `docs/evidence/D4-release-fingerprint.expected.json` (LF md5 `32ad08df0049a714f7feaf39dde34717`) object by object. Rule: every object PRESENT on live equals its expected entry, except `d4_guard_status` (expected 932bc6aa) while 3A is not live and `_money_enrollment_rpc_call` (expected b63e90a3) while 3B is not live; the objects of a step not yet pasted are absent; no object is extra. Counts present (functions / triggers / relations): 1a + 1b = 41 / 19 / 6; step 2 adds 8 / 5 / 1; 3A adds 9 / 3 / 0 (+ its replaced `d4_guard_status`); 3B adds 41 / 19 / 0 (+ its replaced `_money_enrollment_rpc_call`). All three: 99 / 46 / 7. This is exactly what `d4-apply-chain` asserts after each paste. If only a trigger's `md5_def` differs, print its `pg_get_triggerdef` and compare with the file by eye; report, do not repair. A body md5 or a privilege different: paste the same file once more (idempotent), compare again; still different: STOP.

**C3 - the D release.** `docs/evidence/D-release-fingerprint.sql`: 64 of 66 identical, exactly `_session_change_assess` / `_session_erased_recently` different (as after 1a). None of the three steps touches a D-release object.

**C4 - counts** (numbers only): `classes`, `class_fee_history` (if it exists), `sessions`, `session_participants`, `attendance`, `enrollments`, `discount_assignments`, `discount_definitions`, `referral_bonuses`, `staff_pay_rates`, `invoices`, `families`, `students`, `money_change_overrides`, `money_change_events`. None of the three pastes changes a row, except step 2's baseline (one 1900-01-01 `class_fee_history` row per class) and one `guard_installed` event per paste of 3A or 3B.

**C5 - jobs.** `select jobname, active from cron.job`: record; start the paste just after a `stars-sync` tick.

---

## STEP 2 - dated class fees (G-16)

What it is (`D4-build-2.md`, review `D4-2-review.md`, fix round at its end): the table `class_fee_history` (a 1900-01-01 baseline row per class at today's fee), `class_fee_on`, five triggers (`class_fee_history.zz_class_fee_money_guard`, `.class_fee_history_no_truncate`, `.audit_class_fee_history`, `classes.class_fee_baseline`, `classes.zz_class_fee_mirror_guard`), the `class_fee` entity of 1b's checked path (`set`, `remove`). Replaces nothing. The fee is then read per lesson from the history by the three calculators.

### 2.1 Pre-checks (read-only)

1. C1: every row ok. C2: present = 41 / 19 / 6 plus 3A's / 3B's objects if they are already live; none of step 2's 14 objects.
2. Nothing of step 2 exists: `select to_regclass('public.class_fee_history')` NULL; `select to_regprocedure('public.class_fee_on(uuid, date)')` NULL; `select count(*) from pg_trigger where tgname in ('class_fee_baseline','zz_class_fee_mirror_guard','zz_class_fee_money_guard','class_fee_history_no_truncate','audit_class_fee_history')` = 0.
3. Its preflight refuses a negative fee: `select count(*) from public.classes where session_rate_vnd < 0` = 0 (else STOP). Record `select count(*) from public.classes` (the baseline rows to expect).
4. The functions as live now equal the copies the rollback returns to (`get_edge_function`, CR removed, md5 of each file):

| function | file | expected LF md5 (bytes) | rollback copy |
|---|---|---|---|
| calculate-tuition | index.ts | cf45c883375fc13b8217f7dd01606713 (31656) | `docs/evidence/D4-int-rollback-before/calculate-tuition/index.ts.txt` |
| calculate-tuition-bulk | index.ts | 076b11c69790b76949ecba9572389a84 (20126) | `.../calculate-tuition-bulk/index.ts.txt` |
| watch-sibling-threshold | index.ts | c9b9f9f58fa1cac1496f0bfefc693b95 (5434) | unchanged |
| watch-sibling-threshold | _lib/projected-per-class.ts | 26670adda9b1e7d88d6619b21d72955f (3261) | `.../_lib/projected-per-class.ts.txt` |

   The copies are the text at 344cbf38. If a live file differs: STOP - save the live text, report; the rollback copy would not be what is live.
5. C4, C5.

### 2.2 OWNER PASTE - the migration

The owner pastes the exact LF content of `supabase/migrations/20261114092000_d4_class_fee_history.sql` (LF md5 `dbdf981ecb5c4551dce1660810eb7ab5`, 32446 bytes) into the SQL editor and runs it once. The result set must show `class_fee_triggers` = the five triggers `=O`, `baseline_rows` = `classes` (= the count of 2.1.3), `mirror_differs` = 0.

### 2.3 Post-checks (read-only)

1. C2: step 2's objects present and equal to (the rest unchanged):

| kind | object | md5 (prosrc CR removed / triggerdef) | secdef | vol | EXECUTE anon/auth/service |
|---|---|---|---|---|---|
| function | `_class_fee_baseline()` | 636435cd6ddb337af51aaa44f1236d5f | true | v | f/f/f |
| function | `_class_fee_mirror_guard()` | afe1b71e4bd26f26c6148bbdccbe592c | true | v | f/f/f |
| function | `_class_fee_money_guard()` | 3e70d6360ab94d607afaedd170bf6874 | true | v | f/f/f |
| function | `_class_fee_no_truncate()` | 00f8dc0e3348e24f0e05dc76f3184863 | false | v | f/f/f |
| function | `_class_fee_reach(uuid, date, integer, integer)` | b7fe1e41baf0e4ac3885a03f3d61c610 | true | s | f/f/f |
| function | `_money_exec__class_fee(jsonb, uuid)` | 9f2652c351c57cf7b6db0433d67ad8fc | true | v | f/f/f |
| function | `_money_plan__class_fee(text, jsonb, uuid)` | e15ee2320eddaf4736c6e360f3f534fb | true | s | f/f/f |
| function | `class_fee_on(uuid, date)` | f266a26b22e6b19929dafda7095c9813 | false | s | f/f/f |
| trigger | `class_fee_history.audit_class_fee_history` | 8117d39b76a1096e9f4aeb25dd8ea916 | | | O |
| trigger | `class_fee_history.class_fee_history_no_truncate` | 61eda79b56f2d525bcebc4c8f4004740 | | | O |
| trigger | `class_fee_history.zz_class_fee_money_guard` | 0d8858af6a18085f2ff2acb6712f2eaa | | | O |
| trigger | `classes.class_fee_baseline` | 8fcb71f5d113ec68ddfd9c5af6ded9a7 | | | O |
| trigger | `classes.zz_class_fee_mirror_guard` | ebf1bd33b96da6dc97d67da86b06aafe | | | O |
| relation | `class_fee_history` | RLS on; one policy `class_fee_history_admin_read`; authenticated SELECT only; anon none; service_role all 7 | | | |

2. C3 64 / 66. C4: only `class_fee_history` new (= classes); every other count unchanged.

### 2.4 Functions (deploy straight after 2.3)

Each with its `index.ts` and every relative import, recursively, `verify_jwt` from `supabase/config.toml`:

| function | verify_jwt | files sent (LF md5, bytes) |
|---|---|---|
| calculate-tuition | true | `calculate-tuition/index.ts` c27f77a305aea9db083611fd6c41aaae (32106); `_lib/rate-limit.ts` aad3d996bc38a83848e33bd1cb88415e (2448); `_lib/auth.ts` 879142b6783effc17089a3688b4e5ca7 (7351); `_lib/sibling-state.ts` 46aa65d578527c106d620ca70a581044 (2585); `_lib/tuition-session.ts` d0d010933236809ea150a04311ca18a0 (370); `_lib/enrollment-discounts.ts` b92966a926695c219226ca69e60e8de2 (3509); `_lib/class-fee.ts` 6a6d2167918057c6dc9c8c96e108cf1b (4508, new); `_lib/invoice-status.ts` a278832ac3c18b088c5a9c84f9e31ed1 (11847) |
| calculate-tuition-bulk | true | `calculate-tuition-bulk/index.ts` 8cb94f345403c4f28a8f38aee8986a5e (20926); `_lib/auth.ts`; `_lib/sibling-state.ts`; `_lib/tuition-session.ts`; `_lib/enrollment-discounts.ts`; `_lib/invoice-status.ts`; `_lib/class-fee.ts` (md5s as above) |
| watch-sibling-threshold | true | `watch-sibling-threshold/index.ts` c9b9f9f58fa1cac1496f0bfefc693b95 (5434, unchanged - redeployed so its bundle reads the history); `_lib/lock.ts` 5634ae52be2801e3128cd78e1b2db896 (1674); `_lib/hash.ts` 9b2b3c5e92d3908c2b8b3e3c70b55196 (185); `_lib/projected-per-class.ts` a66a4e346e5d62d5646cce7b99cf34cf (3786); `_lib/sibling-hold.ts` 45ea81658acfebaf7e468d9d4c1ed8d0 (1819); `_lib/class-fee.ts`; `_lib/auth.ts` |

`get_edge_function` read-back of every file: identical to the LF blobs, else redeploy once, then STOP. `_lib/class-fee.ts` is imported by exactly these three functions; `_lib/projected-per-class.ts` by watch-sibling-threshold only.
These may also go BEFORE the paste (they fall back to `classes.session_rate_vnd` while the table does not exist; tested). After the paste and before them: the old calculators price at the mirror, which equals every class's baseline - no figure moves.

### 2.5 Screens (ship with the next Cloudflare deploy, after 2.4)

`src/components/admin/class/ClassFeeHistory.tsx` (new), `src/components/admin/class/ClassSettings.tsx` (fee field gone, history mounted), `src/components/admin/money-guard/MoneyGuardDialog.tsx` (three optional props, additive), `src/lib/classFee.ts` (new). Between the paste and the screens: the old ClassSettings' fee field is refused (HC120) when the fee is changed; other settings save as before.

### 2.6 Probes

`has_function_privilege` anon / authenticated / service_role = false for the eight new functions; `select count(*) from public.class_fee_history where effective_from = '1900-01-01'` = classes. On the day, as an admin: a class's Settings shows "Fee history" with one row "now"; "New fee from <next month>" previews T0 (no bill reached) - cancel it unless a real change is wanted.

### 2.7 Rollback of step 2 (in this order, one sitting)

1. **OWNER PASTE** `scripts/ROLLBACK-d4-3-class-fee.sql` (LF md5 `c1e608281228ff266ff82b3c20ad582b`): brings the mirror level (`classes.session_rate_vnd = class_fee_on(id, today)`), then drops `zz_class_fee_money_guard` and `zz_class_fee_mirror_guard`. Result: `d4_class_fee_guards_left = 0`, `mirror_differs = 0`. Table, rows, `class_fee_baseline`, no-truncate and audit triggers, every function stay.
2. Only if the resolver itself is at fault: redeploy the previous `calculate-tuition` (`docs/evidence/D4-int-rollback-before/calculate-tuition/index.ts.txt`, cf45c883, with `_lib/rate-limit.ts`, `auth.ts`, `sibling-state.ts`, `tuition-session.ts`, `enrollment-discounts.ts`, `invoice-status.ts` - no `class-fee.ts`), `calculate-tuition-bulk` (`.../calculate-tuition-bulk/index.ts.txt`, 076b11c6, the same `_lib` minus `rate-limit.ts`), and `watch-sibling-threshold` (its index.ts, `_lib/projected-per-class.ts` from `.../_lib/projected-per-class.ts.txt` 26670add, `sibling-hold.ts`, `lock.ts`, `hash.ts`, `auth.ts`). The step 2 functions keep working without the triggers (they only read the table).
3. Screens: with the guards gone any fee change answers HC050 from the new screen ("the safety check is switched off"); the fee is then changed by the owner in the SQL editor until step 2 is re-pasted. To put the old field back: `git checkout 344cbf38 -- src/components/admin/class/ClassSettings.tsx src/components/admin/money-guard/MoneyGuardDialog.tsx`, delete `ClassFeeHistory.tsx` and `src/lib/classFee.ts`, one commit, the normal deploy - and only together with step 2's previous calculators (the old field writes the mirror, which the new calculators do not read).
Symptom that means roll back: saving a new fee or a class's settings fails naming `zz_class_fee_money_guard` / `zz_class_fee_mirror_guard` / `money_change_requires_checked_path` when it should not, or a bill is priced at a fee the history does not show.

---

## STEP 3A - who is paid for a lesson (G-1 to G-7)

What it is (`D4-build-3a.md`, review `D4-3a-review.md`, fix round 1 at its end): nine new functions, three triggers (`sessions.zz2_session_pay_guard`, `sessions.zz_session_insert_guard`, `session_participants.zz_session_staff_guard`), the `session` entity of 1b's checked path, and ONE replaced 1b body, `d4_guard_status()` (the same body with the three names added). Changes no row.

Between the paste and the functions an admin's change through the OLD `manage-session` that the guard asks about is refused by the database with HC020 and the old screen shows a raw error; nothing is written. Today's lessons, register saves, the Stars sync and the nightly generator keep working. That is why the functions follow at once.

### 3A.1 Pre-checks (read-only)

1. C1: every row ok; `d4_guard_status` = df2b7052 (1b's; anything else: STOP). C2: none of 3A's objects present.
2. Nothing of 3A exists: `select count(*) from pg_trigger where tgname in ('zz2_session_pay_guard','zz_session_insert_guard','zz_session_staff_guard')` = 0; `select to_regprocedure('public._money_plan__session(text, jsonb, uuid)')` NULL.
3. D2's `zz_session_change_guard_upd` on `sessions` exists and is enabled. Triggers on `sessions` and `session_participants` (name, enabled): record.
4. The functions as live now equal the rollback copies (CR removed, md5 of `index.ts`):

| function | expected LF md5 (bytes) of index.ts | rollback copy |
|---|---|---|
| manage-session | 42044d90e6f6ec755f81dd3fa569ceb3 (25516) | `docs/evidence/D4-3a-rollback-before/manage-session/index.ts.txt` |
| bulk-cancel-sessions | 7c25bb2228b66f42eefd02e381431600 (9215) | `docs/evidence/D4-3a-rollback-before/bulk-cancel-sessions/index.ts.txt` |
| schedule-sessions | 3fea72e9cd3ad6d7883a2424e9c448c8 (30971) | `docs/evidence/D4-3a-rollback-before/schedule-sessions/index.ts.txt` |
| mark-attendance | **8a4b0e4efc18dc577aa6226d6a2da244 (12147) - live v5, the streak fix (read-back equal to 73646e8e, ledger 16 Nov)** | `docs/evidence/D4-int-rollback-before/mark-attendance/index.ts.txt` (NOT the v4 copy of the 3A brief: rolling back to v4 would undo the streak fix) |

   Also `_lib/attendance-effects.ts` live = 428c8db5af4d4fff97f2acd605b19b63 (15323). If a live file differs: STOP, save the live text, report.
5. C4, C5.

### 3A.2 OWNER PASTE - the migration

The owner pastes the exact LF content of `supabase/migrations/20261114093000_d4_lesson_pay_guard.sql` (LF md5 `8e3c73a025385e85f7ec17e33e888adc`, 49381 bytes). The result set prints `lesson_pay_guard_triggers` = the three triggers `=O` and `installs` >= 1.

### 3A.3 Post-checks (read-only)

1. C2: 3A's objects present and equal to:

| kind | object | md5 | secdef | vol | EXECUTE anon/auth/service |
|---|---|---|---|---|---|
| function | `session_pay_change_kind(sessions, sessions)` | a67936d64bff4c046159768b4718ceef | true | s | f/f/f |
| function | `_session_ta_rows(uuid)` | dc0e044990548a79d45ff64718abb5d8 | true | s | f/f/f |
| function | `_session_pay_tier(text, sessions, sessions)` | 13dfc790cfafffbffc108ab656e00e24 | true | s | f/f/f |
| function | `_session_pay_sentence(text)` | 37a9f2460683b1837d99355f483734f8 | false | i | f/f/f |
| function | `session_pay_guard()` | f69bcfb3f69fc7206f8aaabe62db09ac | true | v | f/f/f |
| function | `_session_insert_guard()` | ede7f558c2e089a3acdd214d550bfbf2 | true | v | f/f/f |
| function | `_session_staff_guard()` | 19a597ce8b0fd93c159f7c43d27689b2 | true | v | f/f/f |
| function | `_money_plan__session(text, jsonb, uuid)` | e21f34e1392c0dd6f34f21b133271b87 | true | s | f/f/f |
| function | `_money_exec__session(jsonb, uuid)` | cabd2db1f4023cba61bf8d38780d4e34 | true | v | f/f/f |
| function (REPLACED, 1b) | `d4_guard_status()` | 932bc6aa9eded89d1faa16bdb3f54577 (was df2b7052) | true | s | f/t/f (unchanged) |
| trigger | `sessions.zz2_session_pay_guard` | 627eb5d6e28b91e44f5d997cc30f4686 | | | O |
| trigger | `sessions.zz_session_insert_guard` | c33edb0a689b2c4fe1a351bf27c74a56 | | | O |
| trigger | `session_participants.zz_session_staff_guard` | fe26026f304672fe4cc8682e35ebdf96 | | | O |

2. C3 64 / 66. C4 unchanged except one more `money_change_events` row (`guard_installed`, `20261114093000_d4_lesson_pay_guard`).

### 3A.4 Functions (straight after 3A.3)

| function | verify_jwt | files sent (LF md5, bytes) |
|---|---|---|
| manage-session | true | `manage-session/index.ts` f242a0ba65e94b095c504a233e54ad56 (36542); `_lib/rate-limit.ts` aad3d996bc38a83848e33bd1cb88415e (2448); `_lib/session-guard.ts` 9046deec2a7253a8287b3f64f1ee4659 (22190); `_lib/money-guard.ts` 5fab2eca6ac0e3de6080ea4a042071f6 (6570) |
| bulk-cancel-sessions | true | `bulk-cancel-sessions/index.ts` be930e4c68dc7af3c8bb4a45390b9b79 (10038); `_lib/session-guard.ts` |
| schedule-sessions | true | `schedule-sessions/index.ts` 1f82785e457f0bf6d6e32a4067759f9c (32162); `_lib/schedule-history.ts` 086ffa9cb6fb7af159e00d090464f487 (3671); `_lib/auth.ts` 879142b6783effc17089a3688b4e5ca7 (7351) |
| mark-attendance | true | `mark-attendance/index.ts` **f1b5067c0f971e310b2ae3369048cd1f (13096)** = live v5 + 3A's N-2 response field only (15 lines; NOT the 3A brief's 82b4aace, which was built on v4); `_lib/rate-limit.ts`; `_lib/attendance-effects.ts` 428c8db5af4d4fff97f2acd605b19b63 (15323, unchanged = live); `_lib/session-guard.ts`; `_lib/money-guard.ts` (imports `./session-guard.ts`) |

Read-back: identical, else redeploy once, then STOP. Probes (publishable key from `.env`, not printed): POST each with the publishable key as bearer -> 401 / 403; with no Authorization -> 401.

### 3A.5 Screens (next Cloudflare deploy, after 3A.4)

The 18 files of 3A: `src/lib/lessonPayGuard.ts` (new); `src/components/admin/session-guard/api.ts`, `useGuardedChange.ts`, `GuardDialog.tsx`; `src/components/admin/SessionActionsModal.tsx`, `EditSessionModal.tsx`, `AddSessionModal.tsx`, `TeacherScheduleTransfer.tsx`, `SessionGenerator.tsx`, `SessionGeneratorConfirm.tsx`, `PastAttendanceEditor.tsx`; `src/components/admin/class/AttendanceDrawer.tsx`, `class/SessionDetailDrawer.tsx`, `class/EditSessionModal.tsx`; `src/components/admin/ta/TAClassAssignment.tsx`; `src/components/admin/tabs/StarsSyncTab.tsx`; `src/components/schedule/GlobalCalendar.tsx`; `src/components/shared/StudentActionPopover.tsx`. They need the 3A `manage-session` (`pay-preview`, `set-*`): never before 3A.4.

### 3A.6 Probes and the first day

As in `D4-3a-live-apply-brief.md` Step 5 and "The first day" (unchanged): `has_function_privilege` false for the nine new functions; `d4_guard_status()` authenticated true; as an admin on the day, `select public.d4_guard_status()` -> `ok: true` with the three 3A triggers `O`; the morning after, `select kind, count(*) from money_change_events where created_at > <apply time> group by kind` (`automation_refused` with `entity = session` in the tens: look).

### 3A.7 Rollback of 3A (all three parts, this order, one sitting)

1. **OWNER PASTE** `scripts/ROLLBACK-d4-4-lesson-pay.sql` (LF md5 `a9c3dd16ba3f02fe7309d166cc962aec`): drops the three triggers. Result: `d4_lesson_pay_triggers_left = 0`.
2. REQUIRED at once: redeploy the previous functions (each `index.ts` with its `_lib` imports as in 3A.4, unchanged by 3A), read back: `manage-session` <- `docs/evidence/D4-3a-rollback-before/manage-session/index.ts.txt` (42044d90), `bulk-cancel-sessions` <- `.../bulk-cancel-sessions/index.ts.txt` (7c25bb22), `schedule-sessions` <- `.../schedule-sessions/index.ts.txt` (3fea72e9), `mark-attendance` <- `docs/evidence/D4-int-rollback-before/mark-attendance/index.ts.txt` (8a4b0e4e, live v5).
3. REQUIRED (review B-1): revert the 18 screens of 3A.5 to their text at **eaa9a050^1** (the conductor just before 3A merged; NOT c132bf7b - `StarsSyncTab.tsx` changed on the conductor in between and `git checkout c132bf7b` would undo that) - `git checkout eaa9a050^1 -- <the 17 existing files>`, delete `src/lib/lessonPayGuard.ts`, run `tsc --noEmit -p tsconfig.app.json`, one commit, the normal deploy.
What stays: every override / event row, every 3A function, `d4_guard_status` as 3A left it (its three names simply absent from its answer). Symptom that means roll back: as `D4-3a-live-apply-brief.md` "The first day".

---

## STEP 3B - money inputs (G-13 to G-21)

What it is (`D4-build-3b.md`, review `D4-3b-review.md`, fix round 1 at its end): nine guard triggers on twelve tables plus two frozen-bill guards and four audit triggers (19 trigger objects), `change_enrollment_terms`, the plan / exec pairs of six entities of 1b's checked path, and ONE replaced 1b body, `_money_enrollment_rpc_call()`. No table created or altered, no row written.

Between the paste and the functions: the old `update-enrollment-rate` / `create-family` write with the service key and are refused at T1+ (HC120), nothing written - fail closed. Between the paste and the screens: every newly guarded write by a person that reaches a billed month is refused (HC120 / HC121); tier-0 writes work as before. So functions at once, screens straight after.

### 3B.1 Pre-checks (read-only)

1. C1: every row ok; `_money_enrollment_rpc_call` = 8796eb02 (1b's; b63e90a3 would mean 3B is already in: STOP and report). C2: none of 3B's objects present.
2. Nothing of 3B exists: `select count(*) from pg_trigger where tgname in ('zz_enrollment_money_guard','zz_discount_money_guard','zz_discount_definition_guard','zz_pay_rate_money_guard','zz_staff_pay_mirror_guard','zz_invoice_unfreeze_guard','zz_invoice_frozen_keep_guard','zz_invoice_frozen_delete_guard','zz_family_link_guard','zz_student_delete_guard','zz_class_delete_guard')` = 0; `select to_regprocedure('public.change_enrollment_terms(uuid, jsonb, date)')` NULL.
3. What its preflight reads (check first; the file names any that is missing): the RPCs `end_enrollment(uuid,uuid,date)`, `change_enrollment_days(uuid,integer[],date)`, `modify_enrollment_transfer(uuid,uuid,uuid,date)`, `pause_enrollment(uuid,uuid,date,date,text)`, `audit_row_change()`, `_money_month_is_past(text)`; the columns `enrollments.created_at`, `invoices.tuition_frozen`, `students.sibling_discount_from`, `families.sibling_percent_override`, `families.is_active`; the table `sibling_discount_state`; the trigger `attendance.zz_attendance_money_guard` (1b).
4. Audit triggers it adds only where missing (review N-1): `select tgname, md5(pg_get_triggerdef(oid)) from pg_trigger where tgname in ('audit_teachers','audit_teaching_assistants','audit_referral_bonuses','audit_discount_definitions','audit_families')`: record. Where `audit_teachers` / `audit_teaching_assistants` already exist (20261020091000) the file leaves them, so their `md5_def` in C2 may differ from the expected (578e421d / 06ae6615): compare by eye with 20261020091000, report, not a stop.
5. The functions as live now equal the rollback copies (CR removed, md5 of `index.ts`; text at 344cbf38):

| function | expected LF md5 (bytes) | rollback copy (`docs/evidence/D4-int-rollback-before/...`) |
|---|---|---|
| update-enrollment-rate | 1381dfcadb85c7d1de1b5afa3bb58e8a (3792) | `update-enrollment-rate/index.ts.txt` (imports `../_lib/auth.ts`) |
| create-family | f17d3c1e89973d02e3c28d5ef5fd9e49 (6409) | `create-family/index.ts.txt` (no relative import) |
| manage-demo-student | 4eb0ea9335c725d7c3b131b8324e729f (10701) | `manage-demo-student/index.ts.txt` |
| admin-data-import | ed18f68ec1a9c3ddfeb80448080eb55e (3979) | `admin-data-import/index.ts.txt` |
| link-student-user | a73f7ee565a6188197c8481728f373b9 (14284) | `link-student-user/index.ts.txt` |

6. C4, C5.

### 3B.2 OWNER PASTE - the migration

The owner pastes the exact LF content of `supabase/migrations/20261114094000_d4_money_inputs_guard.sql` (LF md5 `7b0bc8f4b33f2b7419164b06220b5625`, 110473 bytes - the whole file, one `BEGIN ... COMMIT`). The result set prints `d4_money_input_triggers` = the guard triggers `=O`.

### 3B.3 Post-checks (read-only)

1. C2: 3B's objects present and equal to (41 new functions, 1 replaced, 19 triggers):

| kind | object | md5 | secdef | vol | EXECUTE anon/auth/service |
|---|---|---|---|---|---|
| function | `_class_delete_guard()` | e09b027a2c1eae98a5161e8bc8ee3595 | true | v | f/f/f |
| function | `_discount_definition_guard()` | 8ed3b4f73189a1468c4681c614b80a3b | true | v | f/f/f |
| function | `_discount_money_guard()` | 8601d68d00941ba3ee5b13fdb6b6b21a | true | v | f/f/f |
| function | `_enrollment_money_guard()` | 85725992e44837ba7f3b93fe088b3613 | true | v | f/f/f |
| function | `_family_link_guard()` | 29a38090c85537663bb4868d2a7c1ba1 | true | v | f/f/f |
| function | `_invoice_frozen_keep_guard()` | 22bd4fd7da333584e8c5c74ea8ed163a | true | v | f/f/f |
| function | `_invoice_unfreeze_guard()` | a66d21b14fe5149e2bcb77d37f7370bc | true | v | f/f/f |
| function | `_money_date(text)` | b84d745998882ed916f3411cfed11e33 | false | i | f/f/f |
| function (REPLACED, 1b) | `_money_enrollment_rpc_call()` | b63e90a3ef684c6e32c800401194e809 (was 8796eb02) | false | s | f/f/f |
| function | `_money_enrollment_terms(jsonb)` | 0b87e3d1554fc90518cbafd89cb7135a | false | i | f/f/f |
| function | `_money_exec__discount(text, jsonb, uuid)` | 2f5a3a5c5406e23b47b21809f0fc63df | true | v | f/f/f |
| function | `_money_exec__discount_assignment(jsonb, uuid)` | 10721fdfe402fcf709e81fd9f7c85b04 | true | v | f/f/f |
| function | `_money_exec__enrollment(jsonb, uuid)` | dd3d4ecefbadfe5d485ce0af834bd9b7 | true | v | f/f/f |
| function | `_money_exec__family_link(jsonb, uuid)` | 5ac3ff6c97445e46ab6d9f2a32e60388 | true | v | f/f/f |
| function | `_money_exec__invoice_freeze(jsonb, uuid)` | 6e30c1f6745a93c404acf1bcad6a9b0a | true | v | f/f/f |
| function | `_money_exec__pay_rate(jsonb, uuid)` | 0c2a5c26ab8ad254f8a3f0f29b504e05 | true | v | f/f/f |
| function | `_money_exec__referral_bonus(jsonb, uuid)` | 6a57df845845894019213e11bd6d38a0 | true | v | f/f/f |
| function | `_money_family_kids(uuid[])` | f294a6bc9bcb1a0e2826cf0d23d8046e | true | s | f/f/f |
| function | `_money_family_reach(uuid, uuid, uuid)` | 75113876321f7576e1049ef7149baacd | true | s | f/f/f |
| function | `_money_input_ack(text, uuid, date, date, integer)` | 9473b3313d861f5b41546690d2ef524c | true | s | f/f/f |
| function | `_money_input_gate(text, text, text, uuid, integer, boolean, text)` | 014b577b5d2e8dddcdd17b5ee4611a05 | true | v | f/f/f |
| function | `_money_input_plan(text, text, uuid, jsonb, jsonb, jsonb, integer, text)` | e871a3b8a0be185559b7d81bd33b15cd | false | s | f/f/f |
| function | `_money_pay_combine(jsonb, jsonb)` | 9973dbcad0e1d5b00e275f8a71090956 | false | i | f/f/f |
| function | `_money_pay_mirror_reach(uuid, uuid, date)` | 389c5c400866670c497f5661290cc559 | true | s | f/f/f |
| function | `_money_pay_rate_on(uuid, uuid, date, uuid, jsonb)` | 0616e5bdb8067f96d105851fe89a77f6 | true | s | f/f/f |
| function | `_money_pay_reach(uuid, uuid, date, date)` | a80f0b195ebef60f89da152ca83ec1a2 | true | s | f/f/f |
| function | `_money_pay_row_reach(uuid, uuid, date, uuid)` | 9e0414e22a32ed3f366c4e2f992b3411 | true | s | f/f/f |
| function | `_money_plan__discount(text, text, jsonb)` | 8839b4bc6d395110225b0ca1c35d00aa | true | s | f/f/f |
| function | `_money_plan__discount_assignment(text, jsonb, uuid)` | 1aed03a81e566fa6a756ee2fbf436d3c | true | s | f/f/f |
| function | `_money_plan__enrollment(text, jsonb, uuid)` | cb9e129ee5485021c3137d3aee2e5fe9 | true | s | f/f/f |
| function | `_money_plan__family_link(text, jsonb, uuid)` | 8bdd8a7a760b08ed65fd6beb69097dfd | true | s | f/f/f |
| function | `_money_plan__invoice_freeze(text, jsonb, uuid)` | 9c4f583e0d0f729689c08bce2ea62a5e | true | s | f/f/f |
| function | `_money_plan__pay_rate(text, jsonb, uuid)` | aa28af8b81495574af464d95444978a3 | true | s | f/f/f |
| function | `_money_plan__referral_bonus(text, jsonb, uuid)` | 0156ce9527177b37aab481f4e0869440 | true | s | f/f/f |
| function | `_money_span(jsonb, jsonb, text, text, text[], integer)` | 608318266bf25a46ac5a4de896319e9c | false | i | f/f/f |
| function | `_money_tuition_reach(uuid[], uuid, date, date)` | 1b134afbddd2c82f35e24768101146c1 | true | s | f/f/f |
| function | `_money_unfreeze_tier(uuid)` | 226e22c1c0715645fe69fc46c5e7e805 | true | s | f/f/f |
| function | `_money_uuid(text)` | 22dcde6a13fd3802135d90e986dc35a4 | false | i | f/f/f |
| function | `_pay_rate_money_guard()` | c5638802659cb1ca21037bcbdcc0f59b | true | v | f/f/f |
| function | `_staff_pay_mirror_guard()` | cac197dfb3e26ebe30b5c19bbc29185a | true | v | f/f/f |
| function | `_student_delete_guard()` | 72ec5875fda2471e3c973b4339459603 | true | v | f/f/f |
| function | `change_enrollment_terms(uuid, jsonb, date)` | 0d25fcb5cb723cf23ebcc365a78bbb0b | true | v | **f/t/f** (the one RPC a browser calls) |
| trigger | `classes.zz_class_delete_guard` | 2f790ddfb3c181634b51b25e9715d0c7 | | | O |
| trigger | `discount_assignments.zz_discount_money_guard` | c5ef1e99461576ab85b838e1312f6fe2 | | | O |
| trigger | `discount_definitions.audit_discount_definitions` | f0d9fc0039f39f56d722fda6125cc17e | | | O |
| trigger | `discount_definitions.zz_discount_definition_guard` | 26aa5a51423fa572043933933e6da6f4 | | | O |
| trigger | `enrollments.zz_enrollment_money_guard` | ef2e1a821049fe1e085db7e231cb6798 | | | O |
| trigger | `families.audit_families` | 40b8ba1f06ea44a7524802940705ed40 | | | O |
| trigger | `families.zz_family_link_guard` | def4276f02d1888ccceb45ae0ded57de | | | O |
| trigger | `invoices.zz_invoice_frozen_delete_guard` | fed9ce823091c82a3f346d507794286b | | | O |
| trigger | `invoices.zz_invoice_frozen_keep_guard` | bfe5edef7f7a7baf8821a06b10ebaee8 | | | O |
| trigger | `invoices.zz_invoice_unfreeze_guard` | 67aeafe4f55e261d9a730df57483c036 | | | O |
| trigger | `referral_bonuses.audit_referral_bonuses` | 5d2204a3c40ea01d082fb945a1d31495 | | | O |
| trigger | `referral_bonuses.zz_discount_money_guard` | f6cfee33a2bce332863b3c66b44d7ca7 | | | O |
| trigger | `staff_pay_rates.zz_pay_rate_money_guard` | 036bd8e68eb35416a545f5b9bfe9e55e | | | O |
| trigger | `students.zz_family_link_guard` | bae6c54edf90cd5a60a5b79f80e2b0f7 | | | O |
| trigger | `students.zz_student_delete_guard` | 6f6043e2332c453f5a03d4d6116b88b5 | | | O |
| trigger | `teachers.audit_teachers` (only if it was missing) | 578e421d4f6c80c3a143375924f66dba | | | O |
| trigger | `teachers.zz_staff_pay_mirror_guard` | f1db8ec0f6227ae8f3dc753af3ce15a9 | | | O |
| trigger | `teaching_assistants.audit_teaching_assistants` (only if it was missing) | 06ae6615e6a8ceb18ca3c980989be7c3 | | | O |
| trigger | `teaching_assistants.zz_staff_pay_mirror_guard` | 0bf37a3d1b7a8e8f56c89fb4edf19748 | | | O |

2. C3 64 / 66. C4 unchanged except one `guard_installed` event (`20261114094000_d4_money_inputs_guard`).

### 3B.4 Functions (straight after 3B.3)

| function | verify_jwt | files sent (LF md5, bytes) |
|---|---|---|
| update-enrollment-rate | true | `update-enrollment-rate/index.ts` 4428e7b08a9c22f51e064d69e9d41c19 (6638); `_lib/auth.ts` 879142b6783effc17089a3688b4e5ca7 (7351); `_lib/session-guard.ts` 9046deec2a7253a8287b3f64f1ee4659 (22190); `_lib/money-guard.ts` 5fab2eca6ac0e3de6080ea4a042071f6 (6570) |
| create-family | true | `create-family/index.ts` 4239950cf15954acf096970db539a6ab (11704); `_lib/auth.ts`; `_lib/session-guard.ts`; `_lib/money-guard.ts` |
| manage-demo-student | true | `manage-demo-student/index.ts` cd02ef3726a2adedb59d9e324d125ee8 (12851) (no relative import) |
| admin-data-import | true | `admin-data-import/index.ts` 70a10901023306b01d83a9ce896e4614 (5975) (no relative import) |
| link-student-user | true | `link-student-user/index.ts` a028fc38c30350d2844fc6bd81408c6c (15730) (no relative import; fix round M-1) |

Read-back identical, else redeploy once, then STOP. Probes: 401 / 403 as in 3A.4. If the functions went BEFORE the paste they answer 503 `not_installed` for any enrolment change, nothing written (tested).

### 3B.5 Screens (next Cloudflare deploy, after 3B.4)

The 28 files of 3B: new `src/lib/moneyInputs.ts`, `src/components/admin/money-guard/useMoneyInput.ts`, `MoneyInputDialog.tsx`; changed `src/components/admin/{BulkEnrollmentDateSetter, DiscountManager, EnrollStudentDialog, EnrollmentManager, EnrollmentRateEditor, EnrollmentRequestsManager, FamiliesList, FamilyForm, FamilyMembersManager, ModifyEnrollmentModal, SiblingDiscountCompute, StudentEditDrawer, StudentForm, StudentLinkDialog, StudentsList}.tsx`, `class/ClassEnrollments.tsx`, `discount/{AssignDiscountModal, EditDiscountModal, EditEnrollmentDiscountModal, StudentDiscountsTab}.tsx`, `staff/PayRateHistory.tsx`, `tabs/DataTab.tsx`, `src/components/student/BillFreezePanel.tsx`, `src/lib/aiActions.ts`, `src/pages/FamilyDetail.tsx` (merged with the live confirm-first dialog: "Remove" asks first, then goes through the checked change).

### 3B.6 Probes

`has_function_privilege` false for the 41 new functions except `change_enrollment_terms` (authenticated true, anon / service_role false). On the day, as an admin: enrol a test-free case only if a real change is due; an ordinary change of THIS month (an enrolment from today, a discount from next month on an unbilled family) saves with no dialog; anything reaching a billed month asks for a reason.

### 3B.7 Rollback of 3B (this order, one sitting)

1. **OWNER PASTE** `scripts/ROLLBACK-d4-5-money-inputs.sql` (LF md5 `1e5364925c174757a1b2928c497b7c5a`): twelve `DROP TRIGGER IF EXISTS` (the guards). Result: `d4_money_input_triggers_left = 0`. Rows, functions, `audit_families` and the audit triggers stay.
2. REQUIRED at once: redeploy the previous `update-enrollment-rate` (copy above, with `_lib/auth.ts`) and `create-family` (copy above), read back: with the triggers gone `money_change_checked` refuses every money-input change (HC050) and the 3B versions send their changes through it. `manage-demo-student`, `admin-data-import` and `link-student-user` may stay (they only report refusals more honestly); their previous copies are saved in case.
3. REQUIRED: revert the 28 screens of 3B.5 to their text at **344cbf38** (`git checkout 344cbf38 -- <the 25 existing files>`; delete the three new ones; `FamilyDetail.tsx` goes back to the confirm-first version with the plain write), `tsc --noEmit -p tsconfig.app.json`, one commit, the normal deploy.
4. `_money_enrollment_rpc_call()` keeps 3B's body; with the enrolment guard gone it answers exactly as 1b's (tested). To put 1b's text back: paste `20261114091000` again, only AFTER step 1 and never while 3B's triggers are installed (tested: it pastes, and 1b's fingerprint is then exact).
Symptom that means roll back: an ordinary enrolment, discount, pay-rate or family change of THIS month cannot be saved, or one fails naming one of the guard triggers / `guard_broken` where the screen offers no reason dialog.

---

## Rolling back more than one step

Newest first, each step's own three parts: 3B (rollback 5), then 3A (rollback 4), then 2 (rollback 3). Proved in pglite: 5, 4, 3 leave the 1b fingerprint with exactly `d4_guard_status` (3A's) and `_money_enrollment_rpc_call` (3B's) different; re-pasting `20261114091000` makes it exact; 2, 3A, 3B then paste again. Steps 1b / 1a are rolled back separately (their own briefs), after these.

## Screens: release plan (which `src/` files ship with which step)

The three sets are disjoint (no file in two steps) and none imports another's new module; each set ships in its own commit to main with its step's sitting:

| step | ships | depends on (must be live first) | revert base |
|---|---|---|---|
| 2 | `ClassFeeHistory.tsx`, `ClassSettings.tsx`, `MoneyGuardDialog.tsx`, `src/lib/classFee.ts` (4) | migration 2 (else "not installed"; fail closed) | 344cbf38 |
| 3A | the 18 of 3A.5 | migration 3A AND the 3A `manage-session` | eaa9a050^1 |
| 3B | the 28 of 3B.5 | migration 3B AND the 3B `update-enrollment-rate` / `create-family` | 344cbf38 |

Main (the deploy branch) does not yet carry any of the three; the conductor branch carries 3A's screens already (merged 16 Nov) and this branch all three. To ship one step alone, copy only that step's files onto main (and nothing of another step) in one commit. Proved here: `tsc --noEmit -p tsconfig.app.json` passes with each step's screen set alone over the pre-D4 text of the other two (see `D4-integration.md`, "Screens alone").

## Report (under 250 words, per step)

Each part's result; C1 / C2 / C3 verdicts; deployed versions and read-back; probes; counts before and after; anything that differed; one line: "LIVE AND VERIFIED" or "STOPPED AT <part>: <why>" or "ROLLED BACK: <why>".
