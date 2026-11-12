# B2 - speaker identification, local (evidence)

Task B2 of `docs/MASTER_PLAN.md`. Question: can a child's voice in a lesson recording be matched to an enrolled child reliably enough to SUGGEST a name, and below what confidence must the system say UNKNOWN?
Aggregates and codes (S01..., L1/L2/L3) only. No transcript text, no source file names, no audio. All audio and derived data (WAVs, unit cuts, embeddings, voiceprints, RTTMs, teacher samples) are under `C:\Users\Dell\hec-audio-eval\` only. Timings in this file are contaminated by other agents' CPU load and are NOT benchmarks (B2b measures speed).

**READ FIRST: every synthetic number here is an UPPER BOUND.** The test speech is the children's own clean, close-mic, compressed video audio, cut into windows and (for "s500") passed through a simulated room. A real classroom recorded on one table microphone has more distance, reverberation, cross-talk and children speaking over each other. Real-lesson numbers (section 6) have no reference at all and are UNVERIFIED.

## Where I am / next step

**2026-11-12, resumed after a session restart.** Done: setup, models fetched, scorer additions + tests, unit cuts (b2_units.py), wes_campp embeddings. Lost in the restart and re-started detached: ecapa / 3ds_campp / titanet_l embeddings, wes_campp eval, diarization tune. 3ds_eres2v2 dropped: at RTF ~1.4 under this load it would take ~4 h (it had done 1280/4165 units in 51 min). Next: eval each model as it lands, write sections 3-5; then lessons (section 6).

## 1. Setup, models, what installed

Branch `worktree-agent-a4f62266eb275d01d`, merged `claude/hec-conductor-setup-efbaa5` first. Venv as in B0 (Python 3.13, torch 2.15.0+cpu, SpeechBrain 1.1.2, sherpa-onnx 2.0.1, onnxruntime 1.31.1). No Hugging Face token was looked for or used: **pyannote's gated pipelines are out**; the pyannote segmentation-3.0 network is used only through the k2-fsa ONNX mirror, which is not gated.

Models (all ungated, downloaded by `scripts/lesson-eval/fetch_models.py` into `C:\Users\Dell\hec-audio-eval\models\sherpa\`; ECAPA was already cached by B0):

| key | model | source | licence (as stated upstream; not legally reviewed) | size | dim |
|---|---|---|---|---|---|
| ecapa | SpeechBrain `spkrec-ecapa-voxceleb` | huggingface.co/speechbrain/spkrec-ecapa-voxceleb | Apache-2.0 | ~85 MB | 192 |
| wes_campp | WeSpeaker CAM++ (VoxCeleb) ONNX | github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/wespeaker_en_voxceleb_CAM++.onnx | CC-BY-4.0 (WeSpeaker pretrained models) | 29.3 MB | 512 |
| wes_r34lm | WeSpeaker ResNet34-LM (VoxCeleb) ONNX | same release, wespeaker_en_voxceleb_resnet34_LM.onnx | CC-BY-4.0 | 26.5 MB | 256 |
| 3ds_campp | 3D-Speaker CAM++ (VoxCeleb) ONNX | same release, 3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx | Apache-2.0 | 29.6 MB | 512 |
| 3ds_eres2v2 | 3D-Speaker ERes2NetV2 (zh-cn, 16k common) ONNX | same release, 3dspeaker_speech_eres2netv2_sv_zh-cn_16k-common.onnx | Apache-2.0 | 71.4 MB | 192 |
| titanet_l | NVIDIA NeMo TitaNet-Large ONNX (TitaNet class) | same release, nemo_en_titanet_large.onnx | CC-BY-4.0 | 101.4 MB | 192 |
| segmentation | pyannote segmentation-3.0 ONNX export | github.com/k2-fsa/sherpa-onnx/releases/download/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2 | MIT | 7.0 MB | - |

Failed to install / not tried: pyannote.audio pipelines (gated, token needed - not requested); the `wespeaker` and `nemo_toolkit` Python packages were not installed because their ONNX exports run through sherpa-onnx already (no torch-version conflicts to fight). Nothing else failed.

Scorer and test changes: `score.py` gains two-sided Wilson intervals on every rate, `recommend_split` (meets the false-accept target on closed-set and open-set rows separately, so many easy closed-set turns cannot dilute open-set accepts) and a per-`group` report; new `idlib.py` (centroids, sub-centroids, adaptive s-norm, top-1/margin, agglomerative clustering). Tests: 26 -> 36, all pass (`tests/test_score.py` +3, `tests/test_idlib.py` 6, `tests/test_delete_voiceprints.py` 1). Found on the way: the DER fixtures `tests/fixtures/{ref,hyp}.rttm` had never been committed (`.gitignore` has `*.rttm`), so `test_der_cli_fixture` failed on a fresh checkout; recreated (synthetic letters only) and un-ignored by exact path.

## 2. Test material (b2_units.py, seed 11)

Instead of ~100 turns from a few mixes, every second of HELD-OUT speech (never used for enrolment) is cut into non-overlapping windows of 1, 2, 4 and 8 s, standing for the turn-length bins <1.5 s, 1.5-3 s, 3-6 s, >6 s. Conditions: `clean` (as recorded), `s500` (mix.py's simulated room: RIR RT60 0.35-0.6 s, 100-7000 Hz, real lesson background noise at SNR 12-25 dB), `s500_ov05` / `s500_ov15` (another child's held-out speech over the last 5 % / 15 % of the window at -3..+3 dB, then the room; L = 2 and 4 s only).
Every test window is scored twice: **closed set** (26 voiceprints; the 12 enrol-only children are distractors) and **open set** by leave-one-out (its own child's voiceprint and enrolment windows removed; only UNKNOWN is correct). This gives each condition about as many open-set as closed-set trials.

Units: 366 enrolment windows (3 s, VAD + pitch-filtered by split.py), 473 raw-clip windows (first 60 s of each clip, no clean-up), 72 adult-pitch windows, 3254 test windows; 167 min of audio in all. 15 children have held-out speech (S01-S07, S10, S11, S14, S15, S17, S18, S20, S21, S24, S30 - 17 codes listed by split.py minus none; see section 3 for S20/S21).

**S23 is excluded from everything** (enrolment, gallery, distractors, tests): split.py found no child-pitch speech in its clip (median 134 Hz), so there is no voice to call S23's. It is not "flagged and kept" because a voiceprint built from an adult voice would attract the teacher's speech in real lessons and be suggested as a child.

**Statistical caveat stated once for every table:** confidence intervals are 95 % Wilson intervals over windows, treating windows as independent. They are not: all windows come from 15 children and from 20-90 s of speech each, so the true uncertainty is wider than shown, above all for per-child figures.
