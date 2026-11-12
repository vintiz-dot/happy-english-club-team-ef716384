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

Unit counts are in section 3 (the first cut had a defect). **17 children** have held-out speech: S01-S07, S10, S11, S14, S15, S17, S18, S20, S21, S24, S30 (B0's text says 15, but its own table lists these 17 as "split"). The other 9 (S08, S09, S12, S13, S16, S19, S22, S25, S26) are enrolled distractors only. Gallery = 26 children.

**S23 is excluded from everything** (enrolment, gallery, distractors, tests): split.py found no child-pitch speech in its clip (median 134 Hz), so there is no voice to call S23's. It is not "flagged and kept" because a voiceprint built from an adult voice would attract the teacher's speech in real lessons and be suggested as a child.

## 3. Diagnosis finding 1: spliced enrolment destroys the voiceprint (found and fixed)

The first cut of the units (and B0's `ident_ecapa.py`) concatenated a child's VAD segments and then cut 3 s windows across the joins. The ENROL set is mostly short fragments (split.py gave the long 5 s blocks to HELD-OUT), so most enrolment windows were several fragments spliced together. Measured with wes_campp on that first cut (run 2026-11-12, `b2_eval.py`, kept as `work\b2\spliced_results_wes_campp.json`):

| check (wes_campp, spliced cut, cosine, 2 s clean windows unless stated) | top-1 | chance |
|---|---|---|
| enrol -> held-out (the real task) | 15.1 % (311 windows, 17 children) | 5.9 % |
| held-out -> enrol | 10.8 % | 5.9 % |
| held-out first half -> held-out second half (same child, no splices in held-out blocks) | 74.1 % (158 windows) | 5.9 % |
| enrol first half -> enrol second half | 57.1 % (191 windows, 26 children) | 3.8 % |
| full pipeline, all s500 conditions pooled: EER / top-1 | 47.6 % / 9.9 % | - |

Every child's enrolment centroid had cosine 0.80-0.97 with the centroid of ALL children's enrolment (they all looked alike), while the same child's held-out speech matched its own long unspliced segments (diagonal 0.85-0.97 when enrolment was rebuilt from segments >= 2 s read straight from the WAVs). Conclusion: the join artefacts, not the children's voices, dominated the embeddings. Fix (commit "cut windows inside VAD segments"): every enrolment, adult-pitch and test window is now cut INSIDE one VAD segment; a segment shorter than the window gives one window if >= 1 s (enrolment) or is skipped (a test window of length L needs a segment >= L). Consequence for B0: its ECAPA baseline (EER 26-39 %) enrolled on the same spliced audio, so it understates what ECAPA can do; the numbers below supersede it.

After the fix: 440 enrolment windows (1-3 s), 473 raw-clip windows, 97 adult-pitch windows, 1652 test windows (87.9 min of audio). Fewer test windows than the first cut, because only whole windows inside a segment count.

## 3b. Diagnosis finding 2: the B0 split left enrolment only the fragments

With windows cut inside segments (3ds_campp, cosine, clean 2 s windows; run 2026-11-12, kept as `work\b2\segcut_b0split_results_3ds_campp.json`):

| check | top-1 | chance |
|---|---|---|
| held-out first half -> held-out second half | 78.5 % (79 windows, 16 children) | 6.2 % |
| enrol first half -> enrol second half | 19.2 % (224 windows, 26 children) | 3.8 % |
| enrol -> held-out | 37.2 % (148 windows) | 6.2 % |
| full pipeline, s500 pooled: best EER (centred AS-norm) / top-1 | 20-29 % / 11-14 % | - |
| 1 s windows, any aggregation of up to 20 of them | top-1 4-6 % (chance level) | 3.8 % |

split.py dealt contiguous 5 s blocks to HELD-OUT and left ENROL the short fragments between them, so the enrolment was the worst audio each child had. Fix: `b2_units.py --resplit time` (now the default) re-splits each child's clean (non-adult-pitch) speech BY TIME: the first 60 % enrols, the later 40 % is the test - both sides get whole utterances, and test speech is from a later part of the recording, never seen in enrolment. Same 17 children qualify (>= 50 s clean speech); enrolment 30.8-138.4 s, test 18.5-85.3 s per child. Units: 467 enrolment, 473 raw, 97 adult-pitch, 1358 test windows (80.3 min). This is what a real enrolment looks like (a child speaking continuously), so the results below use it.

**Statistical caveat stated once for every table:** confidence intervals are 95 % Wilson intervals over windows, treating windows as independent. They are not: all windows come from 15 children and from 20-90 s of speech each, so the true uncertainty is wider than shown, above all for per-child figures.
