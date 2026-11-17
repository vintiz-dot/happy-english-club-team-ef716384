"""Local transcription with exactly the B2b settings (docs/evidence/B2b-cpu.md s.9).

faster-whisper large-v3-turbo, int8, greedy (beam 1), 4 threads, English,
silero VAD threshold 0.25, condition_on_previous_text off, word timestamps.
The model is loaded from the harness's cache (models\\faster-whisper) with the
Hugging Face hub switched OFFLINE: nothing is downloaded, nothing is sent.
"""
from __future__ import annotations

import os

import pilot_common as pc

B2B = {
    "model": "large-v3-turbo",
    "compute_type": "int8",
    "beam_size": 1,
    "cpu_threads": 4,
    "language": "en",
    "vad_filter": True,
    "vad_threshold": 0.25,
    "condition_on_previous_text": False,
    "word_timestamps": True,
}


class Stopped(Exception):
    """The kill switch (pilot\\STOP) appeared while transcribing."""


def settings() -> dict:
    return {"engine": "faster-whisper", **B2B}


def load_model():
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ.setdefault("HF_HOME", str(pc.models_dir() / "hf"))
    from faster_whisper import WhisperModel
    return WhisperModel(B2B["model"], device="cpu", compute_type=B2B["compute_type"], cpu_threads=B2B["cpu_threads"],
                        download_root=str(pc.models_dir() / "faster-whisper"), local_files_only=True)


def transcribe(model, audio, should_stop=pc.stopped, on_progress=None) -> list[dict]:
    """Segments [{start, end, text, avg_logprob, no_speech_prob, compression_ratio, words}].
    `audio` is a 16 kHz WAV path or a float32 array. Checks the kill switch after every segment."""
    segs, _info = model.transcribe(
        audio if isinstance(audio, str) else audio,
        beam_size=B2B["beam_size"], language=B2B["language"], vad_filter=B2B["vad_filter"],
        vad_parameters={"threshold": B2B["vad_threshold"]},
        condition_on_previous_text=B2B["condition_on_previous_text"], word_timestamps=B2B["word_timestamps"])
    out = []
    for s in segs:
        out.append({
            "start": round(float(s.start), 3), "end": round(float(s.end), 3), "text": s.text.strip(),
            "avg_logprob": float(s.avg_logprob), "no_speech_prob": float(s.no_speech_prob),
            "compression_ratio": float(s.compression_ratio),
            "words": [{"w": w.word.strip(), "start": round(float(w.start), 3), "end": round(float(w.end), 3),
                       "p": round(float(w.probability), 3)} for w in (s.words or [])],
        })
        if on_progress:
            on_progress(float(s.end))
        if should_stop():
            raise Stopped()
    return out
