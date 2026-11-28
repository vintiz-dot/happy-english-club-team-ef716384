"""enrol.py: a tapped child's 2-3 minutes at their Lark mic become ONE pre-labelled voice group, never voiceprints by
themselves; turns that are too short, on no clear mic, or two voices are refused with a reason. Synthetic audio only."""
from __future__ import annotations

import numpy as np
import pytest

import enrol
import segments as S
from lark_room import classroom
from test_multimic import BANDS, KA, KB, KC, BandEmbedder


def lesson(kids, teacher=((0, 10),), seconds=200):
    tracks, _ = classroom(seconds, list(teacher), kids, bands=BANDS)
    return tracks, S.activity(tracks, use_silero=False)


def test_one_child_becomes_one_suggested_group():
    tracks, act = lesson({KA: ("mic2", [(20, 80)], 21)})
    groups, refused = enrol.enrol_groups(act, tracks, [(KA, 19.0, 82.0)], {"ecapa": BandEmbedder()})
    assert not refused and len(groups) == 1
    g = groups[0]
    assert g["suggested"] == KA and g["enrol"]["mics"] == ["mic2"] and g["seconds"] >= 20
    assert g["blind"] is False and g["segments"] == [] and g["vec"] is not None
    assert all(19.0 <= t < e <= 82.0 for t, e in g["spans"])


def test_teacher_speech_inside_the_turn_is_left_out():
    tracks, act = lesson({KA: ("mic1", [(20, 90)], 22)}, teacher=[(40, 50)])
    groups, _ = enrol.enrol_groups(act, tracks, [(KA, 19.0, 92.0)], {"ecapa": BandEmbedder()})
    F = S.FRAME_S
    for t, e in groups[0]["spans"]:
        assert act["teacher"][int(t / F): int(e / F)].mean() < 0.05


def test_too_short_is_refused():
    tracks, act = lesson({KA: ("mic1", [(20, 30)], 23)})
    groups, refused = enrol.enrol_groups(act, tracks, [(KA, 19.0, 31.0)], {"ecapa": BandEmbedder()})
    assert not groups and refused[0]["reason"] == "too_little_speech" and refused[0]["child"] == KA


def test_no_clear_mic_is_refused():
    tracks, act = lesson({})
    groups, refused = enrol.enrol_groups(act, tracks, [(KA, 20.0, 80.0)], {"ecapa": BandEmbedder()})
    assert not groups and refused[0]["reason"] == "mic_unclear"


def test_two_voices_in_one_turn_is_refused():
    """The tapped child and a classmate at the same mic take turns: not one voice."""
    tracks, act = lesson({KA: ("mic3", [(20, 50)], 24), KC: ("mic3", [(50, 80)], 25)})
    groups, refused = enrol.enrol_groups(act, tracks, [(KA, 19.0, 82.0)], {"ecapa": BandEmbedder()},
                                         dict(enrol.SETTINGS, one_voice_min=0.8))
    assert not groups and refused[0]["reason"] == "not_one_voice"


def test_taps_become_turns_ended_by_the_teacher():
    tracks, act = lesson({KA: ("mic1", [(20, 60)], 26)}, teacher=[(70, 90)])
    marks = [{"kind": "student", "student_ids": [KA], "t_s": 19.0}]
    turns = enrol.tap_turns_from_marks(marks, 200, act)
    assert len(turns) == 1 and turns[0][0] == KA and 69 <= turns[0][2] <= 76  # the teacher's voice ends the turn (after a pause between phrases at most)


def test_activity_cards_have_all_three_parts():
    for level, c in enrol.ACTIVITY_CARDS.items():
        assert len(c["read"]) == 3 and len(c["ask"]) >= 3 and c["tell"], level
