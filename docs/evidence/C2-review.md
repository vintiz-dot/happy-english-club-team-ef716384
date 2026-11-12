VERDICT: INCOMPLETE

# C2 review - capture core

Where I am / next step: engine, FLAC encoder, retention function and the SQL contract read; baseline unit suite run (195/0, ffmpeg check ran); five probes executed. Next: Stop-failure and quota probes, FLAC against ffmpeg on more inputs, mutation run, retention test, write-up.

Reviewed at `05c5184` (claude/hec-conductor-setup-efbaa5). Probes lived in `.probe/` in this worktree (removed at the end); they reuse the unit test's own harness (`world`, `FakeSource`, `recorder`, the contract-enforcing fake server).

## Findings confirmed so far (by execution)

- **P4 dead audio context is silent.** Capture started, 25 s played, then no batch and no audio tick for 10 minutes while `tick()` ran every second: `state = recording`, 0 new errors, 0 new health events. Nothing in `controller.ts` `tick()` (415-445) looks at the time of the last audio tick, and `audioGraph.ts` has no `statechange` listener.
- **P5 a forward jump of the laptop clock ends the lesson.** Laptop clock +3 h, server clock unchanged, 30 s into a 90-minute lesson: next `tick()` -> `endCapture("scheduled_end")` -> server `complete`, no error event. `serverNow()` (controller.ts:131) is `Date.now() + offset`, and the offset is re-measured only after the decision (420 vs 428).
- **P1 a start request in flight longer than one chunk drops the first chunks without a word.** Start held for 25 s (chunk = 10 s): chunks 0 and 1 never stored (`onRawChunk` returns at controller.ts:592, `onSegment` at 585), server rows are seq 2,3,4, the last two chunks are refused `after_stop` (t0 is the SEND time, `started_at` the ARRIVAL time, so the whole timeline sits 25 s ahead of the server), recording stuck in `uploading`.
- **P2 another teacher on the same browser.** B's `recover()` picks up A's unfinished recording (the store is not keyed by user; `userId` is never read in controller.ts). B uploads nothing (server: `Not your recording`), but B's failed Stop writes `stopRefused` into A's local record; when A comes back all chunks are confirmed and the Stop is never sent again: server row stays `recording`, no error shown to A.
- **P8 after `complete`** the audio bytes are gone but the recording row, chunk rows, manifest and marker labels (free text, may be a child's name) stay in IndexedDB for good; nothing purges them.
