"""B2 step 1: cut every audio unit the identification experiments need, once.

Reads work\\split\\segments.csv and the 16 kHz child clips. Writes ONE file,
work\\b2\\units.npz (derived children's audio: stays under work\\, removed by
delete_all_derived.py), holding int16 audio + metadata for these units:

  enrol  3 s windows of the child's ENROL speech (VAD segments, adult-pitch
         segments already removed by split.py), in file order; `pos` = seconds of
         enrolment speech before the window, so a 10/20/40 s voiceprint uses the
         windows with pos < 10/20/40.
  raw    3 s windows of the first 60 s of the raw clip(s): no VAD, no pitch
         filter - what enrolment would be with no clean-up at all.
  flag   3 s windows of the segments split.py flagged as adult pitch (< 200 Hz),
         up to 60 s per clip: the "other voice" in the child's clip.
  test   windows of HELD-OUT speech (never used for enrolment) of length
         L = 1, 2, 4, 8 s (standing for the turn-length bins <1.5, 1.5-3, 3-6,
         >6 s), non-overlapping, per condition:
           clean       as recorded (close-mic video audio)
           s500        mix.py's simulated room: RIR (RT60 0.35-0.6 s), 100-7000 Hz,
                       real lesson background noise at SNR 12-25 dB
           s500_ov05   another child's held-out speech over the last 5 % of the
           s500_ov15   window (15 %), level -3..+3 dB, then the same room
         ov05/ov15 are cut for L = 2 and 4 only (cost).

S23 is EXCLUDED from everything: split.py found no child-pitch speech in its clip
(median 134 Hz), so there is nothing to call S23's voice. Deterministic for --seed.

    python b2_units.py --seed 11
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SR, WAV_DIR, WORK, read_wav, safe_out  # noqa: E402
from mix import degrade, noise_bank  # noqa: E402

EXCLUDE = {"S23"}
LENGTHS = (1.0, 2.0, 4.0, 8.0)
OV_LENGTHS = (2.0, 4.0)


def windows(x: np.ndarray, win: float, keep_partial: float | None = None):
    n = int(win * SR)
    out = [(i, x[i: i + n]) for i in range(0, len(x) - n + 1, n)]
    if keep_partial is not None:
        rest = len(x) - (len(x) // n) * n
        if rest >= keep_partial * SR:
            i = (len(x) // n) * n
            out.append((i, x[i:]))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--segments", type=Path, default=WORK / "split" / "segments.csv")
    ap.add_argument("--out", type=Path, default=WORK / "b2" / "units.npz")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--resplit", choices=["none", "time"], default="time",
                    help="time (default): re-split each child's clean speech by time, see code")
    ap.add_argument("--enrol-frac", type=float, default=0.6)
    ap.add_argument("--min-split", type=float, default=50.0)
    ap.add_argument("--merge-gap", type=float, default=0.8, help="join same-set segments across pauses shorter than this")
    a = ap.parse_args()
    out = safe_out(a.out)
    rng = np.random.default_rng(a.seed)
    segs: dict[tuple[str, str], list[dict]] = {}
    clips: dict[str, set] = {}
    with open(a.segments, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["code"] in EXCLUDE:
                continue
            segs.setdefault((r["code"], r["set"]), []).append(r)
            clips.setdefault(r["code"], set()).add(r["clip"])
    if a.resplit == "time":
        # split.py gave the long contiguous 5 s blocks to HELD-OUT and left enrolment
        # the short fragments between them (measured: enrol->enrol 19 % top-1, held-out
        # ->held-out 78 %). A time split gives both sides whole utterances: the first
        # --enrol-frac of a child's clean speech enrols, the rest (a later part of the
        # recording, disjoint) is test. Children under --min-split s stay enrol-only.
        for code in list(clips):
            rows = sorted(segs.pop((code, "enrol"), []) + segs.pop((code, "heldout"), []),
                          key=lambda r: (int(r["clip"]), float(r["start"])))
            total = sum(float(r["dur"]) for r in rows)
            if total < a.min_split:
                segs[(code, "enrol")] = rows
                continue
            cum, en, ho = 0.0, [], []
            for r in rows:
                (en if cum < a.enrol_frac * total else ho).append(r)
                cum += float(r["dur"])
            segs[(code, "enrol")], segs[(code, "heldout")] = en, ho
            print(f"{code}: time split enrol {sum(float(r['dur']) for r in en):.1f} s / "
                  f"test {sum(float(r['dur']) for r in ho):.1f} s", flush=True)
    if a.merge_gap > 0:
        # Merge VAD segments of the same set separated by a pause < merge_gap s into one
        # utterance, keeping the pause (contiguous audio, no splice), unless an
        # adult-pitch segment lies in between. silero cut the speech into short pieces;
        # windows that must fit inside one piece were nearly all 1-2 s.
        adult = {}
        for (code, s), rows in segs.items():
            if s == "excluded":
                for r in rows:
                    adult.setdefault((code, r["clip"]), []).append((float(r["start"]), float(r["end"])))
        for key in [k for k in segs if k[1] in ("enrol", "heldout")]:
            rows = sorted(segs[key], key=lambda r: (int(r["clip"]), float(r["start"])))
            mrg = []
            for r in rows:
                if mrg and mrg[-1]["clip"] == r["clip"]:
                    gs, ge = float(mrg[-1]["end"]), float(r["start"])
                    blocked = any(s < ge and e > gs for s, e in adult.get((key[0], r["clip"]), []))
                    if 0 <= ge - gs < a.merge_gap and not blocked:
                        mrg[-1] = {**mrg[-1], "end": r["end"],
                                   "dur": str(float(mrg[-1]["dur"]) + float(r["dur"]))}
                        continue
                mrg.append(dict(r))
            segs[key] = mrg
    cache = {}

    def wav(code, clip):
        if (code, clip) not in cache:
            cache[(code, clip)] = read_wav(WAV_DIR / "videos" / f"{code}_clip{clip}.wav")[0]
        return cache[(code, clip)]

    def cat(rows, cap=None):
        parts, have = [], 0.0
        for r in rows:
            x = wav(r["code"], r["clip"])[int(float(r["start"]) * SR): int(float(r["end"]) * SR)]
            parts.append(x)
            have += len(x) / SR
            if cap and have >= cap:
                break
        return np.concatenate(parts) if parts else np.zeros(0, np.float32)

    def per_segment(rows, win, min_len, cap=None):
        """Windows cut INSIDE each VAD segment, never across a splice: (pos, audio).
        A segment shorter than `win` gives one window if it is >= min_len.
        (The first cut concatenated segments before windowing. Splicing many short
        fragments made every child's enrolment look alike - see the evidence file.)"""
        out, have = [], 0.0
        for r in rows:
            x = wav(r["code"], r["clip"])[int(float(r["start"]) * SR): int(float(r["end"]) * SR)]
            n = int(win * SR)
            pieces = [x[i: i + n] for i in range(0, len(x) - n + 1, n)] or ([x] if len(x) >= min_len * SR else [])
            rest = len(x) - (len(x) // n) * n
            if len(x) >= n and rest >= min_len * SR and min_len < win:
                pieces.append(x[-rest:])
            for p in pieces:
                out.append((have, p))
                have += len(p) / SR
            if cap and have >= cap:
                break
        return out

    meta, audio = [], []

    def add(kind, code, x, L=0.0, cond="", pos=0.0, idx=0):
        meta.append((kind, code, L, cond, pos, idx, len(x) / SR))
        audio.append(np.clip(x * 32767, -32768, 32767).astype(np.int16))

    codes = sorted(clips)
    for code in codes:
        for pos, w in per_segment(segs.get((code, "enrol"), []), 3.0, 1.0):
            add("enrol", code, w, pos=pos)
        raw = np.concatenate([wav(code, c) for c in sorted(clips[code], key=int)])[: 60 * SR]
        for i, w in windows(raw, 3.0):
            add("raw", code, w, pos=i / SR)
        fl = [r for r in segs.get((code, "excluded"), []) if r.get("flag")]
        if fl:
            for pos, w in per_segment(fl, 3.0, 1.0, cap=60):
                add("flag", code, w, pos=pos)
    print(f"enrol/raw/flag units: {len(meta)}", flush=True)

    noise = noise_bank(rng)
    held = {c: cat(segs[(c, "heldout")]) for c in codes if (c, "heldout") in segs}
    hcodes = sorted(held)
    for code in hcodes:
        for L in LENGTHS:
            for idx, (pos, w) in enumerate(per_segment(segs[(code, "heldout")], L, L)):
                add("test", code, w, L, "clean", pos, idx)
                y, _ = degrade(w, rng, noise)
                add("test", code, y, L, "s500", pos, idx)
                if L in OV_LENGTHS:
                    for p, tag in ((0.05, "s500_ov05"), (0.15, "s500_ov15")):
                        other = hcodes[(hcodes.index(code) + 1 + int(rng.integers(len(hcodes) - 1))) % len(hcodes)]
                        src = held[other]
                        n = max(1, int(p * len(w)))
                        st = int(rng.integers(0, max(1, len(src) - n)))
                        intr = src[st: st + n]
                        intr = intr * (np.sqrt(np.mean(w ** 2) / (np.mean(intr ** 2) + 1e-12)) *
                                       10 ** (float(rng.uniform(-3, 3)) / 20))
                        z = w.copy()
                        z[-len(intr):] += intr
                        y, _ = degrade(z, rng, noise)
                        add("test", code, y, L, tag, pos, idx)
        print(f"{code}: held-out {len(held[code]) / SR:.1f} s", flush=True)
    lens = np.array([len(x) for x in audio])
    offs = np.concatenate([[0], np.cumsum(lens)[:-1]])
    m = np.array(meta, dtype=object)
    np.savez(out, audio=np.concatenate(audio), offs=offs, lens=lens,
             kind=m[:, 0].astype(str), code=m[:, 1].astype(str), L=m[:, 2].astype(float),
             cond=m[:, 3].astype(str), pos=m[:, 4].astype(float), idx=m[:, 5].astype(int),
             dur=m[:, 6].astype(float), seed=a.seed)
    kinds, counts = np.unique(m[:, 0].astype(str), return_counts=True)
    print("units:", dict(zip(kinds, counts.tolist())), f"total audio {lens.sum() / SR / 60:.1f} min -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
