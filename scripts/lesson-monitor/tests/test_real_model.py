"""The REAL transcriber on made-up audio, where the model is on this machine (skipped elsewhere).

Every other test fakes the model. On 21 Nov 2026 that hid a failure in the library itself:
faster-whisper, handed a file path, opened it with PyAV with an option the installed PyAV
refuses, and both real lessons failed with "error_typeerror" after a full download. This runs
transcribe.transcribe exactly as nightly.py and step0.py call it (a 16 kHz WAV path), on
three seconds of a tone: no lesson, no voice, no network (the model loads offline)."""
from __future__ import annotations

import numpy as np
import pytest

import pilot_common as pc
import transcribe

MODEL_DIR = pc.models_dir() / "faster-whisper" / "models--mobiuslabsgmbh--faster-whisper-large-v3-turbo"


@pytest.mark.skipif(not MODEL_DIR.exists(), reason="the pilot's model is not on this machine")
def test_the_real_model_reads_the_jobs_own_wav(tmp_path):
    import soundfile as sf
    wav = tmp_path / "room16k.wav"
    t = np.arange(3 * 16000) / 16000
    sf.write(str(wav), (0.05 * np.sin(2 * np.pi * 220 * t)).astype(np.float32), 16000, subtype="PCM_16")
    segs = transcribe.transcribe(transcribe.load_model(), str(wav), should_stop=lambda: False)
    assert isinstance(segs, list)  # it ran; a tone may well give no line at all


def test_a_path_is_read_as_16k_samples(tmp_path):
    import soundfile as sf
    wav = tmp_path / "cut.wav"
    sf.write(str(wav), np.zeros(1600, dtype=np.float32), 16000, subtype="PCM_16")
    x = transcribe.read_wav16k(str(wav))
    assert x.dtype == np.float32 and x.ndim == 1 and len(x) == 1600
    sf.write(str(wav), np.zeros(4800, dtype=np.float32), 48000, subtype="PCM_16")
    with pytest.raises(ValueError):
        transcribe.read_wav16k(str(wav))
