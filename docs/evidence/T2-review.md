VERDICT: PASS WITH CHANGES

# T2 review - `class-recordings` storage scope (20261112120000)

Where I am / next step: DONE. Reviewer wrote this file only; nothing applied, deployed or pushed. Probes ran in pglite against the real migration files (`.probe/`, removed afterwards).

Reviewed at dedd193: `supabase/migrations/20261112120000_class_recordings_scope.sql` (sha256 as in the evidence file, unchanged by me).

Counts: 0 BLOCKER, 1 MAJOR, 6 MINOR.

## Apply recommendation
The storage policies are correct and close the hole; every probe below agrees. One change should be folded in before the paste because it is one clause and nothing is applied yet: R1 (the new CHECK looks at the first path segment only, and `..` walks out of it). With R1 folded in, the author's suite must be re-run and the fingerprint re-taken.
If the owner would rather close the open bucket this hour: applying the file exactly as it stands is still strictly narrower than what is live today on every axis I probed, and R1 can follow as its own small migration the same day. It is not a reason to leave the bucket open.

## MAJOR

### R1 - the path/class CHECK can be walked around with `..` (`20261112120000:103-109`)
The constraint is `lower(split_part(audio_storage_path,'/',1)) = class_id::text`. It says nothing about the rest of the path. `transcribe-lesson-audio/index.ts:286-288` hands the stored path to storage-js 2.75.0, whose `download()` builds `${url}/object/${bucket}/${path}` with no encoding (`node_modules/@supabase/storage-js/dist/main/packages/StorageFileApi.js:341-342`, `_getFinalPath` :566), and `fetch` removes dot segments from a URL path before sending it.

Probe (teacher of class A, RLS on, after the migration):
```
A/../B/x.mp3 (dot-dot to class B): accepted
A/%2e%2e/B/x.mp3: accepted
A/sub/x.mp3 (nested): accepted
class id only, no file: accepted
what fetch() asks storage for when the function downloads 'A/../B/x.mp3': /storage/v1/object/class-recordings/<B>/x.mp3
and for 'A/%2e%2e/B/x.mp3': /storage/v1/object/class-recordings/<B>/x.mp3
```
So a teacher of class A can still insert a class-A row that makes the service-role function transcribe a class-B recording into a row they can read - exactly what F1 set out to stop. It needs the name of B's file, a random uuid, so it is not open to a guess; but every teacher and TA could list the whole bucket until this migration lands, and anyone who once taught B has read B's rows. The 11 existing recordings are the ones exposed.
Not executed end to end: there is no storage server here. The two halves were (the row is accepted; the URL is rewritten).

Fix - replace the CHECK body with (validated, see "R1 fix validated"):
```sql
  CHECK (audio_storage_path IS NULL
         OR (lower(split_part(audio_storage_path, '/', 1)) = class_id::text
             AND audio_storage_path ~ '^[^/\\]+/[^/\\]+$'))
  NOT VALID;
```
Exactly two segments and no backslash (a URL parser treats `\` as `/`). With two segments the worst `..` can do is name the bucket root, which is not an object. Add to the suite: `A/../B/x.mp3`, `A/%2e%2e/B/x.mp3`, `A/..\B\x.mp3` and `A/sub/x.mp3` refused for a class-A row. Add a pre-apply probe next to P4 (expect 0):
```sql
SELECT count(*) FROM public.class_transcripts
 WHERE audio_storage_path IS NOT NULL AND audio_storage_path !~ '^[^/\\]+/[^/\\]+$';
```
The lasting fix belongs in the function as well (refuse a path that is not `<tr.class_id>/<one segment>` before downloading), alongside F2.

## MINOR

- M1 - cover teachers (answer to the question asked). `is_teacher_of_class` (`20261111110000:54-118`) says yes to any teacher holding a non-cancelled session of the class dated from 7 days ago to 60 days ahead. A cover for ONE lesson therefore gets select / insert / update / delete on ALL of that class's lesson audio, from 60 days before the covered lesson until 7 days after it. Probe: session in +3 days `SIUD`; session 8 days ago `----`; session in 61 days `----`; cancelled session tomorrow `----`. That is the same window in which they can already read and delete the class's transcript rows (text of the same lessons), and it is far narrower than today (everything, for ever). Acceptable for this fix. Worth telling the owner in one line: a cover can delete the class's recordings during that window.
- M2 - staff UPDATE and DELETE are more than the screen uses. `TeacherTranscripts.tsx` makes one storage call on this bucket, `upload()` without upsert (:318-321); it never lists, signs, overwrites or removes. `class_recordings_staff_update` / `_delete` (and arguably `_select`) could go, leaving admins to tidy up. Not before apply: I could not confirm here what the live storage server needs for a plain upload, and the policies as written keep exactly today's abilities for the class's own staff.
- M3 - the post-apply probes miss a policy that names no bucket. P1 lists policies whose text names `class-recordings`. A dashboard-made permissive policy with no `bucket_id` at all would still reach the bucket and P1 would not show it. Add P7 below.
- M4 - cost. The helper cannot be inlined (SECURITY DEFINER) and runs `has_role` + the five EXISTS of `is_teacher_of_class` once per visible-bucket row. In pglite: 6005 rows of this bucket listed by a teacher in 46 s (about 7 ms a row; pglite is slow, real Postgres will be a small fraction). Rows of other buckets are not charged: the plan filters `bucket_id` by index first (`Recheck Cond: (bucket_id = 'class-recordings')`, then `Filter: (class_recordings_staff_can(name) OR has_role(...))`). Live has 11 objects and the page never lists. Nothing to do now; if the bucket reaches thousands and something lists it, evaluate per class instead of per row.
- M5 - what the teacher sees when refused. The class picker offers a teacher every class they EVER had a session in (`TeacherTranscripts.tsx:66-69`, no date filter) and offers a TA every active class RLS shows them (:76-77). Picking one they are not currently on used to fail at the row insert, leaving an orphan file; it now fails at the upload with storage's "new row violates row-level security policy" in the toast (:369). Same people refused, no orphan, less friendly wording. A follow-up could filter the picker.

- M6 - three suite gaps (`scripts/pgtest/class-recordings-scope.test.mjs:153-160`), from my mutants 2, 6 and 9. Add: as teacher B, `DELETE FROM storage.objects` with no WHERE must leave class A's objects (count them as superuser inside the same transaction); as teacher B, a column-free `UPDATE storage.objects SET metadata = '{}'` must touch 0 of class A's rows; a class-A transcript row with the class id in upper case is accepted. Tests only; not needed before apply.

Noted, not this migration's: `is_teacher_of_class(any user, any class)` is executable by every signed-in user (`20260719014455:3`), a wider oracle than the new helper, which only ever answers about the caller. F2 (no caller check in `transcribe-lesson-audio/index.ts:407-458`) stands as reported; with R1 open it does not add a leak (the function returns nothing and writes into the row it was pointed at).

## Who can do what after the fix (probe output; S select, I insert under that class, U update, D delete)

| who | class A's object | class B's object |
|---|---|---|
| admin (with or without a teacher record) | SIUD | SIUD |
| default teacher of A | SIUD | ---- |
| default teacher of B | ---- | SIUD |
| TA, standing assignment on A | SIUD | ---- |
| TA, participant of one current session of A | SIUD | ---- |
| TA on B only | ---- | SIUD |
| cover teacher, session of A in 3 days | SIUD | ---- |
| cover teacher, session of A 8 days ago / in 61 days / cancelled | ---- | ---- |
| parent, student, signed-in with no role rows | ---- | ---- |
| anon; `authenticated` with no uid | ---- | ---- |
| service role (transcribe-lesson-audio) | all | all |

TAs: verified in the UI and in the current function. Route `/teacher/transcripts` admits role teacher or admin; TAs hold role teacher and have no `teachers` row, so the picker gives them active classes; `is_teacher_of_class` (latest definition, 20261111110000) admits a TA by session participation (-7..+60 days) or standing assignment. A TA on the class completes upload + row today and still does.

Names, class A's teacher inserting (admin can always): upper-case class id YES; `A/sub/x` no; `A/x.mp3/` no; `A/` no; `A//x` no; `/A/x` no; leading space no; text before the uuid on an earlier line no; `{A}/x` no; uuid without dashes no; `A` alone no; `B/x` no; `A/../B/x` no. `A/..`, `A/.` and a file name containing a newline are accepted as literal names (one segment under A; harmless - through the storage API `A/..` is rewritten by the URL to the bucket root).
Renames: A's teacher moving A's file to B's folder REFUSED (WITH CHECK); B's teacher moving A's file: 0 rows (cannot see it); B's teacher moving B's file into A REFUSED; A's teacher moving B's file: 0 rows; rename within A: 1 row; admin A->B: 1 row; A's teacher changing `bucket_id` to `homework` REFUSED; pulling a `homework` object into this bucket: 0 rows. Column-free DELETE by B's teacher removed only B's 2 objects of 19.

## Checked and found sound

1. The hole is closed - table above; each cell is an executed statement without RETURNING.
2. Other buckets. 109 CREATE/DROP POLICY statements on storage.objects in 26 migration files; the six names this file drops occur nowhere else, and every policy it creates carries `bucket_id = 'class-recordings'` in USING and WITH CHECK. An object in `homework` and one in `class-recorder-audio` carrying a `<class A>/x.mp3` name: `----` for A's teacher AND for an admin through these policies, before and after.
3. Helper. `{"v":"s","d":true,"c":"{search_path=public}","anon":false,"auth":true,"acl":"{postgres=X/postgres,authenticated=X/postgres}"}`. EXECUTE for `authenticated` is needed (a policy expression runs with the caller's privileges) and is no wider than that. Direct RPC: own class true, other class false, a uuid that is no class false, NULL / '' / 'zz/x' false; a parent, a no-role user, an admin and a no-uid session get false for everything; anon gets `permission denied for function`. It answers only about the caller, and "no such class" is indistinguishable from "not yours". The uuid cast runs only after the regex matched; no input I tried raised an error.
4. CHECK, apart from R1: NULL accepted; upper-case class id accepted (matches the policy); another class's path and '' refused, for a teacher, an admin and a superuser alike. NOT VALID: re-paste with a mismatched row present succeeds; any UPDATE of that row is then refused (`violates check constraint`), its DELETE is allowed. So if a mismatch appears between the live probe (0) and the paste, the paste still succeeds and that one row can no longer be processed or edited until its path is corrected or it is deleted - re-run P4 just before pasting. Writers of `audio_storage_path`: exactly one, `TeacherTranscripts.tsx:332`, with the same `path` it uploaded under `${classId}/`. No function or migration writes the column (`20261112090000` only reads it). Other writers of `class_transcripts` - the page (:263 paste insert, :471 summary), `analyze-transcript` (:966-1002), `transcribe-lesson-audio` (:271-275, :375, :433, :444) - update rows whose path, if any, already satisfies the check: status update, teacher edit and delete of a good row all succeed.
5. The app. Upload-then-row as the page does it, on class A: default teacher ok, standing TA ok, session TA ok, current cover ok, admin who teaches nothing ok; teacher of B, TA of B, cover from 8 days ago: `UPLOAD refused`. No other screen or function reads this bucket with the caller's client (`src/lib/recorder/*` mention it in comments only).
6. Paste twice ok/ok, identical policies. Rollback block: runs, and `pg_policies` for the whole storage schema is then byte-identical to the state 20260717090000 left (`policies == original: true`), helper and constraint gone (`{"f":0,"c":0}`); runs a second time; the fix re-applies to the same five policies. Recorder (20261112100000) installs after the fix and re-pastes; installs BEFORE the fix too (old policy in place), after which the fix pastes twice, the recorder's two policies are untouched, the recorder re-pastes, and A's teacher is `SIUD` / B's teacher `----` on A's audio. Order does not matter. The recorder's preflight accepts these policies because each names `bucket_id` and none names its bucket.
7. Live apply. One transaction: a paste with an error forced just before COMMIT left the old policy exactly in place and no helper (`policies unchanged: true | helper exists: 0`). Other sessions see the old policy until COMMIT and the five new ones after; there is no moment with none and none with a wider one. Locks: ACCESS EXCLUSIVE on `storage.objects` (DROP/CREATE POLICY) and on `public.class_transcripts` (DROP/ADD CONSTRAINT; NOT VALID, so no table scan), both for milliseconds, under `lock_timeout = 5s`: if an upload is mid-transaction the paste fails whole and can be repeated. P1-P6 are SELECTs only.

## Mutants (mine; `.probe/` copy of the migration, the author's suite)
Baseline (unmodified file): 89 passed, 0 failed.

| # | mutant | result |
|---|---|---|
| 1 | UPDATE policy's WITH CHECK left out | 89/0 - EQUIVALENT (Postgres then uses USING as the check); not a gap |
| 2 | DELETE policy: any teacher, whole bucket | 89/0 - SURVIVED |
| 3 | SELECT policy: any teacher, whole bucket | CAUGHT (22 fail) |
| 4 | admin policy without `bucket_id` (admins reach every bucket through it) | CAUGHT (scoped-by-bucket assertion; the recorder's preflight then refuses to install) |
| 5 | staff SELECT `TO public` | CAUGHT (1 fail, roles assertion) |
| 6 | UPDATE policy's USING: any teacher, whole bucket (WITH CHECK kept) | 89/0 - SURVIVED |
| 7 | constraint added without NOT VALID | CAUGHT (the paste fails on the planted old row) |
| 8 | REVOKE from PUBLIC, anon removed | CAUGHT (1 fail) |
| 9 | constraint without `lower()` | 89/0 - SURVIVED |

Caught 5, equivalent 1, survived 3. See M6: 2 and 6 survive for one reason - the suite's `can()` deletes and updates `WHERE id = $1`, and a WHERE that reads a column makes Postgres apply the SELECT policy to the row first, so a weak DELETE or UPDATE-USING hides behind the correct SELECT. The real file is right on both (my column-free DELETE as B's teacher removed only B's own objects), and the storage API always addresses objects by name, so in production the SELECT policy would mask such a weakness too; but nothing in the suite would notice a later edit that weakens them.

## R1 fix validated
The migration with only the CHECK body replaced as in R1: the author's suite 89 passed, 0 failed (nothing it asserts depends on the looser check). The proposed check on its own, class A's row:
```
null                      accepted
"<A>/f.mp3"               accepted
"<A-UPPER>/f.mp3"         accepted
"<A>/a b (1).Voice Memo"  accepted
"<A>/.."                  accepted   fetch asks for: /          (bucket root, not an object)
"<A>/../<B>/f.mp3"        refused    fetch asks for: /<B>/f.mp3
"<A>/%2e%2e/<B>/f.mp3"    refused    fetch asks for: /<B>/f.mp3
"<A>/..\<B>\f.mp3"        refused    fetch asks for: /<B>/f.mp3
"<A>/sub/f.mp3"           refused
"<A>"  "<A>/"  ""         refused
"<B>/f.mp3"  "/<A>/f.mp3" refused
```
When scripting the edit, note the body contains `$'`: JavaScript's `String.replace` expands that in a replacement string (it cost me one false failure). Edit the file by hand or pass a function.

## Probes to add (read-only)
```sql
-- P0 (before AND after): which is_teacher_of_class is live - decides the cover window and standing TAs
SELECT pg_get_functiondef('public.is_teacher_of_class(uuid,uuid)'::regprocedure) LIKE '%class_teaching_assistants%' AS standing_tas,
       pg_get_functiondef('public.is_teacher_of_class(uuid,uuid)'::regprocedure) LIKE '%7 days%' AS seven_day_window;
-- P7 (after): permissive storage policies that name NO bucket would reach this one. Expect 0 rows.
SELECT policyname, cmd, roles::text FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects' AND permissive = 'PERMISSIVE'
   AND concat_ws(' ', qual, with_check) NOT LIKE '%bucket_id%';
-- P8 (after): what one real teacher sees. Put a teacher's user id in; ROLLBACK ends it, nothing is written.
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<teacher user id>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT split_part(name, '/', 1) AS class_id, count(*) FROM storage.objects
 WHERE bucket_id = 'class-recordings' GROUP BY 1;   -- only classes that teacher is on
ROLLBACK;
```

## Not checked
- The real storage server: that a plain `upload()` needs only INSERT (Supabase documents it so; the staff SELECT policy is there regardless), and R1 end to end.
- That the SQL editor's role may drop and create policies on the live `storage.objects` (20260717090000 created one this way). If it may not, the transaction fails whole.
- Which `is_teacher_of_class` is live (P0), and whether dashboard-made policies exist (P1, P7).
- The full `node scripts/pgtest/run.mjs`; I ran only this suite (baseline and mutants).
