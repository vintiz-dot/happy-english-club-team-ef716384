# Moving the remaining Supabase buckets to R2 (lane D, 24 Nov 2026)

Status: investigated; NOTHING copied yet. `scripts/copy-bucket-to-r2.mjs` needs
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the terminal, and neither is set on
this PC (the Worker server key `~/.hec-files/server-key.txt` is present). The owner or
the lead sets them in their own terminal; this lane did not fetch the key.

Sizes are from `storage.objects` (live). `file_objects` holds only homework (102) and
student-work (263): no other bucket has any copied row.

## Public buckets: stay on Supabase (R2 is private, 5-minute signed links)
| bucket | MB | why it stays |
|---|---|---|
| reception-video | 19.7 | plays on the reception TV from a public URL (`receptionMedia.ts:66` getPublicUrl, `reception-drive-import/index.ts:74,88` writes and builds the public URL); the TV never signs in |
| student-avatars | 6.0 | public URL stored on the student row (`update-student-avatar/index.ts:170-198`) |
| announcements | 1.0 | public URL stored in the announcement (`AnnouncementManager.tsx:172-174`) |
| teacher-avatars | 0.2 | public URL (`TeacherProfilePictureUpload.tsx:39-57`) |
| qr-codes | 0.04 | public URL in invoices and HEC Docs (`InvoicePrintView.tsx:17`, `hecDocs/index.ts:248`, `AccountInfoManager.tsx:53-111`) |

## Private buckets: can move, but every reader bypasses `files.*`
The Worker's `R2_BUCKETS` (wrangler.toml, repo copy) serves
`student-work,homework,homework-videos,class-recordings,lesson-resources,course-media`.
It does NOT list `resources` or `exam-reports`; the deployed value was not verifiable
from here. Adding a bucket to `R2_BUCKETS` in `src/lib/files.ts` alone changes nothing for
these buckets, because none of the code below calls `files.*`. Each call must be moved
to `files.signedUrl/upload/download/remove` (browser) or `_lib/file-store.ts`
(edge functions) BEFORE a Supabase copy is removed, or the app loses the file.

### class-recordings (195 MB, 11 mp3, largest 20.8 MB; 0 files over 100 MB)
- write: `src/pages/TeacherTranscripts.tsx:383` (`supabase.storage.from("class-recordings").upload`)
- read: `supabase/functions/transcribe-lesson-audio/index.ts:293-295` (`sb.storage.from(...).download(tr.audio_storage_path)`); use `downloadFile`.
- no browser read, no delete anywhere. Path = `<classId>/<uuid>.mp3`, stored in `class_transcripts.audio_storage_path`.
- note: three pairs of files have identical sizes (19753662, 20603262, 19692225 bytes): the same recording uploaded twice (two transcripts each). Not deleted by this lane.

### homework-videos (35 MB, 9 files: 2 videos, 1 audio, 6 frames; largest 18.3 MB)
- write: `src/components/video-homework/VideoHomeworkSubmission.tsx:98` upload; list/remove `:175-177`.
- read (browser): `src/lib/video/recorder.ts:89` `signedVideoUrl` (used by `SignedVideo.tsx:29,34`, `ClassVideoWall.tsx:38`, `ShareVideoButton.tsx:62`, `VideoReviewPanel.tsx:243,269`). Poster is a frame in the same bucket.
- read (edge): `analyze-video-submission/index.ts:86` download, `:128` createSignedUrl(900) handed to Gemini, `:223` frames download.
- read (edge): `parent-video-page/index.ts:46` `createSignedUrl(video_path, 7200)` for parents. BLOCKER: Worker links last `READ_SECONDS = 300` (`hec-files/worker/src/index.ts:49`); a 2-hour parent page link would break. Needs a longer link or a re-sign on play before this bucket moves.
- the Gemini hand-off (`:128`) also needs a link a third party can fetch: a Worker link works (no auth needed) but only for 5 minutes.
- RLS: classmates read only approved, shared videos (`20261109090000`); `file_access_can` evaluates those storage policies as installed.

### lesson-resources (5.2 MB, 5 png, largest 1.7 MB)
- write: `TeacherTranscripts.tsx:569`; remove `:592`.
- read: `TeacherTranscripts.tsx:232` and `src/pages/StudentLessonDetail.tsx:100-101` (createSignedUrl 3600).
- images: `scripts/shrink-stored-photos.mjs` can shrink them (PNG, lossless) once credentials exist; saving is at most a few MB.

### resources (4.7 MB, 7 files) - needs the Worker's R2_BUCKETS changed (not listed today)
- write: `src/hooks/useResources.ts:222-224, :304-306`; remove `:370`; read `:418` (`getResourceSignedUrl`, used by `ResourceCard.tsx:40`, `TeacherResources.tsx:117`).

### exam-reports (0.3 MB, 8 pdf) - needs the Worker's R2_BUCKETS changed; not worth moving
- write `ExamReportEditor.tsx:164-176`, remove `ExamReportsManager.tsx:85`, read `exam-reports/StudentExamReportsTab.tsx:41-43`.

## Not mine
class-recorder-audio (1,318 MB, the real problem), student-work, homework, course-media: other lanes / already moved.
Empty or unused: audit-clips, audit-eval, lesson-photos, submissions, reception.

## Compression findings (nothing applied)
- class-recordings audio is already 32 kbps (size / `audio_duration_seconds`, all 8 files with a duration). Going lower saves under 30% and costs transcription quality. Do not re-encode.
- homework-videos: no sha/hash column on `video_submissions`. Two videos: a 180 s webm at ~814 kbps (18.3 MB) and a 72 s mov at ~1,800 kbps (16.3 MB, approved, shown to the family). A re-encode might save 5-8 MB of 35; not worth altering an approved video. ffmpeg/ffprobe exist on this PC.
- Moving the 32 kbps audio and the videos to R2 frees 230 MB of Supabase's 1 GB; the 1.3 GB class-recorder-audio bucket is what exceeds the cap.
