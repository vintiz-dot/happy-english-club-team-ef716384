"""segments.py on a synthetic classroom: teacher speech from the lapel, child speech at the right mic, a child talking
over the teacher kept (overlap), two children at different mics split. The margin engine (no Silero) keeps these
deterministic; one test checks Silero runs and has the frame grid."""
from __future__ import annotations

import numpy as np
import pytest

import segments as S
from lark_room import classroom

KIDS = {"kidA": ("mic1", [(20, 30)], 1), "kidB": ("mic3", [(44, 50)], 2), "kidC": ("mic4", [(60, 64), (64.2, 68)], 3)}
TEACH = [(0, 18), (40, 52), (70, 88)]  # kidB talks OVER the teacher (44-50)


@pytest.fixture(scope="module")
def act():
    tracks, _ = classroom(90, TEACH, KIDS)
    return S.activity(tracks, use_silero=False)


def frames(a, b):
    return slice(int(a / S.FRAME_S), int(b / S.FRAME_S))


# lark_synth's voices pause between phrases about 40 % of the time, so a speaker "on" for 10 s talks for about 6.


def test_teacher_found_from_the_lapel(act):
    t = act["teacher"]
    for a, b in TEACH:
        assert t[frames(a + 0.5, b - 0.5)].mean() > 0.45
    assert t[frames(20.5, 29.5)].mean() < 0.1  # kidA alone: not the teacher
    assert t[frames(60.5, 67.5)].mean() < 0.1


def test_teacher_bleed_measured_per_mic(act):
    for m in S.MICS:
        assert 14 < act["bleed"][m] < 22  # the classroom puts the teacher 18 dB down at every mic


def test_child_at_the_right_mic(act):
    segs = S.child_segments(act)
    a = [s for s in segs if s["a"] < 30 and s["e"] > 20]
    assert a and all(s["top"] == "mic1" for s in a)
    assert sum(s["e"] - s["a"] for s in a) > 4.5
    assert not any(s["overlap"] for s in a)


def test_child_over_the_teacher_is_kept_as_overlap(act):
    segs = S.child_segments(act)
    b = [s for s in segs if s["a"] < 50 and s["e"] > 44]
    assert b, "a child talking over the teacher must not be dropped"
    assert all(s["top"] == "mic3" for s in b)
    assert any(s["overlap"] for s in b)
    assert sum(s["e"] - s["a"] for s in b) > 2.5


def test_teacher_alone_is_not_child_speech(act):
    segs = S.child_segments(act)
    assert not [s for s in segs if s["a"] < 17 and s["e"] > 1]
    assert not [s for s in segs if s["a"] < 87 and s["e"] > 71]


def test_two_children_at_different_mics_are_split():
    kids = {"x": ("mic1", [(10, 15)], 4), "y": ("mic4", [(15.1, 20)], 5)}
    tracks, _ = classroom(30, [], kids)
    segs = S.child_segments(S.activity(tracks, use_silero=False))
    tops = [(s["top"], round(s["a"])) for s in segs if s["e"] - s["a"] > 1]
    assert ("mic1", 10) in tops and any(t == "mic4" and 14 <= a <= 16 for t, a in tops)


def test_long_speech_is_cut_at_max_seg():
    tracks, _ = classroom(50, [], {"x": ("mic2", [(5, 45)], 6)})
    segs = S.child_segments(S.activity(tracks, use_silero=False))
    assert segs and max(s["e"] - s["a"] for s in segs) <= S.SETTINGS["max_seg_s"] + 0.01


def test_noise_floor_is_each_tracks_own(act):
    """mic3's hiss is quieter than mic2's: their floors differ by about that, never normalised away."""
    f2 = np.median(act["db"]["mic2"] - act["margin"]["mic2"])
    f3 = np.median(act["db"]["mic3"] - act["margin"]["mic3"])
    assert 6 < f2 - f3 < 11  # 0.004 vs 0.0015: 8.5 dB


def test_without_a_teacher_track_mics_still_work():
    tracks, _ = classroom(40, [], {"x": ("mic2", [(10, 20)], 7)})
    tracks.pop("teacher")
    act = S.activity(tracks, use_silero=False)
    assert not act["teacher"].any()
    segs = S.child_segments(act)
    assert segs and segs[0]["top"] == "mic2"


def test_runs():
    m = np.array([0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1], dtype=bool)
    assert S.runs(m) == [(1, 3), (4, 5), (8, 11)]
    assert S.runs(m, merge_gap=1) == [(1, 5), (8, 11)]
    assert S.runs(m, min_len=3) == [(8, 11)]


@pytest.mark.skipif(S.silero_path() is None, reason="faster-whisper's Silero file is not installed here")
def test_silero_runs_on_the_frame_grid():
    x = (0.01 * np.random.default_rng(0).standard_normal(16000 * 5)).astype(np.float32)
    p = S.silero_probs(x)
    assert p.shape == (len(x) // S.HOP,)
    assert (p >= 0).all() and (p <= 1).all()
    tracks, _ = classroom(20, [(2, 8)], {"x": ("mic1", [(10, 15)], 8)})
    act = S.activity(tracks, use_silero=True)
    assert act["vad_engine"] == "silero"
