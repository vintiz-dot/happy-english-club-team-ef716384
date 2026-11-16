# B2b - CPU-only performance of the monitor's speech pieces (evidence)

Task B2b of `docs/MASTER_PLAN.md`. Local only: no vendor called, no token used or looked for. Aggregates and codes (S01..., L1/L2/L3) only; no transcript text, no audio, no lesson file names. All audio and derived data stay under `C:\Users\Dell\hec-audio-eval\` (work files in `work\b2b\`, written through `safe_out()`).

**Where I am / next step:** 2026-11-16, settings chosen (section 3). Running (background, one at a time): medium and large-v3-turbo on the select set, then diarization and identification timings. Then the end-to-end piece and the write-up.

## 0. READ FIRST: every timing in this file was taken UNDER LOAD

The conductor reported (2026-11-16) about eight other agents running on this laptop. Measured at the start: machine CPU 100 %, other processes 92 % of the machine, 1.0-4.5 GB RAM free of 15.8 GB. Every timing row carries the load measured during that run (other processes' share of the whole machine, minimum free RAM). These timings OVERSTATE the real-time factor; the quality figures do not depend on load. The final timing runs are a separate step for the conductor at a quiet time (section 7 gives the exact commands).

## 1. The laptop (from the OS, 2026-11-16)

| item | value | source |
|---|---|---|
| model | Dell Latitude 5400 | Win32_ComputerSystem |
| CPU | Intel Core i7-8665U @ 1.90 GHz, 4 cores / 8 threads, max clock 2112 MHz reported, L2 1 MB, L3 8 MB | Win32_Processor |
| RAM | 16 GB installed (1 x 16 GB, 2667 MT/s), 15.8 GB visible | Win32_PhysicalMemory, Win32_OperatingSystem |
| GPU | Intel UHD 620 only; no CUDA (B0 `hardware.py`) | |
| OS / power | Windows 11 Pro 10.0.26300, "Balanced" power plan, on AC | powercfg, Win32_Battery |
| software | Python 3.13 venv: faster-whisper 1.2.1 / CTranslate2 4.9.0, torch 2.15.0+cpu, SpeechBrain 1.1.2, sherpa-onnx 2.0.1, onnxruntime 1.31.1 | pip list |

pyannote community-1: NOT set up (pyannote.audio is not installed and no token exists in the harness); not tried, as instructed. whisper.cpp: not in the harness; faster-whisper (CTranslate2 int8) is what the harness supports, so all transcription rows are faster-whisper.

## 2. Method

- Script: `scripts/lesson-eval/b2b_bench.py` (subcommands `asr`, `diar`, `ident`, `e2e`, `score`). One configuration per process, so peak RAM is that configuration's own peak.
- Load monitor (Windows API via ctypes, no extra package): every second, the machine's CPU %, this process's CPU % and the difference (= other processes), free RAM. CPU % is a share of the WHOLE machine (8 logical CPUs = 100 %). Peak RAM = the process's peak working set and peak private (committed) memory; under memory pressure the working set can be trimmed, so the private figure is the safer one.
- RTF = wall seconds / audio seconds, model load excluded (load time reported separately).
- Transcription quality: there is still NO human reference for any audio (B1). The measure is B1's: word AGREEMENT with the vendor transcripts of the same files (difflib matching blocks over B1's normaliser, compared over the shorter duration), plus, for scale, how well the vendors agree with each other on the same files. Agreement is not accuracy.
- Diarization and identification quality: B2's measures (DER with collar 0.25 s on the synthetic mixes; identification error rates on B2's units). The local diarizer and ECAPA are exactly what B2 measured, so B2's quality figures stand and only speed and RAM are new here; DER is recomputed alongside the timing as a check.

Results follow as they are measured.

Models (faster-whisper int8, CTranslate2; downloaded once from the Hugging Face id that faster-whisper 1.2.1 itself maps each size to, into `C:\Users\Dell\hec-audio-eval\models\faster-whisper\`):

| size | Hugging Face id | on disk |
|---|---|---|
| small | Systran/faster-whisper-small (B0) | 464 MB |
| medium | Systran/faster-whisper-medium | 1530.6 MB |
| large-v3-turbo | mobiuslabsgmbh/faster-whisper-large-v3-turbo (there is no Systran build of turbo; this is the id in faster-whisper's own size table) | 1621.7 MB |

Note on the Windows venv: `.venv\Scripts\python.exe` is a launcher that starts the real interpreter as a child process; the monitor runs inside the child, so its figures are the real interpreter's.

## 3. Transcription: choosing the settings (faster-whisper small, "select" set, 15.4 min audio)

"select" set = 2 synthetic mixes (5 % and 15 % overlap, room-degraded), 6 held-out clips (S01-S06), first 180 s of L2. B1's local row used language auto-detect and the silero VAD filter; that configuration wrote far fewer words than the vendors, so the VAD and language settings are tested first.

Agreement with the B1 vendor transcripts of the same files (pooled; mean over the six vendor systems that have the file; "vendor vs vendor" = the vendors among themselves on the same files, for scale). Words ratio = local words / vendor words on the same files. UNCHECKED: agreement, not accuracy.

| config (small, int8, beam 5) | synth (2 files) agreement | synth words ratio | clips (6) agreement | clips words ratio | L2 180 s agreement | L2 words ratio |
|---|---|---|---|---|---|---|
| B1's: language auto, silero VAD 0.5 | 0.213 | 0.20 | 0.823 | 0.87 | 0.816 | 0.92 |
| English, silero VAD 0.5 | 0.131 | 0.08 | 0.823 | 0.87 | 0.816 | 0.92 |
| English, no VAD | stopped: no output after 3 000 CPU-seconds on the first 187 s mix (Whisper's repetition/fallback loop on room noise); not usable | | | | | |
| **English, silero VAD 0.25, no condition-on-previous-text** | **0.304** | **0.67** | **0.849** | **1.01** | 0.802 | 1.02 |
| vendors among themselves, same files | 0.422 (0.29-0.54) | - | 0.863 (0.81-0.91) | - | 0.818 (0.75-0.87) | - |

Reading:
- B1's poor local row was the VAD, not Whisper: at the default silero threshold 0.5 the room-degraded mixes lose 80-92 % of their words (one 193 s mix gave 0 words with English forced). Threshold 0.25 plus `condition_on_previous_text=False` brings the words back to 2/3 of the vendors' on the mixes and to parity on clips and the lesson slice. Adopted for every later run (`--lang en --vad on --vad-thr 0.25 --cond-prev off`).
- Language auto and English gave identical clips and lesson output (auto detected English); no Vietnamese text came out of any small configuration (diacritic share 0.0 %). B1 found only Gemini writing Vietnamese (4 % of lesson words).
- On the clean held-out clips and on the real lesson slice, local small agrees with the vendors about as well as they agree with each other (0.80-0.85 vs 0.82-0.86). On the synthetic mixes it is clearly below (0.30 vs 0.42), and so are the vendors' own figures low there.
- n is small (2 mixes, 6 clips, one 3-minute slice): these settle the configuration, not a ranking against vendors.

Timings of these runs (all UNDER LOAD; for the record only): RTF 2.0 (B1 config) and 3.5 (adopted config) at 4 threads, other processes 84-85 % of the machine, free RAM falling to 0.02-0.13 GB; the process got 1.2-1.3 cores. Per-file RTF swung from 0.4 to 7.7 with the other agents' load, so none of these numbers is a speed figure.

## 4. Transcription: model size (select set, adopted settings, 4 threads, int8, beam 5)

Quality (agreement with the B1 vendors, UNCHECKED, same files as section 3):

| model | synth (2) agreement | synth words ratio | clips (6) agreement | L2 180 s agreement | Vietnamese text |
|---|---|---|---|---|---|
| small | 0.304 | 0.67 | 0.849 | 0.802 | 0 % |
| medium | 0.339 | 0.59 | 0.854 | 0.827 | 0 % |
| large-v3-turbo | 0.336 | 0.50 | **0.874** | **0.841** | 0 % |
| vendors among themselves, same files | 0.422 (0.29-0.54) | - | 0.863 (0.81-0.91) | 0.818 (0.75-0.87) | Gemini only (B1) |

Cost (UNDER LOAD - see the load columns; wall RTF is not a speed figure):

| model | wall RTF | process CPU-seconds per audio second | cores it got | others' CPU (mean, p10-p90) | free RAM min / mean | peak working set | peak private (committed) | model load s |
|---|---|---|---|---|---|---|---|---|
| small (B1 config) | 2.00 | 2.55 | 1.28 | 84 % (74-92) | 0.02 / 3.75 GB | 1.04 GB | 3.14 GB | 70 |
| small, English VAD 0.5 (same output as above) | 3.74 | 3.09 | 0.83 | 90 % (81-95) | 0.00 / 2.66 GB | 1.04 GB | 3.15 GB | 43 |
| small (adopted) | 3.46 | 4.25 | 1.23 | 85 % (76-92) | 0.13 / 4.48 GB | 1.05 GB | 3.15 GB | 49 |
| medium (adopted) | 7.85 | 7.72 | 0.98 | 88 % (79-94) | 0.00 / 2.35 GB | 2.21 GB | 6.04 GB | 64 |
| large-v3-turbo (adopted) | 4.47 | 5.64 | 1.26 | 84 % (72-95) | 0.00 / 3.39 GB | 1.93 GB | 4.03 GB | 33 |

Reading:
- large-v3-turbo is the best local model on every real-speech input (clips 0.874, lesson slice 0.841: at or above the vendors' own mutual agreement), and cheaper than medium (5.6 vs 7.7 CPU-seconds per audio second). Medium is dominated: slower than turbo and not better. On the synthetic mixes turbo writes fewer words (half the vendors'); all local models stay below the vendors there.
- CPU-seconds per audio second are steadier than wall RTF under load, but NOT load-free: the same small configuration with identical output cost 2.55 and 3.09 CPU-s/s in two runs (hyper-thread siblings and caches shared with other agents make each CPU-second do less work). Treat them as upper bounds with about +-25 % noise.
- Peak private memory (3-6 GB) is far above the working set (1-2 GB) because free RAM hit zero during every run and Windows trimmed the process; the private figure is what a server must reserve. An 8 GB machine runs turbo; 4 GB would be tight.

## 5. Diarization and identification (4 threads, UNDER LOAD)

Quality on B2's inputs (the six tuning mixes seed7_ov05_s500 + seed7_ov15_s500, 26.1 min, collar 0.25 s), recomputed in the same run as the timing: both reproduce B2 exactly.

| diarizer | DER mean (B2) | DER pooled: miss / false alarm / confusion | clusters found vs true (6 mixes) | wall RTF on the mixes | CPU-s per audio s | others' CPU | free RAM min | peak working set / private |
|---|---|---|---|---|---|---|---|---|
| own: energy VAD + 1.5 s chunks + 3D-Speaker CAM++ + AHC, threshold 0.1 (B2's best) | **0.579** (0.579) | 0.568: 0.203 / 0.000 / 0.365 | 4/3, 4/3, 4/4, 5/3, 4/4, 5/5 | 0.095 | 0.17 | 77 % | 7.65 GB | 0.26 / 0.67 GB |
| sherpa-onnx: pyannote segmentation-3.0 ONNX + WeSpeaker CAM++ + fast clustering, threshold 0.5 | 0.663 (0.663) | 0.684: 0.031 / 0.050 / 0.604 | 5/3, 16/3, 15/4, 6/3, 14/4, 15/5 | 0.749 | 1.99 | 75 % | 4.04 GB | 0.35 / 0.78 GB |
| B1 vendors on the 5 % / 15 % room mixes, for comparison | azure-multilingual 0.297 / 0.452, azure en-vi 0.267 / 0.499, gemini 0.263 / 0.562, gpt-4o-diarize 0.516 / 0.691 (pooled DER by condition, B1 table a) | | | | | | | |

On a real lesson (L2, first 10 min, UNVERIFIED - no reference): own diarizer 28 s wall (RTF 0.047, 0.15 CPU-s/s, 3.1 cores, others 61 %), 6 clusters (5 with >= 10 s); sherpa 348 s (RTF 0.58, 1.67 CPU-s/s), 31 clusters (9 with >= 10 s). Sherpa's native call holds the Python lock, so the per-second sampler got no samples in that run; its load figures are missing (the script now falls back to start/end counters).

Identification (SpeechBrain ECAPA, B2's chosen model): embedding 132 turn-like spans (>= 1 s, <= 6 s) from L2's first 10 min = 383.7 s of speech took 474.6 s wall (RTF 1.24 per turn-second, 1.58 CPU-s per turn-second, 1.3 cores, others 84 %), peak 0.54 / 1.32 GB, model load 110 s. Scoring against 21 voiceprints with AS-norm is negligible next to that. No embedding was saved.
Quality is B2's and unchanged (same model, same code, same units): closed-set top-1 68.4 %; at T = 6.0 (1 % false accept) about 18.5 % of single turns and about half of 10-s clusters named, the rest UNKNOWN; real-lesson clusters 0 named at T 6.0 (UNVERIFIED). Nothing in B2b changes that verdict; CPU is not the limit for identification, the enrolment audio is.

Reading: local diarization is cheap on CPU (own diarizer about 1/20 of real time even under load) but poor (DER 0.57-0.66 vs 0.26-0.56 for the vendors on the same mixes). The diarizer, not the CPU, is the weak link of a local pipeline. Identification costs about one CPU-second and a half per second of cluster speech embedded; B2's matcher embeds at most 60 turns per cluster, so its cost is bounded per cluster, not per lesson minute.

## 6. Speed on a real lesson: threads, and one 20-minute end-to-end piece (UNDER LOAD)

### 6.1 Threads 4 vs 8 on the timing piece (L2, first 600 s, adopted settings)

| model | threads | wall RTF | CPU-s per audio s | cores it got | others' CPU (mean, p10-p90) | free RAM min / mean | peak working set / private | words |
|---|---|---|---|---|---|---|---|---|
| small | 8 | 1.07 | 3.08 | 2.87 | 64 % (49-79) | 0.30 / 3.97 GB | 1.03 / 3.14 GB | 738 |
| small | 4 | **0.53** | **1.45** | 2.73 | 66 % (57-76) | 2.71 / 6.20 GB | 1.03 / 3.14 GB | 738 |
| large-v3-turbo | 8 | 4.50 | 9.48 | 2.11 | 74 % (60-87) | 0.05 / 1.18 GB | 1.90 / 4.01 GB | 808 |
| large-v3-turbo | 4 | 6.07 | 6.38 | 1.05 | 87 % (72-96) | 0.01 / 2.93 GB | 1.90 / 4.01 GB | 807 |

8 threads never paid for themselves in CPU: each CPU-second did about half the work (small 3.08 vs 1.45, turbo 9.5 vs 6.4 CPU-s per audio second; on 4 cores / 8 threads the hyper-threads share the cores' units, and the other agents held the rest). In wall time small at 4 threads was twice as fast as at 8 under similar CPU load (0.53 vs 1.07; the 8-thread run also had 0.3 GB free RAM against 2.7 GB); turbo at 8 threads finished sooner only because it grabbed more of a machine the others were fighting for. Default for this laptop: 4 threads. The quiet-time rerun (section 7) settles it.
The small 4-thread run is the least-loaded measurement in this file (free RAM never under 2.7 GB): 1.45 CPU-s per audio second on real lesson audio. The select set cost small 2.6-4.3 CPU-s per audio second because the room-degraded synthetic mixes trigger Whisper's temperature fallbacks; real lesson audio is cheaper.

### 6.2 End to end: L2, first 20 minutes, large-v3-turbo 8 threads + own diarizer + ECAPA matching

`b2b_bench.py e2e --lesson L2 --minutes 20 --size large-v3-turbo --threads 8 --lang en --vad on --vad-thr 0.25 --cond-prev off` (2026-11-16 22:44-01:19 local, one stage after another in one process; nothing per child written):

| stage | wall s | CPU s | cores | others' CPU (mean, p10-p90) | free RAM min | output |
|---|---|---|---|---|---|---|
| transcription (turbo) | 8 658 | 22 389 | 2.59 | 68 % (60-78) | 0.01 GB | 1 696 words |
| diarization (own) | 107 | 387 | 3.62 | 55 % (37-98) | 2.10 GB | 6 clusters |
| identification (ECAPA, <= 60 turns per cluster >= 10 s) | 469 | 1 375 | 2.93 | 63 % (49-93) | 0.59 GB | 5 clusters matched, 0 named at T 6.0 (same as B2: UNVERIFIED) |
| total | 9 234 (RTF 7.7) | | | | | peak 1.93 GB working set, 4.41 GB private |

Transcription is 94 % of the time. Its CPU-seconds per audio second here (18.7) are twice the timing piece's (9.5) at the same settings while free RAM sat at zero: memory pressure and hyper-thread contention, not the audio, so this run is a worst case, not an estimate.

### 6.3 What a 90-minute lesson takes (EXTRAPOLATED from 10- and 20-minute pieces; no full lesson was run)

A full lesson was not run: under this load a 90-minute turbo run would occupy the laptop for 7-12 hours, against the instruction to keep it usable. The harness allows it (B2 processed lesson audio locally); the command is in section 7 for a quiet time.

| pipeline for 90 min of audio | measured under load (this file) | projected on the same laptop when quiet (ASSUMPTION: the lowest CPU-s per audio s measured here, spread over 3.5 busy cores at 4 threads) |
|---|---|---|
| small + own diarizer + ECAPA | 0.8 h transcription at the lightest load seen (RTF 0.53 on lesson audio), up to 5.2 h at the heaviest (RTF 3.5 on the select set) + 0.1-0.2 h diarization + ~0.2 h matching | about 0.6 h transcription (1.45 CPU-s/s / 3.5) + ~5 min + ~5-10 min: **about 1 h** |
| large-v3-turbo + own diarizer + ECAPA | 6.8-10.8 h transcription (RTF 4.5-7.2) + same | about 2.4 h transcription (5.6 CPU-s/s / 3.5) + ~5 min + ~5-10 min: **about 2.5-3 h** |

Uncertainty: the quiet projection rests on CPU-seconds measured under contention, which this file shows can be inflated by up to 2x; the true quiet figure is more likely at or below the projection than above it, but it is a projection until the section 7 commands are run.
