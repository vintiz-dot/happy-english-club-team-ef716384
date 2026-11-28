"""Put each Lark transmitter's track on the lesson's timeline (owner, 28 Nov 2026; pure numpy/scipy).

The four Hollyland LARK MAX 2 transmitters record on their own clocks: their files start whenever each was switched
on and their crystals run a little fast or slow (tens of ppm: about 0.1-0.4 s over a 2-hour lesson). The room (S500)
and teacher (GCK lapel) tracks share the recorder's clock, so the ROOM track is the reference and every mic track is
mapped onto it with

    mic_time = offset_s + (1 + drift_ppm * 1e-6) * room_time

found in three steps:
  1. a first guess: the transmitter's own start time / timecode when the import gives one, else the three sharp claps
     the teacher makes at the start (a broadband spike, three in a row; the same three at the end check the fit), else
     the cross-correlation of the two tracks' loudness envelopes;
  2. GCC-PHAT (speech band, 200-4000 Hz) on many 20-second windows of shared sound around that guess: the teacher's
     voice reaches every mic, so most windows find the true lag;
  3. a robust straight-line fit (RANSAC) of those lags: offset + drift, the residual in ms, and the windows it kept.

A track whose fit is bad is REJECTED with a short reason code (the report's settings carry it) and left out of the
lesson: a mic on the wrong time would put a child's words on the wrong line. Sound travels about 3 ms a metre, so a
residual of a few ms is the room, not an error: attribution works on 100 ms frames.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np

SETTINGS = {
    "win_s": 20.0,            # GCC-PHAT window
    "hop_s": 45.0,            # one window every this many seconds of the reference
    "margin_s": 1.5,          # search +- this around the predicted lag (covers 200 ppm over 2 h)
    "band_hz": (200.0, 4000.0),
    "min_psr": 5.0,           # a window counts only when its correlation peak stands this far above the rest
    "inlier_ms": 6.0,         # RANSAC: a window within this of the line agrees (2 m of room is 6 ms)
    "min_inliers": 5,
    "min_inlier_frac": 0.35,
    "max_residual_ms": 12.0,  # rms of the kept windows around the line; worse = rejected
    "max_drift_ppm": 300.0,   # crystals are tens of ppm; more is a wrong fit
    "clap_check_ms": 25.0,    # the end claps must sit this close to the fitted line
    "ransac_iters": 400,
}


@dataclass
class Fit:
    track: str
    ok: bool
    offset_s: float | None = None
    drift_ppm: float | None = None
    residual_ms: float | None = None
    windows: int = 0
    inliers: int = 0
    method: str = ""
    reason: str | None = None
    claps: dict = field(default_factory=dict)

    def mic_time(self, t):
        return self.offset_s + (1.0 + self.drift_ppm * 1e-6) * np.asarray(t, dtype=np.float64)

    def summary(self) -> dict:
        d = asdict(self)
        for k in ("offset_s",):
            if d[k] is not None:
                d[k] = round(d[k], 4)
        for k in ("drift_ppm", "residual_ms"):
            if d[k] is not None:
                d[k] = round(d[k], 2)
        return d


# ------------------------------------------------------------------ claps
def _frame_db(x: np.ndarray, sr: int, frame_s: float, lo_hz: float | None = None) -> np.ndarray:
    if lo_hz:
        from scipy.signal import butter, sosfilt
        x = sosfilt(butter(4, lo_hz, "highpass", fs=sr, output="sos"), x)
    n = int(sr * frame_s)
    k = len(x) // n
    if k == 0:
        return np.zeros(0)
    e = np.mean(np.square(x[: k * n].reshape(k, n), dtype=np.float64), axis=1)
    return 10 * np.log10(e + 1e-12)


def find_claps(x: np.ndarray, sr: int, above_db: float = 12.0, frame_s: float = 0.005) -> list[float]:
    """Times (s) of sharp broadband spikes. A clap's high band (>2 kHz) stands above_db over the LOUD speech of the
    30 seconds before it (90th percentile of 50 ms maxima), and has risen 8 dB within 40 ms and fallen 15 dB 40 ms later. A syllable can rise as
    fast as a clap after a pause, but it is not 12 dB louder than the half-minute of speech around it. A stray loud
    spike (a dropped book) is fine: only three in a row with matching gaps on both tracks are used."""
    db = _frame_db(np.asarray(x, dtype=np.float64), sr, frame_s, lo_hz=2000.0)
    if len(db) < 500:
        return []
    from scipy.ndimage import percentile_filter
    per = int(0.05 / frame_s)
    nb = len(db) // per
    blk = db[: nb * per].reshape(nb, per).max(axis=1)
    hist = 600  # 30 s of blocks before
    ref = percentile_filter(blk, 90, size=hist, mode="nearest")  # centred: ref[j] covers blocks j-300..j+299
    q = int(0.04 / frame_s)  # 40 ms
    i = np.arange(max(per * 2, q + 2), nb * per - q - 3)
    if len(i) == 0:
        return []
    is_peak = (db[i] >= db[i - 1]) & (db[i] > db[i + 1])
    loud = db[i] - ref[np.maximum(i // per - hist // 2 - 1, hist // 2)] >= above_db  # the 30 s before (the first 30 s at the start)
    # a clap rises AND falls within 40 ms (a syllable, even a plosive or an "s", lasts 100 ms or more)
    later = np.maximum(np.maximum(db[i + q], db[i + q + 1]), db[i + q + 2])
    before = np.maximum(db[i - q], db[i - q - 1])
    short = (db[i] - later >= 15.0) & (db[i] - before >= 8.0)  # (before: a clap over speech still stands out)
    out, peaks = [], []
    for k in i[is_peak & loud & short]:
        t = k * frame_s
        if out and t - out[-1] <= 0.15:
            if db[k] > peaks[-1]:  # two spikes within 150 ms: the louder one is the clap
                out[-1], peaks[-1] = t, db[k]
            continue
        out.append(t)
        peaks.append(db[k])
    return out


def clap_triples(times: list[float], lo: float = 0.2, hi: float = 1.6) -> list[tuple[float, float, float]]:
    """Runs of three claps with gaps between lo and hi seconds."""
    out, i = [], 0
    while i + 2 < len(times):
        a, b, c = times[i], times[i + 1], times[i + 2]
        if lo <= b - a <= hi and lo <= c - b <= hi:
            out.append((a, b, c))
            i += 3
        else:
            i += 1
    return out


def _match_triples(ref_tr, mic_tr, tol_s: float = 0.08, max_drift_ppm: float = 300.0):
    """The same claps heard on both tracks: [(ref triple, mic triple)]. Triples with the same gaps may pair wrongly
    (the start claps of one with the end claps of the other), so of every pairing whose gaps agree, the largest set
    that agrees on ONE lag (within what a crystal can drift between them) is kept."""
    cands = []
    for r in ref_tr:
        gr = np.diff(r)
        for m in mic_tr:
            if np.all(np.abs(np.diff(m) - gr) <= tol_s):
                cands.append((r, m, float(np.mean(np.array(m) - np.array(r)))))
    best = []
    for r0, _, lag in cands:
        keep = []
        for r, m, l2 in cands:
            # the same lag, give or take 20 ms of room and what a crystal can drift between the two moments
            if abs(l2 - lag) <= 0.02 + max_drift_ppm * 1e-6 * abs(r[0] - r0[0])                     and all(r is not k[0] and m is not k[1] for k in keep):
                keep.append((r, m))
        if len(keep) > len(best):
            best = keep
    return sorted(best, key=lambda p: p[0][0])


# ------------------------------------------------------------------ correlation
def _band_mask(n: int, sr: int, band) -> np.ndarray:
    f = np.fft.rfftfreq(n, 1.0 / sr)
    return (f >= band[0]) & (f <= band[1])


def gcc_phat(ref: np.ndarray, sig: np.ndarray, sr: int, band=(200.0, 4000.0)) -> tuple[float, float]:
    """Where ref's content sits inside sig: (shift in seconds, peak-to-sidelobe ratio). sig is the longer segment;
    a shift k means sig[k + j] matches ref[j]. Speech band only, phase transform, parabolic sub-sample peak."""
    n = 1 << int(np.ceil(np.log2(len(ref) + len(sig))))
    R = np.fft.rfft(ref, n)
    S = np.fft.rfft(sig, n)
    X = S * np.conj(R)
    X /= np.abs(X) + 1e-12
    X[~_band_mask(n, sr, band)] = 0
    cc = np.fft.irfft(X, n)[: len(sig) - len(ref) + 1]
    if len(cc) < 3:
        return 0.0, 0.0
    k = int(np.argmax(cc))
    peak = cc[k]
    mask = np.ones(len(cc), dtype=bool)
    mask[max(0, k - int(0.002 * sr)): k + int(0.002 * sr) + 1] = False
    rest = cc[mask]
    psr = float((peak - rest.mean()) / (rest.std() + 1e-12)) if len(rest) > 10 else 0.0
    frac = 0.0
    if 0 < k < len(cc) - 1:
        a, b, c = cc[k - 1], cc[k], cc[k + 1]
        den = a - 2 * b + c
        frac = 0.5 * (a - c) / den if den else 0.0
    return (k + frac) / sr, psr


def envelope_lag(ref: np.ndarray, sig: np.ndarray, sr: int, frame_s: float = 0.01) -> tuple[float, float]:
    """Coarse lag (mic_time - room_time, s) from loudness envelopes over the whole tracks, and a peak score."""
    a = _frame_db(np.asarray(ref, dtype=np.float64), sr, frame_s, lo_hz=150.0)
    b = _frame_db(np.asarray(sig, dtype=np.float64), sr, frame_s, lo_hz=150.0)
    if len(a) < 100 or len(b) < 100:
        return 0.0, 0.0
    a = np.maximum(a, np.percentile(a, 20))
    b = np.maximum(b, np.percentile(b, 20))
    a = (a - a.mean()) / (a.std() + 1e-9)
    b = (b - b.mean()) / (b.std() + 1e-9)
    n = 1 << int(np.ceil(np.log2(len(a) + len(b))))
    cc = np.fft.irfft(np.fft.rfft(b, n) * np.conj(np.fft.rfft(a, n)), n)
    # lags 0..len(b)-1 (mic later) and -(len(a)-1)..-1 (mic earlier, wrapped)
    lags = np.concatenate([np.arange(0, len(b)), np.arange(-(len(a) - 1), 0)])
    vals = np.concatenate([cc[: len(b)], cc[n - (len(a) - 1):]])
    k = int(np.argmax(vals))
    score = float((vals[k] - vals.mean()) / (vals.std() + 1e-9))
    return float(lags[k] * frame_s), score


def window_lags(ref: np.ndarray, sig: np.ndarray, sr: int, guess, s: dict = SETTINGS,
                should_stop=None) -> list[tuple[float, float, float]]:
    """[(room time of the window's middle, lag, psr)] with the lag searched +- margin around guess(t).
    should_stop is asked before every window (the STOP file, a class switched off): InterruptedError."""
    W, M = int(s["win_s"] * sr), int(s["margin_s"] * sr)
    hop = int(s["hop_s"] * sr)
    out = []
    for a in range(0, max(0, len(ref) - W) + 1, hop):
        if should_stop is not None and should_stop():
            raise InterruptedError("stopped")
        r = ref[a: a + W]
        if np.sqrt(np.mean(np.square(r, dtype=np.float64))) < 1e-5:
            continue
        t = a / sr
        g = guess(t + s["win_s"] / 2)
        lo = int(round((t + g) * sr)) - M
        hi = lo + W + 2 * M
        if lo < 0 or hi > len(sig):
            continue
        seg = sig[lo:hi]
        if np.sqrt(np.mean(np.square(seg, dtype=np.float64))) < 1e-6:
            continue
        shift, psr = gcc_phat(r, seg, sr, s["band_hz"])
        out.append((t + s["win_s"] / 2, lo / sr + shift - t, psr))
    return out


def ransac_line(t: np.ndarray, y: np.ndarray, tol: float, iters: int = 400, seed: int = 0):
    """y = a + b t, robust: the pair of points whose line keeps the most others within tol, refit by least squares
    on those. Returns (a, b, inlier mask) or None."""
    n = len(t)
    if n < 2:
        return None
    rng = np.random.default_rng(seed)
    best = None
    for _ in range(min(iters, n * (n - 1) // 2 * 2)):
        i, j = rng.choice(n, 2, replace=False)
        if t[i] == t[j]:
            continue
        b = (y[j] - y[i]) / (t[j] - t[i])
        a = y[i] - b * t[i]
        m = np.abs(y - (a + b * t)) <= tol
        if best is None or m.sum() > best.sum():
            best = m
    if best is None or best.sum() < 2:
        return None
    for _ in range(3):  # refit on the inliers, then look again
        A = np.vstack([np.ones(best.sum()), t[best]]).T
        a, b = np.linalg.lstsq(A, y[best], rcond=None)[0]
        nm = np.abs(y - (a + b * t)) <= tol
        if nm.sum() < 2:
            break
        best = nm
    return float(a), float(b), best


# ------------------------------------------------------------------ one track
def align_track(name: str, ref: np.ndarray, sig: np.ndarray, sr: int, meta_offset_s: float | None = None,
                s: dict = SETTINGS, should_stop=None) -> Fit:
    """Fit one mic track (sig) to the room track (ref), both mono at sr. meta_offset_s: the import's first guess of
    mic_time - room_time (from the transmitter's start time or timecode), when it has one."""
    if len(sig) < s["win_s"] * sr * 2:
        return Fit(name, False, reason="track_too_short")
    claps = {}
    rc, mc = find_claps(ref, sr), find_claps(sig, sr)
    pairs = _match_triples(clap_triples(rc), clap_triples(mc))
    anchors = [(float(np.mean(r)), float(np.mean(np.array(m) - np.array(r)))) for r, m in pairs]
    claps = {"room": len(rc), "mic": len(mc), "matched_triples": len(pairs)}

    method, guesses = "", []
    if meta_offset_s is not None:
        guesses.append(("timecode", lambda t, g=float(meta_offset_s): g))
    if anchors:
        a0 = anchors[0][1]
        if len(anchors) >= 2 and anchors[-1][0] > anchors[0][0] + 60:
            (t1, l1), (t2, l2) = anchors[0], anchors[-1]
            sl = (l2 - l1) / (t2 - t1)
            guesses.append(("claps", lambda t, t1=t1, l1=l1, sl=sl: l1 + sl * (t - t1)))
        else:
            guesses.append(("claps", lambda t, g=a0: g))
    lag, score = envelope_lag(ref, sig, sr)
    if score > 4.0:
        guesses.append(("envelope", lambda t, g=lag: g))
    if not guesses:
        return Fit(name, False, reason="no_first_guess", claps=claps)

    best: Fit | None = None
    for gname, g in guesses:
        pts = [p for p in window_lags(ref, sig, sr, g, s, should_stop) if p[2] >= s["min_psr"]]
        fit = _fit(name, pts, s)
        fit.method, fit.claps = gname + "+gcc", claps
        if fit.ok and anchors:
            fit = _check_claps(fit, anchors, s)
        if fit.ok:
            return fit
        if best is None or fit.inliers > best.inliers:
            best = fit
    return best


def _fit(name: str, pts, s: dict) -> Fit:
    if len(pts) < s["min_inliers"]:
        return Fit(name, False, windows=len(pts), reason="too_few_shared_windows")
    t = np.array([p[0] for p in pts])
    y = np.array([p[1] for p in pts])
    r = ransac_line(t, y, s["inlier_ms"] / 1000.0, s["ransac_iters"])
    if r is None:
        return Fit(name, False, windows=len(pts), reason="no_line")
    a, b, m = r
    res = y[m] - (a + b * t[m])
    rms = float(np.sqrt(np.mean(res ** 2)) * 1000.0)
    drift = b * 1e6
    f = Fit(name, True, offset_s=a, drift_ppm=drift, residual_ms=rms, windows=len(pts), inliers=int(m.sum()))
    if m.sum() < s["min_inliers"] or m.sum() < s["min_inlier_frac"] * len(pts):
        f.ok, f.reason = False, "windows_disagree"
    elif rms > s["max_residual_ms"]:
        f.ok, f.reason = False, "residual_too_large"
    elif abs(drift) > s["max_drift_ppm"]:
        f.ok, f.reason = False, "drift_implausible"
    return f


def _check_claps(fit: Fit, anchors, s: dict) -> Fit:
    """Every matched clap triple must sit on the line (the end claps prove the drift)."""
    off = [abs(l - float(fit.mic_time(t) - t)) * 1000.0 for t, l in anchors]
    fit.claps["worst_ms"] = round(max(off), 1)
    if max(off) > s["clap_check_ms"]:
        fit.ok, fit.reason = False, "claps_off_the_line"
    return fit


# ------------------------------------------------------------------ resample onto the timeline
def apply(sig: np.ndarray, sr: int, fit: Fit, n_out: int, block_s: float = 60.0) -> tuple[np.ndarray, np.ndarray]:
    """The mic track resampled onto room time 0..n_out/sr: (audio float32, covered bool per output sample's second).
    Linear interpolation in blocks (never the whole lesson's float64 index at once). Outside the mic's file: silence."""
    out = np.zeros(n_out, dtype=np.float32)
    secs = int(np.ceil(n_out / sr))
    cov = np.zeros(secs, dtype=bool)
    rate = 1.0 + fit.drift_ppm * 1e-6
    blk = int(block_s * sr)
    src = np.arange(len(sig))
    for a in range(0, n_out, blk):
        b = min(n_out, a + blk)
        pos = fit.offset_s * sr + rate * np.arange(a, b, dtype=np.float64)
        lo = max(0, int(np.floor(pos[0])) - 2)
        hi = min(len(sig), int(np.ceil(pos[-1])) + 3)
        if hi <= lo:
            continue
        inside = (pos >= 0) & (pos <= len(sig) - 1)
        out[a:b] = np.where(inside, np.interp(pos, src[lo:hi], sig[lo:hi]), 0.0).astype(np.float32)
        idx = np.nonzero(inside)[0]
        if len(idx):
            cov[(a + idx[0]) // sr: (a + idx[-1]) // sr + 1] = True
    return out, cov


def align_all(ref: np.ndarray, mics: dict[str, np.ndarray], sr: int, meta: dict | None = None,
              s: dict = SETTINGS) -> tuple[dict[str, Fit], dict]:
    """{track: Fit} and the report's alignment part: per track ok/offset/drift/residual, and why a track was left out."""
    meta = meta or {}
    fits = {k: align_track(k, ref, v, sr, meta.get(k), s) for k, v in sorted(mics.items())}
    part = {"reference": "room", "tracks": {k: f.summary() for k, f in fits.items()},
            "rejected": {k: f.reason for k, f in fits.items() if not f.ok}}
    return fits, part
