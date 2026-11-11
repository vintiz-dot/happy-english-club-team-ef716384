# B0 - evaluation harness and scorer (evidence)

Task B0 of `docs/MASTER_PLAN.md`. Tooling only; no model comparison (that is B1/B2), no vendor API called.
Aggregates and codes (S01...) only in this file: no transcript text, no names. `key.txt` / `consent.txt` were never opened.
Appended as the work went; each section says what was run and what it printed.

## 1. What exists

`scripts/lesson-eval/` (see its README.md for the exact command sequence):

| File | Purpose |
|---|---|
| `common.py` | paths (`HEC_EVAL_ROOT`, default `C:\Users\Dell\hec-audio-eval`), `safe_out()` refuses (exit 3) any output inside a git repo, `iter_media()` drops key.txt/consent.txt by name before touching anything |
| `extract.py` | ffmpeg -> 16 kHz mono s16 WAV, SHA-256 de-dup, `manifest.csv` + `duplicates.csv`; same layout as `work\make_wav16k.sh` |
| `confirm_pairs.py` | envelope + windowed normalised cross-correlation, waveform lag refinement, drift fit, verdict per pair |
| `split.py` | VAD speech seconds per child, low-F0 "other voice" flag, seeded ENROL / HELD-OUT split |
| `mix.py` | synthetic multi-child discussions with controlled overlap + optional S500-like degradation, RTTM + turn labels |
| `score.py` | WER/CER (strict normaliser, per-language), DER, identification-by-threshold, learner-error tally, schema validate / to-rttm |
| `result_schema.json` | common result schema `hec-lesson-eval/1` for every B1/B2 system |
| `hardware.py` | hardware/software record for B2b |
| `delete_voiceprints.py`, `delete_all_derived.py` | one-command deletion of enrolment artefacts / everything under `work\` |
| `tests/` | pytest unit tests on synthetic text/RTTM/CSV fixtures (no audio, no children's data) |

## 2. Inputs and extraction (run 2026-11-11)

Haiku's `work\make_wav16k.sh` had already written the WAVs. Verified rather than re-extracted:

`.venv\Scripts\python scripts\lesson-eval\extract.py --verify` -> `ALL CHECKS PASSED` (every WAV pcm_s16le / 16000 Hz / 1 ch, duration within 0.5 s of its source), 38 s.

- 63 media files found, 28 exact SHA-256 duplicates skipped, 35 unique WAVs.
- lessons: 5 WAVs, 536.2 min. videos: 30 WAVs, 69.2 min, 27 codes.
- Duplicates: `videos\S21_clip2.mp4` == `videos\S21_clip1.mp4` (confirmed by SHA-256, as the owner said). `videos\videos\videos\` is a second copy of the whole set: 27 of its 31 files are byte-identical to the top-level clips.
- **Why videos\ has 30 WAVs, not 26:** the nested folder `videos\videos\videos\` holds four clips that exist nowhere else: `S26_clip2..S26_clip5` (no S26_clip1). 26 top-level unique clips (S01-S25, S30) + 4 S26 clips = 30. So the eval set is **27 children** (S01-S26, S30), not 26. Owner to confirm S26 is a child of the same coding scheme (the nested folder has its own key.txt, not read; every nested S01-S30 file is byte-identical to the top-level one, which suggests the same codes).
- `make_wav16k.sh`'s `check_results.txt` reports "CHECK FAIL (format pcm_s16le 16000 1)" for every file: a false failure (the values it prints are the correct ones; the comparison most likely trips on a CRLF from ffprobe on Windows). `extract.py --verify` re-checked all 35 and they pass. Its manifest was kept as `work\wav16k\manifest.make_wav16k.csv`; `manifest.csv` is now the same ten columns plus `code,clip,source_codec`.

## 3. Which lesson files are the same recording (run 2026-11-11)

`.venv\Scripts\python scripts\lesson-eval\confirm_pairs.py --windows 24` (24 x 60 s windows of A, each searched over all of B on a 100 Hz log-energy envelope; matched windows refined on the 16 kHz waveform; ~3 min for all 20 ordered pairs, envelopes ~3 MB each). Output `work\pairs\confirm_pairs.json`.

First run used a peak-to-sidelobe threshold of 3 and rejected true matches (NCC 1.000 with PSR 2.5-3.5): unrelated speech envelopes correlate up to 0.39 everywhere, so the sidelobe floor is ~0.3. Threshold changed to PSR >= 1.5 with NCC >= 0.6 (negative controls never exceed 0.39) and re-run; results below are the re-run.

| A | B | verdict | windows matched | envelope NCC | waveform NCC | lag (s) | drift over file | matched span of A |
|---|---|---|---|---|---|---|---|---|
| Recording | outp1ut_compressed | SAME | 24/24 | 1.000 | 0.997 | 0.000 | 0.0 ms (fit residual 0.0 ms) | 0-5213 s (whole) |
| Untitled | output_compressed | SAME | 24/24 | 1.000 | 0.997 | 0.000 | 0.0 ms | 0-8337 s (whole) |
| Recording | Untitled | A_CONTAINED_IN_B | 24/24 | 1.000 | 1.000 | 0.000 | 0.0 ms | whole of Recording = first 5213 s of Untitled |
| outp1ut_compressed | output_compressed | A_CONTAINED_IN_B | 24/24 | 1.000 | 1.000 | 0.000 | 0.0 ms | whole = first 5213 s |
| Untitled / output_compressed | Recording / outp1ut_compressed | PARTIAL | 15/24 | 1.000 | 0.997-1.000 | 0.000 | 0.0 ms | 0-~5100 s (last window start before 5213 s) |
| je,ch,sa,po | any other | DIFFERENT | 0/24 | max 0.373 | - | - | - | - |
| any other | je,ch,sa,po | DIFFERENT | 0/24 | max 0.391 | - | - | - | - |

Verdicts:
- **Recording.mp3 and outp1ut_compressed.mp3 are the same recording** (confirmed; lag 0, no drift, waveform NCC 0.997 - the compressed file is a re-encode).
- **Untitled.mp3 and output_compressed.mp3 are the same recording** (confirmed; lag 0, no drift).
- **New finding: Recording.mp3 is the first 86.9 minutes of Untitled.mp3** (sample-aligned at lag 0, waveform NCC 1.000 between the two 48 kHz files). The owner's "87 min" and "139 min" lessons are NOT two lessons: there is one 139-minute recording, of which Recording/outp1ut_compressed is a prefix cut.
- **je,ch,sa,po.mp3 is a different recording** from all the others (negative controls: max NCC 0.37-0.39, no window passes).
- So the five lesson files hold **two distinct recordings, about 223.5 min of unique audio** (Untitled 139.0 min + je,ch,sa,po 84.5 min). Use the 48 kHz originals (Untitled, and je,ch,sa,po which only exists at 16 kHz) for B1/B2; the compressed copies are the 32 kbps comparison condition. Scoring Recording and Untitled separately would double-count its first 87 minutes.
