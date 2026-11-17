"""Building the teacher's report from a SYNTHETIC transcript and synthetic levels.
No audio, no real lesson: the lines are made up here."""
from __future__ import annotations

import json
import re

import numpy as np

import levels
import report

DUR = 1500  # 25 minutes


def synthetic_levels(teacher_speaks, room_speaks, quiet=(), clip_seconds=()):
    """Per-second dB: floors at -60, speech 25 dB up; the lapel rises much more for the teacher."""
    t = np.full(DUR, -60.0)
    r = np.full(DUR, -55.0)
    for a, b in teacher_speaks:
        t[a:b] = -20.0
        r[a:b] = -40.0
    for a, b in room_speaks:
        t[a:b] = -45.0
        r[a:b] = -25.0
    for a, b in quiet:
        t[a:b] = -60.0
        r[a:b] = -55.0
    peak = t + 10
    for s in clip_seconds:
        peak[s] = 0.0
    cov = np.ones(DUR, dtype=bool)
    return {"teacher_db": t, "teacher_cov": cov, "teacher_peak": peak, "room_db": r, "room_cov": cov.copy()}


SEGS = [
    {"start": 10, "end": 14, "text": "Good afternoon everyone. Today we learn about animals.", "avg_logprob": -0.2, "no_speech_prob": 0.01, "compression_ratio": 1.2},
    {"start": 20, "end": 23, "text": "I can see an elephant.", "avg_logprob": -0.3, "no_speech_prob": 0.02, "compression_ratio": 1.1},
    {"start": 30, "end": 33, "text": "Can you see the giraffes?", "avg_logprob": -0.25, "no_speech_prob": 0.02, "compression_ratio": 1.1},
    {"start": 40, "end": 42, "text": "he go home", "avg_logprob": -1.4, "no_speech_prob": 0.1, "compression_ratio": 1.0},
    {"start": 1400, "end": 1402, "text": "Thank you thank you thank you", "avg_logprob": -0.4, "no_speech_prob": 0.1, "compression_ratio": 3.1},
    {"start": 1450, "end": 1453, "text": "We played and we jumped.", "avg_logprob": -0.3, "no_speech_prob": 0.05, "compression_ratio": 1.2},
]
TARGETS = {"source": "teacher", "words": ["elephant", "giraffe", "zebra"], "structures": ["can / can't"]}
COVERAGE = {"room_until_s": float(DUR), "teacher_until_s": float(DUR)}


def build(step0, lv=None, coverage=COVERAGE, markers=()):
    lv = lv or synthetic_levels(teacher_speaks=[(10, 15), (30, 34), (1450, 1454)], room_speaks=[(20, 24), (40, 43), (100, 160), (1400, 1403)],
                                quiet=[(200, 1390)], clip_seconds=range(500, 520))
    return report.build_report(SEGS, lv, DUR, TARGETS, list(markers), step0, coverage, {"model": "test"})


def test_shape_matches_what_the_database_accepts():
    b = build({"words_pass": True, "grammar_pass": True, "talk_pass": True})
    assert b["schema"] == "hec-lesson-monitor/1"
    assert set(b) <= {"schema", "lesson", "notes", "lines", "unwritten", "targets", "patterns", "flags", "talk_time", "coverage", "settings"}
    text = json.dumps(b)
    assert not re.search(r'"(student_id|student_name|child_id|child_name|speaker_name|full_name)"', text)
    assert "Vietnamese is not transcribed." in b["notes"]


def test_uncertain_and_faded_lines_are_marked_never_dropped():
    b = build({"words_pass": True, "grammar_pass": True, "talk_pass": False})
    by_text = {ln["text"]: ln for ln in b["lines"]}
    assert len(b["lines"]) == len(SEGS)
    assert by_text["he go home"]["u"] is True                         # low confidence
    assert by_text["Thank you thank you thank you"]["u"] is True       # repetition (compression)
    assert by_text["I can see an elephant."]["u"] is False
    lv = synthetic_levels(teacher_speaks=[], room_speaks=[(20, 24)])
    b2 = build({"talk_pass": False}, lv=lv)
    assert {ln["text"]: ln["f"] for ln in b2["lines"]}["Good afternoon everyone. Today we learn about animals."] is True
    assert {ln["text"]: ln["f"] for ln in b2["lines"]}["I can see an elephant."] is False


def test_talk_time_only_after_step0_passed_for_it():
    off = build({"words_pass": True, "grammar_pass": True, "talk_pass": False})
    assert "talk_time" not in off
    assert all("who" not in ln for ln in off["lines"])
    assert all("teacher_mic" not in w for w in off["targets"]["words"])
    on = build({"words_pass": True, "grammar_pass": True, "talk_pass": True})
    tt = on["talk_time"]
    assert tt["teacher_pct"][0] <= tt["teacher_pct"][1] and tt["teacher_pct"][0] % 5 == 0
    assert tt["others_pct"] == [100 - tt["teacher_pct"][1], 100 - tt["teacher_pct"][0]]
    assert set(tt["timeline"]) <= {"T", "O", "-"}
    who = {ln["text"]: ln.get("who") for ln in on["lines"]}
    assert who["Good afternoon everyone. Today we learn about animals."] == "T"
    assert who["I can see an elephant."] is None                       # never a child's name, only "T" or nothing


def test_target_words_heard_and_not_written():
    b = build({"talk_pass": False})
    w = {x["word"]: x for x in b["targets"]["words"]}
    assert w["elephant"]["heard"] and w["elephant"]["times"] == [20]
    assert w["giraffe"]["heard"]                                        # plural matches
    assert w["zebra"]["heard"] is False
    assert b["targets"]["structures"] == [{"name": "can / can't", "count": 2, "times": [20, 30]}]
    assert any(f["kind"] == "targets_not_written" and f["text"] == "1 of 3 target words not written." for f in b["flags"])
    assert b["patterns"]["questions"] == 1 and b["patterns"]["past_ed"] == 2


def test_flags_are_class_level_and_factual():
    b = build({"talk_pass": False}, coverage={"room_until_s": 900.0, "teacher_until_s": float(DUR)},
              markers=[{"kind": "gap", "t_s": 300.0}])
    kinds = [f["kind"] for f in b["flags"]]
    assert "room_quiet" in kinds                                       # 200-1390 has no room speech
    quiet = next(f for f in b["flags"] if f["kind"] == "room_quiet")
    assert quiet["t"] <= 200 and quiet["e"] >= 1390
    assert any(f["kind"] == "room_missing" and "after 15:00" in f["text"] for f in b["flags"])
    assert any(f["kind"] == "teacher_mic_loud" for f in b["flags"])
    assert any(f["kind"] == "recorder_gap" and "5:00" in f["text"] for f in b["flags"])
    assert not any(re.search(r"\b(did not speak|participat|score|grade|CEFR)\b", f["text"], re.I) for f in b["flags"])


def test_unwritten_room_speech_is_an_estimate_band():
    b = build({"talk_pass": False})
    assert b["unwritten"] and b["unwritten"][0]["t"] <= 100 and b["unwritten"][0]["e"] >= 159
    assert b["lesson"]["unwritten_seconds"] >= 55


def test_learner_errors_are_not_counted_before_step0():
    pending = build({"words_pass": True, "grammar_pass": False})
    assert report.STEP0_PENDING_NOTE in pending["notes"]
    assert report.STEP0_PENDING_NOTE not in build({"words_pass": True, "grammar_pass": True})["notes"]


def test_local_html_escapes_the_transcript():
    b = build({"talk_pass": False})
    b["lines"][0]["text"] = "<script>alert(1)</script>"
    page = report.render_html(b)
    assert "<script>alert" not in page and "&lt;script&gt;" in page
    assert "Do not send by Zalo" in page


def test_levels_helpers():
    assert levels.runs(np.array([1, 1, 0, 1, 0, 0, 0, 1], dtype=bool), min_len=1, merge_gap=1) == [(0, 4), (7, 8)]
    m = levels.LevelMeter(100)
    m.add(np.ones(150, dtype=np.float32) * 0.1, 0.0)
    m.add(np.ones(100, dtype=np.float32) * 0.5, 3.0)
    db, peak, cov = m.result()
    assert list(cov) == [True, True, False, True]
    assert round(float(db[0]), 1) == -20.0 and round(float(peak[3]), 1) == -6.0
    assert levels.clipped_minutes(np.array([0.0] * 3 + [-10.0] * 57 + [0.0] * 2 + [-10.0] * 58)) == 1
