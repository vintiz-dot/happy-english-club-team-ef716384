"""Confirm by cross-correlation which lesson WAVs are the same recording.

Method (memory-safe for 139-minute files):
  1. Each 16 kHz WAV is streamed in blocks and reduced to a 100 Hz log-energy
     envelope (10 ms frames), floored at -60 dB below its peak and high-passed
     by subtracting a 3 s moving average (keeps syllable rhythm, drops gain).
  2. K windows (default 12 x 60 s) evenly spaced across file A are each
     searched over the WHOLE of file B with normalised cross-correlation
     (FFT), giving per-window peak NCC, lag, and peak-to-sidelobe ratio.
  3. For windows that match, the lag is refined on the raw 16 kHz waveform
     (5 s of A vs B at +-0.25 s), giving a sample-accurate lag and waveform NCC.
  4. Drift = slope of a straight-line fit of refined lag against position
     (ms per hour) and last-minus-first lag.

Verdict per ordered pair:
  SAME       >= 75 % of non-silent windows match (NCC >= 0.6, PSR >= 1.5) and
             their refined lags fit a line within 50 ms residual
  A_CONTAINED_IN_B  as SAME, but B is more than a minute longer than A
  PARTIAL    some windows match consistently, fewer than 75 % (A contains a
             stretch of B: `match_span_a_s` gives the first/last matched window)
  DIFFERENT  no window matches
Every pair of lesson files is tested; unrelated pairs are the negative controls.

    python confirm_pairs.py                    # all pairs of work\\wav16k\\lessons
    python confirm_pairs.py --windows 20 --win 45
"""
from __future__ import annotations

import argparse
import itertools
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import WAV_DIR, WORK, is_forbidden, safe_out  # noqa: E402

FPS = 100  # envelope frames per second


def envelope(path: Path) -> np.ndarray:
    info = sf.info(str(path))
    hop = info.samplerate // FPS
    out = []
    rest = np.zeros(0, dtype=np.float32)
    for block in sf.blocks(str(path), blocksize=hop * 6000, dtype="float32", always_2d=True):
        x = np.concatenate([rest, block.mean(axis=1)])
        n = len(x) // hop
        fr = x[: n * hop].reshape(n, hop)
        out.append(np.log10((fr.astype(np.float64) ** 2).mean(axis=1) + 1e-12) * 10)
        rest = x[n * hop:]
    e = np.concatenate(out)
    e = np.maximum(e, e.max() - 60.0)
    k = 3 * FPS
    ma = np.convolve(e, np.ones(k) / k, mode="same")
    return (e - ma).astype(np.float64)


def ncc_search(w: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Normalised cross-correlation of template w at every offset in b ('valid')."""
    m = len(w)
    w = w - w.mean()
    wn = np.sqrt((w ** 2).sum())
    num = fftconvolve(b, w[::-1], mode="valid")
    c1 = np.concatenate([[0.0], np.cumsum(b)])
    c2 = np.concatenate([[0.0], np.cumsum(b * b)])
    s1 = c1[m:] - c1[:-m]
    s2 = c2[m:] - c2[:-m]
    var = np.maximum(s2 - s1 * s1 / m, 1e-12)
    return num / (wn * np.sqrt(var) + 1e-12)


def refine(a_path: Path, b_path: Path, t_a: float, lag: float, seg: float = 5.0, span: float = 0.25):
    """Sample-accurate lag (s) and waveform NCC around a coarse envelope lag."""
    sr = sf.info(str(a_path)).samplerate
    a, _ = sf.read(str(a_path), start=int(t_a * sr), frames=int(seg * sr), dtype="float32", always_2d=True)
    a = a.mean(axis=1).astype(np.float64)
    b0 = t_a + lag - span
    if b0 < 0:
        return None, None
    b, _ = sf.read(str(b_path), start=int(b0 * sr), frames=int((seg + 2 * span) * sr), dtype="float32", always_2d=True)
    b = b.mean(axis=1).astype(np.float64)
    if len(b) < len(a) + 1 or a.std() < 1e-6:
        return None, None
    c = ncc_search(a, b)
    i = int(np.argmax(np.abs(c)))
    return b0 + i / sr - t_a, float(c[i])


def compare(a_path: Path, b_path: Path, ea, eb, n_win: int, win_s: float) -> dict:
    m = int(win_s * FPS)
    dur_a = len(ea) / FPS
    if len(eb) <= m or len(ea) <= m:
        return {"verdict": "TOO_SHORT"}
    starts = np.linspace(0, len(ea) - m, n_win).astype(int)
    wins = []
    for s in starts:
        w = ea[s: s + m]
        if w.std() < 1.0:  # near-silent window: cannot be matched
            wins.append({"t_a": s / FPS, "silent": True})
            continue
        c = ncc_search(w, eb)
        i = int(np.argmax(c))
        peak = float(c[i])
        mask = np.ones_like(c, dtype=bool)
        mask[max(0, i - 5 * FPS): i + 5 * FPS] = False
        side = float(np.abs(c[mask]).max()) if mask.any() else 0.0
        wins.append({"t_a": s / FPS, "silent": False, "ncc": round(peak, 3),
                     "lag_s": round((i - s) / FPS, 2), "psr": round(peak / max(side, 1e-3), 2)})
    live = [w for w in wins if not w["silent"]]
    # Unrelated speech envelopes correlate up to ~0.4 anywhere (measured on the negative
    # controls), so a true match is NCC >= 0.6 standing >= 1.5x above every other offset.
    matched = [w for w in live if w["ncc"] >= 0.6 and w["psr"] >= 1.5]
    for w in matched:
        lag, wncc = refine(a_path, b_path, w["t_a"] + win_s / 2, w["lag_s"])
        w["lag_fine_s"] = None if lag is None else round(lag, 5)
        w["wave_ncc"] = None if wncc is None else round(wncc, 3)
    fine = [w for w in matched if w.get("lag_fine_s") is not None]
    res = {"a": a_path.name, "b": b_path.name, "dur_a_min": round(dur_a / 60, 2),
           "dur_b_min": round(len(eb) / FPS / 60, 2), "windows": len(wins),
           "non_silent": len(live), "matched": len(matched),
           "median_ncc_all": round(float(np.median([w["ncc"] for w in live])), 3) if live else None,
           "max_ncc_all": round(float(max(w["ncc"] for w in live)), 3) if live else None}
    consistent = False
    if len(fine) >= 2:
        t = np.array([w["t_a"] for w in fine])
        lg = np.array([w["lag_fine_s"] for w in fine])
        slope, icpt = np.polyfit(t, lg, 1)
        resid = float(np.abs(lg - (slope * t + icpt)).max())
        consistent = resid <= 0.05
        res.update({"lag_first_s": float(lg[0]), "lag_last_s": float(lg[-1]),
                    "drift_ms_per_hour": round(slope * 3600 * 1000, 2),
                    "drift_total_ms": round((lg[-1] - lg[0]) * 1000, 2),
                    "fit_residual_ms": round(resid * 1000, 2),
                    "median_wave_ncc": round(float(np.median([w["wave_ncc"] for w in fine])), 3)})
    elif len(fine) == 1:
        res.update({"lag_first_s": fine[0]["lag_fine_s"], "lag_last_s": fine[0]["lag_fine_s"]})
    if matched:
        res["median_ncc_matched"] = round(float(np.median([w["ncc"] for w in matched])), 3)
        res["match_span_a_s"] = [matched[0]["t_a"], matched[-1]["t_a"] + win_s]
        res["matched_fraction"] = round(len(matched) / len(live), 3)
    if not matched:
        verdict = "DIFFERENT"
    elif live and len(matched) >= 0.75 * len(live) and (consistent or len(fine) == 1):
        verdict = "SAME"
    else:
        verdict = "PARTIAL" if (consistent or len(fine) <= 1) else "INCONSISTENT"
    if verdict == "SAME" and res["dur_b_min"] - res["dur_a_min"] > 1.0:
        verdict = "A_CONTAINED_IN_B"  # all of A is found in a longer B
    res["verdict"] = verdict
    res["per_window"] = wins
    return res


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", type=Path, default=WAV_DIR / "lessons", help="folder of 16 kHz WAVs")
    ap.add_argument("--out", type=Path, default=WORK / "pairs" / "confirm_pairs.json")
    ap.add_argument("--windows", type=int, default=12)
    ap.add_argument("--win", type=float, default=60.0, help="window length in seconds")
    a = ap.parse_args()
    out = safe_out(a.out)

    files = sorted(p for p in a.dir.glob("*.wav") if not is_forbidden(p) and ".part." not in p.name)
    env = {}
    for p in files:
        print(f"envelope {p.name}", flush=True)
        env[p] = envelope(p)
    results = []
    for pa, pb in itertools.permutations(files, 2):
        r = compare(pa, pb, env[pa], env[pb], a.windows, a.win)
        results.append(r)
        print(f"{pa.name:28s} -> {pb.name:28s} {r['verdict']:10s} matched {r.get('matched')}/{r.get('non_silent')} "
              f"maxNCC {r.get('max_ncc_all')} lag {r.get('lag_first_s')} drift_ms/h {r.get('drift_ms_per_hour')} "
              f"waveNCC {r.get('median_wave_ncc')}", flush=True)
    out.write_text(json.dumps(results, indent=1), encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
