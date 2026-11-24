"""The voice step: taps -> turns, voice groups and suggestions, voiceprints on this laptop only,
learning from the teacher's answers. A FAKE embedder (no model): a stretch of audio holding the
constant k is "voice k". No real child, no network."""
from __future__ import annotations

import json
import sys
from types import SimpleNamespace

import numpy as np
import pytest

import nightly
import pilot_common as pc
import voice
import voiceprints
from test_nightly_fake import ROW, STEP0, FakeApi, FakeModel

SR = voice.SR
A, B, C = "aaaaaaaa-0000-4000-8000-00000000000a", "bbbbbbbb-0000-4000-8000-00000000000b", "cccccccc-0000-4000-8000-00000000000c"
BASIS = {1: A, 2: B, 3: C}


class XorCodec:
    """Stands in for DPAPI in tests: reversible, and the file is not readable JSON."""
    def protect(self, d: bytes) -> bytes:
        return bytes(x ^ 0x5A for x in d)

    def unprotect(self, d: bytes) -> bytes:
        return bytes(x ^ 0x5A for x in d)


@pytest.fixture(autouse=True)
def codec(monkeypatch):
    monkeypatch.setattr(voiceprints, "CODEC", XorCodec())


class FakeEmbedder:
    def __init__(self, noise=0.05, seed=1):
        self.rng, self.noise, self.calls = np.random.default_rng(seed), noise, 0

    def embed(self, x):
        self.calls += 1
        k = int(round(float(np.median(x)) * 10))
        v = np.zeros(8)
        v[max(0, min(7, k))] = 1.0
        v = v + self.rng.normal(0, self.noise, 8)
        return v / np.linalg.norm(v)


def audio_of(spans, seconds=120):
    """spans: [(from, to, voice k)] -> 16 kHz audio holding k/10 there, 0 elsewhere."""
    x = np.zeros(int(seconds * SR), dtype=np.float32)
    for a, b, k in spans:
        x[int(a * SR): int(b * SR)] = k / 10
    return x


def line(t, e, who=None):
    d = {"t": t, "e": e, "text": "words"}
    if who:
        d["who"] = who
    return d


# ------------------------------------------------------------------ taps
def test_a_tap_on_one_child_is_a_turn_until_the_next_tap():
    turns = voice.tap_turns([{"t_s": 10, "kind": "student", "student_ids": [A]},
                             {"t_s": 30, "kind": "student", "student_ids": [B]},
                             {"t_s": 45, "kind": "stop", "student_ids": []}], 120)
    assert turns == [(A, 10.5, 30.0), (B, 30.5, 45.0)]


def test_a_turn_ends_on_its_own_when_the_teacher_speaks_and_after_a_minute():
    labels = np.array(["-"] * 120, dtype=object)
    labels[20:23] = "T"
    turns = voice.tap_turns([{"t_s": 10, "kind": "student", "student_ids": [A]},
                             {"t_s": 50, "kind": "student", "student_ids": [B]}], 200, labels)
    assert turns[0] == (A, 10.5, 20)                       # two seconds of the teacher end it at 20 s
    assert turns[1] == (B, 50.5, 110.5)                    # nobody tapped after: capped at 60 s


def test_a_conversation_tap_is_not_one_childs_voice():
    turns = voice.tap_turns([{"t_s": 10, "kind": "student", "student_ids": [A, B]},
                             {"t_s": 40, "kind": "teacher", "student_ids": []}], 120)
    assert turns == []


# ------------------------------------------------------------------ suggestions
def test_a_suggestion_needs_length_a_high_score_and_a_clear_margin():
    e = np.eye(4)
    prints = {A: e[0], B: e[1]}
    assert voice.suggest(e[0], 10, prints) == (A, 1.0)
    assert voice.suggest(e[0], 3, prints) is None                       # too short
    between = voice.unit(e[0] + e[1])                                   # 0.71 to both: no margin
    assert voice.suggest(between, 10, prints) is None
    assert voice.suggest(voice.unit(e[0] + 1.2 * e[2]), 10, prints) is None   # 0.64: under the threshold
    assert voice.suggest(e[2], 10, prints) is None                       # an unknown voice


def test_with_one_known_child_the_score_must_clear_the_margin_too():
    e = np.eye(4)
    near = voice.unit(e[0] + 0.85 * e[1])                               # about 0.76 to A
    assert voice.suggest(near, 10, {A: e[0]}) == (A, round(float(np.dot(near, e[0])), 3))
    weak = voice.unit(e[0] + 1.05 * e[1])                               # about 0.69: over 0.66, under 0.71
    assert voice.suggest(weak, 10, {A: e[0]}) is None


# ------------------------------------------------------------------ one lesson
def test_lines_are_grouped_by_voice_and_long_known_voices_get_a_suggestion():
    audio = audio_of([(2, 6, 3), (10, 14, 1), (20, 24, 1), (30, 34, 2), (40, 41.5, 2), (50, 55, 7)])
    lines = [line(2, 6, "T"), line(10, 14), line(20, 24), line(30, 34), line(40, 41.5), line(50, 50.5)]
    e = np.eye(8)
    res = voice.analyse(audio, lines, [(A, 9.5, 15.0)], FakeEmbedder(), {A: e[1], B: e[2]})
    assert res["tapped"] == {1: A}                                       # the line inside the tapped turn
    assert 0 not in res["group_of"] and 5 not in res["group_of"]         # the teacher's line; a 0.5 s line
    g = {x["key"]: x for x in res["groups"]}
    assert res["group_of"][1] == res["group_of"][2] == "G1" and g["G1"]["seconds"] == 8.0
    assert g["G1"]["suggested"] == A                                     # 8 s of A's voice
    assert res["group_of"][3] == res["group_of"][4] == "G2"
    assert g["G2"]["suggested"] is None                                  # only 5.5 s of B: too short to name
    assert [len(v) for v in res["samples"].values()] == [2]              # 5.5 s tapped -> 3 s + 2.5 s windows


def test_the_report_carries_no_embedding():
    res = voice.analyse(audio_of([(10, 18, 1)]), [line(10, 18)], [], FakeEmbedder(), {})
    part = json.dumps(voice.body_part(res))
    assert '"vec"' not in part and "groups" in part


# ------------------------------------------------------------------ voiceprints on this laptop
def test_voiceprints_are_encrypted_tagged_and_deleted_on_withdrawal(pilot_root):
    e = np.eye(8)
    voiceprints.add(A, [(e[1], 3.0), (e[1], 2.0)], "tap", "rec1")
    voiceprints.add(B, [(e[2], 4.0)], "answer", "rec1", "G2")
    raw = (voiceprints.vp_dir() / f"{A}.vp").read_bytes()
    assert raw.startswith(voiceprints.MAGIC) and b"student_id" not in raw
    assert voiceprints.load(A).seconds() == 5.0
    assert set(voiceprints.centroids()) == {A, B}
    assert voiceprints.remove_tag("rec1", "G2") == 1 and voiceprints.load(B).samples == []
    voiceprints.add(B, [(e[2], 4.0)], "tap", "rec2")
    assert voiceprints.sync_allowed({A}) == 1 and voiceprints.load(B) is None
    assert voiceprints.delete_all() >= 1 and voiceprints.load_all() == {}


@pytest.mark.skipif(sys.platform != "win32", reason="DPAPI is Windows only")
def test_dpapi_round_trip_on_this_laptop():
    d = voiceprints.Dpapi()
    secret = b'{"student_id":"x"}'
    sealed = d.protect(secret)
    assert sealed != secret and secret not in sealed and d.unprotect(sealed) == secret


# ------------------------------------------------------------------ through the overnight job
class VoiceApi(FakeApi):
    def __init__(self, marks=(), answers=(), **kw):
        super().__init__(**kw)
        self.marks, self.answers, self.voice_saved, self.learned = list(marks), list(answers), [], []

    def rpc(self, fn, args=None):
        if fn == "lesson_monitor_save_voice_groups":
            self.voice_saved.append(args)
            return {"groups": len(args["p_groups"])}
        if fn == "lesson_monitor_voiceprint_allowed":
            return [{"student_id": A}]
        if fn == "lesson_monitor_voice_answers":
            return self.answers
        if fn == "lesson_monitor_voice_learned":
            self.learned.append(args)
            return len(args["p_groups"])
        return super().rpc(fn, args)

    def select(self, table, query):
        if table == "lesson_speaker_marks":
            self.calls.append(table)
            return list(self.marks)
        return super().select(table, query)


class RoomLines(FakeModel):
    """Two lines in the room's loud blocks (lesson 21-25 s and 51-56 s)."""
    def transcribe(self, audio, **kw):
        self.kw = kw
        def gen():
            for a, b, text in [(21, 25, "I like football."), (51, 56, "My favourite is red.")]:
                yield SimpleNamespace(start=a, end=b, text=text, avg_logprob=-0.3, no_speech_prob=0.05, compression_ratio=1.2,
                                      words=[SimpleNamespace(word=w, start=a, end=b, probability=0.9) for w in text.split()])
        return gen(), SimpleNamespace(language="en")


def test_the_overnight_job_marks_tapped_lines_saves_groups_and_learns_only_consented_taps(pilot_root, monkeypatch):
    emb = FakeEmbedder()
    monkeypatch.setattr(nightly, "VOICE", {"allowed": {A}, "embedder": emb})
    # The lesson starts 20 s into the recording: a tap at recording 40 s is lesson 20 s.
    api = VoiceApi(marks=[{"kind": "student", "student_ids": [A], "offset_ms": 40000},
                          {"kind": "student", "student_ids": [B], "offset_ms": 70000}])
    assert nightly.process_one(api, ROW, RoomLines(), dict(STEP0, talk_pass=False), keep_local=False) == "saved"
    body = api.saved[0]["p_body"]
    assert body["lines"][0].get("m") == A and body["lines"][1].get("m") == B
    assert all("g" in ln for ln in body["lines"]) and body["voice"]["groups"]
    assert '"vec"' not in json.dumps(body)
    assert api.voice_saved and api.voice_saved[0]["p_recording"] == ROW["recording_id"]
    assert voiceprints.load(A) is not None and voiceprints.load(A).seconds() > 0   # A has consent
    assert voiceprints.load(B) is None                                               # B has none: tapped, not learned
    assert voiceprints.load_pending(ROW["recording_id"])["groups"]
    assert pc.files_under(pc.audio_dir()) == []


def test_a_voice_problem_never_costs_the_report(pilot_root, monkeypatch):
    class Broken:
        def embed(self, x):
            raise RuntimeError("model gone")
    monkeypatch.setattr(nightly, "VOICE", {"allowed": {A}, "embedder": Broken()})
    api = VoiceApi()
    assert nightly.process_one(api, ROW, RoomLines(), dict(STEP0, talk_pass=False), keep_local=False) == "saved"
    body = api.saved[0]["p_body"]
    assert "voice" not in body and all("g" not in ln for ln in body["lines"]) and api.voice_saved == []


def test_answers_teach_the_named_child_and_a_correction_moves_the_samples(pilot_root):
    e = np.eye(8)
    voiceprints.save_pending("rec1", "2026-11-24", {"G1": (e[1], 9.0), "G2": (e[2], 7.0)})
    ctx = {"allowed": {A, B}}
    api = VoiceApi(answers=[
        {"recording_id": "rec1", "group_key": "G1", "answer": "child", "student_id": A, "may_learn": True,
         "suggested_student": A, "suggested_score": 0.8},
        {"recording_id": "rec1", "group_key": "G2", "answer": "several", "student_id": None, "may_learn": False,
         "suggested_student": None, "suggested_score": None}])
    assert nightly.learn_from_answers(api, ctx) == 1
    assert voiceprints.load(A).seconds() == 9.0 and api.learned == [{"p_recording": "rec1", "p_groups": ["G1", "G2"]}]
    assert voiceprints.read_calibration()[0]["agreed"] is True
    # The teacher changes G1 to B: the samples move.
    api2 = VoiceApi(answers=[{"recording_id": "rec1", "group_key": "G1", "answer": "child", "student_id": B, "may_learn": True,
                              "suggested_student": A, "suggested_score": 0.8}])
    nightly.learn_from_answers(api2, ctx)
    assert voiceprints.load(A).seconds() == 0 and voiceprints.load(B).seconds() == 9.0
    assert voiceprints.read_calibration()[-1]["agreed"] is False


def test_without_the_voiceprint_migration_the_voice_step_is_off(pilot_root):
    from supa import ApiError

    class Old(FakeApi):
        def rpc(self, fn, args=None):
            if fn == "lesson_monitor_voiceprint_allowed":
                raise ApiError(404, "not found")
            return super().rpc(fn, args)
    assert nightly.prepare_voice(Old()) is None
