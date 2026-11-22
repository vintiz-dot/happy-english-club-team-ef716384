# One teacher flow: record, transcript, analysis (plan, 22 Nov 2026)

Owner's request: Teacher Transcripts and the Class Recorder "do the same thing"; merge them. Cheapest model, cheapest vendor setup. Moving class-recorder audio to a vendor was declined "for now" (`docs/LESSON_MONITOR_DESIGN.md`, Option A: processing on the school laptop).

## 1. They do not do the same thing yet

| | Class Recorder | Teacher Transcripts |
|---|---|---|
| Input | live capture, two tracks (teacher lapel, room), 30 s FLAC/Opus chunks | one audio file the teacher uploads, or pasted text |
| Store | private bucket `class-recorder-audio`, table `class_recordings` (+ tracks, chunks, markers) | bucket `class-recordings`, table `class_transcripts` |
| Rules | consent per child, capture window, evidence rules, append-only audit, 30-day retention, readers = admin / standing teacher / that session's teacher | class-held teacher or admin (`20261112120000`) |
| Output | audio only. Nothing in the app transcribes it | Whisper transcript, labelled speakers, `analyze-transcript` drafts (`20261117100000`) |

The overlap is the teacher's intent ("this lesson, get me its transcript"), not the plumbing. The two stores must stay apart: the recorder's rules (consent, window, evidence, RLS) are stricter and are the reason its audio is private.

## 2. Which screen survives

**One page, `/teacher/recorder`, one menu entry "Record & transcripts"**, with two tabs:
- **Record**: the existing recorder page, unchanged (`DailyRecorder`, setup wizard, admin panel).
- **Transcripts**: the existing Transcript Insights page, unchanged inside, plus a new card on top, **Recorded in class**, listing this teacher's recordings with a status (see 3).

`/teacher/transcripts` redirects to `/teacher/recorder?tab=transcripts`. Command palette and menus lose the duplicate entry. The recorder stays mounted (hidden) while the Transcripts tab shows, so switching tabs can never stop or break a recording.

No backend path is removed. Nothing in the recorder's `src/lib/recorder/*` or its files that another session is changing is edited.

## 3. How a finished recording becomes a transcript

Owner ruling, 22 Nov 2026: **transcription of recorder audio stays on the school laptop**, and the teacher can upload the laptop's draft transcript.
- A `complete` recording appears under "Recorded in class" with date and class and an **Add draft transcript** button. It picks the class and brings the upload panel into view.
- The teacher uploads (`.txt` / `.vtt` / `.srt`) or pastes the laptop's text, reads and fixes it, then presses Analyze. That sends **only the text** to the analysis service (`analyze-transcript`, `gpt-4o-mini`), never the audio; the result is a staff-only draft until approved, as before.
- The online audio upload (Whisper) is **not offered on the merged page**. Its backend (`transcribe-lesson-audio`) and the transcripts it already made are kept, including "Retry transcription" on old audio rows. Re-enabling the button is one prop.
- The analysis step does send transcript text, which can contain spoken names, to OpenAI; names are pseudonyms in class (owner ruling 12 Nov). A laptop-only analysis would be a separate change.

Not built, and needs an owner decision first (a vendor path for recorder audio): turning a recording into a `class_transcripts` input automatically. What it would take, so the owner can price it:
- Stitching in an edge function is not possible: a 60-minute lesson is hundreds of MB of FLAC (edge limits: 2 s CPU, 256 MB), and Whisper takes 25 MB. It would have to be done in the teacher's browser (download the room chunks as the teacher, resample to 16 kHz mono, encode Opus about 7 MB/hour) and upload the result as an ordinary transcript audio file, or on the laptop job.
- Which track: transcribe the **room track only**; it carries the children and the teacher at lower level. The lapel track is only needed for talk-time, which the laptop does locally. This halves vendor cost against two tracks.
- Consent: the recorder's consent line covers recording and storage, not sending to a vendor. A vendor path needs its own consent wording line per `LESSON_MONITOR_DESIGN.md` section 6 (OpenAI, country named), a per-class switch off by default, and an audit row each time. Children's spoken names go with the audio (owner ruled names are pseudonyms in class, 12 Nov).

## 4. Cost per lesson (60 min, prices from memory, owner to confirm on the vendor pages)

| Route | Per lesson | Note |
|---|---|---|
| School laptop (faster-whisper, overnight) | about USD 0 | about 2 h per lesson, about 4 lessons a night; no Vietnamese |
| OpenAI `gpt-4o-mini-transcribe` | about USD 0.18 | cheapest vendor; no segment timestamps, so the labelled-speaker transcript the current pipeline builds would need a different path |
| OpenAI `whisper-1` (what upload uses today) | about USD 0.36 | gives timestamps; 25 MB cap |
| Speaker labeller today: `gpt-4o` batches of 120 lines | cents per lesson | switching to `gpt-4o-mini` cuts that step by an order of magnitude; quality on name call-outs not tested |
| Azure fast transcription (design doc) | about USD 1.50 | unconfirmed; only vendor teacher-checked |

Cheapest set-up: laptop for all lesson audio (USD 0); the only vendor spend left on this page is the text analysis. A cheaper upload path is a possible follow-up: `gpt-4o-mini-transcribe` plus the `gpt-4o-mini` labeller, after one lesson is compared by a teacher. Not done here, because changing a live function's model changes accuracy and needs a deploy and a check.

## 5. Rules that must still hold (and how)

- Recorder tables, bucket, policies, functions: untouched. The new card reads `class_recordings` through the teacher's own session, so the existing `class_recordings_read` policy (admin, standing teacher, that session's teacher) decides what is listed. No service role, no audio is downloaded, no signed URL is made.
- Consent, window, evidence rules: enforced by the recorder's triggers and RPCs, which the page does not bypass or duplicate.
- Recorder audio is never uploaded to the transcript bucket by this page: the audio-upload button is not shown on it.
- Text upload keeps every existing check: class-held, approval refusal, analysis drafts.

## 6. What the owner must do

Nothing to paste: no migration, no edge-function change. A site push (Cloudflare) is all that ships it, after the other session's recorder changes land.

## 7. Added 22 Nov 2026 (owner): hand-over, class report cue, Sonnet

- **Hand-over as soon as done:** `nightly.py --watch` stays running on the laptop. Every 5 minutes (`--poll-minutes`) it takes the next finished recording, transcribes it locally and saves the report to the app at once (no 07:00 cut-off, no per-night cap). Same consent, kill-switch and deletion rules as the nightly run; audio is deleted after each lesson. It must be left signed in, on the `hec-pilot` account.
- **Class report cued for the teacher:** the laptop no longer asks for the draft (it signs in as an admin, who cannot read the transcript, so the draft had none). The app builds it as the lesson's teacher: the next time they open Record & transcripts, `useLessonReportCue` finds their monitor reports with no draft and calls `lesson-report-draft` once per lesson, and the page shows "Class reports for you" (building / ready to review / failed). Limit: the draft starts when the teacher opens the app, not the moment the laptop finishes. Starting it with no teacher present would need a server job that reads the transcript with a service key, which breaks "only the teacher can read it"; that is the owner's call.
- **Text analysis through Claude Sonnet, OpenAI as fallback:** `analyze-transcript` tries `claude-sonnet-5-5` (override: `ANALYSIS_CLAUDE_MODEL`) for every call, with 60 % of the call's time budget, and falls back to the old OpenAI model on any failure. Needs `ANTHROPIC_API_KEY` (already set for the video and report functions). Test: `analysis-claude-fallback.test.mjs`. Redeploy `analyze-transcript` (it imports the new `_lib/claude-sonnet-chat.ts`).
