# RECORDER release 1 - the class recorder on main, for the owner's hardware checks

Branch `release/recorder-1`, from `origin/main` f5987804. Code = C2 round 5 (309c26a6), review 5 PASS WITH CHANGES and fit for the hardware checks on live (`docs/evidence/C2-review-5.md`). Assembled by the reviewer; nothing pushed, applied or deployed: the conductor does that, in the order below.

**Where I am / next step:** DONE. Branch built and checked; nothing pushed, applied or deployed. Next (conductor): section 3, steps 1-5, in order.

## 1. What the branch holds, and the leak check

`git diff --stat origin/main..release/recorder-1`: 135 files, +19844 / -2. Every file is one of:

- the recorder, new on main: `src/lib/recorder/**` (25), `src/lib/recorderUi.ts`, `src/components/recorder/**` (13, including the session owner `session.ts`, `RecorderBoot.tsx`, `signOutGuard.ts`), `src/pages/TeacherRecorder.tsx`;
- `supabase/migrations/20261112100000_class_recorder.sql`, `supabase/migrations/20261112101000_recorder_retention_cron.sql`, `supabase/functions/recorder-retention/index.ts`;
- tests: `scripts/recorder/**` (11), `scripts/pgtest/recorder.test.mjs`, `recorder-cron.test.mjs`, `recorder-retention.test.mjs`;
- docs: `docs/RECORDER_RUNBOOK.md`, `docs/evidence/C5-owner-hardware-checklist.md`, the C evidence (`C1-*`, `C2-*` including round 5 and review 5, `C3-recorder-ui.md` and its `C3/` screenshots, 3.4 MB);
- main's shared files with ONLY the recorder's lines re-applied (main's version taken, nothing else of the conductor branch):

| File | Lines |
|---|---|
| `src/App.tsx` | +4: `RecorderBoot` (lazyRetry) and its `<Suspense fallback={null}><RecorderBoot /></Suspense>` after `AnnouncementRenderer`; `TeacherRecorder` (lazy) and the route `/teacher/recorder`, `ProtectedRoute allowedRole={["teacher","admin"]}` |
| `src/components/Layout.tsx` | +7 / -2: `Mic` in the lucide import; `guardedSignOut` import; `signOut: rawSignOut` and `const signOut = () => guardedSignOut(rawSignOut)` (every sign-out button and the UserMenu already call `signOut`); "Class recorder" in the admin list and the teacher list (no family, student or TA list) |
| `src/components/CommandPalette.tsx` | +1: "Class recorder" in the teacher list |
| `supabase/config.toml` | +4: `[functions.recorder-retention] verify_jwt = true` |
| `scripts/pgtest/run.mjs` | +12: recorder retention, recorder engine, screens logic, screens render, recorder cron, class recorder |

Leak check: no path or line from the design rollout (no `ivory`, `hec-*` token, theme, `IvoryScope` change, `index.css`, `tailwind.config.ts`), D4, S1, T5, lesson-eval or pc2. `git diff --name-only origin/main..release/recorder-1 | grep -iE "ivory|design|theme|tailwind|index.css|lesson-eval|pc2|d4_|s1-|t5"` is empty. Left out on purpose: the conductor's `20261112120000_class_recordings_scope.sql` and its suite (T2's; already LIVE, not yet on main) and `A2.1-diagnosis.md` (a different stream). The recorder's colour classes (`warning`, `success`, `destructive`) all exist in main's `tailwind.config.ts`.

## 2. Checks on the release branch

| Check | Result |
|---|---|
| `node scripts/pgtest/run.mjs` | **3872 assertions across 43 suites, 0 failed**, exit 0 (main's 37 suites + the recorder's 6: retention 37, engine 504, screens logic 30, screens render 74, cron 22, class recorder 423; edge functions typecheck 5/0 includes `recorder-retention` against main's `_lib/auth.ts`) |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `node node_modules/vite/bin/vite.js build` | exit 0, built in 3 m 56 s (only the usual chunk-size warning). `RecorderBoot` is its own 0.8 kB chunk; the capture engine (`engine-*.js`) and `TeacherRecorder` (52 kB) load only when used. `dist/` deleted afterwards. |
| Local load of the two migrations (LF) | the fingerprints in section 3 |
| The page on main's design | section 2a |

### 2a. The recorder page on main's current design

Same harness as review 5 (`C:\Users\Dell\hec-tools\c2r5b-harness`: the real `TeacherRecorder` page in main's real `Layout`, main's `index.css` and Tailwind config, fake client, fake teacher / admin, scripted engine, no real data), pointed at this branch; shots in `C:\Users\Dell\hec-tools\c2r5b-harness\shots-main\`. States: setup needed, before Ready, armed, recording, stalled, cannot be sent, admin panel, the bar on another staff page (recording; Stop asked), full screen (1280). 375 and 1280: no page error, no horizontal overflow, nothing critical or serious from axe in the recorder's content (the "serious" on the other-page shots is the Layout breadcrumb's list markup, on main already), every recorder control >= 44 px; the bar is inside the full-screen element (`barInside: true`). Legible: staff routes are still on the old design on main, and the recorder's classes are the old design's tokens, so it looks as it did on the conductor branch. The render faults listed in review 5 section f (doubled notice, cramped phone header, warning sign on calm states, the Armed time) are the same here.
## 3. Apply and deploy, in order

Paste the LF content as git stores it (`git show release/recorder-1:<path>`), not the CRLF working copy: the md5 below is of the LF bytes.

| Object | md5 (LF) | sha256 (LF) | bytes |
|---|---|---|---|
| `supabase/migrations/20261112100000_class_recorder.sql` | `e61e5f5a238d7efd166900fb09a7e9ca` | `646bb4b1c98dbbf4d8906f90204eb97fd4f90839e14582c7d1cef0f374840dea` | 112857 |
| `supabase/migrations/20261112101000_recorder_retention_cron.sql` | `c2fc2e172a7a265b04670037bfed53e3` | `5f3c500e47e0700fe2cdb47cd637df6bc10331f23b29c7c760842c6cad5e62cd` | 4633 |
| `supabase/functions/recorder-retention/index.ts` | `11c1dd787a0919cc28b7c80a2cecfb64` | `87b98d8c464473a60f44bfc711f248270f08cf806a5b9a3f3e1e093379a3b200` | 9076 |

### Step 1 - pre-checks (read-only, against live as it is today)

```sql
-- P1: the recorder is not installed (expect true, true, true, true)
select to_regclass('public.class_recordings') is null            as no_tables,
       not exists (select 1 from storage.buckets where id = 'class-recorder-audio') as no_bucket,
       not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname like 'recorder%')       as no_functions,
       not exists (select 1 from pg_trigger where tgname in ('recorder_enrollment_consent','recorder_session_canceled')) as no_triggers;
-- P2: the old Teacher Transcripts bucket and its scoped policies (expect the bucket, private,
--     and exactly five policies: admin_all + staff select/insert/update/delete, as T2 left them)
select id, public from storage.buckets where id = 'class-recordings';
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects'
   and concat_ws(' ', qual, with_check) like '%class-recordings''%' order by policyname;
-- P3: what the preflight will look at: every permissive storage policy NOT scoped by bucket_id
--     (expect ZERO rows; any row = the migration will refuse, as designed - stop and report)
select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
   and permissive = 'PERMISSIVE' and concat_ws(' ', qual, with_check) not like '%bucket_id%';
select relrowsecurity from pg_class where oid = 'storage.objects'::regclass;   -- expect true
-- P4: what the cron migration needs (expect true, true, true) - never select the token itself
select to_regprocedure('cron.schedule(text,text,text)') is not null           as pg_cron,
       to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null as pg_net,
       exists (select 1 from public.schedule_runner where id = 1 and token is not null) as runner_token;
-- P5: no recorder jobs yet (expect 0)
select count(*) from cron.job where jobname like 'recorder-%';
-- P6: the two live tables that get a trigger, unchanged in shape (expect both rows)
select table_name, column_name from information_schema.columns
 where table_schema = 'public' and ((table_name = 'sessions' and column_name = 'status') or (table_name = 'enrollments' and column_name = 'class_id'));
```

### Step 2 - apply `20261112100000_class_recorder.sql`

`apply_migration` name `class_recorder`, query = the LF content. One transaction, `lock_timeout 5s` (it takes short locks on `public.sessions` and `public.enrollments` to add a trigger each: apply outside lesson hours). If it raises, nothing is created; report the message verbatim (a preflight refusal names the policy that would reach the bucket).

Verify (read-only; expected values from a local load of the same LF file on top of 20260717090000 and 20261111110000):

```sql
-- V1: 32 functions, fingerprint of their bodies (expect n = 32, fp = 16b997aea6352c1886725484b8376916)
select count(*)::int n, md5(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' || md5(p.prosrc), ','
       order by p.proname, pg_get_function_identity_arguments(p.oid))) fp
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'recorder%';
-- V2: 9 tables with RLS on + 1 view (expect 10 rows; every r has rls = true)
select c.relname, c.relkind, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and (c.relname like 'recorder%' or c.relname like 'class_recording%') and c.relkind in ('r','v') order by 1;
-- expect: class_recording_chunks, class_recording_markers, class_recording_settings, class_recording_tracks,
--         class_recordings, recorder_audit_log, recorder_child_consents, recorder_device_profiles,
--         recorder_session_evidence (v), recorder_settings
-- V3: 10 triggers (expect exactly these)
select tgrelid::regclass::text, tgname from pg_trigger where not tgisinternal
   and (tgname like 'recorder%' or tgname like 'class_recording%') order by 1, 2;
-- expect: class_recording_markers.class_recording_markers_before_insert, class_recordings.{class_recordings_audit,
--   class_recordings_before_delete, class_recordings_before_insert, class_recordings_before_update},
--   enrollments.recorder_enrollment_consent, recorder_audit_log.{recorder_audit_no_change, recorder_audit_no_truncate},
--   recorder_settings.recorder_settings_audit, sessions.recorder_session_canceled
-- V4: policies (expect 17 table policies; storage: class_recorder_audio_insert INSERT, class_recorder_audio_select SELECT, nothing else new)
select count(*) from pg_policies where schemaname = 'public' and (tablename like 'recorder%' or tablename like 'class_recording%');
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'class_recorder%';
-- V5: the bucket (expect private, 8388608, {audio/webm,audio/flac,audio/x-flac,audio/wav,audio/x-wav,application/json}, 0 objects)
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'class-recorder-audio';
select count(*) from storage.objects where bucket_id = 'class-recorder-audio';
-- V6: the old bucket untouched (repeat P2: same five policies, same bucket row)
-- V7: recording is off everywhere (expect 0) and settings seeded (expect 1)
select count(*) from public.class_recording_settings where recording_enabled;
select count(*) from public.recorder_settings;
```

Rollback (step 2), only if needed and before any recording exists: unschedule the cron jobs first if step 3 ran, then

```sql
BEGIN;
DROP TRIGGER IF EXISTS recorder_enrollment_consent ON public.enrollments;
DROP TRIGGER IF EXISTS recorder_session_canceled ON public.sessions;
DROP POLICY IF EXISTS class_recorder_audio_insert ON storage.objects;
DROP POLICY IF EXISTS class_recorder_audio_select ON storage.objects;
DROP VIEW IF EXISTS public.recorder_session_evidence;
DROP TABLE IF EXISTS public.class_recording_markers, public.class_recording_chunks, public.class_recording_tracks,
  public.class_recordings, public.recorder_device_profiles, public.recorder_child_consents,
  public.class_recording_settings, public.recorder_audit_log, public.recorder_settings CASCADE;
DO $$ DECLARE f regprocedure; BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'recorder%' LOOP EXECUTE format('DROP FUNCTION %s CASCADE', f); END LOOP; END $$;
COMMIT;
```
then delete the empty bucket `class-recorder-audio` from the dashboard (Storage) or the Storage API (Supabase refuses direct deletes on the storage tables). `recorder_audit_log` is append-only by trigger; dropping the table is how it goes. Re-run P1: all true again. Once a teacher has recorded, do not roll back without the owner: it deletes recordings.

### Step 3 - apply `20261112101000_recorder_retention_cron.sql`

`apply_migration` name `recorder_retention_cron`, query = the LF content. It creates two `cron.job` rows and nothing else; idempotent (unschedules by name first). The owner sets nothing: the nightly job reads the runner token from `public.schedule_runner` (row 1, created by 20261110160000, already live) at run time, so no secret is in the job text; the `apikey` / `Authorization` in it are the project's public anon key (as 20261110160000's job). If P4 said pg_net or the runner row is missing, it schedules only the hourly sweep and says so in a NOTICE.

Verify:
```sql
select jobname, schedule, active from cron.job where jobname like 'recorder-%' order by 1;
-- expect: recorder-expire-stale '17 * * * *' true; recorder-retention '0 20 * * *' true
select jobname, position('x-schedule-runner-secret' in command) > 0 as reads_token,
       position('select token from public.schedule_runner' in command) > 0 as token_at_run_time
  from cron.job where jobname = 'recorder-retention';   -- expect true, true (do not print `command` itself into evidence)
```
Rollback: `select cron.unschedule('recorder-retention'); select cron.unschedule('recorder-expire-stale');`

### Step 4 - deploy `recorder-retention`

`deploy_edge_function` name `recorder-retention`, `verify_jwt: true`, entrypoint `index.ts`, files: `recorder-retention/index.ts` (md5 above) and `_lib/auth.ts` (main's, LF; imported for `requireRole`). It uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which the platform sets; nothing to add.

Verify (read-only probes; no secret in any of them):
- `list_edge_functions`: `recorder-retention` ACTIVE, `verify_jwt` true.
- POST with no `Authorization`: 401 (the gateway).
- POST with only the public anon key as `Authorization`: 401 or 403 from the function (no runner token, not an admin) - never 200.
- The next morning, `select status_code from net._http_response order by created desc limit 5` holds a 200 from 20:00 UTC (hardware item 15). A 404 there means the function is not deployed.

Rollback: delete the function (`supabase functions delete recorder-retention`) and unschedule `recorder-retention`; nothing else depends on it.

### Step 5 - push

`git push origin release/recorder-1:main` (a fast-forward of f5987804, if main has not moved; else merge main into the branch, re-run section 2, then push). Cloudflare builds and publishes. Read the Actions run (a green local build proves nothing).

Verify: `/teacher/recorder` loads for a teacher and an admin, "Class recorder" in their sidebars, not in a parent's or a student's; nothing records until a class is switched on in the admin panel and a teacher presses Ready.

Rollback: revert the merge commit on main and push (the database objects can stay: with no page, nothing writes to them).

## 4. Post-apply read-only probes (with the publishable key, no sign-in)

- `GET /rest/v1/class_recordings?select=id&limit=1` with the anon key: an empty list or 401/42501, never a row (RLS; anon has no grant).
- `GET /rest/v1/recorder_child_consents?select=student_id&limit=1`: the same.
- `GET /storage/v1/object/list/class-recorder-audio` with the anon key: refused or empty.
- `POST /rest/v1/rpc/recorder_server_time` with the anon key: refused (the recorder's functions are granted to `authenticated` only) - confirm in V1's grant list if it answers.

## 5. For the owner, in plain words

**What teachers will see.** A new "Class recorder" item in the menu (teachers and admins only; parents and children never see it). On that page a teacher sets up the two microphones once per laptop, then presses **Ready for today** at the start of the day. After that the app records each of their lessons that day by itself, from 5 minutes before the lesson to 10 minutes after it, while they use any other page; a dark bar at the bottom says what it is doing (Ready, Armed, Recording, NOT RECORDING) and has a Stop button. Admins also get the recorder's admin panel: which classes are switched on, which children's parental permission is on file, the recordings and a log of who did what.

**Nothing records unless a teacher presses Ready.** And even then, only for a class an admin has switched on, and the school's server will only switch a class on when every enrolled child has parental permission recorded under the current consent wording. Every class starts switched OFF. The server checks the switch, the permission, the teacher and the lesson time again when a lesson is about to record, and again when it starts; a child added to the class without permission switches it off.

**Where the audio is stored and who can reach it.** In a new private storage area of the school's own Supabase project (`class-recorder-audio`), separate from the existing Teacher Transcripts audio. It can be listened to by an admin, by a teacher of that class, and by the teacher who taught that lesson. Parents, children and teaching assistants have no way to reach it. Only the teacher recording a lesson can add audio, and only to that lesson while it is being recorded; nobody can change or overwrite a recording. Until a piece reaches the server it is kept in the laptop's browser.

**How long it is kept.** 30 days on the server, then deleted automatically every night (an admin can also ask for a recording to be deleted sooner). Audio that never reached the server is deleted from the laptop 14 days after the server gave it up (when the recorder is next opened on that laptop).

**During the hardware checks the quick recorder stays the backup.** Run it alongside for every check and every real lesson until the checks are done and the known gap below is fixed. Use a test class with no children for the checks (`docs/evidence/C5-owner-hardware-checklist.md`).

**One known gap, being fixed next (review 5, R5-1):** if the server says no when a lesson is being got ready (the class is switched off, a permission is missing) or is briefly busy, the recorder currently gives up on that lesson for the day and SAYS NOTHING. It never records anything it should not; it may fail to record without telling the teacher. Until the fix, a teacher who does not see "Armed" in the bar 20 minutes before the lesson should use the quick recorder. Also: if the bar says "Armed" with the wrong time, ignore the time (R5-2); the recording still starts 5 minutes before the lesson.
