# C2 review 3 - third review of the capture engine (round 3) and the C3 screens

Reviewed commit: bb70791 (`worktree-agent-a4803c8e10a251526`), against d449acc (what review 2 failed) and `claude/hec-conductor-setup-efbaa5`.
Code read and run in the separate detached worktree `.claude/worktrees/c2r2` (moved to bb70791); this file is committed on `claude/hec-conductor-setup-efbaa5`. The conductor's worktree was not detached.
Review only: no product code changed, nothing deployed, pushed or applied to any database.

**Where I am / next step:** sections 3 and 6 written. Next: sections 1-2 (probes running), 4 (mutants running), 5, 7, verdict.

A correction to review 2 first. I wrote there that no real audio was read. That was wrong for the unit suite itself: at d449acc `scripts/recorder/unit.test.mjs:191` read one minute of a real lesson WAV in place, unconditionally, for a FLAC ratio check, and I ran that suite eight times (once, six mutants, one control). Nothing was copied, stored or committed, and my own probes were synthetic, but the statement was not true and I did not check it. In this review every run has `RECORDER_REAL_AUDIO` unset.

File:line is at bb70791; `controller.ts` etc. are under `src/lib/recorder/`.

## 3. The migration (`supabase/migrations/20261112100000_class_recorder.sql`, 52 changed lines, still unapplied)

The cron migration `20261112101000` did not change (`git diff d449acc bb70791` on it is empty).

Line by line:
- **:702 column** `pre_start_ms bigint NOT NULL DEFAULT 0 CHECK (>= 0)`. **:918** the insert trigger forces 0 whatever the client sends.
- **:1009-1017 update trigger.** A change is accepted only when ALL hold: it was 0 (stated once); `OLD.started_at` is set and the status is `recording` / `uploading` (not while armed, not in the same UPDATE as the Start, not after complete / abandoned); the value is `>= 0` and `<= LEAST(30 min, started_at - capture_opens_at)`; no chunk row exists yet. The check sits before the "server-owned fields" block and is not skipped for an admin or the service role. `started_at`, `ended_at`, the window and `started_by` remain server-owned (:1020 on, :971-990 unchanged).
- **:1200 complete**: the "no track is longer than the server saw" span becomes `ended_at - started_at + pre_start_ms`.
- **:1523 register**: `v_origin = started_at - pre_start_ms`; the stop-request, ahead-of-clock, after-Stop, after-window and `late` tests all measure from it (:1543, :1557, :1562, :1565, :1597). Ownership and `recorder__may_record` checks above it are untouched.
- **:1895-1908 evidence view**: the lesson's span on the chunk timeline is shifted by `pre_start_ms` and its start is `GREATEST(pre_start_ms, ...)`; a chunk is `live` only if `t_start_ms >= pre_start_ms`, not below the floor, and registered AND confirmed within `late_after` of its claimed end. `verified_audio_ms` is still `LEAST(live_ms, server_capture_ms, live_bytes / floor)` with `server_capture_ms = ended_at - started_at` (:1859) - the pre-start span is NOT added to that cap.
- **:2066** column grant adds `pre_start_ms`. Policies: no change (the diff touches none); `class_recordings_update` still needs `started_by = auth.uid()` or admin.

**Can a client inflate `pre_start_ms` to fake evidence?** No. Worked through: stating a larger value moves the origin EARLIER. A chunk counts only if it starts at or after `pre_start_ms` on that timeline (= at or after the server's own `started_at`), was registered within `late_after` of the moment it claims to end, and that moment cannot be more than `clock_tolerance` ahead of the server's clock (:1557). Those three are exactly the pre-round-3 rules in shifted coordinates, so the set of wall-clock instants that can become evidence is unchanged: `[started_at, ended_at]`, capped again by `server_capture_ms`. Stating a SMALLER value than the truth gets the page's own chunks refused as "ahead of the server's clock". Changing it after the fact is refused (once; never after a chunk).

**Can it back-date a recording?** `started_at` cannot move. What a client CAN now do, and could not before: claim that up to `min(30 min, time since the window opened)` of audio was captured before the server saw anything, and upload any bytes for it. That audio is stored and listenable, never evidence, and the row says so (`pre_start_ms > 0`). So a late-armed recording can carry an unverifiable first part. This is the price of the N-B1 rule (keep what the laptop captured while offline) and I think it is the right trade; whatever reads these recordings later (review screens, transcription, D1) must treat `t < pre_start_ms` as "the laptop's claim, not seen by the server" - `recorder_session_evidence` does not expose `pre_start_ms`, and it should.

**Findings**
- **R3-1 (MUST FIX, one line + parity): the 30-minute cap is unknown to the client and to the test fake.** :1012 refuses `pre_start_ms > 1800000`. The engine clamps only to `started_at - capture_opens_at` (`controller.ts`, `adoptServerStart`), and `scripts/recorder/fake-recorder-server.mjs` implements the bound without the 30 minutes. A Start that lands more than 30 minutes after capture began (the school's internet down from 5 minutes before the bell to 26 minutes after; or a reload followed by a late Start) makes the server refuse the statement for ever; what the engine then does is section 1, probe Q1. The window bound alone is sufficient (the origin can never precede `capture_opens_at`); either drop the `LEAST(1800000, ...)` or make the engine and the fake know it. Add the SQL case at exactly 30 min + 1 ms and the engine case at 31 minutes offline.
- **R3-2 (minor): `recorder_session_evidence` should expose `pre_start_ms`** (see above).
- **R3-3 (minor): the 9 new SQL assertions (406 -> 415) cover**: armed refused, beyond-window refused (with 365 days, which also trips the 30-min cap, so neither bound is tested on its own), stated once, stored, three pre-start chunks accepted, ahead-of-clock from the new origin, completes, "48 of 50 minutes count", refused after a chunk. **Not covered**: another teacher (not `started_by`) setting it; a value just over `started_at - capture_opens_at` with the cap not in play; the cap itself; a chunk that straddles `started_at` (it is not live - right, untested); `late` for post-start chunks after a long pre-start; the state `uploading`. The trigger reads correctly on each of these; they have no test that could fail.

## 6. No real audio, transcript or derived data in the repo

- `git log --numstat d0d18b7..bb70791`: the only binary files in the whole range are PNG screenshots under `docs/evidence/A4.6/` (the conductor branch's tuition work, merged in; not this workstream). No `.wav/.flac/.mp3/.ogg/.webm/.m4a/.opus/.pcm/.zip/.npy/.mp4` was ever added. No blob over 300 kB exists in the range. The one added fixture is `scripts/pgtest/fixtures/tuition-figures.golden.json` (tuition).
- Real-audio references left in the tests: `unit.test.mjs:191-193` (a path string; read only when `RECORDER_REAL_AUDIO=1`), comments in `harness.mjs` / `browser.test.mjs`. `harness.mjs:21` now defaults to a synthetic WAV OUTSIDE the repo (`C:/Users/Dell/hec-tools/c2r-harness/synthetic.wav`), made by `scripts/recorder/make-synthetic-wav.mjs` (read: harmonic tones + noise from a seeded generator, no input file).
- The default path of every suite is synthetic: unit (the `FakeSource` sine + noise), pgtest (SQL only), ui (no audio), browser (the synthetic WAV unless `RECORDER_WAV` names another file).
- The implementer's note is accurate: before the guard, the unit suite read the lesson file in place. So did mine in review 2 (above).
