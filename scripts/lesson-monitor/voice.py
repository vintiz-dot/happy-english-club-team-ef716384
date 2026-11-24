"""The voice step of one lesson (owner, 24 Nov 2026; design Option B): who said each line.

Three sources, strongest first, none of them ever final without the teacher:
  1. The teacher's microphone. A line the lapel labels "T" is the teacher's (report.py).
  2. Taps on the speaking board. A tap on ONE child marks that child as speaking from
     that moment until the next tap, at most MARK_MAX_S, and the turn ends on its own
     at the first TEACHER_END_S of teacher speech on the lapel (no "tap again to stop"
     needed). A line inside such a turn carries "m": that child. The same turns, for a
     child with voiceprint consent, are that child's voice samples (enrolment: tap each
     child once while they talk for about a minute).
  3. Voices. Every other line of 1 s or more is embedded with ECAPA and the lines are
     grouped by voice; a group of GROUP_MIN_S or more is compared with the children's
     voiceprints and gets a suggestion only when it is clearly closest to one child.

Measured before any of this was built (docs/LESSON_MONITOR_DESIGN.md, test B2, children's
voices through the S500): a single 2-second line is named about 1 time in 6 at about 1 %
wrong; 8 seconds of one voice about 8 times in 10; local voice grouping is unreliable
where children talk over each other. So "no suggestion" is the normal answer, a group may
hold more than one child, and the teacher confirms or corrects every suggestion. The
thresholds are where B2 found about 1 % wrong; voice_admin.py accuracy reports how the
teacher's answers compare, so they can be moved on evidence.
"""
from __future__ import annotations

import numpy as np

import pilot_common as pc

SR = 16000
SETTINGS = {
    "model": "speechbrain/spkrec-ecapa-voxceleb",
    "line_min_s": 1.0,        # shorter lines carry too little voice to embed
    "group_min_s": 6.0,       # B2: below this a suggestion is mostly a guess
    "group_threshold": 0.66,  # cosine to the child's voiceprint (B2 ECAPA, about 1-5 % wrong)
    "margin": 0.05,           # and this much closer than to the next child
    "cluster_distance": 0.45, # average-linkage cosine distance that closes a voice group
    "mark_trim_s": 0.5,       # the teacher taps a moment after the child starts
    "mark_max_s": 60.0,
    "teacher_end_s": 2,       # this many seconds of teacher speech end a child's turn
    "enrol_window_s": 3.0,
    "enrol_min_s": 20.0,      # a child is compared with only once this much voice is known
}


class Embedder:
    """ECAPA (speechbrain), from the model folder on this laptop; never downloads."""

    def __init__(self, model_dir=None):
        import os
        os.environ["HF_HUB_OFFLINE"] = "1"
        from speechbrain.inference.speaker import EncoderClassifier
        d = str(model_dir or (pc.models_dir() / "speechbrain" / "spkrec-ecapa-voxceleb"))
        self.model = EncoderClassifier.from_hparams(source=d, savedir=d, run_opts={"device": "cpu"})

    def embed(self, x: np.ndarray) -> np.ndarray:
        import torch
        with torch.no_grad():
            e = self.model.encode_batch(torch.from_numpy(np.ascontiguousarray(x, dtype=np.float32))[None, :])
        v = e.squeeze().cpu().numpy().astype(np.float64)
        n = np.linalg.norm(v)
        return v / n if n else v


# ------------------------------------------------------------------ taps -> turns
def tap_turns(marks: list[dict], duration_s: float, labels=None, s: dict = SETTINGS) -> list[tuple[str, float, float]]:
    """[(child id, from, to)] in lesson seconds, from the speaking board's marks
    ({"t_s", "kind", "student_ids"}). Only one-child marks make a turn; a conversation,
    the teacher, chorus and stop end the turn before."""
    ms = sorted((m for m in marks if m.get("t_s") is not None), key=lambda m: m["t_s"])
    out = []
    for i, m in enumerate(ms):
        ids = m.get("student_ids") or []
        if m.get("kind") != "student" or len(ids) != 1:
            continue
        a = max(0.0, float(m["t_s"]) + s["mark_trim_s"])
        b = min(float(ms[i + 1]["t_s"]) if i + 1 < len(ms) else a + s["mark_max_s"], a + s["mark_max_s"], float(duration_s))
        if labels is not None:
            run = 0
            for sec in range(int(np.ceil(a)), int(b)):
                run = run + 1 if 0 <= sec < len(labels) and labels[sec] == "T" else 0
                if run >= s["teacher_end_s"]:
                    b = sec - run + 1
                    break
        if b - a >= 1.0:
            out.append((ids[0], a, b))
    return out


def turn_at(turns, a: float, b: float) -> str | None:
    """The tapped child of a line whose middle falls inside one turn."""
    mid = (a + b) / 2
    for sid, x, y in turns:
        if x <= mid < y:
            return sid
    return None


# ------------------------------------------------------------------ voices -> groups
def cluster(vectors: np.ndarray, distance: float) -> list[int]:
    if len(vectors) == 0:
        return []
    if len(vectors) == 1:
        return [1]
    from scipy.cluster.hierarchy import fcluster, linkage
    z = linkage(vectors, method="average", metric="cosine")
    return [int(c) for c in fcluster(z, t=distance, criterion="distance")]


def unit(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v / n if n else v


def suggest(vec: np.ndarray, seconds: float, prints: dict[str, np.ndarray], s: dict = SETTINGS):
    """(child id, score) when the group is long enough and clearly closest to one child, else None."""
    if seconds < s["group_min_s"] or not prints:
        return None
    scores = sorted(((float(np.dot(vec, c)), sid) for sid, c in prints.items()), reverse=True)
    best, sid = scores[0]
    second = scores[1][0] if len(scores) > 1 else None
    if best < s["group_threshold"]:
        return None
    # With one known child there is nobody to be "clearly closer" than: ask for the margin on top.
    if (second is None and best < s["group_threshold"] + s["margin"]) or (second is not None and best - second < s["margin"]):
        return None
    return sid, round(best, 3)


def analyse(audio: np.ndarray, lines: list[dict], turns, embedder, prints: dict[str, np.ndarray],
            labels=None, s: dict = SETTINGS) -> dict:
    """lines: the report's lines (lesson seconds, "who": "T" for the teacher's mic).
    Returns {"tapped": {line index: child}, "group_of": {line index: key},
             "groups": [{"key", "lines", "seconds", "vec", "suggested", "score"}],
             "samples": {child: [(vec, seconds)]}}."""
    tapped, cand, vecs, secs = {}, [], [], []
    for i, ln in enumerate(lines):
        a, b = float(ln["t"]), float(ln["e"])
        if ln.get("who") == "T":
            continue
        sid = turn_at(turns, a, b)
        if sid:
            tapped[i] = sid
        if b - a < s["line_min_s"]:
            continue
        x = audio[int(a * SR): int(b * SR)]
        if len(x) < s["line_min_s"] * SR:
            continue
        cand.append(i)
        vecs.append(embedder.embed(x))
        secs.append(b - a)

    groups, group_of = [], {}
    labs = cluster(np.array(vecs), s["cluster_distance"]) if vecs else []
    order = []
    for lab in labs:  # G1 is the voice heard first
        if lab not in order:
            order.append(lab)
    for n, lab in enumerate(order[:200], start=1):
        idx = [j for j, l in enumerate(labs) if l == lab]
        w = np.array([secs[j] for j in idx])
        vec = unit((np.array([vecs[j] for j in idx]) * w[:, None]).sum(axis=0))
        key = f"G{n}"
        sug = suggest(vec, float(w.sum()), prints, s)
        groups.append({"key": key, "lines": [cand[j] for j in idx], "seconds": round(float(w.sum()), 1), "vec": vec,
                       "suggested": sug[0] if sug else None, "score": sug[1] if sug else None})
        for j in idx:
            group_of[cand[j]] = key

    samples: dict[str, list] = {}
    win = s["enrol_window_s"]
    for sid, a, b in turns:
        t = a
        while t + 1.5 <= b:
            e = min(b, t + win)
            if labels is not None and any(0 <= k < len(labels) and labels[k] == "T" for k in range(int(t), int(np.ceil(e)))):
                t = e
                continue
            x = audio[int(t * SR): int(e * SR)]
            if len(x) >= 1.5 * SR:
                samples.setdefault(sid, []).append((embedder.embed(x), e - t))
            t = e
    return {"tapped": tapped, "group_of": group_of, "groups": groups, "samples": samples}


def body_part(result: dict) -> dict:
    """What the report carries about voices: no embedding ever, only keys, seconds, ids and scores."""
    return {"model": SETTINGS["model"], "settings": {k: v for k, v in SETTINGS.items() if k != "model"},
            "groups": [{"key": g["key"], "seconds": g["seconds"], "lines": len(g["lines"]),
                        "suggested": g["suggested"], "score": g["score"]} for g in result["groups"]],
            "samples_seconds": {sid: round(sum(sec for _, sec in v), 1) for sid, v in result["samples"].items()}}
