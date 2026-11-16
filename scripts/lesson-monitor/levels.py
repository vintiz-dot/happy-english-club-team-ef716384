"""Per-second sound levels of the two microphones, and what they can be used for (pure).

The recorder keeps two tracks: `teacher` (the lapel, close to the teacher)
and `room` (the S500). Per second we keep the RMS level and the peak, in dBFS.
From those:

  * active(): "someone is speaking near this microphone" - the level is at least
    RISE_DB above the track's own quiet floor (its 10th percentile). An
    ESTIMATE: it misses quiet speech and lets some noise through (design s.10).
  * label_seconds(): per second, T (teacher), O (others) or '-' (no speech),
    by how much more the lapel rose above its floor than the room did. The
    lapel is close to the teacher, so when the teacher speaks it rises far
    more than the room; when a child speaks, the room rises more. Children
    next to the teacher reach the lapel too, which is why this is checked by a
    teacher in step 0 before it is ever shown, and shown as a RANGE.
  * talk_split(): teacher / others share of speaking seconds, as a range over
    three margins (3, 6, 9 dB), rounded outwards to 5 %.
  * runs(): stretches of a mask (for silences and unwritten speech).
"""
from __future__ import annotations

import math

import numpy as np

SILENT_DB = -100.0
RISE_DB = 10.0
MARGINS_DB = (3.0, 6.0, 9.0)
MID_MARGIN_DB = 6.0
CLIP_DB = -0.1


class LevelMeter:
    """Accumulates per-second RMS and peak for one track, chunk by chunk, at
    the track's own sample rate, positioned by each chunk's start time."""

    def __init__(self, sr: int):
        self.sr = sr
        self.sumsq = np.zeros(0, dtype=np.float64)
        self.count = np.zeros(0, dtype=np.int64)
        self.peak = np.zeros(0, dtype=np.float64)

    def _grow(self, n: int) -> None:
        if n > len(self.sumsq):
            extra = n - len(self.sumsq)
            self.sumsq = np.concatenate([self.sumsq, np.zeros(extra)])
            self.count = np.concatenate([self.count, np.zeros(extra, dtype=np.int64)])
            self.peak = np.concatenate([self.peak, np.zeros(extra)])

    def add(self, x: np.ndarray, start_s: float) -> None:
        if len(x) == 0:
            return
        first = int(round(start_s * self.sr))
        sec = (first + np.arange(len(x))) // self.sr
        self._grow(int(sec[-1]) + 1)
        x64 = x.astype(np.float64)
        np.add.at(self.sumsq, sec, x64 * x64)
        np.add.at(self.count, sec, 1)
        np.maximum.at(self.peak, sec, np.abs(x64))

    def result(self) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """(rms_db, peak_db, covered): covered = the second holds audio at all."""
        covered = self.count > 0
        with np.errstate(divide="ignore", invalid="ignore"):
            rms = np.sqrt(np.where(covered, self.sumsq / np.maximum(self.count, 1), 0.0))
            rms_db = np.where(rms > 0, 20 * np.log10(rms), SILENT_DB)
            peak_db = np.where(self.peak > 0, 20 * np.log10(self.peak), SILENT_DB)
        return rms_db, peak_db, covered


def floor_db(db: np.ndarray, covered: np.ndarray | None = None) -> float:
    v = db[covered] if covered is not None else db
    v = v[v > SILENT_DB]
    return float(np.percentile(v, 10)) if len(v) else SILENT_DB


def active(db: np.ndarray, covered: np.ndarray | None = None, rise: float = RISE_DB) -> np.ndarray:
    f = floor_db(db, covered)
    a = db >= f + rise
    if covered is not None:
        a &= covered
    return a


def label_seconds(teacher_db: np.ndarray, room_db: np.ndarray, margin: float = MID_MARGIN_DB,
                  teacher_cov: np.ndarray | None = None, room_cov: np.ndarray | None = None) -> np.ndarray:
    """Per second: 'T', 'O' or '-'. Both arrays are the same seconds."""
    n = min(len(teacher_db), len(room_db))
    t, r = teacher_db[:n], room_db[:n]
    tc = teacher_cov[:n] if teacher_cov is not None else None
    rc = room_cov[:n] if room_cov is not None else None
    t_rise = t - floor_db(t, tc)
    r_rise = r - floor_db(r, rc)
    speech = active(t, tc) | active(r, rc)
    out = np.full(n, "-", dtype="<U1")
    out[speech & (t_rise - r_rise >= margin)] = "T"
    out[speech & (t_rise - r_rise < margin)] = "O"
    return out


def _round_out(lo: float, hi: float, step: int = 5) -> tuple[int, int]:
    return int(math.floor(lo / step) * step), int(min(100, math.ceil(hi / step) * step))


def talk_split(teacher_db: np.ndarray, room_db: np.ndarray, teacher_cov=None, room_cov=None,
               margins=MARGINS_DB) -> dict | None:
    """Teacher / others share of speaking seconds, as ranges. None if there is no speech."""
    shares = []
    speech_s = 0
    for m in margins:
        lab = label_seconds(teacher_db, room_db, m, teacher_cov, room_cov)
        sp = int(np.sum(lab != "-"))
        if sp == 0:
            return None
        speech_s = sp
        shares.append(100.0 * float(np.sum(lab == "T")) / sp)
    lo, hi = _round_out(min(shares), max(shares))
    return {"teacher_pct": [lo, hi], "others_pct": [100 - hi, 100 - lo], "speech_seconds": speech_s}


def timeline(labels: np.ndarray, step: int = 10) -> str:
    """One letter per `step` seconds: the majority of its speaking seconds, '-' if none."""
    out = []
    for i in range(0, len(labels), step):
        w = labels[i:i + step]
        t, o = int(np.sum(w == "T")), int(np.sum(w == "O"))
        out.append("-" if t + o == 0 else ("T" if t >= o else "O"))
    return "".join(out)


def runs(mask: np.ndarray, min_len: float = 1, merge_gap: float = 0) -> list[tuple[int, int]]:
    """[(start, end)) index runs where mask is true; gaps up to merge_gap are bridged."""
    out: list[list[int]] = []
    i, n = 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            if out and i - out[-1][1] <= merge_gap:
                out[-1][1] = j
            else:
                out.append([i, j])
            i = j
        else:
            i += 1
    return [(a, b) for a, b in out if b - a >= min_len]


def clipped_minutes(peak_db: np.ndarray, thr: float = CLIP_DB, per_minute: int = 3) -> int:
    """Minutes holding at least `per_minute` seconds that reach full scale."""
    hits = peak_db >= thr
    return int(sum(1 for i in range(0, len(hits), 60) if int(np.sum(hits[i:i + 60])) >= per_minute))
