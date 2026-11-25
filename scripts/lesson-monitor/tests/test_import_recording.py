"""import_recording.py: a file becomes 60 s 16 kHz mono FLAC chunks the nightly job can read, and the file's
start is its last write minus its length. Uses ffmpeg on a made-up tone; no network, no database."""
from __future__ import annotations

import os
import shutil
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest
import soundfile as sf

import audio
import import_recording as ir

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None,
                                reason="ffmpeg is not installed")


@pytest.fixture
def tone(tmp_path):
    sr, secs = 44100, 125.0
    t = np.arange(int(sr * secs)) / sr
    x = (0.2 * np.sin(2 * np.pi * 440 * t)).astype("float32")
    p = tmp_path / "lesson.wav"
    sf.write(str(p), np.stack([x, x], axis=1), sr)
    return str(p), secs


def test_chunks_are_60_second_flac_the_job_can_decode(tone):
    path, secs = tone
    out = list(ir.chunks(path))
    assert [c[0] for c in out] == [0, 1, 2]
    assert [(c[1], c[2]) for c in out] == [(0, 60000), (60000, 120000), (120000, 125000)]
    for _, ts, te, data in out:
        assert data[:4] == b"fLaC" and len(data) < 8 * 1024 * 1024
        x, sr = audio.decode(data)
        assert sr == 16000 and abs(len(x) - (te - ts) * 16) <= 16
    # contiguous: what the import's finish requires
    assert all(a[2] == b[1] for a, b in zip(out, out[1:]))


def test_the_start_is_the_last_write_minus_the_length(tone):
    path, secs = tone
    end = datetime(2026, 11, 23, 13, 54, 24, tzinfo=timezone.utc)
    os.utime(path, (end.timestamp(), end.timestamp()))
    assert ir.file_start(path, ir.probe_seconds(path), None) == end - timedelta(seconds=secs)


def test_a_given_start_without_offset_is_hanoi_time(tone):
    path, _ = tone
    assert ir.file_start(path, 1.0, "2026-11-23T19:56:32") == datetime(2026, 11, 23, 12, 56, 32, tzinfo=timezone.utc)
