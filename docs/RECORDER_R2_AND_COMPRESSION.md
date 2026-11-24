# Class recorder audio: R2 and a smaller file (24 Nov 2026, lane B1)

Bucket `class-recorder-audio` held 1.3 GB (1,483 FLAC chunks, 10 recordings) on the free
Supabase plan (1 GB cap). Two things were done, and one is left for whoever flips the switch.

1. The browser uploads and reads back through the one file store, so the bucket can move to
   the private R2 bucket `hec-files` by adding it to `R2_BUCKETS` in `src/lib/files.ts`.
2. The retention function removes from both stores.
3. Lessons are captured and stored at 16 kHz (lossless FLAC): 2.8x smaller. Not the 4x asked
   for: see "Compression" for why 4x needs a lossy codec and why that was not done.

Read "What the lead must do, in this order" first. Flipping `R2_BUCKETS` BEFORE the migration
below breaks every recording (the database says "The file is not in storage").

## 1. Upload and read-back through the file store

- `src/lib/recorder/backend.ts`: `supabaseBackend(client, { files })`. With `files` (a subset of
  `FileStore`: `upload`, `download`) the chunk and the manifest go through
  `files.upload(BUCKET, path, blob, mime)`, read-back through `files.download`. Without it the
  client's own storage is used exactly as before (the engine's own tests pass `client` only).
- `createRecorder({ client, files })` passes it on; `src/components/recorder/engine.ts` passes
  `files` from `src/lib/files.ts`. So there is ONE switch: `R2_BUCKETS`.
- Invariants kept: the path is still chosen by the database (`{class}/{recording}/{track}/{000000}.{ext}`),
  nothing is overwritten (the Worker answers 409 "already there" -> `"already"`, step 3 of the flow
  in `C1-architecture.md`: go on to read back and confirm), the page still confirms with the
  sha256 of what it read back, offline / sign-in-again / server-unavailable keep their codes
  (`fromFileStore`).
- Read-back falls back to Supabase when R2 has no such file: a chunk uploaded before the move.

### The access rule evaluates (checked, nothing weakened)

`file_access_can(bucket, path, op)` (20261118090000) evaluates the `storage.objects` policies as
installed, as the caller. The recorder's two policies are
`bucket_id = 'class-recorder-audio' AND recorder_can_upload(name)` (INSERT) and
`... recorder_can_read_object(name)` (SELECT). Both use only `name`, `bucket_id` and `auth.uid()`,
so the evaluator expresses them: an INSERT of the exact registered, unconfirmed chunk path by the
recording's owner is true; a stranger, another teacher, a TA, or an unregistered path is false;
the manifest only while the recording is `uploading`. There is no DELETE policy, so nobody but
the service role can delete (that is how retention works). The Worker adds the `file_objects`
row as the caller first (its INSERT policy runs `file_access_can(.., 'write')`), then signs a
15-minute PUT link for exactly that size and type; `file_objects_fit_bucket` also enforces the
bucket's 8 MB and its mime list (`audio/flac`, `audio/webm`, `audio/wav`, `application/json`).
`scripts/pgtest/recorder-r2-upload.test.mjs` runs the real Worker and the real backend with the
recorder's rule as the database stand-in. It does NOT run the real evaluator against the real
recorder migration: do that once in `scripts/pgtest/file-store-access.test.mjs` style (lead).

## 2. What the database must learn first: a migration (lead; I may not touch migrations)

The recorder's SQL decides "is the file there?" by reading `storage.objects`. A file in R2 is a
`file_objects` row, so after the flip these all say no:

| Where (20261112100000_class_recorder.sql) | Reads | Needs |
| --- | --- | --- |
| `recorder_confirm_chunk` (~line 1647) | `storage.objects` size of the chunk | size from `storage.objects` OR `file_objects.size_bytes` |
| `recorder__recording_before_update`, status `complete` (~1167, ~1194) | manifest present; every confirmed chunk present at `stored_size` | same, both stores |
| same, status `deleted` (~1240) | any object under `{class}/{recording}/` | refuse while either store still has one |
| `recorder__recording_before_delete` (~1280) | any object under the prefix | same |

Suggested shape (one new file, a UTC timestamp later than every file on main):

```sql
CREATE OR REPLACE FUNCTION public.recorder__object_size(p_path text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $f$
  SELECT COALESCE(
    (SELECT NULLIF(o.metadata ->> 'size', '')::bigint FROM storage.objects o
      WHERE o.bucket_id = 'class-recorder-audio' AND o.name = p_path),
    (SELECT f.size_bytes FROM public.file_objects f
      WHERE f.bucket_id = 'class-recorder-audio' AND f.path = p_path))
$f$;
CREATE OR REPLACE FUNCTION public.recorder__has_objects_under(p_prefix text) RETURNS boolean ...
  -- EXISTS in storage.objects (name LIKE p_prefix || '%') OR in file_objects (path LIKE ...)
```

then the four places call them (`recorder__object_size(path) IS NOT NULL` for "is there",
`= c.stored_size` for "still at the size"). `file_objects.size_bytes` is the size the Worker signed
the PUT for, and the Worker refuses a PUT whose Content-Length differs and deletes one that ends
short, so it is the stored size. Caveat the old design already accepted: the database cannot see R2,
only the row; the page's read-back (which fetches the bytes from R2 and hashes them) is what proves
the object is really there. The pgtests (`recorder.test.mjs`, `recorder-cron`, `recorder-link-realtime`)
need a `public.file_objects` table in their prelude; add cases for: confirm with the chunk only in
`file_objects`, complete with the manifest only there, `deleted` refused while a `file_objects` row
exists. `scripts/recorder/fake-recorder-server.mjs` (not mine) should learn the same for the engine tests.

## 3. A real gap in the Worker (lead: `hec-files/worker/src/index.ts`, not mine)

The Worker inserts the `file_objects` row, THEN the page PUTs the bytes. If the PUT dies (school wifi
dropping mid-upload is the recorder's normal bad day) the row stays with no object. The retry then
gets 409 from the row insert, the backend returns `"already"`, the read-back gets 404, the uploader
puts the chunk back to `registered`, and the loop repeats until the lesson is abandoned: the owner
cannot delete the orphan row (no DELETE policy) and the chunk can never be uploaded.
Fix (small, safe): in `handleSign` op `write`, on `r.status === 409` from the `file_objects` insert,
if `!(await env.FILES.head(keyOf(bucket, path)))` sign the PUT link anyway (the 409 came after RLS's
WITH CHECK passed, so the caller was allowed to write that path; `recorder_can_upload` is false for a
confirmed chunk, so a confirmed chunk still gets 403). `handlePut` already refuses to overwrite an
object that exists. Until that is deployed the recorder over R2 is exposed to this. Retention
removes such orphan rows (its test covers "a row with no object behind it").

## 4. Retention (`supabase/functions/recorder-retention`)

Lists and removes under `{class}/{recording}/` in Supabase Storage as before AND in R2: the
`file_objects` rows under the prefix (service client), each object through the Worker
(`POST /v1/sign {op:"delete"}` with the service key and `x-hec-as: service`, as
`_lib/file-store.ts` does), then its row. Object first, then row: a failure leaves a row that names
what is left, never a stray object. The SECOND listing must be empty in BOTH stores before
`recorder_mark_audio_deleted`. It imports `fileStoreEnvFromDeno` from `_lib/file-store.ts`; the
Worker call itself is written in the function because `_lib/file-store.ts` exposes no remove.
If you add `removeFiles(sb, env, bucket, paths)` (object via Worker, then the `file_objects` rows;
and a `listFiles(sb, bucket, prefix)` over `file_objects`) to `_lib/file-store.ts`, this function can
drop `listR2` / `removeR2` for them; behaviour and tests stay the same. Deploy: `recorder-retention`
(its imports now include `../_lib/file-store.ts`), `verify_jwt` as in `config.toml`.

## 5. Compression

### What is stored today (live database, 24 Nov 2026)

FLAC, 48 kHz, 16-bit, mono per track, 30 s chunks, from the repo's own encoder (fixed predictors,
no LPC):

| Track | Chunks | Minutes | Bytes per second | Per minute |
| --- | --- | --- | --- | --- |
| room | 770 | 383.9 | 22,544 | 1.35 MB |
| teacher | 708 | 353.3 | 40,659 | 2.44 MB |
| both | | | 63,203 | 3.79 MB per lesson minute |

(An hour of lesson, both tracks: 227 MB. 248 of 706 teacher chunks are digital silence, 138 B/s.)

### What downstream needs

`scripts/lesson-monitor/audio.py` decodes each chunk with soundfile at whatever rate the file
says, measures per-second RMS/peak at the track's own rate (`levels.LevelMeter(sr)`), and resamples
the transcribed track to 16 kHz mono (`SR_OUT = 16000`) for Whisper; `embedders.py` and `voice.py`
work at `SR = 16000`; `transcribe.py` refuses anything that is not that 16 kHz file. Nothing reads
above 8 kHz. A track must keep one rate from its first chunk to its last (`TrackJoiner` raises
"sample rate changed between chunks"); two tracks of one recording may differ.
`class_recording_tracks.sample_rate` allows 8000 to 48000.

### Decision: 16 kHz lossless FLAC (done), not Opus, not fewer bits

Measured with the repo's `encodeFlac` (`src/lib/recorder/flac.ts`, no change) on real speech
(a 77 s narration, resampled with ffmpeg), mixed with noise at the level that reproduces the live
48 kHz sizes, in 60 s chunks. Script: `laneB1-measure.mjs` in the lane's scratchpad (not in the repo).

| Profile | 48 kHz B/s | 24 kHz | 16 kHz | Smaller at 16 kHz |
| --- | --- | --- | --- | --- |
| teacher-like (live: 40,659) | 44,157 | 22,984 | 15,665 | 2.82x |
| room-like (live: 22,544) | 29,216 | 15,057 | 10,274 | 2.84x |
| quiet room | 23,768 | 11,857 | 7,962 | 2.98x |

Applied to the live figures: teacher 40.7 -> about 14.4 kB/s, room 22.5 -> about 7.9 kB/s, both
63.2 -> about 22.3 kB/s: **3.79 MB -> about 1.34 MB per lesson minute (2.8x)**; an hour of lesson
227 MB -> about 80 MB. The estimate rests on synthetic noise over studio speech, not on classroom
recordings: expect 2.5x to 3x.

Why not 4x:
- Lossless cannot get there: the 16 kHz file is already about 7 to 8 bits per sample for the
  teacher and about 5 for the room. 12 kHz would reach about 3.7x but drops 6 to 8 kHz, which is
  where children's fricatives live: Whisper gets less than it gets today. Not done.
- Fewer bits per sample (FLAC "wasted bits", 12-bit) is not safe: the room track is already at
  about 3.3 LSB of noise at 48 kHz (3.76 bits per sample); a 12-bit step would sit above its quiet
  speech.
- Opus is the only way past 4x (about 24 to 32 kbit/s, 3 to 4 kB/s per track: 8 to 12x), and the
  bucket already accepts `audio/webm`. Not done, on purpose: the existing Opus mode
  (`opus-webm`, `opusPipeline.ts`, MediaRecorder) cuts a byte stream, so only the first chunk of a
  track is decodable alone and the timeline is "approximate"; `audio.py` decodes every chunk
  alone and would fail on chunk 1 onward (and `soundfile` cannot read WebM). A standalone Opus
  chunk (WebCodecs `AudioEncoder` + an Ogg muxer, `audio/ogg` added to the bucket and to
  `recorder_path_parts`, a new format name in the CHECKs and a floor in `recorder_settings`) needs
  a browser matrix I cannot test here and a new reader in the PC job. If the lead wants 4x or more,
  that is the next step, not a tweak.

### What changed in the code

- `src/lib/recorder/index.ts`: `RECORDER_SAMPLE_RATE = 16000` is the default of `createRecorder`
  (it was 48000). The AudioContext is created at that rate and the browser resamples the
  microphones; `source.sampleRate` is what the recorder then uses everywhere, so a browser that
  refuses the rate only makes bigger files. To revert: set the constant to 48000.
- `controller.ts` `resumable()`: a recording started at one rate is not resumed by a page that now
  captures at another (a release between the reload and the crash): what was recorded is finished
  and sent, the next lesson starts clean.
- Old 48 kHz recordings stay readable (nothing in the readers is rate-specific); the wizard's test
  clips and the phone page keep 48 kHz.

### Two things to do with it (lead / owner)

1. **Lower the byte floor.** Chunks under `min_bytes_per_sec_flac` (4000 B/s) are stored but flagged
   `below_floor` and never count as evidence; `verified_audio_ms` is `min(span, bytes*1000/floor)`.
   Live, 17 of 770 room chunks are already below it at 48 kHz and the room's 5th percentile is
   10.5 kB/s, which becomes about 3.7 kB/s at 16 kHz: more quiet-room chunks would flag. Digital
   silence is 138 B/s, so 1,500 still separates it. Set `recorder_settings.min_bytes_per_sec_flac`
   to 1500 (allowed 1000 to 96000; an admin update, logged; the floor is copied to a recording
   when it is armed, so it applies from the next lesson). Do this before or with the release.
2. **Shorter retention is the bigger lever.** At about 80 MB per lesson hour, 5 lessons a day for
   30 days is about 12 GB: over R2's 10 GB free (shared with homework, student work, course
   media). The nightly report job has made its transcript by morning; `delete_after` of 7 to 14
   days holds about 3 to 6 GB. The setting is in `recorder_settings` (admin).

### For the PC job (lane B2)

Accept FLAC at 16000 Hz (new) and 48000 Hz (all recordings before this release), per track; a
track never changes rate. `audio.resample` already returns the audio untouched when `sr == 16000`.
Nothing else in the job reads the rate. The phone track (`teacher` when the teacher mic is the
phone) stays 48 kHz until `src/pages/TeacherPhoneMic.tsx` line 169 passes `RECORDER_SAMPLE_RATE`
(and the native iPhone path, which delivers 48 kHz PCM, gets a resampler: not done).

## What the lead must do, in this order

1. Write and apply the migration in section 2 (and its pgtests), owner pastes it in the SQL editor.
2. Deploy the Worker fix in section 3.
3. `UPDATE recorder_settings SET min_bytes_per_sec_flac = 1500` (owner/admin), and decide the retention days.
4. Deploy `recorder-retention`; check it answers 401 without a token.
5. Copy the existing 1.3 GB: `node scripts/copy-bucket-to-r2.mjs class-recorder-audio` (dry run, then
   `--apply`; keep `--remove-from-supabase` for after the PC job reads from R2: lane B2).
6. Add `"class-recorder-audio"` to `R2_BUCKETS` in `src/lib/files.ts`, plus the two other browser
   readers I may not edit: `src/pages/TeacherPhoneMic.tsx` line 30
   (`supabaseBackend(supabase as unknown as SupabaseLike, { files })`, `import { files } from "@/lib/files"`)
   and `src/hooks/useLessonMonitor.ts` `downloadChunk` (use `files.download("class-recorder-audio", path)`).
7. Push, let Cloudflare build, record one test lesson, check: chunks in `file_objects`, none new in
   Supabase, `confirmed_at` set, `complete` reached, the PC job reads it, and the next retention
   run empties both stores.
8. Add `recorder-r2-upload.test.mjs` to `scripts/pgtest/run.mjs` (shared file: lead only).
