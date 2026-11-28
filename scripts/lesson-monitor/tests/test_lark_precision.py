"""The owner's additions of 28 Nov 2026: short utterances, mic swaps, per-mic voice groups with the seated children as
answers (cold start), "probably one of" seconds per mic, one event not four, precision-first scoring by duration,
blind answers, held-out lessons, segment calibration. Synthetic only."""
from __future__ import annotations

import json

import numpy as np
import pytest

import attribute as A
import multimic
import segments as S
import voice
import voice_admin
import voiceprints
from lark_room import classroom
from test_attribute import EX1, Fake, audio_with, prints_for, seg
from test_voice import XorCodec

K1, K2, K3, K4 = "kid-1", "kid-2", "kid-3", "kid-4"


@pytest.fixture(autouse=True)
def codec(monkeypatch):
    monkeypatch.setattr(voiceprints, "CODEC", XorCodec())


# ------------------------------------------------------------------ short utterances
def test_short_segment_never_named_by_voice():
    au = audio_with([(10, 11.0, "mic1", 2)])
    seats = A.Seats([{"student_id": K2, "mic": 1, "t": 0}, {"student_id": K1, "mic": 1, "t": 0}])
    r = A.attribute([seg(10, 11.0, EX1)], au, {"ecapa": Fake()}, prints_for([1, 2, 3]), seats, None)[0]
    assert r["named"] is None and r["guesses"]                     # guessed (for scoring), never named


def test_short_segment_named_by_strong_mic_and_one_seated_child():
    au = audio_with([(10, 11.0, "mic1", 2)])
    seats = A.Seats([{"student_id": K2, "mic": 1, "t": 0}])
    r = A.attribute([seg(10, 11.0, EX1)], au, {"ecapa": Fake()}, prints_for([1, 2, 3]), seats, None)[0]
    assert r["named"] == K2 and r["tier"] == "seat_short"          # EX1: mic1 leads by 13 dB
    weak = {"mic1": 15.0, "mic2": 12.0, "mic3": 2.0, "mic4": 1.0}
    r = A.attribute([seg(10, 11.0, weak)], au, {"ecapa": Fake()}, prints_for([1, 2, 3]), seats, None)[0]
    assert r["named"] is None                                       # 3 dB lead is not enough


def test_probably_one_of_per_mic_and_short_share():
    au = audio_with([(10, 14, "mic1", 6), (20, 21, "mic1", 6)])     # an unknown voice, and a short bit
    seats = A.Seats([{"student_id": K1, "mic": 1, "t": 0}, {"student_id": K2, "mic": 1, "t": 0}])
    res = A.attribute([seg(10, 14, EX1), seg(20, 21, EX1)], au, {"ecapa": Fake()}, prints_for([1, 2]), seats, None)
    sp = A.speaking_seconds(res, [])
    assert sp["by_mic"]["mic1"] == {"seconds": 5.0, "probably": [K1, K2], "not_a_name": True}
    assert sp["short_share"] == pytest.approx(0.2)


# ------------------------------------------------------------------ cold start: per-mic groups
def test_unknown_voices_grouped_per_mic_with_the_seated_children():
    spans, segs = [], []
    t = 5.0
    for k, m in [(1, "mic1"), (1, "mic1"), (1, "mic3"), (1, "mic3")]:  # the SAME voice on two mics: two groups
        spans.append((t, t + 5, m, k))
        segs.append(seg(t, t + 5, {mm: (25.0 if mm == m else 2.0) for mm in ("mic1", "mic2", "mic3", "mic4")}))
        t += 10
    seats = A.Seats([{"student_id": K1, "mic": 1, "t": 0}, {"student_id": K2, "mic": 1, "t": 0},
                     {"student_id": K3, "mic": 3, "t": 0}])
    res = A.attribute(segs, audio_with(spans), {"ecapa": Fake()}, {"ecapa": {}}, seats, None)   # no voiceprints yet
    gs = A.make_groups(res, rid=None)
    assert [(g["mic"], g["seated"], g["suggested"]) for g in gs] == [("mic1", [K1, K2], None), ("mic3", [K3], None)]
    part = multimic.voice_part(gs)
    assert part["groups"][0]["mic"] == "mic1" and part["groups"][0]["seated"] == [K1, K2]
    assert "blind" not in json.dumps(part) and "vec" not in json.dumps(part)


# ------------------------------------------------------------------ mic swap
def swapped_lesson():
    """kid-1 sits at mic 1 and kid-3 at mic 3 on the board, but their voices come from mic 3 and mic 1."""
    spans, segs = [], []
    t = 5.0
    for k, m in [(1, "mic3"), (3, "mic1")] * 3:
        spans.append((t, t + 8, m, k))
        segs.append(seg(t, t + 8, {mm: (25.0 if mm == m else 2.0) for mm in ("mic1", "mic2", "mic3", "mic4")}))
        t += 10
    seats = A.Seats([{"student_id": K1, "mic": 1, "t": 0}, {"student_id": K3, "mic": 3, "t": 0}])
    return A.attribute(segs, audio_with(spans), {"ecapa": Fake()}, prints_for([1, 2, 3]), seats, None), seats


def test_mic_swap_found_and_those_mics_not_attributed():
    res, seats = swapped_lesson()
    assert all(r["named"] for r in res)                             # by voice, from the class tier
    sw = A.mic_swaps(res, seats)
    assert sw == [{"mics": ["mic1", "mic3"], "seconds": {"mic1": 24.0, "mic3": 24.0}}]
    assert A.apply_swaps(res, sw) == 6 and all(r["named"] is None and r["tier"] == "mic_swap" for r in res)


def test_one_moved_child_is_not_a_swap():
    res, seats = swapped_lesson()
    res = [r for r in res if r["mics"][0] == "mic3"]               # only kid-1 at mic 3: a move, not a swap
    assert A.mic_swaps(res, seats) == []


def test_device_check_remembers_sticker_numbers(pilot_root):
    class Api:
        def __init__(self, rows):
            self.rows = rows

        def select(self, t, q):
            return self.rows
    assert multimic.device_check(Api([{"track": "mic1", "source": {"device": "SN=A1"}},
                                      {"track": "mic2", "source": {"device": "SN=B2"}}]), "r1") == []
    out = multimic.device_check(Api([{"track": "mic2", "source": {"device": "SN=A1"}},
                                     {"track": "mic1", "source": {"device": "SN=B2"}}]), "r2")
    assert out == [{"mic": "mic2", "seen_as": "mic1"}, {"mic": "mic1", "seen_as": "mic2"}]


# ------------------------------------------------------------------ one event, not four
def test_one_utterance_on_four_mics_is_one_segment_and_one_line():
    """A child in the middle of the room is heard about equally on every mic: ONE segment, ONE speaker."""
    tracks, _ = classroom(40, [], {"x": ("mic2", [(10, 20)], 9)})
    for m in S.MICS:                                                # the same sound on all four mics
        tracks[m] = tracks["mic2"].copy()
    act = S.activity(tracks, use_silero=False)
    segs = [s for s in S.child_segments(act) if s["e"] - s["a"] > 0.5]
    covered = sum(s["e"] - s["a"] for s in segs)
    assert segs and all(s["a"] >= 9 and s["e"] <= 21 for s in segs)
    assert covered <= 11.0                                          # no second copy of the same seconds
    starts = sorted((s["a"], s["e"]) for s in segs)
    assert all(b[0] >= a[1] for a, b in zip(starts, starts[1:]))   # never two segments at once
    lines = [{"t": 10.0, "e": 15.0}, {"t": 15.0, "e": 20.0}]
    assert multimic.duplication(lines) == 0.0
    assert multimic.duplication(lines + [{"t": 10.0, "e": 15.0}]) == pytest.approx(5 / 15, abs=1e-3)


# ------------------------------------------------------------------ precision first
def rows(model, specs, blind=False):
    """specs: [(seconds, truth, best, score)]"""
    return [{"rid": f"r{i // 10}", "g": f"G{i}", "i": i, "model": model, "answer": "child", "student": t, "best": b,
             "score": sc, "second": sc - 0.2, "sec": s, "blind": blind} for i, (s, t, b, sc) in enumerate(specs)]


def test_precision_report_chooses_coverage_under_98_percent():
    spec = [(5.0, K1, K1, 0.9)] * 40 + [(5.0, K2, K1, 0.62)] * 3 + [(5.0, K2, K2, 0.6)] * 10 + [(0.8, K1, K1, 0.95)] * 5
    rep = voice_admin.precision_report(rows("ecapa", spec))
    c = rep["models"]["ecapa"]["chosen"]
    assert c["precision"] >= 0.98 and c["threshold"] > 0.62        # the 3 wrong at 0.62 are cut off
    assert c["coverage"] == pytest.approx(200 / (265 + 4), abs=0.01)
    b = rep["models"]["ecapa"]["buckets"]
    assert b["<1.2 s"]["named_s"] == 0 and b["<1.2 s"]["seconds"] == pytest.approx(4.0)   # short: never named
    assert rep["models"]["ecapa"]["children"][K2]["coverage"] == 0
    assert rep["basis"] == "all" and rep["best"] == "ecapa"
    text = "\n".join(voice_admin.format_precision(rep))
    assert "precision first" in text and "<1.2 s" in text


def test_blind_answers_used_when_there_are_enough():
    spec_led = [(5.0, K1, K1, 0.9)] * 40
    spec_blind = [(5.0, K1, K1, 0.9)] * 35 + [(5.0, K2, K1, 0.9)] * 5   # blind answers show the real errors
    rep = voice_admin.precision_report(rows("ecapa", spec_led) + rows("ecapa", spec_blind, blind=True))
    assert rep["basis"] == "blind" and rep["blind_groups"] == 40
    sw = rep["models"]["ecapa"]["sweep"]
    assert all(p["precision"] is None or p["precision"] < 0.98 for p in sw if p["named_s"])


def test_segment_calibration_from_answers(pilot_root):
    res = [{"a": 0, "e": 4, "group": "G1", "lead_db": 20, "tier": "seat", "named": K1,
            "guesses": {"ecapa": {"best": K1, "score": 0.8, "second": 0.5}, "titanet": {"best": K2, "score": 0.7, "second": 0.6}}},
           {"a": 5, "e": 6, "group": "G2", "lead_db": 3, "tier": None, "named": None, "guesses": {}}]
    multimic.keep_segments("rec-9", "2026-11-28", res)
    n = multimic.segment_calibration("rec-9", [{"group_key": "G1", "answer": "child", "student_id": K1}], {"G1"})
    assert n == 2
    got = {r["model"]: r for r in multimic.read_segment_calibration()}
    assert got["ecapa"]["best"] == K1 and got["ecapa"]["student"] == K1 and got["ecapa"]["blind"] is True
    assert got["titanet"]["best"] == K2 and got["ecapa"]["sec"] == 4
    assert b"G1" not in (voiceprints.pending_dir() / "rec-9.segs.vp").read_bytes()   # sealed like the pending groups


def test_held_out_lesson_samples_left_out(pilot_root):
    K1 = "aaaaaaaa-0000-4000-8000-00000000000a"
    v = np.zeros(8)
    v[1] = 1
    voiceprints.add(K1, [(v, 15.0)], "answer", "rec-old", "G1", "ecapa")
    voiceprints.add(K1, [(v, 15.0)], "answer", "rec-now", "G2", "ecapa")
    assert len(multimic.prints_for(["ecapa"], {K1}, 20.0)["ecapa"][K1]) == 2
    assert multimic.prints_for(["ecapa"], {K1}, 20.0, exclude_rid="rec-now")["ecapa"] == {}   # 15 s left: not enough


def test_health_part_has_no_child(pilot_root):
    multimic.note_engine("rec-1", [], "2026-11-28")
    snap = voice_admin.build_snapshot([], {}, marks=multimic.engine_marks(), seg_rows=rows("ecapa", [(5.0, K1, K1, 0.9)] * 20))
    h = snap["health"]
    assert h["engine"] == "lark/1" and h["lessons"][0]["date"] == "2026-11-28"
    text = json.dumps(h)
    for k in ("student_id", "children", "name", K1):
        assert f'"{k}"' not in text and K1 not in text


def test_blind_fraction_is_one_in_five():
    n = sum(voice.is_blind(f"rec-{i}", "G1", dict(voice.SETTINGS, blind_fraction=A.SETTINGS["blind_fraction"]))
            for i in range(2000))
    assert 0.17 < n / 2000 < 0.23
