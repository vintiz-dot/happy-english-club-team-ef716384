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
