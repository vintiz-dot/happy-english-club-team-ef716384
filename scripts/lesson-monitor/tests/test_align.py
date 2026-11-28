"""align.py on synthetic audio: known offsets, drifts, levels; claps; a track that shares nothing is rejected."""
from __future__ import annotations

import numpy as np
import pytest

import align
from lark_synth import hiss, on_mic_clock, place, three_claps, voice

SR = 8000  # the engine runs at 16 kHz; 8 kHz keeps the tests quick and changes nothing in the method


def lesson(seconds=600, claps=True, seed=0):
    """Room-time sources: the teacher talks most of the time, two children now and then."""
    teacher = voice(seconds, SR, seed + 1, f0=180)
    kid1 = voice(seconds, SR, seed + 2, f0=300, rate_hz=5)
    kid2 = voice(seconds, SR, seed + 3, f0=320, rate_hz=4.5)
    def gate(s, period, on):  # a child talks for `on` seconds every `period`, fading in and out over 80 ms
        g = ((np.arange(len(s)) / SR) % period < on).astype(np.float32)
        k = np.ones(int(0.08 * SR), dtype=np.float32) / int(0.08 * SR)
        return np.convolve(g, k, mode="same").astype(np.float32)
    kid1 *= gate(kid1, 90, 20)
    kid2 *= np.roll(gate(kid2, 70, 15), int(30 * SR))
    clap_track = np.zeros(int(seconds * SR), dtype=np.float32)
    marks = []
    if claps:
        marks += three_claps(clap_track, 20.0, SR)
        marks += three_claps(clap_track, seconds - 30.0, SR)
    return teacher, kid1, kid2, clap_track, marks


def room_and_mic(offset, drift, gains=(0.5, 1.0, 0.1), seconds=600, claps=True, seed=0, mic_len=None):
    t, k1, k2, cl, _ = lesson(seconds, claps, seed)
    room = 0.8 * t + 0.3 * k1 + 0.3 * k2 + cl + hiss(len(t), 0.003, 9)
    at_mic = gains[0] * t + gains[1] * k1 + gains[2] * k2 + cl
    mic = on_mic_clock(at_mic, SR, offset, drift, mic_len or seconds + offset + 5)
    mic += hiss(len(mic), 0.004, 10)
    return room.astype(np.float32), mic


@pytest.mark.parametrize("offset,drift", [(37.25, 40.0), (3.0, -85.0), (120.4, 0.0)])
def test_recovers_offset_and_drift(offset, drift):
    room, mic = room_and_mic(offset, drift)
    f = align.align_track("mic1", room, mic, SR)
    assert f.ok, f
    assert abs(f.offset_s - offset) < 0.002
    assert abs(f.drift_ppm - drift) < 3.0
    assert f.residual_ms < 1.0
    assert f.inliers >= 8


def test_claps_found_and_matched():
    room, mic = room_and_mic(12.5, 30.0)
    rc = align.find_claps(room, SR)
    assert len(align.clap_triples(rc)) == 2
    f = align.align_track("mic2", room, mic, SR)
    assert f.method == "claps+gcc"
    assert f.claps["matched_triples"] == 2
    assert f.claps["worst_ms"] < 5


def test_without_claps_envelope_guess_works():
    room, mic = room_and_mic(55.0, -20.0, claps=False)
    f = align.align_track("mic3", room, mic, SR)
    assert f.ok and f.method == "envelope+gcc"
    assert abs(f.offset_s - 55.0) < 0.002


def test_timecode_first_guess_is_used():
    room, mic = room_and_mic(200.0, 10.0, claps=False, seconds=500)
    f = align.align_track("mic4", room, mic, SR, meta_offset_s=200.3)
    assert f.ok and f.method == "timecode+gcc"
    assert abs(f.offset_s - 200.0) < 0.002


def test_quiet_mic_far_from_everyone_still_aligns():
    """A mic 20 dB down (everything at a tenth) with the same hiss: the teacher is still on it."""
    room, mic = room_and_mic(8.0, 50.0, gains=(0.05, 0.1, 0.01))
    f = align.align_track("mic1", room, mic, SR)
    assert f.ok, f


def test_unrelated_track_is_rejected_with_a_reason():
    room, _ = room_and_mic(0.0, 0.0)
    other = voice(600, SR, 99) + hiss(600 * SR, 0.004, 11)
    f = align.align_track("mic2", room, other, SR)
    assert not f.ok
    assert f.reason in ("too_few_shared_windows", "windows_disagree", "no_first_guess", "residual_too_large",
                        "drift_implausible")


def test_short_track_rejected():
    room, mic = room_and_mic(1.0, 0.0)
    f = align.align_track("mic1", room, mic[: 10 * SR], SR)
    assert not f.ok and f.reason == "track_too_short"


def test_end_claps_off_the_line_reject():
    """Speech says one line, the end claps another (e.g. a file cut and rejoined): rejected, not trusted."""
    room, mic = room_and_mic(10.0, 0.0)
    cl = np.zeros_like(mic)
    from lark_synth import clap
    for i, t in enumerate((10.0 + 570.0 + 0.2, 10.0 + 570.7, 10.0 + 571.25)):  # end claps 200 ms late on the mic
        place(cl, clap(SR, i), t, SR, 1.0)
    # take the real end claps out of the mic by rebuilding without them, then add the shifted ones
    t_, k1, k2, c0, _ = lesson(600, True, 0)
    c_start = c0.copy()
    c_start[int(300 * SR):] = 0
    at_mic = 0.5 * t_ + 1.0 * k1 + 0.1 * k2 + c_start
    mic = on_mic_clock(at_mic, SR, 10.0, 0.0, 615) + hiss(615 * SR, 0.004, 10) + cl[: 615 * SR]
    f = align.align_track("mic1", room, mic, SR)
    assert not f.ok and f.reason == "claps_off_the_line"


def test_apply_puts_mic_on_room_time():
    room, mic = room_and_mic(30.0, 60.0, seconds=300)
    f = align.align_track("mic1", room, mic, SR)
    y, cov = align.apply(mic, SR, f, len(room))
    assert cov.all()
    t, k1, k2, cl, _ = lesson(300, True, 0)
    expect = 0.5 * t + 1.0 * k1 + 0.1 * k2 + cl
    assert abs(f.offset_s - 30.0) < 0.001 and abs(f.drift_ppm - 60.0) < 3
    # what attribution reads: 10 ms loudness frames line up (the waveform itself needs sample accuracy)
    fr = lambda v: np.sqrt(np.mean(v[: len(v) // 80 * 80].reshape(-1, 80) ** 2, axis=1))  # noqa: E731
    a, b = 100 * SR, 200 * SR
    assert np.corrcoef(fr(y[a:b]), fr(expect[a:b]))[0, 1] > 0.97


def test_apply_marks_seconds_outside_the_file():
    room, mic = room_and_mic(-20.0, 0.0, seconds=300, mic_len=200)  # the mic started 20 s after the room
    f = align.Fit("mic1", True, offset_s=-20.0, drift_ppm=0.0, residual_ms=0.0)
    y, cov = align.apply(mic, SR, f, len(room))
    assert not cov[:19].any() and cov[25:200].all() and not cov[225:].any()


def room_dropping_audio(offset=40.0, seconds=600, start=200.0, end=320.0, every=3.0, drop_ms=8):
    """The owner's pilot (28 Nov 2026): the browser's room track lost about 0.8 s in small pieces mid-lesson, so the
    lag to every mic was flat, crept, then flat again. Here the room loses drop_ms every `every` seconds."""
    t, k1, k2, cl, _ = lesson(seconds, False, 0)
    full = 0.8 * t + 0.3 * k1 + 0.3 * k2
    at_mic = 0.5 * t + 1.0 * k1 + 0.1 * k2
    mic = on_mic_clock(at_mic, SR, offset, 0.0, seconds + offset + 5) + hiss(int((seconds + offset + 5) * SR), 0.004, 10)
    cut = np.ones(len(full), dtype=bool)
    n = int(drop_ms / 1000 * SR)
    for c in np.arange(start, end, every):
        cut[int(c * SR): int(c * SR) + n] = False
    room = full[cut] + hiss(int(cut.sum()), 0.003, 9)
    lost = (len(full) - cut.sum()) / SR
    return room.astype(np.float32), mic, lost


def test_room_that_drops_audio_gets_a_piecewise_fit():
    room, mic, lost = room_dropping_audio()
    f = align.align_track("mic1", room, mic, SR)
    assert f.ok, f
    assert f.knots and f.method.endswith("+gcc-piecewise")
    assert abs(f.offset_s - 40.0) < 0.01
    # before the drops the lag is the offset, after them the offset plus what the room lost
    assert abs(float(f.mic_time(100.0)) - 100.0 - 40.0) < 0.01
    assert abs(float(f.mic_time(450.0)) - 450.0 - (40.0 + lost)) < 0.015
    assert f.summary()["knots"] == len(f.knots)
    y, cov = align.apply(mic, SR, f, len(room))
    t, k1, k2, _, _ = lesson(600, False, 0)
    expect = 0.5 * t + 1.0 * k1 + 0.1 * k2
    fr = lambda v: np.sqrt(np.mean(v[: len(v) // 80 * 80].reshape(-1, 80) ** 2, axis=1))  # noqa: E731
    a, b = 400 * SR, 500 * SR  # room time 400-500 s is source time 400 + lost onwards
    sh = int(round(lost * SR))
    assert np.corrcoef(fr(y[a:b]), fr(expect[a + sh:b + sh]))[0, 1] > 0.97


def test_piecewise_never_rescues_an_unrelated_track():
    room, _, _ = room_dropping_audio()
    other = voice(600, SR, 99) + hiss(600 * SR, 0.004, 11)
    f = align.align_track("mic2", room, other, SR)
    assert not f.ok and not f.knots


def test_align_all_report_part():
    room, mic = room_and_mic(5.0, 0.0)
    other = voice(600, SR, 77)
    fits, part = align.align_all(room, {"mic1": mic, "mic2": other}, SR)
    assert fits["mic1"].ok and not fits["mic2"].ok
    assert set(part["tracks"]) == {"mic1", "mic2"} and "mic2" in part["rejected"]
    assert part["tracks"]["mic1"]["offset_s"] == pytest.approx(5.0, abs=0.002)
