VERDICT: PASS WITH CHANGES

Where I am / next step: DONE. 0 BLOCKER, 2 MAJOR (M1, M2: both in the evidence view, which nothing reads yet), 3 MINOR. Safe to apply to live now with the recorder switched off; M1 and M2 must be fixed (in this file before applying, or by a follow-up `CREATE OR REPLACE VIEW`) before workstream D wires the evidence into `session_recording_evidence`.

Changes asked for (each small, verifiable by diff + one test):
1. M1 - view `live` test also requires `confirmed_at <= started_at + t_end_ms + late_after_ms`; C2 contract item 2 reworded. Test: register on time, upload 3 days later -> no evidence.
2. M2 - view counts only the part of each live chunk inside the scheduled lesson. Test: 5 min pre-roll + 15 min lesson + 10 min grace of a 60-min lesson -> no evidence.
3. m1 - `abandon_reason` from the page only from a fixed list; server reasons only from server paths.
4. m2 - column-level UPDATE grant on `class_recording_tracks` without `recording_id`, `track`, `created_at`.
5. m3 - `delete_after` brought forward only together with the stamped request (`ELSIF v_server_delete AND NEW.deletion_requested_at IS NOT NULL`).
6. Tests for the three mutation survivors below (upload class prefix, deleted-recording read, lesson-overlap cap).

# C1 critic 3 (third review of the class recorder migration, revision 2)

Setup: own worktree, `git merge claude/hec-conductor-setup-efbaa5` (one doc conflict, `docs/ENHANCEMENT_BASELINE.md`, resolved to the conductor's copy; nothing else touched). Probes in `.probe/` (deleted at the end).

Suite, as run.mjs registers it:
`node scripts/pgtest/recorder.test.mjs supabase/migrations/20260717090000_audio_transcript_pipeline.sql supabase/migrations/20261111110000_ta_standing_assignments_and_homework_upload.sql supabase/migrations/20261112100000_class_recorder.sql` -> `367 passed, 0 failed` (matches the known result).

Probe harness: `.probe/p3.mjs` = the suite's own prelude, fixtures and helpers (recorder.test.mjs lines 1-373, so the same 20260717090000 + TA migration + recorder, pasted twice) + my cases. Time is moved with the suite's `travel(id, mins, true)` (the whole recording, its lesson and its chunks' server stamps move together, so every server-clock check stays consistent).

## Findings (appended as confirmed)

### M1 MAJOR (executed) - the "live" rule bounds REGISTRATION, not the bytes: register on time, upload filler three days later, and it is evidence

`supabase/migrations/20261112100000_class_recorder.sql:1813-1814` (the view's `live` test reads only `registered_at`), `:1556-1595` (`recorder_confirm_chunk` has no time bound), `:2049` (`recorder_can_upload` accepts uploads for as long as the row is `uploading`, i.e. up to `stale_upload_days` = 14).

Probe (`.probe/p3.mjs`, "N2a"): a 95-minute lesson; Start; 100 chunks of 30 s registered one by one, each 1 s after its claimed end (none `late`); Stop at 50 min with NOT ONE BYTE uploaded; three days pass; then 100 objects of 64 000 bytes are uploaded to the registered paths and confirmed with the registered SHA (a client claim); manifest; complete. Real output:

```
P3 N2a any registered late? :: false
P3 N2a stop (no byte uploaded yet) :: null
P3 N2a filler uploaded+confirmed 3 days later, errors :: 0
P3 N2a complete :: null
P3 N2a view :: {"recording_ran_evidence":true,"v":3000000,"vl":3000000,"lo":3004036,"th":2850000,"late":0,"status":"complete","confirm_lag":"3 days 00:50:06.035"}
```

So a page needs only to send ~100 small RPC calls during the lesson (no audio at all); the "audio" can be made afterwards. C1-revision-2 "Contract for C2" item 2 even says "the upload and confirm may follow later", and the D1 contract says the flag means "a recording RAN, live". The offline-queue case does not need the gap: when the Wi-Fi drops, registration fails too, so registration and upload drain together.

Fix (small): in the view's `live` test also require `k.confirmed_at <= r.started_at + ((k.t_end_ms + r.late_after_ms) * INTERVAL '1 millisecond')`; change C2 contract item 2 to "register, upload and confirm within late_after of the chunk's end". Test: the N2a sequence above -> `recording_ran_evidence = false`, `late_audio_ms = 3000000`.

### M2 MAJOR (executed) - the half-lesson threshold counts pre-roll and grace audio as lesson audio: 15 minutes of a 60-minute lesson is "evidence"

`:1797-1819` + `:1749`: `verified_audio_ms` sums every live chunk wherever it sits in the capture window, and is then only capped by `lesson_overlap_ms` (how long the server saw it RUN across the lesson), not intersected with the lesson. Up to pre_roll + grace = 15 minutes outside the lesson count toward `evidence_threshold_ms`, and the column `verified_lesson_ms` says "lesson" for them.

Probe ("N2b"): 60-minute lesson; Start at capture open (5 min before); live chunks for the 5 min of pre-roll, the first 15 min of the lesson, nothing for 45 min, and the 10 min of grace; Stop at the window's close; complete. Real output:

```
P3 N2b chunk errors :: []
P3 N2b complete :: null
P3 N2b view (only 15 of 60 lesson minutes have audio) :: {"recording_ran_evidence":true,"v":1800000,"vl":1800000,"lo":3600000,"th":1800000,"late":0,"status":"complete",...}
```

25 % of the lesson passes a rule that is documented (`:160-162`, `:1716-1721`, D1 contract) as "at least 50 % of the scheduled lesson".

Fix (small): per chunk, count only the part inside the lesson - in the inner select use `GREATEST(0, LEAST(k.t_end_ms, ls.end_ms) - GREATEST(k.t_start_ms, ls.start_ms))` with `ls.start_ms = extract(epoch FROM r.scheduled_start - r.started_at)*1000`, `ls.end_ms = extract(epoch FROM r.scheduled_end - r.started_at)*1000`, for the `live_ms` that feeds `verified_lesson_ms`/the flag (keep `claimed_audio_ms` as is). Test: N2b -> flag false, `verified_lesson_ms = 900000`; the suite's existing "58 minutes ... counts" case must still pass.

### m1 MINOR (executed) - the recorder can preset `abandon_reason` (and so the reason the row will close with)

`:1172` keeps whatever text the page wrote while the row was open. Probe ("N3", owner, open recording): `abandon_reason: CHANGED`. A page can abandon its own recording with `abandon_reason = 'session_canceled'` or `'switch_off'`, imitating the server's reasons (the N4 rule protects `stop_reason` only). An abandoned row is never evidence, so this misleads a reader, it does not make evidence. Fix: in the update trigger take `abandon_reason` from the page only from the fixed list of page reasons, as for `stop_reason`; the server's reasons only from the server paths.

### m2 MINOR (read + executed) - `class_recording_tracks` keeps a whole-table UPDATE grant

`:1974`. While the recording is open the owner may update `recording_id`, `track`, `created_at` as well as the descriptive columns (probe lists all 13). Moving a track to another open recording of theirs is stopped by the chunks' foreign key once a chunk exists, and `chunk_count` is re-checked at completion, so nothing reaches evidence. Fix: column-level UPDATE grant without `recording_id`, `track`, `created_at`, same pattern as `class_recordings`.

### m3 MINOR (executed) - the server flag alone moves retention forward with NO deletion request, so an early deletion would read as "deleted by retention"

`:1039-1040`: with `recorder.server_write = 'delete:<id>'` the trigger takes `LEAST(OLD.delete_after, NEW.delete_after)` whether or not a deletion request is being stamped. Today nothing outside `recorder_request_deletion` can set the flag over the API (PostgREST exposes `public` only; `set_config` is in `pg_catalog`; I grepped `supabase/migrations/` for any public function that calls `set_config` with a caller-chosen name: none). But if it ever can, column privileges do NOT save this case, contrary to revision 2's note: `delete_after` is in the UPDATE grant. Probe (`.probe/p5.mjs`, the recorder itself, open `uploading` row, `set_config` in the same transaction):

```
P5 forged delete flag + delete_after (as the recorder) :: null
P5 row after :: {"due_now":true,"deletion_requested_at":null}
P5 audit rows for it :: ["armed","started","stopped","retention_changed"]
P5 retention marks deleted :: null
P5 view :: {"recording_ran_evidence":true,"deleted_by_retention":true,"deletion_requested_at":null}
```

(The audit log does keep a `retention_changed` row with the recorder as actor.) Fix: `ELSIF v_server_delete AND NEW.deletion_requested_at IS NOT NULL THEN` - the move then only happens together with the stamped request. Test: the probe above -> `delete_after` unchanged.

## Mutation run (executed, `.probe/mut.mjs`: throwaway copy, real suite, 4 in parallel; CAUGHT = a FAIL or a non-zero exit)

| Mutation | Result |
|---|---|
| preflight: unscoped-policy test removed | CAUGHT (366/1) |
| preflight: bucket size-limit test removed | CAUGHT (366/1) |
| upload: a confirmed chunk may be uploaded again | CAUGHT (363/4) |
| upload: class prefix not checked (`r.class_id = p.class_id` dropped in `recorder_can_upload`) | **SURVIVED (367/0)** |
| read object: deleted recordings still readable (`status <> 'deleted'` dropped) | **SURVIVED (367/0)** |
| view: live allowance doubled | CAUGHT (366/1) |
| retention: non-admin may move delete_after | CAUGHT (363/4) |
| row delete: allowed before 'deleted' | CAUGHT (366/1) |
| deletion request: any signed-in user | CAUGHT (359/8) |
| enrolment without consent does not switch off | CAUGHT (364/3) |
| cancellation does not request a stop | CAUGHT (364/3) |
| register: audio after the window accepted | CAUGHT (366/1) |
| confirm: stored size not compared | CAUGHT (suite crashed) |
| grant: server stamps writable again | CAUGHT (366/1) |
| listen: `is_teacher_of_class` (TAs) instead of the session's teacher | CAUGHT (354/13) |
| view: evidence not capped by lesson overlap | **SURVIVED (367/0)** |

16 applied, 13 caught, 3 survived. Survivor 1 matters most: without the class check the owner could upload a `manifest.json` (any allowed type, 8 MB) under ANOTHER class's prefix with their own recording id, and retention - which removes `{class}/{recording}/` - would never remove it. The check is in the file; only its test is missing. Add: owner uploads `{other class}/{own recording}/manifest.json` while uploading -> refused. Survivor 2: a test that an admin cannot read an object of a recording marked `deleted` (insert the object as superuser). Survivor 3 is the M2 area: M2's test covers it.

## Safe to apply to live? YES

- N1 is closed on the evidence: own bucket, the old bucket row and its policy are byte-identical after two pastes, every non-owner role is refused on every operation and on imitated prefixes, and no storage policy anywhere in `supabase/migrations/` other than the recorder's two can reach `class-recorder-audio`.
- Switched off it does nothing: no `class_recording_settings` row means OFF, the two triggers on `sessions` / `enrollments` update zero rows, the guard suite's behaviour is unchanged, and `session_recording_evidence` is untouched (not wired, as ruled).
- GRANTs explicit (no anon; authenticated per table, column-level UPDATE on `class_recordings`); pastes twice; preflight refuses before creating anything.
- M1 and M2 make `recording_ran_evidence` say yes when it should not. Nothing reads it until D wires it in a separately reviewed step, so they do not make the apply unsafe; they must be fixed before that step. Cheapest: fix them in this file before pasting (it has never been applied).
- Apply outside lesson hours (`lock_timeout` 5 s on sessions / enrollments / classes / students).

## Post-apply read-only probes

Revision 2's probes 1-10 stand (C1-revision-2.md, "Post-apply read-only probes"). Add, BEFORE and AFTER the paste, and compare:

- 7b, behaviour not text: `SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND permissive='PERMISSIVE' AND (coalesce(qual,'') ~* '\mor\M' OR coalesce(with_check,'') ~* '\mor\M') ORDER BY 1;` - read every row: each OR branch must carry its own `bucket_id = '<another bucket>'`. (The tree has none of this shape; this catches a dashboard-made one.) Before applying, also `SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects';` and compare with the 85 the tree gives (after the recorder); a different number means policies exist that no migration made - read them.
- 11: `SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger WHERE tgrelid IN ('public.sessions'::regclass, 'public.enrollments'::regclass) AND NOT tgisinternal;` - after = before + `recorder_enrollment_consent`, `recorder_session_canceled`.
- 12: `SELECT md5(pg_get_functiondef('public.session_recording_evidence(uuid)'::regprocedure)), md5(pg_get_functiondef('public.session_held_evidence(uuid)'::regprocedure));` - identical before and after.
- 13: `SELECT public.session_cancel_guard_status();` (as an admin) - identical before and after.

## Not checked

- The live database itself (no access by rule): dashboard-made storage policies, the real owner of `storage.objects`, whether the SQL-editor role has BYPASSRLS (probe 8), and whether the live `storage.objects` has the `(bucket_id, name)` unique index the PGlite stand-in lacks (so "upload twice to one path before confirming" was not tested against the real constraint).
- Supabase Storage's own API behaviour (upsert headers, signed URLs, `x-upsert` needing an UPDATE policy) - only the table policies were exercised.
- The guard suite was run with the recorder pasted at one point (after D2, before every guard case); the guard's preflight-refusal blocks (fresh databases) were not re-run with the recorder present.
- Whether PostgREST or pg_graphql on the live project exposes any route to `set_config` (m3 is only reachable that way).
- C2 (client, retention edge function) and D wiring do not exist yet; nothing about them is verified.

## Checks that held (executed)

- N1, new bucket `class-recorder-audio`, every non-owner role (`.probe/p3.mjs` "N1"): T2 (teacher of another class), TA, parent, student: select 0 / update 0 / delete 0 rows; insert refused at the exact registered path, at `{other class}/{this recording}/...`, at `{this class}/{unknown recording}/...` and at the manifest. anon: select 0, insert refused. Admin: reads (by design), update/delete 0, insert refused. The owner: update 0, delete 0, an imitated other-class prefix refused, an unregistered seq refused. The old bucket is still writable by the owner through `staff_manage_class_recordings` (unchanged, as before). `OLD bucket row + policy identical before/after the recorder (two pastes)` -> `true`.
- N1 preflight's blind spot, against the whole tree: `.probe/policies.mjs` replays every CREATE/DROP/ALTER POLICY ... ON storage.objects in `supabase/migrations/` in file order and splits each surviving USING / WITH CHECK at top-level AND/OR. Result: `85 storage.objects policies survive the migration tree; 2 not provably scoped to another bucket` - the 2 are the recorder's own. Every one of the other 83 has a top-level `bucket_id = '<other bucket>'` conjunct (buckets: qr-codes, announcements, homework, student-avatars, teacher-avatars, submissions, exam-reports, resources, audit-clips, audit-eval, homework-videos, class-recordings, lesson-resources, student-work). No migration has the `bucket_id = 'x' OR ...` shape. This is the TREE; the live database may hold dashboard-made policies, so post-apply probe 7b below checks behaviour, not text.
- Check 4, live order (executed, `.probe/guard-rec.mjs`): `scripts/pgtest/session-cancel-guard.test.mjs` copied, its prelude given the few tables the recorder needs (`teachers`, `students`, `classes.default_teacher_id/schedule_template`, `storage.buckets/objects` with RLS), and the recorder migration pasted TWICE right after `20261112091000` (as live will have it), before every guard case. Output:
  ```
  PASS C3 the recorder installs after the guard
  PASS C3 and pastes a second time
  PASS C3 no non-recorder function, trigger or policy changed (definitions, volatility, enabled)
  PASS C3 session_recording_evidence is byte-identical (not wired)
  INFO triggers on sessions now: audit_sessions,recorder_session_canceled,trg_cancel_session_excused,update_sessions_updated_at,validate_session_status_trigger,zz_session_change_guard_del,zz_session_change_guard_upd,zz_session_no_truncate
  INFO recorder switched off: {"s":0,"r":0}
  FAIL d39 every trigger that existed before is unchanged; D2 adds only its own  -- [21,11]
  269 passed, 1 failed
  ```
  Unmodified guard suite: `266 passed, 0 failed`. Line by line, the 265 other guard assertions are identical (only B-5's timing text differs: 1659 ms vs 1982 ms). d39 counts every non-`zz_session` trigger before D2 and after it; with the recorder pasted in between it sees the recorder's 10 new triggers (21 vs 11) - an artefact of where I inserted it, not a changed trigger (the C3 snapshot shows every pre-existing trigger definition and enabled flag unchanged). The migration does not name `session_recording_evidence`, `session_held_evidence` or any `zz_session%` object (grep: 0 matches). **Not wired**, as the conductor ruled.
- What the migration creates or alters OUTSIDE its own tables: AFTER trigger `recorder_session_canceled` on `public.sessions` (UPDATE OF status, WHEN -> Canceled) and AFTER trigger `recorder_enrollment_consent` on `public.enrollments`; foreign keys to `classes`, `sessions`, `students`; one row in `storage.buckets` (`class-recorder-audio`, DO NOTHING); two policies on `storage.objects` scoped by `bucket_id = 'class-recorder-audio'`. Both triggers are SECURITY DEFINER, never raise on their own path (switch-off and abandon branches have no RAISE), and with no `class_recording_settings` / `class_recordings` rows they update zero rows - so a cancel or an enrolment behaves as before (guard suite above). Nothing else is altered.
- N3: every class_recordings column the owner can UPDATE on an open row: `abandon_reason, client_ended_at, client_info, client_started_at, manifest_path, manifest_sha256` change; `delete_after, stop_reason, stop_requested_at` ignored; the other 18 granted columns refused by the trigger; the server-stamp columns are not granted at all (suite).
