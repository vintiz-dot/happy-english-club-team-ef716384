# B2b - CPU-only performance of the monitor's speech pieces (evidence)

Task B2b of `docs/MASTER_PLAN.md`. Local only: no vendor called, no token used or looked for. Aggregates and codes (S01..., L1/L2/L3) only; no transcript text, no audio, no lesson file names. All audio and derived data stay under `C:\Users\Dell\hec-audio-eval\` (work files in `work\b2b\`, written through `safe_out()`).

**Where I am / next step:** 2026-11-16, config-selection runs of faster-whisper small running (under load). Next: quality runs of small / medium / large-v3-turbo, then diarization and identification timings, then the end-to-end piece.

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
