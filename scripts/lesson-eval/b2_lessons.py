"""B2 step 4: diarize real lessons locally, match clusters to enrolled children, write a teacher check.

Ungated, local only, no Hugging Face token, no vendor. Default engine "own":
silero VAD (faster-whisper) -> 1.5 s chunks inside speech regions -> embedding
(WeSpeaker/3D-Speaker ONNX) -> average-linkage cosine AHC (idlib.ahc). The
sherpa-onnx pipeline (pyannote segmentation-3.0 ONNX mirror, MIT) is kept as
`tune --engine sherpa`; it ran at RTF ~1.3 here and over-split at threshold 0.5.

  tune   run the diarizer on synthetic mixes with known speakers, for several
         clustering thresholds; DER (score.der_file, collar 0.25 s) and speaker-count
         error per threshold -> pick the threshold for the lessons.
  run    for each lesson (L1, L2, L3, resolved by SOURCE SHA-256 prefix in
         manifest.csv, so no file name is needed or printed): diarize (first
         --minutes, 0 = whole lesson), then per cluster: speech seconds, turns, median
         F0 (adult-pitch flag < 200 Hz), a cluster voiceprint = centroid of its turn
         embeddings with the B2 identification model, matched against the enrolled
         children (b2_eval configuration) -> SUGGESTION code + score if score >= T,
         else UNKNOWN; per-turn vote share as a consistency figure.
         Teacher check (by code only) under work\\teacher-check\\: one 10-20 s WAV per
         cluster stitched from its clearest turns + check_sheet.csv with a blank
         column for the teacher's answer. Nothing is linked: these are suggestions.

Outputs: work\\b2\\lessons\\<L>.rttm, work\\b2\\lessons\\summary.json (aggregates),
cluster voiceprints in work\\voiceprints\\b2\\lessons\\ (delete_voiceprints.py).

    python b2_lessons.py tune --thresholds 0.5,0.6,0.7,0.8,0.9
    python b2_lessons.py run --lessons L1,L2,L3 --minutes 0 --diar-threshold 0.7 \\
        --id-model wes_campp --id-config vad-all-mean-asnorm --threshold 2.5
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import idlib  # noqa: E402
import score  # noqa: E402
from b2_embed import make_embedder  # noqa: E402
from b2_eval import Data, parse_cfg, score_units  # noqa: E402
from common import MANIFEST, ROOT, SR, WAV_DIR, WORK, read_wav, safe_out, write_wav  # noqa: E402
from split import median_f0  # noqa: E402

LESSONS = {"L1": "85db66773dbc", "L2": "d4dcbbc5bfc7", "L3": "af000bb5bdb4"}  # source SHA-256 prefixes
SEG = ROOT / "models" / "sherpa" / "sherpa-onnx-pyannote-segmentation-3-0" / "model.onnx"
EMB = {"wes_campp": "wespeaker_en_voxceleb_CAM++.onnx", "3ds_campp": "3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx",
       "wes_r34lm": "wespeaker_en_voxceleb_resnet34_LM.onnx", "titanet_l": "nemo_en_titanet_large.onnx",
       "3ds_eres2v2": "3dspeaker_speech_eres2netv2_sv_zh-cn_16k-common.onnx"}


CHUNK = 1.5  # seconds per diarization chunk
CENTER = True  # set by --no-center


def vad_chunks(x: np.ndarray) -> list[tuple[float, float]]:
    """Energy-VAD regions (margin 6 dB) cut into chunks of <= CHUNK s (>= 0.5 s), never
    across a pause. Silero (threshold 0.5) missed 27-90 % of the children's speech in
    the s500 mixes, silero 0.3 missed 10-74 %, energy 6 dB 8-28 % (measured with
    score.der_file, collar 0.25 s, one-speaker hypothesis)."""
    from split import energy_vad
    regs = energy_vad(x, SR, margin_db=6.0)
    out = []
    for s, e in regs:
        n = max(1, int(round((e - s) / CHUNK)))
        step = (e - s) / n
        for i in range(n):
            a, b = s + i * step, s + (i + 1) * step
            if b - a >= 0.5:
                out.append((a, b))
    return out


def own_diarize(x, chunks, E, threshold: float, min_cluster_s: float = 0.0):
    """AHC (average linkage, cosine) over chunk embeddings, after subtracting the
    recording's mean embedding (removes the shared room/channel direction, which
    otherwise makes every chunk look alike); adjacent same-label chunks merged."""
    lab = idlib.ahc(idlib.l2n(E - E.mean(0)) if CENTER else E, threshold)
    segs = [(s, e, f"c{l:02d}") for (s, e), l in zip(chunks, lab)]
    merged = []
    for s, e, c in segs:
        if merged and merged[-1][2] == c and s - merged[-1][1] < 0.3:
            merged[-1] = (merged[-1][0], e, c)
        else:
            merged.append((s, e, c))
    return merged


def diarizer(threshold: float, emb_model: str, threads: int):
    import sherpa_onnx
    cfg = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(SEG)), num_threads=threads),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(
            model=str(ROOT / "models" / "sherpa" / EMB[emb_model]), num_threads=threads),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=-1, threshold=threshold),
        min_duration_on=0.3, min_duration_off=0.5)
    if not cfg.validate():
        sys.exit("diarization config invalid")
    return sherpa_onnx.OfflineSpeakerDiarization(cfg)


def diarize(sd, x: np.ndarray) -> list[tuple[float, float, str]]:
    res = sd.process(x).sort_by_start_time()
    return [(r.start, r.end, f"c{r.speaker:02d}") for r in res]


def lesson_wav(code: str) -> Path:
    with open(MANIFEST, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["set"] == "lessons" and r["source_sha256"].startswith(LESSONS[code]):
                return WAV_DIR / r["wav_file"] if not Path(r["wav_file"]).is_absolute() else Path(r["wav_file"])
    sys.exit(f"{code}: not found in manifest")


def cmd_tune(a) -> int:
    out = {}
    mixes = []
    for tag in a.mix_sets.split(","):
        mixes += sorted((WORK / "mix" / tag).glob("*.wav"))
    if a.engine == "own":
        emb = make_embedder(a.diar_model, a.threads)
        cache, t0, secs = [], time.time(), 0.0
        for w in mixes:
            x, _ = read_wav(w)
            secs += len(x) / SR
            ch = vad_chunks(x)
            cache.append((w, ch, idlib.l2n(emb([x[int(s * SR): int(e * SR)] for s, e in ch]))))
        cost = (time.time() - t0) / secs
        for thr in [float(t) for t in a.thresholds.split(",")]:
            ders, cnt = [], []
            for w, ch, E in cache:
                hyp = own_diarize(None, ch, E, thr)
                ref = score.read_rttm(w.with_suffix(".rttm"))[w.stem]
                d = score.der_file(ref, hyp, collar=0.25)
                ders.append(d["der"])
                big = {}
                for s, e, c in hyp:
                    big[c] = big.get(c, 0) + e - s
                cnt.append((len(big), sum(v >= 10 for v in big.values()), d["ref_speakers"]))
            out[thr] = {"mixes": len(mixes), "der_mean": float(np.mean(ders)), "der_each": [round(v, 3) for v in ders],
                        "clusters_all_ge10s_ref": cnt, "rtf_contaminated": cost}
            print(f"own thr {thr}: DER mean {np.mean(ders):.3f}  (clusters, clusters>=10s, ref) {cnt}  "
                  f"RTF {cost:.3f} (contaminated)", flush=True)
        p = safe_out(WORK / "b2" / "diar_tune.json")
        prev = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        prev[f"own|center={CENTER}|{a.diar_model}|{a.mix_sets}"] = out
        p.write_text(json.dumps(prev, indent=1), encoding="utf-8")
        return 0
    for thr in [float(t) for t in a.thresholds.split(",")]:
        sd = diarizer(thr, a.diar_model, a.threads)
        ders, cnt_err, t0, secs = [], [], time.time(), 0.0
        for w in mixes:
            x, _ = read_wav(w)
            secs += len(x) / SR
            hyp = diarize(sd, x)
            ref = score.read_rttm(w.with_suffix(".rttm"))[w.stem]
            d = score.der_file(ref, hyp, collar=0.25)
            ders.append(d["der"])
            cnt_err.append(d["sys_speakers"] - d["ref_speakers"])
        out[thr] = {"mixes": len(mixes), "der_mean": float(np.mean(ders)), "der_each": [round(v, 3) for v in ders],
                    "speaker_count_error": cnt_err, "rtf_contaminated": (time.time() - t0) / secs}
        print(f"thr {thr}: DER mean {np.mean(ders):.3f}  count error {cnt_err}  "
              f"RTF {(time.time() - t0) / secs:.3f} (contaminated)", flush=True)
    p = safe_out(WORK / "b2" / "diar_tune.json")
    prev = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    prev[f"{a.diar_model}|{a.mix_sets}"] = out
    p.write_text(json.dumps(prev, indent=1), encoding="utf-8")
    return 0


def cmd_run(a) -> int:
    demb = make_embedder(a.diar_model, a.threads)
    emb = demb if a.id_model == a.diar_model else make_embedder(a.id_model, a.threads)
    D = Data(a.id_model)
    cfg = parse_cfg(a.id_config)
    out_dir = safe_out(WORK / "b2" / "lessons")
    vp_dir = safe_out(WORK / "voiceprints" / "b2" / "lessons")
    tc_dir = safe_out(WORK / "teacher-check")
    summary = json.loads((out_dir / "summary.json").read_text(encoding="utf-8")) if (out_dir / "summary.json").exists() else {}
    sheet = []
    for L in a.lessons.split(","):
        x, _ = read_wav(lesson_wav(L), 0, a.minutes * 60 if a.minutes else None)
        secs = len(x) / SR
        t0 = time.time()
        ch = vad_chunks(x)
        CE = idlib.l2n(demb([x[int(s * SR): int(e * SR)] for s, e in ch]))
        segs = own_diarize(x, ch, CE, a.diar_threshold)
        t_diar = time.time() - t0
        with open(out_dir / f"{L}.rttm", "w", encoding="utf-8") as f:
            for s, e, c in segs:
                f.write(f"SPEAKER {L} 1 {s:.3f} {e - s:.3f} <NA> <NA> {c} <NA> <NA>\n")
        t1 = time.time()
        by = {}
        for s, e, c in segs:
            by.setdefault(c, []).append((s, e))
        clusters = []
        for c, turns in sorted(by.items()):
            speech = sum(e - s for s, e in turns)
            use = sorted([t for t in turns if t[1] - t[0] >= 1.0], key=lambda t: t[0] - t[1])[:a.max_turns]
            rec = {"cluster": c, "speech_s": round(speech, 1), "turns": len(turns),
                   "turns_ge_1s": sum(1 for s, e in turns if e - s >= 1.0)}
            longest = sorted(turns, key=lambda t: t[0] - t[1])[:20]
            f0 = median_f0(np.concatenate([x[int(s * SR): int(e * SR)] for s, e in longest]), SR)
            rec["median_f0_hz"] = None if f0 is None else round(f0, 1)
            rec["adult_pitch"] = f0 is not None and f0 < 200
            if speech < a.min_cluster_s or not use:
                rec.update({"suggestion": "UNKNOWN", "score": None,
                            "reason": f"minor cluster (< {a.min_cluster_s:g} s speech)" if use else "no turn >= 1 s"})
                clusters.append(rec)
                continue
            TE = idlib.l2n(emb([x[int(s * SR): int(e * SR)] for s, e in use]))
            cen = idlib.centroid(TE)
            np.save(vp_dir / f"{L}_{c}.voiceprint.npy", cen)
            pred, sc, mg, S = score_units(D, np.vstack([cen, TE]), D.codes, cfg, return_scores=True)
            order = np.argsort(-S[0])
            sug = pred[0] if sc[0] >= a.threshold else "UNKNOWN"
            rec.update({"top1": pred[0], "score": round(float(sc[0]), 3), "margin": round(float(mg[0]), 3),
                        "runner_up": D.codes[order[1]], "suggestion": sug,
                        "turn_vote_share": round(sum(p == pred[0] for p in pred[1:]) / len(pred[1:]), 2),
                        "turns_embedded": len(use)})
            # teacher sample: clearest = turns closest to the cluster centroid, 10-20 s stitched
            close = np.argsort(-(TE @ cen))
            parts, have = [], 0.0
            for i in close:
                s, e = use[i]
                seg = x[int(s * SR): int(min(e, s + 6.0) * SR)]
                parts += [seg, np.zeros(int(0.4 * SR), np.float32)]
                have += len(seg) / SR
                if have >= a.sample_s:
                    break
            y = np.concatenate(parts)[: int(20 * SR)]
            y = (y / (np.abs(y).max() + 1e-9) * 0.5).astype(np.float32)
            name = f"{L}_{c}.wav"
            write_wav(safe_out(tc_dir / L / name), y)
            rec["sample_s"] = round(len(y) / SR, 1)
            clusters.append(rec)
            sheet.append({"lesson": L, "cluster": c, "sample": f"{L}/{name}", "speech_s": rec["speech_s"],
                          "turns": rec["turns"], "median_f0_hz": rec["median_f0_hz"],
                          "adult_pitch_flag": "yes" if rec["adult_pitch"] else "",
                          "suggestion": sug, "confidence_score": rec["score"], "threshold": a.threshold,
                          "margin_to_runner_up": rec["margin"], "turn_vote_share": rec["turn_vote_share"],
                          "teacher_answer_code_or_adult_or_unknown": "", "teacher_notes": ""})
        t_match = time.time() - t1
        summary[L] = {"minutes_processed": round(secs / 60, 1), "diar_threshold": a.diar_threshold,
                      "diar_model": a.diar_model, "id_model": a.id_model, "id_config": a.id_config,
                      "id_threshold": a.threshold, "clusters": clusters, "n_clusters": len(clusters),
                      "n_suggested": sum(c["suggestion"] != "UNKNOWN" for c in clusters),
                      "n_adult_pitch": sum(bool(c.get("adult_pitch")) for c in clusters),
                      "diar_s_contaminated": round(t_diar, 1), "match_s_contaminated": round(t_match, 1)}
        print(f"{L}: {secs / 60:.1f} min, {len(clusters)} clusters, "
              f"{summary[L]['n_suggested']} suggested, {summary[L]['n_adult_pitch']} adult-pitch; "
              f"diar {t_diar:.0f} s, match {t_match:.0f} s (contaminated)", flush=True)
        (out_dir / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    if sheet:
        p = tc_dir / "check_sheet.csv"
        old = []
        if p.exists():
            with open(p, newline="", encoding="utf-8") as f:
                old = [r for r in csv.DictReader(f) if r["lesson"] not in {s["lesson"] for s in sheet}]
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(sheet[0]))
            w.writeheader()
            w.writerows(old + sheet)
        (tc_dir / "README.txt").write_text(
            "Teacher check for the B2 speaker-identification test (codes only).\n"
            "Each WAV is 10-20 s of one voice group (cluster) found by the computer in a lesson.\n"
            "Listen and write in 'teacher_answer_code_or_adult_or_unknown' the child's CODE (S01...),\n"
            "'adult' (teacher/other adult), 'mixed' (more than one voice) or 'unknown'.\n"
            "'suggestion' is the computer's GUESS, not a fact; UNKNOWN means it would not guess.\n"
            "Do not write real names in this sheet. Delete this folder when done (it is children's audio).\n",
            encoding="utf-8")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("tune")
    p.add_argument("--thresholds", default="0.5,0.6,0.7,0.8,0.9")
    p.add_argument("--mix-sets", default="seed7_ov05_s500,seed7_ov15_s500")
    p.add_argument("--diar-model", default="wes_campp", choices=sorted(EMB) + ["ecapa"])
    p.add_argument("--engine", choices=["own", "sherpa"], default="own",
                   help="own = silero VAD + 1.5 s chunks + AHC; sherpa = pyannote-seg ONNX pipeline (slow here)")
    p.add_argument("--threads", type=int, default=2)
    p.set_defaults(fn=cmd_tune)
    p = sub.add_parser("run")
    p.add_argument("--lessons", default="L1,L2,L3")
    p.add_argument("--minutes", type=float, default=0, help="0 = whole lesson")
    p.add_argument("--diar-threshold", type=float, required=True)
    p.add_argument("--diar-model", default="wes_campp", choices=sorted(EMB) + ["ecapa"])
    p.add_argument("--id-model", required=True)
    p.add_argument("--id-config", required=True)
    p.add_argument("--threshold", type=float, required=True, help="cluster-level UNKNOWN-below threshold from b2_eval")
    p.add_argument("--max-turns", type=int, default=60)
    p.add_argument("--min-cluster-s", type=float, default=10.0, help="smaller clusters are reported but not matched")
    p.add_argument("--sample-s", type=float, default=15.0)
    p.add_argument("--threads", type=int, default=2)
    p.set_defaults(fn=cmd_run)
    ap.add_argument("--no-center", action="store_true", help="cluster raw embeddings (no per-recording mean removal)")
    a = ap.parse_args()
    global CENTER
    CENTER = not a.no_center
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
