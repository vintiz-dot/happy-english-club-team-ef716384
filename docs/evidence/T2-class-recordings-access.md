# T2 - class-recordings bucket access

Where I am / next step: migration, suite, mutants, probes and rollback written. Next: rerun suite + mutant 2, recorder suite, full run, record totals.

## Part 1 - facts

### a. Every reader / writer of `class-recordings`
- Browser, ONE writer: `src/pages/TeacherTranscripts.tsx:316-321` (audioUploadMutation): `path = ${classId}/${crypto.randomUUID()}.${ext}`, `supabase.storage.from("class-recordings").upload(path, file, { contentType })` under the caller's JWT (no upsert). Then `:323-338` inserts the `class_transcripts` row with `class_id: classId`, `audio_storage_path: path`. The browser never reads, lists, signs, overwrites or deletes an object in this bucket (retry at `:401-410` re-invokes the function; no storage call).
- Edge function, ONE reader: `supabase/functions/transcribe-lesson-audio/index.ts:415-418` builds its client with `SUPABASE_SERVICE_ROLE_KEY`; `:425-429` reads the row, `:286-288` `sb.storage.from("class-recordings").download(tr.audio_storage_path)`. Service role -> bypasses storage RLS -> unaffected by any policy change.
- `analyze-transcript`: no storage call (no `storage` in its index.ts). Works on `raw_text`.
- No cleanup / retention job touches this bucket (grep over src, supabase/functions: only the two above). `recorder-retention` works on `class-recorder-audio`; its test plants a lookalike `class-recordings/...` key only to prove it is NOT touched (`scripts/pgtest/recorder-retention.test.mjs:94,132`). `src/lib/recorder/backend.ts:15` names the bucket in a comment only.

### b. Object -> class
- By path: the first segment is the class id (`TeacherTranscripts.tsx:317`). Also through the row: `class_transcripts.audio_storage_path TEXT` (`20260717090000:14-17`) and `class_transcripts.class_id UUID NOT NULL REFERENCES classes ON DELETE CASCADE` (`20260712090000:99-103`); `src/integrations/supabase/types.ts:919`.
- The row is inserted AFTER the upload (`:318` then `:323`), so an INSERT policy cannot require the row; the path segment is the only thing available at upload time. The path is enough: the uploader picks the segment and the policy checks they teach that class.

### c. Who needs what
- Route `src/App.tsx:148`: `/teacher/transcripts` for roles `teacher`, `admin`. TAs are created with role `teacher` (`supabase/functions/create-teaching-assistant/index.ts:81`) and have a `teaching_assistants` row, not a `teachers` row.
- Class picker `TeacherTranscripts.tsx:60-83`: a user with a `teachers` row sees the classes they have sessions in; anyone else (admin, and a TA) falls through to `classes where is_active` (RLS-limited).
- The follow-up row: `class_transcripts` "teachers_manage_class_transcripts" `USING/WITH CHECK is_teacher_of_class(auth.uid(), class_id)` (`20260712090000:128-131`); admins `has_role admin` (`:123-126`).
- So TODAY a TA on the class (is_teacher_of_class says yes to TAs) can upload AND create the row: the feature works end to end for them. A TA not on the class can upload the object (old storage policy) but the row is refused -> an orphan object. "Exactly what the UI allows today" = the table's own predicate, `is_teacher_of_class`, plus the old `has_role teacher` (kept, so nothing is widened). TAs on the class keep access; TAs off it lose only the orphan-making upload.
- Families / students: nothing (the old policy gave them nothing; the route excludes them). Admins: everything.

### d. Helpers (current definitions in the tree)
- `public.has_role(uuid, app_role)`, granted to authenticated (`20260719014455:2`).
- `public.is_teacher_of_class(user_id uuid, class_id uuid)` latest: `20261111110000_ta_standing_assignments_and_homework_upload.sql:54-118`, SQL STABLE SECURITY DEFINER `search_path = public`: default teacher; teacher of a non-canceled session dated -7..+60 days; teacher in `schedule_template.weeklySlots`; TA participant of such a session; standing TA (`class_teaching_assistants`). EXECUTE revoked from anon/PUBLIC (`:120`), granted to authenticated (`20260719014455:3`). NULL user -> nothing matches -> false.
- `recorder_is_class_teacher` (20261112100000) is NOT applied and is not used.
- Whether 20261111110000 is applied in production is not determinable from the repo. If not, the live is_teacher_of_class is the 20261020090000 one, which already includes TA session participants; either way the storage policy follows whatever is_teacher_of_class says, exactly as the table does.

### e. Path formats over time
- `git log -p -S"class-recordings" -- src supabase/functions`: the upload was added in 9ef15f9 (2026-07-16) as `${classId}/${crypto.randomUUID()}.${ext}` and never changed (`git log -p -- src/pages/TeacherTranscripts.tsx`: two `+ const path` lines, identical). One format ever: `<class uuid>/<uuid>.<ext>`.
- Anything whose first segment is not a uuid, or that is not exactly two segments: admin only.

### Finding F1 (outside storage RLS; would defeat the fix): the function trusts the row's path
`transcribe-lesson-audio` downloads `tr.audio_storage_path` with the SERVICE ROLE and writes the transcript into that row's `raw_text`, which the row's class teachers can read. Nothing ties the path to the row's class: a teacher of class A can insert a class-A row whose `audio_storage_path` names a class-B object and read class B's lesson as text. Storage policies cannot stop that. Closed in this migration with a CHECK on `class_transcripts`: `audio_storage_path` is NULL or its first segment is the row's `class_id`. Added NOT VALID (existing rows are not re-validated at paste; every app-written row satisfies it; probe P4 counts any that do not).

### Finding F2 (reported, not fixed here): `transcribe-lesson-audio` has no caller check
`index.ts:407-458`: verify_jwt only, then service role. Any signed-in user can re-trigger transcription of any transcript id. It returns no audio or text, but it reruns the pipeline on someone else's row. Needs a function change (caller's JWT: has_role admin or is_teacher_of_class for tr.class_id); out of scope for a migration task.

## Part 2 - the fix: `supabase/migrations/20261112120000_class_recordings_scope.sql`

sha256 (LF, as committed): see "Fingerprint" below.

- Preflight: refuses if storage.objects has no RLS, or `class_transcripts.audio_storage_path` is missing.
- `public.class_recordings_staff_can(_name text)` - SQL, STABLE, SECURITY DEFINER, `search_path = public`, EXECUTE revoked from PUBLIC/anon, granted to authenticated. False when: no uid, NULL name, caller lacks role `teacher`, name is not exactly `<uuid>/<one segment>`. Otherwise `is_teacher_of_class(auth.uid(), first segment::uuid)` (the cast only runs after the regex matched). Each branch coalesced to false.
- Drops "staff_manage_class_recordings" (and its own names, for a second paste); creates:
  - `class_recordings_admin_all` FOR ALL: `bucket_id = 'class-recordings' AND has_role(admin)` (USING + WITH CHECK);
  - `class_recordings_staff_select` / `_insert` / `_update` (USING and WITH CHECK, so the old AND the new name must be the caller's class) / `_delete`, each `bucket_id = 'class-recordings' AND class_recordings_staff_can(name)`.
- F1: `class_transcripts_audio_path_in_class CHECK (audio_storage_path IS NULL OR lower(split_part(audio_storage_path,'/',1)) = class_id::text) NOT VALID`.
- Why this shape: the object is uploaded BEFORE its row exists, so the path is the only class key at INSERT time; the app has written one path format since day one, so path scoping covers every object; `is_teacher_of_class` is the very predicate the transcript row is checked against, so whoever can complete the flow today still can and nobody else; the old `has_role teacher` gate is kept as a conjunct so nothing is widened (a `teachers` row without the role gets nothing, tested). No owner-based rule: other teachers of the same class legitimately share the class's audio, and `owner` is not needed for scoping.
- No src change needed. No new table, so no GRANTs beyond the function's.

### Before / after

| who | before (any class's object) | after: own class's object `<class>/<uuid>.<ext>` | after: other class's object | after: undeterminable path |
|---|---|---|---|---|
| admin | all 4 | all 4 | all 4 | all 4 |
| teacher of the class | all 4 | all 4 | none | none |
| teacher of another class | all 4 | - | none | none |
| TA on the class (session or standing) | all 4 | all 4 (UI allows them today) | none | none |
| TA not on the class | all 4 | - | none | none |
| `teachers` row, no teacher role | none | none | none | none |
| parent / student / anon / no-uid | none | none | none | none |
| service role (transcribe-lesson-audio) | all | all | all | all |

"all 4" = select (download, sign, list), insert (upload), update (overwrite, upsert, move), delete.

### Existing objects
Nothing is moved or rewritten. Every object the app wrote is `<class uuid>/<uuid>.<ext>` and stays reachable by that class's staff and admins. Any object of another shape, or under a uuid that is not a class the caller teaches, becomes admin-only (probe P3 counts them). Orphans left by a TA not on the class (upload allowed, row refused) become admin-only unless the TA is on that class.

### Functions' access path
- `transcribe-lesson-audio`: service role (`index.ts:415-418`) -> bypasses RLS; unaffected (tested: service role reads every object). It updates the row with the service role too; the F1 constraint applies to it, which is intended (a mismatched row can no longer be processed).
- `analyze-transcript`: never touches the bucket.
- The browser upload runs as the caller: tested as the page does it (upload then row) for the teacher and for a TA on the class.

## Tests
`scripts/pgtest/class-recordings-scope.test.mjs`, registered in `scripts/pgtest/run.mjs` ("class recordings scope"). Loads the real 20260717090000, 20261111110000, the fix (pasted twice, then once more after the recorder and once after the rollback) and 20261112100000 (pasted twice after the fix). Results: see "Runs" below.

Writes are tested WITHOUT RETURNING: with RETURNING (or a WHERE naming a column) Postgres also holds the new row to the SELECT policy, which hid a weak UPDATE WITH CHECK in the first mutant run (mutant 2 survived). A column-free UPDATE (constant SET, no WHERE) is the case where only the UPDATE policy's WITH CHECK applies; the suite now has it.

### Mutants (`.probe/`, throwaway copy of the migration)
| # | mutant | result |
|---|---|---|
| 1 | helper returns true for any teacher (no class check) | CAUGHT (12 fail) |
| 2 | UPDATE WITH CHECK only `bucket_id` | first run SURVIVED (SELECT policy masked it); see Runs for the rerun |
| 3 | regex allows nested paths | CAUGHT (5 fail) |
| 4 | `has_role teacher` conjunct dropped | CAUGHT (1 fail) |
| 5 | INSERT allowed for any teacher | CAUGHT (22 fail) |
| 6 | old policy not dropped | CAUGHT (28 fail) |
| 7 | F1 constraint removed | CAUGHT |
| 8 | no uid -> true | CAUGHT (4 fail) |

## Post-apply probes (read-only; P4 also BEFORE applying)
```sql
-- P1: exactly five rows, no "staff_manage_class_recordings"
SELECT policyname, cmd, roles::text, qual, with_check FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
   AND (policyname LIKE '%class_recordings%' OR concat_ws(' ', qual, with_check) LIKE '%''class-recordings''%')
 ORDER BY policyname;
-- P2: t | s | {search_path=public} | f | t
SELECT p.prosecdef, p.provolatile, p.proconfig::text,
       has_function_privilege('anon', p.oid, 'EXECUTE') anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') auth_exec
  FROM pg_proc p WHERE p.proname = 'class_recordings_staff_can';
-- P3: objects whose class cannot be determined (now admin only) - COUNT ONLY
SELECT count(*) FROM storage.objects o
 WHERE o.bucket_id = 'class-recordings'
   AND (o.name IS NULL
        OR o.name !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[^/]+$'
        OR NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id::text = lower(split_part(o.name, '/', 1))));
-- P4: RUN BEFORE APPLYING. Expect 0. If not 0, STOP: those rows could not be updated afterwards.
SELECT count(*) FROM public.class_transcripts
 WHERE audio_storage_path IS NOT NULL AND lower(split_part(audio_storage_path, '/', 1)) <> class_id::text;
-- P5: class_transcripts_audio_path_in_class | f
SELECT conname, convalidated FROM pg_constraint WHERE conname = 'class_transcripts_audio_path_in_class';
-- P6 (information): objects with no transcript row (orphans) - COUNT ONLY
SELECT count(*) FROM storage.objects o WHERE o.bucket_id = 'class-recordings'
   AND NOT EXISTS (SELECT 1 FROM public.class_transcripts t WHERE t.audio_storage_path = o.name);
```
Behavioural check after applying: upload an mp3 on Teacher Transcripts as a teacher of that class; it transcribes as before.

## Rollback (re-creates the old policy, and with it the defect; tested by the suite)
<!-- rollback -->
```sql
BEGIN;
DROP POLICY IF EXISTS class_recordings_admin_all ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_select ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_insert ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_update ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_delete ON storage.objects;
DROP POLICY IF EXISTS "staff_manage_class_recordings" ON storage.objects;
CREATE POLICY "staff_manage_class_recordings" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'class-recordings'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  )
  WITH CHECK (
    bucket_id = 'class-recordings'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );
ALTER TABLE public.class_transcripts DROP CONSTRAINT IF EXISTS class_transcripts_audio_path_in_class;
DROP FUNCTION IF EXISTS public.class_recordings_staff_can(text);
COMMIT;
```

## Not determinable from the repo
- Whether the live bucket and "staff_manage_class_recordings" exist exactly as 20260717090000 writes them, or whether dashboard-made policies on this bucket exist (P1 shows every policy naming it; a policy that names it differently would not be dropped - P1 lists it).
- Whether 20261111110000 is applied (it changes which TAs is_teacher_of_class admits; the policy follows either version).
- What objects the live bucket holds (P3, P6 count them).
- F2 (no caller check in transcribe-lesson-audio) stays open: a function change.

## Runs
(filled in below)
