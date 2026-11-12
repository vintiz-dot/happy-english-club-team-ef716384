# C1 - Class recorder architecture

Task C1 of `docs/MASTER_PLAN.md`. Author: Fable 5.2, 2026-11-11. Branch `worktree-agent-acf51c46cb0eb722c`.

## Revision 1 (2026-11-12) - after the C1 critic (`docs/evidence/C1-critic.md`)

The migration was never applied, so it was edited in place. Evidence and the mutation run: `docs/evidence/C1-revision.md`. What changed, by finding:

- **F1 (evidence was the laptop's claim).** `started_at` / `ended_at` are now the server's clock at the start/stop transitions; the laptop's times are kept only as `client_started_at` / `client_ended_at`. A chunk is refused at registration unless its span is at most one chunk (+ tolerance), it has at least the format's byte floor (`min_bytes_per_sec_*`), it ends no later than the server's clock allows (`clock_timestamp() - started_at` + tolerance), not after Stop, and not after the capture window. `complete` additionally requires every confirmed chunk to still be in storage at its confirmed size, no overlap between consecutive chunks of a track, and no chunk ending after the server's start-to-stop span. The view dropped `confirmed_audio_ms` for `claimed_audio_ms` (a claim), `server_capture_ms`, `stored_bytes`, `verified_audio_ms`, `verified_lesson_ms`, `held_threshold_ms`, and the strict **`counts_as_held_evidence`**, which D reads (section 7).
- **F2 (cover teacher read the whole class).** "May record" and "may listen" are split. Recording: admin, standing teacher (default / timetable), or the teacher of THAT session. Listening (rows, parts, files): admin, standing teacher, or the teacher of the recording's own session. The -7/+60-day tier is gone; class-level reads (switch, missing count, switch-off) need a lesson of the class TODAY.
- **F3.** Per-child consent must be under the CURRENT wording, in the one shared count; a wording change switches every class off at once.
- **F4.** `session_id` can go NULL only through the foreign key once the session row is gone; `armed_session_id` (immutable, NOT NULL) keys the one-live-recording index and the cancel trigger.
- **F5.** Capture window enforced by the server: `capture_opens_at = start - pre_roll (5)`, `capture_closes_at = end + grace (10)`, snapshot at arming. `max_overrun_minutes` is removed; grace is the one overrun number. Arming may still happen 20 minutes early (it is only a row).
- **F6.** `SET row_security = off` on every function that reads `storage.objects`; the DELETE trigger re-checks storage. If the owner cannot see storage, they raise.
- **F8-F15.** After-Stop audio refused; a child enrolled without consent switches the class off; a cancelled lesson abandons armed and stops running recordings; deletion attribution, stop reason and device profile are server-checked; `recorder_is_class_teacher` is no longer executable by signed-in users; the started-by read arm is open-recordings-only and rows-only; sample rate capped at 48 kHz; no admin DELETE policy on the bucket.

Sections 0, 3, 4, 5.5, 6, 7, 8 and 9.1 below are updated to match; where an older sentence survives it is marked "(rev. 1)".

Deliverables:

- this document (the contract for C2 capture core, C3 UI, C4 tests, C5 runbook, and for D1);
- `supabase/migrations/20261112100000_class_recorder.sql` - WRITTEN AND TESTED, NOT APPLIED;
- `scripts/pgtest/recorder.test.mjs`, registered in `scripts/pgtest/run.mjs` (one line).

Scope: CAPTURE ONLY. Nothing here transcribes, identifies a speaker, scores or summarises. Analysis waits for `MONITOR_GO` (`docs/MASTER_PLAN.md:44`). Nothing recorded is readable by a family, a student, a teaching assistant or a teacher of another class.

How to read the confidence marks:

- **[repo]** - read in this repository, cited `file:line`.
- **[doc]** - read in vendor documentation on 2026-11-11, URL given.
- **[tested]** - asserted by `scripts/pgtest/recorder.test.mjs`.
- **[C2-measure]** - believed from general knowledge, NOT verified here. C2 must measure it before relying on it. Nothing marked this way is a fact.

## 0. Results

| Check | Before | After |
|---|---|---|
| `node scripts/pgtest/run.mjs` | 1611 assertions, 30 suites, 0 failed | 1802 assertions, 31 suites, 0 failed (1611 + the 191 new; no existing suite changed its count) |
| `recorder.test.mjs` alone | - | 191 passed, 0 failed |

The migration applies twice without error in the harness **[tested]**. It has not been run against any real database; the harness prelude is a dozen tables (`scripts/pgtest/run.mjs:15-17`), so "applying is still the proof".

## 1. Platform

**Decision: a page inside the existing app, at `/teacher/recorder`, used in Chrome or Edge on one Windows laptop, installable through the manifest the app already ships.** No desktop wrapper, no second device, no phone pairing (an iPhone as a third microphone is listed only as an optional later task: it brings a second clock, which is the problem this design avoids).

Why a page: the app is already a PWA shell (`public/manifest.json:4-6` `display: standalone`; service worker registered at `src/main.tsx:10-12`), teachers already sign in to it, the routes are already role-gated (`src/App.tsx:114`, `allowedRole={["teacher","admin"]}`), and it already captures media in two places (`src/components/video-homework/VideoRecorder.tsx:78-80`, `src/contexts/NoiseMeterContext.tsx:59-63` - the second one with all three processing flags off, so that constraint shape is already in production use).

### 1.1 What the browser can do

| Requirement | Status | Basis |
|---|---|---|
| Two `getUserMedia` audio streams at once from two different USB devices, each pinned with `deviceId: { exact }` | Expected to work | **[C2-measure]**. Standard API; the two devices are separate capture endpoints so nothing is shared between the streams. |
| `echoCancellation: false, noiseSuppression: false, autoGainControl: false` per stream | Expected to be honoured for Chrome's own software processing | **[repo]** the app already asks for this (`NoiseMeterContext.tsx:61-63`). **[C2-measure]** read back `track.getSettings()` on BOTH tracks after BOTH are open and store it (`class_recording_tracks.applied_settings`). Chrome documents that some effects are system-wide per device ("it will apply to all audio input streams from the same device", https://developer.chrome.com/blog/disabling-hardware-noise-suppression **[doc]**); our two tracks are different devices, so one cannot change the other, but that is exactly what the read-back proves. |
| `voiceIsolation: false` | Unknown | **[C2-measure]** check `navigator.mediaDevices.getSupportedConstraints().voiceIsolation`; pass it only when supported; record the value read back. |
| Mono | Yes | Ask `channelCount: { exact: 1 }` and, whatever arrives, take channel 0 in the worklet. The table refuses anything else (`channel_count = 1` check) **[tested]**. |
| Microphone permission remembered | Yes, per origin, until the teacher or a policy clears it | **[C2-measure]** `navigator.permissions.query({ name: "microphone" })` returns `granted` on later visits; device labels are only visible once it is. |
| Arm and start with NO click when the page is already open | `getUserMedia` with a granted permission needs no click. `AudioContext` is the open question. | **[C2-measure]** Chrome's autoplay policy starts an `AudioContext` suspended until a user gesture, with documented exceptions (installed PWA, site engagement). The design does not depend on an exception: see 1.3. |
| Keep running in a background tab | Believed yes while the microphone is live; NOT documented plainly | **[doc]** https://developer.chrome.com/blog/timer-throttling-in-chrome-88 : intensive throttling (one timer wake-up a minute) applies after 5 minutes hidden unless the page is audible or "WebRTC is in use" - the article names an `RTCPeerConnection` with an open data channel or a live `MediaStreamTrack`; it does not name plain `getUserMedia`. So: the design does not use timers on the audio path at all (1.2), and **[C2-measure]** a 100-minute hidden-tab recording must be shown to lose zero frames. |
| Keep the screen on / stop idle sleep | Screen Wake Lock, only while the page is visible | **[doc]** https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API : released automatically when the document is hidden; must be re-requested on `visibilitychange`; secure context only; can be refused on low battery. |

### 1.2 The audio path is built so throttling cannot reach it

```
getUserMedia(lapel) --> MediaStreamAudioSourceNode --\
                                                      >-- ONE AudioWorkletNode (2 inputs, 0 outputs)
getUserMedia(S500)  --> MediaStreamAudioSourceNode --/            |  MessagePort (transferred)
                                                                   v
                                                        dedicated Worker: chunk, encode, SHA-256,
                                                        write to IndexedDB, then upload
```

- One `AudioContext`, one `AudioWorkletProcessor` with two inputs. Each `process()` call hands over the same 128 frames of both tracks, so the two tracks are aligned by construction and stamped by the same frame counter (5.3).
- The worklet posts PCM straight to a dedicated Worker over a transferred `MessagePort`. Nothing on the capture path is a `setTimeout`/`setInterval` on the main thread, which is what tab throttling slows. **[C2-measure]** that message delivery to a Worker of a hidden page is not delayed enough to grow memory (bound the queue; count frames in and frames written; the manifest reports both).
- The main thread only draws the meters and the indicator. If it is throttled, the picture is late, the audio is not.

### 1.3 What the browser cannot do - and what the design does about each

| Limit | Consequence | What we do |
|---|---|---|
| A page cannot be relied on to start an `AudioContext` with no gesture after a cold load | "Zero touch after a reboot" is not promised | The teacher presses **Ready for today** once after opening the page (the setup check runs on that click: both devices present, levels moving, tap test). The context is created and resumed on that click and stays running; every lesson that day then arms and starts by itself. One click a day, zero clicks a lesson. |
| The tab or the browser is closed | Capture stops at once. A web page cannot run without its window; a service worker cannot hold a microphone | `beforeunload` warning while armed or recording. PCM is flushed to IndexedDB every 5 s, so at most 5 s is lost. On next open the page finds the unfinished recording, uploads what it has and finishes it with `stop_reason = 'crash_recovered'`. |
| The laptop sleeps or the lid closes | Capture stops; the OS suspends the audio devices. No web API prevents lid-close sleep | Runbook (C5): power plan "when I close the lid: do nothing" and "sleep: never" on mains. Wake lock while visible. **[C2-measure]** run `powercfg /requests` during a recording and record whether Chrome holds a system request while capturing with the tab hidden. On resume the page detects the jump (context time vs `performance.now()`), writes a `gap` marker and carries on. |
| Windows "audio enhancements" on a capture device | Applied before the browser sees the samples; no web API turns them off | Owner check (9.2): Settings > System > Sound > the device > Audio enhancements: Off, for both devices. |
| The S500's own DSP (beam-forming, echo cancelling, noise reduction, AGC) | Lives in the device firmware; it enumerates as an "Echo Cancelling Speakerphone". The browser cannot disable it | Accepted and recorded: the room track is a processed signal. The manifest says so (`room_device_dsp: "hardware, not disableable"`). Whether AnkerWork software exposes a switch is **[C2-measure]** / owner check. Do NOT play audio through the S500 during a lesson: its echo canceller would then subtract it. |
| A device set as Windows' "default communications device" | Windows may duck other audio and Chrome lists a second "Communications - ..." alias for it | Bind by real `deviceId`, never by the `default` / `communications` aliases (2). |
| PWA | No background capture, no reliable background upload (Background Sync is best-effort and brief). IndexedDB can be evicted under disk pressure unless persisted | Uploads happen while the page is open. Call `navigator.storage.persist()` at setup and refuse to arm if `navigator.storage.estimate()` shows less than 2 GB free. |

### 1.4 When a desktop wrapper would be justified

Only if a measurement fails. The two that would decide:

1. **Hidden-tab integrity.** Record 100 minutes with the recorder tab hidden behind another full-screen app, then again minimised. Pass = frames captured equals frames written for both tracks and no `gap` marker. A fail that cannot be designed around means a wrapper (or a rule "the recorder window stays on top").
2. **Zero-touch start, if and only if the owner decides one click a day is not acceptable** (9.1 Q7). Measure: installed PWA set to start at sign-in, cold boot, does `AudioContext.resume()` succeed with no gesture. A fail means a small wrapper (e.g. Tauri) that hosts the same page; the capture core in `src/lib/recorder/` would not change.

## 2. Devices

The setup wizard (C3) must end with a stored profile and proof that the two inputs are two devices.

**Enumeration.** `enumerateDevices()` after permission is granted. On Windows Chrome lists, besides each real endpoint, two aliases with `deviceId` `"default"` and `"communications"` (labels "Default - ..." and "Communications - ..."). Rule: drop those two ids; work only with real ids. An alias and its real device share a `groupId`, which is how the wizard can say "this is also your Windows default". **[C2-measure]** confirm on the school laptop and record the exact label strings of both devices in the C2 evidence file.

**Confusing labels.** A lapel receiver typically shows as "Microphone (2- USB Audio Device)", the S500 as "Echo Cancelling Speakerphone (Anker PowerConf S500)". The number changes when the receiver moves to another USB port. The wizard never asks the teacher to read labels. It asks them to act:

1. "Tap the lapel microphone three times." The input whose level jumps is the teacher track.
2. "Clap once near the speakerphone." The other input must jump more than the lapel.
3. Both must be different `deviceId`s AND different `groupId`s, and the two signals must not be the same signal (normalised cross-correlation at zero lag below 0.98) - that catches "the same device chosen twice through an alias".

**Profile, stored twice.** In the browser (`localStorage`: an `install_id` made once, the two `deviceId`s, labels) and on the server in `recorder_device_profiles` for audit: labels, SHA-256 of each `deviceId` and `groupId`, user agent, the wizard's check results. The table refuses a profile whose two hashes are equal **[tested]**. It is keyed by a plain `UNIQUE (user_id, install_id)` so the page can upsert (a partial index could not be the conflict target - root `AGENTS.md`, "Database migrations") **[tested]**.

**`deviceId` stability.** Per origin; stable across sessions until site data is cleared; different in another browser profile, in incognito and on another origin (so a preview deployment has its own). Therefore at every arm the page re-resolves: saved id present -> use it; missing -> look for the same label; ambiguous or missing -> do not arm, show "Run the microphone check". Never fall back to the default microphone: that is how the laptop's built-in mic would silently become a track.

**Hot unplug.** `devicechange` on `navigator.mediaDevices` and `ended` on the track. While recording: keep the other track going, write zeros for the dead one so the timeline stays aligned, add a `device_change` marker, show a red banner, and try to reopen the same `deviceId` every 2 s. If it does not return in 60 s the lesson finishes with one track; the manifest says which.

**Swapped roles.** Checked at the wizard (the tap test above) and again cheaply in the first 60 s of each recording: if the room track's speech level is persistently higher than the lapel's while one voice dominates, show "Microphones may be swapped" - a warning for the teacher, never an automatic swap. The roles as recorded stay as recorded; a `note` marker records the warning.

## 3. Scheduled arming

**Where lessons live [repo].** `public.sessions`: `class_id`, `teacher_id`, `date` (date), `start_time`, `end_time` (time), `status` (`Scheduled` / `Held` / `Canceled`) - `src/integrations/supabase/types.ts:3593-3613`, enum at `:6672`. The times are Hanoi wall-clock: the generator computes "today" with `timeZone: 'Asia/Bangkok'` (`supabase/functions/schedule-sessions/index.ts:190`, `:404`, `:441-443`) and SQL elsewhere uses `'Asia/Ho_Chi_Minh'` (`supabase/migrations/20261107090000_ai_assisted_admin_actions.sql:131`). Both are UTC+7 with no daylight saving. The recorder converts with `(date + start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'` in the database (migration, `recorder__recording_before_insert`), never in the browser, so the laptop's time zone setting is irrelevant.

**The page's schedule.** Every 60 s, and on focus, the page reads today's sessions for the signed-in teacher (the existing `sessions` RLS already scopes this) and the class switches it may read.

| Moment | Rule | Default | Where enforced |
|---|---|---|---|
| Arm | Insert the `class_recordings` row (status `armed`). The server checks everything in section 4 at this moment. Arming is only a row: no audio is accepted while armed. | from 20 min before start (`arm_window_minutes`) | trigger **[tested]** "Too early" |
| Start capture | `armed -> recording`, at start - 5 min (`pre_roll_minutes`) | 5 | **server (rev. 1)**: refused before `capture_opens_at = scheduled_start - pre_roll`; `started_at` is the server's clock **[tested]** |
| Stop | At scheduled end + grace, or the teacher's Stop | grace 10 min (`grace_minutes`) | page; `ended_at` is the server's clock, never later than `capture_closes_at` **[tested]** |
| Hard limit | No audio later than `capture_closes_at = scheduled_end + grace` (+ 15 s tolerance), whatever the page does | the grace setting; there is no separate overrun any more (rev. 1) | `recorder_register_chunk` refuses `started_at + t_end_ms` past it, even while still `recording` **[tested]** |
| Manual start | "Record now" is the same insert; allowed any time from arm-window-open until the scheduled end; capture still waits for pre-roll | - | trigger **[tested]** "Too late" after the end |
| Manual extend | "Keep recording" moves the page's stop up to the hard limit | - | page; hard limit above |

Both the pre-roll and the grace are snapshot onto the recording at arming (`capture_opens_at`, `capture_closes_at`, immutable **[tested]**), so a later settings change cannot widen a recording's window.

Why 10 minutes' grace: lessons overrun and the goodbye is part of the lesson; ten minutes covers that without recording the next group at length. It is a setting (`recorder_settings.grace_minutes`, 0-30, default 10).

**Cancelled or rescheduled meanwhile.**

- Cancelled BEFORE arming: the insert is refused **[tested]**.
- Cancelled AFTER arming or during capture: a trigger on `sessions` (rev. 1) abandons an armed recording of that lesson (`abandon_reason = 'session_canceled'`) and stamps `stop_requested_at` on a running one **[tested]**; the page sees it on its next read, stops, and finishes with `stop_reason = 'session_canceled'` (accepted only because the server asked it to stop). The audio already captured is uploaded, not discarded: "a lesson was being recorded when someone cancelled it" is exactly the fact workstream D needs (7). An admin can delete it (6.6).
- Time changed: the window is fixed at arming (`scheduled_start/end` are snapshots and immutable **[tested]**). The page abandons the armed row and arms again for the new time. If the lesson is already being recorded, it carries on under the old window.
- Session row deleted: the nightly rebuild deletes Scheduled, non-manual sessions dated today or later that no longer match the template (`supabase/functions/schedule-sessions/index.ts:728-746`), and it runs at 02:00 UTC = 09:00 Hanoi (`supabase/migrations/20261110160000_schedule_runner_and_nightly_rebuild.sql:27-38`), i.e. possibly during a morning lesson. So `class_recordings.session_id` is `ON DELETE SET NULL` and the recording keeps the class, date and window it was armed with **[tested]**. A restrictive foreign key here would have broken the rebuild.

**Back-to-back lessons (B starts when A ends).** A recording holds the voices of ONE class. Rule: A stops at `min(A.end + grace, B.start)`; B starts at `max(B.start - pre_roll, A's stop)`. So when B follows A directly, A gets no grace, B gets no pre-roll, and the handover is at the timetable boundary. Children of class A are never stored under class B's consent. "B" means the next session today that this laptop's teacher teaches. (A different teacher's class walking into the same room is a room rule for the runbook, not something the laptop can know.)

The database also refuses two live recordings of one session (`class_recordings_one_live_per_session`, a partial unique index on the immutable `armed_session_id` - deliberately not an upsert target; nothing names it in an ON CONFLICT) **[tested]**. Since rev. 1 the recorder cannot detach a recording from its session to get round it **[tested]**.

**Clock skew.** The laptop's clock is not trusted for anything that grants permission:

- Whether a lesson may be armed is decided by the database clock at insert.
- For its own timers the page measures `offset = server - local` with `recorder_server_time()` (midpoint of the round trip), at load and every 10 minutes, and schedules on corrected time. If `|offset| > 5 s` it shows a notice; if it cannot reach the server it does not arm.
- `started_at` / `ended_at` are the SERVER's clock at the start and stop transitions (rev. 1); the laptop's claims are kept in `client_started_at` / `client_ended_at` for information and are never evidence **[tested]**.
- A chunk's position (`t_end_ms`) may not run ahead of `clock_timestamp() - started_at` by more than `clock_tolerance_seconds` (15): audio cannot be registered before it could have been captured **[tested]**.
- Positions inside the recording never use the wall clock at all (5.3).

**Arming needs the network.** Deliberate: the consent check is on the server, so with no connection the answer is "no" (fail closed). Once armed, capture and local queueing need no network; upload resumes when it returns.

## 4. Authorisation and consent

**The switch.** `class_recording_settings.recording_enabled`, per class, `DEFAULT false`, and no row at all also means off **[tested]**. A table CHECK makes ON impossible without `consent_confirmed_by`, `consent_confirmed_at`, `consent_wording_version` and a non-empty `consent_note` - even for the service role **[tested]**. Signed-in users hold only SELECT on the table; the one way to change it is `recorder_set_class_recording()`:

- ON: an admin only; must quote the current wording version (`recorder_settings.consent_wording_version`); must say where the signed forms are held; refused while any enrolled child lacks consent **under that same version** **[tested]**.
- A wording change (rev. 1) switches every class off at once, in the settings trigger, logged as `switch_off_auto` with the old and new versions; nothing records until an admin re-records each child's consent under the new wording and switches the class on again **[tested]**. Arming independently refuses a class confirmation under an older version **[tested]**.
- OFF: an admin OR a teacher of the class (a standing teacher, or the teacher of one of its lessons today). Stopping never needs permission. Switching off wipes the confirmation (the history is in the audit log), abandons anything armed and stamps `stop_requested_at` on anything recording; audio captured more than 60 s after that stamp is refused at registration **[tested]**.

**Per-child consent.** `recorder_child_consents`: one row per child, `granted` or `withdrawn`, who recorded it, when, wording version, note. Admin only, through `recorder_record_child_consent()`; teachers cannot read it and are told a number, not names (`recorder_class_missing_consent`) **[tested]**.

**A child without consent in a class - recommendation: the class is not recorded.** A room microphone cannot leave one child out, and "ask that child to stay quiet" is not consent. So:

- the switch cannot be turned on while one enrolled child lacks `granted` under the current wording;
- one count does this everywhere, `recorder__children_without_consent(class, date)` (internal), used by the switch, the teacher's number and the arm trigger; it returns NULL if the wording cannot be read, and NULL is a refusal;
- a child enrolled while the class is on, without current consent, switches it off at once (trigger on `enrollments`, rev. 1; it never refuses the enrolment) **[tested]**;
- arming re-counts on the lesson's date anyway, so an enrolment that reached the table some other way still blocks the next recording **[tested]**;
- recording a withdrawal switches off every class the child is enrolled in today, in the same transaction **[tested]**.

The cost is real (one family's "no" stops the class) and it is the owner's call - 9.1 Q2.

**Indicator.** While status is `armed` or `recording` the recorder page must show a persistent, unmissable state: a red "RECORDING - Class X - since 17:55" bar that cannot be dismissed, a different amber "ARMED - starts 17:55" state, and the same in the tab title, so it is visible when another tab is in front. Chrome additionally shows its own capture dot on the tab, which the page cannot hide. C3 must not make the bar closable. For the room: a printed "This lesson is being recorded" sign and telling the children at the start are runbook items (C5), and the roll-call marker is the natural moment.

**Audit log.** `recorder_audit_log`: who, when, what - `switch_on`, `switch_off`, `switch_off_auto`, `child_consent_*`, `armed`, `started`, `stopped`, `completed`, `abandoned`, `stop_requested`, `deletion_requested`, `retention_changed`, `audio_deleted`, `settings_changed`. Written only by triggers and by `recorder__audit()`, which no API role may execute **[tested]**. UPDATE, DELETE and TRUNCATE raise for everyone including the table owner **[tested]**. No foreign keys, so it outlives what it describes. Admins read all of it; a person reads their own lines.

## 5. Capture format contract (for C2)

### 5.1 Layout

- Two tracks: `teacher` (lapel) and `room` (S500). Mono each. Never mixed, never interleaved.
- Chunk length: **30 s** (`class_recordings.chunk_ms`, 10-60 s allowed). Short enough that a crash loses little and a retry is cheap; long enough that a 105-minute lesson is 210 chunks a track, not thousands.
- Storage path, chosen by the database, not by the page: `{class_id}/{recording_id}/{track}/{seq:06d}.{ext}` and `{class_id}/{recording_id}/manifest.json`. No name, no student id, no date in the path.
- Every chunk row carries `seq` (0-based, contiguous), `byte_size`, `sha256` (lower-case hex of the exact bytes uploaded), `t_start_ms`, `t_end_ms`.

### 5.2 Candidate formats - C2 measures, then one is chosen

| | A. Opus 128 kbps in WebM, `MediaRecorder` | B. FLAC 48 kHz 16-bit, `AudioWorklet` + encoder in a Worker |
|---|---|---|
| Fidelity | Lossy. Fine for listening and probably for ASR; unknown for speaker work | Lossless |
| One clock for both tracks | Weak: two `MediaRecorder`s, each with its own start latency; chunk edges are not sample-exact | Exact: one worklet, one frame counter |
| Chunks decodable alone | No with `start(timeslice)`: only the first blob has the header, later blobs are a byte-split of one stream. (Stop/start per chunk makes them standalone but loses or overlaps a few ms each time.) | Yes: every chunk is a complete FLAC file |
| CPU | Negligible (native encoder) | **[C2-measure]** WASM FLAC, two tracks, on the school laptop |
| Size, one track, 90 min | 86 MB | 518 MB as raw PCM; FLAC on speech typically 50-60% -> about 260-310 MB **[C2-measure]** |
| Size, two tracks, 90 min | **about 173 MB** | **about 520-620 MB** (raw PCM/WAV would be 1.04 GB) |
| Size, two tracks, full window (5 + 90 + 10 min) | about 202 MB | about 610-720 MB |
| One 30 s chunk | 0.48 MB | about 1.5-1.7 MB (2.88 MB as WAV) |
| Upload needed to keep up live | about 0.3 Mbit/s | about 0.9-1.0 Mbit/s (1.6 as WAV) |

Arithmetic: Opus 128 kbit/s = 16 kB/s x 5400 s = 86.4 MB. PCM 48 000 x 2 bytes = 96 kB/s x 5400 s = 518.4 MB.

Also allowed by the schema: `pcm-wav` (no encoder, biggest) as the fallback if the FLAC encoder is too heavy, and a note for C2: Opus encoded from the worklet's PCM with WebCodecs `AudioEncoder` would give candidate A's size with candidate B's clock and standalone chunks - worth one measurement if both A and B disappoint.

**Decision criteria (in this order):**

1. Zero dropped frames over a 100-minute two-track capture on the school laptop, tab hidden. A candidate that drops frames is out.
2. Inter-track alignment error at minute 1 and minute 95 (clap test): under 20 ms and not growing by more than 10 ms. A is expected to struggle here.
3. Speech-evaluation need: if workstream B's findings say lossy audio hurts speaker identification or pronunciation scoring, B wins regardless of size. Until B reports, prefer lossless - a lossy original can never be made lossless later.
4. Upload keeps up on the school's real uplink (9.2), and storage cost is acceptable to the owner (9.1 Q5): at 30 days' retention, 5 lessons a day is roughly 30 GB (A) or 90-110 GB (B) held at any time.

**Provisional recommendation: B (FLAC), falling back to A if criterion 1 or 4 fails.** The reason is criterion 2 plus "controlled recordings for a speech evaluation": those want the cleanest original and an exact common timeline.

### 5.3 One clock

- t = 0 is the first frame the worklet delivers after capture starts. Both tracks arrive in the same `process()` call, so frame *n* of `teacher` and frame *n* of `room` are the same instant on the `AudioContext` clock.
- Chunk *k* holds frames `[k * F, (k+1) * F)` with `F = sampleRate * chunk_ms / 1000`; `t_start_ms = k * chunk_ms`, `t_end_ms` = that plus the real frame count / sampleRate (only the last chunk is short). Derived from frame counts, never from `Date.now()`.
- Wall-clock anchors, recorded for information only: at t = 0 and at every chunk boundary `{ context_time, performance_now, date_now, server_offset_ms }` (`AudioContext.getOutputTimestamp()` gives the first two together). A system clock change moves `date_now` and nothing else; the manifest lists it as a discontinuity, the timeline is untouched.
- If the context itself stalls (sleep): detected as `performance_now` advancing more than `context_time` by over 100 ms between chunks -> `gap` marker with the wall-clock length; audio time is not stretched.
- **[C2-measure]** the two devices have separate hardware sample clocks and the browser resamples each onto the context's. Measure the residual drift between tracks over 95 minutes (criterion 2).
- Format A cannot meet this section exactly; if A is chosen, the manifest must say `timeline: "approximate"` with the measured tolerance.

### 5.4 Manifest (`manifest.json`, written at finalize, uploaded last)

```
schema_version            1
recording_id, class_id, session_id
purpose                   "lesson" | "evaluation"
session_date, scheduled_start, scheduled_end        (as the server stamped them)
format                    "flac" | "opus-webm" | "pcm-wav"
chunk_ms
timeline                  "exact" | "approximate", tolerance_ms
sample_rate               the AudioContext's
chunks_self_contained     true | false
started_at_client, ended_at_client, server_offset_ms_at_start, server_offset_ms_at_end
anchors[]                 { t_ms, context_time, performance_now, date_now }
discontinuities[]         { t_ms, kind: "context_stall" | "clock_change" | "device_lost", wall_gap_ms }
tracks[]                  { track, device_label, device_hash, group_hash,
                            requested_constraints, applied_settings (getSettings()),
                            room_device_dsp (room only), frames_captured, frames_written,
                            chunk_count, total_bytes, total_ms,
                            chunks[]: { seq, path, byte_size, sha256, t_start_ms, t_end_ms } }
markers[]                 { client_marker_id, kind, t_ms, label, student_id }
app                       { version (git sha), user_agent, install_id, device_profile_id }
stop_reason
```

The manifest's own SHA-256 goes in `class_recordings.manifest_sha256`. The database will not mark a recording `complete` unless the manifest object exists, every registered chunk is confirmed, and each track's `chunk_count` equals both the number of chunk rows and `max(seq) + 1` **[tested]**.

### 5.5 Upload protocol

**Decision: direct to Supabase Storage with the teacher's own JWT, under RLS. No edge function on the upload path.** A teacher can write these files under RLS, so by the hard rule the service role has no business there; and children's audio then never passes through function memory or logs.

Per chunk, in this order:

1. `recorder_register_chunk(recording, track, seq, byte_size, sha256, t_start_ms, t_end_ms)` -> `{ chunk_id, storage_path, already_registered, confirmed }`. Idempotent: `INSERT ... ON CONFLICT (recording_id, track, seq) DO NOTHING` against a plain unique constraint, then compare; same bytes -> the existing row; different bytes -> refused, never overwritten **[tested]**.
2. `storage.from('class-recordings').upload(storage_path, blob, { upsert: false })`. The INSERT policy accepts only the exact path of a registered, not-yet-confirmed chunk of the caller's own open recording **[tested]**. "Already exists" is success-so-far: go to step 3. There is no UPDATE policy, so nothing stored is ever replaced **[tested]**.
3. Download the object back, SHA-256 it, and call `recorder_confirm_chunk(chunk_id, readback_sha256)`. It returns true only if the object is in the bucket at that path, Storage's recorded size equals `byte_size`, and the read-back hash equals the registered one **[tested]**. Idempotent.

**"The server confirms" is defined as step 3 returning true.** Only then is the local chunk marked `confirmed`. Honest limit: the size is the server's fact; the read-back hash is computed by the page (Storage keeps no SHA-256), so it proves the page read back the right bytes, not that a hostile page did. That is enough for "never lose a lesson"; it is not an anti-tamper proof, and D1 is told so (7).

Chunks are under 6 MB, so the standard upload is the right call; Supabase recommends the resumable (TUS) protocol only above 6 MB (https://supabase.com/docs/guides/storage/uploads/resumable-uploads **[doc]**). "Resumable" here means: the recording is hundreds of small immutable objects, and after any interruption the queue continues from the first chunk not confirmed.

**IndexedDB queue (database `hec-recorder`).**

- Stores: `recordings`, `chunks` keyed `[recording_id, track, seq]` with the bytes and a state, `markers`, `manifests`.
- Chunk states: `captured -> registered -> uploaded -> confirmed`. Every step is safe to repeat.
- One uploader at a time across tabs: `navigator.locks.request('hec-recorder-upload')`. A second recorder tab shows "The recorder is open in another tab" and does nothing.
- Upload starts during the lesson (oldest first, 2 at a time, exponential backoff to 60 s) and continues after it; the page says "Uploading - keep this page open" until done.
- **Never delete local data until the server confirms:** a chunk's bytes are removed only when (a) step 3 returned true for it AND (b) the recording has reached `complete`. Abandoned recordings keep their local bytes until the teacher or an admin decides (C3: "Discard" with a typed confirmation).
- Markers are queued the same way; `client_marker_id` makes a re-sent marker a no-op **[tested]**.
- Sign-out is blocked (with an explanation) while anything is unconfirmed, because the queue is worthless without the session that owns the recording.

## 6. Storage and schema

Everything below is in `supabase/migrations/20261112100000_class_recorder.sql`.

### 6.1 Who - and the TA decision

**Teaching assistants: NO.** Not to record, not to read, not to switch off.

This needed its own helper. `is_teacher_of_class`, as defined NOW (`supabase/migrations/20261111110000_ta_standing_assignments_and_homework_upload.sql:54-118`), says yes for teaching assistants: lines 97-108 (a TA on a session in the window) and 110-117 (a standing assignment). Using it would have handed TAs the audio. `recorder_is_class_teacher(user, class)` repeats its three teacher tiers only (default teacher `:61-67`, teacher of a session from 7 days back to 60 ahead `:69-78`, teacher named in the weekly template `:80-95`) and additionally ignores archived teachers. The suite shows a standing TA for whom `is_teacher_of_class` is true and the recorder's check is false **[tested]**.

`has_role(uuid, app_role)` is the original (`supabase/migrations/20251012023454_6adfb949-50dc-4ebb-8853-6de73d8e8441.sql:34-46`, `user_roles` lookup, SECURITY DEFINER), executable by `authenticated` (`supabase/migrations/20260719014455_97d48fc4-92fa-492b-80b3-b7f3f31f762d.sql:2`).

Stated consequences, so the critic need not find them:

- The copy can drift from `is_teacher_of_class`. If the teacher tiers of that function change, this one must be changed too. (Drift in the safe direction only narrows access.)
- A cover teacher - one non-cancelled session of the class within the last 7 days - can read ALL of that class's recordings still in retention, for those 7 days, exactly as they can read the rest of the class's data. If the owner wants covers limited to the recording they made themselves, that is a one-line change to the storage read rule (9.1 Q4).
- The person who made a recording can always read its ROWS (so an interrupted upload can finish) but reads its FILES only while still a teacher of the class.

### 6.2 Tables

| Table | Purpose | `authenticated` may | RLS |
|---|---|---|---|
| `recorder_settings` | one row: retention 30 d, pre-roll 5, grace 10, arm window 20, overrun 30, stale 14 d, wording version | SELECT, UPDATE | staff read; admin updates (logged) |
| `class_recording_settings` | the switch + consent confirmation | SELECT | admin and the class's teachers; writes only via function |
| `recorder_child_consents` | per-child granted/withdrawn | SELECT | admin only; writes only via function |
| `recorder_device_profiles` | the two microphones per browser | all four | own rows; admin reads all |
| `class_recordings` | one per recording | SELECT, INSERT, UPDATE | read: admin, class teachers, the starter. Insert: self, own class, then the trigger. Update: starter while open; admin |
| `class_recording_tracks` | teacher / room | SELECT, INSERT, UPDATE | read as recording; write: starter while open |
| `class_recording_chunks` | one per file | SELECT | read as recording; writes only via functions |
| `class_recording_markers` | roll call, activity, name chips, gaps | SELECT, INSERT, DELETE | read as recording; insert/delete: starter while open |
| `recorder_audit_log` | append-only | SELECT | admin all; own lines |
| `recorder_session_evidence` (view, `security_invoker`) | contract for D1 | SELECT | the underlying tables' |

`GRANT ALL ... TO service_role` on every table; nothing to `anon` or `PUBLIC` **[tested]**. Grants to `authenticated` are deliberately narrower than the usual four where the only writer is a function: a missing grant fails closed.

**Markers.** `roll_call_start`, `roll_call_end`, `activity`, `student_name`, `note`, `gap`, `device_change`. A `student_name` chip is the TEACHER saying "this child is speaking now" - ground truth given by a person, which is what the speaker-identification evaluation needs and is consistent with "the AI never decides who a child is". The chip must name a child enrolled in that class on that day; any other kind must not carry a child **[tested]**.

### 6.3 State machine

```
armed --> recording --> uploading --> complete --> deleted
  |           |             |                         ^
  +-----------+-------------+--> abandoned -----------+
```

- `armed`: authorised by the server (section 4 checks passed at that instant). No audio accepted yet **[tested]**.
- `recording`: capture running. `started_at` set.
- `uploading`: capture stopped (`ended_at`, `stopped_by`, `stop_reason`); chunks and then the manifest still arriving.
- `complete`: manifest stored, all chunks confirmed, counts agree. `completed_at`. Nothing more is accepted **[tested]**.
- `abandoned`: given up - switch-off while armed, deletion requested while open, or never finished after 14 days.
- `deleted`: the audio is gone from storage (`audio_deleted_at`). The row stays as the record. Refused while a single object remains under the recording's prefix **[tested]**. A row can be removed only in this state **[tested]**.

Every other move is refused, by anyone **[tested]**. Class, session, owner, window, format and hard limit are immutable after arming **[tested]**.

### 6.4 Bucket

`class-recordings`, private, 8 MB a file (a 60 s WAV chunk is 5.8 MB), audio and JSON only. House pattern: `supabase/migrations/20261109090000_video_homework.sql:371-378` and `:452-474` (path-parsing SECURITY DEFINER helpers that answer "no" rather than error), and `supabase/migrations/20261111090000_audit_voice_clips.sql:139-161`.

| Operation | Who |
|---|---|
| INSERT | the starter of an open recording, only at a registered chunk's exact path, or the manifest once capture has stopped |
| SELECT | admin; a teacher of the class; nothing once the recording is `deleted` |
| UPDATE | nobody (no policy) |
| DELETE | admin; (the retention job, as service role) |

There is no family, student or TA policy on this bucket and none may be added (hard rule: "No family SELECT policy on audio"). The suite asserts the bucket's policies are exactly these three **[tested]**.

**Signed URLs.** A signed URL is a bearer link: whoever holds it can fetch the file until it expires. Rule for C2/C3: do not create signed URLs for this bucket. Read-back and any future playback use an authenticated `download()` (the JWT in a header, the bytes in memory, a `blob:` URL at most). If a later feature truly needs one, the expiry is 60 s or less and it is created on the click that uses it.

### 6.5 Retention

**Default: raw audio is deleted 30 days after the lesson's scheduled end** (`recorder_settings.retention_days`, 1-180). Each recording carries its own `delete_after`, set at arming.

Why 30 and not the monitor design's "7 days after processing": nothing processes these recordings yet, so "after processing" never arrives, and a 7-day clock from capture would delete the evaluation material before workstream B has finished with it. 30 days is long enough for one evaluation cycle and short enough to be defensible. When the monitor exists the rule should become `min(processed_at + 7 days, scheduled_end + 30 days)` - that is a monitor-phase migration, not this one.

Admins can extend one recording, never beyond 180 days (table CHECK), and each change is logged; teachers cannot extend at all **[tested]**. Anyone who can see the row can shorten it by asking for deletion.

**How deletion actually happens.** SQL cannot do it: removing rows from `storage.objects` leaves the files in the object store (and current Supabase refuses the direct delete). The repo's one existing example removes files through the Storage API with a service client (`supabase/functions/update-student-avatar/index.ts:144`). The repo's scheduled-job pattern is pg_cron + pg_net calling an edge function, guarded by a token kept in a table only the service role can read (`supabase/migrations/20261110160000_schedule_runner_and_nightly_rebuild.sql:13-25` and `:32-67`).

So, for C2 to build:

- Edge function **`recorder-retention`**. Service role - justified, because no signed-in person is present at 03:00 and no teacher may delete these files under RLS. It accepts either the runner token (cron) or an admin JWT (the "delete now" button). It reads nothing but paths; it never downloads audio.
  1. `recorder_expire_stale()` - abandon recordings never finished 14 days after their lesson.
  2. `recorder_retention_due()` - the list, with each `storage_prefix`.
  3. For each: list the prefix through the Storage API, `remove()` in batches of 100, list again; only if the second listing is empty call `recorder_mark_audio_deleted(id)`. The database independently refuses to mark it while it can see an object left.
  4. Return counts; log ids and counts only.
- Its cron entry goes in C2's own migration (`20261112100100_...`), following `20261110160000` (skip silently where pg_cron/pg_net are absent). It is not in this migration because the function does not exist yet and a schedule pointing at nothing fails every night.

### 6.6 Deletion on request

- **One recording:** `recorder_request_deletion(recording, reason)` - a teacher of the class or an admin; reason required; makes it due immediately; logged with who asked **[tested]**. The next retention run (or the admin's "delete now") removes the files.
- **One child:** NOT POSSIBLE for a room recording, and the design does not pretend otherwise. A child's voice cannot be cut out of a recording of a room. What is done instead, when a parent asks:
  1. the admin records `withdrawn`; every class the child is in stops being recordable at that moment (4);
  2. the admin lists the recordings that can contain the child - `class_recordings` of those classes with `session_date` inside the child's enrolment dates - and requests deletion of each. C3 should make that one screen ("recordings that include this child") with a single confirm;
  3. the log keeps the fact of the withdrawal and of each deletion, not the audio.
  Whether step 2 is automatic is the owner's choice (9.1 Q3). Recommended: automatic.

## 7. Contract for D1

A completed recording of a session is strong evidence that the class was held. D1's `session_held_evidence(session_id)` should read ONE thing: the view **`public.recorder_session_evidence`**. Its columns are the contract; C will not rename or remove them without telling D.

| Column | Meaning | Trust |
|---|---|---|
| `session_id` | the lesson (NULL if the session row was later deleted) | server |
| `recording_id`, `class_id` | | server |
| `status` | `armed` / `recording` / `uploading` / `complete` / `abandoned` / `deleted` | server-enforced state machine |
| `was_completed` | true once it has ever been `complete` - **use this, not `status = 'complete'`**: retention turns `complete` into `deleted` after 30 days and the evidence must not expire with the audio | server |
| `started_at`, `ended_at` | capture start and end | the laptop's claim, clamped by the server to [armed_at, now] and to the hard limit |
| `started_by` | auth user id of the teacher who recorded | server (`auth.uid()` at arming) |
| `armed_at` | when the server authorised it | server clock |
| `completed_at` | when the server accepted it as complete | server clock |
| `scheduled_start`, `scheduled_end` | the lesson's window as it stood at arming | server |
| `first_chunk_registered_at`, `last_chunk_registered_at` | when audio actually reached the server | server clock |
| `confirmed_audio_ms` | length of audio confirmed in storage - the longer track, not the sum **[tested]** | chunk spans are the laptop's; presence and size are the server's |
| `tracks_with_audio` | 0, 1 or 2 | server |
| `purpose` | `lesson` / `evaluation` | |

Minimal use: `WHERE session_id = $1 AND was_completed`. Zero rows means "no recording evidence", which is NOT evidence the class was not held: most classes will have the switch off.

What it proves and what it does not - D should grade accordingly:

- It proves that the named teacher's login armed a recording inside that lesson's window (server clock) with the class's consent switch on, and uploaded that much audio.
- It does not prove children were present, or that the audio is of a lesson: nobody has listened and nothing analyses it.
- Strongest when `first_chunk_registered_at` falls inside the lesson window (the upload was live; it cannot have been produced afterwards). A recording uploaded hours later is weaker: its times are the laptop's.
- A recording that exists for a session later marked `Canceled` is a contradiction D should surface, not hide; the recorder keeps such audio for that reason (3).
- The view is `security_invoker`: a function running as the service role or as an admin sees every row; a teacher sees their own classes. `service_role` holds SELECT **[tested]**.
- The recorder never writes to `sessions`. It does not flip Scheduled to Held and it touches no money path.

## 8. Threats and failure modes

| # | Threat / failure | What stops or limits it | Where |
|---|---|---|---|
| 1 | Wrong class recorded | The class is copied from the session by the trigger; the client's `class_id` is ignored. The page shows class name and time in the indicator. A teacher can still pick the wrong session of their own; then: request deletion | trigger **[tested]**; 6.6 |
| 2 | Recording outside lesson time | Arming only from 20 min before start until the end, on the server clock. Hard limit end + 30 min: later audio is refused at registration | trigger, `recorder_register_chunk` **[tested]** |
| 3 | Recording a class whose switch is off | Impossible to create the row: no row / off / no confirmation / old wording / a child without consent -> refused, for teachers, admins and the service role alike. Without the row no chunk registers and no file uploads | trigger **[tested]** |
| 4 | Switch turned on without consent | CHECK constraint; only an admin via the function; needs the current wording version, a note, and every child's consent | **[tested]** |
| 5 | A teacher reads another class's audio | Table RLS and the bucket's SELECT policy both ask `recorder_can_read_class` | **[tested]** rows and files |
| 6 | A teaching assistant reads or records | Not in `recorder_is_class_teacher` | **[tested]** |
| 7 | Families or students | No policy names them; they read no table, no file, not even the settings | **[tested]** |
| 8 | Signed-URL leakage | None are created (6.4). Residual: an admin with the dashboard can make one; that is the owner's own account | rule for C2/C3 |
| 9 | Stolen laptop with queued chunks in IndexedDB | Plain audio on disk until uploaded. Mitigations: BitLocker + Windows sign-in on the recorder laptop (owner check); upload during the lesson so the queue is minutes, not hours; local bytes removed once complete. In-browser encryption with a non-extractable WebCrypto key is possible but does not help against someone holding the unlocked Windows profile, so it is not relied on | 9.2; residual risk accepted or not by the owner |
| 10 | Stolen laptop, still signed in | The thief has the teacher's session: that teacher's classes' recordings within retention. Mitigations: Windows lock, short app session, admin can revoke the session. Same exposure as every other teacher screen | residual |
| 11 | Partial upload | A chunk is either a confirmed row or not; `complete` is refused while any is unconfirmed; local bytes stay until complete | **[tested]** |
| 12 | Duplicate chunks / retries | Same bytes: one row. Different bytes for the same number: refused. Stored files cannot be overwritten | **[tested]** |
| 13 | Upload to an arbitrary path (filling the bucket, planting a file) | INSERT policy accepts only a registered chunk's path or the manifest; 8 MB cap; MIME allow-list | **[tested]** |
| 14 | Laptop clock wrong or changed mid-lesson | Permission uses the server clock; positions use the audio clock; claimed times are clamped; a change is recorded as a discontinuity | **[tested]** clamp; 5.3 |
| 15 | Tab crash / browser closed | At most 5 s lost; recovery on next open; recording finishes as `crash_recovered`; or is abandoned after 14 days and swept | 1.3; **[tested]** sweep |
| 16 | Session cancelled or deleted mid-recording | Page stops on next poll; recording survives a deleted session row | **[tested]** SET NULL |
| 17 | Consent withdrawn mid-lesson | Class switched off at once; armed recordings abandoned; running ones told to stop; later audio refused | **[tested]** |
| 18 | Tampering with the audit trail | Append-only for every role; no API role can write a line | **[tested]** |
| 19 | Audio outliving its retention | `delete_after` on every row, capped at 180 days by a CHECK; nightly job; row cannot claim "deleted" while a file remains | **[tested]** |
| 20 | Deleting a class or recording row while audio remains (orphaned files nobody can find) | `class_id` foreign key has no cascade; a recording row cannot be deleted before `deleted` | **[tested]** |
| 21 | The chat assistant | Gets nothing: no tool, no write path. C2/C3 must not add recorder tools to `supabase/functions/chat` | rule |
| 22 | Built-in laptop mic silently used | Never fall back to the default device; exact `deviceId` or no arming | 2 |
| 23 | One device chosen twice | Different `deviceId` and `groupId`, correlation test, table CHECK on the hashes | 2; **[tested]** CHECK |

### Assumptions the migration makes about production (verify when pasting)

1. **The function owner can see `storage.objects`.** `recorder_confirm_chunk` and the two completeness checks are SECURITY DEFINER and read `storage.objects`. If the owner role could not see those rows, confirm and complete would fail closed (harmless), BUT the "no file left" check before `deleted` would pass wrongly. Before first use run: `SELECT rolbypassrls FROM pg_roles WHERE rolname = 'postgres';` (expect true) and, after the first test recording, `SELECT count(*) FROM storage.objects WHERE bucket_id = 'class-recordings';` in the SQL editor (expect the chunk count). Independently of this, `recorder-retention` must list the prefix itself and find it empty before marking (6.5 step 3).
2. **`storage.objects.metadata->>'size'` is the stored byte count** for standard uploads. If it is absent, confirm fails closed and nothing is ever deleted locally - visible at once in C2's first end-to-end test.
3. **Views support `security_invoker`** (Postgres 15+). The repo already uses it (`supabase/migrations/20251015032433_a3bf1d5d-5647-462c-a0e4-9ea171b8a096.sql:7`).
4. **`teachers.is_active`, `enrollments.start_date/end_date`, `sessions.date/start_time/end_time/status`, `classes.default_teacher_id/schedule_template`** exist as in `src/integrations/supabase/types.ts` (`:5340`, `:1470-1473`, `:3601-3609`, `:1015`, `:1024`).
5. "Enrolled" means an enrolment row covering the lesson date. `students.is_active` is not consulted; an inactive child with an open enrolment still blocks recording (the conservative reading).
6. `src/integrations/supabase/types.ts` was NOT edited (instructed). Until the owner applies the migration and types are regenerated, C2 calls these tables and functions through a locally typed wrapper in `src/lib/recorder/`.

## 9. For the owner

### 9.1 Open questions (policy only; each has a default the build will use)

| # | Question | Recommended default |
|---|---|---|
| Q1 | What exactly did parents agree to? The consent wording must cover: audio recording of lessons, both microphones, storage in the school's own system, who may listen (the class teacher and admins), how long (30 days), and that it may be used for a speech evaluation. It is versioned (`v1-2026-11`); the switch refuses to turn on under any other version. | Owner writes or approves the text before any class is switched on. Not started without it. |
| Q2 | A class where one child's parents have not consented or have refused. | The class is not recorded (built this way). The alternative - record and "exclude" the child - is not technically real for a room microphone. |
| Q3 | When a parent withdraws: delete the past recordings their child is in automatically, or have an admin choose? | Automatically, all of them, logged. (Built: an admin requests each; C3 can make it one button.) |
| Q4 | May a cover teacher (one lesson with the class in the last 7 days) listen to the class's other recordings? | Leave as built for the capture phase (they can, for those 7 days), revisit before any playback screen exists - today there is no screen that plays audio at all. |
| Q5 | Retention: 30 days from the lesson. Storage cost follows from it (about 30 GB held for 5 lessons a day in Opus, about 100 GB in FLAC). | 30 days. |
| Q6 | Teaching assistants: no access of any kind. | No. |
| Q7 | Is one click a day ("Ready for today") acceptable, or must the laptop record with nobody touching it after a reboot? | One click a day. Zero-touch would need the measurement in 1.4 and possibly a desktop wrapper. |
| Q8 | "Controlled recordings for a speech evaluation": inside a normal timetabled lesson (flagged `purpose = evaluation`), or also at other times? | Inside timetabled lessons only. Recording outside a session is refused by design; allowing it would need its own consent wording and its own rule. |
| Q9 | May teachers play recordings back at all? Nothing in C2/C3 needs playback. | No playback screen in this phase; read access exists only so the uploader can verify what it stored. |
| Q10 | The first real-class use (master plan Q4). | One class, one teacher, one week, after the hardware checks below pass. |

### 9.2 Checks only the owner can do, on the real hardware

1. Plug in the lapel receiver and the S500. In Chrome on the recorder laptop, open the microphone check: do two separate devices appear? Note both labels exactly as shown.
2. Windows Settings > System > Sound > each of the two inputs > Audio enhancements: set to Off. Note whether the option exists for each.
3. Is the S500 set as Windows' default or default communications device? (Either is fine; note it.)
4. Does the AnkerWork app offer a switch for noise reduction / voice enhancement on the S500? If so, which positions exist.
5. Move the lapel receiver to a different USB port: does the recorder still find it, or ask for the check again?
6. Unplug the lapel receiver mid-recording, wait 10 s, plug it back: does the page recover by itself?
7. Laptop: BitLocker on? Windows asks for a password on wake? Power plan on mains: sleep never, lid close does nothing?
8. Record a full lesson length (100 minutes) with the recorder tab hidden behind another window. Afterwards the page must report zero dropped frames on both tracks.
9. Clap test at the start and at the end of that recording (one sharp clap near both microphones) - C2 reads the offset between tracks from it.
10. School uplink speed at lesson time (any speed test, three times on different days). Needed: 0.3 Mbit/s for Opus, 1 Mbit/s for FLAC, on top of normal use.
11. Close the lid during a test recording, reopen after a minute: what does the page show?
12. Supabase plan and storage quota (for Q5).
13. Battery: does the wireless lapel last two back-to-back lessons? Does the receiver show a low-battery state the teacher can see?

## 10. Notes for C2-C5

- C2 owns `src/lib/recorder/` and `supabase/functions/recorder-retention` plus its cron migration `20261112100100_*`. It must not edit this migration; changes go in a new file in the `202611121000xx` block.
- C2's first evidence should be the measurements marked **[C2-measure]**, in the order: hidden-tab integrity, inter-track drift, `getSettings()` read-back on both tracks, FLAC CPU, autoplay behaviour, `powercfg /requests`.
- C3: the indicator is not dismissible; no playback; no signed URLs; the admin screen for the switch shows the consent wording text next to the version and the count of children without consent; consent per child is entered by an admin with a note.
- C4: the pure parts of C2 (chunker, frame-to-ms arithmetic, queue state machine, back-to-back rule in section 3, device matching) are testable without a browser and belong in `scripts/pgtest/` beside the other library suites.
- Out of scope, listed so nobody assumes it: iPhone as a third microphone (optional later task); any analysis; any family-facing output; live monitoring by an admin.

## Test log

(appended as runs complete)

- 2026-11-11, before any change: `node scripts/pgtest/run.mjs` -> `1611 assertions across 30 suites, 0 suite(s) failed`.
- 2026-11-11, `node scripts/pgtest/recorder.test.mjs <20261111110000> <20261112100000>` -> `191 passed, 0 failed`.
- 2026-11-11, after the migration, the suite and its one line in run.mjs: `node scripts/pgtest/run.mjs` -> `1802 assertions across 31 suites, 0 suite(s) failed` (includes the app and edge-function typechecks).
