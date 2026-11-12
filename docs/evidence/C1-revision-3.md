# C1 Revision 3 - class recorder fixes for critic 3 (M1, M2, minors, survivors)

**Where I am / next step:** DONE. Recorder suite 398 passed / 0 failed (was 367). Full run 2730 / 35 suites / 0 failed (at 396 recorder assertions; two cases added after it for mutation survivors, recorder suite re-run alone: 398/0). 24 mutations, 24 caught (two after a case was added). `.probe/` and the node_modules link removed.

Setup note: the worktree's base (dc0deb5, release/d1) conflicted with `claude/hec-conductor-setup-efbaa5` in `src/components/ui/tooltip.tsx` (not a file I may touch), so the merge was aborted and this branch reset to the conductor branch (5c40025); every commit here sits on top of it. Nothing was lost: dc0deb5 is on other branches.

Files touched (only these): `supabase/migrations/20261112100000_class_recorder.sql` (edited in place: never applied), `scripts/pgtest/recorder.test.mjs`, `docs/evidence/C1-architecture.md` (Revision 3 changelog only), this file. Written and tested, NOT applied to any database.

## Commands and totals

- `node scripts/pgtest/recorder.test.mjs supabase/migrations/20260717090000_audio_transcript_pipeline.sql supabase/migrations/20261111110000_ta_standing_assignments_and_homework_upload.sql supabase/migrations/20261112100000_class_recorder.sql` -> before any test was added, with the migration already changed: `367 passed, 0 failed` (no existing assertion broke). With the new cases: `396 passed, 0 failed`; after the two survivor cases (mutation run below): **`398 passed, 0 failed`**. The suite pastes the edited file twice at the start ("applies", "and applies a second time unchanged"), four more times in the preflight cases and once over live data.
- `node scripts/pgtest/run.mjs` -> `2730 assertions across 35 suites, 0 suite(s) failed` (`class recorder 396 passed, 0 failed`; session cancel guard 266, session held evidence 143, app and edge-function typechecks ok). Revision 2 was 2699 at 365 recorder assertions: +31, all recorder. Then two recorder assertions added and the suite re-run alone: 398/0.
- No assertion removed, renamed or changed.

## How each finding was closed

| # | Fix | Proof (suite assertion) |
|---|---|---|
| M1 MAJOR | View, per chunk: `live` = `registered_at <= started_at + t_end_ms + late_after_ms` **AND `confirmed_at <= started_at + t_end_ms + late_after_ms`**. `confirmed_at` is the server's `now()` in `recorder_confirm_chunk`. Late chunks still feed `late_audio_ms`. | "the critic's probe: 50 minutes registered on time, none late, not a byte uploaded" -> "the bytes uploaded and confirmed three days later are stored" -> "and it completes" -> "but the critic's probe is closed: registered on time, uploaded days later is NO evidence, and all of it is late audio (M1)" `[true, false, v 0, late 3 000 000, th 2 850 000]`. Bound: "bytes confirmed 9 minutes after the chunk's end count as live; 11 minutes after, late (M1)" `[60 000, 60 000]`. |
| M2 MAJOR | View, per chunk: `in_lesson_ms = GREATEST(0, LEAST(t_end_ms, lesson_end_ms) - GREATEST(t_start_ms, lesson_start_ms))`, lesson bounds on the chunks' timeline (`scheduled_start/end - started_at`, rounded inwards); bytes pro rata (`stored_size * in_lesson_ms / span`) for the byte floor. Per track `LEAST(lesson ms, server_capture_ms, lesson bytes / floor)`, max over tracks, then `LEAST` with `lesson_overlap_ms` = `verified_lesson_ms`, which `recording_ran_evidence` and `too_short` now compare with `evidence_threshold_ms`. `verified_audio_ms` and `claimed_audio_ms` unchanged. | "the critic's probe: 15 of 60 lesson minutes (plus pre-roll and grace) is NOT evidence; only the 15 lesson minutes are lesson audio (M2)" `{flag false, v 1 800 000, vl 900 000, th 1 800 000, lo 3 600 000}`; "exactly half the lesson, all inside it, is evidence (M2 boundary)" `[true, 1 800 000, 1 800 000]`; "a chunk straddling the lesson's start counts only its part inside: 29.5 of 60 minutes is not half (M2)" `[false, v 1 800 000, vl 1 770 000]`; "a chunk straddling the lesson's end counts only its part inside, grace not at all: 29.5 of 60 is not half (M2)" `[false, v 1 860 000, vl 1 770 000]`. The existing "58 minutes ... counts" case passes unchanged (`vl 3 480 000`). |
| Survivor 1 (upload class prefix) | test only | "the owner cannot upload a manifest under another class's prefix with their own recording id" + "nor a chunk" (recording `uploading`, so only the class check refuses) |
| Survivor 2 (deleted recording readable) | test only | "control: an admin reads a complete recording's file" -> "marked deleted, a file still left in storage is not readable by an admin" + "nor by the class teacher" |
| Survivor 3 (lesson-overlap cap) | test only | "and it is never more than the server saw run inside the lesson: Stop 27 minutes in caps it at 27 (overlap cap)" `[false, 1 620 000, 1 620 000]` (uncapped it would be 30 min and true) |
| m1 minor | Trigger: `abandon_reason` is kept as it was unless this update moves the row to `abandoned`. On that move: the server's reason when the server path set the transaction-local flag `abandon:<reason>` (added to switch-off, cancellation, `recorder_request_deletion`, `recorder_expire_stale`); `unspecified` when the page writes one of the server's reasons (`switch_off`, `session_canceled`, `deletion requested`, `never finished`, `stopped after the lesson window`, case/space-insensitive); otherwise the page's own words. | "m1: the critic's probe - the recorder presets abandon_reason on an open row" -> "but nothing is preset"; "m1: abandoning with a server reason the server did not give is 'unspecified'"; "m1: the page's own words are kept"; "m1: the server's own path still gives its reason" ('deletion requested'); existing "the armed recording is abandoned" `switch_off` and `session_canceled` cases still pass. |
| m2 minor | `GRANT SELECT, INSERT` + `GRANT UPDATE (device_label, device_hash, sample_rate, channel_count, codec, bitrate, applied_settings, chunk_count, total_bytes, total_ms)` on `class_recording_tracks`. | "m2: the recorder cannot move a track to another recording" / "nor rename it" / "nor re-date it" (permission denied); "m2: but it still describes its track" |
| m3 minor | `ELSIF v_server_delete AND NEW.deletion_requested_at IS NOT NULL THEN` | "m3: the critic's probe - the recorder forges the deletion flag and moves delete_after" -> "m3: but without a stamped request the date does not move" |

Minors left: none. One deliberate difference from critic 3's wording for m1: page text other than the server's reasons is still kept (a reserved list, not a fixed list of page reasons), because a fixed page list would be a new client contract the brief forbids; the misleading case (imitating the server) is closed.

## Contract note for C2

Late-uploaded bytes are stored but never count: a chunk counts toward `recording_ran_evidence` only if `recorder_register_chunk` AND `recorder_confirm_chunk` both succeed no later than `late_after_ms` (default 10 minutes, on the recording row) after the moment the chunk ends (`started_at + t_end_ms + late_after_ms`, server clock) - so register, upload and confirm each chunk as soon as it is cut; this replaces revision 2's item 2 ("the upload and confirm may follow later"). Pre-roll and grace audio never count: only the part of each chunk between `scheduled_start` and `scheduled_end` counts toward the half-lesson rule, so the page should say so and not present pre-roll or overrun as lesson time; the capture window itself is unchanged. Also (m1): an `abandon_reason` written while the row stays open is ignored, and the page cannot use the server's reasons (`switch_off`, `session_canceled`, `deletion requested`, `never finished`, `stopped after the lesson window`) - they are stored as `unspecified`; (m2) a track's `recording_id`, `track` and `created_at` cannot be updated (insert the track right the first time).

## Mutation run

`.probe/mut.mjs` (throwaway, deleted) wrote each mutated copy to `.probe/m<N>_class_recorder.sql` and ran the real suite on it, 4 in parallel. CAUGHT = a FAIL or a non-zero exit. Critic 3's 16 were rebuilt from its table (its script was deleted), each against today's text.

| Mutation | Result |
|---|---|
| preflight: unscoped-policy test removed | CAUGHT (395/1) |
| preflight: bucket size-limit test removed | CAUGHT (395/1) |
| upload: a confirmed chunk may be uploaded again | CAUGHT (392/4) |
| upload: class prefix not checked (critic 3 survivor 1) | CAUGHT (395/1) |
| read object: deleted recordings still readable (survivor 2) | CAUGHT (394/2) |
| view: live allowance doubled (registration bound) | SURVIVED (396/0) on the first run -> case added -> CAUGHT (397/1) |
| retention: non-admin may move delete_after | CAUGHT (391/5) |
| row delete: allowed before 'deleted' | CAUGHT (395/1) |
| deletion request: any signed-in user | CAUGHT (388/8) |
| enrolment without consent does not switch off | CAUGHT (392/4) |
| cancellation does not request a stop | CAUGHT (393/3) |
| register: audio after the window accepted | CAUGHT (395/1) |
| confirm: stored size not compared | CAUGHT (suite crashed) |
| grant: server stamps writable again | CAUGHT (395/1) |
| listen: `is_teacher_of_class` instead of the session's teacher | CAUGHT (383/13) |
| view: evidence not capped by lesson overlap (survivor 3) | CAUGHT (395/1) |
| **new** M1: confirmation time not checked | CAUGHT (394/2) |
| **new** M1: confirmation allowance doubled | CAUGHT (395/1) |
| **new** M2: pre-roll counts (no clip at the start) | CAUGHT (394/2) |
| **new** M2: grace counts (no clip at the end) | CAUGHT (394/2) |
| extra m1: a page may give a server reason | CAUGHT (395/1) |
| extra m2: whole-table UPDATE on tracks back | CAUGHT (393/3) |
| extra m3: the flag alone moves delete_after | CAUGHT (395/1) |
| extra M2: bytes not pro rata | SURVIVED (396/0) on the first run -> case added -> CAUGHT (397/1) |

**24 applied, 24 caught** (two after a case was added). Why the registration-bound survivor: with M1 the confirm bound implies it through the API (a chunk is confirmed only after it is registered), so only a hand-set state (registered late, confirmed early) can tell them apart; the case "a chunk the server registered 11 minutes after its end is late, whenever its bytes came" keeps the bound tested in its own right. The pro-rata case: "and only that part's share of its bytes counts toward the byte floor (M2, pro rata)" (885 000 vs 900 000).

## Post-apply read-only probes for the conductor (SQL editor)

Revision 2's probes 1-10 stand (`C1-revision-2.md`), with these values now (run against an in-process database after two pastes of this file: P3 10 triggers all `O`; P4 `32, 0`; P5 as below):

1. Unchanged.
2. Unchanged.
3. Unchanged (10 rows, all `O`).
4. Unchanged: 32, 0 (no function added).
5. `role_table_grants`: no anon row; `class_recordings` INSERT,SELECT and **`class_recording_tracks` INSERT,SELECT** (was INSERT,SELECT,UPDATE); column-level UPDATE: `SELECT table_name, count(*) FROM information_schema.column_privileges WHERE table_name IN ('class_recordings','class_recording_tracks') AND grantee='authenticated' AND privilege_type='UPDATE' GROUP BY 1 ORDER BY 1;` = `class_recording_tracks 10`, `class_recordings 28`.
6. - 10. Unchanged.

Critic 3's additions, BEFORE and AFTER the paste, compare:

- 7b: `SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND permissive='PERMISSIVE' AND (coalesce(qual,'') ~* '\mor\M' OR coalesce(with_check,'') ~* '\mor\M') ORDER BY 1;` - every OR branch carries its own `bucket_id = '<another bucket>'`. Before applying also `SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects';` vs the tree's 83 before / 85 after; a different number means dashboard-made policies: read them.
- 11: `SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger WHERE tgrelid IN ('public.sessions'::regclass, 'public.enrollments'::regclass) AND NOT tgisinternal;` - after = before + `recorder_enrollment_consent`, `recorder_session_canceled`.
- 12: `SELECT md5(pg_get_functiondef('public.session_recording_evidence(uuid)'::regprocedure)), md5(pg_get_functiondef('public.session_held_evidence(uuid)'::regprocedure));` - identical before and after.
- 13: `SELECT public.session_cancel_guard_status();` (as an admin) - identical before and after.

New for revision 3 (after only):

- 14: the view carries M1 and M2: `SELECT position('confirmed_at <=' in pg_get_viewdef('public.recorder_session_evidence'::regclass)) > 0 AS m1, position('in_lesson_ms' in pg_get_viewdef('public.recorder_session_evidence'::regclass)) > 0 AS m2;` - true, true.
- 15: the trigger carries m1 and m3: `SELECT prosrc LIKE '%v_server_delete AND NEW.deletion_requested_at IS NOT NULL THEN%' AS m3, prosrc LIKE '%abandon:%' AS m1 FROM pg_proc WHERE proname='recorder__recording_before_update';` - true, true.

(14 and 15 were run in-process after two pastes: true, true / true, true.)

Apply outside lesson hours (`lock_timeout` 5 s on sessions / enrollments / classes / students).
