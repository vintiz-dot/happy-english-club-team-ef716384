"""replay.py scoring and the engine on arrays; voice_admin.py accuracy for the Lark engine. Synthetic only."""
from __future__ import annotations

import numpy as np
import pytest

import align
import attribute
import multimic
import replay
import voice_admin
from lark_room import SR, classroom
from lark_synth import on_mic_clock
from test_multimic import BANDS, KA, KB, KC, BandEmbedder
from lark_synth import voice


def R(a, e, named):
    return {"a": a, "e": e, "named": named}


def test_score_right_wrong_unsure_in_seconds():
    truth = [{"from": 0, "to": 10, "child": KA}, {"from": 20, "to": 30, "child": KB}]
    res = [R(1, 5, KA), R(5, 9, None), R(21, 25, KA), R(26, 29, KB), R(40, 45, KC)]
    sc = replay.score(res, truth)
    assert sc["children"][KA] == {"right": 1, "wrong": 0, "unsure": 1, "right_s": 4, "wrong_s": 0, "unsure_s": 4}
    assert sc["children"][KB]["wrong"] == 1 and sc["children"][KB]["right"] == 1
    assert sc["total"]["wrong_among_named_pct"] == pytest.approx(33.3)
    assert sc["unlabelled"]["named"] == 1                         # KC at 40 s: nobody labelled it, not counted
    text = "\n".join(replay.format_score(sc))
    assert "OVER TARGET" in text


def test_taps_as_truth():
    t = replay.taps_as_truth([{"kind": "student", "student_ids": [KA], "t_s": 10.0},
                              {"kind": "stop", "student_ids": [], "t_s": 40.0}], 100)
    assert t == [{"from": 10.5, "to": 40.0, "child": KA}]


def test_engine_on_arrays_names_the_right_children(monkeypatch):
    import segments
    monkeypatch.setattr(segments, "silero_path", lambda: None)
    monkeypatch.setitem(align.SETTINGS, "hop_s", 20.0)
    kids = {KA: ("mic1", [(20, 40), (100, 120)], 31), KB: ("mic3", [(50, 70), (130, 150)], 32)}
    tracks, _ = classroom(200, [(0, 15), (75, 95), (160, 190)], kids, bands=BANDS)
    mics = {m: on_mic_clock(tracks[m], SR, 4.0 + i, 30.0 * i, 210) for i, m in enumerate(("mic1", "mic2", "mic3", "mic4"))}
    emb = BandEmbedder()
    prints = {"ecapa": {k: [emb.embed(voice(10, SR, 70 + j, band=BANDS[k])) for j in range(3)] for k in (KA, KB, KC)}}
    res = replay.run_engine(tracks["room"], tracks["teacher"], mics, {"ecapa": emb}, prints, attribute.Seats([]), None,
                            log=lambda *_: None)
    assert all(f.ok for f in res["fits"].values()), {m: (f.reason, f.inliers, f.windows) for m, f in res["fits"].items()}
    truth = [{"from": a, "to": b, "child": k} for k, (_, spans, _) in kids.items() for a, b in spans]
    sc = replay.score(res["results"], truth)
    assert sc["total"]["wrong"] == 0 and sc["total"]["right"] >= 4
    assert set(res["speaking"]["children_s"]) <= {KA, KB}


def test_voice_admin_engine_rows_and_shown_accuracy():
    marks = {"r-lark": {"engine": "lark/1", "enrol": ["G1"]}}
    rows = [
        {"rid": "r-lark", "g": "G1", "model": "ecapa", "answer": "child", "student": KA, "best": KA, "shown": True, "sec": 60},
        {"rid": "r-lark", "g": "G2", "model": "ecapa", "answer": "child", "student": KA, "best": KA, "shown": True, "sec": 30},
        {"rid": "r-lark", "g": "G3", "model": "ecapa", "answer": "child", "student": KB, "best": KA, "shown": True, "sec": 10},
        {"rid": "r-lark", "g": "G4", "model": "ecapa", "answer": "child", "student": KB, "best": KB, "shown": False, "sec": 20},
        {"rid": "r-old", "g": "G1", "model": "ecapa", "answer": "child", "student": KC, "best": KC, "shown": True, "sec": 9},
    ]
    lark = voice_admin.engine_rows(rows, marks, "lark")
    assert [(r["rid"], r["g"]) for r in lark] == [("r-lark", "G2"), ("r-lark", "G3"), ("r-lark", "G4")]  # enrolment G1 out
    assert [r["rid"] for r in voice_admin.engine_rows(rows, marks, "old")] == ["r-old"]
    acc = voice_admin.accuracy_shown(lark)
    assert acc["total"]["right"] == 1 and acc["total"]["wrong"] == 1 and acc["total"]["unsure"] == 1
    assert acc["total"]["wrong_among_named_s_pct"] == pytest.approx(25.0)   # 10 s wrong of 40 s named
    assert acc["children"][KB] == {"right": 0, "wrong": 1, "unsure": 1, "right_s": 0.0, "wrong_s": 10.0, "unsure_s": 20.0}
    assert voice_admin.format_shown(acc)[-1].startswith("wrong among named: 50.0 %")


def test_engine_marks_kept_in_the_state_folder(pilot_root):
    multimic.note_engine("rec-1", ["G2"])
    multimic.note_engine("rec-2", [])
    assert multimic.engine_marks() == {"rec-1": {"engine": "lark/1", "enrol": ["G2"]}, "rec-2": {"engine": "lark/1", "enrol": []}}
