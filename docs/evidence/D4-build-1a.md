# D4 build - step 0 (tooling) and step 1a (the two floors)

**Where I am / next step:** REVISION 1 COMPLETE (after `D4-1a-review.md`, APPLY WITH CHANGES): C-1 to C-4 and item 5 done; 43/43 mutants caught; suites green. Next step is not mine: the reviewer's short re-check, then the conductor's live apply with `D4-1a-live-apply-brief.md`.

Implementer only: nothing pushed, nothing deployed, nothing applied to any database. Worktree reset to `claude/hec-conductor-setup-efbaa5` (f49d185) first.

## What was built

| Step | File | What |
|---|---|---|
| 0 | `scripts/pgtest/d4-prelude.mjs` | D2's PRELUDE copied once (drift test in `d4-floors`: `preludeCopyIsCurrent`), `D4_PEOPLE` (students, families, teachers, TAs), `D4_EVIDENCE_RLS` (policies on the five evidence tables as the real migrations write them), `makeDb`, shared `harness` (ok / section / as / script / clock). |
| 0 | `scripts/pgtest/d4-functions-harness.mjs` | D2's PostgREST stand-in and esbuild bundling, shared; `loadFunction(entry, { commit })` bundles a function AS IT WAS at a commit (git show). |
| 0 | `scripts/pgtest/run.mjs` | `expect` (a suite reporting fewer passing assertions than pinned fails) and `args` (extra files after the migrations). Existing entries unchanged byte for byte. |
| 0 | `scripts/pgtest/guard-fingerprint.mjs` | Generalised: `--release d` (default; D-release files regenerate byte for byte) / `--release d4` (baseline D release, new = D4 files, trigger entries gain `md5_def`); `--check-unchanged` (of the 66 D-release objects exactly the two replaced functions differ); `--check-unchanged --after-rollback` (66/66 after the D4 rollbacks + D2 re-paste). `--check` now ignores line endings: it reported "DIFFER" on this Windows checkout before (CRLF), with no real difference. |
| 0 | `scripts/pgtest/d4-mutants.mjs` | Mutation runner: one textual change per mutant, preflight md5 literals re-computed for the mutated bodies (else every body mutant is "caught" by the second-paste check alone), suites run with the mutant in place of file 1. |
| 0 | `docs/evidence/D4-release-fingerprint.sql` / `.expected.json` | 15 functions, 12 triggers, 2 relations. |
| 1a | `supabase/migrations/20261114090000_d4_floors.sql` | the migration (c.1). |
| 1a | `scripts/ROLLBACK-d4-1-floors.sql` | drops the 7 floor / keep trigger objects; then paste `20261112091000` again. |
| 1a | `src/lib/sessionGuard.ts` | `GuardPreview.level_now`, `GuardPreview.floor` (+ `EvidenceFloor`, `FloorCause` types); `evidenceList` appends the floor's causes marked `removed`; `describeFloorCause`, `floorNote` (wording only), `COPY.floorRemoved`. |
| 1a | `src/components/admin/session-guard/EvidenceCards.tsx` | a "Recorded, and later removed" block: "This lesson once had strong evidence that it took place; it shows no evidence now because records were removed. The check below counts what it once had." plus one line per removal (what, when, by a staff member / an automatic process / the database console). The "N records were removed" sentence counts only the audit-log entries (the floor's are listed in the block). Decides nothing. Rendered in a throw-away Vite page with made-up previews (with and without a floor) and looked at; the page and its launch entry were deleted. |
| 1a | `docs/evidence/D4-design.md` | file name corrected in c.1 and (h); change-log row. |
| 1a | `docs/evidence/D4-1a-live-apply-brief.md` | pre-checks, apply, md5 fingerprint of all 29 objects, D-release 64/66, probes, rollback. |

## Objects (file 1)

Created: tables `session_evidence_floor`, `invoice_state_floor` (RLS on, admin read policy, authenticated SELECT, service_role ALL, guard + no-truncate triggers); functions `_caller_lane`, `_floor_table_guard`, `_floor_families_or`, `_floor_causes_push`, `_session_evidence_keep`, `session_effective_level`, `invoice_floor_state`, `_attendance_evidence_guard`, `_point_evidence_keep`, `_transcript_evidence_keep`, `_homework_evidence_keep`, `_session_evidence_keep_trg`, `_invoice_state_floor` (all search_path pinned; no EXECUTE for anon / authenticated / service_role - none is an RPC); triggers `attendance.zz_attendance_evidence_guard`, `point_transactions.zz_point_evidence_keep`, `class_transcripts.zz_transcript_evidence_keep`, `homeworks.zz_homework_evidence_keep`, `homework_submissions.zz_homework_evidence_keep`, `sessions.zz0_session_evidence_keep`, `invoices.zz_invoice_state_floor`, `point_transactions.audit_point_transactions`.
Replaced (bodies only, same signatures, same grants - none): `_session_change_assess(sessions,text,jsonb,uuid)`, `_session_erased_recently(uuid)`. Preflight refuses unless their md5 (CR stripped) is D2's (`e0acbcc9...`, `32c7fac7...`) or this file's own (`6c1b8c86...`, `5f589166...`).
Nothing else of D1 / D2 changed: `guard-fingerprint.mjs --check-unchanged` -> 66 compared, exactly those 2 differ. No row rewritten, no backfill (floors start empty; test "no row rewritten" compares md5 of sessions / attendance / invoices / points / transcripts and the audit_log count before and after the paste). A-11's optional backfill script is not part of 1a and was not written.

## Suites (registered in run.mjs, counts pinned)

| Suite | Assertions | Covers |
|---|---|---|
| `d4-floors` | 198 | install (preflight refuses without D2 and on a foreign body, installs nothing; applies twice as a no-op; rewrites no row; only two functions replaced; 15 functions pinned, definer / grants; PK conflict targets, no partial index); floor tables append-only / rise-only on every lane; G-10 (HC024 on four lanes, HC025 for admin / teacher / no-user API role; sync restore and delete, owner lane, seeded rows, unstarted lessons, unchanged upsert pass); cancelled lessons deletable (with and without a floor); F-11 V7 probe (T3 kept, level_now NONE, two causes, reviewed, HC013); 12 single-family removals; Held undone T2; checked move keeps a floor; refused raw move writes none; STRONG floor appends; 20-cause cap; R-6 (a child under RLS; child / parent / no-role / other-class teacher on all six writes: no floor); D1 raising -> own proof per lesson; honest correction; two lessons in one transaction + bulk; G-9 seven lowerings each keep T3, every lane, deleted / moved bill, no row when nothing lowered, freeze trigger order, NEW unchanged (with vs without the trigger); settled reads the bill floor and every child with a floor and floor-cause children; move destination; impact / fingerprint / token v3 (a cause alone stales it); G-10 residue; column sweep over every column of the five tables (39 changes, no drop without a floor); policy pin over the real migrations. |
| `d4-d2-carryover` | 275 | every case of the 266-assertion D2 suite with file 1 installed; edits E0-E4, C1-C4 listed in the header ("D2 expected ... / with the floors ..."); companion check: same sections in order, only the listed ones differ, prelude and helpers byte-identical (proved by changing one unlisted label: it went red). |
| `d4-deployed-functions` | 37 | manage-session / bulk-cancel-sessions from c43a82f (blob md5 = the live v4 recorded in D-live-apply) against file 1: gate, preview with the new fields, cancel T0-T3, F-11 through the function, delete / cancel-then-delete, move, un-cancel, Held -> Scheduled still 200 and leaves a floor, bulk preview + confirm, no sessions write on the service key; `src/lib/sessionGuard.ts` bundled over the real preview (removals listed, `floorNote`, nothing added for a pre-D4 preview). |
| `d4-rollback` | 22 | rollback script drops the 7 objects (twice safe), tables / rows stay, guard works between the pastes; D2 re-paste restores both bodies (md5 = D release); 66/66 (child process); HC024 / HC025 gone; raw cancel still HC020; checked cancel works; no floor written; file 1 re-installs over the restored bodies; fingerprint files current (D, D4, --check-unchanged). |

Full run: `node scripts/pgtest/run.mjs` -> 4691 assertions across 50 suites, 0 failed (d4 floors 198, d4 D2 carry-over 275, d4 deployed functions 37, d4 rollback 22; D2's own suites 266 / 135 / 143 unchanged and green). App typecheck (`tsc --noEmit -p tsconfig.app.json`): clean (exit 0, no output; also run by the suite "app typecheck").

## Revision 1 - the review's changes (D4-1a-review.md, conductor's message)

| Change | Done | Where |
|---|---|---|
| C-3 file names | `supabase/migrations/20261114090000_d4_floors.sql`; `20261114091000` / `092000` / `093000` / `094000` / `095000` reserved for 1b / 2 / 3A / 3B / 4 (the reviewer's `20261113150000` is reserved elsewhere, and `20261113100000` is `signup_role_from_server_only`). References fixed in the suites, `run.mjs`, `d4-prelude.mjs`, `guard-fingerprint.mjs`, the rollback script, the brief, and `D4-design.md` (c), (h) and its change log. | commit 0d82e657 |
| C-1 same-day un-start | `zz0_session_evidence_keep` now also fires on `start_time`; inside, the keep runs for an un-hold, a date change, or an UN-START (started before, not started after: `session_has_started` over OLD and NEW date + start time). `end_time` cannot change "started" and duration is not a column, so they are left out (a time edit that leaves a lesson started is not a lowering). Case: the reviewer's exact sequence (today, 3 Present, paid, linked point -> tier 3; checked move later today; point deleted, marks excused) ends at tier 3 with a STRONG floor whose cause says `unstarted`. | commit 0425d254 |
| C-2 false removals | Every keep trigger now works out what the row proves for each lesson (D1's own rules: `_floor_mark_level`, `_floor_point_level`, `_floor_transcript_level`, and the homework / submission day test) before AND after the write, and keeps only where it goes down. The register cause carries `old_marked_by` / `new_marked_by`. Cases, each asserting NO floor: transcript `processing -> analyzed`; a register re-saved by another person with the same status; Absent -> Present; plus a point raised and a homework renamed. A real lowering (Present -> Absent with a new signature) still floors and names both signatures. The token case now adds its cause through the owner's insert-only route (since C-2 every keep follows a change D1's hash already sees). | commit 0425d254 |
| C-4 test gaps | Four cases: R2 a failed transcript's audio path cleared -> STRONG floor; R3 points set to 0 -> SOFT; R8 service lane un-signs a Present mark, status unchanged -> STRONG, cause names the old signature; R10 a points-only lesson moved to another PAST day through the checked path -> SOFT floor, tier 2 (a future move would also be an un-start, which hides this mutant). | commit 0425d254 |
| 5 fingerprint, lock timeout, rollback | `D4-release-fingerprint.*` regenerated (18 functions, 12 triggers, 2 relations; the two replaced bodies unchanged at `6c1b8c86...` / `5f589166...`). `SET LOCAL lock_timeout = '5s'` right after `BEGIN` in the migration and in the rollback script. The rollback keeps leaving the two tables (history; their guard needs `_floor_table_guard`), the 16 functions (no API role can run them; nothing calls them after the D2 re-paste; dropping them between the pastes would break the D4 assess) and `audit_point_transactions` (refuses nothing): justified in the script header and asserted as an exact list by `d4-rollback`. Brief rewritten to the final state. | commits 0425d254, c1389c8b, 652d8446 |

Checks after revision 1: `node scripts/pgtest/run.mjs` -> 4710 assertions across 50 suites, 0 failed (d4 floors 213, d4 D2 carry-over 275, d4 deployed functions 37, d4 rollback 26; app typecheck and edge-functions typecheck green). File 1 now creates 16 functions (13 + the three own-proof helpers); with the 2 replaced the D4 fingerprint covers 32 objects. The sections below "Mutations, first build" describe the first build; counts there are superseded by this paragraph.

Rulings recorded: DQ-1 adopted for step 1b (HC025 for a one-off cover teacher or assistant changing a mark more than a week old; the lesson's regular staff pass); DQ-10 closes in step 3A; the others stand. N-1, N-2, N-3 of the review can follow and were not built.

### Mutations after revision 1 (`node scripts/pgtest/d4-mutants.mjs`, 43 mutants: my 24 re-pointed at the revised code, 7 new for C-1 / C-2, the reviewer's 12 re-stated as R01-R12)

| Mutant | Breaks | Verdict |
|---|---|---|
| M01 | a caller D1 refuses writes a floor (R-6) | CAUGHT by floors: FAIL   and NO floor row is written |
| M02 | a D1 error is stored as STRONG (R-6) | CAUGHT by floors: FAIL R-6 D1 raising (recorder helper VOLATILE, 55000): an unlinked same-day transcript deleted -> floor SOFT T, source row |
| M03 | the cancel's excuse-all writes a floor | CAUGHT by floors: FAIL a cancel writes no floor (the excuse-all is a trigger-made write) |
| M04 | deleting a CANCELLED lesson reads the effective level (D2 5.3 step 9 broken) | CAUGHT by floors: FAIL a cancelled lesson WITH a floor: delete allowed (level now NONE), the floor still raises the tier (SOFT -> T2, review) |
| M05 | the lesson guard's settled does not read the bill floor | CAUGHT by floors: FAIL G-9 recorded_payment reset to 0 (RecordedPaymentManager "reset to 0"): floor ever_paid, the lesson's cancel stays T3 |
| M06 | the bill floor skips recorded_payment | CAUGHT by floors: FAIL owner: bill floor ever_paid true -> false -> HC040 |
| M07 | the effective level ignores a STRONG floor | CAUGHT by floors: FAIL V7 after: the tier does NOT drop - still 3; level STRONG (effective), level_now NONE |
| M08 | HC024 dropped (a mark can be re-pointed) | CAUGHT by floors: FAIL HC024 admin (person): re-pointing a mark at another lesson |
| M09 | HC025 only for DELETE (un-signing a mark passes) | CAUGHT by floors: FAIL HC025 admin (person): un-signing a person's mark (unmark) |
| M10 | the point keep ignores a re-dated row | CAUGHT by floors: FAIL V7   the floor names both removals (points re-dated, transcript unlinked) by the teacher |
| M11 | the transcript keep ignores an unlinked row | CAUGHT by floors: FAIL V7   the floor names both removals (points re-dated, transcript unlinked) by the teacher |
| M12 | the submission keep ignores a cleared graded_at | CAUGHT by floors: FAIL G-8 a graded submission: graded_at cleared (teacher): D1 drops SOFT -> NONE; floor SOFT; the preview keeps SOFT |
| M13 | the lesson keep ignores Held -> Scheduled | CAUGHT by floors: FAIL fixture: an un-held lesson has a SOFT floor |
| M14 | the floor's causes are not in erased_recently (no review) | CAUGHT by floors: FAIL V7   review_required, and erased_recently lists the floor's causes |
| M15 | the token does not cover the floor's causes | CAUGHT by floors: FAIL token v3: a floor cause added between preview and confirm -> HC011 |
| M16 | the G-10 residue is not refreshed | CAUGHT by floors: FAIL the re-pointed child (90 days ago) is in refresh_pairs and invoices_before |
| M17 | a floor may be lowered | CAUGHT by floors: FAIL owner: lowering STRONG -> SOFT -> HC040 |
| M18 | a lesson that has not started gets a floor | CAUGHT by floors: FAIL a lesson that has not started gets no floor |
| M19 | with a floor, settled is judged over billable rows only | CAUGHT by floors: FAIL with a floor, an excused child never named by a cause still makes the lesson settled: T3 (not T2) |
| M20 | causes are not capped | CAUGHT by floors: FAIL causes are capped at the newest 20 (oldest dropped) |
| M21 | a deleted bill leaves no floor | CAUGHT by floors: FAIL G-9 a deleted bill: the floor row survives with every flag the bill had |
| M22 | the floor table guard lets the service role write | CAUGHT by floors: FAIL service_role (GRANT ALL) cannot INSERT directly -> HC041 |
| M23 | the keep returns before D1 for every person (no floor from admins / teachers) | CAUGHT by floors: FAIL fixture: an un-held lesson has a SOFT floor |
| M24 | the sessions keep fires on a cancel (Held -> Canceled) | CAUGHT by floors: FAIL a cancel writes no floor (the excuse-all is a trigger-made write) |
| M25 | C-1: the lesson trigger ignores a start_time change | CAUGHT by floors: FAIL C-1 the checked move to a later time today (the lesson now "has not started") keeps a STRONG floor first |
| M26 | C-1: an un-start is not kept | CAUGHT by floors: FAIL C-1 the checked move to a later time today (the lesson now "has not started") keeps a STRONG floor first |
| M27 | C-2: the register keeps on any change, not only a lowering | CAUGHT by floors: FAIL C-2 a register re-saved by another person (same status, new signature) writes no floor |
| M28 | C-2: the transcript keeps on any change | CAUGHT by floors: FAIL C-2 a transcript going processing -> analyzed (every analysed upload) writes no floor |
| M29 | C-2: the register cause does not name the old signature | CAUGHT by floors: FAIL C-2 Present -> Absent is a lowering: floor STRONG; the cause carries old_marked_by and new_marked_by |
| M30 | C-2: a point keeps on any change | CAUGHT by floors: FAIL C-2 a point raised and a homework renamed write no floor |
| M31 | C-2: a homework keeps on any change | CAUGHT by floors: FAIL C-2 a point raised and a homework renamed write no floor |
| R01 | transcript keep ignores a status change (-> failed) | CAUGHT by floors: FAIL G-8 a same-day transcript marked failed with no audio (service): D1 drops SOFT -> NONE; floor SOFT; the preview keeps SOFT |
| R02 | transcript keep ignores audio_storage_path | CAUGHT by floors: FAIL R2 its audio path cleared -> floor STRONG |
| R03 | point keep ignores a points change (5 -> 0) | CAUGHT by floors: FAIL R3 a participation row set to 0 points -> floor SOFT |
| R04 | bill floor ignores un-freezing | CAUGHT by floors: FAIL G-9 unfrozen by an admin: floor ever_frozen, the lesson's cancel stays T3 |
| R05 | bill floor ignores un-confirming | CAUGHT by floors: FAIL G-9 confirmation_status confirmed -> auto_approved: floor ever_signed, the lesson's cancel stays T3 |
| R06 | a re-keyed bill leaves no floor | CAUGHT by floors: FAIL G-9 a bill moved to another month counts as removed from the old one |
| R07 | floor rows can be deleted | CAUGHT by floors: FAIL service role: DELETE of an evidence floor -> HC040 |
| R08 | attendance keep ignores a signature-only change | CAUGHT by floors: FAIL R8 service lane sets marked_by NULL on a Present row, status unchanged -> floor STRONG, cause names the old signature |
| R09 | homework keep ignores a re-dated homework | CAUGHT by floors: FAIL sweep homeworks.created_at: lowered D1 SOFT -> NONE with no floor |
| R10 | lesson keep ignores a date move | CAUGHT by floors: FAIL R10 moved to another (past) date through the checked path -> floor SOFT, and the cancel keeps tier 2 |
| R11 | move destination ignores the bill floor | CAUGHT by floors: FAIL a move into a month whose bill was paid and reset: destination tuition true, reviewed |
| R12 | HC025 also on the service lane | CAUGHT by floors: FAIL the Stars sync's restore (service lane, marked_by back to NULL) passes |

43 caught, 0 survived.

## Mutations, first build (before revision 1)

| Mutant | Breaks | Verdict |
|---|---|---|
| M01 | a caller D1 refuses writes a floor (R-6) | CAUGHT by floors: FAIL   and NO floor row is written |
| M02 | a D1 error is stored as STRONG (R-6) | CAUGHT by floors: FAIL R-6 D1 raising (recorder helper VOLATILE, 55000): an unlinked same-day transcript deleted -> floor SOFT T, source row |
| M03 | the cancel's excuse-all writes a floor | CAUGHT by floors: FAIL a cancel writes no floor (the excuse-all is a trigger-made write) |
| M04 | deleting a CANCELLED lesson reads the effective level (D2 5.3 step 9 broken) | CAUGHT by floors: FAIL a cancelled lesson WITH a floor: delete allowed (level now NONE), the floor still raises the tier (SOFT -> T2, review) |
| M05 | the lesson guard's settled does not read the bill floor | CAUGHT by floors: FAIL G-9 recorded_payment reset to 0 (RecordedPaymentManager "reset to 0"): floor ever_paid, the lesson's cancel stays T3 |
| M06 | the bill floor skips recorded_payment | CAUGHT by floors: FAIL owner: bill floor ever_paid true -> false -> HC040 |
| M07 | the effective level ignores a STRONG floor | CAUGHT by floors: FAIL V7 after: the tier does NOT drop - still 3; level STRONG (effective), level_now NONE |
| M08 | HC024 dropped (a mark can be re-pointed) | CAUGHT by floors: FAIL HC024 admin (person): re-pointing a mark at another lesson |
| M09 | HC025 only for DELETE (un-signing a mark passes) | CAUGHT by floors: FAIL HC025 admin (person): un-signing a person's mark (unmark) |
| M10 | the point keep ignores a re-dated row | CAUGHT by floors: FAIL V7   the floor names both removals (points re-dated, transcript unlinked) by the teacher |
| M11 | the transcript keep ignores an unlinked row | CAUGHT by floors: FAIL V7   the floor names both removals (points re-dated, transcript unlinked) by the teacher |
| M12 | the submission keep ignores graded_at | CAUGHT by floors: FAIL G-8 a graded submission: graded_at cleared (teacher): D1 drops SOFT -> NONE; floor SOFT; the preview keeps SOFT |
| M13 | the lesson keep ignores Held -> Scheduled | CAUGHT by floors: FAIL fixture: an un-held lesson has a SOFT floor |
| M14 | the floor's causes are not in erased_recently (no review) | CAUGHT by floors: FAIL V7   review_required, and erased_recently lists the floor's causes |
| M15 | the token does not cover the floor's causes | CAUGHT by floors: FAIL token v3: a floor cause added between preview and confirm -> HC011 |
| M16 | the G-10 residue is not refreshed | CAUGHT by floors: FAIL the re-pointed child (90 days ago) is in refresh_pairs and invoices_before |
| M17 | a floor may be lowered | CAUGHT by floors: FAIL owner: lowering STRONG -> SOFT -> HC040 |
| M18 | a lesson that has not started gets a floor | CAUGHT by floors: FAIL a lesson that has not started gets no floor |
| M19 | with a floor, settled is judged over billable rows only | SURVIVED the first run; new case "with a floor, an excused child never named by a cause still makes the lesson settled: T3" added; re-run: CAUGHT by floors ([2,false]) |
| M20 | causes are not capped | CAUGHT by floors: FAIL causes are capped at the newest 20 (oldest dropped) |
| M21 | a deleted bill leaves no floor | CAUGHT by floors: FAIL G-9 a deleted bill: the floor row survives with every flag the bill had |
| M22 | the floor table guard lets the service role write | CAUGHT by floors: FAIL service_role (GRANT ALL) cannot INSERT directly -> HC041 |
| M23 | the keep returns before D1 for every person (no floor from admins / teachers) | CAUGHT by floors: FAIL fixture: an un-held lesson has a SOFT floor |
| M24 | the sessions keep fires on a cancel (Held -> Canceled) | CAUGHT by floors: FAIL a cancel writes no floor (the excuse-all is a trigger-made write) |

24 mutants on file 1: 23 caught on the first run, 1 survivor (M19) caught after a new case; 24/24 caught. Each verdict names the first assertion that went red.

## The two replaced bodies: D2 (live) -> D4

Every D2 line is kept; the 8 changed lines are each replaced by a superset (the effective level instead of the level now, with the level now still read; `use_cancel` unchanged for a lesson that is not cancelled; the destination test OR the bill floor; invoices / refresh pairs plus the G-10 residue; token version 2 -> 3 with extra inputs; the output object with four more keys). `_session_erased_recently` gains one UNION branch only.

```diff
@@ -27,14 +27,61 @@
   v_pairs jsonb;
   v_token text;
   v_marks int;
+  -- D4 (floors)
+  v_level_now text;
+  v_floor jsonb;
+  v_reg uuid[];
+  v_res uuid[];
+  v_kids uuid[];
+  v_fp text;
+  v_impact jsonb;
 BEGIN
   v_ev := public.session_held_evidence(s.id);
   v_hash := v_ev ->> 'snapshot_hash';
   IF v_hash IS NULL OR v_ev -> 'settled' IS NULL OR jsonb_typeof(v_ev -> 'settled') <> 'object' THEN
     RAISE EXCEPTION 'evidence without its full view' USING ERRCODE = '55000';
   END IF;
-  v_level := v_ev ->> 'level';
+  v_level_now := v_ev ->> 'level';
+  v_level := public.session_effective_level(s.id, v_ev);
+  SELECT to_jsonb(f) INTO v_floor FROM public.session_evidence_floor f WHERE f.session_id = s.id;
+
+  -- Who has been on this register: today's rows, the children named by
+  -- the floor's removals, and rows re-pointed away before D4 (audit_log).
+  SELECT COALESCE(array_agg(DISTINCT a.student_id ORDER BY a.student_id), ARRAY[]::uuid[]) INTO v_reg
+    FROM public.attendance a WHERE a.session_id = s.id;
+  SELECT COALESCE(array_agg(DISTINCT (l.diff -> 'old' ->> 'student_id')::uuid ORDER BY (l.diff -> 'old' ->> 'student_id')::uuid), ARRAY[]::uuid[])
+    INTO v_res
+    FROM public.audit_log l
+   WHERE l.entity = 'attendance'
+     AND l.operation = 'UPDATE'
+     AND l.changed_fields && ARRAY['session_id', 'student_id']
+     AND l.diff -> 'old' ->> 'session_id' = s.id::text
+     AND (l.diff -> 'old' ->> 'student_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
+     AND ((l.diff -> 'new' ->> 'session_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'session_id')
+          OR (l.diff -> 'new' ->> 'student_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'student_id'));
+  SELECT COALESCE(array_agg(DISTINCT k ORDER BY k), ARRAY[]::uuid[]) INTO v_kids FROM (
+    SELECT a.student_id AS k FROM public.attendance a
+     WHERE a.session_id = s.id AND (v_floor IS NOT NULL OR a.status IN ('Present', 'Absent', 'Late'))
+    UNION
+    SELECT (c ->> 'student_id')::uuid FROM jsonb_array_elements(COALESCE(v_floor -> 'causes', '[]'::jsonb)) c
+     WHERE (c ->> 'student_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
+    UNION
+    SELECT unnest(v_res)
+  ) q;
+
   v_settled_src := COALESCE((v_ev -> 'settled' ->> 'any')::boolean, true);
+  -- D4 (G-9, R-1): a bill that was ever paid, signed or frozen still counts,
+  -- and so does the settled state of every child who has been on the register.
+  v_settled_src := v_settled_src OR EXISTS (
+    SELECT 1 FROM unnest(v_kids) AS k(id)
+      LEFT JOIN public.invoices i ON i.student_id = k.id AND i.month = v_src_month
+      LEFT JOIN public.invoice_state_floor f ON f.student_id = k.id AND f.month = v_src_month
+     WHERE COALESCE(f.ever_paid OR f.ever_signed OR f.ever_frozen, false)
+        OR (i.id IS NOT NULL
+            AND (COALESCE(i.recorded_payment, 0) > 0
+                 OR i.status::text IN ('paid', 'partial')
+                 OR COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false)
+                 OR COALESCE(i.tuition_frozen, false))));
   v_started_src := public.session_has_started(s.date, s.start_time);
   v_started := v_started_src;
   v_settled := v_settled_src;
@@ -43,7 +90,13 @@
   IF p_action = 'cancel' THEN
     IF s.status = 'Canceled' THEN v_refuse := 'already_canceled'; END IF;
   ELSIF p_action = 'delete' THEN
-    IF v_level <> 'NONE' THEN v_refuse := 'use_cancel'; END IF;
+    -- D4 (R-6): a lesson not cancelled is judged by what it has had; a lesson
+    -- already cancelled by what it has NOW (D2 5.3 step 9, ruling OQ-1):
+    -- cancel, then delete, still works in two calls.
+    IF (s.status <> 'Canceled' AND v_level <> 'NONE')
+       OR (s.status = 'Canceled' AND v_level_now <> 'NONE') THEN
+      v_refuse := 'use_cancel';
+    END IF;
   ELSIF p_action = 'uncancel' THEN
     IF s.status <> 'Canceled' THEN v_refuse := 'not_canceled'; END IF;
   ELSIF p_action = 'move' THEN
@@ -72,7 +125,12 @@
         -- Review change 3: judge where it goes, not only where it comes from.
         v_dest_started := public.session_has_started(n.date, n.start_time);
         v_dest_locked  := public.payroll_month_is_locked(to_char(n.date, 'YYYY-MM'));
-        v_dest_tuition := public.session_month_tuition_settled(s.id, to_char(n.date, 'YYYY-MM'));
+        v_dest_tuition := public.session_month_tuition_settled(s.id, to_char(n.date, 'YYYY-MM'))
+                          -- D4 (G-9): the bill floor of the destination month too
+                          OR EXISTS (SELECT 1 FROM unnest(v_kids) AS k(id)
+                                       JOIN public.invoice_state_floor f
+                                         ON f.student_id = k.id AND f.month = to_char(n.date, 'YYYY-MM')
+                                      WHERE f.ever_paid OR f.ever_signed OR f.ever_frozen);
         v_dest_day := public.session_day_evidence(s.id, s.class_id, n.date);   -- revision 1, F-5
         v_dest := jsonb_build_object('month', to_char(n.date, 'YYYY-MM'), 'started', v_dest_started,
                                      'payroll_month_locked', v_dest_locked, 'tuition', v_dest_tuition,
@@ -125,21 +183,58 @@
     INTO v_invoices, v_inv_fp
     FROM public.invoices i
    WHERE i.month = ANY (v_months)
-     AND i.student_id IN (SELECT a.student_id FROM public.attendance a WHERE a.session_id = s.id);
+     AND (i.student_id IN (SELECT a.student_id FROM public.attendance a WHERE a.session_id = s.id)
+          OR i.student_id = ANY (v_res));                     -- D4: G-10 residue
 
   SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', st.student_id, 'month', m.month)
                             ORDER BY st.student_id::text COLLATE "C", m.month), '[]'::jsonb)
     INTO v_pairs
-    FROM (SELECT DISTINCT a.student_id FROM public.attendance a WHERE a.session_id = s.id) st
+    FROM (SELECT DISTINCT a.student_id FROM public.attendance a WHERE a.session_id = s.id
+          UNION
+          SELECT unnest(v_res)) st                            -- D4: G-10 residue
     CROSS JOIN unnest(v_months) AS m(month);
 
+  -- D4: version 3 = version 2's inputs + the level now, the floor's level and
+  -- its causes (count and digest), so a removal between preview and confirm
+  -- stales the token. The fingerprint is the same hash without the caller.
   v_token := encode(sha256(convert_to(jsonb_build_array(
-      2, p_action, s.id, p_uid, v_tier, v_hash,
+      3, p_action, s.id, p_uid, v_tier, v_hash,
+      s.status, s.date, s.start_time, s.end_time, s.class_id, s.teacher_id,
+      to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS'),
+      v_change, v_aff_fp, v_inv_fp,
+      v_level_now, v_floor ->> 'level', jsonb_array_length(COALESCE(v_floor -> 'causes', '[]'::jsonb)),
+      md5(COALESCE(v_floor -> 'causes', '[]'::jsonb)::text)
+  )::text, 'UTF8')), 'hex');
+  v_fp := encode(sha256(convert_to(jsonb_build_array(
+      3, p_action, s.id, v_tier, v_hash,
       s.status, s.date, s.start_time, s.end_time, s.class_id, s.teacher_id,
       to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS'),
-      v_change, v_aff_fp, v_inv_fp
+      v_change, v_aff_fp, v_inv_fp,
+      v_level_now, v_floor ->> 'level', jsonb_array_length(COALESCE(v_floor -> 'causes', '[]'::jsonb)),
+      md5(COALESCE(v_floor -> 'causes', '[]'::jsonb)::text)
   )::text, 'UTF8')), 'hex');
 
+  -- D4: impact, for the approval rules of step 4. Counts and stored figures
+  -- only (bills now or their floor); nothing priced.
+  SELECT jsonb_build_object(
+           'tier', v_tier,
+           'closed_payroll', COALESCE((v_ev -> 'settled' ->> 'payroll_month_locked')::boolean, true) OR v_dest_locked,
+           'families', COALESCE(count(DISTINCT COALESCE(st.family_id::text, 'student:' || x.k::text))
+                                  FILTER (WHERE x.settled), 0),
+           'paid_vnd', COALESCE(sum(x.paid), 0))
+    INTO v_impact
+    FROM (SELECT k.id AS k, m.month,
+                 GREATEST(COALESCE(i.recorded_payment, 0), COALESCE(f.max_recorded_payment, 0)) AS paid,
+                 (COALESCE(f.ever_paid OR f.ever_signed OR f.ever_frozen, false)
+                  OR COALESCE(i.recorded_payment, 0) > 0 OR COALESCE(i.status::text IN ('paid', 'partial'), false)
+                  OR COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false)
+                  OR COALESCE(i.tuition_frozen, false)) AS settled
+            FROM (SELECT DISTINCT unnest(v_kids || v_reg) AS id) k
+            CROSS JOIN unnest(v_months) AS m(month)
+            LEFT JOIN public.invoices i ON i.student_id = k.id AND i.month = m.month
+            LEFT JOIN public.invoice_state_floor f ON f.student_id = k.id AND f.month = m.month) x
+    LEFT JOIN public.students st ON st.id = x.k;
+
   RETURN jsonb_build_object(
     'action', p_action,
     'session', jsonb_build_object('id', s.id, 'class_id', s.class_id, 'date', to_char(s.date, 'YYYY-MM-DD'),
@@ -163,5 +258,10 @@
     'refresh_pairs', v_pairs,
     'after_cancel', jsonb_build_object('marks_excused', CASE WHEN p_action = 'cancel' THEN v_marks END,
                                        'marks_excused_now', CASE WHEN p_action = 'uncancel' THEN v_marks END),
-    'token', v_token);
+    'token', v_token,
+    -- D4 (floors)
+    'level_now', v_level_now,
+    'floor', v_floor,
+    'fingerprint', v_fp,
+    'impact', v_impact);
 END $fn$;
```

```diff
@@ -46,5 +46,17 @@
        AND l.occurred_at >= now() - interval '30 days'
        AND l.diff -> 'old' ->> 'status' = 'Held'
        AND (l.diff -> 'new' ->> 'status') IS DISTINCT FROM 'Held'
+    UNION ALL
+    -- D4 (G-8): what the evidence floor recorded as removed.
+    SELECT jsonb_build_object('what', COALESCE(c ->> 'what', c ->> 'table'), 'source', 'floor',
+             'operation', c ->> 'op', 'table', c ->> 'table', 'row_id', c ->> 'row_id',
+             'student_id', c ->> 'student_id', 'old_status', c ->> 'old_status', 'new_status', c ->> 'new_status',
+             'level', c ->> 'level', 'lane', c ->> 'lane',
+             'actor_user_id', c ->> 'actor_user_id', 'occurred_at', c -> 'at')
+      FROM public.session_evidence_floor f
+      CROSS JOIN LATERAL jsonb_array_elements(f.causes) AS c
+     WHERE f.session_id = p_session_id
+       AND (c ->> 'at') IS NOT NULL
+       AND (c ->> 'at')::timestamptz >= now() - interval '30 days'
   ) q
 $fn$;
```

## G-10 writers checked (nothing in the repo needs what it refuses)

Re-pointing a mark (`session_id` / `student_id`): no writer in `src`, `supabase/functions` or the migrations. Deleting a person's mark or un-signing it on the person lane: no browser writer deletes attendance; `end_enrollment`, `modify_enrollment_transfer`, `ai_action_undo`, the placeholder clean-ups delete `marked_by IS NULL` rows only (not refused); the Stars engine runs on the service lane (no `auth.uid()`), so its restore (`marked_by` back to NULL) and delete pass; `stars_sync_resolve_conflict` sets `marked_by = auth.uid()`; a lesson delete cascades at trigger depth 2 (not refused).

## Design questions (each built the fail-closed way; for the conductor)

1. **DQ-1 (real hole, needs a ruling).** Live RLS lets a lesson's own teacher and its assistants UPDATE / DELETE its marks at any date (`teacher_attendance_update` / `_delete`, 20260403050441), while D1 accepts them only through `is_teacher_of_class` (sessions within 7 days). Under the rule "a caller D1 refuses writes no floor" (built as instructed), a cover teacher or assistant changing Present -> Absent / Excused on a lesson older than a week lowers the evidence with NO floor (deleting and un-signing are still HC025). The design's own policy pin would have failed on day one; it is built as a pin of the CURRENT write policies with these two named as known, so any further loosening goes red. Options: (a) for such callers store the row's own proof; (b) HC025 for a D1-refused person changing a person's mark on a started lesson (consistent with "a week", G-11 rule 6). I recommend (b) with step 1b.
2. **Later file names.** Resolved in revision 1 (C-3): `20261114091000`..`20261114095000`.
3. **`hec.floor_seen` not built.** Skipping D1 for a lesson already kept in the transaction would leave evidence added and then removed later in the same transaction unrecorded; D1 is called per qualifying row until the floor is STRONG (then only the cause is appended). Cost: one D1 call per changed person's mark, point, transcript or homework row on a started lesson.
4. **Own proof of a date move (zz0).** The design says SOFT R; a move of a lesson that was never Held proves nothing, so own proof is SOFT only when the lesson was Held (D1, when it answers, decides anyway).
5. **Homework submissions:** the keep fires on any `graded_at` change (a regrade moves the evidence off the old day) and on `homework_id` / `student_id` changes, not only on clearing.
6. **Who counts for "settled" with a floor:** today's register, plus children named by the floor's causes (a mark deleted on the service lane), plus children re-pointed away before D4 (audit_log, no time limit; the query uses the gin index on `changed_fields`). `invoices_before` includes the re-pointed children too, so the bills shown are the pairs refreshed.
7. **A bill re-keyed** to another child / month is floored like a delete of the old (child, month).
8. **"Never raises":** the bill floor and the keep catch only D1's errors. If a floor row itself cannot be written, the lowering write fails (closed). In practice only a broken floor table does that.
9. **Token v3** covers the causes' digest as well as their count (the count stops moving at the 20-cause cap).
10. **Residual (not fixable in 1a):** D2's trigger automation lane (`session_change_guard`, not replaced) still reads D1 only; a floored lesson moved into the future through the checked path could later be deleted by the rebuild if D1 reads NONE. Closing it means replacing a third live function.
11. `impact.families` counts a child with no family as their own family.
12. `audit_point_transactions` is not dropped by the rollback (refuses nothing).
13. **Prelude (step 0):** the money-input migrations (20261106100001, 20261021090000, 20261021093000) do not load over D2's prelude: they need `teachers` / `teaching_assistants` / `auth.users` with the real columns and collide with the prelude's simpler `payroll_periods` / `payroll_lines`. Left for step 1b / 3B to extend `d4-prelude.mjs` (the design's two-day budget); 1a needs none of them. The freeze migration (20261106120000) is loaded by `d4-floors`.

## Not verified

The live database (nothing was run against it): its real `is_teacher_of_class`, policies (pinned statically from the migration files), data volumes (no EXPLAIN of the residue query or the keep on live sizes), and whether `pg_get_triggerdef` prints the same text there (the brief says what to do if only `md5_def` differs). The real Stars engine against the floors (that is `d4-stars-interplay`, step 3A); the bun suite `scripts/sessionGuard.test.ts` was not run (no bun here) and was not changed. The card was looked at in a stand-alone page, not inside the live dialog.
