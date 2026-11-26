"""The numbers behind Admin > Voices (20261126090000): what the laptop publishes, and that it is only counts,
rates and seconds. Everything is made up."""
from __future__ import annotations

import json

import numpy as np

import nightly
import voice
import voice_admin
import voiceprints

A = "aaaaaaaa-0000-4000-8000-000000000000"
B = "bbbbbbbb-0000-4000-8000-000000000000"


class Api:
    def __init__(self, fail=False):
        self.calls, self.fail = [], fail

    def rpc(self, name, args=None):
        if self.fail:
            raise RuntimeError("down")
        self.calls.append((name, args))
        return {"id": 7}


def _cal(rid, g, answer, student, best, score, sec=12.0):
    return {"rid": rid, "g": g, "answer": answer, "student": student, "model": "ecapa", "best": best, "score": score,
            "second": 0.2, "shown": True, "blind": False, "sec": sec}


def _vp(sid, seconds, n=2):
    return voiceprints.Voiceprint(sid, [{"e": [1.0, 0.0], "s": seconds / n} for _ in range(n)])


def test_the_snapshot_holds_accuracy_seconds_and_settings_only():
    rows = [_cal("r1", "G1", "child", A, A, 0.9), _cal("r1", "G2", "child", A, B, 0.9)]
    snap = voice_admin.build_snapshot(rows, {A: _vp(A, 61.0), B: _vp(B, 8.0, 1)})
    assert set(snap) == {"accuracy", "enrolment", "settings"}
    assert snap["enrolment"] == [{"student_id": A, "seconds": 61.0, "samples": 2}, {"student_id": B, "seconds": 8.0, "samples": 1}]
    assert snap["accuracy"]["ecapa"]["n"] == 2
    assert snap["accuracy"]["ecapa"]["named_correct"] == 1 and snap["accuracy"]["ecapa"]["named_wrong"] == 1
    assert snap["settings"]["shown_model"] == voice.SETTINGS["shown_model"]
    assert snap["settings"]["enrol_min_s"] == voice.SETTINGS["enrol_min_s"]
    json.dumps(snap)  # it goes over the wire as JSON


def test_no_embedding_or_audio_can_be_in_a_snapshot():
    vp = voiceprints.Voiceprint(A, [{"e": [0.123456, 0.654321], "s": 30.0}])
    text = json.dumps(voice_admin.build_snapshot([], {A: vp}))
    assert "0.123456" not in text and "0.654321" not in text
    assert set(voice_admin.build_snapshot([], {A: vp})["enrolment"][0]) == {"student_id", "seconds", "samples"}


def test_publish_sends_one_rpc(monkeypatch):
    monkeypatch.setattr(voiceprints, "read_calibration", lambda: [])
    monkeypatch.setattr(voiceprints, "load_all", lambda model=voiceprints.DEFAULT_MODEL: {})
    api = Api()
    assert voice_admin.publish(api) == {"id": 7}
    assert [c[0] for c in api.calls] == ["lesson_monitor_publish_voice_stats"]
    assert set(api.calls[0][1]["p_stats"]) == {"accuracy", "enrolment", "settings"}


def test_a_failed_publish_never_stops_the_nightly_run(monkeypatch):
    monkeypatch.setattr(voiceprints, "read_calibration", lambda: [])
    monkeypatch.setattr(voiceprints, "load_all", lambda model=voiceprints.DEFAULT_MODEL: {})
    nightly.publish_voice_stats(Api(fail=True))  # logs a code, raises nothing
