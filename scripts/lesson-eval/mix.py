"""Build synthetic labelled "discussions" from HELD-OUT speech of different children.

Reads work\\split\\segments.csv (set == heldout) and the 16 kHz video WAVs.
Each mix: --speakers children (default 3-5), --minutes long (default 3-6),
turns of 1-3 consecutive held-out segments (cut to <= 12 s), next speaker
never the same as the last. Between turns either a gap ~ N(0.4, 0.25) s
(>= 0.05) or, while the overlapped time is below --overlap x speech so far,
an overlap of U(0.3, 1.5) s (capped at half of either turn). Each turn gets a
level of -26 dBFS +- 6 dB (distance from the microphone). Segments are reused
once a child's held-out pool is exhausted (reuse factor is in meta.json).

--degrade s500 then simulates the Anker PowerConf S500 in a room: synthetic
exponential-decay room impulse (RT60 0.35-0.6 s), band-limit 100-7000 Hz,
and background noise cut from non-speech parts of the real lesson recordings
at SNR 12-25 dB. Everything is deterministic for a given --seed.

Outputs under work\\mix\\<tag>\\ per mix <id>:
  <id>.wav          the mixture (16 kHz mono)
  <id>.rttm         ground truth, one SPEAKER line per source speech segment
  <id>.turns.csv    turn_id,start,end,true_code,src_clip,src_start,src_end,overlap_prev_s
  meta.json         settings, speakers per mix, measured overlap fraction, reuse

Open-set tests: list children with --not-enrolled; they are recorded in
meta.json so B2 leaves them out of enrolment and scores them as UNKNOWN.

    python mix.py --n 6 --overlap 0.05 --degrade s500 --seed 7
"""
from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SR, WAV_DIR, WORK, read_wav, safe_out  # noqa: E402
from split import energy_vad  # noqa: E402


def rms_db(x):
    return 10 * np.log10(np.mean(x.astype(np.float64) ** 2) + 1e-12)


def load_pool(seg_csv: Path) -> dict[str, list[dict]]:
    pool: dict[str, list[dict]] = {}
    with open(seg_csv, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["set"] == "heldout":
                pool.setdefault(r["code"], []).append(r)
    return pool


def noise_bank(rng: np.random.Generator, seconds: float = 120.0) -> np.ndarray:
    """Non-speech room noise cut from random 20 s chunks of the lesson WAVs."""
    files = sorted((WAV_DIR / "lessons").glob("*.wav"))
    out, have = [], 0.0
    tries = 0
    while have < seconds and files and tries < 200:
        tries += 1
        p = files[rng.integers(len(files))]
        dur = sf.info(str(p)).duration
        st = float(rng.uniform(0, max(0.0, dur - 20)))
        x, _ = read_wav(p, st, 20.0)
        speech = energy_vad(x, SR, margin_db=6.0, min_speech=0.1, min_gap=0.1)
        keep = np.ones(len(x), bool)
        for s, e in speech:
            keep[max(0, int((s - 0.2) * SR)): int((e + 0.2) * SR)] = False
        # keep only runs of >= 0.5 s of non-speech
        idx = np.flatnonzero(np.diff(np.concatenate([[0], keep.astype(int), [0]])))
        for a, b in zip(idx[::2], idx[1::2]):
            if b - a >= SR // 2:
                out.append(x[a:b])
                have += (b - a) / SR
    return np.concatenate(out) if out else np.zeros(SR, np.float32)


def room_ir(rng: np.random.Generator) -> np.ndarray:
    rt60 = rng.uniform(0.35, 0.6)
    n = int(rt60 * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-6.9 * t / rt60)
    ir[0] = 1.0 / max(1e-3, rng.uniform(0.3, 0.6))  # direct path stronger than the tail
    return (ir / np.sqrt((ir ** 2).sum())).astype(np.float32)


def degrade(x: np.ndarray, rng: np.random.Generator, noise: np.ndarray) -> tuple[np.ndarray, dict]:
    y = fftconvolve(x, room_ir(rng))[: len(x)]
    y = sosfilt(butter(4, [100, 7000], btype="band", fs=SR, output="sos"), y)
    snr = float(rng.uniform(12, 25))
    st = int(rng.integers(0, max(1, len(noise) - 1)))
    nz = np.resize(np.roll(noise, -st), len(y))
    gain = 10 ** ((rms_db(y) - rms_db(nz) - snr) / 20)
    return (y + gain * nz).astype(np.float32), {"snr_db": round(snr, 1)}


def build_one(rng, pool, codes, minutes, overlap, wav_cache):
    target = minutes * 60
    cursor = {c: 0 for c in codes}
    used = {c: 0 for c in codes}
    turns, last, t = [], None, 0.0
    over_s = speech_s = 0.0
    while t < target:
        c = random.Random(int(rng.integers(1 << 30))).choice([k for k in codes if k != last] or codes)
        pieces, dur = [], 0.0
        for _ in range(int(rng.integers(1, 4))):
            seg = pool[c][cursor[c] % len(pool[c])]
            cursor[c] += 1
            used[c] += 1
            s, e = float(seg["start"]), float(seg["end"])
            e = min(e, s + 12.0 - dur)
            if e - s < 0.3:
                break
            pieces.append((seg["clip"], s, e))
            dur += e - s
            if dur >= 12.0:
                break
        if not pieces:
            continue
        ov = 0.0
        if turns and speech_s > 0 and over_s < overlap * speech_s:
            ov = min(float(rng.uniform(0.3, 1.5)), 0.5 * dur, 0.5 * (turns[-1]["end"] - turns[-1]["start"]))
            start = turns[-1]["end"] - ov
        else:
            start = (turns[-1]["end"] if turns else 0.0) + max(0.05, float(rng.normal(0.4, 0.25)))
        gain_db = float(rng.uniform(-6, 6))
        subs, pos = [], start
        for clip, s, e in pieces:
            subs.append({"clip": clip, "src_start": s, "src_end": e, "start": pos, "end": pos + (e - s)})
            pos += (e - s) + 0.12
        turns.append({"code": c, "start": start, "end": subs[-1]["end"], "subs": subs,
                      "gain_db": gain_db, "overlap_prev_s": round(ov, 3)})
        over_s += ov
        speech_s += sum(x["end"] - x["start"] for x in subs)
        last = c
        t = turns[-1]["end"]
    total = turns[-1]["end"] + 0.5
    y = np.zeros(int(total * SR) + 1, np.float32)
    for tr in turns:
        for sb in tr["subs"]:
            key = (tr["code"], sb["clip"])
            if key not in wav_cache:
                wav_cache[key] = read_wav(WAV_DIR / "videos" / f"{tr['code']}_clip{sb['clip']}.wav")[0]
            src = wav_cache[key][int(sb["src_start"] * SR): int(sb["src_end"] * SR)]
            src = src * 10 ** ((-26 + tr["gain_db"] - rms_db(src)) / 20)
            a = int(sb["start"] * SR)
            y[a: a + len(src)] += src
    reuse = {c: round(used[c] / max(1, len(pool[c])), 2) for c in codes}
    return y, turns, reuse


def measured_overlap(turns) -> float:
    ev = []
    for tr in turns:
        for sb in tr["subs"]:
            ev += [(sb["start"], 1), (sb["end"], -1)]
    ev.sort()
    act, prev, sp, ov = 0, None, 0.0, 0.0
    for t, d in ev:
        if prev is not None and act > 0:
            sp += t - prev
            if act > 1:
                ov += t - prev
        act += d
        prev = t
    return ov / sp if sp else 0.0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--segments", type=Path, default=WORK / "split" / "segments.csv")
    ap.add_argument("--out", type=Path, default=WORK / "mix")
    ap.add_argument("--n", type=int, default=6, help="number of mixes")
    ap.add_argument("--speakers", default="3-5", help="children per mix, e.g. 4 or 3-5")
    ap.add_argument("--minutes", default="3-6", help="length per mix, e.g. 4 or 3-6")
    ap.add_argument("--overlap", type=float, default=0.0, help="target overlapped fraction of speech, e.g. 0.05")
    ap.add_argument("--degrade", choices=["none", "s500"], default="none")
    ap.add_argument("--not-enrolled", default="", help="comma list of codes to treat as open-set (recorded in meta)")
    ap.add_argument("--exclude", default="", help="comma list of codes to leave out (e.g. S20,S21: other voices)")
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()

    pool = load_pool(a.segments)
    for c in a.exclude.split(","):
        pool.pop(c.strip(), None)
    codes_all = sorted(pool)
    if len(codes_all) < 2:
        sys.exit("need held-out speech for at least two children (run split.py)")
    rng = np.random.default_rng(a.seed)
    rng_of = lambda s: (int(s.split("-")[0]), int(s.split("-")[-1]))
    tag = f"seed{a.seed}_ov{int(round(a.overlap * 100)):02d}_{a.degrade}"
    out = safe_out(a.out / tag)
    noise = noise_bank(rng) if a.degrade == "s500" else None
    meta = {"seed": a.seed, "overlap_target": a.overlap, "degrade": a.degrade, "excluded": a.exclude,
            "not_enrolled": [c for c in a.not_enrolled.split(",") if c], "mixes": []}
    cache = {}
    for i in range(a.n):
        lo, hi = rng_of(a.speakers)
        k = min(len(codes_all), int(rng.integers(lo, hi + 1)))
        codes = sorted(rng.choice(codes_all, size=k, replace=False).tolist())
        mlo, mhi = rng_of(a.minutes)
        minutes = float(rng.uniform(mlo, mhi))
        y, turns, reuse = build_one(rng, pool, codes, minutes, a.overlap, cache)
        info = {}
        if noise is not None:
            y, info = degrade(y, rng, noise)
        peak = float(np.abs(y).max())
        if peak > 0.99:
            y = y * (0.99 / peak)
        mid = f"mix_{tag}_{i:03d}"
        sf.write(str(safe_out(out / f"{mid}.wav")), y, SR, subtype="PCM_16")
        with open(out / f"{mid}.rttm", "w", encoding="utf-8") as f:
            for tr in turns:
                for sb in tr["subs"]:
                    f.write(f"SPEAKER {mid} 1 {sb['start']:.3f} {sb['end'] - sb['start']:.3f} "
                            f"<NA> <NA> {tr['code']} <NA> <NA>\n")
        with open(out / f"{mid}.turns.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["turn_id", "start", "end", "true_code", "src_clip", "src_start", "src_end", "overlap_prev_s"])
            for j, tr in enumerate(turns):
                w.writerow([f"{mid}_t{j:03d}", f"{tr['start']:.3f}", f"{tr['end']:.3f}", tr["code"],
                            tr["subs"][0]["clip"], f"{tr['subs'][0]['src_start']:.2f}",
                            f"{tr['subs'][-1]['src_end']:.2f}", tr["overlap_prev_s"]])
        m = {"id": mid, "speakers": codes, "minutes": round(len(y) / SR / 60, 2), "turns": len(turns),
             "overlap_measured": round(measured_overlap(turns), 4), "reuse_factor": reuse, **info}
        meta["mixes"].append(m)
        print(f"{mid}: {len(codes)} speakers, {m['minutes']} min, {len(turns)} turns, "
              f"overlap {m['overlap_measured']:.3f}", flush=True)
    (out / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
