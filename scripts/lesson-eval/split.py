"""Split each child's video clips into ENROL and HELD-OUT speech, by speech seconds.

Steps:
  1. VAD on every unique coded video WAV (manifest.csv). Silero VAD from
     faster-whisper (ONNX, ungated) when installed, else an energy VAD.
  2. Each speech segment gets a median F0 (autocorrelation pitch). Segments
     with median F0 below --adult-f0 (default 200 Hz) are flagged
     `low_f0_other_voice` - probably an adult (teacher/parent prompt) - and
     excluded from both sets. This is a heuristic: it misses adult women with
     high voices and other children; clips are NOT assumed single-speaker,
     and B2 must re-check with embeddings.
  3. Remaining segments are grouped into contiguous blocks of >= --block s of
     speech; blocks are shuffled with --seed and dealt to HELD-OUT until it has
     max(--min-heldout, --heldout-frac * total) seconds; the rest is ENROL.
     A child is split only if total speech >= --min-speech (default
     min-enrol + min-heldout); otherwise every block is ENROL ("enrol-only").

Outputs under work\\split\\ : segments.csv (code, clip, start, end, dur,
f0_median, flag, set) and summary.csv (per code). Codes only, no names.

    python split.py                      # defaults, seed 7
    python split.py --min-speech 60 --seed 7
"""
from __future__ import annotations

import argparse
import csv
import random
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SR, WORK, code_of, read_wav, safe_out, video_wavs  # noqa: E402


def vad_segments(x: np.ndarray, sr: int = SR, backend: str = "auto") -> tuple[list[tuple[float, float]], str]:
    if backend in ("auto", "silero"):
        try:
            from faster_whisper.vad import VadOptions, get_speech_timestamps
            ts = get_speech_timestamps(x, VadOptions(min_silence_duration_ms=300, speech_pad_ms=100))
            return [(t["start"] / sr, t["end"] / sr) for t in ts], "silero(faster-whisper)"
        except ImportError:
            if backend == "silero":
                raise
    return energy_vad(x, sr), "energy"


def energy_vad(x: np.ndarray, sr: int = SR, frame: float = 0.03, margin_db: float = 10.0,
               min_speech: float = 0.25, min_gap: float = 0.3) -> list[tuple[float, float]]:
    hop = int(frame * sr)
    n = len(x) // hop
    if n == 0:
        return []
    e = 10 * np.log10((x[: n * hop].reshape(n, hop).astype(np.float64) ** 2).mean(axis=1) + 1e-12)
    thr = np.percentile(e, 20) + margin_db
    on = e > thr
    segs, start = [], None
    for i, v in enumerate(np.append(on, False)):
        if v and start is None:
            start = i
        elif not v and start is not None:
            segs.append([start * frame, i * frame])
            start = None
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_gap:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [(a, b) for a, b in merged if b - a >= min_speech]


def median_f0(x: np.ndarray, sr: int = SR, fmin: float = 70, fmax: float = 500) -> float | None:
    """Median F0 over voiced 40 ms frames (normalised autocorrelation > 0.5)."""
    win, hop = int(0.04 * sr), int(0.01 * sr)
    lo, hi = int(sr / fmax), int(sr / fmin)
    n = (len(x) - win) // hop
    if n <= 0:
        return None
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    fr = x[idx].astype(np.float64)
    fr -= fr.mean(axis=1, keepdims=True)
    e = (fr * fr).sum(axis=1)
    keep = e > 1e-6
    if not keep.any():
        return None
    fr, e = fr[keep], e[keep]
    A = np.fft.irfft(np.abs(np.fft.rfft(fr, n=2 * win, axis=1)) ** 2, axis=1)[:, lo - 1: hi + 1] / e[:, None]
    mid = A[:, 1:-1]
    vals = np.where((mid >= A[:, :-2]) & (mid >= A[:, 2:]), mid, -np.inf)  # local maxima only
    mx = vals.max(axis=1)
    k = (vals >= 0.85 * mx[:, None]).argmax(axis=1)  # shortest strong period: avoids octave-down errors
    voiced = mx > 0.5
    f0s = sr / (lo + k[voiced])
    return float(np.median(f0s)) if len(f0s) >= 5 else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=WORK / "split")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--vad", choices=["auto", "silero", "energy"], default="auto")
    ap.add_argument("--min-enrol", type=float, default=30.0, help="speech s an enrolment needs")
    ap.add_argument("--min-heldout", type=float, default=20.0, help="speech s a held-out set needs")
    ap.add_argument("--min-speech", type=float, default=None, help="total speech s to qualify (default enrol+heldout)")
    ap.add_argument("--heldout-frac", type=float, default=0.4)
    ap.add_argument("--block", type=float, default=8.0, help="speech seconds per contiguous block")
    ap.add_argument("--adult-f0", type=float, default=200.0, help="median F0 below this flags another (adult) voice")
    a = ap.parse_args()
    out = safe_out(a.out)
    min_speech = a.min_speech if a.min_speech is not None else a.min_enrol + a.min_heldout

    rows, summary = [], []
    backend_used = set()
    for code, wavs in video_wavs().items():
        segs = []
        for w in wavs:
            x, sr = read_wav(w)
            vs, be = vad_segments(x, sr, a.vad)
            backend_used.add(be)
            _, clip = code_of(w.stem)
            for s, e in vs:
                f0 = median_f0(x[int(s * sr): int(e * sr)], sr)
                flag = "low_f0_other_voice" if (f0 is not None and f0 < a.adult_f0) else ""
                segs.append({"code": code, "clip": clip, "start": round(s, 2), "end": round(e, 2),
                             "dur": round(e - s, 2), "f0_median": "" if f0 is None else round(f0, 1),
                             "flag": flag, "set": ""})
        usable = [s for s in segs if not s["flag"]]
        total = sum(s["dur"] for s in usable)
        flagged = sum(s["dur"] for s in segs if s["flag"])
        blocks, cur, acc = [], [], 0.0
        for s in usable:
            cur.append(s)
            acc += s["dur"]
            if acc >= a.block:
                blocks.append(cur)
                cur, acc = [], 0.0
        if cur:
            blocks.append(cur)
        heldout = 0.0
        if total >= min_speech:
            target = max(a.min_heldout, a.heldout_frac * total)
            order = list(range(len(blocks)))
            random.Random(f"{a.seed}:{code}").shuffle(order)
            for i in order:
                if heldout >= target:
                    break
                for s in blocks[i]:
                    s["set"] = "heldout"
                heldout += sum(s["dur"] for s in blocks[i])
        for s in usable:
            s["set"] = s["set"] or "enrol"
        for s in segs:
            s["set"] = s["set"] or "excluded"
        status = "split" if total >= min_speech else ("enrol-only" if total >= a.min_enrol else "enrol-only(thin)")
        summary.append({"code": code, "clips": len(wavs), "speech_s": round(total, 1),
                        "flagged_other_voice_s": round(flagged, 1), "segments": len(segs),
                        "enrol_s": round(total - heldout, 1), "heldout_s": round(heldout, 1), "status": status})
        rows.extend(segs)
        print(f"{code} clips={len(wavs)} speech={total:6.1f}s flagged={flagged:5.1f}s "
              f"enrol={total - heldout:6.1f}s heldout={heldout:5.1f}s {status}", flush=True)

    with open(out / "segments.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    with open(out / "summary.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(summary[0].keys()))
        w.writeheader()
        w.writerows(summary)
    n_split = sum(1 for s in summary if s["status"] == "split")
    print(f"VAD={','.join(sorted(backend_used))} seed={a.seed} min_speech={min_speech}s "
          f"children={len(summary)} with held-out={n_split}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
