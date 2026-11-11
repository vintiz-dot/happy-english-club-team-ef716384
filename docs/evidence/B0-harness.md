# B0 - evaluation harness and scorer (evidence)

Task B0 of `docs/MASTER_PLAN.md`. Tooling only; no model comparison (that is B1/B2), no vendor API called.
Aggregates and codes (S01...) only in this file: no transcript text, no names. `key.txt` / `consent.txt` were never opened.
Appended as the work went; each section says what was run and what it printed.

## Where I am / next steps (PAUSED 2026-11-11 for the money work)

Built and committed (all in `scripts/lesson-eval/`): common.py (repo-write refusal, key.txt/consent.txt skip), extract.py, confirm_pairs.py, split.py, mix.py, score.py + result_schema.json, hardware.py, smoke_local.py, delete_voiceprints.py, delete_all_derived.py, README.md, tests/ (26 pytest cases on synthetic fixtures).

Run, with results (details in sections 2-6):
- extract `--verify`: 35 unique WAVs pass; 28 SHA-256 duplicates (S21_clip2 + the nested `videos\videos\videos` copy); 30 video WAVs = 27 children (S26 clip2-5 only in the nested folder).
- confirm_pairs: Recording == outp1ut_compressed; Untitled == output_compressed; Recording is the first 86.9 min of Untitled; je,ch,sa,po distinct. Two unique lesson recordings (~223.5 min).
- split (X = 50 s): 15 children with held-out (13 clean + S20, S21 with heavy adult-pitch speech); S23 has no child-pitch speech; deterministic.
- mix: 0/5/15 % overlap targets met (measured 0.000 / 0.050-0.053 / 0.154-0.165), deterministic (byte-identical WAVs on re-run), ground-truth RTTM scores DER 0 against itself.
- tests: 26 passed. `--help` works on every script. Repo-path output refused with exit 3 (checked with mix.py). Deletion scripts checked with `--dry-run` only.
- Install (venv, CPU only, no CUDA): faster-whisper 1.2.1 / CTranslate2 4.9.0, torch 2.15.0+cpu, SpeechBrain 1.1.2 (ECAPA), sherpa-onnx 2.0.1 (import only). pyannote.audio not installed (gated models, token needed - not requested).
- 30 s smoke on S01_clip1: whisper-small int8 8 threads load 35.9 s, transcribe 44.9 s (RTF 1.50 - slower than real time on this i7-8665U); ECAPA load 10.8 s, 10 x 3 s embeddings in 9.8 s (RTF 0.33), dim 192, nothing saved.

Not done / next:
1. sherpa-onnx diarization models not downloaded or run; whisper base/tiny/medium RTF not measured (B2b).
2. `score.py ident` and `preserve` exercised on fixtures only; no real annotated slice exists yet (B1 needs hand references and a learner-error slice).
3. Mix turns reuse held-out segments (reuse factor up to ~4.5 per child in a 3-6 min mix): when scoring identification, count each source segment once (`src_clip,src_start` in turns.csv). Use `--exclude S20,S21` for a clean-speaker set.
4. Owner questions: S26 coding confirmation; S23 clip (adult-range pitch); S13/S20/S21 mostly adult voice.
5. Nothing merged to the conductor branch yet.

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

## 4. Speech seconds per child, other voices, ENROL / HELD-OUT split (run 2026-11-11)

`.venv\Scripts\python scripts\lesson-eval\split.py` (defaults: seed 7, silero VAD from faster-whisper 1.2.1, min-enrol 30 s, min-heldout 20 s, held-out fraction 0.4, 5 s contiguous blocks, adult-F0 flag < 200 Hz). ~2 min. Run twice with the same seed: `segments.csv` byte-identical (`cmp` -> DETERMINISTIC). Outputs `work\split\segments.csv`, `work\split\summary.csv`.

**Choice of X (speech needed for a held-out set): X = 50 s** = 30 s enrolment (a usual minimum for an ECAPA-style voiceprint) + 20 s held-out (5-10 test turns of 2-4 s). The data has a cluster at 50-60 s (S07 50.5, S17 52.7, S06 52.8, S24 53.0, S18 59.6) and a gap below to 42.8 s (S09), so X = 50 keeps that cluster; X = 60 would give 10 clean children. The split never leaves enrolment below 30 s.

Other voices: clips are NOT single-speaker. Each VAD segment gets a median F0; < 200 Hz is flagged as a probable adult (teacher/parent) and excluded from both sets. Heuristic only: it cannot catch a high-pitched adult woman or another child; B2 must re-check with embeddings.

| code | clips | usable speech s | flagged other-voice s | enrol s | held-out s | status |
|---|---|---|---|---|---|---|
| S01 | 1 | 113.7 | 0.0 | 64.5 | 49.2 | split |
| S02 | 1 | 223.8 | 3.3 | 133.9 | 89.8 | split |
| S03 | 1 | 87.4 | 0.0 | 49.2 | 38.2 | split |
| S04 | 1 | 82.0 | 19.6 | 44.7 | 37.2 | split |
| S05 | 1 | 87.0 | 0.0 | 47.8 | 39.2 | split |
| S06 | 1 | 52.8 | 0.0 | 30.1 | 22.7 | split |
| S07 | 1 | 50.5 | 0.0 | 30.1 | 20.3 | split |
| S08 | 1 | 25.8 | 0.0 | 25.8 | 0 | enrol-only (thin, < 30 s) |
| S09 | 1 | 42.8 | 0.0 | 42.8 | 0 | enrol-only |
| S10 | 1 | 67.5 | 2.3 | 38.4 | 29.1 | split |
| S11 | 1 | 76.4 | 3.7 | 37.7 | 38.7 | split |
| S12 | 1 | 37.8 | 0.0 | 37.8 | 0 | enrol-only |
| S13 | 1 | 25.5 | 398.3 | 25.5 | 0 | enrol-only (thin); clip dominated by a low (adult) voice, median F0 108 Hz |
| S14 | 1 | 66.2 | 0.0 | 37.8 | 28.4 | split |
| S15 | 1 | 69.0 | 0.0 | 39.6 | 29.4 | split |
| S16 | 1 | 28.5 | 1.7 | 28.5 | 0 | enrol-only (thin) |
| S17 | 1 | 52.7 | 0.0 | 32.4 | 20.2 | split |
| S18 | 1 | 59.6 | 0.0 | 31.0 | 28.6 | split |
| S19 | 1 | 24.9 | 0.0 | 24.9 | 0 | enrol-only (thin) |
| S20 | 1 | 72.6 | 159.5 | 39.9 | 32.7 | split, other voice > 25 % - verify |
| S21 | 1 | 117.7 | 252.7 | 64.7 | 53.1 | split, other voice > 25 % - verify |
| S22 | 1 | 21.8 | 0.0 | 21.8 | 0 | enrol-only (thin) |
| S23 | 1 | 0.0 | 58.7 | 0 | 0 | unusable as is: ALL speech has adult-range pitch (median 134 Hz) |
| S24 | 1 | 53.0 | 0.3 | 32.3 | 20.6 | split |
| S25 | 1 | 20.9 | 0.0 | 20.9 | 0 | enrol-only (thin) |
| S26 | 4 | 37.6 | 0.0 | 37.6 | 0 | enrol-only |
| S30 | 1 | 133.8 | 0.0 | 75.2 | 58.6 | split |

Result: **15 children qualify for a held-out set** (S01-S07, S10, S11, S14, S15, S17, S18, S24, S30 = 13 clean, plus S20 and S21 whose clips carry a lot of adult-pitch speech, so their "child" share rests on the F0 heuristic). 12 are enrol-only (S08, S09, S12, S13, S16, S19, S22, S25, S26; S23 has no child-pitch speech at all).
Owner questions: (a) is S23's clip really the child (a 134 Hz median is adult/teen range)? (b) S13, S20, S21 (the long > 8 min clips) are mostly an adult voice - expected (lesson recordings with a teacher) or wrong clips?

First run (8 s blocks, no enrolment floor) let held-out eat into enrolment (S24 enrol 20 s); fixed with the 30 s floor, 5 s blocks and up to 100 seeded deals per child.
