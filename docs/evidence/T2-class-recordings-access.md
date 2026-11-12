# T2 - class-recordings bucket access

Where I am / next step: Part 1 facts a-e written. Next: write migration 20261112120000, then the suite.

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
