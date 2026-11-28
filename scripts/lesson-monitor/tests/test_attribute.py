"""attribute.py: mic choice, seat-then-class-then-unknown, several voiceprints per child, unsure over wrong, seconds,
board corrections. A FAKE embedder (no model): audio holding the constant k/10 is "voice k"; a stretch mixing two
values sits between two voices. No real child."""
from __future__ import annotations

import numpy as np
import pytest

import attribute as A
import voice

SR = A.SR
KIDS = {1: "kid-1", 2: "kid-2", 3: "kid-3", 4: "kid-4", 5: "kid-5"}
THR = voice.threshold_for("ecapa")


class Fake:
    def __init__(self, noise=0.03, seed=0):
        self.rng, self.noise = np.random.default_rng(seed), noise

    def embed(self, x):
        v = np.zeros(8)
        vals, counts = np.unique(np.round(np.asarray(x) * 10).astype(int), return_counts=True)
        for k, c in zip(vals, counts):  # a stretch of two voices points between them
            if 0 <= k < 8:
                v[k] += c
        v = v / (np.linalg.norm(v) or 1) + self.rng.normal(0, self.noise, 8)
        return v / np.linalg.norm(v)


def prints_for(ids, n=4, noise=0.05, seed=1):
    rng = np.random.default_rng(seed)
    out = {}
    for k in ids:
        vs = []
        for _ in range(n):
            v = np.zeros(8)
            v[k] = 1.0
            v += rng.normal(0, noise, 8)
            vs.append(v / np.linalg.norm(v))
        out[KIDS[k]] = vs
    return {"ecapa": out}


def seg(a, e, excess, overlap=False):
    return {"a": a, "e": e, "excess": excess, "overlap": overlap, "top": max(excess, key=excess.get)}


def audio_with(spans, seconds=120):
    """{mic: audio}: spans [(from, to, mic, voice k)]; the voice is at full value on its mic only."""
    out = {m: np.zeros(seconds * SR, dtype=np.float32) for m in ("mic1", "mic2", "mic3", "mic4")}
    for a, b, m, k in spans:
        out[m][int(a * SR): int(b * SR)] = k / 10
    return out


EX1 = {"mic1": 25.0, "mic2": 12.0, "mic3": 2.0, "mic4": 1.0}


def test_norm_mic():
    assert [A.norm_mic(x) for x in ("mic2", 2, "2", "Mic 3", None, 0, "room", 7)] == ["mic2", "mic2", "mic2", "mic3",
                                                                                     None, None, None, None]


def test_seats_move_with_time():
    s = A.Seats([{"student_id": "a", "mic": 1, "t": 0}, {"student_id": "b", "mic": "mic1", "t": 0},
                 {"student_id": "a", "mic": "mic3", "t": 600}, {"student_id": "b", "mic": None, "t": 900}])
    assert s.at("mic1", 10) == {"a", "b"}
    assert s.at("mic1", 700) == {"b"} and s.at("mic3", 700) == {"a"}
    assert s.at("mic1", 1000) == set() and s.mic_of("b", 1000) is None


def test_best_mics_top_two_over_the_floor():
    assert A.best_mics(seg(0, 2, EX1)) == ["mic1", "mic2"]
    assert A.best_mics(seg(0, 2, {"mic1": 9.0, "mic2": 3.0, "mic3": 1.0, "mic4": 0.0})) == ["mic1"]
    assert A.best_mics(seg(0, 2, {"mic1": 2.0, "mic2": 3.0, "mic3": 1.0, "mic4": 0.0})) == []


def test_several_voiceprints_best_k():
    v = np.zeros(8)
    v[1] = 1
    sc = A.child_scores(v, {"x": [v, v, -v, -v], "y": [v * 0.5 + 0.5]}, 2)
    assert sc["x"] == pytest.approx(1.0)


def test_seated_child_named_from_the_seat_tier():
    segs = [seg(10, 14, EX1)]
    au = audio_with([(10, 14, "mic1", 2)])
    seats = A.Seats([{"student_id": "kid-2", "mic": 1, "t": 0}, {"student_id": "kid-5", "mic": 1, "t": 0}])
    r = A.attribute(segs, au, {"ecapa": Fake()}, prints_for([1, 2, 3, 4, 5]), seats, set(KIDS.values()))
    assert r[0]["named"] == "kid-2" and r[0]["tier"] == "seat" and r[0]["mics"] == ["mic1", "mic2"]


def test_moved_child_still_named_from_the_whole_class():
    segs = [seg(10, 14, EX1)]
    au = audio_with([(10, 14, "mic1", 3)])
    seats = A.Seats([{"student_id": "kid-3", "mic": 4, "t": 0}])  # the board says mic 4; kid-3 has moved
    r = A.attribute(segs, au, {"ecapa": Fake()}, prints_for([1, 2, 3, 4, 5]), seats, set(KIDS.values()))
    assert r[0]["named"] == "kid-3" and r[0]["tier"] == "class"


def test_between_two_voices_is_unsure_not_wrong():
    """Half kid-1, half kid-2: closest to neither by the margin -> unknown."""
    au = audio_with([(10, 12, "mic1", 1), (12, 14, "mic1", 2)])
    seats = A.Seats([{"student_id": "kid-1", "mic": 1, "t": 0}, {"student_id": "kid-2", "mic": 1, "t": 0}])
    for seed in range(5):  # whatever the noise does
        r = A.attribute([seg(10, 14, EX1)], au, {"ecapa": Fake(noise=0.01, seed=seed)}, prints_for([1, 2, 3], noise=0.02),
                        seats, set(KIDS.values()))
        assert r[0]["named"] is None


def test_unknown_voice_is_not_named():
    au = audio_with([(10, 14, "mic1", 6)])  # nobody has voice 6
    r = A.attribute([seg(10, 14, EX1)], au, {"ecapa": Fake()}, prints_for([1, 2, 3]), A.Seats([]), set(KIDS.values()))
    assert r[0]["named"] is None


def test_child_not_in_the_lesson_never_named():
    au = audio_with([(10, 14, "mic1", 2)])
    r = A.attribute([seg(10, 14, EX1)], au, {"ecapa": Fake()}, prints_for([1, 2, 3]), A.Seats([]), {"kid-1", "kid-3"})
    assert r[0]["named"] is None


def test_short_segment_is_unknown_seconds_not_embedded():
    au = audio_with([(10, 10.6, "mic1", 2)])
    r = A.attribute([seg(10, 10.6, EX1)], au, {"ecapa": Fake()}, prints_for([2]), A.Seats([]), None)
    assert r[0]["named"] is None and not r[0]["vecs"]
    sp = A.speaking_seconds(r, [])
    assert sp["unknown_s"] == pytest.approx(0.6)


def test_only_the_shown_model_names_extra_models_guess():
    au = audio_with([(10, 14, "mic1", 2)])
    pr = prints_for([1, 2, 3])
    pr["other"] = pr["ecapa"]
    r = A.attribute([seg(10, 14, EX1)], au, {"ecapa": Fake(), "other": Fake(seed=3)}, pr, A.Seats([]), None)
    assert r[0]["named"] == "kid-2" and set(r[0]["guesses"]) == {"ecapa", "other"}


def lesson_results():
    """kid-1 speaks 5 times at mic1, kid-2 3 times at mic3 (the board says mic2), one unknown voice twice."""
    spans, segs = [], []
    t = 5.0
    plan = [(1, "mic1")] * 5 + [(2, "mic3")] * 3 + [(6, "mic4")] * 2
    for k, m in plan:
        spans.append((t, t + 8, m, k))
        segs.append(seg(t, t + 8, {mm: (25.0 if mm == m else 2.0) for mm in ("mic1", "mic2", "mic3", "mic4")}))
        t += 10
    seats = A.Seats([{"student_id": "kid-1", "mic": 1, "t": 0}, {"student_id": "kid-2", "mic": 2, "t": 0}])
    r = A.attribute(segs, audio_with(spans), {"ecapa": Fake()}, prints_for([1, 2, 3]), seats, set(KIDS.values()))
    return r, seats


def test_groups_in_the_old_shape():
    r, _ = lesson_results()
    gs = A.make_groups(r, rid=None)
    assert [g["suggested"] for g in gs] == ["kid-1", "kid-2", None]
    assert gs[0]["seconds"] == pytest.approx(40) and len(gs[2]["segments"]) == 2
    for g in gs:
        assert {"key", "lines", "seconds", "vec", "vecs", "suggested", "score", "blind", "guesses"} <= set(g)
    assert all("group" in x for x in r)


def test_speaking_seconds_and_talk_time():
    r, _ = lesson_results()
    sp = A.speaking_seconds(r, [(0, 5), (100, 130)])
    assert sp["children_s"] == {"kid-1": 40.0, "kid-2": 24.0} and sp["unknown_s"] == 16.0 and sp["teacher_s"] == 35.0
    tt = A.talk_time(r, [(0, 5), (100, 130)], 140)
    assert tt["teacher_pct"][0] <= 100 * 35 / 115 <= tt["teacher_pct"][1]
    assert len(tt["timeline"]) == 14 and tt["timeline"][0] == "T" and tt["timeline"][1] == "O"


def test_board_correction_suggested_for_the_moved_child():
    r, seats = lesson_results()
    sug = A.map_suggestions(r, seats)
    assert [(x["suggested"], x["mic"], x["board_mic"]) for x in sug] == [("kid-2", "mic3", "mic2")]
    assert sug[0]["seconds"] == 24.0


def test_blind_groups_hide_the_suggestion_deterministically(monkeypatch):
    r, _ = lesson_results()
    monkeypatch.setitem(A.SETTINGS, "blind_fraction", 1.0)  # the Lark engine's own share (1 in 5 normally)
    gs = A.make_groups(r, rid="rec-1")
    assert all(g["suggested"] is None for g in gs) and gs[0]["blind"] and gs[0]["guesses"]["ecapa"]["best"] == "kid-1"
