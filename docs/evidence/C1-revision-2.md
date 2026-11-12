# C1 Revision 2 - class recorder fixes for critic 2 (N1-N6)

**Where I am / next step:** DONE. Recorder suite 367 passed / 0 failed (was 284). Full run 2699 / 35 suites / 0 failed (at 365 recorder assertions; two cases added after it, recorder suite re-run alone). 24 mutations, 24 caught. `.probe/` and the node_modules link removed.

## Commands and totals

- `node scripts/pgtest/recorder.test.mjs supabase/migrations/20260717090000_audio_transcript_pipeline.sql supabase/migrations/20261111110000_ta_standing_assignments_and_homework_upload.sql supabase/migrations/20261112100000_class_recorder.sql` -> `367 passed, 0 failed`. The migration is pasted twice at the start, four more times by the preflight cases (refusals and one success), and once over live data near the end.
- `node scripts/pgtest/run.mjs` -> `2699 assertions across 35 suites, 0 suite(s) failed` (`class recorder 365 passed, 0 failed`; app and edge-function typechecks ok). Then two assertions were added to the recorder suite only (late-Stop view check, service-role deletion write) and the suite re-run alone: 367/0.
- No old assertion was dropped; six were renamed or changed with their rule (table below). The post-apply probes below were run against an in-process database after two pastes: P2 0/0/`30,10,0.50,v1-2026-11`; P3 10 triggers `O`; P4 32 functions, 0 DEFINER without `search_path`; P5 `class_recordings` INSERT,SELECT + 28 UPDATE columns, no anon; P6/P7 as stated.

## Mutation run

`.probe/mut.mjs` (throwaway, deleted) wrote a mutated copy to `.probe/m_class_recorder.sql` and ran the real suite on it. CAUGHT = a FAIL or a non-zero exit.

| Mutation | Result |
|---|---|
| N1 recorder back on the old bucket `class-recordings` (every literal, DO UPDATE) | CAUGHT (crash) |
| N1 preflight policy check removed | CAUGHT (363/2) |
| N1 preflight bucket-settings check removed | CAUGHT (363/2) |
| N1 preflight ignores RLS off on storage.objects | CAUGHT (364/1) |
| N1 select policy not scoped by bucket (OR) | CAUGHT (348/17) |
| N1 migration also edits the old bucket | CAUGHT (361/4) |
| N2 view: late chunks count as live | CAUGHT (364/1) |
| N2 late allowance x100 at arming | CAUGHT (359/6) |
| N2 Stop clamped into the window again | CAUGHT (363/2) |
| N2 late Stop not abandoned | CAUGHT (362/3) |
| N2 view: evidence ignores a late Stop | SURVIVED (365/0) on the first run -> case added -> CAUGHT (366/1) |
| N2 register: late flag always false | CAUGHT (362/3) |
| N3 non-admin may shorten delete_after | CAUGHT (363/2) |
| N3 view: evidence survives a person's deletion request | CAUGHT (362/3) |
| N3 marked deleted before its date | CAUGHT (362/3) |
| N3 admin bringing retention forward is not a request | CAUGHT (364/1) |
| N3 whole-table UPDATE grant back | CAUGHT (361/5) |
| N3 deletion fields taken without the server flag | SURVIVED (366/0) (column privileges hid it) -> service-role case added -> CAUGHT (366/1) |
| N4 non-admin stop request accepted | CAUGHT (364/2) |
| N4 stop reason checked against any request, not its reason | CAUGHT (366/1) |
| N5 register skips the still-teaches check | CAUGHT (366/1) |
| N5 start skips the still-teaches check | CAUGHT (366/1) |
| critic 2 survivor 1: evidence without `completed_at` | CAUGHT (365/2) |
| critic 2 survivor 2: `stopped_by` = the owner, not the actor | CAUGHT (366/1) |

**24 applied, 24 caught** (two after a case was added; both re-runs listed).

Files touched (only these): `supabase/migrations/20261112100000_class_recorder.sql` (edited in place: never applied), `scripts/pgtest/recorder.test.mjs`, `scripts/pgtest/run.mjs` (one line: the recorder suite also loads `20260717090000_audio_transcript_pipeline.sql`, first), `docs/evidence/C1-architecture.md` (Revision 2 changelog at the top; sections 5.5, 6.2, 6.3, 6.4, 6.5, 6.6, 7, 8, 9.1), this file. Written and tested, NOT applied to any database.

## How each finding was closed

| # | Fix | Proof (suite assertion) |
|---|---|---|
| N1 BLOCKER | Own bucket `class-recorder-audio` (`ON CONFLICT DO NOTHING`); not one statement touches `class-recordings` or "staff_manage_class_recordings". Preflight DO block right after `BEGIN` (before anything is created) RAISES when: `storage.objects` has no RLS; `class-recorder-audio` exists with settings other than private / 8 388 608 / the six types; any PERMISSIVE policy on `storage.objects` other than `class_recorder_audio_insert` / `_select` is not scoped by `bucket_id` or names `class-recorder-audio`. Every literal in triggers / confirm / policies changed. `SET LOCAL lock_timeout = '5s'`. | "after two applies, `class-recordings` and every policy that names it are byte-identical" (bucket row as JSON + pg_policies row, compared again after the third paste and at the very end); "the critic's probe: a teacher of another class (the critic's T2) / a TA / a parent / a student / anon can do nothing in the recorder's bucket - select, update, delete, insert" (5 x 4); "control: the old policy is live here - a teacher of another class reads Teacher Transcripts' upload"; "no policy at all - staff_manage_class_recordings included - shows T2 a recorder file"; preflight cases: unscoped policy, someone else's policy on the bucket, public bucket, other size limit, RLS off (each refuses), RESTRICTIVE policy (allowed); "exactly two policies reach the recorder's bucket" |
| N2 MAJOR | `registered_at := clock_timestamp()` in `recorder_register_chunk`. A chunk is LIVE iff `registered_at <= started_at + t_end_ms + late_after_ms`; only live chunks feed `verified_audio_ms`; late ones are `late_audio_ms`; the register result says `late`. `ended_at := now()` at Stop (no clamp); a Stop after `capture_closes_at + late_after` makes the recording `abandoned` ("stopped after the lesson window"); the view also requires `ended_at <= capture_closes_at + late_after`. | "the critic's probe: a Stop three days later ... the recording is abandoned, and the real moment is kept"; "and no filler is taken after it"; "the critic's probe, offline variant: 92 minutes uploaded after Stop is no evidence"; "a chunk that reaches the server 9 minutes after its end ... is live" / "20 minutes ... is late"; "58 minutes ... captured live ... counts" (live chunk by chunk) |
| N3 MAJOR | Column privileges: `authenticated` may UPDATE only the listed columns - not `started_at`, `ended_at`, `stopped_by`, `completed_at`, `abandoned_at`, `audio_deleted_at`, `deletion_requested_at/_by`, `deletion_reason`, `stop_request_reason`, `updated_at`, `armed_at`, `created_at`, `id`. Trigger: `delete_after` only from an admin person, or brought forward by `recorder_request_deletion` (transaction-local flag `recorder.server_write = 'delete:<id>'`); an admin bringing it forward is stamped as that admin's deletion request; deletion fields only with the flag. `deleted` refused before `delete_after`. View: no evidence once a deletion was requested; `deleted_by_retention`, `audio_deleted_at`, `deletion_requested_by` exposed. | "the critic's probe: the recorder setting delete_after to the past while open is ignored"; "the deletion, stop-reason and stamp columns are not writable by a signed-in caller at all"; "files gone, but before its date nobody - not the retention job - may mark it deleted"; "the tombstone: deleted by retention after a verified complete recording, it still says a recording ran"; "from that moment it is no evidence - before the audio is even gone"; "an admin bringing a verified recording's deletion forward ... the evidence ends"; "deleted early at a person's request, it is no evidence" |
| Rename | `recording_ran_evidence`, `evidence_threshold_ms`, `evidence_min_fraction` (setting and snapshot). | every evidence assertion |
| N4 minor | `stop_requested_at` from a non-admin is ignored unless `recorder__switch_off` / `recorder__session_canceled` set the flag (`stop:switch_off` / `stop:session_canceled`); new server column `stop_request_reason`; a page may claim `session_canceled`/`switch_off` only when it equals that reason. | "the critic's probe: a teacher who files its own stop request cannot then say the lesson was cancelled"; "nor claim the class was switched off when the lesson was cancelled"; "the server recorded why it asked"; "an admin may ask a running recording to stop ... with the reason" |
| N5 minor | `recorder__may_record(user, session, class)` (admin / standing teacher / teacher of that session), asked at arming, at Start and in every `recorder_register_chunk`. | "the critic's probe: the lesson given back to the class teacher, the cover teacher's recorder takes no more audio"; "and one they armed cannot start"; "given back to them, it takes audio again" |
| N6 minor | Cases added. | "stopped, still uploading: enough verified audio, but not evidence (N6)"; "abandoned with all its audio confirmed: not evidence (N6)"; "stopped_by is the admin who pressed Stop, not the owner" |

Left as is, with reasons:

- A cover teacher taken off a lesson cannot close (abandon) the recording they armed: once they are not a listener, the row is not theirs to see when closed, so the UPDATE's new row fails the read policy. An admin or the 14-day stale sweep closes it (asserted: "an admin abandons it"). Widening the read policy to fix that would re-open what F13 closed.
- The preflight reads policy TEXT: a policy that mentions `bucket_id` but ORs it with something else (`bucket_id = 'x' OR has_role(...)`) passes it. Every storage policy in `supabase/migrations/` was scanned: all mention `bucket_id`; post-apply probe 7 below lists every policy reaching the bucket, which is the behavioural check.
- The server still cannot hash stored audio (C2's edge function may). The live rule proves a device was registering plausible-size chunks during the lesson, not that they are a lesson.
- `recorder.server_write` is a transaction-local GUC. API callers cannot set it: PostgREST exposes `public` only, `set_config` is in `pg_catalog`, and `authenticated` cannot create functions. If that ever changes, the flag becomes forgeable; column privileges still keep the deletion stamps out of reach.

## Assertions renamed or changed because the rule changed (none dropped)

| Old name | Now | Why |
|---|---|---|
| a completed 30-second recording ... does NOT count as a held lesson | ... does NOT count as evidence that a recording ran | column renamed |
| 90 seconds of a 95-minute lesson: complete, but not evidence the lesson was held | ... not evidence that a recording ran | column renamed |
| and counts as evidence the lesson was held: verified 58 min >= half of 90 | and counts as evidence that a recording ran: verified live 58 min ... | renamed; chunks now registered minute by minute (live), as the rule now requires |
| a deletion request written by the recorder is stamped with the recorder ... | "a deletion request cannot be written into the row by the recorder" (permission denied) + "a deletion request made through the function is stamped with the recorder and the server's time" | N3: deletion columns are server-only |
| and it cannot be re-attributed afterwards | and it cannot be re-attributed afterwards, not even by an admin | same, now a privilege refusal |
| a Stop after the window is recorded at the window's end | a Stop long after the window is not clamped into it: the recording is abandoned, at the real moment | N2: the clamp was the hole |

## Contract for D1

D reads `public.recorder_session_evidence` and decides on ONE column: **`recording_ran_evidence`** (`WHERE session_id = $1 AND recording_ran_evidence`), and labels it **"A recording was made"**.

It means: a recording RAN, live, for at least `evidence_min_fraction` (default 0.50) of the scheduled lesson, verified by the server - completed, every chunk confirmed in storage, stopped inside the window (+ 10 min), nobody asked for its early deletion, and only chunks the server registered within 10 minutes of their claimed end counted.

**It is NOT proof that children attended, or that a lesson was taught.** An empty room, or a laptop left running, records the same. Never label it "lesson held" or "children present".

After deletion by retention it stays true (`deleted_by_retention`, `audio_deleted_at`: "a recording ran; audio deleted on <date>"). After a person asks for early deletion it is false (`deletion_requested_at`, `deletion_requested_by`). `counts_as_held_evidence` and `held_threshold_ms` no longer exist. Column table: `C1-architecture.md` section 7.

## Contract for C2

Changed for the client (everything else in `C1-revision.md` "Contract for C2" stands):

1. **Bucket: `class-recorder-audio`** (one constant). Not `class-recordings` - that is Teacher Transcripts' bucket and the recorder has no access to it. Same paths: `{class}/{recording}/{track}/{000000}.{ext}` and `{class}/{recording}/manifest.json`; same 8 MB / webm-flac-wav-json limits.
2. **Live upload rule.** A chunk counts only if `recorder_register_chunk` is called no later than `late_after_ms` (default 10 minutes; read it from the recording row) after the moment the chunk ends, i.e. `started_at + t_end_ms + late_after_ms` on the server's clock. Register each chunk as soon as it is cut, even before uploading it; the upload and confirm may follow later. Later registrations are accepted and stored but the result says `late: true` and they never count; the page should say so ("uploaded too late to count as a live recording").
3. **Stop.** UPDATE `status = 'uploading'` is a Stop only up to `capture_closes_at + late_after_ms`. Later, the same UPDATE leaves the row `abandoned` (`abandon_reason = 'stopped after the lesson window'`), and no more chunks are accepted. The page must read back `status` after Stop, and should stop by itself at `capture_closes_at` (server clock via `recorder_server_time()`). `ended_at` is the real moment of the call.
4. **Stop reasons.** `session_canceled` / `switch_off` are accepted only when the server asked for that reason (`stop_request_reason`); writing `stop_requested_at` yourself does nothing.
5. **Deletion.** Only `recorder_request_deletion(recording, reason)`; the row's deletion columns and `delete_after` cannot be written by the page (privilege error or ignored). The page should warn: "Deleting this recording early also removes the record that a recording was made."
6. **Entitlement.** If the teacher is taken off the lesson (or archived) mid-recording, Start and `recorder_register_chunk` raise `You no longer teach this lesson ...`: keep the local bytes and tell the teacher to ask an admin.
7. `recorder_register_chunk` returns one more key: `late` (boolean).

## Post-apply read-only probes for the conductor (SQL editor; run 6 and 7 BEFORE applying too)

1. `SELECT to_regclass('public.class_recordings'), to_regclass('public.recorder_session_evidence'), to_regclass('public.recorder_audit_log');` - all non-null.
2. Recorder switched off everywhere and empty: `SELECT count(*) FROM public.class_recording_settings WHERE recording_enabled;` = 0; `SELECT (SELECT count(*) FROM public.class_recordings) + (SELECT count(*) FROM public.class_recording_tracks) + (SELECT count(*) FROM public.class_recording_chunks) + (SELECT count(*) FROM public.class_recording_markers) + (SELECT count(*) FROM public.recorder_child_consents) + (SELECT count(*) FROM public.recorder_device_profiles) + (SELECT count(*) FROM public.class_recording_settings) + (SELECT count(*) FROM public.recorder_audit_log);` = 0; `SELECT retention_days, late_after_minutes, evidence_min_fraction, consent_wording_version FROM public.recorder_settings;` = one row `30, 10, 0.50, v1-2026-11`.
3. Triggers: `SELECT tgname, tgrelid::regclass, tgenabled FROM pg_trigger WHERE tgname IN ('recorder_enrollment_consent','recorder_session_canceled','class_recordings_before_insert','class_recordings_before_update','class_recordings_before_delete','class_recordings_audit','class_recording_markers_before_insert','recorder_audit_no_change','recorder_audit_no_truncate','recorder_settings_audit') ORDER BY 1;` - 10 rows, all `O`.
4. `SELECT count(*), count(*) FILTER (WHERE prosecdef AND NOT ('search_path=public' = ANY (proconfig))) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'recorder%';` - 32, 0.
5. `SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) FROM information_schema.role_table_grants WHERE table_schema='public' AND (table_name LIKE 'recorder%' OR table_name LIKE 'class_recording%') AND grantee IN ('anon','authenticated') GROUP BY 1,2 ORDER BY 1,2;` - no anon row; `class_recordings` shows `INSERT,SELECT` for authenticated (UPDATE is column-level: `SELECT count(*) FROM information_schema.column_privileges WHERE table_name='class_recordings' AND grantee='authenticated' AND privilege_type='UPDATE';` = 28).
6. Buckets: `SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id IN ('class-recordings','class-recorder-audio') ORDER BY id;` - `class-recorder-audio`: false, 8388608, {audio/webm,audio/flac,audio/x-flac,audio/wav,audio/x-wav,application/json}; `class-recordings`: UNCHANGED from the before-apply run (expected false, 52428800, its mp3/m4a/mp4 list).
7. Policies: `SELECT policyname, cmd, permissive FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND concat_ws(' ', qual, with_check) LIKE '%class-recorder-audio%' ORDER BY 1;` - exactly `class_recorder_audio_insert` INSERT and `class_recorder_audio_select` SELECT. `SELECT policyname, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='staff_manage_class_recordings';` - identical to the before-apply run. `SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND permissive='PERMISSIVE' AND concat_ws(' ', qual, with_check) NOT LIKE '%bucket_id%';` = 0.
8. `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user;` - true (else confirm / complete / delete raise: fail closed, but nothing works).
9. With the publishable key: `GET /rest/v1/class_recordings?select=id` -> 42501 permission denied (not "not in schema cache"); `POST /rest/v1/rpc/recorder_register_chunk` -> permission denied for anon.
10. Teacher Transcripts still works: upload an mp3 there, or `SELECT file_size_limit FROM storage.buckets WHERE id='class-recordings'` = 52428800.

Apply outside lesson hours (the triggers and foreign keys take SHARE ROW EXCLUSIVE on enrollments, sessions, classes, students until COMMIT; `lock_timeout` 5 s makes it fail rather than queue).
