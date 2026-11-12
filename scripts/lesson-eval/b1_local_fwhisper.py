"""Local comparison system for B1: faster-whisper on a 5-minute slice of each input set.

Nothing leaves this PC and no vendor is called. For each of the three input
sets the FIRST source (as vendor_batch plans it) is cut to at most --seconds
and transcribed with faster-whisper; the answer is written in the common
result schema (hec-lesson-eval/1) under
  work\\vendor\\local-fwhisper\\<size>\\result_local-fwhisper-<size>.json
with the SAME file ids the vendors use, so b1_score.py puts it in the same
tables (it compares two systems only over the shorter file's duration).
No speaker labels (faster-whisper does not diarize). Output holds children's
transcripts: it is written only under the evaluation root.

    python scripts\\lesson-eval\\b1_local_fwhisper.py [--seconds 300] [--threads 3] [--sets synth,clips,L1]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402
import vendor_batch  # noqa: E402
import vendor_run  # noqa: E402

MODELS = common.ROOT / "models"
os.environ.setdefault("HF_HOME", str(MODELS / "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")


def first_sources(names: list[str]) -> list[dict]:
    out = []
    for st in vendor_batch.build_inputs(names):
        if st["srcs"]:
            out.append(dict(st["srcs"][0], _set=st["name"]))
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--size", default="small")
    ap.add_argument("--seconds", type=float, default=300.0)
    ap.add_argument("--threads", type=int, default=3)
    ap.add_argument("--sets", default="synth,clips,L1")
    a = ap.parse_args(argv)

    import soundfile as sf
    from faster_whisper import WhisperModel

    out_dir = common.safe_out(common.WORK / "vendor" / "local-fwhisper" / a.size)
    srcs = first_sources([s.strip() for s in a.sets.split(",")])
    m = WhisperModel(a.size, device="cpu", compute_type="int8", cpu_threads=a.threads,
                     download_root=str(MODELS / "faster-whisper"))
    files, t_start, audio_s = [], time.time(), 0.0
    for src in srcs:
        span = (0.0, src["duration"])
        _, local, _ = vendor_run.write_piece(src, 0, span, out_dir, "flac")
        x, sr = sf.read(str(local), frames=int(a.seconds * 16000), dtype="float32", always_2d=True)
        x = x.mean(axis=1)
        dur = len(x) / sr
        t0 = time.time()
        segs, info = m.transcribe(x, language=None, beam_size=5, word_timestamps=True, vad_filter=True)
        words = []
        for s in segs:
            for w in s.words or []:
                words.append({"w": w.word.strip(), "start": round(w.start, 3), "end": round(max(w.end, w.start), 3),
                              "conf": round(float(w.probability), 3), "speaker": None})
        print(f"{src['file_id']}: {dur:.0f} s audio, {len(words)} words, {time.time() - t0:.0f} s (CPU shared: not a benchmark)")
        audio_s += dur
        files.append({"file_id": src["file_id"], "duration_s": round(dur, 3), "words": words, "turns": [],
                      "language": info.language})
    result = {"schema": "hec-lesson-eval/1",
              "system": {"name": f"local-fwhisper-{a.size}", "kind": "local", "model": f"faster-whisper {a.size} int8 CPU",
                         "settings": {"language": "auto", "beam": 5, "vad_filter": True, "word_timing": "vendor",
                                      "slice_seconds": a.seconds, "price_usd_per_min": 0.0}},
              "run": {"started_at": datetime.fromtimestamp(t_start, timezone.utc).isoformat(),
                      "wall_s": round(time.time() - t_start, 1), "audio_s": round(audio_s, 1)},
              "files": files}
    p = common.safe_out(out_dir / f"result_local-fwhisper-{a.size}.json")
    p.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
