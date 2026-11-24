"""Several speaker models side by side: the shown model's guess is the only one the teacher sees, every
model is scored silently against the teacher's answers, and about 1 in 4 groups carry no guess on purpose.
FAKE embedders (no model): a stretch of audio holding the constant k is "voice k" in every model, but each
model puts voice k on a different axis, so one model's voiceprints mean nothing to another."""
from __future__ import annotations

import json
import sys
from types import SimpleNamespace

import numpy as np
import pytest

import nightly
import pilot_common as pc
import voice
import voice_admin
import voiceprints
from test_nightly_fake import ROW, STEP0
from test_voice import A, B, RoomLines, VoiceApi, XorCodec, audio_of, line  # noqa: F401  (codec fixture below)


@pytest.fixture(autouse=True)
def codec(monkeypatch):
    monkeypatch.setattr(voiceprints, "CODEC", XorCodec())


class Fake:
    """Voice k sits on axis (k + shift) % 8 of this model."""
    def __init__(self, name, shift=0, fail=False, seed=1):
        self.name, self.shift, self.fail, self.dims = name, shift, fail, 8
        self.rng = np.random.default_rng(seed)

    def embed(self, x):
        if self.fail:
            raise RuntimeError("model broke")
        k = int(round(float(np.median(x)) * 10))
        v = np.zeros(8)
        v[(max(0, min(7, k)) + self.shift) % 8] = 1.0
        v = v + self.rng.normal(0, 0.05, 8)
        return v / np.linalg.norm(v)


def axis(k, shift):
    v = np.zeros(8)
    v[(k + shift) % 8] = 1.0
    return v


def settings(**kw):
    return dict(voice.SETTINGS, blind_fraction=0.0, **kw)


def lesson():
    audio = audio_of([(10, 14, 1), (20, 24, 1), (30, 34, 2), (40, 41.5, 2)])
    lines = [line(10, 14), line(20, 24), line(30, 34), line(40, 41.5)]
    return audio, lines


EMBS = lambda: {"ecapa": Fake("ecapa", 0), "alt": Fake("alt", 3)}  # noqa: E731
PRINTS = lambda: {"ecapa": {A: axis(1, 0), B: axis(2, 0)}, "alt": {A: axis(1, 3), B: axis(2, 3)}}  # noqa: E731


# ------------------------------------------------------------------ hidden guesses
def test_every_model_makes_a_guess_on_the_same_groups_and_only_the_shown_one_is_in_the_body():
    audio, lines = lesson()
    res = voice.analyse(audio, lines, [], EMBS(), PRINTS(), s=settings(), rid="rec1")
    g1 = res["groups"][0]
    assert g1["key"] == "G1" and g1["suggested"] == A and g1["blind"] is False
    assert set(g1["guesses"]) == {"ecapa", "alt"}
    assert g1["guesses"]["alt"]["best"] == A and g1["guesses"]["alt"]["second"] is not None
    assert [g["key"] for g in res["groups"]] == ["G1", "G2"]
    body = json.dumps(voice.body_part(res))
    assert "guess" not in body and "alt" not in body and "blind" not in body and '"vec' not in body
    assert set(res["samples_by_model"]) == {"ecapa", "alt"}


def test_hidden_guesses_wait_in_the_encrypted_pending_file_and_never_reach_the_database(pilot_root):
    audio, lines = lesson()
    res = voice.analyse(audio, lines, [], EMBS(), PRINTS(), s=settings(), rid="rec1")
    res["shown_model"] = "ecapa"
    sent = []

    class Api:
        def rpc(self, fn, args=None):
            sent.append((fn, args))
            return {}
    nightly.finish_voice(Api(), {"recording_id": "rec1", "session_date": "2026-11-24"}, res)
    fn, args = sent[0]
    assert fn == "lesson_monitor_save_voice_groups"
    assert set(args["p_groups"][0]) == {"key", "seconds", "lines", "suggested", "score"}
    assert "alt" not in json.dumps(args) and "guess" not in json.dumps(args)
    raw = (voiceprints.pending_dir() / "rec1.vp").read_bytes()
    assert b"guess" not in raw and b"alt" not in raw                     # encrypted
    pend = voiceprints.load_pending("rec1")
    g = pend["groups"]["G1"]
    assert pend["shown_model"] == "ecapa" and g["shown"] is True and g["blind"] is False
    assert set(g["guess"]) == {"ecapa", "alt"} and set(g["es"]) == {"ecapa", "alt"}


# ------------------------------------------------------------------ blind groups
def test_blind_groups_get_no_suggestion_are_deterministic_and_only_count_when_a_suggestion_was_due():
    audio, lines = lesson()
    s = dict(voice.SETTINGS, blind_fraction=1.0)
    res = voice.analyse(audio, lines, [], EMBS(), PRINTS(), s=s, rid="rec1")
    g1, g2 = res["groups"]
    assert g1["suggested"] is None and g1["score"] is None and g1["blind"] is True
    assert "ecapa" in g1["guesses"]                                      # the guess is still kept, hidden
    assert g2["blind"] is False and g2["suggested"] is None              # 1.5 s of voice: never due a suggestion
    again = voice.analyse(audio, lines, [], EMBS(), PRINTS(), s=s, rid="rec1")
    assert [g["blind"] for g in again["groups"]] == [g["blind"] for g in res["groups"]]
    assert voice.analyse(audio, lines, [], EMBS(), PRINTS(), s=s, rid=None)["groups"][0]["suggested"] == A  # no rid: nothing blind


def test_about_one_group_in_four_is_blind():
    n = sum(voice.is_blind(f"rec{i}", f"G{j}") for i in range(100) for j in range(1, 5))
    assert 0.20 * 400 <= n <= 0.30 * 400
    assert all(voice.is_blind("r", "G1") == voice.is_blind("r", "G1") for _ in range(3))


# ------------------------------------------------------------------ a failing extra model
def test_an_extra_model_that_breaks_is_left_out_while_the_shown_one_works():
    audio, lines = lesson()
    embs = {"ecapa": Fake("ecapa", 0), "alt": Fake("alt", 3, fail=True)}
    res = voice.analyse(audio, lines, [], embs, PRINTS(), s=settings(), rid="rec1")
    assert res["skipped"] == ["alt"] and set(res["groups"][0]["guesses"]) == {"ecapa"}
    assert res["groups"][0]["suggested"] == A
    with pytest.raises(RuntimeError):                                    # the shown model failing is not hidden
        voice.analyse(audio, lines, [], {"ecapa": Fake("ecapa", fail=True)}, PRINTS(), s=settings())


def fake_embedders(monkeypatch, names=("ecapa", "alt", "bad", "flaky"), shown_fails=False):
    def load(name):
        if name == "bad" or (name == "ecapa" and shown_fails):
            raise RuntimeError("cannot load")
        return Fake(name, {"ecapa": 0, "alt": 3, "flaky": 5}[name], fail=(name == "flaky"))
    mod = SimpleNamespace(available=lambda: list(names), load=load)
    monkeypatch.setitem(sys.modules, "embedders", mod)


def test_through_the_overnight_job_models_that_fail_are_skipped_and_the_report_is_kept(pilot_root, monkeypatch):
    fake_embedders(monkeypatch)
    monkeypatch.setitem(voice.SETTINGS, "blind_fraction", 0.0)
    voiceprints.add(A, [(axis(1, 0), 30.0)], "tap", "old")
    voiceprints.add(A, [(axis(1, 3), 30.0)], "tap", "old", None, "alt")
    monkeypatch.setattr(nightly, "VOICE", {"allowed": {A}, "embedders": None})
    api = VoiceApi(marks=[{"kind": "student", "student_ids": [A], "offset_ms": 40000}])
    assert nightly.process_one(api, ROW, RoomLines(), dict(STEP0, talk_pass=False), keep_local=False) == "saved"
    body = api.saved[0]["p_body"]
    assert body["voice"]["groups"] and "alt" not in json.dumps(body)
    assert set(nightly.VOICE["embedders"]) == {"ecapa", "alt"}           # bad never loaded, flaky dropped on its first embed
    g = voiceprints.load_pending(ROW["recording_id"])["groups"]
    assert g and all(set(x["guess"]) <= {"ecapa", "alt"} for x in g.values())
    assert voiceprints.load(A, "alt").seconds() > 30 and voiceprints.load(A, "ecapa").seconds() > 30  # taps teach every model
    assert "alt" not in json.dumps(api.voice_saved)


def test_if_the_shown_model_cannot_load_the_report_goes_without_voices(pilot_root, monkeypatch):
    fake_embedders(monkeypatch, shown_fails=True)
    monkeypatch.setattr(nightly, "VOICE", {"allowed": {A}, "embedders": None})
    api = VoiceApi()
    assert nightly.process_one(api, ROW, RoomLines(), dict(STEP0, talk_pass=False), keep_local=False) == "saved"
    body = api.saved[0]["p_body"]
    assert "voice" not in body and api.voice_saved == [] and all("g" not in ln for ln in body["lines"])


# ------------------------------------------------------------------ voiceprints per model
def test_voiceprints_are_one_file_per_child_per_model_and_every_command_covers_all(pilot_root):
    voiceprints.add(A, [(axis(1, 0), 5.0)], "tap", "r1")
    voiceprints.add(A, [(axis(1, 3), 5.0)], "tap", "r1", None, "alt")
    voiceprints.add(B, [(axis(2, 3), 5.0)], "answer", "r1", "G2", "alt")
    names = sorted(p.name for p in voiceprints.vp_dir().glob("*.vp"))
    assert names == [f"{A}.alt.vp", f"{A}.vp", f"{B}.alt.vp"]            # ECAPA keeps its original file name
    assert set(voiceprints.centroids(model="alt")) == {A, B} and set(voiceprints.centroids()) == {A}
    assert voiceprints.remove_tag("r1", "G2") == 1 and voiceprints.load(B, "alt").samples == []
    assert voiceprints.sync_allowed({A}) == 1 and voiceprints.load(B, "alt") is None
    assert voiceprints.delete(A) is True and voiceprints.load(A) is None and voiceprints.load(A, "alt") is None
    voiceprints.add(A, [(axis(1, 0), 5.0)], "tap", "r2", None, "alt")
    assert voiceprints.delete_all() >= 1 and voiceprints.load_every() == []


def pending(rid="rec1", blind=False, shown=True):
    voiceprints.save_pending(rid, "2026-11-24", {
        "G1": (axis(1, 0), 9.0, {"vecs": {"ecapa": axis(1, 0), "alt": axis(1, 3)}, "blind": blind, "shown": shown,
                                 "guess": {"ecapa": {"best": A, "score": 0.8, "second": 0.1},
                                           "alt": {"best": B, "score": 0.9, "second": 0.2}}})}, "ecapa")


def answer(student, group="G1", suggested=A):
    return {"recording_id": "rec1", "group_key": group, "answer": "child", "student_id": student, "may_learn": True,
            "suggested_student": suggested, "suggested_score": 0.8}


def test_an_answer_scores_every_model_and_teaches_every_models_voiceprint(pilot_root):
    pending()
    assert nightly.learn_from_answers(VoiceApi(answers=[answer(A)]), {"allowed": {A, B}}) == 1
    rows = {r["model"]: r for r in voiceprints.read_calibration()}
    assert set(rows) == {"ecapa", "alt"}
    assert rows["ecapa"] == {"rid": "rec1", "g": "G1", "answer": "child", "student": A, "model": "ecapa", "shown": True,
                             "blind": False, "best": A, "score": 0.8, "second": 0.1, "sec": 9.0, "agreed": True}
    assert rows["alt"]["shown"] is False and rows["alt"]["agreed"] is False and rows["alt"]["best"] == B
    assert voiceprints.load(A).seconds() == 9.0 and voiceprints.load(A, "alt").seconds() == 9.0
    nightly.learn_from_answers(VoiceApi(answers=[answer(B)]), {"allowed": {A, B}})      # corrected: samples move, in both models
    assert voiceprints.load(A).seconds() == 0 and voiceprints.load(A, "alt").seconds() == 0
    assert voiceprints.load(B).seconds() == 9.0 and voiceprints.load(B, "alt").seconds() == 9.0


def test_a_blind_group_is_scored_too_and_marked_blind(pilot_root):
    pending(blind=True, shown=False)
    nightly.learn_from_answers(VoiceApi(answers=[answer(A, suggested=None)]), {"allowed": {A}})
    rows = voiceprints.read_calibration()
    assert len(rows) == 2 and all(r["blind"] and not r["shown"] for r in rows)


def test_a_pending_file_from_before_the_models_still_teaches_ecapa(pilot_root):
    voiceprints.save_pending("rec1", "2026-11-24", {"G1": (axis(1, 0), 9.0)})
    nightly.learn_from_answers(VoiceApi(answers=[answer(A)]), {"allowed": {A}})
    assert voiceprints.load(A).seconds() == 9.0 and voiceprints.load(A, "alt") is None
    assert [r["model"] for r in voiceprints.read_calibration()] == ["ecapa"]


# ------------------------------------------------------------------ accuracy
def row(model, best, score, second, student, g, shown=False, blind=False, sec=9.0, rid="r"):
    return {"rid": rid, "g": g, "model": model, "shown": shown, "blind": blind, "best": best, "score": score,
            "second": second, "answer": "child", "student": student, "agreed": best == student, "sec": sec}


def test_accuracy_per_model_with_a_sweep_and_the_shown_vs_blind_split():
    rows = [
        row("ecapa", A, 0.80, 0.30, A, "G1", shown=True),       # named, right
        row("ecapa", B, 0.70, 0.30, A, "G2", shown=True),       # named, wrong child
        row("ecapa", A, 0.50, 0.30, A, "G3"),                   # under 0.66: not sure
        row("ecapa", A, 0.90, 0.20, A, "G4", blind=True),       # blind, right
        row("ecapa", A, 0.90, 0.20, A, "G5", sec=3.0),          # too short: not counted
        row("alt", A, 0.75, 0.30, A, "G1"),
        row("alt", B, 0.76, 0.30, A, "G2"),
        row("alt", A, 0.60, 0.30, A, "G3"),
        row("alt", A, 0.85, 0.30, A, "G4"),
        dict(row("ecapa", A, 0.8, 0.3, B, "G6"), answer="several"),   # not one child: ignored
    ]
    res = voice_admin.accuracy(rows, voice.SETTINGS)
    e, a = res["ecapa"], res["alt"]
    assert (e["n"], e["named_correct"], e["named_wrong"], e["not_sure"]) == (4, 2, 1, 1)
    assert (e["named_correct_pct"], e["named_wrong_pct"], e["not_sure_pct"]) == (50.0, 25.0, 25.0)
    sweep = {x["threshold"]: (x["named"], x["wrong"]) for x in e["sweep"]}
    assert sweep[0.50] == (4, 1) and sweep[0.75] == (2, 0) and sweep[0.85] == (1, 0)
    assert e["shown_vs_blind"] == {"shown": {"n": 2, "agreed": 1, "agreed_pct": 50.0},
                                   "blind": {"n": 1, "agreed": 1, "agreed_pct": 100.0}}
    assert (a["n"], a["threshold"]) == (4, 0.70) and "shown_vs_blind" not in a
    assert (a["named_correct"], a["named_wrong"], a["not_sure"]) == (2, 1, 1)
    assert voice_admin.format_accuracy(res)


def test_accuracy_reads_old_rows_and_counts_a_changed_answer_once():
    old = {"rid": "r", "g": "G1", "suggested": A, "score": 0.8, "answer": "child", "student": A, "agreed": True}
    moved = dict(old, student=B, agreed=False)
    res = voice_admin.accuracy([old, moved], voice.SETTINGS)
    assert res["ecapa"]["n"] == 1 and res["ecapa"]["named_wrong"] == 1
