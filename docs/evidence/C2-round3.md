# C2 round 3 - after C2 review 2 (FAIL: N-B1..N-B3, N-M1..N-M9) and the C3 change list

**Where I am / next step:** all fixes and tests written and committed; running: unit suite, app typecheck. Then: mutation run of the reviewer's six + new ones, browser suite, full pgtest, totals.

Branch `worktree-agent-a4803c8e10a251526`; merged `claude/hec-conductor-setup-efbaa5` (review 2, C3 screens) at 5999dde. Synthetic audio only in every test. Nothing applied, deployed or pushed.

## Decisions

- **N-B1 rule, as the conductor set it:** no captured audio is ever discarded; t = 0 is the first captured sample; the server's start is recorded as an offset. Built as: the chunker's t0 is set when capture begins (before the Start is even sent), every chunk and 5-s segment goes to IndexedDB at once; when the server answers, `pre_start_ms = server stamp - first sample` (server time, never before `capture_opens_at`) is stated to the server once, before any chunk. This needed a SERVER change (the migration is still never applied, edited in place): `class_recordings.pre_start_ms` (stated once by the recorder, while open, before any chunk, bounded by the window - trigger), `recorder_register_chunk` and the completeness check measure from `started_at - pre_start_ms`, and the evidence view never counts audio before `started_at` (a chunk that starts before it is never live; the lesson's start on the timeline is at least `pre_start_ms`). So pre-start audio is stored and listenable, never evidence. A capture stopped before any answer (a whole lesson offline) keeps everything locally; when the network comes back the engine starts and stops the recording late if the server still accepts it, else says plainly "never started; N s kept on this laptop, cannot be sent".
- `starting` is titled "◌ WAITING FOR THE SERVER", never "● RECORDING"; its messages now say what is true ("the audio IS being saved on this laptop and will be sent once it does").
- **N-M2:** a stall's gap is filled with silence (both tracks, at most 30 min) so the timeline stays on the server's clock and later chunks are not "late"; the silence is stored below the byte floor (never evidence) and the manifest's `context_stall` carries `padded_ms`.

## API changes for C3 (additive)

`Discontinuity.kind` adds `pre_start` (and `padded_ms?`); `LocalRecording` adds `firstSampleServer?`, `preStartMs?`, `preStartAcked?`; `ServerRecording` adds `pre_start_ms?`, `started_by?`; `RecorderBackend.setPreStart?`; `RecorderStore.deleteManifest?`; options `reopenTimeoutMs`, `clockMaxRttMs`, `encodeTimeoutMs`; `workerEncoder(make, onFallback, { jobTimeoutMs })`; `HealthMonitor.reset()`. Markers can be added from the first captured sample (before the server answers). The C3 screens were changed here (see below).
