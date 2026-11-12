"""30-second smoke run of the local stacks: does it install, load and run on this CPU?

Prints TIMINGS AND COUNTS ONLY - never transcript text (children's speech).
Models are cached under <root>\\models\\ (ungated Hugging Face repos only):
  faster-whisper  Systran/faster-whisper-<size> (CTranslate2, int8 on CPU)
  SpeechBrain     speechbrain/spkrec-ecapa-voxceleb (ECAPA speaker embedding)
  sherpa-onnx     import check only (its diarization models are separate downloads)
pyannote.audio is NOT tried: its models are gated and need a Hugging Face token.

    python smoke_local.py --wav C:\\Users\\Dell\\hec-audio-eval\\work\\wav16k\\videos\\S01_clip1.wav
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, WORK, read_wav, safe_out  # noqa: E402

MODELS = ROOT / "models"
os.environ.setdefault("HF_HOME", str(MODELS / "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")


def fw(x, size: str, threads: int) -> dict:
    from faster_whisper import WhisperModel
    t0 = time.perf_counter()
    m = WhisperModel(size, device="cpu", compute_type="int8", cpu_threads=threads,
                     download_root=str(MODELS / "faster-whisper"))
    t1 = time.perf_counter()
    segs, info = m.transcribe(x, language="en", beam_size=5, word_timestamps=True, vad_filter=True)
    words = [w for s in segs for w in (s.words or [])]
    t2 = time.perf_counter()
    conf = [w.probability for w in words]
    return {"ok": True, "model": size, "load_s": round(t1 - t0, 2), "transcribe_s": round(t2 - t1, 2),
            "rtf": round((t2 - t1) / (len(x) / 16000), 3), "words": len(words),
            "mean_word_conf": round(sum(conf) / len(conf), 3) if conf else None}


def ecapa(x) -> dict:
    import torch
    from speechbrain.inference.speaker import EncoderClassifier
    from speechbrain.utils.fetching import LocalStrategy
    t0 = time.perf_counter()
    enc = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb",
                                         savedir=str(MODELS / "speechbrain" / "spkrec-ecapa-voxceleb"),
                                         run_opts={"device": "cpu"}, local_strategy=LocalStrategy.COPY)
    t1 = time.perf_counter()
    win = 3 * 16000
    chunks = [x[i: i + win] for i in range(0, len(x) - win + 1, win)]
    with torch.no_grad():
        emb = enc.encode_batch(torch.tensor(chunks))
    t2 = time.perf_counter()
    # embeddings are biometric: only their shape is reported, nothing is saved
    return {"ok": True, "load_s": round(t1 - t0, 2), "embed_s": round(t2 - t1, 2),
            "windows": len(chunks), "dim": int(emb.shape[-1]), "rtf": round((t2 - t1) / (len(x) / 16000), 3)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--wav", type=Path, required=True)
    ap.add_argument("--seconds", type=float, default=30.0)
    ap.add_argument("--whisper", default="small")
    ap.add_argument("--threads", type=int, default=os.cpu_count() or 4)
    ap.add_argument("--out", type=Path, default=WORK / "smoke" / "smoke_local.json")
    a = ap.parse_args()
    x, sr = read_wav(a.wav, 0, a.seconds)
    assert sr == 16000
    res = {"clip_seconds": round(len(x) / sr, 2), "threads": a.threads}
    for name, fn in (("faster_whisper", lambda: fw(x, a.whisper, a.threads)), ("speechbrain_ecapa", lambda: ecapa(x))):
        try:
            res[name] = fn()
        except Exception as e:  # noqa: BLE001
            res[name] = {"ok": False, "error": f"{type(e).__name__}: {str(e)[:300]}"}
    try:
        import sherpa_onnx
        res["sherpa_onnx"] = {"ok": True, "import": getattr(sherpa_onnx, "__version__", "installed"),
                              "note": "import only; diarization models not downloaded in B0"}
    except Exception as e:  # noqa: BLE001
        res["sherpa_onnx"] = {"ok": False, "error": f"{type(e).__name__}: {e}"}
    s = json.dumps(res, indent=1)
    print(s)
    safe_out(a.out).write_text(s, encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
