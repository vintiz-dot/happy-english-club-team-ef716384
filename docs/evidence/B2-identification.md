# B2 - speaker identification, local (evidence)

Task B2 of `docs/MASTER_PLAN.md`. Question: can a child's voice in a lesson recording be matched to an enrolled child reliably enough to SUGGEST a name, and below what confidence must the system say UNKNOWN?
Aggregates and codes (S01..., L1/L2/L3) only. No transcript text, no source file names, no audio. All audio and derived data (WAVs, unit cuts, embeddings, voiceprints, RTTMs, teacher samples) are under `C:\Users\Dell\hec-audio-eval\` only. Timings in this file are contaminated by other agents' CPU load and are NOT benchmarks (B2b measures speed).

**READ FIRST: every synthetic number here is an UPPER BOUND.** The test speech is the children's own clean, close-mic, compressed video audio, cut into windows and (for "s500") passed through a simulated room. A real classroom recorded on one table microphone has more distance, reverberation, cross-talk and children speaking over each other. Real-lesson numbers (section 6) have no reference at all and are UNVERIFIED.

## Where I am / next step

**2026-11-12, wrapping up.** Done: sections 1-5 and 7-10. Running: real lessons, first 20 min each (section 6). 3ds_eres2v2 dropped (RTF ~1.4 under load, ~4 h).

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

## 3c. Diagnosis findings 3 and 4: thin voiceprints are hubs; test turns were too short

On the time split (3ds_campp, cosine, closed set of 26; run 2026-11-12, `work\b2\segcut_timesplit_results_*.json`):
- **Hubs.** At s500 2 s, 52 of the wrong answers went to S08 and 20 to S07; S08 has 25.8 s of fragmentary enrolment. A voiceprint built from little, poor audio sits near the average of everyone and attracts every uncertain turn. With the 17 test children's own voiceprints only (no thin distractors), the same windows scored 47 % top-1 (clean 2 s, chance 6 %); with the 26-child gallery, 18 %. Rule adopted: a child is enrolled only with >= 30 s of enrolment speech (B0's own minimum); S08, S13, S16, S19, S22, S25 are therefore NOT enrolled (in a product they would be UNKNOWN until re-enrolled). AS-norm and centring (enrolment-mean subtraction) did not remove the hub effect on their own.
- **Turn length.** Windows that must fit inside one silero segment were almost all 1 s (386 of 534 per condition); only 25 were 4 s and 3 were 8 s, because silero cuts at every 300 ms pause. 1 s windows were at chance for every model (top-1 0.3-10 %), and aggregating up to 20 of them did not help. Fix: segments of the same set separated by a pause < 0.8 s are joined into one utterance (contiguous audio with its pauses, no splice; never across an adult-pitch segment). Units now: 484 enrolment, 473 raw, 97 adult-pitch, 2504 test windows (131.7 min).

## 3d. Local diarizer check on the synthetic mixes (no identification)

`b2_lessons.py tune` on the six mixes of seed7_ov05_s500 + seed7_ov15_s500 (3-5 children, 3-6 min each), DER with `score.der_file`, collar 0.25 s (run 2026-11-12):

| diarizer | setting | mean DER | clusters found vs reference speakers (6 mixes) | note |
|---|---|---|---|---|
| sherpa-onnx (pyannote-seg-3.0 ONNX + wes CAM++ + fast clustering) | threshold 0.5 | 0.663 | +2..+13 too many | RTF 1.34 under load: too slow for 300 min here; not pursued |
| own: silero VAD + 1.5 s chunks + AHC, no centring (3ds CAM++) | 0.3 (best) | 0.725 | 2-6 vs 3-5 | silero missed 27-90 % of speech |
| own, centred | 0.0 | 0.713 | | same VAD problem |
| own, 6 dB energy VAD, centred (3ds CAM++) | **-0.1** | **0.565** | 2 vs 3-5 (always 2) | best; VAD miss alone 8-28 % |
| same | 0.0 | 0.573 | 2-3 vs 3-5 | |
| same | 0.1 | 0.579 | 4-5 vs 3-5 | closest count |
| same | 0.3 | 0.658 | 12-14 | over-split |

VAD check (one-speaker hypothesis, miss rate of reference speech): silero threshold 0.5 missed 27-90 %, silero 0.3 missed 10-74 %, energy VAD 6 dB missed 8-28 %; false alarm 0 % in all (the mixes contain little non-speech, so false alarm is not tested here; in a real room the energy VAD will also pass noise).
Reading: even on these clean-source mixes, the local diarizer gets more than half of the speech time wrong and does not find the right number of children. A cluster in a real lesson is therefore NOT reliably one child: it can merge children, and one child can be split over clusters. That limits everything in section 6.

## 4. Model comparison on the final units (closed set of 21 enrolled, realistic s500* pool, all window lengths)

From the `b2_eval.py` logs (run 2026-11-12; ECAPA/TitaNet rows written before a session restart cut those runs short; full tables in section 5). EER = top-1 verification EER, closed + leave-one-out open set. Chance top-1 = 1/21 = 4.8 %.

| model | best-EER config | EER | top-1 (closed) | cosine baseline (vad-all-mean-cos) EER / top-1 |
|---|---|---|---|---|
| **ecapa** (SpeechBrain, VoxCeleb) | vad-all-k3-asnorm | **25.5 %** | **68.4 %** | 34.0 % / 68.2 % |
| titanet_l (NeMo) | vad-all-k2-asnorm | 33.3 % | 41.1 % | 44.1 % / 41.3 % |
| wes_campp (WeSpeaker CAM++) | raw-all-mean-asnorm | 40.4 % | 14.0 % | 45.1 % / 13.4 % |
| 3ds_campp (3D-Speaker CAM++) | vad-all-k3-asnorm | 37.5 % | 9.4 % | 60.1 % / 16.1 % |
| wes_r34lm, 3ds_eres2v2 | not run on final units | - | - | eres2v2 ran at RTF ~1.4 under load (~4 h); dropped for time |

Reading: the two CAM++ models are close to chance on these children's voices; ECAPA is clearly the best of the four, TitaNet second. Adaptive s-norm (cohort = the other enrolled children) lowers ECAPA's EER from 34 % to 26-29 %; sub-centroids (k2/k3) add a little; enrolment length 10 / 20 / 40 s / all gives top-1 53 / 62 / 65 / 68 % (cosine) - more enrolment helps, but with no data beyond ~140 s per child we cannot say where it stops. Raw-clip enrolment (no VAD, no adult-pitch filter) is close to the cleaned enrolment for ECAPA (65.2 vs 68.2 % top-1), because the 30 s floor keeps the adult-dominated clips (S13) out of the gallery.

## 5. Results with the best model (ECAPA) - SYNTHETIC, UPPER BOUND

`b2_eval.py --models ecapa` (final units, 21 enrolled, 17 test children; open set = leave-one-out, so every test window is also an unenrolled-speaker trial; run 2026-11-12, `work\b2\results_ecapa.json`, ECAPA rerun with 11 configurations and 3 cluster shuffles after the restart). "named" = correct child shown; "wrong child" = an enrolled child shown as someone else (closed set); "open accepted" = an unenrolled child shown as an enrolled one. Thresholds are chosen by `score.recommend_split` on the pooled s500* conditions so that BOTH the closed-set wrong-child rate and the open-set accept rate meet the target; "ok" = the 95 % upper bound meets it (1 358 test windows per population: enough to show 1 %, unlike B0's ~100).

### 5.1 Configurations (pooled s500* conditions, all lengths)

| config | EER % | top-1 closed % [CI] | T @1 % | named % [CI] | wrong child % [CI] | open accepted % [CI] | T @5 % | named % | wrong % | open acc % |
|---|---|---|---|---|---|---|---|---|---|---|
| vad-all-mean-cos (baseline) | 34.0 | 68.2 [65.8-70.4] | 0.694 ok | 8.1 [6.9-9.6] | 0.3 [0.1-0.6] | 0.5 [0.3-1.0] | 0.646 | 17.7 | 1.7 | 3.8 |
| vad-10-mean-cos (10 s enrolment) | 35.5 | 53.0 [50.5-55.4] | 0.684 | 2.9 | 0.3 | 0.5 | 0.636 | 9.1 | 2.0 | 3.9 |
| vad-20-mean-cos | 35.8 | 61.9 [59.5-64.3] | 0.697 | 4.5 | 0.2 | 0.5 | 0.643 | 12.5 | 1.6 | 3.9 |
| vad-40-mean-cos | 34.7 | 65.0 [62.7-67.3] | 0.693 | 6.9 | 0.2 | 0.5 | 0.646 | 15.2 | 1.5 | 3.8 |
| vad-all-mean-asnorm | 27.1 | 66.7 [64.3-68.9] | 4.416 ok | 20.7 [18.8-22.8] | 0.1 | 0.5 | 3.432 | 28.7 | 0.8 | 3.9 |
| vad-10-mean-asnorm | 27.9 | 56.7 | 4.542 | 10.5 | 0.3 | 0.5 | 3.188 | 19.8 | 1.0 | 3.9 |
| vad-20-mean-asnorm | 27.8 | 62.8 | 4.612 | 12.9 | 0.2 | 0.5 | 3.350 | 23.6 | 1.1 | 3.9 |
| vad-40-mean-asnorm | 28.9 | 65.8 | 4.580 | 16.1 | 0.1 | 0.5 | 3.361 | 26.0 | 0.9 | 3.9 |
| **vad-all-k3-asnorm** (3 sub-centroids) | **25.5** | **68.4 [66.1-70.7]** | **4.726 ok** | 18.5 [16.7-20.5] | 0.1 [0.0-0.5] | 0.5 [0.3-1.0] | 3.500 | 28.8 | 0.7 | 3.9 |
| raw-all-mean-cos (no VAD / pitch clean-up) | 33.2 | 65.2 | 0.695 | 7.7 | 0.1 | 0.5 | 0.651 | 16.9 | 1.7 | 3.9 |
| vad-all-mean-ccos (centred cosine) | 26.5 | 65.3 | 0.455 | 15.9 | 0.4 | 0.5 | 0.397 | 27.6 | 2.0 | 3.9 |

Normalisation (AS-norm) is the step that matters: at the same 1 % point it more than doubles the share of turns that get a name (8 % -> 19-21 %). Enrolment length helps steadily (10 s -> all: top-1 53 -> 68 % cosine, 57 -> 67 % AS-norm).

### 5.2 Accuracy by turn length (vad-all-k3-asnorm, s500 room)

| window (stands for) | n | top-1, no threshold (cosine baseline) | at T@1 % = 4.726: named % [CI] | wrong child % | UNKNOWN % | open accepted % [CI] | at T@5 % = 3.500: named % | wrong % | open acc % |
|---|---|---|---|---|---|---|---|---|---|
| 1 s (< 1.5 s) | 549 | 52.8 | 4.6 [3.1-6.6] | 0.0 | 95.4 | 0.0 [0.0-0.7] | 7.5 | 0.0 | 0.5 |
| 2 s (1.5-3 s) | 243 | 77.0 | 16.0 [12.0-21.2] | 0.4 | 83.5 | 0.4 [0.1-2.3] | 31.7 | 1.6 | 6.2 |
| 4 s (3-6 s) | 95 | 86.3 | 49.5 [39.6-59.4] | 0.0 | 50.5 | 2.1 [0.6-7.4] | 67.4 | 1.1 | 8.4 |
| 8 s (> 6 s) | 27 | 96.3 | 81.5 [63.3-91.8] | 0.0 | 18.5 | 0.0 [0.0-12.5] | 92.6 | 0.0 | 18.5 |

Most children's turns in a lesson are short, and that is where it fails: under 1.5 s, 95 % of turns stay UNKNOWN at the 1 % point and still 92 % at the 5 % point. Note the 5 % threshold, applied per length, lets 6-18 % of unenrolled children's 2-8 s turns through as a wrong name: one global threshold does not hold its false-accept rate across lengths.

### 5.3 Room and overlap (top-1 no threshold, cosine baseline; named at T@1 % for k3-asnorm)

| window | clean | s500 room | s500 + 5 % overlap | s500 + 15 % overlap |
|---|---|---|---|---|
| 1 s top-1 | 76.7 | 52.8 | - | - |
| 2 s top-1 | 86.8 | 77.0 | 70.4 | 67.1 |
| 4 s top-1 | 93.7 | 86.3 | 88.4 | 85.3 |
| 2 s named @T1 (k3-asnorm) | 39.9 | 16.0 | 19.3 | 14.4 |
| 4 s named @T1 (k3-asnorm) | 75.8 | 49.5 | 40.0 | 43.2 |

The simulated room costs more than overlap: at 2 s it halves the share named at the 1 % point (40 -> 16 %). Overlap of 5-15 % costs a few more points of top-1 at 2 s; at 4 s the differences are within noise (n = 95).

### 5.4 Aggregating a cluster's turns (the realistic use; vad-all-k3-asnorm, s500; T chosen per row)

| turns of | k turns | speech s | clusters (independent) | top-1 % [CI] | T @1 % | named % [CI] | wrong % | open accepted % [CI] | evidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 s | 1 | 1 | 549 | 50.6 [48.2-53.0] | 4.034 | 5.8 [4.8-7.1] | 0.0 | 0.4 [0.2-0.8] | ok |
| 1 s | 5 | 5 | 103 | 82.2 [77.5-86.1] | 4.858 | 34.0 [28.9-39.4] | 0.6 | 1.0 [0.3-2.8] | insufficient |
| 1 s | 10 | 10 | 47 | 91.5 [85.7-95.1] | 5.475 | 40.4 [32.7-48.7] | 0.0 | 0.7 [0.1-3.9] | insufficient |
| 2 s | 1 | 2 | 243 | 75.7 [72.5-78.7] | none (inf) | 0 | 0 | 0 | - |
| 2 s | 3 | 6 | 74 | 90.5 [86.0-93.7] | 5.590 | 43.7 [37.3-50.3] | 0.0 | 0.9 [0.2-3.2] | insufficient |
| 2 s | 5 | 10 | 42 | 92.9 [87.0-96.2] | 5.985 | 52.4 [43.7-60.9] | 0.0 | 0.8 [0.1-4.4] | insufficient |
| 2 s | 10 | 20 | 20 | 100.0 [94.0-100.0] | 5.986 @5 % | 71.7 (@5 %) | - | 5.0 (@5 %) | insufficient |
| 2 s + 5 % overlap | 5 | 10 | 42 | 94.4 [89.0-97.3] | 7.370 | 42.1 [33.8-50.8] | 0.0 | 0.8 [0.1-4.4] | insufficient |

(CIs on clusters use rows pooled over 3 shuffles; "independent" is per shuffle, so the true intervals are wider.) Aggregation is the biggest gain measured: 10 s of a child's turns gives the right child top-1 in 92-93 % of clusters (vs 51-76 % for single turns), and about half of such clusters can be NAMED at a 1 % false-accept point. But only 20-103 independent clusters exist, so a 1 % rate cannot be demonstrated (needs ~300 with no error).

### 5.5 Threshold stability (chosen on half of the children, applied to the other half; 1 % target)

| T chosen on half A, applied to half B | T chosen on half B, applied to half A |
|---|---|
| T 4.594: named 23.0 %, wrong 0.3 %, open accepted 1.2 % | T 6.031: named 10.0 %, wrong 0.0 %, open accepted 0.0 % |

The two halves disagree (4.6 vs 6.0) and the lower one breaks the 1 % open-set target on unseen children (1.2 %). **Recommended threshold: T = 6.0** (AS-norm score, ECAPA, vad-all-k3-asnorm) for both single turns and clusters - the larger of the cross-half and per-row 1 % values, i.e. fail closed. At T = 6.0 expect most single turns UNKNOWN and roughly half of 10-s clusters named.

### 5.6 Per child, adult contamination, score distributions (ECAPA cosine baseline, s500 2 s)

| child | windows | top-1 % | most frequent wrong answers |
|---|---|---|---|
| S01 | 24 | 79 | S05 x2, S12 x2, S03 x1 |
| S02 | 41 | 98 | S05 x1 |
| S03 | 14 | 86 | S24, S26 |
| S04 | 11 | **9** | S05 x4, S24 x3, S01 x2 |
| S05 | 14 | 86 | S20, S04 |
| S06 | 6 | 67 | S10, S30 |
| S07 | 10 | 60 | S05 x2, S01, S20 |
| S10 | 14 | 71 | S02 x3, S05 |
| S11 | 12 | 100 | |
| S14 | 12 | 58 | S01, S24, S07 |
| S15 | 11 | 64 | S03 x4 |
| S17 | 11 | 64 | S24, S04, S10 |
| S18 | 11 | 82 | S21, S01 |
| S20 | 8 | 62 | S24 x3 |
| S21 | 12 | 50 | S24 x3, S26, S30 |
| S24 | 10 | 90 | S03 |
| S30 | 22 | 95 | S12 |

Wrong answers received ("hubs"): S24 12, S05 10, S03 10, S01 5. Per-child rates rest on 6-41 windows each: indicative only.

Adult-pitch speech in the enrolment clips (ECAPA): S20 has 30 adult-pitch windows against 17 child windows and S21 26 against 30; 5 of S20's and 9 of S21's enrolment windows are closer to the adult centroid than to their own child centroid, i.e. the "child" enrolment of S20/S21 still contains adult speech that the 200 Hz pitch filter missed (cosine adult-vs-enrolment centroid 0.42 / 0.58). They are kept in, and flagged: their top-1 (62 % / 50 %) is below the median. S13 (clip dominated by an adult voice, 25.5 s child speech) and S23 (no child-pitch speech) are not enrolled. S04's enrolment is not adult-contaminated (cos 0.29) yet it fails (9 %): not explained; a teacher should check that S04's clip is one child.

Top-1 score quantiles (5/25/50/75/95 %), s500 all lengths, k3-asnorm: correct [-1.29, 0.67, 2.39, 4.57, 8.97]; wrong enrolled child [-2.77, -1.22, -0.21, 0.92, 2.53]; unenrolled child [-2.95, -1.19, 0.06, 1.17, 3.07]. The out-of-set distribution sits on top of the wrong-child one: an unenrolled child looks exactly like a mistaken enrolled one, which is why open-set matters. Cosine: correct median 0.53, wrong 0.43, out-of-set 0.44 - heavy overlap.

**Statistical caveat stated once for every table:** confidence intervals are 95 % Wilson intervals over windows, treating windows as independent. They are not: all windows come from 17 children and from 18-85 s of test speech each, so the true uncertainty is wider than shown, above all for per-child figures.

## 6. Real lessons L1, L2, L3 - UNVERIFIED

(filled below when the run finishes)

## 7. Recommended configuration

- Embedding: SpeechBrain ECAPA (`spkrec-ecapa-voxceleb`). The CAM++ models (WeSpeaker, 3D-Speaker) were near chance on these children; TitaNet-L second.
- Enrolment: all available clean speech, windows cut inside utterances (never spliced), at least 30 s per child or the child is not enrolled; 3 sub-centroids per child.
- Scoring: adaptive s-norm, cohort = the other enrolled children's enrolment windows (top 50).
- Matching unit: a diarized cluster of at least 5 turns / 10 s, never a single short turn.
- Threshold: UNKNOWN below T = 6.0 (AS-norm score). Below it, or with fewer than 10 s of cluster speech, the answer is UNKNOWN. Recalibrate T on real classroom audio before any use; the synthetic T is not transferable.

## 8. Verdict (three lines)

(a) With the CURRENT enrolment audio, suggestion-with-confidence is NOT viable for single turns (under 1.5 s, 95 % stay UNKNOWN at the 1 % false-accept point and the threshold is unstable between halves of the children), and only marginal for clusters (about half of 10-s clusters named on synthetic audio, an upper bound, with too few clusters to prove 1 % false accept) - and the local diarizer cannot yet deliver one-child clusters (DER 0.57 on the mixes).
(b) Viable only with a better enrolment: each child recorded 60 s or more on the S500 in the classroom (same microphone and room as the lessons, removing the clean-video vs room mismatch that halved the named rate here) and the planned "say your name before speaking" roll-call as labelled ground truth to calibrate T per class. MEASURED here: more enrolment helps (10 s -> all: top-1 53 -> 68 %), normalisation doubles the share named at 1 % false accept, aggregating 10 s of turns lifts top-1 from 51-76 % to 92-93 %, the room costs about half the named share. EXPECTED only (not measured): that in-room enrolment closes the room gap, and that a roll-call can calibrate T.
(c) Must stay human: every name. The system may only offer "this cluster sounds like Sxx (score)" to a teacher; a teacher confirms or corrects every cluster, unenrolled and adult voices stay UNKNOWN, and nothing from a lesson reaches a family before a teacher approves it.

## 9. Compute cost observed (contaminated by other agents' load; B2b measures properly)

Embedding the 131.7 min of test material: 3ds_campp 1 760 s (RTF 0.22), wes_campp 1 521 s (0.19), titanet_l 2 920 s (0.37), ecapa 5 273 s (0.67), all with 2 threads and 3-4 jobs at once. sherpa-onnx diarization pipeline RTF 1.34; own diarizer (energy VAD + 3ds CAM++ chunks + AHC) RTF 0.13-0.17. A 60-90 min lesson would need roughly 10-15 min of CPU for diarization and a few minutes for ECAPA on clusters on this laptop, so a nightly batch on one CPU machine is plausible; it does not fit a Supabase edge function (2 s CPU limit, B0-vendors) and would need a small always-on box or a job runner with ~2 GB RAM. Measure on a quiet machine (B2b) before deciding.

## 10. Reproduce

See `scripts/lesson-eval/README.md`, section "Speaker identification (B2)". In order: `fetch_models.py`; `b2_units.py --seed 11`; `b2_embed.py --model {ecapa,titanet_l,wes_campp,3ds_campp} --threads 2`; `b2_eval.py --models <m> --json work\b2\results_<m>.json`; `b2_report.py --diag-model ecapa`; `b2_lessons.py tune --engine own --diar-model 3ds_campp --thresholds=-0.1,0.0,0.1,0.2,0.3`; `b2_lessons.py run --lessons L1,L2,L3 --minutes 20 --diar-model 3ds_campp --diar-threshold 0.1 --id-model ecapa --id-config vad-all-k3-asnorm --threshold 4.7264`; tests `python -m pytest scripts\lesson-eval\tests -q -p no:cacheprovider`. Deletion: `delete_voiceprints.py --yes` (all embeddings and cluster voiceprints), `delete_all_derived.py --yes` (also unit audio and teacher samples).

Not done: wes_r34lm and 3ds_eres2v2 on the final units; TitaNet's full table (its eval was cut by the restart; EER/top-1 per config are from its log, section 4); B0's fixed-turn mixes rescored with the fixed pipeline; lessons beyond their first 20 minutes.
