"""First identification baseline: SpeechBrain ECAPA voiceprints scored on the synthetic mixes.

Oracle segmentation (ground-truth turn boundaries from <mix>.turns.csv), so this
measures identification alone, not diarization. Steps:
  1. ENROL: for every child with >= --min-enrol s of ENROL speech (split.py),
     embed up to --enrol-cap s in 3 s windows; the voiceprint is the mean of the
     L2-normalised window embeddings. Saved ONLY under work\\voiceprints\\ as
     <code>.voiceprint.npy (biometric data: delete with delete_voiceprints.py).
  2. OPEN SET: --open N children that have held-out speech are NOT enrolled
     (seeded choice); their turns are correct only as UNKNOWN.
  3. Each mix turn is embedded and compared (cosine) with every voiceprint; the
     best code and its score form the suggestion. A turn whose source segment
     (src_clip, src_start) was already scored is skipped (mixes reuse segments).
  4. Writes work\\ident\\<tag>.ident.csv (turn_id,true_code,pred_code,score,enrolled)
     for `score.py ident`. The score is a suggestion; nothing is linked.

    python ident_ecapa.py --mixes work\\mix\\seed7_ov05_s500 --open 3 --seed 7
"""
from __future__ import annotations

import argparse
import csv
import os
import random
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, SR, WAV_DIR, WORK, read_wav, safe_out  # noqa: E402

MODELS = ROOT / "models"
os.environ.setdefault("HF_HOME", str(MODELS / "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
WIN = 3 * SR


def encoder():
    from speechbrain.inference.speaker import EncoderClassifier
    from speechbrain.utils.fetching import LocalStrategy
    return EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb",
                                          savedir=str(MODELS / "speechbrain" / "spkrec-ecapa-voxceleb"),
                                          run_opts={"device": "cpu"}, local_strategy=LocalStrategy.COPY)


def embed(enc, x: np.ndarray) -> np.ndarray:
    """Mean of L2-normalised 3 s window embeddings (one window if shorter)."""
    import torch
    if len(x) < SR // 2:
        x = np.pad(x, (0, SR // 2 - len(x)))
    chunks = [x[i: i + WIN] for i in range(0, max(1, len(x) - WIN + 1), WIN)] if len(x) >= WIN else [x]
    with torch.no_grad():
        e = enc.encode_batch(torch.tensor(np.stack(chunks))).squeeze(1).numpy()
    e /= np.linalg.norm(e, axis=1, keepdims=True) + 1e-9
    v = e.mean(0)
    return v / (np.linalg.norm(v) + 1e-9)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mixes", type=Path, action="append", required=True, help="mix folder(s), repeatable")
    ap.add_argument("--segments", type=Path, default=WORK / "split" / "segments.csv")
    ap.add_argument("--voiceprints", type=Path, default=WORK / "voiceprints")
    ap.add_argument("--out", type=Path, default=WORK / "ident")
    ap.add_argument("--min-enrol", type=float, default=20.0)
    ap.add_argument("--enrol-cap", type=float, default=60.0)
    ap.add_argument("--open", type=int, default=3, help="children with held-out speech left un-enrolled")
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    vp_dir, out = safe_out(a.voiceprints), safe_out(a.out)

    enrol, heldout_codes = {}, set()
    with open(a.segments, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["set"] == "enrol":
                enrol.setdefault(r["code"], []).append(r)
            elif r["set"] == "heldout":
                heldout_codes.add(r["code"])
    open_set = set(random.Random(a.seed).sample(sorted(heldout_codes), min(a.open, len(heldout_codes))))
    enc = encoder()
    prints = {}
    for code, segs in sorted(enrol.items()):
        if code in open_set or sum(float(s["dur"]) for s in segs) < a.min_enrol:
            continue
        cache, parts, have = {}, [], 0.0
        for s in segs:
            if have >= a.enrol_cap:
                break
            if s["clip"] not in cache:
                cache[s["clip"]] = read_wav(WAV_DIR / "videos" / f"{code}_clip{s['clip']}.wav")[0]
            x = cache[s["clip"]][int(float(s["start"]) * SR): int(float(s["end"]) * SR)]
            parts.append(x)
            have += len(x) / SR
        v = embed(enc, np.concatenate(parts))
        np.save(vp_dir / f"{code}.voiceprint.npy", v)
        prints[code] = v
        print(f"enrolled {code} ({have:.0f} s)", flush=True)
    codes = sorted(prints)
    M = np.stack([prints[c] for c in codes])
    print(f"enrolled {len(codes)}; open-set (not enrolled): {' '.join(sorted(open_set))}", flush=True)

    for mdir in a.mixes:
        tag = mdir.name
        rows, seen = [], set()
        for tf in sorted(mdir.glob("*.turns.csv")):
            mix, _ = read_wav(tf.with_name(tf.name.replace(".turns.csv", ".wav")))
            with open(tf, newline="", encoding="utf-8") as f:
                for t in csv.DictReader(f):
                    key = (t["true_code"], t["src_clip"], t["src_start"])
                    if key in seen:
                        continue
                    seen.add(key)
                    v = embed(enc, mix[int(float(t["start"]) * SR): int(float(t["end"]) * SR)])
                    s = M @ v
                    k = int(np.argmax(s))
                    rows.append({"turn_id": t["turn_id"], "true_code": t["true_code"], "pred_code": codes[k],
                                 "score": f"{float(s[k]):.4f}", "enrolled": int(t["true_code"] in prints)})
        with open(out / f"{tag}.ident.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["turn_id", "true_code", "pred_code", "score", "enrolled"])
            w.writeheader()
            w.writerows(rows)
        print(f"{tag}: {len(rows)} unique turns scored -> {out / (tag + '.ident.csv')}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
