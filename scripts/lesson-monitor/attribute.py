"""Which child said each stretch of child speech (owner, 28 Nov 2026: four Lark mics among the children).

For every child segment from segments.py:
  1. MIC: the two mics where the segment stands highest over that mic's own noise floor AND over the teacher's bleed
     (segments.py's "excess"; never normalised). Below `mic_min_excess_db` on every mic, no mic heard it clearly.
  2. CANDIDATES, strongest hint first: the children the mic board seats at those two mics at that moment
     (`lesson_monitor_mic_map`; a HINT, children move), then the whole class enrolled in the lesson, then nobody.
  3. VOICE: the segment's audio from its best mic is embedded by every speaker model (embedders.py), and compared with
     EVERY voiceprint sample a child has (several per child: a child sounds different reading, answering, shouting),
     scoring each child by the mean of their best `top_k` samples. Only the shown model's score can name.
  4. NAME, or say unsure: a seated child is named when they are over the model's threshold (lowered by `seat_bonus`)
     and clearly ahead of EVERY other child in the class; anyone else only over the full threshold and a wider
     margin. Otherwise the segment is unknown. Unsure is always preferred to wrong.

Voice groups (what the teacher answers in the app) are made as before: each named child's segments are one group
with that suggestion; unknown segments are grouped by voice. The teacher's answers stay the ONLY thing that teaches
voiceprints (nightly.learn_from_answers); nothing here learns from its own guesses.

The report gets speaking SECONDS per child, unknown and teacher (segment lengths, never lines), and suggested mic-board
corrections: "child X's confident segments keep coming from mic M" while the board seats X elsewhere. Ids and numbers
only: the screen puts names on them.
"""
from __future__ import annotations

import numpy as np

import voice

SR = 16000
SETTINGS = {
    "mics_per_segment": 2,
    "mic_min_excess_db": 6.0,   # a mic must hear the segment this far over its floor and the teacher's bleed
    "embed_min_s": 1.0,         # shorter segments carry too little voice: counted as unknown seconds
    "top_k": 3,                 # a child's score = mean of their best 3 voiceprint samples
    "seat_bonus": 0.04,         # a child seated at the segment's mic may be named this much under the threshold
    "seat_margin": 0.05,        # ... when this far ahead of every other child in the class
    "class_margin": 0.08,       # a child NOT seated there needs this much over the next child
    "group_min_s": 6.0,         # an unnamed voice group below this gets no suggestion (voice.SETTINGS, B2)
    "cluster_distance": 0.40,   # unknown segments: one mic's clean audio groups tighter than the old mixed lines
    "map_min_s": 20.0,          # a board correction needs this many confident seconds from one mic ...
    "map_min_share": 0.6,       # ... and this share of the child's confident seconds
    "confident_extra": 0.05,    # confident = named with this much over the threshold
    "max_groups": 200,
}


def norm_mic(m) -> str | None:
    """'mic2', 2, '2', 'Mic 2' -> 'mic2'; anything else (None, 0, 'room') -> None."""
    if m is None:
        return None
    d = "".join(ch for ch in str(m) if ch.isdigit())
    return f"mic{int(d)}" if d and 1 <= int(d) <= 4 else None


class Seats:
    """The mic board as a function of time. entries: [{"student_id", "mic", "t"}] with t in lesson seconds (the
    caller converts the RPC's timestamps). A child sits at one mic at a time: each entry moves that child from then on;
    a mic of None takes the child off the board."""

    def __init__(self, entries: list[dict]):
        self.by_child: dict[str, list[tuple[float, str | None]]] = {}
        for e in sorted(entries or [], key=lambda e: float(e.get("t") or 0.0)):
            sid = e.get("student_id")
            if sid:
                self.by_child.setdefault(sid, []).append((float(e.get("t") or 0.0), norm_mic(e.get("mic"))))

    def mic_of(self, sid: str, t: float) -> str | None:
        mic = None
        for at, m in self.by_child.get(sid, []):
            if at <= t + 1e-6:
                mic = m
            else:
                break
        return mic

    def at(self, mic: str, t: float) -> set[str]:
        return {sid for sid in self.by_child if self.mic_of(sid, t) == mic}

    def empty(self) -> bool:
        return not self.by_child


def best_mics(seg: dict, s: dict = SETTINGS) -> list[str]:
    ex = sorted(((v, m) for m, v in (seg.get("excess") or {}).items()), reverse=True)
    return [m for v, m in ex[: s["mics_per_segment"]] if v >= s["mic_min_excess_db"]]


def child_scores(vec: np.ndarray, prints: dict[str, list[np.ndarray]], k: int) -> dict[str, float]:
    """{child: mean of their best k sample cosines}. prints: {child: [unit vectors]} (several per child)."""
    out = {}
    for sid, vs in prints.items():
        if not len(vs):
            continue
        c = np.sort(np.asarray(vs, dtype=np.float64) @ vec)[::-1]
        out[sid] = float(np.mean(c[:k]))
    return out


def decide(scores: dict[str, float], seated: set[str], threshold: float, s: dict = SETTINGS) -> dict:
    """{"named": child|None, "tier": "seat"|"class"|None, "score", "second"} - prefer unsure to wrong."""
    if not scores:
        return {"named": None, "tier": None, "score": None, "second": None}
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    best, b = ranked[0]
    second = ranked[1][1] if len(ranked) > 1 else None
    lead = b - second if second is not None else None
    out = {"named": None, "tier": None, "score": round(b, 4), "second": round(second, 4) if second is not None else None,
           "best": best}
    if best in seated and b >= threshold - s["seat_bonus"] and (lead >= s["seat_margin"] if lead is not None else b >= threshold):
        out.update(named=best, tier="seat")
    elif b >= threshold and (lead >= s["class_margin"] if lead is not None else b >= threshold + s["class_margin"]):
        out.update(named=best, tier="class")
    return out


def attribute(segments: list[dict], audio: dict[str, np.ndarray], embedders: dict, prints: dict, seats: Seats,
              roster: set[str] | None, s: dict = SETTINGS, shown: str | None = None, should_stop=None) -> list[dict]:
    """One result per segment: {"a","e","mics","named","tier","score","second","seated","vecs","guesses"}.
    audio: {mic: 16 kHz on the room timeline}; embedders: {model: embedder}; prints: {model: {child: [unit vectors]}},
    already limited to children with voiceprint consent; roster: the children enrolled in the lesson (others are
    never named, whatever their voiceprint)."""
    shown = shown or voice.SETTINGS["shown_model"]
    out = []
    for seg in segments:
        if should_stop and should_stop():
            raise InterruptedError("stopped")
        a, e = float(seg["a"]), float(seg["e"])
        mics = best_mics(seg, s)
        seated = set().union(*[seats.at(m, (a + e) / 2) for m in mics]) if mics else set()
        r = {"a": a, "e": e, "mics": mics, "overlap": bool(seg.get("overlap")), "seated": sorted(seated),
             "named": None, "tier": None, "score": None, "second": None, "vecs": {}, "guesses": {}}
        src = mics[0] if mics else seg.get("top")
        if e - a >= s["embed_min_s"] and src in audio:
            x = audio[src][int(a * SR): int(e * SR)]
            for model, emb in embedders.items():
                try:
                    v = voice.unit(np.asarray(emb.embed(x), dtype=np.float64))
                except Exception:  # noqa: BLE001 - an extra model failing leaves only its guess out
                    if model == shown:
                        raise
                    continue
                r["vecs"][model] = v
                pm = {sid: vs for sid, vs in (prints.get(model) or {}).items() if roster is None or sid in roster}
                sc = child_scores(v, pm, s["top_k"])
                d = decide(sc, seated, voice.threshold_for(model), s)
                if d.get("best"):
                    r["guesses"][model] = {"best": d["best"], "score": d["score"], "second": d["second"]}
                if model == shown:
                    r.update(named=d["named"], tier=d["tier"], score=d["score"], second=d["second"])
        out.append(r)
    return out


def make_groups(results: list[dict], rid: str | None, s: dict = SETTINGS, shown: str | None = None) -> list[dict]:
    """Voice groups in the shape voice.analyse returns (so finish_voice and learn_from_answers work unchanged), with
    "segments" (indexes into results) instead of lines. Named children first, in the order first heard; then unknown
    segments that could be embedded, grouped by voice; G1, G2, ... in order of first appearance."""
    shown = shown or voice.SETTINGS["shown_model"]
    buckets: list[tuple[float, str | None, list[int]]] = []
    by_child: dict[str, list[int]] = {}
    unknown = []
    for i, r in enumerate(results):
        if r["vecs"].get(shown) is None:
            continue
        if r["named"]:
            by_child.setdefault(r["named"], []).append(i)
        else:
            unknown.append(i)
    for sid, idx in by_child.items():
        buckets.append((results[idx[0]]["a"], sid, idx))
    if unknown:
        labs = voice.cluster(np.array([results[i]["vecs"][shown] for i in unknown]), s["cluster_distance"])
        cl: dict[int, list[int]] = {}
        for i, lab in zip(unknown, labs):
            cl.setdefault(lab, []).append(i)
        for idx in cl.values():
            buckets.append((results[idx[0]]["a"], None, idx))
    buckets.sort(key=lambda b: b[0])
    groups = []
    for n, (_, sid, idx) in enumerate(buckets[: s["max_groups"]], start=1):
        w = np.array([results[i]["e"] - results[i]["a"] for i in idx])
        models = set.intersection(*[set(results[i]["vecs"]) for i in idx])
        vecs = {m: voice.unit((np.array([results[i]["vecs"][m] for i in idx]) * w[:, None]).sum(axis=0)) for m in models}
        key = f"G{n}"
        seconds = float(w.sum())
        sug = sid
        score = round(float(np.mean([results[i]["score"] for i in idx if results[i]["score"] is not None])), 3) if sid else None
        blind = False
        if sug and voice.is_blind(rid, key, voice.SETTINGS):
            sug, score, blind = None, None, True
        guesses = {}
        for m in models:
            gs = [results[i]["guesses"].get(m) for i in idx if results[i]["guesses"].get(m)]
            if gs:
                bests = [g["best"] for g in gs]
                top = max(set(bests), key=bests.count)
                sc = [g["score"] for g in gs if g["best"] == top]
                guesses[m] = {"best": top, "score": round(float(np.mean(sc)), 4), "second": None}
        for i in idx:
            results[i]["group"] = key
        groups.append({"key": key, "segments": idx, "lines": [], "seconds": round(seconds, 1), "vec": vecs.get(shown),
                       "vecs": vecs, "suggested": sug, "score": score, "blind": blind, "guesses": guesses})
    return groups


def speaking_seconds(results: list[dict], teacher_spans: list[tuple[float, float]]) -> dict:
    """Seconds, never lines: per named child, unknown child speech, teacher, and child speech over the teacher."""
    kids: dict[str, float] = {}
    unknown = overlap = 0.0
    for r in results:
        d = r["e"] - r["a"]
        if r["named"]:
            kids[r["named"]] = kids.get(r["named"], 0.0) + d
        else:
            unknown += d
        if r["overlap"]:
            overlap += d
    teacher = sum(b - a for a, b in teacher_spans)
    return {"teacher_s": round(teacher, 1), "children_s": {k: round(v, 1) for k, v in sorted(kids.items())},
            "unknown_s": round(unknown, 1), "overlap_s": round(overlap, 1),
            "named_s": round(sum(kids.values()), 1)}


def talk_time(results: list[dict], teacher_spans, duration_s: float, step_s: int = 10) -> dict | None:
    """The report's talk_time block (the shape levels.talk_split + timeline give), from segment seconds."""
    n = int(np.ceil(duration_s))
    if n <= 0:
        return None
    t = np.zeros(n)
    o = np.zeros(n)
    for a, b in teacher_spans:
        _add(t, a, b)
    for r in results:
        _add(o, r["a"], r["e"])
    ts, os_ = float(t.sum()), float(o.sum())
    if ts + os_ <= 0:
        return None
    pct = 100.0 * ts / (ts + os_)
    lo, hi = int(np.floor(pct / 5) * 5), int(np.ceil(pct / 5) * 5)
    if lo == hi:
        hi = min(100, lo + 5)
    tl = []
    for i in range(0, n, step_s):
        a, b = t[i:i + step_s].sum(), o[i:i + step_s].sum()
        tl.append("-" if a + b < 0.5 else ("T" if a >= b else "O"))
    return {"teacher_pct": [lo, hi], "others_pct": [100 - hi, 100 - lo], "speech_seconds": int(round(ts + os_)),
            "timeline": "".join(tl), "step_s": step_s, "source": "segments"}


def _add(arr: np.ndarray, a: float, b: float) -> None:
    """Add the overlap of [a, b) with each one-second bin."""
    i = int(np.floor(a))
    while i < len(arr) and i < b:
        arr[i] += max(0.0, min(b, i + 1) - max(a, i))
        i += 1


def map_suggestions(results: list[dict], seats: Seats, s: dict = SETTINGS, shown: str | None = None) -> list[dict]:
    """"Child X's confident segments keep coming from mic M" while the board seats X elsewhere (or nowhere):
    [{"suggested": child id, "mic", "seconds", "share", "board_mic", "from_s"}] for the teacher to accept or ignore
    ("suggested", not "student_id": the report names nobody under a child key, as in the voice groups)."""
    shown = shown or voice.SETTINGS["shown_model"]
    thr = voice.threshold_for(shown) + s["confident_extra"]
    per: dict[str, dict[str, list]] = {}
    for r in results:
        if not r["named"] or r["score"] is None or r["score"] < thr or not r["mics"]:
            continue
        per.setdefault(r["named"], {}).setdefault(r["mics"][0], []).append(r)
    out = []
    for sid, by_mic in per.items():
        total = sum(x["e"] - x["a"] for rs in by_mic.values() for x in rs)
        for mic, rs in by_mic.items():
            sec = sum(x["e"] - x["a"] for x in rs)
            if sec < s["map_min_s"] or sec < s["map_min_share"] * total:
                continue
            board = [seats.mic_of(sid, (x["a"] + x["e"]) / 2) for x in rs]
            elsewhere = [b for b in board if b != mic]
            if len(elsewhere) < 0.5 * len(board):
                continue
            common = max(set(elsewhere), key=elsewhere.count) if elsewhere else None
            out.append({"suggested": sid, "mic": mic, "seconds": round(sec, 1), "share": round(sec / total, 2),
                        "board_mic": common, "from_s": round(min(x["a"] for x in rs), 1)})
    return sorted(out, key=lambda d: -d["seconds"])
