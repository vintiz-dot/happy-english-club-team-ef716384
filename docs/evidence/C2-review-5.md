# C2 review 5 - delta review of round 5 (`git diff 596ce69d..309c26a6`, recorder files only) and the first look at the screens

Reviewed commit: 309c26a6 (`worktree-agent-a4803c8e10a251526`). Code read and run in the detached worktree `.claude/worktrees/c2r2`; this file is committed on `claude/hec-conductor-setup-efbaa5`.
Review only: no product code changed, nothing pushed, deployed or applied. Synthetic audio only.

**Where I am / next step:** set up. Next: sections a-b (engine and session delta).

## a. R4-1: what ends a recording at the pre-start statement

`controller.ts` `sendPreStart`: final only when `err.code === "server_refused"` AND the classified refusal is one of `FINAL_PRE_START_REFUSALS` = `pre_start_refused`, `recording_closed`, `not_your_recording`. Everything else (429, "no rows", a timeout, an unclassified text, offline) increments `preStartAttempts` and waits `backoffDelay(.., { maxMs: 60000 })`; capture carries on in `starting` (no red dot), chunks are stored, and the message is "has not yet confirmed when this recording started ... It is asked again". A real refusal: capture stops, the row is abandoned, `abandonedAt` is stamped, the audio is held and listed with its deletion date, and one `start_failed` says "the server refused it ... use the backup recorder ... kept on this laptop for 14 days". My round-4 probe V1 (three 429s) is now the author's case with eight of each kind; mutant Y1 (section f) puts the old rule back.

- **Is anything else final by string matching?** All of it is: every refusal in this engine is a regex over the server's message (`errors.ts` `PATTERNS`), here and in `FINAL_START_REFUSALS`, `FINAL_STOP_REFUSALS`, the uploader's track-ending and halting lists. That is the only channel PostgREST offers for a trigger's RAISE. What changed is that an UNMATCHED message is no longer final at the pre-start statement, the Start or the Stop. Only `pre_start_refused` is tied to the migration's text by a test; the others would become "unknown, retried" if someone reworded a RAISE - which now fails safe (retry), not destructive. Minor: tie the remaining final texts the same way.
- **Can a refusal be forged by a response body?** Only by something that can answer for the school's Supabase host over TLS with a body containing one of three exact phrases ("... can be stated once, before any chunk", "takes no more audio" / "cannot go from", "not your recording" / "not your class"). A captive portal, a proxy error page or a 429 cannot produce them by accident. Whoever can forge that can also drop every upload. Not a practical concern.
- **Stranded or silently dropped audio?** Not in this path. Retried answers keep everything locally and say so. One state to know: if the row has been abandoned on the server while the statement is still being retried, the answer is "no rows" (retried); the engine's 60-second poll of the row then ends the capture. Nothing is dropped.
- Minor: `abandonedAt` here is stamped from the laptop clock (`this.o.now()`), while the 14-day test in `recover()` uses the server clock; a wrong laptop date moves the deletion date by that much.

## b. R4-2: arming lives in the session

Read: `session.ts` (`armTick`, `startDay`, `boot`, `followUser`, `keep`), `RecorderBoot.tsx`, `data.ts` `dayDeps`.

- **Where Ready is stored.** `localStorage["hec-recorder-ready:<auth user id>"] = {"date":"YYYY-MM-DD","armed":["<session uuid>",...],"capturing":"<session uuid>"|null}`. A user id in the key, a date and session ids: no audio, no names, no token. (Seen verbatim in my probe below.)
- **A stale Ready from yesterday.** `readyFor` returns it only when `date === today` (Hanoi). Yesterday's record arms nothing and is overwritten on the next press. Mutant Y2.
- **Midnight.** `armTick` re-derives the date on every pass; a new date has no Ready, so nothing arms until it is pressed again.
- **Clock.** The session's "today" and its arm window come from the LAPTOP clock (`Date.now()` in `RecorderBoot` and the page), not the server clock the engine uses. A laptop set to the wrong day fetches the wrong day's lessons and arms nothing, calmly; a clock more than the arm window (20 min) slow arms late. The server still decides when capture may start. Minor; `rec.serverNow()` is available. Hardware check: the laptop's date and time.
- **The wrong teacher on a shared device.** The key is per user id; `followUser` (auth state) clears the previous user's Ready and ends their session; both sign-out hooks clear it. Mutant Y3.
- **A lesson cancelled or moved after Ready.** The lesson list is re-read every 60 s, so before arming a change is followed. After arming: a cancellation reaches the engine through the server (the `recorder_session_canceled` trigger and the 60 s poll); a MOVED lesson keeps the armed row's old window (server-owned, immutable) and the session will not arm it again at its new time (it is in `armed[]`). Rare (arming opens 20 minutes before), minor; the runbook should say "if a lesson is moved after the bar says Armed, press Stop and Ready again".
- **Two tabs.** One engine per browser (`navigator.locks`); the second tab's boot is refused at `prepare()` and gives up. Both tabs read the same Ready record.
- **A cover teacher / not this lesson's teacher.** The list is the sessions whose `teacher_id` is this user's teacher row, for today (`data.ts:44-56`): the session's own teacher, which for a covered lesson is the cover. A standing teacher whose lesson is covered does not get it; an admin without a teacher row gets nothing. Whatever the list says, the server decides again at arm and at Start.
- **Consent / switch-off.** The stored Ready decides nothing: `switchOn` only lets the session skip a switched-off class calmly, and if that read fails the session goes on to `arm()`, where the insert trigger checks the switch, consent, teacher and time, and the Start trigger checks again.

**R5-1 - MAJOR, to be fixed before any lesson depends on the recorder: a refused or failed `arm()` is silent, and one unclassified answer cancels the lesson for the day.** `armTick`'s catch: `if (err.code === "server_refused" && !err.retryable)` -> the lesson is written into `armed[]` and never tried again; no `problem`, no event (the engine's `arm()` throws, it does not emit), and since round 5 no page shows the error (the old screen did). That test is true for every UNCLASSIFIED answer too. Probe (the real `session.ts`, a scripted engine whose `arm()` rejects):
```
429 on arm             | arm calls 1 | stored {"date":"2026-11-13","armed":["s1"]} | next null problem null | bar {"show":false,...}
consent missing on arm | arm calls 1 | stored {"date":"2026-11-13","armed":["s1"]} | next null problem null | bar {"show":false,...}
```
One "Too Many Requests" (or PostgREST's "no rows") to the arm insert: the lesson is not recorded, nothing says so, and because it is stored, a reload or a second press of Ready does not bring it back that day (signing out and in does: it clears Ready). And a STATED no (consent missing, not your class) is just as silent: the teacher pressed Ready and is never told why nothing records. This is review 2's N-B2 and review 4's R4-1 a third time, in the newest code, and this time with no message at all. Fix (small): final only for the stated list (`switch_off`, `consent_missing`, `session_canceled`, `not_teacher`, `no_longer_teaching`, `window_closed`, `already_live`, `session_invalid`), everything else retried in 30 s as the other branch already does; in both cases set `d.problem` and show the refusal's own view on the bar and the page. Test: the probe above.

## c. Full screen

`redraw()` appends the bar to `document.fullscreenElement ?? document.body` and listens for `fullscreenchange` (and the webkit name); the model is drawn even while the recorder screen is attached when something is full screen; z-index max and `pointer-events: auto`. Stop is two-step inside the bar: "Stop" -> "Keep recording" / "Yes, stop recording" for 8 seconds, no `window.confirm` (which would leave full screen). "Open the recorder" is hidden in full screen. Seen in a browser: section f (the two-step Stop). Limits, for the hardware list: if the full-screen element is a `<video>`, `<canvas>` or `<iframe>` a child bar is not drawn (it works when a page puts a `<div>` in full screen); the tests check the source text for this, not a real full-screen change.

## d. `Layout.tsx` and `App.tsx`

`git diff 596ce69d 309c26a6`: `Layout.tsx` - the `Mic` icon added to the lucide import and one `{ icon: Mic, label: "Class recorder", path: "/teacher/recorder" }` line in the admin list and one in the teacher list (4 changed lines); no student, family or TA list touched. `App.tsx` - 3 lines: the lazy `RecorderBoot` import and `<Suspense fallback={null}><RecorderBoot /></Suspense>`. `RecorderBoot` renders nothing, loads the engine only for a teacher or admin with Ready set today, and otherwise only tells the session who is signed in. Nothing else in either file in this delta. (Both files on this branch also carry the conductor branch's other work; the release takes main's versions and re-applies only these lines - part 2.)

## e. The migrations

No change since review 4: `git diff 596ce69d 309c26a6` is empty for `20261112100000_class_recorder.sql`, `20261112101000_recorder_retention_cron.sql` and `supabase/functions/recorder-retention/`.

What applying `20261112100000_class_recorder.sql` creates on live (one transaction, `lock_timeout 5s`, safe to run twice):
- a PREFLIGHT that refuses to install if `storage.objects` has no RLS, if a bucket `class-recorder-audio` exists with other settings, or if any permissive policy on `storage.objects` is not scoped by `bucket_id` or names the recorder's bucket;
- 9 tables: `recorder_settings` (one row, seeded), `recorder_audit_log` (append-only: 2 triggers), `class_recording_settings` (the per-class switch, default off), `recorder_child_consents`, `recorder_device_profiles`, `class_recordings`, `class_recording_tracks`, `class_recording_chunks`, `class_recording_markers`; RLS enabled on all nine; explicit grants to `authenticated` (column-level UPDATE) and `service_role`;
- 1 view `recorder_session_evidence`; 32 functions; 10 triggers - of which TWO sit on existing live tables: `recorder_enrollment_consent` on `public.enrollments` (after insert / update of student, class, dates) and `recorder_session_canceled` on `public.sessions` (after update of status to Canceled);
- 17 table policies + 2 storage policies (`class_recorder_audio_insert`, `class_recorder_audio_select`); no UPDATE and no DELETE policy on the bucket;
- the private bucket `class-recorder-audio` (8 MB per object; audio/webm, flac, wav, application/json).

`20261112101000_recorder_retention_cron.sql` creates two `cron.job` rows (`recorder-retention` nightly 20:00 UTC, `recorder-expire-stale` hourly) and nothing else.

Who can reach audio (unchanged since review 2, re-read):
- WRITE an object: only the teacher who started that recording, while it is `recording` / `uploading`, and only at the exact path of a chunk the server registered and has not confirmed (`recorder_can_upload`); the manifest only while `uploading`. Nobody can overwrite or delete (no policy); deletion is the retention function alone.
- READ an object or a recording's rows: an admin, a standing teacher of that class, the teacher of that recording's own session (`recorder_can_listen`); the recorder for their own OPEN recording's rows. Nothing once the recording is `deleted`.
- **No family or student path**: no policy names a parent, student or TA; `recorder_is_class_teacher` reads only `classes.default_teacher_id` and the weekly slots' teachers; the consents table is admin-read only.
- **Service role**: not used by the browser. Used only by `recorder-retention` (gate: the runner token or an admin's own JWT; `verify_jwt = true`) to list / remove objects under `{class}/{recording}/` for recordings the database lists as due, and to call the migration's functions - none of which a caller could do under RLS.
